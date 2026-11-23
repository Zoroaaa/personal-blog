/**
 * 管理员通知服务层
 *
 * 职责：
 * - 系统通知 CRUD（首页轮播）
 * - 全员/定点群发的批量执行（W3.5 热路径减负）
 *
 * 群发为什么不是逐条 createNotification（根因约束）：
 * 旧实现 for 循环逐用户 await，1000 用户 = 3000+ 次串行 D1 查询（每用户设置读 +
 * 插入 + 回读）+ realtime 邮件串行发送，必然撞 Workers CPU 时间与子请求上限。
 * 这里拆成四步：批量读设置 → 内存逐用户决策 → db.batch 分批写库 → waitUntil 内
 * 限并发异步发邮件，请求路径只承担写库（毫秒级），邮件不阻塞响应。
 *
 * 顺带修复的历史缺陷：旧路由调 createNotification 时漏传 env（第 4 参），导致
 * realtime 邮件渠道被静默跳过——群发的「邮件」选项实际从未生效。本服务恢复了该渠道。
 *
 * @version 2.0.0
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '../types';
import type { NotificationSettings } from '../types/notifications';
import { getNotificationSettingsBulk } from './notificationSettingsService';
import { computeDigestScheduledAt } from './notificationService';
import { shouldSendNow } from './doNotDisturb';
import { sendNotificationEmail } from '../utils/resend';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('notification');

// ============= 批量参数（魔数集中，均有配额依据） =============

// D1 batch 单批语句数，同时是单条 IN 查询的用户数上限。D1 单查询绑定参数上限 100，
// IN (...) 一参一用户，50 上限让两种用法都安全；1000 用户群发 = 20 批。
const DB_BATCH_CHUNK = 50;

// waitUntil 内邮件并行度。Resend API 有速率限制，5 并发既能在 CPU 预算内发完千级
// 邮件（每封 ~200ms），又不会瞬时并发触发 429。
const EMAIL_CONCURRENCY = 5;

// ============= 群发 =============

export interface SendAnnouncementParams {
  title: string;
  content?: string;
  /** 通知渠道白名单；'in_app'/'email' 之外的值由路由层拦截 */
  channels: string[];
  targetUserIds: number[];
}

export interface SendAnnouncementResult {
  /** 实际写入的通知行数 */
  sentCount: number;
  /** 用户主动关闭 system 通知（frequency=off）被跳过的人数——是「未打扰」不是失败 */
  skippedCount: number;
  /** 真实写库失败人数 */
  failedCount: number;
  /** 失败明细（路由层截断展示前 10 条） */
  errors: string[];
}

/** 已写入通知行的用户及其邮件渠道决策，后续批量步骤都以它为数据源 */
interface InsertedRow {
  userId: number;
  notificationId: number;
  emailMode: 'realtime' | 'daily' | 'weekly' | null;
  /** 汇总模式下的入队时间（realtime/null 时为 null） */
  scheduledAt: Date | null;
}

/**
 * 群发系统通知。
 *
 * 每用户的渠道决策与旧 createNotification 保持同口径：
 * - system 类型 in-app 恒发（忽略用户 inApp 开关，历史语义如此）；
 * - frequency=off 的用户完全不产生通知行（尊重退订）；
 * - email 渠道 = 管理员勾选 email 且用户 system.email 开启且不在免打扰时段；
 *   realtime 立即发（waitUntil 异步），daily/weekly 入汇总队列按点聚合。
 *
 * executionCtx 用最小结构类型而非 workers-types 的 ExecutionContext：
 * Hono 的 c.executionCtx 传进来的是 Hono 自己的 ExecutionContext 类型，
 * 两套类型互不兼容，只有 waitUntil 是我们真正消费的能力。
 */
export async function sendAnnouncement(
  env: Env,
  db: D1Database,
  executionCtx: { waitUntil(promise: Promise<unknown>): void },
  params: SendAnnouncementParams
): Promise<SendAnnouncementResult> {
  const { title, content, channels, targetUserIds } = params;
  const result: SendAnnouncementResult = {
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (targetUserIds.length === 0) return result;

  // ① 批量读设置：一次分批 IN 查询替代逐用户单查（设置行缺失按默认值、不补建行，
  //    避免与用户侧建行撞唯一键——见 getNotificationSettingsBulk 注释）
  const settingsMap = new Map<number, NotificationSettings>();
  for (const chunk of chunkArray(targetUserIds, DB_BATCH_CHUNK)) {
    const part = await getNotificationSettingsBulk(db, chunk);
    for (const [userId, settings] of part) {
      settingsMap.set(userId, settings);
    }
  }

  // ② 内存决策：算出每个用户「是否发 / 邮件走 realtime 还是汇总」
  interface Decision {
    userId: number;
    emailMode: 'realtime' | 'daily' | 'weekly' | null;
    scheduledAt: Date | null;
  }
  const decisions: Decision[] = [];

  for (const userId of targetUserIds) {
    const settings = settingsMap.get(userId);
    const systemSettings = settings?.system;

    if (!systemSettings || systemSettings.frequency === 'off') {
      result.skippedCount++;
      continue;
    }

    const emailWanted =
      channels.includes('email') &&
      systemSettings.email &&
      shouldSendNow(settings!.doNotDisturb, 'email');

    let emailMode: Decision['emailMode'] = null;
    let scheduledAt: Date | null = null;
    if (emailWanted && systemSettings.frequency === 'realtime') {
      emailMode = 'realtime';
    } else if (emailWanted) {
      // daily/weekly：不立即发，按用户自己的汇总时间点入队
      emailMode = systemSettings.frequency as 'daily' | 'weekly';
      scheduledAt = computeDigestScheduledAt(settings!.digestTime, systemSettings.frequency);
    }

    decisions.push({ userId, emailMode, scheduledAt });
  }

  if (decisions.length === 0) return result;

  // ③ 分批写库。db.batch 以批为单位原子提交：某批失败只损失该批，不影响已成功批次。
  const inserted: InsertedRow[] = [];

  for (const chunk of chunkArray(decisions, DB_BATCH_CHUNK)) {
    try {
      const statements = chunk.map(({ userId }) =>
        db.prepare(
          `INSERT INTO notifications (
            user_id, type, subtype, title, content, related_data,
            is_in_app_sent, is_email_sent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(userId, 'system', 'announcement', title, content || null, null, 1, 0)
      );
      const results = await db.batch(statements);

      // batch 结果按语句顺序返回，INSERT 从 meta.last_row_id 取回各自行 id
      results.forEach((res, i) => {
        const { userId, emailMode, scheduledAt } = chunk[i];
        if (res.success) {
          inserted.push({ userId, notificationId: res.meta.last_row_id, emailMode, scheduledAt });
        } else {
          result.failedCount++;
          result.errors.push(`用户 ${userId}: 通知行写入失败`);
        }
      });
    } catch (error) {
      // 整批异常（如 D1 临时故障）：该批用户全部记失败，其余批次不受影响
      result.failedCount += chunk.length;
      result.errors.push(`批次写入失败（${chunk.length} 人）: ${error}`);
    }
  }

  result.sentCount = inserted.length;

  // 汇总队列入队（daily/weekly 用户）：队列写入失败不回滚通知行，邮件只是延迟渠道
  const digestRows = inserted.filter((r) => r.emailMode === 'daily' || r.emailMode === 'weekly');
  for (const chunk of chunkArray(digestRows, DB_BATCH_CHUNK)) {
    try {
      await db.batch(
        chunk.map(({ userId, notificationId, emailMode, scheduledAt }) =>
          db.prepare(
            `INSERT INTO email_digest_queue (
              user_id, notification_id, digest_type, scheduled_at, is_sent, created_at
            ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
          ).bind(userId, notificationId, emailMode, scheduledAt!.toISOString())
        )
      );
    } catch (error) {
      result.errors.push(`汇总队列写入失败: ${error}`);
    }
  }

  // ④ realtime 邮件：waitUntil 异步限并发发送，不阻塞响应。
  //    先分批取收件人（旧实现每封邮件单独 SELECT users，又是 1000 次查询）。
  const realtimeRows = inserted.filter((r) => r.emailMode === 'realtime');
  if (realtimeRows.length > 0) {
    const jobs: { userId: number; notificationId: number; name: string; email: string }[] = [];
    const userById = await fetchUsersForEmail(db, realtimeRows.map((r) => r.userId));

    for (const { userId, notificationId } of realtimeRows) {
      const user = userById.get(userId);
      // 无邮箱/未找到的用户静默跳过：in-app 已送达，邮件渠道缺失不算失败
      if (user?.email) {
        jobs.push({ userId, notificationId, name: user.display_name || '用户', email: user.email });
      }
    }

    if (jobs.length > 0) {
      // waitUntil：Worker 在响应返回后继续执行；邮件失败只影响 is_email_sent 标记，
      // 不影响已送达的 in-app 通知
      executionCtx.waitUntil(sendRealtimeEmails(env, db, jobs, title, content));
    }
  }

  logger.info('群发通知完成（请求路径）', {
    title,
    targetCount: targetUserIds.length,
    sentCount: result.sentCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
    realtimeEmails: realtimeRows.length,
    digestQueued: digestRows.length,
  });

  return result;
}

/** 分批 IN 查询群发目标用户的邮箱信息（单查询 IN 参数 ≤ DB_BATCH_CHUNK，不撞 D1 参数上限） */
async function fetchUsersForEmail(
  db: D1Database,
  userIds: number[]
): Promise<Map<number, { display_name: string; email: string }>> {
  const map = new Map<number, { display_name: string; email: string }>();
  for (const chunk of chunkArray([...new Set(userIds)], DB_BATCH_CHUNK)) {
    try {
      const { results } = await db.prepare(
        `SELECT id, display_name, email FROM users WHERE id IN (${chunk.map(() => '?').join(',')})`
      )
        .bind(...chunk)
        .all<{ id: number; display_name: string; email: string }>();
      for (const row of results || []) {
        map.set(row.id, row);
      }
    } catch (error) {
      // 查询失败的批次拿不到邮箱 → 该批用户跳过邮件渠道，不中断整体流程
      logger.error('群发收件人批量查询失败', { error, count: chunk.length });
    }
  }
  return map;
}

/**
 * waitUntil 内执行：限并发发 realtime 邮件，成功的批量回写 is_email_sent=1。
 * sendNotificationEmail 内部自带 try/catch 返回 false，单封失败不影响整批。
 */
async function sendRealtimeEmails(
  env: Env,
  db: D1Database,
  jobs: { userId: number; notificationId: number; name: string; email: string }[],
  title: string,
  content?: string
): Promise<void> {
  const sentIds: number[] = [];
  let cursor = 0;

  // 游标并发：固定 worker 数从共享游标取任务，避免一次性打出全部在途子请求
  //（Workers 对同时打开的子请求数有上限）
  async function worker(): Promise<void> {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      // 邮件模板只需 type/title/content/relatedData；通知行 id 用于回写发送状态
      const sent = await sendNotificationEmail(
        env,
        {
          id: job.notificationId,
          userId: job.userId,
          type: 'system',
          subtype: 'announcement',
          title,
          content: content || null,
          isInAppSent: true,
          isEmailSent: false,
          isRead: false,
          createdAt: new Date().toISOString(),
        } as never,
        { name: job.name, email: job.email }
      );
      if (sent) sentIds.push(job.notificationId);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(EMAIL_CONCURRENCY, jobs.length) }, () => worker())
  );

  for (const chunk of chunkArray(sentIds, DB_BATCH_CHUNK)) {
    try {
      await db.batch(
        chunk.map((id) =>
          db.prepare('UPDATE notifications SET is_email_sent = 1 WHERE id = ?').bind(id)
        )
      );
    } catch (error) {
      // 回写失败只影响状态标记展示，邮件本身已发出，不重试（避免重复发信）
      logger.error('邮件发送状态回写失败（不影响邮件本身）', { error, count: chunk.length });
    }
  }

  logger.info('群发 realtime 邮件完成', { total: jobs.length, sent: sentIds.length });
}

// ============= 系统通知 CRUD（首页轮播，SQL 自路由下沉） =============

export interface AdminNotificationListParams {
  page: number;
  limit: number;
  type?: string;
  userId?: number;
}

export async function listNotifications(db: D1Database, params: AdminNotificationListParams) {
  const conditions: string[] = ['n.deleted_at IS NULL'];
  const bindings: any[] = [];

  if (params.type) {
    conditions.push('n.type = ?');
    bindings.push(params.type);
  }

  if (params.userId !== undefined) {
    conditions.push('n.user_id = ?');
    bindings.push(params.userId);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (params.page - 1) * params.limit;

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM notifications n WHERE ${whereClause}`
  )
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const rows = await db.prepare(
    `SELECT
      n.id, n.user_id, n.type, n.subtype, n.title, n.content,
      n.is_read, n.read_at, n.created_at,
      u.username, u.display_name, u.email
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    WHERE ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?`
  )
    .bind(...bindings, params.limit, offset)
    .all();

  const notifications = (rows.results || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    user: {
      username: row.username,
      displayName: row.display_name,
      email: row.email,
    },
    type: row.type,
    subtype: row.subtype,
    title: row.title,
    content: row.content,
    isRead: row.is_read === 1,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  return {
    notifications,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export interface SystemNotificationListParams {
  page: number;
  limit: number;
  isActive?: boolean;
}

export async function listSystemNotifications(db: D1Database, params: SystemNotificationListParams) {
  let whereClause = 'WHERE n.type = ? AND n.deleted_at IS NULL';
  const bindings: any[] = ['system'];

  if (params.isActive !== undefined) {
    whereClause += ' AND n.is_active = ?';
    bindings.push(params.isActive ? 1 : 0);
  }

  const offset = (params.page - 1) * params.limit;

  const rows = await db.prepare(
    `SELECT
      n.id, n.title, n.content, n.subtype, n.related_data,
      n.is_active, n.created_at, n.updated_at
    FROM notifications n
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?`
  ).bind(...bindings, params.limit, offset).all<{
    id: number; title: string; content: string; subtype: string | null;
    related_data: string; is_active: number; created_at: string; updated_at: string;
  }>();

  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM notifications n ${whereClause}`
  ).bind(...bindings).first<{ count: number }>();

  const notifications = (rows.results || []).map((n) => {
    // related_data 存 JSON（{link, isCarousel}）；坏 JSON 按空对象兜底而非让整页 500
    let relatedData: { link?: string } = {};
    try {
      relatedData = JSON.parse(n.related_data || '{}');
    } catch {
      relatedData = {};
    }

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      subtype: n.subtype || 'announcement',
      link: relatedData.link,
      isActive: n.is_active === 1,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    };
  });

  const total = countResult?.count || 0;

  return {
    notifications,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export interface SystemNotificationWritePayload {
  title?: string;
  content?: string;
  link?: string;
  subtype?: string;
  isActive?: boolean;
}

export interface CreateSystemNotificationData extends SystemNotificationWritePayload {
  title: string;
  content: string;
}

export async function createSystemNotification(db: D1Database, data: CreateSystemNotificationData) {
  // isCarousel 与 subtype 联动的语义来自旧路由：announcement 进首页轮播，其余不进
  const relatedData = JSON.stringify({
    link: data.link,
    isCarousel: data.subtype === 'announcement',
  });

  const result = await db.prepare(
    `INSERT INTO notifications (
      user_id, type, subtype, title, content, related_data,
      is_active, is_in_app_sent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    0,
    'system',
    data.subtype,
    data.title,
    data.content,
    relatedData,
    data.isActive ? 1 : 0,
    1
  ).run();

  return { notificationId: result.meta.last_row_id };
}

export async function updateSystemNotification(
  db: D1Database,
  id: number,
  data: SystemNotificationWritePayload
): Promise<boolean> {
  // 只按传入字段增量构建 SET，避免整行覆写把未传字段冲掉
  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }
  if (data.content !== undefined) {
    updates.push('content = ?');
    params.push(data.content);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(data.isActive ? 1 : 0);
  }
  if (data.subtype !== undefined) {
    updates.push('subtype = ?');
    params.push(data.subtype);
  }
  if (data.link !== undefined) {
    // link 存在 related_data JSON 里，需读旧值合并而不是整字段替换
    const existing = await db.prepare(
      'SELECT related_data FROM notifications WHERE id = ?'
    ).bind(id).first<{ related_data: string } | null>();

    let relatedData: Record<string, unknown> = {};
    try {
      relatedData = JSON.parse(existing?.related_data || '{}');
    } catch {
      relatedData = {};
    }
    relatedData = { ...relatedData, link: data.link };
    updates.push('related_data = ?');
    params.push(JSON.stringify(relatedData));
  }

  if (updates.length === 0) return true;

  params.push(id);
  const result = await db.prepare(
    `UPDATE notifications SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return result.success;
}

export async function deleteSystemNotification(db: D1Database, id: number): Promise<boolean> {
  // 软删：轮播列表与用户通知列表都以 deleted_at 过滤
  const result = await db.prepare(
    'UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(id).run();
  return result.success;
}

// ============= 工具 =============

/** 定长切分数组：D1 batch 分批与 IN 查询分批共用 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

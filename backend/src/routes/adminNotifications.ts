/**
 * 管理员通知路由
 *
 * 功能：
 * - 发送系统通知（管理员）
 * - 查看所有通知（管理员）
 *
 * @version 1.0.0
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { createNotification, getNotifications } from '../services/notificationService';
import type { NotificationType, NotificationChannel } from '../types/notifications';

export const adminNotificationRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

// 默认分页配置
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * POST /api/admin/notifications
 * 发送系统通知（管理员）
 *
 * 请求体：
 * {
 *   title: "系统维护通知",
 *   content: "系统将于今晚10点进行维护...",
 *   target: "all",  // "all" 或 "specific_users"
 *   userIds: [],    // 当target为"specific_users"时
 *   channels: ["in_app", "email", "push"]
 * }
 */
adminNotificationRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();

    // 验证请求体
    if (!body.title || typeof body.title !== 'string') {
      return c.json(errorResponse('Title is required', '标题不能为空'), 400);
    }

    if (!body.target || !['all', 'specific_users'].includes(body.target)) {
      return c.json(errorResponse('Invalid target', '目标用户类型无效'), 400);
    }

    if (
      !body.channels ||
      !Array.isArray(body.channels) ||
      body.channels.length === 0
    ) {
      return c.json(errorResponse('Channels are required', '通知渠道不能为空'), 400);
    }

    const validChannels = ['in_app', 'email', 'push'];
    const invalidChannels = body.channels.filter(
      (ch: string) => !validChannels.includes(ch)
    );
    if (invalidChannels.length > 0) {
      return c.json(
        errorResponse('Invalid channels', `无效的通知渠道: ${invalidChannels.join(', ')}`),
        400
      );
    }

    // 获取目标用户列表
    let targetUserIds: number[] = [];

    if (body.target === 'all') {
      // 获取所有活跃用户
      const users = await c.env.DB.prepare(
        'SELECT id FROM users WHERE status = ?'
      )
        .bind('active')
        .all();
      targetUserIds = (users.results || []).map((u: any) => u.id);
    } else {
      // 特定用户
      if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
        return c.json(errorResponse('User IDs are required', '用户ID列表不能为空'), 400);
      }
      targetUserIds = body.userIds;
    }

    if (targetUserIds.length === 0) {
      return c.json(
        successResponse({ sentCount: 0, failedCount: 0 }, '没有目标用户')
      );
    }

    // 限制批量发送数量
    const MAX_BATCH_SIZE = 1000;
    if (targetUserIds.length > MAX_BATCH_SIZE) {
      return c.json(
        errorResponse(
          'Too many target users',
          `目标用户数量超过限制（最大${MAX_BATCH_SIZE}）`
        ),
        400
      );
    }

    // 发送通知
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const userId of targetUserIds) {
      try {
        const notification = await createNotification(
          c.env.DB,
          {
            userId,
            type: 'system',
            subtype: 'announcement',
            title: body.title,
            content: body.content,
          },
          {
            skipInApp: !body.channels.includes('in_app'),
            skipEmail: !body.channels.includes('email'),
            skipPush: !body.channels.includes('push'),
          }
        );

        if (notification) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`用户 ${userId}: 创建通知失败`);
        }
      } catch (error) {
        failedCount++;
        errors.push(`用户 ${userId}: ${error}`);
      }
    }

    logger.info('Admin send notifications', {
      title: body.title,
      target: body.target,
      targetCount: targetUserIds.length,
      sentCount,
      failedCount,
      channels: body.channels,
    });

    return c.json(
      successResponse(
        {
          sentCount,
          failedCount,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // 最多返回10个错误
        },
        `成功发送 ${sentCount} 条通知，失败 ${failedCount} 条`
      )
    );
  } catch (error) {
    logger.error('Admin send notification error', error);
    return c.json(
      errorResponse('Failed to send notifications', '发送通知失败'),
      500
    );
  }
});

/**
 * GET /api/admin/notifications
 * 查看所有通知（管理员）
 *
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - type: 筛选类型
 * - userId: 筛选用户ID
 */
adminNotificationRoutes.get('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const page = parseInt(c.req.query('page') || String(DEFAULT_PAGE));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(c.req.query('limit') || String(DEFAULT_LIMIT)))
    );
    const type = c.req.query('type') as NotificationType | undefined;
    const userId = c.req.query('userId')
      ? parseInt(c.req.query('userId')!)
      : undefined;

    // 构建查询条件
    const conditions: string[] = ['n.is_deleted = 0'];
    const bindings: any[] = [];

    if (type) {
      conditions.push('n.type = ?');
      bindings.push(type);
    }

    if (userId !== undefined && !isNaN(userId)) {
      conditions.push('n.user_id = ?');
      bindings.push(userId);
    }

    const whereClause = conditions.join(' AND ');

    // 获取总数
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM notifications n WHERE ${whereClause}`
    )
      .bind(...bindings)
      .first();

    const total = (countResult?.total as number) || 0;

    // 获取通知列表
    const offset = (page - 1) * limit;
    const rows = await c.env.DB.prepare(
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
      .bind(...bindings, limit, offset)
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

    logger.info('Admin get notifications', {
      page,
      limit,
      type,
      userId,
      count: notifications.length,
    });

    return c.json(
      successResponse({
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    logger.error('Admin get notifications error', error);
    return c.json(
      errorResponse('Failed to get notifications', '获取通知列表失败'),
      500
    );
  }
});

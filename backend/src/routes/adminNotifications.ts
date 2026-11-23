/**
 * 管理员通知路由
 *
 * 功能：
 * - 群发系统通知（管理员，批量执行下沉 adminNotificationService）
 * - 查看所有通知（管理员）
 * - 系统通知 CRUD（首页轮播）
 *
 * 路由层只做：requireAdmin 鉴权 → 参数校验 → 调 service → 统一响应；
 * SQL 与群发批量编排见 services/adminNotificationService.ts。
 *
 * @version 2.0.0
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { pathParam } from '../utils/validation';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  sendAnnouncement,
  listNotifications,
  listSystemNotifications,
  createSystemNotification,
  updateSystemNotification,
  deleteSystemNotification,
} from '../services/adminNotificationService';
import type { NotificationType } from '../types/notifications';
import {
  NOTIFICATION_CONSTANTS,
} from '../config/constants';

export const adminNotificationRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * POST /api/admin/notifications/send
 * 群发系统通知（管理员）
 *
 * 请求体：
 * {
 *   title: "系统维护通知",
 *   content: "系统将于今晚10点进行维护...",
 *   target: "all",  // "all" 或 "specific_users"
 *   userIds: [],    // 当target为"specific_users"时
 *   channels: ["in_app", "email"]
 * }
 *
 * 响应：{ sentCount, skippedCount, failedCount, errors? }
 * skippedCount 是用户关闭 system 通知被跳过的人数（非失败）；
 * realtime 邮件在响应返回后由 waitUntil 异步发送，不阻塞本请求。
 */
adminNotificationRoutes.post('/send', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();

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

    const validChannels = ['in_app', 'email'];
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
        successResponse({ sentCount: 0, skippedCount: 0, failedCount: 0 }, '没有目标用户')
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

    // 批量群发（编排与 SQL 在 service；邮件经 waitUntil 异步，不阻塞响应）
    const result = await sendAnnouncement(c.env, c.env.DB, c.executionCtx, {
      title: body.title,
      content: body.content,
      channels: body.channels,
      targetUserIds,
    });

    logger.info('Admin send notifications', {
      title: body.title,
      target: body.target,
      targetCount: targetUserIds.length,
      sentCount: result.sentCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      channels: body.channels,
    });

    return c.json(
      successResponse(
        {
          sentCount: result.sentCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined, // 最多返回10个错误
        },
        `成功发送 ${result.sentCount} 条通知，失败 ${result.failedCount} 条`
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
 * GET /api/admin/notifications/list
 * 查看所有通知（管理员）
 *
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - type: 筛选类型
 * - userId: 筛选用户ID
 */
adminNotificationRoutes.get('/list', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const page = parseInt(c.req.query('page') || String(NOTIFICATION_CONSTANTS.DEFAULT_PAGE));
    const limit = Math.min(
      NOTIFICATION_CONSTANTS.MAX_LIMIT,
      Math.max(1, parseInt(c.req.query('limit') || String(NOTIFICATION_CONSTANTS.DEFAULT_LIMIT)))
    );
    const type = c.req.query('type') as NotificationType | undefined;
    const userId = c.req.query('userId')
      ? parseInt(c.req.query('userId')!)
      : undefined;

    const result = await listNotifications(c.env.DB, { page, limit, type, userId });

    logger.info('Admin get notifications', {
      page,
      limit,
      type,
      userId,
      count: result.notifications.length,
    });

    return c.json(successResponse(result));
  } catch (error) {
    logger.error('Admin get notifications error', error);
    return c.json(
      errorResponse('Failed to get notifications', '获取通知列表失败'),
      500
    );
  }
});

// ============= 系统通知管理（首页轮播）=============

/**
 * GET /api/admin/notifications/system-notifications
 * 获取系统通知列表（用于首页轮播）
 *
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - isActive: 筛选状态
 */
adminNotificationRoutes.get('/system-notifications', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
    const isActiveQuery = c.req.query('isActive');
    // isActive 用三态区分「不过滤」与「过滤 true/false」，缺省时不带该条件
    const isActive = isActiveQuery === undefined ? undefined : isActiveQuery === 'true';

    const result = await listSystemNotifications(c.env.DB, { page, limit, isActive });

    logger.info('Admin get system notifications', {
      count: result.notifications.length,
      page,
    });

    return c.json(successResponse(result));
  } catch (error) {
    logger.error('Get system notifications error', error);
    return c.json(errorResponse(
      'Failed to get system notifications',
      '获取系统通知列表失败'
    ), 500);
  }
});

/**
 * POST /api/admin/notifications/system-notifications
 * 创建系统通知
 */
adminNotificationRoutes.post('/system-notifications', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();
    const { title, content, link, subtype = 'announcement', isActive = true } = body;

    if (!title || typeof title !== 'string') {
      return c.json(errorResponse('Title is required', '标题不能为空'), 400);
    }

    if (!content || typeof content !== 'string') {
      return c.json(errorResponse('Content is required', '内容不能为空'), 400);
    }

    const validSubtypes = ['maintenance', 'update', 'announcement'];
    if (!validSubtypes.includes(subtype)) {
      return c.json(errorResponse('Invalid subtype', '无效的通知类型'), 400);
    }

    const { notificationId } = await createSystemNotification(c.env.DB, {
      title,
      content,
      link,
      subtype,
      isActive,
    });

    logger.info('System notification created', { notificationId, title, subtype });

    return c.json(successResponse({
      id: notificationId,
      title,
      content,
      link,
      subtype,
      isActive,
    }, '系统通知创建成功'), 201);

  } catch (error) {
    logger.error('Create system notification error', error);
    return c.json(errorResponse(
      'Failed to create system notification',
      '创建系统通知失败'
    ), 500);
  }
});

/**
 * PUT /api/admin/notifications/system-notifications/:id
 * 更新系统通知
 */
adminNotificationRoutes.put('/system-notifications/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = parseInt(pathParam(c.req.param('id'), 'id'));
    if (isNaN(id)) {
      return c.json(errorResponse('Invalid ID', '无效的通知ID'), 400);
    }

    const body = await c.req.json();
    const { title, content, link, subtype, isActive } = body;

    const existing = await c.env.DB.prepare(
      'SELECT id FROM notifications WHERE id = ? AND type = ?'
    ).bind(id, 'system').first();

    if (!existing) {
      return c.json(errorResponse('Not found', '通知不存在'), 404);
    }

    const validSubtypes = ['maintenance', 'update', 'announcement'];
    if (subtype !== undefined && !validSubtypes.includes(subtype)) {
      return c.json(errorResponse('Invalid subtype', '无效的通知类型'), 400);
    }

    // 至少传一个可更新字段，否则 SQL 无 SET 项（空更新无意义）
    const hasUpdates = [title, content, link, subtype, isActive].some((v) => v !== undefined);
    if (!hasUpdates) {
      return c.json(errorResponse('No fields to update', '没有要更新的字段'), 400);
    }

    await updateSystemNotification(c.env.DB, id, { title, content, link, subtype, isActive });

    logger.info('System notification updated', { id });

    return c.json(successResponse({ updated: true }, '更新成功'));

  } catch (error) {
    logger.error('Update system notification error', error);
    return c.json(errorResponse(
      'Failed to update system notification',
      '更新系统通知失败'
    ), 500);
  }
});

/**
 * DELETE /api/admin/notifications/system-notifications/:id
 * 删除系统通知
 */
adminNotificationRoutes.delete('/system-notifications/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = parseInt(pathParam(c.req.param('id'), 'id'));
    if (isNaN(id)) {
      return c.json(errorResponse('Invalid ID', '无效的通知ID'), 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM notifications WHERE id = ? AND type = ?'
    ).bind(id, 'system').first();

    if (!existing) {
      return c.json(errorResponse('Not found', '通知不存在'), 404);
    }

    await deleteSystemNotification(c.env.DB, id);

    logger.info('System notification deleted', { id });

    return c.json(successResponse({ deleted: true }, '删除成功'));

  } catch (error) {
    logger.error('Delete system notification error', error);
    return c.json(errorResponse(
      'Failed to delete system notification',
      '删除系统通知失败'
    ), 500);
  }
});

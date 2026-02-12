/**
 * 通知功能路由
 *
 * 功能：
 * - 获取通知列表
 * - 获取未读通知数
 * - 标记通知已读
 * - 删除通知
 *
 * @version 1.0.0
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notificationService';
import type { NotificationType } from '../types/notifications';

export const notificationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// 默认分页配置
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/notifications
 * 获取通知列表
 *
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大50）
 * - type: 筛选类型（system/interaction/private_message）
 * - isRead: 筛选已读/未读（true/false）
 */
notificationRoutes.get('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const page = parseInt(c.req.query('page') || String(DEFAULT_PAGE));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(c.req.query('limit') || String(DEFAULT_LIMIT)))
    );
    const type = c.req.query('type') as NotificationType | undefined;
    const isReadQuery = c.req.query('isRead');
    const isRead = isReadQuery !== undefined ? isReadQuery === 'true' : undefined;

    // 验证type参数
    if (type && !['system', 'interaction', 'private_message'].includes(type)) {
      return c.json(
        errorResponse('Invalid type parameter', '无效的通知类型'),
        400
      );
    }

    const result = await getNotifications(c.env.DB, currentUser.userId, {
      page,
      limit,
      type,
      isRead,
    });

    logger.info('Get notifications', {
      userId: currentUser.userId,
      page,
      limit,
      type,
      isRead,
      count: result.notifications.length,
    });

    return c.json(successResponse(result));
  } catch (error) {
    logger.error('Get notifications error', error);
    return c.json(
      errorResponse('Failed to get notifications', '获取通知列表失败'),
      500
    );
  }
});

/**
 * GET /api/notifications/unread-count
 * 获取未读通知数
 */
notificationRoutes.get('/unread-count', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;

    const result = await getUnreadCount(c.env.DB, currentUser.userId);

    logger.info('Get unread count', {
      userId: currentUser.userId,
      total: result.total,
    });

    return c.json(successResponse(result));
  } catch (error) {
    logger.error('Get unread count error', error);
    return c.json(
      errorResponse('Failed to get unread count', '获取未读数失败'),
      500
    );
  }
});

/**
 * PUT /api/notifications/:id/read
 * 标记单条通知为已读
 */
notificationRoutes.put('/:id/read', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const notificationId = parseInt(c.req.param('id'));

    if (isNaN(notificationId)) {
      return c.json(
        errorResponse('Invalid notification ID', '无效的通知ID'),
        400
      );
    }

    const success = await markAsRead(c.env.DB, notificationId, currentUser.userId);

    if (!success) {
      return c.json(
        errorResponse('Notification not found or already read', '通知不存在或已读'),
        404
      );
    }

    logger.info('Mark notification as read', {
      notificationId,
      userId: currentUser.userId,
    });

    return c.json(successResponse({ marked: true }, '已标记为已读'));
  } catch (error) {
    logger.error('Mark as read error', error);
    return c.json(
      errorResponse('Failed to mark as read', '标记已读失败'),
      500
    );
  }
});

/**
 * PUT /api/notifications/read-all
 * 标记所有通知为已读
 *
 * 请求体（可选）：
 * {
 *   type: "interaction"  // 指定类型全部已读
 * }
 */
notificationRoutes.put('/read-all', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json().catch(() => ({}));
    const type = body.type as NotificationType | undefined;

    // 验证type参数
    if (type && !['system', 'interaction', 'private_message'].includes(type)) {
      return c.json(
        errorResponse('Invalid type parameter', '无效的通知类型'),
        400
      );
    }

    const markedCount = await markAllAsRead(c.env.DB, currentUser.userId, type);

    logger.info('Mark all notifications as read', {
      userId: currentUser.userId,
      type,
      markedCount,
    });

    return c.json(
      successResponse({ markedCount }, `已标记 ${markedCount} 条通知为已读`)
    );
  } catch (error) {
    logger.error('Mark all as read error', error);
    return c.json(
      errorResponse('Failed to mark all as read', '标记全部已读失败'),
      500
    );
  }
});

/**
 * DELETE /api/notifications/:id
 * 删除通知（软删除）
 */
notificationRoutes.delete('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const notificationId = parseInt(c.req.param('id'));

    if (isNaN(notificationId)) {
      return c.json(
        errorResponse('Invalid notification ID', '无效的通知ID'),
        400
      );
    }

    const success = await deleteNotification(
      c.env.DB,
      notificationId,
      currentUser.userId
    );

    if (!success) {
      return c.json(
        errorResponse('Notification not found', '通知不存在'),
        404
      );
    }

    logger.info('Delete notification', {
      notificationId,
      userId: currentUser.userId,
    });

    return c.json(successResponse({ deleted: true }, '通知已删除'));
  } catch (error) {
    logger.error('Delete notification error', error);
    return c.json(
      errorResponse('Failed to delete notification', '删除通知失败'),
      500
    );
  }
});

/**
 * GET /api/notifications/carousel
 * 获取首页轮播通知（公开接口）
 */
notificationRoutes.get('/carousel', async (c) => {
  const logger = createLogger(c);

  try {
    // 获取active的系统通知，按创建时间倒序
    const notifications = await c.env.DB.prepare(
      `SELECT 
        n.id, n.title, n.content, n.related_data, n.created_at
      FROM notifications n
      WHERE n.type = ? AND n.subtype = ? AND n.is_active = 1 AND n.is_deleted = 0
      ORDER BY n.created_at DESC
      LIMIT 5`
    ).bind('system', 'announcement').all() as any;

    const formattedNotifications = (notifications.results || []).map((n: any) => {
      let relatedData = {};
      try {
        relatedData = JSON.parse(n.related_data || '{}');
      } catch {
        relatedData = {};
      }

      return {
        id: n.id,
        title: n.title,
        content: n.content,
        link: relatedData.link,
        createdAt: n.created_at,
      };
    });

    logger.info('Carousel notifications fetched', { 
      count: formattedNotifications.length 
    });

    return c.json(successResponse({
      notifications: formattedNotifications,
    }));

  } catch (error) {
    logger.error('Get carousel notifications error', error);
    return c.json(errorResponse(
      'Failed to get carousel notifications',
      '获取轮播通知失败'
    ), 500);
  }
});

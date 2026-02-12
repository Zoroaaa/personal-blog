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

// ============= 系统通知管理（首页轮播）=============

/**
 * GET /api/admin/system-notifications
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
    const isActive = c.req.query('isActive');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE n.type = ? AND n.subtype = ?';
    const params: any[] = ['system', 'announcement'];

    if (isActive !== undefined) {
      whereClause += ' AND n.is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }

    // 获取系统通知列表
    const notifications = await c.env.DB.prepare(
      `SELECT 
        n.id, n.title, n.content, n.related_data,
        n.is_active, n.created_at, n.updated_at
      FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all() as any;

    // 获取总数
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM notifications n ${whereClause}`
    ).bind(...params).first() as any;

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
        isActive: n.is_active === 1,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      };
    });

    logger.info('Admin get system notifications', { 
      count: formattedNotifications.length,
      page 
    });

    return c.json(successResponse({
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    }));

  } catch (error) {
    logger.error('Get system notifications error', error);
    return c.json(errorResponse(
      'Failed to get system notifications',
      '获取系统通知列表失败'
    ), 500);
  }
});

/**
 * POST /api/admin/system-notifications
 * 创建系统通知
 */
adminNotificationRoutes.post('/system-notifications', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();
    const { title, content, link, isActive = true } = body;

    // 验证必填字段
    if (!title || typeof title !== 'string') {
      return c.json(errorResponse('Title is required', '标题不能为空'), 400);
    }

    if (!content || typeof content !== 'string') {
      return c.json(errorResponse('Content is required', '内容不能为空'), 400);
    }

    // 构建related_data
    const relatedData = JSON.stringify({
      link,
      isCarousel: true,
    });

    // 插入系统通知
    const result = await c.env.DB.prepare(
      `INSERT INTO notifications (
        user_id, type, subtype, title, content, related_data,
        is_active, is_in_app_sent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      0, // user_id=0 表示系统广播
      'system',
      'announcement',
      title,
      content,
      relatedData,
      isActive ? 1 : 0,
      1
    ).run();

    if (!result.success) {
      throw new Error('Failed to create system notification');
    }

    const notificationId = result.meta.last_row_id;

    logger.info('System notification created', { notificationId, title });

    return c.json(successResponse({
      id: notificationId,
      title,
      content,
      link,
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
 * PUT /api/admin/system-notifications/:id
 * 更新系统通知
 */
adminNotificationRoutes.put('/system-notifications/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(errorResponse('Invalid ID', '无效的通知ID'), 400);
    }

    const body = await c.req.json();
    const { title, content, link, isActive } = body;

    // 检查通知是否存在
    const existing = await c.env.DB.prepare(
      'SELECT id FROM notifications WHERE id = ? AND type = ? AND subtype = ?'
    ).bind(id, 'system', 'announcement').first();

    if (!existing) {
      return c.json(errorResponse('Not found', '通知不存在'), 404);
    }

    // 构建更新字段
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (link !== undefined) {
      // 需要更新related_data
      const existingData = await c.env.DB.prepare(
        'SELECT related_data FROM notifications WHERE id = ?'
      ).bind(id).first() as any;
      
      let relatedData = {};
      try {
        relatedData = JSON.parse(existingData?.related_data || '{}');
      } catch {
        relatedData = {};
      }
      
      relatedData = { ...relatedData, link };
      updates.push('related_data = ?');
      params.push(JSON.stringify(relatedData));
    }

    if (updates.length === 0) {
      return c.json(errorResponse('No fields to update', '没有要更新的字段'), 400);
    }

    params.push(id);

    // 执行更新
    await c.env.DB.prepare(
      `UPDATE notifications SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

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
 * DELETE /api/admin/system-notifications/:id
 * 删除系统通知
 */
adminNotificationRoutes.delete('/system-notifications/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(errorResponse('Invalid ID', '无效的通知ID'), 400);
    }

    // 检查通知是否存在
    const existing = await c.env.DB.prepare(
      'SELECT id FROM notifications WHERE id = ? AND type = ? AND subtype = ?'
    ).bind(id, 'system', 'announcement').first();

    if (!existing) {
      return c.json(errorResponse('Not found', '通知不存在'), 404);
    }

    // 软删除
    await c.env.DB.prepare(
      'UPDATE notifications SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(id).run();

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



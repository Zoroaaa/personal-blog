/**
 * 用户通知订阅路由 (新位置: /api/users/notification-subscriptions)
 *
 * 功能：
 * - 订阅浏览器推送
 * - 取消订阅浏览器推送
 * - 获取订阅列表和状态
 *
 * 说明：此路由是 /api/notifications/push 的新位置
 * 旧路由将被保留用于向后兼容
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../../types';
import { successResponse, errorResponse } from '../../utils/response';
import { requireAuth } from '../../middleware/auth';
import { createLogger } from '../../middleware/requestLogger';

export const userNotificationSubscriptionsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * POST /api/users/notification-subscriptions
 * 订阅浏览器推送
 *
 * 请求体：
 * {
 *   subscription: {
 *     endpoint: "https://fcm.googleapis.com/fcm/send/...",
 *     keys: {
 *       p256dh: "BLc4xR...",
 *       auth: "k8J..."
 *     }
 *   },
 *   userAgent: "Mozilla/5.0..."
 * }
 */
userNotificationSubscriptionsRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();

    // 验证请求体
    if (!body.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      return c.json(
        errorResponse('Invalid subscription data', '订阅数据无效'),
        400
      );
    }

    const { endpoint, keys } = body.subscription;
    const { p256dh, auth } = keys;

    if (!endpoint || !p256dh || !auth) {
      return c.json(
        errorResponse('Missing subscription fields', '订阅数据不完整'),
        400
      );
    }

    // 检查是否已存在相同的订阅
    const existingSubscription = await c.env.DB.prepare(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?'
    ).bind(endpoint).first();

    if (existingSubscription) {
      // 更新现有订阅
      await c.env.DB.prepare(
        `UPDATE push_subscriptions
         SET user_id = ?, p256dh = ?, auth = ?, user_agent = ?, is_active = 1, last_used_at = CURRENT_TIMESTAMP
         WHERE endpoint = ?`
      ).bind(
        currentUser.userId,
        p256dh,
        auth,
        body.userAgent || null,
        endpoint
      ).run();

      logger.info('Update push subscription', {
        userId: currentUser.userId,
        endpoint: endpoint.substring(0, 50) + '...',
      });
    } else {
      // 创建新订阅
      await c.env.DB.prepare(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, is_active, created_at, last_used_at)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        currentUser.userId,
        endpoint,
        p256dh,
        auth,
        body.userAgent || null
      ).run();

      logger.info('Create push subscription', {
        userId: currentUser.userId,
        endpoint: endpoint.substring(0, 50) + '...',
      });
    }

    return c.json(successResponse({ subscribed: true }, '订阅成功'));
  } catch (error) {
    logger.error('Push subscribe error', error);
    return c.json(
      errorResponse('Failed to subscribe', '订阅失败'),
      500
    );
  }
});

/**
 * GET /api/users/notification-subscriptions
 * 获取当前用户的推送订阅列表
 */
userNotificationSubscriptionsRoutes.get('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;

    const subscriptions = await c.env.DB.prepare(
      `SELECT id, endpoint, user_agent, created_at, last_used_at
       FROM push_subscriptions
       WHERE user_id = ? AND is_active = 1`
    ).bind(currentUser.userId).all();

    logger.info('Get user push subscription list', {
      userId: currentUser.userId,
      count: subscriptions.results?.length || 0,
    });

    return c.json(
      successResponse({
        subscriptions: (subscriptions.results || []).map((sub: any) => ({
          id: sub.id,
          endpoint: sub.endpoint.substring(0, 50) + '...',
          userAgent: sub.user_agent,
          createdAt: sub.created_at,
          lastUsedAt: sub.last_used_at,
        })),
      })
    );
  } catch (error) {
    logger.error('Get user subscriptions error', error);
    return c.json(
      errorResponse('Failed to get subscriptions', '获取订阅列表失败'),
      500
    );
  }
});

/**
 * DELETE /api/users/notification-subscriptions/:subscriptionId
 * 取消推送订阅
 */
userNotificationSubscriptionsRoutes.delete('/:subscriptionId', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const subscriptionId = parseInt(c.req.param('subscriptionId'));

    if (isNaN(subscriptionId)) {
      return c.json(
        errorResponse('Invalid subscription ID', '无效的订阅ID'),
        400
      );
    }

    // 验证订阅属于当前用户
    const subscription = await c.env.DB.prepare(
      'SELECT user_id FROM push_subscriptions WHERE id = ?'
    ).bind(subscriptionId).first() as any;

    if (!subscription) {
      return c.json(
        errorResponse('Subscription not found', '订阅不存在'),
        404
      );
    }

    if (subscription.user_id !== currentUser.userId) {
      return c.json(
        errorResponse('Forbidden', '无权操作此订阅'),
        403
      );
    }

    // 软删除订阅（标记为无效）
    await c.env.DB.prepare(
      `UPDATE push_subscriptions
       SET is_active = 0
       WHERE id = ?`
    ).bind(subscriptionId).run();

    logger.info('Cancel push subscription', {
      userId: currentUser.userId,
      subscriptionId,
    });

    return c.json(successResponse({ unsubscribed: true }, '已取消订阅'));
  } catch (error) {
    logger.error('Cancel subscription error', error);
    return c.json(
      errorResponse('Failed to unsubscribe', '取消订阅失败'),
      500
    );
  }
});

/**
 * GET /api/users/notification-subscriptions/status
 * 获取当前用户的推送订阅状态
 */
userNotificationSubscriptionsRoutes.get('/status', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;

    const subscriptions = await c.env.DB.prepare(
      `SELECT id, endpoint, user_agent, created_at, last_used_at
       FROM push_subscriptions
       WHERE user_id = ? AND is_active = 1`
    ).bind(currentUser.userId).all();

    logger.info('Get push subscription status', {
      userId: currentUser.userId,
      count: subscriptions.results?.length || 0,
    });

    return c.json(
      successResponse({
        isSubscribed: (subscriptions.results?.length || 0) > 0,
        subscriptions: (subscriptions.results || []).map((sub: any) => ({
          id: sub.id,
          endpoint: sub.endpoint.substring(0, 50) + '...',
          userAgent: sub.user_agent,
          createdAt: sub.created_at,
          lastUsedAt: sub.last_used_at,
        })),
      })
    );
  } catch (error) {
    logger.error('Get push status error', error);
    return c.json(
      errorResponse('Failed to get status', '获取订阅状态失败'),
      500
    );
  }
});

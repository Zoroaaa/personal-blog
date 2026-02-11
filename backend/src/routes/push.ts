/**
 * 浏览器推送路由
 *
 * 功能：
 * - 订阅浏览器推送
 * - 取消订阅浏览器推送
 *
 * @version 1.0.0
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';

export const pushRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * POST /api/notifications/push/subscribe
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
pushRoutes.post('/subscribe', requireAuth, async (c) => {
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
 * POST /api/notifications/push/unsubscribe
 * 取消订阅浏览器推送
 *
 * 请求体：
 * {
 *   endpoint: "https://fcm.googleapis.com/fcm/send/..."
 * }
 */
pushRoutes.post('/unsubscribe', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();

    if (!body.endpoint) {
      return c.json(
        errorResponse('Missing endpoint', '缺少端点信息'),
        400
      );
    }

    // 软删除订阅（标记为无效）
    const result = await c.env.DB.prepare(
      `UPDATE push_subscriptions 
       SET is_active = 0
       WHERE endpoint = ? AND user_id = ?`
    ).bind(body.endpoint, currentUser.userId).run();

    if (result.meta?.changes === 0) {
      return c.json(
        errorResponse('Subscription not found', '订阅不存在'),
        404
      );
    }

    logger.info('Unsubscribe push notification', {
      userId: currentUser.userId,
      endpoint: body.endpoint.substring(0, 50) + '...',
    });

    return c.json(successResponse({ unsubscribed: true }, '已取消订阅'));
  } catch (error) {
    logger.error('Push unsubscribe error', error);
    return c.json(
      errorResponse('Failed to unsubscribe', '取消订阅失败'),
      500
    );
  }
});

/**
 * GET /api/notifications/push/status
 * 获取当前用户的推送订阅状态
 */
pushRoutes.get('/status', requireAuth, async (c) => {
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

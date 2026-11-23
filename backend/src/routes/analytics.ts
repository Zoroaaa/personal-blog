/**
 * 数据分析路由（重构版）
 *
 * 功能：
 * - 页面浏览统计
 * - 文章阅读量统计
 * - 热门排行
 *
 * @version 2.1.0
 * @author 博客系统
 * @created 2024-01-01
 * @refactored 2026-02-16
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse, getStatus } from '../utils/response';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { rateLimit } from '../middleware/rateLimit';
import { safeParseInt, pathParam } from '../utils/validation';
import { AnalyticsService } from '../services/analyticsService';
import { ANALYTICS_CONSTANTS, RATE_LIMIT_CONSTANTS } from '../config/constants';

export const analyticsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

analyticsRoutes.use('/', requireAuth);
analyticsRoutes.use('/stats', requireAuth);
analyticsRoutes.use('/post/*', requireAuth);
analyticsRoutes.use('/users', requireAuth);

analyticsRoutes.get('/', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const result = await AnalyticsService.getOverview(c.env.DB);

    logger.info('Stats fetched successfully');

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get stats error', error);
    return c.json(errorResponse('Failed to fetch stats', 'An error occurred while fetching statistics'), 500);
  }
});

analyticsRoutes.get('/hot-posts', async (c) => {
  const logger = createLogger(c);

  try {
    const limit = Math.min(ANALYTICS_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), ANALYTICS_CONSTANTS.DEFAULT_PAGE_SIZE)));
    const days = Math.max(1, safeParseInt(c.req.query('days'), 7));

    const result = await AnalyticsService.getHotPosts(c.env.DB, limit, days);

    logger.info('Hot posts fetched successfully', { count: result.data?.hotPosts?.length, days });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get hot posts error', error);
    return c.json(errorResponse('Failed to fetch hot posts', 'An error occurred while fetching hot posts'), 500);
  }
});

analyticsRoutes.get('/stats', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const result = await AnalyticsService.getStats(c.env.DB);

    logger.info('Stats fetched successfully');

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get stats error', error);
    return c.json(errorResponse('Failed to fetch stats', 'An error occurred while fetching statistics'), 500);
  }
});

analyticsRoutes.get('/post/:id', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const postId = pathParam(c.req.param('id'), 'id');
    const result = await AnalyticsService.getPostAnalytics(c.env.DB, postId);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Post analytics fetched successfully', { postId });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get post analytics error', error);
    return c.json(errorResponse('Failed to fetch post analytics', 'An error occurred while fetching post analytics'), 500);
  }
});

analyticsRoutes.get('/users', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const limit = Math.min(ANALYTICS_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), ANALYTICS_CONSTANTS.DEFAULT_PAGE_SIZE)));
    const result = await AnalyticsService.getUserAnalytics(c.env.DB, limit);

    logger.info('User analytics fetched successfully', { count: result.data?.users?.length });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get user analytics error', error);
    return c.json(errorResponse('Failed to fetch user analytics', 'An error occurred while fetching user analytics'), 500);
  }
});

analyticsRoutes.post('/track',
  rateLimit({
    windowMs: RATE_LIMIT_CONSTANTS.WINDOW_1_MINUTE,
    maxRequests: RATE_LIMIT_CONSTANTS.ANALYTICS_TRACK_MAX_REQUESTS,
    message: '1 分钟内最多上报 60 次浏览事件'
  }),
  async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();
    const { postId, referrer } = body;

    const user = c.get('user');
    const userId = user?.userId || null;

    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown';

    const result = await AnalyticsService.trackView(c.env.DB, postId, userId, ip, referrer);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    // view_count 只有唯一自增入口：posts.ts 详情页 getPostBySlug 成功后的 waitUntil 自增。
    // 此处曾同时 +1，详情页一次访问会被双计；track 只负责写 view_history 事件（趋势/去重访客），
    // 不再动 posts.view_count。

    logger.info('Page view tracked', { postId, userId: userId || 'anonymous' });

    return c.json(successResponse({ tracked: true }));
  } catch (error) {
    logger.error('Track page view error', error);
    return c.json(successResponse({ tracked: false }));
  }
});

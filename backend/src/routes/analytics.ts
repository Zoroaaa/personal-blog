/**
 * 数据分析相关路由
 * 
 * 功能：
 * - 页面浏览统计
 * - 文章阅读量统计
 * - 基础来源分析
 * - 简单的热门排行
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import { Env, successResponse, errorResponse } from '../index';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { safeParseInt } from '../utils/validation';

export const analyticsRoutes = new Hono<{ Bindings: Env }>();

// ============= 常量配置 =============

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const CACHE_TTL = {
  HOT_POSTS: 300,      // 5分钟
  STATS: 600           // 10分钟
};

// ============= 热门文章 =============

/**
 * GET /api/analytics/hot-posts
 * 获取热门文章（公开）
 * 
 * 查询参数：
 * - limit: 数量限制（默认10，最大50）
 * - days: 时间范围（默认7天）
 */
analyticsRoutes.get('/hot-posts', async (c) => {
  const logger = createLogger(c);
  
  try {
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const days = Math.max(1, safeParseInt(c.req.query('days'), 7));
    
    // 尝试从缓存获取
    const cacheKey = `analytics:hot-posts:${limit}:${days}`;
    const cached = await c.env.CACHE.get(cacheKey);
    
    if (cached) {
      logger.info('Hot posts served from cache');
      return c.json(JSON.parse(cached));
    }
    
    // 计算时间范围
    const timeRange = new Date();
    timeRange.setDate(timeRange.getDate() - days);
    
    // 查询热门文章（按浏览量排序）
    const { results } = await c.env.DB.prepare(`
      SELECT p.id, p.title, p.slug, p.view_count, p.like_count, p.comment_count,
             p.published_at, p.cover_image,
             u.username as author_name, u.display_name as author_display_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'published' AND p.visibility = 'public'
        AND p.published_at >= ?
      ORDER BY p.view_count DESC, p.like_count DESC
      LIMIT ?
    `).bind(timeRange.toISOString(), limit).all();
    
    const response = successResponse({
      hotPosts: results,
      limit,
      days
    });
    
    // 缓存结果
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL.HOT_POSTS
    });
    
    logger.info('Hot posts fetched successfully', { count: results.length, days });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get hot posts error', error);
    return c.json(errorResponse(
      'Failed to fetch hot posts',
      'An error occurred while fetching hot posts'
    ), 500);
  }
});

// ============= 基础统计 =============

/**
 * GET /api/analytics/stats
 * 获取基础统计数据（需要管理员权限）
 */
analyticsRoutes.get('/stats', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    // 尝试从缓存获取
    const cacheKey = 'analytics:stats';
    const cached = await c.env.CACHE.get(cacheKey);
    
    if (cached) {
      logger.info('Stats served from cache');
      return c.json(JSON.parse(cached));
    }
    
    // 1. 总文章数
    const totalPostsResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE status = ?'
    ).bind('published').first() as any;
    const totalPosts = totalPostsResult?.count || 0;
    
    // 2. 总用户数
    const totalUsersResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE status = ?'
    ).bind('active').first() as any;
    const totalUsers = totalUsersResult?.count || 0;
    
    // 3. 总评论数
    const totalCommentsResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE status = ?'
    ).bind('approved').first() as any;
    const totalComments = totalCommentsResult?.count || 0;
    
    // 4. 总浏览量
    const totalViewsResult = await c.env.DB.prepare(
      'SELECT SUM(view_count) as total FROM posts'
    ).first() as any;
    const totalViews = totalViewsResult?.total || 0;
    
    // 5. 今日浏览量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayViewsResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM view_history WHERE created_at >= ?
    `).bind(today.toISOString()).first() as any;
    const todayViews = todayViewsResult?.count || 0;
    
    // 6. 最近7天的浏览趋势
    const viewTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayViewsResult = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM view_history 
        WHERE created_at >= ? AND created_at < ?
      `).bind(date.toISOString(), nextDay.toISOString()).first() as any;
      
      viewTrend.push({
        date: date.toISOString().split('T')[0],
        views: dayViewsResult?.count || 0
      });
    }
    
    // 7. 分类统计
    const { results: categoryStats } = await c.env.DB.prepare(`
      SELECT c.name, c.slug, c.post_count
      FROM categories c
      ORDER BY c.post_count DESC
    `).all();
    
    // 8. 标签统计（前10个）
    const { results: tagStats } = await c.env.DB.prepare(`
      SELECT t.name, t.slug, t.post_count
      FROM tags t
      ORDER BY t.post_count DESC
      LIMIT 10
    `).all();
    
    const response = successResponse({
      overview: {
        totalPosts,
        totalUsers,
        totalComments,
        totalViews,
        todayViews
      },
      viewTrend,
      categoryStats,
      tagStats
    });
    
    // 缓存结果
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL.STATS
    });
    
    logger.info('Stats fetched successfully');
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get stats error', error);
    return c.json(errorResponse(
      'Failed to fetch stats',
      'An error occurred while fetching statistics'
    ), 500);
  }
});

// ============= 文章分析 =============

/**
 * GET /api/analytics/post/:id
 * 获取单篇文章的详细分析（需要管理员权限）
 */
analyticsRoutes.get('/post/:id', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const postId = c.req.param('id');
    
    if (!postId) {
      return c.json(errorResponse('Invalid post ID'), 400);
    }
    
    // 检查文章是否存在
    const post = await c.env.DB.prepare(
      'SELECT id, title, slug FROM posts WHERE id = ?'
    ).bind(postId).first() as any;
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    // 1. 基本信息
    const { results: postStats } = await c.env.DB.prepare(`
      SELECT p.view_count, p.like_count, p.comment_count, p.created_at, p.published_at,
             COUNT(DISTINCT vh.user_id) as unique_visitors
      FROM posts p
      LEFT JOIN view_history vh ON vh.post_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).bind(postId).all();
    
    // 2. 最近7天的浏览趋势
    const viewTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayViewsResult = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM view_history 
        WHERE post_id = ? AND created_at >= ? AND created_at < ?
      `).bind(postId, date.toISOString(), nextDay.toISOString()).first() as any;
      
      viewTrend.push({
        date: date.toISOString().split('T')[0],
        views: dayViewsResult?.count || 0
      });
    }
    
    // 3. 来源分析（简单实现）
    const { results: referrerStats } = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%bing%' THEN 'Bing'
          WHEN referrer LIKE '%yahoo%' THEN 'Yahoo'
          WHEN referrer LIKE '%baidu%' THEN 'Baidu'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referrer LIKE '%instagram%' THEN 'Instagram'
          WHEN referrer LIKE '%reddit%' THEN 'Reddit'
          WHEN referrer LIKE '%github%' THEN 'GitHub'
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          ELSE 'Other'
        END as source,
        COUNT(*) as count
      FROM view_history
      WHERE post_id = ?
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `).bind(postId).all();
    
    const response = successResponse({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug
      },
      stats: postStats[0] || {},
      viewTrend,
      referrerStats
    });
    
    logger.info('Post analytics fetched successfully', { postId: post.id });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get post analytics error', error);
    return c.json(errorResponse(
      'Failed to fetch post analytics',
      'An error occurred while fetching post analytics'
    ), 500);
  }
});

// ============= 用户分析 =============

/**
 * GET /api/analytics/users
 * 获取用户统计（需要管理员权限）
 * 
 * 查询参数：
 * - limit: 数量限制（默认10，最大50）
 */
analyticsRoutes.get('/users', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    
    // 尝试从缓存获取
    const cacheKey = `analytics:users:${limit}`;
    const cached = await c.env.CACHE.get(cacheKey);
    
    if (cached) {
      logger.info('User analytics served from cache');
      return c.json(JSON.parse(cached));
    }
    
    // 获取活跃用户（按文章数和评论数排序）
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.avatar_url,
             u.post_count, u.comment_count, u.created_at, u.last_login_at
      FROM users u
      WHERE u.status = 'active'
      ORDER BY (u.post_count + u.comment_count) DESC
      LIMIT ?
    `).bind(limit).all();
    
    const response = successResponse({
      users: results,
      limit
    });
    
    // 缓存结果
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL.STATS
    });
    
    logger.info('User analytics fetched successfully', { count: results.length });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get user analytics error', error);
    return c.json(errorResponse(
      'Failed to fetch user analytics',
      'An error occurred while fetching user analytics'
    ), 500);
  }
});

// ============= 记录页面访问 =============

/**
 * POST /api/analytics/track
 * 记录页面访问（公开）
 * 
 * 请求体：
 * {
 *   postId: number,
 *   referrer?: string
 * }
 */
analyticsRoutes.post('/track', async (c) => {
  const logger = createLogger(c);
  
  try {
    const body = await c.req.json();
    const { postId, referrer } = body;
    
    if (!postId) {
      return c.json(errorResponse(
        'Missing postId',
        'postId is required for tracking'
      ), 400);
    }
    
    // 检查文章是否存在
    const post = await c.env.DB.prepare(
      'SELECT id FROM posts WHERE id = ?'
    ).bind(postId).first();
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    // 获取用户信息（如果已登录）
    const user = c.get('user') as any;
    const userId = user?.userId || null;
    
    // 获取IP地址
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown';
    
    // 记录访问
    await c.env.DB.prepare(`
      INSERT INTO view_history (post_id, user_id, ip_address, referrer, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(postId, userId, ip, referrer || null).run();
    
    // 异步更新文章浏览计数
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        'UPDATE posts SET view_count = view_count + 1 WHERE id = ?'
      ).bind(postId).run()
    );
    
    logger.info('Page view tracked', { postId, userId: userId || 'anonymous' });
    
    return c.json(successResponse({ tracked: true }));
    
  } catch (error) {
    logger.error('Track page view error', error);
    // 跟踪失败不应影响用户体验，返回成功
    return c.json(successResponse({ tracked: false }));
  }
});

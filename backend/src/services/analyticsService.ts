/**
 * 数据分析服务
 *
 * 功能：
 * - 系统统计数据
 * - 热门文章统计
 * - 文章分析
 * - 用户统计
 * - 页面访问追踪
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import { safeParseInt } from '../utils/validation';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface AnalyticsResult {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export class AnalyticsService {
  static async getOverview(db: any): Promise<AnalyticsResult> {
    const totalPostsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE status = ? AND deleted_at IS NULL'
    ).bind('published').first() as any;
    const totalPosts = totalPostsResult?.count || 0;

    const totalUsersResult = await db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE status = ? AND deleted_at IS NULL'
    ).bind('active').first() as any;
    const totalUsers = totalUsersResult?.count || 0;

    const totalCommentsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE status = ? AND deleted_at IS NULL'
    ).bind('approved').first() as any;
    const totalComments = totalCommentsResult?.count || 0;

    const totalViewsResult = await db.prepare(
      'SELECT SUM(view_count) as total FROM posts WHERE deleted_at IS NULL'
    ).first() as any;
    const totalViews = totalViewsResult?.total || 0;

    const { results: recentPosts } = await db.prepare(`
      SELECT id, title, slug, published_at as createdAt
      FROM posts 
      WHERE status = 'published' AND deleted_at IS NULL
      ORDER BY published_at DESC 
      LIMIT 5
    `).all();

    const { results: recentComments } = await db.prepare(`
      SELECT c.id, c.content, c.created_at as createdAt,
             u.username, u.display_name as displayName, u.avatar_url as avatarUrl
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.status = 'approved' AND c.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 5
    `).all();

    const viewTrend = await this.getViewTrend(db, null, 7);

    return {
      success: true,
      data: {
        totalPosts,
        totalComments,
        totalUsers,
        totalViews,
        recentPosts,
        recentComments,
        viewTrend
      }
    };
  }

  static async getStats(db: any): Promise<AnalyticsResult> {
    const totalPostsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE status = ? AND deleted_at IS NULL'
    ).bind('published').first() as any;
    const totalPosts = totalPostsResult?.count || 0;

    const totalUsersResult = await db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE status = ? AND deleted_at IS NULL'
    ).bind('active').first() as any;
    const totalUsers = totalUsersResult?.count || 0;

    const totalCommentsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE status = ? AND deleted_at IS NULL'
    ).bind('approved').first() as any;
    const totalComments = totalCommentsResult?.count || 0;

    const totalViewsResult = await db.prepare(
      'SELECT SUM(view_count) as total FROM posts WHERE deleted_at IS NULL'
    ).first() as any;
    const totalViews = totalViewsResult?.total || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayViewsResult = await db.prepare(`
      SELECT COUNT(*) as count FROM view_history WHERE created_at >= ?
    `).bind(today.toISOString()).first() as any;
    const todayViews = todayViewsResult?.count || 0;

    const viewTrend = await this.getViewTrend(db, null, 7);

    const { results: categoryStats } = await db.prepare(`
      SELECT c.name, c.slug, c.post_count
      FROM categories c
      WHERE c.deleted_at IS NULL
      ORDER BY c.post_count DESC
    `).all();

    const { results: tagStats } = await db.prepare(`
      SELECT t.name, t.slug, t.post_count
      FROM tags t
      WHERE t.deleted_at IS NULL
      ORDER BY t.post_count DESC
      LIMIT 10
    `).all();

    return {
      success: true,
      data: {
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
      }
    };
  }

  static async getHotPosts(db: any, limit: number, days: number): Promise<AnalyticsResult> {
    const timeRange = new Date();
    timeRange.setDate(timeRange.getDate() - days);

    const { results } = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.view_count, p.like_count, p.comment_count,
             p.published_at, p.cover_image,
             u.username as author_name, u.display_name as author_display_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
        AND p.published_at >= ?
      ORDER BY p.view_count DESC, p.like_count DESC
      LIMIT ?
    `).bind(timeRange.toISOString(), limit).all();

    return {
      success: true,
      data: {
        hotPosts: results,
        limit,
        days
      }
    };
  }

  static async getPostAnalytics(db: any, postId: string): Promise<AnalyticsResult> {
    if (!postId) {
      return {
        success: false,
        message: 'Invalid post ID',
        statusCode: 400
      };
    }

    const post = await db.prepare(
      'SELECT id, title, slug FROM posts WHERE id = ? AND deleted_at IS NULL'
    ).bind(postId).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    const { results: postStats } = await db.prepare(`
      SELECT p.view_count, p.like_count, p.comment_count, p.created_at, p.published_at,
             COUNT(DISTINCT vh.user_id) as unique_visitors
      FROM posts p
      LEFT JOIN view_history vh ON vh.post_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).bind(postId).all();

    const viewTrend = await this.getViewTrend(db, postId, 7);

    const { results: referrerStats } = await db.prepare(`
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

    return {
      success: true,
      data: {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug
        },
        stats: postStats[0] || {},
        viewTrend,
        referrerStats
      }
    };
  }

  static async getUserAnalytics(db: any, limit: number): Promise<AnalyticsResult> {
    const { results } = await db.prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.avatar_url,
             u.post_count, u.comment_count, u.created_at, u.last_login_at
      FROM users u
      WHERE u.status = 'active' AND u.deleted_at IS NULL
      ORDER BY (u.post_count + u.comment_count) DESC
      LIMIT ?
    `).bind(limit).all();

    return {
      success: true,
      data: {
        users: results,
        limit
      }
    };
  }

  static async trackView(db: any, postId: string, userId: number | null, ip: string, referrer: string | null): Promise<AnalyticsResult> {
    if (!postId) {
      return {
        success: false,
        message: 'postId is required for tracking',
        statusCode: 400
      };
    }

    const post = await db.prepare(
      'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL'
    ).bind(postId).first();

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    await db.prepare(`
      INSERT INTO view_history (post_id, user_id, ip_address, referrer, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(postId, userId, ip, referrer || null).run();

    return {
      success: true,
      data: { tracked: true }
    };
  }

  private static async getViewTrend(db: any, postId: string | null, days: number): Promise<any[]> {
    const viewTrend = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      let dayViewsResult;

      if (postId) {
        dayViewsResult = await db.prepare(`
          SELECT COUNT(*) as count FROM view_history 
          WHERE post_id = ? AND created_at >= ? AND created_at < ?
        `).bind(postId, date.toISOString(), nextDay.toISOString()).first() as any;
      } else {
        dayViewsResult = await db.prepare(`
          SELECT COUNT(*) as count FROM view_history 
          WHERE created_at >= ? AND created_at < ?
        `).bind(date.toISOString(), nextDay.toISOString()).first() as any;
      }

      viewTrend.push({
        date: date.toISOString().split('T')[0],
        views: dayViewsResult?.count || 0
      });
    }

    return viewTrend;
  }
}

export const ANALYTICS_CONSTANTS = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
};

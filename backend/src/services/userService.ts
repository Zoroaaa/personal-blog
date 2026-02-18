/**
 * 用户服务
 *
 * 功能：
 * - 用户搜索（用于私信）
 * - 获取用户公开资料
 * - 获取用户文章列表
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import type { TotalResult, TagRowWithPostId } from '../types/database';

export interface UserSearchQuery {
  username: string;
}

export interface UserProfileQuery {
  userId: number;
}

export interface UserPostsQuery {
  userId: number;
  page?: number;
  limit?: number;
}

export interface UserResult {
  success: boolean;
  user?: any;
  posts?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export class UserService {
  static async searchUser(
    db: any,
    query: UserSearchQuery
  ): Promise<UserResult> {
    const { username } = query;

    if (!username || username.trim().length === 0) {
      return {
        success: false,
        message: '用户名不能为空',
        statusCode: 400
      };
    }

    const sanitizedUsername = username.trim().toLowerCase();

    const user = await db.prepare(`
      SELECT id, username, display_name, avatar_url, bio
      FROM users
      WHERE LOWER(username) = ? AND deleted_at IS NULL
      LIMIT 1
    `).bind(sanitizedUsername).first();

    if (!user) {
      return {
        success: true,
        user: null,
        message: '未找到用户'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio
      }
    };
  }

  static async getUserProfile(
    db: any,
    query: UserProfileQuery
  ): Promise<UserResult> {
    const { userId } = query;

    if (isNaN(userId) || userId <= 0) {
      return {
        success: false,
        message: '无效的用户ID',
        statusCode: 400
      };
    }

    const user = await db.prepare(`
      SELECT id, username, display_name, avatar_url, bio, created_at,
             (SELECT COUNT(*) FROM posts WHERE author_id = users.id AND status = 'published' AND deleted_at IS NULL) as post_count,
             (SELECT COUNT(*) FROM comments WHERE user_id = users.id AND deleted_at IS NULL) as comment_count
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(userId).first();

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
        statusCode: 404
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
        postCount: user.post_count,
        commentCount: user.comment_count
      }
    };
  }

  static async getUserPosts(
    db: any,
    query: UserPostsQuery
  ): Promise<UserResult> {
    const { userId } = query;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    if (isNaN(userId) || userId <= 0) {
      return {
        success: false,
        message: '无效的用户ID',
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(userId).first();

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
        statusCode: 404
      };
    }

    const { results } = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE p.author_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM posts
      WHERE author_id = ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL
    `).bind(userId).first() as TotalResult | null;
    const total = countResult?.total || 0;

    const postIds = (results as { id: number }[]).map(p => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsSql = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await db.prepare(tagsSql).bind(...postIds).all();

      const tagsByPost = new Map();
      (tagResults as TagRowWithPostId[]).forEach(tag => {
        if (!tagsByPost.has(tag.post_id)) {
          tagsByPost.set(tag.post_id, []);
        }
        tagsByPost.get(tag.post_id).push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        });
      });

      postsWithTags = (results as { id: number }[]).map(post => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }

    return {
      success: true,
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export const USER_CONSTANTS = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
};

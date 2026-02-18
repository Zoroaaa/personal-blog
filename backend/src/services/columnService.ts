/**
 * 专栏服务
 *
 * 功能：
 * - 专栏CRUD操作
 * - 获取专栏下的文章列表
 * - 刷新专栏统计数据
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import {
  validateLength,
  validateSlug,
  sanitizeInput,
  generateSlug,
  safeParseInt
} from '../utils/validation';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';
import type { ColumnRow, TotalResult, TagRowWithPostId } from '../types/database';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const ALLOWED_SORT_FIELDS = ['created_at', 'post_count', 'total_view_count', 'total_like_count', 'display_order'];
const ALLOWED_POST_SORT_FIELDS = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
const VALID_STATUSES = ['active', 'hidden', 'archived'];

export interface ColumnListQuery {
  page?: number;
  limit?: number;
  author?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface ColumnPostsQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface ColumnCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  displayOrder?: number;
}

export interface ColumnUpdateRequest {
  name?: string;
  description?: string;
  coverImage?: string;
  displayOrder?: number;
  status?: string;
}

export interface ColumnResult {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export class ColumnService {
  static async getColumns(db: any, query: ColumnListQuery): Promise<ColumnResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const author = query.author;
    const sortBy = query.sortBy || 'display_order';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const finalSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'display_order';

    let sql = `
      SELECT
        col.id, col.name, col.slug, col.description, col.cover_image,
        col.post_count, col.total_view_count, col.total_like_count,
        col.total_favorite_count, col.total_comment_count,
        col.display_order, col.status, col.created_at, col.updated_at,
        u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
      FROM columns col
      LEFT JOIN users u ON col.author_id = u.id
      WHERE col.status IN ('active', 'archived') AND col.deleted_at IS NULL
    `;

    const params: any[] = [];

    if (author) {
      sql += ` AND u.username = ?`;
      params.push(author);
    }

    sql += ` ORDER BY col.${finalSortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await db.prepare(sql).bind(...params).all();

    let countSql = `
      SELECT COUNT(*) as total
      FROM columns col
      LEFT JOIN users u ON col.author_id = u.id
      WHERE col.status IN ('active', 'archived') AND col.deleted_at IS NULL
    `;
    const countParams: any[] = [];

    if (author) {
      countSql += ' AND u.username = ?';
      countParams.push(author);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first() as TotalResult | null;
    const total = countResult?.total || 0;

    return {
      success: true,
      data: {
        columns: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  static async getColumnBySlug(db: any, slug: string): Promise<ColumnResult> {
    if (!slug) {
      return {
        success: false,
        message: 'Invalid slug',
        statusCode: 400
      };
    }

    const column = await db.prepare(`
      SELECT
        col.*,
        u.username as author_username,
        u.display_name as author_name,
        u.avatar_url as author_avatar,
        u.bio as author_bio
      FROM columns col
      LEFT JOIN users u ON col.author_id = u.id
      WHERE col.slug = ? AND col.status IN ('active', 'archived') AND col.deleted_at IS NULL
    `).bind(slug).first();

    if (!column) {
      return {
        success: false,
        message: 'Column not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: column
    };
  }

  static async getColumnPosts(db: any, slug: string, query: ColumnPostsQuery): Promise<ColumnResult> {
    if (!slug) {
      return {
        success: false,
        message: 'Invalid slug',
        statusCode: 400
      };
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const sortBy = query.sortBy || 'published_at';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const finalSortBy = ALLOWED_POST_SORT_FIELDS.includes(sortBy) ? sortBy : 'published_at';

    const column = await db.prepare(
      'SELECT id, status FROM columns WHERE slug = ? AND deleted_at IS NULL'
    ).bind(slug).first() as { id: number; status: string } | null;

    if (!column) {
      return {
        success: false,
        message: 'Column not found',
        statusCode: 404
      };
    }

    if (column.status === 'hidden') {
      return {
        success: false,
        message: '该专栏已隐藏',
        statusCode: 403
      };
    }

    let sql = `
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name,
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.column_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `;

    sql += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;

    const { results } = await db.prepare(sql).bind(column.id, limit, offset).all();

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.column_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `).bind(column.id).first() as TotalResult | null;
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
      data: {
        posts: postsWithTags,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  static async createColumn(db: any, userId: number, body: ColumnCreateRequest): Promise<ColumnResult> {
    let { name, slug, description, coverImage, displayOrder } = body;

    if (!name) {
      return {
        success: false,
        message: 'Name is required',
        statusCode: 400
      };
    }

    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : undefined;

    const nameError = validateLength(name, MIN_NAME_LENGTH, MAX_NAME_LENGTH, 'Name');
    if (nameError) {
      return {
        success: false,
        message: nameError,
        statusCode: 400
      };
    }

    if (description) {
      const descError = validateLength(description, 0, MAX_DESCRIPTION_LENGTH, 'Description');
      if (descError) {
        return {
          success: false,
          message: descError,
          statusCode: 400
        };
      }
    }

    if (!slug) {
      slug = generateSlug(name);
    } else {
      const slugError = validateSlug(slug);
      if (slugError) {
        return {
          success: false,
          message: slugError,
          statusCode: 400
        };
      }
    }

    const existing = await db.prepare(
      'SELECT id FROM columns WHERE name = ? OR slug = ?'
    ).bind(name, slug).first();

    if (existing) {
      return {
        success: false,
        message: 'A column with this name or slug already exists',
        statusCode: 409
      };
    }

    const result = await db.prepare(`
      INSERT INTO columns (
        name, slug, description, cover_image, author_id,
        display_order, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      name,
      slug,
      description,
      coverImage || null,
      userId,
      displayOrder || 0
    ).run();

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create column',
        statusCode: 500
      };
    }

    return {
      success: true,
      data: {
        id: result.meta.last_row_id,
        slug
      },
      message: 'Column created successfully'
    };
  }

  static async updateColumn(db: any, id: string, body: ColumnUpdateRequest): Promise<ColumnResult> {
    const column = await db.prepare(
      'SELECT * FROM columns WHERE id = ?'
    ).bind(id).first() as ColumnRow | null;

    if (!column) {
      return {
        success: false,
        message: 'Column not found',
        statusCode: 404
      };
    }

    let { name, description, coverImage, displayOrder, status } = body;

    if (name) {
      name = sanitizeInput(name);
      const nameError = validateLength(name, MIN_NAME_LENGTH, MAX_NAME_LENGTH, 'Name');
      if (nameError) {
        return {
          success: false,
          message: nameError,
          statusCode: 400
        };
      }
    }

    if (description !== undefined) {
      description = sanitizeInput(description);
      const descError = validateLength(description, 0, MAX_DESCRIPTION_LENGTH, 'Description');
      if (descError) {
        return {
          success: false,
          message: descError,
          statusCode: 400
        };
      }
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return {
        success: false,
        message: 'Invalid status',
        statusCode: 400
      };
    }

    await db.prepare(`
      UPDATE columns
      SET name = ?, description = ?, cover_image = ?,
          display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name || column.name,
      description !== undefined ? description : column.description,
      coverImage !== undefined ? coverImage : column.cover_image,
      displayOrder !== undefined ? displayOrder : column.display_order,
      status || column.status,
      id
    ).run();

    return {
      success: true,
      data: { updated: true },
      message: 'Column updated successfully'
    };
  }

  static async deleteColumn(db: any, id: string): Promise<ColumnResult> {
    const column = await db.prepare(
      'SELECT * FROM columns WHERE id = ?'
    ).bind(id).first() as ColumnRow | null;

    if (!column) {
      return {
        success: false,
        message: 'Column not found',
        statusCode: 404
      };
    }

    const postCount = await db.prepare(`
      SELECT COUNT(*) as count FROM posts
      WHERE column_id = ? AND status = 'published'
    `).bind(id).first() as { count: number } | null;

    if (postCount && postCount.count > 0) {
      return {
        success: false,
        message: `This column has ${postCount.count} published post(s). Please reassign or delete those posts first.`,
        statusCode: 400
      };
    }

    await SoftDeleteHelper.softDelete(db, 'columns', id);

    return {
      success: true,
      data: { deleted: true },
      message: 'Column deleted successfully'
    };
  }

  static async refreshStats(db: any, id: string): Promise<ColumnResult> {
    const column = await db.prepare(
      'SELECT id FROM columns WHERE id = ?'
    ).bind(id).first();

    if (!column) {
      return {
        success: false,
        message: 'Column not found',
        statusCode: 404
      };
    }

    const stats = await db.prepare(`
      SELECT
        COUNT(*) as post_count,
        COALESCE(SUM(view_count), 0) as total_view_count,
        COALESCE(SUM(like_count), 0) as total_like_count,
        COALESCE(SUM(comment_count), 0) as total_comment_count
      FROM posts
      WHERE column_id = ? AND status = 'published'
    `).bind(id).first() as { post_count: number; total_view_count: number; total_like_count: number; total_comment_count: number } | null;

    const favoriteStats = await db.prepare(`
      SELECT COUNT(*) as total_favorite_count
      FROM favorites f
      JOIN posts p ON f.post_id = p.id
      WHERE p.column_id = ? AND p.status = 'published'
    `).bind(id).first() as { total_favorite_count: number } | null;

    const postCount = stats?.post_count || 0;
    const totalViewCount = stats?.total_view_count || 0;
    const totalLikeCount = stats?.total_like_count || 0;
    const totalCommentCount = stats?.total_comment_count || 0;
    const totalFavoriteCount = favoriteStats?.total_favorite_count || 0;

    await db.prepare(`
      UPDATE columns
      SET post_count = ?,
          total_view_count = ?,
          total_like_count = ?,
          total_favorite_count = ?,
          total_comment_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      postCount,
      totalViewCount,
      totalLikeCount,
      totalFavoriteCount,
      totalCommentCount,
      id
    ).run();

    return {
      success: true,
      data: {
        postCount,
        totalViewCount,
        totalLikeCount,
        totalFavoriteCount,
        totalCommentCount
      },
      message: 'Column stats refreshed successfully'
    };
  }
}

export const COLUMN_CONSTANTS = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  ALLOWED_SORT_FIELDS,
  ALLOWED_POST_SORT_FIELDS,
  VALID_STATUSES
};

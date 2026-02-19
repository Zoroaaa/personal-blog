/**
 * 分类和标签服务
 *
 * 功能：
 * - 分类CRUD操作
 * - 标签CRUD操作
 * - 获取分类/标签下的文章列表
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import {
  validateSlug,
  sanitizeInput,
  generateSlug,
  safeParseInt
} from '../utils/validation';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';
import { CATEGORY_CONSTANTS } from '../config/constants';
import type { CategoryRow, TagRow, TotalResult, CountResult, TagRowWithPostId } from '../types/database';

export interface CategoryCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface TagCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
}

export interface TagUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface PostsQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface CategoryResult {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export class CategoryService {
  static async getCategories(db: any): Promise<CategoryResult> {
    const { results } = await db.prepare(`
      SELECT * FROM categories
      WHERE deleted_at IS NULL
      ORDER BY display_order ASC, name ASC
    `).all();

    return {
      success: true,
      data: { categories: results }
    };
  }

  static async getCategoryBySlug(db: any, slug: string): Promise<CategoryResult> {
    if (!slug) {
      return {
        success: false,
        message: 'Invalid slug',
        statusCode: 400
      };
    }

    const category = await db.prepare(`
      SELECT * FROM categories
      WHERE slug = ? AND deleted_at IS NULL
    `).bind(slug).first();

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: category
    };
  }

  static async createCategory(db: any, body: CategoryCreateRequest): Promise<CategoryResult> {
    let { name, slug, description, icon, color, displayOrder } = body;

    if (!name) {
      return {
        success: false,
        message: 'Name is required',
        statusCode: 400
      };
    }

    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : undefined;

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
      'SELECT id FROM categories WHERE name = ? OR slug = ?'
    ).bind(name, slug).first();

    if (existing) {
      return {
        success: false,
        message: 'A category with this name or slug already exists',
        statusCode: 409
      };
    }

    const result = await db.prepare(`
      INSERT INTO categories (
        name, slug, description, icon, color, display_order,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      name,
      slug,
      description,
      icon || null,
      color || null,
      displayOrder || 0
    ).run();

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create category',
        statusCode: 500
      };
    }

    return {
      success: true,
      data: {
        id: result.meta.last_row_id,
        slug
      },
      message: 'Category created successfully'
    };
  }

  static async updateCategory(db: any, id: string, body: CategoryUpdateRequest): Promise<CategoryResult> {
    const category = await db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first() as CategoryRow | null;

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
        statusCode: 404
      };
    }

    let { name, description, icon, color, displayOrder } = body;

    if (name) name = sanitizeInput(name);
    if (description !== undefined) description = sanitizeInput(description);

    await db.prepare(`
      UPDATE categories
      SET name = ?, description = ?, icon = ?, color = ?,
          display_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name || category.name,
      description !== undefined ? description : category.description,
      icon !== undefined ? icon : category.icon,
      color !== undefined ? color : category.color,
      displayOrder !== undefined ? displayOrder : category.display_order,
      id
    ).run();

    return {
      success: true,
      data: { updated: true },
      message: 'Category updated successfully'
    };
  }

  static async deleteCategory(db: any, id: string): Promise<CategoryResult> {
    const category = await db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first() as CategoryRow | null;

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
        statusCode: 404
      };
    }

    if (category.post_count > 0) {
      return {
        success: false,
        message: 'This category is being used by posts. Please reassign or delete those posts first.',
        statusCode: 400
      };
    }

    await SoftDeleteHelper.softDelete(db, 'categories', id);

    return {
      success: true,
      data: { deleted: true },
      message: 'Category deleted successfully'
    };
  }

  static async getCategoryPosts(db: any, slug: string, query: PostsQuery): Promise<CategoryResult> {
    if (!slug) {
      return {
        success: false,
        message: 'Invalid slug',
        statusCode: 400
      };
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(CATEGORY_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, query.limit || CATEGORY_CONSTANTS.DEFAULT_PAGE_SIZE));
    const sortBy = query.sortBy || 'published_at';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const finalSortBy = CATEGORY_CONSTANTS.ALLOWED_SORT_FIELDS.includes(sortBy as any) ? sortBy : 'published_at';

    const category = await db.prepare(
      'SELECT id FROM categories WHERE slug = ? AND deleted_at IS NULL'
    ).bind(slug).first() as { id: number } | null;

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
        statusCode: 404
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
      WHERE p.category_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `;

    sql += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;

    const { results } = await db.prepare(sql).bind(category.id, limit, offset).all();

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.category_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `).bind(category.id).first() as TotalResult | null;
    const total = countResult?.total || 0;

    const postIds = (results as { id: number }[]).map(p => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsSql = `
        SELECT pt.post_id, t.id, t.name, t.slug, t.color
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
          slug: tag.slug,
          color: tag.color
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
}

export class TagService {
  static async getTags(db: any): Promise<CategoryResult> {
    const { results } = await db.prepare(`
      SELECT * FROM tags
      WHERE deleted_at IS NULL
      ORDER BY post_count DESC, name ASC
    `).all();

    return {
      success: true,
      data: { tags: results }
    };
  }

  static async getTagBySlug(db: any, slug: string): Promise<CategoryResult> {
    if (!slug) {
      return {
        success: false,
        message: 'Invalid slug',
        statusCode: 400
      };
    }

    const tag = await db.prepare(`
      SELECT * FROM tags
      WHERE slug = ? AND deleted_at IS NULL
    `).bind(slug).first();

    if (!tag) {
      return {
        success: false,
        message: 'Tag not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: tag
    };
  }

  static async createTag(db: any, body: TagCreateRequest): Promise<CategoryResult> {
    let { name, slug, description, color } = body;

    if (!name) {
      return {
        success: false,
        message: 'Name is required',
        statusCode: 400
      };
    }

    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : undefined;

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
      'SELECT id FROM tags WHERE name = ? OR slug = ?'
    ).bind(name, slug).first();

    if (existing) {
      return {
        success: false,
        message: 'A tag with this name or slug already exists',
        statusCode: 409
      };
    }

    const result = await db.prepare(`
      INSERT INTO tags (name, slug, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(name, slug, description, color || null).run();

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create tag',
        statusCode: 500
      };
    }

    return {
      success: true,
      data: {
        id: result.meta.last_row_id,
        slug
      },
      message: 'Tag created successfully'
    };
  }

  static async updateTag(db: any, id: string, body: TagUpdateRequest): Promise<CategoryResult> {
    const tag = await db.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(id).first() as TagRow | null;

    if (!tag) {
      return {
        success: false,
        message: 'Tag not found',
        statusCode: 404
      };
    }

    let { name, description, color } = body;

    if (name) name = sanitizeInput(name);
    if (description !== undefined) description = sanitizeInput(description);

    await db.prepare(`
      UPDATE tags
      SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name || tag.name,
      description !== undefined ? description : tag.description,
      color !== undefined ? color : tag.color,
      id
    ).run();

    return {
      success: true,
      data: { updated: true },
      message: 'Tag updated successfully'
    };
  }

  static async deleteTag(db: any, id: string): Promise<CategoryResult> {
    const tag = await db.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(id).first() as TagRow | null;

    if (!tag) {
      return {
        success: false,
        message: 'Tag not found',
        statusCode: 404
      };
    }

    await SoftDeleteHelper.softDelete(db, 'tags', id);

    return {
      success: true,
      data: { deleted: true },
      message: 'Tag deleted successfully'
    };
  }

  static async getTagPosts(db: any, slug: string, query: PostsQuery): Promise<CategoryResult> {
    if (!slug) {
      return {
        success: false,
        message: 'Invalid slug',
        statusCode: 400
      };
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(CATEGORY_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, query.limit || CATEGORY_CONSTANTS.DEFAULT_PAGE_SIZE));
    const sortBy = query.sortBy || 'published_at';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const finalSortBy = CATEGORY_CONSTANTS.ALLOWED_SORT_FIELDS.includes(sortBy as any) ? sortBy : 'published_at';

    const tag = await db.prepare(
      'SELECT id FROM tags WHERE slug = ? AND deleted_at IS NULL'
    ).bind(slug).first() as { id: number } | null;

    if (!tag) {
      return {
        success: false,
        message: 'Tag not found',
        statusCode: 404
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
      INNER JOIN post_tags pt ON p.id = pt.post_id
      WHERE pt.tag_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `;

    sql += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;

    const { results } = await db.prepare(sql).bind(tag.id, limit, offset).all();

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM posts p
      INNER JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE pt.tag_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `).bind(tag.id).first() as TotalResult | null;
    const total = countResult?.total || 0;

    const postIds = (results as { id: number }[]).map(p => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsSql = `
        SELECT pt.post_id, t.id, t.name, t.slug, t.color
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await db.prepare(tagsSql).bind(...postIds).all();

      const tagsByPost = new Map();
      (tagResults as TagRowWithPostId[]).forEach(t => {
        if (!tagsByPost.has(t.post_id)) {
          tagsByPost.set(t.post_id, []);
        }
        tagsByPost.get(t.post_id).push({
          id: t.id,
          name: t.name,
          slug: t.slug,
          color: t.color
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
}

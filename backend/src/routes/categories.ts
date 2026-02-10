/**
 * 分类和标签路由（优化版）
 * 
 * 功能：
 * - 获取所有分类
 * - 获取所有标签
 * - 分类和标签的CRUD操作（管理员）
 * 
 * 优化内容：
 * 1. 统一API响应格式
 * 2. 添加缓存支持
 * 3. 添加创建/更新/删除功能
 * 4. 详细的错误处理和日志
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  validateLength,
  validateSlug,
  sanitizeInput,
  generateSlug,
  safeParseInt
} from '../utils/validation';

export const categoryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 获取分类列表 =============

/**
 * GET /api/categories
 * 获取所有分类（公开）
 */
categoryRoutes.get('/', async (c) => {
  const logger = createLogger(c);

  try {
    // 从数据库获取
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM categories
      ORDER BY display_order ASC, name ASC
    `).all();

    const response = successResponse({ categories: results });

    logger.info('Categories fetched successfully', { count: results.length });

    return c.json(response);

  } catch (error) {
    logger.error('Get categories error', error);
    return c.json(errorResponse(
      'Failed to fetch categories',
      'An error occurred while fetching categories'
    ), 500);
  }
});

// ============= 获取标签列表 =============

/**
 * GET /api/categories/tags
 * 获取所有标签（公开）
 */
categoryRoutes.get('/tags', async (c) => {
  const logger = createLogger(c);

  try {
    // 从数据库获取
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM tags
      ORDER BY post_count DESC, name ASC
    `).all();

    const response = successResponse({ tags: results });

    logger.info('Tags fetched successfully', { count: results.length });

    return c.json(response);

  } catch (error) {
    logger.error('Get tags error', error);
    return c.json(errorResponse(
      'Failed to fetch tags',
      'An error occurred while fetching tags'
    ), 500);
  }
});

// ============= 创建分类（管理员） =============

/**
 * POST /api/categories
 * 创建分类（需要管理员权限）
 */
categoryRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const body = await c.req.json();
    let { name, slug, description, icon, color, displayOrder } = body;
    
    // 验证必填字段
    if (!name) {
      return c.json(errorResponse('Name is required'), 400);
    }
    
    // 清理输入
    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : null;
    
    // 生成或验证slug
    if (!slug) {
      slug = generateSlug(name);
    } else {
      const slugError = validateSlug(slug);
      if (slugError) {
        return c.json(errorResponse('Invalid slug', slugError), 400);
      }
    }
    
    // 检查是否已存在
    const existing = await c.env.DB.prepare(
      'SELECT id FROM categories WHERE name = ? OR slug = ?'
    ).bind(name, slug).first();
    
    if (existing) {
      return c.json(errorResponse(
        'Category already exists',
        'A category with this name or slug already exists'
      ), 409);
    }
    
    // 插入分类
    const result = await c.env.DB.prepare(`
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
      throw new Error('Failed to create category');
    }

    logger.info('Category created', {
      categoryId: result.meta.last_row_id,
      name
    });
    
    return c.json(successResponse({
      id: result.meta.last_row_id,
      slug
    }, 'Category created successfully'), 201);
    
  } catch (error) {
    logger.error('Create category error', error);
    return c.json(errorResponse('Failed to create category'), 500);
  }
});

// ============= 创建标签（管理员） =============

/**
 * POST /api/categories/tags
 * 创建标签（需要管理员权限）
 */
categoryRoutes.post('/tags', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const body = await c.req.json();
    let { name, slug, description, color } = body;
    
    // 验证必填字段
    if (!name) {
      return c.json(errorResponse('Name is required'), 400);
    }
    
    // 清理输入
    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : null;
    
    // 生成或验证slug
    if (!slug) {
      slug = generateSlug(name);
    } else {
      const slugError = validateSlug(slug);
      if (slugError) {
        return c.json(errorResponse('Invalid slug', slugError), 400);
      }
    }
    
    // 检查是否已存在
    const existing = await c.env.DB.prepare(
      'SELECT id FROM tags WHERE name = ? OR slug = ?'
    ).bind(name, slug).first();
    
    if (existing) {
      return c.json(errorResponse(
        'Tag already exists',
        'A tag with this name or slug already exists'
      ), 409);
    }
    
    // 插入标签
    const result = await c.env.DB.prepare(`
      INSERT INTO tags (name, slug, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(name, slug, description, color || null).run();
    
    if (!result.success) {
      throw new Error('Failed to create tag');
    }

    logger.info('Tag created', {
      tagId: result.meta.last_row_id,
      name
    });
    
    return c.json(successResponse({
      id: result.meta.last_row_id,
      slug
    }, 'Tag created successfully'), 201);
    
  } catch (error) {
    logger.error('Create tag error', error);
    return c.json(errorResponse('Failed to create tag'), 500);
  }
});

// ============= 更新标签（管理员） =============

/**
 * PUT /api/categories/tags/:id
 * 更新标签（需要管理员权限）
 */
categoryRoutes.put('/tags/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    let { name, description, color } = body;
    
    // 检查标签是否存在
    const tag = await c.env.DB.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!tag) {
      return c.json(errorResponse('Tag not found'), 404);
    }
    
    // 清理输入
    if (name) name = sanitizeInput(name);
    if (description !== undefined) description = sanitizeInput(description);
    
    // 更新标签
    await c.env.DB.prepare(`
      UPDATE tags
      SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name || tag.name,
      description !== undefined ? description : tag.description,
      color !== undefined ? color : tag.color,
      id
    ).run();

    logger.info('Tag updated', { tagId: id });
    
    return c.json(successResponse({ updated: true }, 'Tag updated successfully'));
    
  } catch (error) {
    logger.error('Update tag error', error);
    return c.json(errorResponse('Failed to update tag'), 500);
  }
});

// ============= 更新分类（管理员） =============

/**
 * PUT /api/categories/:id
 * 更新分类（需要管理员权限）
 */
categoryRoutes.put('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    let { name, description, icon, color, displayOrder } = body;
    
    // 检查分类是否存在
    const category = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!category) {
      return c.json(errorResponse('Category not found'), 404);
    }
    
    // 清理输入
    if (name) name = sanitizeInput(name);
    if (description !== undefined) description = sanitizeInput(description);
    
    // 更新分类
    await c.env.DB.prepare(`
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

    logger.info('Category updated', { categoryId: id });
    
    return c.json(successResponse({ updated: true }, 'Category updated successfully'));
    
  } catch (error) {
    logger.error('Update category error', error);
    return c.json(errorResponse('Failed to update category'), 500);
  }
});

// ============= 删除分类（管理员） =============

/**
 * DELETE /api/categories/:id
 * 删除分类（需要管理员权限）
 */
categoryRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const id = c.req.param('id');
    
    // 检查分类是否存在
    const category = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!category) {
      return c.json(errorResponse('Category not found'), 404);
    }
    
    // 检查是否有文章使用该分类
    if (category.post_count > 0) {
      return c.json(errorResponse(
        'Cannot delete category',
        'This category is being used by posts. Please reassign or delete those posts first.'
      ), 400);
    }
    
    // 删除分类
    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    logger.info('Category deleted', { categoryId: id });
    
    return c.json(successResponse({ deleted: true }, 'Category deleted successfully'));
    
  } catch (error) {
    logger.error('Delete category error', error);
    return c.json(errorResponse('Failed to delete category'), 500);
  }
});

// ============= 删除标签（管理员） =============

/**
 * DELETE /api/categories/tags/:id
 * 删除标签（需要管理员权限）
 */
categoryRoutes.delete('/tags/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');

    // 检查标签是否存在
    const tag = await c.env.DB.prepare(
      'SELECT * FROM tags WHERE id = ?'
    ).bind(id).first() as any;

    if (!tag) {
      return c.json(errorResponse('Tag not found'), 404);
    }

    // 删除标签（会自动删除post_tags中的关联）
    await c.env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();

    logger.info('Tag deleted', { tagId: id });

    return c.json(successResponse({ deleted: true }, 'Tag deleted successfully'));

  } catch (error) {
    logger.error('Delete tag error', error);
    return c.json(errorResponse('Failed to delete tag'), 500);
  }
});

// ============= 获取分类详情 =============

/**
 * GET /api/categories/:slug
 * 获取分类详情（公开）
 */
categoryRoutes.get('/:slug', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');

    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }

    // 获取分类详情
    const category = await c.env.DB.prepare(`
      SELECT *
      FROM categories
      WHERE slug = ?
    `).bind(slug).first() as any;

    if (!category) {
      logger.warn('Category not found', { slug });
      return c.json(errorResponse(
        'Category not found',
        'The requested category does not exist'
      ), 404);
    }

    logger.info('Category fetched successfully', { slug, categoryId: category.id });
    return c.json(successResponse(category));

  } catch (error) {
    logger.error('Get category error', error);
    return c.json(errorResponse(
      'Failed to fetch category',
      'An error occurred while fetching the category'
    ), 500);
  }
});

// ============= 获取分类下的文章列表 =============

/**
 * GET /api/categories/:slug/posts
 * 获取分类下的文章列表（公开）
 */
categoryRoutes.get('/:slug/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');

    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }

    // 解析查询参数
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(50, Math.max(1, safeParseInt(c.req.query('limit'), 10)));
    const sortBy = c.req.query('sortBy') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';

    // 先获取分类ID
    const category = await c.env.DB.prepare(
      'SELECT id FROM categories WHERE slug = ?'
    ).bind(slug).first() as any;

    if (!category) {
      return c.json(errorResponse('Category not found'), 404);
    }

    // 获取文章列表
    let query = `
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name,
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.status = 'published' AND p.visibility = 'public'
    `;

    query += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;

    const { results } = await c.env.DB.prepare(query).bind(category.id, limit, offset).all();

    // 获取总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM posts
      WHERE category_id = ? AND status = 'published' AND visibility = 'public'
    `).bind(category.id).first() as any;
    const total = countResult?.total || 0;

    // 为每篇文章获取标签
    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug, t.color
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();

      // 组织标签数据
      const tagsByPost = new Map();
      (tagResults as any[]).forEach(tag => {
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

      // 添加标签到文章
      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }

    const response = successResponse({
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

    logger.info('Category posts fetched successfully', {
      slug,
      categoryId: category.id,
      count: postsWithTags.length,
      total
    });

    return c.json(response);

  } catch (error) {
    logger.error('Get category posts error', error);
    return c.json(errorResponse(
      'Failed to fetch category posts',
      'An error occurred while fetching category posts'
    ), 500);
  }
});

// ============= 获取标签详情 =============

/**
 * GET /api/categories/tags/:slug
 * 获取标签详情（公开）
 */
categoryRoutes.get('/tags/:slug', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');

    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }

    // 获取标签详情
    const tag = await c.env.DB.prepare(`
      SELECT *
      FROM tags
      WHERE slug = ?
    `).bind(slug).first() as any;

    if (!tag) {
      logger.warn('Tag not found', { slug });
      return c.json(errorResponse(
        'Tag not found',
        'The requested tag does not exist'
      ), 404);
    }

    logger.info('Tag fetched successfully', { slug, tagId: tag.id });
    return c.json(successResponse(tag));

  } catch (error) {
    logger.error('Get tag error', error);
    return c.json(errorResponse(
      'Failed to fetch tag',
      'An error occurred while fetching the tag'
    ), 500);
  }
});

// ============= 获取标签下的文章列表 =============

/**
 * GET /api/categories/tags/:slug/posts
 * 获取标签下的文章列表（公开）
 */
categoryRoutes.get('/tags/:slug/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');

    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }

    // 解析查询参数
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(50, Math.max(1, safeParseInt(c.req.query('limit'), 10)));
    const sortBy = c.req.query('sortBy') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';

    // 先获取标签ID
    const tag = await c.env.DB.prepare(
      'SELECT id FROM tags WHERE slug = ?'
    ).bind(slug).first() as any;

    if (!tag) {
      return c.json(errorResponse('Tag not found'), 404);
    }

    // 获取文章列表（通过post_tags关联）
    let query = `
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
      WHERE pt.tag_id = ? AND p.status = 'published' AND p.visibility = 'public'
    `;

    query += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;

    const { results } = await c.env.DB.prepare(query).bind(tag.id, limit, offset).all();

    // 获取总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM posts p
      INNER JOIN post_tags pt ON p.id = pt.post_id
      WHERE pt.tag_id = ? AND p.status = 'published' AND p.visibility = 'public'
    `).bind(tag.id).first() as any;
    const total = countResult?.total || 0;

    // 为每篇文章获取标签
    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug, t.color
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();

      // 组织标签数据
      const tagsByPost = new Map();
      (tagResults as any[]).forEach(t => {
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

      // 添加标签到文章
      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }

    const response = successResponse({
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

    logger.info('Tag posts fetched successfully', {
      slug,
      tagId: tag.id,
      count: postsWithTags.length,
      total
    });

    return c.json(response);

  } catch (error) {
    logger.error('Get tag posts error', error);
    return c.json(errorResponse(
      'Failed to fetch tag posts',
      'An error occurred while fetching tag posts'
    ), 500);
  }
});

/**
 * 专栏路由
 * 
 * 功能：
 * - 获取专栏列表（公开）
 * - 获取专栏详情（公开）
 * - 获取专栏下的文章列表（公开）
 * - 专栏的CRUD操作（管理员）
 * 
 * @version 1.0.0
 * @author 博客系统
 * @created 2024-01-01
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

export const columnRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 常量配置 =============

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// ============= 获取专栏列表 =============

/**
 * GET /api/columns
 * 获取所有专栏（公开）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认10，最大50）
 * - author: 作者用户名
 * - sortBy: 排序字段（created_at, post_count, total_view_count）
 * - order: 排序方向（asc, desc）
 */
columnRoutes.get('/', async (c) => {
  const logger = createLogger(c);

  try {
    // 解析查询参数
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const author = c.req.query('author');
    const sortBy = c.req.query('sortBy') || 'display_order';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // 验证排序字段
    const allowedSortFields = ['created_at', 'post_count', 'total_view_count', 'total_like_count', 'display_order'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'display_order';

    logger.info('Fetching columns', { page, limit, author, sortBy });

    // 构建查询
    let query = `
      SELECT 
        col.id, col.name, col.slug, col.description, col.cover_image,
        col.post_count, col.total_view_count, col.total_like_count, 
        col.total_favorite_count, col.total_comment_count,
        col.display_order, col.status, col.created_at, col.updated_at,
        u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
      FROM columns col
      LEFT JOIN users u ON col.author_id = u.id
      WHERE col.status = 'active'
    `;
    
    const params: any[] = [];
    
    // 作者过滤
    if (author) {
      query += ` AND u.username = ?`;
      params.push(author);
    }
    
    // 排序
    query += ` ORDER BY col.${finalSortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 执行查询
    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM columns col
      LEFT JOIN users u ON col.author_id = u.id
      WHERE col.status = 'active'
    `;
    const countParams: any[] = [];
    
    if (author) {
      countQuery += ' AND u.username = ?';
      countParams.push(author);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    const total = countResult?.total || 0;

    const response = successResponse({
      columns: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

    logger.info('Columns fetched successfully', { count: results.length, total });
    return c.json(response);

  } catch (error) {
    logger.error('Get columns error', error);
    return c.json(errorResponse(
      'Failed to fetch columns',
      'An error occurred while fetching columns'
    ), 500);
  }
});

// ============= 获取专栏详情 =============

/**
 * GET /api/columns/:slug
 * 获取专栏详情（公开）
 */
columnRoutes.get('/:slug', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');

    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }

    // 获取专栏详情
    const column = await c.env.DB.prepare(`
      SELECT 
        col.*,
        u.username as author_username,
        u.display_name as author_name,
        u.avatar_url as author_avatar,
        u.bio as author_bio
      FROM columns col
      LEFT JOIN users u ON col.author_id = u.id
      WHERE col.slug = ? AND col.status = 'active'
    `).bind(slug).first() as any;

    if (!column) {
      logger.warn('Column not found', { slug });
      return c.json(errorResponse(
        'Column not found',
        'The requested column does not exist'
      ), 404);
    }

    logger.info('Column fetched successfully', { slug, columnId: column.id });
    return c.json(successResponse(column));

  } catch (error) {
    logger.error('Get column error', error);
    return c.json(errorResponse(
      'Failed to fetch column',
      'An error occurred while fetching the column'
    ), 500);
  }
});

// ============= 获取专栏下的文章列表 =============

/**
 * GET /api/columns/:slug/posts
 * 获取专栏下的文章列表（公开）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认10，最大50）
 * - sortBy: 排序字段（published_at, view_count, like_count）
 * - order: 排序方向（asc, desc）
 */
columnRoutes.get('/:slug/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    
    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }

    // 解析查询参数
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const sortBy = c.req.query('sortBy') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';

    // 先获取专栏ID
    const column = await c.env.DB.prepare(
      'SELECT id FROM columns WHERE slug = ? AND status = ?'
    ).bind(slug, 'active').first() as any;

    if (!column) {
      return c.json(errorResponse('Column not found'), 404);
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
      WHERE p.column_id = ? AND p.status = 'published' AND p.visibility = 'public'
    `;
    
    query += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;

    const { results } = await c.env.DB.prepare(query).bind(column.id, limit, offset).all();

    // 获取总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM posts 
      WHERE column_id = ? AND status = 'published' AND visibility = 'public'
    `).bind(column.id).first() as any;
    const total = countResult?.total || 0;

    // 为每篇文章获取标签
    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug
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
          slug: tag.slug
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

    logger.info('Column posts fetched successfully', { 
      slug, 
      columnId: column.id,
      count: postsWithTags.length, 
      total 
    });
    
    return c.json(response);

  } catch (error) {
    logger.error('Get column posts error', error);
    return c.json(errorResponse(
      'Failed to fetch column posts',
      'An error occurred while fetching column posts'
    ), 500);
  }
});

// ============= 创建专栏（管理员） =============

/**
 * POST /api/columns
 * 创建专栏（需要管理员权限）
 */
columnRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user') as any;
    const body = await c.req.json();
    let { name, slug, description, coverImage, displayOrder } = body;

    // 验证必填字段
    if (!name) {
      return c.json(errorResponse('Name is required'), 400);
    }

    // 清理输入
    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : null;

    // 验证名称长度
    const nameError = validateLength(name, MIN_NAME_LENGTH, MAX_NAME_LENGTH, 'Name');
    if (nameError) {
      return c.json(errorResponse('Invalid name', nameError), 400);
    }

    // 验证描述长度
    if (description) {
      const descError = validateLength(description, 0, MAX_DESCRIPTION_LENGTH, 'Description');
      if (descError) {
        return c.json(errorResponse('Invalid description', descError), 400);
      }
    }

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
      'SELECT id FROM columns WHERE name = ? OR slug = ?'
    ).bind(name, slug).first();

    if (existing) {
      return c.json(errorResponse(
        'Column already exists',
        'A column with this name or slug already exists'
      ), 409);
    }

    // 插入专栏
    const result = await c.env.DB.prepare(`
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
      user.userId,
      displayOrder || 0
    ).run();

    if (!result.success) {
      throw new Error('Failed to create column');
    }

    logger.info('Column created', {
      columnId: result.meta.last_row_id,
      name,
      userId: user.userId
    });

    return c.json(successResponse({
      id: result.meta.last_row_id,
      slug
    }, 'Column created successfully'), 201);

  } catch (error) {
    logger.error('Create column error', error);
    return c.json(errorResponse('Failed to create column'), 500);
  }
});

// ============= 更新专栏（管理员） =============

/**
 * PUT /api/columns/:id
 * 更新专栏（需要管理员权限）
 */
columnRoutes.put('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    let { name, description, coverImage, displayOrder, status } = body;

    // 检查专栏是否存在
    const column = await c.env.DB.prepare(
      'SELECT * FROM columns WHERE id = ?'
    ).bind(id).first() as any;

    if (!column) {
      return c.json(errorResponse('Column not found'), 404);
    }

    // 清理输入
    if (name) {
      name = sanitizeInput(name);
      const nameError = validateLength(name, MIN_NAME_LENGTH, MAX_NAME_LENGTH, 'Name');
      if (nameError) {
        return c.json(errorResponse('Invalid name', nameError), 400);
      }
    }

    if (description !== undefined) {
      description = sanitizeInput(description);
      const descError = validateLength(description, 0, MAX_DESCRIPTION_LENGTH, 'Description');
      if (descError) {
        return c.json(errorResponse('Invalid description', descError), 400);
      }
    }

    // 验证状态
    if (status && !['active', 'hidden', 'archived'].includes(status)) {
      return c.json(errorResponse('Invalid status'), 400);
    }

    // 更新专栏
    await c.env.DB.prepare(`
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

    logger.info('Column updated', { columnId: id });

    return c.json(successResponse({ updated: true }, 'Column updated successfully'));

  } catch (error) {
    logger.error('Update column error', error);
    return c.json(errorResponse('Failed to update column'), 500);
  }
});

// ============= 删除专栏（管理员） =============

/**
 * DELETE /api/columns/:id
 * 删除专栏（需要管理员权限）
 * 当专栏下存在已发布文章时，禁止删除
 */
columnRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');

    // 检查专栏是否存在
    const column = await c.env.DB.prepare(
      'SELECT * FROM columns WHERE id = ?'
    ).bind(id).first() as any;

    if (!column) {
      return c.json(errorResponse('Column not found'), 404);
    }

    // 检查是否有已发布的文章使用该专栏
    const postCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM posts 
      WHERE column_id = ? AND status = 'published'
    `).bind(id).first() as any;

    if (postCount.count > 0) {
      return c.json(errorResponse(
        'Cannot delete column',
        `This column has ${postCount.count} published post(s). Please reassign or delete those posts first.`
      ), 400);
    }

    // 删除专栏（将关联文章的column_id设为NULL）
    await c.env.DB.prepare('DELETE FROM columns WHERE id = ?').bind(id).run();

    logger.info('Column deleted', { columnId: id });

    return c.json(successResponse({ deleted: true }, 'Column deleted successfully'));

  } catch (error) {
    logger.error('Delete column error', error);
    return c.json(errorResponse('Failed to delete column'), 500);
  }
});

// ============= 更新专栏统计数据 =============

/**
 * POST /api/columns/:id/refresh-stats
 * 刷新专栏统计数据（需要管理员权限）
 * 用于手动同步统计数据
 */
columnRoutes.post('/:id/refresh-stats', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');

    // 检查专栏是否存在
    const column = await c.env.DB.prepare(
      'SELECT id FROM columns WHERE id = ?'
    ).bind(id).first();

    if (!column) {
      return c.json(errorResponse('Column not found'), 404);
    }

    // 重新计算统计数据
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as post_count,
        COALESCE(SUM(view_count), 0) as total_view_count,
        COALESCE(SUM(like_count), 0) as total_like_count,
        COALESCE(SUM(comment_count), 0) as total_comment_count
      FROM posts 
      WHERE column_id = ? AND status = 'published'
    `).bind(id).first() as any;

    // 获取收藏数
    const favoriteStats = await c.env.DB.prepare(`
      SELECT COUNT(*) as total_favorite_count
      FROM favorites f
      JOIN posts p ON f.post_id = p.id
      WHERE p.column_id = ? AND p.status = 'published'
    `).bind(id).first() as any;

    // 更新专栏统计
    await c.env.DB.prepare(`
      UPDATE columns
      SET post_count = ?,
          total_view_count = ?,
          total_like_count = ?,
          total_favorite_count = ?,
          total_comment_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      stats.post_count || 0,
      stats.total_view_count || 0,
      stats.total_like_count || 0,
      favoriteStats?.total_favorite_count || 0,
      stats.total_comment_count || 0,
      id
    ).run();

    logger.info('Column stats refreshed', { columnId: id });

    return c.json(successResponse({
      postCount: stats.post_count || 0,
      totalViewCount: stats.total_view_count || 0,
      totalLikeCount: stats.total_like_count || 0,
      totalFavoriteCount: favoriteStats?.total_favorite_count || 0,
      totalCommentCount: stats.total_comment_count || 0
    }, 'Column stats refreshed successfully'));

  } catch (error) {
    logger.error('Refresh column stats error', error);
    return c.json(errorResponse('Failed to refresh column stats'), 500);
  }
});

/**
 * 分类和标签路由（重构版）
 *
 * 功能：
 * - 获取所有分类
 * - 获取所有标签
 * - 分类和标签的CRUD操作（管理员）
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
import { safeParseInt } from '../utils/validation';
import { CategoryService, TagService } from '../services/categoryService';
import { CATEGORY_CONSTANTS } from '../config/constants';

export const categoryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

categoryRoutes.get('/', async (c) => {
  const logger = createLogger(c);

  try {
    const result = await CategoryService.getCategories(c.env.DB);

    logger.info('Categories fetched successfully', { count: result.data?.categories?.length });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get categories error', error);
    return c.json(errorResponse('Failed to fetch categories', 'An error occurred while fetching categories'), 500);
  }
});

categoryRoutes.get('/tags', async (c) => {
  const logger = createLogger(c);

  try {
    const result = await TagService.getTags(c.env.DB);

    logger.info('Tags fetched successfully', { count: result.data?.tags?.length });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get tags error', error);
    return c.json(errorResponse('Failed to fetch tags', 'An error occurred while fetching tags'), 500);
  }
});

categoryRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();
    const result = await CategoryService.createCategory(c.env.DB, body);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Category created', { categoryId: result.data?.id, name: body.name });

    return c.json(successResponse(result.data, result.message), 201);
  } catch (error) {
    logger.error('Create category error', error);
    return c.json(errorResponse('Failed to create category'), 500);
  }
});

categoryRoutes.post('/tags', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const body = await c.req.json();
    const result = await TagService.createTag(c.env.DB, body);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Tag created', { tagId: result.data?.id, name: body.name });

    return c.json(successResponse(result.data, result.message), 201);
  } catch (error) {
    logger.error('Create tag error', error);
    return c.json(errorResponse('Failed to create tag'), 500);
  }
});

categoryRoutes.put('/tags/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = await TagService.updateTag(c.env.DB, id, body);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Tag updated', { tagId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Update tag error', error);
    return c.json(errorResponse('Failed to update tag'), 500);
  }
});

categoryRoutes.put('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = await CategoryService.updateCategory(c.env.DB, id, body);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Category updated', { categoryId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Update category error', error);
    return c.json(errorResponse('Failed to update category'), 500);
  }
});

categoryRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const result = await CategoryService.deleteCategory(c.env.DB, id);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Category deleted', { categoryId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Delete category error', error);
    return c.json(errorResponse('Failed to delete category'), 500);
  }
});

categoryRoutes.delete('/tags/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const result = await TagService.deleteTag(c.env.DB, id);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Tag deleted', { tagId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Delete tag error', error);
    return c.json(errorResponse('Failed to delete tag'), 500);
  }
});

categoryRoutes.get('/:slug', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const result = await CategoryService.getCategoryBySlug(c.env.DB, slug);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Category fetched successfully', { slug });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get category error', error);
    return c.json(errorResponse('Failed to fetch category', 'An error occurred while fetching the category'), 500);
  }
});

categoryRoutes.get('/:slug/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const result = await CategoryService.getCategoryPosts(c.env.DB, slug, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), CATEGORY_CONSTANTS.DEFAULT_PAGE_SIZE),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order') as 'asc' | 'desc'
    });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Category posts fetched successfully', {
      slug,
      count: result.data?.posts?.length,
      total: result.data?.pagination?.total
    });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get category posts error', error);
    return c.json(errorResponse('Failed to fetch category posts', 'An error occurred while fetching category posts'), 500);
  }
});

categoryRoutes.get('/tags/:slug', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const result = await TagService.getTagBySlug(c.env.DB, slug);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Tag fetched successfully', { slug });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get tag error', error);
    return c.json(errorResponse('Failed to fetch tag', 'An error occurred while fetching the tag'), 500);
  }
});

categoryRoutes.get('/tags/:slug/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const result = await TagService.getTagPosts(c.env.DB, slug, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), CATEGORY_CONSTANTS.DEFAULT_PAGE_SIZE),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order') as 'asc' | 'desc'
    });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Tag posts fetched successfully', {
      slug,
      count: result.data?.posts?.length,
      total: result.data?.pagination?.total
    });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get tag posts error', error);
    return c.json(errorResponse('Failed to fetch tag posts', 'An error occurred while fetching tag posts'), 500);
  }
});

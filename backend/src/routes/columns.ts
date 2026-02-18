/**
 * 专栏路由（重构版）
 *
 * 功能：
 * - 获取专栏列表（公开）
 * - 获取专栏详情（公开）
 * - 获取专栏下的文章列表（公开）
 * - 专栏的CRUD操作（管理员）
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
import { ColumnService, COLUMN_CONSTANTS } from '../services/columnService';

export const columnRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

columnRoutes.get('/', async (c) => {
  const logger = createLogger(c);

  try {
    const result = await ColumnService.getColumns(c.env.DB, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), COLUMN_CONSTANTS.DEFAULT_PAGE_SIZE),
      author: c.req.query('author'),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order') as 'asc' | 'desc'
    });

    logger.info('Columns fetched successfully', {
      count: result.data?.columns?.length,
      total: result.data?.pagination?.total
    });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get columns error', error);
    return c.json(errorResponse('Failed to fetch columns', 'An error occurred while fetching columns'), 500);
  }
});

columnRoutes.get('/:slug', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const result = await ColumnService.getColumnBySlug(c.env.DB, slug);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Column fetched successfully', { slug });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get column error', error);
    return c.json(errorResponse('Failed to fetch column', 'An error occurred while fetching the column'), 500);
  }
});

columnRoutes.get('/:slug/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const result = await ColumnService.getColumnPosts(c.env.DB, slug, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), COLUMN_CONSTANTS.DEFAULT_PAGE_SIZE),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order') as 'asc' | 'desc'
    });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Column posts fetched successfully', {
      slug,
      count: result.data?.posts?.length,
      total: result.data?.pagination?.total
    });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get column posts error', error);
    return c.json(errorResponse('Failed to fetch column posts', 'An error occurred while fetching column posts'), 500);
  }
});

columnRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const body = await c.req.json();
    const result = await ColumnService.createColumn(c.env.DB, user.userId, body);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Column created', {
      columnId: result.data?.id,
      name: body.name,
      userId: user.userId
    });

    return c.json(successResponse(result.data, result.message), 201);
  } catch (error) {
    logger.error('Create column error', error);
    return c.json(errorResponse('Failed to create column'), 500);
  }
});

columnRoutes.put('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = await ColumnService.updateColumn(c.env.DB, id, body);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Column updated', { columnId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Update column error', error);
    return c.json(errorResponse('Failed to update column'), 500);
  }
});

columnRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const result = await ColumnService.deleteColumn(c.env.DB, id);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Column deleted', { columnId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Delete column error', error);
    return c.json(errorResponse('Failed to delete column'), 500);
  }
});

columnRoutes.post('/:id/refresh-stats', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const result = await ColumnService.refreshStats(c.env.DB, id);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Column stats refreshed', { columnId: id });

    return c.json(successResponse(result.data, result.message));
  } catch (error) {
    logger.error('Refresh column stats error', error);
    return c.json(errorResponse('Failed to refresh column stats'), 500);
  }
});

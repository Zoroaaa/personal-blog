/**
 * 管理后台相关路由（重构版）
 *
 * 功能：
 * - 评论管理（审核/删除）
 * - 用户列表管理
 * - 系统设置
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
import { AdminService, ADMIN_CONSTANTS } from '../services/adminService';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

adminRoutes.use('*', requireAuth);

adminRoutes.get('/comments', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const result = await AdminService.getComments(c.env.DB, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), ADMIN_CONSTANTS.DEFAULT_PAGE_SIZE),
      status: c.req.query('status'),
      postId: c.req.query('postId'),
      includeDeleted: c.req.query('includeDeleted') === 'true'
    });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 500));
    }

    logger.info('Admin comments fetched', {
      count: result.data?.comments?.length,
      page: result.data?.pagination?.page
    });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get admin comments error', error);
    return c.json(errorResponse('Failed to fetch comments', 'An error occurred while fetching comments'), 500);
  }
});

adminRoutes.put('/comments/:id/status', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const commentId = c.req.param('id');
    const { status } = await c.req.json();

    if (!commentId) {
      return c.json(errorResponse('Invalid comment ID'), 400);
    }

    const result = await AdminService.updateCommentStatus(c.env.DB, commentId, status);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Comment status updated', { commentId, status });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Update comment status error', error);
    return c.json(errorResponse('Failed to update comment status', 'An error occurred while updating comment status'), 500);
  }
});

adminRoutes.delete('/comments/:id', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const commentId = c.req.param('id');

    if (!commentId) {
      return c.json(errorResponse('Invalid comment ID'), 400);
    }

    const result = await AdminService.deleteComment(c.env.DB, commentId);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Comment deleted by admin', { commentId, postId: result.data?.postId });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Delete comment error', error);
    return c.json(errorResponse('Failed to delete comment', 'An error occurred while deleting comment'), 500);
  }
});

adminRoutes.get('/users', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const result = await AdminService.getUsers(c.env.DB, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), ADMIN_CONSTANTS.DEFAULT_PAGE_SIZE),
      role: c.req.query('role'),
      status: c.req.query('status'),
      includeDeleted: c.req.query('includeDeleted') === 'true'
    });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 500));
    }

    logger.info('Admin users fetched', {
      count: result.data?.users?.length,
      page: result.data?.pagination?.page
    });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get admin users error', error);
    return c.json(errorResponse('Failed to fetch users', 'An error occurred while fetching users'), 500);
  }
});

adminRoutes.put('/users/:id/status', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const userId = c.req.param('id');
    const { status } = await c.req.json();
    const currentUser = c.get('user') as any;

    if (!userId) {
      return c.json(errorResponse('Invalid user ID'), 400);
    }

    const result = await AdminService.updateUserStatus(c.env.DB, userId, status, currentUser.userId);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('User status updated', { userId, username: result.data?.username, status });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Update user status error', error);
    return c.json(errorResponse('Failed to update user status', 'An error occurred while updating user status'), 500);
  }
});

adminRoutes.put('/users/:id/role', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const userId = c.req.param('id');
    const { role } = await c.req.json();

    if (!userId) {
      return c.json(errorResponse('Invalid user ID'), 400);
    }

    const result = await AdminService.updateUserRole(c.env.DB, userId, role);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('User role updated', { userId, username: result.data?.username, role });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Update user role error', error);
    return c.json(errorResponse('Failed to update user role', 'An error occurred while updating user role'), 500);
  }
});

adminRoutes.delete('/users/:id', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const userId = c.req.param('id');
    const currentUser = c.get('user') as any;

    if (!userId) {
      return c.json(errorResponse('Invalid user ID'), 400);
    }

    const result = await AdminService.deleteUser(c.env.DB, userId, currentUser.userId);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('User deleted by admin', { userId, username: result.data?.username });

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Delete user error', error);
    return c.json(errorResponse('Failed to delete user', 'An error occurred while deleting user'), 500);
  }
});

adminRoutes.get('/settings', requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const result = await AdminService.getSettings(c.env);

    logger.info('System settings fetched');

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get settings error', error);
    return c.json(errorResponse('Failed to fetch settings', 'An error occurred while fetching settings'), 500);
  }
});

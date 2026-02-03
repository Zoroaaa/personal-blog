/**
 * 管理后台相关路由
 * 
 * 功能：
 * - 评论管理（审核/删除）
 * - 用户列表管理
 * - 系统设置
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import { Env, successResponse, errorResponse } from '../index';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { safeParseInt } from '../utils/validation';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// ============= 常量配置 =============

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============= 评论管理 =============

/**
 * GET /api/admin/comments
 * 获取评论列表（需要管理员权限）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - status: 状态筛选（all, approved, pending, rejected, deleted）
 * - postId: 文章ID筛选
 */
adminRoutes.get('/comments', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const status = c.req.query('status') || 'all';
    const postId = c.req.query('postId');
    const offset = (page - 1) * limit;
    
    // 构建查询
    let query = `
      SELECT c.*, 
             u.username, u.display_name, u.avatar_url,
             p.title as post_title, p.slug as post_slug
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // 状态筛选
    if (status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }
    
    // 文章筛选
    if (postId) {
      query += ' AND c.post_id = ?';
      params.push(postId);
    }
    
    // 排序和分页
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // 执行查询
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    
    if (status !== 'all') {
      countQuery += ' AND c.status = ?';
      countParams.push(status);
    }
    
    if (postId) {
      countQuery += ' AND c.post_id = ?';
      countParams.push(postId);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    const total = countResult?.total || 0;
    
    logger.info('Admin comments fetched', { count: results.length, page, status, postId });
    
    return c.json(successResponse({
      comments: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get admin comments error', error);
    return c.json(errorResponse(
      'Failed to fetch comments',
      'An error occurred while fetching comments'
    ), 500);
  }
});

/**
 * PUT /api/admin/comments/:id/status
 * 更新评论状态（需要管理员权限）
 * 
 * 请求体：
 * {
 *   status: 'approved' | 'pending' | 'rejected' | 'deleted'
 * }
 */
adminRoutes.put('/comments/:id/status', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const commentId = c.req.param('id');
    const { status } = await c.req.json();
    
    if (!commentId) {
      return c.json(errorResponse('Invalid comment ID'), 400);
    }
    
    if (!status || !['approved', 'pending', 'rejected', 'deleted'].includes(status)) {
      return c.json(errorResponse(
        'Invalid status',
        'Status must be one of: approved, pending, rejected, deleted'
      ), 400);
    }
    
    // 检查评论是否存在
    const comment = await c.env.DB.prepare(
      'SELECT id, post_id FROM comments WHERE id = ?'
    ).bind(commentId).first() as any;
    
    if (!comment) {
      return c.json(errorResponse('Comment not found'), 404);
    }
    
    // 更新状态
    await c.env.DB.prepare(
      'UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, commentId).run();
    
    logger.info('Comment status updated', { commentId, status });
    
    return c.json(successResponse({ updated: true }));
    
  } catch (error) {
    logger.error('Update comment status error', error);
    return c.json(errorResponse(
      'Failed to update comment status',
      'An error occurred while updating comment status'
    ), 500);
  }
});

/**
 * DELETE /api/admin/comments/:id
 * 删除评论（需要管理员权限）
 */
adminRoutes.delete('/comments/:id', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const commentId = c.req.param('id');
    
    if (!commentId) {
      return c.json(errorResponse('Invalid comment ID'), 400);
    }
    
    // 检查评论是否存在
    const comment = await c.env.DB.prepare(
      'SELECT id, post_id FROM comments WHERE id = ?'
    ).bind(commentId).first() as any;
    
    if (!comment) {
      return c.json(errorResponse('Comment not found'), 404);
    }
    
    // 删除评论（级联删除会自动处理子评论）
    await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
    
    logger.info('Comment deleted by admin', { commentId, postId: comment.post_id });
    
    return c.json(successResponse({ deleted: true }));
    
  } catch (error) {
    logger.error('Delete comment error', error);
    return c.json(errorResponse(
      'Failed to delete comment',
      'An error occurred while deleting comment'
    ), 500);
  }
});

// ============= 用户管理 =============

/**
 * GET /api/admin/users
 * 获取用户列表（需要管理员权限）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - role: 角色筛选（all, admin, user, moderator）
 * - status: 状态筛选（all, active, suspended, deleted）
 */
adminRoutes.get('/users', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const role = c.req.query('role') || 'all';
    const status = c.req.query('status') || 'all';
    const offset = (page - 1) * limit;
    
    // 构建查询
    let query = `
      SELECT u.*
      FROM users u
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // 角色筛选
    if (role !== 'all') {
      query += ' AND u.role = ?';
      params.push(role);
    }
    
    // 状态筛选
    if (status !== 'all') {
      query += ' AND u.status = ?';
      params.push(status);
    }
    
    // 排序和分页
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // 执行查询
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total FROM users u
      WHERE 1=1
    `;
    const countParams: any[] = [];
    
    if (role !== 'all') {
      countQuery += ' AND u.role = ?';
      countParams.push(role);
    }
    
    if (status !== 'all') {
      countQuery += ' AND u.status = ?';
      countParams.push(status);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    const total = countResult?.total || 0;
    
    logger.info('Admin users fetched', { count: results.length, page, role, status });
    
    return c.json(successResponse({
      users: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get admin users error', error);
    return c.json(errorResponse(
      'Failed to fetch users',
      'An error occurred while fetching users'
    ), 500);
  }
});

/**
 * PUT /api/admin/users/:id/status
 * 更新用户状态（需要管理员权限）
 * 
 * 请求体：
 * {
 *   status: 'active' | 'suspended' | 'deleted'
 * }
 */
adminRoutes.put('/users/:id/status', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const userId = c.req.param('id');
    const { status } = await c.req.json();
    
    if (!userId) {
      return c.json(errorResponse('Invalid user ID'), 400);
    }
    
    if (!status || !['active', 'suspended', 'deleted'].includes(status)) {
      return c.json(errorResponse(
        'Invalid status',
        'Status must be one of: active, suspended, deleted'
      ), 400);
    }
    
    // 检查用户是否存在
    const user = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(userId).first() as any;
    
    if (!user) {
      return c.json(errorResponse('User not found'), 404);
    }
    
    // 不允许禁用自己的账号
    const currentUser = c.get('user') as any;
    if (userId === currentUser.userId.toString()) {
      return c.json(errorResponse(
        'Cannot modify own account',
        'You cannot change your own account status'
      ), 403);
    }
    
    // 更新状态
    await c.env.DB.prepare(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, userId).run();
    
    logger.info('User status updated', { userId, username: user.username, status });
    
    return c.json(successResponse({ updated: true }));
    
  } catch (error) {
    logger.error('Update user status error', error);
    return c.json(errorResponse(
      'Failed to update user status',
      'An error occurred while updating user status'
    ), 500);
  }
});

/**
 * PUT /api/admin/users/:id/role
 * 更新用户角色（需要管理员权限）
 * 
 * 请求体：
 * {
 *   role: 'admin' | 'user' | 'moderator'
 * }
 */
adminRoutes.put('/users/:id/role', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const userId = c.req.param('id');
    const { role } = await c.req.json();
    
    if (!userId) {
      return c.json(errorResponse('Invalid user ID'), 400);
    }
    
    if (!role || !['admin', 'user', 'moderator'].includes(role)) {
      return c.json(errorResponse(
        'Invalid role',
        'Role must be one of: admin, user, moderator'
      ), 400);
    }
    
    // 检查用户是否存在
    const user = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(userId).first() as any;
    
    if (!user) {
      return c.json(errorResponse('User not found'), 404);
    }
    
    // 更新角色
    await c.env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(role, userId).run();
    
    logger.info('User role updated', { userId, username: user.username, role });
    
    return c.json(successResponse({ updated: true }));
    
  } catch (error) {
    logger.error('Update user role error', error);
    return c.json(errorResponse(
      'Failed to update user role',
      'An error occurred while updating user role'
    ), 500);
  }
});

// ============= 系统设置 =============

/**
 * GET /api/admin/settings
 * 获取系统设置（需要管理员权限）
 */
adminRoutes.get('/settings', requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    // 这里可以从数据库或环境变量中获取系统设置
    // 暂时返回基本信息
    const settings = {
      siteName: 'Personal Blog',
      environment: c.env.ENVIRONMENT || 'development',
      apiVersion: '2.0.0',
      features: {
        analytics: true,
        comments: true,
        search: true,
        media: true
      }
    };
    
    logger.info('System settings fetched');
    
    return c.json(successResponse({ settings }));
    
  } catch (error) {
    logger.error('Get settings error', error);
    return c.json(errorResponse(
      'Failed to fetch settings',
      'An error occurred while fetching settings'
    ), 500);
  }
});

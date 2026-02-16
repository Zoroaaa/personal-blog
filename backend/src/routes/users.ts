/**
 * 用户相关路由（重构版）
 *
 * 功能：
 * - 用户搜索（用于私信）
 * - 获取用户公开资料
 * - 获取用户文章列表
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2026-02-14
 * @refactored 2026-02-16
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse, getStatus } from '../utils/response';
import { createLogger } from '../middleware/requestLogger';
import { safeParseInt } from '../utils/validation';
import { UserService, USER_CONSTANTS } from '../services/userService';

export const userRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

userRoutes.get('/search', async (c) => {
  const logger = createLogger(c);

  try {
    const username = c.req.query('username');

    const result = await UserService.searchUser(c.env.DB, { username: username || '' });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('User search completed', { username, found: !!result.user });

    return c.json(successResponse({ user: result.user }, result.message));
  } catch (error) {
    logger.error('User search error:', error);
    return c.json(errorResponse('搜索用户失败'), 500);
  }
});

userRoutes.get('/:id', async (c) => {
  const logger = createLogger(c);

  try {
    const userId = parseInt(c.req.param('id'));

    const result = await UserService.getUserProfile(c.env.DB, { userId });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('User profile fetched', { userId });

    return c.json(successResponse({ user: result.user }));
  } catch (error) {
    logger.error('Get user profile error:', error);
    return c.json(errorResponse('获取用户资料失败'), 500);
  }
});

userRoutes.get('/:id/posts', async (c) => {
  const logger = createLogger(c);

  try {
    const userId = parseInt(c.req.param('id'));

    const result = await UserService.getUserPosts(c.env.DB, {
      userId,
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), USER_CONSTANTS.DEFAULT_PAGE_SIZE)
    });

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('User posts fetched', { userId, count: result.posts?.length });

    return c.json(successResponse({
      posts: result.posts,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get user posts error:', error);
    return c.json(errorResponse('获取用户文章失败'), 500);
  }
});

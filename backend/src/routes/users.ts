/**
 * 用户相关路由
 *
 * 功能：
 * - 用户搜索（用于私信）
 * - 获取用户公开资料
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-14
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { createLogger } from '../middleware/requestLogger';

export const userRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

userRoutes.get('/search', async (c) => {
  const logger = createLogger(c);

  try {
    const username = c.req.query('username');

    if (!username || username.trim().length === 0) {
      return c.json(errorResponse('用户名不能为空'), 400);
    }

    const sanitizedUsername = username.trim().toLowerCase();

    const user = await c.env.DB.prepare(`
      SELECT id, username, display_name, avatar_url, bio
      FROM users
      WHERE LOWER(username) = ? AND deleted_at IS NULL
      LIMIT 1
    `).bind(sanitizedUsername).first();

    if (!user) {
      return c.json(successResponse({ user: null }, '未找到用户'));
    }

    logger.info('User search completed', { username: sanitizedUsername, found: true });

    return c.json(successResponse({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
      }
    }));

  } catch (error) {
    logger.error('User search error:', error);
    return c.json(errorResponse('搜索用户失败'), 500);
  }
});

userRoutes.get('/:id', async (c) => {
  const logger = createLogger(c);

  try {
    const userId = parseInt(c.req.param('id'));

    if (isNaN(userId) || userId <= 0) {
      return c.json(errorResponse('无效的用户ID'), 400);
    }

    const user = await c.env.DB.prepare(`
      SELECT id, username, display_name, avatar_url, bio, created_at,
             (SELECT COUNT(*) FROM posts WHERE author_id = users.id AND status = 'published') as post_count,
             (SELECT COUNT(*) FROM comments WHERE user_id = users.id AND deleted_at IS NULL) as comment_count
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(userId).first();

    if (!user) {
      return c.json(errorResponse('用户不存在'), 404);
    }

    logger.info('User profile fetched', { userId });

    return c.json(successResponse({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
        postCount: user.post_count,
        commentCount: user.comment_count,
      }
    }));

  } catch (error) {
    logger.error('Get user profile error:', error);
    return c.json(errorResponse('获取用户资料失败'), 500);
  }
});

/**
 * 评论相关路由（重构版）
 *
 * 功能：
 * - 获取评论列表（支持分页）
 * - 发表评论和回复
 * - 删除评论
 * - 点赞评论
 *
 * @version 2.1.0
 * @author 博客系统
 * @created 2024-01-01
 * @refactored 2026-02-16
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse, getStatus } from '../utils/response';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { safeParseInt } from '../utils/validation';
import { isFeatureEnabled, getConfigValue } from './config';
import { CommentService, COMMENT_CONSTANTS } from '../services/commentService';
import { rateLimit } from '../middleware/rateLimit';

export const commentRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

commentRoutes.get('/', optionalAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user');

    const result = await CommentService.getCommentList(c.env.DB, {
      postId: c.req.query('postId'),
      userId: c.req.query('userId'),
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), COMMENT_CONSTANTS.DEFAULT_PAGE_SIZE),
      includeReplies: c.req.query('includeReplies') !== 'false'
    }, currentUser);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Comments fetched successfully', {
      postId: c.req.query('postId'),
      count: result.comments?.length,
      page: result.pagination?.page
    });

    return c.json(successResponse({
      comments: result.comments,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get comments error', error);
    return c.json(errorResponse('Failed to fetch comments', 'An error occurred while fetching comments'), 500);
  }
});

commentRoutes.post('/', requireAuth, rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: '1 分钟内最多发表 5 条评论'
}), async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const body = await c.req.json();

    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';

    const result = await CommentService.createComment(
      c.env.DB,
      c.env,
      user.userId,
      user,
      body,
      ip,
      userAgent,
      isFeatureEnabled,
      getConfigValue
    );

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Comment created successfully', {
      commentId: result.comment?.id,
      postId: body.postId,
      parentId: body.parentId,
      userId: user.userId
    });

    return c.json(successResponse({
      id: result.comment?.id
    }, result.message || 'Comment created successfully'), 201);
  } catch (error) {
    logger.error('Create comment error', error);
    return c.json(errorResponse('Failed to create comment', 'An error occurred while creating the comment'), 500);
  }
});

commentRoutes.delete('/:id', requireAuth, rateLimit({
  windowMs: 30 * 1000,
  maxRequests: 10,
  message: '删除评论过于频繁，请稍后再试'
}), async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const result = await CommentService.deleteComment(c.env.DB, user.userId, user.role, id);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Comment deleted successfully', {
      commentId: id,
      postId: result.comment?.postId,
      userId: user.userId
    });

    return c.json(successResponse({ deleted: true }, result.message || 'Comment deleted successfully'));
  } catch (error) {
    logger.error('Delete comment error', error);
    return c.json(errorResponse('Failed to delete comment', 'An error occurred while deleting the comment'), 500);
  }
});

commentRoutes.post('/:id/like', requireAuth, rateLimit({
  windowMs: 15 * 1000,
  maxRequests: 20,
  message: '点赞操作过于频繁，请稍后再试'
}), async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const commentId = parseInt(c.req.param('id'));

    const result = await CommentService.toggleLike(
      c.env.DB,
      c.env,
      user.userId,
      user,
      commentId,
      isFeatureEnabled
    );

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Comment like toggled', {
      commentId,
      userId: user.userId,
      liked: result.comment?.liked
    });

    return c.json(successResponse({ liked: result.comment?.liked }));
  } catch (error) {
    logger.error('Like comment error', error);
    return c.json(errorResponse('Failed to like comment', 'An error occurred while processing your request'), 500);
  }
});

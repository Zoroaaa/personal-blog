/**
 * 评论相关路由（优化版）
 * 
 * 功能：
 * - 获取评论列表（支持分页）
 * - 发表评论和回复
 * - 删除评论
 * - 点赞评论
 * 
 * 优化内容：
 * 1. 添加分页支持
 * 2. 统一API响应格式
 * 3. 增强输入验证和清理
 * 4. 改进评论树构建算法
 * 5. 添加IP和User Agent记录
 * 6. 详细的错误处理和日志
 * 
 * @version 2.0.0
 * @author 博客系统
 * @created 2024-01-01
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  validateLength,
  sanitizeInput,
  safeParseInt
} from '../utils/validation';
import { isFeatureEnabled, getConfigValue } from './config';
import { createInteractionNotification } from '../services/notificationService';
import { isNotificationEnabled, isInteractionSubtypeEnabled } from '../services/notificationSettingsService';
import { detectMentions, createMentionNotifications } from '../services/mentionService';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';

export const commentRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 常量配置 =============

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_COMMENT_LENGTH = 1;
const MAX_COMMENT_LENGTH = 1000;

// ============= 获取评论列表 =============

/**
 * GET /api/comments
 * 获取评论列表（公开，支持分页）
 * 
 * 查询参数：
 * - postId: 文章ID（二选一）
 * - userId: 用户ID（二选一，需要认证）
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - includeReplies: 是否包含回复（默认true）
 */
commentRoutes.get('/', optionalAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 1. 解析和验证查询参数 =====
    const postId = c.req.query('postId');
    const userId = c.req.query('userId');
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const includeReplies = c.req.query('includeReplies') !== 'false';
    const offset = (page - 1) * limit;
    
    if (!postId && !userId) {
      return c.json(errorResponse(
        'Missing required parameter',
        'Either postId or userId is required'
      ), 400);
    }
    
    // 如果是按用户ID获取，需要验证权限
    if (userId) {
      const currentUser = c.get('user') as any;
      if (!currentUser || currentUser.userId !== parseInt(userId)) {
        return c.json(errorResponse(
          'Forbidden',
          'You can only view your own comments'
        ), 403);
      }
    }
    
    // ===== 3. 获取评论 =====
    let query, params;
    
    if (postId) {
      // 按文章ID获取评论
      query = `
        SELECT c.*, u.username, u.display_name, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.status = 'approved' AND c.parent_id IS NULL AND c.deleted_at IS NULL AND u.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [postId, limit, offset];
    } else {
      // 按用户ID获取评论
      query = `
        SELECT c.*, u.username, u.display_name, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ? AND c.status = 'approved' AND c.deleted_at IS NULL AND u.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, limit, offset];
    }
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // ===== 4. 获取评论总数 =====
    let countQuery, countParams;
    
    if (postId) {
      countQuery = `
        SELECT COUNT(*) as total FROM comments
        WHERE post_id = ? AND status = 'approved' AND parent_id IS NULL AND deleted_at IS NULL
      `;
      countParams = [postId];
    } else {
      countQuery = `
        SELECT COUNT(*) as total FROM comments
        WHERE user_id = ? AND status = 'approved' AND deleted_at IS NULL
      `;
      countParams = [userId];
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    
    const total = countResult?.total || 0;
    
    // ===== 5. 处理评论数据 =====
    let comments = results as any[];
    
    // 对于按用户ID获取的评论，不需要构建回复树，因为所有评论都是用户自己的
    if (postId && includeReplies && comments.length > 0) {
      const commentIds = comments.map(c => c.id);
      
      // 获取所有回复（递归获取所有层级）
      const { results: replies } = await c.env.DB.prepare(`
        WITH RECURSIVE comment_tree AS (
          -- 第一级回复
          SELECT c.*, u.username, u.display_name, u.avatar_url, 1 as level
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.parent_id IN (${commentIds.map(() => '?').join(',')})
            AND c.status = 'approved' AND c.deleted_at IS NULL AND u.deleted_at IS NULL

          UNION ALL

          -- 递归获取子回复
          SELECT c.*, u.username, u.display_name, u.avatar_url, ct.level + 1
          FROM comments c
          JOIN users u ON c.user_id = u.id
          JOIN comment_tree ct ON c.parent_id = ct.id
          WHERE c.status = 'approved' AND ct.level < 5 AND c.deleted_at IS NULL AND u.deleted_at IS NULL
        )
        SELECT * FROM comment_tree ORDER BY created_at ASC
      `).bind(...commentIds).all();
      
      // 构建评论树
      comments = buildCommentTree([...comments, ...replies as any[]]);
    } else if (!postId) {
      // 按用户ID获取的评论，添加文章信息（包括分类）
      for (const comment of comments) {
        const post = await c.env.DB.prepare(`
          SELECT p.id, p.title, p.slug, p.cover_image,
                 c.name as category_name, c.slug as category_slug, c.color as category_color
          FROM posts p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ?
        `).bind(comment.post_id).first() as any;
        if (post) {
          comment.post = {
            id: post.id,
            title: post.title,
            slug: post.slug,
            coverImage: post.cover_image,
            categoryName: post.category_name,
            categorySlug: post.category_slug,
            categoryColor: post.category_color
          };
        }
      }
    }
    
    // ===== 6. 检查当前用户的点赞状态 =====
    const currentUser = c.get('user') as any;
    if (currentUser) {
      const allCommentIds = getAllCommentIds(comments);
      
      if (allCommentIds.length > 0) {
        const { results: likes } = await c.env.DB.prepare(`
          SELECT comment_id FROM likes 
          WHERE user_id = ? AND comment_id IN (${allCommentIds.map(() => '?').join(',')})
        `).bind(currentUser.userId, ...allCommentIds).all();
        
        const likedIds = new Set((likes as any[]).map(l => l.comment_id));
        markLikedComments(comments, likedIds);
      }
    }
    
    logger.info('Comments fetched successfully', { 
      postId, 
      count: comments.length,
      page 
    });
    
    return c.json(successResponse({
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get comments error', error);
    return c.json(errorResponse(
      'Failed to fetch comments',
      'An error occurred while fetching comments'
    ), 500);
  }
});

// ============= 发表评论 =============

/**
 * POST /api/comments
 * 发表评论或回复（需要认证）
 * 
 * 请求体：
 * {
 *   postId: number,
 *   content: string,
 *   parentId?: number
 * }
 */
commentRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 0. 检查是否允许评论 =====
    const isCommentsEnabled = await isFeatureEnabled(c.env, 'feature_comments');
    if (!isCommentsEnabled) {
      return c.json(errorResponse(
        'Comments disabled',
        '评论功能已关闭'
      ), 403);
    }
    
    // ===== 0.5 获取评论相关配置 =====
    const maxCommentLength = await getConfigValue<number>(c.env, 'max_comment_length', 1000);
    const commentApprovalRequired = await isFeatureEnabled(c.env, 'comment_approval_required');
    
    const user = c.get('user') as any;
    const body = await c.req.json();
    let { postId, content, parentId } = body;
    
    // ===== 1. 验证必填字段 =====
    if (!postId || !content) {
      return c.json(errorResponse(
        'Missing required fields',
        'postId and content are required'
      ), 400);
    }
    
    // ===== 2. 清理和验证内容 =====
    content = sanitizeInput(content);
    
    const contentError = validateLength(content, MIN_COMMENT_LENGTH, maxCommentLength, 'Comment');
    if (contentError) {
      return c.json(errorResponse('Invalid comment', contentError), 400);
    }
    
    // ===== 3. 检查文章是否存在 =====
    const post = await c.env.DB.prepare(
      'SELECT id, status FROM posts WHERE id = ?'
    ).bind(postId).first() as any;
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    if (post.status !== 'published') {
      return c.json(errorResponse(
        'Cannot comment',
        'Comments are not allowed on unpublished posts'
      ), 403);
    }
    
    // ===== 4. 如果是回复，检查父评论是否存在 =====
    if (parentId) {
      const parent = await c.env.DB.prepare(
        'SELECT id, post_id FROM comments WHERE id = ? AND deleted_at IS NULL'
      ).bind(parentId).first() as any;
      
      if (!parent) {
        return c.json(errorResponse('Parent comment not found'), 404);
      }
      
      if (parent.post_id !== postId) {
        return c.json(errorResponse(
          'Invalid parent comment',
          'Parent comment does not belong to this post'
        ), 400);
      }
    }
    
    // ===== 5. 获取IP和User Agent =====
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';
    
    // ===== 6. 插入评论 =====
    const result = await c.env.DB.prepare(`
      INSERT INTO comments (
        post_id, user_id, parent_id, content, status,
        ip_address, user_agent, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      postId,
      user.userId,
      parentId || null,
      content,
      commentApprovalRequired ? 'pending' : 'approved', // 根据配置决定是否需要审核
      ip,
      userAgent
    ).run();
    
    if (!result.success) {
      throw new Error('Failed to create comment');
    }
    
    const commentId = result.meta.last_row_id;
    
    // ===== 7. 更新计数（由触发器自动处理，这里作为备份） =====
    // 文章评论数会由触发器更新
    // 如果是回复，父评论的回复数也会由触发器更新
    
    logger.info('Comment created successfully', { 
      commentId, 
      postId, 
      parentId,
      userId: user.userId 
    });

    // ===== 8. 发送通知 =====
    try {
      if (parentId) {
        // 回复评论 - 通知被回复者
        const parentComment = await c.env.DB.prepare(
          'SELECT c.user_id, c.content, u.display_name, u.username FROM comments c ' +
          'LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ? AND c.deleted_at IS NULL'
        ).bind(parentId).first() as any;

        if (parentComment && parentComment.user_id !== user.userId) {
          // 检查用户是否开启了回复通知
          const isEnabled = await isInteractionSubtypeEnabled(
            c.env.DB,
            parentComment.user_id,
            'reply'
          );

          if (isEnabled) {
            // 获取文章信息用于跳转
            const postInfo = await c.env.DB.prepare(
              'SELECT title, slug FROM posts WHERE id = ?'
            ).bind(postId).first() as any;

            await createInteractionNotification(c.env.DB, {
              userId: parentComment.user_id,
              subtype: 'reply',
              title: `${user.displayName || user.username} 回复了你的评论`,
              content: content.length > 100 ? content.substring(0, 100) + '...' : content,
              relatedData: {
                postId: postId,
                postTitle: postInfo?.title,
                postSlug: postInfo?.slug,
                commentId: commentId,
                parentCommentId: parentId,
                parentCommentContent: parentComment.content,
                parentCommentAuthor: parentComment.display_name || parentComment.username,
                replyContent: content,
                senderId: user.userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            });
          }
        }
      } else {
        // 评论文章 - 通知文章作者
        const postInfo = await c.env.DB.prepare(
          'SELECT author_id, title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as any;

        if (postInfo && postInfo.author_id !== user.userId) {
          // 检查用户是否开启了评论通知
          const isEnabled = await isInteractionSubtypeEnabled(
            c.env.DB,
            postInfo.author_id,
            'comment'
          );

          if (isEnabled) {
            await createInteractionNotification(c.env.DB, {
              userId: postInfo.author_id,
              subtype: 'comment',
              title: `${user.displayName || user.username} 评论了你的文章《${postInfo.title}》`,
              content: content.length > 100 ? content.substring(0, 100) + '...' : content,
              relatedData: {
                postId: postId,
                postTitle: postInfo.title,
                postSlug: postInfo.slug,
                commentId: commentId,
                senderId: user.userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            });
          }
        }
      }
    } catch (notifyError) {
      // 通知发送失败不影响评论创建
      logger.error('Send comment notification error', notifyError);
    }

    // ===== 9. 检测并处理@mentions =====
    try {
      const mentions = detectMentions(content);
      if (mentions.length > 0) {
        // 获取文章信息
        const postInfo = await c.env.DB.prepare(
          'SELECT title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as any;

        await createMentionNotifications(
          c.env.DB,
          mentions,
          user.userId,
          'comment',
          commentId,
          `/posts/${postInfo?.slug || postId}#comment-${commentId}`
        );

        logger.info('Mention notifications created', {
          commentId,
          mentions: mentions.length
        });
      }
    } catch (mentionError) {
      // @mentions处理失败不影响评论创建
      logger.error('Mention detection error', mentionError);
    }
    
    return c.json(successResponse({
      id: commentId
    }, 'Comment created successfully'), 201);
    
  } catch (error) {
    logger.error('Create comment error', error);
    return c.json(errorResponse(
      'Failed to create comment',
      'An error occurred while creating the comment'
    ), 500);
  }
});

// ============= 删除评论 =============

/**
 * DELETE /api/comments/:id
 * 删除评论（需要认证，只能删除自己的评论或管理员可删除所有）
 */
commentRoutes.delete('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    
    // 获取评论信息
    const comment = await c.env.DB.prepare(
      'SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first() as any;
    
    if (!comment) {
      return c.json(errorResponse('Comment not found'), 404);
    }
    
    // 权限检查
    if (comment.user_id !== user.userId && user.role !== 'admin') {
      return c.json(errorResponse(
        'Forbidden',
        'You do not have permission to delete this comment'
      ), 403);
    }
    
    // 软删除评论（保留数据以支持审计和恢复）
    await SoftDeleteHelper.softDelete(c.env.DB, 'comments', id);
    
    // 计数更新由触发器自动处理
    
    // 评论数据变化频繁，不使用缓存
    
    logger.info('Comment deleted successfully', { 
      commentId: id,
      postId: comment.post_id,
      userId: user.userId 
    });
    
    return c.json(successResponse({ deleted: true }, 'Comment deleted successfully'));
    
  } catch (error) {
    logger.error('Delete comment error', error);
    return c.json(errorResponse(
      'Failed to delete comment',
      'An error occurred while deleting the comment'
    ), 500);
  }
});

// ============= 点赞评论 =============

/**
 * POST /api/comments/:id/like
 * 点赞/取消点赞评论（需要认证）
 */
commentRoutes.post('/:id/like', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 0. 检查是否允许点赞 =====
    const isLikeEnabled = await isFeatureEnabled(c.env, 'feature_like');
    if (!isLikeEnabled) {
      return c.json(errorResponse(
        'Like disabled',
        '点赞功能已关闭'
      ), 403);
    }
    
    const user = c.get('user') as any;
    const commentId = parseInt(c.req.param('id'));

    if (isNaN(commentId)) {
      return c.json(errorResponse('Invalid comment ID'), 400);
    }

    // 检查评论是否存在
    const comment = await c.env.DB.prepare(
      'SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL'
    ).bind(commentId).first();
    
    if (!comment) {
      return c.json(errorResponse('Comment not found'), 404);
    }
    
    // 检查是否已点赞
    const existing = await c.env.DB.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND comment_id = ?'
    ).bind(user.userId, commentId).first();
    
    let liked = false;
    
    if (existing) {
      // 取消点赞
      await c.env.DB.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
      await c.env.DB.prepare(
        'UPDATE comments SET like_count = like_count - 1 WHERE id = ?'
      ).bind(commentId).run();
      liked = false;
      logger.info('Comment unliked', { commentId, userId: user.userId });
    } else {
      // 点赞
      await c.env.DB.prepare(
        'INSERT INTO likes (user_id, comment_id) VALUES (?, ?)'
      ).bind(user.userId, commentId).run();
      await c.env.DB.prepare(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = ?'
      ).bind(commentId).run();
      liked = true;
      logger.info('Comment liked', { commentId, userId: user.userId });

      // 发送点赞通知
      try {
        const commentInfo = await c.env.DB.prepare(
          `SELECT c.user_id, c.content, p.id as post_id, p.title, p.slug
           FROM comments c
           JOIN posts p ON c.post_id = p.id
           WHERE c.id = ? AND c.deleted_at IS NULL`
        ).bind(commentId).first() as any;

        if (commentInfo && commentInfo.user_id !== user.userId) {
          // 检查用户是否开启了点赞通知
          const isEnabled = await isInteractionSubtypeEnabled(
            c.env.DB,
            commentInfo.user_id,
            'like'
          );

          if (isEnabled) {
            await createInteractionNotification(c.env.DB, {
              userId: commentInfo.user_id,
              subtype: 'like',
              title: `${user.displayName || user.username} 赞了你的评论`,
              content: commentInfo.content.length > 100 
                ? commentInfo.content.substring(0, 100) + '...' 
                : commentInfo.content,
              relatedData: {
                postId: commentInfo.post_id,
                postTitle: commentInfo.title,
                postSlug: commentInfo.slug,
                commentId: commentId,
                senderId: user.userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            });
          }
        }
      } catch (notifyError) {
        // 通知发送失败不影响点赞操作
        logger.error('Send like notification error', notifyError);
      }
    }
    
    return c.json(successResponse({ liked }));
    
  } catch (error) {
    logger.error('Like comment error', error);
    return c.json(errorResponse(
      'Failed to like comment',
      'An error occurred while processing your request'
    ), 500);
  }
});

// ============= 辅助函数 =============

/**
 * 构建评论树结构
 */
function buildCommentTree(comments: any[]): any[] {
  const commentMap = new Map();
  const rootComments: any[] = [];
  
  // 第一遍：创建map并初始化replies数组
  comments.forEach(comment => {
    commentMap.set(comment.id, { 
      ...comment, 
      replies: [],
      isLiked: false // 默认未点赞
    });
  });
  
  // 第二遍：构建树结构
  comments.forEach(comment => {
    const node = commentMap.get(comment.id);
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(node);
      } else {
        // 如果父评论不存在（可能被删除），将其作为根评论
        rootComments.push(node);
      }
    } else {
      rootComments.push(node);
    }
  });
  
  return rootComments;
}

/**
 * 获取所有评论ID（包括嵌套的回复）
 */
function getAllCommentIds(comments: any[]): number[] {
  const ids: number[] = [];
  
  function traverse(comments: any[]) {
    for (const comment of comments) {
      ids.push(comment.id);
      if (comment.replies && comment.replies.length > 0) {
        traverse(comment.replies);
      }
    }
  }
  
  traverse(comments);
  return ids;
}

/**
 * 标记已点赞的评论
 */
function markLikedComments(comments: any[], likedIds: Set<number>): void {
  function traverse(comments: any[]) {
    for (const comment of comments) {
      comment.isLiked = likedIds.has(comment.id);
      if (comment.replies && comment.replies.length > 0) {
        traverse(comment.replies);
      }
    }
  }
  
  traverse(comments);
}

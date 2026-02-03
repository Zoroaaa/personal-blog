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
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import { Env, successResponse, errorResponse } from '../index';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  validateLength,
  sanitizeInput,
  safeParseInt
} from '../utils/validation';

export const commentRoutes = new Hono<{ Bindings: Env }>();

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
 * - postId: 文章ID（必填）
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大100）
 * - includeReplies: 是否包含回复（默认true）
 */
commentRoutes.get('/', optionalAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 1. 解析和验证查询参数 =====
    const postId = c.req.query('postId');
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const includeReplies = c.req.query('includeReplies') !== 'false';
    const offset = (page - 1) * limit;
    
    if (!postId) {
      return c.json(errorResponse(
        'Missing postId',
        'postId parameter is required'
      ), 400);
    }
    
    // ===== 2. 检查文章是否存在 =====
    const post = await c.env.DB.prepare(
      'SELECT id FROM posts WHERE id = ?'
    ).bind(postId).first();
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    // ===== 3. 获取评论（只获取顶级评论用于分页） =====
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.status = 'approved' AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(postId, limit, offset).all();
    
    // ===== 4. 获取评论总数 =====
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM comments 
      WHERE post_id = ? AND status = 'approved' AND parent_id IS NULL
    `).bind(postId).first() as any;
    
    const total = countResult?.total || 0;
    
    // ===== 5. 如果需要包含回复，获取所有回复 =====
    let comments = results as any[];
    
    if (includeReplies && comments.length > 0) {
      const commentIds = comments.map(c => c.id);
      
      // 获取所有回复（递归获取所有层级）
      const { results: replies } = await c.env.DB.prepare(`
        WITH RECURSIVE comment_tree AS (
          -- 第一级回复
          SELECT c.*, u.username, u.display_name, u.avatar_url, 1 as level
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.parent_id IN (${commentIds.map(() => '?').join(',')})
            AND c.status = 'approved'
          
          UNION ALL
          
          -- 递归获取子回复
          SELECT c.*, u.username, u.display_name, u.avatar_url, ct.level + 1
          FROM comments c
          JOIN users u ON c.user_id = u.id
          JOIN comment_tree ct ON c.parent_id = ct.id
          WHERE c.status = 'approved' AND ct.level < 5
        )
        SELECT * FROM comment_tree ORDER BY created_at ASC
      `).bind(...commentIds).all();
      
      // 构建评论树
      comments = buildCommentTree([...comments, ...replies as any[]]);
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
    
    const contentError = validateLength(content, MIN_COMMENT_LENGTH, MAX_COMMENT_LENGTH, 'Comment');
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
        'SELECT id, post_id FROM comments WHERE id = ?'
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
      'approved', // 可以改为 'pending' 需要审核
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
      'SELECT * FROM comments WHERE id = ?'
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
    
    // 删除评论（级联删除会自动处理子评论）
    await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    
    // 计数更新由触发器自动处理
    
    // 清除数据分析缓存
    await c.env.CACHE.delete('analytics:stats');
    
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
    const user = c.get('user') as any;
    const commentId = c.req.param('id');
    
    // 检查评论是否存在
    const comment = await c.env.DB.prepare(
      'SELECT id FROM comments WHERE id = ?'
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

/**
 * 评论相关路由
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { requireAuth, optionalAuth } from '../middleware/auth';

export const commentRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/comments
 * 获取评论列表(公开)
 */
commentRoutes.get('/', optionalAuth, async (c) => {
  try {
    const postId = c.req.query('postId');
    
    if (!postId) {
      return c.json({ error: 'postId is required' }, 400);
    }
    
    // 获取所有评论
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `).bind(postId).all();
    
    // 构建评论树
    const comments = buildCommentTree(results as any[]);
    
    return c.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

/**
 * POST /api/comments
 * 发表评论(需要认证)
 */
commentRoutes.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user') as any;
    const { postId, content, parentId } = await c.req.json();
    
    if (!postId || !content) {
      return c.json({ error: 'postId and content are required' }, 400);
    }
    
    if (content.length > 1000) {
      return c.json({ error: 'Content too long' }, 400);
    }
    
    // 检查文章是否存在
    const post = await c.env.DB.prepare(
      'SELECT id FROM posts WHERE id = ?'
    ).bind(postId).first();
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    // 如果是回复,检查父评论是否存在
    if (parentId) {
      const parent = await c.env.DB.prepare(
        'SELECT id FROM comments WHERE id = ? AND post_id = ?'
      ).bind(parentId, postId).first();
      
      if (!parent) {
        return c.json({ error: 'Parent comment not found' }, 404);
      }
    }
    
    // 插入评论
    const result = await c.env.DB.prepare(`
      INSERT INTO comments (post_id, user_id, parent_id, content, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      postId,
      user.userId,
      parentId || null,
      content,
      'approved' // 自动通过,可改为pending需要审核
    ).run();
    
    // 更新文章评论数
    await c.env.DB.prepare(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?'
    ).bind(postId).run();
    
    return c.json({ id: result.meta.last_row_id }, 201);
  } catch (error) {
    console.error('Create comment error:', error);
    return c.json({ error: 'Failed to create comment' }, 500);
  }
});

/**
 * DELETE /api/comments/:id
 * 删除评论(需要认证)
 */
commentRoutes.delete('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    
    const comment = await c.env.DB.prepare(
      'SELECT * FROM comments WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!comment) {
      return c.json({ error: 'Comment not found' }, 404);
    }
    
    // 只能删除自己的评论,或管理员可以删除所有
    if (comment.user_id !== user.userId && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    
    // 更新文章评论数
    await c.env.DB.prepare(
      'UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?'
    ).bind(comment.post_id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ error: 'Failed to delete comment' }, 500);
  }
});

/**
 * POST /api/comments/:id/like
 * 点赞评论(需要认证)
 */
commentRoutes.post('/:id/like', requireAuth, async (c) => {
  try {
    const user = c.get('user') as any;
    const commentId = c.req.param('id');
    
    // 检查是否已点赞
    const existing = await c.env.DB.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND comment_id = ?'
    ).bind(user.userId, commentId).first();
    
    if (existing) {
      // 取消点赞
      await c.env.DB.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
      await c.env.DB.prepare('UPDATE comments SET like_count = like_count - 1 WHERE id = ?').bind(commentId).run();
      return c.json({ liked: false });
    } else {
      // 点赞
      await c.env.DB.prepare(
        'INSERT INTO likes (user_id, comment_id) VALUES (?, ?)'
      ).bind(user.userId, commentId).run();
      await c.env.DB.prepare('UPDATE comments SET like_count = like_count + 1 WHERE id = ?').bind(commentId).run();
      return c.json({ liked: true });
    }
  } catch (error) {
    console.error('Like comment error:', error);
    return c.json({ error: 'Failed to like comment' }, 500);
  }
});

/**
 * 构建评论树结构
 */
function buildCommentTree(comments: any[]): any[] {
  const commentMap = new Map();
  const rootComments: any[] = [];
  
  // 第一遍:创建map
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  
  // 第二遍:构建树
  comments.forEach(comment => {
    const node = commentMap.get(comment.id);
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(node);
      }
    } else {
      rootComments.push(node);
    }
  });
  
  return rootComments;
}

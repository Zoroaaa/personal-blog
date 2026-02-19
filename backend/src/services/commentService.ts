/**
 * 评论服务
 *
 * 功能：
 * - 评论列表查询（支持分页、评论树构建）
 * - 发表评论和回复
 * - 删除评论
 * - 点赞评论
 * - 评论通知
 * - @mentions处理
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import {
  validateLength,
  sanitizeCommentContent
} from '../utils/validation';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';
import { createInteractionNotification } from './notificationService';
import { isInteractionSubtypeEnabled } from './notificationSettingsService';
import { detectMentions, createMentionNotifications } from './mentionService';
import {
  COMMENT_CONSTANTS,
  NOTIFICATION_PREVIEW_CONSTANTS,
  COMMENT_STATUS_CONSTANTS,
} from '../config/constants';
import type { CommentRow, TotalResult, CountResult } from '../types/database';

export interface CommentListQuery {
  postId?: string;
  userId?: string;
  page?: number;
  limit?: number;
  includeReplies?: boolean;
}

export interface CreateCommentRequest {
  postId: number;
  content: string;
  parentId?: number;
  mentionedUserIds?: number[];
}

export interface CommentResult {
  success: boolean;
  comment?: any;
  comments?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

function buildCommentTree(comments: any[]): any[] {
  const commentMap = new Map();
  const rootComments: any[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
      isLiked: false
    });
  });

  comments.forEach(comment => {
    const node = commentMap.get(comment.id);
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(node);
      } else {
        rootComments.push(node);
      }
    } else {
      rootComments.push(node);
    }
  });

  return rootComments;
}

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

export class CommentService {
  static async getCommentList(
    db: any,
    query: CommentListQuery,
    currentUser: any
  ): Promise<CommentResult> {
    const postId = query.postId;
    const userId = query.userId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(COMMENT_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, query.limit || COMMENT_CONSTANTS.DEFAULT_PAGE_SIZE));
    const includeReplies = query.includeReplies !== false;
    const offset = (page - 1) * limit;

    if (!postId && !userId) {
      return {
        success: false,
        message: 'Either postId or userId is required',
        statusCode: 400
      };
    }

    if (userId) {
      if (!currentUser || currentUser.userId !== parseInt(userId)) {
        return {
          success: false,
          message: 'You can only view your own comments',
          statusCode: 403
        };
      }
    }

    let sql, params;

    if (postId) {
      sql = `
        SELECT c.*, u.username, u.display_name, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.status = 'approved' AND c.parent_id IS NULL AND c.deleted_at IS NULL AND u.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [postId, limit, offset];
    } else {
      sql = `
        SELECT c.*, u.username, u.display_name, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ? AND c.status = 'approved' AND c.deleted_at IS NULL AND u.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, limit, offset];
    }

    const { results } = await db.prepare(sql).bind(...params).all();

    let countSql, countParams;

    if (postId) {
      countSql = `
        SELECT COUNT(*) as total FROM comments
        WHERE post_id = ? AND status = 'approved' AND parent_id IS NULL AND deleted_at IS NULL
      `;
      countParams = [postId];
    } else {
      countSql = `
        SELECT COUNT(*) as total FROM comments
        WHERE user_id = ? AND status = 'approved' AND deleted_at IS NULL
      `;
      countParams = [userId];
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first() as TotalResult | null;
    const total = countResult?.total || 0;

    let comments = results as any[];

    if (postId && includeReplies && comments.length > 0) {
      const commentIds = comments.map(c => c.id);

      const { results: replies } = await db.prepare(`
        WITH RECURSIVE comment_tree AS (
          SELECT c.*, u.username, u.display_name, u.avatar_url, 1 as level
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.parent_id IN (${commentIds.map(() => '?').join(',')})
            AND c.status = 'approved' AND c.deleted_at IS NULL AND u.deleted_at IS NULL

          UNION ALL

          SELECT c.*, u.username, u.display_name, u.avatar_url, ct.level + 1
          FROM comments c
          JOIN users u ON c.user_id = u.id
          JOIN comment_tree ct ON c.parent_id = ct.id
          WHERE c.status = 'approved' AND ct.level < 5 AND c.deleted_at IS NULL AND u.deleted_at IS NULL
        )
        SELECT * FROM comment_tree ORDER BY created_at ASC
      `).bind(...commentIds).all();

      comments = buildCommentTree([...comments, ...(replies as any[])]);
    } else if (!postId) {
      for (const comment of comments) {
        const post = await db.prepare(`
          SELECT p.id, p.title, p.slug, p.cover_image,
                 c.name as category_name, c.slug as category_slug, c.color as category_color
          FROM posts p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.id = ?
        `).bind(comment.post_id).first() as { id: number; title: string; slug: string; cover_image: string | null; category_name: string | null; category_slug: string | null; category_color: string | null } | null;
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

    if (currentUser) {
      const allCommentIds = getAllCommentIds(comments);

      if (allCommentIds.length > 0) {
        const { results: likes } = await db.prepare(`
          SELECT comment_id FROM likes
          WHERE user_id = ? AND comment_id IN (${allCommentIds.map(() => '?').join(',')})
        `).bind(currentUser.userId, ...allCommentIds).all();

        const likedIds = new Set((likes as { comment_id: number }[]).map(l => l.comment_id));
        markLikedComments(comments, likedIds);
      }
    }

    return {
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async createComment(
    db: any,
    env: any,
    userId: number,
    user: any,
    body: CreateCommentRequest,
    ip: string,
    userAgent: string,
    isFeatureEnabled: (env: any, feature: string) => Promise<boolean>,
    getConfigValue: (env: any, key: string, defaultValue: any) => Promise<any>
  ): Promise<CommentResult> {
    const isCommentsEnabled = await isFeatureEnabled(env, 'feature_comments');
    if (!isCommentsEnabled) {
      return {
        success: false,
        message: '评论功能已关闭',
        statusCode: 403
      };
    }

    const maxCommentLength = await getConfigValue(env, 'max_comment_length', COMMENT_CONSTANTS.MAX_COMMENT_LENGTH);
    const commentApprovalRequired = await isFeatureEnabled(env, 'comment_approval_required');

    let { postId, content, parentId, mentionedUserIds } = body;

    if (!postId || !content) {
      return {
        success: false,
        message: 'postId and content are required',
        statusCode: 400
      };
    }

    content = sanitizeCommentContent(content);

    const contentError = validateLength(content, COMMENT_CONSTANTS.MIN_COMMENT_LENGTH, maxCommentLength, 'Comment');
    if (contentError) {
      return {
        success: false,
        message: contentError,
        statusCode: 400
      };
    }

    const post = await db.prepare(
      'SELECT id, status FROM posts WHERE id = ?'
    ).bind(postId).first() as { id: number; status: string } | null;

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    if (post.status === 'archived') {
      return {
        success: false,
        message: '该文章已归档，不允许发表评论',
        statusCode: 403
      };
    }

    if (post.status !== 'published') {
      return {
        success: false,
        message: 'Comments are not allowed on unpublished posts',
        statusCode: 403
      };
    }

    if (parentId) {
      const parent = await db.prepare(
        'SELECT id, post_id FROM comments WHERE id = ? AND deleted_at IS NULL'
      ).bind(parentId).first() as { id: number; post_id: number } | null;

      if (!parent) {
        return {
          success: false,
          message: 'Parent comment not found',
          statusCode: 404
        };
      }

      if (parent.post_id !== postId) {
        return {
          success: false,
          message: 'Parent comment does not belong to this post',
          statusCode: 400
        };
      }
    }

    const result = await db.prepare(`
      INSERT INTO comments (
        post_id, user_id, parent_id, content, status,
        ip_address, user_agent, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      postId,
      userId,
      parentId || null,
      content,
      commentApprovalRequired ? 'pending' : 'approved',
      ip,
      userAgent
    ).run();

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create comment',
        statusCode: 500
      };
    }

    const commentId = result.meta.last_row_id;

    try {
      if (parentId) {
        const parentComment = await db.prepare(
          'SELECT c.user_id, c.content, u.display_name, u.username FROM comments c ' +
          'LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ? AND c.deleted_at IS NULL'
        ).bind(parentId).first() as { user_id: number; content: string; display_name: string | null; username: string } | null;

        if (parentComment && parentComment.user_id !== userId) {
          const isEnabled = await isInteractionSubtypeEnabled(
            db,
            parentComment.user_id,
            'reply'
          );

          if (isEnabled) {
            const postInfo = await db.prepare(
              'SELECT title, slug FROM posts WHERE id = ?'
            ).bind(postId).first() as { title: string; slug: string } | null;

            await createInteractionNotification(db, {
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
                senderId: userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            }, env);
          }
        }
      } else {
        const postInfo = await db.prepare(
          'SELECT author_id, title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as { author_id: number; title: string; slug: string } | null;

        if (postInfo && postInfo.author_id !== userId) {
          const isEnabled = await isInteractionSubtypeEnabled(
            db,
            postInfo.author_id,
            'comment'
          );

          if (isEnabled) {
            await createInteractionNotification(db, {
              userId: postInfo.author_id,
              subtype: 'comment',
              title: `${user.displayName || user.username} 评论了你的文章《${postInfo.title}》`,
              content: content.length > 100 ? content.substring(0, 100) + '...' : content,
              relatedData: {
                postId: postId,
                postTitle: postInfo.title,
                postSlug: postInfo.slug,
                commentId: commentId,
                senderId: userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            }, env);
          }
        }
      }
    } catch (notifyError) {
      console.error('Send comment notification error:', notifyError);
    }

    try {
      let mentions = detectMentions(content);

      if (mentionedUserIds && Array.isArray(mentionedUserIds) && mentionedUserIds.length > 0) {
        const validMentionedUsers = await db.prepare(
          `SELECT id, username, display_name FROM users
           WHERE id IN (${mentionedUserIds.map(() => '?').join(',')})
           AND status = 'active' AND deleted_at IS NULL`
        ).bind(...mentionedUserIds).all() as { results: { id: number; username: string; display_name: string | null }[] };

        if (validMentionedUsers.results && validMentionedUsers.results.length > 0) {
          const userIdsFromClient = new Set(mentionedUserIds);
          const detectedNames = new Set(mentions);

          for (const user of validMentionedUsers.results) {
            if (!detectedNames.has(user.username) && !detectedNames.has(user.display_name || '')) {
              mentions.push(user.display_name || user.username);
            }
          }
        }
      }

      if (mentions.length > 0) {
        const postInfo = await db.prepare(
          'SELECT title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as { title: string; slug: string } | null;

        await createMentionNotifications(
          db,
          mentions,
          userId,
          'comment',
          commentId,
          `/posts/${postInfo?.slug || postId}#comment-${commentId}`,
          env
        );
      }
    } catch (mentionError) {
      console.error('Mention detection error:', mentionError);
    }

    return {
      success: true,
      comment: {
        id: commentId
      },
      message: 'Comment created successfully'
    };
  }

  static async deleteComment(
    db: any,
    userId: number,
    userRole: string,
    commentId: string
  ): Promise<CommentResult> {
    const comment = await db.prepare(
      'SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL'
    ).bind(commentId).first() as CommentRow | null;

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        statusCode: 404
      };
    }

    if (comment.user_id !== userId && userRole !== 'admin') {
      return {
        success: false,
        message: 'You do not have permission to delete this comment',
        statusCode: 403
      };
    }

    await SoftDeleteHelper.softDelete(db, 'comments', commentId);

    return {
      success: true,
      comment: {
        id: commentId,
        postId: comment.post_id
      },
      message: 'Comment deleted successfully'
    };
  }

  static async toggleLike(
    db: any,
    env: any,
    userId: number,
    user: any,
    commentId: number,
    isFeatureEnabled: (env: any, feature: string) => Promise<boolean>
  ): Promise<CommentResult> {
    const isLikeEnabled = await isFeatureEnabled(env, 'feature_like');
    if (!isLikeEnabled) {
      return {
        success: false,
        message: '点赞功能已关闭',
        statusCode: 403
      };
    }

    if (isNaN(commentId)) {
      return {
        success: false,
        message: 'Invalid comment ID',
        statusCode: 400
      };
    }

    const comment = await db.prepare(
      'SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL'
    ).bind(commentId).first();

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        statusCode: 404
      };
    }

    const existing = await db.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND comment_id = ?'
    ).bind(userId, commentId).first();

    let liked = false;

    if (existing) {
      await db.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
      await db.prepare(
        'UPDATE comments SET like_count = like_count - 1 WHERE id = ?'
      ).bind(commentId).run();
      liked = false;
    } else {
      await db.prepare(
        'INSERT INTO likes (user_id, comment_id) VALUES (?, ?)'
      ).bind(userId, commentId).run();
      await db.prepare(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = ?'
      ).bind(commentId).run();
      liked = true;

      try {
        const commentInfo = await db.prepare(
          `SELECT c.user_id, c.content, p.id as post_id, p.title, p.slug
           FROM comments c
           JOIN posts p ON c.post_id = p.id
           WHERE c.id = ? AND c.deleted_at IS NULL`
        ).bind(commentId).first() as { user_id: number; content: string; post_id: number; title: string; slug: string } | null;

        if (commentInfo && commentInfo.user_id !== userId) {
          const isEnabled = await isInteractionSubtypeEnabled(
            db,
            commentInfo.user_id,
            'like'
          );

          if (isEnabled) {
            await createInteractionNotification(db, {
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
                senderId: userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            }, env);
          }
        }
      } catch (notifyError) {
        console.error('Send like notification error:', notifyError);
      }
    }

    return {
      success: true,
      comment: {
        liked
      }
    };
  }
}

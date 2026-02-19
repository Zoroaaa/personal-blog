/**
 * 管理员服务
 *
 * 功能：
 * - 评论管理（审核/删除）
 * - 用户管理（列表、状态、角色、删除）
 * - 系统设置
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import { SoftDeleteHelper } from '../utils/softDeleteHelper';
import { safeParseInt } from '../utils/validation';
import { PAGINATION_CONSTANTS, DATABASE_CONSTANTS, COMMENT_STATUS_CONSTANTS } from '../config/constants';
import type { TotalResult, CommentRow, UserRow } from '../types/database';

export interface AdminCommentListQuery {
  page?: number;
  limit?: number;
  status?: string;
  postId?: string;
  includeDeleted?: boolean;
}

export interface AdminUserListQuery {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  includeDeleted?: boolean;
}

export interface AdminResult {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export class AdminService {
  static async getComments(
    db: any,
    query: AdminCommentListQuery
  ): Promise<AdminResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(PAGINATION_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, query.limit || PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE));
    const status = query.status || 'all';
    const postId = query.postId;
    const includeDeleted = query.includeDeleted || false;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT c.*,
             u.username, u.display_name, u.avatar_url,
             p.title as post_title, p.slug as post_slug
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (!includeDeleted) {
      sql += ' AND c.deleted_at IS NULL AND u.deleted_at IS NULL';
    }

    if (status !== 'all') {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (postId) {
      sql += ' AND c.post_id = ?';
      params.push(postId);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await db.prepare(sql).bind(...params).all();

    let countSql = `
      SELECT COUNT(*) as total FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (!includeDeleted) {
      countSql += ' AND c.deleted_at IS NULL AND u.deleted_at IS NULL';
    }

    if (status !== 'all') {
      countSql += ' AND c.status = ?';
      countParams.push(status);
    }

    if (postId) {
      countSql += ' AND c.post_id = ?';
      countParams.push(postId);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first() as TotalResult | null;
    const total = countResult?.total || 0;

    return {
      success: true,
      data: {
        comments: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  static async updateCommentStatus(
    db: any,
    commentId: string,
    status: string
  ): Promise<AdminResult> {
    if (!COMMENT_STATUS_CONSTANTS.STATUSES.includes(status as any)) {
      return {
        success: false,
        message: `Status must be one of: ${COMMENT_STATUS_CONSTANTS.STATUSES.join(', ')}`,
        statusCode: 400
      };
    }

    const comment = await db.prepare(
      'SELECT id, post_id FROM comments WHERE id = ?'
    ).bind(commentId).first() as { id: number; post_id: number } | null;

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        statusCode: 404
      };
    }

    await db.prepare(
      'UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, commentId).run();

    return {
      success: true,
      data: { updated: true, postId: comment.post_id }
    };
  }

  static async deleteComment(
    db: any,
    commentId: string
  ): Promise<AdminResult> {
    const comment = await db.prepare(
      'SELECT id, post_id FROM comments WHERE id = ?'
    ).bind(commentId).first() as { id: number; post_id: number } | null;

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        statusCode: 404
      };
    }

    await SoftDeleteHelper.softDelete(db, 'comments', commentId);

    return {
      success: true,
      data: { deleted: true, postId: comment.post_id }
    };
  }

  static async getUsers(
    db: any,
    query: AdminUserListQuery
  ): Promise<AdminResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(PAGINATION_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, query.limit || PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE));
    const role = query.role || 'all';
    const status = query.status || 'all';
    const includeDeleted = query.includeDeleted || false;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.*
      FROM users u
      WHERE 1=1
    `;

    const params: any[] = [];

    if (!includeDeleted) {
      sql += ' AND u.deleted_at IS NULL';
    }

    if (role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (status !== 'all') {
      sql += ' AND u.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await db.prepare(sql).bind(...params).all();

    let countSql = `
      SELECT COUNT(*) as total FROM users u
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (!includeDeleted) {
      countSql += ' AND u.deleted_at IS NULL';
    }

    if (role !== 'all') {
      countSql += ' AND u.role = ?';
      countParams.push(role);
    }

    if (status !== 'all') {
      countSql += ' AND u.status = ?';
      countParams.push(status);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first() as TotalResult | null;
    const total = countResult?.total || 0;

    return {
      success: true,
      data: {
        users: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  static async updateUserStatus(
    db: any,
    userId: string,
    status: string,
    currentUserId: number
  ): Promise<AdminResult> {
    if (!DATABASE_CONSTANTS.USER_STATUSES.includes(status as any)) {
      return {
        success: false,
        message: `Status must be one of: ${DATABASE_CONSTANTS.USER_STATUSES.join(', ')}`,
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(userId).first() as { id: number; username: string } | null;

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    if (userId === currentUserId.toString()) {
      return {
        success: false,
        message: 'You cannot change your own account status',
        statusCode: 403
      };
    }

    await db.prepare(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, userId).run();

    return {
      success: true,
      data: { updated: true, username: user.username }
    };
  }

  static async updateUserRole(
    db: any,
    userId: string,
    role: string
  ): Promise<AdminResult> {
    if (!DATABASE_CONSTANTS.ROLES.includes(role as any)) {
      return {
        success: false,
        message: `Role must be one of: ${DATABASE_CONSTANTS.ROLES.join(', ')}`,
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(userId).first() as { id: number; username: string } | null;

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    await db.prepare(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(role, userId).run();

    return {
      success: true,
      data: { updated: true, username: user.username }
    };
  }

  static async deleteUser(
    db: any,
    userId: string,
    currentUserId: number
  ): Promise<AdminResult> {
    const user = await db.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).bind(userId).first() as { id: number; username: string } | null;

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    if (userId === currentUserId.toString()) {
      return {
        success: false,
        message: 'You cannot delete your own account',
        statusCode: 403
      };
    }

    await SoftDeleteHelper.softDelete(db, 'users', userId);

    return {
      success: true,
      data: { deleted: true, username: user.username }
    };
  }

  static async getSettings(env: any): Promise<AdminResult> {
    const settings = {
      siteName: 'Personal Blog',
      environment: env.ENVIRONMENT || 'development',
      apiVersion: '2.0.0',
      features: {
        analytics: true,
        comments: true,
        search: true,
        media: true
      }
    };

    return {
      success: true,
      data: { settings }
    };
  }
}

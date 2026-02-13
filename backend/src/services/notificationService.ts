/**
 * 通知服务层
 *
 * 功能：
 * - 通知的CRUD操作
 * - 通知发送逻辑
 * - 与数据库交互
 * - 免打扰检查
 * 
 * 变更说明：
 * - 移除了 private_message 类型的支持
 * - 移除了 createPrivateMessageNotification 函数
 * - 私信现在是完全独立的系统
 *
 * @author 博客系统
 * @version 2.0.0 - 方案A
 * @created 2026-02-13
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  Notification,
  CreateNotificationRequest,
  NotificationQueryParams,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationType,
  NotificationChannel,
  SendNotificationOptions,
  NotificationRelatedData,
} from '../types/notifications';
import type { Env } from '../types';
import { getNotificationSettings } from './notificationSettingsService';
import { shouldSendNow } from './doNotDisturb';
import { sendNotificationEmail } from '../utils/resend';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function createNotification(
  db: D1Database,
  data: CreateNotificationRequest,
  options: SendNotificationOptions = {},
  env?: Env
): Promise<Notification | null> {
  try {
    const {
      userId,
      type,
      subtype,
      title,
      content,
      relatedData,
    } = data;

    if (type !== 'system' && type !== 'interaction') {
      console.error('Invalid notification type:', type);
      return null;
    }

    const settings = await getNotificationSettings(db, userId);

    const typeSettings = settings[type];
    if (!typeSettings || typeSettings.frequency === 'off') {
      return null;
    }

    const shouldSendEmail = !options.skipEmail &&
      typeSettings.email &&
      shouldSendNow(settings.doNotDisturb, 'email');

    const shouldSendPush = !options.skipPush &&
      typeSettings.push &&
      shouldSendNow(settings.doNotDisturb, 'push');

    const shouldSendInApp = !options.skipInApp && typeSettings.inApp;

    if (!shouldSendInApp && !shouldSendEmail && !shouldSendPush) {
      return null;
    }

    const result = await db.prepare(
      `INSERT INTO notifications (
        user_id, type, subtype, title, content, related_data,
        is_in_app_sent, is_email_sent, is_push_sent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      userId,
      type,
      subtype || null,
      title,
      content || null,
      relatedData ? JSON.stringify(relatedData) : null,
      shouldSendInApp ? 1 : 0,
      shouldSendEmail ? 0 : 0,
      shouldSendPush ? 0 : 0
    ).run();

    if (!result.success) {
      console.error('Failed to create notification:', result.error);
      return null;
    }

    const notificationId = result.meta.last_row_id;
    const notification = await getNotificationById(db, notificationId);

    if (shouldSendEmail && env && notification) {
      try {
        const user = await db.prepare(
          'SELECT display_name, email FROM users WHERE id = ?'
        ).bind(userId).first() as { display_name: string, email: string };
        
        if (user && user.email) {
          const sent = await sendNotificationEmail(env, notification, {
            name: user.display_name || '用户',
            email: user.email
          });
          
          if (sent) {
            await updateChannelStatus(db, notificationId, 'email', true);
          }
        }
      } catch (error) {
        console.error('Failed to send notification email:', error);
      }
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

export async function getNotificationById(
  db: D1Database,
  id: number
): Promise<Notification | null> {
  try {
    const row = await db.prepare(
      `SELECT 
        id, user_id, type, subtype, title, content, related_data,
        is_in_app_sent, is_email_sent, is_push_sent,
        is_read, read_at, deleted_at, created_at
      FROM notifications
      WHERE id = ? AND deleted_at IS NULL`
    ).bind(id).first();

    if (!row) return null;

    return mapNotificationFromRow(row);
  } catch (error) {
    console.error('Get notification by id error:', error);
    return null;
  }
}

export async function getNotifications(
  db: D1Database,
  userId: number,
  params: NotificationQueryParams = {}
): Promise<NotificationListResponse> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = ?', 'deleted_at IS NULL'];
    const bindings: any[] = [userId];

    if (params.type) {
      conditions.push('type = ?');
      bindings.push(params.type);
    }

    if (params.isRead !== undefined) {
      conditions.push('is_read = ?');
      bindings.push(params.isRead ? 1 : 0);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`
    ).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

    const rows = await db.prepare(
      `SELECT 
        id, user_id, type, subtype, title, content, related_data,
        is_in_app_sent, is_email_sent, is_push_sent,
        is_read, read_at, deleted_at, created_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(...bindings, limit, offset).all();

    const notifications = (rows.results || []).map(mapNotificationFromRow);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    return {
      notifications: [],
      pagination: {
        page: params.page || DEFAULT_PAGE,
        limit: params.limit || DEFAULT_LIMIT,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function getUnreadCount(
  db: D1Database,
  userId: number
): Promise<UnreadCountResponse> {
  try {
    const rows = await db.prepare(
      `SELECT 
        type,
        COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL
      GROUP BY type`
    ).bind(userId).all();

    const byType = {
      system: 0,
      interaction: 0,
    };

    let total = 0;
    for (const row of rows.results || []) {
      const type = row.type as NotificationType;
      const count = (row.count as number) || 0;
      if (type in byType) {
        byType[type] = count;
        total += count;
      }
    }

    return { total, byType };
  } catch (error) {
    console.error('Get unread count error:', error);
    return {
      total: 0,
      byType: {
        system: 0,
        interaction: 0,
      },
    };
  }
}

export async function markAsRead(
  db: D1Database,
  notificationId: number,
  userId: number
): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE notifications 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    ).bind(notificationId, userId).run();

    return result.success && (result.meta?.changes || 0) > 0;
  } catch (error) {
    console.error('Mark as read error:', error);
    return false;
  }
}

export async function markAllAsRead(
  db: D1Database,
  userId: number,
  type?: NotificationType
): Promise<number> {
  try {
    let sql = `UPDATE notifications 
               SET is_read = 1, read_at = CURRENT_TIMESTAMP
               WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL`;
    const bindings: any[] = [userId];

    if (type) {
      sql += ' AND type = ?';
      bindings.push(type);
    }

    const result = await db.prepare(sql).bind(...bindings).run();
    return result.meta?.changes || 0;
  } catch (error) {
    console.error('Mark all as read error:', error);
    return 0;
  }
}

export async function deleteNotification(
  db: D1Database,
  notificationId: number,
  userId: number
): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE notifications 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    ).bind(notificationId, userId).run();

    return result.success && (result.meta?.changes || 0) > 0;
  } catch (error) {
    console.error('Delete notification error:', error);
    return false;
  }
}

export async function updateChannelStatus(
  db: D1Database,
  notificationId: number,
  channel: NotificationChannel,
  sent: boolean
): Promise<boolean> {
  try {
    const columnMap = {
      in_app: 'is_in_app_sent',
      email: 'is_email_sent',
      push: 'is_push_sent',
    };

    const column = columnMap[channel];
    if (!column) return false;

    const result = await db.prepare(
      `UPDATE notifications SET ${column} = ? WHERE id = ?`
    ).bind(sent ? 1 : 0, notificationId).run();

    return result.success;
  } catch (error) {
    console.error('Update channel status error:', error);
    return false;
  }
}

export async function cleanupOldNotifications(
  db: D1Database,
  days: number = 90
): Promise<number> {
  try {
    const result = await db.prepare(
      `DELETE FROM notifications 
       WHERE created_at < datetime('now', '-${days} days')`
    ).run();

    return result.meta?.changes || 0;
  } catch (error) {
    console.error('Cleanup old notifications error:', error);
    return 0;
  }
}

function mapNotificationFromRow(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    subtype: row.subtype,
    title: row.title,
    content: row.content,
    relatedData: row.related_data ? JSON.parse(row.related_data) : undefined,
    isInAppSent: row.is_in_app_sent === 1,
    isEmailSent: row.is_email_sent === 1,
    isPushSent: row.is_push_sent === 1,
    isRead: row.is_read === 1,
    readAt: row.read_at,
    isDeleted: row.deleted_at !== null && row.deleted_at !== undefined,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  };
}

export async function createInteractionNotification(
  db: D1Database,
  params: {
    userId: number;
    subtype: 'comment' | 'like' | 'favorite' | 'mention' | 'follow' | 'reply';
    title: string;
    content?: string;
    relatedData: NotificationRelatedData;
  },
  env?: Env
): Promise<Notification | null> {
  return createNotification(db, {
    userId: params.userId,
    type: 'interaction',
    subtype: params.subtype,
    title: params.title,
    content: params.content,
    relatedData: params.relatedData,
  }, {}, env);
}

export async function createSystemNotification(
  db: D1Database,
  params: {
    userId: number;
    subtype: 'maintenance' | 'update' | 'announcement';
    title: string;
    content?: string;
    relatedData?: NotificationRelatedData;
  },
  env?: Env
): Promise<Notification | null> {
  return createNotification(db, {
    userId: params.userId,
    type: 'system',
    subtype: params.subtype,
    title: params.title,
    content: params.content,
    relatedData: params.relatedData,
  }, {}, env);
}

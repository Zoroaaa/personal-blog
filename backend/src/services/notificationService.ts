/**
 * 通知服务层
 *
 * 功能：
 * - 通知的CRUD操作
 * - 通知发送逻辑
 * - 与数据库交互
 * - 免打扰检查
 * - 邮件汇总功能
 * 
 * 变更说明：
 * - 移除了 push 相关功能
 * - 移除了 private_message 类型的支持
 * - 添加了邮件汇总入队逻辑
 * - 私信现在是完全独立的系统
 *
 * @author 博客系统
 * @version 2.1.0
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
  NotificationFrequency,
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

    const frequency = typeSettings.frequency;
    const shouldSendEmailNow = !options.skipEmail &&
      typeSettings.email &&
      shouldSendNow(settings.doNotDisturb, 'email');

    const shouldSendInApp = !options.skipInApp && typeSettings.inApp;

    if (!shouldSendInApp && !shouldSendEmailNow && frequency === 'realtime') {
      return null;
    }

    const result = await db.prepare(
      `INSERT INTO notifications (
        user_id, type, subtype, title, content, related_data,
        is_in_app_sent, is_email_sent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      userId,
      type,
      subtype || null,
      title,
      content || null,
      relatedData ? JSON.stringify(relatedData) : null,
      shouldSendInApp ? 1 : 0,
      0
    ).run();

    if (!result.success) {
      console.error('Failed to create notification:', result.error);
      return null;
    }

    const notificationId = result.meta.last_row_id;
    const notification = await getNotificationById(db, notificationId);

    if (!notification) {
      return null;
    }

    if (frequency === 'realtime' && shouldSendEmailNow && env) {
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
    } else if (frequency === 'daily' || frequency === 'weekly') {
      await queueNotificationForDigest(db, notificationId, userId, frequency, settings);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

async function queueNotificationForDigest(
  db: D1Database,
  notificationId: number,
  userId: number,
  frequency: NotificationFrequency,
  settings: any
): Promise<void> {
  try {
    const digestTime = settings.digestTime;
    const now = new Date();
    
    let scheduledAt: Date;
    
    if (frequency === 'daily') {
      const [hours, minutes] = digestTime.daily.split(':').map(Number);
      scheduledAt = new Date(now);
      scheduledAt.setHours(hours, minutes, 0, 0);
      
      if (scheduledAt <= now) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }
    } else {
      const targetDay = digestTime.weeklyDay;
      const [hours, minutes] = digestTime.weeklyTime.split(':').map(Number);
      scheduledAt = new Date(now);
      scheduledAt.setHours(hours, minutes, 0, 0);
      
      const currentDay = scheduledAt.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
      }
      if (daysUntilTarget === 0 && scheduledAt <= now) {
        daysUntilTarget = 7;
      }
      scheduledAt.setDate(scheduledAt.getDate() + daysUntilTarget);
    }

    await db.prepare(
      `INSERT INTO email_digest_queue (
        user_id, notification_id, digest_type, scheduled_at, is_sent, created_at
      ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
    ).bind(
      userId,
      notificationId,
      frequency,
      scheduledAt.toISOString()
    ).run();
  } catch (error) {
    console.error('Failed to queue notification for digest:', error);
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
        is_in_app_sent, is_email_sent,
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

    const typeFilter = params.type;
    const isReadFilter = params.isRead;

    const systemConditions: string[] = [
      "sn.user_id = 0",
      "sn.type = 'system'",
      "sn.is_active = 1",
      "sn.deleted_at IS NULL"
    ];
    const systemBindings: any[] = [];

    const interactionConditions: string[] = [
      "inot.user_id = ?",
      "inot.deleted_at IS NULL"
    ];
    const interactionBindings: any[] = [userId];

    if (typeFilter) {
      systemConditions.push("sn.type = ?");
      systemBindings.push(typeFilter);
      interactionConditions.push("inot.type = ?");
      interactionBindings.push(typeFilter);
    }

    if (isReadFilter !== undefined) {
      if (isReadFilter) {
        systemConditions.push("COALESCE(nr.is_read, 0) = 1");
      } else {
        systemConditions.push("COALESCE(nr.is_read, 0) = 0");
      }
      interactionConditions.push("inot.is_read = ?");
      interactionBindings.push(isReadFilter ? 1 : 0);
    }

    const systemWhere = systemConditions.join(" AND ");
    const interactionWhere = interactionConditions.join(" AND ");

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT sn.id
        FROM notifications sn
        LEFT JOIN notification_reads nr ON sn.id = nr.notification_id AND nr.user_id = ?
        WHERE ${systemWhere}
        UNION ALL
        SELECT inot.id
        FROM notifications inot
        WHERE ${interactionWhere}
      )
    `;

    const countResult = await db.prepare(countQuery)
      .bind(userId, ...systemBindings, ...interactionBindings)
      .first();

    const total = (countResult?.total as number) || 0;

    const dataQuery = `
      SELECT * FROM (
        SELECT 
          sn.id,
          sn.user_id,
          sn.type,
          sn.subtype,
          sn.title,
          sn.content,
          sn.related_data,
          sn.is_in_app_sent,
          sn.is_email_sent,
          COALESCE(nr.is_read, 0) as is_read,
          nr.read_at,
          sn.deleted_at,
          sn.created_at
        FROM notifications sn
        LEFT JOIN notification_reads nr ON sn.id = nr.notification_id AND nr.user_id = ?
        WHERE ${systemWhere}
        UNION ALL
        SELECT 
          inot.id,
          inot.user_id,
          inot.type,
          inot.subtype,
          inot.title,
          inot.content,
          inot.related_data,
          inot.is_in_app_sent,
          inot.is_email_sent,
          inot.is_read,
          inot.read_at,
          inot.deleted_at,
          inot.created_at
        FROM notifications inot
        WHERE ${interactionWhere}
      )
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await db.prepare(dataQuery)
      .bind(userId, ...systemBindings, ...interactionBindings, limit, offset)
      .all();

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
    const systemUnreadQuery = `
      SELECT 
        sn.type,
        COUNT(*) as count
      FROM notifications sn
      LEFT JOIN notification_reads nr ON sn.id = nr.notification_id AND nr.user_id = ?
      WHERE sn.user_id = 0 
        AND sn.type = 'system'
        AND sn.is_active = 1
        AND sn.deleted_at IS NULL
        AND COALESCE(nr.is_read, 0) = 0
      GROUP BY sn.type
    `;

    const systemRows = await db.prepare(systemUnreadQuery).bind(userId).all();

    const interactionUnreadQuery = `
      SELECT 
        type,
        COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL
      GROUP BY type
    `;

    const interactionRows = await db.prepare(interactionUnreadQuery).bind(userId).all();

    const byType = {
      system: 0,
      interaction: 0,
    };

    let total = 0;

    for (const row of systemRows.results || []) {
      const type = row.type as NotificationType;
      const count = (row.count as number) || 0;
      if (type in byType) {
        byType[type] += count;
        total += count;
      }
    }

    for (const row of interactionRows.results || []) {
      const type = row.type as NotificationType;
      const count = (row.count as number) || 0;
      if (type in byType) {
        byType[type] += count;
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
    const notification = await db.prepare(
      'SELECT id, user_id, type FROM notifications WHERE id = ? AND deleted_at IS NULL'
    ).bind(notificationId).first() as any;

    if (!notification) {
      return false;
    }

    if (notification.user_id === 0 && notification.type === 'system') {
      const existing = await db.prepare(
        'SELECT id FROM notification_reads WHERE notification_id = ? AND user_id = ?'
      ).bind(notificationId, userId).first();

      if (existing) {
        await db.prepare(
          'UPDATE notification_reads SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE notification_id = ? AND user_id = ?'
        ).bind(notificationId, userId).run();
      } else {
        await db.prepare(
          'INSERT INTO notification_reads (notification_id, user_id, is_read, read_at, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
        ).bind(notificationId, userId).run();
      }
      return true;
    }

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
    let markedCount = 0;

    if (!type || type === 'system') {
      const systemNotifications = await db.prepare(
        `SELECT sn.id 
         FROM notifications sn
         LEFT JOIN notification_reads nr ON sn.id = nr.notification_id AND nr.user_id = ?
         WHERE sn.user_id = 0 
           AND sn.type = 'system'
           AND sn.is_active = 1
           AND sn.deleted_at IS NULL
           AND COALESCE(nr.is_read, 0) = 0`
      ).bind(userId).all();

      for (const row of systemNotifications.results || []) {
        const notificationId = (row as any).id;
        const existing = await db.prepare(
          'SELECT id FROM notification_reads WHERE notification_id = ? AND user_id = ?'
        ).bind(notificationId, userId).first();

        if (existing) {
          await db.prepare(
            'UPDATE notification_reads SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE notification_id = ? AND user_id = ?'
          ).bind(notificationId, userId).run();
        } else {
          await db.prepare(
            'INSERT INTO notification_reads (notification_id, user_id, is_read, read_at, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
          ).bind(notificationId, userId).run();
        }
        markedCount++;
      }
    }

    if (!type || type === 'interaction') {
      let sql = `UPDATE notifications 
                 SET is_read = 1, read_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL`;
      const bindings: any[] = [userId];

      if (type) {
        sql += ' AND type = ?';
        bindings.push(type);
      }

      const result = await db.prepare(sql).bind(...bindings).run();
      markedCount += result.meta?.changes || 0;
    }

    return markedCount;
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
    const notification = await db.prepare(
      'SELECT id, user_id, type FROM notifications WHERE id = ? AND deleted_at IS NULL'
    ).bind(notificationId).first() as any;

    if (!notification) {
      return false;
    }

    if (notification.user_id === 0 && notification.type === 'system') {
      const existing = await db.prepare(
        'SELECT id FROM notification_reads WHERE notification_id = ? AND user_id = ?'
      ).bind(notificationId, userId).first();

      if (existing) {
        await db.prepare(
          'UPDATE notification_reads SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE notification_id = ? AND user_id = ?'
        ).bind(notificationId, userId).run();
      } else {
        await db.prepare(
          'INSERT INTO notification_reads (notification_id, user_id, is_read, read_at, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
        ).bind(notificationId, userId).run();
      }
      return true;
    }

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
    subtype: 'comment' | 'like' | 'favorite' | 'mention' | 'reply';
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

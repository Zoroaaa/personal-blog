/**
 * 邮件汇总发送服务
 * 
 * 功能：
 * - 处理每日汇总邮件发送
 * - 处理每周汇总邮件发送
 * - 批量发送通知汇总
 * 
 * @author 博客系统
 * @version 2.1.0
 * @created 2026-02-15
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '../types';
import type { Notification, DigestType } from '../types/notifications';
import { sendDigestEmail } from '../utils/resend';

interface DigestQueueItem {
  id: number;
  userId: number;
  notificationId: number;
  digestType: DigestType;
  scheduledAt: string;
  isSent: boolean;
}

interface NotificationForDigest {
  id: number;
  title: string;
  content: string | null;
  type: string;
  subtype: string | null;
  created_at: string;
}

export async function processDigestQueue(
  db: D1Database,
  env: Env,
  digestType: DigestType
): Promise<{ processed: number; failed: number }> {
  try {
    const now = new Date().toISOString();
    
    const pendingItems = await db.prepare(`
      SELECT 
        eq.id, eq.user_id, eq.notification_id, eq.digest_type, eq.scheduled_at, eq.is_sent,
        n.title, n.content, n.type, n.subtype, n.created_at
      FROM email_digest_queue eq
      JOIN notifications n ON eq.notification_id = n.id
      WHERE eq.digest_type = ? 
        AND eq.is_sent = 0 
        AND eq.scheduled_at <= ?
        AND n.deleted_at IS NULL
      ORDER BY eq.user_id, n.created_at DESC
    `).bind(digestType, now).all() as any;

    if (!pendingItems.results || pendingItems.results.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const userGroups = new Map<number, NotificationForDigest[]>();
    const queueItemMap = new Map<number, number[]>();

    for (const item of pendingItems.results) {
      const userId = item.user_id;
      
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
        queueItemMap.set(userId, []);
      }

      userGroups.get(userId)!.push({
        id: item.notification_id,
        title: item.title,
        content: item.content,
        type: item.type,
        subtype: item.subtype,
        created_at: item.created_at,
      });

      queueItemMap.get(userId)!.push(item.id);
    }

    let processed = 0;
    let failed = 0;

    for (const [userId, notifications] of userGroups) {
      try {
        const user = await db.prepare(
          'SELECT display_name, email FROM users WHERE id = ?'
        ).bind(userId).first() as { display_name: string; email: string } | null;

        if (!user || !user.email) {
          failed += notifications.length;
          continue;
        }

        const sent = await sendDigestEmail(
          env,
          {
            name: user.display_name || '用户',
            email: user.email,
          },
          notifications,
          digestType
        );

        if (sent) {
          const queueIds = queueItemMap.get(userId)!;
          const placeholders = queueIds.map(() => '?').join(',');
          await db.prepare(
            `UPDATE email_digest_queue SET is_sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`
          ).bind(...queueIds).run();

          const notificationIds = notifications.map(n => n.id);
          const notifPlaceholders = notificationIds.map(() => '?').join(',');
          await db.prepare(
            `UPDATE notifications SET is_email_sent = 1 WHERE id IN (${notifPlaceholders})`
          ).bind(...notificationIds).run();

          processed += notifications.length;
        } else {
          failed += notifications.length;
        }
      } catch (error) {
        console.error(`Failed to send digest to user ${userId}:`, error);
        failed += notifications.length;
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error('Process digest queue error:', error);
    return { processed: 0, failed: 0 };
  }
}

export async function cleanupSentDigestItems(
  db: D1Database,
  daysToKeep: number = 30
): Promise<number> {
  try {
    const result = await db.prepare(
      `DELETE FROM email_digest_queue 
       WHERE is_sent = 1 
       AND sent_at < datetime('now', '-${daysToKeep} days')`
    ).run();

    return result.meta?.changes || 0;
  } catch (error) {
    console.error('Cleanup sent digest items error:', error);
    return 0;
  }
}

export async function getDigestStats(
  db: D1Database
): Promise<{
  daily: { pending: number; sent: number };
  weekly: { pending: number; sent: number };
}> {
  try {
    const dailyPending = await db.prepare(
      `SELECT COUNT(*) as count FROM email_digest_queue WHERE digest_type = 'daily' AND is_sent = 0`
    ).first() as any;

    const dailySent = await db.prepare(
      `SELECT COUNT(*) as count FROM email_digest_queue WHERE digest_type = 'daily' AND is_sent = 1`
    ).first() as any;

    const weeklyPending = await db.prepare(
      `SELECT COUNT(*) as count FROM email_digest_queue WHERE digest_type = 'weekly' AND is_sent = 0`
    ).first() as any;

    const weeklySent = await db.prepare(
      `SELECT COUNT(*) as count FROM email_digest_queue WHERE digest_type = 'weekly' AND is_sent = 1`
    ).first() as any;

    return {
      daily: {
        pending: dailyPending?.count || 0,
        sent: dailySent?.count || 0,
      },
      weekly: {
        pending: weeklyPending?.count || 0,
        sent: weeklySent?.count || 0,
      },
    };
  } catch (error) {
    console.error('Get digest stats error:', error);
    return {
      daily: { pending: 0, sent: 0 },
      weekly: { pending: 0, sent: 0 },
    };
  }
}

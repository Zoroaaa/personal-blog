/**
 * 私信设置服务层
 *
 * 功能：
 * - 获取用户私信设置（从数据库读取）
 * - 更新用户私信设置（持久化存储）
 * - 初始化新用户默认设置
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface MessageSettings {
  id?: number;
  userId: number;
  emailNotification: boolean;
  respectDnd: boolean;
  allowStrangers: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateMessageSettingsRequest {
  emailNotification?: boolean;
  respectDnd?: boolean;
  allowStrangers?: boolean;
}

const DEFAULT_MESSAGE_SETTINGS: Omit<MessageSettings, 'userId'> = {
  emailNotification: false,
  respectDnd: true,
  allowStrangers: true,
};

export async function getMessageSettings(
  db: D1Database,
  userId: number
): Promise<MessageSettings> {
  try {
    const row = await db.prepare(`
      SELECT * FROM message_settings WHERE user_id = ?
    `).bind(userId).first();

    if (!row) {
      await initializeMessageSettings(db, userId);
      return { ...DEFAULT_MESSAGE_SETTINGS, userId };
    }

    return mapSettingsFromRow(row, userId);
  } catch (error) {
    console.error('Get message settings error:', error);
    return { ...DEFAULT_MESSAGE_SETTINGS, userId };
  }
}

export async function updateMessageSettings(
  db: D1Database,
  userId: number,
  updates: UpdateMessageSettingsRequest
): Promise<MessageSettings | null> {
  try {
    const current = await getMessageSettings(db, userId);

    const newSettings = { ...current, ...updates };

    const result = await db.prepare(`
      UPDATE message_settings
      SET
        email_notification = ?,
        respect_dnd = ?,
        allow_strangers = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(
      newSettings.emailNotification ? 1 : 0,
      newSettings.respectDnd ? 1 : 0,
      newSettings.allowStrangers ? 1 : 0,
      userId
    ).run();

    if (!result.success) {
      console.error('Failed to update message settings');
      return null;
    }

    return newSettings;
  } catch (error) {
    console.error('Update message settings error:', error);
    return null;
  }
}

export async function initializeMessageSettings(
  db: D1Database,
  userId: number
): Promise<boolean> {
  try {
    const result = await db.prepare(`
      INSERT INTO message_settings (user_id, email_notification, respect_dnd, allow_strangers)
      VALUES (?, ?, ?, ?)
    `).bind(
      userId,
      DEFAULT_MESSAGE_SETTINGS.emailNotification ? 1 : 0,
      DEFAULT_MESSAGE_SETTINGS.respectDnd ? 1 : 0,
      DEFAULT_MESSAGE_SETTINGS.allowStrangers ? 1 : 0
    ).run();

    return result.success;
  } catch (error) {
    console.error('Initialize message settings error:', error);
    return false;
  }
}

export async function isEmailNotificationEnabled(
  db: D1Database,
  userId: number
): Promise<boolean> {
  const settings = await getMessageSettings(db, userId);
  return settings.emailNotification;
}

export async function isStrangerMessageAllowed(
  db: D1Database,
  userId: number
): Promise<boolean> {
  const settings = await getMessageSettings(db, userId);
  return settings.allowStrangers;
}

export async function shouldRespectDnd(
  db: D1Database,
  userId: number
): Promise<boolean> {
  const settings = await getMessageSettings(db, userId);
  return settings.respectDnd;
}

function mapSettingsFromRow(row: any, userId: number): MessageSettings {
  return {
    id: row.id,
    userId,
    emailNotification: row.email_notification === 1,
    respectDnd: row.respect_dnd === 1,
    allowStrangers: row.allow_strangers === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 通知设置服务层
 *
 * 功能：
 * - 获取用户通知设置（从数据库读取）
 * - 更新用户通知设置（持久化存储）
 * - 检查通知类型是否启用
 * - 初始化新用户默认设置
 * 
 * 变更说明：
 * - 移除了 privateMessage 字段
 * - 移除了 follow 子类型
 * - 移除了 push 相关配置
 * - 私信设置现在是独立的系统
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2026-02-13
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  NotificationTypeSettings,
  InteractionSubtypes,
  DoNotDisturbSettings,
  DigestTimeSettings,
} from '../types/notifications';

const DEFAULT_TYPE_SETTINGS: NotificationTypeSettings = {
  inApp: true,
  email: true,
  frequency: 'realtime',
};

const DEFAULT_INTERACTION_SUBTYPES: InteractionSubtypes = {
  comment: true,
  like: true,
  favorite: true,
  mention: true,
  reply: true,
};

const DEFAULT_DND_SETTINGS: DoNotDisturbSettings = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'Asia/Shanghai',
};

const DEFAULT_DIGEST_TIME: DigestTimeSettings = {
  daily: '08:00',
  weeklyDay: 1,
  weeklyTime: '09:00',
};

export async function getNotificationSettings(
  db: D1Database,
  userId: number
): Promise<NotificationSettings> {
  try {
    const row = await db.prepare(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `).bind(userId).first();

    if (!row) {
      await initializeSettings(db, userId);
      return getDefaultSettings(userId);
    }

    return mapSettingsFromRow(row, userId);
  } catch (error) {
    console.error('Get notification settings error:', error);
    return getDefaultSettings(userId);
  }
}

export async function updateNotificationSettings(
  db: D1Database,
  userId: number,
  updates: UpdateNotificationSettingsRequest
): Promise<NotificationSettings | null> {
  try {
    const current = await getNotificationSettings(db, userId);

    const newSettings = mergeSettings(current, updates);

    const result = await db.prepare(`
      UPDATE notification_settings
      SET
        system_in_app = ?,
        system_email = ?,
        system_frequency = ?,
        interaction_in_app = ?,
        interaction_email = ?,
        interaction_frequency = ?,
        interaction_comment = ?,
        interaction_like = ?,
        interaction_favorite = ?,
        interaction_mention = ?,
        interaction_reply = ?,
        dnd_enabled = ?,
        dnd_start = ?,
        dnd_end = ?,
        dnd_timezone = ?,
        digest_daily_time = ?,
        digest_weekly_day = ?,
        digest_weekly_time = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(
      newSettings.system.inApp ? 1 : 0,
      newSettings.system.email ? 1 : 0,
      newSettings.system.frequency,
      newSettings.interaction.inApp ? 1 : 0,
      newSettings.interaction.email ? 1 : 0,
      newSettings.interaction.frequency,
      newSettings.interaction.subtypes.comment ? 1 : 0,
      newSettings.interaction.subtypes.like ? 1 : 0,
      newSettings.interaction.subtypes.favorite ? 1 : 0,
      newSettings.interaction.subtypes.mention ? 1 : 0,
      newSettings.interaction.subtypes.reply ? 1 : 0,
      newSettings.doNotDisturb.enabled ? 1 : 0,
      newSettings.doNotDisturb.start,
      newSettings.doNotDisturb.end,
      newSettings.doNotDisturb.timezone,
      newSettings.digestTime.daily,
      newSettings.digestTime.weeklyDay,
      newSettings.digestTime.weeklyTime,
      userId
    ).run();

    if (!result.success) {
      console.error('Failed to update notification settings');
      return null;
    }

    return newSettings;
  } catch (error) {
    console.error('Update notification settings error:', error);
    return null;
  }
}

export async function initializeSettings(
  db: D1Database,
  userId: number
): Promise<boolean> {
  try {
    const defaultSettings = getDefaultSettings(userId);

    const result = await db.prepare(`
      INSERT INTO notification_settings (
        user_id,
        system_in_app, system_email, system_frequency,
        interaction_in_app, interaction_email, interaction_frequency,
        interaction_comment, interaction_like, interaction_favorite,
        interaction_mention, interaction_reply,
        dnd_enabled, dnd_start, dnd_end, dnd_timezone,
        digest_daily_time, digest_weekly_day, digest_weekly_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      defaultSettings.system.inApp ? 1 : 0,
      defaultSettings.system.email ? 1 : 0,
      defaultSettings.system.frequency,
      defaultSettings.interaction.inApp ? 1 : 0,
      defaultSettings.interaction.email ? 1 : 0,
      defaultSettings.interaction.frequency,
      defaultSettings.interaction.subtypes.comment ? 1 : 0,
      defaultSettings.interaction.subtypes.like ? 1 : 0,
      defaultSettings.interaction.subtypes.favorite ? 1 : 0,
      defaultSettings.interaction.subtypes.mention ? 1 : 0,
      defaultSettings.interaction.subtypes.reply ? 1 : 0,
      defaultSettings.doNotDisturb.enabled ? 1 : 0,
      defaultSettings.doNotDisturb.start,
      defaultSettings.doNotDisturb.end,
      defaultSettings.doNotDisturb.timezone,
      defaultSettings.digestTime.daily,
      defaultSettings.digestTime.weeklyDay,
      defaultSettings.digestTime.weeklyTime
    ).run();

    return result.success;
  } catch (error) {
    console.error('Initialize notification settings error:', error);
    return false;
  }
}

export async function isNotificationEnabled(
  db: D1Database,
  userId: number,
  type: 'system' | 'interaction'
): Promise<boolean> {
  const settings = await getNotificationSettings(db, userId);
  const typeSettings = settings[type];
  return typeSettings.frequency !== 'off';
}

export async function isInteractionSubtypeEnabled(
  db: D1Database,
  userId: number,
  subtype: keyof InteractionSubtypes
): Promise<boolean> {
  const settings = await getNotificationSettings(db, userId);
  
  if (settings.interaction.frequency === 'off') {
    return false;
  }
  
  return settings.interaction.subtypes[subtype] === true;
}

function mapSettingsFromRow(row: any, userId: number): NotificationSettings {
  return {
    id: row.id,
    userId,
    system: {
      inApp: row.system_in_app === 1,
      email: row.system_email === 1,
      frequency: row.system_frequency,
    },
    interaction: {
      inApp: row.interaction_in_app === 1,
      email: row.interaction_email === 1,
      frequency: row.interaction_frequency,
      subtypes: {
        comment: row.interaction_comment === 1,
        like: row.interaction_like === 1,
        favorite: row.interaction_favorite === 1,
        mention: row.interaction_mention === 1,
        reply: row.interaction_reply === 1,
      },
    },
    doNotDisturb: {
      enabled: row.dnd_enabled === 1,
      start: row.dnd_start,
      end: row.dnd_end,
      timezone: row.dnd_timezone,
    },
    digestTime: {
      daily: row.digest_daily_time,
      weeklyDay: row.digest_weekly_day,
      weeklyTime: row.digest_weekly_time,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getDefaultSettings(userId: number): NotificationSettings {
  return {
    userId,
    system: { ...DEFAULT_TYPE_SETTINGS },
    interaction: {
      ...DEFAULT_TYPE_SETTINGS,
      subtypes: { ...DEFAULT_INTERACTION_SUBTYPES },
    },
    doNotDisturb: { ...DEFAULT_DND_SETTINGS },
    digestTime: { ...DEFAULT_DIGEST_TIME },
  };
}

function mergeSettings(
  current: NotificationSettings,
  updates: UpdateNotificationSettingsRequest
): NotificationSettings {
  return {
    ...current,
    system: updates.system
      ? { ...current.system, ...updates.system }
      : current.system,
    interaction: updates.interaction
      ? {
          ...current.interaction,
          ...updates.interaction,
          subtypes: updates.interaction.subtypes
            ? { ...current.interaction.subtypes, ...updates.interaction.subtypes }
            : current.interaction.subtypes,
        }
      : current.interaction,
    doNotDisturb: updates.doNotDisturb
      ? { ...current.doNotDisturb, ...updates.doNotDisturb }
      : current.doNotDisturb,
    digestTime: updates.digestTime
      ? { ...current.digestTime, ...updates.digestTime }
      : current.digestTime,
  };
}

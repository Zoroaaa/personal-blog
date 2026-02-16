/**
 * 通知设置服务层（修复版）
 *
 * 功能：
 * - 获取用户通知设置（从数据库读取）
 * - 更新用户通知设置（持久化存储）
 * - 检查通知类型是否启用
 * - 初始化新用户默认设置
 *
 * @author 博客系统
 * @version 2.0.0 - 修复版
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

// ============= 默认设置 =============

const DEFAULT_TYPE_SETTINGS: NotificationTypeSettings = {
  inApp: true,
  email: true,
  push: true,
  frequency: 'realtime',
};

const DEFAULT_INTERACTION_SUBTYPES: InteractionSubtypes = {
  comment: true,
  like: true,
  favorite: true,
  mention: true,
  follow: true,
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

// ============= 主要功能 =============

/**
 * 获取用户通知设置（从数据库读取）
 */
export async function getNotificationSettings(
  db: D1Database,
  userId: number
): Promise<NotificationSettings> {
  try {
    const row = await db.prepare(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `).bind(userId).first();

    if (!row) {
      // 用户没有设置记录，创建默认设置
      await initializeSettings(db, userId);
      return getDefaultSettings(userId);
    }

    return mapSettingsFromRow(row, userId);
  } catch (error) {
    console.error('Get notification settings error:', error);
    // 发生错误时返回默认设置
    return getDefaultSettings(userId);
  }
}

/**
 * 更新用户通知设置（持久化到数据库）
 */
export async function updateNotificationSettings(
  db: D1Database,
  userId: number,
  updates: UpdateNotificationSettingsRequest
): Promise<NotificationSettings | null> {
  try {
    // 获取当前设置
    const current = await getNotificationSettings(db, userId);

    // 合并更新
    const newSettings = mergeSettings(current, updates);

    // 保存到数据库
    const result = await db.prepare(`
      UPDATE notification_settings
      SET
        system_in_app = ?,
        system_email = ?,
        system_push = ?,
        system_frequency = ?,
        interaction_in_app = ?,
        interaction_email = ?,
        interaction_push = ?,
        interaction_frequency = ?,
        interaction_comment = ?,
        interaction_like = ?,
        interaction_favorite = ?,
        interaction_mention = ?,
        interaction_follow = ?,
        interaction_reply = ?,
        private_message_in_app = ?,
        private_message_email = ?,
        private_message_push = ?,
        private_message_frequency = ?,
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
      // system
      newSettings.system.inApp ? 1 : 0,
      newSettings.system.email ? 1 : 0,
      newSettings.system.push ? 1 : 0,
      newSettings.system.frequency,
      // interaction
      newSettings.interaction.inApp ? 1 : 0,
      newSettings.interaction.email ? 1 : 0,
      newSettings.interaction.push ? 1 : 0,
      newSettings.interaction.frequency,
      // interaction subtypes
      newSettings.interaction.subtypes.comment ? 1 : 0,
      newSettings.interaction.subtypes.like ? 1 : 0,
      newSettings.interaction.subtypes.favorite ? 1 : 0,
      newSettings.interaction.subtypes.mention ? 1 : 0,
      newSettings.interaction.subtypes.follow ? 1 : 0,
      newSettings.interaction.subtypes.reply ? 1 : 0,
      // private_message
      newSettings.privateMessage.inApp ? 1 : 0,
      newSettings.privateMessage.email ? 1 : 0,
      newSettings.privateMessage.push ? 1 : 0,
      newSettings.privateMessage.frequency,
      // dnd
      newSettings.doNotDisturb.enabled ? 1 : 0,
      newSettings.doNotDisturb.start,
      newSettings.doNotDisturb.end,
      newSettings.doNotDisturb.timezone,
      // digest
      newSettings.digestTime.daily,
      newSettings.digestTime.weeklyDay,
      newSettings.digestTime.weeklyTime,
      // where
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

/**
 * 初始化新用户的默认通知设置
 */
export async function initializeSettings(
  db: D1Database,
  userId: number
): Promise<boolean> {
  try {
    const defaultSettings = getDefaultSettings(userId);

    const result = await db.prepare(`
      INSERT INTO notification_settings (
        user_id,
        system_in_app, system_email, system_push, system_frequency,
        interaction_in_app, interaction_email, interaction_push, interaction_frequency,
        interaction_comment, interaction_like, interaction_favorite,
        interaction_mention, interaction_follow, interaction_reply,
        private_message_in_app, private_message_email, private_message_push, private_message_frequency,
        dnd_enabled, dnd_start, dnd_end, dnd_timezone,
        digest_daily_time, digest_weekly_day, digest_weekly_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      // system
      defaultSettings.system.inApp ? 1 : 0,
      defaultSettings.system.email ? 1 : 0,
      defaultSettings.system.push ? 1 : 0,
      defaultSettings.system.frequency,
      // interaction
      defaultSettings.interaction.inApp ? 1 : 0,
      defaultSettings.interaction.email ? 1 : 0,
      defaultSettings.interaction.push ? 1 : 0,
      defaultSettings.interaction.frequency,
      // interaction subtypes
      defaultSettings.interaction.subtypes.comment ? 1 : 0,
      defaultSettings.interaction.subtypes.like ? 1 : 0,
      defaultSettings.interaction.subtypes.favorite ? 1 : 0,
      defaultSettings.interaction.subtypes.mention ? 1 : 0,
      defaultSettings.interaction.subtypes.follow ? 1 : 0,
      defaultSettings.interaction.subtypes.reply ? 1 : 0,
      // private_message
      defaultSettings.privateMessage.inApp ? 1 : 0,
      defaultSettings.privateMessage.email ? 1 : 0,
      defaultSettings.privateMessage.push ? 1 : 0,
      defaultSettings.privateMessage.frequency,
      // dnd
      defaultSettings.doNotDisturb.enabled ? 1 : 0,
      defaultSettings.doNotDisturb.start,
      defaultSettings.doNotDisturb.end,
      defaultSettings.doNotDisturb.timezone,
      // digest
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

/**
 * 检查通知类型是否启用
 */
export async function isNotificationEnabled(
  db: D1Database,
  userId: number,
  type: 'system' | 'interaction' | 'private_message'
): Promise<boolean> {
  const settings = await getNotificationSettings(db, userId);
  const typeSettings = settings[type === 'private_message' ? 'privateMessage' : type];
  return typeSettings.frequency !== 'off';
}

/**
 * 检查互动通知子类型是否启用
 */
export async function isInteractionSubtypeEnabled(
  db: D1Database,
  userId: number,
  subtype: keyof InteractionSubtypes
): Promise<boolean> {
  const settings = await getNotificationSettings(db, userId);
  
  // 首先检查互动通知是否完全关闭
  if (settings.interaction.frequency === 'off') {
    return false;
  }
  
  // 然后检查具体子类型
  return settings.interaction.subtypes[subtype] === true;
}

// ============= 辅助函数 =============

/**
 * 从数据库行映射为设置对象
 */
function mapSettingsFromRow(row: any, userId: number): NotificationSettings {
  return {
    id: row.id,
    userId,
    system: {
      inApp: row.system_in_app === 1,
      email: row.system_email === 1,
      push: row.system_push === 1,
      frequency: row.system_frequency,
    },
    interaction: {
      inApp: row.interaction_in_app === 1,
      email: row.interaction_email === 1,
      push: row.interaction_push === 1,
      frequency: row.interaction_frequency,
      subtypes: {
        comment: row.interaction_comment === 1,
        like: row.interaction_like === 1,
        favorite: row.interaction_favorite === 1,
        mention: row.interaction_mention === 1,
        follow: row.interaction_follow === 1,
        reply: row.interaction_reply === 1,
      },
    },
    privateMessage: {
      inApp: row.private_message_in_app === 1,
      email: row.private_message_email === 1,
      push: row.private_message_push === 1,
      frequency: row.private_message_frequency,
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

/**
 * 获取默认设置
 */
function getDefaultSettings(userId: number): NotificationSettings {
  return {
    userId,
    system: { ...DEFAULT_TYPE_SETTINGS },
    interaction: {
      ...DEFAULT_TYPE_SETTINGS,
      subtypes: { ...DEFAULT_INTERACTION_SUBTYPES },
    },
    privateMessage: { ...DEFAULT_TYPE_SETTINGS },
    doNotDisturb: { ...DEFAULT_DND_SETTINGS },
    digestTime: { ...DEFAULT_DIGEST_TIME },
  };
}

/**
 * 合并设置更新
 */
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
    privateMessage: updates.privateMessage
      ? { ...current.privateMessage, ...updates.privateMessage }
      : current.privateMessage,
    doNotDisturb: updates.doNotDisturb
      ? { ...current.doNotDisturb, ...updates.doNotDisturb }
      : current.doNotDisturb,
    digestTime: updates.digestTime
      ? { ...current.digestTime, ...updates.digestTime }
      : current.digestTime,
  };
}

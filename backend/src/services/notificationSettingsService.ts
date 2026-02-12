/**
 * 通知设置服务层
 * 
 * 功能：
 * - 用户通知设置的CRUD操作
 * - 设置验证和默认值处理
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  NotificationSettings,
  NotificationTypeSettings,
  InteractionSubtypes,
  UpdateNotificationSettingsRequest,
} from '../types/notifications';

// 默认设置
const DEFAULT_SETTINGS: NotificationSettings = {
  userId: 0,
  system: {
    inApp: true,
    email: true,
    push: false,
    frequency: 'realtime',
  },
  interaction: {
    inApp: true,
    email: false,
    push: true,
    frequency: 'realtime',
    subtypes: {
      comment: true,
      like: true,
      favorite: true,
      mention: true,
      follow: true,
      reply: true,
    },
  },
  privateMessage: {
    inApp: true,
    email: false,
    push: true,
    frequency: 'realtime',
  },
  doNotDisturb: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'Asia/Shanghai',
  },
  digestTime: {
    daily: '09:00',
    weeklyDay: 1,
    weeklyTime: '09:00',
  },
};

/**
 * 获取用户的通知设置
 * 如果不存在则创建默认设置
 */
export async function getNotificationSettings(
  db: D1Database,
  userId: number
): Promise<NotificationSettings> {
  try {
    const row = await db.prepare(
      `SELECT 
        user_id,
        system_in_app, system_email, system_push, system_frequency,
        interaction_in_app, interaction_email, interaction_push, interaction_frequency,
        interaction_subtypes,
        private_message_in_app, private_message_email, private_message_push, private_message_frequency,
        do_not_disturb_enabled, do_not_disturb_start, do_not_disturb_end, do_not_disturb_timezone,
        daily_digest_time, weekly_digest_day, weekly_digest_time,
        created_at, updated_at
      FROM notification_settings
      WHERE user_id = ?`
    ).bind(userId).first();

    if (!row) {
      // 创建设置记录
      await createDefaultSettings(db, userId);
      return { ...DEFAULT_SETTINGS, userId };
    }

    return mapSettingsFromRow(row);
  } catch (error) {
    console.error('Get notification settings error:', error);
    return { ...DEFAULT_SETTINGS, userId };
  }
}

/**
 * 创建默认设置
 */
export async function createDefaultSettings(
  db: D1Database,
  userId: number
): Promise<boolean> {
  try {
    const result = await db.prepare(
      `INSERT INTO notification_settings (user_id) VALUES (?)`
    ).bind(userId).run();

    return result.success;
  } catch (error) {
    console.error('Create default settings error:', error);
    return false;
  }
}

/**
 * 更新通知设置
 */
export async function updateNotificationSettings(
  db: D1Database,
  userId: number,
  updates: UpdateNotificationSettingsRequest
): Promise<NotificationSettings | null> {
  try {
    // 获取当前设置
    const currentSettings = await getNotificationSettings(db, userId);

    // 合并更新
    const newSettings = mergeSettings(currentSettings, updates);

    // 验证设置
    if (!validateSettings(newSettings)) {
      console.error('Invalid notification settings');
      return null;
    }

    // 构建更新SQL
    const updateFields: string[] = [];
    const bindings: any[] = [];

    if (updates.system) {
      if (updates.system.inApp !== undefined) {
        updateFields.push('system_in_app = ?');
        bindings.push(updates.system.inApp ? 1 : 0);
      }
      if (updates.system.email !== undefined) {
        updateFields.push('system_email = ?');
        bindings.push(updates.system.email ? 1 : 0);
      }
      if (updates.system.push !== undefined) {
        updateFields.push('system_push = ?');
        bindings.push(updates.system.push ? 1 : 0);
      }
      if (updates.system.frequency !== undefined) {
        updateFields.push('system_frequency = ?');
        bindings.push(updates.system.frequency);
      }
    }

    if (updates.interaction) {
      if (updates.interaction.inApp !== undefined) {
        updateFields.push('interaction_in_app = ?');
        bindings.push(updates.interaction.inApp ? 1 : 0);
      }
      if (updates.interaction.email !== undefined) {
        updateFields.push('interaction_email = ?');
        bindings.push(updates.interaction.email ? 1 : 0);
      }
      if (updates.interaction.push !== undefined) {
        updateFields.push('interaction_push = ?');
        bindings.push(updates.interaction.push ? 1 : 0);
      }
      if (updates.interaction.frequency !== undefined) {
        updateFields.push('interaction_frequency = ?');
        bindings.push(updates.interaction.frequency);
      }
      if (updates.interaction.subtypes !== undefined) {
        const currentSubtypes = currentSettings.interaction.subtypes;
        const newSubtypes = { ...currentSubtypes, ...updates.interaction.subtypes };
        updateFields.push('interaction_subtypes = ?');
        bindings.push(JSON.stringify(newSubtypes));
      }
    }

    if (updates.privateMessage) {
      if (updates.privateMessage.inApp !== undefined) {
        updateFields.push('private_message_in_app = ?');
        bindings.push(updates.privateMessage.inApp ? 1 : 0);
      }
      if (updates.privateMessage.email !== undefined) {
        updateFields.push('private_message_email = ?');
        bindings.push(updates.privateMessage.email ? 1 : 0);
      }
      if (updates.privateMessage.push !== undefined) {
        updateFields.push('private_message_push = ?');
        bindings.push(updates.privateMessage.push ? 1 : 0);
      }
      if (updates.privateMessage.frequency !== undefined) {
        updateFields.push('private_message_frequency = ?');
        bindings.push(updates.privateMessage.frequency);
      }
    }

    if (updates.doNotDisturb) {
      if (updates.doNotDisturb.enabled !== undefined) {
        updateFields.push('do_not_disturb_enabled = ?');
        bindings.push(updates.doNotDisturb.enabled ? 1 : 0);
      }
      if (updates.doNotDisturb.start !== undefined) {
        updateFields.push('do_not_disturb_start = ?');
        bindings.push(updates.doNotDisturb.start);
      }
      if (updates.doNotDisturb.end !== undefined) {
        updateFields.push('do_not_disturb_end = ?');
        bindings.push(updates.doNotDisturb.end);
      }
      if (updates.doNotDisturb.timezone !== undefined) {
        updateFields.push('do_not_disturb_timezone = ?');
        bindings.push(updates.doNotDisturb.timezone);
      }
    }

    if (updates.digestTime) {
      if (updates.digestTime.daily !== undefined) {
        updateFields.push('daily_digest_time = ?');
        bindings.push(updates.digestTime.daily);
      }
      if (updates.digestTime.weeklyDay !== undefined) {
        updateFields.push('weekly_digest_day = ?');
        bindings.push(updates.digestTime.weeklyDay);
      }
      if (updates.digestTime.weeklyTime !== undefined) {
        updateFields.push('weekly_digest_time = ?');
        bindings.push(updates.digestTime.weeklyTime);
      }
    }

    if (updateFields.length === 0) {
      return currentSettings;
    }

    // 执行更新
    const sql = `UPDATE notification_settings SET ${updateFields.join(', ')} WHERE user_id = ?`;
    bindings.push(userId);

    const result = await db.prepare(sql).bind(...bindings).run();

    if (!result.success) {
      console.error('Update notification settings failed:', result.error);
      return null;
    }

    // 返回更新后的设置
    return getNotificationSettings(db, userId);
  } catch (error) {
    console.error('Update notification settings error:', error);
    return null;
  }
}

/**
 * 检查通知类型是否启用
 */
export async function isNotificationEnabled(
  db: D1Database,
  userId: number,
  type: 'system' | 'interaction' | 'private_message',
  channel: 'in_app' | 'email' | 'push'
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(db, userId);

    const typeSettings = settings[type === 'private_message' ? 'privateMessage' : type];
    if (!typeSettings) return false;

    // 检查频率是否为关闭
    if (typeSettings.frequency === 'off') return false;

    // 检查渠道开关
    return typeSettings[channel === 'in_app' ? 'inApp' : channel];
  } catch (error) {
    console.error('Check notification enabled error:', error);
    return false;
  }
}

/**
 * 检查互动子类型是否启用
 */
export async function isInteractionSubtypeEnabled(
  db: D1Database,
  userId: number,
  subtype: keyof InteractionSubtypes
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(db, userId);
    return settings.interaction.subtypes[subtype] ?? true;
  } catch (error) {
    console.error('Check interaction subtype enabled error:', error);
    return true;
  }
}

/**
 * 合并设置
 */
function mergeSettings(
  current: NotificationSettings,
  updates: UpdateNotificationSettingsRequest
): NotificationSettings {
  return {
    ...current,
    system: { ...current.system, ...updates.system },
    interaction: {
      ...current.interaction,
      ...updates.interaction,
      subtypes: updates.interaction?.subtypes
        ? { ...current.interaction.subtypes, ...updates.interaction.subtypes }
        : current.interaction.subtypes,
    },
    privateMessage: { ...current.privateMessage, ...updates.privateMessage },
    doNotDisturb: { ...current.doNotDisturb, ...updates.doNotDisturb },
    digestTime: { ...current.digestTime, ...updates.digestTime },
  };
}

/**
 * 验证设置
 */
function validateSettings(settings: NotificationSettings): boolean {
  // 验证频率值
  const validFrequencies = ['realtime', 'daily', 'weekly', 'off'];
  if (!validFrequencies.includes(settings.system.frequency)) return false;
  if (!validFrequencies.includes(settings.interaction.frequency)) return false;
  if (!validFrequencies.includes(settings.privateMessage.frequency)) return false;

  // 验证时间格式
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (settings.doNotDisturb.start && !timeRegex.test(settings.doNotDisturb.start)) return false;
  if (settings.doNotDisturb.end && !timeRegex.test(settings.doNotDisturb.end)) return false;
  if (!timeRegex.test(settings.digestTime.daily)) return false;
  if (!timeRegex.test(settings.digestTime.weeklyTime)) return false;

  // 验证星期几
  if (settings.digestTime.weeklyDay < 0 || settings.digestTime.weeklyDay > 6) return false;

  return true;
}

/**
 * 数据库行映射为NotificationSettings对象
 */
function mapSettingsFromRow(row: any): NotificationSettings {
  return {
    userId: row.user_id,
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
      subtypes: row.interaction_subtypes
        ? JSON.parse(row.interaction_subtypes)
        : DEFAULT_SETTINGS.interaction.subtypes,
    },
    privateMessage: {
      inApp: row.private_message_in_app === 1,
      email: row.private_message_email === 1,
      push: row.private_message_push === 1,
      frequency: row.private_message_frequency,
    },
    doNotDisturb: {
      enabled: row.do_not_disturb_enabled === 1,
      start: row.do_not_disturb_start,
      end: row.do_not_disturb_end,
      timezone: row.do_not_disturb_timezone || 'Asia/Shanghai',
    },
    digestTime: {
      daily: row.daily_digest_time || '09:00',
      weeklyDay: row.weekly_digest_day ?? 1,
      weeklyTime: row.weekly_digest_time || '09:00',
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

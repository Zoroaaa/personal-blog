/**
 * 通知设置路由
 *
 * 功能：
 * - 获取用户通知设置
 * - 更新用户通知设置
 *
 * @version 1.0.0
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../services/notificationSettingsService';
import { isValidTimeFormat } from '../services/doNotDisturb';
import type { UpdateNotificationSettingsRequest } from '../types/notifications';

export const notificationSettingsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

/**
 * GET /api/notifications/settings
 * 获取当前用户的通知设置
 */
notificationSettingsRoutes.get('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;

    const settings = await getNotificationSettings(c.env.DB, currentUser.userId);

    logger.info('Get notification settings', {
      userId: currentUser.userId,
    });

    // 转换为前端友好的格式
    const response = {
      system: settings.system,
      interaction: settings.interaction,
      privateMessage: settings.privateMessage,
      doNotDisturb: settings.doNotDisturb,
      digestTime: settings.digestTime,
    };

    return c.json(successResponse(response));
  } catch (error) {
    logger.error('Get notification settings error', error);
    return c.json(
      errorResponse('Failed to get settings', '获取通知设置失败'),
      500
    );
  }
});

/**
 * PUT /api/notifications/settings
 * 更新通知设置
 *
 * 请求体示例：
 * {
 *   system: {
 *     inApp: true,
 *     email: true,
 *     push: false,
 *     frequency: "realtime"
 *   },
 *   interaction: {
 *     inApp: true,
 *     email: false,
 *     push: true,
 *     frequency: "realtime",
 *     subtypes: {
 *       comment: true,
 *       like: true,
 *       favorite: false
 *     }
 *   },
 *   privateMessage: {
 *     inApp: true,
 *     email: false,
 *     push: true,
 *     frequency: "realtime"
 *   },
 *   doNotDisturb: {
 *     enabled: true,
 *     start: "22:00",
 *     end: "08:00"
 *   },
 *   digestTime: {
 *     daily: "09:00",
 *     weeklyDay: 1,
 *     weeklyTime: "09:00"
 *   }
 * }
 */
notificationSettingsRoutes.put('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();

    // 验证请求体
    const validationError = validateSettingsUpdate(body);
    if (validationError) {
      return c.json(errorResponse('Validation error', validationError), 400);
    }

    const updates: UpdateNotificationSettingsRequest = {};

    // 系统通知设置
    if (body.system) {
      updates.system = {
        inApp: body.system.inApp,
        email: body.system.email,
        push: body.system.push,
        frequency: body.system.frequency,
      };
    }

    // 互动通知设置
    if (body.interaction) {
      updates.interaction = {
        inApp: body.interaction.inApp,
        email: body.interaction.email,
        push: body.interaction.push,
        frequency: body.interaction.frequency,
        subtypes: body.interaction.subtypes,
      };
    }

    // 私信通知设置
    if (body.privateMessage) {
      updates.privateMessage = {
        inApp: body.privateMessage.inApp,
        email: body.privateMessage.email,
        push: body.privateMessage.push,
        frequency: body.privateMessage.frequency,
      };
    }

    // 免打扰设置
    if (body.doNotDisturb) {
      updates.doNotDisturb = {
        enabled: body.doNotDisturb.enabled,
        start: body.doNotDisturb.start,
        end: body.doNotDisturb.end,
        timezone: body.doNotDisturb.timezone,
      };
    }

    // 汇总时间设置
    if (body.digestTime) {
      updates.digestTime = {
        daily: body.digestTime.daily,
        weeklyDay: body.digestTime.weeklyDay,
        weeklyTime: body.digestTime.weeklyTime,
      };
    }

    const updatedSettings = await updateNotificationSettings(
      c.env.DB,
      currentUser.userId,
      updates
    );

    if (!updatedSettings) {
      return c.json(
        errorResponse('Failed to update settings', '更新设置失败'),
        500
      );
    }

    logger.info('Update notification settings', {
      userId: currentUser.userId,
      updates: Object.keys(updates),
    });

    // 返回更新后的设置
    const response = {
      system: updatedSettings.system,
      interaction: updatedSettings.interaction,
      privateMessage: updatedSettings.privateMessage,
      doNotDisturb: updatedSettings.doNotDisturb,
      digestTime: updatedSettings.digestTime,
    };

    return c.json(successResponse(response, '设置已更新'));
  } catch (error) {
    logger.error('Update notification settings error', error);
    return c.json(
      errorResponse('Failed to update settings', '更新设置失败'),
      500
    );
  }
});

/**
 * 验证设置更新请求
 */
function validateSettingsUpdate(body: any): string | null {
  if (!body || typeof body !== 'object') {
    return '请求体不能为空';
  }

  const validFrequencies = ['realtime', 'daily', 'weekly', 'off'];

  // 验证系统通知设置
  if (body.system) {
    if (
      body.system.frequency !== undefined &&
      !validFrequencies.includes(body.system.frequency)
    ) {
      return '系统通知频率无效';
    }
  }

  // 验证互动通知设置
  if (body.interaction) {
    if (
      body.interaction.frequency !== undefined &&
      !validFrequencies.includes(body.interaction.frequency)
    ) {
      return '互动通知频率无效';
    }
  }

  // 验证私信通知设置
  if (body.privateMessage) {
    if (
      body.privateMessage.frequency !== undefined &&
      !validFrequencies.includes(body.privateMessage.frequency)
    ) {
      return '私信通知频率无效';
    }
  }

  // 验证免打扰设置
  if (body.doNotDisturb) {
    if (body.doNotDisturb.start && !isValidTimeFormat(body.doNotDisturb.start)) {
      return '免打扰开始时间格式无效，应为 HH:mm';
    }
    if (body.doNotDisturb.end && !isValidTimeFormat(body.doNotDisturb.end)) {
      return '免打扰结束时间格式无效，应为 HH:mm';
    }
  }

  // 验证汇总时间设置
  if (body.digestTime) {
    if (body.digestTime.daily && !isValidTimeFormat(body.digestTime.daily)) {
      return '每日汇总时间格式无效，应为 HH:mm';
    }
    if (
      body.digestTime.weeklyTime &&
      !isValidTimeFormat(body.digestTime.weeklyTime)
    ) {
      return '每周汇总时间格式无效，应为 HH:mm';
    }
    if (
      body.digestTime.weeklyDay !== undefined &&
      (body.digestTime.weeklyDay < 0 || body.digestTime.weeklyDay > 6)
    ) {
      return '每周汇总日期无效，应为 0-6（0=周日）';
    }
  }

  return null;
}

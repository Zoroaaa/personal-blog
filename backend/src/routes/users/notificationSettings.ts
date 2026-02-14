/**
 * 用户通知设置路由 (新位置: /api/users/notification-settings)
 *
 * 功能：
 * - 获取用户通知设置
 * - 更新用户通知设置
 *
 * 说明：此路由是 /api/notifications/settings 的新位置
 * 旧路由将被保留用于向后兼容
 *
 * @version 2.1.0
 * @author 博客系统
 * @created 2026-02-13
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../../types';
import { successResponse, errorResponse } from '../../utils/response';
import { requireAuth } from '../../middleware/auth';
import { createLogger } from '../../middleware/requestLogger';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../../services/notificationSettingsService';
import { isValidTimeFormat } from '../../services/doNotDisturb';
import type { UpdateNotificationSettingsRequest } from '../../types/notifications';

export const userNotificationSettingsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

userNotificationSettingsRoutes.get('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;

    const settings = await getNotificationSettings(c.env.DB, currentUser.userId);

    logger.info('Get user notification settings', {
      userId: currentUser.userId,
    });

    const response = {
      system: settings.system,
      interaction: settings.interaction,
      doNotDisturb: settings.doNotDisturb,
      digestTime: settings.digestTime,
    };

    return c.json(successResponse(response));
  } catch (error) {
    logger.error('Get user notification settings error', error);
    return c.json(
      errorResponse('Failed to get settings', '获取通知设置失败'),
      500
    );
  }
});

userNotificationSettingsRoutes.put('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();

    const validationError = validateSettingsUpdate(body);
    if (validationError) {
      return c.json(errorResponse('Validation error', validationError), 400);
    }

    const updates: UpdateNotificationSettingsRequest = {};

    if (body.system) {
      updates.system = {
        inApp: body.system.inApp,
        email: body.system.email,
        frequency: body.system.frequency,
      };
    }

    if (body.interaction) {
      updates.interaction = {
        inApp: body.interaction.inApp,
        email: body.interaction.email,
        frequency: body.interaction.frequency,
        subtypes: body.interaction.subtypes,
      };
    }

    if (body.doNotDisturb) {
      updates.doNotDisturb = {
        enabled: body.doNotDisturb.enabled,
        start: body.doNotDisturb.start,
        end: body.doNotDisturb.end,
        timezone: body.doNotDisturb.timezone,
      };
    }

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

    logger.info('Update user notification settings', {
      userId: currentUser.userId,
      updates: Object.keys(updates),
    });

    const response = {
      system: updatedSettings.system,
      interaction: updatedSettings.interaction,
      doNotDisturb: updatedSettings.doNotDisturb,
      digestTime: updatedSettings.digestTime,
    };

    return c.json(successResponse(response, '设置已更新'));
  } catch (error) {
    logger.error('Update user notification settings error', error);
    return c.json(
      errorResponse('Failed to update settings', '更新设置失败'),
      500
    );
  }
});

function validateSettingsUpdate(body: any): string | null {
  if (!body || typeof body !== 'object') {
    return '请求体不能为空';
  }

  const validFrequencies = ['realtime', 'daily', 'weekly', 'off'];

  if (body.system) {
    if (
      body.system.frequency !== undefined &&
      !validFrequencies.includes(body.system.frequency)
    ) {
      return '系统通知频率无效';
    }
  }

  if (body.interaction) {
    if (
      body.interaction.frequency !== undefined &&
      !validFrequencies.includes(body.interaction.frequency)
    ) {
      return '互动通知频率无效';
    }
  }

  if (body.doNotDisturb) {
    if (body.doNotDisturb.start && !isValidTimeFormat(body.doNotDisturb.start)) {
      return '免打扰开始时间格式无效，应为 HH:mm';
    }
    if (body.doNotDisturb.end && !isValidTimeFormat(body.doNotDisturb.end)) {
      return '免打扰结束时间格式无效，应为 HH:mm';
    }
  }

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

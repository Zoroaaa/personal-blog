/**
 * 私信设置路由
 *
 * 功能：
 * - 获取用户私信设置
 * - 更新用户私信设置
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../../types';
import { successResponse, errorResponse } from '../../utils/response';
import { requireAuth } from '../../middleware/auth';
import { createLogger } from '../../middleware/requestLogger';
import {
  getMessageSettings,
  updateMessageSettings,
  type UpdateMessageSettingsRequest,
} from '../../services/messageSettingsService';

export const messageSettingsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

messageSettingsRoutes.get('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user');

    const settings = await getMessageSettings(c.env.DB, currentUser.userId);

    logger.info('Get user message settings', {
      userId: currentUser.userId,
    });

    return c.json(successResponse(settings));
  } catch (error) {
    logger.error('Get user message settings error', error);
    return c.json(
      errorResponse('Failed to get settings', '获取私信设置失败'),
      500
    );
  }
});

messageSettingsRoutes.put('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    const validationError = validateSettingsUpdate(body);
    if (validationError) {
      return c.json(errorResponse('Validation error', validationError), 400);
    }

    const updates: UpdateMessageSettingsRequest = {};

    if (body.emailNotification !== undefined) {
      updates.emailNotification = Boolean(body.emailNotification);
    }

    if (body.respectDnd !== undefined) {
      updates.respectDnd = Boolean(body.respectDnd);
    }

    if (body.allowStrangers !== undefined) {
      updates.allowStrangers = Boolean(body.allowStrangers);
    }

    const updatedSettings = await updateMessageSettings(
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

    logger.info('Update user message settings', {
      userId: currentUser.userId,
      updates: Object.keys(updates),
    });

    return c.json(successResponse(updatedSettings, '设置已更新'));
  } catch (error) {
    logger.error('Update user message settings error', error);
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

  const validKeys = ['emailNotification', 'respectDnd', 'allowStrangers'];
  const providedKeys = Object.keys(body);

  for (const key of providedKeys) {
    if (!validKeys.includes(key)) {
      return `未知的设置项: ${key}`;
    }
    if (typeof body[key] !== 'boolean') {
      return `${key} 必须是布尔值`;
    }
  }

  return null;
}

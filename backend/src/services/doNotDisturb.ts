/**
 * 免打扰服务
 * 
 * 功能：
 * - 检查当前是否在免打扰时段
 * 
 * 变更说明：
 * - 移除了 push 渠道的特殊处理
 * - 免打扰现在只影响邮件通知
 * 
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 */

import type { NotificationSettings } from '../types/notifications';

export function isInDoNotDisturb(
  settings: NotificationSettings['doNotDisturb']
): boolean {
  if (!settings.enabled || !settings.start || !settings.end) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.start.split(':').map(Number);
  const [endHour, endMin] = settings.end.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

export function shouldSendNow(
  settings: NotificationSettings['doNotDisturb'],
  channel: 'in_app' | 'email'
): boolean {
  if (channel === 'in_app') {
    return true;
  }

  return !isInDoNotDisturb(settings);
}

export function isValidTimeFormat(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

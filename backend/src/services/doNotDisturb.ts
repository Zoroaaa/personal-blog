/**
 * 免打扰服务
 * 
 * 功能：
 * - 检查当前是否在免打扰时段
 * - 计算下一个非免打扰时间
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

export function getMinutesUntilDoNotDisturbEnd(
  settings: NotificationSettings['doNotDisturb']
): number {
  if (!isInDoNotDisturb(settings)) {
    return 0;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [endHour, endMin] = settings.end!.split(':').map(Number);
  const endTime = endHour * 60 + endMin;

  const [startHour, startMin] = settings.start!.split(':').map(Number);
  const startTime = startHour * 60 + startMin;

  if (startTime > endTime) {
    if (currentTime <= endTime) {
      return endTime - currentTime;
    } else {
      return (24 * 60 - currentTime) + endTime;
    }
  } else {
    return endTime - currentTime;
  }
}

export function getNextAvailableTime(
  settings: NotificationSettings['doNotDisturb']
): Date {
  const now = new Date();

  if (!isInDoNotDisturb(settings)) {
    return now;
  }

  const minutesUntilEnd = getMinutesUntilDoNotDisturbEnd(settings);
  const nextTime = new Date(now.getTime() + minutesUntilEnd * 60 * 1000);

  return nextTime;
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

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
  };
}

export function isValidTimeFormat(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

export function getDoNotDisturbStatus(
  settings: NotificationSettings['doNotDisturb']
): { isActive: boolean; description: string } {
  if (!settings.enabled) {
    return {
      isActive: false,
      description: '免打扰已关闭',
    };
  }

  const inDoNotDisturb = isInDoNotDisturb(settings);

  if (inDoNotDisturb) {
    const minutesUntilEnd = getMinutesUntilDoNotDisturbEnd(settings);
    const hours = Math.floor(minutesUntilEnd / 60);
    const minutes = minutesUntilEnd % 60;

    let timeDesc = '';
    if (hours > 0) {
      timeDesc += `${hours}小时`;
    }
    if (minutes > 0) {
      timeDesc += `${minutes}分钟`;
    }

    return {
      isActive: true,
      description: `免打扰中，还有${timeDesc}结束`,
    };
  } else {
    return {
      isActive: false,
      description: `免打扰时段：${settings.start} - ${settings.end}`,
    };
  }
}

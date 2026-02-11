/**
 * 免打扰服务
 * 
 * 功能：
 * - 检查当前是否在免打扰时段
 * - 计算下一个非免打扰时间
 * 
 * @version 1.0.0
 */

import type { NotificationSettings } from '../types/notifications';

/**
 * 检查当前是否在免打扰时段
 */
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

  // 处理跨天情况（如 22:00 - 08:00）
  if (startTime > endTime) {
    // 跨天：当前时间在开始时间之后 或 在结束时间之前
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    // 不跨天：当前时间在开始和结束之间
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * 计算距离免打扰结束还有多少分钟
 * 如果不在免打扰时段，返回0
 */
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

  // 跨天情况
  if (startTime > endTime) {
    if (currentTime <= endTime) {
      // 当前在第二天的免打扰时段（00:00 - end）
      return endTime - currentTime;
    } else {
      // 当前在第一天的免打扰时段（start - 24:00）
      return (24 * 60 - currentTime) + endTime;
    }
  } else {
    // 不跨天
    return endTime - currentTime;
  }
}

/**
 * 计算下一个可以发送通知的时间点
 * 如果当前不在免打扰时段，返回当前时间
 */
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

/**
 * 检查是否应该发送通知（考虑免打扰设置）
 */
export function shouldSendNow(
  settings: NotificationSettings['doNotDisturb'],
  channel: 'in_app' | 'email' | 'push'
): boolean {
  // 站内通知不受免打扰影响
  if (channel === 'in_app') {
    return true;
  }

  // 检查是否在免打扰时段
  return !isInDoNotDisturb(settings);
}

/**
 * 格式化时间（HH:mm）
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 解析时间字符串（HH:mm）
 */
export function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
  };
}

/**
 * 验证时间格式
 */
export function isValidTimeFormat(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

/**
 * 获取免打扰状态描述
 */
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

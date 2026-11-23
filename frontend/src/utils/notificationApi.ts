/**
 * 通知功能 API 封装
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 */

import type {
  NotificationListResponse,
  NotificationSettings,
  UnreadCountResponse,
  NotificationFilter,
  PartialNotificationSettings,
} from '../types/notifications';
// 统一走 api.ts 唯一客户端：自带 Bearer、401 静默刷新与错误解包。
// 曾经这里 8 个裸 fetch 自行拼 header，token 过期后通知静默失败且不登出。
import { apiRequest } from './api';

/** apiRequest 成功时 data 基本必有；类型上是可选，这里统一收窄并兜底报错 */
function unwrap<T>(res: { data?: T }): T {
  if (res.data === undefined || res.data === null) {
    throw new Error('服务器返回数据为空');
  }
  return res.data;
}

export async function getNotifications(
  page: number = 1,
  limit: number = 20,
  filter?: NotificationFilter
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));

  if (filter?.type && filter.type !== 'all') {
    params.append('type', filter.type);
  }
  if (filter?.isRead !== undefined) {
    params.append('isRead', String(filter.isRead));
  }

  const result = await apiRequest<NotificationListResponse>(
    `/notifications?${params.toString()}`
  );
  return unwrap(result);
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const result = await apiRequest<UnreadCountResponse>('/notifications/unread-count');
  return unwrap(result);
}

export async function markAsRead(notificationId: number): Promise<void> {
  await apiRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
}

export async function markAllAsRead(type?: string): Promise<{ markedCount: number }> {
  const result = await apiRequest<{ markedCount: number }>('/notifications/read-all', {
    method: 'PUT',
    body: JSON.stringify({ type }),
  });
  return unwrap(result);
}

export async function deleteNotification(notificationId: number): Promise<void> {
  await apiRequest(`/notifications/${notificationId}`, { method: 'DELETE' });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const result = await apiRequest<NotificationSettings>('/users/notification-settings');
  return unwrap(result);
}

export async function updateNotificationSettings(
  settings: PartialNotificationSettings
): Promise<NotificationSettings> {
  const result = await apiRequest<NotificationSettings>('/users/notification-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return unwrap(result);
}

export function getNotificationIcon(type: string, subtype?: string): string {
  switch (type) {
    case 'system':
      switch (subtype) {
        case 'maintenance':
          return '🔧';
        case 'update':
          return '🚀';
        case 'announcement':
          return '📢';
        default:
          return '🔔';
      }
    case 'interaction':
      switch (subtype) {
        case 'comment':
        case 'reply':
          return '💬';
        case 'like':
          return '❤️';
        case 'favorite':
          return '⭐';
        case 'mention':
          return '@';
        default:
          return '👋';
      }
    default:
      return '📌';
  }
}

export function getNotificationTypeText(type: string): string {
  switch (type) {
    case 'system':
      return '系统通知';
    case 'interaction':
      return '互动通知';
    default:
      return '通知';
  }
}

export function getNotificationSubtypeText(subtype?: string): string {
  switch (subtype) {
    case 'comment':
      return '评论';
    case 'reply':
      return '回复';
    case 'like':
      return '点赞';
    case 'favorite':
      return '收藏';
    case 'mention':
      return '提及';
    case 'maintenance':
      return '系统维护';
    case 'update':
      return '功能更新';
    case 'announcement':
      return '公告';
    default:
      return '';
  }
}

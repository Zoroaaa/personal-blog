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
import { useAuthStore } from '../stores/authStore';

// 与 api.ts 保持一致：同域部署时基址为相对路径 /api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getRequestConfig(): RequestInit {
  const { token } = useAuthStore.getState();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: '请求失败',
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
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

  const response = await fetch(
    `${API_BASE_URL}/notifications?${params.toString()}`,
    getRequestConfig()
  );

  const result = await handleResponse<{ success: boolean; data: NotificationListResponse }>(response);
  return result.data;
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/unread-count`,
    getRequestConfig()
  );

  const result = await handleResponse<{ success: boolean; data: UnreadCountResponse }>(response);
  return result.data;
}

export async function markAsRead(notificationId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      ...getRequestConfig(),
      method: 'PUT',
    }
  );

  await handleResponse(response);
}

export async function markAllAsRead(type?: string): Promise<{ markedCount: number }> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/read-all`,
    {
      ...getRequestConfig(),
      method: 'PUT',
      body: JSON.stringify({ type }),
    }
  );

  const result = await handleResponse<{ success: boolean; data: { markedCount: number } }>(response);
  return result.data;
}

export async function deleteNotification(notificationId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}`,
    {
      ...getRequestConfig(),
      method: 'DELETE',
    }
  );

  await handleResponse(response);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch(
    `${API_BASE_URL}/users/notification-settings`,
    getRequestConfig()
  );

  const result = await handleResponse<{ success: boolean; data: NotificationSettings }>(response);
  return result.data;
}

export async function updateNotificationSettings(
  settings: PartialNotificationSettings
): Promise<NotificationSettings> {
  const response = await fetch(
    `${API_BASE_URL}/users/notification-settings`,
    {
      ...getRequestConfig(),
      method: 'PUT',
      body: JSON.stringify(settings),
    }
  );

  const result = await handleResponse<{ success: boolean; data: NotificationSettings }>(response);
  return result.data;
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

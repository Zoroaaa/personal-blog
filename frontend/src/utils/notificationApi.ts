/**
 * 通知功能 API 封装
 *
 * @author 博客系统
 * @version 1.0.0
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

// API 基础 URL - 直接使用 VITE_API_URL，不在代码中添加 /api 前缀
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 获取请求配置
 */
function getRequestConfig(): RequestInit {
  const { token } = useAuthStore.getState();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

/**
 * 处理响应
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: '请求失败',
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * 获取通知列表
 */
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

/**
 * 获取未读通知数
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await fetch(
    `${API_BASE_URL}/notifications/unread-count`,
    getRequestConfig()
  );

  const result = await handleResponse<{ success: boolean; data: UnreadCountResponse }>(response);
  return result.data;
}

/**
 * 标记通知为已读
 */
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

/**
 * 标记所有通知为已读
 */
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

/**
 * 删除通知
 */
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

/**
 * 获取通知设置（新位置）
 *
 * 旧API：GET /notifications/settings
 * 新API：GET /users/notification-settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch(
    `${API_BASE_URL}/users/notification-settings`,
    getRequestConfig()
  );

  const result = await handleResponse<{ success: boolean; data: NotificationSettings }>(response);
  return result.data;
}

/**
 * 更新通知设置（新位置）
 *
 * 旧API：PUT /notifications/settings
 * 新API：PUT /users/notification-settings
 */
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

/**
 * 订阅浏览器推送（新位置）
 *
 * 旧API：POST /notifications/push/subscribe
 * 新API：POST /users/notification-subscriptions
 */
export async function subscribePush(subscription: PushSubscription): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/users/notification-subscriptions`,
    {
      ...getRequestConfig(),
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          keys: (subscription as any).keys,
        },
        userAgent: navigator.userAgent,
      }),
    }
  );

  await handleResponse(response);
}

/**
 * 取消订阅浏览器推送（新位置）
 *
 * 旧API：POST /notifications/push/unsubscribe
 * 新API：DELETE /users/notification-subscriptions/:subscriptionId
 */
export async function unsubscribePush(subscriptionId: number | string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/users/notification-subscriptions/${subscriptionId}`,
    {
      ...getRequestConfig(),
      method: 'DELETE',
    }
  );

  await handleResponse(response);
}

/**
 * 获取推送订阅状态（新位置）
 *
 * 旧API：GET /notifications/push/status
 * 新API：GET /users/notification-subscriptions/status
 */
export async function getPushStatus(): Promise<{
  isSubscribed: boolean;
  subscriptions: Array<{
    id: number;
    endpoint: string;
    userAgent: string;
    createdAt: string;
    lastUsedAt: string;
  }>;
}> {
  const response = await fetch(
    `${API_BASE_URL}/users/notification-subscriptions/status`,
    getRequestConfig()
  );

  const result = await handleResponse<{
    success: boolean;
    data: {
      isSubscribed: boolean;
      subscriptions: Array<{
        id: number;
        endpoint: string;
        userAgent: string;
        createdAt: string;
        lastUsedAt: string;
      }>;
    };
  }>(response);

  return result.data;
}

/**
 * 获取通知图标
 */
export function getNotificationIcon(type: string, subtype?: string): string {
  switch (type) {
    case 'system':
      return '🔔';
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
        case 'follow':
          return '👤';
        default:
          return '👋';
      }
    case 'private_message':
      return '✉️';
    default:
      return '📌';
  }
}

/**
 * 获取通知类型文本
 */
export function getNotificationTypeText(type: string): string {
  switch (type) {
    case 'system':
      return '系统通知';
    case 'interaction':
      return '互动通知';
    case 'private_message':
      return '私信';
    default:
      return '通知';
  }
}

/**
 * 获取通知子类型文本
 */
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
    case 'follow':
      return '关注';
    case 'maintenance':
      return '系统维护';
    case 'update':
      return '功能更新';
    case 'announcement':
      return '公告';
    case 'private_message':
      return '私信';
    default:
      return '';
  }
}

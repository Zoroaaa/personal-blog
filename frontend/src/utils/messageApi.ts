/**
 * 私信功能API工具
 */

import { useAuthStore } from '../stores/authStore';
import type {
  Message,
  ConversationsResponse,
  ConversationDetail,
  SendMessageRequest,
  AdminMessagesResponse,
} from '../types/messages';

// API 基础 URL - 直接使用 VITE_API_URL，不在代码中添加 /api 前缀
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * 获取请求头
 */
function getHeaders(): HeadersInit {
  const { token } = useAuthStore.getState();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * 发送私信
 */
export async function sendMessage(data: SendMessageRequest): Promise<Message> {
  const response = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '发送失败');
  }
  return result.data.message;
}

/**
 * 获取会话列表
 */
export async function getConversations(page = 1, limit = 20): Promise<ConversationsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/messages/conversations?page=${page}&limit=${limit}`,
    {
      headers: getHeaders(),
    }
  );

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '获取会话列表失败');
  }
  return result.data;
}

/**
 * 获取与特定用户的对话
 */
export async function getConversation(
  userId: number,
  page = 1,
  limit = 20
): Promise<ConversationDetail> {
  const response = await fetch(
    `${API_BASE_URL}/messages/conversation/${userId}?page=${page}&limit=${limit}`,
    {
      headers: getHeaders(),
    }
  );

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '获取对话失败');
  }
  return result.data;
}

/**
 * 标记消息为已读
 */
export async function markMessageAsRead(messageId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
    method: 'PUT',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '标记已读失败');
  }
}

/**
 * 标记所有消息为已读
 */
export async function markAllAsRead(): Promise<{ markedCount: number }> {
  const response = await fetch(`${API_BASE_URL}/messages/read-all`, {
    method: 'PUT',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '标记全部已读失败');
  }
  return result.data;
}

/**
 * 删除消息
 */
export async function deleteMessage(messageId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '删除失败');
  }
}

/**
 * 获取未读消息数
 */
export async function getUnreadCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/messages/unread-count`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '获取未读数失败');
  }
  return result.data.unreadCount;
}

/**
 * 管理员：获取所有私信
 */
export async function getAllMessages(
  page = 1,
  limit = 20,
  senderId?: number,
  receiverId?: number
): Promise<AdminMessagesResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (senderId) params.append('senderId', String(senderId));
  if (receiverId) params.append('receiverId', String(receiverId));

  const response = await fetch(`${API_BASE_URL}/messages/admin/all?${params}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '获取私信列表失败');
  }
  return result.data;
}

/**
 * 管理员：彻底删除私信
 */
export async function adminDeleteMessage(messageId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/messages/admin/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '删除失败');
  }
}

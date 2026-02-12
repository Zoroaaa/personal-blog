/**
 * 私信功能API工具
 * 重构：使用api.ts中的通用API调用方法，统一错误处理
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { api } from './api';
import type {
  Message,
  ConversationsResponse,
  ConversationDetail,
  SendMessageRequest,
  EditMessageRequest,
  AdminMessagesResponse,
} from '../types/messages';

/**
 * 发送私信
 */
export async function sendMessage(data: SendMessageRequest): Promise<Message> {
  const response = await api.post<{ message: Message }>('/messages', data);
  if (!response.data) throw new Error('Failed to send message');
  return response.data.message;
}

/**
 * 获取会话列表
 */
export async function getConversations(page = 1, limit = 20): Promise<ConversationsResponse> {
  const query = `?page=${page}&limit=${limit}`;
  const response = await api.get<ConversationsResponse>(`/messages/conversations${query}`);
  if (!response.data) throw new Error('Failed to get conversations');
  return response.data;
}

/**
 * 获取与特定用户的对话
 */
export async function getConversation(
  userId: number,
  page = 1,
  limit = 20
): Promise<ConversationDetail> {
  const query = `?page=${page}&limit=${limit}`;
  const response = await api.get<ConversationDetail>(`/messages/conversation/${userId}${query}`);
  if (!response.data) throw new Error('Failed to get conversation');
  return response.data;
}

/**
 * 标记消息为已读
 */
export async function markMessageAsRead(messageId: number): Promise<void> {
  await api.put(`/messages/${messageId}/read`);
}

/**
 * 标记所有消息为已读
 */
export async function markAllAsRead(): Promise<{ markedCount: number }> {
  const response = await api.put<{ markedCount: number }>('/messages/read-all');
  if (!response.data) throw new Error('Failed to mark messages as read');
  return response.data;
}

/**
 * 撤回消息（3分钟内可撤回）
 */
export async function recallMessage(messageId: number): Promise<{ recalled: boolean }> {
  const response = await api.put<{ recalled: boolean }>(`/messages/${messageId}/recall`);
  if (!response.data) throw new Error('Failed to recall message');
  return response.data;
}

/**
 * 编辑撤回的消息并重新发送
 */
export async function editMessage(
  messageId: number,
  data: EditMessageRequest
): Promise<Message> {
  const response = await api.put<{ message: Message }>(`/messages/${messageId}/edit`, data);
  if (!response.data) throw new Error('Failed to edit message');
  return response.data.message;
}

/**
 * 获取未读消息数
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ unreadCount: number }>('/messages/unread-count');
  if (!response.data) throw new Error('Failed to get unread count');
  return response.data.unreadCount;
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
  
  const response = await api.get<AdminMessagesResponse>(`/messages/admin/all?${params}`);
  if (!response.data) throw new Error('Failed to get all messages');
  return response.data;
}

/**
 * 管理员：彻底删除私信
 */
export async function adminDeleteMessage(messageId: number): Promise<void> {
  await api.delete(`/messages/admin/${messageId}`);
}

/**
 * 删除消息（普通用户，已废弃，使用撤回替代）
 * 保留此函数以兼容旧代码
 */
export async function deleteMessage(messageId: number): Promise<void> {
  // 普通用户现在使用撤回功能
  await recallMessage(messageId);
}

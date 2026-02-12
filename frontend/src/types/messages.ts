/**
 * 私信功能类型定义
 */

export interface MessageAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'file';
  fileSize: number;
}

export interface Message {
  id: number;
  senderId: number;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl?: string;
  receiverId: number;
  receiverUsername: string;
  receiverDisplayName: string;
  receiverAvatarUrl?: string;
  content: string;
  originalContent?: string; // 撤回前的原始内容
  isRead: boolean;
  isRecalled?: boolean; // 是否已撤回
  canRecall?: boolean; // 是否可以撤回（3分钟内）
  hasAttachments?: boolean;
  attachments?: MessageAttachment[];
  createdAt: string;
  readAt?: string;
}

export interface Conversation {
  id: number;
  partnerId: number;
  partnerUsername: string;
  partnerDisplayName: string;
  partnerAvatarUrl?: string;
  lastMessage: {
    id: number;
    content: string;
    isRecalled?: boolean;
    senderId: number;
    isRead: boolean;
    createdAt: string;
  };
  unreadCount: number;
}

export interface ConversationDetail {
  partner: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendMessageRequest {
  receiverId: number;
  content: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: 'image' | 'file';
    fileSize?: number;
  }>;
}

export interface EditMessageRequest {
  content: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: 'image' | 'file';
    fileSize?: number;
  }>;
}

export interface MessageResponse {
  message: Message;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface AdminMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  receiver: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  isRecalled?: boolean;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface AdminMessagesResponse {
  messages: AdminMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type MessageStatus = 'sending' | 'sent' | 'error' | 'recalled' | 'editing';

export interface MessageWithStatus extends Message {
  status?: MessageStatus;
  tempId?: string;
}

// 编辑状态
export interface EditingMessage {
  messageId: number;
  content: string;
  attachments: MessageAttachment[];
}

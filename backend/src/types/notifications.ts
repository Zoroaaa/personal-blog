/**
 * 通知系统类型定义
 * 
 * 变更说明：
 * - 移除 private_message 类型
 * - 移除 follow 类型（关注功能未实现）
 * - 移除 push 相关配置（浏览器推送功能未实现）
 * - 私信现在是完全独立的系统
 * 
 * @author 博客系统
 * @version 2.1.0
 * @created 2026-02-13
 */

export type NotificationType = 'system' | 'interaction';

export type NotificationSubtype = 
  | 'maintenance' 
  | 'update' 
  | 'announcement'
  | 'comment' 
  | 'like' 
  | 'favorite' 
  | 'mention' 
  | 'reply';

export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'off';

export type NotificationChannel = 'in_app' | 'email';

export type DigestType = 'daily' | 'weekly';

export interface NotificationRelatedData {
  postId?: number;
  postTitle?: string;
  postSlug?: string;
  commentId?: number;
  commentContent?: string;
  parentCommentId?: number;
  parentCommentContent?: string;
  parentCommentAuthor?: string;
  replyContent?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  [key: string]: any;
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  subtype?: NotificationSubtype;
  title: string;
  content?: string;
  relatedData?: NotificationRelatedData;
  isInAppSent: boolean;
  isEmailSent: boolean;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface NotificationTypeSettings {
  inApp: boolean;
  email: boolean;
  frequency: NotificationFrequency;
}

export interface InteractionSubtypes {
  comment: boolean;
  like: boolean;
  favorite: boolean;
  mention: boolean;
  reply: boolean;
}

export interface DoNotDisturbSettings {
  enabled: boolean;
  start?: string;
  end?: string;
  timezone: string;
}

export interface DigestTimeSettings {
  daily: string;
  weeklyDay: number;
  weeklyTime: string;
}

export interface NotificationSettings {
  id?: number;
  userId: number;
  system: NotificationTypeSettings;
  interaction: NotificationTypeSettings & { subtypes: InteractionSubtypes };
  doNotDisturb: DoNotDisturbSettings;
  digestTime: DigestTimeSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailDigestQueue {
  id?: number;
  userId: number;
  notificationId: number;
  digestType: DigestType;
  scheduledAt: string;
  isSent: boolean;
  sentAt?: string;
}

export interface CreateNotificationRequest {
  userId: number;
  type: NotificationType;
  subtype?: NotificationSubtype;
  title: string;
  content?: string;
  relatedData?: NotificationRelatedData;
}

export interface SendNotificationOptions {
  skipInApp?: boolean;
  skipEmail?: boolean;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  total: number;
  byType: {
    system: number;
    interaction: number;
  };
}

export interface AdminSendNotificationRequest {
  title: string;
  content?: string;
  target: 'all' | 'specific_users';
  userIds?: number[];
  channels: NotificationChannel[];
}

export interface AdminSendNotificationResponse {
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

export interface UpdateNotificationSettingsRequest {
  system?: Partial<NotificationTypeSettings>;
  interaction?: Partial<NotificationTypeSettings> & { subtypes?: Partial<InteractionSubtypes> };
  doNotDisturb?: Partial<DoNotDisturbSettings>;
  digestTime?: Partial<DigestTimeSettings>;
}

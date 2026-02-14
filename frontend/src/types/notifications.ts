/**
 * 通知系统类型定义 - 前端
 * 
 * 变更说明：
 * - 移除 private_message 类型
 * - 私信现在是完全独立的系统
 * 
 * @author 博客系统
 * @version 2.0.0 - 方案A
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
  | 'follow' 
  | 'reply';

export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'off';

export interface NotificationRelatedData {
  postId?: number;
  postTitle?: string;
  postSlug?: string;
  commentId?: number;
  parentCommentId?: number;
  parentCommentContent?: string;
  parentCommentAuthor?: string;
  replyContent?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  mentionerId?: number;
  mentionerName?: string;
  mentionerAvatar?: string;
  contentType?: string;
  contentId?: number;
  link?: string;
}

export interface Notification {
  id: number;
  type: NotificationType;
  subtype?: NotificationSubtype;
  title: string;
  content?: string;
  relatedData?: NotificationRelatedData;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface InteractionSubtypes {
  comment: boolean;
  like: boolean;
  favorite: boolean;
  mention: boolean;
  follow: boolean;
  reply: boolean;
}

export interface DoNotDisturbSettings {
  enabled: boolean;
  start?: string;
  end?: string;
  timezone?: string;
}

export interface DigestTimeSettings {
  daily: string;
  weeklyDay: number;
  weeklyTime: string;
}

export interface NotificationTypeSettings {
  inApp: boolean;
  email: boolean;
  push: boolean;
  frequency: NotificationFrequency;
}

export interface NotificationSettings {
  id?: number;
  userId?: number;
  system: NotificationTypeSettings;
  interaction: NotificationTypeSettings & { subtypes: InteractionSubtypes };
  doNotDisturb: DoNotDisturbSettings;
  digestTime: DigestTimeSettings;
  createdAt?: string;
  updatedAt?: string;
}

export type PartialNotificationSettings = {
  system?: Partial<NotificationTypeSettings>;
  interaction?: Partial<NotificationTypeSettings> & { subtypes?: Partial<InteractionSubtypes> };
  doNotDisturb?: Partial<DoNotDisturbSettings>;
  digestTime?: Partial<DigestTimeSettings>;
};

export interface NotificationFilter {
  type?: 'all' | NotificationType;
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

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  toJSON?: () => { keys: { p256dh: string; auth: string } };
}

export type NotificationStatus = 'idle' | 'loading' | 'error' | 'success';

export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

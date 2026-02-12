/**
 * 通知系统类型定义 - 前端
 * 
 * @version 1.0.0
 */

// 通知类型
export type NotificationType = 'system' | 'interaction' | 'private_message';

// 通知子类型
export type NotificationSubtype = 
  | 'maintenance' 
  | 'update' 
  | 'announcement'
  | 'comment' 
  | 'like' 
  | 'favorite' 
  | 'mention' 
  | 'follow' 
  | 'reply'
  | 'private_message';

// 通知频率
export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'off';

// 关联数据
export interface NotificationRelatedData {
  postId?: number;
  postTitle?: string;
  postSlug?: string;
  commentId?: number;
  // 被回复的评论信息
  parentCommentId?: number;
  parentCommentContent?: string;
  parentCommentAuthor?: string;
  // 回复内容
  replyContent?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  messageId?: number;
}

// 通知记录
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

// 互动通知子类型设置
export interface InteractionSubtypes {
  comment: boolean;
  like: boolean;
  favorite: boolean;
  mention: boolean;
  follow: boolean;
  reply: boolean;
}

// 免打扰设置
export interface DoNotDisturbSettings {
  enabled: boolean;
  start?: string;
  end?: string;
  timezone?: string;
}

// 汇总时间设置
export interface DigestTimeSettings {
  daily: string;
  weeklyDay: number;
  weeklyTime: string;
}

// 通知类型设置
export interface NotificationTypeSettings {
  inApp: boolean;
  email: boolean;
  push: boolean;
  frequency: NotificationFrequency;
}

// 用户通知设置
export interface NotificationSettings {
  id?: number;
  userId?: number;
  system: NotificationTypeSettings;
  interaction: NotificationTypeSettings & { subtypes: InteractionSubtypes };
  privateMessage: NotificationTypeSettings;
  doNotDisturb: DoNotDisturbSettings;
  digestTime: DigestTimeSettings;
  createdAt?: string;
  updatedAt?: string;
}

// 部分通知设置（用于更新）
export type PartialNotificationSettings = {
  system?: Partial<NotificationTypeSettings>;
  interaction?: Partial<NotificationTypeSettings> & { subtypes?: Partial<InteractionSubtypes> };
  privateMessage?: Partial<NotificationTypeSettings>;
  doNotDisturb?: Partial<DoNotDisturbSettings>;
  digestTime?: Partial<DigestTimeSettings>;
};

// 通知筛选器
export interface NotificationFilter {
  type?: 'all' | NotificationType;
  isRead?: boolean;
}

// 通知列表响应
export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 未读数响应
export interface UnreadCountResponse {
  total: number;
  byType: {
    system: number;
    interaction: number;
    private_message: number;
  };
}

// 推送订阅
export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  toJSON?: () => { keys: { p256dh: string; auth: string } };
}

// 通知状态
export type NotificationStatus = 'idle' | 'loading' | 'error' | 'success';

// 通知分组
export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

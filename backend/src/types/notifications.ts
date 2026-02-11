/**
 * 通知系统类型定义
 * 
 * @version 1.0.0
 */

// 通知类型
export type NotificationType = 'system' | 'interaction' | 'private_message';

// 通知子类型
export type NotificationSubtype = 
  // 系统子类型
  | 'maintenance' 
  | 'update' 
  | 'announcement'
  // 互动子类型
  | 'comment' 
  | 'like' 
  | 'favorite' 
  | 'mention' 
  | 'follow' 
  | 'reply'
  // 私信
  | 'private_message';

// 通知频率
export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'off';

// 通知渠道
export type NotificationChannel = 'in_app' | 'email' | 'push';

// 汇总类型
export type DigestType = 'daily' | 'weekly';

// 关联数据
export interface NotificationRelatedData {
  postId?: number;
  postTitle?: string;
  postSlug?: string;
  commentId?: number;
  commentContent?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  messageId?: number;
  messageContent?: string;
  [key: string]: any;
}

// 通知记录（数据库模型）
export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  subtype?: NotificationSubtype;
  title: string;
  content?: string;
  relatedData?: NotificationRelatedData;
  messageId?: number;
  isInAppSent: boolean;
  isEmailSent: boolean;
  isPushSent: boolean;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

// 通知类型设置
export interface NotificationTypeSettings {
  inApp: boolean;
  email: boolean;
  push: boolean;
  frequency: NotificationFrequency;
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
  start?: string;  // HH:mm 格式
  end?: string;
  timezone: string;
}

// 汇总时间设置
export interface DigestTimeSettings {
  daily: string;  // HH:mm 格式
  weeklyDay: number;  // 0=周日, 1=周一, ..., 6=周六
  weeklyTime: string;  // HH:mm 格式
}

// 用户通知设置（数据库模型）
export interface NotificationSettings {
  id?: number;
  userId: number;
  system: NotificationTypeSettings;
  interaction: NotificationTypeSettings & { subtypes: InteractionSubtypes };
  privateMessage: NotificationTypeSettings;
  doNotDisturb: DoNotDisturbSettings;
  digestTime: DigestTimeSettings;
  createdAt?: string;
  updatedAt?: string;
}

// 推送订阅（数据库模型）
export interface PushSubscription {
  id?: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: string;
  isActive: boolean;
  createdAt?: string;
  lastUsedAt?: string;
}

// 邮件汇总队列（数据库模型）
export interface EmailDigestQueue {
  id?: number;
  userId: number;
  notificationId: number;
  digestType: DigestType;
  scheduledAt: string;
  isSent: boolean;
  sentAt?: string;
}

// 创建通知请求
export interface CreateNotificationRequest {
  userId: number;
  type: NotificationType;
  subtype?: NotificationSubtype;
  title: string;
  content?: string;
  relatedData?: NotificationRelatedData;
  messageId?: number;
}

// 发送通知选项
export interface SendNotificationOptions {
  skipInApp?: boolean;
  skipEmail?: boolean;
  skipPush?: boolean;
}

// 通知列表查询参数
export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
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

// 推送订阅请求
export interface PushSubscribeRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string;
}

// 推送订阅响应
export interface PushSubscriptionResponse {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// 管理员发送系统通知请求
export interface AdminSendNotificationRequest {
  title: string;
  content?: string;
  target: 'all' | 'specific_users';
  userIds?: number[];
  channels: NotificationChannel[];
}

// 管理员发送通知响应
export interface AdminSendNotificationResponse {
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

// 通知设置更新请求
export interface UpdateNotificationSettingsRequest {
  system?: Partial<NotificationTypeSettings>;
  interaction?: Partial<NotificationTypeSettings> & { subtypes?: Partial<InteractionSubtypes> };
  privateMessage?: Partial<NotificationTypeSettings>;
  doNotDisturb?: Partial<DoNotDisturbSettings>;
  digestTime?: Partial<DigestTimeSettings>;
}

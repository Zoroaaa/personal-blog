/**
 * 私信服务层
 *
 * 功能：
 * - 发送/接收私信
 * - 会话管理
 * - 未读消息统计
 * - 消息软删除
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import type { D1Database } from '@cloudflare/workers-types';

// ============= 类型定义 =============

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  subject?: string;
  content: string;
  threadId: string;
  replyToId?: number;
  isRead: boolean;
  readAt?: string;
  senderDeleted: boolean;
  senderDeletedAt?: string;
  recipientDeleted: boolean;
  recipientDeletedAt?: string;
  createdAt: string;
  // 关联用户信息
  senderUsername?: string;
  senderName?: string;
  senderAvatar?: string;
  recipientUsername?: string;
  recipientName?: string;
  recipientAvatar?: string;
}

export interface MessageThread {
  threadId: string;
  otherUserId: number;
  otherUsername: string;
  otherName: string;
  otherAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  totalMessages: number;
}

export interface SendMessageRequest {
  recipientId: number;
  subject?: string;
  content: string;
  replyToId?: number;
}

export interface MessageListParams {
  page?: number;
  limit?: number;
  threadId?: string;
}

export interface MessageListResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============= 常量 =============

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// ============= 核心功能 =============

/**
 * 生成会话线程ID
 * 格式：min(userId1, userId2)-max(userId1, userId2)
 * 保证同一对用户的会话ID始终相同
 */
export function generateThreadId(userId1: number, userId2: number): string {
  const min = Math.min(userId1, userId2);
  const max = Math.max(userId1, userId2);
  return `${min}-${max}`;
}

/**
 * 发送私信
 */
export async function sendMessage(
  db: D1Database,
  senderId: number,
  data: SendMessageRequest
): Promise<Message | null> {
  try {
    const { recipientId, subject, content, replyToId } = data;

    // 验证接收者存在
    const recipient = await db.prepare(
      'SELECT id, username FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(recipientId).first();

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // 不能给自己发私信
    if (senderId === recipientId) {
      throw new Error('Cannot send message to yourself');
    }

    // 生成会话ID
    const threadId = generateThreadId(senderId, recipientId);

    // 如果是回复，验证原消息存在且属于该会话
    if (replyToId) {
      const originalMessage = await db.prepare(
        'SELECT id, thread_id FROM messages WHERE id = ?'
      ).bind(replyToId).first() as any;

      if (!originalMessage || originalMessage.thread_id !== threadId) {
        throw new Error('Invalid reply target');
      }
    }

    // 插入消息
    const result = await db.prepare(`
      INSERT INTO messages (
        sender_id, recipient_id, subject, content, thread_id, reply_to_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      senderId,
      recipientId,
      subject || null,
      content,
      threadId,
      replyToId || null
    ).run();

    if (!result.success) {
      throw new Error('Failed to send message');
    }

    const messageId = result.meta.last_row_id;

    // 获取完整消息信息
    const message = await getMessageById(db, messageId, senderId);
    
    // 注意：通知将由数据库触发器自动创建（见 migration SQL）
    
    return message;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
}

/**
 * 根据ID获取消息
 */
export async function getMessageById(
  db: D1Database,
  messageId: number,
  userId: number
): Promise<Message | null> {
  try {
    const row = await db.prepare(`
      SELECT 
        m.*,
        sender.username as sender_username,
        sender.display_name as sender_name,
        sender.avatar_url as sender_avatar,
        recipient.username as recipient_username,
        recipient.display_name as recipient_name,
        recipient.avatar_url as recipient_avatar
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.id = ?
        AND (m.sender_id = ? OR m.recipient_id = ?)
        AND (
          (m.sender_id = ? AND m.sender_deleted = 0) OR
          (m.recipient_id = ? AND m.recipient_deleted = 0)
        )
    `).bind(messageId, userId, userId, userId, userId).first();

    if (!row) return null;

    return mapMessageFromRow(row);
  } catch (error) {
    console.error('Get message by id error:', error);
    return null;
  }
}

/**
 * 获取收件箱（接收到的消息）
 */
export async function getInbox(
  db: D1Database,
  userId: number,
  params: MessageListParams = {}
): Promise<MessageListResponse> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    let whereClause = 'm.recipient_id = ? AND m.recipient_deleted = 0';
    const bindings: any[] = [userId];

    if (params.threadId) {
      whereClause += ' AND m.thread_id = ?';
      bindings.push(params.threadId);
    }

    // 获取总数
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM messages m WHERE ${whereClause}`
    ).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

    // 获取消息列表
    const rows = await db.prepare(`
      SELECT 
        m.*,
        sender.username as sender_username,
        sender.display_name as sender_name,
        sender.avatar_url as sender_avatar,
        recipient.username as recipient_username,
        recipient.display_name as recipient_name,
        recipient.avatar_url as recipient_avatar
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    const messages = (rows.results || []).map(mapMessageFromRow);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get inbox error:', error);
    return {
      messages: [],
      pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 },
    };
  }
}

/**
 * 获取发件箱（发送的消息）
 */
export async function getOutbox(
  db: D1Database,
  userId: number,
  params: MessageListParams = {}
): Promise<MessageListResponse> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    let whereClause = 'm.sender_id = ? AND m.sender_deleted = 0';
    const bindings: any[] = [userId];

    if (params.threadId) {
      whereClause += ' AND m.thread_id = ?';
      bindings.push(params.threadId);
    }

    // 获取总数
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM messages m WHERE ${whereClause}`
    ).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

    // 获取消息列表
    const rows = await db.prepare(`
      SELECT 
        m.*,
        sender.username as sender_username,
        sender.display_name as sender_name,
        sender.avatar_url as sender_avatar,
        recipient.username as recipient_username,
        recipient.display_name as recipient_name,
        recipient.avatar_url as recipient_avatar
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    const messages = (rows.results || []).map(mapMessageFromRow);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get outbox error:', error);
    return {
      messages: [],
      pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 },
    };
  }
}

/**
 * 获取会话列表
 */
export async function getThreads(
  db: D1Database,
  userId: number,
  params: MessageListParams = {}
): Promise<{ threads: MessageThread[]; pagination: any }> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    // 获取用户参与的所有会话
    const rows = await db.prepare(`
      WITH thread_messages AS (
        SELECT 
          m.thread_id,
          m.content as last_message,
          m.created_at as last_message_at,
          m.sender_id,
          m.recipient_id,
          ROW_NUMBER() OVER (PARTITION BY m.thread_id ORDER BY m.created_at DESC) as rn
        FROM messages m
        WHERE (m.sender_id = ? OR m.recipient_id = ?)
          AND ((m.sender_id = ? AND m.sender_deleted = 0) OR (m.recipient_id = ? AND m.recipient_deleted = 0))
      ),
      thread_info AS (
        SELECT 
          thread_id,
          last_message,
          last_message_at,
          CASE 
            WHEN sender_id = ? THEN recipient_id
            ELSE sender_id
          END as other_user_id
        FROM thread_messages
        WHERE rn = 1
      ),
      unread_counts AS (
        SELECT 
          thread_id,
          COUNT(*) as unread_count
        FROM messages
        WHERE recipient_id = ? AND is_read = 0 AND recipient_deleted = 0
        GROUP BY thread_id
      ),
      message_counts AS (
        SELECT 
          thread_id,
          COUNT(*) as total_messages
        FROM messages
        WHERE (sender_id = ? OR recipient_id = ?)
          AND ((sender_id = ? AND sender_deleted = 0) OR (recipient_id = ? AND recipient_deleted = 0))
        GROUP BY thread_id
      )
      SELECT 
        ti.thread_id,
        ti.last_message,
        ti.last_message_at,
        ti.other_user_id,
        u.username as other_username,
        u.display_name as other_name,
        u.avatar_url as other_avatar,
        COALESCE(uc.unread_count, 0) as unread_count,
        mc.total_messages
      FROM thread_info ti
      LEFT JOIN users u ON ti.other_user_id = u.id
      LEFT JOIN unread_counts uc ON ti.thread_id = uc.thread_id
      LEFT JOIN message_counts mc ON ti.thread_id = mc.thread_id
      ORDER BY ti.last_message_at DESC
      LIMIT ? OFFSET ?
    `).bind(
      userId, userId, userId, userId, userId,  // thread_messages CTE
      userId,  // unread_counts CTE  
      userId, userId, userId, userId,  // message_counts CTE
      limit, offset
    ).all();

    const threads: MessageThread[] = (rows.results || []).map((row: any) => ({
      threadId: row.thread_id,
      otherUserId: row.other_user_id,
      otherUsername: row.other_username,
      otherName: row.other_name,
      otherAvatar: row.other_avatar,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: row.unread_count,
      totalMessages: row.total_messages,
    }));

    // 获取总会话数
    const countResult = await db.prepare(`
      SELECT COUNT(DISTINCT thread_id) as total
      FROM messages
      WHERE (sender_id = ? OR recipient_id = ?)
        AND ((sender_id = ? AND sender_deleted = 0) OR (recipient_id = ? AND recipient_deleted = 0))
    `).bind(userId, userId, userId, userId).first();

    const total = (countResult?.total as number) || 0;

    return {
      threads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get threads error:', error);
    return {
      threads: [],
      pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 },
    };
  }
}

/**
 * 标记消息为已读
 */
export async function markAsRead(
  db: D1Database,
  messageId: number,
  userId: number
): Promise<boolean> {
  try {
    const result = await db.prepare(`
      UPDATE messages 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_id = ? AND is_read = 0
    `).bind(messageId, userId).run();

    return result.success && (result.meta?.changes || 0) > 0;
  } catch (error) {
    console.error('Mark message as read error:', error);
    return false;
  }
}

/**
 * 标记整个会话为已读
 */
export async function markThreadAsRead(
  db: D1Database,
  threadId: string,
  userId: number
): Promise<number> {
  try {
    const result = await db.prepare(`
      UPDATE messages 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE thread_id = ? AND recipient_id = ? AND is_read = 0
    `).bind(threadId, userId).run();

    return result.meta?.changes || 0;
  } catch (error) {
    console.error('Mark thread as read error:', error);
    return 0;
  }
}

/**
 * 删除消息（软删除）
 */
export async function deleteMessage(
  db: D1Database,
  messageId: number,
  userId: number
): Promise<boolean> {
  try {
    // 判断用户是发送者还是接收者
    const message = await db.prepare(
      'SELECT sender_id, recipient_id FROM messages WHERE id = ?'
    ).bind(messageId).first() as any;

    if (!message) return false;

    let column: string;
    if (message.sender_id === userId) {
      column = 'sender_deleted = 1, sender_deleted_at = CURRENT_TIMESTAMP';
    } else if (message.recipient_id === userId) {
      column = 'recipient_deleted = 1, recipient_deleted_at = CURRENT_TIMESTAMP';
    } else {
      return false;  // 用户不是消息参与者
    }

    const result = await db.prepare(
      `UPDATE messages SET ${column} WHERE id = ?`
    ).bind(messageId).run();

    return result.success && (result.meta?.changes || 0) > 0;
  } catch (error) {
    console.error('Delete message error:', error);
    return false;
  }
}

/**
 * 删除整个会话（软删除）
 */
export async function deleteThread(
  db: D1Database,
  threadId: string,
  userId: number
): Promise<number> {
  try {
    // 根据用户角色标记删除
    const result = await db.prepare(`
      UPDATE messages 
      SET 
        sender_deleted = CASE WHEN sender_id = ? THEN 1 ELSE sender_deleted END,
        sender_deleted_at = CASE WHEN sender_id = ? THEN CURRENT_TIMESTAMP ELSE sender_deleted_at END,
        recipient_deleted = CASE WHEN recipient_id = ? THEN 1 ELSE recipient_deleted END,
        recipient_deleted_at = CASE WHEN recipient_id = ? THEN CURRENT_TIMESTAMP ELSE recipient_deleted_at END
      WHERE thread_id = ?
        AND (sender_id = ? OR recipient_id = ?)
    `).bind(userId, userId, userId, userId, threadId, userId, userId).run();

    return result.meta?.changes || 0;
  } catch (error) {
    console.error('Delete thread error:', error);
    return 0;
  }
}

/**
 * 获取未读消息数
 */
export async function getUnreadCount(
  db: D1Database,
  userId: number
): Promise<number> {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE recipient_id = ? AND is_read = 0 AND recipient_deleted = 0
    `).bind(userId).first();

    return (result?.count as number) || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
}

// ============= 辅助函数 =============

/**
 * 映射数据库行为Message对象
 */
function mapMessageFromRow(row: any): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    subject: row.subject,
    content: row.content,
    threadId: row.thread_id,
    replyToId: row.reply_to_id,
    isRead: row.is_read === 1,
    readAt: row.read_at,
    senderDeleted: row.sender_deleted === 1,
    senderDeletedAt: row.sender_deleted_at,
    recipientDeleted: row.recipient_deleted === 1,
    recipientDeletedAt: row.recipient_deleted_at,
    createdAt: row.created_at,
    senderUsername: row.sender_username,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    recipientUsername: row.recipient_username,
    recipientName: row.recipient_name,
    recipientAvatar: row.recipient_avatar,
  };
}

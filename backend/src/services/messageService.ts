/**
 * 私信服务层
 *
 * 功能：
 * - 发送/接收私信
 * - 会话管理
 * - 未读消息统计
 * - 消息撤回功能
 * - 图片/附件消息支持
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-13
 * @updated 2026-02-15
 */

import type { D1Database } from '@cloudflare/workers-types';
import { isStrangerMessageAllowed } from './messageSettingsService';

export type MessageType = 'text' | 'image' | 'attachment' | 'mixed';

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
  isRecalled: boolean;
  recalledAt?: string;
  messageType: MessageType;
  attachmentUrl?: string;
  attachmentFilename?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  createdAt: string;
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
  messageType?: MessageType;
  attachmentUrl?: string;
  attachmentFilename?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
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

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RECALL_TIME_LIMIT_MS = 3 * 60 * 1000;

export function generateThreadId(userId1: number, userId2: number): string {
  const min = Math.min(userId1, userId2);
  const max = Math.max(userId1, userId2);
  return `${min}-${max}`;
}

export async function sendMessage(
  db: D1Database,
  senderId: number,
  data: SendMessageRequest
): Promise<Message | null> {
  try {
    const {
      recipientId,
      subject,
      content,
      replyToId,
      messageType = 'text',
      attachmentUrl,
      attachmentFilename,
      attachmentSize,
      attachmentMimeType
    } = data;

    const recipient = await db.prepare(
      'SELECT id, username FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(recipientId).first();

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (senderId === recipientId) {
      throw new Error('Cannot send message to yourself');
    }

    const allowStrangers = await isStrangerMessageAllowed(db, recipientId);
    if (!allowStrangers) {
      const existingThread = await db.prepare(`
        SELECT thread_id FROM messages 
        WHERE thread_id = ? AND (sender_id = ? OR recipient_id = ?)
        LIMIT 1
      `).bind(
        generateThreadId(senderId, recipientId),
        recipientId,
        recipientId
      ).first();

      if (!existingThread) {
        throw new Error('Recipient does not accept messages from strangers');
      }
    }

    const threadId = generateThreadId(senderId, recipientId);

    if (replyToId) {
      const originalMessage = await db.prepare(
        'SELECT id, thread_id FROM messages WHERE id = ?'
      ).bind(replyToId).first() as any;

      if (!originalMessage || originalMessage.thread_id !== threadId) {
        throw new Error('Invalid reply target');
      }
    }

    const result = await db.prepare(`
      INSERT INTO messages (
        sender_id, recipient_id, subject, content, thread_id, reply_to_id,
        message_type, attachment_url, attachment_filename, attachment_size, attachment_mime_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      senderId,
      recipientId,
      subject || null,
      content,
      threadId,
      replyToId || null,
      messageType,
      attachmentUrl || null,
      attachmentFilename || null,
      attachmentSize || null,
      attachmentMimeType || null
    ).run();

    if (!result.success) {
      throw new Error('Failed to send message');
    }

    const messageId = result.meta.last_row_id;

    const message = await getMessageById(db, messageId, senderId);
    
    return message;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
}

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
    `).bind(messageId, userId, userId).first();

    if (!row) return null;

    return mapMessageFromRow(row);
  } catch (error) {
    console.error('Get message by id error:', error);
    return null;
  }
}

export async function getInbox(
  db: D1Database,
  userId: number,
  params: MessageListParams = {}
): Promise<MessageListResponse> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    let whereClause = 'm.recipient_id = ? AND m.is_recalled = 0';
    const bindings: any[] = [userId];

    if (params.threadId) {
      whereClause += ' AND m.thread_id = ?';
      bindings.push(params.threadId);
    }

    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM messages m WHERE ${whereClause}`
    ).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

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

export async function getOutbox(
  db: D1Database,
  userId: number,
  params: MessageListParams = {}
): Promise<MessageListResponse> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    let whereClause = 'm.sender_id = ?';
    const bindings: any[] = [userId];

    if (params.threadId) {
      whereClause += ' AND m.thread_id = ?';
      bindings.push(params.threadId);
    }

    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM messages m WHERE ${whereClause}`
    ).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

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

export async function getThreads(
  db: D1Database,
  userId: number,
  params: MessageListParams = {}
): Promise<{ threads: MessageThread[]; pagination: any }> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const rows = await db.prepare(`
      WITH thread_messages AS (
        SELECT 
          m.thread_id,
          m.content as last_message,
          m.created_at as last_message_at,
          m.sender_id,
          m.recipient_id,
          m.is_recalled,
          m.message_type,
          m.attachment_filename,
          ROW_NUMBER() OVER (PARTITION BY m.thread_id ORDER BY m.created_at DESC) as rn
        FROM messages m
        WHERE (m.sender_id = ? OR m.recipient_id = ?)
      ),
      thread_info AS (
        SELECT 
          thread_id,
          last_message,
          last_message_at,
          is_recalled,
          message_type,
          attachment_filename,
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
        WHERE recipient_id = ? AND is_read = 0 AND is_recalled = 0
        GROUP BY thread_id
      ),
      message_counts AS (
        SELECT 
          thread_id,
          COUNT(*) as total_messages
        FROM messages
        WHERE (sender_id = ? OR recipient_id = ?)
        GROUP BY thread_id
      )
      SELECT 
        ti.thread_id,
        ti.last_message,
        ti.last_message_at,
        ti.is_recalled,
        ti.message_type,
        ti.attachment_filename,
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
      userId, userId, userId,
      userId,
      userId, userId,
      limit, offset
    ).all();

    const threads: MessageThread[] = (rows.results || []).map((row: any) => {
      let lastMessage = row.last_message || '';
      
      if (row.is_recalled === 1) {
        lastMessage = '[消息已撤回]';
      } else if (row.message_type === 'image') {
        lastMessage = '[图片]';
      } else if (row.message_type === 'attachment') {
        lastMessage = `[附件] ${row.attachment_filename || '文件'}`;
      } else if (row.message_type === 'mixed' && row.attachment_filename) {
        lastMessage = `${lastMessage.substring(0, 20)}... [附件]`;
      }
      
      return {
        threadId: row.thread_id,
        otherUserId: row.other_user_id,
        otherUsername: row.other_username,
        otherName: row.other_name,
        otherAvatar: row.other_avatar,
        lastMessage,
        lastMessageAt: row.last_message_at,
        unreadCount: row.unread_count,
        totalMessages: row.total_messages,
      };
    });

    const countResult = await db.prepare(`
      SELECT COUNT(DISTINCT thread_id) as total
      FROM messages
      WHERE (sender_id = ? OR recipient_id = ?)
    `).bind(userId, userId).first();

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

export async function recallMessage(
  db: D1Database,
  messageId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = await db.prepare(`
      SELECT id, sender_id, created_at, is_recalled
      FROM messages 
      WHERE id = ?
    `).bind(messageId).first() as any;

    if (!message) {
      return { success: false, error: '消息不存在' };
    }

    if (message.sender_id !== userId) {
      return { success: false, error: '只能撤回自己发送的消息' };
    }

    if (message.is_recalled === 1) {
      return { success: false, error: '消息已被撤回' };
    }

    const createdAt = new Date(message.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();

    if (timeDiff > RECALL_TIME_LIMIT_MS) {
      return { success: false, error: '消息发送超过3分钟，无法撤回' };
    }

    const result = await db.prepare(`
      UPDATE messages 
      SET is_recalled = 1, recalled_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sender_id = ? AND is_recalled = 0
    `).bind(messageId, userId).run();

    if (result.success && (result.meta?.changes || 0) > 0) {
      return { success: true };
    }

    return { success: false, error: '撤回失败' };
  } catch (error) {
    console.error('Recall message error:', error);
    return { success: false, error: '撤回消息时发生错误' };
  }
}

export interface ResendMessageRequest {
  content: string;
  messageType?: MessageType;
  attachmentUrl?: string;
  attachmentFilename?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
}

export async function resendMessage(
  db: D1Database,
  messageId: number,
  userId: number,
  data: ResendMessageRequest
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    const message = await db.prepare(`
      SELECT id, sender_id, is_recalled, thread_id
      FROM messages 
      WHERE id = ?
    `).bind(messageId).first() as any;

    if (!message) {
      return { success: false, error: '消息不存在' };
    }

    if (message.sender_id !== userId) {
      return { success: false, error: '只能重新发送自己发送的消息' };
    }

    if (!message.is_recalled) {
      return { success: false, error: '只能重新发送已撤回的消息' };
    }

    const {
      content,
      messageType = 'text',
      attachmentUrl,
      attachmentFilename,
      attachmentSize,
      attachmentMimeType
    } = data;

    const result = await db.prepare(`
      UPDATE messages 
      SET 
        content = ?,
        message_type = ?,
        attachment_url = ?,
        attachment_filename = ?,
        attachment_size = ?,
        attachment_mime_type = ?,
        is_recalled = 0,
        recalled_at = NULL,
        created_at = CURRENT_TIMESTAMP,
        is_read = 0,
        read_at = NULL
      WHERE id = ? AND sender_id = ? AND is_recalled = 1
    `).bind(
      content,
      messageType,
      attachmentUrl || null,
      attachmentFilename || null,
      attachmentSize || null,
      attachmentMimeType || null,
      messageId,
      userId
    ).run();

    if (result.success && (result.meta?.changes || 0) > 0) {
      const updatedMessage = await getMessageById(db, messageId, userId);
      return { success: true, message: updatedMessage || undefined };
    }

    return { success: false, error: '重新发送失败' };
  } catch (error) {
    console.error('Resend message error:', error);
    return { success: false, error: '重新发送消息时发生错误' };
  }
}

export async function canRecallMessage(
  db: D1Database,
  messageId: number,
  userId: number
): Promise<boolean> {
  try {
    const message = await db.prepare(`
      SELECT sender_id, created_at, is_recalled
      FROM messages 
      WHERE id = ?
    `).bind(messageId).first() as any;

    if (!message) return false;
    if (message.sender_id !== userId) return false;
    if (message.is_recalled === 1) return false;

    const createdAt = new Date(message.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();

    return timeDiff <= RECALL_TIME_LIMIT_MS;
  } catch (error) {
    console.error('Check recall status error:', error);
    return false;
  }
}

export async function getUnreadCount(
  db: D1Database,
  userId: number
): Promise<number> {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE recipient_id = ? AND is_read = 0 AND is_recalled = 0
    `).bind(userId).first();

    return (result?.count as number) || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
}

export async function getThreadMessages(
  db: D1Database,
  userId: number,
  threadId: string,
  params: MessageListParams = {}
): Promise<MessageListResponse> {
  try {
    const page = Math.max(1, params.page || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const whereClause = `
      m.thread_id = ? 
      AND (m.sender_id = ? OR m.recipient_id = ?)
    `;
    const bindings: any[] = [threadId, userId, userId];

    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM messages m WHERE ${whereClause}`
    ).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

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
    console.error('Get thread messages error:', error);
    return {
      messages: [],
      pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 },
    };
  }
}

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
    isRecalled: row.is_recalled === 1,
    recalledAt: row.recalled_at,
    messageType: row.message_type || 'text',
    attachmentUrl: row.attachment_url,
    attachmentFilename: row.attachment_filename,
    attachmentSize: row.attachment_size,
    attachmentMimeType: row.attachment_mime_type,
    createdAt: row.created_at,
    senderUsername: row.sender_username,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    recipientUsername: row.recipient_username,
    recipientName: row.recipient_name,
    recipientAvatar: row.recipient_avatar,
  };
}

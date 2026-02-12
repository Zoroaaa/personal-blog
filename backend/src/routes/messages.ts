/**
 * 私信功能路由
 * 
 * 功能：
 * - 发送私信
 * - 获取私信列表（会话列表）
 * - 获取与特定用户的对话
 * - 标记私信为已读
 * - 撤回私信（3分钟内）
 * - 编辑撤回的消息并重新发送
 * - 获取未读消息数
 * - 管理员：获取全站所有私信
 * 
 * @version 2.0.0
 * @author 博客系统
 * @created 2024-01-01
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { createPrivateMessageNotification } from '../services/notificationService';

export const messageRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 常量配置 =============

const MESSAGES_PER_PAGE = 20;
const MAX_MESSAGE_LENGTH = 2000;
const RECALL_TIME_LIMIT = 3 * 60 * 1000; // 3分钟（毫秒）

// ============= 辅助函数 =============

/**
 * 格式化时间戳为 YYYY-MM-DD HH:MM
 */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * XSS防护：清理消息内容
 */
function sanitizeMessageContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// ============= 发送私信 =============

/**
 * POST /api/messages
 * 发送私信
 */
messageRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const { receiverId, content, attachments } = await c.req.json();
    
    if (!receiverId) {
      return c.json(errorResponse('Missing required fields', '请提供接收者ID'), 400);
    }
    
    if ((!content || content.trim() === '') && (!attachments || attachments.length === 0)) {
      return c.json(errorResponse('Empty message', '消息内容或附件不能为空'), 400);
    }
    
    if (receiverId === currentUser.userId) {
      return c.json(errorResponse('Invalid receiver', '不能给自己发送私信'), 400);
    }
    
    if (content && content.length > MAX_MESSAGE_LENGTH) {
      return c.json(errorResponse('Message too long', `消息内容不能超过 ${MAX_MESSAGE_LENGTH} 个字符`), 400);
    }
    
    // 检查发送者状态
    if (currentUser.status !== 'active') {
      return c.json(errorResponse('Sender not active', '您的账号状态异常，无法发送私信'), 403);
    }
    
    const receiver = await c.env.DB.prepare(
      'SELECT id, username, display_name, avatar_url, role FROM users WHERE id = ? AND status = ?'
    ).bind(receiverId, 'active').first() as any;
    
    if (!receiver) {
      return c.json(errorResponse('Receiver not found', '接收者不存在或账号已被禁用'), 404);
    }
    
    // 允许所有活跃用户之间发送私信
    if (currentUser.role === 'suspended') {
      return c.json(errorResponse('Permission denied', '无法向非活跃用户发送私信'), 403);
    }
    
    const sanitizedContent = content ? sanitizeMessageContent(content) : '';
    const hasAttachments = attachments && attachments.length > 0;
    
    const result = await c.env.DB.prepare(
      `INSERT INTO messages (sender_id, receiver_id, content, has_attachments, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(currentUser.userId, receiverId, sanitizedContent, hasAttachments ? 1 : 0).run();
    
    if (!result.success) {
      throw new Error('Failed to send message');
    }
    
    const messageId = result.meta.last_row_id;
    
    let savedAttachments: any[] = [];
    if (hasAttachments) {
      for (const attachment of attachments) {
        const attachResult = await c.env.DB.prepare(
          `INSERT INTO message_attachments (message_id, file_name, file_url, file_type, file_size)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(messageId, attachment.fileName, attachment.fileUrl, attachment.fileType, attachment.fileSize || 0).run();
        
        if (attachResult.success) {
          savedAttachments.push({ id: attachResult.meta.last_row_id, ...attachment });
        }
      }
    }
    
    const sender = await c.env.DB.prepare(
      'SELECT username, display_name, avatar_url FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as any;
    
    logger.info('Message sent', { messageId, senderId: currentUser.userId, receiverId });

    try {
      const notifyContent = savedAttachments.length > 0 
        ? `[图片] ${sanitizedContent.substring(0, 50)}`
        : (sanitizedContent.length > 100 ? sanitizedContent.substring(0, 100) + '...' : sanitizedContent);
            
      await createPrivateMessageNotification(c.env.DB, {
            userId: receiverId,
            title: `${sender.display_name || sender.username} 发来一条私信`,
            content: notifyContent,
            messageId: messageId,
            relatedData: {
              senderId: currentUser.userId,
              senderName: sender.display_name || sender.username,
              senderAvatar: sender.avatar_url,
              messageId: messageId,
              hasAttachments: savedAttachments.length > 0
            },
          }, c.env);
    } catch (notifyError) {
      logger.error('Send message notification error', notifyError);
    }

    return c.json(successResponse({
      message: {
        id: messageId,
        senderId: currentUser.userId,
        senderUsername: sender.username,
        senderDisplayName: sender.display_name,
        senderAvatarUrl: sender.avatar_url,
        receiverId: receiverId,
        receiverUsername: receiver.username,
        receiverDisplayName: receiver.display_name,
        receiverAvatarUrl: receiver.avatar_url,
        content: sanitizedContent,
        isRead: 0,
        isRecalled: 0,
        hasAttachments: savedAttachments.length > 0,
        attachments: savedAttachments,
        createdAt: formatDateTime(new Date().toISOString())
      }
    }, '私信发送成功'), 201);

  } catch (error) {
    logger.error('Send message error', error);
    return c.json(errorResponse('Failed to send message', '发送私信失败，请稍后重试'), 500);
  }
});

// ============= 撤回消息 =============

/**
 * PUT /api/messages/:id/recall
 * 撤回消息（3分钟内可撤回）
 */
messageRoutes.put('/:id/recall', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const messageId = parseInt(c.req.param('id'));
    
    if (isNaN(messageId)) {
      return c.json(errorResponse('Invalid message ID', '无效的消息ID'), 400);
    }
    
    const message = await c.env.DB.prepare(
      'SELECT * FROM messages WHERE id = ?'
    ).bind(messageId).first() as any;
    
    if (!message) {
      return c.json(errorResponse('Message not found', '消息不存在'), 404);
    }
    
    // 只有发送者可以撤回
    if (message.sender_id !== currentUser.userId) {
      return c.json(errorResponse('Forbidden', '只能撤回自己发送的消息'), 403);
    }
    
    // 检查是否已撤回
    if (message.is_recalled === 1) {
      return c.json(errorResponse('Already recalled', '消息已被撤回'), 400);
    }
    
    // 检查是否在3分钟内
    const createdAt = new Date(message.created_at).getTime();
    const now = Date.now();
    if (now - createdAt > RECALL_TIME_LIMIT) {
      return c.json(errorResponse('Recall timeout', '消息发送超过3分钟，无法撤回'), 400);
    }
    
    // 标记为撤回
    await c.env.DB.prepare(
      'UPDATE messages SET is_recalled = 1, recalled_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(messageId).run();
    
    logger.info('Message recalled', { messageId, userId: currentUser.userId });
    
    return c.json(successResponse({ recalled: true }, '消息已撤回，您可以编辑后重新发送'));
    
  } catch (error) {
    logger.error('Recall message error', error);
    return c.json(errorResponse('Failed to recall message', '撤回消息失败'), 500);
  }
});

// ============= 编辑并重新发送撤回的消息 =============

/**
 * PUT /api/messages/:id/edit
 * 编辑撤回的消息并重新发送
 */
messageRoutes.put('/:id/edit', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const messageId = parseInt(c.req.param('id'));
    const { content, attachments } = await c.req.json();
    
    if (isNaN(messageId)) {
      return c.json(errorResponse('Invalid message ID', '无效的消息ID'), 400);
    }
    
    if ((!content || content.trim() === '') && (!attachments || attachments.length === 0)) {
      return c.json(errorResponse('Empty message', '消息内容或附件不能为空'), 400);
    }
    
    const message = await c.env.DB.prepare(
      'SELECT * FROM messages WHERE id = ?'
    ).bind(messageId).first() as any;
    
    if (!message) {
      return c.json(errorResponse('Message not found', '消息不存在'), 404);
    }
    
    // 只有发送者可以编辑
    if (message.sender_id !== currentUser.userId) {
      return c.json(errorResponse('Forbidden', '无权编辑此消息'), 403);
    }
    
    // 检查是否已撤回
    if (message.is_recalled !== 1) {
      return c.json(errorResponse('Not recalled', '只能编辑已撤回的消息'), 400);
    }
    
    const sanitizedContent = content ? sanitizeMessageContent(content) : '';
    const hasAttachments = attachments && attachments.length > 0;
    
    // 更新消息内容
    await c.env.DB.prepare(
      'UPDATE messages SET content = ?, has_attachments = ?, is_recalled = 0, recalled_at = NULL WHERE id = ?'
    ).bind(sanitizedContent, hasAttachments ? 1 : 0, messageId).run();
    
    // 删除旧附件
    await c.env.DB.prepare('DELETE FROM message_attachments WHERE message_id = ?').bind(messageId).run();
    
    // 保存新附件
    let savedAttachments: any[] = [];
    if (hasAttachments) {
      for (const attachment of attachments) {
        const attachResult = await c.env.DB.prepare(
          `INSERT INTO message_attachments (message_id, file_name, file_url, file_type, file_size)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(messageId, attachment.fileName, attachment.fileUrl, attachment.fileType, attachment.fileSize || 0).run();
        
        if (attachResult.success) {
          savedAttachments.push({ id: attachResult.meta.last_row_id, ...attachment });
        }
      }
    }
    
    const sender = await c.env.DB.prepare(
      'SELECT username, display_name, avatar_url FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as any;
    
    const receiver = await c.env.DB.prepare(
      'SELECT username, display_name, avatar_url FROM users WHERE id = ?'
    ).bind(message.receiver_id).first() as any;
    
    logger.info('Message edited and resent', { messageId, userId: currentUser.userId });
    
    return c.json(successResponse({
      message: {
        id: messageId,
        senderId: currentUser.userId,
        senderUsername: sender.username,
        senderDisplayName: sender.display_name,
        senderAvatarUrl: sender.avatar_url,
        receiverId: message.receiver_id,
        receiverUsername: receiver.username,
        receiverDisplayName: receiver.display_name,
        receiverAvatarUrl: receiver.avatar_url,
        content: sanitizedContent,
        isRead: message.is_read,
        isRecalled: 0,
        hasAttachments: savedAttachments.length > 0,
        attachments: savedAttachments,
        createdAt: formatDateTime(message.created_at)
      }
    }, '消息已编辑并重新发送'));
    
  } catch (error) {
    logger.error('Edit message error', error);
    return c.json(errorResponse('Failed to edit message', '编辑消息失败'), 500);
  }
});

// ============= 获取会话列表 =============

messageRoutes.get('/conversations', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || String(MESSAGES_PER_PAGE)), 50);
    const offset = (page - 1) * limit;
    
    const conversations = await c.env.DB.prepare(
      `WITH user_conversations AS (
        SELECT 
          CASE 
            WHEN sender_id = ? THEN receiver_id
            ELSE sender_id
          END AS partner_id,
          MAX(created_at) AS last_message_time
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY partner_id
      )
      SELECT 
        m.*,
        s.username AS sender_username,
        s.display_name AS sender_display_name,
        s.avatar_url AS sender_avatar_url,
        r.username AS receiver_username,
        r.display_name AS receiver_display_name,
        r.avatar_url AS receiver_avatar_url
      FROM user_conversations uc
      JOIN messages m ON (
        (m.sender_id = ? AND m.receiver_id = uc.partner_id) OR
        (m.sender_id = uc.partner_id AND m.receiver_id = ?)
      ) AND m.created_at = uc.last_message_time
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(
      currentUser.userId, currentUser.userId, currentUser.userId,
      currentUser.userId, currentUser.userId,
      limit, offset
    ).all() as any;
    
    const conversationsWithUnread = await Promise.all(
      (conversations.results || []).map(async (conv: any) => {
        const partnerId = conv.sender_id === currentUser.userId ? conv.receiver_id : conv.sender_id;
        
        const unreadCount = await c.env.DB.prepare(
          `SELECT COUNT(*) as count FROM messages
           WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`
        ).bind(partnerId, currentUser.userId).first() as any;
        
        return {
          id: conv.id,
          partnerId: partnerId,
          partnerUsername: partnerId === conv.sender_id ? conv.sender_username : conv.receiver_username,
          partnerDisplayName: partnerId === conv.sender_id ? conv.sender_display_name : conv.receiver_display_name,
          partnerAvatarUrl: partnerId === conv.sender_id ? conv.sender_avatar_url : conv.receiver_avatar_url,
          lastMessage: {
            id: conv.id,
            content: conv.is_recalled === 1 ? '消息已撤回' : conv.content,
            isRecalled: conv.is_recalled === 1,
            senderId: conv.sender_id,
            isRead: conv.is_read === 1,
            createdAt: formatDateTime(conv.created_at)
          },
          unreadCount: unreadCount?.count || 0
        };
      })
    );
    
    const totalCount = await c.env.DB.prepare(
      `SELECT COUNT(DISTINCT 
        CASE 
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END
      ) as count
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?`
    ).bind(currentUser.userId, currentUser.userId, currentUser.userId).first() as any;
    
    return c.json(successResponse({
      conversations: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get conversations error', error);
    return c.json(errorResponse('Failed to get conversations', '获取会话列表失败'), 500);
  }
});

// ============= 获取与特定用户的对话 =============

messageRoutes.get('/conversation/:userId', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const partnerId = parseInt(c.req.param('userId'));
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || String(MESSAGES_PER_PAGE)), 50);
    const offset = (page - 1) * limit;
    
    if (isNaN(partnerId)) {
      return c.json(errorResponse('Invalid user ID', '无效的用户ID'), 400);
    }
    
    const partner = await c.env.DB.prepare(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = ?'
    ).bind(partnerId).first() as any;
    
    if (!partner) {
      return c.json(errorResponse('User not found', '用户不存在'), 404);
    }
    
    const messages = await c.env.DB.prepare(
      `SELECT 
        m.*,
        s.username AS sender_username,
        s.display_name AS sender_display_name,
        s.avatar_url AS sender_avatar_url,
        r.username AS receiver_username,
        r.display_name AS receiver_display_name,
        r.avatar_url AS receiver_avatar_url
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR
            (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(currentUser.userId, partnerId, partnerId, currentUser.userId, limit, offset).all() as any;
    
    const totalCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR
             (sender_id = ? AND receiver_id = ?)`
    ).bind(currentUser.userId, partnerId, partnerId, currentUser.userId).first() as any;
    
    // 获取附件
    const messageIds = (messages.results || []).map((msg: any) => msg.id);
    let attachmentsMap: Map<number, any[]> = new Map();
    
    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',');
      const attachments = await c.env.DB.prepare(
        `SELECT * FROM message_attachments WHERE message_id IN (${placeholders})`
      ).bind(...messageIds).all() as any;
      
      (attachments.results || []).forEach((att: any) => {
        if (!attachmentsMap.has(att.message_id)) {
          attachmentsMap.set(att.message_id, []);
        }
        attachmentsMap.get(att.message_id)!.push({
          id: att.id,
          fileName: att.file_name,
          fileUrl: att.file_url,
          fileType: att.file_type,
          fileSize: att.file_size
        });
      });
    }
    
    const formattedMessages = await Promise.all((messages.results || []).map(async (msg: any) => {
      const messageAttachments = attachmentsMap.get(msg.id) || [];
      
      return {
        id: msg.id,
        senderId: msg.sender_id,
        senderUsername: msg.sender_username,
        senderDisplayName: msg.sender_display_name,
        senderAvatarUrl: msg.sender_avatar_url,
        receiverId: msg.receiver_id,
        receiverUsername: msg.receiver_username,
        receiverDisplayName: msg.receiver_display_name,
        receiverAvatarUrl: msg.receiver_avatar_url,
        content: msg.is_recalled === 1 ? '消息已撤回' : msg.content,
        originalContent: msg.content,
        isRecalled: msg.is_recalled === 1,
        isRead: msg.is_read === 1,
        hasAttachments: msg.has_attachments === 1,
        attachments: msg.is_recalled === 1 ? [] : messageAttachments,
        createdAt: formatDateTime(msg.created_at),
        readAt: msg.read_at ? formatDateTime(msg.read_at) : null,
        canRecall: msg.sender_id === currentUser.userId && 
                   msg.is_recalled === 0 && 
                   (Date.now() - new Date(msg.created_at).getTime()) <= RECALL_TIME_LIMIT
      };
    }));
    
    // 标记对方发送的消息为已读
    await c.env.DB.prepare(
      `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`
    ).bind(partnerId, currentUser.userId).run();
    
    return c.json(successResponse({
      partner: {
        id: partner.id,
        username: partner.username,
        displayName: partner.display_name,
        avatarUrl: partner.avatar_url
      },
      messages: formattedMessages.reverse(),
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get conversation error', error);
    return c.json(errorResponse('Failed to get conversation', '获取对话失败'), 500);
  }
});

// ============= 标记消息为已读 =============

messageRoutes.put('/:id/read', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const messageId = parseInt(c.req.param('id'));
    
    if (isNaN(messageId)) {
      return c.json(errorResponse('Invalid message ID', '无效的消息ID'), 400);
    }
    
    const message = await c.env.DB.prepare(
      'SELECT id, receiver_id, is_read FROM messages WHERE id = ?'
    ).bind(messageId).first() as any;
    
    if (!message) {
      return c.json(errorResponse('Message not found', '消息不存在'), 404);
    }
    
    if (message.receiver_id !== currentUser.userId) {
      return c.json(errorResponse('Forbidden', '无权操作此消息'), 403);
    }
    
    if (message.is_read === 1) {
      return c.json(successResponse({ marked: true }, '消息已标记为已读'));
    }
    
    await c.env.DB.prepare(
      'UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(messageId).run();
    
    logger.info('Message marked as read', { messageId, userId: currentUser.userId });
    
    return c.json(successResponse({ marked: true }, '消息已标记为已读'));
    
  } catch (error) {
    logger.error('Mark as read error', error);
    return c.json(errorResponse('Failed to mark as read', '标记已读失败'), 500);
  }
});

messageRoutes.put('/read-all', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    
    const result = await c.env.DB.prepare(
      `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE receiver_id = ? AND is_read = 0`
    ).bind(currentUser.userId).run();
    
    logger.info('All messages marked as read', { userId: currentUser.userId });
    
    return c.json(successResponse({ markedCount: result.meta?.changes || 0 }, '所有消息已标记为已读'));
    
  } catch (error) {
    logger.error('Mark all as read error', error);
    return c.json(errorResponse('Failed to mark all as read', '标记全部已读失败'), 500);
  }
});

// ============= 获取未读消息数 =============

messageRoutes.get('/unread-count', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    
    const result = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE receiver_id = ? AND is_read = 0`
    ).bind(currentUser.userId).first() as any;
    
    return c.json(successResponse({ unreadCount: result?.count || 0 }));
    
  } catch (error) {
    logger.error('Get unread count error', error);
    return c.json(errorResponse('Failed to get unread count', '获取未读消息数失败'), 500);
  }
});

// ============= 管理员功能 =============

messageRoutes.get('/admin/all', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    const senderId = c.req.query('senderId');
    const receiverId = c.req.query('receiverId');
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (senderId) {
      whereClause += ' AND m.sender_id = ?';
      params.push(parseInt(senderId));
    }
    
    if (receiverId) {
      whereClause += ' AND m.receiver_id = ?';
      params.push(parseInt(receiverId));
    }
    
    const messages = await c.env.DB.prepare(
      `SELECT 
        m.*,
        s.username AS sender_username,
        s.display_name AS sender_display_name,
        s.avatar_url AS sender_avatar_url,
        r.username AS receiver_username,
        r.display_name AS receiver_display_name,
        r.avatar_url AS receiver_avatar_url
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all() as any;
    
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM messages m ${whereClause}`
    ).bind(...params).first() as any;
    
    const formattedMessages = (messages.results || []).map((msg: any) => ({
      id: msg.id,
      sender: {
        id: msg.sender_id,
        username: msg.sender_username,
        displayName: msg.sender_display_name,
        avatarUrl: msg.sender_avatar_url
      },
      receiver: {
        id: msg.receiver_id,
        username: msg.receiver_username,
        displayName: msg.receiver_display_name,
        avatarUrl: msg.receiver_avatar_url
      },
      content: msg.is_recalled === 1 ? '消息已撤回' : msg.content,
      isRecalled: msg.is_recalled === 1,
      isRead: msg.is_read === 1,
      createdAt: formatDateTime(msg.created_at),
      readAt: msg.read_at ? formatDateTime(msg.read_at) : null
    }));
    
    return c.json(successResponse({
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Admin get all messages error', error);
    return c.json(errorResponse('Failed to get messages', '获取私信列表失败'), 500);
  }
});

messageRoutes.delete('/admin/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const messageId = parseInt(c.req.param('id'));
    
    if (isNaN(messageId)) {
      return c.json(errorResponse('Invalid message ID', '无效的消息ID'), 400);
    }
    
    await c.env.DB.prepare('DELETE FROM message_attachments WHERE message_id = ?').bind(messageId).run();
    await c.env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();
    
    logger.info('Message permanently deleted by admin', { messageId });
    
    return c.json(successResponse({ deleted: true }, '消息已彻底删除'));
    
  } catch (error) {
    logger.error('Admin delete message error', error);
    return c.json(errorResponse('Failed to delete message', '删除消息失败'), 500);
  }
});

// ============= 获取可发送用户列表 =============

messageRoutes.get('/admin-users', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const users = await c.env.DB.prepare(
      `SELECT id, username, display_name, avatar_url 
       FROM users 
       WHERE role = ? AND status = ?
       ORDER BY display_name ASC
       LIMIT 50`
    ).bind('admin', 'active').all() as any;
    
    const formattedUsers = (users.results || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    }));
    
    logger.info('Admin users fetched', { count: formattedUsers.length });
    
    return c.json(successResponse({ users: formattedUsers }));
    
  } catch (error) {
    logger.error('Get admin users error', error);
    return c.json(errorResponse('Failed to get admin users', '获取管理员列表失败'), 500);
  }
});

messageRoutes.get('/all-users', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const search = c.req.query('search') || '';
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE status = ?';
    const params: any[] = ['active'];
    
    if (search) {
      whereClause += ' AND (username LIKE ? OR display_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const users = await c.env.DB.prepare(
      `SELECT id, username, display_name, avatar_url 
       FROM users 
       ${whereClause}
       ORDER BY display_name ASC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all() as any;
    
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users ${whereClause}`
    ).bind(...params).first() as any;
    
    const formattedUsers = (users.results || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    }));
    
    logger.info('All users fetched', { count: formattedUsers.length, search, page });
    
    return c.json(successResponse({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    }));
    
  } catch (error) {
    logger.error('Get all users error', error);
    return c.json(errorResponse('Failed to get users', '获取用户列表失败'), 500);
  }
});

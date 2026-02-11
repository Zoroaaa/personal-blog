/**
 * 私信功能路由
 * 
 * 功能：
 * - 发送私信
 * - 获取私信列表（会话列表）
 * - 获取与特定用户的对话
 * - 标记私信为已读
 * - 删除私信
 * - 获取未读消息数
 * - 管理员：获取全站所有私信
 * 
 * @version 1.0.0
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth, requireAdmin, isAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { sanitizeInput } from '../utils/validation';
import { createPrivateMessageNotification } from '../services/notificationService';

export const messageRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 常量配置 =============

const MESSAGES_PER_PAGE = 20;
const MAX_MESSAGE_LENGTH = 2000;

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
  // 移除危险的HTML标签
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
 * 
 * 请求体：
 * {
 *   receiverId: number,    // 接收者ID
 *   content: string,       // 消息内容
 *   parentId?: number      // 回复的消息ID（可选）
 * }
 */
messageRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const { receiverId, content, parentId } = await c.req.json();
    
    // 验证必填字段
    if (!receiverId || !content) {
      return c.json(errorResponse(
        'Missing required fields',
        '请提供接收者ID和消息内容'
      ), 400);
    }
    
    // 验证不能给自己发送私信
    if (receiverId === currentUser.userId) {
      return c.json(errorResponse(
        'Invalid receiver',
        '不能给自己发送私信'
      ), 400);
    }
    
    // 验证消息长度
    if (content.length > MAX_MESSAGE_LENGTH) {
      return c.json(errorResponse(
        'Message too long',
        `消息内容不能超过 ${MAX_MESSAGE_LENGTH} 个字符`
      ), 400);
    }
    
    // 验证接收者是否存在
    const receiver = await c.env.DB.prepare(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = ? AND status = ?'
    ).bind(receiverId, 'active').first() as any;
    
    if (!receiver) {
      return c.json(errorResponse(
        'Receiver not found',
        '接收者不存在或账号已被禁用'
      ), 404);
    }
    
    // 清理消息内容
    const sanitizedContent = sanitizeMessageContent(content);
    
    if (!sanitizedContent) {
      return c.json(errorResponse(
        'Empty message',
        '消息内容不能为空'
      ), 400);
    }
    
    // 验证parentId是否存在（如果是回复）
    if (parentId) {
      const parentMessage = await c.env.DB.prepare(
        'SELECT id FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)'
      ).bind(parentId, currentUser.userId, currentUser.userId).first();
      
      if (!parentMessage) {
        return c.json(errorResponse(
          'Parent message not found',
          '回复的消息不存在'
        ), 404);
      }
    }
    
    // 插入消息
    const result = await c.env.DB.prepare(
      `INSERT INTO messages (sender_id, receiver_id, content, parent_id, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      currentUser.userId,
      receiverId,
      sanitizedContent,
      parentId || null
    ).run();
    
    if (!result.success) {
      throw new Error('Failed to send message');
    }
    
    const messageId = result.meta.last_row_id;
    
    // 获取发送者信息
    const sender = await c.env.DB.prepare(
      'SELECT username, display_name, avatar_url FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as any;
    
    logger.info('Message sent', {
      messageId,
      senderId: currentUser.userId,
      receiverId
    });

    // 发送私信通知
    try {
      await createPrivateMessageNotification(c.env.DB, {
        userId: receiverId,
        title: `${sender.display_name || sender.username} 发来一条私信`,
        content: sanitizedContent.length > 100
          ? sanitizedContent.substring(0, 100) + '...'
          : sanitizedContent,
        messageId: messageId,
        relatedData: {
          senderId: currentUser.userId,
          senderName: sender.display_name || sender.username,
          senderAvatar: sender.avatar_url,
          messageId: messageId,
        },
      });
    } catch (notifyError) {
      // 通知发送失败不影响私信发送
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
        parentId: parentId || null,
        isRead: 0,
        createdAt: formatDateTime(new Date().toISOString())
      }
    }, '私信发送成功'), 201);

  } catch (error) {
    logger.error('Send message error', error);
    return c.json(errorResponse(
      'Failed to send message',
      '发送私信失败，请稍后重试'
    ), 500);
  }
});

// ============= 获取会话列表 =============

/**
 * GET /api/messages/conversations
 * 获取用户的会话列表（每个对话只显示最新消息）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 */
messageRoutes.get('/conversations', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || String(MESSAGES_PER_PAGE)), 50);
    const offset = (page - 1) * limit;
    
    // 获取会话列表（每个对话的最新消息）
    const conversations = await c.env.DB.prepare(
      `WITH user_conversations AS (
        SELECT 
          CASE 
            WHEN sender_id = ? THEN receiver_id
            ELSE sender_id
          END AS partner_id,
          MAX(created_at) AS last_message_time
        FROM messages
        WHERE (sender_id = ? AND is_deleted_by_sender = 0)
           OR (receiver_id = ? AND is_deleted_by_receiver = 0)
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
      WHERE (m.is_deleted_by_sender = 0 AND m.is_deleted_by_receiver = 0)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(
      currentUser.userId, currentUser.userId, currentUser.userId,
      currentUser.userId, currentUser.userId,
      limit, offset
    ).all() as any;
    
    // 获取每个会话的未读消息数
    const conversationsWithUnread = await Promise.all(
      (conversations.results || []).map(async (conv: any) => {
        const partnerId = conv.sender_id === currentUser.userId ? conv.receiver_id : conv.sender_id;
        
        const unreadCount = await c.env.DB.prepare(
          `SELECT COUNT(*) as count FROM messages
           WHERE sender_id = ? AND receiver_id = ? AND is_read = 0 AND is_deleted_by_receiver = 0`
        ).bind(partnerId, currentUser.userId).first() as any;
        
        return {
          id: conv.id,
          partnerId: partnerId,
          partnerUsername: partnerId === conv.sender_id ? conv.sender_username : conv.receiver_username,
          partnerDisplayName: partnerId === conv.sender_id ? conv.sender_display_name : conv.receiver_display_name,
          partnerAvatarUrl: partnerId === conv.sender_id ? conv.sender_avatar_url : conv.receiver_avatar_url,
          lastMessage: {
            id: conv.id,
            content: conv.content,
            senderId: conv.sender_id,
            isRead: conv.is_read === 1,
            createdAt: formatDateTime(conv.created_at)
          },
          unreadCount: unreadCount?.count || 0
        };
      })
    );
    
    // 获取总会话数
    const totalCount = await c.env.DB.prepare(
      `SELECT COUNT(DISTINCT 
        CASE 
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END
      ) as count
      FROM messages
      WHERE (sender_id = ? AND is_deleted_by_sender = 0)
         OR (receiver_id = ? AND is_deleted_by_receiver = 0)`
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
    return c.json(errorResponse(
      'Failed to get conversations',
      '获取会话列表失败'
    ), 500);
  }
});

// ============= 获取与特定用户的对话 =============

/**
 * GET /api/messages/conversation/:userId
 * 获取与特定用户的对话历史
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 */
messageRoutes.get('/conversation/:userId', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const partnerId = parseInt(c.req.param('userId'));
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || String(MESSAGES_PER_PAGE)), 50);
    const offset = (page - 1) * limit;
    
    if (isNaN(partnerId)) {
      return c.json(errorResponse(
        'Invalid user ID',
        '无效的用户ID'
      ), 400);
    }
    
    // 验证对方用户是否存在
    const partner = await c.env.DB.prepare(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = ?'
    ).bind(partnerId).first() as any;
    
    if (!partner) {
      return c.json(errorResponse(
        'User not found',
        '用户不存在'
      ), 404);
    }
    
    // 获取对话消息
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
      WHERE ((m.sender_id = ? AND m.receiver_id = ? AND m.is_deleted_by_sender = 0) OR
             (m.sender_id = ? AND m.receiver_id = ? AND m.is_deleted_by_receiver = 0))
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(currentUser.userId, partnerId, partnerId, currentUser.userId, limit, offset).all() as any;
    
    // 获取总消息数
    const totalCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE ((sender_id = ? AND receiver_id = ? AND is_deleted_by_sender = 0) OR
              (sender_id = ? AND receiver_id = ? AND is_deleted_by_receiver = 0))`
    ).bind(currentUser.userId, partnerId, partnerId, currentUser.userId).first() as any;
    
    // 格式化消息
    const formattedMessages = (messages.results || []).map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      senderDisplayName: msg.sender_display_name,
      senderAvatarUrl: msg.sender_avatar_url,
      receiverId: msg.receiver_id,
      receiverUsername: msg.receiver_username,
      receiverDisplayName: msg.receiver_display_name,
      receiverAvatarUrl: msg.receiver_avatar_url,
      content: msg.content,
      parentId: msg.parent_id,
      isRead: msg.is_read === 1,
      createdAt: formatDateTime(msg.created_at),
      readAt: msg.read_at ? formatDateTime(msg.read_at) : null
    }));
    
    // 标记对方发送的消息为已读
    await c.env.DB.prepare(
      `UPDATE messages 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`
    ).bind(partnerId, currentUser.userId).run();
    
    return c.json(successResponse({
      partner: {
        id: partner.id,
        username: partner.username,
        displayName: partner.display_name,
        avatarUrl: partner.avatar_url
      },
      messages: formattedMessages.reverse(), // 按时间正序排列
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get conversation error', error);
    return c.json(errorResponse(
      'Failed to get conversation',
      '获取对话失败'
    ), 500);
  }
});

// ============= 标记消息为已读 =============

/**
 * PUT /api/messages/:id/read
 * 标记单条消息为已读
 */
messageRoutes.put('/:id/read', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const messageId = parseInt(c.req.param('id'));
    
    if (isNaN(messageId)) {
      return c.json(errorResponse(
        'Invalid message ID',
        '无效的消息ID'
      ), 400);
    }
    
    // 验证消息是否存在且接收者是当前用户
    const message = await c.env.DB.prepare(
      'SELECT id, receiver_id, is_read FROM messages WHERE id = ?'
    ).bind(messageId).first() as any;
    
    if (!message) {
      return c.json(errorResponse(
        'Message not found',
        '消息不存在'
      ), 404);
    }
    
    if (message.receiver_id !== currentUser.userId) {
      return c.json(errorResponse(
        'Forbidden',
        '无权操作此消息'
      ), 403);
    }
    
    if (message.is_read === 1) {
      return c.json(successResponse({ marked: true }, '消息已标记为已读'));
    }
    
    // 标记为已读
    await c.env.DB.prepare(
      'UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(messageId).run();
    
    logger.info('Message marked as read', { messageId, userId: currentUser.userId });
    
    return c.json(successResponse({ marked: true }, '消息已标记为已读'));
    
  } catch (error) {
    logger.error('Mark as read error', error);
    return c.json(errorResponse(
      'Failed to mark as read',
      '标记已读失败'
    ), 500);
  }
});

/**
 * PUT /api/messages/read-all
 * 标记所有未读消息为已读
 */
messageRoutes.put('/read-all', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    
    const result = await c.env.DB.prepare(
      `UPDATE messages 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE receiver_id = ? AND is_read = 0 AND is_deleted_by_receiver = 0`
    ).bind(currentUser.userId).run();
    
    logger.info('All messages marked as read', { userId: currentUser.userId });
    
    return c.json(successResponse({ 
      markedCount: result.meta?.changes || 0 
    }, '所有消息已标记为已读'));
    
  } catch (error) {
    logger.error('Mark all as read error', error);
    return c.json(errorResponse(
      'Failed to mark all as read',
      '标记全部已读失败'
    ), 500);
  }
});

// ============= 删除私信 =============

/**
 * DELETE /api/messages/:id
 * 删除私信（软删除，根据用户角色标记为发送者删除或接收者删除）
 */
messageRoutes.delete('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const messageId = parseInt(c.req.param('id'));
    
    if (isNaN(messageId)) {
      return c.json(errorResponse(
        'Invalid message ID',
        '无效的消息ID'
      ), 400);
    }
    
    // 验证消息是否存在
    const message = await c.env.DB.prepare(
      'SELECT id, sender_id, receiver_id FROM messages WHERE id = ?'
    ).bind(messageId).first() as any;
    
    if (!message) {
      return c.json(errorResponse(
        'Message not found',
        '消息不存在'
      ), 404);
    }
    
    // 判断当前用户是发送者还是接收者
    let updateField: string;
    if (message.sender_id === currentUser.userId) {
      updateField = 'is_deleted_by_sender';
    } else if (message.receiver_id === currentUser.userId) {
      updateField = 'is_deleted_by_receiver';
    } else {
      return c.json(errorResponse(
        'Forbidden',
        '无权删除此消息'
      ), 403);
    }
    
    // 软删除
    await c.env.DB.prepare(
      `UPDATE messages SET ${updateField} = 1 WHERE id = ?`
    ).bind(messageId).run();
    
    logger.info('Message deleted', { messageId, userId: currentUser.userId });
    
    return c.json(successResponse({ deleted: true }, '消息已删除'));
    
  } catch (error) {
    logger.error('Delete message error', error);
    return c.json(errorResponse(
      'Failed to delete message',
      '删除消息失败'
    ), 500);
  }
});

// ============= 获取未读消息数 =============

/**
 * GET /api/messages/unread-count
 * 获取当前用户的未读消息数
 */
messageRoutes.get('/unread-count', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    
    const result = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE receiver_id = ? AND is_read = 0 AND is_deleted_by_receiver = 0`
    ).bind(currentUser.userId).first() as any;
    
    return c.json(successResponse({
      unreadCount: result?.count || 0
    }));
    
  } catch (error) {
    logger.error('Get unread count error', error);
    return c.json(errorResponse(
      'Failed to get unread count',
      '获取未读消息数失败'
    ), 500);
  }
});

// ============= 管理员功能 =============

/**
 * GET /api/messages/admin/all
 * 管理员：获取全站所有私信
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - senderId: 按发送者筛选（可选）
 * - receiverId: 按接收者筛选（可选）
 */
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
    
    // 获取消息列表
    const messages = await c.env.DB.prepare(
      `SELECT 
        m.*,
        s.username AS sender_username,
        s.display_name AS sender_display_name,
        s.avatar_url AS sender_avatar_url,
        s.id AS sender_id,
        r.username AS receiver_username,
        r.display_name AS receiver_display_name,
        r.avatar_url AS receiver_avatar_url,
        r.id AS receiver_id
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all() as any;
    
    // 获取总数
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
      content: msg.content,
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
    return c.json(errorResponse(
      'Failed to get messages',
      '获取私信列表失败'
    ), 500);
  }
});

/**
 * DELETE /api/messages/admin/:id
 * 管理员：彻底删除私信
 */
messageRoutes.delete('/admin/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const messageId = parseInt(c.req.param('id'));
    
    if (isNaN(messageId)) {
      return c.json(errorResponse(
        'Invalid message ID',
        '无效的消息ID'
      ), 400);
    }
    
    // 硬删除
    await c.env.DB.prepare(
      'DELETE FROM messages WHERE id = ?'
    ).bind(messageId).run();
    
    logger.info('Message permanently deleted by admin', { messageId });
    
    return c.json(successResponse({ deleted: true }, '消息已彻底删除'));
    
  } catch (error) {
    logger.error('Admin delete message error', error);
    return c.json(errorResponse(
      'Failed to delete message',
      '删除消息失败'
    ), 500);
  }
});

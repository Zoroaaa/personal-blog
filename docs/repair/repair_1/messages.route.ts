/**
 * 私信路由
 *
 * 功能：
 * - 发送私信
 * - 查看收件箱/发件箱
 * - 会话管理
 * - 标记已读/删除
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { validateLength, sanitizeInput, safeParseInt } from '../utils/validation';
import { rateLimit } from '../middleware/rateLimit';
import {
  sendMessage,
  getInbox,
  getOutbox,
  getThreads,
  getMessageById,
  markAsRead,
  markThreadAsRead,
  deleteMessage,
  deleteThread,
  getUnreadCount,
  generateThreadId,
  type SendMessageRequest,
} from '../services/messageService';

export const messageRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 常量配置 =============

const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUBJECT_LENGTH = 100;

// ============= 发送私信 =============

/**
 * POST /api/messages
 * 发送私信（需要认证）
 * 
 * 请求体：
 * {
 *   recipientId: number,
 *   subject?: string,
 *   content: string,
 *   replyToId?: number
 * }
 */
messageRoutes.post('/', requireAuth, rateLimit({
  windowMs: 60 * 1000,  // 1分钟
  maxRequests: 10,
  message: '发送私信过于频繁，请稍后再试'
}), async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const body = await c.req.json();
    let { recipientId, subject, content, replyToId } = body;

    // ===== 1. 验证必填字段 =====
    if (!recipientId || !content) {
      return c.json(errorResponse(
        'Missing required fields',
        'recipientId and content are required'
      ), 400);
    }

    // ===== 2. 验证接收者ID =====
    if (typeof recipientId !== 'number' || recipientId <= 0) {
      return c.json(errorResponse(
        'Invalid recipient',
        'recipientId must be a positive number'
      ), 400);
    }

    // ===== 3. 清理和验证内容 =====
    content = sanitizeInput(content);
    const contentError = validateLength(content, MIN_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH, 'Message content');
    if (contentError) {
      return c.json(errorResponse('Invalid message content', contentError), 400);
    }

    // ===== 4. 验证主题（如果提供） =====
    if (subject) {
      subject = sanitizeInput(subject);
      const subjectError = validateLength(subject, 1, MAX_SUBJECT_LENGTH, 'Subject');
      if (subjectError) {
        return c.json(errorResponse('Invalid subject', subjectError), 400);
      }
    }

    // ===== 5. 发送消息 =====
    const messageData: SendMessageRequest = {
      recipientId,
      content,
      subject: subject || undefined,
      replyToId: replyToId || undefined,
    };

    const message = await sendMessage(c.env.DB, user.userId, messageData);

    if (!message) {
      return c.json(errorResponse(
        'Failed to send message',
        'Unable to send message. Please check the recipient exists.'
      ), 400);
    }

    logger.info('Message sent successfully', {
      messageId: message.id,
      senderId: user.userId,
      recipientId,
    });

    return c.json(successResponse(message, 'Message sent successfully'), 201);

  } catch (error) {
    logger.error('Send message error', error);
    return c.json(errorResponse(
      'Failed to send message',
      'An error occurred while sending the message'
    ), 500);
  }
});

// ============= 获取收件箱 =============

/**
 * GET /api/messages/inbox
 * 获取收件箱（需要认证）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大50）
 * - threadId: 会话ID（可选，用于查看特定会话）
 */
messageRoutes.get('/inbox', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const page = safeParseInt(c.req.query('page'), 1);
    const limit = safeParseInt(c.req.query('limit'), 20);
    const threadId = c.req.query('threadId');

    const result = await getInbox(c.env.DB, user.userId, {
      page,
      limit,
      threadId: threadId || undefined,
    });

    logger.info('Inbox fetched successfully', {
      userId: user.userId,
      count: result.messages.length,
    });

    return c.json(successResponse(result));

  } catch (error) {
    logger.error('Get inbox error', error);
    return c.json(errorResponse(
      'Failed to fetch inbox',
      'An error occurred while fetching your messages'
    ), 500);
  }
});

// ============= 获取发件箱 =============

/**
 * GET /api/messages/outbox
 * 获取发件箱（需要认证）
 */
messageRoutes.get('/outbox', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const page = safeParseInt(c.req.query('page'), 1);
    const limit = safeParseInt(c.req.query('limit'), 20);
    const threadId = c.req.query('threadId');

    const result = await getOutbox(c.env.DB, user.userId, {
      page,
      limit,
      threadId: threadId || undefined,
    });

    logger.info('Outbox fetched successfully', {
      userId: user.userId,
      count: result.messages.length,
    });

    return c.json(successResponse(result));

  } catch (error) {
    logger.error('Get outbox error', error);
    return c.json(errorResponse(
      'Failed to fetch outbox',
      'An error occurred while fetching your sent messages'
    ), 500);
  }
});

// ============= 获取会话列表 =============

/**
 * GET /api/messages/threads
 * 获取会话列表（需要认证）
 */
messageRoutes.get('/threads', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const page = safeParseInt(c.req.query('page'), 1);
    const limit = safeParseInt(c.req.query('limit'), 20);

    const result = await getThreads(c.env.DB, user.userId, { page, limit });

    logger.info('Threads fetched successfully', {
      userId: user.userId,
      count: result.threads.length,
    });

    return c.json(successResponse(result));

  } catch (error) {
    logger.error('Get threads error', error);
    return c.json(errorResponse(
      'Failed to fetch conversations',
      'An error occurred while fetching your conversations'
    ), 500);
  }
});

// ============= 获取单个消息 =============

/**
 * GET /api/messages/:id
 * 获取单个消息详情（需要认证）
 */
messageRoutes.get('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const messageId = safeParseInt(c.req.param('id'));

    if (!messageId) {
      return c.json(errorResponse('Invalid message ID'), 400);
    }

    const message = await getMessageById(c.env.DB, messageId, user.userId);

    if (!message) {
      return c.json(errorResponse('Message not found'), 404);
    }

    logger.info('Message fetched successfully', {
      messageId,
      userId: user.userId,
    });

    return c.json(successResponse(message));

  } catch (error) {
    logger.error('Get message error', error);
    return c.json(errorResponse(
      'Failed to fetch message',
      'An error occurred while fetching the message'
    ), 500);
  }
});

// ============= 标记消息为已读 =============

/**
 * PATCH /api/messages/:id/read
 * 标记消息为已读（需要认证）
 */
messageRoutes.patch('/:id/read', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const messageId = safeParseInt(c.req.param('id'));

    if (!messageId) {
      return c.json(errorResponse('Invalid message ID'), 400);
    }

    const success = await markAsRead(c.env.DB, messageId, user.userId);

    if (!success) {
      return c.json(errorResponse(
        'Failed to mark as read',
        'Message not found or already read'
      ), 400);
    }

    logger.info('Message marked as read', { messageId, userId: user.userId });

    return c.json(successResponse({ read: true }));

  } catch (error) {
    logger.error('Mark as read error', error);
    return c.json(errorResponse(
      'Failed to mark message as read',
      'An error occurred while updating the message'
    ), 500);
  }
});

// ============= 标记会话为已读 =============

/**
 * PATCH /api/messages/threads/:threadId/read
 * 标记整个会话为已读（需要认证）
 */
messageRoutes.patch('/threads/:threadId/read', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const threadId = c.req.param('threadId');

    if (!threadId) {
      return c.json(errorResponse('Invalid thread ID'), 400);
    }

    const count = await markThreadAsRead(c.env.DB, threadId, user.userId);

    logger.info('Thread marked as read', {
      threadId,
      userId: user.userId,
      count,
    });

    return c.json(successResponse({ count }));

  } catch (error) {
    logger.error('Mark thread as read error', error);
    return c.json(errorResponse(
      'Failed to mark conversation as read',
      'An error occurred while updating the conversation'
    ), 500);
  }
});

// ============= 删除消息 =============

/**
 * DELETE /api/messages/:id
 * 删除消息（需要认证，软删除）
 */
messageRoutes.delete('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const messageId = safeParseInt(c.req.param('id'));

    if (!messageId) {
      return c.json(errorResponse('Invalid message ID'), 400);
    }

    const success = await deleteMessage(c.env.DB, messageId, user.userId);

    if (!success) {
      return c.json(errorResponse(
        'Failed to delete message',
        'Message not found or already deleted'
      ), 400);
    }

    logger.info('Message deleted', { messageId, userId: user.userId });

    return c.json(successResponse({ deleted: true }));

  } catch (error) {
    logger.error('Delete message error', error);
    return c.json(errorResponse(
      'Failed to delete message',
      'An error occurred while deleting the message'
    ), 500);
  }
});

// ============= 删除会话 =============

/**
 * DELETE /api/messages/threads/:threadId
 * 删除整个会话（需要认证，软删除）
 */
messageRoutes.delete('/threads/:threadId', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const threadId = c.req.param('threadId');

    if (!threadId) {
      return c.json(errorResponse('Invalid thread ID'), 400);
    }

    const count = await deleteThread(c.env.DB, threadId, user.userId);

    logger.info('Thread deleted', {
      threadId,
      userId: user.userId,
      count,
    });

    return c.json(successResponse({ count }));

  } catch (error) {
    logger.error('Delete thread error', error);
    return c.json(errorResponse(
      'Failed to delete conversation',
      'An error occurred while deleting the conversation'
    ), 500);
  }
});

// ============= 获取未读消息数 =============

/**
 * GET /api/messages/unread/count
 * 获取未读消息数（需要认证）
 */
messageRoutes.get('/unread/count', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const count = await getUnreadCount(c.env.DB, user.userId);

    logger.info('Unread count fetched', { userId: user.userId, count });

    return c.json(successResponse({ count }));

  } catch (error) {
    logger.error('Get unread count error', error);
    return c.json(errorResponse(
      'Failed to fetch unread count',
      'An error occurred while fetching unread messages count'
    ), 500);
  }
});

// ============= 生成会话ID（工具接口） =============

/**
 * GET /api/messages/thread-id/:userId
 * 生成与指定用户的会话ID（需要认证）
 * 用于前端在发送消息前获取会话ID
 */
messageRoutes.get('/thread-id/:userId', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const otherUserId = safeParseInt(c.req.param('userId'));

    if (!otherUserId) {
      return c.json(errorResponse('Invalid user ID'), 400);
    }

    const threadId = generateThreadId(user.userId, otherUserId);

    logger.info('Thread ID generated', {
      userId: user.userId,
      otherUserId,
      threadId,
    });

    return c.json(successResponse({ threadId }));

  } catch (error) {
    logger.error('Generate thread ID error', error);
    return c.json(errorResponse(
      'Failed to generate thread ID',
      'An error occurred while generating the thread ID'
    ), 500);
  }
});

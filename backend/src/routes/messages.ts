/**
 * 私信路由
 *
 * 功能：
 * - 发送私信
 * - 查看收件箱/发件箱
 * - 会话管理
 * - 标记已读/撤回消息
 * - 图片/附件消息支持
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-13
 * @updated 2026-02-15
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
  recallMessage,
  getUnreadCount,
  generateThreadId,
  getThreadMessages,
  resendMessage,
  type SendMessageRequest,
  type MessageType,
} from '../services/messageService';
import { getUploadLimits } from './config';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_TYPE_CONSTANTS,
  RATE_LIMIT_CONSTANTS,
} from '../config/constants';

export const messageRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

messageRoutes.post('/', requireAuth, rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.WINDOW_1_MINUTE,
  maxRequests: RATE_LIMIT_CONSTANTS.MESSAGE_MAX_REQUESTS,
  message: '发送私信过于频繁，请稍后再试'
}), async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
    const body = await c.req.json();
    let { 
      recipientId, 
      subject, 
      content, 
      replyToId,
      messageType,
      attachmentUrl,
      attachmentFilename,
      attachmentSize,
      attachmentMimeType
    } = body;

    if (!recipientId) {
      return c.json(errorResponse(
        'Missing required fields',
        'recipientId is required'
      ), 400);
    }

    if (typeof recipientId !== 'number' || recipientId <= 0) {
      return c.json(errorResponse(
        'Invalid recipient',
        'recipientId must be a positive number'
      ), 400);
    }

    const uploadLimits = await getUploadLimits(c.env);

    if (attachmentSize && attachmentSize > uploadLimits.maxFileSizeBytes) {
      return c.json(errorResponse(
        'Attachment too large',
        `Attachment size cannot exceed ${uploadLimits.maxFileSizeMB}MB`
      ), 400);
    }

    const finalMessageType: MessageType = messageType || 'text';
    
    if (finalMessageType === 'text' && !content) {
      return c.json(errorResponse(
        'Missing content',
        'Message content is required for text messages'
      ), 400);
    }

    if ((finalMessageType === 'image' || finalMessageType === 'attachment') && !attachmentUrl) {
      return c.json(errorResponse(
        'Missing attachment',
        'Attachment URL is required for image/attachment messages'
      ), 400);
    }

    if (content) {
      content = sanitizeInput(content);
      const contentError = validateLength(content, 1, MESSAGE_CONSTANTS.MAX_MESSAGE_LENGTH, 'Message content');
      if (contentError) {
        return c.json(errorResponse('Invalid message content', contentError), 400);
      }
    }

    if (subject) {
      subject = sanitizeInput(subject);
      const subjectError = validateLength(subject, 1, MESSAGE_TYPE_CONSTANTS.MAX_SUBJECT_LENGTH, 'Subject');
      if (subjectError) {
        return c.json(errorResponse('Invalid subject', subjectError), 400);
      }
    }

    const messageData: SendMessageRequest = {
      recipientId,
      content: content || '',
      subject: subject || undefined,
      replyToId: replyToId || undefined,
      messageType: finalMessageType,
      attachmentUrl: attachmentUrl || undefined,
      attachmentFilename: attachmentFilename || undefined,
      attachmentSize: attachmentSize || undefined,
      attachmentMimeType: attachmentMimeType || undefined,
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
      messageType: finalMessageType,
    });

    return c.json(successResponse(message, 'Message sent successfully'), 201);

  } catch (error) {
    logger.error('Send message error', error);
    
    if (error instanceof Error) {
      if (error.message === 'Recipient does not accept messages from strangers') {
        return c.json(errorResponse(
          'Message rejected',
          '对方设置了不接受陌生人私信'
        ), 403);
      }
    }
    
    return c.json(errorResponse(
      'Failed to send message',
      'An error occurred while sending the message'
    ), 500);
  }
});

messageRoutes.get('/inbox', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.get('/outbox', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.get('/threads', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.get('/thread/:threadId', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
    const threadId = c.req.param('threadId');
    const page = safeParseInt(c.req.query('page'), 1);
    const limit = safeParseInt(c.req.query('limit'), 20);

    if (!threadId) {
      return c.json(errorResponse('Invalid thread ID'), 400);
    }

    const result = await getThreadMessages(c.env.DB, user.userId, threadId, {
      page,
      limit,
    });

    logger.info('Thread messages fetched successfully', {
      userId: user.userId,
      threadId,
      count: result.messages.length,
    });

    return c.json(successResponse(result));

  } catch (error) {
    logger.error('Get thread messages error', error);
    return c.json(errorResponse(
      'Failed to fetch thread messages',
      'An error occurred while fetching the conversation messages'
    ), 500);
  }
});

messageRoutes.get('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.patch('/:id/read', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.patch('/threads/:threadId/read', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.post('/:id/recall', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
    const messageId = safeParseInt(c.req.param('id'));

    if (!messageId) {
      return c.json(errorResponse('Invalid message ID'), 400);
    }

    const result = await recallMessage(c.env.DB, messageId, user.userId);

    if (!result.success) {
      return c.json(errorResponse(
        'Failed to recall message',
        result.error || 'Unable to recall the message'
      ), 400);
    }

    logger.info('Message recalled', { messageId, userId: user.userId });

    return c.json(successResponse({ recalled: true }));

  } catch (error) {
    logger.error('Recall message error', error);
    return c.json(errorResponse(
      'Failed to recall message',
      'An error occurred while recalling the message'
    ), 500);
  }
});

messageRoutes.post('/:id/resend', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
    const messageId = safeParseInt(c.req.param('id'));

    if (!messageId) {
      return c.json(errorResponse('Invalid message ID'), 400);
    }

    const body = await c.req.json();
    let { 
      content, 
      messageType,
      attachmentUrl,
      attachmentFilename,
      attachmentSize,
      attachmentMimeType
    } = body;

    if (content) {
      content = sanitizeInput(content);
      const contentError = validateLength(content, 0, MESSAGE_CONSTANTS.MAX_MESSAGE_LENGTH, 'Message content');
      if (contentError) {
        return c.json(errorResponse('Invalid message content', contentError), 400);
      }
    }

    const finalMessageType: MessageType = messageType || 'text';

    const result = await resendMessage(c.env.DB, messageId, user.userId, {
      content: content || '',
      messageType: finalMessageType,
      attachmentUrl: attachmentUrl || undefined,
      attachmentFilename: attachmentFilename || undefined,
      attachmentSize: attachmentSize || undefined,
      attachmentMimeType: attachmentMimeType || undefined,
    });

    if (!result.success) {
      return c.json(errorResponse(
        'Failed to resend message',
        result.error || 'Unable to resend the message'
      ), 400);
    }

    logger.info('Message resent', { messageId, userId: user.userId });

    return c.json(successResponse(result.message, 'Message resent successfully'));

  } catch (error) {
    logger.error('Resend message error', error);
    return c.json(errorResponse(
      'Failed to resend message',
      'An error occurred while resending the message'
    ), 500);
  }
});

messageRoutes.get('/unread/count', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

messageRoutes.get('/thread-id/:userId', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user');
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

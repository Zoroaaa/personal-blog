/**
 * @mentions 检测和处理服务
 *
 * 功能：
 * - 检测评论或私信中的@提及
 * - 为被提及用户创建通知
 * - 高亮显示@提及
 * - 支持 displayName 和 username 两种格式
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-13
 */

import { createInteractionNotification } from './notificationService';
import { isInteractionSubtypeEnabled } from './notificationSettingsService';
import type { Env } from '../types';

/**
 * 从文本中检测所有被@的用户名或显示名称
 *
 * 支持的格式：
 * - @username （用户名后跟空格或标点）
 * - @显示名称 （支持中文和空格，直到遇到特定结束符）
 *
 * @param content 文本内容
 * @returns 被@的用户名/显示名称列表（去重）
 */
export function detectMentions(content: string): string[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const mentions: string[] = [];
  
  // 匹配 @username 格式（字母、数字、下划线，长度3-20）
  const usernameRegex = /\B@([a-zA-Z0-9_]{3,20})(?=\s|[.!?,;:）)）]|$)/g;
  let match;
  while ((match = usernameRegex.exec(content)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  // 匹配 @显示名称 格式（支持中文、字母、数字、空格，长度1-30）
  // 格式：@名称 后跟空格、标点或结尾
  const displayNameRegex = /\B@([\u4e00-\u9fa5a-zA-Z0-9_\s]{1,30}?)(?=\s*[.!?,;:）)）]|$|\s{2})/g;
  while ((match = displayNameRegex.exec(content)) !== null) {
    const displayName = match[1].trim();
    // 排除已经匹配到的纯 username
    if (displayName && !mentions.includes(displayName) && !/^[a-zA-Z0-9_]{3,20}$/.test(displayName)) {
      mentions.push(displayName);
    }
  }

  return mentions;
}

/**
 * 从数据库获取用户ID（通过用户名或显示名称）
 *
 * @param db Cloudflare D1 数据库
 * @param name 用户名或显示名称
 * @returns 用户ID，如果不存在返回null
 */
export async function getUserIdByName(
  db: any,
  name: string
): Promise<number | null> {
  try {
    // 先尝试按用户名查找
    let user = await db
      .prepare('SELECT id FROM users WHERE username = ? AND status = ? AND deleted_at IS NULL')
      .bind(name.toLowerCase(), 'active')
      .first() as { id: number } | undefined;

    if (user) {
      return user.id;
    }

    // 再尝试按显示名称查找
    user = await db
      .prepare('SELECT id FROM users WHERE display_name = ? AND status = ? AND deleted_at IS NULL')
      .bind(name, 'active')
      .first() as { id: number } | undefined;

    return user?.id || null;
  } catch (error) {
    console.error(`Failed to get user ID for name ${name}:`, error);
    return null;
  }
}

/**
 * 从数据库获取用户信息（通过用户名或显示名称）
 *
 * @param db Cloudflare D1 数据库
 * @param name 用户名或显示名称
 * @returns 用户信息，如果不存在返回null
 */
export async function getUserByName(
  db: any,
  name: string
): Promise<{ id: number; username: string; displayName: string } | null> {
  try {
    // 先尝试按用户名查找
    let user = await db
      .prepare('SELECT id, username, display_name FROM users WHERE username = ? AND status = ? AND deleted_at IS NULL')
      .bind(name.toLowerCase(), 'active')
      .first() as { id: number; username: string; display_name: string } | undefined;

    if (user) {
      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      };
    }

    // 再尝试按显示名称查找
    user = await db
      .prepare('SELECT id, username, display_name FROM users WHERE display_name = ? AND status = ? AND deleted_at IS NULL')
      .bind(name, 'active')
      .first() as { id: number; username: string; display_name: string } | undefined;

    if (user) {
      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to get user for name ${name}:`, error);
    return null;
  }
}

/**
 * 解析文本中的所有@提及，并返回网页化的内容
 *
 * 将 @username 转换为 <a href="/profile/username" class="mention">@username</a>
 *
 * @param content 原始文本内容
 * @returns HTML格式的内容（已转义）
 */
export function highlightMentions(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // 先转义HTML特殊字符
  let escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // 替换@提及为链接
  // 匹配 @username 或 @显示名称
  escaped = escaped.replace(
    /\B@([a-zA-Z0-9_]{3,20}|[\u4e00-\u9fa5a-zA-Z0-9_\s]{1,30}?)(?=\s|[.!?,;:）)）]|$)/g,
    '<a href="#/profile/$1" class="mention" data-name="$1">@$1</a>'
  );

  return escaped;
}

/**
 * 为每个被@的用户创建提及通知
 *
 * @param db Cloudflare D1 数据库
 * @param mentionedNames 被@的用户名/显示名称列表
 * @param mentionerUserId 发起@的用户ID
 * @param contentType 内容类型（'comment' | 'message'）
 * @param contentId 内容ID（评论ID或私信ID）
 * @param relatedLink 相关内容链接
 * @param env 环境变量（用于邮件通知）
 */
export async function createMentionNotifications(
  db: any,
  mentionedNames: string[],
  mentionerUserId: number,
  contentType: 'comment' | 'message' = 'comment',
  contentId: number,
  relatedLink?: string,
  env?: Env
): Promise<void> {
  if (!mentionedNames || mentionedNames.length === 0) {
    return;
  }

  try {
    // 获取提及者的用户信息
    const mentioner = await db
      .prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(mentionerUserId)
      .first() as { id: number; username: string; display_name: string; avatar_url: string } | undefined;

    if (!mentioner) {
      console.error(`Mentioner user ${mentionerUserId} not found`);
      return;
    }

    // 获取内容相关信息
    let contentInfo: { postId?: number; postTitle?: string; postSlug?: string; content?: string } = {};
    
    if (contentType === 'comment') {
      const comment = await db
        .prepare(`
          SELECT c.content, c.post_id, p.title, p.slug 
          FROM comments c 
          JOIN posts p ON c.post_id = p.id 
          WHERE c.id = ? AND c.deleted_at IS NULL
        `)
        .bind(contentId)
        .first() as any;

      if (comment) {
        contentInfo = {
          postId: comment.post_id,
          postTitle: comment.title,
          postSlug: comment.slug,
          content: comment.content,
        };
      }
    }

    // 为每个被提及的用户创建通知
    for (const name of mentionedNames) {
      const targetUser = await getUserByName(db, name);

      if (!targetUser || targetUser.id === mentionerUserId) {
        continue;
      }

      // 检查用户是否开启了提及通知
      const isEnabled = await isInteractionSubtypeEnabled(
        db,
        targetUser.id,
        'mention'
      );

      if (!isEnabled) {
        continue;
      }

      // 构建通知标题
      const actionText = contentType === 'comment' ? '评论中提及了你' : '私信中提及了你';
      const title = `${mentioner.display_name || mentioner.username} 在${actionText}`;

      // 创建通知
      await createInteractionNotification(db, {
        userId: targetUser.id,
        subtype: 'mention',
        title,
        content: contentInfo.content ? 
          (contentInfo.content.length > 100 ? contentInfo.content.substring(0, 100) + '...' : contentInfo.content) 
          : undefined,
        relatedData: {
          mentionerId: mentionerUserId,
          mentionerName: mentioner.display_name || mentioner.username,
          mentionerAvatar: mentioner.avatar_url,
          contentType,
          contentId,
          postId: contentInfo.postId,
          postTitle: contentInfo.postTitle,
          postSlug: contentInfo.postSlug,
          link: relatedLink,
        },
      }, env);

      console.log(`Mention notification created for user ${targetUser.id} (${targetUser.username})`);
    }
  } catch (error) {
    console.error('Failed to create mention notifications:', error);
  }
}

/**
 * 通过用户ID列表创建提及通知
 * 
 * @param db Cloudflare D1 数据库
 * @param mentionedUserIds 被@的用户ID列表
 * @param mentionerUserId 发起@的用户ID
 * @param contentType 内容类型（'comment' | 'message'）
 * @param contentId 内容ID（评论ID或私信ID）
 * @param relatedLink 相关内容链接
 * @param env 环境变量（用于邮件通知）
 */
export async function createMentionNotificationsByIds(
  db: any,
  mentionedUserIds: number[],
  mentionerUserId: number,
  contentType: 'comment' | 'message' = 'comment',
  contentId: number,
  relatedLink?: string,
  env?: Env
): Promise<void> {
  if (!mentionedUserIds || mentionedUserIds.length === 0) {
    return;
  }

  try {
    // 获取提及者的用户信息
    const mentioner = await db
      .prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(mentionerUserId)
      .first() as { id: number; username: string; display_name: string; avatar_url: string } | undefined;

    if (!mentioner) {
      console.error(`Mentioner user ${mentionerUserId} not found`);
      return;
    }

    // 获取内容相关信息
    let contentInfo: { postId?: number; postTitle?: string; postSlug?: string; content?: string } = {};
    
    if (contentType === 'comment') {
      const comment = await db
        .prepare(`
          SELECT c.content, c.post_id, p.title, p.slug 
          FROM comments c 
          JOIN posts p ON c.post_id = p.id 
          WHERE c.id = ? AND c.deleted_at IS NULL
        `)
        .bind(contentId)
        .first() as any;

      if (comment) {
        contentInfo = {
          postId: comment.post_id,
          postTitle: comment.title,
          postSlug: comment.slug,
          content: comment.content,
        };
      }
    }

    // 获取所有被提及用户的信息
    const { results: targetUsers } = await db
      .prepare(`SELECT id, username, display_name FROM users WHERE id IN (${mentionedUserIds.map(() => '?').join(',')}) AND status = 'active' AND deleted_at IS NULL`)
      .bind(...mentionedUserIds)
      .all() as any;

    if (!targetUsers || targetUsers.length === 0) {
      return;
    }

    // 为每个被提及的用户创建通知
    for (const targetUser of targetUsers) {
      if (targetUser.id === mentionerUserId) {
        continue;
      }

      // 检查用户是否开启了提及通知
      const isEnabled = await isInteractionSubtypeEnabled(
        db,
        targetUser.id,
        'mention'
      );

      if (!isEnabled) {
        continue;
      }

      // 构建通知标题
      const actionText = contentType === 'comment' ? '评论中提及了你' : '私信中提及了你';
      const title = `${mentioner.display_name || mentioner.username} 在${actionText}`;

      // 创建通知
      await createInteractionNotification(db, {
        userId: targetUser.id,
        subtype: 'mention',
        title,
        content: contentInfo.content ? 
          (contentInfo.content.length > 100 ? contentInfo.content.substring(0, 100) + '...' : contentInfo.content) 
          : undefined,
        relatedData: {
          mentionerId: mentionerUserId,
          mentionerName: mentioner.display_name || mentioner.username,
          mentionerAvatar: mentioner.avatar_url,
          contentType,
          contentId,
          postId: contentInfo.postId,
          postTitle: contentInfo.postTitle,
          postSlug: contentInfo.postSlug,
          link: relatedLink,
        },
      }, env);

      console.log(`Mention notification created for user ${targetUser.id} (${targetUser.username}) by ID`);
    }
  } catch (error) {
    console.error('Failed to create mention notifications by IDs:', error);
  }
}

/**
 * 验证用户是否被@
 * 用于检查用户是否需要被通知
 *
 * @param username 用户名
 * @param displayName 显示名称
 * @param content 内容
 * @returns 是否被@
 */
export function isUserMentioned(username: string, displayName: string | undefined, content: string): boolean {
  const mentions = detectMentions(content);
  return mentions.some(mention => {
    const lowerMention = mention.toLowerCase();
    return lowerMention === username.toLowerCase() || 
           (displayName && mention === displayName);
  });
}

/**
 * 清理所有@提及（用于某些场景，如匿名显示）
 *
 * @param content 内容
 * @returns 清理后的内容（@提及被移除）
 */
export function removeMentions(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content.replace(
    /\B@([a-zA-Z0-9_]{3,20}|[\u4e00-\u9fa5a-zA-Z0-9_\s]{1,30}?)(?=\s|[.!?,;:）)）]|$)/g,
    '$1'
  );
}

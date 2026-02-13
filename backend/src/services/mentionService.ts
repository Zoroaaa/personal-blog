/**
 * @mentions 检测和处理服务
 *
 * 功能：
 * - 检测评论或私信中的@提及
 * - 为被提及用户创建通知
 * - 高亮显示@提及
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

/**
 * 从文本中检测所有被@的用户名
 *
 * 支持的格式：
 * - @username （用户名后跟空格或标点）
 * - @username#123 （不常见，可忽略）
 *
 * @param content 文本内容
 * @returns 被@的用户名列表（去重）
 */
export function detectMentions(content: string): string[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // 匹配 @username 的正则表达式
  // 用户名规则：字母、数字、下划线，长度3-20
  // \b@ 单词边界后跟@符号
  // ([a-zA-Z0-9_]{3,20}) 匹配用户名
  // (?=\s|\.|,|！|？|:|：|;|；|\)|）|$) 正向前瞻，确保后面是空格、标点或结尾
  const mentionRegex = /\B@([a-zA-Z0-9_]{3,20})(?=\s|[.!?,;:）)）]|$)/g;

  const mentions: string[] = [];
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    // 去重
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * 从数据库获取用户ID（通过用户名）
 *
 * @param db Cloudflare D1 数据库
 * @param username 用户名
 * @returns 用户ID，如果不存在返回null
 */
export async function getUserIdByUsername(
  db: any,
  username: string
): Promise<number | null> {
  try {
    const user = await db
      .prepare('SELECT id FROM users WHERE username = ? AND status = ?')
      .bind(username.toLowerCase(), 'active')
      .first() as { id: number } | undefined;

    return user?.id || null;
  } catch (error) {
    console.error(`Failed to get user ID for username ${username}:`, error);
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

  // 然后替换@提及为链接
  // \B@ 表示非单词边界后跟@（避免匹配@@）
  // 注意：由于已经转义，不需要再转义
  escaped = escaped.replace(
    /\B@([a-zA-Z0-9_]{3,20})(?=\s|[.!?,;:）)）]|$)/g,
    '<a href="#/profile/$1" class="mention" data-username="$1">@$1</a>'
  );

  return escaped;
}

/**
 * 为每个被@的用户创建提及通知
 *
 * @param db Cloudflare D1 数据库
 * @param mentionedUsernames 被@的用户名列表
 * @param mentionerUserId 发起@的用户ID
 * @param contentType 内容类型（'comment' | 'message'）
 * @param contentId 内容ID（评论ID或私信ID）
 * @param relatedLink 相关内容链接
 */
export async function createMentionNotifications(
  db: any,
  mentionedUsernames: string[],
  mentionerUserId: number,
  contentType: 'comment' | 'message' = 'comment',
  contentId: number,
  relatedLink?: string
): Promise<void> {
  if (!mentionedUsernames || mentionedUsernames.length === 0) {
    return;
  }

  try {
    // 获取提及者的用户信息
    const mentioner = (await db
      .prepare('SELECT username, display_name FROM users WHERE id = ?')
      .bind(mentionerUserId)
      .first()) as { username: string; display_name: string } | undefined;

    if (!mentioner) {
      console.error(`Mentioner user ${mentionerUserId} not found`);
      return;
    }

    // 为每个被提及的用户创建通知
    for (const username of mentionedUsernames) {
      const userId = await getUserIdByUsername(db, username);

      if (!userId || userId === mentionerUserId) {
        // 用户不存在或不能@自己
        continue;
      }

      // 获取当前时间
      const now = new Date().toISOString();

      // 构建链接
      const link = relatedLink || `#/posts/${contentId}`;

      // 获取操作类型的中文名称
      const actionText = contentType === 'comment' ? '评论中提及了你' : '私信中提及了你';

      // 创建通知记录
      await db
        .prepare(
          `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          content,
          is_read,
          related_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          userId,
          'interaction',
          `${mentioner.display_name || mentioner.username}提及了你`,
          `${mentioner.display_name || mentioner.username}在${actionText}`,
          false,
          contentId,
          now
        )
        .run();
    }
  } catch (error) {
    console.error('Failed to create mention notifications:', error);
    // 不中断主流程
  }
}

/**
 * 验证用户是否被@
 * 用于检查用户是否需要被通知
 *
 * @param username 用户名
 * @param content 内容
 * @returns 是否被@
 */
export function isUserMentioned(username: string, content: string): boolean {
  const mentions = detectMentions(content);
  return mentions.some(mention => mention.toLowerCase() === username.toLowerCase());
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
    /\B@([a-zA-Z0-9_]{3,20})(?=\s|[.!?,;:）)）]|$)/g,
    '$1'
  );
}

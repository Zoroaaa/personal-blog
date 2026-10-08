/**
 * 文章数据访问层
 *
 * 集中文章列表的投影字段与标签装配逻辑，消除 PostService 中重复的
 * 大 SELECT 与「按 post_id 批量取标签」代码，避免多处漂移。
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-10-08
 */

import type { TagRowWithPostId } from '../types/database';

/**
 * 文章列表通用投影字段。
 * 依赖 SQL 中使用 p / u / c / col 四个别名（users / categories / columns）。
 */
export const POST_LIST_COLUMNS = `
      p.id, p.title, p.slug, p.summary, p.cover_image,
      p.view_count, p.like_count, p.comment_count, p.reading_time,
      p.published_at, p.created_at,
      u.username as author_name, u.display_name as author_display_name,
      u.avatar_url as author_avatar,
      c.name as category_name, c.slug as category_slug, c.color as category_color,
      col.name as column_name, col.slug as column_slug`;

export interface PostTag {
  id: number;
  name: string;
  slug: string;
}

export interface PostTagWithCount extends PostTag {
  post_count: number;
}

/**
 * 为一批文章批量装配标签（单次查询，避免 N+1）。
 */
export async function attachTagsToPosts<T extends { id: number }>(
  db: D1Database,
  posts: T[]
): Promise<(T & { tags: PostTag[] })[]> {
  const postIds = posts.map((p) => p.id).filter((id): id is number => id != null);

  if (postIds.length === 0) {
    return posts.map((post) => ({ ...post, tags: [] }));
  }

  const placeholders = postIds.map(() => '?').join(',');
  const { results } = await db.prepare(`
    SELECT pt.post_id, t.id, t.name, t.slug
    FROM post_tags pt
    JOIN tags t ON pt.tag_id = t.id
    WHERE pt.post_id IN (${placeholders})
  `).bind(...postIds).all<TagRowWithPostId>();

  const tagsByPost = new Map<number, PostTag[]>();
  results.forEach((tag) => {
    const list = tagsByPost.get(tag.post_id) || [];
    list.push({ id: tag.id, name: tag.name, slug: tag.slug });
    tagsByPost.set(tag.post_id, list);
  });

  return posts.map((post) => ({ ...post, tags: tagsByPost.get(post.id) || [] }));
}

/**
 * 查询单篇文章的标签（含 post_count），用于文章详情。
 */
export async function fetchTagsForPost(
  db: D1Database,
  postId: number | string
): Promise<PostTagWithCount[]> {
  const { results } = await db.prepare(`
    SELECT t.id, t.name, t.slug, t.post_count
    FROM tags t
    JOIN post_tags pt ON t.id = pt.tag_id
    WHERE pt.post_id = ?
  `).bind(postId).all<PostTagWithCount>();

  return results;
}
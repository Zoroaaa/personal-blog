/**
 * 数据库查询优化工具
 * 
 * 功能：
 * - 查询结果缓存
 * - 批量查询优化
 * - 查询性能监控
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { D1Database } from '@cloudflare/workers-types';

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const queryCache = new Map<string, CacheEntry<any>>();

const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

export async function cachedQuery<T>(
  db: D1Database,
  cacheKey: string,
  query: string,
  params: any[] = [],
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  const cached = queryCache.get(cacheKey);
  
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const result = await db.prepare(query).bind(...params).all();
  
  queryCache.set(cacheKey, {
    data: result,
    expires: Date.now() + ttl
  });

  return result as T;
}

export function invalidateCache(pattern?: string) {
  if (!pattern) {
    queryCache.clear();
    return;
  }

  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

export async function batchQuery<T>(
  db: D1Database,
  queries: { query: string; params: any[] }[]
): Promise<T[]> {
  const results: T[] = [];
  
  for (const { query, params } of queries) {
    const result = await db.prepare(query).bind(...params).all();
    results.push(result as T);
  }
  
  return results;
}

export async function getPostsWithTags(
  db: D1Database,
  postIds: number[]
): Promise<Map<number, any[]>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const placeholders = postIds.map(() => '?').join(',');
  const { results } = await db.prepare(`
    SELECT pt.post_id, t.id, t.name, t.slug
    FROM post_tags pt
    JOIN tags t ON pt.tag_id = t.id
    WHERE pt.post_id IN (${placeholders})
  `).bind(...postIds).all();

  const tagsByPost = new Map<number, any[]>();
  
  (results as any[]).forEach(tag => {
    if (!tagsByPost.has(tag.post_id)) {
      tagsByPost.set(tag.post_id, []);
    }
    tagsByPost.get(tag.post_id)!.push({
      id: tag.id,
      name: tag.name,
      slug: tag.slug
    });
  });

  return tagsByPost;
}

export function cleanupQueryCache() {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now > entry.expires) {
      queryCache.delete(key);
    }
  }
}

setInterval(cleanupQueryCache, 5 * 60 * 1000);

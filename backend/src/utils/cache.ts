/**
 * 缓存工具函数
 * 提供安全的KV缓存操作
 */

import type { Env } from '../types';

/**
 * 安全地从KV缓存获取数据
 */
export async function safeGetCache(env: Env, key: string): Promise<string | null> {
  try {
    if (env.CACHE) {
      return await env.CACHE.get(key);
    }
    return null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
}

/**
 * 安全地向KV缓存写入数据
 */
export async function safePutCache(
  env: Env, 
  key: string, 
  value: string, 
  options?: { expirationTtl?: number }
): Promise<boolean> {
  try {
    if (env.CACHE) {
      await env.CACHE.put(key, value, options);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error putting cache:', error);
    return false;
  }
}

/**
 * 安全地从KV缓存删除数据
 */
export async function safeDeleteCache(env: Env, key: string): Promise<boolean> {
  try {
    if (env.CACHE) {
      await env.CACHE.delete(key);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting cache:', error);
    return false;
  }
}

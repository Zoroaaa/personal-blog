/**
 * 缓存工具函数
 * 提供安全的KV缓存操作
 *
 * ============================================
 * KV 缓存使用清单 (只有必要功能才使用，额度有限！)
 * ============================================
 *
 * 1. Token 黑名单 (middleware/auth.ts)
 *    - 用途: 用户登出后使 Token 失效
 *    - Key: blacklist:{token}
 *    - TTL: 与 Token 过期时间相同
 *    - 函数: safePutCache, safeGetCache
 *
 * 2. 邮箱验证码存储 (routes/auth.ts)
 *    - 用途: 存储发送的验证码供后续验证
 *    - Key: email_verify:{type}:{email}
 *    - TTL: 600秒 (10分钟)
 *    - 函数: safePutCache, safeGetCache, safeDeleteCache
 *    - 注意: 发送邮件前会先检查KV存储是否成功
 *
 * 3. 验证码频率限制 (routes/auth.ts)
 *    - 用途: 限制单个邮箱发送验证码频率 (1小时10次)
 *    - Key: email_verify_rate:{email}
 *    - TTL: 3600秒 (1小时)
 *    - 函数: safeGetCache, safePutCache
 *
 * 4. 健康检查 (index.ts)
 *    - 用途: 检查 KV 连接状态
 *    - 注意: 只读检查，不影响业务
 *
 * ============================================
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { Env } from '../types';

/**
 * 安全地从KV缓存获取数据
 * 使用场景:
 * - 验证邮箱验证码时读取
 * - 检查Token是否在黑名单
 * - 检查验证码发送频率
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
 * 使用场景:
 * - 存储邮箱验证码 (发送邮件前必须成功)
 * - 记录验证码发送频率
 * - 将Token加入黑名单
 *
 * @returns {boolean} 存储是否成功，失败时返回false
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
 * 使用场景:
 * - 验证码验证成功后删除
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

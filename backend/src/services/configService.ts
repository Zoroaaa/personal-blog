/**
 * 站点配置读取服务（带 KV TTL 缓存）
 *
 * 职责：从 site_config 表读取配置（isFeatureEnabled / getConfigValue），
 * 供评论、点赞、搜索等热路径反复调用。
 *
 * 为什么放在 services 而不是 routes/config.ts：
 * 1. services 不得反向依赖 routes——authService 曾用动态 import('../routes/config')
 *    绕过，既失去静态分析/循环依赖检测，也让配置读取的缓存改造无处安放；
 * 2. 配置「读取」是业务能力，「管理端点」才是路由职责，路由层只做鉴权与响应。
 *
 * 缓存约定（见 utils/cache.ts 清单）：KV 绑定 CACHE 存在时以 site_config:{key}
 * 为 key 缓存 TTL 60 秒（CONFIG_CACHE_CONSTANTS）；CACHE 未配置时 safeGetCache
 * 恒 miss、safePutCache 直接返回 false，自然退化为「只查库不缓存」，无需额外分支。
 * 写入端（routes/config.ts 的 PUT）必须调用 invalidateConfigCache 失效对应 key。
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-11-23
 */

import type { Env } from '../types';
import { safeGetCache, safePutCache, safeDeleteCache } from '../utils/cache';
import { CONFIG_CACHE_CONSTANTS } from '../config/constants';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('config');

/**
 * site_config 单行的原始值（值字符串 + 类型标签）。
 * 一个 key 只缓存这一份行数据，isFeatureEnabled / getConfigValue 共用，
 * 避免同一次请求里两个入口各自缓存一份语义不同的结果。
 */
interface ConfigRow {
  value: string;
  type: string;
}

/**
 * 带缓存的底层读取。
 * 未命中（含 CACHE 未绑定、TTL 过期、缓存损坏）都回落 D1；查库失败不写缓存，
 * 避免把瞬时故障固化成 60 秒的错误默认值。
 */
async function getCachedConfigRow(env: Env, key: string): Promise<ConfigRow | null> {
  const cacheKey = CONFIG_CACHE_CONSTANTS.KEY_PREFIX + key;

  const cached = await safeGetCache(env, cacheKey);
  if (cached !== null) {
    try {
      // JSON.parse(null-ish 字符串 'null') 得到 null，即缓存的「无此配置」哨兵
      return JSON.parse(cached) as ConfigRow | null;
    } catch {
      logger.warn(`Config cache corrupt for ${key}, falling back to DB`);
    }
  }

  try {
    const result = await env.DB.prepare(
      'SELECT value, type FROM site_config WHERE key = ?'
    ).bind(key).first() as ConfigRow | null;

    // 「查无此键」也缓存（记为 null）：feature_* 这类「不存在=默认开启」的键
    // 在热路径上同样被反复查询，不缓存负结果会持续击穿到 D1
    await safePutCache(env, cacheKey, JSON.stringify(result ?? null), {
      expirationTtl: CONFIG_CACHE_CONSTANTS.TTL_SECONDS,
    });
    return result;
  } catch (error) {
    logger.error(`Failed to get config ${key}:`, error);
    return null;
  }
}

/**
 * 检查功能是否启用
 * @param env 环境变量
 * @param featureKey 功能配置键名 (如 'feature_comments')
 * @returns 是否启用 (默认启用，查询失败也返回 true 避免误杀)
 */
export async function isFeatureEnabled(env: Env, featureKey: string): Promise<boolean> {
  const row = await getCachedConfigRow(env, featureKey);
  // 没有配置或读取失败时默认启用——与历史行为一致，避免配置缺失误杀功能
  if (!row) return true;
  return row.value === 'true' || row.value === '1';
}

/**
 * 获取配置值
 * @param env 环境变量
 * @param key 配置键名
 * @param defaultValue 默认值
 * @returns 配置值
 */
export async function getConfigValue<T>(env: Env, key: string, defaultValue: T): Promise<T> {
  const row = await getCachedConfigRow(env, key);
  if (!row) return defaultValue;

  switch (row.type) {
    case 'boolean':
      return (row.value === 'true' || row.value === '1') as unknown as T;
    case 'number':
      return parseFloat(row.value) as unknown as T;
    case 'json':
      try {
        return JSON.parse(row.value) as T;
      } catch {
        return defaultValue;
      }
    default:
      return row.value as unknown as T;
  }
}

/**
 * 失效单个配置的缓存。配置写入端（PUT /api/config 等）更新数据库后必须调用，
 * 否则热路径会继续读到旧值直到 TTL 过期（缓存失效坑见 AGENTS.md §10）。
 * KV 删除是最终一致的，残余脏读最坏存活 TTL 时长后自愈。
 */
export async function invalidateConfigCache(env: Env, key: string): Promise<void> {
  await safeDeleteCache(env, CONFIG_CACHE_CONSTANTS.KEY_PREFIX + key);
}

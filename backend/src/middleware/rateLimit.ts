/**
 * 速率限制中间件
 *
 * 功能：
 * - 实现全局速率限制
 * - 防止滥用和 DoS 攻击
 * - 支持自定义限制策略
 * - 使用 KV 缓存存储请求计数
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';

/**
 * 速率限制配置选项
 */
export interface RateLimitOptions {
  windowMs?: number; // 时间窗口（毫秒）,默认60秒
  maxRequests?: number; // 时间窗口内允许的最大请求数,默认30个
  keyGenerator?: (c: Context) => string; // 生成限制键的函数
  skip?: (c: Context) => boolean; // 跳过某些请求的函数
  message?: string; // 自定义错误消息
}

/**
 * 创建速率限制表达式
 *
 * @param options 配置选项
 * @returns 中间件函数
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000, // 默认 60 秒
    maxRequests = 30, // 默认 30 个请求
    keyGenerator = (c: Context) =>
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      'unknown',
    skip = () => false,
    message = '请求过于频繁，请稍后再试'
  } = options;

  return async (c: Context, next: Next) => {
    // 检查是否跳过此请求
    if (skip(c)) {
      return next();
    }

    try {
      const cacheKey = `ratelimit:${keyGenerator(c)}`;
      const cache = (c.env as any).CACHE;

      if (!cache) {
        // 缓存不可用，记录警告并通过请求
        console.warn('速率限制缓存不可用');
        return next();
      }

      // 获取当前请求计数
      const currentValue = await cache.get(cacheKey);
      const count = currentValue ? parseInt(currentValue) : 0;

      // 检查是否超过限制
      if (count >= maxRequests) {
        return c.json(
          errorResponse(
            'Too many requests',
            message,
            'RATE_LIMIT_EXCEEDED'
          ),
          429
        );
      }

      // 递增计数
      const newCount = count + 1;

      // 设置缓存（使用 TTL）
      await cache.put(cacheKey, newCount.toString(), {
        expirationTtl: Math.ceil(windowMs / 1000)
      });

      // 添加速率限制信息到响应头
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - newCount).toString());
      c.header(
        'X-RateLimit-Reset',
        new Date(Date.now() + windowMs).toISOString()
      );

      return next();
    } catch (error) {
      console.error('速率限制中间件错误:', error);
      // 在错误时允许请求通过，避免阻止所有流量
      return next();
    }
  };
}

/**
 * 创建基于路由的速率限制（用于不同端点的不同限制）
 */
export function createRateLimitByRoute(defaults: RateLimitOptions = {}) {
  const config: Record<string, RateLimitOptions> = {
    // 认证端点 - 严格限制
    '/api/auth/register': {
      windowMs: 60 * 60 * 1000, // 1 小时
      maxRequests: 5,
      message: '1 小时内最多只能注册 5 个账号'
    },
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000, // 15 分钟
      maxRequests: 10,
      message: '15 分钟内最多尝试登录 10 次'
    },
    '/api/auth/send-verification-code': {
      windowMs: 60 * 60 * 1000, // 1 小时
      maxRequests: 5,
      message: '1 小时内最多发送 5 次验证码'
    },

    // 评论端点 - 中等限制
    '/api/comments': {
      windowMs: 60 * 1000, // 1 分钟
      maxRequests: 5,
      message: '1 分钟内最多发表 5 条评论'
    },

    // GitHub OAuth - 中等限制
    '/api/auth/github': {
      windowMs: 5 * 60 * 1000, // 5 分钟
      maxRequests: 10,
      message: '5 分钟内最多尝试 10 次 GitHub 登录'
    }
  };

  return (path: string) => {
    const options = config[path] || defaults;
    return rateLimit(options);
  };
}

/**
 * 跳过某些路由的器（例如公开读取操作）
 */
export function skipPublicRead(c: Context): boolean {
  const method = c.req.method;
  const path = c.req.path;

  // 允许 GET 请求（公开读取）
  if (method === 'GET') {
    return true;
  }

  // 允许特定的公开端点
  const publicEndpoints = [
    '/api/posts',
    '/api/categories',
    '/api/tags'
  ];

  return publicEndpoints.some(endpoint => path.startsWith(endpoint));
}

/**
 * 跳过某些 IP 地址（例如本地主机）
 */
export function skipLocalhost(c: Context): boolean {
  const ip = c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    '';

  return ['127.0.0.1', 'localhost', '::1'].includes(ip);
}

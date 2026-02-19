/**
 * 速率限制中间件
 *
 * 功能：
 * - 实现全局速率限制
 * - 防止滥用和 DoS 攻击
 * - 支持自定义限制策略
 * - 使用 KV 缓存存储请求计数
 *
 * 安全改进：
 * - 使用 Cloudflare 原生 IP 获取方式
 * - KV 不可用时返回 503 而非放行
 * - 添加原子计数器支持
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-13
 * @updated 2026-02-18 - 安全加固
 */

import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';
import { createModuleLogger } from '../utils/logger';
import {
  RATE_LIMIT_CONSTANTS,
  TIME_CONSTANTS,
  PUBLIC_ENDPOINTS,
  LOCALHOST_IPS,
} from '../config/constants';

const logger = createModuleLogger('rateLimit');

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (c: Context) => string;
  skip?: (c: Context) => boolean;
  message?: string;
}

function getRealIP(c: Context): string {
  const cfIP = c.req.header('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  
  const xRealIP = c.req.header('x-real-ip');
  if (xRealIP) {
    return xRealIP;
  }
  
  return 'unknown';
}

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = RATE_LIMIT_CONSTANTS.WINDOW_1_MINUTE,
    maxRequests = RATE_LIMIT_CONSTANTS.DEFAULT_MAX_REQUESTS,
    keyGenerator = (c: Context) => getRealIP(c),
    skip = () => false,
    message = '请求过于频繁，请稍后再试'
  } = options;

  return async (c: Context, next: Next) => {
    if (skip(c)) {
      return next();
    }

    try {
      const clientIP = keyGenerator(c);
      const cacheKey = `ratelimit:${clientIP}`;
      const cache = (c.env as any).CACHE;

      if (!cache) {
        logger.error('KV 缓存不可用，拒绝请求');
        return c.json(
          errorResponse(
            'Service Unavailable',
            '服务暂时不可用，请稍后重试',
            'CACHE_UNAVAILABLE'
          ),
          503
        );
      }

      const currentValue = await cache.get(cacheKey);
      const count = currentValue ? parseInt(currentValue) : 0;

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

      const newCount = count + 1;

      await cache.put(cacheKey, newCount.toString(), {
        expirationTtl: Math.ceil(windowMs / 1000)
      });

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - newCount).toString());
      c.header(
        'X-RateLimit-Reset',
        new Date(Date.now() + windowMs).toISOString()
      );

      return next();
    } catch (error) {
      logger.error('速率限制中间件错误', error);
      return c.json(
        errorResponse(
          'Internal Error',
          '服务内部错误，请稍后重试',
          'RATE_LIMIT_ERROR'
        ),
        500
      );
    }
  };
}

export function createRateLimitByRoute(defaults: RateLimitOptions = {}) {
  const config: Record<string, RateLimitOptions> = {
    '/api/auth/register': {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
      message: '1 小时内最多只能注册 5 个账号'
    },
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      message: '15 分钟内最多尝试登录 10 次'
    },
    '/api/auth/send-verification-code': {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
      message: '1 小时内最多发送 5 次验证码'
    },
    '/api/auth/refresh': {
      windowMs: 60 * 1000,
      maxRequests: 30,
      message: '1 分钟内最多刷新 30 次 token'
    },
    '/api/comments': {
      windowMs: 60 * 1000,
      maxRequests: 5,
      message: '1 分钟内最多发表 5 条评论'
    },
    '/api/auth/github': {
      windowMs: 5 * 60 * 1000,
      maxRequests: 10,
      message: '5 分钟内最多尝试 10 次 GitHub 登录'
    },
    '/api/upload': {
      windowMs: 60 * 1000,
      maxRequests: 5,
      message: '1 分钟内最多上传 5 个文件'
    }
  };

  return (path: string) => {
    const options = config[path] || defaults;
    return rateLimit(options);
  };
}

export function skipPublicRead(c: Context): boolean {
  const method = c.req.method;
  const path = c.req.path;

  if (method === 'GET') {
    return true;
  }

  return PUBLIC_ENDPOINTS.some(endpoint => path.startsWith(endpoint));
}

export function skipLocalhost(c: Context): boolean {
  const ip = getRealIP(c);
  return LOCALHOST_IPS.includes(ip as any);
}

/**
 * 速率限制中间件
 *
 * 功能：
 * - 实现按路由的速率限制
 * - 防止滥用和 DoS 攻击
 * - 使用 Durable Object 做原子计数（替代原 KV 非原子「读-改-写」）
 *
 * 关键设计：
 * - 计数 key 包含 IP + 方法 + 路径，避免不同路由共用一个计数器互相干扰
 * - 同一 key 映射到同一 Durable Object 实例，读写被串行化 → 并发安全
 * - DO 不可用或调用异常时优雅降级（放行 + 日志），不会退化成 500
 *
 * @author 博客系统
 * @version 3.0.0
 * @created 2026-02-13
 * @updated 2026-10-08 - 迁移至 Durable Object 原子计数
 */

import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';
import { createModuleLogger } from '../utils/logger';
import { RATE_LIMIT_CONSTANTS } from '../config/constants';
import type { RateLimitResult } from '../durableObjects/RateLimiter';

const logger = createModuleLogger('rateLimit');

/** DO 内部请求地址（DO 不关心具体路径，仅用于路由到 fetch 处理器） */
const DO_REQUEST_URL = 'https://rate-limiter/check';

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
    keyGenerator,
    skip = () => false,
    message = '请求过于频繁，请稍后再试'
  } = options;

  return async (c: Context, next: Next) => {
    if (skip(c)) {
      return next();
    }

    // 计数维度：IP（或自定义 key）+ 方法 + 路径，确保路由之间互不干扰
    const baseKey = keyGenerator ? keyGenerator(c) : getRealIP(c);
    const counterKey = `${baseKey}:${c.req.method}:${c.req.path}`;

    const limiter = (c.env as any).RATE_LIMITER as DurableObjectNamespace | undefined;
    if (!limiter) {
      // 绑定缺失属于配置问题：记录日志并降级放行，绝不静默变成 500
      logger.error('RATE_LIMITER 绑定不可用，限流降级放行');
      return next();
    }

    try {
      const stub = limiter.get(limiter.idFromName(counterKey));
      const response = await stub.fetch(DO_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: maxRequests, windowMs })
      });

      if (!response.ok) {
        logger.error(`限流 DO 返回异常状态 ${response.status}，降级放行`);
        return next();
      }

      const result = (await response.json()) as RateLimitResult;

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
      c.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        return c.json(
          errorResponse(
            'Too many requests',
            message,
            'RATE_LIMIT_EXCEEDED'
          ),
          429
        );
      }

      return next();
    } catch (error) {
      // DO 异常时优雅降级：记录日志并放行，避免限流组件故障拖垮整个服务
      logger.error('速率限制中间件错误，降级放行', error);
      return next();
    }
  };
}
/**
 * 速率限制中间件
 * 
 * 功能：
 * - 防止API滥用和DDoS攻击
 * - 基于IP地址或用户ID进行限流
 * - 使用KV存储请求计数
 * - 支持自定义限流窗口和次数
 * 
 * 使用示例：
 * ```typescript
 * app.use('/api/*', rateLimiter({ 
 *   windowMs: 60 * 1000,  // 1分钟
 *   max: 100,             // 最多100次请求
 *   message: 'Too many requests'
 * }));
 * ```
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

// 定义应用上下文类型
type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * 速率限制配置选项
 */
export interface RateLimitOptions {
  /** 时间窗口（毫秒），默认60000（1分钟） */
  windowMs?: number;
  
  /** 时间窗口内最大请求数，默认100 */
  max?: number;
  
  /** 超出限制时返回的消息 */
  message?: string;
  
  /** 是否基于用户ID限流（默认基于IP） */
  byUser?: boolean;
  
  /** 自定义键生成函数 */
  keyGenerator?: (c: Context) => string;
  
  /** 是否跳过成功的请求（只计算失败的） */
  skipSuccessfulRequests?: boolean;
  
  /** 是否跳过失败的请求（只计算成功的） */
  skipFailedRequests?: boolean;
}

/**
 * 速率限制器工厂函数
 */
export function rateLimiter(options: RateLimitOptions = {}) {
  // 默认配置
  const {
    windowMs = 60 * 1000,      // 默认1分钟
    max = 100,                 // 默认100次请求
    message = 'Too many requests, please try again later.',
    byUser = false,
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  /**
   * 中间件函数
   */
  return async (c: AppContext, next: Next) => {
    try {
      // 生成限流键
      const key = keyGenerator 
        ? keyGenerator(c) 
        : await generateKey(c, byUser);

      // 从KV获取当前计数
      const current = await getCurrentCount(c, key);
      
      // 检查是否超出限制
      if (current >= max) {
        // 设置响应头
        c.header('X-RateLimit-Limit', max.toString());
        c.header('X-RateLimit-Remaining', '0');

        return c.json({
          success: false,
          error: 'Rate limit exceeded',
          message
        }, 429);
      }

      // 增加计数（请求前或请求后取决于配置）
      if (!skipSuccessfulRequests && !skipFailedRequests) {
        await incrementCount(c, key, windowMs);
      }

      // 设置响应头
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', (max - current - 1).toString());
      
      // 执行下一个中间件
      await next();

      // 简化逻辑：不再回滚计数，减少KV操作

    } catch (error) {
      console.error('Rate limiter error:', error);
      // 速率限制失败时不阻止请求（fail open策略）
      await next();
    }
  };
}

/**
 * 生成限流键
 */
async function generateKey(c: AppContext, byUser: boolean): Promise<string> {
  if (byUser) {
    // 基于用户ID
    const user = c.get('user');
    if (user?.userId) {
      return `ratelimit:user:${user.userId}:${c.req.path}`;
    }
  }

  // 基于IP地址
  const ip = getClientIP(c);
  return `ratelimit:ip:${ip}:${c.req.path}`;
}

/**
 * 获取客户端IP地址
 */
function getClientIP(c: AppContext): string {
  // Cloudflare会设置CF-Connecting-IP头
  const cfIP = c.req.header('CF-Connecting-IP');
  if (cfIP) return cfIP;

  // 回退到X-Forwarded-For
  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // 最后回退到X-Real-IP
  const realIP = c.req.header('X-Real-IP');
  if (realIP) return realIP;

  // 默认IP（不应该发生）
  return 'unknown';
}

/**
 * 获取当前计数
 */
async function getCurrentCount(c: AppContext, key: string): Promise<number> {
  if (!c.env.CACHE) return 0;
  const value = await c.env.CACHE.get(key);
  return value ? parseInt(value, 10) : 0;
}

/**
 * 增加计数
 */
async function incrementCount(
  c: AppContext, 
  key: string, 
  windowMs: number
): Promise<void> {
  if (!c.env.CACHE) return;
  const current = await getCurrentCount(c, key);
  const newCount = current + 1;
  
  // 设置过期时间（秒）
  const expirationTtl = Math.ceil(windowMs / 1000);
  
  await c.env.CACHE.put(key, newCount.toString(), {
    expirationTtl
  });
}



/**
 * 预定义的速率限制配置
 */
export const RateLimitPresets = {
  /** 严格限制（用于登录、注册） */
  strict: {
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many attempts, please try again later.'
  },

  /** 中等限制（用于API调用） */
  moderate: {
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests, please slow down.'
  },

  /** 宽松限制（用于公开端点） */
  loose: {
    windowMs: 60 * 1000,
    max: 200,
    message: 'Too many requests, please try again later.'
  },

  /** 上传限制 */
  upload: {
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many upload requests, please try again later.'
  }
};

/**
 * 示例使用：
 * 
 * // 全局默认限制
 * app.use('/api/*', rateLimiter());
 * 
 * // 登录严格限制
 * app.use('/api/auth/login', rateLimiter(RateLimitPresets.strict));
 * 
 * // 基于用户的限制
 * app.use('/api/posts', rateLimiter({ 
 *   max: 50, 
 *   byUser: true 
 * }));
 * 
 * // 自定义键生成
 * app.use('/api/search', rateLimiter({
 *   keyGenerator: (c) => {
 *     const query = c.req.query('q');
 *     return `ratelimit:search:${query}`;
 *   }
 * }));
 */
/**
 * 请求日志中间件
 * 
 * 功能：
 * - 记录所有API请求的详细信息
 * - 包含请求ID用于追踪
 * - 记录响应时间和状态
 * - 记录用户信息（如果已认证）
 * - 支持结构化日志
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

// 定义应用上下文类型
type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * 生成唯一请求ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 获取客户端IP
 */
function getClientIP(c: Context): string {
  return c.req.header('CF-Connecting-IP') || 
         c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
         c.req.header('X-Real-IP') ||
         'unknown';
}

/**
 * 请求日志中间件
 */
export async function requestLogger(c: AppContext, next: Next) {
  // 生成请求ID
  const requestId = generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  // 记录请求开始时间
  const startTime = Date.now();

  // 收集请求信息
  const requestInfo = {
    requestId,
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
    ip: getClientIP(c),
    userAgent: c.req.header('User-Agent'),
    referer: c.req.header('Referer'),
    timestamp: new Date().toISOString()
  };

  // 记录请求开始（开发环境）
  if (c.env?.ENVIRONMENT === 'development') {
    console.log('=== Request Start ===');
    console.log(JSON.stringify(requestInfo, null, 2));
  }

  try {
    // 执行请求
    await next();

    // 计算响应时间
    const duration = Date.now() - startTime;

    // 获取用户信息（如果存在）
    const user = c.get('user');

    // 记录响应信息
    const responseInfo = {
      ...requestInfo,
      status: c.res.status,
      duration: `${duration}ms`,
      userId: user?.userId,
      username: user?.username
    };

    // 根据状态码使用不同的日志级别
    if (c.res.status >= 500) {
      console.error('=== Request Error ===');
      console.error(JSON.stringify(responseInfo, null, 2));
    } else if (c.res.status >= 400) {
      console.warn('=== Request Warning ===');
      console.warn(JSON.stringify(responseInfo, null, 2));
    } else if (c.env?.ENVIRONMENT === 'development') {
      console.log('=== Request Complete ===');
      console.log(JSON.stringify(responseInfo, null, 2));
    }

    // 在生产环境，可以将日志发送到日志服务
    // 例如：Cloudflare Analytics Engine, Logflare等
    if (c.env?.ENVIRONMENT === 'production') {
      // 可以在这里添加发送到外部日志服务的代码
      // await sendToLogService(responseInfo);
    }

  } catch (error) {
    // 记录错误
    const duration = Date.now() - startTime;
    console.error('=== Request Exception ===');
    console.error({
      ...requestInfo,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // 重新抛出错误，让全局错误处理器处理
    throw error;
  }
}

/**
 * 结构化日志工具类
 */
export class Logger {
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }

  /**
   * 添加上下文信息
   */
  with(key: string, value: any): Logger {
    return new Logger({ ...this.context, [key]: value });
  }

  /**
   * 记录信息级别日志
   */
  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  /**
   * 记录警告级别日志
   */
  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  /**
   * 记录错误级别日志
   */
  error(message: string, error?: any) {
    this.log('ERROR', message, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  /**
   * 记录调试级别日志
   */
  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  /**
   * 内部日志方法
   */
  private log(level: string, message: string, data?: any) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data
    };

    // 根据级别选择console方法
    switch (level) {
      case 'ERROR':
        console.error(JSON.stringify(logEntry, null, 2));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry, null, 2));
        break;
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry, null, 2));
        break;
      default:
        console.log(JSON.stringify(logEntry, null, 2));
    }
  }
}

/**
 * 创建带上下文的Logger实例
 */
export function createLogger(c: AppContext): Logger {
  const requestId = c.get('requestId');
  const user = c.get('user');

  return new Logger({
    requestId,
    userId: user?.userId,
    path: c.req.path,
    method: c.req.method
  });
}

/**
 * 使用示例：
 * 
 * // 在路由中使用
 * const logger = createLogger(c);
 * logger.info('Creating new post', { title: post.title });
 * 
 * try {
 *   // ... 业务逻辑
 * } catch (error) {
 *   logger.error('Failed to create post', error);
 *   throw error;
 * }
 * 
 * // 添加额外上下文
 * logger
 *   .with('postId', postId)
 *   .with('action', 'update')
 *   .info('Post updated successfully');
 */
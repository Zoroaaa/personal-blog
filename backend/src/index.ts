/**
 * 博客系统后端API - 主入口文件
 * 
 * @author 博客系统
 * @version 3.1.0
 * @created 2024-01-01
 * @updated 2026-02-18 - 优化环境变量验证逻辑
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRoutes } from './routes/auth';
import { postRoutes } from './routes/posts';
import { commentRoutes } from './routes/comments';
import { categoryRoutes } from './routes/categories';
import { columnRoutes } from './routes/columns';
import { uploadRoutes } from './routes/upload';
import { analyticsRoutes } from './routes/analytics';
import { adminRoutes } from './routes/admin';
import { configRoutes } from './routes/config';
import { notificationRoutes } from './routes/notifications';
import { adminNotificationRoutes } from './routes/adminNotifications';
import { messageRoutes } from './routes/messages';
import { userRoutes } from './routes/users';
import { userNotificationSettingsRoutes } from './routes/users/notificationSettings';
import { messageSettingsRoutes } from './routes/users/messageSettings';

import { requestLogger } from './middleware/requestLogger';

import type { Env, ApiResponse } from './types';

import { getAllowedOrigins, getBaseUrl } from './config/constants';
import { isAppError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError, RateLimitError, ServiceUnavailableError } from './utils/errors';
import { createModuleLogger } from './utils/logger';

const appLogger = createModuleLogger('config');

export type { Env, ApiResponse } from './types';

const API_VERSION = '3.1.0';

const app = new Hono<{ Bindings: Env }>();

const SKIP_ENV_CHECK_PATHS = ['/', '/health', '/api/health'];

app.use('*', async (c, next) => {
  if (SKIP_ENV_CHECK_PATHS.includes(c.req.path)) {
    return next();
  }

  if (!c.env.DB || !c.env.STORAGE || !c.env.JWT_SECRET) {
    appLogger.error('缺少必需的环境变量');
    return c.json<ApiResponse>({
      success: false,
      error: 'Server configuration error',
      message: 'The server is not properly configured. Please contact the administrator.',
      timestamp: new Date().toISOString()
    }, 500);
  }
  
  await next();
});

// ============= 全局中间件 =============

// 1. 请求日志
app.use('*', logger());
app.use('*', requestLogger);

// 2. CORS配置 (修复: 使用环境变量替代硬编码)
app.use('*', (c, next) => {
  // 获取允许的源
  const allowedOriginsList = getAllowedOrigins(c.env);
  const baseUrl = getBaseUrl(c.env);

  // 应用CORS中间件
  const corsMiddleware = cors({
    origin: (origin) => {
      // 如果没有origin（服务器端请求或直接访问），使用基础URL
      if (!origin) {
        return baseUrl;
      }

      // 检查是否在白名单中
      if (allowedOriginsList.includes(origin)) {
        return origin;
      }

      // 开发环境允许localhost的任意端口
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return origin;
      }

      // 生产环境检查域名是否匹配基域名
      try {
        const url = new URL(origin);
        const baseUrlObj = new URL(baseUrl);
        // 检查是否为同一个域名或其子域名
        if (url.hostname === baseUrlObj.hostname || url.hostname.endsWith('.' + baseUrlObj.hostname)) {
          return origin;
        }
      } catch (error) {
        console.error('Invalid origin URL:', origin);
      }

      // 默认返回基础URL（拒绝跨域）
      return baseUrl;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Post-Token'],
    exposeHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'Content-Length'],
    maxAge: 86400, // 24小时
  });

  return corsMiddleware(c, next);
});



// ============= 根路径和健康检查 =============

/**
 * GET /
 * 根路径 - API信息
 */
app.get('/', (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: {
      name: 'Personal Blog API',
      version: API_VERSION,
      description: 'Modern blog system built with Cloudflare Workers',
      status: 'operational',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        apiHealth: '/api/health',
        api: '/api/*',
        docs: '/api/docs'
      },
      features: [
        'User Authentication (Password & GitHub OAuth)',
        'Post Management (CRUD with Markdown)',
        'Comment System (Nested replies)',
        'Like System',
        'Categories & Tags',
        'Image Upload (R2)',
        'Caching (KV)'
      ]
    }
  });
});

/**
 * GET /health
 * 健康检查端点 - 检查所有服务状态
 * 修复: 增强错误处理和日志
 */
app.get('/health', async (c) => {
  const services = {
    database: 'unknown',
    cache: 'unknown',
    storage: 'unknown'
  };

  // 检查数据库连接
  try {
    if (c.env.DB) {
      await c.env.DB.prepare('SELECT 1').first();
      services.database = 'healthy';
    } else {
      services.database = 'not configured';
      console.error('Database binding not found');
    }
  } catch (error) {
    services.database = 'unhealthy';
    console.error('Database health check failed:', error);
  }

  // 检查KV缓存（可选）
  if (c.env.CACHE) {
    try {
      await c.env.CACHE.get('health-check');
      services.cache = 'healthy';
    } catch (error) {
      services.cache = 'unhealthy';
      console.error('Cache health check failed:', error);
    }
  } else {
    services.cache = 'not configured';
  }

  // 检查R2存储
  try {
    if (c.env.STORAGE) {
      // R2的head对不存在的对象会返回null，这是正常的
      await c.env.STORAGE.head('health-check');
      services.storage = 'healthy';
    } else {
      services.storage = 'not configured';
      console.error('Storage binding not found');
    }
  } catch (error) {
    // R2的head对不存在的对象会返回null，这是正常的
    services.storage = 'healthy';
  }

  // 检查环境变量配置
  const envCheck = {
    jwt_secret: !!c.env.JWT_SECRET,
    github_oauth: !!(c.env.GITHUB_CLIENT_ID && c.env.GITHUB_CLIENT_SECRET),
    frontend_url: !!c.env.FRONTEND_URL,
    storage_url: !!c.env.STORAGE_PUBLIC_URL
  };

  // 只有数据库和存储必须健康，缓存是可选的
  const { cache: _, ...requiredServices } = services;
  const allHealthy = Object.values(requiredServices).every(status => status === 'healthy');

  return c.json<ApiResponse>({
    success: allHealthy,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: c.env?.ENVIRONMENT || 'unknown',
      version: API_VERSION,
      services,
      config: envCheck,
      uptime: Date.now()
    }
  }, allHealthy ? 200 : 503);
});

/**
 * GET /api/health
 * API专用健康检查
 */
app.get('/api/health', (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: API_VERSION
    }
  });
});

// ============= API路由注册 =============

/**
 * 认证相关路由
 */
app.route('/api/auth', authRoutes);

/**
 * 文章相关路由
 */
app.route('/api/posts', postRoutes);

/**
 * 评论相关路由
 */
app.route('/api/comments', commentRoutes);

/**
 * 分类和标签路由
 */
app.route('/api/categories', categoryRoutes);

/**
 * 专栏路由
 */
app.route('/api/columns', columnRoutes);

/**
 * 文件上传路由
 */
app.route('/api/upload', uploadRoutes);

/**
 * 数据分析路由
 */
app.route('/api/analytics', analyticsRoutes);

/**
 * 管理后台路由
 */
app.route('/api/admin', adminRoutes);

/**
 * 配置路由
 */
app.route('/api/config', configRoutes);

/**
 * 通知路由
 */
app.route('/api/notifications', notificationRoutes);

/**
 * 管理员通知路由
 */
app.route('/api/admin/notifications', adminNotificationRoutes);

/**
 * 私信路由
 */
app.route('/api/messages', messageRoutes);

/**
 * 用户通知设置路由（标准RESTful API位置）
 * 注意：必须在 userRoutes 之前注册，否则 /:id 会匹配 /notification-settings
 */
app.route('/api/users/notification-settings', userNotificationSettingsRoutes);

/**
 * 用户私信设置路由
 */
app.route('/api/users/message-settings', messageSettingsRoutes);

app.route('/api/users', userRoutes);

// ============= 错误处理 =============

/**
 * 404 处理 - 未找到的路由
 */
app.notFound((c) => {
  const path = c.req.path;
  const method = c.req.method;
  
  return c.json<ApiResponse>({
    success: false,
    error: 'Not Found',
    message: `The endpoint ${method} ${path} does not exist`,
    data: {
      path,
      method,
      availableEndpoints: [
        'GET /',
        'GET /health',
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/posts',
        'GET /api/posts/:slug',
        'GET /api/comments',
        'GET /api/categories',
        'POST /api/upload'
      ]
    },
    timestamp: new Date().toISOString()
  }, 404);
});

/**
 * 全局错误处理
 * 使用自定义错误类替代字符串匹配
 */
app.onError((err, c) => {
  const errorLogger = createModuleLogger('error');
  errorLogger.error(`请求错误: ${c.req.method} ${c.req.path} - ${err.message}`);

  const isDevelopment = c.env?.ENVIRONMENT === 'development' || false;

  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let userFacingMessage = 'An unexpected error occurred. Please try again later.';
  let errorCode = 'INTERNAL_ERROR';

  if (isAppError(err)) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorCode = err.code;
    
    switch (err.constructor) {
      case UnauthorizedError:
        userFacingMessage = 'Authentication failed. Please log in again.';
        break;
      case ForbiddenError:
        userFacingMessage = 'You do not have permission to access this resource.';
        break;
      case NotFoundError:
        userFacingMessage = 'The requested resource was not found.';
        break;
      case ValidationError:
        userFacingMessage = 'The request contains invalid data. Please check your input.';
        break;
      case ConflictError:
        userFacingMessage = 'The requested operation conflicts with existing data.';
        break;
      case RateLimitError:
        userFacingMessage = 'Too many requests. Please try again later.';
        break;
      case ServiceUnavailableError:
        userFacingMessage = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        userFacingMessage = err.message;
    }
  } else if (err.message.includes('expired')) {
    statusCode = 401;
    errorMessage = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
    userFacingMessage = 'Your session has expired. Please log in again.';
  }

  const responseData: any = {
    success: false,
    error: errorMessage,
    message: userFacingMessage,
    code: errorCode,
    timestamp: new Date().toISOString()
  };

  if (isDevelopment) {
    responseData.data = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }

  return c.json<ApiResponse>(responseData, statusCode as any);
});

// ============= 导出 =============

// 导入响应工具函数
import { successResponse, errorResponse } from './utils/response';

// 导入邮件汇总服务
import { processDigestQueue, cleanupSentDigestItems } from './services/digestService';

export default app;

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  console.log('Scheduled task triggered at:', new Date().toISOString());
  console.log('Cron:', event.cron);
  
  try {
    if (event.cron === '0 8 * * *') {
      console.log('Processing daily digest...');
      const result = await processDigestQueue(env.DB, env, 'daily');
      console.log('Daily digest result:', result);
      
      await cleanupSentDigestItems(env.DB, 30);
    } else if (event.cron === '0 9 * * 1') {
      console.log('Processing weekly digest...');
      const result = await processDigestQueue(env.DB, env, 'weekly');
      console.log('Weekly digest result:', result);
      
      await cleanupSentDigestItems(env.DB, 30);
    } else {
      console.log('Unknown cron schedule, processing both digests...');
      const dailyResult = await processDigestQueue(env.DB, env, 'daily');
      const weeklyResult = await processDigestQueue(env.DB, env, 'weekly');
      console.log('Digest results:', { daily: dailyResult, weekly: weeklyResult });
    }
  } catch (error) {
    console.error('Scheduled task error:', error);
  }
};

// 重新导出响应工具函数，保持向后兼容
export { successResponse, errorResponse };


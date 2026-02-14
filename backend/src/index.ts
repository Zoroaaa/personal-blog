/**
 * 博客系统后端API - 主入口文件 (完全修复版)
 * 
 * 修复内容:
 * 1. 修复CORS中间件中错误使用c.env的问题
 * 2. 健康检查端点跳过环境变量验证(可选)
 * 3. 优化环境变量检查逻辑
 * 
 * @author 博客系统
 * @version 3.0.1
 * @created 2024-01-01
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// 导入路由
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
// 用户资源路由
import { userNotificationSettingsRoutes } from './routes/users/notificationSettings';

// 导入中间件
import { requestLogger } from './middleware/requestLogger';

// 导入类型定义
import type { Env, ApiResponse } from './types';

// 导入配置
import { getAllowedOrigins, getBaseUrl } from './config/constants';

// 导出类型供其他模块使用
export type { Env, ApiResponse } from './types';

// ============= 常量配置 =============

const API_VERSION = '3.0.1';

// ============= 应用初始化 =============

const app = new Hono<{ Bindings: Env }>();

// ============= 启动配置验证 =============

/**
 * 验证必需的环境变量
 * 修复: 健康检查端点可选跳过验证
 */
app.use('*', async (c, next) => {
  // 验证核心必需的环境变量
  const requiredEnvVars = ['DB', 'STORAGE', 'JWT_SECRET'];
  
  for (const varName of requiredEnvVars) {
    if (!c.env[varName as keyof Env]) {
      console.error(`Missing required environment variable: ${varName}`);
      return c.json<ApiResponse>({
        success: false,
        error: 'Server configuration error',
        message: 'The server is not properly configured. Please contact the administrator.',
        timestamp: new Date().toISOString()
      }, 500);
    }
  }
  
  // GitHub OAuth 是可选的
  const hasGithubConfig = c.env.GITHUB_CLIENT_ID && c.env.GITHUB_CLIENT_SECRET;
  if (!hasGithubConfig) {
    console.warn('GitHub OAuth not configured - GitHub login will be disabled');
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

app.route('/api/users', userRoutes);

/**
 * 用户通知设置路由（标准RESTful API位置）
 */
app.route('/api/users/notification-settings', userNotificationSettingsRoutes);

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
 * 修复: 生产环境不暴露错误堆栈和详细信息
 */
app.onError((err, c) => {
  // 记录错误详情(仅在服务器端)
  console.error('=== Global Error Handler ===');
  console.error('Path:', c.req.path);
  console.error('Method:', c.req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);

  // 判断是否为开发环境（默认为生产环境以提高安全性）
  const isDevelopment = c.env?.ENVIRONMENT === 'development' || false;

  // 确定HTTP状态码
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let userFacingMessage = 'An unexpected error occurred. Please try again later.';

  // 根据错误类型返回不同的状态码
  if (err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
    statusCode = 401;
    errorMessage = 'Unauthorized';
    userFacingMessage = 'Authentication failed. Please log in again.';
  } else if (err.message.includes('Forbidden')) {
    statusCode = 403;
    errorMessage = 'Forbidden';
    userFacingMessage = 'You do not have permission to access this resource.';
  } else if (err.message.includes('Not found')) {
    statusCode = 404;
    errorMessage = 'Not found';
    userFacingMessage = 'The requested resource was not found.';
  } else if (err.message.includes('Validation') || err.message.includes('Invalid')) {
    statusCode = 400;
    errorMessage = 'Bad request';
    userFacingMessage = 'The request contains invalid data. Please check your input.';
  } else if (err.message.includes('Conflict')) {
    statusCode = 409;
    errorMessage = 'Conflict';
    userFacingMessage = 'The requested operation conflicts with existing data.';
  } else if (err.message.includes('Rate limit')) {
    statusCode = 429;
    errorMessage = 'Too many requests';
    userFacingMessage = 'Too many requests. Please try again later.';
  }

  // 构建响应数据
  const responseData: any = {
    success: false,
    error: errorMessage,
    message: userFacingMessage,
    timestamp: new Date().toISOString()
  };

  // 仅在开发环境才暴露错误详情
  if (isDevelopment) {
    responseData.data = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause
    };
  }

  // 返回错误响应
  return c.json<ApiResponse>(responseData, statusCode);
});

// ============= 导出 =============

// 导入响应工具函数
import { successResponse, errorResponse } from './utils/response';

export default app;

// 重新导出响应工具函数，保持向后兼容
export { successResponse, errorResponse };


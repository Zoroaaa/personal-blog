/**
 * 博客系统后端API - 主入口文件
 * 
 * 功能：
 * - 统一路由管理
 * - CORS配置
 * - 全局中间件（日志、速率限制、错误处理）
 * - 健康检查端点
 * 
 * 优化内容：
 * 1. 添加速率限制中间件防止滥用
 * 2. 增强错误处理和日志记录
 * 3. 添加配置验证
 * 4. 统一响应格式
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// 导入路由
import { authRoutes } from './routes/auth';
import { postRoutes } from './routes/posts';
import { commentRoutes } from './routes/comments';
import { categoryRoutes } from './routes/categories';
import { uploadRoutes } from './routes/upload';
import { analyticsRoutes } from './routes/analytics';
import { adminRoutes } from './routes/admin';

// 导入中间件
import { rateLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';

// ============= 类型定义 =============

/**
 * Cloudflare Workers环境绑定
 */
export type Env = {
  DB: D1Database;              // D1数据库
  CACHE?: KVNamespace;         // KV缓存（可选）
  STORAGE: R2Bucket;           // R2对象存储
  JWT_SECRET: string;          // JWT密钥
  GITHUB_CLIENT_ID: string;    // GitHub OAuth客户端ID
  GITHUB_CLIENT_SECRET: string; // GitHub OAuth密钥
  FRONTEND_URL: string;        // 前端URL
  STORAGE_PUBLIC_URL: string;  // R2公开访问URL
  ENVIRONMENT: string;         // 运行环境（development/production）
  ENABLE_CACHE?: string;       // 是否启用缓存
  CACHE_HOMEPAGE_ONLY?: string; // 是否只缓存首页
};

/**
 * 统一API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// ============= 常量配置 =============

const API_VERSION = '2.0.0';
const DEFAULT_RATE_LIMIT = 100; // 每分钟最多100次请求
const STRICT_RATE_LIMIT = 10;   // 敏感操作每分钟最多10次

// ============= 应用初始化 =============

const app = new Hono<{ Bindings: Env }>();

// ============= 启动配置验证 =============

/**
 * 验证必需的环境变量
 */
app.use('*', async (c, next) => {
  // 只在首次请求时验证（可以改进为启动时验证）
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
  
  await next();
});

// ============= 全局中间件 =============

// 1. 请求日志
app.use('*', logger());
app.use('*', requestLogger);

// 2. CORS配置
app.use('*', cors({
  origin: (origin) => {
    // 允许的来源列表
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'https://blog.neutronx.uk',
      'https://www.blog.neutronx.uk'
    ];

    // 如果没有origin（服务器端请求或直接访问），使用默认
    if (!origin) {
      return c.env?.FRONTEND_URL || 'https://blog.neutronx.uk';
    }

    // 检查是否在白名单中
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // 开发环境允许localhost的任意端口
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin;
    }

    // 生产环境检查域名
    const url = new URL(origin);
    if (url.hostname.endsWith('.neutronx.uk')) {
      return origin;
    }

    // 默认返回前端URL
    return c.env?.FRONTEND_URL || 'https://blog.neutronx.uk';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposeHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'Content-Length'],
  maxAge: 86400, // 24小时
}));

// 3. 速率限制（全局）
app.use('/api/*', rateLimiter({ 
  windowMs: 60 * 1000,        // 1分钟
  max: DEFAULT_RATE_LIMIT,    // 最多100次请求
  message: 'Too many requests, please try again later.'
}));

// 敏感操作的严格速率限制
app.use('/api/auth/register', rateLimiter({ 
  windowMs: 60 * 1000, 
  max: 5,  // 注册每分钟最多5次
  message: 'Too many registration attempts, please try again later.'
}));

app.use('/api/auth/login', rateLimiter({ 
  windowMs: 60 * 1000, 
  max: STRICT_RATE_LIMIT, 
  message: 'Too many login attempts, please try again later.'
}));

app.use('/api/upload/*', rateLimiter({ 
  windowMs: 60 * 1000, 
  max: 20,  // 上传每分钟最多20次
  message: 'Too many upload requests, please try again later.'
}));

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
        'Caching (KV)',
        'Rate Limiting'
      ]
    }
  });
});

/**
 * GET /health
 * 健康检查端点 - 检查所有服务状态
 */
app.get('/health', async (c) => {
  const services = {
    database: 'unknown',
    cache: 'unknown',
    storage: 'unknown'
  };

  // 检查数据库连接
  try {
    await c.env.DB.prepare('SELECT 1').first();
    services.database = 'healthy';
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
    await c.env.STORAGE.head('health-check');
    services.storage = 'healthy';
  } catch (error) {
    // R2的head对不存在的对象会返回null，这是正常的
    services.storage = 'healthy';
  }

  // 只有数据库和存储必须健康，缓存是可选的
  const requiredServices = { ...services };
  delete requiredServices.cache;
  const allHealthy = Object.values(requiredServices).every(status => status === 'healthy');

  return c.json<ApiResponse>({
    success: allHealthy,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: c.env?.ENVIRONMENT || 'unknown',
      version: API_VERSION,
      services,
      uptime: Date.now() // 可以改进为实际的启动时间
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
 * - POST /api/auth/register - 用户注册
 * - POST /api/auth/login - 用户登录
 * - POST /api/auth/logout - 用户登出
 * - POST /api/auth/github - GitHub OAuth
 * - GET /api/auth/me - 获取当前用户信息
 * - PUT /api/auth/profile - 更新用户资料
 */
app.route('/api/auth', authRoutes);

/**
 * 文章相关路由
 * - GET /api/posts - 获取文章列表
 * - GET /api/posts/:slug - 获取文章详情
 * - POST /api/posts - 创建文章
 * - PUT /api/posts/:id - 更新文章
 * - DELETE /api/posts/:id - 删除文章
 * - POST /api/posts/:id/like - 点赞/取消点赞文章
 */
app.route('/api/posts', postRoutes);

/**
 * 评论相关路由
 * - GET /api/comments - 获取评论列表
 * - POST /api/comments - 发表评论
 * - DELETE /api/comments/:id - 删除评论
 * - POST /api/comments/:id/like - 点赞/取消点赞评论
 */
app.route('/api/comments', commentRoutes);

/**
 * 分类和标签路由
 * - GET /api/categories - 获取所有分类
 * - GET /api/categories/tags - 获取所有标签
 */
app.route('/api/categories', categoryRoutes);

/**
 * 文件上传路由
 * - POST /api/upload - 上传图片
 * - DELETE /api/upload/:filename - 删除文件
 */
app.route('/api/upload', uploadRoutes);

/**
 * 数据分析路由
 * - GET /api/analytics/hot-posts - 获取热门文章
 * - GET /api/analytics/stats - 获取基础统计数据
 * - GET /api/analytics/post/:id - 获取单篇文章的详细分析
 * - GET /api/analytics/users - 获取用户统计
 * - POST /api/analytics/track - 记录页面访问
 */
app.route('/api/analytics', analyticsRoutes);

/**
 * 管理后台路由
 * - GET /api/admin/comments - 获取评论列表
 * - PUT /api/admin/comments/:id/status - 更新评论状态
 * - DELETE /api/admin/comments/:id - 删除评论
 * - GET /api/admin/users - 获取用户列表
 * - PUT /api/admin/users/:id/status - 更新用户状态
 * - PUT /api/admin/users/:id/role - 更新用户角色
 * - GET /api/admin/settings - 获取系统设置
 */
app.route('/api/admin', adminRoutes);

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
 */
app.onError((err, c) => {
  // 记录错误详情
  console.error('=== Global Error Handler ===');
  console.error('Path:', c.req.path);
  console.error('Method:', c.req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  // 判断是否为开发环境
  const isDevelopment = c.env?.ENVIRONMENT === 'development';
  
  // 确定HTTP状态码
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  
  // 根据错误类型返回不同的状态码
  if (err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
    statusCode = 401;
    errorMessage = 'Unauthorized';
  } else if (err.message.includes('Forbidden')) {
    statusCode = 403;
    errorMessage = 'Forbidden';
  } else if (err.message.includes('Not found')) {
    statusCode = 404;
    errorMessage = 'Not found';
  } else if (err.message.includes('Validation') || err.message.includes('Invalid')) {
    statusCode = 400;
    errorMessage = 'Bad request';
  }
  
  // 返回错误响应
  return c.json<ApiResponse>({
    success: false,
    error: errorMessage,
    message: isDevelopment ? err.message : 'An unexpected error occurred. Please try again later.',
    data: isDevelopment ? {
      stack: err.stack,
      name: err.name,
      cause: err.cause
    } : undefined,
    timestamp: new Date().toISOString()
  }, statusCode);
});

// ============= 导出 =============

export default app;

/**
 * 工具函数：创建成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 工具函数：创建错误响应
 */
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 缓存辅助函数
 */

/**
 * 检查缓存是否启用
 */
export function isCacheEnabled(env: Env): boolean {
  return env.ENABLE_CACHE !== 'false';
}

/**
 * 安全地获取缓存
 */
export async function safeGetCache(env: Env, key: string): Promise<string | null> {
  if (!isCacheEnabled(env) || !env.CACHE) {
    return null;
  }
  
  try {
    return await env.CACHE.get(key);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * 安全地写入缓存
 */
export async function safePutCache(
  env: Env, 
  key: string, 
  value: string, 
  options?: { expirationTtl?: number; expiration?: number }
): Promise<void> {
  if (!isCacheEnabled(env) || !env.CACHE) {
    return;
  }
  
  try {
    await env.CACHE.put(key, value, options);
  } catch (error) {
    console.error('Cache put error:', error);
  }
}

/**
 * 安全地删除缓存
 */
export async function safeDeleteCache(env: Env, key: string): Promise<void> {
  if (!isCacheEnabled(env) || !env.CACHE) {
    return;
  }
  
  try {
    await env.CACHE.delete(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}
/**
 * Blog System Backend API
 * 单个Worker整合所有API端点
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

// 类型定义
export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  FRONTEND_URL: string;
  ENVIRONMENT: string;
};

// 创建应用
const app = new Hono<{ Bindings: Env }>();

// 日志中间件
app.use('*', logger());

// CORS配置 - 修复版
app.use('*', cors({
  origin: (origin) => {
    // 允许的来源列表
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://blog.neutronx.uk',
      'https://www.blog.neutronx.uk'
    ];

    // 如果没有origin（服务器端请求或直接访问），允许
    if (!origin) {
      return 'https://blog.neutronx.uk';
    }

    // 检查是否在白名单中
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // 开发环境允许localhost的任意端口
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return origin;
    }

    // 默认返回主域名
    return 'https://blog.neutronx.uk';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-Total-Count', 'Content-Length'],
  maxAge: 86400, // 24小时
}));

// 根路径健康检查
app.get('/', (c) => {
  return c.json({
    name: 'Blog API',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// 健康检查端点
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env?.ENVIRONMENT || 'unknown',
    services: {
      database: c.env?.DB ? 'connected' : 'disconnected',
      cache: c.env?.CACHE ? 'connected' : 'disconnected',
      storage: c.env?.STORAGE ? 'connected' : 'disconnected'
    }
  });
});

// API健康检查
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API路由
app.route('/api/auth', authRoutes);
app.route('/api/posts', postRoutes);
app.route('/api/comments', commentRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/upload', uploadRoutes);

// 404处理
app.notFound((c) => {
  const path = c.req.path;
  return c.json({
    error: 'Not found',
    path,
    message: `The requested endpoint ${path} does not exist`,
    availableEndpoints: [
      '/health',
      '/api/auth/*',
      '/api/posts/*',
      '/api/comments/*',
      '/api/categories/*',
      '/api/upload/*'
    ]
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  
  // 详细的错误信息
  const isDevelopment = c.env?.ENVIRONMENT === 'development';
  
  return c.json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    stack: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  }, 500);
});

export default app;

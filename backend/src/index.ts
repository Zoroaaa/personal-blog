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

// 全局中间件
app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      c.env.FRONTEND_URL,
    ];
    return allowedOrigins.includes(origin) ? origin : c.env.FRONTEND_URL;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', logger());

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
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
  return c.json({ error: 'Not found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal server error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
  }, 500);
});

export default app;

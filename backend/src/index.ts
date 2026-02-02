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

app.use(
  cors({
    origin: (origin, c) => {
      // 允许的来源列表
      const allowedOrigins = new Set([
        'http://localhost:5173',
        'http://localhost:3000',
        'https://blog.neutronx.uk', // ← 直接写死，避免依赖 env（或确保 env 正确）
      ]);

      // 如果请求没有 Origin（如直接浏览器访问），允许（返回 true 表示反射 origin，但这里我们指定）
      if (!origin) {
        return 'https://blog.neutronx.uk'; // 或 '*'（不推荐，因用了 credentials）
      }

      // 如果 origin 在白名单中，允许
      if (allowedOrigins.has(origin)) {
        return origin;
      }

      // 否则拒绝（返回 false 或不设置 header）
      return 'https://blog.neutronx.uk'; // 或 throw error，但 Hono 会忽略非法值
    },
    credentials: true,
    exposeHeaders: ['X-Total-Count'],
  })
);

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

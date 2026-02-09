/**
 * 类型定义文件
 *
 * 包含所有TypeScript类型定义
 *
 * @author 优化版本
 * @version 1.0.0
 */

import type { JWTPayload } from '../utils/jwt';

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
  RESEND_API_KEY?: string;     // Resend 邮件 API Key（邮箱验证码）
  RESEND_FROM_EMAIL?: string; // Resend 发件人邮箱（可选，默认使用 Resend 测试发件人）
};

/**
 * Hono Context Variables 类型
 * 用于扩展 Context 中的变量类型
 */
export type Variables = {
  user: JWTPayload;
  requestId?: string;
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

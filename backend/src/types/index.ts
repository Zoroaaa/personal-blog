/**
 * 类型定义文件
 *
 * 包含所有TypeScript类型定义
 *
 * @author 博客系统
 * @version 1.1.0
 * @created 2024-01-01
 * @updated 2026-02-18 - 添加 POST_PASSWORD_SECRET
 */

import type { JWTPayload, TokenPayload } from '../utils/jwt';

/**
 * Cloudflare Workers环境绑定
 */
export type Env = {
  DB: D1Database;
  CACHE?: KVNamespace;
  STORAGE: R2Bucket;
  JWT_SECRET: string;
  POST_PASSWORD_SECRET?: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  FRONTEND_URL: string;
  STORAGE_PUBLIC_URL: string;
  ENVIRONMENT: string;
  ENABLE_CACHE?: string;
  CACHE_HOMEPAGE_ONLY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
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
  code?: string;
  timestamp?: string;
}

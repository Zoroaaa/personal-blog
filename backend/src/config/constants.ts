/**
 * 应用全局常量配置
 *
 * 功能：
 * - 集中管理所有魔术数字
 * - 提供类型安全的常量访问
 * - 便于调整配置参数
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

/**
 * 认证相关常量
 */
export const AUTH_CONSTANTS = {
  // bcrypt 加密轮次（越高越安全，但计算时间越长）
  BCRYPT_ROUNDS: 12,

  // 邮箱验证码相关
  VERIFICATION_CODE_TTL: 600, // 10 分钟（秒）
  VERIFICATION_CODE_LENGTH: 6,

  // 邮箱速率限制
  EMAIL_VERIFY_RATE_WINDOW: 3600, // 1 小时（秒）
  EMAIL_VERIFY_RATE_MAX: 10, // 1 小时内最多 10 次

  // JWT token 有效期
  JWT_EXPIRY_IN_DAYS: 30,
};

/**
 * 文章相关常量
 */
export const POST_CONSTANTS = {
  // 分页配置
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,

  // 标题和内容长度限制
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 200,
  MIN_CONTENT_LENGTH: 10,
  MAX_CONTENT_LENGTH: 100000,

  // 阅读速度（每分钟字数）
  READING_SPEED: 250,
};

/**
 * 评论相关常量
 */
export const COMMENT_CONSTANTS = {
  // 分页配置
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // 评论内容长度限制
  MIN_COMMENT_LENGTH: 1,
  MAX_COMMENT_LENGTH: 1000,

  // 评论最大深度（嵌套层级）
  MAX_COMMENT_DEPTH: 5,
};

/**
 * 私信相关常量
 */
export const MESSAGE_CONSTANTS = {
  // 分页配置
  MESSAGES_PER_PAGE: 20,

  // 消息长度限制
  MAX_MESSAGE_LENGTH: 2000,

  // 消息撤回时间限制（3分钟）
  RECALL_TIME_LIMIT: 3 * 60 * 1000, // 毫秒
};

/**
 * 通知相关常量
 */
export const NOTIFICATION_CONSTANTS = {
  // 分页配置
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,

  // 通知类型
  TYPES: ['system', 'interaction', 'private_message'] as const,

  // 交互通知子类型
  INTERACTION_SUBTYPES: ['reply', 'like', 'mention'] as const,
};

/**
 * 缓存相关常量
 */
export const CACHE_CONSTANTS = {
  // 缓存过期时间（秒）
  HEALTH_CHECK_TTL: 60,
  CONFIG_TTL: 3600, // 1小时
  USER_TTL: 1800, // 30分钟
  POST_TTL: 3600, // 1小时
  CATEGORY_TTL: 3600, // 1小时
  TAG_TTL: 3600, // 1小时
};

/**
 * 上传相关常量
 */
export const UPLOAD_CONSTANTS = {
  // 允许的文件类型
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],

  // 文件大小限制（字节）
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
};

/**
 * 数据库相关常量
 */
export const DATABASE_CONSTANTS = {
  // 用户角色
  ROLES: ['admin', 'user', 'moderator'] as const,

  // 用户状态
  USER_STATUSES: ['active', 'suspended', 'deleted'] as const,

  // 文章状态
  POST_STATUSES: ['draft', 'published', 'archived'] as const,

  // 文章可见性
  VISIBILITIES: ['public', 'private', 'password'] as const,

  // OAuth提供商
  OAUTH_PROVIDERS: ['github', 'google'] as const,
};

/**
 * 获取环境变量，支持从多个来源取值
 * @param env 环境对象
 * @param key 配置键名
 * @param defaultValue 默认值
 * @returns 配置值
 */
export function getEnvConfig<T>(
  env: Record<string, any>,
  key: string,
  defaultValue: T
): T {
  const value = env[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value as T;
}

/**
 * 获取CORS允许的源
 * @param env 环境对象
 * @returns 允许的源列表
 */
export function getAllowedOrigins(env: Record<string, any>): string[] {
  const allowedOriginsEnv = getEnvConfig(env, 'ALLOWED_ORIGINS', '');

  if (!allowedOriginsEnv) {
    // 如果没有明确配置，使用 FRONTEND_URL 作为默认
    const frontendUrl = getFrontendUrl(env);
    return [frontendUrl];
  }

  // 从环境变量分割，去掉空白
  return allowedOriginsEnv.split(',').map((origin: string) => origin.trim());
}

/**
 * 获取前端URL（博客应用的访问地址）
 * 用于生成邮件链接、重定向等
 * @param env 环境对象
 * @param fallback 备用URL
 * @returns 前端URL
 */
export function getFrontendUrl(env: Record<string, any>, fallback = 'https://blog.example.com'): string {
  return getEnvConfig(env, 'FRONTEND_URL', fallback);
}

/**
 * 获取基础URL（同 getFrontendUrl）
 * 保持向后兼容性
 * @param env 环境对象
 * @param fallback 备用URL
 * @returns 基础URL
 */
export function getBaseUrl(env: Record<string, any>, fallback = 'https://blog.example.com'): string {
  // 改为使用 FRONTEND_URL，兼容旧的 SITE_URL
  return getEnvConfig(env, 'FRONTEND_URL', fallback);
}

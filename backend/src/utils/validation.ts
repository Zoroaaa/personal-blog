/**
 * 输入验证和清理工具
 * 
 * 功能：
 * - 验证用户名、邮箱、密码格式
 * - 清理用户输入防止XSS攻击
 * - 提供常用的验证函数
 * 
 * @author 优化版本
 * @version 2.0.0
 */

// ============= 正则表达式常量 =============

/** 用户名正则：3-20字符，只允许字母、数字、下划线、连字符 */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

/** 邮箱正则 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 主流邮箱域名（用于注册/改密/删号验证码） */
const MAINSTREAM_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.cn', 'yahoo.com.cn',
  'qq.com', '163.com', '126.com', 'sina.com', 'sina.cn', 'foxmail.com', '139.com', '189.cn', 'aliyun.com', 'foxmail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'mail.com', 'zoho.com', 'yandex.com',
  'gmial.com', 'gmai.com', 'gmal.com'
]);

/** 强密码正则：至少8位，包含大小写字母和数字 */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** URL正则 */
const URL_REGEX = /^https?:\/\/.+/;

/** Slug正则：URL友好的字符串 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ============= 验证函数 =============

/**
 * 验证用户名
 * @param username 用户名
 * @returns 错误信息，如果验证通过返回null
 */
export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required';
  }
  
  if (username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  
  if (username.length > 20) {
    return 'Username must be less than 20 characters long';
  }
  
  if (!USERNAME_REGEX.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  
  // 检查保留用户名
  const reserved = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp'];
  if (reserved.includes(username.toLowerCase())) {
    return 'This username is reserved';
  }
  
  return null;
}

/**
 * 验证邮箱地址
 * @param email 邮箱地址
 * @returns 错误信息，如果验证通过返回null
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  
  if (email.length > 254) { // RFC 5321标准
    return 'Email address is too long';
  }
  
  if (!EMAIL_REGEX.test(email)) {
    return 'Invalid email format';
  }
  
  // 检查常见的一次性邮箱域名（可选）
  const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    return 'Disposable email addresses are not allowed';
  }
  
  return null;
}

/**
 * 校验是否为主流正规邮箱（用于发送验证码）
 * @param email 邮箱地址
 * @returns 错误信息，通过返回 null
 */
export function validateMainstreamEmail(email: string): string | null {
  const err = validateEmail(email);
  if (err) return err;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'Invalid email format';
  if (!MAINSTREAM_EMAIL_DOMAINS.has(domain)) {
    return '请使用主流邮箱（如 Gmail、QQ、163、Outlook 等）以接收验证码';
  }
  return null;
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 错误信息，如果验证通过返回null
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  if (password.length > 128) {
    return 'Password is too long';
  }
  
  if (!STRONG_PASSWORD_REGEX.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  
  // 检查常见弱密码
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty123', 
    'abc123456', 'password1', '123456789', 'Password1'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    return 'This password is too common. Please choose a stronger password';
  }
  
  return null;
}

/**
 * 验证URL
 * @param url URL字符串
 * @returns 是否是有效的URL
 */
export function validateUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    return URL_REGEX.test(url);
  } catch {
    return false;
  }
}

/**
 * 验证Slug格式
 * @param slug Slug字符串
 * @returns 错误信息，如果验证通过返回null
 */
export function validateSlug(slug: string): string | null {
  if (!slug) {
    return 'Slug is required';
  }
  
  if (slug.length < 3) {
    return 'Slug must be at least 3 characters long';
  }
  
  if (slug.length > 100) {
    return 'Slug must be less than 100 characters long';
  }
  
  if (!SLUG_REGEX.test(slug)) {
    return 'Slug can only contain lowercase letters, numbers, and hyphens';
  }
  
  return null;
}

/**
 * 验证整数范围
 * @param value 要验证的值
 * @param min 最小值
 * @param max 最大值
 * @returns 错误信息，如果验证通过返回null
 */
export function validateIntRange(
  value: any, 
  min: number, 
  max: number,
  fieldName: string = 'Value'
): string | null {
  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  
  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  
  if (num > max) {
    return `${fieldName} must be no more than ${max}`;
  }
  
  return null;
}

/**
 * 验证字符串长度
 * @param value 要验证的值
 * @param min 最小长度
 * @param max 最大长度
 * @returns 错误信息，如果验证通过返回null
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Value'
): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters long`;
  }
  
  if (value.length > max) {
    return `${fieldName} must be no more than ${max} characters long`;
  }
  
  return null;
}

// ============= 清理函数 =============

/**
 * 清理HTML标签和特殊字符（基础XSS防护）
 * @param input 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    // 移除HTML标签
    .replace(/<[^>]*>/g, '')
    // 转义特殊字符
    .replace(/[<>'"]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      };
      return entities[char] || char;
    })
    // 移除控制字符
    .replace(/[\x00-\x1F\x7F]/g, '')
    // 修剪空白
    .trim();
}

/**
 * 清理Markdown内容（保留Markdown语法，移除危险内容）
 * @param markdown Markdown内容
 * @returns 清理后的内容
 */
export function sanitizeMarkdown(markdown: string): string {
  if (typeof markdown !== 'string') {
    return '';
  }
  
  return markdown
    // 移除<script>标签及内容
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除onclick等事件处理器
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // 移除javascript:伪协议
    .replace(/javascript:/gi, '')
    // 移除data:伪协议（可能包含恶意代码）
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * 清理用于搜索的查询字符串
 * @param query 搜索查询
 * @returns 清理后的查询
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  return query
    // 移除SQL通配符（如果直接用于SQL LIKE）
    .replace(/[%_]/g, '')
    // 移除特殊字符
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .trim()
    .substring(0, 100); // 限制长度
}

// ============= 生成函数 =============

/**
 * 从标题生成URL友好的slug
 * @param title 标题
 * @returns slug字符串
 */
export function generateSlug(title: string): string {
  if (!title) {
    return `post-${Date.now().toString(36)}`;
  }
  
  return title
    .toLowerCase()
    // 中文和英文都转换为连字符分隔
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    // 移除首尾连字符
    .replace(/^-|-$/g, '')
    // 限制长度
    .substring(0, 50)
    // 添加时间戳确保唯一性
    + '-' + Date.now().toString(36);
}

/**
 * 生成随机字符串（用于token等）
 * @param length 长度
 * @returns 随机字符串
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // 使用crypto API生成安全的随机数
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

// ============= 辅助函数 =============

/**
 * 验证对象是否包含所有必需字段
 * @param obj 要验证的对象
 * @param requiredFields 必需字段数组
 * @returns 错误信息数组，如果验证通过返回空数组
 */
export function validateRequiredFields(
  obj: any, 
  requiredFields: string[]
): string[] {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      errors.push(`${field} is required`);
    }
  }
  
  return errors;
}

/**
 * 批量验证
 * @param validations 验证函数数组
 * @returns 第一个错误信息，如果全部通过返回null
 */
export function validate(...validations: (string | null)[]): string | null {
  for (const error of validations) {
    if (error) return error;
  }
  return null;
}

// ============= 类型保护 =============

/**
 * 检查是否为有效的JSON字符串
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否为有效的日期
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 安全地解析整数
 */
export function safeParseInt(value: any, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 安全地解析布尔值
 */
export function safeParseBool(value: any, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
}

// ============= 导出所有函数 =============

export default {
  // 验证
  validateUsername,
  validateEmail,
  validatePassword,
  validateUrl,
  validateSlug,
  validateIntRange,
  validateLength,
  validateRequiredFields,
  validate,
  
  // 清理
  sanitizeInput,
  sanitizeMarkdown,
  sanitizeSearchQuery,
  
  // 生成
  generateSlug,
  generateRandomString,
  
  // 辅助
  isValidJson,
  isValidDate,
  safeParseInt,
  safeParseBool
};

/**
 * 使用示例：
 * 
 * import { validateUsername, validateEmail, sanitizeInput } from './validation';
 * 
 * // 验证用户名
 * const usernameError = validateUsername('john_doe');
 * if (usernameError) {
 *   return c.json({ error: usernameError }, 400);
 * }
 * 
 * // 清理用户输入
 * const cleanTitle = sanitizeInput(userInput);
 * 
 * // 批量验证
 * const error = validate(
 *   validateUsername(username),
 *   validateEmail(email),
 *   validatePassword(password)
 * );
 * if (error) {
 *   return c.json({ error }, 400);
 * }
 */
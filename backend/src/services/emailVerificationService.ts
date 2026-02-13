/**
 * 邮件验证服务
 *
 * 功能：
 * - 统一处理所有邮件验证码逻辑
 * - 生成和验证码验证
 * - 速率限制
 * - 验证码类型管理
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import { AUTH_CONSTANTS } from '../config/constants';
import { safeGetCache, safePutCache, safeDeleteCache } from '../utils/cache';

/**
 * 验证码邮件类型
 */
export type VerificationEmailType = 'register' | 'password' | 'delete' | 'forgot_password';

/**
 * 验证码选项接口
 */
export interface VerificationCodeOptions {
  type: VerificationEmailType;
  email: string;
  userId?: number; // 对于 password/delete 类型，需要提供 userId
}

/**
 * 验证结果接口
 */
export interface VerificationResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * 邮件验证服务类
 */
export class EmailVerificationService {
  /**
   * 生成验证码
   * 生成6位数字验证码
   */
  private static generateVerificationCode(): string {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    let n = 0;
    for (let i = 0; i < 4; i++) {
      n = (n << 8) | bytes[i];
    }
    return String(Math.abs(n) % 1000000).padStart(6, '0');
  }

  /**
   * 检查速率限制
   * @param cache Cloudflare KV 缓存
   * @param type 验证类型
   * @param email 邮箱地址
   * @returns 是否超过限制
   */
  static async checkRateLimit(
    cache: any,
    type: VerificationEmailType,
    email: string
  ): Promise<{ limited: boolean; remaining: number }> {
    const rateKey = `email_verify_rate:${type}:${email.toLowerCase()}`;
    const rateVal = await safeGetCache(cache, rateKey);
    const rateCount = rateVal ? parseInt(rateVal, 10) : 0;

    const limited = rateCount >= AUTH_CONSTANTS.EMAIL_VERIFY_RATE_MAX;
    const remaining = Math.max(0, AUTH_CONSTANTS.EMAIL_VERIFY_RATE_MAX - rateCount);

    return { limited, remaining };
  }

  /**
   * 发送验证码
   * 生成验证码并存储到缓存，准备发送邮件
   *
   * @param db Cloudflare D1 数据库
   * @param cache Cloudflare KV 缓存
   * @param options 验证选项
   * @returns 验证码（用于邮件发送）
   */
  static async sendVerificationCode(
    db: any,
    cache: any,
    options: VerificationCodeOptions
  ): Promise<VerificationResult> {
    const { type, email } = options;
    const normalizedEmail = email.toLowerCase();

    try {
      // 检查速率限制
      const rateKey = `email_verify_rate:${type}:${normalizedEmail}`;
      const rateVal = await safeGetCache(cache, rateKey);
      const rateCount = rateVal ? parseInt(rateVal, 10) : 0;

      if (rateCount >= AUTH_CONSTANTS.EMAIL_VERIFY_RATE_MAX) {
        return {
          success: false,
          message: `邮件发送过于频繁，请在1小时后重试（还剩 ${AUTH_CONSTANTS.EMAIL_VERIFY_RATE_MAX - rateCount} 次机会）`
        };
      }

      // 生成验证码
      const code = this.generateVerificationCode();

      // 存储到缓存
      const kvKey = `email_verify:${type}:${normalizedEmail}`;
      await safePutCache(cache, kvKey, code, AUTH_CONSTANTS.VERIFICATION_CODE_TTL);

      // 更新速率限制计数
      const newRateCount = rateCount + 1;
      await safePutCache(
        cache,
        rateKey,
        String(newRateCount),
        AUTH_CONSTANTS.EMAIL_VERIFY_RATE_WINDOW
      );

      return {
        success: true,
        message: '验证码已发送',
        data: { code, ttl: AUTH_CONSTANTS.VERIFICATION_CODE_TTL }
      };
    } catch (error) {
      console.error('Failed to send verification code:', error);
      return {
        success: false,
        message: '发送验证码失败，请稍后重试'
      };
    }
  }

  /**
   * 验证码验证
   * 检查验证码是否正确，并删除已使用的验证码
   *
   * @param cache Cloudflare KV 缓存
   * @param type 验证类型
   * @param email 邮箱地址
   * @param code 用户输入的验证码
   * @returns 验证结果
   */
  static async verifyCode(
    cache: any,
    type: VerificationEmailType,
    email: string,
    code: string
  ): Promise<VerificationResult> {
    try {
      const normalizedEmail = email.toLowerCase();
      const kvKey = `email_verify:${type}:${normalizedEmail}`;

      // 从缓存获取存储的验证码
      const storedCode = await safeGetCache(cache, kvKey);

      // 验证码不存在或已过期
      if (!storedCode) {
        return {
          success: false,
          message: '验证码已过期或无效，请重新申请'
        };
      }

      // 检查验证码是否匹配
      if (storedCode !== String(code).trim()) {
        return {
          success: false,
          message: '验证码错误，请重新输入'
        };
      }

      // 验证码正确，删除它（一次性使用）
      await safeDeleteCache(cache, kvKey);

      return {
        success: true,
        message: '验证成功'
      };
    } catch (error) {
      console.error('Failed to verify code:', error);
      return {
        success: false,
        message: '验证过程出错，请稍后重试'
      };
    }
  }

  /**
   * 获取验证码类型的中文名称
   */
  static getTypeName(type: VerificationEmailType): string {
    const names: Record<VerificationEmailType, string> = {
      register: '注册',
      password: '修改密码',
      delete: '删除账号',
      forgot_password: '重置密码'
    };
    return names[type] || '邮箱验证';
  }

  /**
   * 获取验证码邮件主题
   */
  static getEmailSubject(type: VerificationEmailType): string {
    const subjects: Record<VerificationEmailType, string> = {
      register: '【注册】邮箱验证码',
      password: '【修改密码】邮箱验证码',
      delete: '【删除账号】邮箱验证码',
      forgot_password: '【重置密码】邮箱验证码'
    };
    return subjects[type] || '【邮箱验证】验证码';
  }

  /**
   * 获取验证码邮件标题
   */
  static getEmailTitle(type: VerificationEmailType): string {
    const titles: Record<VerificationEmailType, string> = {
      register: '邮箱验证 - 注册',
      password: '邮箱验证 - 修改密码',
      delete: '邮箱验证 - 删除账号',
      forgot_password: '邮箱验证 - 重置密码'
    };
    return titles[type] || '邮箱验证';
  }

  /**
   * 检查邮箱是否已被使用（用于注册流程）
   */
  static async checkEmailExists(db: any, email: string): Promise<boolean> {
    try {
      const user = await db
        .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
        .bind(email.toLowerCase())
        .first();
      return !!user;
    } catch (error) {
      console.error('Failed to check email existence:', error);
      return false;
    }
  }

  /**
   * 检查邮箱是否有有效的 OAuth 账户（用于密码重置）
   */
  static async checkEmailIsOAuthOnly(db: any, email: string): Promise<boolean> {
    try {
      const user = await db
        .prepare('SELECT oauth_provider FROM users WHERE email = ? LIMIT 1')
        .bind(email.toLowerCase())
        .first() as { oauth_provider: string | null } | undefined;

      return !!user?.oauth_provider;
    } catch (error) {
      console.error('Failed to check OAuth status:', error);
      return false;
    }
  }

  /**
   * 检查邮箱是否支持（排除一些临时邮箱）
   */
  static isSupportedEmail(email: string): boolean {
    const mainStreamDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'qq.com',
      '163.com',
      '126.com',
      'hotmail.com',
      'foxmail.com',
      'protonmail.com',
      'icloud.com'
    ];

    const domain = email.toLowerCase().split('@')[1];
    // 如果使用自定义域名，也允许
    return mainStreamDomains.includes(domain) || !domain.includes('temp');
  }

  /**
   * 清除所有验证码（调试用）
   * 仅在开发环境下可用
   */
  static async clearAllCodes(cache: any, env: any): Promise<void> {
    if (env.ENVIRONMENT !== 'development') {
      throw new Error('This operation is only available in development mode');
    }

    // 这是一个占位符，实际的清除操作取决于KV的API支持
    console.log('Clearing all verification codes in development mode');
  }
}

/**
 * 导出类型供其他模块使用
 */
export type { VerificationEmailType, VerificationCodeOptions, VerificationResult };

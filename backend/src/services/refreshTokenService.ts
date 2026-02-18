/**
 * Refresh Token 服务
 *
 * 功能：
 * - 创建和存储 refresh token
 * - 验证 refresh token
 * - 撤销 refresh token
 * - 清理过期 token
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-18
 */

import { generateRefreshToken, verifyToken, asJWTToken, asSecret, JWTPayload } from '../utils/jwt';
import { AUTH_CONSTANTS } from '../config/constants';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('refresh');

export interface RefreshTokenResult {
  success: boolean;
  refreshToken?: string;
  message?: string;
}

export interface ValidateRefreshTokenResult {
  success: boolean;
  userId?: number;
  username?: string;
  role?: string;
  message?: string;
}

export class RefreshTokenService {
  private static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async createRefreshToken(
    db: any,
    jwtSecret: string,
    userId: number,
    username: string,
    role: string
  ): Promise<RefreshTokenResult> {
    try {
      const refreshToken = await generateRefreshToken(
        asSecret(jwtSecret),
        { userId, username, role },
        AUTH_CONSTANTS.JWT_REFRESH_TOKEN_EXPIRY
      );

      const tokenHash = await this.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.JWT_REFRESH_TOKEN_EXPIRY * 1000).toISOString();

      await db.prepare(`
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
      `).bind(userId, tokenHash, expiresAt).run();

      return {
        success: true,
        refreshToken
      };
    } catch (error) {
      logger.error('创建 refresh token 失败', error);
      return {
        success: false,
        message: '创建 refresh token 失败'
      };
    }
  }

  static async validateRefreshToken(
    db: any,
    jwtSecret: string,
    refreshToken: string
  ): Promise<ValidateRefreshTokenResult> {
    try {
      const payload = await verifyToken(asJWTToken(refreshToken), asSecret(jwtSecret)) as JWTPayload;

      if (payload.type !== 'refresh') {
        return {
          success: false,
          message: '无效的 token 类型'
        };
      }

      const tokenHash = await this.hashToken(refreshToken);

      const storedToken = await db.prepare(`
        SELECT user_id, expires_at, revoked_at
        FROM refresh_tokens
        WHERE token_hash = ?
      `).bind(tokenHash).first() as { user_id: number; expires_at: string; revoked_at: string | null } | null;

      if (!storedToken) {
        return {
          success: false,
          message: 'refresh token 不存在'
        };
      }

      if (storedToken.revoked_at) {
        return {
          success: false,
          message: 'refresh token 已被撤销'
        };
      }

      if (new Date(storedToken.expires_at) < new Date()) {
        return {
          success: false,
          message: 'refresh token 已过期'
        };
      }

      return {
        success: true,
        userId: payload.userId,
        username: payload.username,
        role: payload.role
      };
    } catch (error) {
      logger.error('验证 refresh token 失败', error);
      return {
        success: false,
        message: '验证 refresh token 失败'
      };
    }
  }

  static async revokeRefreshToken(
    db: any,
    refreshToken: string,
    reason: string = 'user_logout'
  ): Promise<boolean> {
    try {
      const tokenHash = await this.hashToken(refreshToken);

      const result = await db.prepare(`
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = ?
        WHERE token_hash = ? AND revoked_at IS NULL
      `).bind(reason, tokenHash).run();

      return result.success;
    } catch (error) {
      logger.error('撤销 refresh token 失败', error);
      return false;
    }
  }

  static async revokeAllUserTokens(
    db: any,
    userId: number,
    reason: string = 'security'
  ): Promise<boolean> {
    try {
      await db.prepare(`
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = ?
        WHERE user_id = ? AND revoked_at IS NULL
      `).bind(reason, userId).run();

      return true;
    } catch (error) {
      logger.error('撤销用户所有 token 失败', error);
      return false;
    }
  }

  static async cleanupExpiredTokens(db: any): Promise<number> {
    try {
      const result = await db.prepare(`
        DELETE FROM refresh_tokens
        WHERE expires_at < CURRENT_TIMESTAMP OR revoked_at < datetime('now', '-30 days')
      `).run();

      return result.meta.changes || 0;
    } catch (error) {
      logger.error('清理过期 token 失败', error);
      return 0;
    }
  }
}

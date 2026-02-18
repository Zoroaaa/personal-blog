/**
 * 认证服务
 *
 * 功能：
 * - 用户注册
 * - 用户登录
 * - GitHub OAuth登录
 * - 密码重置
 * - 用户资料更新
 * - 密码修改
 * - 账号删除
 * - OAuth令牌管理
 * - Token 刷新机制
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-16
 * @updated 2026-02-18 - 添加 Refresh Token 支持
 */

import bcrypt from 'bcryptjs';
import { generateToken, generateAccessToken, asSecret } from '../utils/jwt';
import { safePutCache } from '../utils/cache';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateMainstreamEmail,
  sanitizeInput
} from '../utils/validation';
import { EmailVerificationService, type VerificationEmailType } from './emailVerificationService';
import { RefreshTokenService } from './refreshTokenService';
import { AUTH_CONSTANTS } from '../config/constants';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';

const BCRYPT_ROUNDS = AUTH_CONSTANTS.BCRYPT_ROUNDS;

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  emailVerificationCode?: string;
}

export interface RegisterResult {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
  };
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export interface GitHubOAuthResult {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export interface ResetPasswordRequest {
  email: string;
  verificationCode: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  emailVerificationCode?: string;
}

export interface DeleteAccountRequest {
  password?: string;
  confirmation: string;
  emailVerificationCode?: string;
}

export class AuthService {
  static async checkRegistrationEnabled(env: any): Promise<boolean> {
    const { isFeatureEnabled } = await import('../routes/config');
    return isFeatureEnabled(env, 'feature_registration');
  }

  static async checkOAuthEnabled(env: any): Promise<boolean> {
    const { isFeatureEnabled } = await import('../routes/config');
    return isFeatureEnabled(env, 'feature_oauth_github');
  }

  static async register(
    db: any,
    env: any,
    body: RegisterRequest
  ): Promise<RegisterResult> {
    const { username, email, password, displayName, emailVerificationCode } = body;
    const emailVerificationRequired = !!env.RESEND_API_KEY;

    if (!username || !email || !password) {
      return {
        success: false,
        message: '请提供用户名、邮箱和密码',
        statusCode: 400
      };
    }

    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email.toLowerCase());
    const cleanDisplayName = displayName ? sanitizeInput(displayName) : cleanUsername;

    if (emailVerificationRequired) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return {
          success: false,
          message: '请先获取并填写 6 位邮箱验证码',
          statusCode: 400
        };
      }
    }

    const usernameError = validateUsername(cleanUsername);
    if (usernameError) {
      return {
        success: false,
        message: usernameError,
        statusCode: 400
      };
    }

    const emailError = emailVerificationRequired
      ? validateMainstreamEmail(cleanEmail)
      : validateEmail(cleanEmail);
    if (emailError) {
      return {
        success: false,
        message: emailError,
        statusCode: 400
      };
    }

    if (emailVerificationRequired) {
      const verifyResult = await EmailVerificationService.verifyCode(
        env,
        'register',
        cleanEmail,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return {
          success: false,
          message: verifyResult.message,
          statusCode: 400
        };
      }
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return {
        success: false,
        message: passwordError,
        statusCode: 400
      };
    }

    const existing = await db.prepare(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL'
    ).bind(cleanUsername, cleanEmail).first();

    if (existing) {
      return {
        success: false,
        message: 'Username or email is already registered',
        statusCode: 409
      };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await db.prepare(
      `INSERT INTO users (username, email, password_hash, display_name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      cleanUsername,
      cleanEmail,
      passwordHash,
      cleanDisplayName,
      'user'
    ).run();

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create user in database',
        statusCode: 500
      };
    }

    const userId = result.meta.last_row_id;

    const token = await generateAccessToken(
      asSecret(env.JWT_SECRET),
      { userId, username: cleanUsername, role: 'user' },
      AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY
    );

    const refreshTokenResult = await RefreshTokenService.createRefreshToken(
      db,
      env.JWT_SECRET,
      userId,
      cleanUsername,
      'user'
    );

    return {
      success: true,
      message: 'Registration successful',
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        displayName: cleanDisplayName,
        avatarUrl: null,
        bio: null,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      token,
      refreshToken: refreshTokenResult.refreshToken,
      expiresIn: AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY,
      statusCode: 201
    };
  }

  static async login(
    db: any,
    env: any,
    body: LoginRequest
  ): Promise<LoginResult> {
    const { username, password } = body;

    if (!username || !password) {
      return {
        success: false,
        message: 'Please provide username and password',
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT id, username, email, password_hash, display_name, avatar_url, bio, role, status FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL'
    ).bind(username, username).first() as any;

    if (!user) {
      return {
        success: false,
        message: 'Username or password is incorrect',
        statusCode: 401
      };
    }

    if (user.status === 'suspended') {
      return {
        success: false,
        message: '该账户已被暂停，请联系管理员',
        statusCode: 403
      };
    }

    if (user.status === 'deleted') {
      return {
        success: false,
        message: '该账户已被删除',
        statusCode: 403
      };
    }

    if (!user.password_hash) {
      return {
        success: false,
        message: 'This account uses OAuth login. Please sign in with GitHub.',
        statusCode: 401
      };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return {
        success: false,
        message: 'Username or password is incorrect',
        statusCode: 401
      };
    }

    const token = await generateAccessToken(
      asSecret(env.JWT_SECRET),
      { userId: user.id, username: user.username, role: user.role },
      AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY
    );

    const refreshTokenResult = await RefreshTokenService.createRefreshToken(
      db,
      env.JWT_SECRET,
      user.id,
      user.username,
      user.role
    );

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role,
      },
      token,
      refreshToken: refreshTokenResult.refreshToken,
      expiresIn: AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY,
      statusCode: 200
    };
  }

  static async githubOAuth(
    db: any,
    env: any,
    code: string
  ): Promise<GitHubOAuthResult> {
    if (!code) {
      return {
        success: false,
        message: 'GitHub authorization code is required',
        statusCode: 400
      };
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return {
        success: false,
        message: 'GitHub login is not properly configured on the server',
        statusCode: 500
      };
    }

    let tokenData: any;
    let githubUser: any;
    let githubEmail: string | undefined;

    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({})) as { error?: string };
        return {
          success: false,
          message: `Failed to exchange code for access token: ${errorData.error || `HTTP ${tokenResponse.status}`}`,
          statusCode: 400
        };
      }

      tokenData = await tokenResponse.json() as any;

      if (!tokenData.access_token) {
        return {
          success: false,
          message: `Failed to get access token from GitHub: ${tokenData.error || 'Unknown error'}`,
          statusCode: 400
        };
      }

      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Personal Blog OAuth App',
        },
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({})) as { message?: string };
        return {
          success: false,
          message: `Failed to get user information: ${errorData.message || `HTTP ${userResponse.status}`}`,
          statusCode: 400
        };
      }

      githubUser = await userResponse.json() as any;

      if (!githubUser || !githubUser.id) {
        return {
          success: false,
          message: 'Failed to get user information from GitHub',
          statusCode: 400
        };
      }

      githubEmail = githubUser.email;

      try {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
            'User-Agent': 'Personal Blog OAuth App',
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json() as any[];
          const primaryEmail = emails.find(e => e.primary && e.verified);
          if (primaryEmail) {
            githubEmail = primaryEmail.email;
          }
        }
      } catch (emailError) {
        console.warn('Error fetching GitHub emails:', emailError);
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error when communicating with GitHub',
        statusCode: 500
      };
    }

    let user = await db.prepare(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ? AND deleted_at IS NULL'
    ).bind('github', githubUser.id.toString()).first() as any;

    if (!user) {
      const username = githubUser.login;
      const email = githubEmail || `${githubUser.login}@github.oauth`;

      const existing = await db.prepare(
        'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL'
      ).bind(username).first();

      const finalUsername = existing
        ? `${username}_${Date.now().toString(36)}`
        : username;

      try {
        const result = await db.prepare(
          `INSERT INTO users (username, email, display_name, avatar_url, oauth_provider, oauth_id, role, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(
          finalUsername,
          email,
          githubUser.name || finalUsername,
          githubUser.avatar_url,
          'github',
          githubUser.id.toString(),
          'user'
        ).run();

        user = {
          id: result.meta.last_row_id,
          username: finalUsername,
          email,
          display_name: githubUser.name || finalUsername,
          avatar_url: githubUser.avatar_url,
          role: 'user',
        };
      } catch (dbError) {
        return {
          success: false,
          message: 'Failed to create user account. Please try again.',
          statusCode: 500
        };
      }
    } else {
      if (user.status === 'suspended') {
        return {
          success: false,
          message: '该账户已被暂停，请联系管理员',
          statusCode: 403
        };
      }

      if (user.status === 'deleted') {
        return {
          success: false,
          message: '该账户已被删除',
          statusCode: 403
        };
      }
    }

    try {
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      await db.prepare(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, scopes, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, provider) DO UPDATE SET
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           scopes = excluded.scopes,
           expires_at = excluded.expires_at,
           updated_at = CURRENT_TIMESTAMP`
      ).bind(
        user.id,
        'github',
        tokenData.access_token,
        tokenData.refresh_token || null,
        tokenData.scope || null,
        expiresAt
      ).run();
    } catch (tokenError) {
      console.error('Failed to store OAuth token:', tokenError);
    }

    const token = await generateAccessToken(
      asSecret(env.JWT_SECRET),
      { userId: user.id, username: user.username, role: user.role },
      AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY
    );

    const refreshTokenResult = await RefreshTokenService.createRefreshToken(
      db,
      env.JWT_SECRET,
      user.id,
      user.username,
      user.role
    );

    return {
      success: true,
      message: 'GitHub login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio || null,
        role: user.role,
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: user.updated_at || new Date().toISOString()
      },
      token,
      refreshToken: refreshTokenResult.refreshToken,
      expiresIn: AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY,
      statusCode: 200
    };
  }

  static async resetPassword(
    db: any,
    env: any,
    body: ResetPasswordRequest
  ): Promise<{ success: boolean; message: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const { email: bodyEmail, verificationCode, newPassword } = body;

    if (!bodyEmail || !verificationCode || !newPassword) {
      return {
        success: false,
        message: '请提供邮箱、验证码和新密码',
        statusCode: 400
      };
    }

    const email = sanitizeInput(String(bodyEmail).toLowerCase());
    const code = String(verificationCode).trim();

    if (code.length !== 6) {
      return {
        success: false,
        message: '请输入 6 位验证码',
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT id, oauth_provider, password_hash FROM users WHERE email = ? AND deleted_at IS NULL'
    ).bind(email).first() as any;

    if (!user) {
      return {
        success: false,
        message: '验证码错误或已过期，请重新获取',
        statusCode: 400
      };
    }

    if (user.oauth_provider) {
      return {
        success: false,
        message: '该账号使用第三方登录，无法重置密码',
        statusCode: 400
      };
    }

    const verifyResult = await EmailVerificationService.verifyCode(
      env,
      'forgot_password',
      email,
      code
    );
    if (!verifyResult.success) {
      return {
        success: false,
        message: verifyResult.message,
        statusCode: 400
      };
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return {
        success: false,
        message: passwordError,
        statusCode: 400
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(passwordHash, user.id).run();

    return {
      success: true,
      message: '密码重置成功，请使用新密码登录',
      statusCode: 200
    };
  }

  static async logout(
    db: any,
    env: any,
    token: string,
    refreshToken?: string
  ): Promise<{ success: boolean; message: string }> {
    await safePutCache(env, `blacklist:${token}`, '1', {
      expirationTtl: AUTH_CONSTANTS.TOKEN_BLACKLIST_TTL,
    });

    if (refreshToken) {
      await RefreshTokenService.revokeRefreshToken(db, refreshToken, 'user_logout');
    }

    return {
      success: true,
      message: 'Logout successful'
    };
  }

  static async refreshAccessToken(
    db: any,
    env: any,
    refreshToken: string
  ): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    message?: string;
    statusCode?: 200 | 401 | 403 | 500;
  }> {
    const validateResult = await RefreshTokenService.validateRefreshToken(
      db,
      env.JWT_SECRET,
      refreshToken
    );

    if (!validateResult.success) {
      return {
        success: false,
        message: validateResult.message || 'Invalid refresh token',
        statusCode: 401
      };
    }

    await RefreshTokenService.revokeRefreshToken(db, refreshToken, 'token_refresh');

    const newToken = await generateAccessToken(
      asSecret(env.JWT_SECRET),
      { userId: validateResult.userId!, username: validateResult.username!, role: validateResult.role! },
      AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY
    );

    const newRefreshTokenResult = await RefreshTokenService.createRefreshToken(
      db,
      env.JWT_SECRET,
      validateResult.userId!,
      validateResult.username!,
      validateResult.role!
    );

    return {
      success: true,
      token: newToken,
      refreshToken: newRefreshTokenResult.refreshToken,
      expiresIn: AUTH_CONSTANTS.JWT_ACCESS_TOKEN_EXPIRY
    };
  }

  static async getCurrentUser(
    db: any,
    userId: number
  ): Promise<{
    success: boolean;
    user?: any;
    message?: string;
    statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
  }> {
    const user = await db.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(userId).first() as any;

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    const postCount = await db.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND status = ? AND deleted_at IS NULL'
    ).bind(userId, 'published').first() as any;

    const commentCount = await db.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND status = ? AND deleted_at IS NULL'
    ).bind(userId, 'approved').first() as any;

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        postCount: postCount?.count || 0,
        commentCount: commentCount?.count || 0
      }
    };
  }

  static async updateProfile(
    db: any,
    userId: number,
    body: UpdateProfileRequest
  ): Promise<{
    success: boolean;
    user?: any;
    message?: string;
    statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
  }> {
    const { displayName, bio, avatarUrl } = body;
    const updates: any = {};

    if (displayName !== undefined) {
      const cleaned = sanitizeInput(displayName);
      if (cleaned.length < 1 || cleaned.length > 50) {
        return {
          success: false,
          message: 'Display name must be between 1 and 50 characters',
          statusCode: 400
        };
      }
      updates.display_name = cleaned;
    }

    if (bio !== undefined) {
      const cleaned = sanitizeInput(bio);
      if (cleaned.length > 500) {
        return {
          success: false,
          message: 'Bio must be less than 500 characters',
          statusCode: 400
        };
      }
      updates.bio = cleaned;
    }

    if (avatarUrl !== undefined) {
      try {
        new URL(avatarUrl);
        updates.avatar_url = avatarUrl;
      } catch {
        return {
          success: false,
          message: 'Please provide a valid URL',
          statusCode: 400
        };
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        message: 'Please provide at least one field to update',
        statusCode: 400
      };
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.prepare(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...values, userId).run();

    const userData = await db.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(userId).first() as any;

    return {
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        displayName: userData.display_name,
        avatarUrl: userData.avatar_url,
        bio: userData.bio,
        role: userData.role,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      },
      message: 'Profile updated successfully'
    };
  }

  static async changePassword(
    db: any,
    env: any,
    userId: number,
    body: ChangePasswordRequest
  ): Promise<{ success: boolean; message: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const { currentPassword, newPassword, emailVerificationCode } = body;

    if (!currentPassword || !newPassword) {
      return {
        success: false,
        message: '请提供当前密码和新密码',
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT password_hash, email FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(userId).first() as any;

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    const emailVerificationRequired = !!env.RESEND_API_KEY;
    if (emailVerificationRequired) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return {
          success: false,
          message: '请先获取并填写 6 位邮箱验证码',
          statusCode: 400
        };
      }
      const verifyResult = await EmailVerificationService.verifyCode(
        env,
        'password',
        user.email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return {
          success: false,
          message: verifyResult.message,
          statusCode: 400
        };
      }
    }

    if (!user.password_hash) {
      return {
        success: false,
        message: 'This account uses OAuth login. Password change is not supported.',
        statusCode: 400
      };
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return {
        success: false,
        message: 'Current password is incorrect',
        statusCode: 401
      };
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return {
        success: false,
        message: passwordError,
        statusCode: 400
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(passwordHash, userId).run();

    return {
      success: true,
      message: 'Password updated successfully'
    };
  }

  static async deleteAccount(
    db: any,
    env: any,
    userId: number,
    body: DeleteAccountRequest
  ): Promise<{ success: boolean; message: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const { password, confirmation, emailVerificationCode } = body;

    if (confirmation !== 'DELETE') {
      return {
        success: false,
        message: '请输入 DELETE 确认删除账号',
        statusCode: 400
      };
    }

    const user = await db.prepare(
      'SELECT password_hash, email FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(userId).first() as any;

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }

    const emailVerificationRequired = !!env.RESEND_API_KEY;
    if (emailVerificationRequired) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return {
          success: false,
          message: '请先获取并填写 6 位邮箱验证码',
          statusCode: 400
        };
      }
      const verifyResult = await EmailVerificationService.verifyCode(
        env,
        'delete',
        user.email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return {
          success: false,
          message: verifyResult.message,
          statusCode: 400
        };
      }
    }

    if (user.password_hash) {
      if (!password) {
        return {
          success: false,
          message: '删除账号需要输入密码',
          statusCode: 400
        };
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return {
          success: false,
          message: 'Password is incorrect',
          statusCode: 401
        };
      }
    }

    await SoftDeleteHelper.softDelete(db, 'users', userId);

    return {
      success: true,
      message: 'Account deleted successfully'
    };
  }

  static async refreshOAuthToken(
    db: any,
    userId: number,
    provider: string
  ): Promise<{ success: boolean; accessToken?: string; message?: string }> {
    try {
      const tokenData = await db.prepare(
        'SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?'
      ).bind(userId, provider).first() as any;

      if (!tokenData) {
        return {
          success: false,
          message: '未找到OAuth令牌'
        };
      }

      const now = new Date();
      const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;

      if (!expiresAt || expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return {
          success: true,
          accessToken: tokenData.access_token
        };
      }

      if (provider === 'github') {
        return {
          success: false,
          message: 'GitHub令牌已过期，需要重新授权'
        };
      }

      return {
        success: false,
        message: '该认证提供商不支持令牌刷新'
      };
    } catch (error) {
      console.error('OAuth令牌刷新失败:', error);
      return {
        success: false,
        message: 'OAuth令牌刷新失败'
      };
    }
  }
}

export function validateVerificationType(type: string): type is VerificationEmailType {
  return ['register', 'password', 'delete', 'forgot_password'].includes(type);
}

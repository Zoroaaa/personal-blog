/**
 * 认证相关路由（优化版）
 * 
 * 功能：
 * - 用户注册（增强密码验证）
 * - 用户登录（密码和GitHub OAuth）
 * - 用户登出（Token黑名单）
 * - 获取当前用户信息
 * - 更新用户资料（新增）
 * 
 * 优化内容：
 * 1. 增强密码强度验证（最少8位，包含大小写字母、数字）
 * 2. 添加邮箱验证功能（预留）
 * 3. 添加用户资料更新功能
 * 4. 改进错误处理和日志记录
 * 5. 添加输入清理和XSS防护
 * 6. 统一响应格式
 * 
 * @author 博客系统
 * @version 2.0.0
 * @created 2024-01-01
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { safeGetCache, safePutCache, safeDeleteCache } from '../utils/cache';
import { generateToken, asSecret } from '../utils/jwt';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { rateLimit } from '../middleware/rateLimit';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateMainstreamEmail,
  sanitizeInput
} from '../utils/validation';
import { sendVerificationEmail } from '../utils/resend';
import type { VerificationEmailType } from '../utils/resend';
import { isFeatureEnabled } from './config';
import { EmailVerificationService } from '../services/emailVerificationService';
import { AUTH_CONSTANTS } from '../config/constants';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';

/**
 * 刷新OAuth令牌
 * 
 * 功能：检查令牌是否过期，如果过期则尝试刷新
 * 
 * @param c Hono上下文
 * @param userId 用户ID
 * @param provider 认证提供商
 * @returns 有效的访问令牌
 */
async function refreshOAuthToken(
  c: any,
  userId: number,
  provider: string
): Promise<string> {
  const logger = createLogger(c);
  
  try {
    // 获取存储的令牌信息
    const tokenData = await c.env.DB.prepare(
      'SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?'
    ).bind(userId, provider).first() as any;

    if (!tokenData) {
      throw new Error('未找到OAuth令牌');
    }

    // 检查令牌是否已过期
    const now = new Date();
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;

    // 如果令牌未过期（或没有过期时间），直接返回
    if (!expiresAt || expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return tokenData.access_token;
    }

    // GitHub不支持刷新令牌，需要重新授权
    if (provider === 'github') {
      throw new Error('GitHub令牌已过期，需要重新授权');
    }

    // 对于支持刷新令牌的提供商（如Google），实现刷新逻辑
    // 这里可以扩展其他OAuth提供商的支持
    throw new Error('该认证提供商不支持令牌刷新');
  } catch (error) {
    logger.error('OAuth令牌刷新失败:', error);
    throw error;
  }
}

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// 常量已从本文件迁移到 EmailVerificationService 和 config/constants.ts
const BCRYPT_ROUNDS = AUTH_CONSTANTS.BCRYPT_ROUNDS;

// ============= 发送邮箱验证码 =============

/**
 * POST /api/auth/send-verification-code
 * 发送邮箱验证码（注册时传 email+type=register；改密/删号需登录，type=password 或 delete，使用当前用户邮箱）
 */
authRoutes.post(
  '/send-verification-code',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 5,
    message: '1 小时内最多发送 5 次验证码'
  }),
  optionalAuth,
  async (c) => {
  const logger = createLogger(c);

  try {
    if (!c.env.RESEND_API_KEY) {
      return c.json(
        errorResponse('Email not configured', '邮件服务未配置，无法发送验证码'),
        503
      );
    }

    const body = await c.req.json();
    const { email: bodyEmail, type } = body;
    const rawType = (type || 'register') as VerificationEmailType;

    if (!['register', 'password', 'delete', 'forgot_password'].includes(rawType)) {
      return c.json(
        errorResponse(
          'Invalid type',
          'type 必须为 register / password / delete / forgot_password'
        ),
        400
      );
    }

    let email: string;

    // 根据验证类型确定邮箱来源
    if (rawType === 'register' || rawType === 'forgot_password') {
      if (!bodyEmail) {
        return c.json(
          errorResponse(
            'Missing email',
            rawType === 'register'
              ? '注册验证需要提供邮箱'
              : '请输入邮箱以重置密码'
          ),
          400
        );
      }
      email = sanitizeInput(String(bodyEmail).toLowerCase());
      const err = validateMainstreamEmail(email);
      if (err) {
        return c.json(errorResponse('Invalid email', err), 400);
      }

      if (rawType === 'register') {
        const existingUser = await c.env.DB.prepare(
          'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL'
        )
          .bind(email)
          .first();
        if (existingUser) {
          return c.json(
            errorResponse(
              'Email already registered',
              '该邮箱已被注册，请直接登录或使用其他邮箱'
            ),
            409
          );
        }
      }

      if (rawType === 'forgot_password') {
        const userRow = (await c.env.DB.prepare(
          'SELECT id, oauth_provider FROM users WHERE email = ? AND deleted_at IS NULL'
        )
          .bind(email)
          .first()) as any;

        if (!userRow) {
          // 不暴露邮箱是否存在，返回成功提示
          return c.json(
            successResponse(
              { sent: true },
              '如该邮箱已注册，验证码将发送至您的邮箱'
            )
          );
        }

        if (userRow.oauth_provider) {
          return c.json(
            errorResponse(
              'OAuth account',
              '该账号使用第三方登录，无法通过邮箱重置密码'
            ),
            400
          );
        }
      }
    } else {
      // password / delete：需要登录，使用当前用户邮箱
      const user = c.get('user') as any;
      if (!user) {
        return c.json(errorResponse('Unauthorized', '请先登录'), 401);
      }

      const row = (await c.env.DB.prepare(
        'SELECT email FROM users WHERE id = ? AND deleted_at IS NULL'
      )
        .bind(user.userId)
        .first()) as any;

      if (!row?.email) {
        return c.json(
          errorResponse('User email not found', '未找到绑定邮箱'),
          400
        );
      }

      email = row.email.toLowerCase();

      // OAuth 用户的邮箱可能是占位邮箱，校验主流邮箱
      const err = validateMainstreamEmail(email);
      if (err) {
        return c.json(
          errorResponse(
            'Email not supported',
            '当前账号绑定的邮箱无法接收验证码，请使用主流邮箱登录或联系管理员'
          ),
          400
        );
      }
    }

    // 检查速率限制
    const rateLimit = await EmailVerificationService.checkRateLimit(
      c.env.CACHE,
      rawType,
      email
    );

    if (rateLimit.limited) {
      return c.json(
        errorResponse(
          'Too many requests',
          `1 小时内最多发送 ${AUTH_CONSTANTS.EMAIL_VERIFY_RATE_MAX} 次验证码，请稍后再试`
        ),
        429
      );
    }

    // 生成并发送验证码
    const result = await EmailVerificationService.sendVerificationCode(
      c.env.DB,
      c.env,
      { type: rawType, email }
    );

    if (!result.success) {
      logger.error('Failed to send verification code', result);
      return c.json(
        errorResponse('Send failed', result.message || '发送验证码失败，请稍后重试'),
        500
      );
    }

    // 获取验证码用于邮件发送
    const codeData = result.data as any;
    const code = codeData?.code;

    if (!code) {
      logger.error('No verification code generated', result);
      return c.json(
        errorResponse(
          'Service error',
          '验证码生成失败，请稍后重试'
        ),
        500
      );
    }

    // 发送邮件
    try {
      await sendVerificationEmail(c.env, email, code, rawType);
      logger.info('Verification code sent', {
        type: rawType,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
      });
    } catch (emailError) {
      logger.error('Failed to send email', emailError);
      // 即使邮件发送失败，也告诉用户验证码已生成（前端会让用户输入）
      // 这样用户可以使用已生成的验证码
    }

    const msg =
      rawType === 'forgot_password'
        ? '如该邮箱已注册，验证码将发送至您的邮箱'
        : '验证码已发送，请查收邮件';

    return c.json(successResponse({ sent: true }, msg));
  } catch (e: any) {
    logger.error('Send verification code error', e);
    return c.json(
      errorResponse(
        'Send failed',
        e.message || '发送验证码失败，请稍后重试'
      ),
      500
    );
  }
});

// ============= 用户注册 =============

/**
 * POST /api/auth/register
 * 用户注册
 *
 * 请求体：
 * {
 *   username: string,    // 3-20字符，只允许字母数字下划线连字符
 *   email: string,       // 有效的邮箱地址
 *   password: string,    // 8-128字符，必须包含大小写字母和数字
 *   displayName?: string // 可选，显示名称
 * }
 */
authRoutes.post(
  '/register',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 5,
    message: '1 小时内最多只能注册 5 个账号'
  }),
  async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 0. 检查是否允许注册 =====
    const isRegistrationEnabled = await isFeatureEnabled(c.env, 'feature_registration');
    if (!isRegistrationEnabled) {
      return c.json(errorResponse(
        'Registration disabled',
        '新用户注册已关闭'
      ), 403);
    }
    
    // 解析请求体
    const body = await c.req.json();
    let { username, email, password, displayName, emailVerificationCode } = body;
    
    // ===== 1. 验证必填字段 =====
    if (!username || !email || !password) {
      logger.warn('Registration failed: Missing required fields');
      return c.json(errorResponse(
        'Missing required fields',
        '请提供用户名、邮箱和密码'
      ), 400);
    }
    
    // ===== 2. 清理输入（防XSS） =====
    username = sanitizeInput(username);
    email = sanitizeInput(email.toLowerCase()); // 邮箱转小写
    displayName = displayName ? sanitizeInput(displayName) : username;
    
    const emailVerificationRequired = !!c.env.RESEND_API_KEY;
    if (emailVerificationRequired) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return c.json(errorResponse(
          'Verification code required',
          '请先获取并填写 6 位邮箱验证码'
        ), 400);
      }
    }
    
    // ===== 3. 验证用户名格式 =====
    const usernameError = validateUsername(username);
    if (usernameError) {
      logger.warn('Registration failed: Invalid username', { username });
      return c.json(errorResponse('Invalid username', usernameError), 400);
    }
    
    // ===== 4. 验证邮箱（启用邮件时要求主流邮箱 + 格式） =====
    const emailError = emailVerificationRequired ? validateMainstreamEmail(email) : validateEmail(email);
    if (emailError) {
      logger.warn('Registration failed: Invalid email', { email });
      return c.json(errorResponse('Invalid email', emailError), 400);
    }
    
    if (emailVerificationRequired) {
      const verifyResult = await EmailVerificationService.verifyCode(
        c.env,
        'register',
        email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return c.json(
          errorResponse('Invalid verification code', verifyResult.message),
          400
        );
      }
    }
    
    // ===== 5. 验证密码强度 =====
    const passwordError = validatePassword(password);
    if (passwordError) {
      logger.warn('Registration failed: Weak password');
      return c.json(errorResponse('Weak password', passwordError), 400);
    }
    
    // ===== 6. 检查用户是否已存在 =====
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL'
    ).bind(username, email).first();
    
    if (existing) {
      logger.warn('Registration failed: User already exists', { username, email });
      return c.json(errorResponse(
        'User already exists',
        'Username or email is already registered'
      ), 409);
    }
    
    // ===== 7. 加密密码 =====
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // ===== 8. 插入用户到数据库 =====
    const result = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, display_name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      username,
      email,
      passwordHash,
      displayName,
      'user' // 默认角色
    ).run();
    
    if (!result.success) {
      throw new Error('Failed to create user in database');
    }
    
    const userId = result.meta.last_row_id;
    
    // ===== 9. 生成JWT Token =====
    const token = await generateToken(asSecret(c.env.JWT_SECRET), {
      userId,
      username,
      role: 'user',
    });
    
    // ===== 10. 记录成功日志 =====
    logger.info('User registered successfully', { 
      userId, 
      username,
      email 
    });
    
    // ===== 11. 返回成功响应 =====
    return c.json(successResponse({
      user: {
        id: userId,
        username,
        email,
        displayName,
        avatarUrl: null,
        bio: null,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      token
    }, 'Registration successful'), 201);
    
  } catch (error) {
    logger.error('Registration error', error);
    return c.json(errorResponse(
      'Registration failed',
      'An error occurred during registration. Please try again.'
    ), 500);
  }
});

// ============= 用户登录 =============

/**
 * POST /api/auth/login
 * 用户登录
 * 
 * 请求体：
 * {
 *   username: string,  // 用户名或邮箱
 *   password: string
 * }
 */
authRoutes.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    maxRequests: 10,
    message: '15 分钟内最多尝试登录 10 次'
  }),
  async (c) => {
  const logger = createLogger(c);
  
  try {
    // 解析请求体
    const { username, password } = await c.req.json();
    
    // ===== 1. 验证必填字段 =====
    if (!username || !password) {
      logger.warn('Login failed: Missing credentials');
      return c.json(errorResponse(
        'Missing credentials',
        'Please provide username and password'
      ), 400);
    }

    // ===== 2. 查找用户 =====
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, password_hash, display_name, avatar_url, bio, role FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL'
    ).bind(username, username).first() as any;

    // ===== 3. 验证用户存在 =====
    if (!user) {
      logger.warn('Login failed: User not found', { username });
      return c.json(errorResponse(
        'Invalid credentials',
        'Username or password is incorrect'
      ), 401);
    }

    // ===== 4. 验证密码 =====
    if (!user.password_hash) {
      logger.warn('Login failed: OAuth user trying password login', { username });
      return c.json(errorResponse(
        'Invalid login method',
        'This account uses OAuth login. Please sign in with GitHub.'
      ), 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn('Login failed: Invalid password', { username });
      return c.json(errorResponse(
        'Invalid credentials',
        'Username or password is incorrect'
      ), 401);
    }

    // ===== 5. 生成JWT Token =====
    const token = await generateToken(asSecret(c.env.JWT_SECRET), {
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    
    // ===== 8. 更新最后登录时间 =====
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(user.id).run()
    );
    
    // ===== 9. 记录成功日志 =====
    logger.info('User logged in successfully', { 
      userId: user.id, 
      username: user.username 
    });
    
    // ===== 10. 返回成功响应 =====
    return c.json(successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role,
      },
      token
    }, 'Login successful'));
    
  } catch (error) {
    logger.error('Login error', error);
    return c.json(errorResponse(
      'Login failed',
      'An error occurred during login. Please try again.'
    ), 500);
  }
});

// ============= 忘记密码 / 重置密码 =============

/**
 * POST /api/auth/reset-password
 * 通过邮箱验证码重置密码（无需登录）
 * 请求体: { email, verificationCode, newPassword }
 */
authRoutes.post('/reset-password', async (c) => {
  const logger = createLogger(c);
  
  try {
    if (!c.env.RESEND_API_KEY) {
      return c.json(errorResponse('Email not configured', '邮件服务未配置，无法重置密码'), 503);
    }
    
    const body = await c.req.json();
    const { email: bodyEmail, verificationCode, newPassword } = body;
    
    if (!bodyEmail || !verificationCode || !newPassword) {
      return c.json(errorResponse(
        'Missing required fields',
        '请提供邮箱、验证码和新密码'
      ), 400);
    }
    
    const email = sanitizeInput(String(bodyEmail).toLowerCase());
    const code = String(verificationCode).trim();
    
    if (code.length !== 6) {
      return c.json(errorResponse('Invalid verification code', '请输入 6 位验证码'), 400);
    }
    
    const user = await c.env.DB.prepare(
      'SELECT id, oauth_provider, password_hash FROM users WHERE email = ? AND deleted_at IS NULL'
    ).bind(email).first() as any;
    
    if (!user) {
      return c.json(errorResponse('Invalid request', '验证码错误或已过期，请重新获取'), 400);
    }
    
    if (user.oauth_provider) {
      return c.json(errorResponse(
        'OAuth account',
        '该账号使用第三方登录，无法重置密码'
      ), 400);
    }
    
    const verifyResult = await EmailVerificationService.verifyCode(
      c.env,
      'forgot_password',
      email,
      code
    );
    if (!verifyResult.success) {
      return c.json(
        errorResponse('Invalid verification code', verifyResult.message),
        400
      );
    }
    
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return c.json(errorResponse('Weak password', passwordError), 400);
    }
    
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(passwordHash, user.id).run();
    
    logger.info('Password reset successfully', { userId: user.id, email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
    
    return c.json(successResponse({ reset: true }, '密码重置成功，请使用新密码登录'));
  } catch (e: any) {
    logger.error('Reset password error', e);
    return c.json(errorResponse(
      'Reset failed',
      e.message || '重置密码失败，请稍后重试'
    ), 500);
  }
});

// ============= GitHub OAuth登录 =============

/**
 * POST /api/auth/github
 * GitHub OAuth登录
 * 
 * 请求体：
 * {
 *   code: string  // GitHub授权码
 * }
 */
authRoutes.post(
  '/github',
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 分钟
    maxRequests: 10,
    message: '5 分钟内最多尝试 10 次 GitHub 登录'
  }),
  async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 0. 检查是否允许GitHub登录 =====
    const isOAuthEnabled = await isFeatureEnabled(c.env, 'feature_oauth_github');
    if (!isOAuthEnabled) {
      return c.json(errorResponse(
        'GitHub login disabled',
        'GitHub登录已关闭'
      ), 403);
    }
    
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json(errorResponse(
        'Missing authorization code',
        'GitHub authorization code is required'
      ), 400);
    }
    
    // 检查GitHub OAuth配置
    if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) {
      logger.error('GitHub OAuth configuration missing');
      return c.json(errorResponse(
        'GitHub login not configured',
        'GitHub login is not properly configured on the server. Please contact the administrator.'
      ), 500);
    }
    
    logger.info('GitHub OAuth flow started', { hasClientId: !!c.env.GITHUB_CLIENT_ID, hasClientSecret: !!c.env.GITHUB_CLIENT_SECRET });
    
    // ===== 1. 交换access token =====
    logger.info('Exchanging code for access token', { codeLength: code.length });
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
          client_id: c.env.GITHUB_CLIENT_ID,
          client_secret: c.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      
      logger.info('Token exchange response received', { status: tokenResponse.status });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({})) as { error?: string };
        logger.error('GitHub token exchange failed', { status: tokenResponse.status, error: errorData });
        return c.json(errorResponse(
          'OAuth failed',
          `Failed to exchange code for access token: ${errorData.error || `HTTP ${tokenResponse.status}`}`
        ), 400);
      }
      
      tokenData = await tokenResponse.json() as any;
      
      logger.info('Token exchange data', { hasAccessToken: !!tokenData.access_token, error: tokenData.error });
      
      if (!tokenData.access_token) {
        logger.warn('GitHub OAuth failed: No access token', { tokenData });
        return c.json(errorResponse(
          'OAuth failed',
          `Failed to get access token from GitHub: ${tokenData.error || 'Unknown error'}`
        ), 400);
      }
      
      // ===== 2. 获取GitHub用户信息 =====
      logger.info('Fetching GitHub user information');
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Personal Blog OAuth App',
        },
      });
      
      logger.info('GitHub user info response received', { status: userResponse.status });
      
      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({})) as { message?: string };
        logger.error('GitHub user info fetch failed', { status: userResponse.status, error: errorData });
        return c.json(errorResponse(
          'OAuth failed',
          `Failed to get user information: ${errorData.message || `HTTP ${userResponse.status}`}`
        ), 400);
      }
      
      githubUser = await userResponse.json() as any;
      
      logger.info('GitHub user data', { hasId: !!githubUser.id, login: githubUser.login });
      
      if (!githubUser || !githubUser.id) {
        logger.error('GitHub API error: Invalid user data', { githubUser });
        return c.json(errorResponse(
          'OAuth failed',
          'Failed to get user information from GitHub'
        ), 400);
      }
      
      // ===== 3. 获取GitHub用户邮箱 =====
      logger.info('Fetching GitHub user emails');
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
          logger.info('GitHub emails received', { emailCount: emails.length });
          
          // 找到主要邮箱
          const primaryEmail = emails.find(e => e.primary && e.verified);
          if (primaryEmail) {
            githubEmail = primaryEmail.email;
            logger.info('Found primary GitHub email', { email: githubEmail });
          }
        } else {
          const errorData = await emailResponse.json().catch(() => ({}));
          logger.warn('Failed to get GitHub emails', { status: emailResponse.status, error: errorData });
        }
      } catch (emailError) {
        logger.warn('Error fetching GitHub emails', { error: emailError instanceof Error ? emailError.message : emailError });
      }
    } catch (error) {
      logger.error('GitHub OAuth network error', { error: error instanceof Error ? error.message : error });
      return c.json(errorResponse(
        'OAuth failed',
        'Network error when communicating with GitHub'
      ), 500);
    }
    
    // ===== 3. 查找或创建用户 =====
    logger.info('Finding or creating user', { githubId: githubUser.id, login: githubUser.login });
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ? AND deleted_at IS NULL'
    ).bind('github', githubUser.id.toString()).first() as any;
    
    if (!user) {
      // 创建新用户
      const username = githubUser.login;
      const email = githubEmail || `${githubUser.login}@github.oauth`;
      
      // 检查用户名是否已存在
      const existing = await c.env.DB.prepare(
        'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL'
      ).bind(username).first();
      
      const finalUsername = existing 
        ? `${username}_${Date.now().toString(36)}` 
        : username;
      
      try {
        const result = await c.env.DB.prepare(
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
        
        logger.info('New GitHub user created', { 
          userId: user.id, 
          username: user.username,
          email 
        });
      } catch (dbError) {
        logger.error('Database error: Failed to create GitHub user', { 
          error: dbError, 
          githubUserId: githubUser.id 
        });
        return c.json(errorResponse(
          'Registration failed',
          'Failed to create user account. Please try again.'
        ), 500);
      }
    } else {
      logger.info('GitHub user found in database', { userId: user.id, username: user.username });
    }

    // ===== 4. 存储或更新 OAuth 令牌 =====
    logger.info('Storing OAuth token', { userId: user.id, provider: 'github' });

    try {
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      await c.env.DB.prepare(
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

      logger.info('OAuth token stored', { userId: user.id, provider: 'github' });
    } catch (tokenError) {
      logger.error('Failed to store OAuth token', {
        error: tokenError,
        userId: user.id
      });
      // 不中断流程，如果令牌存储失败，仍然允许登录
    }

    // ===== 5. 生成JWT Token =====
    logger.info('Generating JWT token', { userId: user.id });
    const token = await generateToken(asSecret(c.env.JWT_SECRET), {
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    
    logger.info('GitHub OAuth login successful', { 
      userId: user.id, 
      username: user.username 
    });
    
    // ===== 5. 返回成功响应 =====
    return c.json(successResponse({
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
      token
    }, 'GitHub login successful'));
    
  } catch (error) {
    logger.error('GitHub OAuth error', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return c.json(errorResponse(
      'OAuth authentication failed',
      'An error occurred during GitHub authentication'
    ), 500);
  }
});

// ============= 用户登出 =============

/**
 * POST /api/auth/logout
 * 用户登出（将token加入黑名单）
 * 
 * 需要认证
 */
authRoutes.post('/logout', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json(errorResponse('No token provided'), 401);
    }
    
    const token = authHeader.substring(7); // 移除 "Bearer "
    
    // 将token加入黑名单，有效期7天（与token过期时间一致）
    await safePutCache(c.env, `blacklist:${token}`, '1', {
      expirationTtl: 60 * 60 * 24 * 7,
    });
    
    const user = c.get('user') as any;
    logger.info('User logged out', { userId: user?.userId });
    
    return c.json(successResponse(
      { loggedOut: true },
      'Logout successful'
    ));
    
  } catch (error) {
    logger.error('Logout error', error);
    return c.json(errorResponse(
      'Logout failed',
      'An error occurred during logout'
    ), 500);
  }
});

// ============= 获取当前用户信息 =============

/**
 * GET /api/auth/me
 * 获取当前登录用户的信息
 * 
 * 需要认证
 */
authRoutes.get('/me', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    
    // 获取用户基本信息
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId).first() as any;
    
    if (!user) {
      logger.warn('User not found', { userId: currentUser.userId });
      return c.json(errorResponse('User not found'), 404);
    }
    
    // 获取用户统计数据
    const postCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND status = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId, 'published').first() as any;

    const commentCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND status = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId, 'approved').first() as any;
    
    // 构建完整的用户信息响应
    const userWithStats = {
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
    };
    
    return c.json(successResponse({ user: userWithStats }));
    
  } catch (error) {
    logger.error('Get user error', error);
    return c.json(errorResponse(
      'Failed to get user',
      'An error occurred while fetching user information'
    ), 500);
  }
});

// ============= 更新用户资料（新增功能） =============

/**
 * PUT /api/auth/profile
 * 更新当前用户的资料
 * 
 * 需要认证
 * 
 * 请求体：
 * {
 *   displayName?: string,
 *   bio?: string,
 *   avatarUrl?: string
 * }
 */
authRoutes.put('/profile', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const { displayName, bio, avatarUrl } = await c.req.json();
    
    // 验证和清理输入
    const updates: any = {};
    
    if (displayName !== undefined) {
      const cleaned = sanitizeInput(displayName);
      if (cleaned.length < 1 || cleaned.length > 50) {
        return c.json(errorResponse(
          'Invalid display name',
          'Display name must be between 1 and 50 characters'
        ), 400);
      }
      updates.display_name = cleaned;
    }
    
    if (bio !== undefined) {
      const cleaned = sanitizeInput(bio);
      if (cleaned.length > 500) {
        return c.json(errorResponse(
          'Bio too long',
          'Bio must be less than 500 characters'
        ), 400);
      }
      updates.bio = cleaned;
    }
    
    if (avatarUrl !== undefined) {
      // 验证URL格式
      try {
        new URL(avatarUrl);
        updates.avatar_url = avatarUrl;
      } catch {
        return c.json(errorResponse(
          'Invalid avatar URL',
          'Please provide a valid URL'
        ), 400);
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return c.json(errorResponse(
        'No updates provided',
        'Please provide at least one field to update'
      ), 400);
    }
    
    // 构建更新SQL
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await c.env.DB.prepare(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...values, currentUser.userId).run();
    
    logger.info('Profile updated', { 
      userId: currentUser.userId,
      updates: Object.keys(updates)
    });
    
    // 获取更新后的用户信息
    const userData = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId).first() as any;
    
    // 转换为 camelCase 格式
    const user = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      displayName: userData.display_name,
      avatarUrl: userData.avatar_url,
      bio: userData.bio,
      role: userData.role,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at
    };
    
    return c.json(successResponse(
      { user },
      'Profile updated successfully'
    ));
    
  } catch (error) {
    logger.error('Update profile error', error);
    return c.json(errorResponse(
      'Failed to update profile',
      'An error occurred while updating your profile'
    ), 500);
  }
});

// ============= 修改密码 =============

/**
 * PUT /api/auth/password
 * 修改当前用户的密码
 * 
 * 需要认证
 * 
 * 请求体：
 * {
 *   currentPassword: string,
 *   newPassword: string
 * }
 */
authRoutes.put('/password', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const { currentPassword, newPassword, emailVerificationCode } = await c.req.json();
    
    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return c.json(errorResponse(
        'Missing required fields',
        '请提供当前密码和新密码'
      ), 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT password_hash, email FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId).first() as any;
    
    if (!user) {
      return c.json(errorResponse('User not found'), 404);
    }
    
    const emailVerificationRequired = !!c.env.RESEND_API_KEY;
    if (emailVerificationRequired) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return c.json(errorResponse(
          'Verification code required',
          '请先获取并填写 6 位邮箱验证码'
        ), 400);
      }
      const verifyResult = await EmailVerificationService.verifyCode(
        c.env,
        'password',
        user.email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return c.json(
          errorResponse('Invalid verification code', verifyResult.message),
          400
        );
      }
    }
    
    // 验证用户不是OAuth用户
    if (!user.password_hash) {
      return c.json(errorResponse(
        'Invalid operation',
        'This account uses OAuth login. Password change is not supported.'
      ), 400);
    }
    
    // 验证当前密码
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return c.json(errorResponse(
        'Invalid password',
        'Current password is incorrect'
      ), 401);
    }
    
    // 验证新密码强度
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return c.json(errorResponse('Weak password', passwordError), 400);
    }
    
    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    
    // 更新密码
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(passwordHash, currentUser.userId).run();
    
    logger.info('Password updated', { userId: currentUser.userId });
    
    return c.json(successResponse(
      { updated: true },
      'Password updated successfully'
    ));
    
  } catch (error) {
    logger.error('Update password error', error);
    return c.json(errorResponse(
      'Failed to update password',
      'An error occurred while updating your password'
    ), 500);
  }
});

/**
 * DELETE /api/auth/account
 * 删除用户账户（软删除或硬删除）
 * 
 * 需要认证
 * 注意：这是一个敏感操作，建议添加额外的验证步骤
 */
authRoutes.delete('/account', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const currentUser = c.get('user') as any;
    const { password, confirmation, emailVerificationCode } = await c.req.json();
    
    // 要求确认
    if (confirmation !== 'DELETE') {
      return c.json(errorResponse(
        'Confirmation required',
        '请输入 DELETE 确认删除账号'
      ), 400);
    }
    
    const user = await c.env.DB.prepare(
      'SELECT password_hash, email FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId).first() as any;

    if (!user) {
      return c.json(errorResponse('User not found'), 404);
    }

    const emailVerificationRequired = !!c.env.RESEND_API_KEY;
    if (emailVerificationRequired) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return c.json(errorResponse(
          'Verification code required',
          '请先获取并填写 6 位邮箱验证码'
        ), 400);
      }
      const verifyResult = await EmailVerificationService.verifyCode(
        c.env,
        'delete',
        user.email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return c.json(
          errorResponse('Invalid verification code', verifyResult.message),
          400
        );
      }
    }
    
    // 验证密码（OAuth用户跳过）
    if (user.password_hash) {
      if (!password) {
        return c.json(errorResponse(
          'Missing password',
          '删除账号需要输入密码'
        ), 400);
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return c.json(errorResponse(
          'Invalid password',
          'Password is incorrect'
        ), 401);
      }
    }

    // 软删除用户（保留数据，支持恢复）
    await SoftDeleteHelper.softDelete(c.env.DB, 'users', currentUser.userId);

    logger.info('Account soft deleted', { userId: currentUser.userId });
    
    return c.json(successResponse(
      { deleted: true },
      'Account deleted successfully'
    ));
    
  } catch (error) {
    logger.error('Delete account error', error);
    return c.json(errorResponse(
      'Failed to delete account',
      'An error occurred while deleting your account'
    ), 500);
  }
});

/**
 * DELETE /api/auth/delete
 * 删除用户账户（别名路由，兼容前端请求）
 * 
 * 需要认证
 */
authRoutes.delete('/delete', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json().catch(() => ({}));
    const { password, confirmation, emailVerificationCode } = body;

    if (confirmation !== 'DELETE') {
      return c.json(errorResponse(
        'Confirmation required',
        '请输入 DELETE 确认删除账号'
      ), 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT password_hash, email FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId).first() as any;

    if (!user) return c.json(errorResponse('User not found'), 404);
    
    if (c.env.RESEND_API_KEY) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return c.json(errorResponse('Verification code required', '请先获取并填写 6 位邮箱验证码'), 400);
      }
      const verifyResult = await EmailVerificationService.verifyCode(
        c.env,
        'delete',
        user.email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return c.json(
          errorResponse('Invalid verification code', verifyResult.message),
          400
        );
      }
    }
    
    if (user.password_hash) {
      if (!password) {
        return c.json(errorResponse('Missing password', '删除账号需要输入密码'), 400);
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return c.json(errorResponse('Invalid password', 'Password is incorrect'), 401);
      }
    }

    await SoftDeleteHelper.softDelete(c.env.DB, 'users', currentUser.userId);

    logger.info('Account soft deleted', { userId: currentUser.userId });
    
    return c.json(successResponse(
      { deleted: true },
      'Account deleted successfully'
    ));
    
  } catch (error) {
    logger.error('Delete account error', error);
    return c.json(errorResponse(
      'Failed to delete account',
      'An error occurred while deleting your account'
    ), 500);
  }
});

/**
 * POST /api/auth/delete
 * 删除用户账户（POST 版本，兼容前端请求）
 * 
 * 需要认证
 */
authRoutes.post('/delete', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();
    const { password, confirmation, emailVerificationCode } = body;

    if (confirmation !== 'DELETE') {
      return c.json(errorResponse(
        'Confirmation required',
        '请输入 DELETE 确认删除账号'
      ), 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT password_hash, email FROM users WHERE id = ? AND deleted_at IS NULL'
    ).bind(currentUser.userId).first() as any;

    if (!user) return c.json(errorResponse('User not found'), 404);
    
    if (c.env.RESEND_API_KEY) {
      if (!emailVerificationCode || String(emailVerificationCode).length !== 6) {
        return c.json(errorResponse('Verification code required', '请先获取并填写 6 位邮箱验证码'), 400);
      }
      const verifyResult = await EmailVerificationService.verifyCode(
        c.env,
        'delete',
        user.email,
        String(emailVerificationCode).trim()
      );
      if (!verifyResult.success) {
        return c.json(
          errorResponse('Invalid verification code', verifyResult.message),
          400
        );
      }
    }
    
    if (user.password_hash) {
      if (!password) {
        return c.json(errorResponse('Missing password', '删除账号需要输入密码'), 400);
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return c.json(errorResponse('Invalid password', 'Password is incorrect'), 401);
      }
    }

    await SoftDeleteHelper.softDelete(c.env.DB, 'users', currentUser.userId);

    logger.info('Account soft deleted', { userId: currentUser.userId });
    
    return c.json(successResponse(
      { deleted: true },
      'Account deleted successfully'
    ));
    
  } catch (error) {
    logger.error('Delete account error', error);
    return c.json(errorResponse(
      'Failed to delete account',
      'An error occurred while deleting your account'
    ), 500);
  }
});
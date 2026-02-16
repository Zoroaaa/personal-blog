/**
 * 认证相关路由（重构版）
 *
 * 功能：
 * - 用户注册
 * - 用户登录（密码和GitHub OAuth）
 * - 用户登出
 * - 获取当前用户信息
 * - 更新用户资料
 * - 修改密码
 * - 删除账号
 * - 发送验证码
 * - 重置密码
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 * @refactored 2026-02-16
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse, getStatus } from '../utils/response';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { rateLimit } from '../middleware/rateLimit';
import { sanitizeInput } from '../utils/validation';
import { sendVerificationEmail } from '../utils/resend';
import type { VerificationEmailType } from '../utils/resend';
import { EmailVerificationService } from '../services/emailVerificationService';
import { AuthService, validateVerificationType } from '../services/authService';
import { AUTH_CONSTANTS } from '../config/constants';

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

authRoutes.post(
  '/send-verification-code',
  rateLimit({
    windowMs: 60 * 60 * 1000,
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

      if (!validateVerificationType(rawType)) {
        return c.json(
          errorResponse(
            'Invalid type',
            'type 必须为 register / password / delete / forgot_password'
          ),
          400
        );
      }

      let email: string;

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
      }

      const rateLimitResult = await EmailVerificationService.checkRateLimit(
        c.env.CACHE,
        rawType,
        email
      );

      if (rateLimitResult.limited) {
        return c.json(
          errorResponse(
            'Too many requests',
            `1 小时内最多发送 ${AUTH_CONSTANTS.EMAIL_VERIFY_RATE_MAX} 次验证码，请稍后再试`
          ),
          429
        );
      }

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

      const codeData = result.data as any;
      const code = codeData?.code;

      if (!code) {
        logger.error('No verification code generated', result);
        return c.json(
          errorResponse('Service error', '验证码生成失败，请稍后重试'),
          500
        );
      }

      try {
        await sendVerificationEmail(c.env, email, code, rawType);
        logger.info('Verification code sent', {
          type: rawType,
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
        });
      } catch (emailError) {
        logger.error('Failed to send email', emailError);
      }

      const msg =
        rawType === 'forgot_password'
          ? '如该邮箱已注册，验证码将发送至您的邮箱'
          : '验证码已发送，请查收邮件';

      return c.json(successResponse({ sent: true }, msg));
    } catch (e: any) {
      logger.error('Send verification code error', e);
      return c.json(
        errorResponse('Send failed', e.message || '发送验证码失败，请稍后重试'),
        500
      );
    }
  }
);

authRoutes.post(
  '/register',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: '1 小时内最多只能注册 5 个账号'
  }),
  async (c) => {
    const logger = createLogger(c);

    try {
      const isRegistrationEnabled = await AuthService.checkRegistrationEnabled(c.env);
      if (!isRegistrationEnabled) {
        return c.json(errorResponse('Registration disabled', '新用户注册已关闭'), 403);
      }

      const body = await c.req.json();
      const result = await AuthService.register(c.env.DB, c.env, body);

      if (!result.success) {
        return c.json(errorResponse('Registration failed', result.message), getStatus(result.statusCode, 400));
      }

      logger.info('User registered successfully', {
        userId: result.user?.id,
        username: result.user?.username,
        email: result.user?.email
      });

      return c.json(successResponse({ user: result.user, token: result.token }, result.message), getStatus(result.statusCode, 201));
    } catch (error) {
      logger.error('Registration error', error);
      return c.json(errorResponse('Registration failed', 'An error occurred during registration. Please try again.'), 500);
    }
  }
);

authRoutes.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: '15 分钟内最多尝试登录 10 次'
  }),
  async (c) => {
    const logger = createLogger(c);

    try {
      const body = await c.req.json();
      const result = await AuthService.login(c.env.DB, c.env, body);

      if (!result.success) {
        return c.json(errorResponse('Login failed', result.message), getStatus(result.statusCode, 401));
      }

      c.executionCtx.waitUntil(
        c.env.DB.prepare(
          'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(result.user?.id).run()
      );

      logger.info('User logged in successfully', {
        userId: result.user?.id,
        username: result.user?.username
      });

      return c.json(successResponse({ user: result.user, token: result.token }, result.message));
    } catch (error) {
      logger.error('Login error', error);
      return c.json(errorResponse('Login failed', 'An error occurred during login. Please try again.'), 500);
    }
  }
);

authRoutes.post('/reset-password', async (c) => {
  const logger = createLogger(c);

  try {
    if (!c.env.RESEND_API_KEY) {
      return c.json(errorResponse('Email not configured', '邮件服务未配置，无法重置密码'), 503);
    }

    const body = await c.req.json();
    const result = await AuthService.resetPassword(c.env.DB, c.env, body);

    if (!result.success) {
      return c.json(errorResponse('Reset failed', result.message), getStatus(result.statusCode, 400));
    }

    logger.info('Password reset successfully', {
      email: body.email?.replace(/(.{2}).*(@.*)/, '$1***$2')
    });

    return c.json(successResponse({ reset: true }, result.message));
  } catch (e: any) {
    logger.error('Reset password error', e);
    return c.json(errorResponse('Reset failed', e.message || '重置密码失败，请稍后重试'), 500);
  }
});

authRoutes.post(
  '/github',
  rateLimit({
    windowMs: 5 * 60 * 1000,
    maxRequests: 10,
    message: '5 分钟内最多尝试 10 次 GitHub 登录'
  }),
  async (c) => {
    const logger = createLogger(c);

    try {
      const isOAuthEnabled = await AuthService.checkOAuthEnabled(c.env);
      if (!isOAuthEnabled) {
        return c.json(errorResponse('GitHub login disabled', 'GitHub登录已关闭'), 403);
      }

      const { code } = await c.req.json();
      const result = await AuthService.githubOAuth(c.env.DB, c.env, code);

      if (!result.success) {
        return c.json(errorResponse('OAuth failed', result.message), getStatus(result.statusCode, 400));
      }

      logger.info('GitHub OAuth login successful', {
        userId: result.user?.id,
        username: result.user?.username
      });

      return c.json(successResponse({ user: result.user, token: result.token }, result.message));
    } catch (error) {
      logger.error('GitHub OAuth error', error);
      return c.json(errorResponse('OAuth authentication failed', 'An error occurred during GitHub authentication'), 500);
    }
  }
);

authRoutes.post('/logout', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json(errorResponse('No token provided'), 401);
    }

    const token = authHeader.substring(7);
    const result = await AuthService.logout(c.env, token);

    const user = c.get('user') as any;
    logger.info('User logged out', { userId: user?.userId });

    return c.json(successResponse({ loggedOut: true }, result.message));
  } catch (error) {
    logger.error('Logout error', error);
    return c.json(errorResponse('Logout failed', 'An error occurred during logout'), 500);
  }
});

authRoutes.get('/me', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const result = await AuthService.getCurrentUser(c.env.DB, currentUser.userId);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'User not found'), getStatus(result.statusCode, 404));
    }

    return c.json(successResponse({ user: result.user }));
  } catch (error) {
    logger.error('Get user error', error);
    return c.json(errorResponse('Failed to get user', 'An error occurred while fetching user information'), 500);
  }
});

authRoutes.put('/profile', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();
    const result = await AuthService.updateProfile(c.env.DB, currentUser.userId, body);

    if (!result.success) {
      return c.json(errorResponse('Update failed', result.message || 'Failed to update profile'), getStatus(result.statusCode, 400));
    }

    logger.info('Profile updated', {
      userId: currentUser.userId,
      updates: Object.keys(body)
    });

    return c.json(successResponse({ user: result.user }, result.message || 'Profile updated successfully'));
  } catch (error) {
    logger.error('Update profile error', error);
    return c.json(errorResponse('Failed to update profile', 'An error occurred while updating your profile'), 500);
  }
});

authRoutes.put('/password', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();
    const result = await AuthService.changePassword(c.env.DB, c.env, currentUser.userId, body);

    if (!result.success) {
      return c.json(errorResponse('Update failed', result.message), getStatus(result.statusCode, 400));
    }

    logger.info('Password updated', { userId: currentUser.userId });

    return c.json(successResponse({ updated: true }, result.message));
  } catch (error) {
    logger.error('Update password error', error);
    return c.json(errorResponse('Failed to update password', 'An error occurred while updating your password'), 500);
  }
});

authRoutes.delete('/account', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();
    const result = await AuthService.deleteAccount(c.env.DB, c.env, currentUser.userId, body);

    if (!result.success) {
      return c.json(errorResponse('Delete failed', result.message), getStatus(result.statusCode, 400));
    }

    logger.info('Account soft deleted', { userId: currentUser.userId });

    return c.json(successResponse({ deleted: true }, result.message));
  } catch (error) {
    logger.error('Delete account error', error);
    return c.json(errorResponse('Failed to delete account', 'An error occurred while deleting your account'), 500);
  }
});

authRoutes.delete('/delete', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json().catch(() => ({}));
    const result = await AuthService.deleteAccount(c.env.DB, c.env, currentUser.userId, body);

    if (!result.success) {
      return c.json(errorResponse('Delete failed', result.message), getStatus(result.statusCode, 400));
    }

    logger.info('Account soft deleted', { userId: currentUser.userId });

    return c.json(successResponse({ deleted: true }, result.message));
  } catch (error) {
    logger.error('Delete account error', error);
    return c.json(errorResponse('Failed to delete account', 'An error occurred while deleting your account'), 500);
  }
});

authRoutes.post('/delete', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const currentUser = c.get('user') as any;
    const body = await c.req.json();
    const result = await AuthService.deleteAccount(c.env.DB, c.env, currentUser.userId, body);

    if (!result.success) {
      return c.json(errorResponse('Delete failed', result.message), getStatus(result.statusCode, 400));
    }

    logger.info('Account soft deleted', { userId: currentUser.userId });

    return c.json(successResponse({ deleted: true }, result.message));
  } catch (error) {
    logger.error('Delete account error', error);
    return c.json(errorResponse('Failed to delete account', 'An error occurred while deleting your account'), 500);
  }
});

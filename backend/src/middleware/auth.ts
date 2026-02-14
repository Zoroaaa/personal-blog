/**
 * 认证中间件（优化版）
 *
 * 功能：
 * - Token验证和用户认证
 * - 可选认证（公开端点）
 * - 管理员权限检查
 *
 * 优化内容：
 * 1. 统一错误响应格式
 * 2. 改进日志记录
 * 3. 添加角色检查辅助函数
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2024-01-01
 */

import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { errorResponse } from '../utils/response';
import { verifyToken, JWTPayload, TokenPayload } from '../utils/jwt';

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

function isUserPayload(payload: TokenPayload): payload is JWTPayload {
  return 'userId' in payload && 'username' in payload && 'role' in payload;
}

export async function requireAuth(c: AppContext, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(errorResponse(
      'Unauthorized',
      'Authentication required. Please provide a valid token.'
    ), 401);
  }

  const token = authHeader.substring(7);

  try {
    const blacklisted = c.env.CACHE ? await c.env.CACHE.get(`blacklist:${token}`) : null;
    if (blacklisted) {
      return c.json(errorResponse(
        'Token revoked',
        'This token has been revoked. Please login again.'
      ), 401);
    }

    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!isUserPayload(payload)) {
      return c.json(errorResponse(
        'Invalid token type',
        'This token is not a valid user authentication token.'
      ), 401);
    }

    c.set('user', payload);

    await next();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';

    if (errorMessage.includes('expired')) {
      return c.json(errorResponse(
        'Token expired',
        'Your session has expired. Please login again.'
      ), 401);
    }

    return c.json(errorResponse(
      'Invalid token',
      'The provided token is invalid or malformed.'
    ), 401);
  }
}

export async function optionalAuth(c: AppContext, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const blacklisted = c.env.CACHE ? await c.env.CACHE.get(`blacklist:${token}`) : null;

      if (!blacklisted) {
        const payload = await verifyToken(token, c.env.JWT_SECRET);

        if (isUserPayload(payload)) {
          c.set('user', payload);
        }
      }
    } catch (error) {
      // 忽略错误，继续执行
    }
  }

  await next();
}

/**
 * 管理员权限检查中间件
 * 必须与requireAuth一起使用
 */
export async function requireAdmin(c: AppContext, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json(errorResponse(
      'Unauthorized',
      'Authentication required'
    ), 401);
  }

  if (user.role !== 'admin') {
    return c.json(errorResponse(
      'Forbidden',
      'Administrator access required. You do not have permission to perform this action.'
    ), 403);
  }

  await next();
}

/**
 * 版主权限检查中间件
 * 管理员或版主都可以通过
 */
export async function requireModerator(c: AppContext, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json(errorResponse(
      'Unauthorized',
      'Authentication required'
    ), 401);
  }

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return c.json(errorResponse(
      'Forbidden',
      'Moderator or administrator access required'
    ), 403);
  }

  await next();
}

/**
 * 辅助函数：检查当前用户是否为管理员
 */
export function isAdmin(c: AppContext): boolean {
  const user = c.get('user');
  return user?.role === 'admin';
}

/**
 * 辅助函数：检查当前用户是否为版主或管理员
 */
export function isModerator(c: AppContext): boolean {
  const user = c.get('user');
  return user?.role === 'admin' || user?.role === 'moderator';
}

/**
 * 辅助函数：获取当前用户ID
 */
export function getCurrentUserId(c: AppContext): number | null {
  const user = c.get('user');
  return user?.userId || null;
}

/**
 * 辅助函数：检查是否为资源所有者或管理员
 */
export function isOwnerOrAdmin(
  c: AppContext,
  resourceOwnerId: number
): boolean {
  const user = c.get('user');

  if (!user) return false;

  return user.userId === resourceOwnerId || user.role === 'admin';
}

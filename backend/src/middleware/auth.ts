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
 * @author 优化版本
 * @version 2.0.0
 */

import { Context, Next } from 'hono';
import { Env, errorResponse } from '../index';
import { verifyToken, JWTPayload } from '../utils/jwt';

/**
 * 必须认证中间件
 * 验证Authorization header中的JWT token
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(errorResponse(
      'Unauthorized',
      'Authentication required. Please provide a valid token.'
    ), 401);
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer " 前缀
  
  try {
    // 检查token是否在黑名单中（已登出）
    const blacklisted = await c.env.CACHE.get(`blacklist:${token}`);
    if (blacklisted) {
      return c.json(errorResponse(
        'Token revoked',
        'This token has been revoked. Please login again.'
      ), 401);
    }
    
    // 验证token
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    
    // 将用户信息存储到context中
    c.set('user', payload);
    
    await next();
    
  } catch (error) {
    // Token验证失败
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

/**
 * 可选认证中间件
 * 如果提供了token则验证，否则继续执行
 * 用于公开端点，但需要知道用户身份（如果已登录）
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      // 检查token黑名单
      const blacklisted = await c.env.CACHE.get(`blacklist:${token}`);
      
      if (!blacklisted) {
        // 验证token
        const payload = await verifyToken(token, c.env.JWT_SECRET);
        
        // 将用户信息存储到context
        c.set('user', payload);
      }
    } catch (error) {
      // 忽略错误，继续执行
      // 可选认证失败不应阻止请求
    }
  }
  
  await next();
}

/**
 * 管理员权限检查中间件
 * 必须与requireAuth一起使用
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as JWTPayload | undefined;
  
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
export async function requireModerator(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as JWTPayload | undefined;
  
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
export function isAdmin(c: Context<{ Bindings: Env }>): boolean {
  const user = c.get('user') as JWTPayload | undefined;
  return user?.role === 'admin';
}

/**
 * 辅助函数：检查当前用户是否为版主或管理员
 */
export function isModerator(c: Context<{ Bindings: Env }>): boolean {
  const user = c.get('user') as JWTPayload | undefined;
  return user?.role === 'admin' || user?.role === 'moderator';
}

/**
 * 辅助函数：获取当前用户ID
 */
export function getCurrentUserId(c: Context<{ Bindings: Env }>): number | null {
  const user = c.get('user') as JWTPayload | undefined;
  return user?.userId || null;
}

/**
 * 辅助函数：检查是否为资源所有者或管理员
 */
export function isOwnerOrAdmin(
  c: Context<{ Bindings: Env }>, 
  resourceOwnerId: number
): boolean {
  const user = c.get('user') as JWTPayload | undefined;
  
  if (!user) return false;
  
  return user.userId === resourceOwnerId || user.role === 'admin';
}

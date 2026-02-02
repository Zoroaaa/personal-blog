/**
 * 认证中间件
 */

import { Context, Next } from 'hono';
import { Env } from '../index';
import { verifyToken, JWTPayload } from '../utils/jwt';

/**
 * 必须认证中间件
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 检查token是否在黑名单
    const blacklisted = await c.env.CACHE.get(`blacklist:${token}`);
    if (blacklisted) {
      return c.json({ error: 'Token revoked' }, 401);
    }
    
    // 验证token
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    
    // 将用户信息存储到context
    c.set('user', payload);
    
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

/**
 * 可选认证中间件
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const blacklisted = await c.env.CACHE.get(`blacklist:${token}`);
      if (!blacklisted) {
        const payload = await verifyToken(token, c.env.JWT_SECRET);
        c.set('user', payload);
      }
    } catch (error) {
      // 忽略错误,继续执行
    }
  }
  
  await next();
}

/**
 * 管理员权限检查
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as JWTPayload | undefined;
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  await next();
}

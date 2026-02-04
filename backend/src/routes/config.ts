/**
 * 配置相关路由
 * 
 * 功能：
 * - 返回公开的配置信息
 * - 提供GitHub OAuth客户端ID等配置
 * 
 * @author 优化版本
 * @version 1.0.0
 */

import { Hono } from 'hono';
import { Env, successResponse } from '../index';

export const configRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/config
 * 获取公开配置信息
 * 
 * 返回：
 * {
 *   "success": true,
 *   "data": {
 *     "githubClientId": string,
 *     "frontendUrl": string
 *   }
 * }
 */
configRoutes.get('/', async (c) => {
  return c.json(successResponse({
    githubClientId: c.env.GITHUB_CLIENT_ID,
    frontendUrl: c.env.FRONTEND_URL
  }));
});

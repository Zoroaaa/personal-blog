/**
 * 认证相关路由
 * 包括注册、登录、GitHub OAuth
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Env } from '../index';
import { generateToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/register
 * 用户注册
 */
authRoutes.post('/register', async (c) => {
  try {
    const { username, email, password, displayName } = await c.req.json();
    
    // 验证必填字段
    if (!username || !email || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // 验证用户名格式
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return c.json({ error: 'Invalid username format' }, 400);
    }
    
    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }
    
    // 验证密码长度
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }
    
    // 检查用户是否已存在
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();
    
    if (existing) {
      return c.json({ error: 'Username or email already exists' }, 409);
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 插入用户
    const result = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, display_name, role)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      username,
      email,
      passwordHash,
      displayName || username,
      'user'
    ).run();
    
    const userId = result.meta.last_row_id;
    
    // 生成token
    const token = await generateToken(c.env.JWT_SECRET, {
      userId,
      username,
      role: 'user',
    });
    
    return c.json({
      user: {
        id: userId,
        username,
        email,
        displayName: displayName || username,
        role: 'user',
      },
      token,
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
authRoutes.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: 'Missing credentials' }, 400);
    }
    
    // 查找用户
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(username, username).first() as any;
    
    if (!user || !user.password_hash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // 验证密码
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // 生成token
    const token = await generateToken(c.env.JWT_SECRET, {
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    
    return c.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

/**
 * POST /api/auth/github
 * GitHub OAuth登录
 */
authRoutes.post('/github', async (c) => {
  try {
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }
    
    // 交换access token
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
    
    const tokenData = await tokenResponse.json() as any;
    
    if (!tokenData.access_token) {
      return c.json({ error: 'Failed to get access token' }, 400);
    }
    
    // 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    
    const githubUser = await userResponse.json() as any;
    
    // 查找或创建用户
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?'
    ).bind('github', githubUser.id.toString()).first() as any;
    
    if (!user) {
      // 创建新用户
      const username = githubUser.login;
      const email = githubUser.email || `${githubUser.login}@github.oauth`;
      
      const result = await c.env.DB.prepare(
        `INSERT INTO users (username, email, display_name, avatar_url, oauth_provider, oauth_id, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        username,
        email,
        githubUser.name || username,
        githubUser.avatar_url,
        'github',
        githubUser.id.toString(),
        'user'
      ).run();
      
      user = {
        id: result.meta.last_row_id,
        username,
        email,
        display_name: githubUser.name || username,
        avatar_url: githubUser.avatar_url,
        role: 'user',
      };
    }
    
    // 生成token
    const token = await generateToken(c.env.JWT_SECRET, {
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    
    return c.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return c.json({ error: 'OAuth authentication failed' }, 500);
  }
});

/**
 * POST /api/auth/logout
 * 登出(将token加入黑名单)
 */
authRoutes.post('/logout', requireAuth, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader!.substring(7);
    
    // 将token加入黑名单,有效期7天
    await c.env.CACHE.put(`blacklist:${token}`, '1', {
      expirationTtl: 60 * 60 * 24 * 7,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
authRoutes.get('/me', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user') as any;
    
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as any;
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

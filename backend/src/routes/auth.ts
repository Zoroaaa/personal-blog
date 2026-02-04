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
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Env, successResponse, errorResponse, safeGetCache, safePutCache, safeDeleteCache } from '../index';
import { generateToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { 
  validateUsername, 
  validateEmail, 
  validatePassword,
  sanitizeInput 
} from '../utils/validation';

export const authRoutes = new Hono<{ Bindings: Env }>();

// ============= 常量配置 =============

const BCRYPT_ROUNDS = 12; // bcrypt加密轮次（增加安全性）
const MAX_LOGIN_ATTEMPTS = 5; // 最大登录失败次数
const LOGIN_BLOCK_DURATION = 15 * 60; // 登录封锁时间（15分钟，秒）

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
authRoutes.post('/register', async (c) => {
  const logger = createLogger(c);
  
  try {
    // 解析请求体
    const body = await c.req.json();
    let { username, email, password, displayName } = body;
    
    // ===== 1. 验证必填字段 =====
    if (!username || !email || !password) {
      logger.warn('Registration failed: Missing required fields');
      return c.json(errorResponse(
        'Missing required fields',
        'Please provide username, email, and password'
      ), 400);
    }
    
    // ===== 2. 清理输入（防XSS） =====
    username = sanitizeInput(username);
    email = sanitizeInput(email.toLowerCase()); // 邮箱转小写
    displayName = displayName ? sanitizeInput(displayName) : username;
    
    // ===== 3. 验证用户名格式 =====
    const usernameError = validateUsername(username);
    if (usernameError) {
      logger.warn('Registration failed: Invalid username', { username });
      return c.json(errorResponse('Invalid username', usernameError), 400);
    }
    
    // ===== 4. 验证邮箱格式 =====
    const emailError = validateEmail(email);
    if (emailError) {
      logger.warn('Registration failed: Invalid email', { email });
      return c.json(errorResponse('Invalid email', emailError), 400);
    }
    
    // ===== 5. 验证密码强度 =====
    const passwordError = validatePassword(password);
    if (passwordError) {
      logger.warn('Registration failed: Weak password');
      return c.json(errorResponse('Weak password', passwordError), 400);
    }
    
    // ===== 6. 检查用户是否已存在 =====
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
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
    const token = await generateToken(c.env.JWT_SECRET, {
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
        role: 'user',
        createdAt: new Date().toISOString()
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
authRoutes.post('/login', async (c) => {
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
    
    // ===== 2. 检查登录尝试次数（防暴力破解） =====
    const loginKey = `login_attempts:${username}`;
    const attempts = await safeGetCache(c.env, loginKey);
    const attemptCount = attempts ? parseInt(attempts, 10) : 0;
    
    if (attemptCount >= MAX_LOGIN_ATTEMPTS) {
      logger.warn('Login failed: Too many attempts', { username });
      return c.json(errorResponse(
        'Account temporarily locked',
        'Too many failed login attempts. Please try again in 15 minutes.'
      ), 429);
    }
    
    // ===== 3. 查找用户 =====
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, password_hash, display_name, avatar_url, bio, role FROM users WHERE username = ? OR email = ?'
    ).bind(username, username).first() as any;
    
    // ===== 4. 验证用户存在 =====
    if (!user) {
      // 记录失败尝试
      await recordLoginAttempt(c, loginKey, attemptCount);
      logger.warn('Login failed: User not found', { username });
      return c.json(errorResponse(
        'Invalid credentials',
        'Username or password is incorrect'
      ), 401);
    }
    
    // ===== 5. 验证密码 =====
    if (!user.password_hash) {
      logger.warn('Login failed: OAuth user trying password login', { username });
      return c.json(errorResponse(
        'Invalid login method',
        'This account uses OAuth login. Please sign in with GitHub.'
      ), 401);
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // 记录失败尝试
      await recordLoginAttempt(c, loginKey, attemptCount);
      logger.warn('Login failed: Invalid password', { username });
      return c.json(errorResponse(
        'Invalid credentials',
        'Username or password is incorrect'
      ), 401);
    }
    
    // ===== 6. 清除失败尝试记录 =====
    await safeDeleteCache(c.env, loginKey);
    
    // ===== 7. 生成JWT Token =====
    const token = await generateToken(c.env.JWT_SECRET, {
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

/**
 * 记录登录失败尝试
 */
async function recordLoginAttempt(
  c: any, 
  key: string, 
  currentCount: number
): Promise<void> {
  await safePutCache(
    c.env, 
    key, 
    (currentCount + 1).toString(), 
    { expirationTtl: LOGIN_BLOCK_DURATION }
  );
}

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
authRoutes.post('/github', async (c) => {
  const logger = createLogger(c);
  
  try {
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json(errorResponse(
        'Missing authorization code',
        'GitHub authorization code is required'
      ), 400);
    }
    
    // ===== 1. 交换access token =====
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
      logger.warn('GitHub OAuth failed: No access token');
      return c.json(errorResponse(
        'OAuth failed',
        'Failed to get access token from GitHub'
      ), 400);
    }
    
    // ===== 2. 获取GitHub用户信息 =====
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    
    const githubUser = await userResponse.json() as any;
    
    // ===== 3. 查找或创建用户 =====
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?'
    ).bind('github', githubUser.id.toString()).first() as any;
    
    if (!user) {
      // 创建新用户
      const username = githubUser.login;
      const email = githubUser.email || `${githubUser.login}@github.oauth`;
      
      // 检查用户名是否已存在
      const existing = await c.env.DB.prepare(
        'SELECT id FROM users WHERE username = ?'
      ).bind(username).first();
      
      const finalUsername = existing 
        ? `${username}_${Date.now().toString(36)}` 
        : username;
      
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
        username: user.username 
      });
    }
    
    // ===== 4. 生成JWT Token =====
    const token = await generateToken(c.env.JWT_SECRET, {
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
        role: user.role,
      },
      token
    }, 'GitHub login successful'));
    
  } catch (error) {
    logger.error('GitHub OAuth error', error);
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
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at, updated_at FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as any;
    
    if (!user) {
      logger.warn('User not found', { userId: currentUser.userId });
      return c.json(errorResponse('User not found'), 404);
    }
    
    // 获取用户统计数据
    const postCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND status = ?'
    ).bind(currentUser.userId, 'published').first() as any;
    
    const commentCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND status = ?'
    ).bind(currentUser.userId, 'approved').first() as any;
    
    // 构建完整的用户信息响应
    const userWithStats = {
      ...user,
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
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, avatar_url, bio, role, created_at, updated_at FROM users WHERE id = ?'
    ).bind(currentUser.userId).first();
    
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
    const { password, confirmation } = await c.req.json();
    
    // 要求确认
    if (confirmation !== 'DELETE') {
      return c.json(errorResponse(
        'Confirmation required',
        'Please type DELETE to confirm account deletion'
      ), 400);
    }
    
    // 验证密码（OAuth用户跳过）
    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as any;
    
    if (user.password_hash && password) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return c.json(errorResponse(
          'Invalid password',
          'Password is incorrect'
        ), 401);
      }
    }
    
    // 删除用户（这里实现硬删除，也可以改为软删除）
    await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(currentUser.userId).run();
    
    logger.info('Account deleted', { userId: currentUser.userId });
    
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
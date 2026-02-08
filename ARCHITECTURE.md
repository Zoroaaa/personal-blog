# 🏗️ 项目架构和技术详解

> 博客系统 v3.0 的完整技术架构、设计决策和实现细节

**体验站点**: [blog.neutronx.uk](https://blog.neutronx.uk)

---

## 📋 目录

- [系统架构](#系统架构)
- [技术选型](#技术选型)
- [数据库设计](#数据库设计)
- [后端架构](#后端架构)
- [前端架构](#前端架构)
- [安全设计](#安全设计)
- [性能优化](#性能优化)
- [部署架构](#部署架构)
- [开发规范](#开发规范)

---

## 🎯 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户层 (Clients)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  浏览器   │  │  移动端   │  │  爬虫    │  │  RSS阅读器│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Global Network                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   CDN      │  │   DDoS     │  │    WAF     │                │
│  │  缓存加速   │  │   防护     │  │  应用防火墙 │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└────────────┬──────────────────────────┬─────────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐  ┌────────────────────────┐
│  Cloudflare Pages      │  │  Cloudflare Workers    │
│  ┌──────────────────┐  │  │  ┌──────────────────┐  │
│  │   React App      │  │  │  │   Hono API       │  │
│  │   - 路由         │  │  │  │   - REST API     │  │
│  │   - 组件         │  │  │  │   - 中间件       │  │
│  │   - 状态管理     │  │  │  │   - 业务逻辑     │  │
│  └──────────────────┘  │  │  └──────────────────┘  │
│                        │  │                        │
│  静态资源托管           │  │  边缘计算              │
└────────────────────────┘  └────────┬───────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
         ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
         │  D1 Database  │  │  KV Storage   │  │  R2 Storage   │
         │               │  │               │  │               │
         │  - SQLite     │  │  - 缓存数据   │  │  - 图片文件   │
         │  - 关系数据   │  │  - Session    │  │  - 媒体资源   │
         │  - 索引优化   │  │  - Token黑名单│  │  - 备份文件   │
         └───────────────┘  └───────────────┘  └───────────────┘
```

### 请求流程

```
用户请求
   │
   ▼
Cloudflare Edge
   │
   ├─ 静态资源? ──yes──> Pages (React)
   │                       │
   │                       └─> 返回 HTML/CSS/JS
   │
   └─ API请求? ──yes──> Workers (Hono)
                           │
                           ├─> 速率限制检查
                           │
                           ├─> CORS验证
                           │
                           ├─> JWT认证（可选）
                           │
                           ├─> KV缓存查询
                           │   │
                           │   ├─> 命中 ──> 返回缓存
                           │   │
                           │   └─> 未命中 ──> 继续
                           │
                           ├─> 业务逻辑处理
                           │   │
                           │   ├─> 数据库查询 (D1)
                           │   │
                           │   └─> 文件操作 (R2)
                           │
                           ├─> 写入缓存 (KV)
                           │
                           └─> 返回 JSON响应
```

---

## 🛠️ 技术选型

### 技术栈对比和选择理由

#### 前端框架

| 框架 | 优势 | 劣势 | 选择 |
|------|------|------|------|
| **React** | 生态丰富、组件化、性能好 | 学习曲线 | ✅ 选用 |
| Vue | 易学、文档好 | 生态相对小 | ❌ |
| Angular | 企业级、完整 | 过于复杂 | ❌ |

**选择 React 的原因**:
- 强大的生态系统（库、工具、社区）
- 优秀的性能（Virtual DOM）
- 灵活的架构设计
- TypeScript 支持完善
- Cloudflare Pages 原生支持

#### 后端框架

| 框架 | 优势 | 劣势 | 选择 |
|------|------|------|------|
| **Hono** | 轻量、快速、Workers优化 | 相对新 | ✅ 选用 |
| Express | 成熟、生态好 | 不适合边缘计算 | ❌ |
| Fastify | 性能好 | Workers支持有限 | ❌ |

**选择 Hono 的原因**:
- 专为 Cloudflare Workers 优化
- 极致的性能（比 Express 快 4x）
- TypeScript 原生支持
- 中间件系统完善
- 体积小（~12KB）

#### 数据库

| 方案 | 优势 | 劣势 | 选择 |
|------|------|------|------|
| **D1** | 免费、分布式、SQL | Beta阶段 | ✅ 选用 |
| KV | 极快、全球分布 | NoSQL、有限查询 | ✅ 辅助 |
| PostgreSQL | 功能强大 | 需要服务器 | ❌ |

**选择 D1 的原因**:
- 完全免费（在额度内）
- 原生 SQL 支持
- 自动备份和复制
- 与 Workers 深度集成
- 无需运维

#### 样式方案

| 方案 | 优势 | 劣势 | 选择 |
|------|------|------|------|
| **Tailwind CSS** | 快速开发、响应式、可定制 | HTML 冗长 | ✅ 选用 |
| CSS Modules | 隔离好 | 需要写CSS | ❌ |
| Styled Components | JS中写样式 | 性能开销 | ❌ |

**选择 Tailwind 的原因**:
- 开发效率极高
- 响应式设计简单
- 主题定制灵活
- 生产构建自动优化
- 设计系统一致性好

#### 状态管理

| 方案 | 优势 | 劣势 | 选择 |
|------|------|------|------|
| **Zustand** | 简单、轻量、无样板代码 | 生态相对小 | ✅ 选用 |
| Redux | 成熟、生态好 | 样板代码多 | ❌ |
| Context API | 原生 | 性能问题 | ❌ |

**选择 Zustand 的原因**:
- 极简的 API（~1KB）
- 无需 Provider 包裹
- TypeScript 支持完美
- 性能优秀
- 中间件支持

---

## 🗄️ 数据库设计

### ER 图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │    posts    │       │  categories │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ id (PK)     │   ┌───│ id (PK)     │
│ username    │   │   │ title       │   │   │ name        │
│ email       │   │   │ slug        │   │   │ slug        │
│ password    │   │   │ content     │   │   │ description │
│ role        │   │   │ author_id(FK)│───┤   │ icon        │
│ created_at  │   │   │ category_id │───┘   │ color       │
└─────────────┘   │   │ status      │       └─────────────┘
                  │   │ created_at  │
                  │   └─────────────┘
                  │         │
                  │         │ 1:N
                  │         ▼
                  │   ┌─────────────┐       ┌─────────────┐
                  │   │  comments   │       │    tags     │
                  │   ├─────────────┤       ├─────────────┤
                  └──>│ id (PK)     │       │ id (PK)     │
                      │ post_id (FK)│       │ name        │
                      │ user_id (FK)│       │ slug        │
                      │ parent_id   │       │ color       │
                      │ content     │       └─────────────┘
                      │ status      │             │
                      └─────────────┘             │ N:M
                            │                     │
                            │ 1:N                 ▼
                            ▼               ┌─────────────┐
                      ┌─────────────┐       │  post_tags  │
                      │    likes    │       ├─────────────┤
                      ├─────────────┤       │ post_id (FK)│
                      │ id (PK)     │       │ tag_id (FK) │
                      │ user_id (FK)│       └─────────────┘
                      │ post_id (FK)│
                      │ comment_id  │
                      └─────────────┘
```

### 核心表结构

#### users - 用户表

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',           -- admin/moderator/user
    status TEXT DEFAULT 'active',        -- active/suspended/deleted
    oauth_provider TEXT,                 -- github/google/null
    oauth_id TEXT,
    post_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);
```

**索引**:
- `idx_users_username` - 用户名查询
- `idx_users_email` - 邮箱查询
- `idx_users_oauth` - OAuth 登录
- `idx_users_role` - 角色筛选

#### posts - 文章表

```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    author_id INTEGER NOT NULL,
    category_id INTEGER,
    status TEXT DEFAULT 'draft',         -- draft/published/archived
    visibility TEXT DEFAULT 'public',    -- public/private/password
    password TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reading_time INTEGER,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**索引**:
- `idx_posts_slug` - URL 查询
- `idx_posts_author_id` - 作者文章
- `idx_posts_category_id` - 分类文章
- `idx_posts_status_published` - 已发布文章（复合索引）
- `idx_posts_published_at` - 时间排序
- `idx_posts_view_count` - 热门排序

#### comments - 评论表

```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,                   -- 支持5层嵌套
    content TEXT NOT NULL,
    status TEXT DEFAULT 'approved',      -- pending/approved/rejected/deleted
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

**索引**:
- `idx_comments_post_id` - 文章评论
- `idx_comments_user_id` - 用户评论
- `idx_comments_parent_id` - 评论回复
- `idx_comments_post_status` - 已审核评论（复合索引）

### 数据库优化策略

#### 1. 索引优化

```sql
-- 复合索引：状态 + 发布时间（覆盖最常用查询）
CREATE INDEX idx_posts_status_published 
ON posts(status, published_at DESC) 
WHERE status = 'published';

-- 部分索引：仅对已发布文章建索引
CREATE INDEX idx_posts_visibility 
ON posts(visibility) 
WHERE status = 'published';
```

#### 2. 触发器自动维护

```sql
-- 自动更新文章评论数
CREATE TRIGGER trg_comments_insert
AFTER INSERT ON comments
WHEN NEW.status = 'approved'
BEGIN
    UPDATE posts 
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
END;

-- 自动更新用户文章数
CREATE TRIGGER trg_posts_insert
AFTER INSERT ON posts
WHEN NEW.status = 'published'
BEGIN
    UPDATE users 
    SET post_count = post_count + 1
    WHERE id = NEW.author_id;
END;
```

#### 3. 视图简化查询

```sql
-- 文章详情视图（减少JOIN）
CREATE VIEW vw_posts_detailed AS
SELECT 
    p.*,
    u.username as author_username,
    u.display_name as author_name,
    u.avatar_url as author_avatar,
    c.name as category_name,
    c.slug as category_slug,
    c.color as category_color
FROM posts p
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN categories c ON p.category_id = c.id;
```

---

## 🔧 后端架构

### 项目结构

```
backend/
├── src/
│   ├── index.ts                # 主入口
│   ├── middleware/             # 中间件层
│   │   ├── auth.ts            # JWT 认证
│   │   ├── rateLimit.ts       # 速率限制
│   │   └── requestLogger.ts   # 请求日志
│   ├── routes/                # 路由层
│   │   ├── auth.ts            # 认证路由
│   │   ├── posts.ts           # 文章路由
│   │   ├── comments.ts        # 评论路由
│   │   ├── categories.ts      # 分类标签路由
│   │   ├── upload.ts          # 文件上传路由
│   │   ├── analytics.ts       # 数据统计路由
│   │   ├── admin.ts           # 管理员路由
│   │   └── config.ts          # 配置路由
│   ├── utils/                 # 工具层
│   │   ├── cache.ts           # 缓存工具
│   │   ├── jwt.ts             # JWT 工具
│   │   ├── validation.ts      # 数据验证
│   │   ├── response.ts        # 响应格式化
│   │   └── resend.ts          # 邮件服务
│   └── types/                 # 类型定义
│       └── index.ts
├── wrangler.toml              # Workers 配置
└── package.json
```

### 分层架构

```
┌─────────────────────────────────────────┐
│           路由层 (Routes)                │
│  - 定义 API 端点                         │
│  - 参数验证                              │
│  - 调用业务逻辑                          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         中间件层 (Middleware)            │
│  - 认证授权 (JWT)                        │
│  - 速率限制 (IP/User)                    │
│  - CORS 处理                             │
│  - 请求日志                              │
│  - 错误处理                              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         业务逻辑层 (Business)            │
│  - 核心业务逻辑                          │
│  - 数据处理和转换                        │
│  - 权限检查                              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          数据访问层 (Data)               │
│  - 数据库查询 (D1)                       │
│  - 缓存读写 (KV)                         │
│  - 文件操作 (R2)                         │
└─────────────────────────────────────────┘
```

### 核心模块设计

#### 1. 认证系统

```typescript
// JWT 认证流程
export async function requireAuth(c: Context, next: Next) {
  // 1. 提取 Token
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  try {
    // 2. 验证 Token
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    
    // 3. 检查黑名单
    const isBlacklisted = await safeGetCache(c.env, `token_blacklist:${token}`);
    if (isBlacklisted) {
      return c.json(errorResponse('Token已失效'), 401);
    }
    
    // 4. 查询用户
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ? AND status = "active"'
    ).bind(payload.userId).first();
    
    if (!user) {
      return c.json(errorResponse('用户不存在'), 401);
    }
    
    // 5. 注入用户信息
    c.set('user', user);
    await next();
    
  } catch (error) {
    return c.json(errorResponse('Token无效'), 401);
  }
}
```

#### 2. 速率限制

```typescript
// 智能速率限制
export async function rateLimiter(c: Context, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const endpoint = c.req.path;
  
  // 根据端点设置不同限制
  const limits = {
    '/api/auth/login': { max: 50, window: 86400 },    // 50次/天
    '/api/upload': { max: 20, window: 3600 },         // 20次/小时
    '/default': { max: 500, window: 86400 }           // 500次/天
  };
  
  const limit = limits[endpoint] || limits.default;
  const key = `rate:${ip}:${endpoint}`;
  
  // 获取当前计数
  const count = await c.env.CACHE.get(key);
  const current = count ? parseInt(count) : 0;
  
  if (current >= limit.max) {
    return c.json(errorResponse('Rate limit exceeded'), 429);
  }
  
  // 增加计数
  await c.env.CACHE.put(
    key, 
    String(current + 1), 
    { expirationTtl: limit.window }
  );
  
  await next();
}
```

#### 3. 缓存策略

```typescript
// 多层缓存架构
export class CacheManager {
  // 热点数据缓存 (1小时)
  async getHotPosts(env: Env): Promise<Post[]> {
    const cached = await safeGetCache(env, 'hot_posts');
    if (cached) return JSON.parse(cached);
    
    const posts = await fetchHotPosts(env);
    await safePutCache(env, 'hot_posts', JSON.stringify(posts), 3600);
    return posts;
  }
  
  // 用户数据缓存 (5分钟)
  async getUserById(env: Env, id: number): Promise<User> {
    const key = `user:${id}`;
    const cached = await safeGetCache(env, key);
    if (cached) return JSON.parse(cached);
    
    const user = await fetchUser(env, id);
    await safePutCache(env, key, JSON.stringify(user), 300);
    return user;
  }
  
  // 配置缓存 (24小时)
  async getSiteConfig(env: Env): Promise<Config> {
    const cached = await safeGetCache(env, 'site_config');
    if (cached) return JSON.parse(cached);
    
    const config = await fetchConfig(env);
    await safePutCache(env, 'site_config', JSON.stringify(config), 86400);
    return config;
  }
}
```

---

## 🎨 前端架构

### 项目结构

```
frontend/
├── public/                    # 静态资源
│   ├── logo.png
│   └── favicon.ico
├── src/
│   ├── components/           # 公共组件
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── PostEditor.tsx    # Markdown 编辑器
│   │   ├── CategoryManager.tsx
│   │   └── TagManager.tsx
│   ├── pages/                # 页面组件
│   │   ├── HomePage.tsx
│   │   ├── PostPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── AdminPage.tsx
│   │   └── ConfigPage.tsx
│   ├── stores/               # Zustand 状态
│   │   ├── authStore.ts      # 认证状态
│   │   └── themeStore.ts     # 主题状态
│   ├── hooks/                # 自定义 Hooks
│   │   ├── useApiRequest.ts  # API 请求
│   │   ├── useSiteConfig.ts  # 配置获取
│   │   └── useVerificationCountdown.ts
│   ├── utils/                # 工具函数
│   │   └── api.ts            # API 客户端
│   ├── types/                # TypeScript 类型
│   │   └── index.ts
│   ├── App.tsx               # 根组件
│   ├── main.tsx              # 入口文件
│   └── index.css             # 全局样式
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind 配置
└── package.json
```

### 组件架构

```
App.tsx
├── Router
│   ├── Layout
│   │   ├── Header
│   │   │   ├── Logo
│   │   │   ├── Navigation
│   │   │   └── UserMenu
│   │   ├── Main (Routes)
│   │   │   ├── HomePage
│   │   │   ├── PostPage
│   │   │   ├── SearchPage
│   │   │   └── ...
│   │   └── Footer
│   │       ├── SocialLinks
│   │       └── Copyright
```

### 状态管理

```typescript
// authStore.ts - 认证状态
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileData) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    localStorage.setItem('token', response.token);
    set({ user: response.user, token: response.token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    set({ user: response.user });
  }
}));

// themeStore.ts - 主题状态
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: localStorage.getItem('theme') as ThemeMode || 'system',
  
  setMode: (mode) => {
    localStorage.setItem('theme', mode);
    set({ mode });
  },
  
  toggle: () => set((state) => ({
    mode: state.mode === 'light' ? 'dark' : 'light'
  }))
}));
```

### 路由设计

```typescript
// App.tsx
function App() {
  return (
    <Router>
      <Routes>
        {/* 公开路由 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/posts/:slug" element={<PostPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<AboutPage />} />
        
        {/* 认证路由 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 受保护路由 */}
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/posts/new" element={<PostEditor />} />
          <Route path="/posts/:id/edit" element={<PostEditor />} />
        </Route>
        
        {/* 管理员路由 */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/comments" element={<CommentModeration />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
```

---

## 🔒 安全设计

### 1. 认证安全

```typescript
// 密码加密
const hashedPassword = await bcrypt.hash(password, 12);

// JWT 签名
const token = await generateToken(
  { userId, role },
  secret,
  { expiresIn: '7d' }
);

// Token 刷新机制
async function refreshToken(oldToken: string) {
  const payload = await verifyToken(oldToken);
  
  // 检查是否在刷新窗口期
  if (payload.exp - Date.now() / 1000 > 86400) {
    throw new Error('Token 还未到刷新时间');
  }
  
  return generateToken({ userId: payload.userId, role: payload.role });
}
```

### 2. 输入验证

```typescript
// 用户名验证
export function validateUsername(username: string): string | null {
  if (!username || username.length < 3) {
    return '用户名至少3个字符';
  }
  if (username.length > 20) {
    return '用户名最多20个字符';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return '用户名只能包含字母、数字和下划线';
  }
  return null;
}

// 邮箱验证
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '邮箱格式不正确';
  }
  return null;
}

// 密码验证
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return '密码至少8个字符';
  }
  if (!/[a-z]/.test(password)) {
    return '密码必须包含小写字母';
  }
  if (!/[A-Z]/.test(password)) {
    return '密码必须包含大写字母';
  }
  if (!/[0-9]/.test(password)) {
    return '密码必须包含数字';
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return '密码必须包含特殊字符';
  }
  return null;
}

// XSS 防护
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

### 3. SQL 注入防护

```typescript
// 使用参数化查询
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE username = ? AND status = ?'
).bind(username, 'active').first();

// 避免字符串拼接（错误示例）
// const query = `SELECT * FROM users WHERE username = '${username}'`; // ❌ 危险！
```

### 4. CSRF 防护

```typescript
// 检查 Origin 和 Referer
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    if (!origin && !referer) {
      return c.json(errorResponse('CSRF check failed'), 403);
    }
    
    const allowedOrigins = ['https://blog.neutronx.uk'];
    if (origin && !allowedOrigins.includes(origin)) {
      return c.json(errorResponse('CSRF check failed'), 403);
    }
  }
  
  await next();
});
```

### 5. 权限控制

```typescript
// 基于角色的访问控制 (RBAC)
const permissions = {
  admin: ['*'],  // 所有权限
  moderator: [
    'comments:read',
    'comments:update',
    'comments:delete',
    'posts:read',
    'posts:update'
  ],
  user: [
    'posts:read',
    'posts:create',
    'posts:update:own',
    'comments:create',
    'comments:update:own'
  ]
};

function hasPermission(user: User, permission: string): boolean {
  const userPermissions = permissions[user.role];
  
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return userPermissions.includes(permission);
}

// 资源所有权检查
async function canEditPost(user: User, postId: number, env: Env): Promise<boolean> {
  if (user.role === 'admin') {
    return true;
  }
  
  const post = await env.DB.prepare(
    'SELECT author_id FROM posts WHERE id = ?'
  ).bind(postId).first();
  
  return post && post.author_id === user.id;
}
```

---

## ⚡ 性能优化

### 1. 缓存策略

```typescript
// 三级缓存架构
┌────────────────┐
│  Browser Cache │  (静态资源，1年)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Cloudflare CDN│  (边缘缓存，1小时)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│   KV Storage   │  (热点数据，自定义TTL)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│   D1 Database  │  (持久化存储)
└────────────────┘
```

### 2. 数据库查询优化

```typescript
// 使用索引
const posts = await env.DB.prepare(`
  SELECT * FROM posts
  WHERE status = 'published' AND visibility = 'public'
  ORDER BY published_at DESC
  LIMIT ? OFFSET ?
`).bind(limit, offset).all();

// 避免 N+1 查询
const postsWithAuthors = await env.DB.prepare(`
  SELECT 
    p.*,
    u.username, u.display_name, u.avatar_url
  FROM posts p
  LEFT JOIN users u ON p.author_id = u.id
  WHERE p.status = 'published'
  LIMIT ?
`).bind(limit).all();

// 批量操作
await env.DB.batch([
  env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').bind(1),
  env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').bind(2),
  env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').bind(3)
]);
```

### 3. 前端优化

```typescript
// 路由级代码分割
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PostEditor = lazy(() => import('./components/PostEditor'));

// 图片懒加载
<img 
  src={post.coverImage}
  loading="lazy"
  alt={post.title}
/>

// 虚拟滚动（大列表）
import { useVirtualizer } from '@tanstack/react-virtual';

function PostList({ posts }) {
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });
  
  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div key={virtualRow.index}>
          {posts[virtualRow.index].title}
        </div>
      ))}
    </div>
  );
}

// 防抖和节流
import { debounce } from 'lodash';

const handleSearch = debounce(async (keyword: string) => {
  const results = await searchPosts(keyword);
  setResults(results);
}, 300);
```

### 4. 资源优化

```bash
# Gzip/Brotli 压缩
# 自动由 Cloudflare 处理

# 图片优化
- 使用 WebP 格式
- 响应式图片（srcset）
- 懒加载
- 尺寸限制（5MB）

# CSS 优化
- Tailwind 自动去除未使用的类
- Critical CSS 内联
- 非关键CSS异步加载

# JavaScript 优化
- 代码分割
- Tree Shaking
- 压缩混淆（生产构建）
```

---

## 🚀 部署架构

### CI/CD 流程

```
┌─────────────┐
│  Git Push   │
│  to Main    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│    GitHub Actions           │
│                             │
│  1. Checkout Code           │
│  2. Install Dependencies    │
│  3. Run Tests               │
│  4. Build Frontend          │
│  5. Deploy Backend Worker   │
│  6. Deploy Frontend Pages   │
│  7. Send Notifications      │
└─────────────────────────────┘
       │
       ├──────────────┐
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│  Cloudflare │  │  Cloudflare │
│   Workers   │  │    Pages    │
└─────────────┘  └─────────────┘
```

### 环境管理

```
Development (本地)
├── Frontend: localhost:5173
├── Backend: localhost:8787
└── Database: wrangler dev --local

Staging (测试)
├── Frontend: staging.blog.neutronx.uk
├── Backend: api-staging.blog.neutronx.uk
└── Database: blog-db-staging

Production (生产)
├── Frontend: blog.neutronx.uk
├── Backend: apiblog.neutronx.uk
└── Database: blog-db
```

### 监控和日志

```typescript
// 性能监控
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  // 记录慢查询
  if (duration > 1000) {
    console.warn(`Slow request: ${c.req.url} took ${duration}ms`);
  }
  
  // 发送到分析服务
  c.env.ANALYTICS?.writeDataPoint({
    doubles: [duration],
    blobs: [c.req.url],
    indexes: [c.req.method]
  });
});

// 错误追踪
app.onError((err, c) => {
  console.error('Application Error:', {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString()
  });
  
  return c.json(errorResponse('Internal Server Error'), 500);
});
```

---

## 📏 开发规范

### 代码风格

```typescript
// 使用 ESLint + Prettier
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Git 提交规范

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整（不影响功能）
refactor: 代码重构
test: 测试相关
chore: 构建/工具链相关

示例：
feat(auth): 添加 GitHub OAuth 登录
fix(posts): 修复文章搜索结果不准确的问题
docs(api): 更新 API 文档
```

### 文件命名规范

```
- 组件文件：PascalCase (Header.tsx, PostCard.tsx)
- 工具文件：camelCase (api.ts, cache.ts)
- 类型文件：PascalCase (User.ts, Post.ts)
- 常量文件：UPPER_CASE (CONSTANTS.ts)
- 样式文件：kebab-case (header.module.css)
```

### TypeScript 最佳实践

```typescript
// 使用接口定义数据结构
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
}

// 使用类型保护
function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

// 避免使用 any
function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then(res => res.json());
}

// 使用枚举
enum PostStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived'
}
```

---

## 📚 参考资料

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Hono 框架文档](https://hono.dev/)
- [React 官方文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)

---

<div align="center">

**架构文档版本**: v3.0.1  
**最后更新**: 2024-01-15

[返回顶部](#-项目架构和技术详解)

</div>

# 系统架构文档

本文档详细描述个人博客系统的技术架构、数据模型和核心设计决策。

**版本**: v1.2.0 | **更新日期**: 2026-02-10

---

## 目录

- [系统概述](#系统概述)
- [架构设计](#架构设计)
- [技术栈](#技术栈)
- [数据模型](#数据模型)
- [API 设计](#api-设计)
- [安全设计](#安全设计)
- [性能优化](#性能优化)
- [部署架构](#部署架构)

---

## 系统概述

个人博客系统是一个基于 Cloudflare 边缘计算平台构建的现代化内容管理系统，采用前后端分离架构，支持 Markdown 写作、用户互动、内容管理等功能。

### 核心特性

- **边缘计算**: 基于 Cloudflare Workers，全球低延迟访问
- **Serverless**: 无需管理服务器，自动扩缩容
- **现代化前端**: React 18 + TypeScript + Tailwind CSS
- **完整功能**: 文章、专栏、评论、用户、分类、标签、数据分析
- **全文搜索**: 支持 FTS5 全文搜索引擎
- **邮箱验证**: 支持 Resend 邮箱验证码服务

### 系统边界

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Web 浏览器 │  │  移动端   │  │  RSS 阅读器│  │  搜索引擎  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare 边缘层                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Cloudflare CDN / Pages                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │  │
│  │  │   静态资源    │  │   前端应用    │  │  边缘缓存  │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Cloudflare Workers (后端 API)               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │   认证    │ │   文章    │ │   评论    │ │  管理    │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  D1 数据库 │  │  KV 缓存  │  │  R2 存储  │  │  日志分析  │   │
│  │ (SQLite)  │  │ (键值对)  │  │ (对象存储)│  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         前端层                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    React 应用                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │  页面组件 │ │  UI 组件  │ │  状态管理 │ │  路由   │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         后端层                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Cloudflare Workers                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                 Hono 框架                       │  │  │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │  │
│  │  │  │ 中间件  │ │ 路由   │ │ 控制器  │ │ 验证器  │  │  │  │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   D1     │  │   KV     │  │   R2     │                  │
│  │  关系数据 │  │  缓存    │  │  文件    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 前端架构

```
frontend/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── ui/             # UI 基础组件
│   │   ├── layout/         # 布局组件
│   │   └── common/         # 通用组件
│   ├── pages/              # 页面组件
│   │   ├── HomePage.tsx    # 首页
│   │   ├── PostPage.tsx    # 文章详情
│   │   ├── ColumnPage.tsx  # 专栏详情
│   │   ├── LoginPage.tsx   # 登录
│   │   ├── AdminPage.tsx   # 管理后台
│   │   └── ...
│   ├── stores/             # Zustand 状态管理
│   │   ├── authStore.ts    # 认证状态
│   │   ├── postStore.ts    # 文章状态
│   │   └── uiStore.ts      # UI 状态
│   ├── hooks/              # 自定义 Hooks
│   ├── utils/              # 工具函数
│   │   ├── api.ts          # API 客户端
│   │   ├── apiTransformer.ts # API数据转换
│   │   └── helpers.ts      # 辅助函数
│   ├── types/              # TypeScript 类型
│   └── styles/             # 样式文件
```

### 后端架构

```
backend/
├── src/
│   ├── index.ts            # 应用入口
│   ├── routes/             # 路由模块
│   │   ├── auth.ts         # 认证路由
│   │   ├── posts.ts        # 文章路由
│   │   ├── columns.ts      # 专栏路由
│   │   ├── comments.ts     # 评论路由
│   │   ├── categories.ts   # 分类路由
│   │   ├── admin.ts        # 管理路由
│   │   ├── config.ts       # 配置路由
│   │   ├── upload.ts       # 上传路由
│   │   └── analytics.ts    # 统计路由
│   ├── middleware/         # 中间件
│   │   ├── auth.ts         # 认证中间件
│   │   ├── requestLogger.ts # 请求日志
│   │   └── rateLimit.ts    # 限流中间件
│   ├── utils/              # 工具函数
│   │   ├── response.ts     # 响应工具
│   │   ├── jwt.ts          # JWT 工具
│   │   ├── validation.ts   # 验证器
│   │   └── cache.ts        # 缓存工具
│   └── types/              # 类型定义
│       └── index.ts        # 核心类型
```

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| React Router | 6.x | 路由管理 |
| React Query | 5.x | 数据获取 |
| React Markdown | 9.x | Markdown 渲染 |
| PrismJS | 1.x | 代码高亮 |
| Axios | 1.x | HTTP 客户端 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Hono | 4.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| Wrangler | 3.x | CLI 工具 |
| bcryptjs | 2.x | 密码哈希 |
| zod | 3.x | 数据验证 |
| @cloudflare/workers-types | 4.x | Workers 类型 |

### 基础设施

| 服务 | 用途 |
|------|------|
| Cloudflare Workers | 后端运行时 |
| Cloudflare Pages | 前端托管 |
| Cloudflare D1 | SQLite 数据库 |
| Cloudflare KV | 键值存储 |
| Cloudflare R2 | 对象存储 |
| Cloudflare CDN | 内容分发 |
| Resend | 邮件服务 |

---

## 数据模型

### 数据库架构 v2.0.0

#### 用户表 (users)

```sql
users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,  -- OAuth用户可能为空
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'moderator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
  oauth_provider TEXT CHECK(oauth_provider IN ('github', 'google', NULL)),
  oauth_id TEXT,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  UNIQUE(oauth_provider, oauth_id)
)
```

#### 文章表 (posts)

```sql
posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id INTEGER NOT NULL,
  category_id INTEGER,
  column_id INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password')),
  password TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  reading_time INTEGER,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  published_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE SET NULL
)
```

#### 专栏表 (columns)

```sql
columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  author_id INTEGER NOT NULL,
  post_count INTEGER DEFAULT 0,
  total_view_count INTEGER DEFAULT 0,
  total_like_count INTEGER DEFAULT 0,
  total_favorite_count INTEGER DEFAULT 0,
  total_comment_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
)
```

#### 评论表 (comments)

```sql
comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'deleted')),
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
)
```

#### 分类表 (categories)

```sql
categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  post_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

#### 标签表 (tags)

```sql
tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  post_count INTEGER DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

#### 文章标签关联表 (post_tags)

```sql
post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)
```

#### 点赞表 (likes)

```sql
likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER,
  comment_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
)
```

#### 阅读历史表 (reading_history)

```sql
reading_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  first_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_duration_seconds INTEGER DEFAULT 0,
  read_percentage INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
)
```

#### 收藏表 (favorites)

```sql
favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
)
```

#### 站点配置表 (site_config)

```sql
site_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
  category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general', 'theme', 'social', 'seo', 'features')),
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

#### 全文搜索虚拟表 (posts_fts)

```sql
posts_fts (
  title, 
  content
) USING fts5
```

### 实体关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │    posts    │       │  categories │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────┤ author_id   │   ┌───┤ id (PK)     │
│ username    │       │ category_id │◄──┘   │ name        │
│ email       │       │ column_id   │◄──┐   │ slug        │
│ role        │       │ title       │   │   └─────────────┘
│ status      │       │ status      │   │
└─────────────┘       └──────┬──────┘   │
                             │          │
        ┌────────────────────┼──────────┘
        │                    │
        ▼                    ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   columns   │       │   comments  │       │    likes    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────┤ post_id     │       │ id (PK)     │
│ name        │       │ author_id   │◄──────┤ user_id     │
│ slug        │       │ parent_id   │◄──────┤ post_id     │
│ author_id   │◄──────┤ content     │       │ comment_id  │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                             │
                             ▼
                      ┌─────────────┐
                      │  post_tags  │
                      ├─────────────┤
                      │ post_id     │◄────┐
                      │ tag_id      │◄────┘
                      └─────────────┘     │
                                          │
                                    ┌─────────────┐
                                    │    tags     │
                                    ├─────────────┤
                                    │ id (PK)     │
                                    │ name        │
                                    │ slug        │
                                    └─────────────┘
```

### 索引设计

数据库包含以下关键索引：

- **文章索引**: slug, author_id, category_id, status, visibility, published_at, view_count, like_count
- **复合索引**: 状态+发布时间、状态+可见性、专栏+发布时间、作者+发布时间
- **评论索引**: post_id, user_id, parent_id, status, created_at
- **用户索引**: username, email, role, status, oauth_provider+oauth_id
- **点赞唯一索引**: user_id+post_id, user_id+comment_id

### 数据库触发器

- **FTS5同步触发器**: 自动同步文章标题和内容到全文搜索索引
- **计数器触发器**: 自动更新分类、标签、文章、评论的计数
- **专栏统计触发器**: 自动更新专栏的文章数、浏览量、点赞数等统计
- **时间戳触发器**: 自动更新 updated_at 字段

---

## API 设计

### RESTful 设计原则

1. **资源导向**: URL 表示资源，而非动作
2. **HTTP 方法**: 使用标准 HTTP 方法表示操作
3. **状态码**: 使用标准 HTTP 状态码
4. **无状态**: 每个请求独立，不依赖会话状态

### 路由设计

```
/api
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /github
│   ├── POST   /reset-password
│   ├── POST   /send-verification-code
│   ├── POST   /delete
│   ├── GET    /me
│   ├── PUT    /profile
│   ├── PUT    /password
│   └── POST   /logout
├── /posts
│   ├── GET    /
│   ├── GET    /search
│   ├── GET    /admin
│   ├── GET    /admin/:id
│   ├── GET    /likes
│   ├── GET    /reading-history
│   ├── GET    /favorites
│   ├── GET    /:slug
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── POST   /:id/like
│   ├── POST   /:id/favorite
│   └── POST   /:id/reading-progress
├── /comments
│   ├── GET    /
│   ├── POST   /
│   ├── DELETE /:id
│   └── POST   /:id/like
├── /categories
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── /tags
│       ├── GET    /
│       ├── POST   /
│       ├── PUT    /:id
│       └── DELETE /:id
├── /columns
│   ├── GET    /
│   ├── GET    /:slug
│   ├── GET    /:slug/posts
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── POST   /:id/refresh-stats
├── /admin
│   ├── GET    /users
│   ├── PUT    /users/:id/role
│   ├── DELETE /users/:id
│   ├── GET    /comments
│   ├── PUT    /comments/:id/status
│   ├── GET    /settings
│   └── PUT    /settings
├── /config
│   ├── GET    /
│   ├── GET    /storage
│   ├── GET    /admin
│   ├── PUT    /
│   └── PUT    /:key
├── /upload
│   ├── POST   /
│   └── DELETE /:filename
├── /analytics
│   ├── GET    /
│   └── GET    /hot-posts
└── /health
    ├── GET    /
    └── GET    /api/health
```

---

## 安全设计

### 认证机制

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    客户端    │────▶│  登录请求   │────▶│  后端验证   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  JWT 生成   │
                                        │  - user_id  │
                                        │  - role     │
                                        │  - exp      │
                                        └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  存储 Token  │◀────│  返回响应   │◀────│  签名 Token │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │ 后续请求
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Authorization│────▶│  JWT 验证   │────▶│  权限检查   │
│ Bearer <token>│    │  - 签名     │     │  - role     │
└─────────────┘     │  - 过期     │     │  - status   │
                    └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  执行业务   │
                                        └─────────────┘
```

### 安全措施

1. **密码安全**
   - 使用 bcrypt 哈希（cost factor: 12）
   - 最小密码长度：8 位
   - 密码复杂度验证

2. **JWT 安全**
   - HS256 算法签名
   - 7 天过期时间
   - Token 黑名单机制

3. **请求安全**
   - CORS 限制
   - 请求频率限制
   - SQL 注入防护（参数化查询）
   - XSS 防护（输入过滤）

4. **数据安全**
   - 敏感数据加密存储
   - 数据库访问控制
   - 定期备份

5. **邮箱验证**
   - Resend API 集成
   - 验证码有效期限制
   - 频率限制

---

## 性能优化

### 缓存策略

```
┌─────────────┐
│    请求     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     命中     ┌─────────────┐
│  CDN 缓存   │────────────▶│  返回缓存   │
└──────┬──────┘             └─────────────┘
       │ 未命中
       ▼
┌─────────────┐     命中     ┌─────────────┐
│   KV 缓存   │────────────▶│  返回缓存   │
└──────┬──────┘             └─────────────┘
       │ 未命中
       ▼
┌─────────────┐
│  D1 数据库  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  更新缓存   │
└─────────────┘
```

### 优化策略

1. **数据库优化**
   - 合理的索引设计（15+ 个复合索引）
   - 查询优化（批量查询减少 N+1 问题）
   - 分页查询
   - 触发器自动更新计数
   - FTS5 全文搜索

2. **缓存策略**
   - 热点数据 KV 缓存
   - CDN 边缘缓存
   - 浏览器缓存

3. **前端优化**
   - 代码分割
   - 懒加载
   - 图片优化
   - 资源压缩

4. **网络优化**
   - HTTP/2
   - 压缩传输
   - 预加载关键资源

---

## 部署架构

### 生产环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
│                    全球用户访问                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare 网络                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Anycast 网络                        │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │  │
│  │  │  节点1  │ │  节点2  │ │  节点3  │ │  节点N  │        │  │
│  │  │  美洲  │ │  欧洲  │ │  亚洲  │ │ 其他  │        │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Cloudflare    │ │   Cloudflare    │ │   Cloudflare    │
│     Pages       │ │    Workers      │ │      D1         │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │  前端应用  │  │ │  │  后端 API  │  │ │  │  数据库    │  │
│  │  静态资源  │  │ │  │  业务逻辑  │  │ │  │  SQLite   │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   辅助服务层                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │    KV    │  │    R2    │  │  Resend  │                  │
│  │  缓存    │  │  存储    │  │  邮件    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户请求
    │
    ▼
┌─────────────┐
│ Cloudflare  │
│    DNS      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  边缘节点    │◀──── CDN 缓存
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Workers   │◀──── JWT 验证
└──────┬──────┘
       │
       ├── 缓存命中 ──▶ KV 缓存
       │
       ▼ 缓存未命中
┌─────────────┐
│     D1      │◀──── 数据查询
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  更新缓存   │
└─────────────┘
```

### 扩展性设计

#### 水平扩展

- **Workers**: 自动扩缩容，无并发限制
- **D1**: 读副本支持（未来）
- **KV**: 全球自动复制
- **R2**: 无容量限制

#### 功能扩展

模块化架构支持：
- 插件系统
- 主题系统
- 第三方集成
- API 扩展

---

## 监控与日志

### 监控指标

- 请求量与响应时间
- 错误率
- 缓存命中率
- 数据库性能

### 日志记录

- 访问日志
- 错误日志
- 审计日志
- 性能日志

---

本文档随项目迭代持续更新。

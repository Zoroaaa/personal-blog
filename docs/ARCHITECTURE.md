# 架构文档

本文档详细介绍个人博客系统的架构设计、技术选型和实现细节。

**版本**: v1.3.3 | **更新日期**: 2026-02-16

---

## 目录

- [系统架构概览](#系统架构概览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [数据模型](#数据模型)
- [API 设计](#api-设计)
- [安全设计](#安全设计)
- [性能优化](#性能优化)
- [扩展性设计](#扩展性设计)

---

## 系统架构概览

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │  Mobile Web │  │    Admin Panel      │ │
│  │  (React)    │  │  (Responsive)│  │    (React)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare 边缘层                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Cloudflare Pages (前端托管)               │  │
│  │         Cloudflare Workers (后端 API)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────┼───────────────────────────┐  │
│  │                           ▼                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │     D1      │  │     R2      │  │     KV      │   │  │
│  │  │  (SQLite)   │  │  (Object)   │  │  (Cache)    │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      第三方服务层                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Resend    │  │   GitHub    │  │   Analytics         │ │
│  │   (Email)   │  │   (OAuth)   │  │   (Plausible)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 架构特点

1. **边缘计算**: 基于 Cloudflare Workers，全球 300+ 节点部署
2. **无服务器**: 无需管理服务器，自动扩缩容
3. **低延迟**: 用户请求就近处理，平均延迟 < 50ms
4. **高可用**: 多区域部署，SLA 99.9%
5. **前后端分离**: React SPA + RESTful API
6. **全栈 TypeScript**: 类型安全，开发效率高

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.2.2 | 类型安全 |
| Vite | 7.3.1 | 构建工具 |
| Tailwind CSS | 3.4.0 | 样式框架 |
| Zustand | 4.4.7 | 状态管理 |
| React Router | 6.21.0 | 路由管理 |
| React Markdown | 9.0.1 | Markdown 渲染 |
| Framer Motion | 12.34.0 | 动画效果 |
| date-fns | 3.0.6 | 日期处理 |
| mammoth | 1.11.0 | Word 文档处理 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Hono | 4.11.9 | Web 框架 |
| bcryptjs | 3.0.3 | 密码哈希 |
| TypeScript | 5.3.3 | 类型安全 |

### 基础设施

| 服务 | 用途 |
|------|------|
| Cloudflare Workers | 边缘计算运行时 |
| Cloudflare D1 | SQLite 数据库 |
| Cloudflare R2 | 对象存储 |
| Cloudflare KV | 键值缓存 |
| Cloudflare Pages | 前端托管 |
| Resend | 邮件服务 |
| GitHub OAuth | 第三方登录 |

---

## 项目结构

### 代码组织

```
personal-blog/
├── backend/                      # 后端服务 (37个TS文件)
│   ├── src/
│   │   ├── index.ts             # 应用入口，Hono实例
│   │   ├── routes/              # API 路由层 (13个文件)
│   │   │   ├── auth.ts          # 认证路由（14个端点）
│   │   │   ├── posts.ts         # 文章路由（14个端点）
│   │   │   ├── columns.ts       # 专栏路由（8个端点）
│   │   │   ├── comments.ts      # 评论路由（6个端点）
│   │   │   ├── categories.ts    # 分类路由（8个端点）
│   │   │   ├── notifications.ts # 通知路由（7个端点）
│   │   │   ├── messages.ts      # 私信路由（8个端点）
│   │   │   ├── users.ts         # 用户路由（5个端点）
│   │   │   ├── admin.ts         # 管理路由（12个端点）
│   │   │   ├── adminNotifications.ts # 系统通知管理（5个端点）
│   │   │   ├── upload.ts        # 上传路由（4个端点）
│   │   │   ├── config.ts        # 配置路由（4个端点）
│   │   │   ├── analytics.ts     # 统计路由（7个端点）
│   │   │   └── users/           # 用户子路由
│   │   │       ├── notificationSettings.ts # 通知设置
│   │   │       └── messageSettings.ts # 私信设置
│   │   ├── middleware/          # 中间件层
│   │   │   ├── auth.ts          # 认证中间件
│   │   │   ├── rateLimit.ts     # 限流中间件
│   │   │   └── requestLogger.ts # 请求日志
│   │   ├── services/            # 业务服务层 (8个服务)
│   │   │   ├── digestService.ts           # 邮件汇总服务
│   │   │   ├── doNotDisturb.ts            # 免打扰服务
│   │   │   ├── emailVerificationService.ts # 邮箱验证服务
│   │   │   ├── mentionService.ts          # @提及服务
│   │   │   ├── messageService.ts          # 私信服务
│   │   │   ├── messageSettingsService.ts  # 私信设置服务
│   │   │   ├── notificationService.ts     # 通知服务
│   │   │   └── notificationSettingsService.ts # 通知设置服务
│   │   ├── utils/               # 工具函数层
│   │   │   ├── cache.ts         # KV缓存工具
│   │   │   ├── jwt.ts           # JWT处理
│   │   │   ├── queryOptimizer.ts # SQL查询优化
│   │   │   ├── resend.ts        # 邮件发送
│   │   │   ├── response.ts      # 响应格式化
│   │   │   ├── softDeleteHelper.ts # 软删除助手
│   │   │   └── validation.ts    # 数据验证
│   │   ├── types/               # TypeScript类型定义
│   │   └── config/              # 配置文件
│   │       └── constants.ts     # 常量定义
│   ├── package.json             # 依赖管理
│   ├── tsconfig.json            # TS配置
│   └── wrangler.toml            # Workers配置
├── frontend/                     # 前端应用 (64个TS/TSX文件)
│   ├── src/
│   │   ├── pages/               # 页面组件 (20个页面)
│   │   │   ├── HomePage.tsx              # 首页
│   │   │   ├── PostPage.tsx              # 文章详情页
│   │   │   ├── LoginPage.tsx             # 登录页
│   │   │   ├── AdminPage.tsx             # 管理后台
│   │   │   ├── SearchPage.tsx            # 搜索页
│   │   │   ├── ProfilePage.tsx           # 个人资料页
│   │   │   ├── ColumnPage.tsx            # 专栏详情页
│   │   │   ├── CategoryPage.tsx          # 分类页
│   │   │   ├── TagPage.tsx               # 标签页
│   │   │   ├── AboutPage.tsx             # 关于页面
│   │   │   ├── ConfigPage.tsx            # 配置页面
│   │   │   ├── NotificationCenter.tsx    # 通知中心
│   │   │   ├── NotificationSettings.tsx  # 通知设置
│   │   │   ├── MessageSettings.tsx       # 私信设置
│   │   │   ├── MessagesPage.tsx          # 私信列表
│   │   │   ├── NewMessagePage.tsx        # 新建私信
│   │   │   ├── ThreadPage.tsx            # 私信会话
│   │   │   ├── ApiTestPage.tsx           # API测试页
│   │   │   ├── NotFoundPage.tsx          # 404页面
│   │   │   └── admin/                    # 管理子页面
│   │   │       └── SystemNotificationPage.tsx # 系统通知管理
│   │   ├── components/          # 可复用组件
│   │   ├── stores/              # Zustand状态管理
│   │   ├── hooks/               # 自定义React Hooks
│   │   ├── utils/               # 工具函数
│   │   └── types/               # TypeScript类型
│   ├── public/                  # 静态资源
│   ├── index.html               # HTML模板
│   ├── package.json             # 依赖管理
│   ├── vite.config.ts           # Vite配置
│   ├── tsconfig.json            # TS配置
│   ├── tailwind.config.js       # Tailwind配置
│   └── postcss.config.js        # PostCSS配置
├── database/                     # 数据库架构
│   ├── schema-v1.1-base.sql     # 基础架构（17张表）
│   └── schema-v1.3-notification-messaging.sql # 通知私信架构（4张表）
├── docs/                         # 项目文档
│   ├── QUICKSTART.md            # 快速开始
│   ├── DEPLOYMENT.md            # 部署指南
│   ├── API.md                   # API文档
│   ├── ARCHITECTURE.md          # 架构文档（本文件）
│   └── changelog/               # 更新日志
├── scripts/                      # 工具脚本
│   ├── init.sh                  # 初始化脚本
│   └── migrate.sh               # 迁移脚本
├── package.json                  # 根项目配置
├── LICENSE                       # MIT协议
└── README.md                     # 项目说明
```

### 分层架构

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  # 前端页面组件
│         (React Components)          │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Application Layer           │  # 状态管理 + 路由
│      (Zustand + React Router)       │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│           API Layer                 │  # RESTful API
│           (Hono Routes)             │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Business Layer              │  # 业务逻辑
│          (Services)                 │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Data Access Layer           │  # 数据访问
│          (D1 + R2 + KV)             │
└─────────────────────────────────────┘
```

---

## 数据模型

### 核心实体关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │    posts    │       │   columns   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──────┤ author_id   │       │ id          │
│ username    │       │ column_id   │──────►│ name        │
│ email       │       │ category_id │────┐  │ slug        │
│ password_hash│      │ title       │    │  │ description │
│ display_name│       │ content     │    │  │ status      │
│ avatar_url  │       │ excerpt     │    │  │ sort_order  │
│ bio         │       │ status      │    │  │ post_count  │
│ role        │       │ visibility  │    │  │ view_count  │
│ status      │       │ password    │    │  │ like_count  │
│ oauth_provider│     │ deleted_at  │    │  └─────────────┘
│ deleted_at  │       └─────────────┘    │
│ created_at  │              │           │
└─────────────┘              │           │
        │                    ▼           │
        │            ┌─────────────┐     │
        │            │ categories  │     │
        │            ├─────────────┤     │
        │            │ id          │◄────┘
        │            │ name        │
        │            │ slug        │
        │            │ description │
        │            └─────────────┘
        │
        ├────────────────┬────────────────┬────────────────┐
        ▼                ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  comments   │  │    likes    │  │  favorites  │  │   reading_  │
├─────────────┤  ├─────────────┤  ├─────────────┤  │   history   │
│ id          │  │ id          │  │ id          │  ├─────────────┤
│ post_id     │  │ user_id     │  │ user_id     │  │ id          │
│ user_id     │  │ post_id     │  │ post_id     │  │ user_id     │
│ parent_id   │  │ created_at  │  │ created_at  │  │ post_id     │
│ content     │  └─────────────┘  └─────────────┘  │ progress    │
│ status      │                                     │ last_read_at│
│ is_author   │                                     │ created_at  │
│ like_count  │                                     └─────────────┘
│ ip_address  │
│ user_agent  │
└─────────────┘

┌─────────────────┐       ┌─────────────┐       ┌────────────────────┐
│ notifications   │       │  messages   │       │notification_       │
├─────────────────┤       ├─────────────┤       │settings            │
│ id              │       │ id          │       ├────────────────────┤
│ user_id         │       │ sender_id   │       │ id                 │
│ type            │       │ recipient_id│       │ user_id            │
│ subtype         │       │ subject     │       │ system_in_app      │
│ title           │       │ content     │       │ system_email       │
│ content         │       │ thread_id   │       │ system_frequency   │
│ related_data    │       │ reply_to_id │       │ interaction_in_app │
│ is_read         │       │ is_read     │       │ interaction_email  │
│ read_at         │       │ read_at     │       │ interaction_comment│
│ deleted_at      │       │ sender_del  │       │ interaction_like   │
│ is_in_app_sent  │       │ recipient_de│       │ interaction_favorite│
│ is_email_sent   │       │ recalled_at │       │ interaction_mention│
│ is_active       │       │ created_at  │       │ interaction_reply  │
│ created_at      │       └─────────────┘       │ dnd_enabled        │
└─────────────────┘                              │ dnd_start/end     │
                                                 │ digest_settings    │
                                                 └────────────────────┘
```

### 数据库表总览

项目包含 **17张核心表**：

#### 用户相关 (3张)
1. **users** - 用户信息（支持OAuth、邮箱验证、软删除）
2. **oauth_tokens** - OAuth令牌存储
3. **notification_settings** - 通知设置（细粒度控制、免打扰）

#### 内容相关 (9张)
4. **posts** - 文章数据（支持专栏、SEO、密码保护、软删除）
5. **posts_fts** - 全文搜索虚拟表（FTS5引擎）
6. **columns** - 专栏数据
7. **categories** - 文章分类
8. **tags** - 文章标签
9. **post_tags** - 文章标签关联表
10. **comments** - 评论数据（嵌套5层、@提及）
11. **likes** - 点赞记录
12. **favorites** - 收藏记录

#### 交互相关 (3张)
13. **reading_history** - 阅读历史（含进度）
14. **notifications** - 通知数据（系统通知 + 互动通知）
15. **email_digest_queue** - 邮件汇总队列

#### 私信相关 (2张)
16. **messages** - 私信数据（会话管理、已读状态）
17. **message_settings** - 私信设置

#### 系统相关
18. **site_config** - 站点配置

### 关键表结构说明

#### posts 表（文章）
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  author_id INTEGER NOT NULL,
  column_id INTEGER,                    -- 专栏ID
  category_id INTEGER,
  status TEXT DEFAULT 'draft',          -- draft/published/archived
  visibility TEXT DEFAULT 'public',     -- public/private/password
  password_hash TEXT,                   -- 文章密码（加密）
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  allow_comments INTEGER DEFAULT 1,
  deleted_at DATETIME,                  -- 软删除标记
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (column_id) REFERENCES columns(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

#### posts_fts 表（全文搜索）
```sql
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title,
  content,
  excerpt,
  content='posts',
  content_rowid='id',
  tokenize='porter unicode61'         -- 支持中英文分词
);
```

#### notifications 表（通知）
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,                  -- system/interaction
  subtype TEXT,                        -- comment/like/favorite/mention/reply等
  title TEXT NOT NULL,
  content TEXT,
  related_data TEXT,                   -- JSON格式的关联数据
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  deleted_at DATETIME,
  is_in_app_sent INTEGER DEFAULT 1,
  is_email_sent INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### messages 表（私信）
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  thread_id TEXT,                      -- 会话ID
  reply_to_id INTEGER,                 -- 回复的消息ID
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  sender_deleted INTEGER DEFAULT 0,    -- 发件人删除标记
  sender_deleted_at DATETIME,
  recipient_deleted INTEGER DEFAULT 0, -- 收件人删除标记
  recipient_deleted_at DATETIME,
  recalled_at DATETIME,                -- 撤回时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);
```

---

## API 设计

### RESTful API 规范

#### 统一响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [ ... ]
  }
}
```

#### 路由结构总览

系统共包含 **13个主要路由模块**，**100+个API端点**：

```
/api
├── /auth (14个端点)         # 认证模块
│   ├── POST /register
│   ├── POST /login
│   ├── POST /logout
│   ├── GET  /me
│   ├── PUT  /me
│   ├── DELETE /me
│   ├── POST /change-password
│   ├── POST /forgot-password
│   ├── POST /reset-password
│   ├── POST /verify-email
│   ├── POST /resend-verification
│   ├── POST /send-code
│   ├── GET  /github
│   └── GET  /github/callback
├── /posts (14个端点)        # 文章模块
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── GET    /by-slug/:slug
│   ├── GET    /search
│   ├── GET    /:id/comments
│   ├── POST   /:id/comments
│   ├── POST   /:id/like
│   ├── DELETE /:id/like
│   ├── POST   /:id/favorite
│   ├── DELETE /:id/favorite
│   └── POST   /:id/verify-password
├── /columns (8个端点)       # 专栏模块
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── GET    /by-slug/:slug
│   ├── GET    /:id/posts
│   └── POST   /:id/refresh-stats
├── /comments (6个端点)      # 评论模块
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── POST   /:id/like
│   └── DELETE /:id/like
├── /categories (8个端点)    # 分类模块
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── GET    /:id/posts
│   ├── GET    /tags
│   ├── POST   /tags
│   └── GET    /tags/:id/posts
├── /notifications (7个端点) # 通知模块
│   ├── GET    /
│   ├── GET    /unread-count
│   ├── GET    /carousel
│   ├── PUT    /:id/read
│   ├── PUT    /read-all
│   ├── DELETE /:id
│   └── DELETE /clear-all
├── /messages (8个端点)      # 私信模块
│   ├── GET    /conversations
│   ├── GET    /conversations/:userId
│   ├── GET    /inbox
│   ├── GET    /sent
│   ├── POST   /
│   ├── PUT    /:id/read
│   ├── DELETE /:id
│   └── POST   /:id/retry
├── /users (7个端点)         # 用户模块
│   ├── GET    /search
│   ├── GET    /:id
│   ├── GET    /:id/posts
│   ├── GET    /:id/favorites
│   ├── GET    /notification-settings
│   ├── PUT    /notification-settings
│   ├── GET    /message-settings
│   └── PUT    /message-settings
├── /admin (12个端点)        # 管理模块
│   ├── GET    /dashboard
│   ├── GET    /stats
│   ├── GET    /users
│   ├── PUT    /users/:id/status
│   ├── PUT    /users/:id/role
│   ├── GET    /posts
│   ├── PUT    /posts/:id/status
│   ├── GET    /comments
│   ├── PUT    /comments/:id/status
│   ├── GET    /notifications
│   ├── GET    /notifications/:id
│   ├── POST   /notifications
├── /admin/notifications (5个端点) # 系统通知管理
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /
│   ├── PUT    /:id
│   └── DELETE /:id
├── /upload (4个端点)        # 上传模块
│   ├── POST   /image
│   ├── POST   /file
│   ├── GET    /:key
│   └── DELETE /:key
├── /config (4个端点)        # 配置模块
│   ├── GET    /
│   ├── PUT    /
│   ├── GET    /admin
│   └── PUT    /batch
└── /analytics (7个端点)     # 统计模块
    ├── GET    /overview
    ├── GET    /posts
    ├── GET    /users
    ├── GET    /traffic
    ├── GET    /popular-posts
    ├── GET    /post/:id
    └── GET    /user/:id
```

### 中间件管道

```
Request
   │
   ├─► requestLogger      # 请求日志记录
   │
   ├─► CORS               # 跨域处理
   │
   ├─► rateLimit          # 请求限流
   │
   ├─► authMiddleware     # 身份认证（可选）
   │
   ├─► validation         # 数据验证
   │
   └─► Route Handler      # 路由处理
          │
          └─► Response
```

---

## 安全设计

### 认证流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────►│   Server    │────►│   D1 DB     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ 1. Login          │                   │
       │──────────────────►│                   │
       │                   │ 2. Verify Credentials
       │                   │──────────────────►│
       │                   │                   │
       │                   │ 3. Generate JWT   │
       │                   │◄──────────────────│
       │                   │                   │
       │ 4. Return Token   │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │ 5. API Request    │                   │
       │   + Bearer Token  │                   │
       │──────────────────►│                   │
       │                   │ 6. Verify JWT     │
       │                   │                   │
       │ 7. Response       │                   │
       │◄──────────────────│                   │
```

### 安全措施

#### 1. 密码安全
- bcrypt 哈希（cost factor: 12）
- 密码强度要求：至少8位，包含大小写字母和数字
- 密码重置通过邮箱验证码

#### 2. JWT 安全
- HS256 签名算法
- Access Token 过期时间: 2小时
- Refresh Token 过期时间: 7天
- Token 存储在 HTTP-only Cookie（生产环境）

#### 3. API 安全
- **请求限流**:
  - 登录/注册: 5次/分钟
  - 发送验证码: 1次/分钟
  - 发表评论: 10次/分钟
  - 上传文件: 5次/分钟
  - 发送私信: 20次/分钟
  - 其他接口: 100次/分钟
- **CORS 配置**: 严格的源验证
- **输入验证**: Zod 数据验证
- **SQL 注入防护**: 参数化查询
- **XSS 防护**: 输出转义

#### 4. 数据安全
- 敏感数据加密存储
- 数据库访问控制
- 软删除机制（用户、文章）
- 定期备份策略

#### 5. 文件上传安全
- **文件类型验证**: 魔数（Magic Number）验证
- **文件大小限制**: 5MB
- **支持格式**: JPEG、PNG、GIF、WebP
- **文件名随机化**: UUID命名
- **路径遍历防护**: 严格路径验证

#### 6. OAuth 安全
- State 参数防CSRF
- Code 使用一次性
- Token 安全存储

---

## 性能优化

### 缓存策略

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Request
       ▼
┌─────────────┐     Cache Hit?
│  CDN Cache  │────► Return cached (Browser Cache)
└──────┬──────┘
       │ Cache Miss
       ▼
┌─────────────┐     Cache Hit?
│   KV Cache  │────► Return cached (Edge)
└──────┬──────┘
       │ Cache Miss
       ▼
┌─────────────┐
│   D1 DB     │────► Query + Cache (Database)
└─────────────┘
```

### 优化策略

#### 1. 数据库优化
- **索引优化**: 
  - 主键索引
  - 外键索引
  - 查询字段索引
  - 复合索引
- **查询优化**:
  - N+1查询优化
  - 分页查询
  - 只查询需要的字段
  - JOIN优化
- **FTS5 全文搜索**:
  - porter分词器
  - unicode61支持
  - 中英文混合搜索

#### 2. 缓存优化
- **多级缓存**:
  - 浏览器缓存（静态资源）
  - CDN缓存（全球分发）
  - KV缓存（热点数据）
- **缓存策略**:
  - 文章列表: 5分钟
  - 文章详情: 15分钟
  - 用户信息: 30分钟
  - 配置数据: 1小时
- **缓存失效**:
  - 主动失效（更新/删除时）
  - 被动失效（TTL过期）

#### 3. 前端优化
- **代码分割**:
  - 路由级别代码分割
  - 组件懒加载
- **资源优化**:
  - 图片懒加载
  - 图片压缩
  - Gzip/Brotli压缩
- **渲染优化**:
  - React.memo
  - useMemo/useCallback
  - 虚拟滚动

#### 4. 网络优化
- **HTTP/2**: 多路复用
- **边缘计算**: Cloudflare Workers全球部署
- **CDN加速**: 静态资源全球分发
- **预加载**: 关键资源预加载

---

## 扩展性设计

### 水平扩展

1. **Workers 自动扩缩容**
   - 无需配置，自动根据流量调整
   - 全球300+节点

2. **D1 读写分离**（未来支持）
   - 主从复制
   - 读写分离

3. **R2 无限存储**
   - 按需扩展
   - 全球复制

### 功能扩展

1. **插件系统**（规划中）
   - Hook机制
   - 事件总线
   - 插件市场

2. **Webhook 支持**（规划中）
   - 文章发布
   - 评论通知
   - 用户注册

3. **API 版本控制**
   - URL版本: `/api/v1`
   - Header版本: `Accept: application/vnd.api+json; version=1`

### 模块化设计

```
Core Modules (核心模块)
├── Auth Module           # 认证授权
├── Content Module        # 内容管理
├── User Module           # 用户管理
├── Notification Module   # 通知系统
└── Analytics Module      # 数据分析

Extension Points (扩展点)
├── Hooks                 # 钩子函数
├── Events                # 事件系统
├── Middleware            # 中间件
└── Plugins               # 插件接口
```

---

## 监控与日志

### 监控指标

1. **性能监控**
   - 请求量（QPM/QPS）
   - 响应时间（P50/P95/P99）
   - 错误率

2. **资源监控**
   - Workers CPU时间
   - D1 查询性能
   - R2 存储使用量
   - KV 缓存命中率

3. **业务监控**
   - 用户活跃度
   - 文章发布量
   - 评论互动率

### 日志系统

```typescript
// 日志级别
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 日志格式
{
  timestamp: '2026-02-16T10:00:00.000Z',
  level: 'info',
  message: 'User logged in',
  context: {
    userId: 123,
    ip: '1.2.3.4',
    userAgent: 'Mozilla/5.0...'
  }
}
```

### 错误追踪

- 错误堆栈记录
- 用户行为回溯
- 性能瓶颈分析

---

## 参考文档

- [Cloudflare Workers 架构](https://developers.cloudflare.com/workers/learning/how-workers-works/)
- [Cloudflare D1 数据库](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 存储](https://developers.cloudflare.com/r2/)
- [Hono 框架文档](https://hono.dev/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)

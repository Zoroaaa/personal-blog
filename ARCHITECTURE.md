# 架构文档

本文档详细介绍个人博客系统的架构设计、技术选型和实现细节。

**版本**: v1.3.2 | **更新日期**: 2026-02-15

---

## 目录

- [系统架构概览](#系统架构概览)
- [技术栈](#技术栈)
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

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 3.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| React Router | 6.x | 路由管理 |
| React Markdown | 9.x | Markdown 渲染 |
| Framer Motion | 12.x | 动画效果 |
| date-fns | 3.x | 日期处理 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Hono | 4.x | Web 框架 |
| Zod | 3.x | 数据验证 |
| bcryptjs | 3.x | 密码哈希 |
| jose | 5.x | JWT 处理 |

### 基础设施

| 服务 | 用途 |
|------|------|
| Cloudflare Workers | 边缘计算运行时 |
| Cloudflare D1 | SQLite 数据库 |
| Cloudflare R2 | 对象存储 |
| Cloudflare KV | 键值缓存 |
| Cloudflare Pages | 前端托管 |
| Resend | 邮件服务 |

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
│ password    │       │ title       │    │  │ description │
│ avatar      │       │ content     │    │  │ status      │
│ role        │       │ status      │    │  │ sort_order  │
│ deleted_at  │       │ visibility  │    │  └─────────────┘
│ created_at  │       │ password    │    │
└─────────────┘       │ deleted_at  │    │
        │             └─────────────┘    │
        │                    │           │
        │                    ▼           │
        │            ┌─────────────┐     │
        │            │ categories  │     │
        │            ├─────────────┤     │
        │            │ id          │◄────┘
        │            │ name        │
        │            │ slug        │
        │            └─────────────┘
        │
        ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  comments   │       │    likes    │       │  favorites  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ post_id     │       │ user_id     │       │ user_id     │
│ user_id     │       │ post_id     │       │ post_id     │
│ parent_id   │       │ created_at  │       │ created_at  │
│ content     │       └─────────────┘       └─────────────┘
│ ip_address  │
│ user_agent  │
│ status      │
└─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│notifications│       │  messages   │       │notification_    │
├─────────────┤       ├─────────────┤       │settings         │
│ id          │       │ id          │       ├─────────────────┤
│ user_id     │       │ sender_id   │       │ id              │
│ type        │       │ receiver_id │       │ user_id         │
│ title       │       │ content     │       │ notify_comments │
│ content     │       │ status      │       │ notify_likes    │
│ data        │       │ created_at  │       │ notify_system   │
│ is_read     │       └─────────────┘       │ dnd_enabled     │
│ is_announce │                             └─────────────────┘
│ created_at  │
└─────────────┘
```

### 数据库表结构

#### 用户表 (users)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  avatar TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'banned')),
  github_id TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT 0,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 文章表 (posts)

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  author_id INTEGER NOT NULL,
  column_id INTEGER,
  category_id INTEGER,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password')),
  password TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (column_id) REFERENCES columns(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

#### 专栏表 (columns)

```sql
CREATE TABLE columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'hidden', 'archived')),
  sort_order INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 评论表 (comments)

```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  is_author BOOLEAN DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);
```

#### 通知表 (notifications)

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('system', 'interaction')),
  subtype TEXT CHECK(subtype IN (
    'maintenance', 'update', 'announcement',
    'comment', 'like', 'favorite', 'mention', 'reply'
  )),
  title TEXT NOT NULL,
  content TEXT,
  related_data TEXT,
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

#### 通知设置表 (notification_settings)

```sql
CREATE TABLE notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  system_in_app INTEGER DEFAULT 1,
  system_email INTEGER DEFAULT 1,
  system_frequency TEXT DEFAULT 'realtime' CHECK(system_frequency IN ('realtime', 'daily', 'weekly', 'off')),
  interaction_in_app INTEGER DEFAULT 1,
  interaction_email INTEGER DEFAULT 1,
  interaction_frequency TEXT DEFAULT 'realtime' CHECK(interaction_frequency IN ('realtime', 'daily', 'weekly', 'off')),
  interaction_comment INTEGER DEFAULT 1,
  interaction_like INTEGER DEFAULT 1,
  interaction_favorite INTEGER DEFAULT 1,
  interaction_mention INTEGER DEFAULT 1,
  interaction_reply INTEGER DEFAULT 1,
  dnd_enabled INTEGER DEFAULT 0,
  dnd_start TEXT DEFAULT '22:00',
  dnd_end TEXT DEFAULT '08:00',
  dnd_timezone TEXT DEFAULT 'Asia/Shanghai',
  digest_daily_time TEXT DEFAULT '08:00',
  digest_weekly_day INTEGER DEFAULT 1,
  digest_weekly_time TEXT DEFAULT '09:00',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 私信表 (messages)

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  thread_id TEXT,
  reply_to_id INTEGER,
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  sender_deleted INTEGER DEFAULT 0,
  sender_deleted_at DATETIME,
  recipient_deleted INTEGER DEFAULT 0,
  recipient_deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);
```

#### 私信设置表 (message_settings)

```sql
CREATE TABLE message_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  email_notification INTEGER DEFAULT 1,
  respect_dnd INTEGER DEFAULT 1,
  allow_strangers INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 邮件汇总队列表 (email_digest_queue)

```sql
CREATE TABLE email_digest_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  notification_id INTEGER NOT NULL,
  digest_type TEXT NOT NULL CHECK(digest_type IN ('daily', 'weekly')),
  scheduled_at DATETIME NOT NULL,
  is_sent INTEGER DEFAULT 0,
  sent_at DATETIME,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  UNIQUE(user_id, notification_id, digest_type)
);
```

#### 全文搜索表 (posts_fts)

```sql
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title,
  content,
  excerpt,
  content='posts',
  content_rowid='id',
  tokenize='porter unicode61'
);
```

---

## API 设计

### RESTful API 规范

#### 响应格式

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

#### 路由结构

```
/api
├── /auth              # 认证相关
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
├── /posts             # 文章管理
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── GET    /:id/comments
│   ├── POST   /:id/comments
│   ├── POST   /:id/like
│   ├── DELETE /:id/like
│   ├── POST   /:id/favorite
│   ├── DELETE /:id/favorite
│   ├── POST   /:id/verify-password
│   ├── GET    /search
│   └── GET    /by-slug/:slug
├── /columns           # 专栏管理
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── POST   /:id/refresh-stats
│   └── GET    /by-slug/:slug
├── /comments          # 评论管理
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── POST   /:id/like
│   └── DELETE /:id/like
├── /categories        # 分类管理
│   ├── GET    /
│   ├── POST   /
│   ├── PUT    /:id
│   └── DELETE /:id
├── /notifications     # 通知管理
│   ├── GET    /
│   ├── PUT    /:id/read
│   ├── PUT    /read-all
│   ├── DELETE /:id
│   └── DELETE /clear-all
├── /messages          # 私信管理
│   ├── GET    /conversations
│   ├── GET    /conversations/:userId
│   ├── POST   /
│   ├── PUT    /:id/read
│   └── DELETE /:id
├── /users             # 用户相关
│   ├── GET    /search
│   ├── GET    /:id
│   ├── GET    /:id/posts
│   ├── GET    /:id/favorites
│   ├── GET    /notification-settings
│   └── PUT    /notification-settings
├── /admin             # 管理后台
│   ├── GET    /dashboard
│   ├── GET    /stats
│   ├── GET    /users
│   ├── PUT    /users/:id/status
│   ├── PUT    /users/:id/role
│   ├── GET    /posts
│   ├── PUT    /posts/:id/status
│   ├── GET    /comments
│   ├── PUT    /comments/:id/status
│   └── POST   /notifications
├── /upload            # 文件上传
│   └── POST   /image
├── /config            # 站点配置
│   ├── GET    /
│   └── PUT    /
└── /analytics         # 数据分析
    ├── GET    /overview
    ├── GET    /posts
    ├── GET    /users
    └── GET    /traffic
```

---

## 安全设计

### 认证机制

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────►│   Server    │────►│   D1 DB     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ 1. Login          │                   │
       │──────────────────►│                   │
       │                   │ 2. Verify         │
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

1. **密码安全**
   - bcrypt 哈希（cost factor: 12）
   - 密码强度要求

2. **JWT 安全**
   - HS256 签名
   - 过期时间: access token 2小时, refresh token 7天

3. **API 安全**
   - 请求限流（Rate Limiting）
   - CORS 配置
   - 输入验证（Zod）
   - SQL 注入防护（参数化查询）
   - XSS 防护（输出转义）

4. **数据安全**
   - 敏感数据加密存储
   - 数据库访问控制
   - 定期备份

5. **文件上传安全**
   - 文件类型验证（魔数验证）
   - 文件大小限制（5MB）
   - 支持格式：JPEG、PNG、GIF、WebP

6. **软删除机制**
   - 用户删除使用软删除
   - 文章删除使用软删除
   - 保留数据完整性

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
│  CDN Cache  │────► Return cached
└──────┬──────┘
       │ Cache Miss
       ▼
┌─────────────┐     Cache Hit?
│   KV Cache  │────► Return cached
└──────┬──────┘
       │ Cache Miss
       ▼
┌─────────────┐
│   D1 DB     │
└─────────────┘
```

### 优化策略

1. **数据库优化**
   - 索引优化
   - 查询优化
   - FTS5 全文搜索

2. **缓存优化**
   - 多级缓存
   - 缓存预热
   - 缓存失效策略

3. **前端优化**
   - 代码分割
   - 懒加载
   - 图片优化

---

## 扩展性设计

### 水平扩展

- Workers 自动扩缩容
- D1 读写分离（未来支持）
- R2 无限存储

### 功能扩展

- 插件系统
- Webhook 支持
- API 版本控制

---

## 监控与日志

### 监控指标

- 请求量/错误率/延迟
- 数据库性能
- 缓存命中率

### 日志记录

- 访问日志
- 错误日志
- 审计日志

---

## 参考文档

- [Cloudflare Workers 架构](https://developers.cloudflare.com/workers/learning/how-workers-works/)
- [D1 数据库](https://developers.cloudflare.com/d1/)
- [Hono 框架](https://hono.dev/)

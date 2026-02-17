# 系统架构文档

本文档详细介绍 Personal Blog 博客系统的技术架构、设计决策和实现细节。

**版本**: v1.4.0  
**更新日期**: 2026-02-17

---

## 目录

- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [前端架构](#前端架构)
- [后端架构](#后端架构)
- [数据库设计](#数据库设计)
- [缓存策略](#缓存策略)
- [安全设计](#安全设计)
- [性能优化](#性能优化)
- [扩展性设计](#扩展性设计)

---

## 架构概览

### 整体架构

Personal Blog 采用现代化的前后端分离架构，基于 Cloudflare 边缘计算平台构建，实现全球低延迟访问。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   桌面浏览器     │  │   移动浏览器     │  │   搜索引擎爬虫   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Cloudflare 边缘层                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Cloudflare CDN (全球300+节点)                     │   │
│  │  - 静态资源缓存                                                       │   │
│  │  - DDoS 防护                                                         │   │
│  │  - SSL 终止                                                          │   │
│  │  - 智能路由                                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                ┌───────────────────┴───────────────────┐                   │
│                ▼                                       ▼                   │
│  ┌───────────────────────────┐         ┌───────────────────────────┐      │
│  │   Cloudflare Pages        │         │   Cloudflare Workers      │      │
│  │   (前端应用)               │         │   (后端 API)              │      │
│  │                           │         │                           │      │
│  │  - React 18 SPA           │         │  - Hono 4.x 框架          │      │
│  │  - Vite 构建              │         │  - TypeScript             │      │
│  │  - Tailwind CSS           │         │  - 边缘计算               │      │
│  │  - Zustand 状态管理        │         │  - JWT 认证               │      │
│  └───────────────────────────┘         └───────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据存储层                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   D1 数据库      │  │   R2 存储       │  │   KV 缓存       │             │
│  │   (SQLite)      │  │   (对象存储)     │  │   (键值存储)    │             │
│  │                 │  │                 │  │                 │             │
│  │  - 用户数据      │  │  - 图片文件     │  │  - 会话缓存     │             │
│  │  - 文章内容      │  │  - 附件文件     │  │  - 热点数据     │             │
│  │  - 评论数据      │  │  - 头像图片     │  │  - 限流计数     │             │
│  │  - 通知私信      │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           第三方服务层                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                                  │
│  │   Resend        │  │   GitHub OAuth  │                                  │
│  │   (邮件服务)     │  │   (第三方登录)   │                                  │
│  └─────────────────┘  └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **边缘优先**: 所有计算在离用户最近的边缘节点执行
2. **无服务器架构**: 无需管理服务器，自动扩缩容
3. **成本优化**: 免费额度足够个人博客使用
4. **安全默认**: 内置 DDoS 防护、SSL 加密
5. **开发体验**: TypeScript 全栈，类型安全

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|---------|
| React | 18.2.0 | UI 框架 | 生态丰富、社区活跃、性能优秀 |
| TypeScript | 5.2.2 | 类型系统 | 类型安全、开发体验好 |
| Vite | 7.3.1 | 构建工具 | 快速冷启动、HMR、优化构建 |
| Tailwind CSS | 3.4.0 | 样式框架 | 原子化 CSS、快速开发 |
| Zustand | 4.4.7 | 状态管理 | 轻量、简单、TypeScript 友好 |
| React Router | 6.21.0 | 路由管理 | 声明式路由、代码分割 |
| React Markdown | 9.0.1 | Markdown 渲染 | 安全、可扩展 |
| Framer Motion | 12.34.0 | 动画效果 | 声明式动画、性能优秀 |
| date-fns | 3.0.6 | 日期处理 | 轻量、模块化 |

### 后端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|---------|
| Hono | 4.11.9 | Web 框架 | 轻量、快速、TypeScript 原生支持 |
| Cloudflare Workers | - | 运行时 | 边缘计算、全球部署、免费额度 |
| Cloudflare D1 | - | 数据库 | SQLite 兼容、边缘部署 |
| Cloudflare R2 | - | 对象存储 | S3 兼容、无出站费用 |
| Cloudflare KV | - | 缓存 | 边缘缓存、低延迟 |
| bcryptjs | 3.0.3 | 密码哈希 | 安全、兼容性好 |
| jose | 5.9.6 | JWT 处理 | 现代化、支持多种算法 |

---

## 前端架构

### 目录结构

```
frontend/src/
├── pages/                    # 页面组件（路由级别）
│   ├── HomePage.tsx          # 首页
│   ├── PostPage.tsx          # 文章详情
│   ├── LoginPage.tsx         # 登录页
│   ├── AdminPage.tsx         # 管理后台
│   ├── SearchPage.tsx        # 搜索页
│   ├── ProfilePage.tsx       # 个人中心
│   ├── ReadingHistoryPage.tsx # 阅读历史
│   ├── AccountSettingsPage.tsx # 账号设置
│   ├── ColumnPage.tsx        # 专栏详情
│   ├── CategoryPage.tsx      # 分类页
│   ├── TagPage.tsx           # 标签页
│   ├── AboutPage.tsx         # 关于页面
│   ├── ConfigPage.tsx        # 配置页面
│   ├── NotificationCenter.tsx # 通知中心
│   ├── NotificationSettings.tsx # 通知设置
│   ├── MessageSettings.tsx   # 私信设置
│   ├── MessagesPage.tsx      # 私信列表
│   ├── NewMessagePage.tsx    # 发起新私信
│   ├── ThreadPage.tsx        # 私信会话
│   ├── ApiTestPage.tsx       # API测试页
│   ├── NotFoundPage.tsx      # 404页面
│   └── admin/                # 管理页面
│       └── SystemNotificationPage.tsx
├── components/               # 可复用组件
│   ├── Layout.tsx            # 布局组件
│   ├── Navbar.tsx            # 导航栏
│   ├── Footer.tsx            # 页脚
│   ├── PostCard.tsx          # 文章卡片
│   ├── CommentSection.tsx    # 评论组件
│   ├── Sidebar.tsx           # 侧边栏
│   ├── HotPostsWidget.tsx    # 热门文章组件（v1.4.0新增）
│   ├── PostNavigation.tsx    # 上下篇导航（v1.4.0新增）
│   ├── RecommendedPosts.tsx  # 推荐文章（v1.4.0新增）
│   └── ...
├── stores/                   # Zustand 状态管理
│   ├── authStore.ts          # 认证状态
│   ├── themeStore.ts         # 主题状态（v1.4.0增强）
│   └── notificationStore.ts  # 通知状态
├── hooks/                    # 自定义 Hooks
│   ├── useAuth.ts            # 认证 Hook
│   ├── useTheme.ts           # 主题 Hook
│   └── ...
├── utils/                    # 工具函数
│   ├── api.ts                # API 请求封装
│   ├── helpers.ts            # 通用工具
│   └── constants.ts          # 常量定义
├── types/                    # TypeScript 类型定义
│   ├── index.ts              # 类型导出
│   └── ...
├── App.tsx                   # 应用入口
└── main.tsx                  # 渲染入口
```

### 状态管理

使用 Zustand 进行状态管理，主要包含以下 Store：

#### authStore（认证状态）

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

#### themeStore（主题状态）- v1.4.0 增强

```typescript
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;      // v1.4.0新增：自定义主色调
  fontSize: 'small' | 'medium' | 'large';  // v1.4.0新增：字体大小
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}
```

### 路由设计

```typescript
const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/posts/:slug', element: <PostPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/*', element: <AdminPage />, protected: true },
  { path: '/search', element: <SearchPage /> },
  { path: '/profile', element: <ProfilePage />, protected: true },
  { path: '/reading-history', element: <ReadingHistoryPage />, protected: true },
  { path: '/account-settings', element: <AccountSettingsPage />, protected: true },
  { path: '/columns/:slug', element: <ColumnPage /> },
  { path: '/categories/:slug', element: <CategoryPage /> },
  { path: '/tags/:slug', element: <TagPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/notifications', element: <NotificationCenter />, protected: true },
  { path: '/messages', element: <MessagesPage />, protected: true },
  { path: '/messages/:threadId', element: <ThreadPage />, protected: true },
  { path: '*', element: <NotFoundPage /> },
];
```

### 组件设计原则

1. **单一职责**: 每个组件只负责一件事
2. **组合优于继承**: 使用组合模式构建复杂组件
3. **受控组件**: 表单组件使用受控模式
4. **性能优化**: 使用 memo、useMemo、useCallback 优化渲染

---

## 后端架构

### 目录结构

```
backend/src/
├── index.ts                  # 应用入口
├── routes/                   # API 路由
│   ├── auth.ts               # 认证路由
│   ├── posts.ts              # 文章路由
│   ├── columns.ts            # 专栏路由
│   ├── comments.ts           # 评论路由
│   ├── admin.ts              # 管理路由
│   ├── categories.ts         # 分类路由
│   ├── config.ts             # 配置路由
│   ├── upload.ts             # 上传路由
│   ├── analytics.ts          # 统计路由
│   ├── notifications.ts      # 通知路由
│   ├── adminNotifications.ts # 管理员通知路由
│   ├── messages.ts           # 私信路由
│   ├── users.ts              # 用户路由
│   └── users/                # 用户子路由
│       ├── notificationSettings.ts
│       └── messageSettings.ts
├── middleware/               # 中间件
│   ├── auth.ts               # 认证中间件
│   ├── rateLimit.ts          # 限流中间件
│   └── requestLogger.ts      # 请求日志
├── services/                 # 业务服务层
│   ├── digestService.ts      # 邮件汇总服务
│   ├── doNotDisturb.ts       # 免打扰服务
│   ├── emailVerificationService.ts
│   ├── mentionService.ts     # @提及服务
│   ├── messageService.ts     # 私信服务
│   ├── messageSettingsService.ts
│   ├── notificationService.ts
│   ├── notificationSettingsService.ts
│   └── postService.ts        # 文章服务
├── utils/                    # 工具函数
│   ├── cache.ts              # 缓存工具
│   ├── jwt.ts                # JWT 工具
│   ├── queryOptimizer.ts     # 查询优化
│   ├── resend.ts             # 邮件发送
│   ├── response.ts           # 响应格式化
│   ├── softDeleteHelper.ts   # 软删除助手
│   └── validation.ts         # 数据验证
├── types/                    # 类型定义
│   └── index.ts
└── config/                   # 配置文件
    └── index.ts
```

### API 路由设计

#### RESTful API 规范

```
GET    /api/posts           # 获取文章列表
GET    /api/posts/:id       # 获取单篇文章
POST   /api/posts           # 创建文章
PUT    /api/posts/:id       # 更新文章
DELETE /api/posts/:id       # 删除文章

GET    /api/posts/hot       # 获取热门文章（v1.4.0新增）
GET    /api/posts/:id/related # 获取相关文章（v1.4.0新增）
GET    /api/posts/:id/neighbors # 获取上下篇（v1.4.0新增）
```

### 中间件架构

```typescript
// 请求处理流程
app.use('*', cors())           // CORS 处理
app.use('*', logger())         // 日志记录
app.use('*', rateLimit())      // 限流
app.use('/api/*', auth())      // 认证（需要认证的路由）
app.route('/api', routes)      // 业务路由
app.notFound(notFoundHandler)  // 404 处理
app.onError(errorHandler)      // 错误处理
```

### 服务层设计

服务层封装业务逻辑，提供可复用的业务方法：

```typescript
// postService.ts
export class PostService {
  // 获取热门文章（v1.4.0新增）
  static async getHotPosts(limit: number): Promise<Post[]>
  
  // 获取相关推荐文章（v1.4.0新增）
  static async getRelatedPosts(postId: number, limit: number): Promise<Post[]>
  
  // 获取上下篇文章（v1.4.0新增）
  static async getNeighbors(postId: number): Promise<{ prev: Post | null, next: Post | null }>
  
  // 文章置顶（v1.4.0新增）
  static async togglePin(postId: number, isPinned: boolean): Promise<void>
}
```

---

## 数据库设计

### 表结构概览

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| users | 用户表 | id, email, password, role, is_deleted |
| posts | 文章表 | id, title, content, is_pinned, view_count |
| columns | 专栏表 | id, name, description, post_count |
| categories | 分类表 | id, name, slug |
| tags | 标签表 | id, name, slug |
| comments | 评论表 | id, post_id, user_id, content, parent_id |
| post_likes | 点赞表 | id, post_id, user_id |
| post_favorites | 收藏表 | id, post_id, user_id |
| reading_history | 阅读历史 | id, user_id, post_id, read_at |
| notifications | 通知表 | id, user_id, type, content, is_read |
| messages | 私信表 | id, thread_id, sender_id, content, is_recalled |
| message_threads | 会话表 | id, participant_ids, last_message_at |
| notification_settings | 通知设置 | id, user_id, settings |
| message_settings | 私信设置 | id, user_id, allow_strangers |
| system_notifications | 系统通知 | id, title, content, is_active |
| config | 系统配置 | id, key, value |

### 核心表设计

#### posts 表（文章表）

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
  status TEXT DEFAULT 'draft',
  is_pinned INTEGER DEFAULT 0,        -- v1.4.0新增：置顶标记
  is_password_protected INTEGER DEFAULT 0,
  password_hash TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (column_id) REFERENCES columns(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 索引
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned);  -- v1.4.0新增
CREATE INDEX idx_posts_view_count ON posts(view_count DESC);  -- 热门文章
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
```

#### users 表（用户表）

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  username TEXT,
  avatar TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user',
  is_email_verified INTEGER DEFAULT 0,
  github_id TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
```

### 数据库迁移历史

| 版本 | 迁移文件 | 变更内容 |
|------|---------|---------|
| v1.1 | schema-v1.1-base.sql | 基础表结构 |
| v1.3 | schema-v1.3-notification-messaging.sql | 通知和私信系统 |
| v1.4 | migration-v1.4-message-recall.sql | 消息撤回功能 |
| v1.9 | migration-v1.9-post-pinning.sql | 文章置顶功能 |

---

## 缓存策略

### KV 缓存使用

```typescript
// 缓存策略
const CACHE_TTL = {
  posts: 300,           // 文章列表：5分钟
  post: 3600,           // 单篇文章：1小时
  hotPosts: 600,        // 热门文章：10分钟（v1.4.0新增）
  categories: 3600,     // 分类：1小时
  tags: 3600,           // 标签：1小时
  config: 86400,        // 配置：24小时
};

// 缓存键命名规范
const CACHE_KEYS = {
  posts: 'posts:list',
  post: (id: number) => `post:${id}`,
  hotPosts: 'posts:hot',
  relatedPosts: (id: number) => `post:${id}:related`,
  categories: 'categories:all',
  tags: 'tags:all',
};
```

### 缓存失效策略

- **写时失效**: 数据更新时主动清除相关缓存
- **定时刷新**: 热点数据定时刷新
- **LRU 淘汰**: KV 自动淘汰最少使用的数据

---

## 安全设计

### 认证机制

```
┌─────────────────────────────────────────────────────────────┐
│                      认证流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 用户登录                                                │
│     │                                                       │
│     ▼                                                       │
│  2. 验证邮箱/密码 或 GitHub OAuth                           │
│     │                                                       │
│     ▼                                                       │
│  3. 生成 JWT Token（有效期7天）                             │
│     │                                                       │
│     ▼                                                       │
│  4. 返回 Token 给客户端                                     │
│     │                                                       │
│     ▼                                                       │
│  5. 客户端存储 Token（localStorage）                        │
│     │                                                       │
│     ▼                                                       │
│  6. 后续请求携带 Token（Authorization: Bearer xxx）         │
│     │                                                       │
│     ▼                                                       │
│  7. 服务端验证 Token 有效性                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 安全措施

| 安全措施 | 实现方式 |
|---------|---------|
| 密码存储 | bcrypt 哈希（10轮） |
| JWT 签名 | HS256 算法，密钥长度 ≥ 32 字符 |
| CORS | 白名单机制，仅允许指定域名 |
| 限流 | KV 计数，IP 维度限流 |
| 文件上传 | 魔数验证，限制文件类型和大小 |
| SQL 注入 | 参数化查询 |
| XSS | React 自动转义 + DOMPurify |
| CSRF | SameSite Cookie + Token 验证 |

### 文件上传安全

```typescript
// 文件类型验证（魔数）
const ALLOWED_TYPES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

// 文件大小限制
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

---

## 性能优化

### 前端优化

1. **代码分割**: 路由级别懒加载
2. **资源优化**: 图片懒加载、WebP 格式
3. **缓存策略**: Service Worker 缓存静态资源
4. **渲染优化**: 虚拟列表、防抖节流

### 后端优化

1. **查询优化**: 索引优化、避免 N+1 查询
2. **缓存策略**: KV 缓存热点数据
3. **响应压缩**: Brotli/Gzip 压缩
4. **边缘计算**: Workers 在边缘节点执行

### 数据库优化

```sql
-- 关键索引
CREATE INDEX idx_posts_status_published ON posts(status, published_at DESC);
CREATE INDEX idx_posts_view_count ON posts(view_count DESC);  -- 热门文章
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned DESC, published_at DESC);  -- 置顶文章
CREATE INDEX idx_reading_history_user ON reading_history(user_id, read_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

## 扩展性设计

### 插件化设计

系统采用模块化设计，便于扩展：

```typescript
// 路由模块化
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import commentRoutes from './routes/comments';

app.route('/api/auth', authRoutes);
app.route('/api/posts', postRoutes);
app.route('/api/comments', commentRoutes);
```

### 配置驱动

系统配置存储在数据库中，支持动态修改：

```typescript
interface SystemConfig {
  siteName: string;
  siteDescription: string;
  postsPerPage: number;
  enableComments: boolean;
  enableRegistration: boolean;
  // ...
}
```

### 未来扩展方向

1. **多语言支持**: i18n 国际化
2. **插件系统**: 支持第三方插件
3. **API 开放**: 开放 API 供第三方调用
4. **数据分析**: 更详细的数据分析功能
5. **AI 功能**: AI 辅助写作、智能推荐

---

**版本**: v1.4.0 | **更新日期**: 2026-02-17

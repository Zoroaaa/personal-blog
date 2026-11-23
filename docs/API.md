# API 文档

本文档详细介绍 Personal Blog 博客系统的所有 API 接口。

**版本**: v1.4.0  
**更新日期**: 2026-02-17  
**基础路径**: `/api`

---

## 目录

- [通用说明](#通用说明)
- [认证接口](#认证接口)
- [文章接口](#文章接口)
- [专栏接口](#专栏接口)
- [评论接口](#评论接口)
- [分类接口](#分类接口)
- [标签接口](#标签接口)
- [用户接口](#用户接口)
- [通知接口](#通知接口)
- [私信接口](#私信接口)
- [管理接口](#管理接口)
- [配置接口](#配置接口)
- [上传接口](#上传接口)
- [统计接口](#统计接口)

---

## 通用说明

### 请求格式

- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

### 响应格式

所有接口统一返回以下格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

### 认证说明

需要认证的接口需在请求头中携带 Token：

```
Authorization: Bearer <your_jwt_token>
```

### 分页参数

```typescript
interface PaginationParams {
  page?: number;      // 页码，默认 1
  limit?: number;     // 每页数量，默认 10
  sort?: string;      // 排序字段
  order?: 'asc' | 'desc';  // 排序方向
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 错误码

| 错误码 | 说明 |
|--------|------|
| `UNAUTHORIZED` | 未授权，请先登录 |
| `FORBIDDEN` | 无权限访问 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `DUPLICATE_ENTRY` | 数据重复 |
| `RATE_LIMITED` | 请求过于频繁 |
| `INTERNAL_ERROR` | 服务器内部错误 |

---

## 认证接口

### 用户注册

```
POST /api/auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "username"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录

```
POST /api/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "username",
      "avatar": "https://...",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GitHub OAuth 登录

```
GET /api/auth/github
```

重定向到 GitHub 授权页面。

### GitHub OAuth 回调

```
GET /api/auth/github/callback?code=xxx
```

**响应**: 重定向到前端并携带 Token

### 发送邮箱验证码

```
POST /api/auth/send-verification-code
```

**请求体**:
```json
{
  "email": "user@example.com",
  "type": "register" | "reset_password"
}
```

### 重置密码

```
POST /api/auth/reset-password
```

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### 获取当前用户

```
GET /api/auth/me
```

**需要认证**: 是

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "avatar": "https://...",
    "bio": "个人简介",
    "role": "user",
    "isEmailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 修改密码

```
PUT /api/auth/password
```

**需要认证**: 是

**请求体**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 文章接口

### 获取文章列表

```
GET /api/posts
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| category | string | 分类 slug |
| column | string | 专栏 slug |
| tag | string | 标签 slug |
| status | string | 状态 (published/draft)，管理员可用 |
| search | string | 搜索关键词 |

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "文章标题",
        "slug": "article-slug",
        "excerpt": "文章摘要",
        "coverImage": "https://...",
        "author": {
          "id": 1,
          "username": "作者名",
          "avatar": "https://..."
        },
        "category": {
          "id": 1,
          "name": "分类名",
          "slug": "category-slug"
        },
        "column": {
          "id": 1,
          "name": "专栏名"
        },
        "tags": [
          { "id": 1, "name": "标签名", "slug": "tag-slug" }
        ],
        "isPinned": false,
        "isPasswordProtected": false,
        "viewCount": 100,
        "likeCount": 10,
        "commentCount": 5,
        "publishedAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 获取单篇文章

```
GET /api/posts/:slug
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "slug": "article-slug",
    "content": "Markdown 内容",
    "excerpt": "文章摘要",
    "coverImage": "https://...",
    "author": {
      "id": 1,
      "username": "作者名",
      "avatar": "https://...",
      "bio": "作者简介"
    },
    "category": {
      "id": 1,
      "name": "分类名",
      "slug": "category-slug"
    },
    "column": {
      "id": 1,
      "name": "专栏名",
      "description": "专栏描述"
    },
    "tags": [
      { "id": 1, "name": "标签名", "slug": "tag-slug" }
    ],
    "isPinned": false,
    "isPasswordProtected": false,
    "viewCount": 100,
    "likeCount": 10,
    "commentCount": 5,
    "seoTitle": "SEO 标题",
    "seoDescription": "SEO 描述",
    "seoKeywords": "关键词1,关键词2",
    "publishedAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

### 创建文章

```
POST /api/posts
```

**需要认证**: 是 (管理员)

**请求体**:
```json
{
  "title": "文章标题",
  "slug": "article-slug",
  "content": "Markdown 内容",
  "excerpt": "文章摘要",
  "coverImage": "https://...",
  "categoryId": 1,
  "columnId": 1,
  "tagIds": [1, 2, 3],
  "status": "published",
  "isPinned": false,
  "isPasswordProtected": false,
  "password": "可选密码",
  "seoTitle": "SEO 标题",
  "seoDescription": "SEO 描述",
  "seoKeywords": "关键词1,关键词2"
}
```

### 更新文章

```
PUT /api/posts/:id
```

**需要认证**: 是 (管理员)

**请求体**: 同创建文章

### 删除文章

```
DELETE /api/posts/:id
```

**需要认证**: 是 (管理员)

### 验证文章密码

```
POST /api/posts/:id/verify-password
```

**请求体**:
```json
{
  "password": "文章密码"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "content": "文章内容"
  }
}
```

### 获取热门文章 🆕 v1.4.0

```
GET /api/posts/hot
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| limit | number | 返回数量，默认 10 |

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "文章标题",
      "slug": "article-slug",
      "viewCount": 1000,
      "likeCount": 50,
      "coverImage": "https://..."
    }
  ]
}
```

### 获取相关推荐文章 🆕 v1.4.0

```
GET /api/posts/:id/related
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| limit | number | 返回数量，默认 5 |

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "title": "相关文章标题",
      "slug": "related-slug",
      "excerpt": "文章摘要",
      "coverImage": "https://...",
      "viewCount": 100,
      "publishedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 获取上下篇文章 🆕 v1.4.0

```
GET /api/posts/:id/neighbors
```

**响应**:
```json
{
  "success": true,
  "data": {
    "prev": {
      "id": 1,
      "title": "上一篇文章",
      "slug": "prev-slug"
    },
    "next": {
      "id": 3,
      "title": "下一篇文章",
      "slug": "next-slug"
    }
  }
}
```

### 切换文章置顶状态 🆕 v1.4.0

```
PUT /api/posts/:id/pin
```

**需要认证**: 是 (管理员)

**请求体**:
```json
{
  "isPinned": true
}
```

### 文章点赞

```
POST /api/posts/:id/like
```

**需要认证**: 是

**响应**:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 11
  }
}
```

### 取消点赞

```
DELETE /api/posts/:id/like
```

**需要认证**: 是

### 收藏文章

```
POST /api/posts/:id/favorite
```

**需要认证**: 是

### 取消收藏

```
DELETE /api/posts/:id/favorite
```

**需要认证**: 是

### 检查点赞/收藏状态

```
GET /api/posts/:id/status
```

**需要认证**: 是

**响应**:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "favorited": false
  }
}
```

### 记录阅读历史

```
POST /api/posts/:id/history
```

**需要认证**: 是

### 获取阅读历史

```
GET /api/posts/history
```

**需要认证**: 是

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

### 搜索文章

```
GET /api/posts/search
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |
| page | number | 页码 |
| limit | number | 每页数量 |

---

## 专栏接口

### 获取专栏列表

```
GET /api/columns
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "专栏名称",
      "slug": "column-slug",
      "description": "专栏描述",
      "coverImage": "https://...",
      "postCount": 10,
      "viewCount": 1000,
      "likeCount": 50,
      "status": "active"
    }
  ]
}
```

### 获取专栏详情

```
GET /api/columns/:slug
```

### 获取专栏文章

```
GET /api/columns/:slug/posts
```

### 创建专栏

```
POST /api/columns
```

**需要认证**: 是 (管理员)

### 更新专栏

```
PUT /api/columns/:id
```

**需要认证**: 是 (管理员)

### 删除专栏

```
DELETE /api/columns/:id
```

**需要认证**: 是 (管理员)

### 刷新专栏统计

```
POST /api/columns/:id/refresh-stats
```

**需要认证**: 是 (管理员)

---

## 评论接口

### 获取文章评论

```
GET /api/comments/post/:postId
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "评论内容",
      "user": {
        "id": 1,
        "username": "用户名",
        "avatar": "https://..."
      },
      "isAdmin": false,
      "likeCount": 5,
      "replies": [
        {
          "id": 2,
          "content": "回复内容",
          "user": { "id": 2, "username": "回复者" },
          "replyTo": { "id": 1, "username": "被回复者" },
          "likeCount": 2
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 创建评论

```
POST /api/comments
```

**需要认证**: 是

**请求体**:
```json
{
  "postId": 1,
  "content": "评论内容",
  "parentId": null,
  "replyToUserId": null
}
```

### 删除评论

```
DELETE /api/comments/:id
```

**需要认证**: 是

### 评论点赞

```
POST /api/comments/:id/like
```

**需要认证**: 是

---

## 分类接口

### 获取分类列表

```
GET /api/categories
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "分类名称",
      "slug": "category-slug",
      "description": "分类描述",
      "postCount": 10
    }
  ]
}
}
```

### 创建分类

```
POST /api/categories
```

**需要认证**: 是 (管理员)

### 更新分类

```
PUT /api/categories/:id
```

**需要认证**: 是 (管理员)

### 删除分类

```
DELETE /api/categories/:id
```

**需要认证**: 是 (管理员)

---

## 标签接口

### 获取标签列表

```
GET /api/tags
```

### 创建标签

```
POST /api/tags
```

**需要认证**: 是 (管理员)

### 更新标签

```
PUT /api/tags/:id
```

**需要认证**: 是 (管理员)

### 删除标签

```
DELETE /api/tags/:id
```

**需要认证**: 是 (管理员)

---

## 用户接口

### 获取用户公开资料

```
GET /api/users/:id/profile
```

### 更新用户资料

```
PUT /api/users/profile
```

**需要认证**: 是

**请求体**:
```json
{
  "username": "新用户名",
  "avatar": "https://...",
  "bio": "个人简介"
}
```

### 获取用户文章

```
GET /api/users/:id/posts
```

### 获取用户收藏

```
GET /api/users/favorites
```

**需要认证**: 是

### 获取用户点赞

```
GET /api/users/likes
```

**需要认证**: 是

### 获取用户评论

```
GET /api/users/comments
```

**需要认证**: 是

### 搜索用户

```
GET /api/users/search
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |

### 删除账号

```
DELETE /api/auth/account
```

**需要认证**: 是

**请求体**:
| 参数 | 类型 | 说明 |
|------|------|------|
| password | string | 账号密码（密码账号必填） |
| confirmation | string | 必须为 `DELETE` |
| emailVerificationCode | string | 6 位邮箱验证码（启用邮件服务时必填） |

---

## 通知接口

### 获取通知列表

```
GET /api/notifications
```

**需要认证**: 是

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 通知类型 |
| isRead | boolean | 是否已读 |
| page | number | 页码 |
| limit | number | 每页数量 |

### 获取未读通知数量

```
GET /api/notifications/unread-count
```

**需要认证**: 是

### 标记通知已读

```
PUT /api/notifications/:id/read
```

**需要认证**: 是

### 标记全部已读

```
PUT /api/notifications/read-all
```

**需要认证**: 是

### 获取通知设置

```
GET /api/users/notification-settings
```

**需要认证**: 是

### 更新通知设置

```
PUT /api/users/notification-settings
```

**需要认证**: 是

**请求体**:
```json
{
  "commentNotification": true,
  "likeNotification": true,
  "followNotification": true,
  "systemNotification": true,
  "doNotDisturb": false,
  "doNotDisturbStart": "22:00",
  "doNotDisturbEnd": "08:00",
  "digestFrequency": "daily"
}
```

---

## 私信接口

### 获取会话列表

```
GET /api/messages/threads
```

**需要认证**: 是

### 获取会话消息

```
GET /api/messages/threads/:threadId
```

**需要认证**: 是

### 发送私信

```
POST /api/messages
```

**需要认证**: 是

**请求体**:
```json
{
  "recipientId": 2,
  "content": "消息内容"
}
```

### 标记消息已读

```
PUT /api/messages/:id/read
```

**需要认证**: 是

### 撤回消息

```
DELETE /api/messages/:id
```

**需要认证**: 是

### 获取私信设置

```
GET /api/users/message-settings
```

**需要认证**: 是

### 更新私信设置

```
PUT /api/users/message-settings
```

**需要认证**: 是

**请求体**:
```json
{
  "allowStrangers": false
}
```

---

## 管理接口

### 获取仪表盘统计

```
GET /api/admin/dashboard
```

**需要认证**: 是 (管理员)

**响应**:
```json
{
  "success": true,
  "data": {
    "totalPosts": 100,
    "totalUsers": 50,
    "totalComments": 200,
    "totalViews": 10000,
    "recentPosts": [...],
    "recentComments": [...]
  }
}
```

### 用户管理

```
GET /api/admin/users
PUT /api/admin/users/:id/status
PUT /api/admin/users/:id/role
DELETE /api/admin/users/:id
```

**需要认证**: 是 (管理员)

### 评论审核

```
GET /api/admin/comments
PUT /api/admin/comments/:id/status
DELETE /api/admin/comments/:id
```

**需要认证**: 是 (管理员)

### 系统配置

```
GET /api/admin/config
PUT /api/admin/config
```

**需要认证**: 是 (管理员)

### 发布系统通知

```
POST /api/admin/notifications
```

**需要认证**: 是 (管理员)

**请求体**:
```json
{
  "title": "通知标题",
  "content": "通知内容",
  "type": "info",
  "isActive": true,
  "showOnHome": true
}
```

---

## 配置接口

### 获取公开配置

```
GET /api/config/public
```

**响应**:
```json
{
  "success": true,
  "data": {
    "siteName": "博客名称",
    "siteDescription": "博客描述",
    "siteKeywords": "关键词",
    "footerText": "页脚文字",
    "socialLinks": {
      "github": "https://github.com/...",
      "twitter": "https://twitter.com/..."
    }
  }
}
```

---

## 上传接口

### 上传图片

```
POST /api/upload
```

**需要认证**: 是

**请求**: `multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | 图片文件 |

**响应**:
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "filename": "image.png"
  }
}
```

---

## 统计接口

### 获取统计数据

```
GET /api/analytics
```

**需要认证**: 是 (管理员)

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| range | string | 时间范围 (7d/30d/90d) |

**响应**:
```json
{
  "success": true,
  "data": {
    "views": {
      "total": 10000,
      "trend": [...]
    },
    "visitors": {
      "total": 5000,
      "trend": [...]
    },
    "popularPosts": [...]
  }
}
```

---

## 类型定义

### User

```typescript
interface User {
  id: number;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Post

```typescript
interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  author: User;
  category?: Category;
  column?: Column;
  tags: Tag[];
  isPinned: boolean;
  isPasswordProtected: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Comment

```typescript
interface Comment {
  id: number;
  content: string;
  user: User;
  postId: number;
  parentId?: number;
  replyToUser?: User;
  isAdmin: boolean;
  likeCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  replies?: Comment[];
}
```

### Notification

```typescript
interface Notification {
  id: number;
  type: 'system' | 'comment' | 'like' | 'follow' | 'mention';
  title: string;
  content: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}
```

---

**版本**: v1.4.0 | **更新日期**: 2026-02-17

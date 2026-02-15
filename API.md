# API 文档

本文档详细描述个人博客系统的所有 API 接口。

**版本**: v1.3.2 | **更新日期**: 2026-02-15

---

## 目录

- [通用规范](#通用规范)
- [认证模块](#认证模块)
- [文章模块](#文章模块)
- [专栏模块](#专栏模块)
- [评论模块](#评论模块)
- [分类模块](#分类模块)
- [通知模块](#通知模块)
- [私信模块](#私信模块)
- [用户模块](#用户模块)
- [管理模块](#管理模块)
- [上传模块](#上传模块)
- [配置模块](#配置模块)
- [统计模块](#统计模块)

---

## 通用规范

### 基础 URL

```
开发环境: http://localhost:8787/api
生产环境: https://your-worker.workers.dev/api
```

### 请求格式

```http
Content-Type: application/json
Authorization: Bearer <token>
```

### 响应格式

**成功响应:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**错误响应:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": []
  }
}
```

### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 验证错误 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

---

## 认证模块

### POST /auth/register

用户注册

**请求参数:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2026-02-14T10:00:00Z"
  }
}
```

### POST /auth/login

用户登录

**请求参数:**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "john",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

### POST /auth/logout

用户登出（需要认证）

### GET /auth/me

获取当前用户信息（需要认证）

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "avatar": "https://...",
    "bio": "个人简介",
    "role": "user",
    "emailVerified": true,
    "createdAt": "2026-02-14T10:00:00Z"
  }
}
```

### PUT /auth/me

更新用户信息（需要认证）

**请求参数:**
```json
{
  "username": "string",
  "email": "string",
  "avatar": "string",
  "bio": "string"
}
```

### DELETE /auth/me

删除用户账号（需要认证，软删除）

### POST /auth/change-password

修改密码（需要认证）

**请求参数:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### POST /auth/forgot-password

忘记密码

**请求参数:**
```json
{
  "email": "string"
}
```

### POST /auth/reset-password

重置密码

**请求参数:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

### POST /auth/verify-email

验证邮箱

**请求参数:**
```json
{
  "code": "string"
}
```

### POST /auth/resend-verification

重新发送验证邮件

### POST /auth/send-code

发送邮箱验证码

**请求参数:**
```json
{
  "email": "string"
}
```

### GET /auth/github

GitHub OAuth 登录

### GET /auth/github/callback

GitHub OAuth 回调

---

## 文章模块

### GET /posts

获取文章列表

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| limit | number | 每页数量，默认 20 |
| category | string | 分类 slug |
| tag | string | 标签 slug |
| column | number | 专栏 ID |
| status | string | 状态: draft/published/archived |
| search | string | 搜索关键词 |
| sort | string | 排序: newest/oldest/popular |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "文章标题",
      "slug": "article-slug",
      "excerpt": "文章摘要...",
      "coverImage": "https://...",
      "author": {
        "id": 1,
        "username": "john",
        "avatar": "https://..."
      },
      "category": {
        "id": 1,
        "name": "技术"
      },
      "column": {
        "id": 1,
        "name": "专栏名称"
      },
      "tags": [{"id": 1, "name": "React"}],
      "viewCount": 100,
      "likeCount": 20,
      "commentCount": 5,
      "createdAt": "2026-02-14T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### POST /posts

创建文章（需要认证）

**请求参数:**
```json
{
  "title": "string",
  "content": "string",
  "excerpt": "string",
  "coverImage": "string",
  "categoryId": 1,
  "columnId": 1,
  "tags": ["tag1", "tag2"],
  "status": "draft",
  "visibility": "public",
  "password": "string"
}
```

### GET /posts/:id

获取文章详情

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "slug": "article-slug",
    "content": "文章内容...",
    "excerpt": "文章摘要...",
    "coverImage": "https://...",
    "author": {
      "id": 1,
      "username": "john",
      "avatar": "https://..."
    },
    "category": {
      "id": 1,
      "name": "技术"
    },
    "column": {
      "id": 1,
      "name": "专栏名称"
    },
    "tags": [{"id": 1, "name": "React"}],
    "viewCount": 100,
    "likeCount": 20,
    "commentCount": 5,
    "isLiked": false,
    "isFavorited": false,
    "visibility": "public",
    "createdAt": "2026-02-14T10:00:00Z",
    "updatedAt": "2026-02-14T10:00:00Z"
  }
}
```

### PUT /posts/:id

更新文章（需要认证，作者或管理员）

### DELETE /posts/:id

删除文章（需要认证，作者或管理员，软删除）

### GET /posts/by-slug/:slug

通过 slug 获取文章

### GET /posts/:id/comments

获取文章评论

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

### POST /posts/:id/comments

发表评论（需要认证）

**请求参数:**
```json
{
  "content": "string",
  "parentId": null
}
```

### POST /posts/:id/like

点赞文章（需要认证）

### DELETE /posts/:id/like

取消点赞（需要认证）

### POST /posts/:id/favorite

收藏文章（需要认证）

### DELETE /posts/:id/favorite

取消收藏（需要认证）

### POST /posts/:id/verify-password

验证文章密码

**请求参数:**
```json
{
  "password": "string"
}
```

### GET /posts/search

搜索文章（FTS5全文搜索）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词（必填） |
| page | number | 页码 |
| limit | number | 每页数量 |

---

## 专栏模块

### GET /columns

获取专栏列表

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| status | string | 状态: active/hidden/archived |
| sort | string | 排序: newest/oldest/popular |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "专栏名称",
      "slug": "column-slug",
      "description": "专栏描述...",
      "coverImage": "https://...",
      "status": "active",
      "sortOrder": 1,
      "postCount": 10,
      "viewCount": 1000,
      "likeCount": 50,
      "createdAt": "2026-02-14T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10
  }
}
```

### POST /columns

创建专栏（需要管理员权限）

**请求参数:**
```json
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "coverImage": "string",
  "status": "active",
  "sortOrder": 1
}
```

### GET /columns/:id

获取专栏详情

### PUT /columns/:id

更新专栏（需要管理员权限）

### DELETE /columns/:id

删除专栏（需要管理员权限）

### POST /columns/:id/refresh-stats

刷新专栏统计（需要管理员权限）

### GET /columns/by-slug/:slug

通过 slug 获取专栏

---

## 评论模块

### GET /comments

获取评论列表（需要管理员权限）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| status | string | 状态: pending/approved/rejected |
| postId | number | 文章 ID |

### POST /comments

发表评论（需要认证）

**请求参数:**
```json
{
  "postId": 1,
  "content": "string",
  "parentId": null
}
```

### PUT /comments/:id

更新评论（需要认证，作者或管理员）

### DELETE /comments/:id

删除评论（需要认证，作者或管理员）

### POST /comments/:id/like

点赞评论（需要认证）

### DELETE /comments/:id/like

取消点赞（需要认证）

---

## 分类模块

### GET /categories

获取分类列表

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "技术",
      "slug": "tech",
      "description": "技术文章",
      "postCount": 50,
      "createdAt": "2026-02-14T10:00:00Z"
    }
  ]
}
```

### POST /categories

创建分类（需要管理员权限）

**请求参数:**
```json
{
  "name": "string",
  "slug": "string",
  "description": "string"
}
```

### PUT /categories/:id

更新分类（需要管理员权限）

### DELETE /categories/:id

删除分类（需要管理员权限）

---

## 通知模块

### GET /notifications

获取通知列表（需要认证）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| isRead | boolean | 是否已读 |
| type | string | 类型: system/interaction |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "interaction",
      "title": "新评论",
      "content": "用户 @john 评论了你的文章",
      "data": {
        "postId": 1,
        "commentId": 5
      },
      "isRead": false,
      "isAnnouncement": false,
      "createdAt": "2026-02-14T10:00:00Z"
    }
  ],
  "meta": {
    "unreadCount": 5
  }
}
```

### PUT /notifications/:id/read

标记通知已读（需要认证）

### PUT /notifications/read-all

标记所有通知已读（需要认证）

### DELETE /notifications/:id

删除通知（需要认证）

### DELETE /notifications/clear-all

清空所有通知（需要认证）

---

## 私信模块

### GET /messages/conversations

获取会话列表（需要认证）

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "user": {
        "id": 2,
        "username": "jane",
        "avatar": "https://..."
      },
      "lastMessage": {
        "content": "你好！",
        "createdAt": "2026-02-14T10:00:00Z"
      },
      "unreadCount": 2
    }
  ]
}
```

### GET /messages/conversations/:userId

获取与某用户的聊天记录（需要认证）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "senderId": 2,
      "receiverId": 1,
      "content": "你好！",
      "status": "read",
      "createdAt": "2026-02-14T10:00:00Z"
    }
  ]
}
```

### POST /messages

发送私信（需要认证）

**请求参数:**
```json
{
  "receiverId": 2,
  "content": "string"
}
```

### PUT /messages/:id/read

标记消息已读（需要认证）

### DELETE /messages/:id

删除消息（需要认证）

---

## 用户模块

### GET /users/search

搜索用户

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |
| limit | number | 返回数量 |

### GET /users/:id

获取用户公开信息

### GET /users/:id/posts

获取用户的文章

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

### GET /users/:id/favorites

获取用户的收藏

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

### GET /users/notification-settings

获取通知设置（需要认证）

### PUT /users/notification-settings

更新通知设置（需要认证）

**请求参数:**
```json
{
  "notifyComments": true,
  "notifyLikes": true,
  "notifyFavorites": true,
  "notifySystem": true,
  "dndEnabled": false
}
```

---

## 管理模块

### GET /admin/dashboard

获取仪表盘数据（需要管理员权限）

**响应:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 100,
      "totalPosts": 500,
      "totalComments": 2000,
      "todayViews": 1000
    },
    "recentPosts": [...],
    "recentComments": [...],
    "recentUsers": [...]
  }
}
```

### GET /admin/stats

获取统计数据（需要管理员权限）

### GET /admin/users

获取用户列表（需要管理员权限）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| role | string | 角色: admin/user |
| status | string | 状态: active/banned |

### PUT /admin/users/:id/status

更新用户状态（需要管理员权限）

**请求参数:**
```json
{
  "status": "active"
}
```

### PUT /admin/users/:id/role

更新用户角色（需要管理员权限）

**请求参数:**
```json
{
  "role": "admin"
}
```

### GET /admin/posts

获取文章列表（需要管理员权限）

### PUT /admin/posts/:id/status

更新文章状态（需要管理员权限）

**请求参数:**
```json
{
  "status": "published"
}
```

### GET /admin/comments

获取评论列表（需要管理员权限）

### PUT /admin/comments/:id/status

更新评论状态（需要管理员权限）

**请求参数:**
```json
{
  "status": "approved"
}
```

### POST /admin/notifications

发送系统通知（需要管理员权限）

**请求参数:**
```json
{
  "title": "string",
  "content": "string",
  "isAnnouncement": false
}
```

---

## 上传模块

### POST /upload/image

上传图片（需要认证）

**请求:**
```http
Content-Type: multipart/form-data

file: <binary>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "filename": "image.jpg",
    "size": 1024
  }
}
```

**限制:**
- 文件大小: 最大 5MB
- 支持格式: JPEG, PNG, GIF, WebP
- 安全验证: 魔数验证

---

## 配置模块

### GET /config

获取站点配置

**响应:**
```json
{
  "success": true,
  "data": {
    "siteName": "我的博客",
    "siteDescription": "个人技术博客",
    "siteLogo": "https://...",
    "favicon": "https://...",
    "icp": "",
    "footer": "...",
    "socialLinks": {
      "github": "https://github.com/...",
      "twitter": "https://twitter.com/..."
    }
  }
}
```

### PUT /config

更新站点配置（需要管理员权限）

**请求参数:**
```json
{
  "siteName": "string",
  "siteDescription": "string",
  "siteLogo": "string",
  "favicon": "string",
  "icp": "string",
  "footer": "string",
  "socialLinks": {
    "github": "string",
    "twitter": "string"
  }
}
```

---

## 统计模块

### GET /analytics/overview

获取概览统计（需要管理员权限）

**响应:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 100,
    "totalPosts": 500,
    "totalComments": 2000,
    "totalViews": 10000,
    "todayUsers": 10,
    "todayPosts": 2,
    "todayComments": 20,
    "todayViews": 1000
  }
}
```

### GET /analytics/posts

获取文章统计（需要管理员权限）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### GET /analytics/users

获取用户统计（需要管理员权限）

### GET /analytics/traffic

获取流量统计（需要管理员权限）

---

## 健康检查

### GET /health

检查服务健康状态

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.3.2",
    "timestamp": "2026-02-15T10:00:00.000Z",
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    }
  }
}
```

---

## 错误代码

| 代码 | 说明 |
|------|------|
| `UNAUTHORIZED` | 未认证 |
| `FORBIDDEN` | 无权限 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 验证错误 |
| `DUPLICATE_ENTRY` | 重复数据 |
| `RATE_LIMITED` | 请求过于频繁 |
| `INTERNAL_ERROR` | 服务器内部错误 |
| `INVALID_PASSWORD` | 密码错误 |
| `ACCOUNT_DELETED` | 账号已删除 |
| `EMAIL_NOT_VERIFIED` | 邮箱未验证 |

---

## 限流规则

| 接口 | 限制 |
|------|------|
| 登录/注册 | 5次/分钟 |
| 发送验证码 | 1次/分钟 |
| 发表评论 | 10次/分钟 |
| 上传文件 | 5次/分钟 |
| 其他接口 | 100次/分钟 |

---

## 相关文档

- [架构文档](./ARCHITECTURE.md)
- [部署指南](./DEPLOYMENT.md)

# API 文档

本文档详细描述个人博客系统的所有 API 接口。

**版本**: v3.0.1 | **基础 URL**: `https://api.example.com/api` | **更新日期**: 2026-02-09

## 目录

- [通用规范](#通用规范)
- [认证模块](#认证模块)
- [文章模块](#文章模块)
- [评论模块](#评论模块)
- [分类模块](#分类模块)
- [管理模块](#管理模块)
- [配置模块](#配置模块)
- [上传模块](#上传模块)
- [统计模块](#统计模块)
- [健康检查](#健康检查)

## 通用规范

### 请求格式

- 基础 URL: `/api`
- 请求方法: GET, POST, PUT, DELETE
- 请求头:
  ```
  Content-Type: application/json
  Authorization: Bearer <token> (需要认证的接口)
  ```

### 响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 分页参数

列表接口支持分页：

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| page | number | 页码 | 1 |
| limit | number | 每页数量 | 10 |

分页响应：
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

## 认证模块

### 用户注册

**POST** `/auth/register`

请求体：
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "用户名"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "用户名",
      "role": "user",
      "avatar": null,
      "bio": null,
      "created_at": "2026-02-09T10:00:00.000Z"
    }
  },
  "message": "注册成功"
}
```

### 用户登录

**POST** `/auth/login`

请求体：
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "用户名",
      "role": "user",
      "avatar": null
    }
  }
}
```

### GitHub OAuth 登录

**GET** `/auth/github`

重定向到 GitHub 授权页面。

**GET** `/auth/github/callback?code=xxx`

回调地址，返回：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {...}
  }
}
```

### 获取当前用户

**GET** `/auth/me`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "用户名",
    "role": "user",
    "avatar": "https://...",
    "bio": "个人简介",
    "github_id": null,
    "email_verified": false,
    "created_at": "2026-02-09T10:00:00.000Z",
    "updated_at": "2026-02-09T10:00:00.000Z"
  }
}
```

### 更新用户信息

**PUT** `/auth/profile`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "nickname": "新昵称",
  "bio": "新简介",
  "avatar": "https://..."
}
```

### 修改密码

**PUT** `/auth/password`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "currentPassword": "旧密码",
  "newPassword": "新密码"
}
```

### 登出

**POST** `/auth/logout`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 文章模块

### 获取文章列表

**GET** `/posts`

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| category | string | 分类别名 |
| tag | string | 标签别名 |
| search | string | 搜索关键词 |
| status | string | 状态：published/draft |

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "文章标题",
        "slug": "article-slug",
        "summary": "文章摘要",
        "cover_image": "https://...",
        "category_id": 1,
        "category_name": "分类名",
        "author_id": 1,
        "author_name": "作者名",
        "view_count": 100,
        "like_count": 10,
        "comment_count": 5,
        "is_pinned": false,
        "published_at": "2026-02-09T10:00:00.000Z",
        "created_at": "2026-02-09T10:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 获取文章详情

**GET** `/posts/:slug`

响应：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "slug": "article-slug",
    "content": "文章内容（Markdown）",
    "summary": "文章摘要",
    "cover_image": "https://...",
    "category_id": 1,
    "category_name": "分类名",
    "tags": ["标签1", "标签2"],
    "author_id": 1,
    "author_name": "作者名",
    "author_avatar": "https://...",
    "view_count": 100,
    "like_count": 10,
    "comment_count": 5,
    "is_pinned": false,
    "published_at": "2026-02-09T10:00:00.000Z",
    "created_at": "2026-02-09T10:00:00.000Z",
    "updated_at": "2026-02-09T10:00:00.000Z",
    "is_liked": false,
    "is_favorited": false,
    "reading_progress": 0
  }
}
```

### 创建文章

**POST** `/posts`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "title": "文章标题",
  "content": "文章内容（Markdown）",
  "summary": "文章摘要",
  "cover_image": "https://...",
  "category_id": 1,
  "tags": ["标签1", "标签2"],
  "is_pinned": false,
  "status": "published"
}
```

### 更新文章

**PUT** `/posts/:id`

请求头：`Authorization: Bearer <token>`

请求体：同创建文章

### 删除文章

**DELETE** `/posts/:id`

请求头：`Authorization: Bearer <token>`

### 点赞文章

**POST** `/posts/:id/like`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "data": {
    "liked": true,
    "like_count": 11
  }
}
```

### 取消点赞

**DELETE** `/posts/:id/like`

请求头：`Authorization: Bearer <token>`

### 收藏文章

**POST** `/posts/:id/favorite`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "data": {
    "favorited": true
  }
}
```

### 取消收藏

**DELETE** `/posts/:id/favorite`

请求头：`Authorization: Bearer <token>`

### 更新阅读进度

**POST** `/posts/:id/reading-progress`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "progress": 50
}
```

### 获取阅读历史

**GET** `/posts/reading-history`

请求头：`Authorization: Bearer <token>`

### 获取收藏列表

**GET** `/posts/favorites`

请求头：`Authorization: Bearer <token>`

---

## 评论模块

### 获取评论列表

**GET** `/comments`

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| post_id | number | 文章 ID |
| page | number | 页码 |
| limit | number | 每页数量 |

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "content": "评论内容",
        "author_id": 1,
        "author_name": "评论者",
        "author_avatar": "https://...",
        "post_id": 1,
        "parent_id": null,
        "like_count": 5,
        "is_pinned": false,
        "created_at": "2026-02-09T10:00:00.000Z",
        "replies": [...]
      }
    ],
    "pagination": {...}
  }
}
```

### 发表评论

**POST** `/comments`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "post_id": 1,
  "content": "评论内容",
  "parent_id": null
}
```

**注意**: 嵌套评论最多支持 5 层。

### 删除评论

**DELETE** `/comments/:id`

请求头：`Authorization: Bearer <token>`

### 点赞评论

**POST** `/comments/:id/like`

请求头：`Authorization: Bearer <token>`

### 取消点赞评论

**DELETE** `/comments/:id/like`

请求头：`Authorization: Bearer <token>`

---

## 分类模块

### 获取所有分类

**GET** `/categories`

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "技术",
      "slug": "tech",
      "description": "技术文章",
      "post_count": 10,
      "sort_order": 1,
      "created_at": "2026-02-09T10:00:00.000Z"
    }
  ]
}
```

### 获取分类详情

**GET** `/categories/:slug`

### 创建分类

**POST** `/categories`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "name": "分类名",
  "slug": "category-slug",
  "description": "分类描述",
  "sort_order": 1
}
```

### 更新分类

**PUT** `/categories/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 删除分类

**DELETE** `/categories/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 获取所有标签

**GET** `/tags`

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "React",
      "slug": "react",
      "post_count": 5
    }
  ]
}
```

### 创建标签

**POST** `/tags`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 更新标签

**PUT** `/tags/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 删除标签

**DELETE** `/tags/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

---

## 管理模块

### 获取用户列表

**GET** `/admin/users`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| search | string | 搜索关键词 |
| role | string | 角色筛选 |
| status | string | 状态筛选 |

### 更新用户状态

**PUT** `/admin/users/:id/status`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "status": "active"
}
```

### 更新用户角色

**PUT** `/admin/users/:id/role`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "role": "admin"
}
```

### 获取待审核评论

**GET** `/admin/comments/pending`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 审核评论

**PUT** `/admin/comments/:id/approve`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 拒绝评论

**PUT** `/admin/comments/:id/reject`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 获取系统统计

**GET** `/admin/stats`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

响应：
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 100,
      "new_today": 5
    },
    "posts": {
      "total": 50,
      "published": 45,
      "draft": 5
    },
    "comments": {
      "total": 200,
      "pending": 10
    },
    "views": {
      "total": 10000,
      "today": 500
    }
  }
}
```

---

## 配置模块

### 获取站点配置

**GET** `/config`

响应：
```json
{
  "success": true,
  "data": {
    "site_name": "我的博客",
    "site_description": "个人技术博客",
    "site_logo": "https://...",
    "site_favicon": "https://...",
    "posts_per_page": 10,
    "enable_comment": true,
    "enable_github_oauth": true,
    "enable_email_verify": false,
    "icp": "",
    "custom_css": "",
    "custom_js": "",
    "seo_title": "",
    "seo_description": "",
    "seo_keywords": "",
    "social_github": "",
    "social_twitter": "",
    "social_weibo": ""
  }
}
```

### 更新站点配置

**PUT** `/config`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "site_name": "新名称",
  "site_description": "新描述"
}
```

---

## 上传模块

### 上传图片

**POST** `/upload/image`

请求头：`Authorization: Bearer <token>`

请求体：multipart/form-data

```
file: <图片文件>
```

限制：
- 最大文件大小：5MB
- 支持格式：jpg, jpeg, png, gif, webp

响应：
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "thumbnail": "https://...",
    "filename": "image.jpg",
    "size": 1024
  }
}
```

---

## 统计模块

### 获取系统统计

**GET** `/analytics/stats`

响应：
```json
{
  "success": true,
  "data": {
    "posts": 50,
    "users": 100,
    "comments": 200,
    "views": 10000
  }
}
```

### 获取热门文章

**GET** `/analytics/hot-posts`

查询参数：

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| limit | number | 返回数量 | 5 |
| days | number | 统计天数 | 7 |

### 获取用户统计

**GET** `/analytics/users`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "data": {
    "total_posts": 10,
    "total_comments": 50,
    "total_likes": 100,
    "total_views": 1000
  }
}
```

### 记录页面访问

**POST** `/analytics/page-view`

请求体：
```json
{
  "path": "/posts/article-slug",
  "referrer": "https://google.com"
}
```

---

## 健康检查

### 基础健康检查

**GET** `/health`

响应：
```json
{
  "status": "ok",
  "version": "3.0.1",
  "timestamp": "2026-02-09T10:00:00.000Z"
}
```

### 数据库健康检查

**GET** `/health/db`

响应：
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-02-09T10:00:00.000Z"
}
```

---

## 错误代码

| 代码 | 说明 |
|------|------|
| `UNAUTHORIZED` | 未授权，需要登录 |
| `FORBIDDEN` | 禁止访问，权限不足 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `EMAIL_EXISTS` | 邮箱已存在 |
| `INVALID_CREDENTIALS` | 用户名或密码错误 |
| `RATE_LIMITED` | 请求过于频繁 |
| `INTERNAL_ERROR` | 服务器内部错误 |

---

## 限流规则

| 接口 | 限制 |
|------|------|
| 登录/注册 | 5次/分钟 |
| 发表评论 | 10次/分钟 |
| 点赞 | 30次/分钟 |
| 其他接口 | 100次/分钟 |

---

**注意**: 所有时间戳均采用 ISO 8601 格式（UTC）。

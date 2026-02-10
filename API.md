# API 文档

本文档详细描述个人博客系统的所有 API 接口。

**版本**: v1.2.0 | **基础 URL**: `/api` | **更新日期**: 2026-02-10

---

## 目录

- [通用规范](#通用规范)
- [认证模块](#认证模块)
- [文章模块](#文章模块)
- [评论模块](#评论模块)
- [分类模块](#分类模块)
- [专栏模块](#专栏模块)
- [管理模块](#管理模块)
- [配置模块](#配置模块)
- [上传模块](#上传模块)
- [统计模块](#统计模块)
- [健康检查](#健康检查)

---

## 通用规范

### 请求格式

- 基础 URL: `/api`
- 请求方法: GET, POST, PUT, DELETE, PATCH
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
  "message": "操作成功",
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "错误描述",
  "timestamp": "2026-02-10T10:00:00.000Z"
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
| 409 | 资源冲突 |
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
  "username": "用户名",
  "email": "user@example.com",
  "password": "password123",
  "displayName": "显示名称",
  "emailVerificationCode": "123456"
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
      "username": "用户名",
      "email": "user@example.com",
      "displayName": "显示名称",
      "role": "user",
      "avatarUrl": null,
      "bio": null,
      "createdAt": "2026-02-10T10:00:00.000Z"
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
  "username": "用户名",
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
      "username": "用户名",
      "email": "user@example.com",
      "displayName": "显示名称",
      "role": "user",
      "avatarUrl": null
    }
  }
}
```

### GitHub OAuth 登录

**POST** `/auth/github`

请求体：
```json
{
  "code": "github_oauth_code"
}
```

响应：
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
    "username": "用户名",
    "email": "user@example.com",
    "displayName": "显示名称",
    "role": "user",
    "avatarUrl": "https://...",
    "bio": "个人简介",
    "oauthProvider": null,
    "status": "active",
    "postCount": 10,
    "commentCount": 50,
    "createdAt": "2026-02-10T10:00:00.000Z",
    "updatedAt": "2026-02-10T10:00:00.000Z",
    "lastLoginAt": "2026-02-10T10:00:00.000Z"
  }
}
```

### 更新用户信息

**PUT** `/auth/profile`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "displayName": "新昵称",
  "bio": "新简介",
  "avatarUrl": "https://..."
}
```

### 修改密码

**PUT** `/auth/password`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "currentPassword": "旧密码",
  "newPassword": "新密码",
  "emailVerificationCode": "123456"
}
```

### 重置密码

**POST** `/auth/reset-password`

请求体：
```json
{
  "email": "user@example.com",
  "verificationCode": "123456",
  "newPassword": "newpassword123"
}
```

### 发送验证码

**POST** `/auth/send-verification-code`

请求体：
```json
{
  "email": "user@example.com",
  "type": "register"
}
```

类型可选值：`register`, `password`, `forgot_password`, `delete`

### 删除账号

**POST** `/auth/delete`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "password": "当前密码",
  "confirmation": "DELETE",
  "emailVerificationCode": "123456"
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
| category | string | 分类slug |
| tag | string | 标签slug |
| author | string | 作者用户名 |
| search | string | 搜索关键词 |
| sortBy | string | 排序字段：published_at, view_count, like_count, comment_count |
| order | string | 排序方向：asc, desc |

响应：
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "文章标题",
        "slug": "article-slug",
        "summary": "文章摘要",
        "coverImage": "https://...",
        "categoryName": "分类名",
        "categorySlug": "category-slug",
        "categoryColor": "#3B82F6",
        "authorName": "作者名",
        "authorDisplayName": "作者显示名",
        "authorAvatar": "https://...",
        "viewCount": 100,
        "likeCount": 10,
        "commentCount": 5,
        "readingTime": 5,
        "publishedAt": "2026-02-10T10:00:00.000Z",
        "tags": [{"id": 1, "name": "标签1", "slug": "tag1"}]
      }
    ],
    "pagination": {...}
  }
}
```

### 搜索文章

**GET** `/posts/search`

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词（支持FTS5语法） |
| category | string | 分类slug |
| tag | string | 标签slug |
| page | number | 页码 |
| limit | number | 每页数量 |
| sort | string | 排序方式：published_at, view_count, like_count, comment_count, relevance |
| order | string | 排序方向：asc, desc |
| use_fts | boolean | 是否使用FTS5全文搜索（默认true） |

FTS5搜索语法：
- 普通关键词: `React`
- AND搜索: `React AND TypeScript`
- OR搜索: `React OR Vue`
- 短语搜索: `"完整短语"`
- 前缀搜索: `React*`
- 排除搜索: `React -Vue`

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
    "coverImage": "https://...",
    "categoryId": 1,
    "categoryName": "分类名",
    "categorySlug": "category-slug",
    "categoryColor": "#3B82F6",
    "columnId": 1,
    "tags": [{"id": 1, "name": "标签1", "slug": "tag1"}],
    "authorId": 1,
    "authorUsername": "author",
    "authorName": "作者名",
    "authorAvatar": "https://...",
    "authorBio": "作者简介",
    "viewCount": 100,
    "likeCount": 10,
    "commentCount": 5,
    "readingTime": 5,
    "status": "published",
    "visibility": "public",
    "metaTitle": "SEO标题",
    "metaDescription": "SEO描述",
    "metaKeywords": "关键词1,关键词2",
    "publishedAt": "2026-02-10T10:00:00.000Z",
    "createdAt": "2026-02-10T10:00:00.000Z",
    "updatedAt": "2026-02-10T10:00:00.000Z",
    "isLiked": false,
    "isFavorited": false
  }
}
```

### 获取管理员文章列表

**GET** `/posts/admin`

请求头：`Authorization: Bearer <token>`

返回所有文章（不限状态），用于管理后台。

### 通过ID获取文章（用于编辑）

**GET** `/posts/admin/:id`

请求头：`Authorization: Bearer <token>`

用于编辑时获取文章详情（包括非公开文章）。

### 创建文章

**POST** `/posts`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "title": "文章标题",
  "content": "文章内容（Markdown）",
  "summary": "文章摘要",
  "coverImage": "https://...",
  "categoryId": 1,
  "columnId": 1,
  "tags": [1, 2, 3],
  "status": "published",
  "visibility": "public",
  "password": "",
  "metaTitle": "SEO标题",
  "metaDescription": "SEO描述",
  "metaKeywords": "关键词"
}
```

状态可选值：`draft`, `published`, `archived`
可见性可选值：`public`, `private`, `password`

### 更新文章

**PUT** `/posts/:id`

请求头：`Authorization: Bearer <token>`

请求体：同创建文章（所有字段可选）

### 删除文章

**DELETE** `/posts/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

响应：
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "imagesDeleted": 5
  }
}
```

### 点赞文章

**POST** `/posts/:id/like`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 11
  }
}
```

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

### 记录阅读进度

**POST** `/posts/:id/reading-progress`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "readDurationSeconds": 120,
  "readPercentage": 50
}
```

### 获取阅读历史

**GET** `/posts/reading-history`

请求头：`Authorization: Bearer <token>`

响应包含阅读时长和阅读百分比。

### 获取收藏列表

**GET** `/posts/favorites`

请求头：`Authorization: Bearer <token>`

### 获取点赞文章列表

**GET** `/posts/likes`

请求头：`Authorization: Bearer <token>`

---

## 评论模块

### 获取评论列表

**GET** `/comments`

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| postId | number | 文章ID |
| page | number | 页码 |
| limit | number | 每页数量 |
| status | string | 状态筛选：pending, approved, rejected |

响应：
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "content": "评论内容",
        "userId": 1,
        "username": "评论者",
        "displayName": "评论者显示名",
        "avatarUrl": "https://...",
        "postId": 1,
        "parentId": null,
        "likeCount": 5,
        "replyCount": 2,
        "status": "approved",
        "createdAt": "2026-02-10T10:00:00.000Z",
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
  "postId": 1,
  "content": "评论内容",
  "parentId": null
}
```

**注意**: 嵌套评论最多支持 5 层。

### 删除评论

**DELETE** `/comments/:id`

请求头：`Authorization: Bearer <token>`

### 点赞评论

**POST** `/comments/:id/like`

请求头：`Authorization: Bearer <token>`

---

## 分类模块

### 获取所有分类

**GET** `/categories`

响应：
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "技术",
        "slug": "tech",
        "description": "技术文章",
        "icon": "💻",
        "color": "#3B82F6",
        "postCount": 10,
        "displayOrder": 1,
        "createdAt": "2026-02-10T10:00:00.000Z",
        "updatedAt": "2026-02-10T10:00:00.000Z"
      }
    ]
  }
}
```

### 创建分类

**POST** `/categories`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "name": "分类名",
  "slug": "category-slug",
  "description": "分类描述",
  "icon": "💻",
  "color": "#3B82F6",
  "displayOrder": 1
}
```

### 更新分类

**PUT** `/categories/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 删除分类

**DELETE** `/categories/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 获取所有标签

**GET** `/categories/tags`

响应：
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "React",
        "slug": "react",
        "description": "React相关",
        "color": "#3B82F6",
        "postCount": 5,
        "createdAt": "2026-02-10T10:00:00.000Z",
        "updatedAt": "2026-02-10T10:00:00.000Z"
      }
    ]
  }
}
```

### 创建标签

**POST** `/categories/tags`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 更新标签

**PUT** `/categories/tags/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 删除标签

**DELETE** `/categories/tags/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

---

## 专栏模块

### 获取专栏列表

**GET** `/columns`

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| author | string | 作者用户名 |
| sortBy | string | 排序字段：created_at, post_count, total_view_count |
| order | string | 排序方向：asc, desc |

响应：
```json
{
  "success": true,
  "data": {
    "columns": [
      {
        "id": 1,
        "name": "专栏名称",
        "slug": "column-slug",
        "description": "专栏描述",
        "coverImage": "https://...",
        "authorId": 1,
        "authorUsername": "author",
        "authorName": "作者名",
        "authorAvatar": "https://...",
        "postCount": 10,
        "totalViewCount": 1000,
        "totalLikeCount": 100,
        "totalFavoriteCount": 50,
        "totalCommentCount": 200,
        "displayOrder": 1,
        "status": "active",
        "createdAt": "2026-02-10T10:00:00.000Z",
        "updatedAt": "2026-02-10T10:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 获取专栏详情

**GET** `/columns/:slug`

### 获取专栏下的文章列表

**GET** `/columns/:slug/posts`

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| sortBy | string | 排序字段：published_at, view_count, like_count |
| order | string | 排序方向：asc, desc |

### 创建专栏

**POST** `/columns`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "name": "专栏名称",
  "slug": "column-slug",
  "description": "专栏描述",
  "coverImage": "https://...",
  "displayOrder": 1
}
```

### 更新专栏

**PUT** `/columns/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "name": "新名称",
  "description": "新描述",
  "coverImage": "https://...",
  "displayOrder": 1,
  "status": "active"
}
```

状态可选值：`active`, `hidden`, `archived`

### 删除专栏

**DELETE** `/columns/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

**注意**: 专栏下存在已发布文章时禁止删除。

### 刷新专栏统计

**POST** `/columns/:id/refresh-stats`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

手动同步专栏统计数据。

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
| role | string | 角色筛选：admin, user, moderator |

### 更新用户角色

**PUT** `/admin/users/:id/role`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "role": "admin"
}
```

### 删除用户

**DELETE** `/admin/users/:id`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 获取评论管理列表

**GET** `/admin/comments`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| status | string | 状态筛选：pending, approved, rejected, spam |

### 更新评论状态

**PUT** `/admin/comments/:id/status`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "status": "approved"
}
```

### 获取系统设置

**GET** `/admin/settings`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

### 更新系统设置

**PUT** `/admin/settings`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

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
    "site_subtitle": "分享技术与生活",
    "site_logo": "https://...",
    "site_favicon": "https://...",
    "site_description": "个人技术博客",
    "site_keywords": "blog,技术,编程",
    "site_author": "Admin",
    "theme_primary_color": "#3B82F6",
    "theme_default_mode": "system",
    "feature_comments": true,
    "feature_search": true,
    "feature_like": true,
    "feature_share": true,
    "posts_per_page": 10,
    "max_upload_size_mb": 5
  }
}
```

### 获取存储配置

**GET** `/config/storage`

响应：
```json
{
  "success": true,
  "data": {
    "storagePublicUrl": "https://..."
  }
}
```

### 更新配置项

**PUT** `/config/:key`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "value": "新值"
}
```

### 批量更新配置

**PUT** `/config`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

请求体：
```json
{
  "configs": {
    "site_name": "新名称",
    "site_description": "新描述"
  }
}
```

### 获取所有配置（管理员）

**GET** `/config/admin`

请求头：`Authorization: Bearer <token>`（需要管理员权限）

返回包含配置元数据的完整配置列表。

---

## 上传模块

### 上传图片

**POST** `/upload`

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
    "filename": "image.jpg",
    "size": 1024,
    "type": "image/jpeg"
  }
}
```

### 删除文件

**DELETE** `/upload/:filename`

请求头：`Authorization: Bearer <token>`

---

## 统计模块

### 获取系统统计

**GET** `/analytics`

响应：
```json
{
  "success": true,
  "data": {
    "totalPosts": 50,
    "totalUsers": 100,
    "totalComments": 200,
    "totalViews": 10000,
    "recentPosts": [...],
    "recentComments": [...],
    "viewTrend": [
      {"date": "2026-02-01", "views": 100},
      {"date": "2026-02-02", "views": 150}
    ]
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

---

## 健康检查

### 基础健康检查

**GET** `/health`

响应：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.2.0",
    "timestamp": "2026-02-10T10:00:00.000Z",
    "environment": "production",
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    },
    "config": {
      "jwt_secret": true,
      "github_oauth": true,
      "frontend_url": true,
      "storage_url": true
    }
  }
}
```

### API健康检查

**GET** `/api/health`

简化版健康检查端点。

### 根路径信息

**GET** `/`

返回API基本信息和功能列表。

---

## 错误代码

| 代码 | 说明 |
|------|------|
| `UNAUTHORIZED` | 未授权，需要登录 |
| `FORBIDDEN` | 禁止访问，权限不足 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `EMAIL_EXISTS` | 邮箱已存在 |
| `USERNAME_EXISTS` | 用户名已存在 |
| `INVALID_CREDENTIALS` | 用户名或密码错误 |
| `RATE_LIMITED` | 请求过于频繁 |
| `INTERNAL_ERROR` | 服务器内部错误 |

---

## 限流规则

| 接口 | 限制 |
|------|------|
| 登录/注册 | 5次/分钟 |
| 发送验证码 | 3次/分钟 |
| 发表评论 | 10次/分钟 |
| 点赞 | 30次/分钟 |
| 搜索 | 20次/分钟 |
| 其他接口 | 100次/分钟 |

---

**注意**: 所有时间戳均采用 ISO 8601 格式（UTC）。

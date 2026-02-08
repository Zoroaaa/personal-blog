# 📡 API 完整文档 v3.0.1

> 博客系统后端 API 接口完整参考文档

**API 基础 URL**: `https://apiblog.neutronx.uk/api`  
**体验站点**: [blog.neutronx.uk](https://blog.neutronx.uk)

---

## 📋 目录

- [基础信息](#基础信息)
- [认证授权](#认证授权)
- [文章管理](#文章管理)
- [评论系统](#评论系统)
- [分类标签](#分类标签)
- [文件上传](#文件上传)
- [数据分析](#数据分析)
- [管理后台](#管理后台)
- [配置管理](#配置管理)
- [错误处理](#错误处理)
- [速率限制](#速率限制)

---

## 🎯 基础信息

### 统一响应格式

所有 API 响应都遵循统一格式：

#### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "错误描述",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 认证方式

使用 JWT Bearer Token 认证：

```http
Authorization: Bearer <your-jwt-token>
```

### 分页参数

支持分页的接口使用以下查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码（从 1 开始）|
| `limit` | number | 10 | 每页数量 |

分页响应格式：

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalItems": 100,
      "totalPages": 10
    }
  }
}
```

---

## 🔐 认证授权

### 1. 用户注册

**POST** `/api/auth/register`

注册新用户账号。

#### 请求体

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Password123!",
  "displayName": "Test User",
  "verificationCode": "123456"  // 可选，如果启用邮箱验证
}
```

#### 参数说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `username` | string | ✅ | 用户名，3-20 字符，字母数字下划线 |
| `email` | string | ✅ | 邮箱地址，必须是有效的邮箱格式 |
| `password` | string | ✅ | 密码，至少 8 位，包含大小写字母、数字和特殊字符 |
| `displayName` | string | ✅ | 显示名称，1-50 字符 |
| `verificationCode` | string | ❌ | 邮箱验证码（如果启用验证） |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "displayName": "Test User",
      "avatarUrl": null,
      "bio": null,
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "注册成功"
}
```

**错误 (400)**

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "密码必须包含大小写字母、数字和特殊字符"
}
```

---

### 2. 用户登录

**POST** `/api/auth/login`

使用用户名/邮箱和密码登录。

#### 请求体

```json
{
  "username": "testuser",  // 或使用邮箱
  "password": "Password123!"
}
```

#### 参数说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `username` | string | ✅ | 用户名或邮箱 |
| `password` | string | ✅ | 密码 |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "displayName": "Test User",
      "avatarUrl": "https://storage.example.com/avatars/user1.jpg",
      "bio": "Hello world",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "登录成功"
}
```

---

### 3. GitHub OAuth 登录

**POST** `/api/auth/github`

使用 GitHub OAuth 授权码登录。

#### 请求体

```json
{
  "code": "github_authorization_code"
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "githubuser",
      "email": "user@github.com",
      "displayName": "GitHub User",
      "avatarUrl": "https://avatars.githubusercontent.com/u/12345",
      "bio": "GitHub bio",
      "role": "user",
      "oauthProvider": "github"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": false
  },
  "message": "登录成功"
}
```

---

### 4. 获取当前用户信息

**GET** `/api/auth/me`

🔒 **需要认证**

获取当前登录用户的详细信息。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "displayName": "Test User",
      "avatarUrl": "https://storage.example.com/avatars/user1.jpg",
      "bio": "Hello world",
      "role": "user",
      "postCount": 10,
      "commentCount": 25,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLoginAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 5. 更新用户资料

**PUT** `/api/auth/profile`

🔒 **需要认证**

更新当前用户的个人资料。

#### 请求体

```json
{
  "displayName": "New Display Name",
  "bio": "Updated bio",
  "email": "newemail@example.com"  // 需要邮箱验证
}
```

#### 参数说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `displayName` | string | ❌ | 显示名称 |
| `bio` | string | ❌ | 个人简介，最多 500 字符 |
| `email` | string | ❌ | 新邮箱（需要验证码） |
| `verificationCode` | string | ❌ | 邮箱验证码（更改邮箱时必需） |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "newemail@example.com",
      "displayName": "New Display Name",
      "bio": "Updated bio",
      "avatarUrl": "https://storage.example.com/avatars/user1.jpg",
      "role": "user"
    }
  },
  "message": "资料更新成功"
}
```

---

### 6. 修改密码

**PUT** `/api/auth/password`

🔒 **需要认证**

修改当前用户的密码。

#### 请求体

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "verificationCode": "123456"  // 可选，如果启用验证
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "密码修改成功，请重新登录"
}
```

---

### 7. 忘记密码

**POST** `/api/auth/forgot-password`

通过邮箱重置密码。

#### 请求体

```json
{
  "email": "test@example.com",
  "verificationCode": "123456",
  "newPassword": "NewPassword123!"
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

### 8. 发送验证码

**POST** `/api/auth/send-verification-code`

发送邮箱验证码（注册、重置密码、修改邮箱）。

#### 请求体

```json
{
  "email": "test@example.com",
  "type": "register"  // register | forgot_password | password | delete
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "验证码已发送至邮箱",
  "data": {
    "expiresIn": 600  // 秒
  }
}
```

---

### 9. 注销登出

**POST** `/api/auth/logout`

🔒 **需要认证**

注销当前会话（将 Token 加入黑名单）。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 📝 文章管理

### 1. 获取文章列表

**GET** `/api/posts`

获取已发布的文章列表，支持分页、筛选和排序。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 10 | 每页数量（最大 50）|
| `category` | number | - | 分类 ID |
| `tag` | string | - | 标签 slug |
| `author` | number | - | 作者 ID |
| `sort` | string | recent | 排序方式: recent/popular/hot |
| `keyword` | string | - | 搜索关键词 |

#### 示例请求

```http
GET /api/posts?page=1&limit=10&category=1&sort=popular
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "我的第一篇文章",
        "slug": "my-first-post",
        "summary": "文章摘要...",
        "coverImage": "https://storage.example.com/covers/post1.jpg",
        "author": {
          "id": 1,
          "username": "testuser",
          "displayName": "Test User",
          "avatarUrl": "https://storage.example.com/avatars/user1.jpg"
        },
        "category": {
          "id": 1,
          "name": "技术",
          "slug": "tech",
          "color": "#3B82F6"
        },
        "tags": [
          {
            "id": 1,
            "name": "JavaScript",
            "slug": "javascript",
            "color": "#F7DF1E"
          }
        ],
        "viewCount": 125,
        "likeCount": 15,
        "commentCount": 8,
        "readingTime": 5,
        "publishedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalItems": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

### 2. 获取文章详情

**GET** `/api/posts/:slug`

根据 slug 获取文章详细内容。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `slug` | string | 文章的 URL slug |

#### 示例请求

```http
GET /api/posts/my-first-post
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "post": {
      "id": 1,
      "title": "我的第一篇文章",
      "slug": "my-first-post",
      "summary": "文章摘要...",
      "content": "# 文章内容\n\n这是文章的 Markdown 内容...",
      "coverImage": "https://storage.example.com/covers/post1.jpg",
      "author": {
        "id": 1,
        "username": "testuser",
        "displayName": "Test User",
        "avatarUrl": "https://storage.example.com/avatars/user1.jpg",
        "bio": "Hello world"
      },
      "category": {
        "id": 1,
        "name": "技术",
        "slug": "tech",
        "color": "#3B82F6",
        "icon": "💻"
      },
      "tags": [
        {
          "id": 1,
          "name": "JavaScript",
          "slug": "javascript",
          "color": "#F7DF1E"
        }
      ],
      "status": "published",
      "visibility": "public",
      "viewCount": 126,
      "likeCount": 15,
      "commentCount": 8,
      "readingTime": 5,
      "metaTitle": "我的第一篇文章 - 博客",
      "metaDescription": "文章描述...",
      "metaKeywords": "JavaScript,技术,教程",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2023-12-31T20:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "isLiked": false,  // 当前用户是否点赞
      "previousPost": {
        "id": 2,
        "title": "上一篇文章",
        "slug": "previous-post"
      },
      "nextPost": {
        "id": 3,
        "title": "下一篇文章",
        "slug": "next-post"
      },
      "relatedPosts": [
        {
          "id": 4,
          "title": "相关文章1",
          "slug": "related-post-1",
          "summary": "摘要...",
          "coverImage": "...",
          "publishedAt": "2024-01-02T00:00:00.000Z"
        }
      ]
    }
  }
}
```

**注意**: 访问文章详情会自动增加浏览量。

---

### 3. 创建文章

**POST** `/api/posts`

🔒 **需要认证**

创建新文章（草稿或直接发布）。

#### 请求体

```json
{
  "title": "新文章标题",
  "slug": "new-post",  // 可选，自动生成
  "summary": "文章摘要",
  "content": "# 文章内容\n\n这是 Markdown 内容...",
  "coverImage": "https://storage.example.com/covers/new.jpg",
  "categoryId": 1,
  "tags": ["javascript", "react"],  // 标签 slug 数组
  "status": "published",  // draft | published
  "visibility": "public",  // public | private | password
  "password": null,  // 如果 visibility=password
  "metaTitle": "自定义 SEO 标题",
  "metaDescription": "自定义 SEO 描述",
  "metaKeywords": "关键词1,关键词2"
}
```

#### 参数说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 文章标题，1-200 字符 |
| `slug` | string | ❌ | URL slug，自动生成或自定义 |
| `summary` | string | ❌ | 摘要，最多 500 字符 |
| `content` | string | ✅ | Markdown 内容 |
| `coverImage` | string | ❌ | 封面图 URL |
| `categoryId` | number | ❌ | 分类 ID |
| `tags` | array | ❌ | 标签 slug 数组 |
| `status` | string | ❌ | 状态（默认 draft）|
| `visibility` | string | ❌ | 可见性（默认 public）|
| `password` | string | ❌ | 密码保护（visibility=password 时）|
| `metaTitle` | string | ❌ | SEO 标题 |
| `metaDescription` | string | ❌ | SEO 描述 |
| `metaKeywords` | string | ❌ | SEO 关键词 |

#### 响应

**成功 (201)**

```json
{
  "success": true,
  "data": {
    "post": {
      "id": 5,
      "title": "新文章标题",
      "slug": "new-post",
      "summary": "文章摘要",
      "content": "...",
      "status": "published",
      "publishedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "文章创建成功"
}
```

---

### 4. 更新文章

**PUT** `/api/posts/:id`

🔒 **需要认证**（作者或管理员）

更新现有文章。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 文章 ID |

#### 请求体

```json
{
  "title": "更新后的标题",
  "content": "更新后的内容...",
  "status": "published",
  "tags": ["javascript", "typescript"]
}
```

参数同创建文章，所有字段可选。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "post": {
      "id": 5,
      "title": "更新后的标题",
      "slug": "new-post",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  },
  "message": "文章更新成功"
}
```

---

### 5. 删除文章

**DELETE** `/api/posts/:id`

🔒 **需要认证**（作者或管理员）

删除文章（软删除，状态改为 archived）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 文章 ID |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "文章删除成功"
}
```

---

### 6. 点赞文章

**POST** `/api/posts/:id/like`

🔒 **需要认证**

点赞或取消点赞文章。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 文章 ID |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "liked": true,  // true=已点赞, false=取消点赞
    "likeCount": 16
  },
  "message": "点赞成功"
}
```

---

### 7. 获取用户点赞的文章

**GET** `/api/posts/likes`

🔒 **需要认证**

获取当前用户点赞的所有文章。

#### 查询参数

支持分页参数 `page` 和 `limit`。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "我点赞的文章",
        "slug": "liked-post",
        "summary": "...",
        "likedAt": "2024-01-10T15:30:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

### 8. 搜索文章

**GET** `/api/posts/search`

全文搜索文章，支持标题、内容、标签搜索。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `q` | string | - | 搜索关键词（必需）|
| `page` | number | 1 | 页码 |
| `limit` | number | 10 | 每页数量 |
| `category` | number | - | 筛选分类 |
| `tag` | string | - | 筛选标签 |

#### 示例请求

```http
GET /api/posts/search?q=JavaScript&category=1&page=1&limit=10
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "JavaScript 教程",
        "slug": "javascript-tutorial",
        "summary": "...",
        "matchScore": 0.95,  // 相关性得分
        "matchReason": "标题匹配",
        "highlights": {
          "title": "<mark>JavaScript</mark> 教程",
          "content": "学习 <mark>JavaScript</mark> 基础..."
        }
      }
    ],
    "searchStats": {
      "totalResults": 15,
      "searchTime": 0.05  // 秒
    },
    "pagination": {...}
  }
}
```

---

### 9. 管理员获取所有文章

**GET** `/api/posts/admin`

🔒 **需要认证**（管理员）

获取所有文章，包括草稿和私密文章。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 20 | 每页数量 |
| `status` | string | - | 筛选状态: draft/published/archived |
| `author` | number | - | 筛选作者 |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "...",
        "status": "draft",
        "visibility": "private",
        "author": {...},
        "createdAt": "...",
        "stats": {
          "views": 100,
          "likes": 10,
          "comments": 5
        }
      }
    ],
    "pagination": {...}
  }
}
```

---

## 💬 评论系统

### 1. 获取评论列表

**GET** `/api/comments`

获取文章的评论列表（支持嵌套）。

#### 查询参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `postId` | number | ✅ | 文章 ID |
| `page` | number | ❌ | 页码 |
| `limit` | number | ❌ | 每页数量 |
| `sort` | string | ❌ | 排序: newest/oldest/popular |

#### 示例请求

```http
GET /api/comments?postId=1&sort=popular&page=1&limit=20
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "postId": 1,
        "user": {
          "id": 2,
          "username": "commenter",
          "displayName": "评论者",
          "avatarUrl": "..."
        },
        "content": "这是一条评论",
        "parentId": null,
        "status": "approved",
        "likeCount": 5,
        "replyCount": 2,
        "isLiked": false,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "replies": [
          {
            "id": 2,
            "postId": 1,
            "user": {...},
            "content": "这是回复",
            "parentId": 1,
            "status": "approved",
            "likeCount": 1,
            "replyCount": 0,
            "createdAt": "2024-01-10T11:00:00.000Z",
            "replies": []
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalItems": 50,
      "totalPages": 3
    },
    "stats": {
      "totalComments": 50,
      "approvedComments": 48,
      "pendingComments": 2
    }
  }
}
```

**注意**: 评论支持最多 5 层嵌套。

---

### 2. 发表评论

**POST** `/api/comments`

🔒 **需要认证**

发表新评论或回复。

#### 请求体

```json
{
  "postId": 1,
  "content": "这是我的评论内容",
  "parentId": null  // 回复评论时填写父评论 ID
}
```

#### 参数说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `postId` | number | ✅ | 文章 ID |
| `content` | string | ✅ | 评论内容，1-1000 字符 |
| `parentId` | number | ❌ | 父评论 ID（回复时）|

#### 响应

**成功 (201)**

```json
{
  "success": true,
  "data": {
    "comment": {
      "id": 10,
      "postId": 1,
      "user": {
        "id": 2,
        "username": "commenter",
        "displayName": "评论者",
        "avatarUrl": "..."
      },
      "content": "这是我的评论内容",
      "parentId": null,
      "status": "approved",  // 或 "pending" 如果需要审核
      "likeCount": 0,
      "replyCount": 0,
      "createdAt": "2024-01-15T12:00:00.000Z"
    }
  },
  "message": "评论发表成功"
}
```

---

### 3. 删除评论

**DELETE** `/api/comments/:id`

🔒 **需要认证**（作者或管理员）

删除评论（软删除）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 评论 ID |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "评论删除成功"
}
```

---

### 4. 点赞评论

**POST** `/api/comments/:id/like`

🔒 **需要认证**

点赞或取消点赞评论。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 评论 ID |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 6
  },
  "message": "点赞成功"
}
```

---

## 🗂️ 分类标签

### 1. 获取分类列表

**GET** `/api/categories`

获取所有分类。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "技术",
        "slug": "tech",
        "description": "技术相关文章",
        "icon": "💻",
        "color": "#3B82F6",
        "postCount": 25,
        "displayOrder": 1
      },
      {
        "id": 2,
        "name": "生活",
        "slug": "life",
        "description": "生活随笔",
        "icon": "🌟",
        "color": "#10B981",
        "postCount": 15,
        "displayOrder": 2
      }
    ]
  }
}
```

---

### 2. 获取标签列表

**GET** `/api/categories/tags`

获取所有标签。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sort` | string | popular | 排序: popular/alphabetical |
| `limit` | number | - | 限制数量 |

#### 示例请求

```http
GET /api/categories/tags?sort=popular&limit=20
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "JavaScript",
        "slug": "javascript",
        "description": "JavaScript 相关",
        "color": "#F7DF1E",
        "postCount": 30
      },
      {
        "id": 2,
        "name": "React",
        "slug": "react",
        "description": "React 框架",
        "color": "#61DAFB",
        "postCount": 25
      }
    ],
    "tagCloud": [
      {
        "name": "JavaScript",
        "slug": "javascript",
        "weight": 10  // 标签云权重（基于使用频率）
      }
    ]
  }
}
```

---

### 3. 创建分类

**POST** `/api/categories`

🔒 **需要认证**（管理员）

创建新分类。

#### 请求体

```json
{
  "name": "新分类",
  "slug": "new-category",
  "description": "分类描述",
  "icon": "📚",
  "color": "#F59E0B",
  "displayOrder": 5
}
```

#### 响应

**成功 (201)**

```json
{
  "success": true,
  "data": {
    "category": {
      "id": 5,
      "name": "新分类",
      "slug": "new-category",
      "description": "分类描述",
      "icon": "📚",
      "color": "#F59E0B",
      "postCount": 0,
      "displayOrder": 5
    }
  },
  "message": "分类创建成功"
}
```

---

### 4. 更新分类

**PUT** `/api/categories/:id`

🔒 **需要认证**（管理员）

更新分类信息。

#### 请求体

```json
{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "displayOrder": 3
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "category": {...}
  },
  "message": "分类更新成功"
}
```

---

### 5. 删除分类

**DELETE** `/api/categories/:id`

🔒 **需要认证**（管理员）

删除分类（会将文章的分类设为 NULL）。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "分类删除成功"
}
```

---

### 6. 创建标签

**POST** `/api/categories/tags`

🔒 **需要认证**（管理员）

创建新标签。

#### 请求体

```json
{
  "name": "TypeScript",
  "slug": "typescript",
  "description": "TypeScript 相关",
  "color": "#3178C6"
}
```

#### 响应

**成功 (201)**

```json
{
  "success": true,
  "data": {
    "tag": {
      "id": 10,
      "name": "TypeScript",
      "slug": "typescript",
      "description": "TypeScript 相关",
      "color": "#3178C6",
      "postCount": 0
    }
  },
  "message": "标签创建成功"
}
```

---

## 📷 文件上传

### 1. 上传文件

**POST** `/api/upload`

🔒 **需要认证**

上传图片或其他文件到 R2 存储。

#### 请求体

使用 `multipart/form-data` 格式：

```http
Content-Type: multipart/form-data

file: [二进制文件]
type: avatar  // avatar | post | cover
```

#### 参数说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `file` | file | ✅ | 文件（图片）|
| `type` | string | ❌ | 文件类型: avatar/post/cover |

#### 支持的文件格式

- 图片: JPG, PNG, GIF, WebP
- 最大大小: 5MB

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "url": "https://storage.blog.neutronx.uk/images/2024/01/abc123.jpg",
    "filename": "abc123.jpg",
    "size": 102400,
    "type": "image/jpeg",
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  },
  "message": "文件上传成功"
}
```

---

### 2. 删除文件

**DELETE** `/api/upload/:filename`

🔒 **需要认证**

删除已上传的文件。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `filename` | string | 文件名 |

#### 示例请求

```http
DELETE /api/upload/abc123.jpg
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "文件删除成功"
}
```

---

## 📊 数据分析

### 1. 获取系统统计

**GET** `/api/analytics`

获取博客系统的总体统计数据。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalPosts": 100,
      "totalUsers": 50,
      "totalComments": 500,
      "totalViews": 10000,
      "totalLikes": 800
    },
    "trends": {
      "postsThisMonth": 10,
      "commentsThisMonth": 50,
      "viewsThisMonth": 1000,
      "postsGrowth": "+20%",  // 相比上月
      "commentsGrowth": "+15%",
      "viewsGrowth": "+30%"
    },
    "userActivity": {
      "activeUsers": 25,  // 最近 7 天活跃
      "newUsersThisMonth": 5
    }
  }
}
```

---

### 2. 获取热门文章

**GET** `/api/analytics/hot-posts`

获取热门文章排行。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `period` | string | week | 时间范围: day/week/month/all |
| `limit` | number | 10 | 数量限制 |

#### 示例请求

```http
GET /api/analytics/hot-posts?period=week&limit=10
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "hotPosts": [
      {
        "id": 1,
        "title": "最热门的文章",
        "slug": "hot-post",
        "author": {...},
        "viewCount": 1000,
        "likeCount": 100,
        "commentCount": 50,
        "hotScore": 950,  // 热度综合评分
        "publishedAt": "2024-01-01T00:00:00.000Z",
        "trend": "up"  // 趋势: up/down/stable
      }
    ],
    "period": "week",
    "generatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### 3. 获取文章详细分析

**GET** `/api/analytics/post/:id`

🔒 **需要认证**（作者或管理员）

获取单篇文章的详细数据分析。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 文章 ID |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "post": {
      "id": 1,
      "title": "文章标题"
    },
    "stats": {
      "totalViews": 1000,
      "uniqueVisitors": 750,
      "avgReadTime": 5.2,  // 分钟
      "bounceRate": 0.35,  // 35%
      "likeCount": 100,
      "commentCount": 50,
      "shareCount": 30
    },
    "viewsOverTime": [
      {
        "date": "2024-01-01",
        "views": 50,
        "visitors": 40
      },
      {
        "date": "2024-01-02",
        "views": 80,
        "visitors": 65
      }
    ],
    "referrers": [
      {
        "source": "google.com",
        "visits": 300,
        "percentage": 30
      },
      {
        "source": "direct",
        "visits": 400,
        "percentage": 40
      }
    ],
    "devices": {
      "desktop": 60,
      "mobile": 35,
      "tablet": 5
    },
    "locations": [
      {
        "country": "CN",
        "visits": 500
      },
      {
        "country": "US",
        "visits": 200
      }
    ]
  }
}
```

---

### 4. 获取用户统计

**GET** `/api/analytics/users`

🔒 **需要认证**（管理员）

获取用户相关统计数据。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 100,
      "activeUsers": 50,  // 最近 30 天活跃
      "newUsersThisMonth": 10
    },
    "userGrowth": [
      {
        "date": "2024-01",
        "newUsers": 10,
        "totalUsers": 100
      }
    ],
    "topContributors": [
      {
        "user": {
          "id": 1,
          "username": "topuser",
          "displayName": "Top User",
          "avatarUrl": "..."
        },
        "postCount": 50,
        "commentCount": 200,
        "totalLikes": 500
      }
    ]
  }
}
```

---

### 5. 记录页面访问

**POST** `/api/analytics/track`

记录页面访问事件（用于统计）。

#### 请求体

```json
{
  "postId": 1,  // 可选
  "type": "view",  // view | click | share
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0..."
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "事件记录成功"
}
```

---

## 🛡️ 管理后台

### 1. 获取评论列表（管理）

**GET** `/api/admin/comments`

🔒 **需要认证**（管理员或审核员）

获取所有评论，包括待审核的。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 20 | 每页数量 |
| `status` | string | - | 筛选状态: pending/approved/rejected |
| `postId` | number | - | 筛选文章 |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "post": {
          "id": 1,
          "title": "文章标题"
        },
        "user": {...},
        "content": "评论内容",
        "status": "pending",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "stats": {
      "totalComments": 100,
      "pendingComments": 5,
      "approvedComments": 90,
      "rejectedComments": 5
    },
    "pagination": {...}
  }
}
```

---

### 2. 更新评论状态

**PUT** `/api/admin/comments/:id/status`

🔒 **需要认证**（管理员或审核员）

审核评论（批准或拒绝）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 评论 ID |

#### 请求体

```json
{
  "status": "approved"  // approved | rejected | pending
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "comment": {
      "id": 1,
      "status": "approved"
    }
  },
  "message": "评论状态更新成功"
}
```

---

### 3. 删除评论（管理）

**DELETE** `/api/admin/comments/:id`

🔒 **需要认证**（管理员）

永久删除评论。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "评论删除成功"
}
```

---

### 4. 获取用户列表

**GET** `/api/admin/users`

🔒 **需要认证**（管理员）

获取所有用户列表。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 20 | 每页数量 |
| `role` | string | - | 筛选角色: admin/moderator/user |
| `status` | string | - | 筛选状态: active/suspended |
| `search` | string | - | 搜索用户名或邮箱 |

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "displayName": "Test User",
        "avatarUrl": "...",
        "role": "user",
        "status": "active",
        "postCount": 10,
        "commentCount": 25,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastLoginAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

### 5. 更新用户状态

**PUT** `/api/admin/users/:id/status`

🔒 **需要认证**（管理员）

更新用户状态（激活/禁用）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | number | 用户 ID |

#### 请求体

```json
{
  "status": "suspended"  // active | suspended | deleted
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "status": "suspended"
    }
  },
  "message": "用户状态更新成功"
}
```

---

### 6. 更新用户角色

**PUT** `/api/admin/users/:id/role`

🔒 **需要认证**（管理员）

更新用户角色。

#### 请求体

```json
{
  "role": "moderator"  // admin | moderator | user
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "role": "moderator"
    }
  },
  "message": "用户角色更新成功"
}
```

---

### 7. 获取系统设置

**GET** `/api/admin/settings`

🔒 **需要认证**（管理员）

获取所有系统配置。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "settings": [
      {
        "key": "site_name",
        "value": "我的博客",
        "type": "string",
        "category": "general",
        "description": "网站名称"
      },
      {
        "key": "feature_comments",
        "value": "true",
        "type": "boolean",
        "category": "features",
        "description": "启用评论功能"
      }
    ],
    "categories": {
      "general": "基本设置",
      "theme": "主题设置",
      "features": "功能开关",
      "social": "社交媒体",
      "seo": "SEO设置"
    }
  }
}
```

---

### 8. 更新系统设置

**PUT** `/api/admin/settings`

🔒 **需要认证**（管理员）

批量更新系统配置。

#### 请求体

```json
{
  "settings": [
    {
      "key": "site_name",
      "value": "新的博客名称"
    },
    {
      "key": "feature_comments",
      "value": "false"
    }
  ]
}
```

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "message": "设置更新成功"
}
```

---

## ⚙️ 配置管理

### 获取公开配置

**GET** `/api/config`

获取前端需要的公开配置（无需认证）。

#### 响应

**成功 (200)**

```json
{
  "success": true,
  "data": {
    "site": {
      "name": "我的博客",
      "subtitle": "分享技术与生活",
      "logo": "/logo.png",
      "favicon": "/favicon.ico",
      "description": "一个分享技术和生活的个人博客",
      "keywords": "blog,技术,编程,生活"
    },
    "author": {
      "name": "Admin",
      "avatar": "/default-avatar.png",
      "bio": "热爱技术的开发者",
      "email": "admin@example.com"
    },
    "theme": {
      "primaryColor": "#3B82F6",
      "defaultMode": "system",
      "fontFamily": "system-ui, sans-serif",
      "enableAnimations": true
    },
    "social": {
      "github": "https://github.com/username",
      "twitter": "",
      "linkedin": "",
      "email": "contact@example.com"
    },
    "features": {
      "comments": true,
      "search": true,
      "like": true,
      "share": true,
      "rss": true,
      "analytics": true,
      "commentApprovalRequired": false
    },
    "footer": {
      "text": "© 2024 我的博客. All rights reserved.",
      "showPoweredBy": true
    },
    "system": {
      "postsPerPage": 10,
      "maxUploadSizeMb": 5
    }
  }
}
```

---

## ❌ 错误处理

### 错误响应格式

所有错误都使用统一格式：

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "人类可读的错误描述",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "details": {}  // 可选，额外的错误详情
}
```

### 常见错误码

| HTTP状态 | 错误码 | 说明 |
|---------|--------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 400 | `INVALID_INPUT` | 输入数据无效 |
| 401 | `UNAUTHORIZED` | 未认证或 Token 无效 |
| 403 | `FORBIDDEN` | 权限不足 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源冲突（如用户名已存在）|
| 429 | `RATE_LIMIT_EXCEEDED` | 超出速率限制 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
| 503 | `SERVICE_UNAVAILABLE` | 服务不可用 |

### 验证错误详情

当参数验证失败时，`details` 字段会包含具体的验证错误：

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "请求参数验证失败",
  "details": {
    "fields": {
      "email": "邮箱格式不正确",
      "password": "密码必须至少8个字符"
    }
  }
}
```

---

## 🚦 速率限制

### 限制规则

API 实施了多层次的速率限制：

| 端点类型 | 限制 | 时间窗口 |
|---------|------|---------|
| 一般端点 | 500 次 | 每天/每IP |
| 登录/注册 | 50 次 | 每天/每IP |
| 邮件发送 | 10 次 | 每小时/每用户 |
| 文件上传 | 20 次 | 每小时/每用户 |
| 搜索 | 100 次 | 每小时/每IP |

### 速率限制响应头

每个响应都包含速率限制信息：

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1705334400
```

### 超出限制响应

**429 Too Many Requests**

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "请求过于频繁，请稍后再试",
  "details": {
    "limit": 500,
    "remaining": 0,
    "resetAt": "2024-01-16T00:00:00.000Z",
    "retryAfter": 3600  // 秒
  }
}
```

---

## 📝 最佳实践

### 1. 认证 Token 管理

```javascript
// 存储 Token
localStorage.setItem('token', response.data.token);

// 请求时携带 Token
fetch('/api/posts', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// Token 过期处理
if (response.error === 'UNAUTHORIZED') {
  // 清除 Token，跳转登录页
  localStorage.removeItem('token');
  router.push('/login');
}
```

### 2. 错误处理

```javascript
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || '请求失败');
    }
    
    return data.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### 3. 分页处理

```javascript
async function loadMorePosts(page = 1) {
  const response = await fetch(`/api/posts?page=${page}&limit=10`);
  const data = await response.json();
  
  return {
    posts: data.data.posts,
    hasMore: data.data.pagination.hasNextPage
  };
}
```

### 4. 文件上传

```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'post');
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.data.url;
}
```

### 5. 搜索防抖

```javascript
import { debounce } from 'lodash';

const searchPosts = debounce(async (keyword) => {
  const response = await fetch(`/api/posts/search?q=${keyword}`);
  const data = await response.json();
  return data.data.posts;
}, 300);
```

---

## 🔗 相关文档

- [部署手册](./DEPLOYMENT.md) - 完整部署指南
- [README](./README.md) - 项目概述和快速开始
- [体验站点](https://blog.neutronx.uk) - 在线演示

---

## 📞 支持

遇到问题？

- 查看 [故障排除](./DEPLOYMENT.md#故障排除)
- 提交 [Issue](https://github.com/yourusername/personal-blog/issues)
- 加入 [讨论](https://github.com/yourusername/personal-blog/discussions)

---

<div align="center">

**API 文档版本**: v3.0.1  
**最后更新**: 2024-01-15

[返回顶部](#-api-完整文档-v301)

</div>

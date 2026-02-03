# 📡 API 文档

## 基础信息

**API 基础 URL**: `https://your-backend-worker.example.com`

**认证方式**: JWT Token (Bearer)

**响应格式**:
```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

## 认证相关

### 注册

**POST /auth/register**

请求体:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "user"
    },
    "token": "jwt-token"
  }
}
```

### 登录

**POST /auth/login**

请求体:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "user"
    },
    "token": "jwt-token"
  }
}
```

### GitHub OAuth

**GET /auth/github**

### 获取当前用户

**GET /auth/me**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "user"
    }
  }
}
```

## 文章相关

### 获取文章列表

**GET /posts**

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10)
- `category`: 分类 slug
- `tag`: 标签 slug

响应:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "Test Post",
        "slug": "test-post",
        "summary": "Test summary",
        "createdAt": "2024-01-01T00:00:00Z",
        "readingTime": "2 min",
        "viewCount": 100,
        "tags": [{ "name": "test", "slug": "test" }]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 获取文章详情

**GET /posts/{slug}**

响应:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Test Post",
    "slug": "test-post",
    "content": "# Test Content",
    "htmlContent": "<h1>Test Content</h1>",
    "summary": "Test summary",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "readingTime": "2 min",
    "viewCount": 100,
    "author": {
      "id": 1,
      "username": "testuser"
    },
    "tags": [{ "name": "test", "slug": "test" }],
    "category": { "name": "General", "slug": "general" }
  }
}
```

### 创建文章

**POST /posts**

需要认证: ✅

请求体:
```json
{
  "title": "Test Post",
  "content": "# Test Content",
  "summary": "Test summary",
  "status": "published",
  "categoryId": 1,
  "tagIds": [1, 2]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "test-post"
  }
}
```

### 搜索文章

**GET /posts/search**

查询参数:
- `q`: 搜索关键词
- `category`: 分类 slug
- `tag`: 标签 slug
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10)
- `sort`: 排序方式 (relevance, newest, oldest)

响应:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "Test Post",
        "slug": "test-post",
        "summary": "Test summary",
        "createdAt": "2024-01-01T00:00:00Z",
        "readingTime": "2 min",
        "viewCount": 100,
        "tags": [{ "name": "test", "slug": "test" }]
      }
    ],
    "total": 1,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

## 评论相关

### 获取评论列表

**GET /comments**

查询参数:
- `postId`: 文章 ID
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20)

响应:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "content": "Test comment",
        "htmlContent": "<p>Test comment</p>",
        "createdAt": "2024-01-01T00:00:00Z",
        "user": {
          "id": 1,
          "username": "testuser"
        },
        "replies": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 创建评论

**POST /comments**

需要认证: ✅

请求体:
```json
{
  "postId": 1,
  "content": "Test comment",
  "parentId": null
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

### 点赞评论

**POST /comments/{id}/like**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "liked": true
  }
}
```

## 分类和标签

### 获取所有分类

**GET /categories**

响应:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "General",
        "slug": "general",
        "postCount": 10
      }
    ]
  }
}
```

### 获取所有标签

**GET /categories/tags**

响应:
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "test",
        "slug": "test",
        "postCount": 5
      }
    ]
  }
}
```

## 媒体管理

### 上传图片

**POST /upload**

需要认证: ✅

请求体: `multipart/form-data`
- `file`: 图片文件

响应:
```json
{
  "success": true,
  "data": {
    "url": "https://your-r2-bucket.example.com/images/image.jpg",
    "thumbnailUrl": "https://your-r2-bucket.example.com/images/image_thumb.jpg",
    "filename": "image.jpg",
    "size": 102400,
    "width": 1920,
    "height": 1080
  }
}
```

### 删除文件

**DELETE /upload/{filename}**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

## 数据分析

### 获取系统统计

**GET /analytics**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "totalPosts": 100,
    "totalComments": 500,
    "totalUsers": 10,
    "totalViews": 10000,
    "recentPosts": [...],
    "recentComments": [...],
    "viewTrend": [
      {
        "date": "2024-01-01",
        "views": 100
      }
    ]
  }
}
```

### 获取热门文章

**GET /analytics/hot-posts**

查询参数:
- `limit`: 数量限制 (默认 5)

响应:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Hot Post",
      "slug": "hot-post",
      "viewCount": 1000
    }
  ]
}
```

## 管理后台

### 获取评论管理列表

**GET /admin/comments**

需要认证: ✅
需要角色: admin

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20)
- `status`: 状态 (approved, pending, spam)

响应:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "content": "Test comment",
        "status": "approved",
        "createdAt": "2024-01-01T00:00:00Z",
        "user": {
          "id": 1,
          "username": "testuser"
        },
        "post": {
          "id": 1,
          "title": "Test Post"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 更新评论状态

**PUT /admin/comments/{id}/status**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "status": "approved"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

### 获取用户管理列表

**GET /admin/users**

需要认证: ✅
需要角色: admin

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20)
- `role`: 角色 (admin, user)

响应:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "role": "user",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 更新用户角色

**PUT /admin/users/{id}/role**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "role": "admin"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

### 获取系统设置

**GET /admin/settings**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "siteName": "Personal Blog",
    "siteDescription": "My personal blog",
    "siteKeywords": "blog, personal, technology",
    "postsPerPage": 10,
    "allowComments": true
  }
}
```

### 更新系统设置

**PUT /admin/settings**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "siteName": "Personal Blog",
  "siteDescription": "My personal blog",
  "siteKeywords": "blog, personal, technology",
  "postsPerPage": 10,
  "allowComments": true
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

## 健康检查

### 健康检查

**GET /health**

响应:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0"
  }
}
```

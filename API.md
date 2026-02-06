# 📡 API 文档 v3.0.1

## 基础信息

**API 基础 URL**: `https://your-backend-worker.example.com/api`

**认证方式**: JWT Token (Bearer)

**响应格式**:
```json
{
  "success": true,
  "data": {...},
  "error": null,
  "message": "",
  "timestamp": "2024-01-01T00:00:00Z"
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
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "3.0.1",
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    }
  }
}
```

### API健康检查

**GET /api/health**

响应:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "3.0.1"
  }
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
  "password": "Password123!",
  "displayName": "Test User"
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
      "displayName": "Test User",
      "avatarUrl": null,
      "bio": null,
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "token": "jwt-token"
  },
  "message": "Registration successful"
}
```

### 登录

**POST /auth/login**

请求体:
```json
{
  "username": "testuser",
  "password": "Password123!"
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
      "displayName": "Test User",
      "avatarUrl": null,
      "bio": null,
      "role": "user"
    },
    "token": "jwt-token"
  },
  "message": "Login successful"
}
```

### GitHub OAuth

**POST /auth/github**

请求体:
```json
{
  "code": "github-authorization-code"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "githubuser",
      "email": "user@github.com",
      "displayName": "GitHub User",
      "avatarUrl": "https://github.com/avatar.jpg",
      "bio": null,
      "role": "user"
    },
    "token": "jwt-token"
  },
  "message": "GitHub login successful"
}
```

### 登出

**POST /auth/logout**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "loggedOut": true
  },
  "message": "Logout successful"
}
```

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
      "displayName": "Test User",
      "avatarUrl": null,
      "bio": null,
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "postCount": 10,
      "commentCount": 20
    }
  }
}
```

### 更新用户资料

**PUT /auth/profile**

需要认证: ✅

请求体:
```json
{
  "displayName": "Updated Name",
  "bio": "This is my bio",
  "avatarUrl": "https://example.com/avatar.jpg"
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
      "displayName": "Updated Name",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bio": "This is my bio",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  },
  "message": "Profile updated successfully"
}
```

### 修改密码

**PUT /auth/password**

需要认证: ✅

请求体:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  },
  "message": "Password updated successfully"
}
```

### 删除账号

**DELETE /auth/account**

需要认证: ✅

请求体:
```json
{
  "password": "Password123!",
  "confirmation": "DELETE"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "message": "Account deleted successfully"
}
```

### 删除账号（POST版本）

**POST /auth/delete**

需要认证: ✅

请求体:
```json
{
  "password": "Password123!",
  "confirmation": "DELETE"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "message": "Account deleted successfully"
}
```

## 文章相关

### 获取文章列表

**GET /posts**

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10, 最大 50)
- `category`: 分类 slug
- `tag`: 标签 slug
- `author`: 作者用户名
- `search`: 搜索关键词
- `sortBy`: 排序字段 (published_at, view_count, like_count, comment_count, created_at)
- `order`: 排序方向 (asc, desc)

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
        "coverImage": "https://example.com/image.jpg",
        "viewCount": 100,
        "likeCount": 20,
        "commentCount": 10,
        "readingTime": 2,
        "publishedAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "authorName": "testuser",
        "authorDisplayName": "Test User",
        "authorAvatar": null,
        "categoryName": "General",
        "categorySlug": "general",
        "categoryColor": "#3B82F6",
        "tags": [{ "id": 1, "name": "test", "slug": "test" }]
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
    "summary": "Test summary",
    "coverImage": "https://example.com/image.jpg",
    "viewCount": 100,
    "likeCount": 20,
    "commentCount": 10,
    "readingTime": 2,
    "publishedAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "isLiked": false,
    "author": {
      "username": "testuser",
      "displayName": "Test User",
      "avatarUrl": null,
      "bio": null
    },
    "tags": [{ "id": 1, "name": "test", "slug": "test" }],
    "categoryName": "General",
    "categorySlug": "general",
    "categoryColor": "#3B82F6"
  }
}
```

### 管理员获取文章列表

**GET /posts/admin**

需要认证: ✅

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10, 最大 50)

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
        "coverImage": "https://example.com/image.jpg",
        "status": "published",
        "viewCount": 100,
        "likeCount": 20,
        "commentCount": 10,
        "readingTime": 2,
        "publishedAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "authorName": "testuser",
        "authorDisplayName": "Test User",
        "authorAvatar": null,
        "categoryName": "General",
        "categorySlug": "general",
        "categoryColor": "#3B82F6",
        "tags": [{ "id": 1, "name": "test", "slug": "test" }]
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

### 管理员获取文章详情

**GET /posts/admin/{id}**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Test Post",
    "slug": "test-post",
    "content": "# Test Content",
    "summary": "Test summary",
    "coverImage": "https://example.com/image.jpg",
    "status": "published",
    "visibility": "public",
    "viewCount": 100,
    "likeCount": 20,
    "commentCount": 10,
    "readingTime": 2,
    "publishedAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "author": {
      "username": "testuser",
      "displayName": "Test User",
      "avatarUrl": null,
      "bio": null
    },
    "tags": [{ "id": 1, "name": "test", "slug": "test" }],
    "categoryName": "General",
    "categorySlug": "general",
    "categoryColor": "#3B82F6"
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
  "categoryId": 1,
  "tags": [1, 2],
  "coverImage": "https://example.com/image.jpg",
  "status": "published",
  "visibility": "public"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "test-post"
  },
  "message": "Post created successfully"
}
```

### 更新文章

**PUT /posts/{id}**

需要认证: ✅

请求体:
```json
{
  "title": "Updated Post",
  "content": "# Updated Content",
  "summary": "Updated summary",
  "categoryId": 1,
  "tags": [1, 2, 3],
  "coverImage": "https://example.com/new-image.jpg",
  "status": "published",
  "visibility": "public"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  },
  "message": "Post updated successfully"
}
```

### 删除文章

**DELETE /posts/{id}**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "message": "Post deleted successfully"
}
```

### 点赞文章

**POST /posts/{id}/like**

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

### 获取用户点赞的文章

**GET /posts/likes**

需要认证: ✅

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10, 最大 50)

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
        "coverImage": "https://example.com/image.jpg",
        "viewCount": 100,
        "likeCount": 20,
        "commentCount": 10,
        "readingTime": 2,
        "publishedAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "authorName": "testuser",
        "authorDisplayName": "Test User",
        "authorAvatar": null,
        "categoryName": "General",
        "categorySlug": "general",
        "categoryColor": "#3B82F6",
        "tags": [{ "id": 1, "name": "test", "slug": "test" }]
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

### 搜索文章

**GET /posts/search**

查询参数:
- `q`: 搜索关键词
- `category`: 分类 slug
- `tag`: 标签 slug
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10, 最大 50)
- `sort`: 排序方式 (relevance, published_at, view_count, like_count, comment_count)
- `order`: 排序方向 (asc, desc)

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
        "coverImage": "https://example.com/image.jpg",
        "viewCount": 100,
        "likeCount": 20,
        "commentCount": 10,
        "readingTime": 2,
        "publishedAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "authorName": "testuser",
        "authorDisplayName": "Test User",
        "authorAvatar": null,
        "categoryName": "General",
        "categorySlug": "general",
        "categoryColor": "#3B82F6",
        "tags": [{ "id": 1, "name": "test", "slug": "test" }]
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
- `userId`: 用户 ID (需要认证)
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20, 最大 100)
- `includeReplies`: 是否包含回复 (默认 true)

响应:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "content": "Test comment",
        "createdAt": "2024-01-01T00:00:00Z",
        "username": "testuser",
        "display_name": "Test User",
        "avatar_url": null,
        "replies": [
          {
            "id": 2,
            "content": "Test reply",
            "createdAt": "2024-01-01T00:00:00Z",
            "username": "user2",
            "display_name": "User 2",
            "avatar_url": null,
            "replies": []
          }
        ]
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
  },
  "message": "Comment created successfully"
}
```

### 删除评论

**DELETE /comments/{id}**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "message": "Comment deleted successfully"
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
        "description": "General category",
        "icon": "📝",
        "color": "#3B82F6",
        "post_count": 10,
        "display_order": 0
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
        "post_count": 5,
        "color": "#3B82F6"
      }
    ]
  }
}
```

### 创建分类

**POST /categories**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "name": "New Category",
  "slug": "new-category",
  "description": "New category description",
  "icon": "📁",
  "color": "#10B981",
  "displayOrder": 5
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "new-category"
  },
  "message": "Category created successfully"
}
```

### 更新分类

**PUT /categories/{id}**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "name": "Updated Category",
  "description": "Updated description",
  "icon": "📂",
  "color": "#8B5CF6",
  "displayOrder": 3
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  },
  "message": "Category updated successfully"
}
```

### 删除分类

**DELETE /categories/{id}**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "message": "Category deleted successfully"
}
```

### 创建标签

**POST /categories/tags**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "name": "New Tag",
  "slug": "new-tag",
  "description": "New tag description",
  "color": "#F59E0B"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "new-tag"
  },
  "message": "Tag created successfully"
}
```

### 更新标签

**PUT /categories/tags/{id}**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "name": "Updated Tag",
  "description": "Updated description",
  "color": "#EC4899"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "updated": true
  },
  "message": "Tag updated successfully"
}
```

### 删除标签

**DELETE /categories/tags/{id}**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "message": "Tag deleted successfully"
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
    "url": "https://your-r2-bucket.example.com/1620000000-random.jpg",
    "filename": "1620000000-random.jpg",
    "size": 102400,
    "type": "image/jpeg",
    "uploadedAt": "2024-01-01T00:00:00Z",
    "processedFiles": [
      {
        "filename": "1620000000-random.jpg",
        "type": "image/jpeg",
        "url": "https://your-r2-bucket.example.com/1620000000-random.jpg",
        "isOriginal": true
      },
      {
        "filename": "thumbnail-1620000000-random.jpg",
        "type": "image/jpeg",
        "url": "https://your-r2-bucket.example.com/thumbnail-1620000000-random.jpg",
        "isThumbnail": true
      },
      {
        "filename": "1620000000-random.webp",
        "type": "image/webp",
        "url": "https://your-r2-bucket.example.com/1620000000-random.webp",
        "isWebP": true
      },
      {
        "filename": "compressed-1620000000-random.jpg",
        "type": "image/jpeg",
        "url": "https://your-r2-bucket.example.com/compressed-1620000000-random.jpg",
        "isCompressed": true
      }
    ]
  },
  "message": "File uploaded successfully"
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
  },
  "message": "File deleted successfully"
}
```

### 获取文件信息

**GET /upload/{filename}**

需要认证: ✅

响应:
```json
{
  "success": true,
  "data": {
    "filename": "1620000000-random.jpg",
    "url": "https://your-r2-bucket.example.com/1620000000-random.jpg",
    "size": 102400,
    "type": "image/jpeg",
    "uploadedAt": "2024-01-01T00:00:00Z",
    "uploadedBy": "1",
    "etag": "etag-value"
  }
}
```

## 数据分析

### 获取系统统计

**GET /analytics**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "totalPosts": 100,
    "totalComments": 500,
    "totalUsers": 10,
    "totalViews": 10000,
    "recentPosts": [
      {
        "id": 1,
        "title": "Test Post",
        "slug": "test-post",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "recentComments": [
      {
        "id": 1,
        "content": "Test comment",
        "createdAt": "2024-01-01T00:00:00Z",
        "user_username": "testuser"
      }
    ],
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
- `limit`: 数量限制 (默认 10, 最大 50)
- `days`: 时间范围 (默认 7天)

响应:
```json
{
  "success": true,
  "data": {
    "hotPosts": [
      {
        "id": 1,
        "title": "Hot Post",
        "slug": "hot-post",
        "viewCount": 1000,
        "likeCount": 100,
        "commentCount": 50,
        "publishedAt": "2024-01-01T00:00:00Z",
        "coverImage": "https://example.com/image.jpg",
        "author_name": "testuser",
        "author_display_name": "Test User"
      }
    ],
    "limit": 10,
    "days": 7
  }
}
```

### 获取基础统计数据

**GET /analytics/stats**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalPosts": 100,
      "totalUsers": 10,
      "totalComments": 500,
      "totalViews": 10000,
      "todayViews": 100
    },
    "viewTrend": [
      {
        "date": "2024-01-01",
        "views": 100
      }
    ],
    "categoryStats": [
      {
        "name": "General",
        "slug": "general",
        "post_count": 50
      }
    ],
    "tagStats": [
      {
        "name": "test",
        "slug": "test",
        "post_count": 20
      }
    ]
  }
}
```

### 获取单篇文章的详细分析

**GET /analytics/post/{id}**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "post": {
      "id": 1,
      "title": "Test Post",
      "slug": "test-post"
    },
    "stats": {
      "view_count": 1000,
      "like_count": 100,
      "comment_count": 50,
      "unique_visitors": 500,
      "created_at": "2024-01-01T00:00:00Z",
      "published_at": "2024-01-01T00:00:00Z"
    },
    "viewTrend": [
      {
        "date": "2024-01-01",
        "views": 100
      }
    ],
    "referrerStats": [
      {
        "source": "Google",
        "count": 500
      }
    ]
  }
}
```

### 获取用户统计

**GET /analytics/users**

需要认证: ✅
需要角色: admin

查询参数:
- `limit`: 数量限制 (默认 10, 最大 50)

响应:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "display_name": "Test User",
        "email": "test@example.com",
        "avatar_url": "https://example.com/avatar.jpg",
        "post_count": 10,
        "comment_count": 20,
        "created_at": "2024-01-01T00:00:00Z",
        "last_login_at": "2024-01-01T00:00:00Z"
      }
    ],
    "limit": 10
  }
}
```

### 记录页面访问

**POST /analytics/track**

请求体:
```json
{
  "postId": 1,
  "referrer": "https://example.com"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "tracked": true
  }
}
```

## 管理后台

### 获取评论管理列表

**GET /admin/comments**

需要认证: ✅
需要角色: admin

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20, 最大 100)
- `status`: 状态筛选 (all, approved, pending, rejected, deleted)
- `postId`: 文章ID筛选

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
        "created_at": "2024-01-01T00:00:00Z",
        "username": "testuser",
        "display_name": "Test User",
        "avatar_url": "https://example.com/avatar.jpg",
        "post_title": "Test Post",
        "post_slug": "test-post"
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

### 删除评论

**DELETE /admin/comments/{id}**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### 获取用户管理列表

**GET /admin/users**

需要认证: ✅
需要角色: admin

查询参数:
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20, 最大 100)
- `role`: 角色筛选 (all, admin, user, moderator)
- `status`: 状态筛选 (all, active, suspended, deleted)

响应:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "display_name": "Test User",
        "email": "test@example.com",
        "avatar_url": "https://example.com/avatar.jpg",
        "role": "user",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login_at": "2024-01-01T00:00:00Z"
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

### 更新用户状态

**PUT /admin/users/{id}/status**

需要认证: ✅
需要角色: admin

请求体:
```json
{
  "status": "active"
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

### 删除用户

**DELETE /admin/users/{id}**

需要认证: ✅
需要角色: admin

响应:
```json
{
  "success": true,
  "data": {
    "deleted": true
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
    "settings": {
      "siteName": "Personal Blog",
      "environment": "production",
      "apiVersion": "3.0.1",
      "features": {
        "analytics": true,
        "comments": true,
        "search": true,
        "media": true
      }
    }
  }
}
```

## 配置相关

### 获取公开配置信息

**GET /config**

响应:
```json
{
  "success": true,
  "data": {
    "site_name": "Personal Blog",
    "site_description": "My personal blog",
    "site_keywords": "blog, personal, technology",
    "posts_per_page": 10,
    "site_favicon": "/favicon.ico"
  }
}
```
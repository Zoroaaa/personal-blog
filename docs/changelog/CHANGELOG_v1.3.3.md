# 更新日志 v1.3.3

**发布日期**: 2026-02-16

本文档记录了个人博客系统 v1.3.3 版本的更新内容。

---

## 版本信息

- **版本号**: v1.3.3
- **发布日期**: 2026-02-16
- **上一版本**: v1.3.2

---

## 文档更新

### 版本号统一更新

本次更新对所有项目文档进行了版本号统一更新：

- **README.md**: v1.3.2 → v1.3.3
- **QUICKSTART.md**: v1.3.2 → v1.3.3
- **DEPLOYMENT.md**: v1.3.2 → v1.3.3
- **ARCHITECTURE.md**: v1.3.2 → v1.3.3
- **API.md**: v1.3.2 → v1.3.3

### API 文档全面更新

对 API.md 进行了全面修订，整合了所有后端路由文件中的 API 接口：

#### 新增 API 接口文档

**文章模块新增接口:**
- `GET /posts/reading-history` - 获取阅读历史
- `GET /posts/:id/reading-progress` - 获取文章阅读进度
- `POST /posts/:id/reading-progress` - 保存文章阅读进度
- `GET /posts/:id/mentionable-users` - 获取可@提及的用户列表

**专栏模块新增接口:**
- `GET /columns/:id/posts` - 获取专栏下的文章列表

**分类模块新增接口:**
- `GET /categories/:id/posts` - 获取分类下的文章列表
- `GET /tags` - 获取标签列表
- `POST /tags` - 创建标签
- `GET /tags/:id/posts` - 获取标签下的文章列表

**通知模块新增接口:**
- `GET /notifications/unread-count` - 获取未读通知数量
- `GET /notifications/carousel` - 获取首页轮播通知

**私信模块新增接口:**
- `GET /messages/inbox` - 获取收件箱
- `GET /messages/sent` - 获取发件箱
- `POST /messages/:id/retry` - 重发失败的消息

**用户模块新增接口:**
- `GET /users/message-settings` - 获取私信设置
- `PUT /users/message-settings` - 更新私信设置

**管理模块新增接口:**
- `GET /admin/notifications` - 获取系统通知列表
- `GET /admin/notifications/:id` - 获取系统通知详情
- `PUT /admin/notifications/:id` - 更新系统通知
- `DELETE /admin/notifications/:id` - 删除系统通知

**上传模块新增接口:**
- `POST /upload/file` - 上传通用文件
- `GET /upload/:key` - 获取文件信息
- `DELETE /upload/:key` - 删除文件

**配置模块新增接口:**
- `GET /config/admin` - 获取管理员配置
- `PUT /config/batch` - 批量更新配置

**统计模块新增接口:**
- `GET /analytics/popular-posts` - 获取热门文章
- `GET /analytics/post/:id` - 获取单篇文章分析
- `GET /analytics/user/:id` - 获取单用户分析
- `POST /analytics/track` - 记录访问数据

#### 更新的 API 响应结构

**通知设置响应结构更新:**
```json
{
  "success": true,
  "data": {
    "systemInApp": true,
    "systemEmail": true,
    "systemFrequency": "realtime",
    "interactionInApp": true,
    "interactionEmail": true,
    "interactionFrequency": "realtime",
    "interactionComment": true,
    "interactionLike": true,
    "interactionFavorite": true,
    "interactionMention": true,
    "interactionReply": true,
    "dndEnabled": false,
    "dndStart": "22:00",
    "dndEnd": "08:00",
    "dndTimezone": "Asia/Shanghai"
  }
}
```

**上传文件响应结构更新:**
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "key": "images/xxx.jpg",
    "filename": "image.jpg",
    "size": 1024,
    "mimeType": "image/jpeg"
  }
}
```

#### 新增错误代码

| 代码 | 说明 |
|------|------|
| `INVALID_TOKEN` | 无效令牌 |
| `TOKEN_EXPIRED` | 令牌过期 |
| `FILE_TOO_LARGE` | 文件过大 |
| `INVALID_FILE_TYPE` | 无效文件类型 |

#### 更新限流规则

| 接口 | 限制 |
|------|------|
| 登录/注册 | 5次/分钟 |
| 发送验证码 | 1次/分钟 |
| 发表评论 | 10次/分钟 |
| 上传文件 | 5次/分钟 |
| 发送私信 | 20次/分钟 |
| 其他接口 | 100次/分钟 |

---

## 后端路由文件结构

本次文档更新基于以下后端路由文件的完整分析：

### 核心路由文件

| 文件路径 | 功能模块 | 主要接口 |
|----------|----------|----------|
| `backend/src/routes/auth.ts` | 认证模块 | 注册、登录、登出、OAuth、密码管理 |
| `backend/src/routes/posts.ts` | 文章模块 | 文章CRUD、搜索、点赞、收藏、阅读历史 |
| `backend/src/routes/columns.ts` | 专栏模块 | 专栏CRUD、统计刷新、文章列表 |
| `backend/src/routes/comments.ts` | 评论模块 | 评论CRUD、点赞、嵌套回复 |
| `backend/src/routes/categories.ts` | 分类模块 | 分类CRUD、标签管理、文章列表 |
| `backend/src/routes/notifications.ts` | 通知模块 | 通知列表、已读管理、轮播公告 |
| `backend/src/routes/messages.ts` | 私信模块 | 私信发送、会话管理、收发件箱 |
| `backend/src/routes/users.ts` | 用户模块 | 用户搜索、用户资料 |
| `backend/src/routes/admin.ts` | 管理模块 | 用户管理、内容审核、系统设置 |
| `backend/src/routes/adminNotifications.ts` | 管理员通知 | 系统通知CRUD |
| `backend/src/routes/upload.ts` | 上传模块 | 图片上传、文件上传、文件管理 |
| `backend/src/routes/config.ts` | 配置模块 | 站点配置、批量更新 |
| `backend/src/routes/analytics.ts` | 统计模块 | 数据统计、热门分析、访问追踪 |

### 用户子路由文件

| 文件路径 | 功能模块 | 主要接口 |
|----------|----------|----------|
| `backend/src/routes/users/notificationSettings.ts` | 通知设置 | 通知偏好设置、免打扰配置 |
| `backend/src/routes/users/messageSettings.ts` | 私信设置 | 私信偏好设置、陌生人设置 |

---

## 文档一致性改进

### 跨文档一致性检查

本次更新确保了以下文档间的一致性：

1. **版本号一致性**: 所有文档版本号统一为 v1.3.3
2. **日期一致性**: 所有文档更新日期统一为 2026-02-16
3. **API 接口一致性**: API.md 与实际后端路由完全对应
4. **技术栈描述一致性**: 各文档对技术栈的描述保持一致
5. **功能模块描述一致性**: 各文档对功能模块的描述保持一致

### 健康检查接口更新

所有文档中的健康检查示例响应已更新：

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.3.3",
    "timestamp": "2026-02-16T10:00:00.000Z",
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    }
  }
}
```

---

## 技术栈确认

### 前端技术栈

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

### 后端技术栈

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

## 升级指南

### 从 v1.3.2 升级

本次更新仅涉及文档更新，无需执行数据库迁移或代码更新。

1. **更新文档**:
   ```bash
   git pull
   ```

2. **验证版本**:
   检查各文档文件头部的版本号是否为 v1.3.3

---

## 已知限制

### 通知功能
- 浏览器推送功能已移除
- 关注通知类型已移除

### 私信功能
- 不支持消息撤回功能
- 不支持消息编辑功能

### 文件上传
- 最大文件大小：5MB
- 图片支持格式：JPEG、PNG、GIF、WebP

---

## 贡献者

感谢所有为该项目做出贡献的开发者。

---

## 反馈

如有问题或建议，请提交 Issue 或 Pull Request。

---

**版本**: v1.3.3 | **更新日期**: 2026-02-16

# 版本更新日志 v1.3.0

**发布日期**: 2026-02-12  
**版本状态**: 稳定版  
**兼容性**: 向后兼容 v1.2.x

---

## 目录

- [版本概述](#版本概述)
- [新功能](#新功能)
- [功能改进](#功能改进)
- [性能优化](#性能优化)
- [Bug 修复](#bug-修复)
- [安全更新](#安全更新)
- [API 变更](#api-变更)
- [数据库变更](#数据库变更)
- [迁移指南](#迁移指南)
- [已知问题](#已知问题)
- [贡献者](#贡献者)

---

## 版本概述

v1.3.0 是一个重要的功能更新版本，引入了通知系统、私信系统等用户互动功能，同时增强了专栏管理和用户体验。本版本在代码架构和安全性方面也有显著提升。

### 主要亮点

- **通知系统**: 站内通知、通知轮播、通知设置管理
- **私信系统**: 用户间私信、消息撤回、会话管理
- **专栏增强**: 专栏排序、状态管理、统计刷新
- **管理后台**: 系统通知发布、用户状态管理
- **代码架构**: 引入 services 层，优化代码结构

---

## 新功能

### 通知系统

#### 站内通知
- 支持三种通知类型：system（系统）、interaction（互动）、message（私信）
- 通知中心页面，展示所有通知列表
- 未读通知计数显示
- 支持标记单条/全部已读
- 支持删除单条/清空全部通知

#### 通知设置
- 用户可配置接收哪些类型的通知
- 支持免打扰模式设置
- 浏览器推送通知开关

#### 首页通知轮播
- 首页顶部展示重要通知
- 支持多条通知轮播
- 可配置显示优先级和过期时间

### 私信系统

#### 消息发送
- 用户间一对一私信
- 支持文本消息
- 消息状态追踪：sent/delivered/read/recalled

#### 消息管理
- 消息撤回功能（3分钟内）
- 消息编辑重发
- 会话列表展示
- 未读消息计数

#### 附件支持
- 私信支持文件附件
- 附件类型验证
- 附件大小限制

### 专栏系统增强

#### 专栏状态管理
- 新增专栏状态：active（活跃）、hidden（隐藏）、archived（归档）
- 隐藏专栏不在前台展示
- 归档专栏只读，禁止添加新文章

#### 专栏排序
- 支持自定义专栏显示顺序
- 通过 sort_order 字段控制排序

#### 专栏统计刷新
- 新增手动刷新专栏统计 API
- 自动统计文章数、浏览量、点赞数等

### 管理后台增强

#### 系统通知发布
- 管理员可发送系统级通知
- 支持指定目标用户或全体用户

#### 用户管理
- 用户状态管理（active/banned）
- 用户角色管理

---

## 功能改进

### 代码架构

#### 引入 Services 层
- 新增 services 目录，封装业务逻辑
- 分离数据访问和业务逻辑
- 提高代码可维护性和可测试性

#### 路由模块化
- 新增独立路由文件：
  - `notifications.ts` - 通知管理
  - `notificationSettings.ts` - 通知设置
  - `adminNotifications.ts` - 管理员通知
  - `messages.ts` - 私信系统
  - `push.ts` - 浏览器推送

### 文章系统

- 文章支持密码保护
- 阅读进度追踪
- 文章可见性控制（public/private/password）

### 评论系统

- 评论支持 @ 用户
- 评论审核状态管理
- 评论点赞功能

### 用户系统

- 邮箱验证功能
- GitHub OAuth 登录
- 用户资料管理
- 阅读历史记录
- 文章收藏功能

---

## 性能优化

### 数据库优化

- 新增复合索引优化查询性能
- 评论嵌套查询优化
- 全文搜索性能优化

### 缓存策略

- 热点数据缓存
- 通知列表缓存
- 会话列表缓存

---

## Bug 修复

### 文章系统

- 修复文章草稿保存问题
- 修复文章发布时间时区显示
- 修复 Markdown 渲染异常

### 用户系统

- 修复 GitHub OAuth 登录问题
- 修复邮箱验证码发送频率限制
- 修复用户头像上传问题

### 评论系统

- 修复评论嵌套层级显示
- 修复评论点赞数同步

### 专栏系统

- 修复专栏统计数不准确
- 修复专栏文章排序

---

## 安全更新

### 认证安全

- JWT Token 安全增强
- 密码哈希强度提升
- 登录失败限制

### 数据安全

- 敏感字段加密存储
- SQL 注入防护
- XSS 过滤增强

### 访问控制

- 权限校验中间件完善
- API 访问频率限制
- 管理操作审计日志

---

## API 变更

### 新增接口

```
# 通知系统
GET    /api/notifications              # 获取通知列表
PUT    /api/notifications/:id/read     # 标记通知已读
PUT    /api/notifications/read-all     # 标记全部已读
DELETE /api/notifications/:id          # 删除通知
DELETE /api/notifications/clear-all    # 清空通知

# 通知设置
GET    /api/notification-settings      # 获取通知设置
PUT    /api/notification-settings      # 更新通知设置

# 管理员通知
POST   /api/admin/notifications        # 发送系统通知

# 私信系统
GET    /api/messages/conversations           # 获取会话列表
GET    /api/messages/conversations/:userId   # 获取聊天记录
POST   /api/messages                         # 发送私信
PUT    /api/messages/:id                     # 编辑消息
DELETE /api/messages/:id                     # 删除消息
POST   /api/messages/:id/recall              # 撤回消息

# 浏览器推送
POST   /api/push/subscribe             # 订阅推送
POST   /api/push/unsubscribe           # 取消订阅
POST   /api/push/send                  # 发送推送（管理员）

# 专栏统计刷新
POST   /api/columns/:id/refresh-stats  # 刷新专栏统计
```

### 接口变更

```
# 用户资料新增统计字段
GET /api/auth/me
# 新增返回: postCount, commentCount, likeReceivedCount

# 专栏列表新增排序参数
GET /api/columns?sortBy=sort_order&order=asc
```

---

## 数据库变更

### 新增表

```sql
-- 通知表
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('system', 'interaction', 'message')),
  title TEXT NOT NULL,
  content TEXT,
  data TEXT,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知设置表
CREATE TABLE notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  system_notifications BOOLEAN DEFAULT 1,
  interaction_notifications BOOLEAN DEFAULT 1,
  message_notifications BOOLEAN DEFAULT 1,
  push_notifications BOOLEAN DEFAULT 1,
  do_not_disturb BOOLEAN DEFAULT 0,
  do_not_disturb_start TIME,
  do_not_disturb_end TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 私信表
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read', 'recalled')),
  is_edited BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- 私信附件表
CREATE TABLE message_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 浏览器推送订阅表
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 表结构变更

```sql
-- 专栏表新增字段
ALTER TABLE columns ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE columns ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'hidden', 'archived'));

-- 文章表新增字段
ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password'));
ALTER TABLE posts ADD COLUMN password TEXT;
```

### 索引变更

```sql
-- 新增索引
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, sender_id, created_at);
CREATE INDEX idx_columns_order ON columns(sort_order, created_at);
```

---

## 迁移指南

### 从 v1.2.x 迁移到 v1.3.0

#### 1. 备份数据

```bash
# 导出数据库
wrangler d1 execute personal-blog-db --command=".dump" > backup_v1.2.x.sql
```

#### 2. 更新代码

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
cd backend && pnpm install
cd ../frontend && pnpm install
```

#### 3. 执行数据库迁移

```bash
cd backend

# 执行迁移脚本
wrangler d1 execute personal-blog-db --file=./database/migrations/v1.3.0.sql

# 验证迁移结果
wrangler d1 execute personal-blog-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name='notifications';"
```

#### 4. 重新部署

```bash
# 部署后端
cd backend
wrangler deploy

# 部署前端
cd ../frontend
pnpm build
wrangler pages deploy dist
```

#### 5. 验证部署

- 访问 `/health` 检查服务状态
- 测试通知系统功能
- 测试私信功能
- 检查数据库迁移结果

---

## 已知问题

### 当前版本已知问题

1. **通知实时推送**: 当前版本使用轮询方式，WebSocket 支持将在后续版本中实现
2. **大数据量导出**: 文章数量超过 10,000 时，全量导出可能超时

### 问题反馈

如遇到问题，请通过以下方式反馈：

- 提交 [GitHub Issue](https://github.com/Zoroaaa/personal-blog/issues)
- 发送邮件至：zoroasx@gmail.com

---

## 贡献者

感谢以下贡献者为 v1.3.0 版本做出的贡献：

### 核心开发
- [@Zoroaaa](https://github.com/Zoroaaa) - 项目负责人

### 代码贡献
- 感谢社区用户的反馈和建议

---

## 相关资源

- [完整文档](./README.md)
- [部署指南](./DEPLOYMENT.md)
- [API 文档](./API.md)
- [架构文档](./ARCHITECTURE.md)
- [快速开始](./QUICKSTART.md)

---

## 版本历史

| 版本 | 发布日期 | 主要变更 |
|------|----------|----------|
| v1.3.0 | 2026-02-12 | 通知系统、私信系统、专栏增强 |
| v1.2.0 | 2026-02-10 | 专栏系统、邮箱验证、性能优化 |
| v1.1.0 | 2026-01-15 | 评论系统、用户功能、管理后台 |
| v1.0.0 | 2026-01-01 | 初始版本，基础博客功能 |

---

**注意**: 本文档最后更新于 2026-02-12。如需最新信息，请访问项目仓库。

# 更新日志 v1.3.2

**发布日期**: 2026-02-15

本文档记录了个人博客系统 v1.3.2 版本的更新内容。

---

## 版本信息

- **版本号**: v1.3.2
- **发布日期**: 2026-02-15
- **上一版本**: v1.3.1

---

## 数据库架构更新

### 数据库迁移文件变更

本次更新对数据库架构进行了重要调整：

1. **新增迁移文件**:
   - `schema-v1.3-notification-messaging.sql` - 替代原有的 v1.2 版本
   - `migration-v1.3-notification-cleanup.sql` - 通知系统清理迁移
   - `migration-v1.3-remove-password-field.sql` - 密码字段迁移

2. **执行顺序**:
   ```bash
   # 按顺序执行
   wrangler d1 execute personal-blog-db --file=./database/schema-v1.1-base.sql
   wrangler d1 execute personal-blog-db --file=./database/schema-v1.3-notification-messaging.sql
   ```

### 表结构变更

#### 移除的功能

1. **移除浏览器推送订阅功能**:
   - 删除 `push_subscriptions` 表
   - 移除 `notification_settings` 表中的 push 相关字段
   - 移除 `notifications` 表中的 `is_push_sent` 字段

2. **移除关注通知类型**:
   - 从 `notifications` 表的 subtype 枚举中移除 `follow` 类型
   - 移除 `notification_settings` 表中的 follow 相关字段

3. **移除冗余密码字段**:
   - 删除 `posts.password` 字段（明文密码，已弃用）
   - 保留 `posts.password_hash` 字段（bcrypt 加密密码）

#### 新增的表

1. **私信设置表 (message_settings)**:
   ```sql
   CREATE TABLE message_settings (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL UNIQUE,
     email_notification INTEGER DEFAULT 1,
     respect_dnd INTEGER DEFAULT 1,
     allow_strangers INTEGER DEFAULT 1,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **邮件汇总队列表 (email_digest_queue)**:
   ```sql
   CREATE TABLE email_digest_queue (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL,
     notification_id INTEGER NOT NULL,
     digest_type TEXT NOT NULL CHECK(digest_type IN ('daily', 'weekly')),
     scheduled_at DATETIME NOT NULL,
     is_sent INTEGER DEFAULT 0,
     sent_at DATETIME,
     error_message TEXT,
     retry_count INTEGER DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

#### 表结构优化

1. **notifications 表**:
   - 新增 `subtype` 字段，支持更细粒度的通知分类
   - 新增 `read_at`、`deleted_at`、`updated_at` 时间戳字段
   - 新增 `is_in_app_sent`、`is_email_sent`、`is_active` 状态字段
   - 使用 `related_data` 替代 `data` 字段

2. **notification_settings 表**:
   - 重构为更细粒度的设置项
   - 新增系统通知和互动通知的独立设置
   - 新增通知频率设置 (`system_frequency`, `interaction_frequency`)
   - 新增互动子类型开关 (`interaction_comment`, `interaction_like` 等)
   - 新增免打扰时段设置 (`dnd_start`, `dnd_end`, `dnd_timezone`)
   - 新增邮件汇总时间设置 (`digest_daily_time`, `digest_weekly_day`, `digest_weekly_time`)

3. **messages 表**:
   - 字段重命名：`receiver_id` → `recipient_id`
   - 新增 `subject`、`thread_id`、`reply_to_id` 字段
   - 新增 `read_at` 时间戳
   - 新增发送者和接收者独立删除标记 (`sender_deleted`, `recipient_deleted`)

---

## 新增功能

### 1. 邮件汇总服务

新增邮件汇总发送功能，支持每日和每周汇总：

- **每日汇总**: 按用户设定时间发送当日通知汇总
- **每周汇总**: 按用户设定日期和时间发送本周通知汇总
- **批量处理**: 高效处理大量用户的邮件发送
- **失败重试**: 支持发送失败后的重试机制

相关文件：
- `backend/src/services/digestService.ts`

### 2. @提及服务增强

增强评论和私信中的 @提及 功能：

- **智能检测**: 支持用户名和显示名称两种格式
- **通知创建**: 自动为被提及用户创建通知
- **高亮显示**: 将 @提及 转换为可点击链接
- **权限检查**: 检查用户是否开启提及通知

相关文件：
- `backend/src/services/mentionService.ts`

### 3. 免打扰模式

新增免打扰时段设置：

- **时段配置**: 用户可设置免打扰开始和结束时间
- **时区支持**: 支持自定义时区设置
- **智能过滤**: 在免打扰时段内不发送邮件通知

相关文件：
- `backend/src/services/doNotDisturb.ts`

### 4. 富文本编辑器增强

前端富文本编辑器功能增强：

- **@用户功能**: 输入 @ 触发用户选择器
- **表情选择器**: 内置表情面板，快速插入表情
- **图片上传**: 支持拖拽和点击上传图片
- **链接插入**: 快速插入超链接
- **字数统计**: 实时显示内容字数

相关文件：
- `frontend/src/components/RichTextEditor.tsx`

---

## 功能改进

### 通知系统优化

1. **通知分类细化**:
   - 系统通知子类型：maintenance、update、announcement
   - 互动通知子类型：comment、like、favorite、mention、reply

2. **通知设置粒度**:
   - 支持按通知类型独立设置
   - 支持站内通知和邮件通知分开设置
   - 支持实时、每日、每周、关闭四种频率

3. **通知状态追踪**:
   - 记录站内通知发送状态
   - 记录邮件通知发送状态
   - 支持软删除和已读时间戳

### 私信系统优化

1. **会话管理**:
   - 新增 `thread_id` 支持会话分组
   - 新增 `reply_to_id` 支持消息引用

2. **删除机制**:
   - 发送者和接收者可独立删除消息
   - 记录删除时间戳

3. **私信设置**:
   - 支持邮件通知开关
   - 支持是否遵循免打扰设置
   - 支持是否允许陌生人私信

### 安全性增强

1. **密码字段优化**:
   - 移除明文密码字段，仅保留加密后的密码哈希
   - 减少敏感数据暴露风险

2. **数据完整性**:
   - 新增多个外键约束
   - 新增唯一约束防止重复数据

---

## 性能优化

### 数据库索引优化

新增和优化了多个索引：

```sql
-- 通知相关索引
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, deleted_at);
CREATE INDEX idx_notifications_type ON notifications(type);

-- 私信相关索引
CREATE INDEX idx_messages_thread_id ON messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_inbox ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read, created_at DESC);

-- 邮件汇总索引
CREATE INDEX idx_email_digest_queue_scheduled ON email_digest_queue(scheduled_at, is_sent);
CREATE INDEX idx_email_digest_queue_pending ON email_digest_queue(scheduled_at);
```

### 视图优化

新增数据库视图提升查询效率：

```sql
-- 未读消息计数视图
CREATE VIEW vw_unread_messages_count AS
SELECT recipient_id as user_id, COUNT(*) as unread_count
FROM messages
WHERE is_read = 0 AND recipient_deleted = 0
GROUP BY recipient_id;

-- 消息会话视图
CREATE VIEW vw_message_threads AS
SELECT m.*, sender.username as sender_username, ...
FROM messages m
LEFT JOIN users sender ON m.sender_id = sender.id
LEFT JOIN users recipient ON m.recipient_id = recipient.id
WHERE m.id IN (SELECT MAX(id) FROM messages GROUP BY thread_id)
ORDER BY m.created_at DESC;
```

---

## 文档更新

### 更新的文档文件

本次更新对以下五个项目介绍文档进行了全面修订：

1. **README.md** - 项目主文档
   - 更新版本号为 v1.3.2
   - 更新数据库迁移文件路径
   - 更新项目结构说明

2. **QUICKSTART.md** - 快速开始指南
   - 更新版本号为 v1.3.2
   - 更新数据库初始化命令
   - 更新项目结构速览

3. **DEPLOYMENT.md** - 部署指南
   - 更新版本号为 v1.3.2
   - 更新数据库迁移步骤
   - 更新数据库表列表

4. **ARCHITECTURE.md** - 架构文档
   - 更新版本号为 v1.3.2
   - 更新数据模型（通知表、私信表、新增表）
   - 更新表结构说明

5. **API.md** - API 文档
   - 更新版本号为 v1.3.2
   - 更新健康检查接口版本

---

## 升级指南

### 从 v1.3.1 升级

1. **备份数据库**:
   ```bash
   wrangler d1 export personal-blog-db --output backup_v1.3.1.sql
   ```

2. **更新代码**:
   ```bash
   git pull
   cd backend && pnpm install
   cd ../frontend && pnpm install
   ```

3. **执行数据库迁移**（如果是全新部署）:
   ```bash
   cd backend
   wrangler d1 execute personal-blog-db --file=./database/schema-v1.1-base.sql
   wrangler d1 execute personal-blog-db --file=./database/schema-v1.3-notification-messaging.sql
   ```

4. **如果是升级现有数据库**:
   ```bash
   cd backend
   # 执行清理迁移（移除推送功能）
   wrangler d1 execute personal-blog-db --file=./database/migration-v1.3-notification-cleanup.sql
   # 执行密码字段迁移
   wrangler d1 execute personal-blog-db --file=./database/migration-v1.3-remove-password-field.sql
   ```

5. **重新部署**:
   ```bash
   cd backend && wrangler deploy
   cd ../frontend && pnpm build && wrangler pages deploy dist
   ```

---

## 已知限制

### 通知功能
- 浏览器推送功能已移除，后续版本将考虑重新实现
- 关注通知类型已移除

### 私信功能
- 不支持消息撤回功能
- 不支持消息编辑功能

### 文件上传
- 最大文件大小：5MB
- 仅支持图片格式（JPEG、PNG、GIF、WebP）

---

## 贡献者

感谢所有为该项目做出贡献的开发者。

---

## 反馈

如有问题或建议，请提交 Issue 或 Pull Request。

---

**版本**: v1.3.2 | **更新日期**: 2026-02-15

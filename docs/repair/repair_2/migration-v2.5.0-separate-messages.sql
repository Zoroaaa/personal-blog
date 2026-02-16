-- =============================================
-- 方案A：私信独立系统 - 数据库迁移脚本
-- 版本: v2.5.0
-- 日期: 2026-02-13
-- 描述: 将私信从通知系统中完全分离
-- =============================================

-- ============= 步骤1：备份现有私信通知数据（可选） =============

-- 创建备份表（如果需要保留历史记录）
CREATE TABLE IF NOT EXISTS notifications_backup_private_message AS
SELECT * FROM notifications WHERE type = 'private_message';

-- ============= 步骤2：删除私信相关的通知记录 =============

-- 删除所有私信类型的通知
DELETE FROM notifications WHERE type = 'private_message';

-- ============= 步骤3：删除私信通知触发器 =============

-- 删除自动创建私信通知的触发器
DROP TRIGGER IF EXISTS trg_messages_create_notification;

-- ============= 步骤4：更新 notifications 表约束 =============

-- 删除旧的类型约束
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_type;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 添加新的类型约束（移除 private_message）
-- SQLite 不支持直接修改约束，需要重建表

-- 创建新表结构
CREATE TABLE IF NOT EXISTS notifications_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- 通知类型（只保留 system 和 interaction）
    type TEXT NOT NULL CHECK(type IN ('system', 'interaction')),
    
    -- 子类型
    subtype TEXT CHECK(subtype IN (
        'maintenance', 'update', 'announcement',  -- 系统子类型
        'comment', 'like', 'favorite', 'mention', 'follow', 'reply'  -- 互动子类型
    )),
    
    -- 通知内容
    title TEXT NOT NULL,
    content TEXT,
    related_data TEXT,
    
    -- 移除 message_id 列（不再需要）
    
    -- 用户状态
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    deleted_at DATETIME,
    
    -- 发送状态
    is_in_app_sent INTEGER DEFAULT 1,
    is_email_sent INTEGER DEFAULT 0,
    is_push_sent INTEGER DEFAULT 0,
    
    -- 系统通知状态
    is_active INTEGER DEFAULT 1,
    
    -- 时间
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 迁移数据（只迁移非私信的通知）
INSERT INTO notifications_new (
    id, user_id, type, subtype, title, content, related_data,
    is_read, read_at, deleted_at,
    is_in_app_sent, is_email_sent, is_push_sent, is_active,
    created_at, updated_at
)
SELECT 
    id, user_id, type, subtype, title, content, related_data,
    is_read, read_at, deleted_at,
    is_in_app_sent, is_email_sent, is_push_sent, is_active,
    created_at, updated_at
FROM notifications
WHERE type != 'private_message';

-- 删除旧表，重命名新表
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

-- 重建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, deleted_at) 
WHERE is_read = 0 AND deleted_at IS NULL;

-- ============= 步骤5：更新 notification_settings 表 =============

-- 删除私信相关的设置列
-- SQLite 不支持 DROP COLUMN，需要重建表

CREATE TABLE IF NOT EXISTS notification_settings_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    
    -- 系统通知设置
    system_in_app INTEGER DEFAULT 1,
    system_email INTEGER DEFAULT 1,
    system_push INTEGER DEFAULT 1,
    system_frequency TEXT DEFAULT 'realtime' CHECK(system_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    -- 互动通知设置
    interaction_in_app INTEGER DEFAULT 1,
    interaction_email INTEGER DEFAULT 1,
    interaction_push INTEGER DEFAULT 1,
    interaction_frequency TEXT DEFAULT 'realtime' CHECK(interaction_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    -- 互动子类型开关
    interaction_comment INTEGER DEFAULT 1,
    interaction_like INTEGER DEFAULT 1,
    interaction_favorite INTEGER DEFAULT 1,
    interaction_mention INTEGER DEFAULT 1,
    interaction_follow INTEGER DEFAULT 1,
    interaction_reply INTEGER DEFAULT 1,
    
    -- 移除私信设置列
    -- private_message_in_app
    -- private_message_email
    -- private_message_push
    -- private_message_frequency
    
    -- 免打扰设置
    dnd_enabled INTEGER DEFAULT 0,
    dnd_start TEXT DEFAULT '22:00',
    dnd_end TEXT DEFAULT '08:00',
    dnd_timezone TEXT DEFAULT 'Asia/Shanghai',
    
    -- 汇总时间设置
    digest_daily_time TEXT DEFAULT '08:00',
    digest_weekly_day INTEGER DEFAULT 1,
    digest_weekly_time TEXT DEFAULT '09:00',
    
    -- 审计字段
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 迁移数据
INSERT INTO notification_settings_new (
    id, user_id,
    system_in_app, system_email, system_push, system_frequency,
    interaction_in_app, interaction_email, interaction_push, interaction_frequency,
    interaction_comment, interaction_like, interaction_favorite,
    interaction_mention, interaction_follow, interaction_reply,
    dnd_enabled, dnd_start, dnd_end, dnd_timezone,
    digest_daily_time, digest_weekly_day, digest_weekly_time,
    created_at, updated_at
)
SELECT 
    id, user_id,
    system_in_app, system_email, system_push, system_frequency,
    interaction_in_app, interaction_email, interaction_push, interaction_frequency,
    interaction_comment, interaction_like, interaction_favorite,
    interaction_mention, interaction_follow, interaction_reply,
    dnd_enabled, dnd_start, dnd_end, dnd_timezone,
    digest_daily_time, digest_weekly_day, digest_weekly_time,
    created_at, updated_at
FROM notification_settings;

-- 删除旧表，重命名新表
DROP TABLE notification_settings;
ALTER TABLE notification_settings_new RENAME TO notification_settings;

-- 重建索引和触发器
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

CREATE TRIGGER IF NOT EXISTS trg_notification_settings_update_timestamp
AFTER UPDATE ON notification_settings
FOR EACH ROW
BEGIN
    UPDATE notification_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============= 步骤6：创建独立的私信设置表（可选） =============

CREATE TABLE IF NOT EXISTS message_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    
    -- 私信邮件通知
    email_notification INTEGER DEFAULT 1,
    
    -- 私信推送通知
    push_notification INTEGER DEFAULT 1,
    
    -- 是否遵守免打扰设置
    respect_dnd INTEGER DEFAULT 1,
    
    -- 是否允许陌生人发私信
    allow_strangers INTEGER DEFAULT 1,
    
    -- 审计字段
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_settings_user_id ON message_settings(user_id);

CREATE TRIGGER IF NOT EXISTS trg_message_settings_update_timestamp
AFTER UPDATE ON message_settings
FOR EACH ROW
BEGIN
    UPDATE message_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 为现有用户初始化私信设置
INSERT INTO message_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM message_settings);

-- ============= 步骤7：清理 email_digest_queue 中的私信记录（如果存在） =============

-- 删除私信相关的汇总队列记录
DELETE FROM email_digest_queue 
WHERE notification_id IN (
    SELECT id FROM notifications_backup_private_message
);

-- ============= 步骤8：更新版本记录 =============

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.5.0', 'Separated messages system from notifications - Messages are now completely independent');

-- ============= 步骤9：验证数据完整性 =============

-- 检查是否还有私信类型的通知
SELECT COUNT(*) as remaining_message_notifications 
FROM notifications 
WHERE type = 'private_message';
-- 应该返回 0

-- 检查是否所有用户都有私信设置
SELECT COUNT(*) as users_without_message_settings
FROM users 
WHERE id NOT IN (SELECT user_id FROM message_settings);
-- 应该返回 0

-- 检查通知类型分布
SELECT type, COUNT(*) as count 
FROM notifications 
GROUP BY type;
-- 应该只显示 system 和 interaction

-- ============= 完成提示 =============

-- 迁移完成！
-- 
-- 下一步：
-- 1. 更新后端代码移除 private_message 类型
-- 2. 更新前端移除通知中心的私信tab
-- 3. 添加独立的私信图标到Header
-- 4. 测试私信功能独立运行
--
-- 如果需要回滚，可以从 notifications_backup_private_message 恢复数据

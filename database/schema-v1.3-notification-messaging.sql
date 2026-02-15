-- =============================================
-- Personal Blog System - 通知与私信管理数据库
-- =============================================
-- 版本: v1.3
-- 描述: 包含通知管理与私信管理功能相关的数据库表结构及初始化脚本
-- 
-- 变更说明 (v1.3):
-- - 移除浏览器推送功能 (push_subscriptions 表)
-- - 移除关注通知类型 (follow subtype)
-- - 移除 notification_settings 中的 push 和 follow 字段
-- - 移除 notifications 中的 is_push_sent 字段
-- - 简化 notifications subtype 枚举
-- - 移除 message_settings 中的 push_notification 字段
--
-- 重要说明: 
-- 系统初始化时必须同时执行 v1.1 和 v1.3 版本的数据库文件
-- 执行顺序: 先执行 v1.1，再执行 v1.3
-- 前置依赖: 需要先执行 schema-v1.1-base.sql
-- =============================================

-- ============= 通知表 =============

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('system', 'interaction')),
    subtype TEXT CHECK(subtype IN (
        'maintenance', 'update', 'announcement',
        'comment', 'like', 'favorite', 'mention', 'reply'
    )),
    title TEXT NOT NULL,
    content TEXT,
    related_data TEXT,
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    deleted_at DATETIME,
    is_in_app_sent INTEGER DEFAULT 1,
    is_email_sent INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, deleted_at) WHERE is_read = 0 AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(id) WHERE deleted_at IS NULL;

-- ============= 通知设置表 =============

CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    
    system_in_app INTEGER DEFAULT 1,
    system_email INTEGER DEFAULT 1,
    system_frequency TEXT DEFAULT 'realtime' CHECK(system_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    interaction_in_app INTEGER DEFAULT 1,
    interaction_email INTEGER DEFAULT 1,
    interaction_frequency TEXT DEFAULT 'realtime' CHECK(interaction_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    interaction_comment INTEGER DEFAULT 1,
    interaction_like INTEGER DEFAULT 1,
    interaction_favorite INTEGER DEFAULT 1,
    interaction_mention INTEGER DEFAULT 1,
    interaction_reply INTEGER DEFAULT 1,
    
    dnd_enabled INTEGER DEFAULT 0,
    dnd_start TEXT DEFAULT '22:00',
    dnd_end TEXT DEFAULT '08:00',
    dnd_timezone TEXT DEFAULT 'Asia/Shanghai',
    
    digest_daily_time TEXT DEFAULT '08:00',
    digest_weekly_day INTEGER DEFAULT 1,
    digest_weekly_time TEXT DEFAULT '09:00',
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

CREATE TRIGGER IF NOT EXISTS trg_notification_settings_update_timestamp
AFTER UPDATE ON notification_settings
FOR EACH ROW
BEGIN
    UPDATE notification_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============= 私信消息表 =============

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    thread_id TEXT,
    reply_to_id INTEGER,
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    is_recalled INTEGER DEFAULT 0,
    recalled_at DATETIME,
    message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'attachment', 'mixed')),
    attachment_url TEXT,
    attachment_filename TEXT,
    attachment_size INTEGER,
    attachment_mime_type TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_outbox ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read, created_at DESC) WHERE is_read = 0;
CREATE INDEX IF NOT EXISTS idx_messages_recalled ON messages(is_recalled, recalled_at) WHERE is_recalled = 1;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- ============= 私信设置表 =============

CREATE TABLE IF NOT EXISTS message_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    
    email_notification INTEGER DEFAULT 1,
    respect_dnd INTEGER DEFAULT 1,
    allow_strangers INTEGER DEFAULT 1,
    
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

-- ============= 邮件汇总队列表 =============

CREATE TABLE IF NOT EXISTS email_digest_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_id INTEGER NOT NULL,
    digest_type TEXT NOT NULL CHECK(digest_type IN ('daily', 'weekly')),
    scheduled_at DATETIME NOT NULL,
    is_sent INTEGER DEFAULT 0,
    sent_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    UNIQUE(user_id, notification_id, digest_type)
);

CREATE INDEX IF NOT EXISTS idx_email_digest_queue_user_id ON email_digest_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_scheduled ON email_digest_queue(scheduled_at, is_sent);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_pending ON email_digest_queue(scheduled_at) WHERE is_sent = 0 AND scheduled_at <= datetime('now');

-- ============= 视图 =============

CREATE VIEW IF NOT EXISTS vw_unread_messages_count AS
SELECT 
    recipient_id as user_id,
    COUNT(*) as unread_count
FROM messages
WHERE is_read = 0 AND is_recalled = 0
GROUP BY recipient_id;

CREATE VIEW IF NOT EXISTS vw_message_threads AS
SELECT 
    m.*,
    sender.username as sender_username,
    sender.display_name as sender_name,
    sender.avatar_url as sender_avatar,
    recipient.username as recipient_username,
    recipient.display_name as recipient_name,
    recipient.avatar_url as recipient_avatar
FROM messages m
LEFT JOIN users sender ON m.sender_id = sender.id
LEFT JOIN users recipient ON m.recipient_id = recipient.id
WHERE m.id IN (
    SELECT MAX(id) 
    FROM messages 
    GROUP BY thread_id
)
ORDER BY m.created_at DESC;

-- ============= 为现有用户初始化通知设置和私信设置 =============

INSERT OR IGNORE INTO notification_settings (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM notification_settings);

INSERT OR IGNORE INTO message_settings (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM message_settings);

-- ============= 版本记录 =============

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('1.3.0', 'Notification and messaging system v1.3: removed push notifications, removed follow notification type, simplified notification subtypes');

-- =============================================
-- v1.3 通知与私信管理数据库初始化完成
-- 
-- 系统初始化完成！
-- v1.1 + v1.3 共同构成完整的数据库结构
-- =============================================

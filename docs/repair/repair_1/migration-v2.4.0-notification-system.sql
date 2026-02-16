-- =============================================
-- 通知系统完整化迁移脚本
-- 版本: v2.4.0
-- 日期: 2026-02-13
-- 描述: 添加通知设置、私信、推送订阅等完整功能支持
-- =============================================

-- ============= 1. 通知设置表 =============

CREATE TABLE IF NOT EXISTS notification_settings (
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
    
    -- 私信设置
    private_message_in_app INTEGER DEFAULT 1,
    private_message_email INTEGER DEFAULT 1,
    private_message_push INTEGER DEFAULT 1,
    private_message_frequency TEXT DEFAULT 'realtime' CHECK(private_message_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    -- 免打扰设置
    dnd_enabled INTEGER DEFAULT 0,
    dnd_start TEXT DEFAULT '22:00',  -- HH:mm 格式
    dnd_end TEXT DEFAULT '08:00',
    dnd_timezone TEXT DEFAULT 'Asia/Shanghai',
    
    -- 汇总时间设置
    digest_daily_time TEXT DEFAULT '08:00',  -- HH:mm 格式
    digest_weekly_day INTEGER DEFAULT 1,  -- 0=周日, 1=周一, ..., 6=周六
    digest_weekly_time TEXT DEFAULT '09:00',
    
    -- 审计字段
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- 触发器：自动更新 updated_at
CREATE TRIGGER IF NOT EXISTS trg_notification_settings_update_timestamp
AFTER UPDATE ON notification_settings
FOR EACH ROW
BEGIN
    UPDATE notification_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============= 2. 私信消息表 =============

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 发送者和接收者
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    
    -- 消息内容
    subject TEXT,  -- 消息主题（可选）
    content TEXT NOT NULL,
    
    -- 会话线程（用于分组对话）
    thread_id TEXT,  -- 格式：min(user1_id, user2_id)-max(user1_id, user2_id)
    
    -- 引用消息（回复功能）
    reply_to_id INTEGER,
    
    -- 状态
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    
    -- 软删除（发送者删除 vs 接收者删除）
    sender_deleted INTEGER DEFAULT 0,
    sender_deleted_at DATETIME,
    recipient_deleted INTEGER DEFAULT 0,
    recipient_deleted_at DATETIME,
    
    -- 时间
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 收件箱查询优化（接收者未删除的消息）
CREATE INDEX IF NOT EXISTS idx_messages_inbox 
ON messages(recipient_id, created_at DESC) 
WHERE recipient_deleted = 0;

-- 发件箱查询优化（发送者未删除的消息）
CREATE INDEX IF NOT EXISTS idx_messages_outbox 
ON messages(sender_id, created_at DESC) 
WHERE sender_deleted = 0;

-- 未读消息查询优化
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(recipient_id, is_read, created_at DESC) 
WHERE is_read = 0 AND recipient_deleted = 0;

-- ============= 3. 推送订阅表 =============

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Web Push 订阅信息
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,  -- 公钥
    auth TEXT NOT NULL,    -- 认证密钥
    
    -- 设备信息
    user_agent TEXT,
    platform TEXT,  -- 'web', 'android', 'ios'
    device_name TEXT,
    
    -- 状态
    is_active INTEGER DEFAULT 1,
    
    -- 时间
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,  -- 订阅过期时间
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, is_active) 
WHERE is_active = 1;

-- ============= 4. 邮件汇总队列表 =============

CREATE TABLE IF NOT EXISTS email_digest_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_id INTEGER NOT NULL,
    
    -- 汇总类型
    digest_type TEXT NOT NULL CHECK(digest_type IN ('daily', 'weekly')),
    
    -- 调度时间
    scheduled_at DATETIME NOT NULL,
    
    -- 发送状态
    is_sent INTEGER DEFAULT 0,
    sent_at DATETIME,
    
    -- 错误信息
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- 时间
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    UNIQUE(user_id, notification_id, digest_type)
);

CREATE INDEX IF NOT EXISTS idx_email_digest_queue_user_id ON email_digest_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_scheduled ON email_digest_queue(scheduled_at, is_sent);
CREATE INDEX IF NOT EXISTS idx_email_digest_queue_pending 
ON email_digest_queue(scheduled_at) 
WHERE is_sent = 0 AND scheduled_at <= datetime('now');

-- ============= 5. 更新 notifications 表 =============

-- 添加缺失的列（如果不存在）
ALTER TABLE notifications ADD COLUMN is_in_app_sent INTEGER DEFAULT 1;
ALTER TABLE notifications ADD COLUMN is_email_sent INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN is_push_sent INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN message_id INTEGER;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_notifications_message_id ON notifications(message_id);

-- ============= 6. 为所有现有用户创建默认通知设置 =============

INSERT OR IGNORE INTO notification_settings (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM notification_settings);

-- ============= 7. 创建辅助函数视图 =============

-- 未读私信统计视图
CREATE VIEW IF NOT EXISTS vw_unread_messages_count AS
SELECT 
    recipient_id as user_id,
    COUNT(*) as unread_count
FROM messages
WHERE is_read = 0 AND recipient_deleted = 0
GROUP BY recipient_id;

-- 会话列表视图（最新消息）
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

-- ============= 8. 创建触发器：私信自动创建通知 =============

CREATE TRIGGER IF NOT EXISTS trg_messages_create_notification
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    -- 为接收者创建私信通知
    INSERT INTO notifications (
        user_id, 
        type, 
        subtype, 
        title, 
        content, 
        message_id,
        related_data,
        created_at
    )
    SELECT 
        NEW.recipient_id,
        'private_message',
        'private_message',
        (SELECT display_name || ' 给你发送了私信' FROM users WHERE id = NEW.sender_id),
        CASE 
            WHEN LENGTH(NEW.content) > 100 THEN SUBSTR(NEW.content, 1, 100) || '...'
            ELSE NEW.content
        END,
        NEW.id,
        json_object(
            'messageId', NEW.id,
            'senderId', NEW.sender_id,
            'senderName', (SELECT display_name FROM users WHERE id = NEW.sender_id),
            'senderAvatar', (SELECT avatar_url FROM users WHERE id = NEW.sender_id),
            'subject', NEW.subject,
            'threadId', NEW.thread_id
        ),
        CURRENT_TIMESTAMP;
END;

-- ============= 9. 记录版本信息 =============

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.4.0', 'Added complete notification system: settings, private messages, push subscriptions, email digest queue');

-- ============= 10. 数据完整性检查 =============

-- 检查通知表中是否有孤立的 message_id
SELECT COUNT(*) as orphaned_notifications
FROM notifications n
WHERE n.message_id IS NOT NULL 
AND n.message_id NOT IN (SELECT id FROM messages);

-- 检查是否所有用户都有通知设置
SELECT COUNT(*) as users_without_settings
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM notification_settings);

-- =============================================
-- 迁移完成提示
-- =============================================

-- 执行此脚本后，请执行以下验证：
-- 1. SELECT * FROM notification_settings LIMIT 5;
-- 2. SELECT * FROM messages LIMIT 5;
-- 3. SELECT * FROM push_subscriptions LIMIT 5;
-- 4. SELECT * FROM email_digest_queue LIMIT 5;
-- 5. SELECT version, description, applied_at FROM schema_version ORDER BY applied_at DESC LIMIT 1;

-- 如果所有查询都成功返回，说明迁移完成！

-- =============================================
-- Personal Blog System - 1.2.0 新增功能数据库Schema
-- =============================================
-- 版本: 1.2.0
-- 功能: 私信系统 + 通知系统
-- 说明: 此文件只包含1.2.0新增功能，需在1.0.0基础上执行
-- =============================================

-- ============= 私信表 =============

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 发送者和接收者
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    
    -- 消息内容
    content TEXT NOT NULL,
    
    -- 消息状态
    is_read INTEGER NOT NULL DEFAULT 0,  -- 0: 未读, 1: 已读
    
    -- 撤回状态
    is_recalled INTEGER NOT NULL DEFAULT 0,  -- 0: 正常, 1: 已撤回
    recalled_at DATETIME,  -- 撤回时间
    
    -- 附件标记
    has_attachments INTEGER NOT NULL DEFAULT 0,
    
    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,  -- 阅读时间
    
    -- 外键约束
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 私信表索引
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_recalled ON messages(is_recalled);

-- 复合索引：获取用户的私信会话列表
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(sender_id, receiver_id, created_at DESC);

-- 复合索引：获取未读消息数
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(receiver_id, is_read) 
WHERE is_read = 0;

-- ============= 消息附件表 =============

CREATE TABLE IF NOT EXISTS message_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 关联的消息ID
    message_id INTEGER NOT NULL,
    
    -- 附件信息
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,  -- 'image', 'file'
    file_size INTEGER,        -- 文件大小（字节）
    
    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 附件表索引
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
ON message_attachments(message_id);

-- ============= 通知表 =============

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 接收者
    user_id INTEGER NOT NULL,
    
    -- 通知类型
    type TEXT NOT NULL CHECK(type IN ('system', 'interaction', 'private_message')),
    subtype TEXT CHECK(subtype IN (
        'maintenance', 'update', 'announcement',  -- 系统子类型
        'comment', 'like', 'favorite', 'mention', 'follow', 'reply',  -- 互动子类型
        'private_message'  -- 私信
    )),
    
    -- 通知内容
    title TEXT NOT NULL,
    content TEXT,
    
    -- 关联数据（JSON格式）
    -- 示例: {"postId": 123, "commentId": 456, "senderId": 789, "senderName": "张三"}
    related_data TEXT,
    
    -- 关联私信ID（如果是私信通知）
    message_id INTEGER,
    
    -- 渠道发送状态
    is_in_app_sent INTEGER DEFAULT 1,      -- 站内通知已发送
    is_email_sent INTEGER DEFAULT 0,       -- 邮件已发送
    is_push_sent INTEGER DEFAULT 0,        -- 推送已发送
    
    -- 用户状态
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    is_deleted INTEGER DEFAULT 0,
    deleted_at DATETIME,
    
    -- 系统通知状态（用于首页轮播等系统公告）
    is_active INTEGER DEFAULT 1,           -- 是否启用（仅系统通知使用）
    
    -- 时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    
    -- 外键
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 通知表索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- 未读通知查询优化
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, is_read, is_deleted) 
WHERE is_read = 0 AND is_deleted = 0;

-- 系统通知查询优化
CREATE INDEX IF NOT EXISTS idx_notifications_system_active 
ON notifications(type, subtype, is_active) 
WHERE type = 'system' AND subtype = 'announcement';

-- ============= 用户通知设置表 =============

CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    
    -- ===== 系统通知设置 =====
    system_in_app INTEGER DEFAULT 1 CHECK(system_in_app IN (0, 1)),
    system_email INTEGER DEFAULT 1 CHECK(system_email IN (0, 1)),
    system_push INTEGER DEFAULT 0 CHECK(system_push IN (0, 1)),
    system_frequency TEXT DEFAULT 'realtime' 
        CHECK(system_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    -- ===== 互动通知设置 =====
    interaction_in_app INTEGER DEFAULT 1 CHECK(interaction_in_app IN (0, 1)),
    interaction_email INTEGER DEFAULT 0 CHECK(interaction_email IN (0, 1)),
    interaction_push INTEGER DEFAULT 1 CHECK(interaction_push IN (0, 1)),
    interaction_frequency TEXT DEFAULT 'realtime'
        CHECK(interaction_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    -- 互动子类型细粒度设置（JSON格式）
    -- {"comment": true, "like": true, "favorite": false, "mention": true}
    interaction_subtypes TEXT DEFAULT '{"comment":true,"like":true,"favorite":true,"mention":true,"follow":true,"reply":true}',
    
    -- ===== 私信通知设置 =====
    private_message_in_app INTEGER DEFAULT 1 CHECK(private_message_in_app IN (0, 1)),
    private_message_email INTEGER DEFAULT 0 CHECK(private_message_email IN (0, 1)),
    private_message_push INTEGER DEFAULT 1 CHECK(private_message_push IN (0, 1)),
    private_message_frequency TEXT DEFAULT 'realtime'
        CHECK(private_message_frequency IN ('realtime', 'daily', 'weekly', 'off')),
    
    -- ===== 免打扰设置 =====
    do_not_disturb_enabled INTEGER DEFAULT 0 CHECK(do_not_disturb_enabled IN (0, 1)),
    do_not_disturb_start TIME,           -- 例如: 22:00
    do_not_disturb_end TIME,             -- 例如: 08:00
    do_not_disturb_timezone TEXT DEFAULT 'Asia/Shanghai',
    
    -- ===== 汇总邮件时间设置 =====
    daily_digest_time TIME DEFAULT '09:00',
    weekly_digest_day INTEGER DEFAULT 1 CHECK(weekly_digest_day BETWEEN 0 AND 6),  -- 0=周日, 1=周一
    weekly_digest_time TIME DEFAULT '09:00',
    
    -- 时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- ============= 浏览器推送订阅表 =============

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- 推送订阅信息
    endpoint TEXT NOT NULL,              -- 推送服务端点
    p256dh TEXT NOT NULL,                -- P-256 ECDH公钥
    auth TEXT NOT NULL,                  -- 认证密钥
    
    -- 设备和浏览器信息
    user_agent TEXT,
    platform TEXT,                       -- 平台: web/mobile/desktop
    
    -- 状态
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    
    -- 时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    
    -- 外键
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 推送订阅表索引
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, is_active) WHERE is_active = 1;

-- ============= 邮件汇总队列表 =============

-- 用于存储待发送的汇总邮件通知
CREATE TABLE IF NOT EXISTS email_digest_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_id INTEGER NOT NULL,    -- 关联的通知ID
    digest_type TEXT NOT NULL CHECK(digest_type IN ('daily', 'weekly')),
    scheduled_at DATETIME NOT NULL,      -- 计划发送时间
    is_sent INTEGER DEFAULT 0,
    sent_at DATETIME,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_digest_queue_scheduled ON email_digest_queue(scheduled_at, is_sent) WHERE is_sent = 0;

-- ============= 视图：私信会话视图 =============

CREATE VIEW IF NOT EXISTS vw_user_conversations AS 
WITH conversation_partners AS ( 
    -- 所有发送者-接收者对话
    SELECT 
        sender_id,
        receiver_id,
        MAX(created_at) AS last_message_at 
    FROM messages 
    GROUP BY 
        CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END,
        CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END
), 
latest_messages AS ( 
    SELECT 
        m.*, 
        CASE 
            WHEN m.sender_id < m.receiver_id 
            THEN m.sender_id || '_' || m.receiver_id 
            ELSE m.receiver_id || '_' || m.sender_id 
        END AS conversation_id 
    FROM messages m 
) 
SELECT 
    lm.*,
    s.username AS sender_username,
    s.display_name AS sender_display_name,
    s.avatar_url AS sender_avatar_url,
    r.username AS receiver_username,
    r.display_name AS receiver_display_name,
    r.avatar_url AS receiver_avatar_url
FROM latest_messages lm
JOIN users s ON lm.sender_id = s.id
JOIN users r ON lm.receiver_id = r.id;

-- ============= 视图：私信详情视图 =============

CREATE VIEW IF NOT EXISTS vw_messages_detailed AS
SELECT 
    m.*,
    s.username AS sender_username,
    s.display_name AS sender_display_name,
    s.avatar_url AS sender_avatar_url,
    r.username AS receiver_username,
    r.display_name AS receiver_display_name,
    r.avatar_url AS receiver_avatar_url
FROM messages m
JOIN users s ON m.sender_id = s.id
JOIN users r ON m.receiver_id = r.id;

-- ============= 视图：通知详情视图 =============

CREATE VIEW IF NOT EXISTS vw_notifications_detailed AS
SELECT 
    n.*,
    u.username as user_username,
    u.display_name as user_display_name,
    u.email as user_email
FROM notifications n
JOIN users u ON n.user_id = u.id;

-- ============= 触发器：私信阅读时间自动更新 =============

CREATE TRIGGER IF NOT EXISTS trg_messages_mark_read
AFTER UPDATE OF is_read ON messages
FOR EACH ROW
WHEN NEW.is_read = 1 AND OLD.is_read = 0
BEGIN
    UPDATE messages 
    SET read_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ============= 触发器：通知设置自动更新updated_at =============

CREATE TRIGGER IF NOT EXISTS trg_notification_settings_update_timestamp
AFTER UPDATE ON notification_settings
FOR EACH ROW
BEGIN
    UPDATE notification_settings 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ============= 触发器：用户注册时自动创建设置记录 =============

CREATE TRIGGER IF NOT EXISTS trg_users_create_notification_settings
AFTER INSERT ON users
BEGIN
    INSERT INTO notification_settings (user_id) VALUES (NEW.id);
END;

-- ============= 数据库版本更新 =============

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('1.2.0', 'Added messaging and notification systems');

-- =============================================
-- 1.2.0 Schema 创建完成
-- =============================================
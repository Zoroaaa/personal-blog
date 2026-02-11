-- =============================================
-- 私信功能数据库Schema
-- =============================================
-- 版本: 1.0.0
-- 功能: 用户私信系统
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
    is_deleted_by_sender INTEGER NOT NULL DEFAULT 0,  -- 发送者是否删除
    is_deleted_by_receiver INTEGER NOT NULL DEFAULT 0,  -- 接收者是否删除
    
    -- 关联消息（用于回复）
    parent_id INTEGER,  -- 回复的消息ID
    
    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,  -- 阅读时间
    
    -- 外键约束
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 私信表索引
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- 复合索引：获取用户的私信会话列表（按对话对方分组，取最新消息）
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(sender_id, receiver_id, created_at DESC);

-- 复合索引：获取未读消息数
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(receiver_id, is_read) 
WHERE is_read = 0 AND is_deleted_by_receiver = 0;

-- ============= 会话视图 =============
-- 获取用户所有对话的最新消息
CREATE VIEW IF NOT EXISTS vw_user_conversations AS
WITH conversation_partners AS (
    -- 用户作为发送者的对话
    SELECT 
        receiver_id AS partner_id,
        MAX(created_at) AS last_message_at
    FROM messages
    WHERE is_deleted_by_sender = 0
    GROUP BY receiver_id
    
    UNION
    
    -- 用户作为接收者的对话
    SELECT 
        sender_id AS partner_id,
        MAX(created_at) AS last_message_at
    FROM messages
    WHERE is_deleted_by_receiver = 0
    GROUP BY sender_id
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
    WHERE (m.is_deleted_by_sender = 0 AND m.is_deleted_by_receiver = 0)
)
SELECT 
    lm.*,
    u.username AS sender_username,
    u.display_name AS sender_display_name,
    u.avatar_url AS sender_avatar_url,
    ru.username AS receiver_username,
    ru.display_name AS receiver_display_name,
    ru.avatar_url AS receiver_avatar_url
FROM latest_messages lm
JOIN users u ON lm.sender_id = u.id
JOIN users ru ON lm.receiver_id = ru.id;

-- ============= 私信详情视图 =============
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

-- ============= 触发器：自动更新阅读时间 =============
CREATE TRIGGER IF NOT EXISTS trg_messages_mark_read
AFTER UPDATE OF is_read ON messages
FOR EACH ROW
WHEN NEW.is_read = 1 AND OLD.is_read = 0
BEGIN
    UPDATE messages 
    SET read_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ============= 数据库版本更新 =============
INSERT OR REPLACE INTO schema_version (version, description) VALUES
('1.2.0', 'Added private messaging system');

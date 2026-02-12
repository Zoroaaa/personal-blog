-- =============================================
-- Personal Blog System - 1.2.0 功能清理脚本
-- =============================================
-- 版本: 1.2.0
-- 功能: 删除1.2.0新增的所有表、视图、索引、触发器
-- 警告: 此操作会永久删除数据，请谨慎使用！
-- =============================================

-- =============================================
-- 第一部分：删除触发器
-- =============================================

-- 删除私信相关触发器
DROP TRIGGER IF EXISTS trg_messages_mark_read;

-- 删除通知相关触发器
DROP TRIGGER IF EXISTS trg_notification_settings_update_timestamp;
DROP TRIGGER IF EXISTS trg_users_create_notification_settings;

-- =============================================
-- 第二部分：删除视图
-- =============================================

-- 删除私信相关视图
DROP VIEW IF EXISTS vw_user_conversations;
DROP VIEW IF EXISTS vw_messages_detailed;

-- 删除通知相关视图
DROP VIEW IF EXISTS vw_notifications_detailed;

-- =============================================
-- 第三部分：删除索引
-- =============================================

-- 删除私信表索引
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_receiver_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_is_read;
DROP INDEX IF EXISTS idx_messages_is_recalled;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_unread;

-- 删除消息附件表索引
DROP INDEX IF EXISTS idx_message_attachments_message_id;

-- 删除通知表索引
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_user_read;
DROP INDEX IF EXISTS idx_notifications_user_type;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_user_created;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_notifications_system_active;

-- 删除用户通知设置表索引
DROP INDEX IF EXISTS idx_notification_settings_user_id;

-- 删除推送订阅表索引
DROP INDEX IF EXISTS idx_push_subscriptions_user_id;
DROP INDEX IF EXISTS idx_push_subscriptions_endpoint;
DROP INDEX IF EXISTS idx_push_subscriptions_active;

-- 删除邮件汇总队列索引
DROP INDEX IF EXISTS idx_email_digest_queue_scheduled;

-- =============================================
-- 第四部分：删除表
-- =============================================

-- 删除邮件汇总队列表（先删，因为有外键依赖notifications）
DROP TABLE IF EXISTS email_digest_queue;

-- 删除推送订阅表
DROP TABLE IF EXISTS push_subscriptions;

-- 删除用户通知设置表
DROP TABLE IF EXISTS notification_settings;

-- 删除消息附件表（先删，因为有外键依赖messages）
DROP TABLE IF EXISTS message_attachments;

-- 删除通知表（有外键依赖messages，但使用ON DELETE SET NULL，可以先删）
-- 注意：如果notifications表有数据且message_id不为NULL，删除messages会有问题
-- 建议先清空数据或按正确顺序删除
DROP TABLE IF EXISTS notifications;

-- 删除私信表
DROP TABLE IF EXISTS messages;

-- =============================================
-- 第五部分：删除版本记录
-- =============================================

DELETE FROM schema_version WHERE version = '1.2.0';

-- =============================================
-- 清理完成
-- =============================================
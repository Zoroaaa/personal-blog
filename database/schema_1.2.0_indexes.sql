-- =============================================
-- Personal Blog System - 1.2.0 索引优化
-- =============================================
-- 版本: 1.2.0
-- 功能: 补充通知和私信系统的性能优化索引
-- 说明: 在 schema_1.2.0_complete.sql 基础上执行
-- =============================================

-- ============= 消息附件表索引优化 =============

-- 按消息ID和文件类型查询附件（用于区分图片和文件）
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_type 
ON message_attachments(message_id, file_type);

-- ============= 通知表索引优化 =============

-- 类型和子类型复合索引（用于按类型筛选通知）
CREATE INDEX IF NOT EXISTS idx_notifications_type_subtype 
ON notifications(type, subtype) 
WHERE is_deleted = 0;

-- 创建时间范围查询索引（用于清理过期数据）
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_active 
ON notifications(created_at) 
WHERE is_deleted = 0;

-- 渠道发送状态索引（用于邮件/推送队列处理）
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending 
ON notifications(user_id, is_email_sent, created_at) 
WHERE is_email_sent = 0 AND is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending 
ON notifications(user_id, is_push_sent, created_at) 
WHERE is_push_sent = 0 AND is_deleted = 0;

-- ============= 私信表索引优化 =============

-- 按接收者和阅读状态查询（优化未读数统计）
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read 
ON messages(receiver_id, is_read, created_at DESC) 
WHERE is_read = 0;

-- ============= 推送订阅表索引优化 =============

-- 按用户和活动状态查询（用于批量推送）
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active 
ON push_subscriptions(user_id, is_active) 
WHERE is_active = 1;

-- =============================================
-- 索引优化完成
-- =============================================
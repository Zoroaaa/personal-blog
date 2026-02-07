-- =============================================
-- Personal Blog System - 数据库Schema
-- =============================================
-- 版本: 2.1.0
-- 功能说明:
-- 1. 完整的博客系统数据表结构
-- 2. 优化的索引设计
-- 3. 自动更新的触发器
-- 4. 完整的初始数据
-- 5. 便捷的视图查询
-- =============================================

-- ============= 用户表 =============

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 基本信息
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,  -- OAuth用户可能为空
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    
    -- 权限和状态
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'moderator')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
    
    -- OAuth信息
    oauth_provider TEXT CHECK(oauth_provider IN ('github', 'google', NULL)),
    oauth_id TEXT,
    
    -- 统计信息
    post_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    reading_history_count INTEGER DEFAULT 0,
    
    -- 审计字段
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    
    -- 邮箱验证状态
    email_verified INTEGER DEFAULT 0, -- 0: 未验证, 1: 已验证
    
    -- 唯一约束
    UNIQUE(oauth_provider, oauth_id)
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- ============= 分类表 =============

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,  -- 图标URL或emoji
    color TEXT,  -- 颜色代码
    post_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,  -- 显示顺序
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- ============= 标签表 =============

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    post_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_post_count ON tags(post_count DESC);

-- ============= 文章表 =============

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 基本信息
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    
    -- 关联信息
    author_id INTEGER NOT NULL,
    category_id INTEGER,
    
    -- 状态和可见性
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password')),
    password TEXT,  -- 如果visibility是password
    
    -- 统计信息
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    reading_time INTEGER,  -- 预计阅读时间（分钟）
    
    -- SEO信息
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- 时间信息
    published_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 文章表索引
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count DESC);

-- 复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC) 
    WHERE status = 'published';

-- 复合索引：状态和可见性
CREATE INDEX IF NOT EXISTS idx_posts_status_visibility ON posts(status, visibility);

-- ============= 文章标签关联表 =============

CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- ============= 评论表 =============

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 关联信息
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,  -- NULL表示顶级评论
    
    -- 评论内容
    content TEXT NOT NULL,
    
    -- 状态
    status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'deleted')),
    
    -- 统计
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,  -- 直接回复数
    
    -- IP和User Agent（用于审核）
    ip_address TEXT,
    user_agent TEXT,
    
    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 评论表索引
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_comments_post_status ON comments(post_id, status, created_at DESC);

-- ============= 点赞表 =============

CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER,
    comment_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    -- 确保只能点赞文章或评论之一
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- 点赞表唯一索引（防止重复点赞）
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id) 
    WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_comment ON likes(user_id, comment_id) 
    WHERE comment_id IS NOT NULL;

-- 普通索引
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============= 浏览历史表 =============

CREATE TABLE IF NOT EXISTS view_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,  -- NULL表示匿名用户
    ip_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_view_history_post_id ON view_history(post_id);
CREATE INDEX IF NOT EXISTS idx_view_history_user_id ON view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_view_history_created_at ON view_history(created_at DESC);

-- ============= 阅读历史表 =============

CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    
    -- 阅读进度
    reading_progress INTEGER DEFAULT 0 CHECK(reading_progress >= 0 AND reading_progress <= 100), -- 阅读百分比 0-100
    reading_time INTEGER DEFAULT 0, -- 阅读时长(秒)
    scroll_position INTEGER DEFAULT 0, -- 滚动位置
    
    -- 时间信息
    first_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 首次阅读时间
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最后阅读时间
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    -- 唯一约束：一个用户对一篇文章只有一条阅读历史
    UNIQUE(user_id, post_id)
);

-- 阅读历史表索引
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_post_id ON reading_history(post_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON reading_history(user_id, last_read_at DESC);

-- ============= 收藏表 =============

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    
    -- 收藏备注(可选)
    notes TEXT,
    
    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    -- 唯一约束：防止重复收藏
    UNIQUE(user_id, post_id)
);

-- 收藏表索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON favorites(post_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(user_id, created_at DESC);

-- ============= 邮箱验证码表 =============

CREATE TABLE IF NOT EXISTS email_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE,
    code TEXT NOT NULL, -- 6位验证码
    type TEXT NOT NULL CHECK(type IN ('register', 'reset_password', 'delete_account', 'change_email')),
    
    -- 状态
    used INTEGER DEFAULT 0, -- 0: 未使用, 1: 已使用
    ip_address TEXT, -- 请求IP
    
    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL, -- 过期时间(通常5-10分钟后)
    used_at DATETIME -- 使用时间
);

-- 邮箱验证码表索引
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_codes_type ON email_verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_email_codes_created ON email_verification_codes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_codes_expires ON email_verification_codes(expires_at);

-- 复合索引用于验证码查询
CREATE INDEX IF NOT EXISTS idx_email_codes_verify ON email_verification_codes(email, code, type, used, expires_at);

-- ============= 网站配置表 =============

CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 配置键值
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    
    -- 配置元数据
    type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general', 'theme', 'social', 'seo', 'features')),
    description TEXT,
    
    -- 审计字段
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 配置表索引
CREATE INDEX IF NOT EXISTS idx_site_config_key ON site_config(key);
CREATE INDEX IF NOT EXISTS idx_site_config_category ON site_config(category);

-- ============= 数据库触发器 =============

-- 触发器：自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_site_config_timestamp
AFTER UPDATE ON site_config
FOR EACH ROW
BEGIN
    UPDATE site_config 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_users_update_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_update_timestamp
AFTER UPDATE ON posts
FOR EACH ROW
BEGIN
    UPDATE posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_comments_update_timestamp
AFTER UPDATE ON comments
FOR EACH ROW
BEGIN
    UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：文章发布时更新分类文章数
CREATE TRIGGER IF NOT EXISTS trg_posts_insert_update_category
AFTER INSERT ON posts
WHEN NEW.status = 'published' AND NEW.category_id IS NOT NULL
BEGIN
    UPDATE categories 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.category_id;
END;

-- 触发器：文章状态改变时更新分类文章数
CREATE TRIGGER IF NOT EXISTS trg_posts_update_category
AFTER UPDATE OF status, category_id ON posts
BEGIN
    -- 旧分类减1
    UPDATE categories 
    SET post_count = post_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.category_id 
        AND OLD.status = 'published';
    
    -- 新分类加1
    UPDATE categories 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.category_id 
        AND NEW.status = 'published';
END;

-- 触发器：添加文章标签时更新标签计数
CREATE TRIGGER IF NOT EXISTS trg_post_tags_insert
AFTER INSERT ON post_tags
BEGIN
    UPDATE tags 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.tag_id;
END;

-- 触发器：删除文章标签时更新标签计数
CREATE TRIGGER IF NOT EXISTS trg_post_tags_delete
AFTER DELETE ON post_tags
BEGIN
    UPDATE tags 
    SET post_count = post_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.tag_id;
END;

-- 触发器：添加评论时更新文章评论数
CREATE TRIGGER IF NOT EXISTS trg_comments_insert
AFTER INSERT ON comments
WHEN NEW.status = 'approved'
BEGIN
    UPDATE posts 
    SET comment_count = comment_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.post_id;
    
    -- 更新父评论的回复数
    UPDATE comments
    SET reply_count = reply_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parent_id;
END;

-- 触发器：删除评论时更新文章评论数
CREATE TRIGGER IF NOT EXISTS trg_comments_delete
AFTER DELETE ON comments
BEGIN
    UPDATE posts 
    SET comment_count = comment_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.post_id;
    
    -- 更新父评论的回复数
    UPDATE comments
    SET reply_count = reply_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.parent_id;
END;

-- 触发器：添加收藏时更新文章收藏数
CREATE TRIGGER IF NOT EXISTS trg_favorites_insert
AFTER INSERT ON favorites
BEGIN
    UPDATE posts 
    SET favorite_count = (
        SELECT COUNT(*) FROM favorites WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    
    UPDATE users
    SET favorite_count = (
        SELECT COUNT(*) FROM favorites WHERE user_id = NEW.user_id
    )
    WHERE id = NEW.user_id;
END;

-- 触发器：删除收藏时更新文章收藏数
CREATE TRIGGER IF NOT EXISTS trg_favorites_delete
AFTER DELETE ON favorites
BEGIN
    UPDATE posts 
    SET favorite_count = (
        SELECT COUNT(*) FROM favorites WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
    
    UPDATE users
    SET favorite_count = (
        SELECT COUNT(*) FROM favorites WHERE user_id = OLD.user_id
    )
    WHERE id = OLD.user_id;
END;

-- 触发器：更新阅读历史时自动更新 last_read_at
CREATE TRIGGER IF NOT EXISTS trg_reading_history_update
AFTER UPDATE ON reading_history
FOR EACH ROW
BEGIN
    UPDATE reading_history 
    SET last_read_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ============= 视图（便于查询） =============

-- 文章详情视图（包含作者和分类信息）
CREATE VIEW IF NOT EXISTS vw_posts_detailed AS
SELECT 
    p.*,
    u.username as author_username,
    u.display_name as author_name,
    u.avatar_url as author_avatar,
    c.name as category_name,
    c.slug as category_slug,
    c.color as category_color
FROM posts p
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN categories c ON p.category_id = c.id;

-- 评论详情视图（包含用户信息）
CREATE VIEW IF NOT EXISTS vw_comments_detailed AS
SELECT 
    c.*,
    u.username,
    u.display_name,
    u.avatar_url
FROM comments c
JOIN users u ON c.user_id = u.id;

-- 阅读历史详情视图
CREATE VIEW IF NOT EXISTS vw_reading_history_detailed AS
SELECT 
    rh.*,
    p.title as post_title,
    p.slug as post_slug,
    p.cover_image as post_cover,
    p.summary as post_summary,
    p.reading_time as post_reading_time,
    p.author_id,
    u.username as author_username,
    u.display_name as author_name,
    u.avatar_url as author_avatar,
    c.name as category_name,
    c.slug as category_slug,
    c.color as category_color
FROM reading_history rh
JOIN posts p ON rh.post_id = p.id
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN categories c ON p.category_id = c.id;

-- 收藏详情视图
CREATE VIEW IF NOT EXISTS vw_favorites_detailed AS
SELECT 
    f.*,
    p.title as post_title,
    p.slug as post_slug,
    p.cover_image as post_cover,
    p.summary as post_summary,
    p.reading_time as post_reading_time,
    p.view_count,
    p.like_count,
    p.comment_count,
    p.published_at,
    p.author_id,
    u.username as author_username,
    u.display_name as author_name,
    u.avatar_url as author_avatar,
    c.name as category_name,
    c.slug as category_slug,
    c.color as category_color
FROM favorites f
JOIN posts p ON f.post_id = p.id
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ============= 初始数据 =============

-- 插入默认分类
INSERT OR IGNORE INTO categories (name, slug, description, icon, color, display_order) VALUES
('技术', 'tech', '技术相关文章', '💻', '#3B82F6', 1),
('生活', 'life', '生活随笔', '🌟', '#10B981', 2),
('随笔', 'essay', '随笔杂谈', '✍️', '#8B5CF6', 3),
('教程', 'tutorial', '教程和指南', '📚', '#F59E0B', 4);

-- 插入默认标签
INSERT OR IGNORE INTO tags (name, slug, color) VALUES
('JavaScript', 'javascript', '#3B82F6'),
('TypeScript', 'typescript', '#2563EB'),
('React', 'react', '#06B6D4'),
('Vue', 'vue', '#10B981'),
('Node.js', 'nodejs', '#8B5CF6'),
('Cloudflare', 'cloudflare', '#F97316'),
('数据库', 'database', '#EF4444'),
('算法', 'algorithm', '#F59E0B'),
('设计模式', 'design-patterns', '#EC4899'),
('性能优化', 'performance', '#14B8A6');

-- 插入默认管理员账户（密码：Admin123!，请在生产环境中修改）
-- 注意：这个密码哈希是 'Admin123!' 的bcrypt哈希值
INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, status, email_verified) VALUES
('admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqRWNXb6tO', 'Administrator', 'admin', 'active', 1);

-- 插入网站配置初始数据
-- 基本设置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('site_name', '我的博客', 'string', 'general', '网站名称'),
  ('site_subtitle', '分享技术与生活', 'string', 'general', '网站副标题'),
  ('site_logo', '/logo.png', 'string', 'general', '网站Logo URL'),
  ('site_favicon', '/favicon.ico', 'string', 'general', '网站Favicon URL'),
  ('site_description', '一个分享技术和生活的个人博客', 'string', 'seo', '网站描述(SEO)'),
  ('site_keywords', 'blog,技术,编程,生活', 'string', 'seo', '网站关键词(SEO)'),
  ('site_author', 'Admin', 'string', 'general', '网站作者');

-- 作者信息组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('author_name', 'Admin', 'string', 'general', '作者名称'),
  ('author_avatar', '/default-avatar.png', 'string', 'general', '作者头像URL'),
  ('author_bio', '热爱技术的开发者', 'string', 'general', '作者简介'),
  ('author_email', 'admin@example.com', 'string', 'general', '作者邮箱');

-- 主题配置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('theme_primary_color', '#3B82F6', 'string', 'theme', '主题主色调'),
  ('theme_default_mode', 'system', 'string', 'theme', '默认主题模式 (light/dark/system)'),
  ('theme_font_family', 'system-ui, -apple-system, sans-serif', 'string', 'theme', '字体族'),
  ('theme_enable_animations', 'true', 'boolean', 'theme', '启用动画效果');

-- 社交媒体组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('social_github', '', 'string', 'social', 'GitHub链接'),
  ('social_twitter', '', 'string', 'social', 'Twitter链接'),
  ('social_linkedin', '', 'string', 'social', 'LinkedIn链接'),
  ('social_email', '', 'string', 'social', '联系邮箱'),
  ('social_weibo', '', 'string', 'social', '微博链接'),
  ('social_wechat_qr', '', 'string', 'social', '微信二维码URL');

-- 功能设置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('feature_comments', 'true', 'boolean', 'features', '启用评论功能'),
  ('feature_search', 'true', 'boolean', 'features', '启用搜索功能'),
  ('feature_like', 'true', 'boolean', 'features', '启用点赞功能'),
  ('feature_share', 'true', 'boolean', 'features', '启用分享功能'),
  ('feature_rss', 'true', 'boolean', 'features', '启用RSS订阅'),
  ('feature_analytics', 'true', 'boolean', 'features', '启用访问统计'),
  ('feature_newsletter', 'false', 'boolean', 'features', '启用邮件订阅'),
  ('comment_approval_required', 'false', 'boolean', 'features', '评论需要审核');

-- 页脚配置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('footer_text', '© 2024 我的博客. All rights reserved.', 'string', 'general', '页脚版权文字'),
  ('footer_links', '{"友情链接": "https://example.com"}', 'json', 'general', '页脚链接(JSON格式)'),
  ('footer_show_powered_by', 'true', 'boolean', 'general', '显示"Powered by"');

-- 系统设置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('posts_per_page', '10', 'number', 'general', '每页文章数'),
  ('max_upload_size_mb', '5', 'number', 'general', '最大上传文件大小(MB)'),
  ('enable_maintenance_mode', 'false', 'boolean', 'general', '维护模式');

-- ============= 数据库版本信息 =============

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.1.0', 'Complete blog system with reading history, favorites, and email verification');

-- =============================================
-- Schema 创建完成
-- =============================================


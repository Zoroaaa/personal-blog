-- =============================================
-- Personal Blog System - 完整数据库演变历史
-- =============================================
--
-- 本文件整合了所有历史版本和迁移文件
-- 提供从v1.2.0到v2.3.0的完整演变记录
--
-- 版本演变时间线：
-- v1.2.0 → v2.0.0 → v2.1.0 → v2.2.0 → v2.3.0
--
-- 使用方式：
-- 1. 新建数据库：直接执行到 "== v2.0.0 完整Schema ==" 部分
-- 2. 升级现有数据库：根据当前版本执行对应的迁移脚本
--
-- =============================================

-- =============================================
-- 版本控制表（必须最先创建）
-- =============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- =============================================
-- == v2.0.0 完整Schema（2026-02-13）==
-- =============================================
--
-- 这是当前生产环境使用的完整Schema
-- 包含所有基础表、索引、触发器和初始数据
--

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

    -- 审计字段
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,

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

-- ============= OAuth令牌表 =============

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('github', 'google')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    scopes TEXT,  -- 逗号分隔的权限列表
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

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
    column_id INTEGER,

    -- 状态和可见性
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password')),
    password TEXT,  -- 如果visibility是password

    -- 统计信息
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
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
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE SET NULL
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

-- 专栏文章列表优化
CREATE INDEX IF NOT EXISTS idx_posts_column_published
ON posts(column_id, published_at DESC)
WHERE status = 'published';

-- 作者已发布文章列表优化（覆盖用户个人主页文章列表查询）
CREATE INDEX IF NOT EXISTS idx_posts_author_published
ON posts(author_id, published_at DESC)
WHERE status = 'published';

-- 分类已发布文章列表优化（覆盖分类页面文章列表查询）
CREATE INDEX IF NOT EXISTS idx_posts_category_published
ON posts(category_id, published_at DESC)
WHERE status = 'published';

-- 作者文章状态统计优化（覆盖后台管理文章筛选）
CREATE INDEX IF NOT EXISTS idx_posts_author_status_created
ON posts(author_id, status, created_at DESC);

-- =============================================
-- 全文搜索索引 (FTS5)
-- =============================================

-- 创建 FTS5 虚拟表用于文章全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
    title,
    content
);

-- 填充FTS数据
INSERT INTO posts_fts(rowid, title, content)
SELECT id, title, content FROM posts WHERE id NOT IN (SELECT rowid FROM posts_fts);

-- 创建触发器：插入文章时自动更新 FTS 索引
CREATE TRIGGER IF NOT EXISTS trg_posts_fts_insert
AFTER INSERT ON posts
BEGIN
    INSERT INTO posts_fts(rowid, title, content)
    VALUES (NEW.id, NEW.title, NEW.content);
END;

-- 创建触发器：更新文章时自动更新 FTS 索引
CREATE TRIGGER IF NOT EXISTS trg_posts_fts_update
AFTER UPDATE ON posts
BEGIN
    UPDATE posts_fts
    SET title = NEW.title,
        content = NEW.content
    WHERE rowid = NEW.id;
END;

-- 创建触发器：删除文章时自动删除 FTS 索引
CREATE TRIGGER IF NOT EXISTS trg_posts_fts_delete
AFTER DELETE ON posts
BEGIN
    DELETE FROM posts_fts WHERE rowid = OLD.id;
END;

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

-- 标签文章查询优化（用于查询某标签下的文章列表）
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_post
ON post_tags(tag_id, post_id);

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

-- 文章已审核评论列表优化（覆盖文章详情页评论展示）
CREATE INDEX IF NOT EXISTS idx_comments_post_approved
ON comments(post_id, created_at DESC)
WHERE status = 'approved';

-- 用户评论历史优化（覆盖用户个人中心评论列表）
CREATE INDEX IF NOT EXISTS idx_comments_user_created
ON comments(user_id, created_at DESC);

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
    first_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_duration_seconds INTEGER DEFAULT 0,
    read_percentage INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_post_id ON reading_history(post_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read_at ON reading_history(last_read_at DESC);

-- ============= 收藏表 =============

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON favorites(post_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- ============= 专栏表 =============

CREATE TABLE IF NOT EXISTS columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 基本信息
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image TEXT,

    -- 作者信息
    author_id INTEGER NOT NULL,

    -- 统计信息
    post_count INTEGER DEFAULT 0,
    total_view_count INTEGER DEFAULT 0,
    total_like_count INTEGER DEFAULT 0,
    total_favorite_count INTEGER DEFAULT 0,
    total_comment_count INTEGER DEFAULT 0,

    -- 显示顺序
    display_order INTEGER DEFAULT 0,

    -- 状态
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden', 'archived')),

    -- 时间信息
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 专栏表索引
CREATE INDEX IF NOT EXISTS idx_columns_slug ON columns(slug);
CREATE INDEX IF NOT EXISTS idx_columns_author_id ON columns(author_id);
CREATE INDEX IF NOT EXISTS idx_columns_status ON columns(status);
CREATE INDEX IF NOT EXISTS idx_columns_display_order ON columns(display_order);
CREATE INDEX IF NOT EXISTS idx_columns_created_at ON columns(created_at DESC);

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

-- ============= 通知表 =============

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 接收者
    user_id INTEGER NOT NULL,

    -- 通知类型和子类型
    type TEXT NOT NULL CHECK(type IN ('system', 'interaction', 'private_message')),
    subtype TEXT CHECK(subtype IN (
        'maintenance', 'update', 'announcement',  -- 系统子类型
        'comment', 'like', 'favorite', 'mention', 'follow', 'reply', 'message',  -- 互动/私信子类型
        'post_comment', 'comment_reply', '@mention'  -- 兼容旧名称
    )),

    -- 通知内容
    title TEXT NOT NULL,
    content TEXT,

    -- 关联数据（JSON格式）
    related_data TEXT,

    -- 用户状态
    is_read INTEGER DEFAULT 0,
    read_at DATETIME,
    deleted_at DATETIME,

    -- 系统通知状态
    is_active INTEGER DEFAULT 1,

    -- 时间
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 外键
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通知表索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, deleted_at) WHERE is_read = 0 AND deleted_at IS NULL;

-- ============= 数据库触发器 =============

-- 触发器：site_config表自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_site_config_timestamp
AFTER UPDATE ON site_config
FOR EACH ROW
BEGIN
    UPDATE site_config
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
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

-- 触发器：文章发布时更新专栏统计
CREATE TRIGGER IF NOT EXISTS trg_posts_insert_update_column
AFTER INSERT ON posts
WHEN NEW.status = 'published' AND NEW.column_id IS NOT NULL
BEGIN
    UPDATE columns
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.column_id;
END;

-- 触发器：文章状态或专栏改变时更新专栏统计
CREATE TRIGGER IF NOT EXISTS trg_posts_update_column
AFTER UPDATE OF status, column_id ON posts
BEGIN
    -- 旧专栏减1
    UPDATE columns
    SET post_count = post_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.column_id
        AND OLD.status = 'published';

    -- 新专栏加1
    UPDATE columns
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.column_id
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

-- 触发器：自动更新updated_at字段
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
INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, status) VALUES
('admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqRWNXb6tO', 'Administrator', 'admin', 'active');

-- 插入系统用户账户（用于发送系统通知）
-- 该账户为虚拟账户，无法登录，专门用于系统自动化通知
INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, bio, role, status, post_count, comment_count, created_at, updated_at) VALUES
(0, 'system', 'system@internal.local', 'SYSTEM_USER_NO_PASSWORD_HASH', '系统', '系统自动通知账号，用于发送系统公告', 'admin', 'active', 0, 0, '2026-02-12 08:32:07', '2026-02-12 08:32:07');

-- 插入网站配置初始数据
-- 基本设置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('site_name', '我的博客', 'string', 'general', '网站名称'),
  ('site_subtitle', '分享技术与生活', 'string', 'general', '网站副标题'),
  ('site_logo', '/logo.png', 'string', 'general', '网站Logo URL'),
  ('site_favicon', '/favicon.ico', 'string', 'general', '网站Favicon URL'),
  ('site_description', '一个分享技术和生活的个人博客', 'string', 'seo', '网站描述(SEO)'),
  ('site_keywords', 'blog,技术,编程,生活', 'string', 'seo', '网站关键词(SEO)'),
  ('site_author', 'Admin', 'string', 'general', '网站作者'),
  ('site_og_image', '', 'string', 'seo', 'Open Graph图片URL'),
  ('site_twitter_card', 'summary_large_image', 'string', 'seo', 'Twitter卡片类型');

-- 主题配置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('theme_primary_color', '#3B82F6', 'string', 'theme', '主题主色调'),
  ('theme_default_mode', 'system', 'string', 'theme', '默认主题模式 (light/dark/system)'),
  ('theme_font_family', 'system-ui, -apple-system, sans-serif', 'string', 'theme', '字体族'),
  ('theme_font_url', '', 'string', 'theme', '自定义字体URL');

-- 社交媒体组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('social_github', '', 'string', 'social', 'GitHub链接'),
  ('social_twitter', '', 'string', 'social', 'Twitter链接'),
  ('social_youtube', '', 'string', 'social', 'YouTube链接'),
  ('social_telegram', '', 'string', 'social', 'Telegram链接'),
  ('social_email', '', 'string', 'social', '联系邮箱');

-- 功能设置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('feature_comments', 'true', 'boolean', 'features', '启用评论功能'),
  ('feature_search', 'true', 'boolean', 'features', '启用搜索功能'),
  ('feature_like', 'true', 'boolean', 'features', '启用点赞功能'),
  ('feature_share', 'true', 'boolean', 'features', '启用分享功能'),
  ('feature_registration', 'true', 'boolean', 'features', '启用用户注册'),
  ('feature_oauth_github', 'true', 'boolean', 'features', '启用GitHub登录'),
  ('feature_rss', 'true', 'boolean', 'features', '启用RSS订阅'),
  ('comment_approval_required', 'false', 'boolean', 'features', '评论需要审核'),
  ('allow_html_comments', 'false', 'boolean', 'features', '允许HTML评论'),
  ('max_comment_length', '1000', 'number', 'features', '评论最大长度');

-- 页脚配置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('footer_text', '', 'string', 'general', '页脚版权文字（留空使用默认）'),
  ('footer_links', '{"友情链接": "https://example.com"}', 'json', 'general', '页脚链接(JSON格式)'),
  ('footer_tech_stack', '["React + TypeScript", "Cloudflare Workers", "Tailwind CSS"]', 'json', 'general', '技术栈列表');

-- 系统设置组
INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('posts_per_page', '10', 'number', 'general', '每页文章数'),
  ('max_upload_size_mb', '5', 'number', 'general', '最大上传文件大小(MB)');

-- ============= 视图（便于查询） =

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

-- 专栏详情视图（包含作者信息）
CREATE VIEW IF NOT EXISTS vw_columns_detailed AS
SELECT
    col.*,
    u.username as author_username,
    u.display_name as author_name,
    u.avatar_url as author_avatar
FROM columns col
LEFT JOIN users u ON col.author_id = u.id;

-- 记录版本信息
INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.0.0', 'Complete schema with all base tables, triggers, indexes, and audit fields');

-- =============================================
-- == v2.1.0 迁移 (2026-02-13) ==
-- =============================================
--
-- 添加软删除支持（添加 deleted_at 字段）
--
-- 执行命令：
-- wrangler d1 execute personal-blog --file=./database/migrations/001_add_soft_delete.sql
--

-- ============= 用户表：添加软删除 =============

ALTER TABLE IF EXISTS users ADD COLUMN deleted_at DATETIME NULL;

-- 创建或重建索引以支持软删除查询
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username) WHERE deleted_at IS NULL;

-- ============= 文章表：添加软删除 =============

ALTER TABLE IF EXISTS posts ADD COLUMN deleted_at DATETIME NULL;

-- 更新现有的索引，添加软删除条件
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_published_active ON posts(status, published_at DESC)
    WHERE status = 'published' AND deleted_at IS NULL;

-- ============= 评论表：添加软删除 =============

ALTER TABLE IF EXISTS comments ADD COLUMN deleted_at DATETIME NULL;

-- 创建索引支持软删除查询
CREATE INDEX IF NOT EXISTS idx_comments_active ON comments(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_post_active ON comments(post_id) WHERE deleted_at IS NULL;

-- ============= 分类表：添加软删除 =============

ALTER TABLE IF EXISTS categories ADD COLUMN deleted_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(id) WHERE deleted_at IS NULL;

-- ============= 标签表：添加软删除 =============

ALTER TABLE IF EXISTS tags ADD COLUMN deleted_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(id) WHERE deleted_at IS NULL;

-- ============= 专栏表：添加软删除 =============

ALTER TABLE IF EXISTS columns ADD COLUMN deleted_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_columns_active ON columns(id) WHERE deleted_at IS NULL;

-- ============= 通知表：添加软删除 =============

ALTER TABLE IF EXISTS notifications ADD COLUMN deleted_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(id) WHERE deleted_at IS NULL;

-- 记录版本信息
INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.1.0', 'Added soft delete support (deleted_at field) for major tables');

-- =============================================
-- == v2.0.0 修复：统一私信为通知系统 ==
-- =============================================
--
-- 注意：该迁移脚本已修复以解决以下问题：
-- - 移除对不存在的 messages 表的引用
-- - 移除对不存在的 is_deleted 列的引用
-- - 专注于完成通知表的软删除支持
--
-- 修复日期：2026-02-13
-- 修复版本：2.0.0
--

-- ============= 步骤1：为通知表添加必要的列（如果不存在） =============

-- 添加通知表缺失的列
ALTER TABLE IF EXISTS notifications ADD COLUMN type TEXT DEFAULT 'notification';
ALTER TABLE IF EXISTS notifications ADD COLUMN subtype TEXT;
ALTER TABLE IF EXISTS notifications ADD COLUMN is_active INTEGER DEFAULT 1;

-- ============= 步骤2：创建索引以优化查询性能 =============

-- 为通知查询创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON notifications(is_active);

-- 记录版本信息
INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.0.0-fix', 'Fixed: Unified private messages to notifications system');

-- =============================================
-- == v2.2.0 迁移 (2026-02-13) ==
-- =============================================
--
-- 添加软删除触发器
--
-- 版本: 2.2.0
-- 描述: 添加触发器以支持软删除时的数据一致性
-- 日期: 2026-02-13
--
-- 当记录被软删除（deleted_at != NULL）时，
-- 需要相应地减少关联计数，如同执行DELETE操作
--

-- ============= 删除旧的DELETE触发器 =============

DROP TRIGGER IF EXISTS trg_comments_delete;
DROP TRIGGER IF EXISTS trg_post_tags_delete;
DROP TRIGGER IF EXISTS trg_posts_update_category;
DROP TRIGGER IF EXISTS trg_posts_update_column;

-- ============= 文章软删除触发器 =============

-- 触发器：当文章被软删除时，更新分类文章数
CREATE TRIGGER IF NOT EXISTS trg_posts_soft_delete_category
AFTER UPDATE OF deleted_at ON posts
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    -- 从旧分类减少计数
    UPDATE categories
    SET post_count = MAX(0, post_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.category_id
        AND NEW.status = 'published'
        AND NEW.deleted_at IS NOT NULL;
END;

-- 触发器：当文章被软删除时，更新专栏文章数
CREATE TRIGGER IF NOT EXISTS trg_posts_soft_delete_column
AFTER UPDATE OF deleted_at ON posts
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    -- 从旧专栏减少计数
    UPDATE columns
    SET post_count = MAX(0, post_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.column_id
        AND NEW.status = 'published'
        AND NEW.deleted_at IS NOT NULL;
END;

-- ============= 评论软删除触发器 =============

-- 触发器：当评论被软删除时，更新文章评论数
CREATE TRIGGER IF NOT EXISTS trg_comments_soft_delete
AFTER UPDATE OF deleted_at ON comments
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    UPDATE posts
    SET comment_count = MAX(0, comment_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.post_id;

    -- 更新父评论的回复数
    UPDATE comments
    SET reply_count = MAX(0, reply_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parent_id AND NEW.parent_id IS NOT NULL;
END;

-- ============= 标签软删除触发器 =============

-- 触发器：当标签被软删除时，更新标签计数
CREATE TRIGGER IF NOT EXISTS trg_tags_soft_delete
AFTER UPDATE OF deleted_at ON tags
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    -- 软删除时要处理与post_tags的关系
    -- 更新所有关联文章的标签计数
    UPDATE tags
    SET post_count = (
        SELECT COUNT(*) FROM post_tags pt
        WHERE pt.tag_id = NEW.id
            AND pt.post_id IN (
                SELECT id FROM posts WHERE deleted_at IS NULL
            )
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- ============= 评论/文章删除触发器（保持兼容） =============

-- 触发器：删除评论时更新文章评论数（保留硬删除兼容性）
CREATE TRIGGER IF NOT EXISTS trg_comments_hard_delete
AFTER DELETE ON comments
BEGIN
    UPDATE posts
    SET comment_count = MAX(0, comment_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.post_id;

    -- 更新父评论的回复数
    UPDATE comments
    SET reply_count = MAX(0, reply_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.parent_id AND OLD.parent_id IS NOT NULL;
END;

-- 触发器：删除标签关联时更新标签计数（保留硬删除兼容性）
CREATE TRIGGER IF NOT EXISTS trg_post_tags_hard_delete
AFTER DELETE ON post_tags
BEGIN
    UPDATE tags
    SET post_count = MAX(0, post_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.tag_id;
END;

-- 记录版本信息
INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.2.0', 'Added soft delete triggers for data consistency');

-- =============================================
-- == v2.3.0 迁移 (2026-02-13) ==
-- =============================================
--
-- 版本: 2.3.0
-- 描述: 添加 password_hash 列用于安全存储受保护文章的密码
-- 日期: 2026-02-13
--
-- 目标：
-- 1. 添加 password_hash 列
-- 2. 保留原始 password 列（用于迁移）
-- 3. 添加索引以提高查询性能
--

-- ============= 添加密码哈希列 =============

ALTER TABLE IF EXISTS posts ADD COLUMN password_hash TEXT;

-- ============= 创建索引 =============

-- 为受密码保护的文章创建索引
CREATE INDEX IF NOT EXISTS idx_posts_password_protected
ON posts(id, visibility)
WHERE visibility = 'password' AND password_hash IS NOT NULL;

-- 记录版本信息
INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.3.0', 'Added password_hash column for secure password storage of protected posts');

-- =============================================
-- 数据库演变历史完成
-- =============================================
--
-- 版本快照信息：
-- v2.0.0  - 完整的基础Schema（包含所有表、触发器、索引）
-- v2.1.0  - 添加软删除支持
-- v2.2.0  - 添加软删除触发器以保持数据一致性
-- v2.3.0  - 添加密码哈希列用于安全存储密码
--
-- 升级指南：
-- 1. 新建数据库：直接执行整个文件（从 CREATE TABLE IF NOT EXISTS 开始）
-- 2. 从v2.0升级到最新：按顺序执行 v2.1.0 → v2.2.0 → v2.3.0 部分
-- 3. 查询当前版本：SELECT * FROM schema_version
--
-- =============================================
--
-- 系统通知发送指南：
-- =====
--
-- 发送系统通知时，使用 id=0 的 system 用户作为发送者：
--
-- 插入系统通知示例：
-- INSERT INTO notifications (user_id, type, subtype, title, content, related_data, is_read, is_active)
-- VALUES
-- (目标用户ID, 'system', 'announcement', '系统公告', '公告内容', NULL, 0, 1);
--
-- 或者通过触发器由应用层调用，例如：
-- CALL send_system_notification(user_id, 'maintenance', '系统维护通知', '维护信息');
--
-- 系统用户特性：
-- - username: system (系统用户标识)
-- - email: system@internal.local (内部虚拟邮箱)
-- - password_hash: SYSTEM_USER_NO_PASSWORD_HASH (无法登录)
-- - role: admin (拥有管理员权限，确保通知不被限制)
-- - status: active (始终保持活跃)
-- - 该账户无法进行登录、发布文章、评论等操作
-- - 仅用于记录通知来源
--
-- =============================================

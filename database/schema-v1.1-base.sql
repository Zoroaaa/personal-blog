-- =============================================
-- Personal Blog System - 基础功能数据库初始化
-- =============================================
-- 版本: v1.1
-- 描述: 包含系统运行所需的核心表结构定义及基础数据初始化脚本
-- 
-- 重要说明: 
-- 系统初始化时必须同时执行 v1.1 和 v1.2 版本的数据库文件
-- 执行顺序: 先执行 v1.1，再执行 v1.2
-- =============================================

-- ============= 版本控制表 =============

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- ============= 用户表 =============

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'moderator')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
    
    oauth_provider TEXT CHECK(oauth_provider IN ('github', 'google', NULL)),
    oauth_id TEXT,
    
    post_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    deleted_at DATETIME,
    
    UNIQUE(oauth_provider, oauth_id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username) WHERE deleted_at IS NULL;

-- ============= OAuth令牌表 =============

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('github', 'google')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    scopes TEXT,
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
    icon TEXT,
    color TEXT,
    post_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(id) WHERE deleted_at IS NULL;

-- ============= 标签表 =============

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    post_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_post_count ON tags(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(id) WHERE deleted_at IS NULL;

-- ============= 专栏表 =============

CREATE TABLE IF NOT EXISTS columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image TEXT,
    
    author_id INTEGER NOT NULL,
    
    post_count INTEGER DEFAULT 0,
    total_view_count INTEGER DEFAULT 0,
    total_like_count INTEGER DEFAULT 0,
    total_favorite_count INTEGER DEFAULT 0,
    total_comment_count INTEGER DEFAULT 0,
    
    display_order INTEGER DEFAULT 0,
    
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden', 'archived')),
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_columns_slug ON columns(slug);
CREATE INDEX IF NOT EXISTS idx_columns_author_id ON columns(author_id);
CREATE INDEX IF NOT EXISTS idx_columns_status ON columns(status);
CREATE INDEX IF NOT EXISTS idx_columns_display_order ON columns(display_order);
CREATE INDEX IF NOT EXISTS idx_columns_created_at ON columns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_columns_active ON columns(id) WHERE deleted_at IS NULL;

-- ============= 文章表 =============

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    
    author_id INTEGER NOT NULL,
    category_id INTEGER,
    column_id INTEGER,
    
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password')),
    password_hash TEXT,
    
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reading_time INTEGER,
    
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    
    published_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_status_visibility ON posts(status, visibility);
CREATE INDEX IF NOT EXISTS idx_posts_column_published ON posts(column_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_author_published ON posts(author_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_category_published ON posts(category_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_author_status_created ON posts(author_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_published_active ON posts(status, published_at DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_password_protected ON posts(id, visibility) WHERE visibility = 'password' AND password_hash IS NOT NULL;

-- ============= 全文搜索索引 (FTS5) =============

CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
    title, 
    content
);

INSERT INTO posts_fts(rowid, title, content)
SELECT id, title, content FROM posts;

CREATE TRIGGER IF NOT EXISTS trg_posts_fts_insert 
AFTER INSERT ON posts
BEGIN
    INSERT INTO posts_fts(rowid, title, content) 
    VALUES (NEW.id, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_fts_update 
AFTER UPDATE ON posts
BEGIN
    UPDATE posts_fts 
    SET title = NEW.title, 
        content = NEW.content 
    WHERE rowid = NEW.id;
END;

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
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_post ON post_tags(tag_id, post_id);

-- ============= 评论表 =============

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    
    content TEXT NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected', 'deleted')),
    
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    ip_address TEXT,
    user_agent TEXT,
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_status ON comments(post_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_approved ON comments(post_id, created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_active ON comments(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_post_active ON comments(post_id) WHERE deleted_at IS NULL;

-- ============= 点赞表 =============

CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER,
    comment_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_user_comment ON likes(user_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============= 浏览历史表 =============

CREATE TABLE IF NOT EXISTS view_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
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

-- ============= 网站配置表 =============

CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general', 'theme', 'social', 'seo', 'features')),
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_config_key ON site_config(key);
CREATE INDEX IF NOT EXISTS idx_site_config_category ON site_config(category);

-- ============= 数据库触发器 =============

CREATE TRIGGER IF NOT EXISTS update_site_config_timestamp
AFTER UPDATE ON site_config
FOR EACH ROW
BEGIN
    UPDATE site_config 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_insert_update_category
AFTER INSERT ON posts
WHEN NEW.status = 'published' AND NEW.category_id IS NOT NULL
BEGIN
    UPDATE categories 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.category_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_update_category
AFTER UPDATE OF status, category_id ON posts
BEGIN
    UPDATE categories 
    SET post_count = post_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.category_id 
        AND OLD.status = 'published';
    
    UPDATE categories 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.category_id 
        AND NEW.status = 'published';
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_insert_update_column
AFTER INSERT ON posts
WHEN NEW.status = 'published' AND NEW.column_id IS NOT NULL
BEGIN
    UPDATE columns 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.column_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_update_column
AFTER UPDATE OF status, column_id ON posts
BEGIN
    UPDATE columns 
    SET post_count = post_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.column_id 
        AND OLD.status = 'published';
    
    UPDATE columns 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.column_id 
        AND NEW.status = 'published';
END;

CREATE TRIGGER IF NOT EXISTS trg_post_tags_insert
AFTER INSERT ON post_tags
BEGIN
    UPDATE tags 
    SET post_count = post_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_tags_delete
AFTER DELETE ON post_tags
BEGIN
    UPDATE tags 
    SET post_count = post_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_comments_insert
AFTER INSERT ON comments
WHEN NEW.status = 'approved'
BEGIN
    UPDATE posts 
    SET comment_count = comment_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.post_id;
    
    UPDATE comments
    SET reply_count = reply_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parent_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_comments_delete
AFTER DELETE ON comments
BEGIN
    UPDATE posts 
    SET comment_count = comment_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.post_id;
    
    UPDATE comments
    SET reply_count = reply_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.parent_id;
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

-- ============= 软删除触发器 =============

CREATE TRIGGER IF NOT EXISTS trg_posts_soft_delete_category
AFTER UPDATE OF deleted_at ON posts
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    UPDATE categories
    SET post_count = MAX(0, post_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.category_id
        AND NEW.status = 'published'
        AND NEW.deleted_at IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_soft_delete_column
AFTER UPDATE OF deleted_at ON posts
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    UPDATE columns
    SET post_count = MAX(0, post_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.column_id
        AND NEW.status = 'published'
        AND NEW.deleted_at IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_comments_soft_delete
AFTER UPDATE OF deleted_at ON comments
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    UPDATE posts
    SET comment_count = MAX(0, comment_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.post_id;

    UPDATE comments
    SET reply_count = MAX(0, reply_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parent_id AND NEW.parent_id IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_tags_soft_delete
AFTER UPDATE OF deleted_at ON tags
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
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

CREATE TRIGGER IF NOT EXISTS trg_comments_hard_delete
AFTER DELETE ON comments
BEGIN
    UPDATE posts
    SET comment_count = MAX(0, comment_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.post_id;

    UPDATE comments
    SET reply_count = MAX(0, reply_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.parent_id AND OLD.parent_id IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_tags_hard_delete
AFTER DELETE ON post_tags
BEGIN
    UPDATE tags
    SET post_count = MAX(0, post_count - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.tag_id;
END;

-- ============= 视图 =============

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

CREATE VIEW IF NOT EXISTS vw_comments_detailed AS
SELECT 
    c.*,
    u.username,
    u.display_name,
    u.avatar_url
FROM comments c
JOIN users u ON c.user_id = u.id;

CREATE VIEW IF NOT EXISTS vw_columns_detailed AS
SELECT 
    col.*,
    u.username as author_username,
    u.display_name as author_name,
    u.avatar_url as author_avatar
FROM columns col
LEFT JOIN users u ON col.author_id = u.id;

-- ============= 初始数据 =============

INSERT OR IGNORE INTO categories (name, slug, description, icon, color, display_order) VALUES
('技术', 'tech', '技术相关文章', '💻', '#3B82F6', 1),
('生活', 'life', '生活随笔', '🌟', '#10B981', 2),
('随笔', 'essay', '随笔杂谈', '✍️', '#8B5CF6', 3),
('教程', 'tutorial', '教程和指南', '📚', '#F59E0B', 4);

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

INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, status) VALUES
('admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqRWNXb6tO', 'Administrator', 'admin', 'active');

INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, bio, role, status, post_count, comment_count, created_at, updated_at) VALUES
(0, 'system', 'system@internal.local', 'SYSTEM_USER_NO_PASSWORD_HASH', '系统', '系统自动通知账号，用于发送系统公告', 'admin', 'active', 0, 0, '2026-02-12 08:32:07', '2026-02-12 08:32:07');

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

INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('theme_primary_color', '#3B82F6', 'string', 'theme', '主题主色调'),
  ('theme_default_mode', 'system', 'string', 'theme', '默认主题模式 (light/dark/system)'),
  ('theme_font_family', 'system-ui, -apple-system, sans-serif', 'string', 'theme', '字体族'),
  ('theme_font_url', '', 'string', 'theme', '自定义字体URL');

INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('social_github', '', 'string', 'social', 'GitHub链接'),
  ('social_twitter', '', 'string', 'social', 'Twitter链接'),
  ('social_youtube', '', 'string', 'social', 'YouTube链接'),
  ('social_telegram', '', 'string', 'social', 'Telegram链接'),
  ('social_email', '', 'string', 'social', '联系邮箱');

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

INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('footer_text', '', 'string', 'general', '页脚版权文字（留空使用默认）'),
  ('footer_links', '{"友情链接": "https://example.com"}', 'json', 'general', '页脚链接(JSON格式)'),
  ('footer_tech_stack', '["React + TypeScript", "Cloudflare Workers", "Tailwind CSS"]', 'json', 'general', '技术栈列表');

INSERT OR IGNORE INTO site_config (key, value, type, category, description) VALUES
  ('posts_per_page', '10', 'number', 'general', '每页文章数'),
  ('max_upload_size_mb', '5', 'number', 'general', '最大上传文件大小(MB)');

-- ============= 版本记录 =============

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('1.1.0', 'Base schema: users, posts, comments, categories, tags, columns, favorites, likes, view_history, reading_history, site_config');

-- =============================================
-- v1.1 基础功能数据库初始化完成
-- 
-- 下一步：请执行 v1.2 通知与私信管理数据库文件
-- =============================================

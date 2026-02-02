-- =============================================
-- Personal Blog System - 优化版数据库Schema
-- =============================================
-- 版本: 2.0.0
-- 优化内容:
-- 1. 添加数据库触发器自动更新计数器
-- 2. 添加更多索引优化查询性能
-- 3. 添加软删除支持
-- 4. 添加审计字段
-- 5. 改进数据完整性约束
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

-- 全文搜索索引（如果D1支持FTS5）
-- CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(title, content, content=posts, content_rowid=id);

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

-- ============= 浏览历史表（新增） =============

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

-- ============= 数据库触发器 =============

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
INSERT OR IGNORE INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('TypeScript', 'typescript'),
('React', 'react'),
('Vue', 'vue'),
('Node.js', 'nodejs'),
('Cloudflare', 'cloudflare'),
('数据库', 'database'),
('算法', 'algorithm'),
('设计模式', 'design-patterns'),
('性能优化', 'performance');

-- 插入默认管理员账户（密码：Admin123!，请在生产环境中修改）
-- 注意：这个密码哈希是 'Admin123!' 的bcrypt哈希值
INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role, status) VALUES
('admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqRWNXb6tO', 'Administrator', 'admin', 'active');

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

-- ============= 实用查询函数 =============

-- 注意：D1不支持存储过程，这些是示例SQL查询

-- 获取热门文章（按浏览量）
-- SELECT * FROM posts WHERE status = 'published' ORDER BY view_count DESC LIMIT 10;

-- 获取最新文章
-- SELECT * FROM vw_posts_detailed WHERE status = 'published' ORDER BY published_at DESC LIMIT 10;

-- 获取用户统计
-- SELECT 
--     COUNT(*) as total_posts,
--     SUM(view_count) as total_views,
--     SUM(like_count) as total_likes,
--     SUM(comment_count) as total_comments
-- FROM posts WHERE author_id = ? AND status = 'published';

-- 获取标签云（按使用频率）
-- SELECT * FROM tags WHERE post_count > 0 ORDER BY post_count DESC LIMIT 20;

-- ============= 数据库版本信息 =============

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT OR REPLACE INTO schema_version (version, description) VALUES
('2.0.0', 'Optimized schema with triggers, indexes, and audit fields');

-- =============================================
-- Schema 创建完成
-- =============================================
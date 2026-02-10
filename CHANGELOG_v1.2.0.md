# 版本更新说明

本文档详细记录个人博客系统的版本更新历史，包括功能变更、新增内容及优化点。

---

## 版本对比概览

| 版本 | 发布日期 | 主要变更 |
|------|----------|----------|
| v1.2.0 | 2026-02-10 | 新增专栏系统、邮箱验证码、FTS5全文搜索、SEO优化 |
| v1.1.0 | 2026-01-15 | 基础博客功能、用户系统、评论系统、管理后台 |

---

## v1.2.0 (2026-02-10)

### 🎉 新增功能

#### 1. 专栏系统 (Columns)

**功能描述**: 全新的专栏管理模块，支持将文章归类到不同专栏中。

**新增模块**:
- 专栏创建与管理 API (`/api/columns/*`)
- 专栏详情页面 (`/columns/:slug`)
- 专栏文章列表展示
- 专栏统计功能（文章数、浏览量、点赞数、收藏数、评论数）

**数据库变更**:
```sql
-- 新增 columns 表
CREATE TABLE columns (
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
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- posts 表新增 column_id 字段
ALTER TABLE posts ADD COLUMN column_id INTEGER REFERENCES columns(id);
```

**触发器更新**:
- 新增专栏统计自动更新触发器
- 文章增删改时自动同步专栏统计数据

#### 2. 邮箱验证码系统

**功能描述**: 集成 Resend 邮件服务，支持邮箱验证码功能。

**支持场景**:
- 用户注册邮箱验证
- 密码重置验证
- 修改密码验证
- 账号删除验证

**新增 API**:
- `POST /api/auth/send-verification-code` - 发送验证码
- 扩展注册/登录/重置密码接口支持验证码

**环境变量**:
```env
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@your-domain.com
```

#### 3. FTS5 全文搜索引擎

**功能描述**: 基于 SQLite FTS5 的全文搜索功能，支持高级搜索语法。

**功能特性**:
- 文章标题和内容全文索引
- 支持 AND/OR/NOT 逻辑搜索
- 支持短语搜索 `"完整短语"`
- 支持前缀搜索 `React*`
- 支持相关性排序

**数据库变更**:
```sql
-- 创建 FTS5 虚拟表
CREATE VIRTUAL TABLE posts_fts USING fts5(title, content);

-- 同步触发器
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
```

**新增 API**:
- `GET /api/posts/search?q=关键词&use_fts=true`

#### 4. SEO 优化

**功能描述**: 文章级别的 SEO 元数据配置。

**新增字段**:
- `meta_title` - SEO 标题
- `meta_description` - SEO 描述
- `meta_keywords` - SEO 关键词

**API 更新**:
- 创建/更新文章接口支持 SEO 字段
- 文章详情接口返回 SEO 数据

#### 5. 文章可见性控制

**功能描述**: 支持设置文章的可见性级别。

**可见性选项**:
- `public` - 公开可见
- `private` - 仅作者可见
- `password` - 密码保护

**数据库变更**:
```sql
ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public';
ALTER TABLE posts ADD COLUMN password TEXT;
```

---

### 🔧 功能优化

#### 1. 用户认证增强

**变更内容**:
- 用户名登录替代邮箱登录（同时支持）
- 新增用户状态字段（active/suspended/deleted）
- 新增用户统计字段（post_count, comment_count）
- 新增最后登录时间记录

**数据库变更**:
```sql
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN post_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN comment_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
```

#### 2. 文章功能增强

**变更内容**:
- 新增阅读时长计算（reading_time）
- 文章列表支持多种排序方式
- 文章列表支持按专栏筛选
- 优化文章查询性能（新增复合索引）

**索引优化**:
```sql
CREATE INDEX idx_posts_column_published ON posts(column_id, published_at);
CREATE INDEX idx_posts_author_published ON posts(author_id, published_at);
CREATE INDEX idx_posts_status_visibility ON posts(status, visibility);
```

#### 3. 分类系统增强

**变更内容**:
- 新增分类图标字段（icon）
- 新增分类颜色字段（color）
- 新增分类排序字段（display_order）
- 标签系统同样支持颜色和描述

**数据库变更**:
```sql
ALTER TABLE categories ADD COLUMN icon TEXT;
ALTER TABLE categories ADD COLUMN color TEXT;
ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0;

ALTER TABLE tags ADD COLUMN description TEXT;
ALTER TABLE tags ADD COLUMN color TEXT;
```

#### 4. 评论系统优化

**变更内容**:
- 新增评论回复数统计（reply_count）
- 优化评论嵌套查询性能
- 新增评论状态管理（pending/approved/rejected/spam）

---

### 🐛 问题修复

1. **修复文章删除时关联图片未清理的问题**
   - 删除文章时自动清理 R2 存储桶中的关联图片

2. **修复用户删除时数据不一致问题**
   - 添加级联删除约束
   - 优化外键关联处理

3. **修复评论计数不准确问题**
   - 添加触发器自动同步评论计数
   - 修复嵌套评论计数逻辑

---

### 📚 文档更新

#### API 文档 (API.md)

**更新内容**:
- 新增专栏模块 API 文档
- 更新认证模块 API（邮箱验证码相关）
- 更新文章模块 API（搜索、SEO、可见性）
- 统一响应格式说明
- 新增 FTS5 搜索语法说明

**版本变更**: v3.0.1 → v1.2.0

#### 架构文档 (ARCHITECTURE.md)

**更新内容**:
- 新增专栏系统架构说明
- 更新数据库架构图（v2.0.0）
- 新增 FTS5 全文搜索架构
- 更新数据模型章节
- 新增邮箱服务集成说明

**版本变更**: 新增版本标识 v1.2.0

#### 快速开始 (QUICKSTART.md)

**更新内容**:
- 新增 Resend 邮箱配置说明
- 更新默认管理员账号（用户名登录）
- 新增专栏功能使用说明
- 更新常见问题（邮箱验证码、专栏功能）

**版本变更**: v3.0.1 → v1.2.0

#### 部署指南 (DEPLOYMENT.md)

**更新内容**:
- 新增 Resend 邮箱服务配置
- 更新环境变量说明
- 新增专栏功能故障排查
- 更新数据库表列表

**版本变更**: v3.0.1 → v1.2.0

#### README.md

**更新内容**:
- 新增专栏系统功能介绍
- 新增全文搜索功能介绍
- 新增邮箱验证码功能介绍
- 更新项目结构说明
- 新增 CHANGELOG.md 链接

**版本变更**: v3.0.1 → v1.2.0

---

### 🔒 安全增强

1. **邮箱验证码机制**
   - 防止恶意注册
   - 保护密码重置流程
   - 账号删除二次确认

2. **用户状态管理**
   - 支持封禁/删除用户
   - 登录时检查用户状态

3. **文章可见性控制**
   - 私密文章保护
   - 密码保护文章

---

### ⚡ 性能优化

1. **数据库索引优化**
   - 新增 15+ 个复合索引
   - 优化文章列表查询性能
   - 优化搜索查询性能

2. **FTS5 全文搜索**
   - 毫秒级搜索响应
   - 支持百万级数据量

3. **触发器优化**
   - 异步统计更新
   - 减少实时计算开销

---

## v1.1.0 (2026-01-15)

### 初始功能

#### 1. 基础博客功能
- 文章创建、编辑、发布
- Markdown 编辑器
- 代码语法高亮
- 文章分类和标签

#### 2. 用户系统
- 用户注册/登录
- GitHub OAuth 登录
- JWT 认证
- 用户资料管理

#### 3. 评论系统
- 嵌套评论（最多5层）
- 评论审核
- 评论点赞

#### 4. 互动功能
- 文章点赞
- 文章收藏
- 阅读历史

#### 5. 管理后台
- 仪表盘统计
- 文章管理
- 评论审核
- 用户管理
- 分类/标签管理
- 系统配置

---

## 升级指南

### 从 v1.1.0 升级到 v1.2.0

#### 1. 数据库迁移

```bash
# 执行数据库迁移脚本
cd backend
wrangler d1 execute personal-blog-db --file=./database/migrations/v1.1.0-to-v1.2.0.sql
```

迁移脚本包含：
- 创建 columns 表
- 创建 posts_fts 虚拟表
- 添加新字段到现有表
- 创建新的索引
- 创建新的触发器

#### 2. 环境变量更新

在 `.env` 文件中添加：
```env
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@your-domain.com
```

#### 3. 部署更新

```bash
# 部署后端
cd backend
wrangler deploy

# 部署前端
cd ../frontend
pnpm build
wrangler pages deploy dist
```

#### 4. 验证升级

1. 检查数据库表是否正常创建
2. 测试专栏功能
3. 测试邮箱验证码功能
4. 测试全文搜索功能

---

## 版本号说明

本项目采用语义化版本控制（Semantic Versioning）：

- **主版本号**：重大架构变更或不兼容的 API 修改
- **次版本号**：向下兼容的功能新增
- **修订号**：向下兼容的问题修复

### 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.2.0 | 2026-02-10 | 新增专栏、邮箱验证、全文搜索、SEO |
| v1.1.0 | 2026-01-15 | 初始版本，基础博客功能 |

---

## 反馈与支持

如有问题或建议，欢迎通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/Zoroaaa/personal-blog/issues)
- 发送邮件至：zoroasx@gmail.com

---

**当前版本**: v1.2.0 | **更新日期**: 2026-02-10

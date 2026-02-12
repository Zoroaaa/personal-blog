# 部署指南

本文档详细介绍如何将个人博客系统部署到 Cloudflare 平台。

**版本**: v1.3.0 | **更新日期**: 2026-02-12

---

## 目录

- [环境准备](#环境准备)
- [配置 Cloudflare 资源](#配置-cloudflare-资源)
- [本地配置](#本地配置)
- [部署步骤](#部署步骤)
- [环境变量说明](#环境变量说明)
- [验证部署](#验证部署)
- [故障排查](#故障排查)
- [更新部署](#更新部署)

---

## 环境准备

### 必要条件

1. **Cloudflare 账号**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com) 注册账号
   - 验证邮箱地址

2. **Node.js 环境**
   ```bash
   node --version  # 需要 v18 或更高
   npm --version   # 需要 v9 或更高
   ```

3. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler --version  # 需要 v3.x 或更高
   ```

4. **Git** (可选，用于版本控制)

---

## 配置 Cloudflare 资源

### 1. 创建 D1 数据库

```bash
# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create personal-blog-db

# 记录返回的 database_id，后续配置需要
```

### 2. 创建 R2 存储桶

```bash
# 创建图片存储桶
wrangler r2 bucket create personal-blog-images

# 配置公开访问（如需直接访问图片）
# 在 Cloudflare Dashboard > R2 > 存储桶 > 设置中配置
```

### 3. 创建 KV 命名空间（可选）

```bash
# 创建缓存 KV
wrangler kv:namespace create "CACHE"

# 记录返回的 id，后续配置需要
```

### 4. 配置 GitHub OAuth (可选)

如需支持 GitHub 登录：

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建新的 OAuth App
3. 填写信息：
   - Application name: Personal Blog
   - Homepage URL: `https://your-domain.pages.dev`
   - Authorization callback URL: `https://your-domain.pages.dev/api/auth/github`
4. 记录 Client ID 和 Client Secret

### 5. 配置 Resend 邮箱服务（可选）

如需支持邮箱验证码功能：

1. 访问 [Resend](https://resend.com) 注册账号
2. 验证域名
3. 获取 API Key

---

## 本地配置

### 1. 配置后端环境变量

编辑 `backend/.env`：

```env
# D1 数据库 ID（从创建数据库时获取）
D1_DATABASE_ID=your-database-id-here

# JWT 密钥（生成强随机字符串）
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Resend 邮箱服务（可选）
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@your-domain.com

# 管理员邮箱（用于接收系统通知）
ADMIN_EMAIL=admin@example.com
```

### 2. 配置前端环境变量

编辑 `frontend/.env.production`：

```env
# API 基础 URL
VITE_API_URL=https://your-worker.your-subdomain.workers.dev

# 站点名称
VITE_SITE_NAME=My Personal Blog
```

### 3. 配置 wrangler.toml

编辑 `backend/wrangler.toml`：

```toml
name = "personal-blog-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "personal-blog-db"
database_id = "your-database-id-here"

# R2 存储桶绑定
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "personal-blog-images"

# KV 命名空间绑定（可选）
[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-kv-id-here"

# 环境变量
[vars]
FRONTEND_URL = "https://your-domain.pages.dev"
STORAGE_PUBLIC_URL = "https://your-r2-public-url"
ENVIRONMENT = "production"

# 密钥（使用 wrangler secret 设置）
# wrangler secret put JWT_SECRET
# wrangler secret put GITHUB_CLIENT_SECRET
# wrangler secret put RESEND_API_KEY
```

---

## 部署步骤

### 第一步：初始化数据库

```bash
cd backend

# 执行数据库迁移
wrangler d1 execute personal-blog-db --file=./database/schema.sql

# 验证表创建成功
wrangler d1 execute personal-blog-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

数据库架构包含以下表：
- `users` - 用户信息（支持OAuth、邮箱验证）
- `posts` - 文章数据（支持专栏、SEO）
- `columns` - 专栏数据
- `comments` - 评论数据
- `categories` - 文章分类
- `tags` - 文章标签
- `post_tags` - 文章标签关联
- `likes` - 点赞记录
- `reading_history` - 阅读历史
- `favorites` - 收藏记录
- `notifications` - 通知数据
- `messages` - 私信数据
- `message_attachments` - 私信附件
- `site_config` - 站点配置
- `posts_fts` - 全文搜索虚拟表

### 第二步：部署后端

```bash
cd backend

# 设置密钥
wrangler secret put JWT_SECRET
# 输入你的 JWT 密钥

wrangler secret put GITHUB_CLIENT_SECRET
# 输入你的 GitHub Client Secret（如使用 GitHub OAuth）

wrangler secret put RESEND_API_KEY
# 输入你的 Resend API Key（如使用邮箱验证）

# 部署 Workers
wrangler deploy

# 记录部署后的 Workers URL
```

### 第三步：构建并部署前端

```bash
cd frontend

# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 部署到 Pages
wrangler pages deploy dist --project-name=personal-blog
```

或者使用 Git 集成自动部署：

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 连接 Git 仓库
3. 构建设置：
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Root directory: `frontend`

### 第四步：配置自定义域名（可选）

1. 在 Cloudflare Dashboard 添加域名
2. 配置 DNS 记录：
   - CNAME `blog` → `your-project.pages.dev`
3. 在 Pages 项目设置中绑定自定义域名
4. 更新后端 `FRONTEND_URL` 环境变量

---

## 环境变量说明

### 后端必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | 随机字符串，至少32位 |
| `D1_DATABASE_ID` | D1 数据库 ID | xxxxxxxx-xxxx-xxxx |
| `FRONTEND_URL` | 前端 URL | https://blog.example.com |
| `STORAGE_PUBLIC_URL` | R2 公开访问 URL | https://images.example.com |

### 后端可选变量

| 变量名 | 说明 | 用途 |
|--------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth ID | GitHub 登录 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 密钥 | GitHub 登录 |
| `RESEND_API_KEY` | Resend API 密钥 | 邮件发送 |
| `RESEND_FROM_EMAIL` | 发件人邮箱 | 邮件发送 |
| `ADMIN_EMAIL` | 管理员邮箱 | 接收通知 |

### 前端变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_API_URL` | API 基础 URL | https://api.example.com |
| `VITE_SITE_NAME` | 站点名称 | My Blog |

---

## 验证部署

### 1. 检查 API 健康状态

```bash
curl https://your-worker.workers.dev/health
```

预期响应：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "3.0.1",
    "timestamp": "2026-02-12T10:00:00.000Z",
    "services": {
      "database": "healthy",
      "cache": "healthy",
      "storage": "healthy"
    }
  }
}
```

### 2. 检查数据库连接

```bash
wrangler d1 execute personal-blog-db --command="SELECT COUNT(*) FROM users;"
```

### 3. 验证前端访问

打开 `https://your-domain.pages.dev`，确认：
- 首页正常加载
- 文章列表显示
- 分类/标签正常
- 专栏页面正常

### 4. 测试管理员登录

使用默认管理员账号登录：
- 用户名：`admin`
- 密码：`Admin123!`（**生产环境请立即修改**）

### 5. 测试邮箱验证（如启用）

1. 访问注册页面
2. 输入邮箱
3. 点击"发送验证码"
4. 检查邮箱是否收到验证码邮件

---

## 故障排查

### 数据库连接失败

**症状**: API 返回 500 错误，日志显示数据库连接问题

**解决**:
1. 检查 `wrangler.toml` 中的 `database_id` 是否正确
2. 确认数据库已创建：`wrangler d1 list`
3. 检查数据库绑定名称是否为 `DB`
4. 确认数据库迁移已执行

### CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决**:
1. 检查后端 `FRONTEND_URL` 环境变量是否包含前端域名
2. 确认 `wrangler.toml` 中的 `FRONTEND_URL` 配置正确
3. 检查后端 CORS 中间件配置

### 图片上传失败

**症状**: 上传图片返回 500 错误

**解决**:
1. 检查 R2 存储桶绑定是否正确
2. 确认存储桶名称与 `wrangler.toml` 一致
3. 检查文件大小限制（默认 5MB）
4. 确认 `STORAGE_PUBLIC_URL` 已正确设置

### 认证失败

**症状**: 登录后无法保持会话

**解决**:
1. 检查 `JWT_SECRET` 是否正确设置
2. 确认浏览器允许第三方 Cookie
3. 检查 Token 是否过期

### 邮箱验证码发送失败

**症状**: 发送验证码返回错误

**解决**:
1. 检查 `RESEND_API_KEY` 是否正确设置
2. 确认发件人域名已在 Resend 验证
3. 检查 `RESEND_FROM_EMAIL` 格式是否正确
4. 查看 Resend 控制台发送日志

### 专栏功能异常

**症状**: 专栏页面无法加载或文章不显示

**解决**:
1. 检查专栏数据是否正确创建
2. 确认文章已关联到专栏
3. 检查专栏统计触发器是否正常工作
4. 手动刷新专栏统计：`POST /api/columns/:id/refresh-stats`

---

## 更新部署

### 更新后端

```bash
cd backend

# 拉取最新代码
git pull

# 重新部署
wrangler deploy
```

### 更新前端

```bash
cd frontend

# 拉取最新代码
git pull

# 重新构建并部署
pnpm build
wrangler pages deploy dist
```

### 数据库迁移

如需更新数据库架构：

```bash
# 执行迁移
cd backend
wrangler d1 execute personal-blog-db --file=./database/migrations/xxx.sql

# 验证迁移结果
wrangler d1 execute personal-blog-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 性能优化

### 启用缓存

在 `wrangler.toml` 中添加：

```toml
[env.production]
routes = [
  { pattern = "api/*", zone_id = "your-zone-id" }
]
```

### 配置 CDN

1. 在 Cloudflare Dashboard 启用 CDN
2. 配置缓存规则：
   - 静态资源：缓存 1 天
   - API 响应：根据 Cache-Control 头

---

## 安全建议

1. **使用强密码**: 修改默认管理员密码
2. **启用 HTTPS**: 强制使用 HTTPS 访问
3. **定期备份**: 定期导出 D1 数据库
4. **监控日志**: 启用 Workers 日志记录
5. **限制访问**: 使用 Cloudflare Access 保护管理后台
6. **密钥管理**: 使用 wrangler secret 管理敏感信息

---

## 参考资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Resend 文档](https://resend.com/docs)

---

如有部署问题，请参考 [故障排查](#故障排查) 部分或提交 Issue。

# 快速开始指南

本文档将帮助您在 10 分钟内完成 Personal Blog 博客系统的本地开发和部署配置。

**版本**: v1.4.0  
**更新日期**: 2026-02-17

---

## 目录

- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [开发服务器](#开发服务器)
- [功能验证](#功能验证)
- [常见问题](#常见问题)

---

## 环境要求

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| Node.js | 18.x | 20.x+ | JavaScript 运行时 |
| pnpm | 8.x | 9.x+ | 包管理器（推荐） |
| npm | 9.x | 10.x+ | 包管理器（备选） |
| Git | 2.x | 最新版 | 版本控制 |

### Cloudflare 账号要求

您需要一个 Cloudflare 账号，并开通以下服务：

- **Cloudflare Workers** - 后端运行环境
- **Cloudflare D1** - SQLite 数据库
- **Cloudflare KV** - 键值存储（可选，用于缓存）
- **Cloudflare R2** - 对象存储（图片上传）
- **Cloudflare Pages** - 前端托管

> 💡 所有服务都有免费额度，足够个人博客使用。

### 第三方服务（可选）

| 服务 | 用途 | 是否必需 |
|------|------|---------|
| Resend | 邮件发送（验证码、通知） | 推荐 |
| GitHub OAuth | GitHub 登录 | 可选 |
| 自定义域名 | 生产环境部署 | 推荐 |

---

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/personal-blog.git
cd personal-blog
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

### 3. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 4. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器进行授权，完成后即可在本地操作 Cloudflare 资源。

---

## 配置说明

### 后端配置

#### 1. 创建配置文件

```bash
cd backend
cp .env.example .env
```

#### 2. 编辑 `.env` 文件

```env
# JWT 密钥（必需，请使用随机字符串）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars

# Resend API Key（用于邮件发送）
RESEND_API_KEY=re_xxxxxxxxxxxx

# GitHub OAuth（可选）
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 前端地址（CORS配置）
FRONTEND_URL=http://localhost:5173
```

#### 3. 配置 `wrangler.toml`

```bash
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`：

```toml
name = "personal-blog-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "personal-blog-dev"
database_id = "your-database-id"  # 创建数据库后填入

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "personal-blog-images-dev"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"  # 创建KV后填入
```

### 数据库初始化

#### 1. 创建 D1 数据库

```bash
wrangler d1 create personal-blog-dev
```

执行后会返回数据库 ID，将其填入 `wrangler.toml` 的 `database_id` 字段。

#### 2. 执行数据库迁移

按顺序执行以下迁移脚本：

```bash
# 基础表结构
wrangler d1 execute personal-blog-dev --file=../database/schema-v1.1-base.sql

# 通知和私信系统
wrangler d1 execute personal-blog-dev --file=../database/schema-v1.3-notification-messaging.sql

# Refresh Token 支持
wrangler d1 execute personal-blog-dev --file=../database/schema-v1.4-refresh-tokens.sql
```

#### 3. 验证数据库

```bash
wrangler d1 execute personal-blog-dev --command="SELECT name FROM sqlite_master WHERE type='table'"
```

应返回以下表：
- users（用户表）
- posts（文章表）
- columns（专栏表）
- categories（分类表）
- tags（标签表）
- comments（评论表）
- post_likes（点赞表）
- post_favorites（收藏表）
- reading_history（阅读历史表）
- notifications（通知表）
- messages（私信表）
- message_threads（私信会话表）
- notification_settings（通知设置表）
- message_settings（私信设置表）
- system_notifications（系统通知表）
- config（系统配置表）

### R2 存储桶配置

#### 1. 创建 R2 存储桶

```bash
wrangler r2 bucket create personal-blog-images-dev
```

#### 2. 配置 CORS（可选）

如需在浏览器中直接访问图片，配置 R2 的 CORS 规则：

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### KV 命名空间配置（可选）

```bash
wrangler kv:namespace create CACHE
```

将返回的 ID 填入 `wrangler.toml`。

### 前端配置

#### 1. 创建配置文件

```bash
cd frontend
cp .env.example .env
```

#### 2. 编辑 `.env` 文件

```env
# 后端 API 地址（需包含 /api 后缀）
VITE_API_URL=http://localhost:8787/api

# 是否开启调试模式
VITE_DEBUG=true
```

---

## 开发服务器

### 启动后端

```bash
cd backend
pnpm dev
```

后端服务将在 `http://localhost:8787` 启动。

### 启动前端

打开新终端：

```bash
cd frontend
pnpm dev
```

前端服务将在 `http://localhost:5173` 启动。

### 验证服务

1. 访问 `http://localhost:5173`
2. 点击右上角「登录」
3. 点击「注册」创建管理员账号
4. 登录后访问 `/admin` 进入管理后台

---

## 功能验证

### v1.4.0 新功能验证清单

#### 热门文章排行

1. 访问首页
2. 查看右侧边栏「热门文章排行」模块
3. 确认显示浏览量最高的文章列表

#### 文章置顶

1. 以管理员身份登录
2. 进入管理后台 → 文章管理
3. 编辑任意文章，勾选「置顶」选项
4. 保存后返回首页，确认置顶文章显示在列表顶部

#### 上下篇导航

1. 点击任意文章进入详情页
2. 滚动到文章底部
3. 确认显示「上一篇」「下一篇」导航链接

#### 推荐文章

1. 在文章详情页底部
2. 确认显示「相关推荐」文章列表

#### 阅读历史页面

1. 阅读几篇文章
2. 点击导航栏「阅读历史」
3. 确认显示已阅读文章列表

#### 账号设置页面

1. 点击用户头像 → 「账号设置」
2. 确认可以修改密码、邮箱等账号信息

#### 个人中心

1. 点击用户头像 → 「个人中心」
2. 确认显示评论、点赞、收藏等标签页
3. 确认不再有子页面导航

#### 主题设置

1. 点击右上角主题切换按钮
2. 确认可以切换亮色/暗色模式
3. 确认可以调整主色调
4. 确认可以调整字体大小
5. 刷新页面后设置应保持

### 基础功能验证

- [ ] 用户注册/登录
- [ ] 文章创建/编辑/删除
- [ ] Markdown 渲染
- [ ] 代码高亮
- [ ] 图片上传
- [ ] 评论发布
- [ ] 文章点赞/收藏
- [ ] 分类/标签筛选
- [ ] 全文搜索
- [ ] 通知中心
- [ ] 私信功能

---

## 常见问题

### Q: 数据库迁移失败？

**A**: 确保按顺序执行迁移脚本，且数据库 ID 正确配置在 `wrangler.toml` 中。

```bash
# 检查数据库列表
wrangler d1 list

# 查看数据库详情
wrangler d1 info personal-blog-dev
```

### Q: 图片上传失败？

**A**: 检查 R2 存储桶是否正确创建：

```bash
wrangler r2 bucket list
```

确认 `wrangler.toml` 中的 bucket_name 正确。

### Q: 邮件发送失败？

**A**: 
1. 确认 Resend API Key 正确配置
2. 检查 Resend 账号是否已验证域名
3. 开发环境可使用 Resend 的测试邮箱

### Q: GitHub OAuth 登录失败？

**A**: 
1. 确认 GitHub OAuth 应用配置正确
2. 回调地址应设置为：`http://localhost:5173/auth/callback`
3. 检查 Client ID 和 Client Secret 是否正确

### Q: 前端无法连接后端？

**A**: 
1. 确认后端服务已启动
2. 检查 `VITE_API_URL` 配置
3. 检查 CORS 配置

### Q: 主题设置不生效？

**A**: 
1. 清除浏览器缓存
2. 检查 localStorage 中是否有 theme 相关数据
3. 确认 themeStore 正确初始化

### Q: 置顶文章不显示？

**A**: 
1. 确认已执行 `migration-v1.9-post-pinning.sql` 迁移
2. 检查 posts 表是否有 `is_pinned` 字段
3. 确认文章的 `is_pinned` 值为 1

---

## 下一步

- 📖 阅读 [API 文档](./API.md) 了解接口详情
- 🚀 阅读 [部署指南](./DEPLOYMENT.md) 部署到生产环境
- 🏗️ 阅读 [架构文档](./ARCHITECTURE.md) 了解系统设计

---

**版本**: v1.4.0 | **更新日期**: 2026-02-17

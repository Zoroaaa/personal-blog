# 快速开始

本文档帮助您在 5 分钟内启动并运行个人博客系统。

**版本**: v3.0.1 | **更新日期**: 2026-02-09

## 目录

- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [启动开发服务器](#启动开发服务器)
- [首次使用](#首次使用)
- [常见问题](#常见问题)

## 环境要求

### 必需软件

- **Node.js**: v18.0.0 或更高版本
- **包管理器**: pnpm (推荐) 或 npm v9+
- **Git**: 用于克隆项目

### 验证环境

```bash
# 检查 Node.js 版本
node --version
# 应显示 v18.x.x 或更高

# 检查 pnpm
pnpm --version
# 应显示 8.x.x 或更高

# 如未安装 pnpm
npm install -g pnpm
```

### Cloudflare 账号

1. 访问 [cloudflare.com](https://cloudflare.com) 注册账号
2. 验证邮箱地址

## 安装步骤

### 1. 克隆项目

```bash
# 使用 HTTPS
git clone https://github.com/yourusername/personal-blog.git

# 或使用 SSH
git clone git@github.com:yourusername/personal-blog.git

# 进入项目目录
cd personal-blog
```

### 2. 安装依赖

```bash
# 安装根目录依赖（如有）
pnpm install

# 安装后端依赖
cd backend && pnpm install

# 安装前端依赖
cd ../frontend && pnpm install
```

### 3. 配置 Wrangler CLI

```bash
# 全局安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 验证登录状态
wrangler whoami
```

## 配置说明

### 后端配置

1. **创建环境文件**

```bash
cd backend
cp .env.example .env
```

2. **编辑 `.env` 文件**

```env
# 必需配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
D1_DATABASE_ID=your-database-id-here

# 可选配置
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
ADMIN_EMAIL=admin@example.com
```

3. **创建 D1 数据库**

```bash
# 创建数据库
wrangler d1 create personal-blog-dev

# 记录返回的 database_id，填入 .env 文件
```

4. **初始化数据库**

```bash
# 执行数据库迁移
wrangler d1 execute personal-blog-dev --file=./database/schema.sql

# 验证表创建成功
wrangler d1 execute personal-blog-dev --command="SELECT name FROM sqlite_master WHERE type='table';"
```

5. **配置 wrangler.toml**

```toml
name = "personal-blog-api-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "personal-blog-dev"
database_id = "your-database-id-here"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[vars]
SITE_URL = "http://localhost:5173"
SITE_NAME = "My Personal Blog"
```

### 前端配置

1. **创建环境文件**

```bash
cd frontend
cp .env.example .env
```

2. **编辑 `.env` 文件**

```env
# 开发环境 API 地址
VITE_API_URL=http://localhost:8787

# 站点名称
VITE_SITE_NAME=My Personal Blog
```

## 启动开发服务器

### 方式一：同时启动前后端（推荐）

使用 concurrently 或其他工具：

```bash
# 在项目根目录
pnpm dev

# 或分别启动
```

### 方式二：分别启动

**终端 1 - 启动后端：**

```bash
cd backend

# 方式 A：使用 Wrangler 开发服务器（推荐）
pnpm dev
# 服务运行在 http://localhost:8787

# 方式 B：使用 Miniflare（本地模拟 Workers 环境）
pnpm dev:local
```

**终端 2 - 启动前端：**

```bash
cd frontend

# 启动 Vite 开发服务器
pnpm dev
# 服务运行在 http://localhost:5173
```

### 验证启动

1. **前端访问**: 打开浏览器访问 http://localhost:5173
2. **后端健康检查**: 访问 http://localhost:8787/api/health

预期响应：
```json
{
  "status": "ok",
  "version": "3.0.1",
  "timestamp": "2026-02-09T10:00:00.000Z"
}
```

## 首次使用

### 1. 访问首页

打开 http://localhost:5173，您将看到博客首页。

### 2. 登录管理后台

点击右上角的"登录"按钮，使用默认管理员账号：

- **邮箱**: `admin@example.com`
- **密码**: `admin123`

**⚠️ 安全提示**: 首次登录后请立即修改默认密码！

### 3. 创建第一篇文章

1. 登录后进入管理后台
2. 点击"文章管理"
3. 点击"新建文章"
4. 填写标题、内容，选择分类
5. 点击"发布"

### 4. 配置站点信息

1. 进入管理后台
2. 点击"系统设置"
3. 配置站点名称、描述、Logo 等

## 项目结构速览

```
personal-blog/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── index.ts        # 应用入口
│   │   ├── routes/         # API 路由
│   │   └── types.ts        # 类型定义
│   ├── database/
│   │   └── schema.sql      # 数据库架构
│   ├── .env                # 环境变量
│   └── wrangler.toml       # Workers 配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 可复用组件
│   │   ├── stores/         # 状态管理
│   │   └── utils/          # 工具函数
│   ├── .env                # 环境变量
│   └── index.html
└── package.json
```

## 常用命令

### 后端命令

```bash
cd backend

# 启动开发服务器
pnpm dev

# 部署到生产环境
pnpm deploy

# 查看日志
pnpm logs

# 数据库操作
wrangler d1 execute personal-blog-dev --command="SELECT * FROM users;"
```

### 前端命令

```bash
cd frontend

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 部署到 Pages
pnpm deploy
```

## 常见问题

### Q: 后端启动报错 "D1_DATABASE_ID is not defined"

**A**: 确保已正确配置 `.env` 文件并填入数据库 ID：

```bash
# 检查数据库列表
wrangler d1 list

# 复制 database_id 到 .env 文件
```

### Q: 前端无法连接后端 API

**A**: 检查以下几点：

1. 后端服务是否已启动（端口 8787）
2. 前端 `.env` 文件中的 `VITE_API_URL` 是否正确
3. 浏览器控制台是否有 CORS 错误

### Q: 数据库迁移失败

**A**: 检查 SQL 文件路径：

```bash
# 确认 schema.sql 文件存在
ls backend/database/schema.sql

# 重新执行迁移
wrangler d1 execute personal-blog-dev --file=./database/schema.sql
```

### Q: 登录提示 "Invalid credentials"

**A**: 默认管理员账号信息：
- 邮箱: `admin@example.com`
- 密码: `admin123`

如忘记密码，可通过数据库重置：

```bash
wrangler d1 execute personal-blog-dev --command="
  UPDATE users 
  SET password_hash = '\$2a\$10\$...' 
  WHERE email = 'admin@example.com';
"
```

### Q: 图片上传失败

**A**: 本地开发环境需要配置 R2 存储桶：

1. 创建 R2 存储桶：
```bash
wrangler r2 bucket create personal-blog-images-dev
```

2. 更新 `wrangler.toml`：
```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "personal-blog-images-dev"
```

### Q: 如何启用 GitHub OAuth 登录？

**A**: 

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建 OAuth App
3. 设置回调 URL: `http://localhost:5173/api/auth/github/callback`
4. 将 Client ID 和 Secret 填入 `.env` 文件

## 下一步

- 📖 阅读 [API 文档](./API.md) 了解完整接口
- 🏗️ 查看 [架构文档](./ARCHITECTURE.md) 了解系统设计
- 🚀 参考 [部署指南](./DEPLOYMENT.md) 部署到生产环境

## 获取帮助

- 提交 [GitHub Issue](https://github.com/yourusername/personal-blog/issues)
- 查看 [常见问题](./FAQ.md)

---

**恭喜！** 您已成功启动个人博客系统。开始创作吧！🎉

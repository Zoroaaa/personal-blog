# 部署指南

本文档详细介绍如何将 Personal Blog 博客系统部署到 Cloudflare 边缘计算平台。

**版本**: v1.5.0  
**更新日期**: 2026-03-22

---

## 目录

- [部署架构](#部署架构)
- [部署概览](#部署概览)
- [前置准备](#前置准备)
- [第一步：Cloudflare 资源创建](#第一步cloudflare-资源创建)
- [第二步：后端部署](#第二步后端部署)
- [第三步：前端部署](#第三步前端部署)
- [第四步：域名配置](#第四步域名配置)
- [第五步：验证部署](#第五步验证部署)
- [环境变量配置汇总](#环境变量配置汇总)
- [故障排除](#故障排除)

---

## 部署架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户请求                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN (全球边缘节点)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   Cloudflare Pages        │   │   Cloudflare Workers      │
│   (前端静态资源)           │   │   (后端 API 服务)          │
│   - React SPA             │   │   - Hono 框架              │
│   - Git 自动部署           │   │   - GitHub Actions 部署    │
└───────────────────────────┘   └───────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
        ┌───────────────────────────────────────────┐
        │           Cloudflare 服务层               │
        ├───────────────────────────────────────────┤
        │  ┌─────────────┐  ┌─────────────┐        │
        │  │  D1 数据库   │  │  R2 存储     │        │
        │  │  (SQLite)   │  │  (图片/文件) │        │
        │  └─────────────┘  └─────────────┘        │
        │  ┌─────────────┐                         │
        │  │  KV 缓存    │                         │
        │  └─────────────┘                         │
        └───────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │              第三方服务                    │
        ├───────────────────────────────────────────┤
        │  Resend (邮件服务)                        │
        │  GitHub OAuth (第三方登录)                │
        └───────────────────────────────────────────┘
```

### 部署流程概览

| 步骤 | 内容 | 部署方式 |
|------|------|---------|
| 前端 | Cloudflare Pages | GitHub 直连自动触发 |
| 后端 | Cloudflare Workers | GitHub Actions 自动部署 |

### 服务组件说明

| 组件 | 服务 | 用途 | 免费额度 |
|------|------|------|---------|
| 前端托管 | Cloudflare Pages | React SPA 托管 | 无限制 |
| 后端运行 | Cloudflare Workers | API 服务 | 10万次/天 |
| 数据库 | Cloudflare D1 | SQLite 数据存储 | 500MB |
| 对象存储 | Cloudflare R2 | 图片文件存储 | 10GB |
| 缓存 | Cloudflare KV | 数据缓存 | 1GB |
| 邮件 | Resend | 邮件发送 | 3000封/月 |

---

## 前置准备

### 1. 必需账号

| 账号 | 用途 | 注册地址 |
|------|------|---------|
| GitHub | 代码托管 + CI/CD | https://github.com |
| Cloudflare | 前后端托管服务 | https://dash.cloudflare.com/sign-up |
| Resend | 邮件发送服务 | https://resend.com |

### 2. Cloudflare 账号准备

登录 Cloudflare Dashboard，确保以下服务已启用：

1. **Workers & Pages** - 后端运行环境
2. **D1 SQL Database** - 数据库
3. **R2 Object Storage** - 文件存储
4. **KV** - 键值缓存

> 💡 这些服务在 Cloudflare 免费套餐中均可用，无需额外付费。

### 3. 域名配置（推荐）

如需使用自定义域名：

1. 将域名添加到 Cloudflare（Dashboard → Add a site）
2. 在域名注册商处更新 DNS 服务器为 Cloudflare 提供的地址
3. 等待 DNS 生效（通常几分钟到几小时）

### 4. 第三方服务配置

#### Resend 邮件服务

1. 访问 [resend.com](https://resend.com) 注册账号
2. 进入 Dashboard → API Keys → Create API Key
3. 复制 API Key（格式：`re_xxxxxxxxxxxx`）
4. 生产环境需验证发件域名（Settings → Domains）

#### GitHub OAuth（可选，用于 GitHub 登录）

1. 访问 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. 填写应用信息：
   - **Application name**: 你的博客名称
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/auth/callback`
3. 创建后复制 **Client ID**
4. 点击 **Generate a new client secret** 获取 **Client Secret**

---

## 第一步：Cloudflare 资源创建

### 1.1 获取 Cloudflare API Token

1. 登录 Cloudflare Dashboard
2. 点击右上角头像 → My Profile → API Tokens
3. 点击 **Create Token**
4. 选择 **编辑 Cloudflare Workers** 模板
5. 点击右侧 **Continue to summary** → **Create Token**
6. **立即复制并保存 Token**（只显示一次）

> ⚠️ **重要**：如果部署时报 D1 权限错误，需要手动添加 D1 编辑权限：
> 1. 在创建 Token 页面选择 **编辑 Cloudflare Workers** 模板后
> 2. 点击 **Edit template** 或在权限列表中找到 **Account** → **D1** → 设置为 **Edit**
> 3. 然后再继续创建 Token

### 1.2 获取 Account ID

1. 登录 Cloudflare Dashboard
2. 点击右侧栏任意域名或 Workers & Pages
3. 在右侧 **API** 区域找到 **Account ID**
4. 复制保存

### 1.3 创建 D1 数据库

在 Cloudflare Dashboard 中：

1. 进入 **Workers & Pages** → **D1 SQL Database**
2. 点击 **Create database**
3. 数据库名称填写：`blog-db`
4. 点击 **Create**
5. 创建成功后，记录 **Database ID**（格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

### 1.4 创建 R2 存储桶

1. 进入 **Workers & Pages** → **R2 Object Storage**
2. 点击 **Create bucket**
3. 存储桶名称填写：`blog-storage`
4. 点击 **Create bucket**

### 1.5 创建 KV 命名空间

1. 进入 **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 名称填写：`CACHE`
4. 点击 **Add**
5. 创建成功后，记录 **ID**

---

## 第二步：后端部署

后端采用 **GitHub Actions** 自动部署到 Cloudflare Workers。

### 2.1 Fork 或 Clone 项目

```bash
git clone https://github.com/yourusername/personal-blog.git
cd personal-blog
```

### 2.2 配置 GitHub Secrets

进入你的 GitHub 仓库 → Settings → Secrets and variables → Actions

添加以下 **Repository secrets**：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | [第一步 1.1](#11-获取-cloudflare-api-token) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | [第一步 1.2](#12-获取-account-id) |

### 2.3 配置 wrangler.toml

编辑 `backend/wrangler.toml` 文件：

```toml
name = "blog-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Worker 设置
workers_dev = false
route = { pattern = "api.your-domain.com/*", zone_name = "your-domain.com" }

# D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "你的数据库ID"  # 替换为第一步 1.3 获取的 ID

# KV 缓存
[[kv_namespaces]]
binding = "CACHE"
id = "你的KV命名空间ID"  # 替换为第一步 1.5 获取的 ID

# R2 存储
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "blog-storage"

# 日志配置
[observability]
enabled = true

# 定时任务触发器（可选）
[triggers]
crons = ["0 8 * * *", "0 9 * * 1"]

# 环境变量（公开配置）
[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://your-domain.com"  # 替换为你的前端域名
STORAGE_PUBLIC_URL = "https://storage.your-domain.com"  # R2 公开访问 URL
```

> ⚠️ **重要**：将 `your-domain.com` 替换为你的实际域名。

> 💡 **参考**：完整的后端环境变量配置示例请查看 [backend/.env.example](../backend/.env.example) 文件。

### 2.4 初始化数据库

#### 方式一：Cloudflare Dashboard 控制台（推荐新手）

1. 进入 **Workers & Pages** → **D1 SQL Database** → **blog-db**
2. 点击 **Console** 标签页
3. 按顺序复制粘贴以下 SQL 文件内容并执行：

| 顺序 | 文件 | 说明 |
|------|------|------|
| 1 | `database/schema-v1.1-base.sql` | 基础表结构（必需） |
| 2 | `database/schema-v1.3-notification-messaging.sql` | 通知与私信系统（必需） |
| 3 | `database/schema-v1.4-refresh-tokens.sql` | Refresh Token 支持（必需） |

> 💡 打开对应的 SQL 文件，复制全部内容，粘贴到控制台输入框，点击 **Execute** 执行。

#### 方式二：本地命令行

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 执行数据库迁移（按顺序执行）
cd backend

# 1. 基础表结构
wrangler d1 execute blog-db --file=../database/schema-v1.1-base.sql

# 2. 通知与私信系统
wrangler d1 execute blog-db --file=../database/schema-v1.3-notification-messaging.sql

# 3. Refresh Token 支持
wrangler d1 execute blog-db --file=../database/schema-v1.4-refresh-tokens.sql
```

### 2.5 配置后端 Secrets

在 Cloudflare Dashboard 中配置敏感环境变量：

1. 进入 **Workers & Pages** → **blog-api** → **Settings** → **Variables**
2. 添加以下 **Encrypted** 环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `JWT_SECRET` | JWT 签名密钥（必需） | 32位以上随机字符串 |
| `POST_PASSWORD_SECRET` | 文章密码访问密钥（可选） | 随机字符串 |
| `GITHUB_CLIENT_ID` | GitHub OAuth ID（可选） | Iv1.xxxxxxxx |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Secret（可选） | xxxxxxxx |

**生成 JWT_SECRET 示例**：

```bash
# macOS/Linux
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.6 触发后端部署

将代码推送到 GitHub `main` 分支：

```bash
git add .
git commit -m "Configure deployment"
git push origin main
```

GitHub Actions 会自动触发部署。可在仓库的 **Actions** 标签页查看部署进度。

---

## 第三步：前端部署

前端采用 **Cloudflare Pages Git 集成**，推送代码自动触发部署。

### 3.1 创建 Pages 项目

1. 登录 Cloudflare Dashboard
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选择 **GitHub**，授权 Cloudflare 访问你的仓库
4. 选择 `personal-blog` 仓库
5. 配置构建设置：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory (advanced) | `frontend` |

### 3.2 配置前端环境变量

在 Pages 项目设置中添加环境变量：

1. 进入 **Workers & Pages** → **你的项目** → **Settings** → **Environment variables**
2. 添加 **Production** 环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_API_URL` | 后端 API 地址 | `https://api.your-domain.com/api` |

> ⚠️ **重要**：`VITE_API_URL` 必须包含 `/api` 后缀！
> 
> 后端所有路由都以 `/api/` 开头（如 `/api/posts`、`/api/auth/login`），前端请求时会直接拼接 endpoint，因此环境变量需要包含 `/api` 路径。
> 
> **正确示例**：`https://api.your-domain.com/api`  
> **错误示例**：`https://api.your-domain.com`（缺少 `/api` 后缀）

> 💡 **参考**：完整的前端环境变量配置示例请查看 [frontend/.env.example](../frontend/.env.example) 文件。

### 3.3 配置 SPA 路由重定向

在 `frontend/public/` 目录下创建 `_redirects` 文件：

```
/* /index.html 200
```

此文件确保 SPA 路由在刷新页面时正常工作。

### 3.4 触发前端部署

保存配置后，Cloudflare Pages 会自动触发首次部署。

后续每次推送到 `main` 分支，前端会自动重新部署。

---

## 第四步：域名配置

### 4.1 配置后端 Workers 域名

1. 进入 **Workers & Pages** → **blog-api** → **Settings** → **Triggers**
2. 在 **Routes** 区域点击 **Add route**
3. 输入路由：`api.your-domain.com/*`
4. 选择对应的 Zone（你的域名）
5. 点击 **Save**

### 4.2 配置前端 Pages 域名

1. 进入 **Workers & Pages** → **你的项目** → **Settings** → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入域名：`your-domain.com` 或 `www.your-domain.com`
4. 点击 **Activate domain**
5. Cloudflare 会自动配置 DNS 记录

### 4.3 配置 R2 公开访问（可选）

如需公开访问上传的图片：

1. 进入 **R2** → **blog-storage** → **Settings**
2. 在 **Public access** 区域点击 **Allow Access**
3. 配置自定义域名：`storage.your-domain.com`
4. 更新 `wrangler.toml` 中的 `STORAGE_PUBLIC_URL`

### 4.4 SSL/TLS 配置

在 Cloudflare Dashboard → SSL/TLS 中：

- 设置加密模式为 **Full (strict)**
- 启用 **Always Use HTTPS**
- 启用 **Automatic HTTPS Rewrites**

---

## 第五步：验证部署

### 5.1 检查部署状态

#### 后端验证

```bash
# 测试 API 健康检查
curl https://api.your-domain.com/api/health

# 测试公开接口
curl https://api.your-domain.com/api/posts
```

#### 前端验证

1. 访问 `https://your-domain.com`
2. 确认页面正常加载
3. 测试登录/注册功能

### 5.2 功能验证清单

- [ ] 首页正常显示
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 文章列表加载
- [ ] 文章详情页
- [ ] 图片上传（需要 R2 配置正确）
- [ ] 评论功能
- [ ] GitHub 登录（如已配置）

### 5.3 查看日志

#### 后端日志

```bash
# 实时查看 Workers 日志
wrangler tail
```

或在 Cloudflare Dashboard → Workers → blog-api → Logs 中查看。

#### 前端日志

在 Cloudflare Dashboard → Pages → 你的项目 → Deployments 中查看部署日志。

---

## 环境变量配置汇总

> 💡 **提示**：环境变量配置示例文件位于：
> - 后端：[backend/.env.example](../backend/.env.example)
> - 前端：[frontend/.env.example](../frontend/.env.example)

### 后端环境变量

| 变量名 | 类型 | 是否必需 | 说明 |
|--------|------|---------|------|
| `JWT_SECRET` | Secret | ✅ 必需 | JWT 签名密钥，32位以上随机字符串 |
| `POST_PASSWORD_SECRET` | Secret | 可选 | 文章密码访问 Token 密钥 |
| `GITHUB_CLIENT_ID` | Secret | 可选 | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | Secret | 可选 | GitHub OAuth Client Secret |
| `ENVIRONMENT` | 公开 | ✅ 必需 | 环境标识：`production` |
| `FRONTEND_URL` | 公开 | ✅ 必需 | 前端地址，用于 CORS |
| `STORAGE_PUBLIC_URL` | 公开 | 可选 | R2 公开访问 URL |

### 前端环境变量

| 变量名 | 是否必需 | 说明 |
|--------|---------|------|
| `VITE_API_URL` | ✅ 必需 | 后端 API 地址（需包含 `/api` 后缀，如 `https://api.your-domain.com/api`） |

### GitHub Secrets

| Secret 名称 | 说明 |
|------------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

---

## 故障排除

### 常见问题

#### 1. Workers 部署失败：`Error: No such binding: DB`

**原因**：D1 数据库绑定配置错误

**解决方案**：
1. 检查 `wrangler.toml` 中 `database_id` 是否正确
2. 确认数据库已创建：`wrangler d1 list`
3. 确认 binding 名称与代码中一致

#### 2. 数据库连接失败：`D1_ERROR: No such database`

**原因**：数据库 ID 配置错误或数据库未创建

**解决方案**：
```bash
# 查看数据库列表
wrangler d1 list

# 查看数据库详情
wrangler d1 info blog-db
```

#### 3. CORS 错误：`Access-Control-Allow-Origin`

**原因**：前端域名未正确配置

**解决方案**：
1. 检查 `wrangler.toml` 中 `FRONTEND_URL` 是否正确
2. 确保包含完整协议：`https://your-domain.com`
3. 不要以 `/` 结尾

#### 4. 图片上传失败：`R2 bucket not found`

**原因**：R2 存储桶未创建或名称不匹配

**解决方案**：
```bash
# 查看存储桶列表
wrangler r2 bucket list

# 创建存储桶
wrangler r2 bucket create blog-storage
```

#### 5. 前端刷新 404 错误

**原因**：SPA 路由重定向未配置

**解决方案**：
确保 `frontend/public/_redirects` 文件存在且内容正确：
```
/* /index.html 200
```

#### 6. GitHub Actions 部署失败

**原因**：Secrets 未配置或 Token 权限不足

**解决方案**：
1. 检查 GitHub Secrets 是否正确配置
2. 确认 API Token 有足够的权限
3. 查看 Actions 日志定位具体错误

#### 7. 邮件发送失败

**原因**：Resend API Key 未配置或域名未验证

**解决方案**：
1. 检查 Resend API Key 是否正确
2. 生产环境需验证发件域名
3. 开发环境可使用 Resend 提供的测试邮箱

### 调试命令

```bash
# 查看后端日志
wrangler tail

# 本地测试生产配置
wrangler dev --remote

# 检查数据库内容
wrangler d1 execute blog-db --command="SELECT * FROM posts LIMIT 5"

# 测试 API 接口
curl https://api.your-domain.com/api/posts

# 查看部署历史
wrangler deployments list
```

---

## 部署检查清单

完成以下所有步骤确保部署成功：

### Cloudflare 资源创建
- [ ] 创建 D1 数据库 `blog-db`
- [ ] 创建 R2 存储桶 `blog-storage`
- [ ] 创建 KV 命名空间 `CACHE`
- [ ] 获取 API Token
- [ ] 获取 Account ID

### GitHub 配置
- [ ] Fork/Clone 项目到你的 GitHub
- [ ] 配置 Secret `CLOUDFLARE_API_TOKEN`
- [ ] 配置 Secret `CLOUDFLARE_ACCOUNT_ID`

### 后端配置
- [ ] 修改 `wrangler.toml` 中的数据库 ID
- [ ] 修改 `wrangler.toml` 中的 KV ID
- [ ] 修改 `wrangler.toml` 中的域名配置
- [ ] 执行数据库迁移脚本
- [ ] 配置 Cloudflare Workers Secrets

### 前端配置
- [ ] 创建 Cloudflare Pages 项目
- [ ] 配置环境变量 `VITE_API_URL`（需包含 `/api` 后缀）
- [ ] 确保 `_redirects` 文件存在

### 域名配置
- [ ] 配置后端 Workers 路由
- [ ] 配置前端 Pages 自定义域名
- [ ] 配置 SSL/TLS

### 验证
- [ ] 后端 API 可访问
- [ ] 前端页面可访问
- [ ] 用户注册/登录正常
- [ ] 图片上传正常

---

**版本**: v1.5.0 | **更新日期**: 2026-03-22

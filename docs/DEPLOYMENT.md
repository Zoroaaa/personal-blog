# 部署指南

本文档详细介绍如何将 Personal Blog 博客系统部署到 Cloudflare 边缘计算平台。

**版本**: v1.4.0  
**更新日期**: 2026-02-17

---

## 目录

- [部署架构](#部署架构)
- [前置准备](#前置准备)
- [后端部署](#后端部署)
- [前端部署](#前端部署)
- [域名配置](#域名配置)
- [环境变量配置](#环境变量配置)
- [CI/CD 配置](#cicd-配置)
- [监控与日志](#监控与日志)
- [性能优化](#性能优化)
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
│   - 静态资源 CDN 加速      │   │   - 边缘计算               │
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
        │  ┌─────────────┐  ┌─────────────┐        │
        │  │  KV 缓存    │  │  Analytics  │        │
        │  │  (可选)     │  │  (分析)     │        │
        │  └─────────────┘  └─────────────┘        │
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

### 1. Cloudflare 账号

确保您已拥有 Cloudflare 账号，并完成以下操作：

- 绑定支付方式（部分服务需要）
- 验证邮箱地址
- 开通 Workers、D1、R2 服务

### 2. 域名配置（推荐）

如果使用自定义域名：

1. 将域名添加到 Cloudflare
2. 更新域名 DNS 服务器
3. 等待 DNS 生效（通常几分钟到几小时）

### 3. 第三方服务

#### Resend 邮件服务

1. 访问 [resend.com](https://resend.com) 注册账号
2. 创建 API Key
3. 验证发件域名（生产环境必需）

#### GitHub OAuth（可选）

1. 访问 GitHub Settings → Developer settings → OAuth Apps
2. 创建新的 OAuth App
3. 设置回调 URL：`https://your-domain.com/auth/callback`
4. 获取 Client ID 和 Client Secret

---

## 后端部署

### 1. 配置 wrangler.toml

```bash
cd backend
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`：

```toml
name = "personal-blog-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "personal-blog-prod"
database_id = "your-production-database-id"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "personal-blog-images-prod"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[observability]
enabled = true
```

### 2. 创建生产数据库

```bash
# 创建生产数据库
wrangler d1 create personal-blog-prod

# 记录返回的 database_id，填入 wrangler.toml
```

### 3. 执行数据库迁移

```bash
# 按顺序执行迁移脚本
wrangler d1 execute personal-blog-prod --file=../database/schema-v1.1-base.sql
wrangler d1 execute personal-blog-prod --file=../database/schema-v1.3-notification-messaging.sql
wrangler d1 execute personal-blog-prod --file=../database/migration-v1.4-message-recall.sql
wrangler d1 execute personal-blog-prod --file=../database/migration-v1.9-post-pinning.sql
```

### 4. 创建 R2 存储桶

```bash
wrangler r2 bucket create personal-blog-images-prod
```

### 5. 创建 KV 命名空间

```bash
wrangler kv:namespace create CACHE
# 记录返回的 id，填入 wrangler.toml
```

### 6. 配置环境变量（敏感信息）

使用 Wrangler Secrets 管理敏感配置：

```bash
# JWT 密钥
wrangler secret put JWT_SECRET
# 输入: your-super-secret-jwt-key-at-least-32-chars

# Resend API Key
wrangler secret put RESEND_API_KEY
# 输入: re_xxxxxxxxxxxx

# GitHub OAuth（可选）
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# 前端地址
wrangler secret put FRONTEND_URL
# 输入: https://your-domain.com
```

### 7. 部署后端

```bash
cd backend
pnpm deploy
# 或
wrangler deploy
```

部署成功后会返回 Worker URL，如：`https://personal-blog-backend.your-subdomain.workers.dev`

---

## 前端部署

### 1. 配置环境变量

创建生产环境配置：

```bash
cd frontend
```

编辑 `.env.production`：

```env
VITE_API_URL=https://your-backend-domain.com
```

### 2. 构建前端

```bash
pnpm build
```

### 3. 部署到 Cloudflare Pages

#### 方式一：命令行部署

```bash
wrangler pages deploy dist --project-name=personal-blog
```

#### 方式二：Git 集成部署（推荐）

1. 登录 Cloudflare Dashboard
2. 进入 Pages → Create a project → Connect to Git
3. 选择您的 Git 仓库
4. 配置构建设置：
   - **Framework preset**: Vite
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
5. 添加环境变量：
   - `VITE_API_URL`: 后端 API 地址
6. 点击「Save and Deploy」

### 4. 配置 Pages 路由

在 Cloudflare Pages 设置中添加重定向规则：

创建 `public/_redirects` 文件：

```
/* /index.html 200
```

---

## 域名配置

### 1. 配置自定义域名

#### 后端 Workers 域名

1. 进入 Workers → your-worker → Settings → Triggers
2. 添加自定义域名：`api.your-domain.com`

#### 前端 Pages 域名

1. 进入 Pages → your-project → Custom domains
2. 添加自定义域名：`your-domain.com` 或 `www.your-domain.com`

### 2. DNS 配置

Cloudflare 会自动配置 DNS 记录，无需手动操作。

### 3. SSL/TLS 配置

在 Cloudflare Dashboard → SSL/TLS 中：

- 设置加密模式为「Full (strict)」
- 启用「Always Use HTTPS」
- 启用「Automatic HTTPS Rewrites」

---

## 环境变量配置

### 后端环境变量

| 变量名 | 说明 | 是否必需 | 示例 |
|--------|------|---------|------|
| JWT_SECRET | JWT 签名密钥 | 必需 | 32位以上随机字符串 |
| RESEND_API_KEY | Resend API Key | 推荐 | re_xxxxxxxxxxxx |
| GITHUB_CLIENT_ID | GitHub OAuth ID | 可选 | Iv1.xxxxxxxx |
| GITHUB_CLIENT_SECRET | GitHub OAuth Secret | 可选 | xxxxxxxx |
| FRONTEND_URL | 前端地址 | 必需 | https://your-domain.com |

### 前端环境变量

| 变量名 | 说明 | 是否必需 | 示例 |
|--------|------|---------|------|
| VITE_API_URL | 后端 API 地址 | 必需 | https://api.your-domain.com |

---

## CI/CD 配置

### GitHub Actions 配置

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          
      - name: Install dependencies
        run: cd backend && pnpm install
        
      - name: Deploy to Workers
        run: cd backend && pnpm deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          
      - name: Install dependencies
        run: cd frontend && pnpm install
        
      - name: Build
        run: cd frontend && pnpm build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
          
      - name: Deploy to Pages
        run: cd frontend && wrangler pages deploy dist --project-name=personal-blog
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 配置 Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
- `API_URL`: 后端 API 地址

---

## 监控与日志

### Cloudflare Analytics

Cloudflare 自动提供：
- 请求统计
- 流量分析
- 性能指标
- 错误追踪

### Workers 日志

查看实时日志：

```bash
wrangler tail
```

或在 Cloudflare Dashboard → Workers → your-worker → Logs 中查看。

### 错误追踪

建议集成 Sentry 等错误追踪服务：

```typescript
// backend/src/index.ts
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: ENVIRONMENT,
});
```

---

## 性能优化

### 1. 启用 Cloudflare 缓存

在 Workers 中配置缓存策略：

```typescript
// 缓存静态资源
app.use('/api/posts/*', async (c, next) => {
  const cache = caches.default;
  const cachedResponse = await cache.match(c.req.raw);
  if (cachedResponse) return cachedResponse;
  
  const response = await next();
  if (response.status === 200) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=300');
    const cachedResponse = new Response(response.body, { ...response, headers });
    c.executionCtx.waitUntil(cache.put(c.req.raw, cachedResponse));
  }
  return response;
});
```

### 2. 图片优化

- 使用 R2 的图片转换功能
- 配置 Cloudflare Polish（图片压缩）
- 启用 WebP 自动转换

### 3. CDN 配置

在 Cloudflare Dashboard → Speed → Optimization 中：

- 启用 Auto Minify（HTML/CSS/JS）
- 启用 Brotli 压缩
- 启用 Early Hints
- 启用 Rocket Loader（可选）

### 4. 数据库优化

- 创建必要的索引
- 使用 KV 缓存热点数据
- 避免大查询

---

## 故障排除

### 常见问题

#### 1. Workers 部署失败

**错误**: `Error: No such binding: DB`

**解决**: 检查 `wrangler.toml` 中的 D1 绑定配置是否正确。

#### 2. 数据库连接失败

**错误**: `D1_ERROR: No such database`

**解决**: 
- 确认数据库已创建
- 检查 database_id 是否正确

#### 3. CORS 错误

**错误**: `Access-Control-Allow-Origin`

**解决**: 
- 检查后端 CORS 配置
- 确认 FRONTEND_URL 环境变量正确

#### 4. 图片上传失败

**错误**: `R2 bucket not found`

**解决**: 
- 确认 R2 存储桶已创建
- 检查 bucket_name 配置

#### 5. 邮件发送失败

**错误**: `Invalid API key`

**解决**: 
- 检查 Resend API Key 是否正确
- 确认域名已验证

#### 6. 主题设置丢失

**错误**: 刷新页面后主题设置重置

**解决**: 
- 检查 localStorage 是否被禁用
- 确认 themeStore 正确保存设置

#### 7. 置顶文章不显示

**错误**: 置顶文章未显示在顶部

**解决**: 
- 确认已执行 `migration-v1.9-post-pinning.sql`
- 检查文章的 `is_pinned` 字段值

### 调试技巧

```bash
# 查看后端日志
wrangler tail

# 本地测试生产配置
wrangler dev --remote

# 检查数据库内容
wrangler d1 execute personal-blog-prod --command="SELECT * FROM posts LIMIT 5"

# 测试 API
curl https://your-api-domain.com/api/posts
```

---

## 版本升级

### 从旧版本升级

#### 升级到 v1.4.0

1. 拉取最新代码：
   ```bash
   git pull origin main
   ```

2. 执行数据库迁移：
   ```bash
   wrangler d1 execute personal-blog-prod --file=database/migration-v1.9-post-pinning.sql
   ```

3. 重新部署：
   ```bash
   cd backend && wrangler deploy
   cd ../frontend && pnpm build && wrangler pages deploy dist
   ```

4. 清除缓存（如需要）：
   ```bash
   wrangler kv:key delete --binding CACHE --key="posts:*"
   ```

---

## 回滚

### 后端回滚

```bash
# 查看部署历史
wrangler deployments list

# 回滚到指定版本
wrangler rollback [deployment-id]
```

### 前端回滚

在 Cloudflare Dashboard → Pages → your-project → Deployments 中选择历史版本回滚。

---

**版本**: v1.4.0 | **更新日期**: 2026-02-17

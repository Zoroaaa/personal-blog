# 🚀 博客系统完整部署手册 v3.0.1

> **完整、详细的生产环境部署指南**

## 📋 目录

- [架构概览](#架构概览)
- [前置准备](#前置准备)
- [快速开始](#快速开始)
- [详细部署步骤](#详细部署步骤)
- [环境配置](#环境配置)
- [数据库设置](#数据库设置)
- [域名配置](#域名配置)
- [GitHub自动部署](#github自动部署)
- [安全配置](#安全配置)
- [性能优化](#性能优化)
- [监控运维](#监控运维)
- [故障排除](#故障排除)
- [成本分析](#成本分析)

---

## 🏗️ 架构概览

### 技术栈

```
┌─────────────────────────────────────────────────────┐
│                     用户浏览器                         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              Cloudflare Global Network               │
│                    (CDN + DDoS)                      │
└─────────────┬───────────────┬───────────────────────┘
              │               │
              ▼               ▼
    ┌─────────────┐   ┌──────────────┐
    │  Pages      │   │   Workers    │
    │  (前端)      │   │   (后端API)   │
    │  React      │   │   Hono       │
    └─────────────┘   └──────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐  ┌──────────┐
       │    D1    │   │    KV    │  │    R2    │
       │ (数据库)  │   │  (缓存)   │  │  (存储)   │
       └──────────┘   └──────────┘  └──────────┘
```

### 组件说明

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | React + TypeScript + Tailwind | 部署在 Cloudflare Pages |
| 后端 | Hono + TypeScript | 部署在 Cloudflare Workers |
| 数据库 | D1 (SQLite) | Cloudflare 托管的分布式 SQLite |
| 缓存 | KV | 全球分布式键值存储 |
| 存储 | R2 | 对象存储，兼容 S3 API |
| CDN | Cloudflare | 全球 300+ 节点 |

---

## ✅ 前置准备

### 1. 账号准备

- ✅ [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）
- ✅ [GitHub 账号](https://github.com/join)（用于代码托管和自动部署）
- ✅ 域名（可选，Cloudflare 提供免费子域名）

### 2. 开发环境

**必需软件:**

```bash
# 检查 Node.js 版本 (需要 >= 18)
node --version  # v18.0.0 或更高

# 检查 npm 版本 (需要 >= 9)
npm --version   # 9.0.0 或更高

# 安装 Wrangler CLI
npm install -g wrangler

# 验证安装
wrangler --version
```

**推荐工具:**

- VSCode + 插件:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript + JavaScript
- Git 客户端
- Postman 或 Insomnia（API 测试）

### 3. 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **内存**: 至少 4GB RAM
- **硬盘**: 至少 1GB 可用空间
- **网络**: 稳定的互联网连接

---

## ⚡ 快速开始（10分钟部署）

### 第一步：克隆项目

```bash
# 克隆仓库
git clone https://github.com/yourusername/personal-blog.git
cd personal-blog

# 安装依赖
npm install
```

### 第二步：登录 Cloudflare

```bash
# 登录 Cloudflare
wrangler login

# 验证登录
wrangler whoami
```

### 第三步：初始化资源

```bash
# 赋予脚本执行权限
chmod +x scripts/*.sh

# 运行初始化脚本
./scripts/init.sh
```

初始化脚本会自动创建：
- ✅ D1 数据库
- ✅ KV 命名空间  
- ✅ R2 存储桶
- ✅ 提示设置环境变量

### 第四步：配置环境

记录初始化脚本输出的 ID，更新 `backend/wrangler.toml`：

```toml
# D1 数据库配置
[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "替换为你的数据库ID"

# KV 配置
[[kv_namespaces]]
binding = "CACHE"
id = "替换为你的KV ID"

# R2 配置（名称一般不需要改）
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "blog-storage"
```

### 第五步：设置密钥

```bash
cd backend

# 设置 JWT 密钥（随机生成一个复杂字符串）
echo "your-super-secret-jwt-key-at-least-32-chars" | wrangler secret put JWT_SECRET

# 可选：GitHub OAuth（如果需要 GitHub 登录）
echo "your-github-client-id" | wrangler secret put GITHUB_CLIENT_ID
echo "your-github-client-secret" | wrangler secret put GITHUB_CLIENT_SECRET
```

### 第六步：初始化数据库

```bash
# 返回项目根目录
cd ..

# 运行数据库迁移脚本
./scripts/migrate.sh
```

### 第七步：部署

```bash
# 部署后端
cd backend
npm run deploy

# 部署前端
cd ../frontend
npm run build
wrangler pages deploy dist --project-name=blog-frontend
```

### 第八步：创建管理员账号

```bash
# 访问你的网站，注册第一个账号
# 然后运行以下命令将其设置为管理员

wrangler d1 execute blog-db \
  --command="UPDATE users SET role='admin' WHERE username='your_username'"
```

**🎉 完成！访问你的网站开始使用！**

---

## 📋 详细部署步骤

### 步骤 1: 准备项目

#### 1.1 克隆仓库

```bash
git clone https://github.com/yourusername/personal-blog.git
cd personal-blog
```

#### 1.2 检查项目结构

```bash
tree -L 2 -I 'node_modules'
```

应该看到：
```
personal-blog/
├── backend/
├── frontend/
├── database/
├── scripts/
├── package.json
└── README.md
```

#### 1.3 安装依赖

```bash
# 根目录安装（会同时安装 backend 和 frontend）
npm install

# 或者分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 步骤 2: Cloudflare 设置

#### 2.1 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器进行授权。

#### 2.2 获取账号 ID

```bash
wrangler whoami
```

记录显示的 `Account ID`，后续需要用到。

### 步骤 3: 创建 Cloudflare 资源

#### 3.1 创建 D1 数据库

```bash
wrangler d1 create blog-db
```

输出示例：
```
✅ Successfully created DB 'blog-db'
[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**复制 `database_id` 备用！**

#### 3.2 创建 KV 命名空间

```bash
wrangler kv:namespace create "CACHE"
```

输出示例：
```
✅ Created namespace with id "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**复制 `id` 备用！**

#### 3.3 创建 R2 存储桶

```bash
wrangler r2 bucket create blog-storage
```

输出示例：
```
✅ Created bucket 'blog-storage'
```

### 步骤 4: 配置项目

#### 4.1 更新 backend/wrangler.toml

```toml
name = "blog-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Worker 设置
workers_dev = false

# 如果有自定义域名，配置路由
# route = { pattern = "apiblog.yourdomain.com/*", zone_name = "yourdomain.com" }

# D1 数据库（替换为实际 ID）
[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "你的数据库ID"

# KV 命名空间（替换为实际 ID）
[[kv_namespaces]]
binding = "CACHE"
id = "你的KV-ID"

# R2 存储桶
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "blog-storage"

# 环境变量
[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://yourdomain.com"  # 前端域名
STORAGE_PUBLIC_URL = "https://storage.yourdomain.com"  # 存储公开 URL

# 日志配置
[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
enabled = true
head_sampling_rate = 1
persist = true
invocation_logs = true
```

#### 4.2 设置环境变量（Secrets）

```bash
cd backend

# 1. JWT 密钥（必需）
# 生成一个强随机密钥
openssl rand -base64 32 | wrangler secret put JWT_SECRET

# 或手动设置
echo "your-super-secret-jwt-key-at-least-32-characters-long" | \
  wrangler secret put JWT_SECRET

# 2. GitHub OAuth（可选）
echo "github_client_id" | wrangler secret put GITHUB_CLIENT_ID
echo "github_client_secret" | wrangler secret put GITHUB_CLIENT_SECRET
```

#### 4.3 更新前端配置

编辑 `frontend/src/utils/api.ts`：

```typescript
// 如果使用自定义域名
const API_BASE_URL = import.meta.env.PROD
  ? 'https://apiblog.yourdomain.com/api'
  : '/api'

// 或使用 Workers.dev 域名
const API_BASE_URL = import.meta.env.PROD
  ? 'https://blog-api.your-account.workers.dev/api'
  : '/api'
```

### 步骤 5: 初始化数据库

#### 5.1 运行迁移脚本

```bash
# 返回项目根目录
cd ..

# 运行数据库初始化
./scripts/migrate.sh
```

#### 5.2 验证数据库

```bash
# 查看表
wrangler d1 execute blog-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# 查看初始数据
wrangler d1 execute blog-db --command="SELECT * FROM categories"
```

应该看到默认的分类和标签。

### 步骤 6: 本地测试

#### 6.1 启动后端

```bash
cd backend
npm run dev
```

后端运行在 `http://localhost:8787`

#### 6.2 启动前端（新终端）

```bash
cd frontend
npm run dev
```

前端运行在 `http://localhost:5173`

#### 6.3 测试功能

1. 访问 `http://localhost:5173`
2. 注册一个账号
3. 测试文章发布
4. 测试评论功能

### 步骤 7: 部署生产环境

#### 7.1 部署后端

```bash
cd backend
npm run deploy
```

输出示例：
```
✅ Deployed blog-api
   https://blog-api.your-account.workers.dev
```

**记录这个 URL！**

#### 7.2 测试后端 API

```bash
# 健康检查
curl https://blog-api.your-account.workers.dev/health

# 应该返回
{"success":true,"data":{"status":"healthy",...}}
```

#### 7.3 部署前端

```bash
cd frontend

# 构建
npm run build

# 部署到 Pages
wrangler pages deploy dist --project-name=blog-frontend
```

第一次部署时会提示创建项目，选择 `y`。

输出示例：
```
✅ Deployed to Cloudflare Pages
   https://blog-frontend.pages.dev
```

#### 7.4 配置前端环境变量

在 Cloudflare Dashboard:
1. Pages > blog-frontend > Settings > Environment variables
2. 添加变量：
   - `VITE_API_URL`: `https://blog-api.your-account.workers.dev/api`

然后重新部署：
```bash
wrangler pages deploy dist --project-name=blog-frontend
```

### 步骤 8: 创建管理员

```bash
# 先访问网站注册一个账号
# 然后执行以下命令

wrangler d1 execute blog-db \
  --command="UPDATE users SET role='admin' WHERE username='your_username'"

# 验证
wrangler d1 execute blog-db \
  --command="SELECT username, role FROM users WHERE role='admin'"
```

### 步骤 9: 验证部署

访问你的 Pages URL，测试以下功能：

- [ ] 首页加载正常
- [ ] 注册/登录功能
- [ ] 文章发布
- [ ] 评论功能
- [ ] 图片上传
- [ ] 搜索功能
- [ ] 管理后台

---

## 🌐 域名配置

### 使用自定义域名

#### 1. 前端域名设置

**在 Cloudflare Dashboard:**

1. Pages > blog-frontend > Custom domains
2. 点击 "Set up a custom domain"
3. 输入域名: `blog.yourdomain.com`
4. Cloudflare 会自动添加 DNS 记录
5. 等待 SSL 证书生成（通常 < 5 分钟）

#### 2. 后端域名设置

**方式 A: 使用子域名（推荐）**

在 `backend/wrangler.toml` 添加：

```toml
route = { pattern = "apiblog.yourdomain.com/*", zone_name = "yourdomain.com" }
```

然后添加 DNS 记录（在 Cloudflare DNS 设置）：
```
Type: A
Name: apiblog
Content: 192.0.2.1  (Cloudflare 的占位 IP)
Proxy: 已启用（橙色云）
```

**方式 B: 使用路径（如 yourdomain.com/api）**

```toml
route = { pattern = "yourdomain.com/api/*", zone_name = "yourdomain.com" }
```

#### 3. 重新部署

```bash
# 部署后端
cd backend
npm run deploy

# 更新前端 API 配置
cd ../frontend
# 编辑 src/utils/api.ts，更新 API_BASE_URL
npm run build
wrangler pages deploy dist --project-name=blog-frontend
```

### R2 存储公开访问配置

为了让图片可以公开访问：

1. 在 Cloudflare Dashboard: R2 > blog-storage
2. Settings > Public access
3. 点击 "Allow Access"
4. 配置自定义域名: `storage.yourdomain.com`
5. 更新 `wrangler.toml`:
```toml
[vars]
STORAGE_PUBLIC_URL = "https://storage.yourdomain.com"
```

---

## 🔐 安全配置

### 1. CORS 配置

编辑 `backend/src/index.ts`，添加你的域名到白名单：

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://blog.yourdomain.com',
  'https://www.blog.yourdomain.com'
];
```

### 2. 速率限制

已内置速率限制，配置在 `backend/src/middleware/rateLimit.ts`：

```typescript
const DEFAULT_RATE_LIMIT = 500;  // 默认：每IP 500次/天
const STRICT_RATE_LIMIT = 50;    // 严格：敏感操作 50次/天
```

可根据需要调整。

### 3. JWT 配置

确保 JWT 密钥足够强：

```bash
# 生成强密钥
openssl rand -base64 64

# 设置到 Workers
echo "生成的密钥" | wrangler secret put JWT_SECRET
```

### 4. 密码策略

已内置密码强度验证：
- 至少 8 个字符
- 包含大写字母
- 包含小写字母
- 包含数字
- 包含特殊字符

配置在 `backend/src/utils/validation.ts`

### 5. SQL 注入防护

所有数据库查询都使用参数化查询，自动防止 SQL 注入。

### 6. XSS 防护

- Markdown 内容使用 `rehype-sanitize` 清理
- 评论自动转义 HTML
- CSP 头配置

---

## 🚀 GitHub 自动部署

### 1. 准备 GitHub Secrets

在 GitHub 仓库: Settings > Secrets and variables > Actions

添加以下 Secrets:

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `CLOUDFLARE_API_TOKEN` | 在 Cloudflare 创建 | API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | 账号 ID | 见 Dashboard |
| `DATABASE_ID` | D1 数据库 ID | 见 wrangler.toml |
| `KV_NAMESPACE_ID` | KV ID | 见 wrangler.toml |

#### 创建 Cloudflare API Token:

1. Cloudflare Dashboard > Profile > API Tokens
2. Create Token > Edit Cloudflare Workers
3. 权限设置:
   - Account > Cloudflare Workers > Edit
   - Account > Cloudflare Pages > Edit
   - Account > D1 > Edit
   - Zone > Workers Routes > Edit
4. 复制 Token，保存到 GitHub Secrets

### 2. 配置 GitHub Actions

项目已包含 `.github/workflows/deploy.yml`，内容：

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: 'backend'
          command: deploy

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build
        run: |
          cd frontend
          npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: 'blog-frontend'
          directory: 'frontend/dist'
```

### 3. 测试自动部署

```bash
git add .
git commit -m "test: auto deploy"
git push origin main
```

查看 Actions 标签页，应该看到自动部署流程运行。

---

## ⚡ 性能优化

### 1. 缓存策略

#### KV 缓存配置

已在 `backend/src/utils/cache.ts` 实现：

```typescript
// 热门文章缓存 1 小时
await cache.put('hot_posts', data, { expirationTtl: 3600 });

// 分类标签缓存 6 小时  
await cache.put('categories', data, { expirationTtl: 21600 });
```

可根据需要调整 TTL。

#### Browser 缓存

在 `backend/src/index.ts` 配置响应头：

```typescript
c.header('Cache-Control', 'public, max-age=3600');
```

### 2. 数据库优化

#### 索引优化

`database/schema.sql` 已包含 18+ 优化索引：

```sql
-- 文章查询优化
CREATE INDEX idx_posts_status_published ON posts(status, published_at DESC);
CREATE INDEX idx_posts_category_id ON posts(category_id);

-- 评论查询优化
CREATE INDEX idx_comments_post_status ON comments(post_id, status, created_at DESC);
```

#### 查询优化

- 使用 `LIMIT` 分页
- 避免 `SELECT *`
- 使用 JOIN 代替多次查询

### 3. 图片优化

在 `backend/src/routes/upload.ts`:

```typescript
// 自动压缩图片
// 生成多尺寸缩略图
// 使用 WebP 格式（如果支持）
```

### 4. 前端优化

- 代码分割（已配置）
- 懒加载组件
- 图片懒加载
- Service Worker（可选）

---

## 📊 监控运维

### 1. 查看日志

#### Worker 日志

```bash
cd backend
wrangler tail

# 过滤错误
wrangler tail --status error

# 实时查看特定请求
wrangler tail --header "X-Request-ID=abc123"
```

#### Pages 日志

在 Cloudflare Dashboard:
- Pages > blog-frontend > Functions > Logs

### 2. 数据库管理

#### 查询数据

```bash
# 查看文章
wrangler d1 execute blog-db \
  --command="SELECT id, title, status FROM posts LIMIT 5"

# 查看用户
wrangler d1 execute blog-db \
  --command="SELECT username, email, role FROM users"

# 查看统计
wrangler d1 execute blog-db \
  --command="SELECT 
    (SELECT COUNT(*) FROM posts) as posts,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM comments) as comments"
```

#### 导出备份

```bash
# 导出整个数据库
wrangler d1 export blog-db --output backup-$(date +%Y%m%d).sql

# 定期备份（cron）
# 添加到 crontab
0 2 * * * cd /path/to/project && wrangler d1 export blog-db --output backup-$(date +%Y%m%d).sql
```

#### 导入备份

```bash
wrangler d1 execute blog-db --file backup-20240101.sql
```

### 3. KV 管理

```bash
# 查看所有键
wrangler kv:key list --binding CACHE

# 获取特定键
wrangler kv:key get "hot_posts" --binding CACHE

# 删除键
wrangler kv:key delete "key-name" --binding CACHE

# 清空所有缓存
wrangler kv:key list --binding CACHE | jq -r '.[] | .name' | xargs -I {} wrangler kv:key delete {} --binding CACHE
```

### 4. R2 管理

```bash
# 列出文件
wrangler r2 object list blog-storage

# 下载文件
wrangler r2 object get blog-storage/images/example.jpg

# 删除文件
wrangler r2 object delete blog-storage/images/example.jpg

# 查看存储使用量
wrangler r2 object list blog-storage --limit 1000 | jq '. | length'
```

### 5. 性能监控

#### Cloudflare Analytics

在 Dashboard 查看：
- Workers > blog-api > Metrics
  - 请求数
  - CPU 时间
  - 错误率
  
- Pages > blog-frontend > Analytics
  - 访问量
  - 地理分布
  - 性能指标

#### 自定义监控

在 `backend/src/middleware/requestLogger.ts` 添加自定义指标：

```typescript
// 记录慢查询
if (duration > 1000) {
  console.warn(`Slow request: ${c.req.url} took ${duration}ms`);
}
```

### 6. 告警设置

#### Cloudflare 告警

Dashboard > Notifications:
- Workers errors threshold
- Pages build failures
- D1 query errors

配置邮件或 Webhook 通知。

---

## 🔧 故障排除

### 常见问题

#### 1. 部署失败

**错误**: `Unauthorized`

**解决**:
```bash
# 重新登录
wrangler logout
wrangler login

# 检查权限
wrangler whoami
```

**错误**: `Database not found`

**解决**:
```bash
# 确认数据库 ID
wrangler d1 list

# 更新 wrangler.toml
# 重新部署
npm run deploy
```

#### 2. CORS 错误

**错误**: `Access to fetch at 'https://api...' from origin 'https://...' has been blocked by CORS policy`

**解决**:

编辑 `backend/src/index.ts`:
```typescript
const allowedOrigins = [
  'https://your-actual-domain.com'  // 添加你的域名
];
```

#### 3. 数据库连接错误

**错误**: `D1_ERROR`

**解决**:
```bash
# 检查绑定配置
cat backend/wrangler.toml | grep -A 3 "d1_databases"

# 确保 binding 名称为 "DB"
# 检查 database_id 是否正确
```

#### 4. 图片上传失败

**错误**: `R2 bucket not found`

**解决**:
```bash
# 确认存储桶存在
wrangler r2 bucket list

# 如果不存在，创建
wrangler r2 bucket create blog-storage

# 检查 wrangler.toml 配置
cat backend/wrangler.toml | grep -A 2 "r2_buckets"
```

#### 5. JWT 验证失败

**错误**: `Invalid token`

**解决**:
```bash
# 确认 JWT_SECRET 已设置
wrangler secret list

# 如果没有，重新设置
openssl rand -base64 32 | wrangler secret put JWT_SECRET

# 清除旧 Token，重新登录
```

#### 6. 前端白屏

**解决**:
```bash
# 检查浏览器控制台
# 常见原因：API URL 配置错误

# 编辑 frontend/src/utils/api.ts
# 确保 API_BASE_URL 正确

# 重新构建和部署
cd frontend
npm run build
wrangler pages deploy dist --project-name=blog-frontend
```

### 调试技巧

#### 1. 启用详细日志

```typescript
// backend/src/index.ts
console.log('Request:', {
  url: c.req.url,
  method: c.req.method,
  headers: Object.fromEntries(c.req.headers.entries())
});
```

#### 2. 测试 API

```bash
# 健康检查
curl https://your-api.workers.dev/health

# 测试认证
curl -X POST https://your-api.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 带 Token 的请求
curl https://your-api.workers.dev/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. 本地调试数据库

```bash
# 导出到本地 SQLite 文件
wrangler d1 export blog-db --output local.db

# 使用 SQLite 客户端查看
sqlite3 local.db
> .tables
> SELECT * FROM posts;
```

---

## 💰 成本分析

### Cloudflare 免费额度

| 服务 | 免费额度 | 超出费用 |
|------|---------|---------|
| Workers | 100,000 请求/天 | $0.50 / 百万请求 |
| Pages | 500 构建/月 | $5 / 月（无限构建）|
| D1 | 5GB 存储<br>100,000 行读/天<br>50,000 行写/天 | $0.50 / GB<br>$0.001 / 100万行 |
| KV | 100,000 读/天<br>1,000 写/天 | $0.50 / 百万次 |
| R2 | 10GB 存储<br>1,000,000 A类操作/月<br>10,000,000 B类操作/月 | $0.015 / GB |

### 使用量预估

**小型博客（月访问量 1 万）:**

| 资源 | 预估使用 | 费用 |
|------|---------|------|
| Workers 请求 | ~30,000 | $0 |
| Pages 构建 | ~20 次 | $0 |
| D1 读取 | ~50,000 行 | $0 |
| D1 写入 | ~1,000 行 | $0 |
| KV 读取 | ~10,000 次 | $0 |
| R2 存储 | ~500 MB | $0 |

**总计: $0/月**

**中型博客（月访问量 10 万）:**

| 资源 | 预估使用 | 费用 |
|------|---------|------|
| Workers 请求 | ~300,000 | $0.15 |
| D1 读取 | ~500,000 行 | $0.005 |
| KV 读取 | ~100,000 次 | $0.05 |
| R2 存储 | ~5 GB | $0 |

**总计: ~$0.20/月**

**大型博客（月访问量 100 万）:**

| 资源 | 预估使用 | 费用 |
|------|---------|------|
| Workers 请求 | ~3,000,000 | $1.50 |
| D1 读取 | ~5,000,000 行 | $0.05 |
| KV 读取 | ~1,000,000 次 | $0.50 |
| R2 存储 | ~20 GB | $0.15 |

**总计: ~$2.20/月**

### 成本优化建议

1. **启用 KV 缓存**: 减少数据库读取
2. **CDN 缓存**: 减少 Worker 请求
3. **图片压缩**: 减少 R2 存储和流量
4. **批量操作**: 减少数据库写入次数

---

## 📚 附录

### A. 脚本说明

#### init.sh

自动化初始化脚本，创建所有必需资源：

```bash
#!/bin/bash

echo "🚀 Initializing blog system..."

# 创建 D1 数据库
echo "📦 Creating D1 database..."
wrangler d1 create blog-db

# 创建 KV 命名空间
echo "🗄️ Creating KV namespace..."
wrangler kv:namespace create "CACHE"

# 创建 R2 存储桶
echo "📁 Creating R2 bucket..."
wrangler r2 bucket create blog-storage

echo "✅ Initialization complete!"
echo "Please update backend/wrangler.toml with the IDs shown above"
```

#### migrate.sh

数据库迁移脚本：

```bash
#!/bin/bash

echo "🗄️ Running database migrations..."

# 执行 schema
wrangler d1 execute blog-db --file=database/schema.sql

echo "✅ Migrations complete!"
```

### B. 环境变量清单

| 变量名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `DB` | Binding | ✅ | D1 数据库绑定 |
| `CACHE` | Binding | ✅ | KV 缓存绑定 |
| `STORAGE` | Binding | ✅ | R2 存储绑定 |
| `JWT_SECRET` | Secret | ✅ | JWT 签名密钥 |
| `GITHUB_CLIENT_ID` | Secret | ❌ | GitHub OAuth ID |
| `GITHUB_CLIENT_SECRET` | Secret | ❌ | GitHub OAuth Secret |
| `FRONTEND_URL` | Var | ✅ | 前端域名 |
| `STORAGE_PUBLIC_URL` | Var | ✅ | 存储公开 URL |
| `ENVIRONMENT` | Var | ❌ | 环境标识 |

### C. API 端点清单

详细 API 文档请查看 [API.md](./API.md)

**认证**
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/github` - GitHub OAuth
- `GET /api/auth/me` - 获取当前用户
- `PUT /api/auth/profile` - 更新资料

**文章**
- `GET /api/posts` - 文章列表
- `GET /api/posts/:slug` - 文章详情
- `POST /api/posts` - 创建文章
- `PUT /api/posts/:id` - 更新文章
- `DELETE /api/posts/:id` - 删除文章
- `POST /api/posts/:id/like` - 点赞

**评论**
- `GET /api/comments` - 评论列表
- `POST /api/comments` - 发表评论
- `DELETE /api/comments/:id` - 删除评论
- `POST /api/comments/:id/like` - 点赞

**管理**
- `GET /api/admin/users` - 用户管理
- `GET /api/admin/comments` - 评论审核
- `GET /api/admin/settings` - 系统设置

**其他**
- `GET /api/categories` - 分类列表
- `POST /api/upload` - 文件上传
- `GET /api/analytics` - 数据统计
- `GET /api/config` - 配置信息

### D. 数据库表结构

主要表：

- `users` - 用户表
- `posts` - 文章表
- `comments` - 评论表
- `categories` - 分类表
- `tags` - 标签表
- `post_tags` - 文章标签关联
- `likes` - 点赞记录
- `analytics` - 访问统计
- `site_config` - 站点配置

详细结构见 `database/schema.sql`

---

## 🎓 学习资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Hono 框架文档](https://hono.dev/)
- [React 官方文档](https://react.dev/)

---

## 📧 获取帮助

遇到问题？

1. 查看 [常见问题](#故障排除)
2. 搜索 [GitHub Issues](https://github.com/yourusername/personal-blog/issues)
3. 提交新 Issue
4. 加入讨论 [Discussions](https://github.com/yourusername/personal-blog/discussions)

---

<div align="center">

**部署完成！🎉**

[返回顶部](#-博客系统完整部署手册-v301)

</div>

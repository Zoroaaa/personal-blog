# 部署指南

本文档介绍如何从零把 Personal Blog 部署到 Cloudflare：单个 Worker 同时托管前端静态资源与 API，通过 Workers Builds 构建部署，GitHub Actions 在部署前完成类型检查与 D1 迁移。

**版本**: v1.7.0  
**更新日期**: 2026-11-11

---

## 目录

- [部署架构](#部署架构)
- [一次 push 的完整链路](#一次-push-的完整链路)
- [前置准备](#前置准备)
- [第一步：创建 Cloudflare 资源](#第一步创建-cloudflare-资源)
- [第二步：配置 Worker](#第二步配置-worker)
- [第三步：连接 Workers Builds](#第三步连接-workers-builds)
- [第四步：GitHub Actions（校验、迁移、触发部署）](#第四步github-actions校验迁移触发部署)
- [第五步：域名与 HTTPS](#第五步域名与-https)
- [手动部署](#手动部署)
- [验证部署](#验证部署)
- [环境变量汇总](#环境变量汇总)
- [故障排除](#故障排除)
- [部署检查清单](#部署检查清单)

---

## 部署架构

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
│   Worker 静态资源          │   │   Worker 脚本              │
│   frontend/dist            │   │   (Hono API)               │
│   - React SPA              │   │   - /api/*                 │
│   - 命中资源时直接返回      │   │   - 未命中时由静态资源兜底  │
└───────────────────────────┘   └───────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
        ┌───────────────────────────────────────────┐
        │           Cloudflare 服务层               │
        ├───────────────────────────────────────────┤
        │  D1 数据库   R2 存储   KV 缓存   Durable Object │
        └───────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │  Resend（邮件）   GitHub OAuth（登录）      │
        └───────────────────────────────────────────┘
```

前端与后端在**同一个 Worker** 内：

| 部分 | 运行位置 | 路径 |
|------|---------|------|
| React SPA | Worker 静态资源（`frontend/dist`） | `/`、`/post/:slug` 等所有非 API 路径 |
| API | Worker 脚本（Hono） | `/api/*` |
| 定时任务 | 同一 Worker 的 Cron Trigger | `*/15 * * * *` |

> 本项目历史上是 Pages（前端）+ Workers（后端）分开部署，2026-11 已合并为单 Worker。本文只描述当前架构，不再包含迁移步骤。

---

## 一次 push 的完整链路

```
push 到 main
   │
   ▼
GitHub Actions（.github/workflows/deploy.yml）
   1. npm ci
   2. 后端 typecheck
   3. 对生产 D1 执行迁移
   4. 迁移成功后 POST 部署钩子
   │  （typecheck 或迁移失败 → 不触发部署）
   ▼
Workers Builds（由部署钩子触发）
   1. Build command：npm ci && npm run build → 生成 frontend/dist
   2. Deploy command：npx wrangler deploy --config backend/wrangler.toml
   │
   ▼
生产 Worker（blog）
```

关键约定：**Workers Builds 的 push 自动部署是关闭的**，生产部署只能由 GitHub Actions 调用部署钩子触发。这样迁移一定先于部署，typecheck 失败也不会把代码推上生产。

---

## 前置准备

### 1. 必需账号

| 账号 | 用途 | 注册地址 |
|------|------|---------|
| GitHub | 代码托管 + CI/CD | https://github.com |
| Cloudflare | Worker 托管 + 数据服务 | https://dash.cloudflare.com/sign-up |
| Resend | 邮件发送（可选） | https://resend.com |

### 2. 域名（推荐）

1. 将域名添加到 Cloudflare（Dashboard → Add a site）
2. 在注册商处把 NS 改为 Cloudflare 提供的地址
3. 等待生效

### 3. GitHub OAuth（可选）

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. **Homepage URL**：`https://your-domain.com`
3. **Authorization callback URL**：`https://your-domain.com/login`
4. 记录 Client ID，生成 Client Secret

> 回调地址是博客域名下的前端路由 `/login`，不是 API 路径。回调地址由前端在运行时拼成 `window.location.origin + '/login'`，因此换域名只需要改 OAuth App 配置。

---

## 第一步：创建 Cloudflare 资源

### 1.1 创建 D1 数据库

1. **Workers & Pages** → **D1 SQL Database** → **Create database**
2. 名称：`blog-db`
3. 记录 **Database ID**

### 1.2 创建 R2 存储桶

1. **R2 Object Storage** → **Create bucket**
2. 名称：`blog-storage`

### 1.3 创建 KV 命名空间

1. **KV** → **Create a namespace**
2. 名称：`CACHE`
3. 记录 **Namespace ID**

### 1.4 创建 API Token（供 GitHub Actions 迁移使用）

1. 右上角头像 → **My Profile** → **API Tokens** → **Create Token**
2. 使用 **Edit Cloudflare Workers** 模板
3. 额外添加 **Account → D1 → Edit**（迁移脚本必需）
4. 创建后立即复制（只显示一次）

> Workers Builds 自动生成的 token 不含 D1 权限，**不能**用来迁移；迁移必须在 GitHub Actions 里用这个 token 执行。

### 1.5 记录 Account ID

Dashboard 右侧栏任意页面 → **API** 区域 → **Account ID**。

---

## 第二步：配置 Worker

### 2.1 填写资源 ID

编辑 `backend/wrangler.toml`：

```toml
name = "blog"
main = "src/index.ts"
compatibility_date = "2024-01-01"
# 导航请求（浏览器深链）优先交给静态资源，避免 SPA 深链落到 API 的 JSON 404
compatibility_flags = ["assets_navigation_prefers_asset_serving"]

[assets]
directory = "../frontend/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "你的数据库ID"

[[kv_namespaces]]
binding = "CACHE"
id = "你的KV命名空间ID"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "blog-storage"
```

`[vars]`：

```toml
[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://your-domain.com"          # 博客域名：CORS 白名单 + 邮件链接
STORAGE_PUBLIC_URL = "https://storage.your-domain.com"
```

要点：

- SPA 回退由 `not_found_handling` 负责，**不要**添加 `_redirects`（`/* /index.html 200` 在 Workers 下会被判定为死循环而忽略）。
- `[assets]` 的 `directory` 相对**配置文件所在目录**解析，所以从仓库根用 `--config backend/wrangler.toml` 调用也能找到 `../frontend/dist`；不要改成相对仓库根的形式。
- `name` 必须与 Dashboard 里的 Worker 名一致，否则 Workers Builds 构建会失败。
- `FRONTEND_URL` 不要删：邮件在 Cron/后台任务里生成，没有请求上下文；CORS 的默认白名单也依赖它。

### 2.2 初始化数据库

本地执行（推荐，`scripts/migrate.sh` 幂等重放 `database/` 下的 schema）：

```bash
npm ci
npm run migrate -- blog-db --remote
```

也可以在 **D1 → blog-db → Console** 里按顺序执行 `database/schema-*.sql`。

### 2.3 配置 Secrets

**Workers & Pages** → **blog** → **Settings** → **Variables** → 添加 Encrypted 变量：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `JWT_SECRET` | JWT 签名密钥，32 位以上随机串 | 是 |
| `POST_PASSWORD_SECRET` | 文章密码访问密钥 | 否 |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | 否 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | 否 |
| `RESEND_API_KEY` | Resend API Key | 否 |
| `RESEND_FROM_EMAIL` | 发件地址 | 否 |

生成密钥：

```bash
openssl rand -base64 32
```

---

## 第三步：连接 Workers Builds

Workers Builds 负责**构建前端并把 Worker 与静态资源一起部署**。它不再响应 push，只由部署钩子触发（见第四步）。

### 3.1 连接 GitHub 仓库

1. **Workers & Pages** → **blog** → **Settings** → **Builds** → **Connect**
2. 选择 GitHub 仓库并授权
3. 填写构建配置：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Root directory | 仓库根（`/`，不要填 `backend`） |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy --config backend/wrangler.toml` |
| Build variables | 不需要设置 `VITE_API_URL` |

> Deploy command **必须带 `--config backend/wrangler.toml`**。构建根目录是仓库根，根目录没有 `wrangler.toml`，直接 `npx wrangler deploy` 会报 `Missing entry-point to Worker script or to assets directory`。
>
> 仓库只有 `backend/wrangler.toml` 这一份配置，**不要**复制或软链到仓库根。
>
> Build command 在仓库根安装依赖（workspaces 的唯一锁文件在根目录）并构建出 `frontend/dist`，否则 Worker 会带上缺失或过期的静态资源。

### 3.2 关闭 push 自动部署

Workers Builds 目前**没有**“暂停 push 自动部署”的开关（那是 Pages 的功能），官方只提供两种等效手段：

| 手段 | 效果 | 是否适用 |
|------|------|---------|
| 把 Deploy command 改成 `npx wrangler versions upload` | push 只产生版本，不提升为生产部署 | 不适用：部署钩子复用同一个 Deploy command，钩子触发的构建也不会真正部署 |
| 用 **Build watch paths** 让所有 push 构建被跳过 | push 不构建、不部署；部署钩子不是 push 事件，已实测不受影响 | **采用** |

配置方式：

1. **Settings** → **Builds** → **Build watch paths**
2. **Include paths**：`__none__`
3. **Exclude paths**：`*`

为什么这样更可靠：

- 路径规则先看 Exclude、再看 Include。`*` 把所有真实路径先排除掉，任何 push 都不会命中 Include。
- `__none__` 不是一个占位文件，而是「不会匹配任何仓库路径」的字符串，不依赖某个文件是否存在，也不怕有人把它删掉。
- 结果是「push 一律不构建」由规则本身表达，而不是靠约定。

#### 已验证：钩子构建不受 watch paths 过滤

**2026-11-11 实测确认**：部署钩子触发的构建不会命中 Build watch paths 规则。

- 证据形式：Cloudflare 部署列表里出现一条由 `ci-deploy - 部署钩子` 触发的构建记录（version `330931bb`，构建耗时 1m45s，成功）。
- 结论：这组规则只作用于 push 事件；「push 不构建、钩子照常构建部署」的前提成立。

#### 待回归验证：push 不新增构建

**这一项目前尚未验证**。部署列表里仍有操作人为 `Unknown` 的历史构建，无法区分它们发生在 watch paths 生效之前还是之后，所以不能据此认为「push 已经不触发构建」。

最短判定方法：

1. 推一个**只改 README** 的提交。
2. 打开 **Workers & Pages → blog → Deployments**，看新增记录：
   - 只应新增 **1 条** `ci-deploy` 构建、部署 1 次。
   - 如果同时出现操作人为 `Unknown` 的构建，说明 **Exclude `*` 未生效**（或未保存），此时每次 push 会部署两次，且 Unknown 那次不等迁移。

> 该检查属于长期回归项：改了 watch paths、重新连接仓库、或换过 Cloudflare 账号后都要重做一次。
>
> 已知例外（Cloudflare 行为）：push 事件包含 0 个文件变更，或一次 push 涉及 3000+ 文件 / 20+ commits 时，会绕过路径匹配直接构建。这两种情况在本项目里不会出现。

### 3.3 创建部署钩子

1. **Settings** → **Builds** → **Deploy Hooks**
2. **Name**：`ci-deploy`
3. **Branch**：`main`
4. 创建后复制生成的 URL，形如：

```
https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/<DEPLOY_HOOK_ID>
```

触发方式与鉴权：

- `POST` 到该 URL 即可触发一次 `main` 分支的构建并部署。
- **不需要任何 Authorization 头**：URL 里的随机 ID 就是凭证。
- 返回 JSON，含 `build_uuid`、`worker`、`branch`；`build_uuid` 可用于查日志。
- 限流：每 Worker 10 次/分钟、每账号 100 次/分钟；同一构建仍在 `queued`/`initializing` 时重复调用会去重（返回 `already_exists: true`）。
- 视为敏感凭证：任何人拿到 URL 都能触发构建；一旦泄露，删除钩子并新建。

### 3.4 前端 API 地址

前端默认使用相对路径 `/api`（见 `frontend/src/utils/api.ts`），同域部署**不需要** `VITE_API_URL`：

- 生产：不要设置。
- 本地：`vite.config.ts` 已把 `/api` 代理到 `http://localhost:8787`。

### 3.5 预览构建（可选）

- 非 `main` 分支的构建会生成 Previews，需要在 **Settings → Builds → Preview** 开启并配置预览用的变量/绑定。
- 带 Durable Object 的 Worker 不生成 Version URL，预览能力有限；需要独立预览数据时，为 D1 配置预览环境，避免预览写生产库。

---

## 第四步：GitHub Actions（校验、迁移、触发部署）

`.github/workflows/deploy.yml` 是**唯一的部署入口**：typecheck → D1 迁移 → 调用部署钩子。任何一步失败都不会部署。

### 4.1 配置 GitHub Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret 名称 | 说明 |
|------------|------|
| `CLOUDFLARE_API_TOKEN` | 含 D1 Edit 权限的 token（见 1.4） |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID（见 1.5） |
| `WORKERS_DEPLOY_HOOK_URL` | 3.3 生成的部署钩子完整 URL |

> 钩子 URL 只放在 GitHub Secret 里，**不要**写进仓库任何文件。

### 4.2 触发条件

- push 到 `main`（**不再按路径过滤**：因为 push 不再自动部署，任何改动都必须经过这条流水线才会生效）
- 手动 `workflow_dispatch`

### 4.3 行为说明

- `WORKERS_DEPLOY_HOOK_URL` 未配置时：钩子步骤在 Actions 里显示为 **skipped**（不是 success），另有一步 `Deployment Skipped Notice` 输出 notice 说明「校验与迁移已通过，但没有部署」。这样不会把「没部署」误读成已上线。
- 钩子返回非 2xx 或 `success` 不为 `true` 时：流水线失败，便于发现钩子被删/限流。
- 迁移是幂等重放，重复执行安全；**破坏性变更**（`DROP`、`RENAME`、类型变更）仍建议先在本地或控制台手动执行迁移并确认，再推送（流水线里执行时一旦失败就不会部署，但已经执行的语句不会回滚）。

---

## 第五步：域名与 HTTPS

### 5.1 绑定自定义域名

1. **Workers & Pages** → **blog** → **Settings** → **Domains & Routes** → **Add** → **Custom domain**
2. 输入 `your-domain.com`，Cloudflare 自动创建 DNS 记录
3. 等待证书状态变为 Active（通常 1 分钟内）
4. `www.your-domain.com` 如需要，重复添加或统一 301 到主域

前端页面与 `/api/*` 共用这一个域名。

### 5.2 R2 公开访问（可选）

1. **R2** → **blog-storage** → **Settings** → **Public access** → **Allow Access**
2. 绑定自定义域名：`storage.your-domain.com`
3. 更新 `wrangler.toml` 的 `STORAGE_PUBLIC_URL`

### 5.3 SSL/TLS

Cloudflare Dashboard → **SSL/TLS**：

- 加密模式 **Full (strict)**
- 开启 **Always Use HTTPS**
- 开启 **Automatic HTTPS Rewrites**

---

## 手动部署

日常发布走「push → Actions → 部署钩子」，不需要手动操作。应急时可在本地部署，**必须从仓库根目录**执行：

```bash
npm run deploy
```

等价于：

```bash
npm run build --workspace=frontend && wrangler deploy --config backend/wrangler.toml
```

先构建前端，再把 Worker 与 `frontend/dist` 一起上传。

> 不要执行 `cd backend && wrangler deploy`，也不要单独运行 `wrangler deploy`：那会把缺失或过期的 `frontend/dist` 推到生产。

---

## 验证部署

### 1. 命令行检查

```bash
# API 健康检查（与前端同域，返回 JSON 说明落在 Worker）
curl https://your-domain.com/api/health

# 公开接口
curl https://your-domain.com/api/posts

# 深链（应返回 HTML，而不是 JSON 404）
curl -H "Sec-Fetch-Mode: navigate" https://your-domain.com/post/any-slug

# API 404 语义（应为 JSON）
curl https://your-domain.com/api/unknown
```

### 2. 构建与部署状态

- Actions：仓库 **Actions** 页 → 最近一次 `Verify, Migrate & Deploy` 是否 success
- Workers Builds：**Workers & Pages** → **blog** → **Deployments** → **View build history**；`Triggered by` 列应显示部署钩子名称，`build_trigger_source` 为 `deploy_hook`

### 3. 功能清单

- [ ] 首页正常显示
- [ ] 文章详情页深链可直接刷新
- [ ] 用户注册、登录
- [ ] GitHub 登录回调 `/login` 正常
- [ ] 图片上传（R2）
- [ ] 评论、通知、私信
- [ ] `/api/unknown` 返回 JSON 404
- [ ] Cron 每 15 分钟触发（`wrangler tail` 观察 scheduled 日志）

### 4. 查看日志

```bash
wrangler tail --config backend/wrangler.toml
```

或在 Dashboard → Workers → blog → Logs 查看。

---

## 环境变量汇总

> 示例文件：`backend/.env.example`、`frontend/.env.example`

### 后端（`backend/wrangler.toml` 的 `[vars]` + Secrets）

| 变量名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `JWT_SECRET` | Secret | 是 | JWT 签名密钥 |
| `POST_PASSWORD_SECRET` | Secret | 否 | 文章密码访问 Token 密钥 |
| `GITHUB_CLIENT_ID` | Secret | 否 | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | Secret | 否 | GitHub OAuth Client Secret |
| `RESEND_API_KEY` | Secret | 否 | Resend API Key |
| `RESEND_FROM_EMAIL` | Secret | 否 | 发件地址 |
| `ENVIRONMENT` | 公开 | 是 | `production` |
| `FRONTEND_URL` | 公开 | 是 | 博客域名：CORS 白名单 + 邮件链接 |
| `STORAGE_PUBLIC_URL` | 公开 | 否 | R2 公开访问 URL |

### 前端

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `VITE_API_URL` | 不需要 | 同域部署默认 `/api`；设置后会把请求打到别处 |

### GitHub Secrets

| Secret 名称 | 说明 |
|------------|------|
| `CLOUDFLARE_API_TOKEN` | 含 Workers + D1 编辑权限 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `WORKERS_DEPLOY_HOOK_URL` | Workers Builds 部署钩子 URL |

---

## 故障排除

### 1. 深链刷新返回 JSON 404 / GitHub 登录回调 404

**原因**：导航请求进入了 Worker，`not_found_handling` 未生效。

**解决**：确认 `backend/wrangler.toml` 有 `not_found_handling = "single-page-application"`，`compatibility_flags` 包含 `assets_navigation_prefers_asset_serving`，且 `frontend/dist/index.html` 存在。

### 2. 部署后线上仍是旧前端

**原因**：构建时没有生成最新的 `frontend/dist`。

**解决**：确认 Build command 为 `npm ci && npm run build`、Root directory 是仓库根、Deploy command 带 `--config backend/wrangler.toml`；本地手动部署用根目录 `npm run deploy`。

### 3. push 之后什么都没部署

按顺序排查：

1. Actions 是否成功？`WORKERS_DEPLOY_HOOK_URL` 是否配置（未配置时钩子步骤显示 skipped，并有一条 `Deployment skipped` notice）。
2. Actions 日志里钩子返回的 `build_uuid` 是否存在，`success` 是否为 `true`。
3. Workers Builds 里是否有对应构建？`Triggered by` 应显示钩子名称。
4. **Build watch paths 是否被改动**：应为 Include `__none__`、Exclude `*`。如果 push 也触发构建，说明自动部署没关掉，会出现「push 自动部署 + 钩子部署」两次部署，且自动那次不等迁移。

### 4. 构建失败：Worker 名称不一致

Dashboard 的 Worker 名必须与 `wrangler.toml` 的 `name`（`blog`）一致。

### 5. 构建成功但报 `Missing entry-point to Worker script or to assets directory`

Deploy command 在仓库根执行了 `npx wrangler deploy`，而根目录没有 `wrangler.toml`。改为 `npx wrangler deploy --config backend/wrangler.toml`。

### 6. 迁移失败：D1 权限不足

`CLOUDFLARE_API_TOKEN` 缺少 D1 Edit，或用了 Workers Builds 的自动 token。按 1.4 重新创建并更新 Secret。

### 7. `Error: No such binding: DB` / `D1_ERROR: No such database`

```bash
wrangler d1 list
wrangler d1 info blog-db
```

确认 `database_id` 正确。

### 8. CORS 错误：`Access-Control-Allow-Origin`

同域生产请求不会触发 CORS。出现该错误通常是：`VITE_API_URL` 被设置成了其他域名，或 `FRONTEND_URL` 写错（必须带协议、不能以 `/` 结尾）。本地 `localhost:5173` 跨域开发依赖这个白名单。

### 9. 图片上传失败：`R2 bucket not found`

```bash
wrangler r2 bucket list
wrangler r2 bucket create blog-storage
```

### 10. 邮件发送失败

检查 `RESEND_API_KEY`；生产环境需验证发件域名；确认 `FRONTEND_URL` 正确（邮件里的链接由它拼接）。

### 调试命令

```bash
# 后端日志
wrangler tail --config backend/wrangler.toml

# 本地联调（前端 5173 + Worker 8787）
npm run dev
npm run dev:backend

# 检查数据库内容
wrangler d1 execute blog-db --config backend/wrangler.toml --command="SELECT * FROM posts LIMIT 5"

# 查看部署历史
wrangler deployments list --config backend/wrangler.toml

# 只验证配置与产物，不上传
wrangler deploy --config backend/wrangler.toml --dry-run
```

---

## 部署检查清单

### Cloudflare 资源

- [ ] D1 数据库 `blog-db`，ID 已填入 `wrangler.toml`
- [ ] R2 存储桶 `blog-storage`
- [ ] KV 命名空间 `CACHE`，ID 已填入 `wrangler.toml`
- [ ] 含 D1 Edit 的 API Token
- [ ] Account ID

### Worker

- [ ] `name = "blog"`，与 Dashboard 项目名一致
- [ ] `[assets]` 指向 `../frontend/dist`，`not_found_handling = "single-page-application"`
- [ ] `compatibility_flags` 含 `assets_navigation_prefers_asset_serving`
- [ ] Secrets 已配置（至少 `JWT_SECRET`）
- [ ] `FRONTEND_URL` 为博客域名

### Workers Builds

- [ ] 已连接 GitHub 仓库，Production branch 为 `main`
- [ ] Root directory 为仓库根
- [ ] Build command：`npm ci && npm run build`
- [ ] Deploy command：`npx wrangler deploy --config backend/wrangler.toml`
- [ ] **Build watch paths 已设为 Include `__none__` / Exclude `*`**（关闭 push 自动部署）
- [ ] **已实测**：钩子构建不受 watch paths 过滤（部署列表有 `ci-deploy - 部署钩子` 记录）
- [ ] **回归项待验证**：只改 README 的 push 只新增 1 条 `ci-deploy` 构建，不出现 `Unknown` 构建
- [ ] 已创建 Deploy Hook（branch `main`），URL 已存入 GitHub Secret
- [ ] 不设置 `VITE_API_URL`

### GitHub Actions

- [ ] `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`WORKERS_DEPLOY_HOOK_URL` 三个 Secret 已配置
- [ ] `deploy.yml` 在 push 到 main 时运行

### 域名

- [ ] 自定义域名已添加到 Worker
- [ ] R2 自定义域名（如使用）
- [ ] SSL/TLS Full (strict)

### 验证

- [ ] `/api/health` 返回 JSON
- [ ] 首页与文章深链可打开
- [ ] GitHub 登录回调正常
- [ ] 图片上传正常
- [ ] `/api/unknown` 返回 JSON 404
- [ ] Cron 正常触发

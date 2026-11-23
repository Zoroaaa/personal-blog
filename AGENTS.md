# AGENTS.md — personal-blog 协作规范

面向在本仓库工作的 AI coding agent。开始改代码前读完；**用户当次指令与本文件冲突时，以用户指令为准**。

只写「读代码看不出来」的内容：精确命令、目录边界、必须遵守的约束、踩过的坑。
流程：定位目录 → 核对第 3 节硬约束 → 最小改动 → 按第 8 节验证 → 汇报改动与未验证项。
工作方式：一个改动只解决一个问题；修根因不打补丁；不顺手重构、不批量格式化无关代码。

## 1. 项目与命令

Cloudflare 全栈个人博客（v1.4.x）：React 18 + TS + Vite 7 + Tailwind 3 + Zustand（frontend）；Hono 4 on Workers + D1 + KV + R2 + Durable Object 限流（backend）。
**单 Worker `blog` 同时承载 API（`/api/*`）与前端静态资源（`frontend/dist`），同域部署**，没有独立前端站点。npm workspaces monorepo（`frontend` + `backend`）。

所有命令在仓库根目录执行。依赖只在根目录安装，子目录单独 install 会破坏 workspaces hoist。

```bash
npm ci                                   # 安装依赖（根 package-lock.json 是唯一锁文件）
npm run dev                              # 前端 vite :5173，/api 代理到 :8787
npm run dev:backend                      # 后端 wrangler dev :8787
npm run typecheck --workspace=backend    # 后端 tsc --noEmit
npm run typecheck --workspace=frontend   # 前端 tsc --noEmit
npm test                                 # 前后端 typecheck + vitest（backend 单测门禁）
npm run test --workspace=backend         # 仅 vitest；单文件：npx vitest run <路径>（在 backend/ 下）
npm run build                            # 前端 vite build → frontend/dist
npm run format:check --workspace=backend # prettier 校验（仅后端配了 prettier）
npm run migrate -- blog-db               # 本地 D1 幂等迁移（scripts/migrate.sh，可重复执行）
cd frontend && bash check-theme.sh       # 主题合规检查（改 UI 颜色后必跑）
```

发布动作 agent **不执行**：`npm run deploy` / `npm run deploy:manual`、`migrate.sh --remote`、`wrangler deploy`、`wrangler secret put`。

## 2. 仓库地图

| 路径 | 职责 | 边界 |
| --- | --- | --- |
| `backend/src/index.ts` | 中间件、路由注册、全局 `app.onError`、环境校验 | 新路由文件必须在此注册；全局错误映射只在这一处 |
| `backend/src/routes/` | HTTP 入口：鉴权 → 校验 → 调 service → 响应 | 不写长业务逻辑；响应走 `utils/response.ts` |
| `backend/src/services/` | 业务编排 + 大部分 SQL | 多步写入、软删过滤、计数维护都在这里 |
| `backend/src/repositories/` | 复杂查询集中（现仅 `postRepository.ts` 范例） | 新的跨表复杂查询优先下沉到这里 |
| `backend/src/middleware/` | `auth`（JWT）、`rateLimit`（DO）、`requestLogger` | 鉴权失败用统一错误响应，不抛裸字符串 |
| `backend/src/durableObjects/RateLimiter.ts` | 原子限流计数器 | 类名与迁移 tag 上线后不可改（见 3.7） |
| `backend/src/utils/` | `response`/`errors`/`jwt`/`cache`/`logger`/`softDeleteHelper`/`resend`/`validation` | 不新增裸 `console.*`，用 `createModuleLogger` |
| `backend/src/config/constants.ts` | 全站常量（限流、CORS、跳过校验路径等） | 魔数进这里，不散落各处 |
| `database/` | `schema-v1.1-base.sql` → `v1.3` → `v1.4`，幂等重放 | 顺序与写法见第 6 节；**不是**增量迁移体系 |
| `scripts/migrate.sh` | 迁移唯一入口（本地 / `--remote`） | 新增 schema 文件必须登记进它的执行列表 |
| `frontend/src/pages/` | 页面组件 | 数据请求走 `hooks` / `utils/api.ts` |
| `frontend/src/components/` | 可复用组件（`home`/`post`/`post-editor`/`config` 子目录） | 主题色规则见 5.1 |
| `frontend/src/hooks/` | 数据编排与编辑器逻辑 | 不直接拼 fetch |
| `frontend/src/utils/api.ts` | 唯一 API 客户端（token、401 重试、统一响应） | 不要在组件里裸写 `fetch` |
| `frontend/src/stores/` | Zustand：`authStore`/`themeStore`/`notificationStore` | 只存客户端状态，不存服务端数据副本 |
| `frontend/THEME_GUIDE.md` + `check-theme.sh` | 主题 token 对照与自动检查 | 颜色替换以它为准 |
| `.github/workflows/deploy.yml` | 唯一发布流水线 | 见 3.4，不改 |
| `docs/` | `API.md`/`ARCHITECTURE.md`/`DEPLOYMENT.md`/`QUICKSTART.md`/`changelog/` | 同步义务见第 7 节 |

## 3. 硬约束

每条对应真实故障或不可逆操作；`→` 是违反后的现象。

### 3.1 两份 wrangler.toml 各司其职

- `backend/wrangler.toml`：**线上实际使用**（真实 D1/KV/R2 ID、`FRONTEND_URL`、cron、DO）。
- 根 `wrangler.toml`：仅供 Deploy to Cloudflare 按钮读取（占位资源 ID）。
- `assets_navigation_prefers_asset_serving` + `not_found_handling = "single-page-application"` 保证 SPA 深链不被 API 404 吃掉；`compatibility_date` 固定 `"2024-01-01"` 不要动。
→ 弄混两份配置会把占位 ID 部署上生产，或「改了没生效」；改 compatibility_date 可能静默改变既有运行时行为。

### 3.2 依赖只在根目录装

`npm ci` / `npm install` 一律在仓库根执行（唯一锁文件 `package-lock.json`）。
→ 子目录单独 install 会破坏 workspaces hoist，出现重复 React / 解析错乱。

### 3.3 数据库是幂等重放，不是增量迁移

`database/` 全部 SQL 写成可重复执行（`IF NOT EXISTS` / `INSERT OR IGNORE` / `INSERT OR REPLACE`），`migrate.sh` 按固定顺序整套重放（v1.1 → v1.3 → v1.4）。
→ 若按「增量迁移」习惯写不可重放的 SQL，CI 每次发布重放时会报错或产生重复数据。

### 3.4 发布链路唯一

`.github/workflows/deploy.yml`：双端 typecheck + vitest → `migrate.sh blog-db --remote` → POST Workers Builds 部署钩子。Workers Builds 的 push 自动部署已关闭，**任何改动只有走这条流水线才会上线**。
→ 另起部署脚本或改 workflow 会绕过「先迁移后部署」的保证，出现旧结构跑新代码。

### 3.5 部署前必须构建前端

Worker 直接上传 `frontend/dist`。手动部署必须走 `npm run deploy:manual`（内置 `vite build`）。
→ 只跑 `wrangler deploy` 会把旧的（或不存在的）`dist` 发上去，线上页面停留在旧版本。

### 3.6 密钥不进仓库

`JWT_SECRET`（必填）、`POST_PASSWORD_SECRET`、`GITHUB_CLIENT_ID/SECRET` 只存在于 Cloudflare Secrets 与本地 `.dev.vars`。`.env*`/`.dev.vars`/`*.key` 已被 .gitignore 覆盖。
→ 提交密钥即泄露；JWT_SECRET 参与签名与文章密码 Token，泄露等于全站会话可伪造。

### 3.7 DO 与绑定不可动

`RateLimiter` 的类名、`[[migrations]] tag = "v1"`、`RATE_LIMITER` 绑定、cron `*/15 * * * *`（邮件汇总扫描）上线后不可改名或复用。
→ DO 类名/迁移 tag 变更会导致部署失败或状态丢失；cron 改动影响 digestService 触发。

## 4. 后端

- 路由层只做：`requireAuth`/`requireAdmin`（middleware/auth.ts）→ 参数校验（utils/validation.ts）→ 调 service → `c.json(successResponse(...))`。业务与 SQL 下沉 services / repositories。
- **响应结构统一**：成功 `successResponse(data, message?)`，失败 `errorResponse(error, message?, code?)`（utils/response.ts），形如 `{ success, data|error, message?, code?, timestamp }`。不自造响应形状。
- **错误用类，不用字符串匹配**：抛 `utils/errors.ts` 的 `AppError` 子类（`UnauthorizedError`/`NotFoundError`/`ValidationError`/`ConflictError`/`RateLimitError`…），由 `index.ts` 的 `app.onError` 统一映射状态码；判别用 `isAppError`。
- 软删除：数据删除多为软删（`status` / 时间戳标记，见 `utils/softDeleteHelper.ts`）；查询必须过滤已删数据，别让「已删文章」从统计、搜索、RSS 漏出来。
- 计数字段（`post_count`/`comment_count`、浏览量、点赞数）与主表写入保持一致；并发场景优先走事务或原子更新，不读后写。
- 缓存走 `utils/cache.ts`（KV 绑定 `CACHE`）；JWT 撤销黑名单 key 为 `blacklist:${token}`。改数据后记得失效对应 key。
- 限流走 `middleware/rateLimit.ts`（Durable Object），不在路由里手写计数。
- 邮件只走 `utils/resend.ts`；邮箱验证、每日/每周汇总（digestService，cron 每 15 分钟扫到期任务）都基于它。
- 上传走 R2（绑定 `STORAGE`），保留文件魔数校验；公开访问域名是 `STORAGE_PUBLIC_URL`，不硬编码。
- 日志用 `createModuleLogger('模块名')`；外部调用（Resend、GitHub OAuth）区分「网络/超时」与「业务不存在」，不把超时当 404。
- D1 单查询参数有上限，批量写入分批执行。

## 5. 前端

### 5.1 主题系统（强制）

- 颜色只用语义 token：`bg-background` `text-foreground` `bg-card` `border-border` `bg-muted` `text-muted-foreground` `bg-accent` `text-primary`/`bg-primary` 等（完整对照见 `THEME_GUIDE.md`）。
- **禁止硬编码色**（`bg-white`、`text-gray-*`、`bg-blue-*` 等）——主题含亮/暗色、用户自定义主色调、字体缩放，硬编码色在暗色模式下必瞎。
- 确有理由的例外行尾标 `// THEME-OK`，否则 `bash check-theme.sh` 会报出来。改 UI 后跑一遍。

### 5.2 数据与状态

- 请求一律经 `utils/api.ts` 的 `apiRequest`（自动带 Bearer token、401 处理、统一解包 `ApiResponse`）；组件不裸写 `fetch`。
- Zustand 只放 `auth`/`theme`/`notification` 三个 store；服务端数据不进 store，由 hooks 管理。
- Markdown 渲染用 react-markdown 管线；任何用户 HTML 经 `utils/sanitizeHtml.ts`（DOMPurify）消毒，不对不可信内容 `dangerouslySetInnerHTML`。
- 表单/筛选需要可刷新、可分享时写入 URL query 参数。
- 文案直接写中文（无 i18n），错误提示面向用户，不暴露堆栈。

## 6. 数据库变更流程

1. 在 `database/` 现有文件中追加，或新建 `schema-v1.X-<主题>.sql`（延续幂等写法：`IF NOT EXISTS` / `INSERT OR IGNORE` / `INSERT OR REPLACE`，并更新 `schema_version`）。
2. 新文件**必须**登记进 `scripts/migrate.sh` 的执行列表，保持「v1.1 基础表在前」的顺序；顺序不可调换（v1.3/v1.4 依赖 v1.1 的表）。
3. `npm run migrate -- blog-db` 本地重放验证（至少执行两遍确认幂等）。
4. 同步 `docs/ARCHITECTURE.md` 数据模型；涉及 API 的同步 `docs/API.md`。
5. 远程迁移只由 CI 执行；agent 写文件 + 本地验证，不碰 `--remote`。

## 7. 注释与文档

注释解释**为什么、约束、哪里容易踩坑**；「做了什么」交给代码。行内注释写在关键逻辑上方（用户偏好详细行内注释，但不复述代码）。

- 文件头沿用现有 JSDoc 风格（职责 + 一两句约束）；分区线用 `// ============= xxx =============`（与现有文件一致）。
- 必须注释：魔数/阈值/时间窗口、外部系统怪癖、兼容逻辑与移除条件、软删/缓存/权限约束。
- 禁止：复述代码、留着注释掉的旧代码、无归属 `// TODO`（写成 `// TODO(模块): 原因 + 触发条件`）。注释与实现不一致时以代码为准，立刻改。

文档同步（同一次改动内完成）：

| 改了什么 | 同步到 |
| --- | --- |
| 接口 / 请求 / 响应 | `docs/API.md` |
| 表结构 / 领域模型 | `docs/ARCHITECTURE.md` |
| 部署 / 环境变量 / 密钥 | `docs/DEPLOYMENT.md` + `backend/wrangler.toml` 注释 |
| 目录结构 / 功能清单 | `README.md` |
| 发版 | `docs/changelog/CHANGELOG_vX.Y.Z.md` |
| 主题 token / 颜色规则 | `frontend/THEME_GUIDE.md` |

## 8. 验证

| 改动范围 | 必跑 |
| --- | --- |
| 任何 TS | `npm run typecheck --workspace=backend` 与 `--workspace=frontend` |
| `backend/**` | 上述后端 typecheck + `npm run test --workspace=backend` |
| `frontend/**` 构建相关 | `npm run build` |
| UI 颜色 / 主题 | `cd frontend && bash check-theme.sh`，并目验亮/暗两套主题 |
| `database/**` / `scripts/migrate.sh` | `npm run migrate -- blog-db` 本地跑两遍 |
| 发布链路相关 | 只检查文件内容，不执行部署（见第 9 节） |

- 测试用 **vitest**（backend，Node 环境，Workers API 以 mock 代替），放 `backend/src/**/__tests__/*.test.ts`，显式 `import { describe, it, expect } from 'vitest'`（不依赖 globals）。不引入第二套测试框架。
- 当前覆盖 utils 纯逻辑（errors/response/softDeleteHelper/validation/jwt）；**service/路由层无覆盖**，「测试绿」≠ 全链路验证，接口联调仍要手动 smoke。
- CI（deploy.yml）门禁：双端 typecheck + vitest → 远程迁移 → 部署钩子，任一失败不部署。
- 测试/校验失败先找根因；不允许删用例、弱化断言绕过。修的是测试假设错就改测试，修的是行为错就改实现——先回答「为什么错」。
- 没验证的（真实密钥、远程 D1、线上部署）在汇报里写明「未验证 + 原因」。

## 9. Git 与禁区

- 提交信息：Conventional Commits + 中文（`feat(posts): 新增文章置顶`），一个提交一个目的，说清「为什么改」。
- 用户没要求就不 commit / push / 建分支；强推只能 `--force-with-lease`。
- 不执行部署与远程迁移（第 1 节列出的动作）；不改 `.github/workflows/deploy.yml`。
- 不改 `wrangler.toml`（任一份）的 name / 绑定 / DO 类名与迁移 tag / cron / `compatibility_*`。
- 不读、不写、不提交密钥与 `.dev.vars`、`.env*`。
- 不改 `node_modules/`、`dist/`、`.wrangler/` 等生成物；不提交调试代码与临时文件。
- 不引入新依赖，除非现有依赖确实无法完成且已向用户说明理由。

## 10. 已知问题与常见坑

- **单测覆盖有限**：vitest 只护住 utils 纯逻辑，service/路由层零覆盖（见第 8 节）；看到「测试通过」不代表接口行为正确。
- **AdminPage chunk ~629KB**：vite 构建警告 >500KB 是已知问题，不是你改出来的。
- **`backend/wrangler.toml` 缺 `run_worker_first`**（根 `wrangler.toml` 有）：现状靠 `assets_navigation_prefers_asset_serving` 只拦导航请求、API 不受影响，故未修；动它之前先弄清两份配置的关系（3.1）。
- **迁移顺序写死在 migrate.sh**：新建 schema 文件忘了登记 → 线上表缺失，且本地重放验证不出（本地库早建好了）。新文件必须改 migrate.sh。
- **缓存失效**：改了被 KV 缓存的数据（站点配置、文章列表等）不失效 key → 线上「改了没生效」。
- **主题硬编码色**：`check-theme.sh` 放行名单里 `bg-slate-800/900` 等深色是暗色场景特例，不代表可以在新代码里随意用灰阶。

## 11. 维护本文件

只写代码里看不出来的东西。触发更新的时机：新增顶层目录 / 命令变化 / 部署或迁移步骤变化 / **同一个坑被踩第二次**。
frontend/backend 规则显著变多时可拆 `frontend/AGENTS.md`、`backend/AGENTS.md`：最近的优先，冲突以子包为准，用户指令最高。
能自动化的（check-theme.sh、typecheck、vitest、CI）优先自动化，不靠文档约束。

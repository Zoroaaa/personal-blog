# personal-blog 升级优化方案 v1

> 2026-11-23 · 依据：全仓代码审计（前后端各一份，含 file:line 证据）+ 依赖/审计/构建产物实测
> 范围：安全、数据正确性、质量门禁、性能与体验、架构治理、依赖升级决策

## 0. 一句话结论

**当前瓶颈不是依赖旧，而是「功能跑在安全闭环和质量门禁前面」**：鉴权链路有 4 个断点、计数体系在漂移、前端 0 测试且 600+ 主题违规无人拦、文章页 JS 背着 435KB。方案按 4 个波次推进（止血 → 安全与数据正确性 → 门禁 → 性能/SEO），**React 19 / Tailwind 4 等大版本升级明确放最后甚至不做**——在 0 测试的代码上升大版本，回归风险远大于收益。

---

## 1. 现状基线

| 维度 | 现状 |
| --- | --- |
| 栈 | React 18 + Vite 7 + Tailwind 3 + Zustand 4（前端）；Hono 4 + D1/KV/R2/DO（后端），单 Worker 同域 |
| 运行环境 | Node v22.22.2 / npm 10.9.7；线上 Cloudflare Workers |
| 后端测试 | 5 个文件 57 用例，**全部是 utils 纯函数**；auth/限流/缓存/计数/软删/cron 零覆盖 |
| 前端测试 | **0**；质量门禁只有 `tsc --noEmit` |
| 主题门禁 | `check-theme.sh` 规则漏检严重（实测只报 3 处，实际 52 文件 600+ 处硬编码色，`// THEME-OK` 0 处） |
| 依赖安全 | `npm audit` 33 个漏洞（24 high），全部在 **dev 工具链**（vite/ws/undici），线上 Workers 运行时不受影响，但 dev server 漏洞可读本地文件 |
| 构建产物 | 文章页必下 ≈435KB raw JS（markdown+highlight 全语言集 340KB + vendor 222KB）；AdminPage chunk 629KB（mammoth 静态打入） |
| 架构约定 vs 现实 | repositories 仅 1 个样本；AppError 体系空转（全库不 throw）；存在 services→routes 反向依赖 |

---

## 2. 根因诊断（不是问题流水账）

1. **安全闭环有断点，而不是「某个接口没限流」这种散点问题。**
   OAuth 无 state、验证码可无限爆破、删号/改密不撤销会话（`revokeAllUserTokens` 写好了但全库零调用）、上传白名单放行 html/js 且经公开 R2 域直出。共同根因：**鉴权/上传的「生命周期收尾」和「输入边界」没有被当作状态机设计，缺一环就整条链路失效。**

2. **冗余计数列没有和写路径同生命周期，且有的列从未被维护。**
   `users.post_count/comment_count` 无触发器、恒为 0，却被 `analyticsService` 用来排序；评论审核流转、软删/恢复、tags 计数各有缺口；view_count 有两个自增入口可双计。根因：**计数=缓存，缓存必须有唯一维护路径；现在是三套半吊子触发器 + 手工 UPDATE 混用。**

3. **质量门禁与规范脱节，规范形同虚设。**
   前端 0 测试、无 lint、check-theme.sh 不进 CI 且规则有盲区、`prose` 类在没有 typography 插件的情况下用了两个文件（无效类）。根因：**规范只写了文档没有接门禁，人肉执行必然漂移。**

4. **依赖/构建债是「引入方式」问题，不是版本问题。**
   mammoth/jszip 静态 import 打进 AdminPage、framer-motion 全仓只为 1 个轮播、highlight.js 全语言集进文章页。根因：**重型依赖没有按「触发时才需要」切分。**

5. **架构约定漂移没有被治理。**
   `isFeatureEnabled` 住在 routes 里被 services 动态 import（反向依赖）且每个热路径请求都打 D1；错误处理约定是 AppError，现实是 try/catch 模板 + 字符串匹配。根因：**约定缺验证手段，坏味道能复制繁殖（分页查询已复制 4 份）。**

---

## 3. 分波次方案

每项格式：改什么 → 为什么（根因）→ 验收。

### Wave 0 · 止血（纯删除/一行改动级，先做）

| # | 改什么 | 为什么 | 验收 |
| --- | --- | --- | --- |
| 0.1 | 删 `LoginPage.tsx:168` 的 `console.log('Login response', ...)` | 登录响应含 token，插件/共享屏幕即可窃取 | 全仓 grep 无 token/console.log 泄露 |
| 0.2 | 根 `package.json` 的 `deploy` 脚本指向根 wrangler.toml（占位资源 ID） | 人肉 `npm run deploy` 会把占位 ID 部署上生产；发布链路本应只有 CI | 脚本改指 `backend/wrangler.toml` 或直接删除 |
| 0.3 | `npm audit fix`（dev 链路 24 high：vite/ws/undici） | dev server 文件读取类漏洞，修复零业务风险 | `npm audit` 高危清零 |
| 0.4 | 上传白名单删除 `text/html`、`text/javascript` | 受信任子域托管可执行 HTML/JS = 存储型 XSS/钓鱼；`/api/media` 的 CSP 防不住公开 R2 域 | 白名单仅图片/文档类；上传后 Content-Type 强制 + nosniff |
| 0.5 | 删 `SplitPreview` 的条件 Hook 违规（`MarkdownPreview.tsx:102` early return 在 useMemo 前） | 现被 `isVisible 恒 true` 掩盖，一改可见性就崩 | 钩子顺序合规 |

### Wave 1 · 安全与数据正确性（P0）

| # | 改什么 | 为什么 | 验收 |
| --- | --- | --- | --- |
| 1.1 | GitHub OAuth 加 `state` 校验（发起时 KV 存 nonce，回调比对后作废） | 现只消费 code，存在登录 CSRF 面 | 无 state/错误 state 被拒绝 |
| 1.2 | 验证码校验加失败次数上限（复用 DO 限流器）；`/reset-password`、`/refresh`、`/verify-password`、`POST /:id/like`、`/analytics/track` 补路由限流 | 6 位码 600s TTL 且失败不计次 = 可爆破；`constants.ts` 里限流常量已定义但零接线 | 爆破触发 429；常量全部有消费方 |
| 1.3 | `deleteAccount` / `resetPassword` / `changePassword` 接线 `revokeAllUserTokens` + 当前 access token 入黑名单 | 函数存在但零调用；删号后旧 token 仍有效 2h | 删号/改密后旧会话立即失效（含 refresh） |
| 1.4 | 邮件模板对用户内容做 HTML 转义（`resend.ts` 拼接处） | 评论允许 `<a>/<img>`，会进邮件正文 = 邮件 HTML 注入 | 评论内容进邮件只显示转义文本 |
| 1.5 | 计数体系收敛：<br>① 代码停止读 `users.post_count/comment_count`（恒 0 死列），`analyticsService` 改子查询（与 `userService` 同口径）；<br>② 修 comment 计数触发器：审核流转加/减、软删仅当 approved 才减；<br>③ `view_count` 收敛单入口（详情页 waitUntil 与 track 二选一） | 冗余计数=缓存，必须唯一维护路径；现状双向漂移 + 死列参与排序 | 计数对账 SQL 前后一致；track 与详情页不双计 |
| 1.6 | 软删过滤统一：相邻/推荐/热榜补 `u.deleted_at IS NULL`（`postService.ts:1435/1483/1528`），并抽公共 WHERE 片段 | 各查询手写过滤条件，漏一处就漏数据；这是「复制粘贴查询」根因的必然后果 | 已删作者文章不出现在任何公开出口 |
| 1.7 | 修 `deletePost` 附件 key 提取（`files/` 前缀被截掉删不掉） | 软删语义被物理删图破坏，且删错 key | 软删文章的附件可正确回收/保留 |

### Wave 2 · 质量门禁（让后续改动不再靠人肉）

| # | 改什么 | 为什么 | 验收 |
| --- | --- | --- | --- |
| 2.1 | 后端补关键路径测试：auth 中间件（黑名单/类型判别）、authService（登录态机/refresh 旋转/OAuth）、refreshToken 撤销、计数触发器回归、软删过滤回归 | 57 个用例全是纯函数，Wave 1 的修复没有测试锁定就会再次漂移 | vitest 覆盖上述路径，CI 门禁含之 |
| 2.2 | 前端统一数据客户端：`notificationApi` 的 8 个裸 fetch 并回 `api.ts`（补 401 静默刷新）；管理后台评论/用户加分页 UI（现写死 page=1&limit=10，>10 条永久不可管理） | 绕过主客户端=401 处理缺失；分页是功能缺陷不是优化 | token 过期后通知自动恢复；后台可翻页管理全部数据 |
| 2.3 | 门禁进 CI：`check-theme.sh` 扩规则（补状态色/渐变/hex 盲区）后挂进流水线；前端引入 vitest 冒烟（至少 api.ts/store/关键 hooks） | 规范没门禁必然漂移（现状 0 标记 vs 600+ 违规） | PR 提交时自动拦截新违规 |
| 2.4 | 主题整改分批收编（不求一次清完）：①「主色替身」渐变（from-blue-500 to-indigo-500 等）换 primary token；② 状态色封装 `text-success/danger/warning`；③ `bg-black/50` → `bg-overlay`；④ 代码块 slate 深色与按钮白字补 `// THEME-OK` | 一次性改 600 处=高风险大爆炸；按语义分批可控可验 | 每批跑 check-theme.sh + 亮暗双主题目验 |
| 2.5 | 清死代码：`queryOptimizer.ts` 整文件、`ApiTestPage`、`useApiRequest`、`LoginPromptModal`、messages 死 catch、auth 三个重复删除端点、`prose` 无效类（真样式在 markdown.css） | 死代码误导维护（prose 类已造成「以为有 typography 插件」的错觉） | 全仓无未引用导出；构建产物不缩水报警 |

### Wave 3 · 性能与体验

| # | 改什么 | 为什么 | 验收 |
| --- | --- | --- | --- |
| 3.1 | bundle 三刀：① mammoth/jszip 改动态 `import()`（仅「导入 docx」触发）；② highlight.js 语言裁剪（lowlight 白名单博客常用语言）或代码块懒加载；③ 移除 framer-motion（唯一用途是首页轮播，CSS 动画可替代） | 重型依赖按触发时机切分；AdminPage 629KB、文章页 435KB 的主要来源就是这三个 | AdminPage chunk 砍半以上；文章页 JS gzip 后 <120KB |
| 3.2 | SEO 根治走 Worker 侧：对 `/posts/:slug` 在 Worker 里查 D1 注入 OG/canonical/JSON-LD 到 SPA 壳，另出 `/sitemap.xml` + 补 default-og-image | 纯客户端注入对微信/微博等不执行 JS 的爬虫无效，分享卡片必挂；单 Worker 架构正好能在出壳前改 meta——比上 SSR 便宜一个量级 | 微信分享卡片正常；sitemap 可访问 |
| 3.3 | 图片补 `width/height` + `loading=lazy`（封面图） | 全部 37 处 `<img>` 无尺寸 = CLS | Lighthouse CLS < 0.1 |
| 3.4 | 评论分页（API 已支持 page/limit，前端一次拉全量） | 长评论页渲染卡顿 | 评论 >50 条不分页卡顿 |
| 3.5 | 热路径减负：`isFeatureEnabled/getConfigValue` 加 TTL 缓存并迁出 routes；`adminNotifications` 群发改 `db.batch` + `waitUntil` 分批 | 每请求打 D1 的开关查询 + 1000 用户逐条串行 SQL/邮件（Worker CPU 上限风险） | 热路径 D1 查询数下降；群发不超时 |

### Wave 4 · 架构治理与依赖大版本（可选，最后做）

| # | 改什么 | 为什么 |
| --- | --- | --- |
| 4.1 | 错误处理统一为「service throw AppError → `onError` 映射」，删 try/catch 模板与 `index.ts:458` 字符串匹配 | 消灭 40 处重复模板 + 错误码错归类（sendMessage 吞错把 404/403 全变 400） |
| 4.2 | 分层归位：config 函数迁 `services/configService`；`adminNotifications` 的 SQL 下沉 service/repository；分页查询收拢公共 helper | 消 services→routes 反向依赖；止住复制粘贴（分页已 4 份） |
| 4.3 | 日志收敛 `createModuleLogger`（现存 115 处裸 console + 两套并行 Logger）；Resend/GitHub 调用加超时/错误分类 | 观测不统一时排障靠猜 |
| 4.4 | 依赖大版本：React 19 / React Router 7 / Zustand 5 / Tailwind 4 | **见第 4 节决策表——默认不升** |

---

## 4. 依赖升级决策表

| 依赖 | 现状 → 最新 | 决策 | 为什么 |
| --- | --- | --- | --- |
| vite | 7.3.x → 7.3.7+ | **立即**（`npm audit fix`） | 修 dev server 高危，零业务风险 |
| hono | 4.11 → 4.13 | **立即**（minor） | 无破坏性变更 |
| framer-motion | 12 → 14 | **不升，移除** | 全仓仅 1 处使用（首页轮播），CSS 可替代 |
| mammoth | 已最新 | **保留，改动态 import** | 体积问题在引入方式不在版本 |
| react / react-dom | 18 → 19.3 | **暂不升** | 0 前端测试 + 主题整改进行中；大版本回归风险 > 收益。**测试网就位后（Wave 2.1/2.3）再评估** |
| react-router-dom | 6 → 7 | **暂不升** | 迁移成本真实、用户可感收益≈0 |
| zustand | 4 → 5 | **暂不升** | 同上 |
| tailwindcss | 3 → 4 | **不升（长期可选）** | v4 是配置体系重写，与主题语义 token 整改正面冲突；现行 CSS 变量主题在 v3 下工作正常 |
| date-fns / react-markdown | 3→4 / 9→10 | **顺手升可，不作为目标** | 低收益，不改变任何决策 |

---

## 5. 明确不做（防过度工程）

| 不做 | 为什么 |
| --- | --- |
| 中文 FTS / 分词搜索 | 个人博客量级下 `LIKE` 可接受；先修 1.6 的过滤漏出与 count 漂移才是真问题 |
| cursor 分页改造 | 10 条/页的 offset 足够；真 bug 是 count 与列表条件不一致（1.x 系列内修） |
| token 迁 httpOnly cookie | 当前 DOMPurify 配置已收紧、同域部署可控；先做 0.1 删泄露日志。迁移涉及 CSRF 面，列为长期可选项 |
| SSR / 换 Next | Wave 3.2 的 Worker meta 注入以 1/10 成本解决分享卡片；换框架是重写 |
| 自建监控/日志平台 | wrangler observability 已开（persist 采样全量），够用 |
| 全仓一次清完 600+ 主题违规 | 大爆炸改动不可审；按 2.4 分批 |

---

## 6. 统一验证门禁（每个波次收尾必跑）

```bash
npm test                                    # 双端 typecheck + backend vitest
npm run build                               # 前端构建（Wave 3 后看 chunk 报告）
cd frontend && bash check-theme.sh          # Wave 2.3 起为 CI 必过项
npm run migrate -- blog-db                  # 动 schema 时：本地跑两遍验幂等
```

> 约束提醒（AGENTS.md）：发布只走 `.github/workflows/deploy.yml`；agent 不执行 deploy / `--remote` 迁移 / `wrangler secret put`。

---

## 执行进度（2026-11-23）

| 波次 | 状态 | 备注 |
| --- | --- | --- |
| W0 止血 | ✅ 完成 | deploy 守卫替代「改指向/删除」（按钮部署链路依赖根 wrangler.toml） |
| W1 安全与数据 | ✅ 完成 | 含触发器回归 12 项；修复中另发现 trg_comments_delete 双减缺陷 |
| W2 质量门禁 | ✅ 大部完成 | W2.1 补了鉴权安全回归测试（7 用例）；W2.4 按 ① 渐变收编完成，②③ 按 THEME_GUIDE 豁免/暂缓 |
| W3 性能与SEO | ✅ 完成 | bundle 三刀 + Worker SEO 注入；评论分页（按页+加载更多）；热路径减负（configService KV 缓存迁移 + adminNotifications 群发批量化）；W3.3 核实封面图布局盒已全部预留（h-32/h-48/w-24 等固定容器 + object-cover），仅补 2 处漏掉的 loading=lazy，width/height 属性在固定容器下冗余不加 |
| W4 架构治理 | 🔶 大部完成 | 见下方明细；剩余项为渐进收编类，见「W4 遗留」 |

### W4 已落地明细（2026-11-23 第二轮）

- **W4.1 AppError 统一（核心链路 + 两个点名缺陷）**：
  - `utils/jwt.ts` verifyToken 全部改抛 AppError（`TokenExpiredError` 新增于 errors.ts，code=TOKEN_EXPIRED）；
  - `middleware/auth.ts` catch 用 instanceof 替代 `includes('expired')`；`index.ts` onError 删字符串匹配分支、switch 补 TokenExpiredError 映射；
  - `messageService.sendMessage` 吞错 catch 改 rethrow + typed 抛错（NotFoundError/ForbiddenError/ValidationError），修掉「收件人不存在→400」错归类；`routes/messages.ts` 的死代码字符串匹配分支删除，AppError 放行给 onError。
- **W4.2 分层归位（adminNotifications 部分）**：SQL 与群发编排全部下沉 `services/adminNotificationService.ts`；路由只留校验+响应。
- **W3.5 群发批量化（与上同文件）**：逐用户 createNotification 循环 → 批量读设置（getNotificationSettingsBulk 首次接线）→ 内存决策 → `db.batch` 分批（50 条/批）→ realtime 邮件 `waitUntil` 限并发（5）异步发送 + 批量回写 is_email_sent。**顺带修复隐藏 bug：旧路由漏传 env 第 4 参，群发的 realtime 邮件从未发出过**；/send 响应新增 skippedCount（用户关闭 system 通知≠失败）。
- **W4.3 日志收敛**：后端裸 console 114 → 0（logger.ts/requestLogger.ts 自身除外），16 个文件统一 `createModuleLogger(模块名)`；`utils/resend.ts` 与 GitHub OAuth 三处 fetch 加 `AbortSignal.timeout(10s)`（常量 `URL_CONSTANTS.EXTERNAL_API_TIMEOUT_MS`）+ 超时/网络错误分类记录。
- W2.2 的 admin 后台分页已于第一轮完成。

### W4 遗留（低优先，渐进收编，不阻塞上线）

- routes 层 40 处 try/catch 模板 → 逐模块改「service throw AppError + 路由放行」；本次已修 messageService 这个最疼的点，其余按模块顺手做
- 分页查询公共 helper 收拢（现存 4 份复制）
- index.ts `appLogger`（'config' 模块名）命名清理

依赖决策执行：audit 高危清零（移除零引用 eslint 链）；framer-motion 移除；rehype-highlight 移除（自建白名单插件）；
react19/router7/zustand5/tailwind4 维持不升。

验证记录（2026-11-23 第二轮）：`npm test` 双端 typecheck + 62 用例全过；`npm run build` 通过（PostPage 77KB/AdminPage 130KB chunk）；`check-theme.sh` 通过。

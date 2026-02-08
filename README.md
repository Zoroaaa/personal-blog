# 🚀 现代化个人博客系统 V3.0

> 基于 Cloudflare Workers 和 Pages 构建的全栈博客平台，零成本运行，企业级性能

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.0.1-green.svg)](https://github.com/yourusername/personal-blog)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

**体验地址**: [blog.neutronx.uk](https://blog.neutronx.uk)

# 效果图

<img width="1920" height="871" alt="image" src="https://github.com/user-attachments/assets/af431faa-c4c3-46c7-9b32-45d01c8d66e4" />
<img width="1920" height="865" alt="image" src="https://github.com/user-attachments/assets/0eaa7576-376f-4cac-afea-5f9b5bcb150b" />
<img width="1920" height="865" alt="image" src="https://github.com/user-attachments/assets/197442f1-1d65-435a-aa9a-5f55869b1861" />
<img width="1920" height="865" alt="image" src="https://github.com/user-attachments/assets/a87ab841-95b2-44a4-b32f-566ea936d5d7" />
<img width="1920" height="869" alt="image" src="https://github.com/user-attachments/assets/bf955684-3f27-4bb9-abf4-ada8d9e46eb9" />

---

## 📖 目录

- [核心特性](#-核心特性)
- [技术架构](#-技术架构)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [功能详解](#-功能详解)
- [本地开发](#-本地开发)
- [部署指南](#-部署指南)
- [配置说明](#-配置说明)
- [性能优化](#-性能优化)
- [常见问题](#-常见问题)
- [开发路线](#-开发路线)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## ✨ 核心特性

### 🔐 用户系统
- **多种认证方式**: 密码登录 + GitHub OAuth
- **角色权限管理**: Admin / Moderator / User 三级权限
- **用户资料**: 完整的个人资料编辑、头像上传
- **邮箱验证**: 注册验证和密码重置（可选）

### 📝 内容管理
- **Markdown 编辑器**: 支持实时预览和代码高亮
- **富文本支持**: GFM (GitHub Flavored Markdown)
- **草稿/发布**: 文章状态管理，定时发布
- **SEO 优化**: 自定义 meta 标题、描述、关键词
- **阅读统计**: 浏览量、点赞数、评论数
- **阅读时长**: 自动计算预估阅读时间

### 🗂️ 分类与标签
- **分类管理**: 层级分类，自定义图标和颜色
- **标签云**: 热门标签、标签计数
- **批量操作**: 批量添加/删除标签

### 💬 评论系统
- **嵌套回复**: 支持 5 层嵌套评论
- **实时通知**: 评论审核和回复通知
- **Markdown 支持**: 评论内容支持 Markdown
- **审核机制**: 可选的评论审核功能
- **点赞功能**: 评论点赞和热门评论排序

### 🎨 界面体验
- **响应式设计**: 完美适配桌面、平板、手机
- **暗黑模式**: 自动跟随系统或手动切换
- **主题定制**: 自定义主色调和字体
- **动画效果**: 流畅的页面过渡和交互动画
- **无障碍**: WCAG 2.1 标准支持

### 📊 数据分析
- **访问统计**: 页面浏览量、独立访客
- **来源分析**: Referrer 追踪和分析
- **热门内容**: 热门文章、热门标签
- **用户行为**: 用户活跃度、互动数据
- **实时仪表板**: 管理后台数据可视化

### 🔍 搜索功能
- **全文搜索**: 标题、内容、标签全文检索
- **高级筛选**: 分类、标签、时间范围筛选
- **相关性排序**: 智能搜索结果排序
- **搜索建议**: 实时搜索建议

### 📷 媒体处理
- **图片上传**: 拖拽上传、粘贴上传
- **自动压缩**: 图片自动优化和格式转换
- **CDN 加速**: R2 存储 + Cloudflare CDN
- **多尺寸**: 自动生成缩略图

### 🛡️ 安全特性
- **JWT 认证**: 安全的 Token 机制
- **速率限制**: 防止 API 滥用
- **SQL 注入防护**: 参数化查询
- **XSS 防护**: 内容过滤和转义
- **CORS 配置**: 跨域请求控制
- **密码加密**: Bcrypt 加密存储

### ⚡ 性能优化
- **边缘计算**: Cloudflare Workers 全球部署
- **智能缓存**: KV 缓存策略
- **懒加载**: 图片和组件按需加载
- **代码分割**: 路由级别代码分割
- **压缩传输**: Gzip/Brotli 压缩

---

## 🏗️ 技术架构

### 前端技术栈

```
├── React 18              # 核心框架
├── TypeScript            # 类型安全
├── React Router 6        # 路由管理
├── Zustand              # 状态管理
├── Tailwind CSS         # 样式框架
├── React Markdown       # Markdown 渲染
├── Vite                 # 构建工具
└── date-fns             # 日期处理
```

### 后端技术栈

```
├── Hono                 # Web 框架
├── Cloudflare Workers   # 无服务器计算
├── D1 Database          # SQLite 数据库
├── KV Storage           # 键值缓存
├── R2 Storage           # 对象存储
├── TypeScript           # 类型安全
└── Wrangler             # 部署工具
```

### 基础设施

```
前端部署: Cloudflare Pages
后端部署: Cloudflare Workers
数据库: Cloudflare D1 (SQLite)
缓存: Cloudflare KV
存储: Cloudflare R2
CDN: Cloudflare 全球网络
```

### 系统架构图

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐    HTTPS    ┌──────────────┐
│  Cloudflare │◄───────────►│ Cloudflare   │
│    Pages    │             │   Workers    │
│  (Frontend) │             │  (Backend)   │
└─────────────┘             └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌──────────┐   ┌──────────┐  ┌──────────┐
             │    D1    │   │    KV    │  │    R2    │
             │ Database │   │  Cache   │  │ Storage  │
             └──────────┘   └──────────┘  └──────────┘
```

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Cloudflare 账号
- Git

### 1️⃣ 克隆项目

```bash
git clone https://github.com/yourusername/personal-blog.git
cd personal-blog
```

### 2️⃣ 安装依赖

```bash
# 安装根依赖和所有工作区依赖
npm install
```

### 3️⃣ 配置 Cloudflare

```bash
# 安装并登录 Wrangler CLI
npm install -g wrangler
wrangler login
```

### 4️⃣ 初始化资源

```bash
# 运行初始化脚本（创建 D1、KV、R2）
chmod +x scripts/*.sh
./scripts/init.sh
```

### 5️⃣ 配置环境变量

编辑 `backend/wrangler.toml`：

```toml
name = "blog-api"
route = { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }

[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "blog-storage"

[vars]
FRONTEND_URL = "https://yourdomain.com"
```

设置密钥：

```bash
cd backend
wrangler secret put JWT_SECRET          # 输入 JWT 密钥
wrangler secret put GITHUB_CLIENT_ID    # 输入 GitHub OAuth ID (可选)
wrangler secret put GITHUB_CLIENT_SECRET # 输入 GitHub OAuth Secret (可选)
```

### 6️⃣ 数据库迁移

```bash
./scripts/migrate.sh
```

### 7️⃣ 本地开发

```bash
# 终端 1: 启动后端
cd backend
npm run dev

# 终端 2: 启动前端
cd frontend
npm run dev
```

访问 `http://localhost:5173` 查看应用

### 8️⃣ 部署生产环境

```bash
# 部署后端
cd backend
npm run deploy

# 部署前端
cd frontend
npm run build
wrangler pages deploy dist
```

详细部署步骤请查看 [部署手册](./DEPLOYMENT.md)

---

## 📁 项目结构

```
personal-blog-beta4.0/
├── 📂 backend/                 # 后端 API
│   ├── 📂 src/
│   │   ├── 📂 middleware/      # 中间件
│   │   │   ├── auth.ts         # JWT 认证中间件
│   │   │   ├── rateLimit.ts    # 速率限制中间件
│   │   │   └── requestLogger.ts # 请求日志中间件
│   │   ├── 📂 routes/          # 路由模块
│   │   │   ├── auth.ts         # 认证路由（注册/登录/OAuth）
│   │   │   ├── posts.ts        # 文章路由（CRUD/搜索/点赞）
│   │   │   ├── comments.ts     # 评论路由（发布/回复/审核）
│   │   │   ├── categories.ts   # 分类路由
│   │   │   ├── upload.ts       # 文件上传路由
│   │   │   ├── analytics.ts    # 数据统计路由
│   │   │   ├── admin.ts        # 管理员路由
│   │   │   └── config.ts       # 配置管理路由
│   │   ├── 📂 utils/           # 工具函数
│   │   │   ├── cache.ts        # 缓存工具
│   │   │   ├── jwt.ts          # JWT 工具
│   │   │   ├── validation.ts   # 数据验证
│   │   │   ├── response.ts     # 响应格式化
│   │   │   └── resend.ts       # 邮件服务（可选）
│   │   ├── 📂 types/           # TypeScript 类型定义
│   │   │   └── index.ts
│   │   └── 📄 index.ts         # 主入口文件
│   ├── 📄 package.json
│   └── 📄 wrangler.toml        # Workers 配置文件
│
├── 📂 frontend/                # 前端应用
│   ├── 📂 public/              # 静态资源
│   │   ├── favicon.ico
│   │   └── logo.png
│   ├── 📂 src/
│   │   ├── 📂 components/      # React 组件
│   │   │   ├── Header.tsx      # 页头组件
│   │   │   ├── Footer.tsx      # 页脚组件
│   │   │   ├── ThemeToggle.tsx # 主题切换
│   │   │   ├── PostEditor.tsx  # Markdown 编辑器
│   │   │   ├── CategoryManager.tsx # 分类管理
│   │   │   └── TagManager.tsx  # 标签管理
│   │   ├── 📂 pages/           # 页面组件
│   │   │   ├── HomePage.tsx    # 首页
│   │   │   ├── PostPage.tsx    # 文章详情页
│   │   │   ├── SearchPage.tsx  # 搜索页
│   │   │   ├── LoginPage.tsx   # 登录页
│   │   │   ├── ProfilePage.tsx # 个人资料页
│   │   │   ├── AdminPage.tsx   # 管理后台
│   │   │   ├── ConfigPage.tsx  # 配置页面
│   │   │   ├── AboutPage.tsx   # 关于页面
│   │   │   └── ApiTestPage.tsx # API 测试页
│   │   ├── 📂 stores/          # Zustand 状态管理
│   │   │   ├── authStore.ts    # 认证状态
│   │   │   └── themeStore.ts   # 主题状态
│   │   ├── 📂 hooks/           # 自定义 Hooks
│   │   │   ├── useApiRequest.ts # API 请求 Hook
│   │   │   ├── useSiteConfig.ts # 配置 Hook
│   │   │   └── useVerificationCountdown.ts # 验证倒计时
│   │   ├── 📂 utils/           # 工具函数
│   │   │   └── api.ts          # API 客户端
│   │   ├── 📂 types/           # TypeScript 类型
│   │   │   └── index.ts
│   │   ├── 📄 App.tsx          # 根组件
│   │   ├── 📄 main.tsx         # 应用入口
│   │   └── 📄 index.css        # 全局样式
│   ├── 📄 package.json
│   ├── 📄 vite.config.ts       # Vite 配置
│   ├── 📄 tailwind.config.js   # Tailwind 配置
│   └── 📄 tsconfig.json        # TypeScript 配置
│
├── 📂 database/                # 数据库脚本
│   └── 📄 schema.sql           # 数据库 Schema
│
├── 📂 scripts/                 # 部署脚本
│   ├── 📄 init.sh              # 初始化脚本
│   └── 📄 migrate.sh           # 数据库迁移脚本
│
├── 📂 .github/                 # GitHub 配置
│   └── 📂 workflows/           # GitHub Actions
│       └── 📄 deploy.yml       # 自动部署配置
│
├── 📄 README.md                # 本文档
├── 📄 DEPLOYMENT.md            # 部署手册
├── 📄 API.md                   # API 文档
├── 📄 package.json             # 根 package.json（Monorepo）
└── 📄 package-lock.json

代码统计:
- 后端代码: ~7,138 行 TypeScript
- 前端代码: ~10,024 行 TypeScript/TSX
- 总计: ~17,000+ 行代码
```

---

## 🎯 功能详解

### 用户系统

#### 认证方式
- **密码登录**: 用户名/邮箱 + 密码
- **GitHub OAuth**: 一键登录，自动创建账户
- **JWT Token**: 安全的无状态认证

#### 权限级别
- **Admin**: 所有权限，管理用户和系统配置
- **Moderator**: 审核评论，管理内容
- **User**: 发表文章、评论、点赞

#### 用户功能
- 个人资料编辑
- 头像上传和裁剪
- 密码修改
- 邮箱验证
- 登录历史

### 内容管理

#### 文章编辑
- Markdown 实时预览
- 代码高亮（支持 100+ 语言）
- 图片拖拽上传
- 封面图设置
- 自动保存草稿

#### 文章状态
- **Draft**: 草稿，仅作者可见
- **Published**: 已发布，公开可见
- **Archived**: 归档，不在列表显示

#### 可见性控制
- **Public**: 公开
- **Private**: 仅作者可见
- **Password**: 密码保护

#### SEO 配置
- 自定义 URL Slug
- Meta 标题和描述
- Meta 关键词
- Open Graph 标签
- Twitter Card 标签

### 评论系统

#### 评论功能
- Markdown 格式支持
- 嵌套回复（5 层）
- @提及用户
- 表情支持
- 点赞和热门排序

#### 审核机制
- 自动审核/手动审核
- 关键词过滤
- 垃圾评论检测
- 批量操作

### 搜索引擎

#### 搜索功能
- 全文搜索（标题、内容）
- 标签筛选
- 分类筛选
- 时间范围筛选
- 排序选项（时间、热度、相关性）

#### 搜索算法
- TF-IDF 相关性排序
- 搜索历史记录
- 热门搜索词

### 数据统计

#### 访问统计
- 总访问量
- 独立访客（基于 IP）
- 页面停留时间
- 跳出率

#### 内容统计
- 文章数、评论数、用户数
- 热门文章 Top 10
- 热门标签
- 增长趋势

#### 用户行为
- 活跃用户
- 用户互动（点赞、评论）
- 用户留存率

---

## 💻 本地开发

### 环境要求

- Node.js 18+ 
- npm 9+
- Wrangler CLI
- 推荐使用 VSCode + 以下插件:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript + JavaScript

### 开发命令

```bash
# 安装依赖
npm install

# 启动后端开发服务器 (http://localhost:8787)
cd backend
npm run dev

# 启动前端开发服务器 (http://localhost:5173)
cd frontend
npm run dev

# 构建前端
cd frontend
npm run build

# 预览前端构建
cd frontend
npm run preview

# TypeScript 类型检查
cd frontend
npm run typecheck

# 查看 Worker 日志
cd backend
npm run tail
```

### 开发工作流

1. **功能开发**: 在 feature 分支开发新功能
2. **本地测试**: 使用 `wrangler dev` 本地测试
3. **代码审查**: 提交 Pull Request
4. **自动部署**: 合并到 main 分支自动部署

### 调试技巧

#### 后端调试

```bash
# 查看实时日志
cd backend
wrangler tail

# 查看 D1 数据库
wrangler d1 execute blog-db --command "SELECT * FROM posts LIMIT 10"

# 查看 KV 缓存
wrangler kv:key list --binding CACHE

# 查看 R2 文件
wrangler r2 object list blog-storage
```

#### 前端调试

```javascript
// 在浏览器控制台查看状态
import { useAuthStore } from '@/stores/authStore'
const authStore = useAuthStore.getState()
console.log(authStore)
```

---

## 🚢 部署指南

详细部署步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署

```bash
# 1. 部署后端 API
cd backend
npm run deploy

# 2. 部署前端
cd frontend
npm run build
wrangler pages deploy dist --project-name=blog-frontend
```

### 自动部署

项目配置了 GitHub Actions，推送到 main 分支自动部署：

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
```

### 域名配置

#### 前端域名
1. Cloudflare Pages 设置
2. 添加自定义域名: `blog.neutronx.uk`
3. DNS 自动配置

#### 后端域名
1. 在 `wrangler.toml` 配置路由:
```toml
route = { pattern = "apiblog.neutronx.uk/*", zone_name = "neutronx.uk" }
```
2. 部署后自动生效

---

## ⚙️ 配置说明

### 后端配置

#### wrangler.toml

```toml
name = "blog-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Worker 路由
route = { pattern = "apiblog.yourdomain.com/*", zone_name = "yourdomain.com" }

# D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "your-db-id"

# KV 缓存
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

# R2 存储
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "blog-storage"

# 环境变量
[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://yourdomain.com"
STORAGE_PUBLIC_URL = "https://storage.yourdomain.com"

# 日志配置
[observability]
enabled = true
head_sampling_rate = 1
```

#### 环境变量

| 变量名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `JWT_SECRET` | Secret | ✅ | JWT 加密密钥 |
| `GITHUB_CLIENT_ID` | Secret | ❌ | GitHub OAuth ID |
| `GITHUB_CLIENT_SECRET` | Secret | ❌ | GitHub OAuth Secret |
| `FRONTEND_URL` | Var | ✅ | 前端域名 |
| `STORAGE_PUBLIC_URL` | Var | ✅ | 存储桶公开 URL |

### 前端配置

#### vite.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
```

#### API 端点配置

编辑 `frontend/src/utils/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://apiblog.yourdomain.com/api'
  : '/api'
```

---

## 🚀 性能优化

### 已实现的优化

#### 1. 边缘计算
- Cloudflare Workers 全球 300+ 节点
- 请求就近处理，延迟 < 50ms

#### 2. 智能缓存
- **KV 缓存**: 热门数据缓存 1 小时
- **Browser 缓存**: 静态资源缓存 1 年
- **CDN 缓存**: 图片和静态文件 CDN 缓存

#### 3. 数据库优化
- 索引优化（18+ 索引）
- 查询优化（避免 N+1）
- 分页查询
- 数据库连接池

#### 4. 前端优化
- 代码分割（路由级别）
- 懒加载（图片、组件）
- Tree Shaking
- Gzip/Brotli 压缩

#### 5. 图片优化
- 自动压缩
- WebP 格式
- 响应式图片
- 懒加载

### 性能指标

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Lighthouse Score**: 95+
- **API 响应时间**: < 100ms

---

## ❓ 常见问题

### 部署相关

**Q: 如何获取 D1 Database ID?**

```bash
wrangler d1 list
```

**Q: 如何重置数据库?**

```bash
wrangler d1 execute blog-db --file=database/schema.sql
```

**Q: 如何查看部署日志?**

```bash
wrangler tail
```

### 开发相关

**Q: 本地开发时 API 请求失败?**

确保后端已启动（`npm run dev`），前端代理配置正确。

**Q: 如何添加新的 API 路由?**

1. 在 `backend/src/routes/` 创建路由文件
2. 在 `backend/src/index.ts` 导入并注册
3. 更新 `API.md` 文档

**Q: 如何自定义主题颜色?**

修改 `frontend/tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    },
  },
}
```

### 功能相关

**Q: 如何启用邮件通知?**

1. 注册 Resend 账号
2. 配置 `RESEND_API_KEY` 环境变量
3. 在管理后台启用邮件功能

**Q: 如何配置 GitHub OAuth?**

1. 在 GitHub 创建 OAuth App
2. 配置 Callback URL: `https://yourdomain.com/auth/github/callback`
3. 设置 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`

---

## 🗺️ 开发路线

### 已完成 ✅

- [x] 用户认证系统
- [x] 文章 CRUD
- [x] 评论系统
- [x] 分类标签
- [x] 图片上传
- [x] 搜索功能
- [x] 数据统计
- [x] 管理后台
- [x] 暗黑模式
- [x] 响应式设计

### 进行中 🚧

- [ ] RSS 订阅
- [ ] 邮件通知
- [ ] 多语言支持
- [ ] 主题市场

### 计划中 📋

- [ ] 移动 App (React Native)
- [ ] 桌面端 (Electron)
- [ ] AI 内容推荐
- [ ] 文章版本控制
- [ ] Webhook 集成
- [ ] GraphQL API
- [ ] 插件系统

---

## 🤝 贡献指南

欢迎所有形式的贡献！

### 如何贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化
- 编写有意义的 commit message
- 为新功能添加测试

### 提交规范

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具链相关
```

---

## 💰 成本分析

### Cloudflare 免费额度

| 服务 | 免费额度 | 本项目使用 |
|------|---------|-----------|
| Workers | 100,000 请求/天 | ~1,000/天 |
| Pages | 500 构建/月 | ~10/月 |
| D1 | 5GB 存储 | ~100MB |
| KV | 100,000 读/天 | ~500/天 |
| R2 | 10GB 存储 | ~1GB |

**月成本: $0** (在免费额度内)

### 付费后成本预估

- 10 万月访问量: **~$5/月**
- 100 万月访问量: **~$20/月**

远低于传统服务器托管成本！

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议

```
MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 联系方式

- **项目主页**: [blog.neutronx.uk](https://blog.neutronx.uk)
- **问题反馈**: [GitHub Issues](https://github.com/yourusername/personal-blog/issues)
- **技术讨论**: [GitHub Discussions](https://github.com/yourusername/personal-blog/discussions)

---

## 🙏 致谢

感谢以下开源项目：

- [React](https://react.dev/)
- [Hono](https://hono.dev/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/personal-blog&type=Date)](https://star-history.com/#yourusername/personal-blog&Date)

---

<div align="center">

**[⬆ 回到顶部](#-现代化个人博客系统-v30)**

Made with ❤️ using Cloudflare Workers

**如果这个项目对你有帮助，请给一个 ⭐️ Star！**

</div>

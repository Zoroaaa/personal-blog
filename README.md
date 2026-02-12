# Personal Blog

一个基于 Cloudflare 全栈技术构建的现代化个人博客系统。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.3.0-green.svg)](https://github.com/yourusername/personal-blog)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

**体验地址**: [blog.neutronx.uk](https://blog.neutronx.uk)

---

## 效果图

<img width="1920" height="907" alt="image" src="https://github.com/user-attachments/assets/7794985e-ff60-4d90-9b99-833e9d7d23a9" />
<img width="1920" height="908" alt="image" src="https://github.com/user-attachments/assets/9c520f0e-0908-4278-bb2b-aa44bb089304" />
<img width="1920" height="905" alt="image" src="https://github.com/user-attachments/assets/c00148ec-b423-4b66-bbfc-91ddb51d1a03" />
<img width="1920" height="906" alt="image" src="https://github.com/user-attachments/assets/497527ad-5062-4e3f-982c-3653a649603b" />
<img width="1920" height="1902" alt="image" src="https://github.com/user-attachments/assets/eaaf35a3-f9ec-4695-81fa-360fdad769ad" />
<img width="1920" height="907" alt="image" src="https://github.com/user-attachments/assets/c546f122-32bc-44b8-8f5b-2a65787000d3" />
<img width="1920" height="906" alt="image" src="https://github.com/user-attachments/assets/96308d19-68e7-4136-b247-7c0c209c6e34" />

---

## 项目概述

这是一个功能丰富、性能卓越的个人博客系统，采用前后端分离架构，基于 Cloudflare 边缘计算平台构建。系统支持 Markdown 写作、代码高亮、评论互动、用户管理、数据分析等完整功能，适合技术博主和内容创作者使用。

### 核心特性

- **现代化技术栈**: React 18 + TypeScript + Tailwind CSS + Hono
- **边缘计算架构**: 基于 Cloudflare Workers/Pages，全球低延迟访问
- **完整内容管理**: 文章、专栏、分类、标签、评论的全生命周期管理
- **用户系统**: 支持邮箱注册、GitHub OAuth 登录、邮箱验证码
- **互动功能**: 点赞、收藏、阅读历史、嵌套评论（最多5层）
- **全文搜索**: 支持 FTS5 全文搜索引擎
- **管理后台**: 用户管理、内容审核、系统配置、数据分析
- **SEO 优化**: 动态 meta 标签、结构化数据、搜索引擎友好
- **响应式设计**: 完美适配桌面端、平板和移动设备
- **暗色模式**: 支持亮色/暗色主题切换

---

## 技术架构

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| React Router | 6.x | 路由管理 |
| React Markdown | 9.x | Markdown 渲染 |
| PrismJS | 1.x | 代码高亮 |
| Framer Motion | 11.x | 动画效果 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Hono | 4.x | Web 框架 |
| Cloudflare Workers | - | 边缘计算运行时 |
| Cloudflare D1 | - | SQLite 数据库 |
| Cloudflare KV | - | 键值存储 |
| Cloudflare R2 | - | 对象存储 |
| bcryptjs | 2.x | 密码哈希 |
| zod | 3.x | 数据验证 |

---

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+ 或 npm 9+
- Cloudflare 账号

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/personal-blog.git
   cd personal-blog
   ```

2. **安装依赖**
   ```bash
   # 安装后端依赖
   cd backend && pnpm install
   
   # 安装前端依赖
   cd ../frontend && pnpm install
   ```

3. **配置环境变量**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   根据 `.env.example` 中的说明填写必要配置。

4. **创建数据库**
   ```bash
   cd backend
   wrangler d1 create personal-blog-dev
   wrangler d1 execute personal-blog-dev --file=./database/schema.sql
   ```

5. **启动开发服务器**
   ```bash
   # 启动后端（端口 8787）
   cd backend && pnpm dev
   
   # 启动前端（端口 5173）
   cd frontend && pnpm dev
   ```

详细配置请参考 [QUICKSTART.md](./QUICKSTART.md)。

---

## 项目结构

```
personal-blog/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── index.ts        # 应用入口
│   │   ├── routes/         # API 路由
│   │   │   ├── auth.ts     # 认证相关
│   │   │   ├── posts.ts    # 文章管理
│   │   │   ├── columns.ts  # 专栏管理
│   │   │   ├── comments.ts # 评论系统
│   │   │   ├── admin.ts    # 后台管理
│   │   │   ├── categories.ts # 分类标签
│   │   │   ├── config.ts   # 站点配置
│   │   │   ├── upload.ts   # 文件上传
│   │   │   ├── analytics.ts # 数据分析
│   │   │   ├── notifications.ts # 通知系统
│   │   │   ├── notificationSettings.ts # 通知设置
│   │   │   ├── adminNotifications.ts # 管理员通知
│   │   │   ├── messages.ts # 私信系统
│   │   │   └── push.ts     # 浏览器推送
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务服务
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   ├── database/
│   │   └── schema.sql      # 数据库架构
│   └── wrangler.toml       # Workers 配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 可复用组件
│   │   ├── stores/         # 状态管理
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   └── index.html
├── DEPLOYMENT.md           # 部署指南
├── API.md                  # API 文档
├── ARCHITECTURE.md         # 架构文档
└── QUICKSTART.md           # 快速开始
```

---

## 功能模块

### 文章系统

- ✅ Markdown 编辑器支持
- ✅ 代码语法高亮
- ✅ 文章分类和标签
- ✅ 文章专栏归类
- ✅ 浏览量统计
- ✅ 文章搜索（FTS5全文搜索）
- ✅ SEO 元数据配置
- ✅ 文章密码保护
- ✅ 阅读进度追踪

### 专栏系统

- ✅ 专栏创建与管理
- ✅ 专栏封面和描述
- ✅ 专栏统计（文章数、浏览量、点赞数等）
- ✅ 专栏文章列表
- ✅ 专栏排序功能
- ✅ 专栏状态管理（active/hidden/archived）
- ✅ 专栏统计刷新

### 评论系统

- ✅ 嵌套评论（最多5层）
- ✅ 评论审核
- ✅ 评论点赞
- ✅ 管理员回复标识
- ✅ 评论@用户功能

### 用户系统

- ✅ 邮箱注册/登录
- ✅ GitHub OAuth 登录
- ✅ 邮箱验证码（Resend）
- ✅ 密码重置
- ✅ 用户资料管理
- ✅ 阅读历史
- ✅ 收藏文章

### 通知系统

- ✅ 站内通知中心
- ✅ 通知类型：系统通知、互动通知、私信通知
- ✅ 首页通知轮播
- ✅ 通知设置管理
- ✅ 免打扰模式

### 私信系统

- ✅ 用户间私信发送
- ✅ 消息撤回（3分钟内）
- ✅ 消息编辑重发
- ✅ 会话列表管理
- ✅ 未读消息计数

### 管理后台

- ✅ 仪表盘统计
- ✅ 文章管理（CRUD）
- ✅ 专栏管理
- ✅ 评论审核
- ✅ 用户管理
- ✅ 分类/标签管理
- ✅ 系统配置
- ✅ 数据分析
- ✅ 系统通知发布

---

## API 文档

完整的 API 文档请参考 [API.md](./API.md)。

主要 API 模块：
- **认证模块**: `/api/auth/*` - 登录、注册、OAuth、邮箱验证码
- **文章模块**: `/api/posts/*` - 文章 CRUD、搜索、阅读历史
- **专栏模块**: `/api/columns/*` - 专栏管理、统计刷新
- **评论模块**: `/api/comments/*` - 评论管理
- **分类模块**: `/api/categories/*` - 分类标签
- **管理模块**: `/api/admin/*` - 后台管理
- **配置模块**: `/api/config/*` - 站点配置
- **上传模块**: `/api/upload/*` - 文件上传
- **统计模块**: `/api/analytics/*` - 数据分析
- **通知模块**: `/api/notifications/*` - 通知管理
- **私信模块**: `/api/messages/*` - 私信系统

---

## 部署

本项目支持一键部署到 Cloudflare 平台。

### 部署架构

- **前端**: Cloudflare Pages
- **后端**: Cloudflare Workers
- **数据库**: Cloudflare D1
- **缓存**: Cloudflare KV
- **存储**: Cloudflare R2
- **邮件**: Resend

详细部署步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### 快速部署

```bash
# 部署后端
cd backend
wrangler deploy

# 部署前端
cd ../frontend
pnpm build
wrangler pages deploy dist
```

---

## 系统要求

### 最低配置

- Cloudflare Workers 免费版
- Cloudflare D1 免费版（500MB 存储）
- Cloudflare KV 免费版（1GB 存储）
- Cloudflare Pages 免费版
- Cloudflare R2 免费版（10GB 存储）

### 推荐配置

- Cloudflare Workers 付费版（无请求限制）
- Cloudflare D1 付费版（更大存储）
- 自定义域名

---

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 贡献指南

欢迎提交 Issue 和 Pull Request。

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

---

## 相关文档

- [快速开始](./QUICKSTART.md) - 5分钟上手教程
- [部署指南](./DEPLOYMENT.md) - 详细部署说明
- [API 文档](./API.md) - 完整接口参考
- [架构文档](./ARCHITECTURE.md) - 系统设计说明

---

**版本**: v1.3.0 | **更新日期**: 2026-02-12

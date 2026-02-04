# 🚀 个人博客系统 V1

基于Cloudflare Workers和Pages构建的现代化博客系统。

## ✨ 特性

- ✅ 用户认证 (密码登录 + GitHub OAuth)
- ✅ 文章管理 (Markdown支持)
- ✅ 评论系统 (嵌套回复)
- ✅ 点赞功能
- ✅ 分类和标签
- ✅ 图片上传
- ✅ 响应式设计
- ✅ SEO友好
- ✅ 完全免费 (Cloudflare免费额度)

## 🏗️ 架构

**前端**: Cloudflare Pages (React + TypeScript + Tailwind CSS)  
**后端**: Cloudflare Workers (Hono框架)  
**数据库**: D1 (SQLite)  
**缓存**: KV  
**存储**: R2

## 📦 快速开始

### 1. 安装

```bash
git clone <your-repo>
cd blog-system-v1
npm install
```

### 2. 初始化

```bash
npm install -g wrangler
wrangler login
chmod +x scripts/*.sh
./scripts/init.sh
```

### 3. 部署

```bash
./scripts/migrate.sh
cd backend && npm run deploy
cd ../frontend && npm run build && npm run deploy
```

详细步骤请查看 [部署手册](./DEPLOYMENT.md)

## 📁 项目结构

```
blog-system-v1/
├── backend/          # 后端Worker (单个Worker)
├── frontend/         # 前端Pages
├── database/         # 数据库Schema
├── scripts/          # 部署脚本
└── .github/          # GitHub Actions
```

## 🔧 本地开发

```bash
# 后端
cd backend
npm run dev

# 前端(新终端)
cd frontend
npm run dev
```

## 📖 文档

- [部署手册](./DEPLOYMENT.md) - 完整部署指南
- [API文档](./API.md) - 详细API接口说明

## 🎯 功能列表

### 已实现 ✅
- 用户注册/登录
- GitHub OAuth
- 文章CRUD
- Markdown渲染
- 代码高亮
- 评论和回复（嵌套3层）
- 点赞功能
- 分类标签
- 图片上传
- 自动压缩和WebP转换
- 缩略图生成
- 搜索功能
- 阅读时长计算
- 浏览计数
- 数据统计和分析
- 管理后台（完整）
- SEO友好

### 计划中 📋
- RSS订阅
- 邮件通知
- 深色模式
- 多语言支持

## 💰 成本

完全使用Cloudflare免费额度,**月成本 $0**

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request!

---

Made with ❤️ using Cloudflare

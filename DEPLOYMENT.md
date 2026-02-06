## 📚 博客系统部署手册 (v3.0.1)

### 项目架构

**前端**: Cloudflare Pages (React + TypeScript + Tailwind CSS)  
**后端**: Cloudflare Workers (Hono框架)  
**数据库**: D1 (SQLite)  
**缓存**: KV  
**存储**: R2

---

### 快速部署 (10分钟)

#### 1. 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare账号
- GitHub账号

#### 2. 克隆项目

```bash
git clone <your-repo>
cd personal-blog-beta3.0
npm install
```

#### 3. 安装Wrangler

```bash
npm install -g wrangler
wrangler login
```

#### 4. 初始化资源

```bash
chmod +x scripts/*.sh
./scripts/init.sh
```

这个脚本会自动创建:
- D1数据库
- KV命名空间
- R2存储桶
- 设置Secrets

#### 5. 更新配置

运行init脚本后,你会得到资源ID。更新`backend/wrangler.toml`:

```toml
database_id = "你的D1数据库ID"
id = "你的KV命名空间ID"
bucket_name = "blog-storage"
```

#### 6. 运行数据库迁移

```bash
./scripts/migrate.sh
```

#### 7. 本地测试

```bash
# 启动后端
cd backend
npm run dev

# 启动前端(新终端)
cd frontend
npm run dev
```

访问 http://localhost:5173

#### 8. 部署到生产环境

```bash
# 部署后端
cd backend
npm run deploy

# 部署前端
cd frontend
npm run build
npm run deploy
```

---

### GitHub自动部署

#### 1. 配置Secrets

在GitHub仓库的Settings > Secrets中添加:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API令牌
- `CLOUDFLARE_ACCOUNT_ID` - 账号ID
- `VITE_API_URL` - API地址 (例: https://blog-api.your-subdomain.workers.dev)

#### 2. 推送代码自动部署

```bash
git add .
git commit -m "Deploy"
git push origin main
```

GitHub Actions会自动:
- 检测backend目录变更 → 部署Worker
- 检测frontend目录变更 → 部署Pages

---

### 配置GitHub OAuth

1. 访问 https://github.com/settings/developers
2. 创建OAuth App
3. 填写:
   - Homepage URL: 你的Pages URL
   - Callback URL: `你的Pages URL/login`
4. 获取Client ID和Secret
5. 使用wrangler设置:

```bash
echo "YOUR_CLIENT_ID" | wrangler secret put GITHUB_CLIENT_ID --name blog-api
echo "YOUR_CLIENT_SECRET" | wrangler secret put GITHUB_CLIENT_SECRET --name blog-api
```

---

### 创建管理员账号

部署完成后,注册第一个用户,然后手动设置为管理员:

```bash
wrangler d1 execute blog-db --command="UPDATE users SET role='admin' WHERE username='your_username'"
```

---

### 常见问题

**Q: wrangler命令失败**  
A: 确保已登录: `wrangler whoami`

**Q: 数据库连接失败**  
A: 检查wrangler.toml中的database_id是否正确

**Q: CORS错误**  
A: 在backend/src/index.ts中添加你的前端URL到允许列表

**Q: 图片上传失败**  
A: 确保R2存储桶已创建并正确绑定

**Q: 部署后API访问失败**  
A: 检查Worker路由配置和权限设置

**Q: 前端构建失败**  
A: 确保所有依赖已正确安装，运行 `npm install`

---

### 文件结构

```
personal-blog-beta3.0/
├── backend/                 # 后端Worker
│   ├── src/
│   │   ├── index.ts        # 主入口
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   ├── package.json
│   └── wrangler.toml       # Cloudflare配置
│
├── frontend/                # 前端Pages
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── stores/         # 状态管理
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   ├── package.json
│   └── vite.config.ts
│
├── database/                # 数据库
│   └── schema.sql          # 数据库结构
│
└── scripts/                 # 脚本
    ├── init.sh             # 初始化
    └── migrate.sh          # 迁移
```

---

### API端点 (v3.0.1)

#### 认证
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- POST /api/auth/github - GitHub OAuth
- POST /api/auth/logout - 登出
- GET /api/auth/me - 获取当前用户
- PUT /api/auth/profile - 更新用户资料

#### 文章
- GET /api/posts - 文章列表
- GET /api/posts/:slug - 文章详情
- POST /api/posts - 创建文章 (需认证)
- PUT /api/posts/:id - 更新文章 (需认证)
- DELETE /api/posts/:id - 删除文章 (需管理员)
- POST /api/posts/:id/like - 点赞文章 (需认证)
- GET /api/posts/likes - 获取用户点赞的文章 (需认证)
- GET /api/posts/search - 搜索文章
- GET /api/posts/admin - 管理员获取所有文章 (需认证)
- GET /api/posts/admin/:id - 管理员获取文章详情 (需认证)

#### 评论
- GET /api/comments - 评论列表
- POST /api/comments - 发表评论 (需认证)
- DELETE /api/comments/:id - 删除评论 (需认证)
- POST /api/comments/:id/like - 点赞评论 (需认证)

#### 分类和标签
- GET /api/categories - 分类列表
- GET /api/categories/tags - 标签列表

#### 上传
- POST /api/upload - 上传图片 (需认证)
- DELETE /api/upload/:filename - 删除文件 (需认证)

#### 数据分析
- GET /api/analytics - 获取系统统计
- GET /api/analytics/hot-posts - 获取热门文章
- GET /api/analytics/stats - 获取基础统计数据
- GET /api/analytics/post/:id - 获取单篇文章的详细分析
- GET /api/analytics/users - 获取用户统计
- POST /api/analytics/track - 记录页面访问

#### 管理后台
- GET /api/admin/comments - 获取评论列表
- PUT /api/admin/comments/:id/status - 更新评论状态
- DELETE /api/admin/comments/:id - 删除评论
- GET /api/admin/users - 获取用户列表
- PUT /api/admin/users/:id/status - 更新用户状态
- PUT /api/admin/users/:id/role - 更新用户角色
- GET /api/admin/settings - 获取系统设置
- PUT /api/admin/settings - 更新系统设置

#### 配置
- GET /api/config - 获取公开配置信息

---

### 成本估算

Cloudflare免费额度足够个人博客使用:

- Workers: 100,000 请求/天
- Pages: 无限请求,500次构建/月
- D1: 100,000 行读取/天
- KV: 100,000 次读取/天
- R2: 10GB 存储,1M次A类操作/月

**预计成本: $0/月**

---

### 监控和维护

#### 查看日志
```bash
wrangler tail blog-api
```

#### 查看数据库
```bash
wrangler d1 execute blog-db --command="SELECT * FROM posts LIMIT 5"
```

#### 备份数据库
```bash
wrangler d1 export blog-db --output backup.sql
```

---

### 技术栈 (v3.0.1)

**后端**
- Hono - Web框架
- bcryptjs - 密码加密
- Web Crypto API - JWT签名

**前端**
- React 18
- TypeScript
- Tailwind CSS
- Zustand - 状态管理
- React Router - 路由
- React Markdown - Markdown渲染

**基础设施**
- Cloudflare Workers - Serverless运行时
- Cloudflare Pages - 静态托管
- D1 - SQL数据库
- KV - 键值存储
- R2 - 对象存储

---

### 下一步

1. 自定义样式和布局
2. 添加更多功能(搜索、RSS等)
3. 优化SEO
4. 配置自定义域名
5. 设置监控和告警

---

**部署完成! 🎉**

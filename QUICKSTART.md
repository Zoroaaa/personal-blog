# 🚀 快速入门指南

> 10分钟快速部署你的博客系统

**体验站点**: [blog.neutronx.uk](https://blog.neutronx.uk)

---

## 📋 开始之前

### 你需要准备

- ☁️ [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）
- 💻 Node.js 18+ 和 npm 9+
- 🐙 GitHub 账号（可选，用于自动部署）
- 🌐 域名（可选，Cloudflare 提供免费子域名）

### 费用说明

**完全免费！**使用 Cloudflare 免费额度，月成本 $0

---

## 🎯 三种部署方式

### 方式一：一键部署（推荐新手）

**适合**: 想快速体验的用户

1. **Fork 项目**
   ```bash
   访问 GitHub 仓库，点击 Fork 按钮
   ```

2. **配置 GitHub Secrets**
   - 前往 Cloudflare Dashboard 创建 API Token
   - 在 GitHub 仓库 Settings > Secrets 添加：
     - `CLOUDFLARE_API_TOKEN`
     - `CLOUDFLARE_ACCOUNT_ID`

3. **推送代码触发部署**
   ```bash
   git push origin main
   ```

4. **完成！**
   - 访问 Cloudflare Pages 查看你的站点 URL

---

### 方式二：命令行部署（推荐开发者）

**适合**: 需要自定义配置的用户

#### 步骤 1: 克隆项目

```bash
git clone https://github.com/yourusername/personal-blog.git
cd personal-blog
npm install
```

#### 步骤 2: 登录 Cloudflare

```bash
npm install -g wrangler
wrangler login
```

#### 步骤 3: 初始化资源

```bash
chmod +x scripts/*.sh
./scripts/init.sh
```

这个脚本会自动创建：
- ✅ D1 数据库
- ✅ KV 命名空间
- ✅ R2 存储桶

**记录输出的 ID！**

#### 步骤 4: 配置项目

编辑 `backend/wrangler.toml`，填入刚才得到的 ID：

```toml
[[d1_databases]]
database_id = "你的数据库ID"

[[kv_namespaces]]
id = "你的KV-ID"
```

#### 步骤 5: 设置密钥

```bash
cd backend

# 生成并设置 JWT 密钥
openssl rand -base64 32 | wrangler secret put JWT_SECRET

# 可选：GitHub OAuth
echo "your-github-client-id" | wrangler secret put GITHUB_CLIENT_ID
echo "your-github-client-secret" | wrangler secret put GITHUB_CLIENT_SECRET
```

#### 步骤 6: 初始化数据库

```bash
cd ..
./scripts/migrate.sh
```

#### 步骤 7: 本地测试

```bash
# 终端 1: 后端
cd backend
npm run dev

# 终端 2: 前端
cd frontend
npm run dev
```

访问 `http://localhost:5173`

#### 步骤 8: 部署生产环境

```bash
# 部署后端
cd backend
npm run deploy

# 部署前端
cd frontend
npm run build
wrangler pages deploy dist --project-name=blog-frontend
```

#### 步骤 9: 创建管理员

```bash
# 注册第一个账号，然后运行
wrangler d1 execute blog-db \
  --command="UPDATE users SET role='admin' WHERE username='your_username'"
```

**完成！🎉**

---

### 方式三：Docker 部署（实验性）

**适合**: 需要本地开发环境的用户

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 访问应用
open http://localhost:5173
```

---

## 🎨 自定义配置

### 修改网站信息

登录管理后台 → 系统设置：

- 网站名称
- 网站描述
- Logo 和 Favicon
- 社交媒体链接
- 主题颜色

### 配置域名

#### 前端域名

1. Cloudflare Pages > 你的项目 > Custom domains
2. 添加域名: `blog.yourdomain.com`
3. Cloudflare 会自动配置 DNS

#### 后端域名

1. 编辑 `backend/wrangler.toml`:
   ```toml
   route = { pattern = "apiblog.yourdomain.com/*", zone_name = "yourdomain.com" }
   ```

2. 在 Cloudflare DNS 添加记录:
   - Type: A
   - Name: apiblog
   - Content: 192.0.2.1
   - Proxy: 已启用

3. 重新部署:
   ```bash
   cd backend
   npm run deploy
   ```

### 配置 GitHub OAuth

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建 OAuth App
3. 填写:
   - Homepage URL: `https://blog.yourdomain.com`
   - Callback URL: `https://blog.yourdomain.com/login`
4. 获取 Client ID 和 Secret
5. 设置到 Workers:
   ```bash
   cd backend
   echo "YOUR_CLIENT_ID" | wrangler secret put GITHUB_CLIENT_ID
   echo "YOUR_CLIENT_SECRET" | wrangler secret put GITHUB_CLIENT_SECRET
   ```

---

## 📝 第一篇文章

### 方式一：使用界面

1. 登录网站
2. 点击右上角 "写文章"
3. 填写标题和内容（支持 Markdown）
4. 选择分类和标签
5. 点击 "发布"

### 方式二：使用 API

```bash
curl -X POST https://apiblog.yourdomain.com/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一篇文章",
    "content": "# Hello World\n\n这是我的第一篇文章！",
    "status": "published"
  }'
```

---

## 🛠️ 常见问题

### 1. 部署失败？

**检查清单**:
- ✅ 已登录 Cloudflare: `wrangler whoami`
- ✅ wrangler.toml 配置正确
- ✅ 所有 ID 已填写
- ✅ Secrets 已设置

### 2. 无法访问 API？

**解决方案**:
- 检查 CORS 配置（backend/src/index.ts）
- 确认域名已正确配置
- 查看 Workers 日志: `wrangler tail`

### 3. 数据库错误？

**解决方案**:
```bash
# 检查数据库
wrangler d1 list

# 重新运行迁移
./scripts/migrate.sh

# 查看数据
wrangler d1 execute blog-db --command="SELECT * FROM users"
```

### 4. 图片上传失败？

**解决方案**:
- 检查 R2 存储桶已创建
- 确认文件大小 < 5MB
- 检查文件格式（仅支持图片）

### 5. 前端白屏？

**解决方案**:
```bash
# 检查浏览器控制台错误
# 通常是 API URL 配置错误

# 编辑 frontend/src/utils/api.ts
const API_BASE_URL = 'https://apiblog.yourdomain.com/api'

# 重新构建部署
cd frontend
npm run build
wrangler pages deploy dist --project-name=blog-frontend
```

---

## 📊 功能检查清单

部署完成后，测试以下功能：

### 基础功能
- [ ] 首页显示文章列表
- [ ] 点击文章查看详情
- [ ] 搜索功能正常
- [ ] 分类和标签筛选

### 用户功能
- [ ] 注册新账号
- [ ] 登录/登出
- [ ] 修改个人资料
- [ ] 上传头像

### 内容管理
- [ ] 发布新文章
- [ ] 编辑文章
- [ ] 删除文章
- [ ] 图片上传
- [ ] Markdown 预览

### 互动功能
- [ ] 发表评论
- [ ] 回复评论
- [ ] 点赞文章
- [ ] 点赞评论

### 管理功能（管理员）
- [ ] 用户管理
- [ ] 评论审核
- [ ] 分类管理
- [ ] 系统设置

---

## 🚀 进阶配置

### 启用邮件通知

1. 注册 [Resend](https://resend.com) 账号
2. 获取 API Key
3. 设置环境变量:
   ```bash
   cd backend
   echo "your-resend-api-key" | wrangler secret put RESEND_API_KEY
   ```
4. 在管理后台启用邮件功能

### 配置自动备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
wrangler d1 export blog-db --output backup-$DATE.sql
EOF

chmod +x backup.sh

# 添加到 crontab（每天凌晨2点备份）
crontab -e
# 添加: 0 2 * * * /path/to/backup.sh
```

### 性能监控

1. Cloudflare Dashboard > Workers > blog-api > Metrics
2. 查看：
   - 请求数
   - CPU 时间
   - 错误率
   - 响应时间

### SEO 优化

在管理后台配置：
- 网站描述和关键词
- Open Graph 标签
- Twitter Card
- Sitemap（自动生成）
- RSS Feed

---

## 📚 学习资源

### 官方文档
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [D1 数据库](https://developers.cloudflare.com/d1/)
- [Hono 框架](https://hono.dev/)
- [React](https://react.dev/)

### 视频教程
- [Cloudflare Workers 入门](https://www.youtube.com/)
- [React 快速上手](https://www.youtube.com/)

### 社区
- [GitHub Discussions](https://github.com/yourusername/personal-blog/discussions)
- [Discord 社区](https://discord.gg/your-server)

---

## 💡 使用技巧

### 1. 快速写作

使用 Markdown 快捷键：
- `Ctrl/Cmd + B`: 粗体
- `Ctrl/Cmd + I`: 斜体
- `Ctrl/Cmd + K`: 插入链接
- `Ctrl/Cmd + Shift + C`: 插入代码块

### 2. SEO 优化

- 使用有意义的 URL slug
- 添加合适的标签和分类
- 填写 meta 描述
- 使用高质量的封面图

### 3. 图片优化

- 使用 WebP 格式
- 压缩后再上传
- 添加 alt 文本
- 控制图片尺寸

### 4. 互动提升

- 及时回复评论
- 鼓励读者互动
- 分享到社交媒体
- 定期更新内容

---

## 🎓 下一步

- 📖 阅读 [完整文档](./README.md)
- 🔧 查看 [部署手册](./DEPLOYMENT.md)
- 📡 浏览 [API 文档](./API.md)
- 🏗️ 了解 [系统架构](./ARCHITECTURE.md)
- 💬 加入 [社区讨论](https://github.com/yourusername/personal-blog/discussions)

---

## 🆘 获取帮助

遇到问题？

1. 查看 [常见问题](#常见问题)
2. 搜索 [GitHub Issues](https://github.com/yourusername/personal-blog/issues)
3. 提交新 Issue
4. 加入 Discord 社区

---

## 🎉 完成！

恭喜你成功部署了自己的博客系统！

现在开始：
- ✍️ 写第一篇文章
- 🎨 自定义主题
- 📱 分享给朋友
- ⭐ 给项目点个 Star

---

<div align="center">

**快速入门指南版本**: v3.0.1  
**最后更新**: 2024-01-15

[🏠 返回首页](./README.md) | [📖 完整文档](./DEPLOYMENT.md) | [💬 讨论](https://github.com/yourusername/personal-blog/discussions)

Made with ❤️ using Cloudflare

</div>

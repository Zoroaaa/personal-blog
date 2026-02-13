# 更新日志 v1.3.1

**发布日期**: 2026-02-14

本文档记录了个人博客系统 v1.3.1 版本的更新内容。

---

## 版本信息

- **版本号**: v1.3.1
- **发布日期**: 2026-02-14
- **上一版本**: v1.3.0

---

## 文档更新

### 更新的文档文件

本次更新对以下五个项目介绍文档进行了全面修订：

1. **README.md** - 项目主文档
   - 更新版本号为 v1.3.1
   - 更新技术栈版本信息（React 18、Hono 4、Vite 6、Framer Motion 12）
   - 完善项目结构说明，新增路由文件列表
   - 更新数据库迁移文件路径（schema-v1.1-base.sql、schema-v1.2-notification-messaging.sql）
   - 新增功能特性说明（软删除、魔数验证、通知设置等）
   - 完善功能模块列表

2. **QUICKSTART.md** - 快速开始指南
   - 更新环境要求（Node.js 20+）
   - 更新数据库初始化命令（按顺序执行两个 SQL 文件）
   - 完善项目结构速览
   - 新增常见问题解答（通知系统、私信功能）
   - 更新常用命令列表

3. **DEPLOYMENT.md** - 部署指南
   - 更新数据库迁移步骤（两个 SQL 文件）
   - 完善数据库表列表（新增 notification_settings、notification_subscriptions）
   - 新增故障排查章节（通知不显示、私信功能异常）
   - 更新安全建议（文件上传安全）
   - 更新验证部署检查项

4. **ARCHITECTURE.md** - 架构文档
   - 更新技术栈版本信息
   - 完善数据模型（新增软删除字段、通知设置表）
   - 更新 API 路由结构（新增用户模块、密码验证等接口）
   - 新增安全措施（文件上传安全、软删除机制）
   - 更新全文搜索配置（FTS5 tokenize 参数）

5. **API.md** - API 文档
   - 新增用户模块 API
   - 新增文章密码验证接口
   - 新增通知设置接口
   - 完善私信模块接口
   - 新增健康检查接口
   - 更新错误代码列表
   - 完善请求限流规则

---

## 功能确认

### 已确认实现的功能

#### 认证模块
- ✅ 用户注册/登录
- ✅ GitHub OAuth 登录
- ✅ 邮箱验证码（Resend）
- ✅ 密码重置
- ✅ 用户资料管理
- ✅ 账号删除（软删除）
- ✅ 密码修改

#### 文章模块
- ✅ 文章 CRUD
- ✅ 文章分类和标签
- ✅ 文章专栏归类
- ✅ 文章密码保护
- ✅ 文章搜索（FTS5 全文搜索）
- ✅ 点赞/收藏
- ✅ 阅读历史
- ✅ 软删除机制

#### 专栏模块
- ✅ 专栏 CRUD
- ✅ 专栏统计
- ✅ 专栏排序
- ✅ 专栏状态管理

#### 评论模块
- ✅ 嵌套评论（最多5层）
- ✅ 评论审核
- ✅ 评论点赞
- ✅ @提及功能
- ✅ IP/User Agent 记录

#### 通知模块
- ✅ 站内通知中心
- ✅ 系统通知
- ✅ 互动通知
- ✅ 首页公告轮播
- ✅ 通知设置管理
- ✅ 免打扰模式

#### 私信模块
- ✅ 用户间私信
- ✅ 会话列表
- ✅ 未读消息计数
- ✅ 消息已读状态

#### 管理模块
- ✅ 仪表盘统计
- ✅ 用户管理
- ✅ 文章管理
- ✅ 评论审核
- ✅ 系统通知发布

#### 上传模块
- ✅ 图片上传
- ✅ 文件类型验证（魔数验证）
- ✅ 文件大小限制（5MB）

---

## 数据库架构

### 数据库迁移文件

项目使用两个 SQL 文件进行数据库初始化：

1. **schema-v1.1-base.sql** - 基础数据库架构
   - users 表（用户信息）
   - posts 表（文章数据）
   - columns 表（专栏数据）
   - comments 表（评论数据）
   - categories 表（分类）
   - tags 表（标签）
   - post_tags 表（文章标签关联）
   - likes 表（点赞记录）
   - reading_history 表（阅读历史）
   - favorites 表（收藏记录）
   - site_config 表（站点配置）
   - posts_fts 表（全文搜索虚拟表）

2. **schema-v1.2-notification-messaging.sql** - 通知私信架构
   - notifications 表（通知数据）
   - notification_settings 表（通知设置）
   - notification_subscriptions 表（推送订阅）
   - messages 表（私信数据）

---

## 技术栈版本

### 前端
| 技术 | 版本 |
|------|------|
| React | 18.x |
| TypeScript | 5.x |
| Vite | 6.x |
| Tailwind CSS | 3.x |
| Zustand | 4.x |
| React Router | 6.x |
| React Markdown | 9.x |
| Framer Motion | 12.x |
| date-fns | 3.x |

### 后端
| 技术 | 版本 |
|------|------|
| Hono | 4.x |
| Zod | 3.x |
| bcryptjs | 3.x |
| jose | 5.x |

---

## 安全增强

### 文件上传安全
- 实现魔数验证，防止恶意文件上传
- 支持格式：JPEG、PNG、GIF、WebP
- 文件大小限制：5MB

### 数据安全
- 用户删除使用软删除机制
- 文章删除使用软删除机制
- 保留数据完整性

---

## 已知限制

### 私信功能
- 不支持消息撤回功能
- 不支持消息编辑功能
- 消息状态仅支持：sent、delivered、read、recalled

### 评论功能
- 嵌套评论最多支持 5 层

### 文件上传
- 最大文件大小：5MB
- 仅支持图片格式

---

## 升级指南

### 从 v1.3.0 升级

1. 更新代码：
   ```bash
   git pull
   ```

2. 更新依赖：
   ```bash
   cd backend && pnpm install
   cd ../frontend && pnpm install
   ```

3. 执行数据库迁移（如未执行）：
   ```bash
   cd backend
   wrangler d1 execute personal-blog-db --file=./database/schema-v1.2-notification-messaging.sql
   ```

4. 重新部署：
   ```bash
   cd backend && wrangler deploy
   cd ../frontend && pnpm build && wrangler pages deploy dist
   ```

---

## 贡献者

感谢所有为该项目做出贡献的开发者。

---

## 反馈

如有问题或建议，请提交 Issue 或 Pull Request。

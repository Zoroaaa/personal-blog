# v1.4.1 管理员创建逻辑

## 变更

- 管理员改由 Secret `ADMIN_EMAIL`（逗号分隔，不区分大小写）指定：该邮箱**验证通过后注册**即为 `admin`。
  - 邮箱注册：需已配置 `RESEND_API_KEY`（验证码验证通过才提权）；未配置时匹配也只注册为普通用户，并输出 warn 日志。
  - GitHub 登录：仅 GitHub 已验证的主邮箱可触发提权，`xxx@github.oauth` 占位邮箱永不匹配。
  - 只在注册时生效，不改动已有账号。
- `database/schema-v1.1-base.sql` 不再预置 `admin@example.com` 默认管理员（固定用户名 + 公开密码哈希，属于已知凭证）。

## 升级注意

- **已部署的库不会被自动清理**：schema 重放不会删除已存在的 `admin@example.com`。先用 `ADMIN_EMAIL` 注册或 SQL 提权你自己的账号，确认可登录后再处理旧账号：
  ```
  # 先看它是否有文章，避免级联删除（users 外键为 ON DELETE CASCADE）
  wrangler d1 execute blog-db --remote --config backend/wrangler.toml \
    --command="SELECT (SELECT COUNT(*) FROM posts WHERE author_id=u.id) AS posts FROM users u WHERE email='admin@example.com'"
  # 无文章则删除；有文章则改密码或把文章转给新管理员后再删
  ```
- `id=0` 的 `system` 账号保留（无密码哈希，不可登录，仅用于系统通知）。

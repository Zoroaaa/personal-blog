#!/bin/bash

# 博客系统初始化脚本

set -e

echo "🚀 开始初始化博客系统..."
echo ""

# 1. 检查wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler未安装,正在安装..."
    npm install -g wrangler
fi

# 2. 登录Cloudflare
echo "📝 请登录Cloudflare账号..."
wrangler login

# 3. 创建D1数据库
echo "💾 创建D1数据库..."
wrangler d1 create blog-db

# 4. 创建KV命名空间
echo "🗄️  创建KV命名空间..."
wrangler kv:namespace create blog-cache

# 5. 创建R2存储桶
echo "📦 创建R2存储桶..."
wrangler r2 bucket create blog-storage

# 6. 设置Secrets
echo ""
echo "🔑 设置Secrets..."
echo "请输入JWT_SECRET (留空自动生成):"
read JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "生成的JWT_SECRET: $JWT_SECRET"
fi

echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --name blog-api

echo "请输入GitHub Client ID:"
read GITHUB_CLIENT_ID
echo "$GITHUB_CLIENT_ID" | wrangler secret put GITHUB_CLIENT_ID --name blog-api

echo "请输入GitHub Client Secret:"
read -s GITHUB_CLIENT_SECRET
echo "$GITHUB_CLIENT_SECRET" | wrangler secret put GITHUB_CLIENT_SECRET --name blog-api

echo ""
echo "✅ 初始化完成!"
echo ""
echo "下一步:"
echo "1. 更新backend/wrangler.toml中的资源ID"
echo "2. 运行: npm run migrate"
echo "3. 运行: npm run deploy"

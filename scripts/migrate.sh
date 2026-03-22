#!/bin/bash

# 数据库迁移脚本
# 按顺序执行所有数据库迁移

set -e

echo "🔄 运行数据库迁移..."

# 检查数据库是否已创建
if [ -z "$1" ]; then
    echo "❌ 请指定数据库名称"
    echo "用法: ./scripts/migrate.sh <database-name>"
    echo "示例: ./scripts/migrate.sh blog-db"
    exit 1
fi

DB_NAME=$1

echo "📦 目标数据库: $DB_NAME"

# 1. 基础表结构
echo "📝 执行基础表结构迁移..."
wrangler d1 execute $DB_NAME --file=database/schema-v1.1-base.sql

# 2. 通知与私信系统
echo "📝 执行通知与私信系统迁移..."
wrangler d1 execute $DB_NAME --file=database/schema-v1.3-notification-messaging.sql

# 3. Refresh Token 支持
echo "📝 执行 Refresh Token 迁移..."
wrangler d1 execute $DB_NAME --file=database/schema-v1.4-refresh-tokens.sql

echo "✅ 迁移完成!"

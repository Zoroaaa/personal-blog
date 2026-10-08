#!/bin/bash

# 数据库迁移脚本（幂等重放）
# 按顺序执行 database/ 下的所有 schema 文件。
# 所有语句均为幂等写法（IF NOT EXISTS / INSERT OR IGNORE / INSERT OR REPLACE），
# 因此可安全重复执行，重复运行结果等同于首次执行。
#
# 用法:
#   ./scripts/migrate.sh <database-name>            # 作用于本地 D1
#   ./scripts/migrate.sh <database-name> --remote   # 作用于远程(生产) D1

set -e

DB_NAME=$1
REMOTE_FLAG=""

if [ -z "$DB_NAME" ]; then
    echo "❌ 请指定数据库名称"
    echo "用法: ./scripts/migrate.sh <database-name> [--remote]"
    echo "示例: ./scripts/migrate.sh blog-db --remote"
    exit 1
fi

if [ "$2" = "--remote" ]; then
    REMOTE_FLAG="--remote"
fi

# 无论从哪个目录调用，都以脚本自身位置为基准解析路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$ROOT_DIR/database"
WRANGLER_CONFIG="$ROOT_DIR/backend/wrangler.toml"

if [ -n "$REMOTE_FLAG" ]; then
    TARGET="远程(生产)"
else
    TARGET="本地"
fi

echo "🔄 运行数据库迁移 [$TARGET]..."
echo "📦 目标数据库: $DB_NAME"

# 顺序不可调换：v1.1 为基础表，v1.3 / v1.4 依赖其建好的表
for f in schema-v1.1-base.sql schema-v1.3-notification-messaging.sql schema-v1.4-refresh-tokens.sql; do
    echo "📝 执行 $f ..."
    npx wrangler d1 execute "$DB_NAME" $REMOTE_FLAG --config "$WRANGLER_CONFIG" --file="$DB_DIR/$f" --yes
done

echo "✅ 迁移完成!"
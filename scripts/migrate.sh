#!/bin/bash

# 数据库迁移脚本

set -e

echo "🔄 运行数据库迁移..."

wrangler d1 execute blog-db --file=database/schema.sql

echo "✅ 迁移完成!"

#!/bin/bash

# 部署守卫：根 wrangler.toml 仍含占位资源 ID 时拒绝部署。
#
# 为什么需要：根 wrangler.toml 仅供「Deploy to Cloudflare」按钮新建站点使用
# （按钮向导会把新创建的 D1/KV/R2 真实 ID 写回该文件）。已有站点误跑 npm run deploy
# 会把 0000... 占位 ID 部署上生产，造成绑定全挂。
# 已有站点请用 npm run deploy:manual，或走 CI（.github/workflows/deploy.yml）。

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 匹配全零 UUID（D1）或全零 32 位 hex（KV）两种占位写法
if grep -qE '0{8}-0{4}-0{4}-0{4}-0{12}|0{32}' "$ROOT_DIR/wrangler.toml"; then
    echo "❌ 根 wrangler.toml 仍包含占位资源 ID，已阻止部署。"
    echo "   本命令仅供 Deploy to Cloudflare 按钮新建站点（资源 ID 由按钮写入）。"
    echo "   已有站点请用 npm run deploy:manual，或走 CI 流水线。"
    exit 1
fi

echo "✅ 根 wrangler.toml 资源 ID 检查通过"

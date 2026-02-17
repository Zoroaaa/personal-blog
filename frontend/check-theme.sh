#!/bin/bash
# check-theme.sh - 主题适配自动检查脚本
# 使用方法: bash check-theme.sh [目录]

SRC_DIR="${1:-src}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 主题适配检查 - 扫描目录: $SRC_DIR"
echo "=================================================="

# 定义违规模式（排除合理例外）
ISSUES=$(grep -rn \
  "bg-white\b\|bg-gray-[0-9]\|bg-slate-[0-9]\|text-gray-[3-9]\|text-slate-[0-9]\|border-gray-[0-9]\|border-slate-[0-9]\|bg-blue-[0-9]\|text-blue-[5-9]\|focus:ring-blue-" \
  "$SRC_DIR/" \
  --include="*.tsx" --include="*.ts" \
  | grep -v "// THEME-OK" \
  | grep -v "bg-slate-800\|bg-slate-900\|bg-slate-800\|border-slate-700" \
  | grep -v "themeStore\|THEME_GUIDE\|check-theme" \
  | grep -v "node_modules")

if [ -n "$ISSUES" ]; then
  echo -e "${RED}❌ 发现未适配的硬编码颜色:${NC}"
  echo ""
  echo "$ISSUES" | head -30
  TOTAL=$(echo "$ISSUES" | wc -l)
  echo ""
  echo -e "${YELLOW}💡 共 $TOTAL 处需要修复。请参考 THEME_GUIDE.md 进行替换${NC}"
  echo ""
  echo "快速替换参考:"
  echo "  bg-white          → bg-card"
  echo "  bg-gray-50        → bg-background"  
  echo "  bg-gray-100       → bg-muted"
  echo "  text-gray-900     → text-foreground"
  echo "  text-gray-500     → text-muted-foreground"
  echo "  border-gray-300   → border-border"
  echo "  bg-blue-600       → bg-primary"
  echo "  text-blue-600     → text-primary"
  exit 1
else
  echo -e "${GREEN}✅ 主题适配检查通过！所有组件均已正确使用语义化颜色 token。${NC}"
  exit 0
fi

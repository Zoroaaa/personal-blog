# 主题适配规范指南 (Theme Adaptation Guide)

> 版本: v1.0 | 适用框架: React + Tailwind CSS + CSS Variables

---

## 核心原则

**永远不要硬编码颜色值。** 所有颜色必须通过语义化 token 表达，让组件自动适配亮色/暗色/自定义主题。

---

## 语义化 Token 对照表

### 背景色 (Background)

| ❌ 禁用（硬编码）| ✅ 使用（语义化）| 含义 |
|---|---|---|
| `bg-white` | `bg-card` | 卡片/内容区域背景 |
| `bg-gray-50` | `bg-background` | 页面背景 |
| `bg-gray-100` | `bg-muted` | 柔和背景/悬停背景 |
| `bg-gray-200` | `bg-muted` | 分割线/次要背景 |
| `dark:bg-slate-900` | `dark:bg-background` *(已被语义化包含)* | 暗色页面背景 |
| `dark:bg-slate-800` | `dark:bg-card` *(已被语义化包含)* | 暗色卡片背景 |

### 文字色 (Text)

| ❌ 禁用 | ✅ 使用 | 含义 |
|---|---|---|
| `text-gray-900` / `text-black` | `text-foreground` | 主要文字 |
| `text-gray-700` / `text-gray-800` | `text-foreground` | 次要文字 |
| `text-gray-500` / `text-gray-600` | `text-muted-foreground` | 辅助/说明文字 |
| `text-gray-400` | `text-muted-foreground` | 占位符/禁用文字 |
| `dark:text-white` | `dark:text-foreground` *(已被语义化包含)* | — |

### 边框色 (Border)

| ❌ 禁用 | ✅ 使用 | 含义 |
|---|---|---|
| `border-gray-200` | `border-border` | 标准边框 |
| `border-gray-300` | `border-border` | 标准边框 |
| `dark:border-slate-600` | `dark:border-border` *(已被语义化包含)* | — |

### 主色调 (Primary)

| ❌ 禁用 | ✅ 使用 | 含义 |
|---|---|---|
| `bg-blue-600` | `bg-primary` | 主按钮背景 |
| `text-blue-600` | `text-primary` | 主色文字/链接 |
| `border-blue-500` | `border-primary` | 主色边框 |
| `hover:bg-blue-700` | `hover:bg-primary/90` | 主按钮悬停 |
| `focus:ring-blue-500` | `focus:ring-primary/50` | 焦点环 |

---

## 新建组件 Checklist

在提交新组件前，请确认以下每一项：

### ✅ 颜色检查

```bash
# 运行以下命令检测硬编码颜色
grep -n "bg-white\|bg-gray-\|bg-slate-[0-9]\|text-gray-[0-9]\|text-slate-[0-9]\|border-gray-\|bg-blue-\|text-blue-\|border-blue-" 你的组件.tsx
```

若有输出，说明存在硬编码颜色，需要替换为语义化 token。

### ✅ 允许的特例

以下颜色属于**装饰性/语义性颜色**，可以在特定场景下使用：
- `text-white` —— 用于主色调按钮内文字（主色背景上的白色文字）
- 代码块背景：`bg-slate-800` / `bg-slate-900` —— 代码区域保持固定深色
- 状态颜色：`text-red-500`、`text-green-500`、`text-yellow-500` —— 成功/错误/警告语义色
- 渐变装饰：`from-purple-500 to-pink-500` —— 纯装饰性渐变（如头像、标签色块）

---

## 完整的组件模板

```tsx
/**
 * 组件名称
 * 
 * 主题适配规范：
 * - 所有背景使用: bg-background / bg-card / bg-muted
 * - 所有文字使用: text-foreground / text-muted-foreground
 * - 所有边框使用: border-border
 * - 主色调使用:   text-primary / bg-primary
 * - 悬停效果使用: hover:bg-accent
 */

// ✅ 正确示例
export function MyCard({ title, description }: Props) {
  return (
    // 卡片容器 - 使用 bg-card
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 标题 - 主要文字 */}
      <h2 className="text-foreground font-semibold text-lg">{title}</h2>
      
      {/* 说明 - 辅助文字 */}
      <p className="text-muted-foreground text-sm mt-1">{description}</p>
      
      {/* 主按钮 */}
      <button className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
        操作
      </button>
      
      {/* 次要按钮 */}
      <button className="mt-3 ml-2 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-accent transition-colors">
        取消
      </button>
      
      {/* 输入框 */}
      <input 
        className="w-full mt-3 px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      
      {/* 分割线 */}
      <div className="mt-4 border-t border-border" />
      
      {/* 标签 */}
      <span className="mt-2 inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
        标签
      </span>
    </div>
  );
}
```

---

## 新建页面模板

```tsx
/**
 * 页面名称
 * 主题适配：✅ 完整适配
 */

export function MyPage() {
  return (
    // 页面背景
    <div className="min-h-screen bg-background">
      {/* 内容区 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* 页面标题 */}
        <h1 className="text-3xl font-bold text-foreground mb-2">页面标题</h1>
        <p className="text-muted-foreground mb-6">页面说明</p>
        
        {/* 内容卡片 */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-foreground font-semibold">卡片标题</h2>
          
          {/* 次要区域 */}
          <div className="mt-4 bg-muted rounded-md p-3">
            <p className="text-muted-foreground text-sm">次要内容</p>
          </div>
        </div>
        
        {/* 悬停列表 */}
        <ul className="mt-4 space-y-1">
          {items.map(item => (
            <li key={item.id}
              className="px-3 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer transition-colors"
            >
              {item.name}
            </li>
          ))}
        </ul>
        
      </div>
    </div>
  );
}
```

---

## 主题变量参考

下表列出所有可用的 CSS 变量（在 `index.css` 中定义）：

| 变量名 | 亮色值 | 暗色值 | Tailwind 用法 |
|---|---|---|---|
| `--color-background` | `255 255 255` | `15 23 42` | `bg-background` |
| `--color-foreground` | `15 23 42` | `248 250 252` | `text-foreground` |
| `--color-card` | `255 255 255` | `30 41 59` | `bg-card` |
| `--color-card-foreground` | `15 23 42` | `248 250 252` | `text-card-foreground` |
| `--color-border` | `226 232 240` | `51 65 85` | `border-border` |
| `--color-muted` | `241 245 249` | `30 41 59` | `bg-muted` |
| `--color-muted-foreground` | `100 116 139` | `148 163 184` | `text-muted-foreground` |
| `--color-accent` | `241 245 249` | `51 65 85` | `bg-accent` |
| `--primary-color` | 动态 | 动态 | `text-primary` / `bg-primary` |

---

## 自动化检测脚本

将以下脚本保存到项目根目录，在每次提交前运行：

```bash
#!/bin/bash
# check-theme.sh - 主题适配检查脚本

echo "🔍 检查主题适配..."

ISSUES=$(grep -rn \
  "bg-white\|bg-gray-\|bg-slate-[0-9]\|text-gray-[0-9]\|border-gray-[0-9]\|bg-blue-\|text-blue-6\|text-blue-7" \
  src/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "// THEME-OK" \
  | grep -v "bg-slate-800\|bg-slate-900" \
  | grep -v "node_modules")

if [ -n "$ISSUES" ]; then
  echo "❌ 发现未适配的硬编码颜色:"
  echo "$ISSUES"
  echo ""
  echo "💡 请参考 THEME_GUIDE.md 进行替换"
  exit 1
else
  echo "✅ 主题适配检查通过！"
  exit 0
fi
```

> 💡 **特例注解**：若某处颜色确实需要固定（如代码块、状态色），在行末添加 `{/* THEME-OK */}` 注释，脚本将跳过该行。

---

## 常见问题

**Q: 我需要在主色调按钮里显示白色文字，可以用 `text-white` 吗？**

A: 可以。`text-white` 用于主色调背景（`bg-primary`）上的文字是语义正确的，因为主色调按钮需要固定的对比色。

**Q: 状态色（错误/成功/警告）需要适配吗？**

A: 可以使用 Tailwind 的语义状态色：`text-red-500`（错误）、`text-green-500`（成功）、`text-yellow-500`（警告）。这些色彩在两个主题下均有足够对比度，无需额外适配。

**Q: 渐变装饰色（`from-purple-500 to-pink-500`）需要适配吗？**

A: 纯装饰性渐变（如彩色标签、头像背景）不需要强制适配，保留即可。但请确保渐变上的文字使用 `text-white` 以保障可读性。

**Q: 第三方组件的样式不受控怎么办？**

A: 使用 CSS 覆盖，通过 `.dark` 前缀在 `index.css` 中添加专属暗色覆盖规则。


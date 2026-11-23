/**
 * 文章列表排序切换：最新 / 最热（阅读量）/ 最多点赞。
 *
 * 约束：
 * - 受控组件，当前值由调用方（useHomeData）持有并与 URL 同步；
 * - 三个按钮语义清晰，选中态用 primary token，适配主题。
 */

export type SortValue = 'published_at' | 'view_count' | 'like_count';

const OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: 'published_at', label: '最新' },
  { value: 'view_count', label: '最热' },
  { value: 'like_count', label: '最多点赞' },
];

export function SortBar({
  value,
  onChange,
}: {
  value: SortValue;
  onChange: (value: SortValue) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">排序</span>
      <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value === option.value
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

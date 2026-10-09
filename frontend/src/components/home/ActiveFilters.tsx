/**
 * 首页当前过滤标签条
 *
 * 展示已选中的分类/专栏/标签，并支持逐个或整体清除。
 */

import type { Category, Column, Tag } from '../../types';

interface ActiveFiltersProps {
  selectedCategory: string | null;
  selectedColumn: string | null;
  selectedTag: string | null;
  categories: Category[];
  columns: Column[];
  tags: Tag[];
  onClearFilters: () => void;
}

export function ActiveFilters({
  selectedCategory,
  selectedColumn,
  selectedTag,
  categories,
  columns,
  tags,
  onClearFilters,
}: ActiveFiltersProps) {
  if (!(selectedCategory || selectedColumn || selectedTag)) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 animate-fade-in">
      <span className="text-xs text-muted-foreground">筛选:</span>
      {selectedCategory && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          {categories.find(c => c.slug === selectedCategory)?.name}
          <button onClick={onClearFilters} className="hover:text-primary/80">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      )}
      {selectedColumn && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
          {columns.find(c => c.slug === selectedColumn)?.name}
          <button onClick={onClearFilters} className="hover:text-purple-900 dark:hover:text-purple-100">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      )}
      {selectedTag && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
          #{tags.find(t => t.slug === selectedTag)?.name}
          <button onClick={onClearFilters} className="hover:text-emerald-900 dark:hover:text-emerald-100">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      )}
    </div>
  );
}
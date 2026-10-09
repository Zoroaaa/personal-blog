/**
 * 文章编辑的分类 / 专栏 / 标签选择器
 *
 * 三个选择器结构相似，集中在此文件便于对照维护
 *
 * @author 博客系统
 */

import type { TaxonomyCategory, TaxonomyColumn, TaxonomyTag } from '../../hooks/usePostTaxonomies';

interface CategoryPickerProps {
  categories: TaxonomyCategory[];
  loading: boolean;
  selectedId: number | null;
  onToggle: (id: number) => void;
}

export function CategoryPicker({ categories, loading, selectedId, onToggle }: CategoryPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        选择分类
      </label>
      {loading ? (
        <div className="text-muted-foreground">加载分类中...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onToggle(category.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                selectedId === category.id
                  ? 'border-primary bg-primary/10 scale-105'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              </div>
              <span className="text-sm font-medium text-foreground">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ColumnPickerProps {
  columns: TaxonomyColumn[];
  loading: boolean;
  selectedId: number | null;
  onToggle: (id: number | null) => void;
}

export function ColumnPicker({ columns, loading, selectedId, onToggle }: ColumnPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        选择专栏
      </label>
      {loading ? (
        <div className="text-muted-foreground">加载专栏中...</div>
      ) : columns.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          暂无专栏，请在专栏管理中创建
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onToggle(null)}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              selectedId === null
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-sm font-medium text-foreground">
              不选择
            </span>
          </button>
          {columns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => onToggle(column.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                selectedId === column.id
                  ? 'border-primary bg-primary/10 scale-105'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {column.name.slice(0, 2)}
              </div>
              <span className="text-sm font-medium text-foreground truncate max-w-full">
                {column.name}
              </span>
              {column.postCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {column.postCount} 篇文章
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface TagPickerProps {
  tags: TaxonomyTag[];
  loading: boolean;
  selectedTagIds: number[];
  onToggle: (id: number) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dropdownOpen: boolean;
  onOpenDropdown: () => void;
  onCloseDropdown: () => void;
}

export function TagPicker({
  tags,
  loading,
  selectedTagIds,
  onToggle,
  searchTerm,
  onSearchChange,
  dropdownOpen,
  onOpenDropdown,
  onCloseDropdown,
}: TagPickerProps) {
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const filteredTags = tags.filter(tag =>
    tag.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        选择标签
      </label>

      {/* 已选择的标签 */}
      {selectedTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border-2 hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
                borderColor: tag.color || '#E5E7EB',
                color: tag.color || '#6B7280'
              }}
            >
              #{tag.name}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 标签搜索 */}
      <div className="relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onOpenDropdown}
            placeholder="搜索标签..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary dark:bg-muted dark:text-foreground"
          />
        </div>

        {/* 标签下拉列表 */}
        {dropdownOpen && !loading && (
          <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground">
                没有找到标签
              </div>
            ) : (
              <div className="p-2">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      onToggle(tag.id);
                      onSearchChange('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors ${
                      selectedTagIds.includes(tag.id) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        #{tag.name}
                      </span>
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 点击外部关闭下拉 */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={onCloseDropdown}
        />
      )}
    </div>
  );
}
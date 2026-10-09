/**
 * 首页侧边栏：分类、专栏、标签卡片
 *
 * 同时用于桌面端固定侧栏与移动端折叠面板。
 * 展开/收起状态与详情页跳转在此组件内自行管理。
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, Column, Tag } from '../../types';

const INITIAL_CATEGORY_COUNT = 6;
const INITIAL_COLUMN_COUNT = 4;
const INITIAL_TAG_COUNT = 12;

interface HomeSidebarProps {
  categories: Category[];
  columns: Column[];
  tags: Tag[];
  categoriesLoading: boolean;
  columnsLoading: boolean;
  tagsLoading: boolean;
  selectedCategory: string | null;
  selectedColumn: string | null;
  selectedTag: string | null;
  onCategoryClick: (slug: string) => void;
  onColumnClick: (slug: string) => void;
  onTagClick: (slug: string) => void;
  onClearFilters: () => void;
}

export function HomeSidebar({
  categories,
  columns,
  tags,
  categoriesLoading,
  columnsLoading,
  tagsLoading,
  selectedCategory,
  selectedColumn,
  selectedTag,
  onCategoryClick,
  onColumnClick,
  onTagClick,
  onClearFilters,
}: HomeSidebarProps) {
  const navigate = useNavigate();

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, INITIAL_CATEGORY_COUNT);

  const visibleColumns = showAllColumns
    ? columns
    : columns.slice(0, INITIAL_COLUMN_COUNT);

  const visibleTags = showAllTags
    ? tags
    : tags.slice(0, INITIAL_TAG_COUNT);

  // 处理分类点击穿透（导航到分类详情页）
  const handleCategoryNavigate = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/categories/${slug}`);
  };

  // 处理专栏点击穿透（导航到专栏详情页）
  const handleColumnNavigate = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/columns/${slug}`);
  };

  // 处理标签点击穿透（导航到标签详情页）
  const handleTagNavigate = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/tags/${slug}`);
  };

  return (
    <div className="space-y-4">
      {/* 分类卡片 */}
      <div className="bg-card/75 dark:bg-card/75 backdrop-blur-lg rounded-xl shadow-md border border-border/50 dark:border-border/50 p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </span>
            分类
          </h2>
          {selectedCategory && (
            <button
              onClick={onClearFilters}
              className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              清除
            </button>
          )}
        </div>

        {categoriesLoading ? (
          <div className="space-y-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 bg-muted dark:bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {visibleCategories.map((category) => (
                <div
                  key={category.id}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer ${
                    selectedCategory === category.slug
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                  onClick={() => onCategoryClick(category.slug)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium truncate">
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      selectedCategory === category.slug
                        ? 'bg-card/20'
                        : 'bg-muted'
                    }`}>
                      {category.postCount}
                    </span>
                    <button
                      onClick={(e) => handleCategoryNavigate(e, category.slug)}
                      className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                        selectedCategory === category.slug
                          ? 'hover:bg-card/20 text-white'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                      title="查看分类详情"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {categories.length > INITIAL_CATEGORY_COUNT && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="w-full mt-2.5 px-3 py-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center justify-center gap-1 rounded-lg hover:bg-primary/10"
              >
                {showAllCategories ? '收起' : `更多 (${categories.length - INITIAL_CATEGORY_COUNT})`}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showAllCategories ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* 专栏卡片 */}
      <div className="bg-card/75 dark:bg-card/75 backdrop-blur-lg rounded-xl shadow-md border border-border/50 dark:border-border/50 p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            专栏
          </h2>
          {selectedColumn && (
            <button
              onClick={onClearFilters}
              className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              清除
            </button>
          )}
        </div>

        {columnsLoading ? (
          <div className="space-y-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-3 text-muted-foreground text-sm">
            暂无专栏
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer ${
                    selectedColumn === column.slug
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                  onClick={() => onColumnClick(column.slug)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    selectedColumn === column.slug
                      ? 'bg-card/20'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                  }`}>
                    {column.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{column.name}</div>
                    <div className={`text-xs ${
                      selectedColumn === column.slug
                        ? 'text-white/70'
                        : 'text-muted-foreground'
                    }`}>
                      {column.postCount} 篇
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleColumnNavigate(e, column.slug)}
                    className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 ${
                      selectedColumn === column.slug
                        ? 'hover:bg-card/20 text-white'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    title="查看专栏详情"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {columns.length > INITIAL_COLUMN_COUNT && (
              <button
                onClick={() => setShowAllColumns(!showAllColumns)}
                className="w-full mt-2.5 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors flex items-center justify-center gap-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                {showAllColumns ? '收起' : `更多 (${columns.length - INITIAL_COLUMN_COUNT})`}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showAllColumns ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* 标签云卡片 */}
      <div className="bg-card/75 dark:bg-card/75 backdrop-blur-lg rounded-xl shadow-md border border-border/50 dark:border-border/50 p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </span>
            标签
          </h2>
          {selectedTag && (
            <button
              onClick={onClearFilters}
              className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              清除
            </button>
          )}
        </div>

        {tagsLoading ? (
          <div className="flex flex-wrap gap-1.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-6 w-14 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <div
                  key={tag.id}
                  className="group relative"
                >
                  <button
                    onClick={() => onTagClick(tag.slug)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                      selectedTag === tag.slug
                        ? 'shadow-sm scale-105 text-white'
                        : 'hover:scale-105 text-foreground'
                    }`}
                    style={{
                      backgroundColor: selectedTag === tag.slug
                        ? tag.color || '#6B7280'
                        : selectedTag
                          ? 'rgb(243 244 246)'
                          : tag.color
                            ? `${tag.color}20`
                            : 'rgb(243 244 246)',
                      borderWidth: '1px',
                      borderColor: selectedTag === tag.slug
                        ? 'transparent'
                        : tag.color || '#E5E7EB'
                    }}
                  >
                    #{tag.name}
                    <span className="ml-0.5 text-xs opacity-70">
                      {tag.postCount}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleTagNavigate(e, tag.slug)}
                    className="absolute -top-0.5 -right-0.5 p-0.5 rounded-full bg-card shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-muted z-10"
                    title="查看标签详情"
                  >
                    <svg className="w-2.5 h-2.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {tags.length > INITIAL_TAG_COUNT && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="w-full mt-2.5 px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors flex items-center justify-center gap-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                {showAllTags ? '收起' : `更多 (${tags.length - INITIAL_TAG_COUNT})`}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showAllTags ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
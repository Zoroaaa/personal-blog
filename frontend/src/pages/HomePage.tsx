/**
 * 重构的现代化首页组件
 *
 * 新功能:
 * - 分类和标签展示区域
 * - 支持点击分类/标签过滤文章
 * - 分类/标签展开/收起功能
 * - 现代化的响应式UI设计
 * - 平滑的动画效果
 * - 优化的布局结构 - 桌面端3列，平板2列，移动端1列
 *
 * @author 博客系统
 * @version 4.0.0
 * @created 2024-01-01
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { format } from 'date-fns';
import type { PostListItem } from '../types';
import { transformPostList, transformCategoryList, transformColumnList, transformTagList } from '../utils/apiTransformer';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { SEO } from '../components/SEO';
import { NotificationCarousel } from '../components/NotificationCarousel';
import type { Category, Column, Tag } from '../types';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { config } = useSiteConfig();

  // 文章相关状态
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 获取每页文章数配置
  const postsPerPage = config.posts_per_page || 10;

  // 分类、专栏和标签状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);

  // 展开/收起状态
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  // 移动端侧边栏展开状态
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 过滤状态
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [selectedColumn, setSelectedColumn] = useState<string | null>(
    searchParams.get('column')
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    searchParams.get('tag')
  );

  // 显示数量
  const INITIAL_CATEGORY_COUNT = 6;
  const INITIAL_COLUMN_COUNT = 4;
  const INITIAL_TAG_COUNT = 12;

  // 加载分类
  useEffect(() => {
    loadCategories();
  }, []);

  // 加载专栏
  useEffect(() => {
    loadColumns();
  }, []);

  // 加载标签
  useEffect(() => {
    loadTags();
  }, []);

  // 加载文章
  useEffect(() => {
    loadPosts();
  }, [page, selectedCategory, selectedColumn, selectedTag]);

  // 同步URL参数
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (selectedColumn) params.column = selectedColumn;
    if (selectedTag) params.tag = selectedTag;
    setSearchParams(params);
  }, [selectedCategory, selectedColumn, selectedTag]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(transformCategoryList(response.data.categories || []));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadColumns = async () => {
    try {
      setColumnsLoading(true);
      const response = await api.getColumns({ limit: '100' });
      if (response.success && response.data) {
        setColumns(transformColumnList(response.data.columns || []));
      }
    } catch (error) {
      console.error('Failed to load columns:', error);
    } finally {
      setColumnsLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const response = await api.getTags();
      if (response.success && response.data) {
        setTags(transformTagList(response.data.tags || []));
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setTagsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        page: page.toString(),
        limit: postsPerPage.toString()
      };

      if (selectedCategory) params.category = selectedCategory;
      if (selectedColumn) params.column = selectedColumn;
      if (selectedTag) params.tag = selectedTag;

      const response = await api.getPosts(params);

      if (response.success && response.data) {
        const transformedPosts = transformPostList(response.data.posts || []);
        setPosts(transformedPosts);

        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
        }
      } else {
        throw new Error(response.error || '获取文章列表失败');
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      setError(error instanceof Error ? error.message : '加载失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理分类点击（过滤模式）
  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(slug);
      setSelectedColumn(null);
      setSelectedTag(null);
    }
    setPage(1);
  };

  // 处理专栏点击（过滤模式）
  const handleColumnClick = (slug: string) => {
    if (selectedColumn === slug) {
      setSelectedColumn(null);
    } else {
      setSelectedColumn(slug);
      setSelectedCategory(null);
      setSelectedTag(null);
    }
    setPage(1);
  };

  // 处理标签点击（过滤模式）
  const handleTagClick = (slug: string) => {
    if (selectedTag === slug) {
      setSelectedTag(null);
    } else {
      setSelectedTag(slug);
      setSelectedCategory(null);
      setSelectedColumn(null);
    }
    setPage(1);
  };

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

  // 处理文章卡片中的分类点击（导航到分类详情页）
  const handlePostCategoryClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/categories/${slug}`);
  };

  // 处理文章卡片中的标签点击（导航到标签详情页）
  const handlePostTagClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/tags/${slug}`);
  };

  // 清除所有过滤
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedColumn(null);
    setSelectedTag(null);
    setPage(1);
  };

  // 渲染分类列表
  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, INITIAL_CATEGORY_COUNT);

  // 渲染专栏列表
  const visibleColumns = showAllColumns
    ? columns
    : columns.slice(0, INITIAL_COLUMN_COUNT);

  // 渲染标签列表
  const visibleTags = showAllTags
    ? tags
    : tags.slice(0, INITIAL_TAG_COUNT);

  // 侧边栏内容组件
  const SidebarContent = () => (
    <div className="space-y-5">
      {/* 分类卡片 */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 dark:border-slate-700/60 p-5 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </span>
            分类
          </h2>
          {selectedCategory && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              清除
            </button>
          )}
        </div>

        {categoriesLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {visibleCategories.map((category) => (
                <div
                  key={category.id}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    selectedCategory === category.slug
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleCategoryClick(category.slug)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium truncate">
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === category.slug
                        ? 'bg-white/20'
                        : 'bg-gray-200 dark:bg-slate-600'
                    }`}>
                      {category.postCount}
                    </span>
                    <button
                      onClick={(e) => handleCategoryNavigate(e, category.slug)}
                      className={`p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                        selectedCategory === category.slug
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-400'
                      }`}
                      title="查看分类详情"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="w-full mt-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center justify-center gap-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                {showAllCategories ? '收起' : `查看更多 (${categories.length - INITIAL_CATEGORY_COUNT})`}
                <svg
                  className={`w-4 h-4 transition-transform ${showAllCategories ? 'rotate-180' : ''}`}
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
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 dark:border-slate-700/60 p-5 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            专栏
          </h2>
          {selectedColumn && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              清除
            </button>
          )}
        </div>

        {columnsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            暂无专栏
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    selectedColumn === column.slug
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleColumnClick(column.slug)}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    selectedColumn === column.slug
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                  }`}>
                    {column.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{column.name}</div>
                    <div className={`text-xs ${
                      selectedColumn === column.slug
                        ? 'text-white/70'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {column.postCount} 篇文章
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleColumnNavigate(e, column.slug)}
                    className={`p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 ${
                      selectedColumn === column.slug
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-400'
                    }`}
                    title="查看专栏详情"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {columns.length > INITIAL_COLUMN_COUNT && (
              <button
                onClick={() => setShowAllColumns(!showAllColumns)}
                className="w-full mt-3 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors flex items-center justify-center gap-1.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                {showAllColumns ? '收起' : `查看更多 (${columns.length - INITIAL_COLUMN_COUNT})`}
                <svg
                  className={`w-4 h-4 transition-transform ${showAllColumns ? 'rotate-180' : ''}`}
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
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 dark:border-slate-700/60 p-5 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </span>
            标签
          </h2>
          {selectedTag && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              清除
            </button>
          )}
        </div>

        {tagsLoading ? (
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-7 w-16 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <div
                  key={tag.id}
                  className="group relative"
                >
                  <button
                    onClick={() => handleTagClick(tag.slug)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedTag === tag.slug
                        ? 'shadow-md scale-105 text-white'
                        : 'hover:scale-105 text-gray-700 dark:text-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedTag === tag.slug
                        ? tag.color || '#6B7280'
                        : selectedTag
                          ? 'rgb(243 244 246)'
                          : tag.color
                            ? `${tag.color}20`
                            : 'rgb(243 244 246)',
                      borderWidth: '1.5px',
                      borderColor: selectedTag === tag.slug
                        ? 'transparent'
                        : tag.color || '#E5E7EB'
                    }}
                  >
                    #{tag.name}
                    <span className="ml-1 text-xs opacity-70">
                      {tag.postCount}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleTagNavigate(e, tag.slug)}
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white dark:bg-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100 dark:hover:bg-slate-600 z-10"
                    title="查看标签详情"
                  >
                    <svg className="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {tags.length > INITIAL_TAG_COUNT && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="w-full mt-3 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors flex items-center justify-center gap-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                {showAllTags ? '收起' : `查看更多 (${tags.length - INITIAL_TAG_COUNT})`}
                <svg
                  className={`w-4 h-4 transition-transform ${showAllTags ? 'rotate-180' : ''}`}
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

  return (
    <>
      <SEO title="首页" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-10">

          {/* 页面标题 - 通知轮播 */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <NotificationCarousel />
          </div>

          {/* 移动端筛选按钮 */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-md border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                筛选与分类
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${mobileSidebarOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 移动端侧边栏内容 */}
            {mobileSidebarOpen && (
              <div className="mt-3 animate-fade-in">
                <SidebarContent />
              </div>
            )}
          </div>

          {/* 主内容区域 - 响应式网格布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* 左侧: 分类和标签 - 桌面端显示 */}
            <div className="hidden lg:block lg:col-span-3 xl:col-span-2.5">
              <div className="sticky top-24">
                <SidebarContent />
              </div>
            </div>

            {/* 中间: 文章列表 */}
            <div className="lg:col-span-9 xl:col-span-7">

              {/* 当前过滤标签 */}
              {(selectedCategory || selectedColumn || selectedTag) && (
                <div className="mb-5 flex flex-wrap items-center gap-2 animate-fade-in">
                  <span className="text-sm text-gray-500 dark:text-gray-400">筛选:</span>
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {categories.find(c => c.slug === selectedCategory)?.name}
                      <button onClick={clearFilters} className="hover:text-blue-900 dark:hover:text-blue-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {selectedColumn && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                      {columns.find(c => c.slug === selectedColumn)?.name}
                      <button onClick={clearFilters} className="hover:text-purple-900 dark:hover:text-purple-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {selectedTag && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                      #{tags.find(t => t.slug === selectedTag)?.name}
                      <button onClick={clearFilters} className="hover:text-emerald-900 dark:hover:text-emerald-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* 文章列表 */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-lg p-5 animate-pulse">
                      <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded-xl mb-4" />
                      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded-lg w-3/4 mb-3" />
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2" />
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                  <svg className="w-14 h-14 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">加载失败</h3>
                  <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{error}</p>
                  <button
                    onClick={loadPosts}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium shadow-md hover:shadow-lg text-sm"
                  >
                    重试
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-lg p-10 text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">暂无文章</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm">
                    {selectedCategory || selectedColumn || selectedTag ? '该分类/专栏/标签下暂无文章' : '还没有发布任何文章'}
                  </p>
                  {(selectedCategory || selectedColumn || selectedTag) && (
                    <button
                      onClick={clearFilters}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
                    >
                      查看所有文章
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* 文章网格 - 响应式列数 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {posts.map((post, index) => (
                      <article
                        key={post.id}
                        className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 dark:border-slate-700/60 overflow-hidden hover:shadow-2xl transition-all duration-300 animate-fade-in flex flex-col"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        {/* 封面图 */}
                        {post.coverImage && (
                          <div className="relative h-44 sm:h-48 overflow-hidden">
                            <img
                              src={post.coverImage}
                              alt={post.title}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        )}

                        {/* 内容区域 */}
                        <div className="flex-1 p-5 flex flex-col">
                          {/* 专栏归属 */}
                          {post.columnName && post.columnSlug && (
                            <Link
                              to={`/columns/${post.columnSlug}`}
                              className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors mb-2 w-fit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              {post.columnName}
                            </Link>
                          )}

                          {/* 标题 */}
                          <Link to={`/posts/${post.slug}`} className="flex items-start gap-2">
                            {post.visibility === 'password' && (
                              <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </span>
                            )}
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                              {post.title}
                            </h2>
                          </Link>

                          {/* 摘要 */}
                          {post.summary && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 flex-1">
                              {post.summary}
                            </p>
                          )}

                          {/* 元信息 */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                            <span className="flex items-center gap-1">
                              {post.authorAvatar ? (
                                <img
                                  src={post.authorAvatar}
                                  alt={post.authorName}
                                  className="w-5 h-5 rounded-full"
                                />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                              {post.authorName}
                            </span>

                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {post.publishedAt ? format(new Date(post.publishedAt), 'yyyy-MM-dd') : '未发布'}
                            </span>

                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {post.viewCount || 0}
                            </span>

                            {post.readingTime && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {post.readingTime}min
                              </span>
                            )}
                          </div>

                          {/* 分类和标签 */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {post.categoryName && (
                              <button
                                onClick={(e) => post.categorySlug && handlePostCategoryClick(e, post.categorySlug)}
                                className="px-2.5 py-1 rounded-lg text-white text-xs font-medium hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: post.categoryColor || '#3B82F6' }}
                              >
                                {post.categoryName}
                              </button>
                            )}

                            {post.tags && post.tags.length > 0 && post.tags.slice(0, 2).map((tag) => (
                              <button
                                key={tag.id}
                                onClick={(e) => handlePostTagClick(e, tag.slug)}
                                className="px-2 py-1 rounded-full text-xs font-medium border hover:scale-105 transition-transform"
                                style={{
                                  backgroundColor: tag.color ? `${tag.color}15` : '#F3F4F6',
                                  borderColor: tag.color || '#E5E7EB',
                                  color: tag.color || '#6B7280'
                                }}
                              >
                                #{tag.name}
                              </button>
                            ))}

                            {post.tags && post.tags.length > 2 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{post.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* 分页 */}
                  {!loading && !error && totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2 animate-fade-in">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
                      >
                        上一页
                      </button>

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm shadow-md hover:shadow-lg ${
                                page === pageNum
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
                      >
                        下一页
                      </button>
                    </div>
                  )}

                  {!loading && !error && (
                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      第 {page} 页,共 {totalPages} 页
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 右侧: 推荐/热门区域 - 大屏显示 */}
            <div className="hidden xl:block xl:col-span-2.5">
              <div className="sticky top-24 space-y-5">
                {/* 快速导航卡片 */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 dark:border-slate-700/60 p-5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    快速导航
                  </h3>
                  <div className="space-y-2">
                    <Link
                      to="/about"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      关于我
                    </Link>
                    <Link
                      to="/search"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      搜索文章
                    </Link>
                  </div>
                </div>

                {/* 统计信息卡片 */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-5 text-white">
                  <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    数据统计
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold">{categories.length}</div>
                      <div className="text-xs text-white/80">分类</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold">{tags.length}</div>
                      <div className="text-xs text-white/80">标签</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 添加必要的CSS动画 */}
        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }

          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    </>
  );
}

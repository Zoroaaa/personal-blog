/**
 * 重构的现代化首页组件（编排层）
 *
 * 结构说明：
 * - 数据加载、过滤逻辑、热门文章等由 hooks/useHomeData 负责；
 * - 侧边栏 / 热门文章 / 过滤条 / 文章列表 / 分页等 UI
 *   由 components/home/ 下子组件渲染。
 *
 * @author 博客系统
 * @version 5.0.0
 * @created 2024-01-01
 */

import { useState } from 'react';
import { NotificationCarousel } from '../components/NotificationCarousel';
import { SEO } from '../components/SEO';
import { HomeSidebar } from '../components/home/HomeSidebar';
import { HotPostsCarousel } from '../components/home/HotPostsCarousel';
import { HotPostsSidebar } from '../components/home/HotPostsSidebar';
import { ActiveFilters } from '../components/home/ActiveFilters';
import { PostList } from '../components/home/PostList';
import { useHomeData } from '../hooks/useHomeData';

export function HomePage() {
  const {
    posts,
    loading,
    error,
    page,
    setPage,
    totalPages,
    loadPosts,
    categories,
    columns,
    tags,
    categoriesLoading,
    columnsLoading,
    tagsLoading,
    hotPosts,
    selectedCategory,
    selectedColumn,
    selectedTag,
    handleCategoryClick,
    handleColumnClick,
    handleTagClick,
    clearFilters,
    hasFilters,
  } = useHomeData();

  // 移动端侧边栏展开状态
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const sidebar = (
    <HomeSidebar
      categories={categories}
      columns={columns}
      tags={tags}
      categoriesLoading={categoriesLoading}
      columnsLoading={columnsLoading}
      tagsLoading={tagsLoading}
      selectedCategory={selectedCategory}
      selectedColumn={selectedColumn}
      selectedTag={selectedTag}
      onCategoryClick={handleCategoryClick}
      onColumnClick={handleColumnClick}
      onTagClick={handleTagClick}
      onClearFilters={clearFilters}
    />
  );

  return (
    <>
      <SEO title="首页" />
      <div className="min-h-screen bg-background">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-10">

          {/* 通知轮播 */}
          <div className="mb-6 sm:mb-8">
            <NotificationCarousel />
          </div>

          {/* 移动端筛选按钮 */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-md rounded-xl shadow-md border border-border/60 text-foreground"
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
                {sidebar}
              </div>
            )}
          </div>

          {/* 主内容区域 - 响应式网格布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

            {/* 左侧: 分类和标签 - 桌面端显示 */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-20">
                {sidebar}
              </div>
            </div>

            {/* 中间: 文章列表 */}
            <div className="lg:col-span-9 xl:col-span-6">
              {/* 手机端/平板端热门文章 - 横向滚动卡片 */}
              <HotPostsCarousel hotPosts={hotPosts} />

              {/* 当前过滤标签 */}
              <ActiveFilters
                selectedCategory={selectedCategory}
                selectedColumn={selectedColumn}
                selectedTag={selectedTag}
                categories={categories}
                columns={columns}
                tags={tags}
                onClearFilters={clearFilters}
              />

              {/* 文章列表 */}
              <PostList
                posts={posts}
                loading={loading}
                error={error}
                hasFilters={hasFilters}
                page={page}
                totalPages={totalPages}
                onRetry={loadPosts}
                onClearFilters={clearFilters}
                onPageChange={setPage}
              />
            </div>

            {/* 右侧: 热门文章区域 - 大屏显示 */}
            <HotPostsSidebar hotPosts={hotPosts} />
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

          .scrollbar-thin {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }

          .scrollbar-thin::-webkit-scrollbar {
            height: 4px;
          }

          .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
          }

          .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.5);
            border-radius: 4px;
          }

          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.7);
          }

          .dark .scrollbar-thin {
            scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
          }

          .dark .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: rgba(100, 116, 139, 0.5);
          }

          .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background-color: rgba(100, 116, 139, 0.7);
          }
        `}</style>
      </div>
    </>
  );
}
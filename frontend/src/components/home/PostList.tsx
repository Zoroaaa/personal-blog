/**
 * 首页文章列表区
 *
 * 负责加载骨架、错误重试、空状态与本页文章网格、分页的渲染。
 */

import type { PostListItem } from '../../types';
import { PostCard } from './PostCard';
import { Pagination } from './Pagination';

interface PostListProps {
  posts: PostListItem[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  page: number;
  totalPages: number;
  onRetry: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}

export function PostList({
  posts,
  loading,
  error,
  hasFilters,
  page,
  totalPages,
  onRetry,
  onClearFilters,
  onPageChange,
}: PostListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lt:grid-cols-4 gap-4 sm:gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card/80 rounded-xl shadow-md p-4 animate-pulse">
            <div className="h-32 sm:h-36 bg-muted rounded-lg mb-3" />
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-full mb-1.5" />
            <div className="h-3 bg-muted rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
        <svg className="w-12 h-12 text-destructive mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-base font-semibold text-destructive mb-1.5">加载失败</h3>
        <p className="text-destructive/80 mb-3 text-sm">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors font-medium text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card/80 rounded-xl shadow-md p-8 text-center">
        <svg
          className="mx-auto h-14 w-14 text-muted-foreground mb-3"
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
        <h3 className="text-lg font-semibold text-foreground mb-1.5">暂无文章</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {hasFilters ? '该分类/专栏/标签下暂无文章' : '还没有发布任何文章'}
        </p>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 font-medium text-sm"
          >
            查看所有文章
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 文章网格 - 响应式列数：手机1列、平板2列、笔记本3列、台式4列 */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lt:grid-cols-4 gap-4 sm:gap-5">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
}
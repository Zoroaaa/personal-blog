/**
 * 首页文章列表区
 *
 * 负责加载骨架、错误重试、空状态与本页文章网格、分页的渲染。
 */

import type { PostListItem } from '../../types';
import { EmptyState, ErrorState } from '../common/AsyncState';
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
      <div className="bg-card/80 rounded-xl">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card/80 rounded-xl shadow-md">
        <EmptyState
          title="暂无文章"
          description={hasFilters ? '该分类/专栏/标签下暂无文章，试试清除筛选' : '还没有发布任何文章'}
          actionLabel={hasFilters ? '查看所有文章' : undefined}
          onAction={hasFilters ? onClearFilters : undefined}
        />
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
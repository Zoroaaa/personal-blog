/**
 * 搜索结果页面
 *
 * 功能：
 * - 显示搜索结果列表
 * - 支持FTS5全文搜索语法
 * - 支持分页
 * - 显示搜索关键词
 * - 处理无结果情况
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 */

import { useEffect, useState } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { format } from 'date-fns';
import type { PostListItem } from '../types';
import { transformPostList } from '../utils/apiTransformer';

// ============= 辅助函数 =============

/**
 * 安全的日期格式化函数
 */
function formatDate(date: any, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  if (!date) return '未知时间';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return '未知时间';
    }

    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date format error:', error, 'Date:', date);
    return '未知时间';
  }
}

// ============= 组件 =============

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const { config } = useSiteConfig();
  const isSearchEnabled = config?.feature_search !== false;

  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category');
  const tagParam = searchParams.get('tag');

  // 如果搜索功能被禁用，重定向到首页
  if (!isSearchEnabled) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (query || categoryParam || tagParam) {
      loadSearchResults(1);
    } else {
      setLoading(false);
    }
  }, [query, categoryParam, tagParam]);

  const loadSearchResults = async (pageNum: number) => {
    try {
      setLoading(pageNum === 1 ? true : false);
      setError(null);

      const response = await api.searchPosts({
        q: query,
        category: categoryParam || undefined,
        tag: tagParam || undefined,
        page: pageNum.toString(),
        limit: '10',
        sort: query ? 'relevance' : 'published_at', // 有关键词时使用相关性排序
        use_fts: 'true' // 启用FTS5全文搜索
      });

      if (response.success && response.data) {
        const transformedPosts = transformPostList(response.data.posts || []);
        if (pageNum === 1) {
          setPosts(transformedPosts);
        } else {
          setPosts(prev => [...prev, ...transformedPosts]);
        }
        setTotal(response.data.total || 0);
        setHasMore((pageNum * 10) < (response.data.total || 0));
        setPage(pageNum);
      } else {
        throw new Error(response.error || '搜索失败');
      }
    } catch (error) {
      console.error('Failed to load search results:', error);
      setError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadSearchResults(page + 1);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">搜索中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* 搜索头部 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">搜索结果</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {query ? `关键词: "${query}"` : ''}
          {query && categoryParam ? ' · ' : ''}
          {categoryParam ? `分类: ${categoryParam}` : ''}
          {(query || categoryParam) && tagParam ? ' · ' : ''}
          {tagParam ? `标签: ${tagParam}` : ''}
          {total > 0 && ` · 找到 ${total} 篇文章`}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">{error}</h3>
        </div>
      )}

      {/* 无搜索词提示 */}
      {!query && !categoryParam && !tagParam && (
        <div className="text-center py-16 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">请输入搜索关键词</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">在顶部搜索框中输入关键词来查找相关文章</p>

          {/* FTS5搜索语法提示 */}
          <div className="mt-6 text-left max-w-md mx-auto px-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">高级搜索语法：</p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li><code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">React AND TypeScript</code> - 同时包含两个词</li>
              <li><code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">React OR Vue</code> - 包含任一关键词</li>
              <li><code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">&quot;完整短语&quot;</code> - 精确匹配短语</li>
              <li><code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">React*</code> - 前缀匹配</li>
              <li><code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">React -Vue</code> - 包含React但不包含Vue</li>
            </ul>
          </div>
        </div>
      )}

      {/* 无结果提示 */}
      {query && posts.length === 0 && !loading && (
        <div className="text-center py-16 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">未找到相关文章</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">尝试使用其他关键词或检查拼写</p>
        </div>
      )}

      {/* 搜索结果列表 */}
      {posts.length > 0 && (
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      <Link to={`/posts/${post.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {post.title}
                      </Link>
                    </h2>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                      <span className="flex items-center">
                        {post.authorAvatar ? (
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-5 h-5 rounded-full mr-1"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-slate-600 mr-1"></div>
                        )}
                        {post.authorName || 'Unknown'}
                      </span>
                      <span>{formatDate(post.publishedAt)}</span>
                      <span>{post.viewCount || 0} 次阅读</span>
                      {post.readingTime && (
                        <span>{post.readingTime} 分钟</span>
                      )}
                    </div>
                  </div>
                </div>

                {post.summary && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{post.summary}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* 标签 */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag.id}
                          to={`/search?tag=${tag.slug}`}
                          className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          #{tag.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* 分类 */}
                  {post.categoryName && (
                    <Link
                      to={`/search?category=${post.categorySlug}`}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {post.categoryName}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}

          {/* 加载更多 */}
          {hasMore && (
            <div className="text-center py-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}

          {/* 无更多结果 */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              没有更多结果了
            </div>
          )}
        </div>
      )}
    </div>
  );
}

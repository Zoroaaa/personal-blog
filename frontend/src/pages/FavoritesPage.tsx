/**
 * 收藏页面
 * 
 * 功能:
 * - 展示用户收藏的文章
 * - 取消收藏
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';

interface FavoriteItem {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  postCover: string;
  postSummary: string;
  postReadingTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  createdAt: string;
  notes: string;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string;
}

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      window.location.href = '/login';
      return;
    }
    fetchFavorites();
  }, [page, isAuthenticated, token]);

  const fetchFavorites = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.getFavorites(page, 20);
      const favoriteItems = result.data?.favorites || [];
      
      // 只使用驼峰命名
      const processedFavorites = favoriteItems.map((item: any) => ({
        id: item.id,
        postId: item.postId,
        postTitle: item.postTitle,
        postSlug: item.postSlug,
        postCover: item.postCover,
        postSummary: item.postSummary,
        postReadingTime: item.postReadingTime,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        notes: item.notes,
        categoryName: item.categoryName,
        categorySlug: item.categorySlug,
        categoryColor: item.categoryColor,
        authorUsername: item.authorUsername,
        authorName: item.authorName,
        authorAvatar: item.authorAvatar
      }))
      // 过滤掉无效的收藏记录
      .filter(item => item.id && item.postId);
      
      setFavorites(processedFavorites);
      setTotalPages(result.data?.pagination?.totalPages || 1);
      setTotal(result.data?.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载收藏失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (postId: number) => {
    if (!token) return;
    if (!confirm('确定要取消收藏吗?')) return;

    try {
      await api.unfavoritePost(postId);
      fetchFavorites();
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消收藏失败');
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  if (loading && favorites.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页头 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            我的收藏
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            共 {total} 篇文章
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 收藏列表 */}
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              暂无收藏
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              收藏喜欢的文章,方便以后查看
            </p>
            <Link
              to="/"
              className="mt-6 inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              去发现文章
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden group"
              >
                {/* 封面图 */}
                {item.postCover && (
                  <Link to={`/post/${item.postSlug}`}>
                    <img
                      src={item.postCover}
                      alt={item.postTitle}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                )}

                <div className="p-6">
                  {/* 分类标签 */}
                  {item.categoryName && (
                    <span
                      className="inline-block px-2 py-1 text-xs rounded mb-3"
                      style={{
                        backgroundColor: item.categoryColor + '20',
                        color: item.categoryColor,
                      }}
                    >
                      {item.categoryName}
                    </span>
                  )}

                  {/* 标题 */}
                  <Link
                    to={`/post/${item.postSlug}`}
                    className="block text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition mb-2 line-clamp-2"
                  >
                    {item.postTitle}
                  </Link>

                  {/* 摘要 */}
                  {item.postSummary && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {item.postSummary}
                    </p>
                  )}

                  {/* 统计信息 */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {item.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      {item.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                      {item.commentCount}
                    </span>
                  </div>

                  {/* 收藏时间和操作 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      收藏于 {formatDate(item.createdAt)}
                    </span>
                    <button
                      onClick={() => handleUnfavorite(item.postId)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      取消收藏
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

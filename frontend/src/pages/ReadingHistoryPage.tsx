/**
 * 阅读历史页面
 * 
 * 功能:
 * - 展示用户阅读历史
 * - 显示阅读进度和时长
 * - 删除历史记录
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';

interface ReadingHistoryItem {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  postCover: string;
  postSummary: string;
  postReadingTime: number;
  readingProgress: number;
  readingTime: number;
  firstReadAt: string;
  lastReadAt: string;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
  isFavorited: boolean;
}

export const ReadingHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
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
    fetchHistory();
  }, [page, isAuthenticated, token]);

  const fetchHistory = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.getReadingHistory(page, 20);
      const historyItems = result.data?.history || [];
      
      // 只使用驼峰命名
      const processedHistory = historyItems.map((item: any) => ({
        id: item.id,
        postId: item.postId,
        postTitle: item.postTitle,
        postSlug: item.postSlug,
        postCover: item.postCover,
        postSummary: item.postSummary,
        postReadingTime: item.postReadingTime,
        readingProgress: item.readingProgress,
        readingTime: item.readingTime,
        firstReadAt: item.firstReadAt,
        lastReadAt: item.lastReadAt,
        categoryName: item.categoryName,
        categorySlug: item.categorySlug,
        categoryColor: item.categoryColor,
        isFavorited: item.isFavorited
      }))
      // 过滤掉无效的历史记录
      .filter(item => item.id && item.postId);
      
      setHistory(processedHistory);
      setTotalPages(result.data?.pagination?.totalPages || 1);
      setTotal(result.data?.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载阅读历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (historyId: number) => {
    if (!token) return;
    if (!confirm('确定要删除这条阅读记录吗?')) return;

    try {
      await api.deleteReadingHistory(historyId);
      fetchHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    if (!confirm('确定要清空所有阅读历史吗?此操作不可恢复!')) return;

    try {
      await api.clearReadingHistory();
      fetchHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : '清空失败');
    }
  };

  const formatReadingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading && history.length === 0) {
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              阅读历史
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              共 {total} 条记录
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              清空历史
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 阅读历史列表 */}
        {history.length === 0 ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              暂无阅读历史
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              开始阅读文章后,这里会显示您的阅读记录
            </p>
            <Link
              to="/"
              className="mt-6 inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              去阅读文章
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition p-6"
              >
                <div className="flex gap-6">
                  {/* 封面图 */}
                  {item.postCover && (
                    <Link to={`/post/${item.postSlug}`} className="flex-shrink-0">
                      <img
                        src={item.postCover}
                        alt={item.postTitle}
                        className="w-48 h-32 object-cover rounded-lg"
                      />
                    </Link>
                  )}

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link
                          to={`/post/${item.postSlug}`}
                          className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                        >
                          {item.postTitle}
                        </Link>
                        {item.categoryName && (
                          <span
                            className="ml-3 px-2 py-1 text-xs rounded"
                            style={{
                              backgroundColor: item.categoryColor + '20',
                              color: item.categoryColor,
                            }}
                          >
                            {item.categoryName}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                        title="删除"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    {item.postSummary && (
                      <p className="mt-2 text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.postSummary}
                      </p>
                    )}

                    {/* 阅读信息 */}
                    <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>阅读时长: {formatReadingTime(item.readingTime)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>进度: {item.readingProgress}%</span>
                      </div>

                      {/* 进度条 */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${item.readingProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        最后阅读: {formatDate(item.lastReadAt)}
                      </div>
                    </div>
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

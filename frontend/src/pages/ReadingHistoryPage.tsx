/**
 * 阅读历史页面
 * 
 * 功能：
 * - 显示用户的阅读历史记录
 * - 支持分页加载
 * 
 * @author 博客系统
 * @version 1.1.0
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { transformReadingHistoryList } from '../utils/apiTransformer';
import type { ReadingHistoryItem } from '../types';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';
import { SEO } from '../components/SEO';

function formatDate(date: any, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  if (!date) return '未知时间';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '未知时间';
    }
    
    return format(dateObj, formatStr);
  } catch (error) {
    return '未知时间';
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} 分 ${s} 秒` : `${m} 分钟`;
}

export function ReadingHistoryPage() {
  const { user } = useAuthStore();
  const { showError } = useToast();
  
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await api.getReadingHistory({ 
        page: pageNum.toString(), 
        limit: limit.toString() 
      });
      
      if (response.success && response.data) {
        const items = transformReadingHistoryList(response.data.items || []);
        if (pageNum === 1) {
          setHistory(items);
        } else {
          setHistory(prev => [...prev, ...items]);
        }
        setHasMore(items.length === limit);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load reading history:', error);
      showError('加载阅读历史失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadHistory(page + 1);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请先登录查看阅读历史</p>
          <Link to="/login" className="text-primary hover:underline">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="阅读历史" 
        description="查看您的阅读历史记录"
      />
      
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">阅读历史</h1>
            <p className="text-muted-foreground mt-1">您浏览过的文章记录</p>
          </div>

          {/* 历史列表 */}
          {loading && history.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-muted-foreground">暂无阅读历史</p>
              <Link to="/" className="text-primary hover:underline mt-2 inline-block">
                去浏览文章
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {history.map((item) => (
                  <Link
                    key={item.id}
                    to={`/posts/${item.slug}`}
                    className="block bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all group"
                  >
                    <div className="flex gap-4">
                      {item.coverImage && (
                        <div className="flex-shrink-0 w-24 h-16 rounded overflow-hidden">
                          <img
                            src={item.coverImage}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title || '文章已删除'}
                        </h3>
                        {item.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {item.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            阅读于 {formatDate(item.lastReadAt)}
                          </span>
                          {item.readDurationSeconds != null && item.readDurationSeconds > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              时长 {formatDuration(item.readDurationSeconds)}
                            </span>
                          )}
                          {item.readPercentage && item.readPercentage > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              进度 {Math.round(item.readPercentage)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

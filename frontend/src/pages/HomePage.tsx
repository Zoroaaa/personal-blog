/**
 * 首页组件（优化版）
 * 
 * 功能：
 * - 显示文章列表
 * - 分页功能
 * - 使用完整类型定义
 * 
 * 优化内容：
 * 1. 修复API响应格式不匹配导致的加载问题
 * 2. 使用完整的TypeScript类型
 * 3. 改进错误处理
 * 4. 添加空状态显示
 * 5. 优化加载状态
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { format } from 'date-fns';
import type { PostListItem } from '../types';

export function HomePage() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    loadPosts();
  }, [page]);
  
  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 调用API - 注意这里处理新的响应格式
      const response = await api.getPosts({ 
        page: page.toString(), 
        limit: '10' 
      });
      
      console.log('API Response:', response); // 调试日志
      
      // 检查响应格式
      if (response.success && response.data) {
        // 处理后端返回的字段名称，转换为前端期望的格式
        const processedPosts = (response.data.posts || []).map((post: any) => ({
          ...post,
          authorName: post.author_name || post.author_display_name,
          authorAvatar: post.author_avatar,
          viewCount: post.view_count,
          likeCount: post.like_count,
          commentCount: post.comment_count,
          publishedAt: post.published_at,
          coverImage: post.cover_image
        }));
        
        setPosts(processedPosts);
        
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
        }
      } else {
        throw new Error(response.error || '获取文章列表失败');
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      setError(error instanceof Error ? error.message : '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 加载状态
  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-foreground/70">加载中...</p>
        </div>
      </div>
    );
  }
  
  // 错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">加载失败</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadPosts}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }
  
  // 空状态
  if (posts.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="text-center bg-muted rounded-lg p-12">
          <svg
            className="mx-auto h-12 w-12 text-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">暂无文章</h3>
          <p className="mt-1 text-sm text-foreground/60">开始写你的第一篇文章吧！</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6 sm:mb-8">最新文章</h1>
      
      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.id} className="bg-card dark:bg-card border border-border rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in">
            {post.coverImage && (
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-48 sm:h-56 md:h-64 object-cover"
              />
            )}
            <div className="p-6">
              <Link to={`/posts/${post.slug}`}>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-foreground hover:text-primary-600 mb-2 transition-colors">
                  {post.title}
                </h2>
              </Link>
              
              {post.summary && (
                <p className="text-sm sm:text-base text-foreground/70 dark:text-foreground/70 mb-4 line-clamp-2 sm:line-clamp-3">{post.summary}</p>
              )}
              
              <div className="flex flex-wrap items-center text-xs sm:text-sm text-foreground/60 dark:text-foreground/60 space-x-4">
                <span className="flex items-center">
                  {post.authorAvatar ? (
                    <img 
                      src={post.authorAvatar} 
                      alt={post.authorName} 
                      className="w-5 h-5 rounded-full mr-2" 
                    />
                  ) : (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />  
                    </svg>
                  )}
                  {post.authorName || '未知作者'}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />  
                  </svg>
                  {post.publishedAt ? format(new Date(post.publishedAt), 'yyyy-MM-dd') : '未发布'}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />  
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />  
                  </svg>
                  {post.viewCount || 0} 次阅读
                </span>
                {post.categoryName && (
                  <>
                    <span>•</span>
                    <span 
                      className="px-2 py-1 rounded text-white text-xs"
                      style={{ backgroundColor: post.categoryColor || '#3B82F6' }}
                    >
                      {post.categoryName}
                    </span>
                  </>
                )}
              </div>
              
              {/* 标签 */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 bg-muted text-foreground/70 dark:text-foreground/70 rounded text-xs"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 文章元数据 */}
              <div className="mt-4 flex flex-wrap items-center space-x-4 text-xs sm:text-sm text-foreground/60 dark:text-foreground/60">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />  
                  </svg>
                  {post.likeCount || 0} 点赞
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />  
                  </svg>
                  {post.commentCount || 0} 评论
                </span>
                {post.readingTime && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />  
                    </svg>
                    {post.readingTime} 分钟阅读
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      
      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-full sm:w-auto px-4 py-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            上一页
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ 
              length: Math.min(
                typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5, 
                totalPages
              ) 
            }, (_, i) => {
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
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    page === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'border border-border hover:bg-muted'
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
            className="w-full sm:w-auto px-4 py-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            下一页
          </button>
        </div>
      )}
      
      {/* 页码信息 */}
      <div className="mt-4 text-center text-xs sm:text-sm text-foreground/60 dark:text-foreground/60">
        第 {page} 页，共 {totalPages} 页
      </div>
    </div>
  );
}

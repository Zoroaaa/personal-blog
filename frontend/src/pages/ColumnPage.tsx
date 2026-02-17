/**
 * 专栏详情页面
 * 
 * 功能：
 * - 展示专栏信息和该专栏下的所有文章
 * - 支持文章分页加载
 * - 响应式布局设计
 * - 专栏统计数据展示
 * - 文章列表卡片式展示
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { transformColumn, transformPostList } from '../utils/apiTransformer';
import type { Column, PostListItem } from '../types';


export function ColumnPage() {
  const { slug } = useParams<{ slug: string }>();

  const [column, setColumn] = useState<Column | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (slug) {
      loadColumn();
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      loadColumnPosts();
    }
  }, [slug, page]);

  const loadColumn = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getColumn(slug!);
      if (response.success && response.data) {
        setColumn(transformColumn(response.data));
      } else {
        setError(response.error || '专栏不存在');
      }
    } catch (err: any) {
      setError(err.message || '加载专栏失败');
    } finally {
      setLoading(false);
    }
  };

  const loadColumnPosts = async () => {
    try {
      const response = await api.getColumnPosts(slug!, {
        page: page.toString(),
        limit: '10'
      });
      if (response.success && response.data) {
        setPosts(transformPostList(response.data.posts || []));
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Failed to load column posts:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !column) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-foreground mb-2">专栏不存在</h2>
          <p className="text-muted-foreground mb-6">{error || '抱歉，该专栏不存在或已被删除'}</p>
          <Link
            to="/"
            className="px-6 py-3 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 专栏头部 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 专栏封面 */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-card/20 backdrop-blur-sm flex items-center justify-center text-4xl md:text-5xl font-bold">
              {column.coverImage ? (
                <img
                  src={column.coverImage}
                  alt={column.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                column.name.slice(0, 2)
              )}
            </div>

            {/* 专栏信息 */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{column.name}</h1>
              {column.description && (
                <p className="text-white/80 text-lg mb-4 max-w-2xl">{column.description}</p>
              )}

              {/* 作者信息 */}
              {column.authorName && (
                <div className="flex items-center gap-2 mb-4">
                  {column.authorAvatar ? (
                    <img
                      src={column.authorAvatar}
                      alt={column.authorName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center text-sm font-bold">
                      {column.authorName.charAt(0)}
                    </div>
                  )}
                  <span className="text-white/80">{column.authorName}</span>
                </div>
              )}

              {/* 统计数据 */}
              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-white/80">{formatNumber(column.postCount)} 篇文章</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-white/80">{formatNumber(column.totalViewCount)} 阅读</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-white/80">{formatNumber(column.totalLikeCount)} 点赞</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-white/80">{formatNumber(column.totalCommentCount)} 评论</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            文章列表
            <span className="text-lg text-muted-foreground font-normal">({total})</span>
          </h2>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 bg-card backdrop-blur-sm rounded-2xl shadow-lg border border-border">
            <svg className="mx-auto h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-foreground mb-2">暂无文章</h3>
            <p className="text-muted-foreground">该专栏下还没有发布任何文章</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <article
                  key={post.id}
                  className="group bg-card backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden hover:shadow-2xl transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {post.coverImage && (
                    <Link to={`/posts/${post.slug}`} className="block h-48 overflow-hidden">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                  )}
                  <div className="p-6">
                    <Link to={`/posts/${post.slug}`}>
                      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                    </Link>
                    {post.summary && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {post.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {formatNumber(post.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {formatNumber(post.likeCount)}
                        </span>
                      </div>
                      <span>{new Date(post.publishedAt || post.createdAt || Date.now()).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12">
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-6 py-3 bg-card border border-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    上一页
                  </button>

                  <div className="flex items-center gap-2">
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
                          className={`px-4 py-3 rounded-xl transition-all font-medium shadow-md hover:shadow-lg ${
                            page === pageNum
                              ? 'bg-gradient-to-r from-primary to-indigo-600 text-white'
                              : 'bg-card border border-border hover:bg-muted'
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
                    className="px-6 py-3 bg-card border border-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-all shadow-md hover:shadow-lg font-medium"
                  >
                    下一页
                  </button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  第 {page} 页,共 {totalPages} 页
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 个人中心页面
 * 
 * 功能：
 * - 查看和管理自己的评论
 * - 查看自己的点赞文章
 * - 查看收藏文章
 * 
 * @author 博客系统
 * @version 2.2.0
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { transformCommentList, transformPostListItem } from '../utils/apiTransformer';
import type { Comment, PostListItem } from '../types';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';

function formatDate(date: any, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  if (!date) return '未知时间';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
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

export function ProfilePage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  // 从URL参数获取当前标签页，默认为'comments'
  const getTabFromUrl = (): 'comments' | 'likes' | 'favorites' => {
    const tab = searchParams.get('tab');
    const validTabs: Array<'comments' | 'likes' | 'favorites'> = ['comments', 'likes', 'favorites'];
    return validTabs.includes(tab as typeof validTabs[number]) ? (tab as typeof validTabs[number]) : 'comments';
  };

  const [activeTab, setActiveTab] = useState<'comments' | 'likes' | 'favorites'>(getTabFromUrl());
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedPosts, setLikedPosts] = useState<PostListItem[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState({
    comments: false,
    likes: false,
    favorites: false
  });
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (user) {
      loadLikedPosts();
    }
  }, [user]);

  // 当URL参数变化时，同步更新activeTab状态
  useEffect(() => {
    const tabFromUrl = getTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  const loadUserComments = async () => {
    try {
      setLoading(prev => ({ ...prev, comments: true }));
      setError(null);
      
      const response = await api.getComments({
        userId: user?.id.toString() || '',
        page: 1,
        limit: 20
      });
      
      if (response.success && response.data) {
        setComments(transformCommentList(response.data.comments || []));
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
      setError('加载评论失败');
    } finally {
      setLoading(prev => ({ ...prev, comments: false }));
    }
  };
  
  // 加载用户点赞文章
  const loadLikedPosts = async () => {
    try {
      setLoading(prev => ({ ...prev, likes: true }));
      setError(null);
      const response = await api.getLikedPosts({ page: '1', limit: '20' });
      if (response.success && response.data) {
        const posts = (response.data.posts || []).map(transformPostListItem);
        setLikedPosts(posts);
      }
    } catch (error) {
      console.error('Failed to load liked posts:', error);
      setError('加载点赞文章失败');
    } finally {
      setLoading(prev => ({ ...prev, likes: false }));
    }
  };
  
  const loadFavoritePosts = async () => {
    try {
      setLoading(prev => ({ ...prev, favorites: true }));
      setError(null);
      const response = await api.getFavorites({ page: '1', limit: '20' });
      if (response.success && response.data) {
        const posts = (response.data.posts || []).map(transformPostListItem);
        setFavoritePosts(posts);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setError('加载收藏失败');
    } finally {
      setLoading(prev => ({ ...prev, favorites: false }));
    }
  };
  
  useEffect(() => {
    if (activeTab === 'comments') loadUserComments();
    else if (activeTab === 'likes') loadLikedPosts();
    else if (activeTab === 'favorites') loadFavoritePosts();
  }, [activeTab]);
  
  // 删除评论
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) {
      return;
    }
    
    try {
      const response = await api.deleteComment(commentId);
      if (response.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        showSuccess('评论删除成功');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      setError('删除评论失败');
      showError('删除评论失败');
    }
  };
  
  // 渲染评论标签页
  const renderCommentsTab = () => {
    if (loading.comments) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div className="text-center py-16 bg-muted rounded-lg">
          <svg className="mx-auto h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无评论</h3>
          <p className="mt-2 text-muted-foreground">您还没有发表过评论</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                {/* 评论内容 */}
                <p className="text-foreground mb-3">{comment.content}</p>

                {/* 文章信息卡片 */}
                <Link
                  to={`/posts/${comment.post?.slug || comment.postId}`}
                  className="block bg-muted rounded-lg p-3 mb-3 hover:bg-muted/80 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {comment.post?.coverImage && (
                      <img
                        src={comment.post.coverImage}
                        alt={comment.post?.title || ''}
                        className="w-16 h-12 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {comment.post?.title || '未知文章'}
                      </h4>
                      {comment.post?.categoryName && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs mt-1"
                          style={{
                            backgroundColor: comment.post?.categoryColor ? `${comment.post.categoryColor}20` : '#e5e7eb',
                            color: comment.post?.categoryColor || '#374151'
                          }}
                        >
                          {comment.post.categoryName}
                        </span>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                {/* 评论时间和操作 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(comment.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-red-600 hover:text-red-800 ml-4 flex-shrink-0"
                title="删除评论"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const handleUnfavorite = async (postId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('确定要取消收藏这篇文章吗？')) {
      return;
    }

    try {
      const response = await api.toggleFavorite(postId);
      if (response.success) {
        // 从列表中移除
        setFavoritePosts(prev => prev.filter(post => post.id !== postId));
        showSuccess('已取消收藏');
      }
    } catch (error) {
      console.error('Failed to unfavorite:', error);
      setError('取消收藏失败');
      showError('取消收藏失败');
    }
  };

  const renderFavoritesTab = () => {
    if (loading.favorites) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      );
    }
    if (favoritePosts.length === 0) {
      return (
        <div className="text-center py-16 bg-muted rounded-lg">
          <svg className="mx-auto h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无收藏</h3>
          <p className="mt-2 text-muted-foreground">在文章页点击「收藏」即可收藏文章</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favoritePosts.map((post) => (
          <div
            key={post.id}
            className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group relative"
          >
            <Link to={`/posts/${post.slug || post.id}`}>
              {post.coverImage && (
                <div className="h-40 overflow-hidden">
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{post.title}</h3>
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span className="mx-2">•</span>
                  <span>{post.viewCount} 次阅读</span>
                </div>
              </div>
            </Link>
            {/* 取消收藏按钮 */}
            <button
              onClick={(e) => handleUnfavorite(post.id, e)}
              className="absolute top-2 right-2 p-2 bg-card/90 dark:bg-card/90 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors"
              title="取消收藏"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.525 3.025a.5.5 0 00-.707.707l.707.707a.5.5 0 00.707-.707l-.707-.707zM12 2.5a.5.5 0 00-.5.5v1a.5.5 0 001 0v-1a.5.5 0 00-.5-.5zM18.475 3.025l-.707.707a.5.5 0 00.707.707l.707-.707a.5.5 0 00-.707-.707zM4.5 12a.5.5 0 00-.5.5v1a.5.5 0 001 0v-1a.5.5 0 00-.5-.5zM19.5 12a.5.5 0 00-.5.5v1a.5.5 0 001 0v-1a.5.5 0 00-.5-.5zM5.525 20.975a.5.5 0 00.707-.707l-.707-.707a.5.5 0 00-.707.707l.707.707zM12 21.5a.5.5 0 00.5-.5v-1a.5.5 0 00-1 0v1a.5.5 0 00.5.5zM18.475 20.975l.707-.707a.5.5 0 00-.707-.707l-.707.707a.5.5 0 00.707.707zM12 5.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染点赞标签页
  const renderLikesTab = () => {
    if (loading.likes) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      );
    }
    
    if (likedPosts.length === 0) {
      return (
        <div className="text-center py-16 bg-muted rounded-lg">
          <svg className="mx-auto h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无点赞</h3>
          <p className="mt-2 text-muted-foreground">您还没有点赞过文章</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {likedPosts.map((post) => (
          <Link 
            key={post.id} 
            to={`/posts/${post.slug || post.id}`} 
            className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
          >
            {post.coverImage && (
              <div className="h-40 overflow-hidden">
                <img 
                  src={post.coverImage} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>{formatDate(post.publishedAt)}</span>
                <span className="mx-2">•</span>
                <span>{post.viewCount} 次阅读</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };
  
  // 渲染主内容
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">个人中心</h1>
        <p className="text-muted-foreground">查看您的评论、点赞、和收藏</p>
      </div>
      
      {/* 错误消息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {/* 标签页导航 */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('comments');
              setSearchParams({ tab: 'comments' });
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            我的评论
          </button>
          <button
            onClick={() => {
              setActiveTab('likes');
              setSearchParams({ tab: 'likes' });
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'likes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            我的点赞
          </button>
          <button
            onClick={() => {
              setActiveTab('favorites');
              setSearchParams({ tab: 'favorites' });
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'favorites' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            我的收藏
          </button>
        </nav>
      </div>
      
      {/* 标签页内容 */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {activeTab === 'comments' && renderCommentsTab()}
        {activeTab === 'likes' && renderLikesTab()}
        {activeTab === 'favorites' && renderFavoritesTab()}
      </div>
    </div>
  );
}

/**
 * 文章详情页面（修复日期错误版）
 * 
 * 修复内容：
 * 1. 修复日期格式错误（Invalid time value）
 * 2. 添加日期验证
 * 3. 处理null/undefined日期
 * 
 * @author 优化版本
 * @version 2.0.1
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import type { Post, Comment } from '../types';

// 导入代码高亮样式
import 'highlight.js/styles/github.css';

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

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [liking, setLiking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [hasRecordedHistory, setHasRecordedHistory] = useState(false);
  const readingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleRef = React.useRef<HTMLDivElement>(null);
  
  const { isAuthenticated, user } = useAuthStore();
  
  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);
  
  useEffect(() => {
    if (post) {
      // 开始阅读计时
      startReadingTimer();
      
      // 添加滚动监听
      window.addEventListener('scroll', handleScroll);
      
      // 初始计算阅读进度
      calculateReadingProgress();
    }
    
    return () => {
      // 清理定时器和事件监听器
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      
      // 组件卸载时记录阅读历史
      if (post && (readingTime > 5 || readingProgress > 10)) {
        recordReadingHistory();
      }
    };
  }, [post]);
  
  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getPost(slug!);
      
      console.log('Post response:', response);
      
      if (response.success && response.data) {
        setPost(response.data);
        
        // 加载评论
        if (response.data.id) {
          loadComments(response.data.id);
        }
      } else {
        throw new Error(response.error || '文章不存在');
      }
    } catch (error) {
      console.error('Failed to load post:', error);
      setError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };
  
  const loadComments = async (postId: number) => {
    try {
      const response = await api.getComments({ postId });
      
      console.log('Comments response:', response);
      
      if (response.success && response.data) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };
  
  const handleSubmitComment = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    
    if (!newComment.trim() || !post) return;
    
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    try {
      setCommentLoading(true);
      
      const response = await api.createComment({
        postId: post.id,
        content: newComment.trim(),
        parentId,
      });
      
      if (response.success) {
        setNewComment('');
        // 重新加载评论列表
        await loadComments(post.id);
      } else {
        throw new Error(response.error || '发表评论失败');
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
      alert(error instanceof Error ? error.message : '发表评论失败');
    } finally {
      setCommentLoading(false);
    }
  };
  
  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    if (!post || liking) return;
    
    // 立即更新本地状态，提升用户体验
    const newIsLiked = !post.isLiked;
    const newLikeCount = post.likeCount + (newIsLiked ? 1 : -1);
    
    // 先更新UI
    setPost({
      ...post,
      isLiked: newIsLiked,
      likeCount: newLikeCount
    });
    
    try {
      setLiking(true);
      
      const response = await api.likePost(post.id);
      
      console.log('Like response:', response);
      
      if (!response.success) {
        // 如果API请求失败，恢复原来的状态
        setPost({
          ...post,
          isLiked: !newIsLiked,
          likeCount: post.likeCount
        });
        console.error('Like post failed:', response.error);
        alert('点赞失败，请重试');
      }
    } catch (error) {
      console.error('Failed to like post:', error);
      // 如果网络错误，恢复原来的状态
      setPost({
        ...post,
        isLiked: !newIsLiked,
        likeCount: post.likeCount
      });
      alert('点赞失败，请重试');
    } finally {
      setLiking(false);
    }
  };
  
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    if (!post || favoriting) return;
    
    // 立即更新本地状态，提升用户体验
    const newIsFavorited = !post.isFavorited;
    
    // 先更新UI
    setPost({
      ...post,
      isFavorited: newIsFavorited
    });
    
    try {
      setFavoriting(true);
      
      if (newIsFavorited) {
        // 收藏文章
        const response = await api.favoritePost(post.id);
        console.log('Favorite response:', response);
        
        if (!response.success) {
          // 如果API请求失败，恢复原来的状态
          setPost({
            ...post,
            isFavorited: !newIsFavorited
          });
          console.error('Favorite post failed:', response.error);
          alert('收藏失败，请重试');
        }
      } else {
        // 取消收藏
        const response = await api.unfavoritePost(post.id);
        console.log('Unfavorite response:', response);
        
        if (!response.success) {
          // 如果API请求失败，恢复原来的状态
          setPost({
            ...post,
            isFavorited: !newIsFavorited
          });
          console.error('Unfavorite post failed:', response.error);
          alert('取消收藏失败，请重试');
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // 如果网络错误，恢复原来的状态
      setPost({
        ...post,
        isFavorited: !newIsFavorited
      });
      alert('操作失败，请重试');
    } finally {
      setFavoriting(false);
    }
  };
  
  // 开始阅读计时
  const startReadingTimer = () => {
    // 清除之前的定时器
    if (readingTimerRef.current) {
      clearInterval(readingTimerRef.current);
    }
    
    // 每秒更新一次阅读时长
    readingTimerRef.current = setInterval(() => {
      setReadingTime(prevTime => prevTime + 1);
    }, 1000);
  };
  
  // 计算阅读进度
  const calculateReadingProgress = () => {
    if (!articleRef.current) return;
    
    const article = articleRef.current;
    const rect = article.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const articleHeight = article.offsetHeight;
    
    // 计算滚动位置
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const visibleTop = rect.top + scrollTop;
    
    // 计算阅读进度
    const progress = Math.min(
      Math.max((scrollTop - visibleTop + windowHeight * 0.8) / articleHeight, 0),
      1
    ) * 100;
    
    setReadingProgress(progress);
    
    // 检查是否需要记录阅读历史
    if ((progress > 10 || readingTime > 5) && !hasRecordedHistory && isAuthenticated) {
      recordReadingHistory();
    }
  };
  
  // 处理滚动事件
  const handleScroll = () => {
    calculateReadingProgress();
  };
  
  // 记录阅读历史
  const recordReadingHistory = async () => {
    if (!post || !isAuthenticated || hasRecordedHistory) return;
    
    try {
      const response = await api.recordReadingHistory({
        postId: post.id,
        readingProgress: Math.round(readingProgress),
        readingTime: readingTime
      });
      
      console.log('Reading history recorded:', response);
      
      if (response.success) {
        setHasRecordedHistory(true);
      }
    } catch (error) {
      console.error('Failed to record reading history:', error);
    }
  };
  
  // 评论状态管理
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [commentLiking, setCommentLiking] = useState<number | null>(null);
  
  // 处理评论点赞
  const handleLikeComment = async (commentId: number) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    if (commentLiking === commentId) return;
    
    try {
      setCommentLiking(commentId);
      
      const response = await api.likeComment(commentId);
      
      if (response.success && response.data) {
        const liked = response.data.liked;
        if (liked !== undefined) {
          // 更新评论点赞状态
          setComments(prevComments => 
            updateCommentInList(prevComments, commentId, liked)
          );
        }
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    } finally {
      setCommentLiking(null);
    }
  };
  
  // 处理评论回复
  const handleReply = (commentId: number) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyContent('');
  };
  
  // 处理回复提交
  const handleSubmitReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    
    if (!replyContent.trim() || !post) return;
    
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    try {
      setCommentLoading(true);
      
      const response = await api.createComment({
        postId: post.id,
        content: replyContent.trim(),
        parentId,
      });
      
      if (response.success) {
        setReplyContent('');
        setReplyingTo(null);
        // 重新加载评论列表
        await loadComments(post.id);
      } else {
        throw new Error(response.error || '发表回复失败');
      }
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert(error instanceof Error ? error.message : '发表回复失败');
    } finally {
      setCommentLoading(false);
    }
  };
  
  // 辅助函数：更新评论列表中的评论
  const updateCommentInList = (comments: Comment[], commentId: number, liked: boolean): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likeCount: comment.likeCount + (liked ? 1 : -1),
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentInList(comment.replies, commentId, liked),
        };
      }
      return comment;
    });
  };
  
  // 渲染评论
  const renderComment = (comment: Comment, level = 0) => (
    <div key={comment.id} className={`${level > 0 ? 'ml-8' : ''} border-l-2 border-border pl-4 mb-4`}>
      <div className="flex items-start space-x-3">
        {comment.avatarUrl || comment.user?.avatarUrl ? (
          <img 
            src={comment.avatarUrl || comment.user?.avatarUrl} 
            alt={comment.displayName || comment.user?.displayName} 
            className="w-10 h-10 rounded-full" 
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center">
            <span className="text-foreground font-medium">
              {comment.displayName?.[0] || comment.user?.displayName?.[0] || comment.username?.[0] || '?'}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-foreground">
              {comment.displayName || comment.user?.displayName || comment.username}
            </span>
            <span className="text-sm text-muted-foreground">
              {/* 使用安全的日期格式化 */}
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
          
          <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
            <button
              onClick={() => handleLikeComment(comment.id)}
              disabled={commentLiking === comment.id}
              className={`hover:text-blue-600 flex items-center ${commentLiking === comment.id ? 'opacity-50' : ''}`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.likeCount || 0}
            </button>
            
            {level < 3 && (
              <button 
                onClick={() => handleReply(comment.id)}
                className="hover:text-blue-600"
              >
                回复
              </button>
            )}
          </div>
          
          {/* 回复表单 */}
          {replyingTo === comment.id && (
            <form 
              onSubmit={(e) => handleSubmitReply(e, comment.id)}
              className="mt-4 p-4 bg-muted rounded-lg"
            >
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                className="w-full border border-border bg-card rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                maxLength={500}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {replyContent.length}/500
                </span>
                <button
                  type="submit"
                  disabled={commentLoading || !replyContent.trim()}
                  className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {commentLoading ? '发表中...' : '发表回复'}
                </button>
              </div>
            </form>
          )}
          
          {/* 递归渲染回复 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => renderComment(reply, level + 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            {error || '文章不存在'}
          </h3>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* 文章头部 */}
      <article>
        <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>
        
        <div className="flex items-center text-sm text-muted-foreground space-x-4 mb-8">
          <span className="flex items-center">
            {post.author?.avatarUrl || post.authorAvatar ? (
              <img 
                src={post.author?.avatarUrl || post.authorAvatar} 
                alt={post.author?.displayName || post.authorName} 
                className="w-6 h-6 rounded-full mr-2" 
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-border mr-2"></div>
            )}
            {post.author?.displayName || post.authorName || 'Unknown'}
          </span>
          <span>•</span>
          <span>
            {/* 使用安全的日期格式化 */}
            {formatDate(post.publishedAt)}
          </span>
          <span>•</span>
          <span>{post.viewCount || 0} 次阅读</span>
          {post.readingTime && (
            <>
              <span>•</span>
              <span>{post.readingTime} 分钟</span>
            </>
          )}
        </div>
        
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}
        
        {/* 文章内容 */}
        <div className="prose prose-lg max-w-none mb-8" ref={articleRef}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeHighlight]}
            components={{
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
        
        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-muted text-foreground rounded-full text-sm hover:bg-border cursor-pointer"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
        
        {/* 文章操作 */}
        <div className="mt-8 pt-8 border-t border-border flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                post.isLiked
                  ? 'bg-red-50 text-red-600'
                  : 'bg-muted text-foreground hover:bg-border'
              } disabled:opacity-50`}
            >
              <svg
                className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`}
                fill={post.isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{post.likeCount || 0}</span>
            </button>
            
            <button
              onClick={handleFavorite}
              disabled={favoriting}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                post.isFavorited
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-muted text-foreground hover:bg-border'
              } disabled:opacity-50`}
            >
              <svg
                className={`w-5 h-5 ${post.isFavorited ? 'fill-current' : ''}`}
                fill={post.isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span>{post.isFavorited ? '已收藏' : '收藏'}</span>
            </button>
            
            <div className="flex items-center space-x-2 text-muted-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.commentCount || 0} 评论</span>
            </div>
          </div>
          
          {user && user.role === 'admin' && (
            <button
              onClick={() => navigate(`/admin?edit=${post.id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              编辑文章
            </button>
          )}
        </div>
      </article>
      
      {/* 评论区 */}
      <div className="mt-16 border-t border-border pt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">评论 ({comments.length})</h2>
        
        {/* 发表评论 */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full border border-border bg-card rounded-lg p-4 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {newComment.length}/1000
              </span>
              <button
                type="submit"
                disabled={commentLoading || !newComment.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentLoading ? '发表中...' : '发表评论'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-6 bg-muted border border-border rounded-lg text-center">
            <p className="text-muted-foreground mb-4">请先登录后再发表评论</p>
            <button
              onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              去登录
            </button>
          </div>
        )}
        
        {/* 评论列表 */}
        {comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => renderComment(comment))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted rounded-lg">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="mt-2 text-muted-foreground">暂无评论，来发表第一条评论吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 文章详情页面（优化版）
 * 
 * 功能：
 * - 显示文章详情
 * - 评论功能
 * - 点赞功能
 * 
 * 优化内容：
 * 1. 修复API响应格式处理
 * 2. 使用完整的TypeScript类型
 * 3. 修复评论API调用（使用postId而不是slug）
 * 4. 改进错误处理
 * 5. 添加点赞功能
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import type { Post, Comment } from '../types';

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
  
  const { isAuthenticated, user } = useAuthStore();
  
  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);
  
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
      const response = await api.getComments({ postId: postId.toString() });
      
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
        loadComments(post.id);
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
    
    try {
      setLiking(true);
      
      const response = await api.likePost(post.id);
      
      if (response.success && response.data) {
        // 更新文章点赞状态
        setPost({
          ...post,
          isLiked: response.data.liked,
          likeCount: post.likeCount + (response.data.liked ? 1 : -1)
        });
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setLiking(false);
    }
  };
  
  // 渲染评论
  const renderComment = (comment: Comment, level = 0) => (
    <div key={comment.id} className={`${level > 0 ? 'ml-8' : ''} border-l-2 border-gray-200 pl-4 mb-4`}>
      <div className="flex items-start space-x-3">
        {comment.avatarUrl ? (
          <img src={comment.avatarUrl} alt={comment.displayName} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {comment.displayName?.[0] || comment.username?.[0] || '?'}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">
              {comment.displayName || comment.username}
            </span>
            <span className="text-sm text-gray-500">
              {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <button className="hover:text-blue-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.likeCount || 0}
            </button>
            
            {level < 3 && (
              <button className="hover:text-blue-600">回复</button>
            )}
          </div>
          
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        <div className="flex items-center text-sm text-gray-500 space-x-4 mb-8">
          <span className="flex items-center">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-6 h-6 rounded-full mr-2" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 mr-2"></div>
            )}
            {post.authorName || 'Unknown'}
          </span>
          <span>•</span>
          <span>{post.publishedAt ? format(new Date(post.publishedAt), 'yyyy-MM-dd HH:mm') : '未发布'}</span>
          <span>•</span>
          <span>{post.viewCount} 次阅读</span>
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
        <div className="prose prose-lg max-w-none mb-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
        
        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
        
        {/* 文章操作 */}
        <div className="mt-8 pt-8 border-t flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                post.isLiked
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              <span>{post.likeCount}</span>
            </button>
            
            <div className="flex items-center space-x-2 text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.commentCount} 评论</span>
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
      <div className="mt-16 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">评论 ({comments.length})</h2>
        
        {/* 发表评论 */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full border border-gray-300 rounded-lg p-4 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
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
          <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-600 mb-4">请先登录后再发表评论</p>
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
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="mt-2 text-gray-500">暂无评论，来发表第一条评论吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import type { Post, Comment } from '../types';
import { transformPost, transformCommentList } from '../utils/apiTransformer';
import { ShareButtons } from '../components/ShareButtons';
import { SEO } from '../components/SEO';
import { getMarkdownComponents, generateToc } from '../utils/markdownRenderer';
import { useToast } from '../components/Toast';
import { RichTextEditor } from '../components/RichTextEditor';
import type { User } from '../types';

// 导入代码高亮样式
import 'highlight.js/styles/github-dark.css';

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
  const { showSuccess, showError } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [liking, setLiking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const readStartTime = useRef<number>(0);
  const readProgressSent = useRef<boolean>(false);
  const progressTimeoutRef = useRef<number | null>(null);

  // 获取 Markdown 组件和目录
  const markdownComponents = useMemo(() => getMarkdownComponents(), []);
  const toc = useMemo(() => post ? generateToc(post.content) : [], [post]);

  const { isAuthenticated, user } = useAuthStore();
  const { config } = useSiteConfig();
  const isCommentsEnabled = config?.feature_comments !== false;
  const isLikeEnabled = config?.feature_like !== false;
  const isShareEnabled = config?.feature_share !== false;

  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);

  // 文章加载后，为没有 id 的标题添加 id（兼容旧文章）
  useEffect(() => {
    if (!post) return;
    
    // 延迟执行，确保 DOM 已经渲染
    const timer = setTimeout(() => {
      const proseElement = document.querySelector('.prose');
      if (!proseElement) return;
      
      const headings = proseElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading) => {
        if (!heading.id) {
          // 从标题文本生成 id
          const text = heading.textContent || '';
          const id = text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          if (id) {
            heading.id = id;
          }
        }
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [post]);

  // 阅读进度：进入页面开始计时，离开或滚动时上报（仅登录用户）
  const sendReadingProgress = useCallback(async (readPercentage: number) => {
    if (!post?.id || !isAuthenticated) return;
    const duration = Math.floor((Date.now() - readStartTime.current) / 1000);
    try {
      await api.postReadingProgress(post.id, {
        readDurationSeconds: duration,
        readPercentage: Math.min(100, readPercentage),
      });
      readProgressSent.current = true;
    } catch (e) {
      console.warn('Failed to send reading progress', e);
    }
  }, [post?.id, isAuthenticated]);

  useEffect(() => {
    if (!post?.id || !isAuthenticated) return;
    readStartTime.current = Date.now();
    readProgressSent.current = false;

    const contentEl = document.querySelector('.prose');
    if (!contentEl) return;

    const onScroll = () => {
      if (readProgressSent.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const percent = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop + clientHeight) / scrollHeight * 100);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = window.setTimeout(() => sendReadingProgress(percent), 800);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        const percent = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop + clientHeight) / scrollHeight * 100);
        sendReadingProgress(percent);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, [post?.id, isAuthenticated, sendReadingProgress]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.getPost(slug!);

      console.log('Post response:', response);

      if (response.success && response.data) {
        const transformedPost = transformPost(response.data);
        setPost(transformedPost);

        // 加载评论
        if (transformedPost.id) {
          loadComments(transformedPost.id);
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
        setComments(transformCommentList(response.data.comments || []));
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
        showSuccess('评论发表成功');
      } else {
        throw new Error(response.error || '发表评论失败');
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
      showError(error instanceof Error ? error.message : '发表评论失败');
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
    const newIsLiked = !post.isLiked;
    const prevLikeCount = post.likeCount ?? 0;
    const newLikeCount = prevLikeCount + (newIsLiked ? 1 : -1);
    setPost({ ...post, isLiked: newIsLiked, likeCount: newLikeCount });
    try {
      setLiking(true);
      const response = await api.likePost(post.id);
      if (!response.success) {
        setPost({ ...post, isLiked: !newIsLiked, likeCount: prevLikeCount });
        showError('点赞失败，请重试');
        return;
      }
      if (response.data?.likeCount !== undefined) {
        setPost(prev => prev ? { ...prev, likeCount: response.data!.likeCount! } : null);
      }
      showSuccess(newIsLiked ? '点赞成功' : '已取消点赞');
    } catch (error) {
      setPost({ ...post, isLiked: !newIsLiked, likeCount: prevLikeCount });
      showError('点赞失败，请重试');
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
    try {
      setFavoriting(true);
      const response = await api.toggleFavorite(post.id);
      if (response.success && response.data) {
        setPost(prev => prev ? { ...prev, isFavorited: response.data!.favorited } : null);
        showSuccess(response.data.favorited ? '收藏成功' : '已取消收藏');
      }
    } catch (e) {
      console.error('Favorite failed', e);
      showError('操作失败，请重试');
    } finally {
      setFavoriting(false);
    }
  };

  // 评论状态管理
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [commentLiking, setCommentLiking] = useState<number | null>(null);
  const [mentionableUsers, setMentionableUsers] = useState<User[]>([]);

  // 加载可@用户列表
  useEffect(() => {
    if (post?.id) {
      loadMentionableUsers(post.id);
    }
  }, [post?.id]);

  const loadMentionableUsers = async (postId: number) => {
    try {
      const response = await api.get(`/posts/${postId}/mentionable-users`);
      if (response.success && response.data) {
        setMentionableUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Failed to load mentionable users:', error);
    }
  };

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
        // 更新评论点赞状态
        setComments(prevComments =>
          updateCommentInList(prevComments, commentId, response.data!.liked)
        );
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
        showSuccess('回复发表成功');
      } else {
        throw new Error(response.error || '发表回复失败');
      }
    } catch (error) {
      console.error('Failed to create reply:', error);
      showError(error instanceof Error ? error.message : '发表回复失败');
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
          <div 
            className="text-foreground prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: comment.content 
            }}
          />

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
              <RichTextEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="写下你的回复...输入 @ 可提及用户"
                maxLength={500}
                mentionableUsers={mentionableUsers}
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  支持富文本格式
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
    <>
      <SEO
        title={post.title}
        description={post.summary || post.content?.substring(0, 200)}
        keywords={post.tags?.map((t: any) => t.name).join(', ')}
        image={post.coverImage}
        type="article"
        author={post.authorName || post.author?.displayName}
        publishedTime={post.publishedAt}
        modifiedTime={post.updatedAt}
      />
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
        <div className="flex gap-8">
          {/* 目录侧边栏 */}
          {toc.length > 0 && (
            <aside className="hidden xl:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    目录
                  </h4>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowToc(!showToc);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {showToc ? '收起' : '展开'}
                  </button>
                </div>
                {showToc && (
                <nav 
                  className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]"
                >
                  {toc.map((item, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const element = document.getElementById(item.id);
                        if (element) {
                          const offset = 120; // 留出顶部空间，避免被导航栏遮挡
                          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                          window.scrollTo({
                            top: elementPosition - offset,
                            behavior: 'smooth'
                          });
                          // 更新 URL hash
                          window.history.replaceState(null, '', `#${item.id}`);
                        }
                      }}
                      className={`block w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 cursor-pointer bg-transparent border-none ${
                        item.level === 1 ? 'font-medium' : ''
                      }`}
                      style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                    >
                      {item.text}
                    </button>
                  ))}
                </nav>
                )}
              </div>
            </aside>
          )}

          {/* 正文内容 */}
          <div className="flex-1 min-w-0">
            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </div>
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
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            {isLikeEnabled && (
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
                <span>{post.likeCount ?? 0}</span>
              </button>
            )}

            <button
              onClick={handleFavorite}
              disabled={favoriting}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                post.isFavorited
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-muted text-foreground hover:bg-border'
              } disabled:opacity-50`}
              title={post.isFavorited ? '取消收藏' : '收藏'}
            >
              <svg
                className={`w-5 h-5 ${post.isFavorited ? 'fill-current' : ''}`}
                fill={post.isFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>{post.isFavorited ? '已收藏' : '收藏'}</span>
            </button>

            {isCommentsEnabled && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{post.commentCount || 0} 评论</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* 分享按钮 */}
            {isShareEnabled && (
              <ShareButtons
                title={post.title}
                url={window.location.href}
                description={post.summary || ''}
              />
            )}

            {user && user.role === 'admin' && (
              <button
                onClick={() => navigate(`/admin?edit=${post.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                编辑文章
              </button>
            )}
          </div>
        </div>
      </article>

      {/* 评论区 */}
      {isCommentsEnabled && (
        <div className="mt-16 border-t border-border pt-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">评论 ({comments.length})</h2>

          {/* 发表评论 */}
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <RichTextEditor
                value={newComment}
                onChange={setNewComment}
                placeholder="写下你的评论...输入 @ 可提及用户"
                maxLength={1000}
                mentionableUsers={mentionableUsers}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  支持富文本格式，输入 @ 可提及用户
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
      )}
      </div>
    </>
  );
}

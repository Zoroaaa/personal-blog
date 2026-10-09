/**
 * 文章详情页面
 *
 * 修复内容：
 * 1. 修复日期格式错误（Invalid time value）
 * 2. 添加日期验证
 * 3. 处理null/undefined日期
 *
 * 结构说明：
 * - 本组件为编排层，负责组合数据 hooks 与展示子组件
 * - 数据加载/密码校验、评论、点赞收藏分别由对应 hook 负责；
 *   UI 由 components/post/ 下子组件渲染
 *
 * @author 博客系统
 * @version 3.0.0
 * @created 2024-01-01
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useToast } from '../components/Toast';
import { SEO } from '../components/SEO';
import { usePostDetail } from '../hooks/usePostDetail';
import { usePostComments } from '../hooks/usePostComments';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { PostPasswordForm } from '../components/post/PostPasswordForm';
import { PostHeader } from '../components/post/PostHeader';
import { PostContent } from '../components/post/PostContent';
import { PostActionsBar } from '../components/post/PostActionsBar';
import { PostNavigation } from '../components/post/PostNavigation';
import { RecommendedPosts } from '../components/post/RecommendedPosts';
import { CommentSection } from '../components/post/CommentSection';

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const { config } = useSiteConfig();

  const isCommentsEnabled = config?.feature_comments !== false;
  const isLikeEnabled = config?.feature_like !== false;
  const isShareEnabled = config?.feature_share !== false;

  const {
    post,
    setPost,
    loading,
    error,
    requiresPassword,
    passwordInput,
    setPasswordInput,
    passwordVerifying,
    passwordError,
    adjacentPosts,
    recommendedPosts,
    handleVerifyPassword,
  } = usePostDetail({ slug, isAuthenticated, onPasswordVerified: showSuccess });

  const commentsApi = usePostComments({
    post,
    requiresPassword,
    isAuthenticated,
    config,
    navigate,
    showSuccess,
    showError,
  });

  const { liking, favoriting, handleLike, handleFavorite } = usePostInteractions({
    post,
    setPost,
    isAuthenticated,
    navigate,
    showSuccess,
    showError,
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">
            {error || '文章不存在'}
          </h3>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <PostPasswordForm
        post={post}
        passwordInput={passwordInput}
        onPasswordInputChange={setPasswordInput}
        onSubmit={handleVerifyPassword}
        passwordVerifying={passwordVerifying}
        passwordError={passwordError}
      />
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
        <article>
          <PostHeader
            post={post}
            isAuthenticated={isAuthenticated}
            user={user}
            onPrivateMessage={() =>
              navigate(
                `/messages/new?recipientId=${post.authorId}&recipientName=${encodeURIComponent(
                  post.author?.displayName || post.authorName || ''
                )}`
              )
            }
          />

          <PostContent post={post} />

          <PostActionsBar
            post={post}
            user={user}
            isLikeEnabled={isLikeEnabled}
            isCommentsEnabled={isCommentsEnabled}
            isShareEnabled={isShareEnabled}
            liking={liking}
            favoriting={favoriting}
            onLike={handleLike}
            onFavorite={handleFavorite}
            onEdit={() => navigate(`/admin?edit=${post.id}`)}
          />
        </article>

        <PostNavigation adjacentPosts={adjacentPosts} />

        <RecommendedPosts posts={recommendedPosts} />

        {isCommentsEnabled && (
          <CommentSection
            post={post}
            isAuthenticated={isAuthenticated}
            commentsApi={commentsApi}
            onLogin={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname))}
          />
        )}
      </div>
    </>
  );
}
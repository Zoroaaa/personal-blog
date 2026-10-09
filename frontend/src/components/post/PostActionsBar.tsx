/**
 * 文章操作栏：点赞、收藏、评论数、分享、编辑入口。
 */

import { ShareButtons } from '../ShareButtons';
import type { Post } from '../../types';
import type { User } from '../../stores/authStore';

interface PostActionsBarProps {
  post: Post;
  user: User | null;
  isLikeEnabled: boolean;
  isCommentsEnabled: boolean;
  isShareEnabled: boolean;
  liking: boolean;
  favoriting: boolean;
  onLike: () => void;
  onFavorite: () => void;
  onEdit: () => void;
}

export function PostActionsBar({
  post,
  user,
  isLikeEnabled,
  isCommentsEnabled,
  isShareEnabled,
  liking,
  favoriting,
  onLike,
  onFavorite,
  onEdit,
}: PostActionsBarProps) {
  return (
    <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center space-x-6">
        {isLikeEnabled && (
          <button
            onClick={onLike}
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
          onClick={onFavorite}
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
            onClick={onEdit}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            编辑文章
          </button>
        )}
      </div>
    </div>
  );
}
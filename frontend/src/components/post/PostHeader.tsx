/**
 * 文章头部：标题、作者与元信息、封面图、私信按钮。
 */

import { formatDate } from '../../utils/formatDate';
import type { Post } from '../../types';
import type { User } from '../../stores/authStore';

interface PostHeaderProps {
  post: Post;
  isAuthenticated: boolean;
  user: User | null;
  onPrivateMessage: () => void;
}

export function PostHeader({ post, isAuthenticated, user, onPrivateMessage }: PostHeaderProps) {
  return (
    <>
      <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
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
        {isAuthenticated && user?.id !== post.authorId && (
          <button
            onClick={onPrivateMessage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            私信
          </button>
        )}
      </div>

      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full h-96 object-cover rounded-lg mb-8"
        />
      )}
    </>
  );
}
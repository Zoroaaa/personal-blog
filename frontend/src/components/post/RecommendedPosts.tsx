/**
 * 相关推荐文章列表。
 */

import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate';

interface RecommendedPostsProps {
  posts: any[];
}

export function RecommendedPosts({ posts }: RecommendedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-12 border-t border-border pt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        相关推荐
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((recPost) => (
          <Link
            key={recPost.id}
            to={`/posts/${recPost.slug}`}
            className="block bg-muted rounded-lg overflow-hidden hover:shadow-md transition-all group"
          >
            {recPost.cover_image && (
              <div className="h-32 overflow-hidden">
                <img
                  src={recPost.cover_image}
                  alt={recPost.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                {recPost.title}
              </h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {recPost.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {recPost.like_count || 0}
                </span>
                {recPost.published_at && (
                  <span>{formatDate(recPost.published_at, 'yyyy-MM-dd')}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
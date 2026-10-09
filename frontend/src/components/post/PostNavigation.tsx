/**
 * 文章导航：上一篇 / 下一篇。
 */

import { Link } from 'react-router-dom';

interface AdjacentPosts {
  prevPost: any | null;
  nextPost: any | null;
}

interface PostNavigationProps {
  adjacentPosts: AdjacentPosts;
}

export function PostNavigation({ adjacentPosts }: PostNavigationProps) {
  return (
    <div className="mt-12 border-t border-border pt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4">文章导航</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 上一篇 */}
        <div className="flex-1">
          {adjacentPosts.prevPost ? (
            <Link
              to={`/posts/${adjacentPosts.prevPost.slug}`}
              className="block p-4 bg-muted rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                上一篇
              </div>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {adjacentPosts.prevPost.title}
              </p>
            </Link>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg text-muted-foreground text-sm">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                上一篇
              </div>
              <p>已经是第一篇了</p>
            </div>
          )}
        </div>

        {/* 下一篇 */}
        <div className="flex-1">
          {adjacentPosts.nextPost ? (
            <Link
              to={`/posts/${adjacentPosts.nextPost.slug}`}
              className="block p-4 bg-muted rounded-lg hover:bg-accent transition-colors group text-right"
            >
              <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-2">
                下一篇
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {adjacentPosts.nextPost.title}
              </p>
            </Link>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg text-muted-foreground text-sm text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                下一篇
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p>已经是最后一篇了</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
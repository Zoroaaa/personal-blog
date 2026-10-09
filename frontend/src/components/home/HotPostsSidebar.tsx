/**
 * 首页热门文章排行 - 桌面端大屏固定侧栏（xl 及以上显示）
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { PostListItem } from '../../types';

interface HotPostsSidebarProps {
  hotPosts: PostListItem[];
}

export function HotPostsSidebar({ hotPosts }: HotPostsSidebarProps) {
  return (
    <div className="hidden xl:block xl:col-span-3">
      <div className="sticky top-24 space-y-4">
        {/* 热门文章卡片 */}
        <div className="bg-card/75 backdrop-blur-lg rounded-xl shadow-md border border-border/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </span>
            热门文章排行
          </h3>
          <div className="space-y-2">
            {hotPosts.map((post, index) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}`}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                  index === 0 ? 'bg-red-500 text-white' :
                  index === 1 ? 'bg-orange-500 text-white' :
                  index === 2 ? 'bg-yellow-500 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{post.viewCount || 0} 阅读</span>
                    {post.publishedAt && (
                      <>
                        <span>•</span>
                        <span>{format(new Date(post.publishedAt), 'MM-dd')}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {hotPosts.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                暂无文章
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
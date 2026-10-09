/**
 * 首页文章卡片
 */

import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TruncatedText } from '../TruncatedText';
import type { PostListItem } from '../../types';

interface PostCardProps {
  post: PostListItem;
  index: number;
}

export function PostCard({ post, index }: PostCardProps) {
  const navigate = useNavigate();

  // 处理文章卡片中的分类点击（导航到分类详情页）
  const handlePostCategoryClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/categories/${slug}`);
  };

  // 处理文章卡片中的标签点击（导航到标签详情页）
  const handlePostTagClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/tags/${slug}`);
  };

  return (
    <article
      className="group bg-card/80 backdrop-blur-sm rounded-xl shadow-md border border-border/60 overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in flex flex-col"
      style={{ animationDelay: `${index * 50}ms`, isolation: 'auto' }}
    >
      {/* 封面图 */}
      {post.coverImage && (
        <div className="relative h-32 sm:h-36 overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-400"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* 置顶标识 */}
          {(post as any).isPinned && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-md shadow-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
              </svg>
              置顶
            </div>
          )}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 p-3.5 sm:p-4 flex flex-col">
        {/* 专栏归属 */}
        {post.columnName && post.columnSlug && (
          <Link
            to={`/columns/${post.columnSlug}`}
            className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors mb-1.5 w-fit"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="truncate">{post.columnName}</span>
          </Link>
        )}

        {/* 标题 */}
        <Link to={`/posts/${post.slug}`} className="flex items-start gap-1.5">
          {(post as any).isPinned && (
            <span className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
              </svg>
              置顶
            </span>
          )}
          {post.visibility === 'password' && (
            <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
          )}
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {post.title}
          </h2>
        </Link>

        {/* 摘要 */}
        {post.summary && (
          <TruncatedText
            text={post.summary}
            className="text-xs sm:text-sm text-muted-foreground mb-3 flex-1 leading-relaxed"
            lines={2}
          />
        )}

        {/* 元信息 */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1 truncate">
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-4 h-4 rounded-full flex-shrink-0"
              />
            ) : (
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            <span className="truncate max-w-[60px]">{post.authorName}</span>
          </span>

          <span className="flex items-center gap-0.5 flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {post.publishedAt ? format(new Date(post.publishedAt), 'MM-dd') : '未发布'}
          </span>

          <span className="flex items-center gap-0.5 flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.viewCount || 0}
          </span>

          {post.readingTime && (
            <span className="hidden xs:flex items-center gap-0.5 flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {post.readingTime}min
            </span>
          )}
        </div>

        {/* 分类和标签 */}
        <div className="flex flex-wrap items-center gap-1">
          {post.categoryName && (
            <button
              onClick={(e) => post.categorySlug && handlePostCategoryClick(e, post.categorySlug)}
              className="px-2 py-0.5 rounded text-white text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: post.categoryColor || '#3B82F6' }}
            >
              {post.categoryName}
            </button>
          )}

          {post.tags && post.tags.length > 0 && post.tags.slice(0, 2).map((tag) => (
            <button
              key={tag.id}
              onClick={(e) => handlePostTagClick(e, tag.slug)}
              className="px-1.5 py-0.5 rounded-full text-xs font-medium border hover:scale-105 transition-transform"
              style={{
                backgroundColor: tag.color ? `${tag.color}15` : '#F3F4F6',
                borderColor: tag.color || '#E5E7EB',
                color: tag.color || '#6B7280'
              }}
            >
              #{tag.name}
            </button>
          ))}

          {post.tags && post.tags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{post.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
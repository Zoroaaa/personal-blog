/**
 * 重构的现代化首页组件
 * 
 * 新功能:
 * - 分类和标签展示区域
 * - 支持点击分类/标签过滤文章
 * - 分类/标签展开/收起功能
 * - 现代化的响应式UI设计
 * - 平滑的动画效果
 * 
 * @version 3.0.0
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { format } from 'date-fns';
import type { PostListItem } from '../types';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  post_count: number;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  post_count: number;
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 文章相关状态
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 分类和标签状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  
  // 展开/收起状态
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  
  // 过滤状态
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    searchParams.get('tag')
  );
  
  // 显示数量
  const INITIAL_CATEGORY_COUNT = 10;
  const INITIAL_TAG_COUNT = 10;
  
  // 加载分类
  useEffect(() => {
    loadCategories();
  }, []);
  
  // 加载标签
  useEffect(() => {
    loadTags();
  }, []);
  
  // 加载文章
  useEffect(() => {
    loadPosts();
  }, [page, selectedCategory, selectedTag]);
  
  // 同步URL参数
  useEffect(() => {
    const params: any = {};
    if (selectedCategory) params.category = selectedCategory;
    if (selectedTag) params.tag = selectedTag;
    setSearchParams(params);
  }, [selectedCategory, selectedTag]);
  
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };
  
  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const response = await api.getTags();
      if (response.success && response.data) {
        setTags(response.data.tags || []);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setTagsLoading(false);
    }
  };
  
  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: page.toString(),
        limit: '10'
      };
      
      if (selectedCategory) params.category = selectedCategory;
      if (selectedTag) params.tag = selectedTag;
      
      const response = await api.getPosts(params);
      
      if (response.success && response.data) {
        const processedPosts = (response.data.posts || []).map((post: any) => ({
          ...post,
          authorName: post.author_name || post.author_display_name,
          authorAvatar: post.author_avatar,
          viewCount: post.view_count,
          likeCount: post.like_count,
          commentCount: post.comment_count,
          publishedAt: post.published_at,
          coverImage: post.cover_image,
          categoryName: post.category_name,
          categorySlug: post.category_slug,
          categoryColor: post.category_color
        }));
        
        setPosts(processedPosts);
        
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
        }
      } else {
        throw new Error(response.error || '获取文章列表失败');
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      setError(error instanceof Error ? error.message : '加载失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理分类点击
  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(slug);
      setSelectedTag(null); // 清除标签过滤
    }
    setPage(1);
  };
  
  // 处理标签点击
  const handleTagClick = (slug: string) => {
    if (selectedTag === slug) {
      setSelectedTag(null);
    } else {
      setSelectedTag(slug);
      setSelectedCategory(null); // 清除分类过滤
    }
    setPage(1);
  };
  
  // 清除所有过滤
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setPage(1);
  };
  
  // 渲染分类列表
  const visibleCategories = showAllCategories 
    ? categories 
    : categories.slice(0, INITIAL_CATEGORY_COUNT);
  
  // 渲染标签列表
  const visibleTags = showAllTags 
    ? tags 
    : tags.slice(0, INITIAL_TAG_COUNT);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* 页面标题 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
            探索精彩内容
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            发现有价值的文章和见解
          </p>
        </div>
        
        {/* 分类和标签区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* 左侧: 分类和标签 */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 分类卡片 */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  分类
                </h2>
                {selectedCategory && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              
              {categoriesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {visibleCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.slug)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                          selectedCategory === category.slug
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md scale-105'
                            : 'bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          {category.icon && <span className="text-lg">{category.icon}</span>}
                          {category.name}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          selectedCategory === category.slug
                            ? 'bg-white/20'
                            : 'bg-gray-200 dark:bg-slate-600'
                        }`}>
                          {category.post_count}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {categories.length > INITIAL_CATEGORY_COUNT && (
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="w-full mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {showAllCategories ? '收起' : `查看更多 (${categories.length - INITIAL_CATEGORY_COUNT})`}
                      <svg
                        className={`w-4 h-4 transition-transform ${showAllCategories ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
            
            {/* 标签云卡片 */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  标签
                </h2>
                {selectedTag && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              
              {tagsLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {visibleTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagClick(tag.slug)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          selectedTag === tag.slug
                            ? 'shadow-lg scale-110 text-white'
                            : 'hover:scale-105 text-gray-700 dark:text-gray-300'
                        }`}
                        style={{
                          backgroundColor: selectedTag === tag.slug 
                            ? tag.color || '#6B7280'
                            : selectedTag 
                              ? 'rgb(243 244 246)' 
                              : tag.color 
                                ? `${tag.color}20` 
                                : 'rgb(243 244 246)',
                          borderWidth: '2px',
                          borderColor: selectedTag === tag.slug 
                            ? 'transparent'
                            : tag.color || '#E5E7EB'
                        }}
                      >
                        #{tag.name}
                        <span className="ml-2 text-xs opacity-75">
                          {tag.post_count}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {tags.length > INITIAL_TAG_COUNT && (
                    <button
                      onClick={() => setShowAllTags(!showAllTags)}
                      className="w-full mt-4 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {showAllTags ? '收起' : `查看更多 (${tags.length - INITIAL_TAG_COUNT})`}
                      <svg
                        className={`w-4 h-4 transition-transform ${showAllTags ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* 右侧: 文章列表 */}
          <div className="lg:col-span-9">
            
            {/* 当前过滤标签 */}
            {(selectedCategory || selectedTag) && (
              <div className="mb-6 flex flex-wrap items-center gap-3 animate-fade-in">
                <span className="text-sm text-gray-600 dark:text-gray-400">筛选条件:</span>
                {selectedCategory && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {categories.find(c => c.slug === selectedCategory)?.name}
                    <button onClick={clearFilters} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {selectedTag && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                    #{tags.find(t => t.slug === selectedTag)?.name}
                    <button onClick={clearFilters} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            )}
            
            {/* 文章列表 */}
            {loading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-lg p-6 animate-pulse">
                    <div className="h-48 bg-gray-300 dark:bg-slate-700 rounded-xl mb-4" />
                    <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">加载失败</h3>
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadPosts}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  重试
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-lg p-12 text-center">
                <svg
                  className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">暂无文章</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {selectedCategory || selectedTag ? '该分类/标签下暂无文章' : '还没有发布任何文章'}
                </p>
                {(selectedCategory || selectedTag) && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    查看所有文章
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post, index) => (
                  <article 
                    key={post.id} 
                    className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col md:flex-row">
                      {post.coverImage && (
                        <div className="md:w-1/3 relative overflow-hidden">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-56 md:h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                      
                      <div className="flex-1 p-6">
                        <Link to={`/posts/${post.slug}`}>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {post.title}
                          </h2>
                        </Link>
                        
                        {post.summary && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {post.summary}
                          </p>
                        )}
                        
                        {/* 文章元信息 */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            {post.authorAvatar ? (
                              <img 
                                src={post.authorAvatar} 
                                alt={post.authorName} 
                                className="w-6 h-6 rounded-full" 
                              />
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                            {post.authorName}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {post.publishedAt ? format(new Date(post.publishedAt), 'yyyy-MM-dd') : '未发布'}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {post.viewCount || 0}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.likeCount || 0}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {post.commentCount || 0}
                          </span>
                          
                          {post.readingTime && (
                            <span className="flex items-center gap-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {post.readingTime}min
                            </span>
                          )}
                        </div>
                        
                        {/* 分类和标签 */}
                        <div className="flex flex-wrap items-center gap-2">
                          {post.categoryName && (
                            <button
                              onClick={() => handleCategoryClick(post.categorySlug)}
                              className="px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: post.categoryColor || '#3B82F6' }}
                            >
                              {post.categoryName}
                            </button>
                          )}
                          
                          {post.tags && post.tags.length > 0 && post.tags.slice(0, 3).map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleTagClick(tag.slug)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium border-2 hover:scale-105 transition-transform"
                              style={{
                                backgroundColor: tag.color ? `${tag.color}15` : '#F3F4F6',
                                borderColor: tag.color || '#E5E7EB',
                                color: tag.color || '#6B7280'
                              }}
                            >
                              #{tag.name}
                            </button>
                          ))}
                          
                          {post.tags && post.tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{post.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            
            {/* 分页 */}
            {!loading && !error && totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2 animate-fade-in">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  上一页
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-3 rounded-xl transition-all font-medium shadow-md hover:shadow-lg ${
                          page === pageNum
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  下一页
                </button>
              </div>
            )}
            
            {!loading && !error && (
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                第 {page} 页,共 {totalPages} 页
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 添加必要的CSS动画 */}
      <style>{`
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.6s ease-out forwards;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`}</style>

      
/**
 * 首页数据 hook
 *
 * 负责：文章列表（分页 + 分类/专栏/标签过滤）、分类/专栏/标签元数据、
 * 热门文章加载，以及过滤状态的 URL 同步与切换逻辑。
 * UI 渲染由 pages/HomePage.tsx 编排、components/home/ 子组件承担。
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import {
  transformPostList,
  transformCategoryList,
  transformColumnList,
  transformTagList,
} from '../utils/apiTransformer';
import { useSiteConfig } from './useSiteConfig';
import type { Category, Column, PostListItem, Tag } from '../types';

export function useHomeData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { config, isReady } = useSiteConfig();

  // 文章相关状态
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const postsPerPage = config.posts_per_page || 10;

  // 分类、专栏和标签状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);

  // 热门文章状态
  const [hotPosts, setHotPosts] = useState<PostListItem[]>([]);

  // 过滤状态
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [selectedColumn, setSelectedColumn] = useState<string | null>(
    searchParams.get('column')
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    searchParams.get('tag')
  );

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(transformCategoryList(response.data.categories || []));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadColumns = useCallback(async () => {
    try {
      setColumnsLoading(true);
      const response = await api.getColumns({ limit: '100' });
      if (response.success && response.data) {
        setColumns(transformColumnList(response.data.columns || []));
      }
    } catch (error) {
      console.error('Failed to load columns:', error);
    } finally {
      setColumnsLoading(false);
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      setTagsLoading(true);
      const response = await api.getTags();
      if (response.success && response.data) {
        setTags(transformTagList(response.data.tags || []));
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  const loadHotPosts = useCallback(async () => {
    try {
      const response = await api.getHotPosts(10);
      if (response.success && response.data) {
        setHotPosts(transformPostList(response.data.posts || []));
      }
    } catch (error) {
      console.error('Failed to load hot posts:', error);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        page: page.toString(),
        limit: postsPerPage.toString(),
      };

      if (selectedCategory) params.category = selectedCategory;
      if (selectedColumn) params.column = selectedColumn;
      if (selectedTag) params.tag = selectedTag;

      const response = await api.getPosts(params);

      if (response.success && response.data) {
        const transformedPosts = transformPostList(response.data.posts || []);
        setPosts(transformedPosts);

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
  }, [page, postsPerPage, selectedCategory, selectedColumn, selectedTag]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadHotPosts();
  }, [loadHotPosts]);

  useEffect(() => {
    if (!isReady) return;
    loadPosts();
  }, [loadPosts, isReady]);

  // 同步 URL 参数
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (selectedColumn) params.column = selectedColumn;
    if (selectedTag) params.tag = selectedTag;
    setSearchParams(params);
  }, [selectedCategory, selectedColumn, selectedTag, setSearchParams]);

  // 处理分类点击（过滤模式）
  const handleCategoryClick = useCallback(
    (slug: string) => {
      if (selectedCategory === slug) {
        setSelectedCategory(null);
      } else {
        setSelectedCategory(slug);
        setSelectedColumn(null);
        setSelectedTag(null);
      }
      setPage(1);
    },
    [selectedCategory]
  );

  // 处理专栏点击（过滤模式）
  const handleColumnClick = useCallback(
    (slug: string) => {
      if (selectedColumn === slug) {
        setSelectedColumn(null);
      } else {
        setSelectedColumn(slug);
        setSelectedCategory(null);
        setSelectedTag(null);
      }
      setPage(1);
    },
    [selectedColumn]
  );

  // 处理标签点击（过滤模式）
  const handleTagClick = useCallback(
    (slug: string) => {
      if (selectedTag === slug) {
        setSelectedTag(null);
      } else {
        setSelectedTag(slug);
        setSelectedCategory(null);
        setSelectedColumn(null);
      }
      setPage(1);
    },
    [selectedTag]
  );

  // 清除所有过滤
  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedColumn(null);
    setSelectedTag(null);
    setPage(1);
  }, []);

  const hasFilters = Boolean(selectedCategory || selectedColumn || selectedTag);

  return {
    posts,
    loading,
    error,
    page,
    setPage,
    totalPages,
    postsPerPage,
    loadPosts,
    categories,
    columns,
    tags,
    categoriesLoading,
    columnsLoading,
    tagsLoading,
    hotPosts,
    selectedCategory,
    selectedColumn,
    selectedTag,
    handleCategoryClick,
    handleColumnClick,
    handleTagClick,
    clearFilters,
    hasFilters,
  };
}
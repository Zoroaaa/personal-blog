/**
 * 文章编辑所需的分类/专栏/标签数据加载
 *
 * 功能：
 * - 首次挂载时并行加载分类、专栏、标签
 * - 暴露各自的加载状态
 *
 * @author 博客系统
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { transformCategoryList, transformColumnList, transformTagList } from '../utils/apiTransformer';

export interface TaxonomyCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

export interface TaxonomyColumn {
  id: number;
  name: string;
  slug: string;
  coverImage?: string;
  postCount?: number;
}

export interface TaxonomyTag {
  id: number;
  name: string;
  slug: string;
  color?: string;
  postCount?: number;
}

export function usePostTaxonomies() {
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [columns, setColumns] = useState<TaxonomyColumn[]>([]);
  const [tags, setTags] = useState<TaxonomyTag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCategoriesLoading(true);
        const response = await api.getCategories();
        if (response.success && response.data) {
          setCategories(transformCategoryList(response.data.categories || []));
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    })();

    (async () => {
      try {
        setColumnsLoading(true);
        const response = await api.getColumns({ limit: '100' });
        if (response.success && response.data) {
          setColumns(transformColumnList(response.data.columns || []));
        }
      } catch (err) {
        console.error('Failed to load columns:', err);
      } finally {
        setColumnsLoading(false);
      }
    })();

    (async () => {
      try {
        setTagsLoading(true);
        const response = await api.getTags();
        if (response.success && response.data) {
          setTags(transformTagList(response.data.tags || []));
        }
      } catch (err) {
        console.error('Failed to load tags:', err);
      } finally {
        setTagsLoading(false);
      }
    })();
  }, []);

  return { categories, columns, tags, categoriesLoading, columnsLoading, tagsLoading };
}
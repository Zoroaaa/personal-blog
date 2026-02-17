/**
 * 标签管理组件
 * 功能: 创建、编辑、删除标签,支持颜色设置
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { transformTagList } from '../utils/apiTransformer';
import type { Tag } from '../types';
import { useToast } from './Toast';

// 预设颜色选项 - 更丰富的配色方案
const PRESET_COLORS = [
  { name: '天蓝', value: '#3B82F6' },
  { name: '深蓝', value: '#2563EB' },
  { name: '青色', value: '#06B6D4' },
  { name: '翠绿', value: '#10B981' },
  { name: '柠檬', value: '#84CC16' },
  { name: '琥珀', value: '#F59E0B' },
  { name: '橙色', value: '#F97316' },
  { name: '朱红', value: '#EF4444' },
  { name: '玫红', value: '#EC4899' },
  { name: '紫罗兰', value: '#8B5CF6' },
  { name: '靛青', value: '#6366F1' },
  { name: '青绿', value: '#14B8A6' },
  { name: '石板灰', value: '#6B7280' },
  { name: '玫瑰金', value: '#BE185D' },
  { name: '薰衣草', value: '#A78BFA' },
  { name: '珊瑚', value: '#FB7185' },
];

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#6B7280'
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // 搜索和排序
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count');
  
  useEffect(() => {
    loadTags();
  }, []);
  
  const loadTags = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getTags();
      if (response.success && response.data) {
        setTags(transformTagList(response.data.tags || []));
      }
    } catch (err: any) {
      setError(err.message || '加载标签失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      color: '#6B7280'
    });
    setShowForm(true);
    setFormError('');
  };
  
  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
      color: tag.color || '#6B7280'
    });
    setShowForm(true);
    setFormError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name.trim()) {
      setFormError('标签名称不能为空');
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (editingId) {
        // 更新
        const response = await api.updateTag(editingId, formData);
        if (response.success) {
          await loadTags();
          setShowForm(false);
          showSuccess(`标签 "${formData.name}" 更新成功！`);
        } else {
          throw new Error(response.error || '更新失败');
        }
      } else {
        // 创建
        const response = await api.createTag(formData);
        if (response.success) {
          await loadTags();
          setShowForm(false);
          showSuccess(`标签 "${formData.name}" 创建成功！`);
        } else {
          throw new Error(response.error || '创建失败');
        }
      }
    } catch (err: any) {
      setFormError(err.message || '操作失败');
      showError(err.message || '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除标签 "#${name}" 吗? 这将同时移除所有文章的该标签。`)) return;
    
    try {
      const response = await api.deleteTag(id);
      if (response.success) {
        await loadTags();
        showSuccess(`标签 "${name}" 删除成功！`);
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (err: any) {
      showError(err.message || '删除失败，请重试');
    }
  };
  
  // 过滤和排序标签
  const filteredAndSortedTags = tags
    .filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'count') {
        return b.postCount - a.postCount;
      }
      return a.name.localeCompare(b.name);
    });
  
  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">标签管理</h2>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {/* 搜索框 */}
          <div className="relative flex-1 sm:flex-initial">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索标签..."
              className="pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground w-full sm:w-64"
            />
          </div>
          
          {/* 排序选择 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'count')}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground"
          >
            <option value="count">按使用次数</option>
            <option value="name">按名称</option>
          </select>
          
          {/* 新建按钮 */}
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建标签
          </button>
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">总标签数</div>
          <div className="text-2xl font-bold text-foreground">{tags.length}</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">使用中</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {tags.filter(t => t.postCount > 0).length}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">未使用</div>
          <div className="text-2xl font-bold text-muted-foreground">
            {tags.filter(t => t.postCount === 0).length}
          </div>
        </div>
      </div>
      
      {/* 表单对话框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {editingId ? '编辑标签' : '新建标签'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 标签名称 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    标签名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground"
                    placeholder="例如: JavaScript, React, 算法"
                    required
                  />
                </div>
                
                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    URL 标识 (留空自动生成)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground"
                    placeholder="例如: javascript, react, algorithm"
                  />
                </div>
                
                {/* 描述 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground"
                    rows={2}
                    placeholder="标签的简短描述"
                  />
                </div>
                
                {/* 颜色选择 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    颜色 (用于前端显示)
                  </label>
                  
                  {/* 预览 */}
                  <div className="mb-3 p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">预览:</div>
                    <div className="flex gap-3">
                      <span
                        className="px-4 py-2 rounded-full text-sm font-medium border-2"
                        style={{
                          backgroundColor: `${formData.color}20`,
                          borderColor: formData.color,
                          color: formData.color
                        }}
                      >
                        #{formData.name || '标签名称'}
                      </span>
                      <span
                        className="px-4 py-2 rounded-full text-sm font-medium text-white shadow-md"
                        style={{ backgroundColor: formData.color }}
                      >
                        #{formData.name || '标签名称'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 预设颜色 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`group relative w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? 'border-foreground scale-110'
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {formData.color === color.value && (
                          <svg className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* 自定义颜色 */}
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground font-mono text-sm"
                      placeholder="#6B7280"
                    />
                  </div>
                </div>
                
                {/* 按钮 */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white rounded-lg transition-colors font-medium"
                  >
                    {submitting ? '提交中...' : editingId ? '更新' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors font-medium"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* 标签列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={loadTags}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      ) : filteredAndSortedTags.length === 0 ? (
        <div className="bg-background dark:bg-card rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? '没有找到匹配的标签' : '还没有创建任何标签'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
            >
              创建第一个标签
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    颜色
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    使用次数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredAndSortedTags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-background dark:hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-foreground">#{tag.name}</div>
                        <div className="text-xs text-muted-foreground">{tag.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {tag.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-border"
                          style={{ backgroundColor: tag.color }}
                          title={tag.color}
                        />
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color
                          }}
                        >
                          #{tag.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        tag.postCount > 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground'
                      }`}>
                        {tag.postCount} 篇
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/tags/${tag.slug}`)}
                          className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          title="查看标签详情"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(tag)}
                          className="px-3 py-1 text-sm text-primary dark:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id, tag.name)}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

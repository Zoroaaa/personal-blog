/**
 * 分类管理组件
 * 功能: 创建、编辑、删除分类
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { transformCategoryList } from '../utils/apiTransformer';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  postCount: number;
  displayOrder: number;
}

// 预设颜色选项
const PRESET_COLORS = [
  { name: '蓝色', value: '#3B82F6' },
  { name: '深蓝', value: '#2563EB' },
  { name: '青色', value: '#06B6D4' },
  { name: '绿色', value: '#10B981' },
  { name: '黄色', value: '#F59E0B' },
  { name: '橙色', value: '#F97316' },
  { name: '红色', value: '#EF4444' },
  { name: '粉色', value: '#EC4899' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '靛青', value: '#6366F1' },
  { name: '灰色', value: '#6B7280' },
  { name: '青绿', value: '#14B8A6' },
];

// 预设图标选项
const PRESET_ICONS = [
  '💻', '🌟', '✍️', '📚', '🎨', '🔧', '🚀', '💡', 
  '📱', '⚡', '🎯', '🌈', '🎭', '🎪', '🎨', '🎬'
];

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '💻',
    color: '#3B82F6',
    displayOrder: 0
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(transformCategoryList(response.data.categories || []));
      }
    } catch (err: any) {
      setError(err.message || '加载分类失败');
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
      icon: '💻',
      color: '#3B82F6',
      displayOrder: 0
    });
    setShowForm(true);
    setFormError('');
  };
  
  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '💻',
      color: category.color || '#3B82F6',
      displayOrder: category.displayOrder || 0
    });
    setShowForm(true);
    setFormError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name.trim()) {
      setFormError('分类名称不能为空');
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (editingId) {
        // 更新
        const response = await api.updateCategory(editingId, formData);
        if (response.success) {
          await loadCategories();
          setShowForm(false);
          alert('分类更新成功!');
        } else {
          throw new Error(response.error || '更新失败');
        }
      } else {
        // 创建
        const response = await api.createCategory(formData);
        if (response.success) {
          await loadCategories();
          setShowForm(false);
          alert('分类创建成功!');
        } else {
          throw new Error(response.error || '创建失败');
        }
      }
    } catch (err: any) {
      setFormError(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除分类 "${name}" 吗?`)) return;
    
    try {
      const response = await api.deleteCategory(id);
      if (response.success) {
        await loadCategories();
        alert('分类删除成功!');
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">分类管理</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建分类
        </button>
      </div>
      
      {/* 表单对话框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingId ? '编辑分类' : '新建分类'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                {/* 分类名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    分类名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="例如: 技术、生活、随笔"
                    required
                  />
                </div>
                
                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL 标识 (留空自动生成)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="例如: tech, life, essay"
                  />
                </div>
                
                {/* 描述 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    rows={3}
                    placeholder="分类的简短描述"
                  />
                </div>
                
                {/* 图标选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    图标
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                          formData.icon === icon
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-110'
                            : 'border-gray-300 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 颜色选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    颜色
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 dark:border-slate-600'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-600"
                  />
                </div>
                
                {/* 显示顺序 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    显示顺序
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="数字越小越靠前"
                  />
                </div>
                
                {/* 按钮 */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {submitting ? '提交中...' : editingId ? '更新' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* 分类列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={loadCategories}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 mb-4">还没有创建任何分类</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            创建第一个分类
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{category.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{category.slug}</p>
                  </div>
                </div>
                <div
                  className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-slate-600"
                  style={{ backgroundColor: category.color }}
                />
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {category.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {category.postCount} 篇文章 • 序号 {category.displayOrder}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    disabled={category.postCount > 0}
                    className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={category.postCount > 0 ? '该分类下还有文章,无法删除' : ''}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

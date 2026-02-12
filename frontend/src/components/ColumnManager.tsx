/**
 * 专栏管理组件
 * 
 * 功能: 
 * - 创建、编辑、删除专栏
 * - 管理专栏基本信息
 * - 刷新专栏统计数据
 * - 查看专栏详情
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { transformColumnList } from '../utils/apiTransformer';
import type { Column } from '../types';
import { useToast } from './Toast';

export function ColumnManager() {
  const [columns, setColumns] = useState<Column[]>([]);
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
    coverImage: '',
    displayOrder: 0
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadColumns();
  }, []);

  const loadColumns = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getColumns({ limit: '100' });
      if (response.success && response.data) {
        setColumns(transformColumnList(response.data.columns || []));
      }
    } catch (err: any) {
      setError(err.message || '加载专栏失败');
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
      coverImage: '',
      displayOrder: 0
    });
    setShowForm(true);
    setFormError('');
  };

  const handleEdit = (column: Column) => {
    setEditingId(column.id);
    setFormData({
      name: column.name,
      slug: column.slug,
      description: column.description || '',
      coverImage: column.coverImage || '',
      displayOrder: column.displayOrder || 0
    });
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('专栏名称不能为空');
      return;
    }

    if (formData.name.trim().length < 2) {
      setFormError('专栏名称至少需要2个字符');
      return;
    }

    if (formData.name.trim().length > 100) {
      setFormError('专栏名称不能超过100个字符');
      return;
    }

    if (formData.description && formData.description.length > 500) {
      setFormError('专栏描述不能超过500个字符');
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // 更新
        const response = await api.updateColumn(editingId, formData);
        if (response.success) {
          await loadColumns();
          setShowForm(false);
          showSuccess(`专栏 "${formData.name}" 更新成功！`);
        } else {
          throw new Error(response.error || '更新失败');
        }
      } else {
        // 创建
        const response = await api.createColumn(formData);
        if (response.success) {
          await loadColumns();
          setShowForm(false);
          showSuccess(`专栏 "${formData.name}" 创建成功！`);
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
    if (!confirm(`确定要删除专栏 "${name}" 吗?`)) return;

    try {
      const response = await api.deleteColumn(id);
      if (response.success) {
        await loadColumns();
        showSuccess(`专栏 "${name}" 删除成功！`);
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (err: any) {
      showError(err.message || '删除失败，请重试');
    }
  };

  const handleRefreshStats = async (id: number, name: string) => {
    try {
      const response = await api.refreshColumnStats(id);
      if (response.success) {
        await loadColumns();
        showSuccess(`专栏 "${name}" 统计数据已刷新！`);
      } else {
        throw new Error(response.error || '刷新失败');
      }
    } catch (err: any) {
      showError(err.message || '刷新失败，请重试');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">专栏管理</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建专栏
        </button>
      </div>

      {/* 表单对话框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingId ? '编辑专栏' : '新建专栏'}
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
                {/* 专栏名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    专栏名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="例如：前端开发专栏"
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
                    placeholder="例如：frontend-development"
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
                    placeholder="专栏的简短描述"
                  />
                </div>

                {/* 封面图片 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    封面图片 URL
                  </label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="https://example.com/image.jpg"
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

      {/* 专栏列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={loadColumns}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      ) : columns.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 mb-4">还没有创建任何专栏</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            创建第一个专栏
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* 封面图片 */}
              <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
                {column.coverImage ? (
                  <img
                    src={column.coverImage}
                    alt={column.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{column.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{column.slug}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    column.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : column.status === 'hidden'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {column.status === 'active' ? '正常' : column.status === 'hidden' ? '隐藏' : '归档'}
                  </span>
                </div>

                {column.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {column.description}
                  </p>
                )}

                {/* 统计数据 */}
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatNumber(column.postCount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">文章</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatNumber(column.totalViewCount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">阅读</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatNumber(column.totalLikeCount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">点赞</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {formatNumber(column.totalCommentCount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">评论</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    序号 {column.displayOrder}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/columns/${column.slug}`)}
                      className="px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                      title="查看专栏详情"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRefreshStats(column.id, column.name)}
                      className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="刷新统计数据"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(column)}
                      className="px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(column.id, column.name)}
                      disabled={column.postCount > 0}
                      className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={column.postCount > 0 ? '该专栏下还有文章，无法删除' : ''}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

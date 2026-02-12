/**
 * 系统通知管理页面
 *
 * 功能：
 * - 创建、编辑、删除系统通知
 * - 管理通知状态（启用/禁用）
 * - 通知列表展示
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { SEO } from '../../components/SEO';

interface SystemNotification {
  id: number;
  title: string;
  content: string;
  link?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function SystemNotificationPage() {
  const { showSuccess, showError } = useToast();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<SystemNotification | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link: '',
    isActive: true,
  });

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/notifications/system-notifications');
      if (response.success && response.data) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      showError('加载通知列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 打开创建弹窗
  const openCreateModal = () => {
    setEditingNotification(null);
    setFormData({
      title: '',
      content: '',
      link: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (notification: SystemNotification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      content: notification.content,
      link: notification.link || '',
      isActive: notification.isActive,
    });
    setIsModalOpen(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNotification(null);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      showError('标题和内容不能为空');
      return;
    }

    try {
      if (editingNotification) {
        // 更新
        const response = await api.put(
          `/admin/notifications/system-notifications/${editingNotification.id}`,
          formData
        );
        if (response.success) {
          showSuccess('通知更新成功');
          closeModal();
          loadNotifications();
        } else {
          throw new Error(response.error || '更新失败');
        }
      } else {
        // 创建
        const response = await api.post('/admin/notifications/system-notifications', formData);
        if (response.success) {
          showSuccess('通知创建成功');
          closeModal();
          loadNotifications();
        } else {
          throw new Error(response.error || '创建失败');
        }
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : '操作失败');
    }
  };

  // 删除通知
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条通知吗？')) return;

    try {
      const response = await api.delete(`/admin/notifications/system-notifications/${id}`);
      if (response.success) {
        showSuccess('通知删除成功');
        loadNotifications();
      } else {
        throw new Error(response.error || '删除失败');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 切换通知状态
  const toggleStatus = async (notification: SystemNotification) => {
    try {
      const response = await api.put(
        `/admin/notifications/system-notifications/${notification.id}`,
        { isActive: !notification.isActive }
      );
      if (response.success) {
        showSuccess(notification.isActive ? '通知已禁用' : '通知已启用');
        loadNotifications();
      } else {
        throw new Error(response.error || '操作失败');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : '操作失败');
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <SEO title="系统通知管理" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">系统通知管理</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              管理首页轮播的系统通知
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建通知
          </button>
        </div>

        {/* 通知列表 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">暂无系统通知</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                点击上方按钮创建第一条通知
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      标题
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      内容
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      链接
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      创建时间
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {notifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {notification.content}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {notification.link ? (
                          <a
                            href={notification.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            {notification.link.length > 30
                              ? notification.link.slice(0, 30) + '...'
                              : notification.link}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">无</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(notification)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            notification.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {notification.isActive ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(notification.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(notification)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 创建/编辑弹窗 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingNotification ? '编辑通知' : '新建通知'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入通知标题"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="请输入通知内容"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    链接（可选）
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    立即启用
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingNotification ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

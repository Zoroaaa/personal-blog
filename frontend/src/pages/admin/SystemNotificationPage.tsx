/**
 * 系统通知管理页面
 *
 * 功能：
 * - 创建、编辑、删除系统通知
 * - 管理通知状态（启用/禁用）
 * - 通知列表展示
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { SEO } from '../../components/SEO';

type SystemNotificationSubtype = 'maintenance' | 'update' | 'announcement';

interface SystemNotification {
  id: number;
  title: string;
  content: string;
  link?: string;
  subtype: SystemNotificationSubtype;
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
    subtype: 'announcement' as SystemNotificationSubtype,
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
      subtype: 'announcement',
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
      subtype: notification.subtype || 'announcement',
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

  const getSubtypeLabel = (subtype: SystemNotificationSubtype) => {
    const labels: Record<SystemNotificationSubtype, { text: string; color: string }> = {
      maintenance: { text: '维护通知', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      update: { text: '更新通知', color: 'bg-primary/15 text-primary' },
      announcement: { text: '公告通知', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    };
    return labels[subtype] || labels.announcement;
  };

  return (
    <>
      <SEO title="系统通知管理" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">系统通知管理</h1>
            <p className="mt-2 text-muted-foreground">
              管理首页轮播的系统通知
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建通知
          </button>
        </div>

        {/* 通知列表 */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground mb-4"
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
              <p className="text-muted-foreground">暂无系统通知</p>
              <p className="text-sm text-muted-foreground mt-1">
                点击上方按钮创建第一条通知
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background dark:bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      标题
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      类型
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      内容
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      链接
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                      创建时间
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {notifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className="hover:bg-background dark:hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {notification.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubtypeLabel(notification.subtype || 'announcement').color}`}>
                          {getSubtypeLabel(notification.subtype || 'announcement').text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-muted-foreground max-w-xs truncate">
                          {notification.content}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {notification.link ? (
                          <a
                            href={notification.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary text-sm"
                          >
                            {notification.link.length > 30
                              ? notification.link.slice(0, 30) + '...'
                              : notification.link}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">无</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(notification)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            notification.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground'
                          }`}
                        >
                          {notification.isActive ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(notification)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
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
            <div className="w-full max-w-lg bg-card rounded-xl shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingNotification ? '编辑通知' : '新建通知'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入通知标题"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    通知类型 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(['maintenance', 'update', 'announcement'] as const).map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                          formData.subtype === type
                            ? type === 'maintenance'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : type === 'update'
                              ? 'border-primary bg-primary/10'
                              : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-border hover:bg-background dark:hover:bg-accent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="subtype"
                          value={type}
                          checked={formData.subtype === type}
                          onChange={(e) => setFormData({ ...formData, subtype: e.target.value as SystemNotificationSubtype })}
                          className="sr-only"
                        />
                        <span className={`w-3 h-3 rounded-full ${
                          type === 'maintenance' ? 'bg-orange-500' : type === 'update' ? 'bg-primary/80' : 'bg-green-500'
                        }`}></span>
                        <span className="text-sm font-medium text-foreground">
                          {type === 'maintenance' ? '维护通知' : type === 'update' ? '更新通知' : '公告通知'}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    维护通知和更新通知将推送给所有用户，公告通知仅用于首页轮播展示
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="请输入通知内容"
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    链接（可选）
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary/50"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 text-sm text-foreground"
                  >
                    立即启用
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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

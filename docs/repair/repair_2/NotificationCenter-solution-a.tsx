/**
 * 通知中心组件（方案A版本）
 * 
 * 变更说明：
 * - 移除"私信"tab
 * - 只保留"全部"、"系统通知"、"互动通知"三个tab
 * - 私信现在在独立的 /messages 页面
 * 
 * @version 2.0.0 - 方案A
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, Settings, Trash2, CheckCheck } from 'lucide-react';
import { api } from '../utils/api';
import type { Notification, NotificationType } from '../types/notifications';

type TabType = 'all' | 'system' | 'interaction';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({
    total: 0,
    system: 0,
    interaction: 0,
    // 移除了 private_message
  });

  useEffect(() => {
    loadNotifications();
    loadUnreadCounts();
  }, [activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      
      const response = await api.get('/api/notifications', { params });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const response = await api.get('/api/notifications/unread/count');
      setUnreadCounts(response.data);
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      loadUnreadCounts();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const type = activeTab === 'all' ? undefined : activeTab;
      await api.patch('/api/notifications/read-all', { type });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      loadUnreadCounts();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      loadUnreadCounts();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // 根据类型跳转
    const data = notification.relatedData;
    if (!data) return;

    switch (notification.subtype) {
      case 'comment':
      case 'like':
      case 'favorite':
      case 'reply':
        if (data.postSlug) {
          navigate(`/posts/${data.postSlug}`);
        }
        break;
      case 'mention':
        if (data.postSlug) {
          navigate(`/posts/${data.postSlug}#comment-${data.commentId}`);
        }
        break;
      default:
        // 系统通知等其他类型
        break;
    }
  };

  const getNotificationIcon = (type: NotificationType, subtype?: string) => {
    if (type === 'system') {
      return <Bell className="w-5 h-5 text-blue-500" />;
    }

    switch (subtype) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
      case 'reply':
        return <span className="text-xl">💬</span>;
      case 'favorite':
        return <span className="text-xl">⭐</span>;
      case 'mention':
        return <span className="text-xl">@</span>;
      case 'follow':
        return <span className="text-xl">👤</span>;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          通知中心
        </h1>
        <button
          onClick={() => navigate('/notifications/settings')}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="通知设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs（移除了私信tab） */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'all'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          全部
          {unreadCounts.total > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {unreadCounts.total}
            </span>
          )}
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'system'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          系统通知
          {unreadCounts.system > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {unreadCounts.system}
            </span>
          )}
          {activeTab === 'system' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('interaction')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'interaction'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          互动通知
          {unreadCounts.interaction > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {unreadCounts.interaction}
            </span>
          )}
          {activeTab === 'interaction' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        {/* 移除了私信tab */}
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>全部已读</span>
          </button>
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          加载中...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                notification.isRead
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              } hover:shadow-md`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type, notification.subtype)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </p>
                  {notification.content && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {notification.content}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

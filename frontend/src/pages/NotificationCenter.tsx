/**
 * 通知中心页面
 *
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import {
  getNotificationIcon,
} from '../utils/notificationApi';
import type { Notification } from '../types/notifications';

// 通知项组件
function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }

    // 根据通知类型跳转
    if (notification.relatedData?.postSlug) {
      navigate(`/posts/${notification.relatedData.postSlug}`);
    } else if (notification.type === 'private_message') {
      navigate('/messages');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-4 border-b border-gray-100 cursor-pointer transition-colors
        hover:bg-gray-50
        ${!notification.isRead ? 'bg-blue-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">
          {getNotificationIcon(notification.type, notification.subtype)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
            )}
          </div>
          {notification.content && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.content}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatTime(notification.createdAt)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 筛选按钮组件
function FilterButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-medium transition-colors
        ${
          active
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`
          ml-1.5 px-1.5 py-0.5 rounded-full text-xs
          ${active ? 'bg-white/20' : 'bg-red-500 text-white'}
        `}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'interaction' | 'private_message'>('all');

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    filter,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setFilter,
    clearError,
  } = useNotificationStore();

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 初始加载
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true);
    }
  }, [isAuthenticated, filter]);

  // 切换标签
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setFilter({
      ...filter,
      type: tab === 'all' ? undefined : tab,
    });
  };

  // 标记全部已读
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead(activeTab === 'all' ? undefined : activeTab);
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
          <div className="flex items-center gap-3">
            {unreadCount.total > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                全部已读
              </button>
            )}
            <button
              onClick={() => navigate('/notification-settings')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              通知设置
            </button>
          </div>
        </div>

        {/* 筛选标签 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterButton
            active={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            count={unreadCount.total}
          >
            全部
          </FilterButton>
          <FilterButton
            active={activeTab === 'interaction'}
            onClick={() => handleTabChange('interaction')}
            count={unreadCount.byType.interaction}
          >
            互动
          </FilterButton>
          <FilterButton
            active={activeTab === 'system'}
            onClick={() => handleTabChange('system')}
            count={unreadCount.byType.system}
          >
            系统
          </FilterButton>
          <FilterButton
            active={activeTab === 'private_message'}
            onClick={() => handleTabChange('private_message')}
            count={unreadCount.byType.private_message}
          >
            私信
          </FilterButton>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 text-sm mt-2 hover:underline"
            >
              关闭
            </button>
          </div>
        )}

        {/* 通知列表 */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 text-sm mt-3">加载中...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-gray-500 mt-3">暂无通知</p>
              <p className="text-gray-400 text-sm mt-1">
                当有人与你互动时，你会收到通知
              </p>
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}

              {/* 加载更多 */}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="text-sm text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50"
                  >
                    {isLoadingMore ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

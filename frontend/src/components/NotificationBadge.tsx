/**
 * 通知角标组件
 * 
 * 功能：
 * - 显示在Header中，展示未读通知数量
 * - 定期自动刷新未读计数
 * - 点击跳转到通知中心
 * - 仅对已登录用户显示
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';

interface NotificationBadgeProps {
  className?: string;
}

export default function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  // 定期获取未读数
  useEffect(() => {
    if (!isAuthenticated) return;

    // 初始获取
    fetchUnreadCount();

    // 每30秒刷新一次
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  if (!isAuthenticated) {
    return null;
  }

  const totalUnread = unreadCount.total;

  return (
    <button
      onClick={() => navigate('/notifications')}
      className={`relative p-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
      title="通知"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
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

      {/* 未读数角标 */}
      {totalUnread > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full min-w-[18px]">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
  );
}

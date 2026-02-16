/**
 * Header组件（方案A版本）
 * 
 * 变更说明：
 * - 添加独立的私信图标和badge
 * - 通知铃铛不再包含私信未读数
 * 
 * @version 2.0.0 - 方案A
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, User, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { api } from '../utils/api';
import NotificationBadge from './NotificationBadge';
import NotificationCarousel from './NotificationCarousel';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // 私信未读数（独立状态）
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // 定期刷新未读数
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchMessageUnreadCount();
      
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchMessageUnreadCount();
      }, 30000); // 每30秒刷新一次
      
      return () => clearInterval(interval);
    }
  }, [user]);

  // 获取私信未读数
  const fetchMessageUnreadCount = async () => {
    try {
      const response = await api.get('/api/messages/unread/count');
      setMessageUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch message unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              📝 Blog
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              首页
            </Link>
            <Link 
              to="/categories" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              分类
            </Link>
            <Link 
              to="/tags" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              标签
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* 通知铃铛（不包含私信） */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                    className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label={`通知 ${unreadCount.total > 0 ? `(${unreadCount.total}条未读)` : ''}`}
                  >
                    <Bell className="w-6 h-6" />
                    {unreadCount.total > 0 && (
                      <NotificationBadge count={unreadCount.total} />
                    )}
                  </button>

                  {/* 通知面板 */}
                  {notificationPanelOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setNotificationPanelOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                        <NotificationCarousel 
                          onClose={() => setNotificationPanelOpen(false)} 
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* 私信图标（独立） */}
                <Link
                  to="/messages"
                  className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label={`私信 ${messageUnreadCount > 0 ? `(${messageUnreadCount}条未读)` : ''}`}
                >
                  <MessageSquare className="w-6 h-6" />
                  {messageUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 font-medium">
                      {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                    </span>
                  )}
                </Link>

                {/* 用户菜单 */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.displayName || user.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.displayName || user.username}
                    </span>
                  </button>

                  {/* 用户下拉菜单 */}
                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            个人主页
                          </Link>
                          <Link
                            to="/notifications/settings"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            通知设置
                          </Link>
                          <Link
                            to="/messages/settings"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            私信设置
                          </Link>
                          {user.role === 'admin' && (
                            <Link
                              to="/admin"
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              管理后台
                            </Link>
                          )}
                          <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            退出登录
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  注册
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              首页
            </Link>
            <Link
              to="/categories"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              分类
            </Link>
            <Link
              to="/tags"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              标签
            </Link>
            {user && (
              <>
                <Link
                  to="/messages"
                  className="flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>私信</span>
                  {messageUnreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                      {messageUnreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

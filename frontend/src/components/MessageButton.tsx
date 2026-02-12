/**
 * 悬浮私信按钮组件
 * 
 * 功能：
 * - 固定在页面右下角
 * - 显示未读消息数角标
 * - 点击打开私信聊天窗口
 * - 未登录时显示登录提示
 * - 定期自动刷新未读计数
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { getUnreadCount } from '../utils/messageApi';
import { MessageChatModal } from './MessageChatModal';
import { LoginPromptModal } from './LoginPromptModal';

export function MessageButton() {
  const { isAuthenticated } = useAuthStore();
  const { unreadCount, setUnreadCount } = useMessageStore();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  // 获取未读消息数
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('获取未读消息数失败:', error);
    }
  }, [isAuthenticated, setUnreadCount]);

  // 定期获取未读消息数
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    
    // 每30秒刷新一次
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount, setUnreadCount]);

  // 处理按钮点击
  const handleClick = () => {
    if (!isAuthenticated) {
      setIsLoginPromptOpen(true);
      return;
    }
    setIsChatOpen(true);
  };

  // 处理聊天窗口关闭
  const handleChatClose = () => {
    setIsChatOpen(false);
    // 关闭时刷新未读数
    fetchUnreadCount();
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
        aria-label="私信"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* 未读消息角标 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-card border border-border text-foreground text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
          {isAuthenticated ? '私信' : '登录后使用私信'}
        </span>
      </button>

      {/* 聊天窗口 */}
      <MessageChatModal
        isOpen={isChatOpen}
        onClose={handleChatClose}
      />

      {/* 登录提示弹窗 */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
      />
    </>
  );
}

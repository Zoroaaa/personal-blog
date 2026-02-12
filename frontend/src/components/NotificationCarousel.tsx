/**
 * 通知轮播组件
 *
 * 功能：
 * - 自动轮播系统通知
 * - 支持手动切换
 * - 点击跳转（如有链接）
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

interface CarouselNotification {
  id: number;
  title: string;
  content: string;
  link?: string;
  createdAt: string;
}

interface NotificationCarouselProps {
  className?: string;
}

const CAROUSEL_INTERVAL = 5000; // 5秒轮播间隔

export function NotificationCarousel({ className = '' }: NotificationCarouselProps) {
  const [notifications, setNotifications] = useState<CarouselNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // 获取轮播通知
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications/carousel');
      if (response.success && response.data) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch carousel notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 自动轮播
  useEffect(() => {
    if (notifications.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, CAROUSEL_INTERVAL);

    return () => clearInterval(interval);
  }, [notifications.length, isPaused]);

  // 切换到指定通知
  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // 下一条
  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % notifications.length);
  }, [notifications.length]);

  // 上一条
  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length);
  }, [notifications.length]);

  // 点击通知
  const handleClick = useCallback((notification: CarouselNotification) => {
    if (notification.link) {
      window.open(notification.link, '_blank');
    }
  }, []);

  // 默认文本（当没有通知时显示）
  const defaultContent = {
    title: '探索精彩内容',
    content: '发现有价值的文章和见解',
  };

  const currentNotification = notifications[currentIndex];

  if (isLoading) {
    return (
      <div className={`text-center ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative text-center ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 通知内容 */}
      <div
        className={`transition-all duration-500 ${
          currentNotification?.link ? 'cursor-pointer hover:opacity-80' : ''
        }`}
        onClick={() => currentNotification && handleClick(currentNotification)}
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4 transition-all duration-300">
          {currentNotification?.title || defaultContent.title}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 transition-all duration-300">
          {currentNotification?.content || defaultContent.content}
        </p>
      </div>

      {/* 导航控制（多条通知时显示） */}
      {notifications.length > 1 && (
        <>
          {/* 左右箭头 */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
            style={{ opacity: isPaused ? 1 : 0 }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            style={{ opacity: isPaused ? 1 : 0 }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 指示器 */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {notifications.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400'
                }`}
                aria-label={`切换到第 ${index + 1} 条通知`}
              />
            ))}
          </div>

          {/* 进度条 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-100"
              style={{
                width: isPaused ? '0%' : '100%',
                transitionDuration: isPaused ? '0ms' : `${CAROUSEL_INTERVAL}ms`,
              }}
            />
          </div>
        </>
      )}

      {/* 链接指示器 */}
      {currentNotification?.link && (
        <div className="absolute top-0 right-0 p-2">
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

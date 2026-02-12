/**
 * 系统通知展示组件 - 全新设计
 *
 * 功能：
 * - 优雅的通知卡片展示
 * - 标题完整显示，内容可折叠展开
 * - 平滑的过渡动画效果
 * - 响应式设计适配多端
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2024-01-01
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { motion } from 'framer-motion';

interface CarouselNotification {
  id: number;
  title: string;
  content: string;
  link?: string;
  createdAt: string;
  type?: 'info' | 'success' | 'warning' | 'update';
}

interface NotificationCarouselProps {
  className?: string;
}

const CAROUSEL_INTERVAL = 6000;

const typeConfig = {
  info: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    borderColor: 'border-blue-400/30',
    iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-500',
  },
  success: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
    borderColor: 'border-emerald-400/30',
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-500',
  },
  warning: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-400/30',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    accent: 'bg-amber-500',
  },
  update: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
    borderColor: 'border-purple-400/30',
    iconBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    accent: 'bg-purple-500',
  },
};

export function NotificationCarousel({ className = '' }: NotificationCarouselProps) {
  const [notifications, setNotifications] = useState<CarouselNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (notifications.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, CAROUSEL_INTERVAL);

    return () => clearInterval(interval);
  }, [notifications.length, isPaused]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % notifications.length);
  }, [notifications.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length);
  }, [notifications.length]);

  const handleClick = useCallback((notification: CarouselNotification) => {
    if (notification.link) {
      window.open(notification.link, '_blank');
    }
  }, []);

  const defaultContent = {
    title: '探索精彩内容',
    content: '发现有价值的文章和见解，开启你的知识之旅',
    type: 'info' as const,
  };

  const currentNotification = notifications[currentIndex];
  const config = currentNotification?.type ? typeConfig[currentNotification.type] : typeConfig.info;

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-slate-700/50 p-8 shadow-xl">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-2xl w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-xl w-96"></div>
          </div>
        </div>
      </div>
    );
  }

  const displayNotification = currentNotification || defaultContent;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 主卡片容器 */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className={`
          relative overflow-hidden
          bg-white/80 dark:bg-slate-800/80
          backdrop-blur-2xl
          rounded-3xl
          border ${config.borderColor}
          shadow-2xl shadow-black/5 dark:shadow-black/20
          transition-all duration-500
          ${displayNotification.link ? 'cursor-pointer' : ''}
        `}
        onClick={() => displayNotification.link && handleClick(displayNotification)}
      >
        {/* 背景渐变装饰 */}
        <div className={`
          absolute inset-0 bg-gradient-to-br ${config.gradient}
          opacity-60 dark:opacity-40
          transition-opacity duration-500
        `} />

        {/* 顶部装饰线 */}
        <div className={`
          absolute top-0 left-0 right-0 h-1
          bg-gradient-to-r ${config.gradient.replace('/20', '').replace('/10', '')}
          opacity-80
        `} />

        {/* 内容区域 */}
        <div className="relative p-6 sm:p-8 lg:p-10">
          {/* 类型图标 */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`
              inline-flex items-center justify-center
              w-12 h-12 rounded-2xl mb-6
              ${config.iconBg}
              shadow-lg shadow-current/20
            `}
          >
            {config.icon}
          </motion.div>

          {/* 标题 */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="
              text-2xl sm:text-3xl lg:text-4xl
              font-bold
              bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700
              dark:from-white dark:via-gray-200 dark:to-gray-300
              bg-clip-text text-transparent
              mb-4
              leading-tight
              tracking-tight
            "
          >
            {displayNotification.title}
          </motion.h1>

          {/* 内容区域 */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="
              text-base sm:text-lg
              text-gray-600 dark:text-gray-400
              leading-relaxed
            "
          >
            {displayNotification.content}
          </motion.p>

          {/* 底部元信息 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500"
          >
            {displayNotification.createdAt && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(displayNotification.createdAt).toLocaleDateString('zh-CN')}
              </span>
            )}
            {displayNotification.link && (
              <span className="flex items-center gap-1.5 text-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                点击查看
              </span>
            )}
          </motion.div>
        </div>

        {/* 进度条 */}
        {notifications.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-slate-700/50 overflow-hidden">
            <motion.div
              className={`h-full ${config.accent}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: CAROUSEL_INTERVAL / 1000, ease: 'linear' }}
              key={currentIndex}
            />
          </div>
        )}
      </motion.div>

      {/* 导航控制 */}
      {notifications.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {/* 上一页按钮 */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={prev}
            className="
              p-3 rounded-full
              bg-white/80 dark:bg-slate-800/80
              backdrop-blur-sm
              border border-gray-200/50 dark:border-slate-700/50
              text-gray-600 dark:text-gray-400
              shadow-lg shadow-black/5
              hover:text-blue-500 dark:hover:text-blue-400
              hover:border-blue-300 dark:hover:border-blue-700
              transition-all duration-300
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          {/* 指示器 */}
          <div className="flex items-center gap-2">
            {notifications.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => goTo(index)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`
                  rounded-full transition-all duration-300
                  ${index === currentIndex
                    ? 'w-8 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30'
                    : 'w-2.5 h-2.5 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500'
                  }
                `}
                aria-label={`切换到第 ${index + 1} 条通知`}
              />
            ))}
          </div>

          {/* 下一页按钮 */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={next}
            className="
              p-3 rounded-full
              bg-white/80 dark:bg-slate-800/80
              backdrop-blur-sm
              border border-gray-200/50 dark:border-slate-700/50
              text-gray-600 dark:text-gray-400
              shadow-lg shadow-black/5
              hover:text-blue-500 dark:hover:text-blue-400
              hover:border-blue-300 dark:hover:border-blue-700
              transition-all duration-300
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      )}
    </div>
  );
}

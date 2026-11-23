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
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent', // THEME-OK: 通知类型装饰色带
    borderColor: 'border-primary/30',
    iconBg: 'bg-primary/10 text-primary dark:text-primary',
    accent: 'bg-primary/80',
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
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent', // THEME-OK: 通知类型装饰色带
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
        <div className="bg-card/70 dark:bg-card/70 backdrop-blur-xl rounded-2xl border border-border/50 dark:border-border/50 p-4 shadow-lg">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-muted dark:bg-muted rounded-xl flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted dark:bg-muted rounded-lg w-48"></div>
              <div className="h-3 bg-muted dark:bg-muted rounded w-64"></div>
            </div>
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
      {/* 主卡片容器 - 紧凑设计 */}
      {/* 入场/进度动画用 CSS（见 index.css），不再依赖 framer-motion：全仓仅本组件用它 */}
      <div
        key={currentIndex}
        className={`
          relative overflow-hidden
          animate-fade-in
          bg-card/85 dark:bg-card/85
          backdrop-blur-xl
          rounded-2xl
          border ${config.borderColor}
          shadow-lg shadow-black/5 dark:shadow-black/15
          transition-all duration-300
          ${displayNotification.link ? 'cursor-pointer hover:shadow-xl' : ''}
        `}
        onClick={() => displayNotification.link && handleClick(displayNotification)}
      >
        {/* 背景渐变装饰 */}
        <div className={`
          absolute inset-0 bg-gradient-to-br ${config.gradient}
          opacity-50 dark:opacity-30
          transition-opacity duration-300
        `} />

        {/* 左侧装饰条 */}
        <div className={`
          absolute top-0 left-0 bottom-0 w-1
          bg-gradient-to-b ${config.gradient.replace('/20', '').replace('/10', '')}
          opacity-90
        `} />

        {/* 内容区域 - 横向布局，内容保留3行高度 */}
        <div className="relative px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3 sm:gap-4">
          {/* 类型图标 */}
          <div
            className={`
              animate-scale-in
              flex-shrink-0
              inline-flex items-center justify-center
              w-9 h-9 sm:w-10 sm:h-10 rounded-xl mt-0.5
              ${config.iconBg}
            `}
          >
            {config.icon}
          </div>

          {/* 文本内容 - 内容保留3行高度 */}
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <h2
              className="
                animate-fade-in-left
                text-base sm:text-lg
                font-semibold
                text-foreground
              "
            >
              {displayNotification.title}
            </h2>

            {/* 内容 - 保留3行高度 */}
            <p
              className="
                animate-fade-in-left
                text-sm text-muted-foreground
                mt-1
                line-clamp-3
                leading-relaxed
              "
            >
              {displayNotification.content}
            </p>
          </div>

          {/* 右侧操作区 */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {displayNotification.link && (
              <span
                className="hidden sm:flex items-center gap-1 text-xs text-primary dark:text-primary font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                查看
              </span>
            )}
            {displayNotification.createdAt && (
              <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                {new Date(displayNotification.createdAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>

        {/* 进度条 */}
        {notifications.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/50 overflow-hidden">
            <div
              className={`h-full ${config.accent} animate-progress-fill`}
              style={{ animationDuration: `${CAROUSEL_INTERVAL}ms` }}
              key={currentIndex}
            />
          </div>
        )}
      </div>

      {/* 导航控制 - 紧凑设计 */}
      {notifications.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {/* 上一页按钮 */}
          <button
            onClick={prev}
            className="
              p-2 rounded-lg
              bg-card/70 dark:bg-card/70
              backdrop-blur-sm
              border border-border/50 dark:border-border/50
              text-muted-foreground
              hover:text-primary dark:hover:text-primary
              hover:border-primary/50
              transition-all duration-200
              hover:scale-105 active:scale-95
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 指示器 */}
          <div className="flex items-center gap-1.5">
            {notifications.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`
                  rounded-full transition-all duration-200
                  hover:scale-125 active:scale-90
                  ${index === currentIndex
                    ? 'w-5 h-1.5 bg-gradient-to-r from-primary-500 to-primary-700'
                    : 'w-1.5 h-1.5 bg-border/60 hover:bg-border dark:hover:bg-border'
                  }
                `}
                aria-label={`切换到第 ${index + 1} 条通知`}
              />
            ))}
          </div>

          {/* 下一页按钮 */}
          <button
            onClick={next}
            className="
              p-2 rounded-lg
              bg-card/70 dark:bg-card/70
              backdrop-blur-sm
              border border-border/50 dark:border-border/50
              text-muted-foreground
              hover:text-primary dark:hover:text-primary
              hover:border-primary/50
              transition-all duration-200
              hover:scale-105 active:scale-95
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

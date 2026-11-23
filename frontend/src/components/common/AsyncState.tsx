/**
 * 统一的异步状态展示：加载中 / 空数据 / 错误。
 *
 * 约束：
 * - 只使用语义化颜色 token，适配亮/暗主题与自定义主色；
 * - 每个状态都提供明确的「下一步」动作（重试 / 清除筛选 / 去浏览），
 *   避免用户面对死胡同；
 * - 纯展示组件，不发起请求，动作通过回调交给调用方。
 */

import type { ReactNode } from 'react';

/** 加载中：统一 spinner + 文案，供各列表页复用 */
export function LoadingState({
  message = '加载中...',
  className = 'py-12',
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/** 错误态：说明原因并提供重试，error 文案面向用户，不暴露堆栈 */
export function ErrorState({
  message,
  onRetry,
  retryLabel = '重试',
  className = 'py-12',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <svg className="w-12 h-12 text-destructive mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-base font-semibold text-destructive mb-1">加载失败</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/** 空状态：图标 + 标题 + 说明 + 可选动作按钮 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = 'py-16',
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  const defaultIcon = (
    <svg className="w-14 h-14 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {icon ?? defaultIcon}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

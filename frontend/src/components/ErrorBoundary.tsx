/**
 * 错误边界组件
 * 
 * 功能：捕获并处理React组件树中的JavaScript错误，防止整个应用崩溃
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件
 * 
 * 用法：
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * 支持自定义错误UI：
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * 静态方法：从错误中更新状态
   * 
   * 当子组件抛出错误时，React会调用此方法
   * 
   * @param error 捕获到的错误
   * @returns 新的状态对象
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * 实例方法：捕获错误并记录
   * 
   * 当子组件抛出错误时，React会调用此方法
   * 
   * @param error 捕获到的错误
   * @param errorInfo 错误信息，包含错误发生的组件栈
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误
    console.error('错误边界捕获:', error, errorInfo);

    // 可以在这里发送到错误跟踪服务（如Sentry）
    // sendToErrorTracking(error, errorInfo);
  }

  /**
   * 渲染方法
   * 
   * 如果有错误，显示错误UI；否则显示子组件
   * 
   * @returns 渲染的React元素
   */
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-auto">
              <h1 className="text-2xl font-bold text-red-600 mb-4">出错了</h1>
              <p className="text-gray-600 mb-6">
                应用遇到了意外错误。请刷新页面重试。
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
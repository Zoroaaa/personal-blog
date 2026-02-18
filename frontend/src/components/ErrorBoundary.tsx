/**
 * 错误边界组件
 *
 * 功能：捕获并处理React组件树中的JavaScript错误，防止整个应用崩溃
 *
 * @author 博客系统
 * @version 1.1.0
 * @created 2026-02-13
 * @updated 2026-02-18 - 增强错误边界功能
 */

import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获错误:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="flex items-center justify-center min-h-[400px] bg-muted/50 p-4">
          <div className="bg-card p-6 rounded-lg shadow-lg text-center max-w-lg mx-auto border">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-red-600 mb-2">页面出错了</h1>
            <p className="text-muted-foreground mb-4">
              当前页面遇到了问题，您可以尝试重试或返回首页。
            </p>

            {isDev && this.props.showDetails !== false && this.state.error && (
              <details className="text-left mb-4 p-3 bg-red-50 rounded text-sm overflow-auto max-h-40">
                <summary className="cursor-pointer font-medium text-red-700">
                  错误详情
                </summary>
                <pre className="mt-2 text-red-600 whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 text-gray-600">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/80 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      showDetails={true}
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] bg-muted/50">
          <div className="bg-card p-8 rounded-lg shadow-lg text-center max-w-md mx-auto border">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-red-600 mb-2">
              {pageName ? `${pageName}加载失败` : '页面加载失败'}
            </h1>
            <p className="text-muted-foreground mb-6">
              页面遇到了问题，请刷新页面或稍后重试。
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/80 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
/**
 * SEO 优化助手组件
 * 显示 SEO 分析结果和优化建议
 */

import { useState } from 'react';
import { useSEOAnalyzer } from '../hooks/useSEOAnalyzer';

interface SEOAssistantProps {
  title: string;
  summary: string;
  content: string;
  className?: string;
}

export function SEOAssistant({ title, summary, content, className = '' }: SEOAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const analysis = useSEOAnalyzer(title, summary, content);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getCheckIcon = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  return (
    <div className={`border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden ${className}`}>
      {/* 头部 - 总是显示 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getScoreBgColor(analysis.score)} ${getScoreColor(analysis.score)}`}>
            {analysis.score}
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-900 dark:text-white">SEO 优化助手</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {analysis.score >= 80 ? 'SEO 表现优秀' : analysis.score >= 60 ? '还有优化空间' : '需要改进'}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
          {/* 检查项列表 */}
          <div className="space-y-2 mb-4">
            {analysis.checks.map((check, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-slate-800"
              >
                {getCheckIcon(check.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {check.message}
                  </p>
                  {check.detail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {check.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 关键词密度 */}
          {analysis.keywordDensity.size > 0 && (
            <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                关键词密度
              </h5>
              <div className="flex flex-wrap gap-2">
                {Array.from(analysis.keywordDensity.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([keyword, density]) => (
                    <span
                      key={keyword}
                      className={`text-xs px-2 py-1 rounded ${
                        density > 3
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {keyword} ({density}%)
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* 优化建议 */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              优化建议
            </h5>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 标题长度控制在 50-60 字符之间</li>
              <li>• 摘要长度控制在 150-160 字符之间</li>
              <li>• 为所有图片添加描述性的 alt 文本</li>
              <li>• 使用合适的标题层级（H1-H6）</li>
              <li>• 添加内部和外部链接</li>
              <li>• 避免关键词堆砌（密度控制在 1-3%）</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

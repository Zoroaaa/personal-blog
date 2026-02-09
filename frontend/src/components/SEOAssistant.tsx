/**
 * SEO 优化助手组件
 * 显示 SEO 分析结果和优化建议
 * 新增：自动排版优化功能
 */

import { useState } from 'react';
import { useSEOAnalyzer, autoFormatContent } from '../hooks/useSEOAnalyzer';

interface SEOAssistantProps {
  title: string;
  summary: string;
  content: string;
  className?: string;
  onContentOptimize?: (optimizedContent: string) => void;
}

export function SEOAssistant({ title, summary, content, className = '', onContentOptimize }: SEOAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'seo' | 'format'>('seo');
  const [showOptimized, setShowOptimized] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState('');
  const analysis = useSEOAnalyzer(title, summary, content);

  const handleAutoFormat = () => {
    const formatted = autoFormatContent(content);
    setOptimizedContent(formatted);
    setShowOptimized(true);
  };

  const handleApplyOptimization = () => {
    if (onContentOptimize && optimizedContent) {
      onContentOptimize(optimizedContent);
      setShowOptimized(false);
    }
  };

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
        type="button"
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
          {/* 标签切换 */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'seo'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              SEO 分析
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('format')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'format'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              排版检查
              {analysis.formatIssues.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                  {analysis.formatIssues.length}
                </span>
              )}
            </button>
          </div>

          {/* SEO 分析内容 */}
          {activeTab === 'seo' && (
            <>
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
            </>
          )}

          {/* 排版检查内容 */}
          {activeTab === 'format' && (
            <>
              {/* 自动排版优化按钮 */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleAutoFormat}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  一键自动排版优化
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  自动修复标题格式、列表格式、空行等问题
                </p>
              </div>

              {/* 格式问题列表 */}
              {analysis.formatIssues.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    发现 {analysis.formatIssues.length} 个格式问题
                  </h5>
                  {analysis.formatIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded ${
                        issue.severity === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : issue.severity === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20'
                          : 'bg-blue-50 dark:bg-blue-900/20'
                      }`}
                    >
                      {issue.severity === 'error' ? (
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : issue.severity === 'warning' ? (
                        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {issue.message}
                        </p>
                        {issue.suggestion && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            建议：{issue.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    未发现格式问题，排版良好！
                  </p>
                </div>
              )}

              {/* 优化预览 */}
              {showOptimized && (
                <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    优化预览
                  </h5>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                      {optimizedContent}
                    </pre>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleApplyOptimization}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    >
                      应用优化
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOptimized(false)}
                      className="px-3 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 编辑器SEO面板组件
 * 
 * 功能：提供SEO优化建议和相关操作
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import React from 'react';

interface EditorSEOPanelProps {
  title: string;
  summary: string;
  content: string;
  onContentOptimize: (optimizedContent: string) => void;
}

/**
 * 编辑器SEO面板组件
 */
export function EditorSEOPanel({ 
  title, 
  summary, 
  content, 
  onContentOptimize 
}: EditorSEOPanelProps) {
  /**
   * 分析内容SEO得分
   */
  const analyzeSEO = () => {
    let score = 0;
    const suggestions: string[] = [];

    // 标题分析
    if (title.length > 10 && title.length < 70) {
      score += 20;
    } else {
      suggestions.push('标题长度应在10-70个字符之间');
    }

    // 摘要分析
    if (summary.length > 50 && summary.length < 160) {
      score += 20;
    } else {
      suggestions.push('摘要长度应在50-160个字符之间');
    }

    // 内容长度分析
    const contentWords = content.replace(/[\s\n]+/g, ' ').trim().split(' ').length;
    if (contentWords > 300) {
      score += 20;
    } else {
      suggestions.push('内容长度应超过300个单词');
    }

    // 关键词分析
    const hasKeywords = content.toLowerCase().includes(title.toLowerCase());
    if (hasKeywords) {
      score += 20;
    } else {
      suggestions.push('内容中应包含标题中的关键词');
    }

    // 图片分析
    const hasImages = content.includes('![') && content.includes('](');
    if (hasImages) {
      score += 20;
    } else {
      suggestions.push('内容中应包含图片');
    }

    return { score, suggestions };
  };

  /**
   * 优化内容
   */
  const optimizeContent = () => {
    let optimizedContent = content;

    // 简单的优化建议：如果内容太短，添加一些占位文本
    if (content.replace(/[\s\n]+/g, ' ').trim().length < 100) {
      optimizedContent += '\n\n本文详细介绍了相关内容，包括背景信息、实现方法和最佳实践。通过本文的学习，读者将能够掌握相关技能并应用到实际项目中。';
    }

    onContentOptimize(optimizedContent);
  };

  const { score, suggestions } = analyzeSEO();

  /**
   * 获取得分颜色
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          SEO 优化助手
        </h3>
        <div className={`text-xl font-bold ${getScoreColor(score)}`}>
          {score}%
        </div>
      </div>

      {/* SEO建议列表 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          优化建议：
        </h4>
        <ul className="space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.933-2.694-.933-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {suggestion}
                </span>
              </li>
            ))
          ) : (
            <li className="text-sm text-green-600 dark:text-green-400">
              内容SEO优化良好
            </li>
          )}
        </ul>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={optimizeContent}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          自动优化内容
        </button>
        <button
          type="button"
          onClick={() => {
            // 生成摘要建议
            if (!summary && content) {
              const autoSummary = content
                .replace(/[#*_`\[\]!]/g, '')
                .slice(0, 150)
                .trim();
              alert(`建议摘要：\n${autoSummary}${autoSummary.length >= 150 ? '...' : ''}`);
            }
          }}
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
        >
          生成摘要建议
        </button>
      </div>

      {/* SEO提示 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>SEO优化建议仅供参考，实际效果可能因内容类型和目标受众而异。</p>
      </div>
    </div>
  );
}

export default EditorSEOPanel;
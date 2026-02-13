/**
 * Markdown预览面板组件
 * 
 * 功能：实时预览Markdown内容的渲染效果
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import React from 'react';
import { SplitPreview } from './MarkdownPreview';

interface EditorPreviewPanelProps {
  content: string;
}

/**
 * Markdown预览面板组件
 */
export function EditorPreviewPanel({ content }: EditorPreviewPanelProps) {
  return (
    <div className="rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
      <div className="bg-gray-50 dark:bg-slate-800 px-4 py-2 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          预览效果
        </h3>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 min-h-[400px]">
        <SplitPreview content={content} isVisible={true} />
      </div>
      <div className="bg-gray-50 dark:bg-slate-800 px-4 py-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
        实时预览可能与最终效果略有差异
      </div>
    </div>
  );
}

export default EditorPreviewPanel;
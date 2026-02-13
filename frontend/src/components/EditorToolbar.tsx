/**
 * 编辑器工具栏组件
 * 
 * 功能：提供Markdown编辑的工具栏按钮，包括格式化、列表、链接等操作
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import React from 'react';

interface EditorToolbarProps {
  activeTab: 'edit' | 'preview' | 'split';
  isFullscreen: boolean;
  onActiveTabChange: (tab: 'edit' | 'preview' | 'split') => void;
  onFullscreenToggle: () => void;
  onInsertMarkdown: (before: string, after?: string) => void;
  onOpenLinkEditor: () => void;
}

/**
 * 工具栏按钮组件
 */
interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
    >
      {children}
    </button>
  );
}

/**
 * 编辑器工具栏组件
 */
export function EditorToolbar({ 
  activeTab, 
  isFullscreen, 
  onActiveTabChange, 
  onFullscreenToggle, 
  onInsertMarkdown, 
  onOpenLinkEditor 
}: EditorToolbarProps) {
  // 插入Markdown语法
  const insertMarkdown = (before: string, after: string = '') => {
    onInsertMarkdown(before, after);
  };

  return (
    <>
      {/* 编辑器模式切换 */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          内容 (支持Markdown) *
        </label>
        
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onActiveTabChange('edit')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'edit'
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange('split')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'split'
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            分屏
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange('preview')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            预览
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
          <button
            type="button"
            onClick={onFullscreenToggle}
            title={isFullscreen ? '退出全屏 (F11/Esc)' : '全屏模式 (F11)'}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              isFullscreen
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      {activeTab !== 'preview' && (
        <div className="flex items-center gap-1 mb-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex-wrap">
          {/* 格式化按钮 */}
          <ToolbarButton onClick={() => insertMarkdown('**', '**')} title="粗体 (Ctrl+B)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('*', '*')} title="斜体 (Ctrl+I)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </ToolbarButton>
          
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
          
          {/* 标题按钮 */}
          <ToolbarButton onClick={() => insertMarkdown('# ')} title="标题 1">
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('## ')} title="标题 2">
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('### ')} title="标题 3">
            H3
          </ToolbarButton>
          
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
          
          {/* 列表按钮 */}
          <ToolbarButton onClick={() => insertMarkdown('- ')} title="无序列表">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('1. ')} title="有序列表">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('- [ ] ')} title="任务列表">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </ToolbarButton>
          
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
          
          {/* 其他格式按钮 */}
          <ToolbarButton onClick={() => insertMarkdown('> ')} title="引用">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('```\n', '\n```')} title="代码块">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('`', '`')} title="行内代码">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </ToolbarButton>
          
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
          
          {/* 链接和图片按钮 */}
          <ToolbarButton onClick={onOpenLinkEditor} title="插入链接 (Ctrl+K)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('![', '](url)')} title="插入图片">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertMarkdown('| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |')} title="插入表格">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </ToolbarButton>
        </div>
      )}
    </>
  );
}

export default EditorToolbar;
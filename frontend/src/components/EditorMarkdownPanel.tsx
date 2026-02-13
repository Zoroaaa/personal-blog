/**
 * Markdown编辑面板组件
 * 
 * 功能：提供Markdown文本编辑功能，包括文本输入、图片粘贴上传、Tab键缩进、内容统计等
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import React, { useRef } from 'react';
import { api } from '../utils/api';
import { ContentStats } from './ContentStats';

interface EditorMarkdownPanelProps {
  content: string;
  setContent: (content: string) => void;
  disabled: boolean;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  setError: (error: string) => void;
  detectedLinks: string[];
  onConvertLink: (url: string) => void;
  activeTab: 'edit' | 'preview' | 'split';
}

/**
 * Markdown编辑面板组件
 */
export function EditorMarkdownPanel({ 
  content, 
  setContent, 
  disabled, 
  uploading, 
  setUploading, 
  setError,
  detectedLinks,
  onConvertLink,
  activeTab
}: EditorMarkdownPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 处理内容区域粘贴图片
   */
  const handleContentPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          try {
            setUploading(true);
            const response = await api.uploadImage(file);
            if (response.success && response.data) {
              const imageUrl = response.data.url;
              const markdownImage = `![图片](${imageUrl})`;

              // 在光标位置插入图片，而不是追加到末尾
              const cursorPosition = textarea.selectionStart;
              const selectionEnd = textarea.selectionEnd;
              const beforeCursor = content.substring(0, cursorPosition);
              const afterCursor = content.substring(selectionEnd);
              const newContent = beforeCursor + markdownImage + afterCursor;
              setContent(newContent);

              // 恢复光标位置到插入的图片之后
              setTimeout(() => {
                textarea.focus();
                const newPosition = cursorPosition + markdownImage.length;
                textarea.setSelectionRange(newPosition, newPosition);
              }, 0);

              // 显示成功提示
              alert('图片粘贴成功');
            }
          } catch (error) {
            setError('图片粘贴失败: ' + (error instanceof Error ? error.message : '未知错误'));
          } finally {
            setUploading(false);
          }
        }
      }
    }
  };

  /**
   * 处理Tab键缩进
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        // Shift+Tab: 反缩进
        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(end);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        
        // 检查当前行是否有缩进
        if (currentLine.startsWith('  ')) {
          const newBeforeCursor = beforeCursor.slice(0, -2);
          const newValue = newBeforeCursor + afterCursor;
          setContent(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(start - 2, end - 2);
          }, 0);
        } else if (currentLine.startsWith('\t')) {
          const newBeforeCursor = beforeCursor.slice(0, -1);
          const newValue = newBeforeCursor + afterCursor;
          setContent(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(start - 1, end - 1);
          }, 0);
        }
      } else {
        // Tab: 缩进（插入两个空格）
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setContent(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handleContentPaste}
        onKeyDown={handleKeyDown}
        disabled={disabled || uploading}
        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm dark:bg-slate-700 dark:text-white disabled:opacity-50 resize-y"
        rows={activeTab === 'split' ? 30 : 20}
        required
        placeholder="在此输入 Markdown 内容...\n\n支持：\n- 标题、列表、引用\n- 代码块、表格\n- 图片、链接\n- 任务列表\n- Tab 键缩进"
      />
      
      {/* 内容统计信息 */}
      <div className="mt-2 flex items-center justify-between">
        <ContentStats content={content} />
      </div>
      
      {/* 检测到的链接提示 */}
      {detectedLinks.length > 0 && activeTab === 'edit' && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            检测到 {detectedLinks.length} 个链接，点击转换为 Markdown 格式：
          </p>
          <div className="flex flex-wrap gap-2">
            {detectedLinks.slice(0, 5).map((url, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onConvertLink(url)}
                className="text-xs px-2 py-1 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors truncate max-w-xs"
                title={url}
              >
                {url.length > 40 ? url.substring(0, 40) + '...' : url}
              </button>
            ))}
            {detectedLinks.length > 5 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 py-1">
                还有 {detectedLinks.length - 5} 个...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorMarkdownPanel;
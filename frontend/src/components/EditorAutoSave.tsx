/**
 * 编辑器自动保存组件
 * 
 * 功能：显示自动保存状态和相关操作
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import React from 'react';

interface EditorAutoSaveProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasDraft: boolean;
  onSaveDraft: () => void;
}

/**
 * 编辑器自动保存组件
 */
export function EditorAutoSave({ 
  isSaving, 
  lastSaved, 
  hasDraft, 
  onSaveDraft 
}: EditorAutoSaveProps) {
  /**
   * 格式化最后保存时间
   */
  const formatLastSaved = (date: Date | null): string => {
    if (!date) return '从未保存';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) {
      return `刚刚保存`;
    } else if (diffSec < 3600) {
      return `${Math.floor(diffSec / 60)} 分钟前保存`;
    } else if (diffSec < 86400) {
      return `${Math.floor(diffSec / 3600)} 小时前保存`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* 自动保存状态 */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
        ) : lastSaved ? (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isSaving ? '正在保存...' : formatLastSaved(lastSaved)}
        </span>
      </div>
      
      {/* 手动保存按钮 */}
      <button
        type="button"
        onClick={onSaveDraft}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
      >
        保存草稿
      </button>
      
      {/* 草稿提示 */}
      {hasDraft && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
          有未保存的草稿
        </div>
      )}
    </div>
  );
}

export default EditorAutoSave;
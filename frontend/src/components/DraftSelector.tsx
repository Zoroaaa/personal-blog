/**
 * 草稿选择器组件
 * 
 * 功能：
 * - 显示最新的 5 个草稿
 * - 选择恢复某个草稿
 * - 清除所有草稿
 * - 支持草稿内容预览
 * - 按时间排序显示
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect } from 'react';

interface Draft {
  key: string;
  data: {
    title?: string;
    content?: string;
    summary?: string;
    coverImage?: string;
    categoryId?: number | null;
    tags?: number[];
    status?: 'draft' | 'published';
  };
  timestamp: string;
  sessionId: string;
}

interface DraftSelectorProps {
  isOpen: boolean;
  drafts: Draft[];
  onClose: () => void;
  onSelect: (draft: Draft) => void;
  onClearAll: () => void;
}

export function DraftSelector({ 
  isOpen, 
  drafts, 
  onClose, 
  onSelect,
  onClearAll 
}: DraftSelectorProps) {
  const [selectedDraftKey, setSelectedDraftKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && drafts.length > 0) {
      // 默认选中第一个（最新的）
      setSelectedDraftKey(drafts[0].key);
    }
  }, [isOpen, drafts]);

  const handleConfirm = () => {
    const selectedDraft = drafts.find(d => d.key === selectedDraftKey);
    if (selectedDraft) {
      onSelect(selectedDraft);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getContentPreview = (content?: string) => {
    if (!content) return '无内容';
    // 移除 Markdown 标记，获取纯文本预览
    const plainText = content
      .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
      .replace(/\[.*?\]\(.*?\)/g, '$1')
      .replace(/[#*`~]/g, '')
      .replace(/\n/g, ' ')
      .trim();
    return plainText.slice(0, 60) + (plainText.length > 60 ? '...' : '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              恢复草稿
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              检测到 {drafts.length} 个未保存的草稿，请选择要恢复的草稿
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 草稿列表 */}
        <div className="max-h-96 overflow-y-auto">
          {drafts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              暂无草稿
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {drafts.map((draft, index) => (
                <label
                  key={draft.key}
                  className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-background dark:hover:bg-accent/50 ${
                    selectedDraftKey === draft.key 
                      ? 'bg-primary/10 border-l-4 border-primary' 
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="draft"
                    value={draft.key}
                    checked={selectedDraftKey === draft.key}
                    onChange={() => setSelectedDraftKey(draft.key)}
                    className="mt-1 w-4 h-4 text-primary border-border focus:ring-primary/50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(draft.timestamp)}
                      </span>
                    </div>
                    <h4 className="font-medium text-foreground truncate">
                      {draft.data.title?.trim() || '(无标题)'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {getContentPreview(draft.data.content)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {draft.data.content && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {draft.data.content.length} 字符
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background dark:bg-muted/30">
          <button
            onClick={() => {
              if (window.confirm('确定要清除所有草稿吗？此操作不可恢复。')) {
                onClearAll();
              }
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清除所有草稿
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-foreground hover:bg-muted dark:hover:bg-accent rounded-lg transition-colors"
            >
              不恢复
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDraftKey}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-white rounded-lg transition-colors"
            >
              恢复选中草稿
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

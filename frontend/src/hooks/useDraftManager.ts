/**
 * 新建文章时的浏览器草稿管理
 *
 * 功能：
 * - 收集 localStorage 中的新建文章草稿
 * - 打开草稿选择器、选择草稿、清空草稿
 *
 * @author 博客系统
 */

import { useState, useEffect, useCallback } from 'react';

export interface DraftSnapshot {
  title?: string;
  content?: string;
  summary?: string;
  coverImage?: string;
  status?: 'draft' | 'published' | 'archived';
  categoryId?: number | null;
  columnId?: number | null;
  tags?: number[];
  isPinned?: boolean;
  pinOrder?: number;
}

export interface DraftItem {
  key: string;
  sessionId?: string;
  timestamp: string;
  data: DraftSnapshot;
}

interface UseDraftManagerOptions {
  /** 是否启用（仅新建文章时启用，编辑模式不检查草稿） */
  enabled: boolean;
  /** 将草稿数据回填到表单 */
  applyDraft: (data: DraftSnapshot) => void;
}

export function useDraftManager({ enabled, applyDraft }: UseDraftManagerOptions) {
  const [draftSelectorOpen, setDraftSelectorOpen] = useState(false);
  const [availableDrafts, setAvailableDrafts] = useState<DraftItem[]>([]);

  // 获取所有新建文章的草稿
  const getAllNewPostDrafts = useCallback((): DraftItem[] => {
    const drafts: DraftItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('draft_new_post_')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const draft = JSON.parse(item);
            // 只保留有内容的草稿
            if (draft.data?.title?.trim() || draft.data?.content?.trim()) {
              drafts.push({
                key,
                ...draft,
                sessionId: key.replace('draft_new_post_', ''),
              });
            }
          }
        } catch (err) {
          console.error('Failed to parse draft:', err);
        }
      }
    }
    // 按时间倒序排序
    return drafts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  // 处理选择草稿
  const handleSelectDraft = useCallback((draft: DraftItem) => {
    applyDraft(draft.data);
    localStorage.removeItem(draft.key);
    setAvailableDrafts(prev => prev.filter(d => d.key !== draft.key));
    setDraftSelectorOpen(false);
  }, [applyDraft]);

  // 处理清除所有草稿
  const handleClearAllDrafts = useCallback(() => {
    availableDrafts.forEach(draft => {
      localStorage.removeItem(draft.key);
    });
    setAvailableDrafts([]);
    setDraftSelectorOpen(false);
  }, [availableDrafts]);

  // 检查是否有草稿（只在新建文章时执行）
  const checkDraft = useCallback(() => {
    if (!enabled) return; // 编辑模式不检查

    const drafts = getAllNewPostDrafts();

    if (drafts.length > 0) {
      // 只取最新的 5 个草稿
      const recentDrafts = drafts.slice(0, 5);
      setAvailableDrafts(recentDrafts);
      setDraftSelectorOpen(true);
    }
  }, [enabled, getAllNewPostDrafts]);

  useEffect(() => {
    checkDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    draftSelectorOpen,
    setDraftSelectorOpen,
    availableDrafts,
    handleSelectDraft,
    handleClearAllDrafts,
  };
}
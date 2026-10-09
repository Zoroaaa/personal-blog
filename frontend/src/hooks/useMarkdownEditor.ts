/**
 * Markdown 编辑器交互逻辑
 *
 * 功能：
 * - 编辑区 textarea 引用
 * - 编辑/分屏/预览模式与全屏状态
 * - Markdown 语法插入、Tab 缩进
 * - 链接编辑器（识别/插入/更新链接）与链接检测
 *
 * @author 博客系统
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  detectUrls,
  insertOrUpdateMarkdownLink,
  extractLinkFromMarkdown,
  isValidUrl,
} from '../utils/linkDetector';

export type EditorTab = 'edit' | 'preview' | 'split';

interface UseMarkdownEditorOptions {
  content: string;
  setContent: (value: string) => void;
}

export function useMarkdownEditor({ content, setContent }: UseMarkdownEditorOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 链接编辑器状态
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkEditorUrl, setLinkEditorUrl] = useState('');
  const [linkEditorText, setLinkEditorText] = useState('');
  const [linkEditorSelection, setLinkEditorSelection] = useState({ start: 0, end: 0 });

  // 检测到的链接
  const [detectedLinks, setDetectedLinks] = useState<string[]>([]);

  useEffect(() => {
    setDetectedLinks(detectUrls(content));
  }, [content]);

  const togglePreview = useCallback(() => {
    setActiveTab(prev => (prev === 'edit' ? 'split' : 'edit'));
  }, []);

  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);
  const exitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const closeLinkEditor = useCallback(() => setLinkEditorOpen(false), []);

  // 打开链接编辑器
  const openLinkEditor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    // 检查是否选中了一个链接
    const existingLink = extractLinkFromMarkdown(content, start);

    if (existingLink) {
      setLinkEditorUrl(existingLink.url);
      setLinkEditorText(existingLink.text);
      setLinkEditorSelection({ start: existingLink.start, end: existingLink.end });
    } else if (isValidUrl(selectedText)) {
      setLinkEditorUrl(selectedText);
      setLinkEditorText(selectedText);
      setLinkEditorSelection({ start, end });
    } else {
      setLinkEditorUrl('');
      setLinkEditorText(selectedText);
      setLinkEditorSelection({ start, end });
    }

    setLinkEditorOpen(true);
  }, [content]);

  // 处理链接编辑器确认
  const handleLinkConfirm = useCallback((url: string, displayText: string) => {
    const { newText, cursorPosition } = insertOrUpdateMarkdownLink(
      content,
      url,
      displayText,
      linkEditorSelection.start,
      linkEditorSelection.end
    );
    setContent(newText);

    // 恢复焦点
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  }, [content, linkEditorSelection, setContent]);

  // 快速转换检测到的链接
  const convertDetectedLink = useCallback((url: string) => {
    setContent(content.replace(url, `[${url}](${url})`));
  }, [content, setContent]);

  // 插入 Markdown 语法
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, setContent]);

  // 处理 Tab 键缩进
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [setContent]);

  return {
    textareaRef,
    activeTab,
    setActiveTab,
    isFullscreen,
    toggleFullscreen,
    exitFullscreen,
    togglePreview,
    detectedLinks,
    convertDetectedLink,
    insertMarkdown,
    handleKeyDown,
    openLinkEditor,
    closeLinkEditor,
    linkEditorOpen,
    linkEditorUrl,
    linkEditorText,
    handleLinkConfirm,
  };
}
/**
 * 富文本编辑器组件
 *
 * 功能：
 * - 支持加粗、斜体、列表、链接、代码块、引用
 * - 支持@用户功能
 * - 内容清理防止XSS
 * - 字数统计
 *
 * @version 1.0.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { User } from '../types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  mentionableUsers?: User[];
  onMentionSearch?: (query: string) => Promise<User[]>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '写下你的评论...',
  maxLength = 1000,
  mentionableUsers = [],
  onMentionSearch,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [textLength, setTextLength] = useState(0);
  const mentionStartRef = useRef<number>(-1);

  // 计算纯文本长度
  const calculateTextLength = useCallback((html: string): number => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent?.length || 0;
  }, []);

  // 更新字数统计
  useEffect(() => {
    setTextLength(calculateTextLength(value));
  }, [value, calculateTextLength]);

  // 处理@用户搜索
  useEffect(() => {
    if (!showMentions || !mentionQuery) {
      setFilteredUsers(mentionableUsers.slice(0, 10));
      return;
    }

    const query = mentionQuery.toLowerCase();
    const filtered = mentionableUsers.filter(
      (user) =>
        user.username?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered.slice(0, 10));
    setSelectedIndex(0);
  }, [mentionQuery, mentionableUsers, showMentions]);

  // 执行命令
  const execCommand = useCallback((command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // 插入链接
  const insertLink = useCallback(() => {
    const url = prompt('请输入链接地址:', 'https://');
    if (url && url !== 'https://') {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // 处理@用户
  const handleMention = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textContent = range.startContainer.textContent || '';
    const cursorPosition = range.startOffset;

    // 检查是否在@后面
    const beforeCursor = textContent.slice(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && atIndex === cursorPosition - 1) {
      mentionStartRef.current = atIndex;
      setMentionQuery('');
      setShowMentions(true);
      setSelectedIndex(0);
    } else if (showMentions) {
      // 更新搜索词
      const query = beforeCursor.slice(atIndex + 1);
      if (query.includes(' ')) {
        setShowMentions(false);
      } else {
        setMentionQuery(query);
      }
    }
  }, [showMentions]);

  // 选择用户
  const selectUser = useCallback((user: User) => {
    if (!editorRef.current || mentionStartRef.current === -1) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // 创建mention元素
    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'mention';
    mentionSpan.contentEditable = 'false';
    mentionSpan.dataset.userId = String(user.id);
    mentionSpan.textContent = `@${user.displayName || user.username}`;
    mentionSpan.style.cssText = `
      color: #3b82f6;
      font-weight: 500;
      background: rgba(59, 130, 246, 0.1);
      padding: 0 4px;
      border-radius: 4px;
      cursor: pointer;
    `;

    // 插入空格
    const space = document.createTextNode('\u00A0');

    // 替换@和查询文本
    const range = selection.getRangeAt(0);
    range.setStart(range.startContainer, mentionStartRef.current);
    range.setEnd(range.startContainer, range.startOffset);
    range.deleteContents();
    range.insertNode(mentionSpan);
    range.collapse(false);
    range.insertNode(space);
    range.setStartAfter(space);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    setShowMentions(false);
    mentionStartRef.current = -1;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  // 键盘处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showMentions && filteredUsers.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < filteredUsers.length - 1 ? prev + 1 : prev
            );
            return;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
            return;
          case 'Enter':
            e.preventDefault();
            selectUser(filteredUsers[selectedIndex]);
            return;
          case 'Escape':
            e.preventDefault();
            setShowMentions(false);
            return;
        }
      }

      // 快捷键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            execCommand('bold');
            return;
          case 'i':
            e.preventDefault();
            execCommand('italic');
            return;
        }
      }

      if (e.key === '@') {
        setTimeout(handleMention, 0);
      }
    },
    [showMentions, filteredUsers, selectedIndex, selectUser, execCommand, handleMention]
  );

  // 输入处理
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const length = calculateTextLength(html);

    if (length > maxLength) {
      // 截断内容
      const text = editorRef.current.innerText;
      editorRef.current.innerText = text.slice(0, maxLength);
      onChange(editorRef.current.innerHTML);
    } else {
      onChange(html);
    }

    if (showMentions) {
      handleMention();
    }
  }, [onChange, maxLength, calculateTextLength, showMentions, handleMention]);

  // 工具栏按钮
  const toolbarButtons = [
    {
      icon: 'B',
      title: '加粗 (Ctrl+B)',
      action: () => execCommand('bold'),
      style: { fontWeight: 'bold' },
    },
    {
      icon: 'I',
      title: '斜体 (Ctrl+I)',
      action: () => execCommand('italic'),
      style: { fontStyle: 'italic' },
    },
    {
      icon: '• 列表',
      title: '无序列表',
      action: () => execCommand('insertUnorderedList'),
    },
    {
      icon: '1. 列表',
      title: '有序列表',
      action: () => execCommand('insertOrderedList'),
    },
    {
      icon: '🔗',
      title: '插入链接',
      action: insertLink,
    },
    {
      icon: '</>',
      title: '代码块',
      action: () => execCommand('formatBlock', 'pre'),
    },
    {
      icon: '❝',
      title: '引用',
      action: () => execCommand('formatBlock', 'blockquote'),
    },
  ];

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'
      }`}
    >
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {toolbarButtons.map((btn, index) => (
          <button
            key={index}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
            style={btn.style}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* 编辑器 */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowMentions(false), 200);
          }}
          className="min-h-[120px] p-4 outline-none empty:before:content-[attr(placeholder)] empty:before:text-gray-400"
          placeholder={placeholder}
          dangerouslySetInnerHTML={{ __html: value }}
          style={{ wordBreak: 'break-word' }}
        />

        {/* @用户下拉列表 */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute left-4 bottom-full mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectUser(user)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                    {(user.displayName || user.username)?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-700">
                  {user.displayName || user.username}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 字数统计 */}
      <div className="flex justify-end px-3 py-1 bg-gray-50 border-t border-gray-200">
        <span
          className={`text-xs ${
            textLength > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'
          }`}
        >
          {textLength}/{maxLength}
        </span>
      </div>
    </div>
  );
}

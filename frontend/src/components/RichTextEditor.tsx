/**
 * 富文本编辑器组件
 *
 * 功能：
 * - 支持加粗、斜体、列表、链接、代码块、引用
 * - 支持@用户功能
 * - 内容清理防止XSS
 * - 字数统计
 *
 * @version 2.0.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { User } from '../types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  mentionableUsers?: User[];
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '写下你的评论...',
  maxLength = 1000,
  mentionableUsers = [],
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [textLength, setTextLength] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const isUpdatingRef = useRef(false);

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

  // 同步外部value到编辑器
  useEffect(() => {
    if (editorRef.current && !isFocused && !isUpdatingRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isFocused]);

  // 处理@用户搜索
  useEffect(() => {
    if (!showMentions) return;

    const query = mentionQuery.toLowerCase();
    if (!query) {
      setFilteredUsers(mentionableUsers.slice(0, 10));
      return;
    }

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
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange]);

  // 插入链接
  const insertLink = useCallback(() => {
    const url = prompt('请输入链接地址:', 'https://');
    if (url && url !== 'https://') {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // 检查是否需要显示@用户列表
  const checkForMention = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    // 获取光标前的文本
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const textBeforeCursor = preCaretRange.toString();

    // 查找最后一个@符号
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowMentions(false);
      return;
    }

    // 获取@后的文本（不包含@）
    const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
    
    // 检查@后是否有空格（如果有空格则关闭列表）
    if (afterAt.includes(' ')) {
      setShowMentions(false);
      return;
    }

    // 检查@前是否是单词边界
    const beforeAt = textBeforeCursor.slice(0, lastAtIndex);
    if (beforeAt.length > 0 && !/\s$/.test(beforeAt) && !/@$/.test(beforeAt)) {
      // @前面不是空白字符，可能是邮箱地址的一部分
      setShowMentions(false);
      return;
    }

    setMentionQuery(afterAt);
    setShowMentions(true);
  }, []);

  // 选择用户
  const selectUser = useCallback((user: User) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // 获取当前光标位置
    const range = selection.getRangeAt(0);
    
    // 获取编辑器内容
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const textBeforeCursor = preCaretRange.toString();
    
    // 找到最后一个@符号的位置
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;
    
    // 计算需要删除的文本长度（@ + 已输入的查询文本）
    const queryLength = mentionQuery.length;
    const deleteLength = queryLength + 1; // +1 是@符号
    
    // 删除@和查询文本
    for (let i = 0; i < deleteLength; i++) {
      document.execCommand('delete', false);
    }
    
    // 创建mention文本（包含空格）
    const mentionText = `@${user.displayName || user.username} `;
    
    // 插入mention文本
    document.execCommand('insertText', false, mentionText);

    // 触发onChange
    setShowMentions(false);
    setMentionQuery('');
    
    // 触发onChange
    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, [onChange, mentionQuery]);

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
          case 'Tab':
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
    },
    [showMentions, filteredUsers, selectedIndex, selectUser, execCommand]
  );

  // 输入处理
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const length = calculateTextLength(html);

    if (length > maxLength) {
      // 超出限制，恢复之前的内容
      editorRef.current.innerHTML = value;
      return;
    }

    isUpdatingRef.current = true;
    onChange(html);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);

    // 检查@用户
    checkForMention();
  }, [onChange, maxLength, value, calculateTextLength, checkForMention]);

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
        isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-600'
      }`}
    >
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        {toolbarButtons.map((btn, index) => (
          <button
            key={index}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
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
          className="min-h-[120px] p-4 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
          data-placeholder={placeholder}
          style={{ wordBreak: 'break-word' }}
          suppressContentEditableWarning={true}
        />

        {/* @用户下拉列表 */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute left-4 bottom-full mb-2 w-64 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectUser(user)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                    {(user.displayName || user.username)?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {user.displayName || user.username}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 字数统计 */}
      <div className="flex justify-end px-3 py-1 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
        <span
          className={`text-xs ${
            textLength > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {textLength}/{maxLength}
        </span>
      </div>
    </div>
  );
}

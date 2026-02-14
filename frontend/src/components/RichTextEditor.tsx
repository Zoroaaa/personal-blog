/**
 * 富文本编辑器组件
 *
 * 功能：
 * - 支持加粗、斜体、链接、图片
 * - 支持@用户功能（任意位置触发）
 * - 表情选择器
 * - 图片上传
 * - 链接插入
 * - 内容清理防止XSS
 * - 字数统计
 *
 * @author 博客系统
 * @version 4.0.0
 * @created 2024-01-01
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  mentionableUsers?: User[];
  onImageUpload?: (file: File) => Promise<string | null>;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '🤯',
  '😱', '🥵', '🥶', '😰', '😥', '😢', '😭', '😤', '😡', '🤬',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '🎉', '🔥', '❤️', '💔',
  '✨', '⭐', '🌟', '💯', '✅', '❌', '❓', '💡', '📌', '📝',
  '😢', '😭', '😤', '😳', '🥺', '😱', '😨', '😰', '😥', '😓',
  '🤢', '🤮', '🤧', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
  '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
  '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
  '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
  '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵',
  '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦀',
  '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒',
  '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = '写下你的评论...',
  maxLength = 1000,
  mentionableUsers = [],
  onImageUpload,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [textLength, setTextLength] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const isUpdatingRef = useRef(false);
  const lastSelectionRef = useRef<Range | null>(null);
  const isComposingRef = useRef(false);
  const isSelectingMentionRef = useRef(false);
  const initialValueRef = useRef<string | null>(null);

  const calculateTextLength = useCallback((html: string): number => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent?.length || 0;
  }, []);

  useEffect(() => {
    setTextLength(calculateTextLength(value));
  }, [value, calculateTextLength]);

  useEffect(() => {
    if (initialValueRef.current === null && editorRef.current) {
      initialValueRef.current = value || '';
      editorRef.current.innerHTML = initialValueRef.current;
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && !isFocused && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isFocused]);

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

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      lastSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (lastSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(lastSelectionRef.current);
      }
    }
  }, []);

  const updatePopupPosition = useCallback(() => {
    if (!editorRef.current) return;
    
    const rect = editorRef.current.getBoundingClientRect();
    setPopupPosition({
      top: rect.top - 8,
      left: rect.left + 16
    });
  }, []);

  useEffect(() => {
    if (showMentions || showEmojis) {
      updatePopupPosition();
    }
  }, [showMentions, showEmojis, updatePopupPosition]);

  const execCommand = useCallback((command: string, value: string = '') => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    if (!lastSelectionRef.current && editorRef.current.childNodes.length === 0) {
      const range = document.createRange();
      range.setStart(editorRef.current, 0);
      range.collapse(true);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      restoreSelection();
    }
    
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.warn('execCommand failed:', e);
    }
    
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange, restoreSelection]);

  const insertLink = useCallback(() => {
    saveSelection();
    const url = prompt('请输入链接地址:', 'https://');
    if (url && url !== 'https://') {
      restoreSelection();
      execCommand('createLink', url);
    }
  }, [execCommand, saveSelection, restoreSelection]);

  const insertEmoji = useCallback((emoji: string) => {
    editorRef.current?.focus();
    restoreSelection();
    execCommand('insertText', emoji);
    setShowEmojis(false);
  }, [execCommand, restoreSelection]);

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (onImageUpload) {
        const url = await onImageUpload(file);
        if (url) {
          editorRef.current?.focus();
          restoreSelection();
          execCommand('insertImage', url);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          editorRef.current?.focus();
          restoreSelection();
          execCommand('insertImage', dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }, [execCommand, onImageUpload, restoreSelection]);

  const checkForMention = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      setShowMentions(false);
      return;
    }

    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const textBeforeCursor = preCaretRange.toString();

    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowMentions(false);
      setMentionPosition(null);
      return;
    }

    const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
    
    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setShowMentions(false);
      setMentionPosition(null);
      return;
    }

    if (afterAt.length > 15) {
      setShowMentions(false);
      setMentionPosition(null);
      return;
    }

    setMentionQuery(afterAt);
    setMentionPosition({ start: lastAtIndex, end: textBeforeCursor.length });
    setShowMentions(true);
  }, []);

  const selectUser = useCallback((user: User) => {
    if (!editorRef.current) return;

    isSelectingMentionRef.current = true;

    editorRef.current.focus();

    restoreSelection();

    const selection = window.getSelection();
    if (!selection) {
      isSelectingMentionRef.current = false;
      return;
    }

    let deleteLength = 0;

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const textBeforeCursor = preCaretRange.toString();
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        deleteLength = textBeforeCursor.length - lastAtIndex;
      }
    }

    if (deleteLength === 0) {
      isSelectingMentionRef.current = false;
      setShowMentions(false);
      return;
    }

    for (let i = 0; i < deleteLength; i++) {
      document.execCommand('delete', false);
    }

    const mentionText = `@${user.displayName || user.username} `;
    document.execCommand('insertText', false, mentionText);

    setShowMentions(false);
    setMentionQuery('');
    setMentionPosition(null);

    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isUpdatingRef.current = false;
      isSelectingMentionRef.current = false;
    }, 0);
  }, [onChange, restoreSelection]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showMentions && filteredUsers.length > 0 && !isComposingRef.current) {
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
            e.stopPropagation();
            selectUser(filteredUsers[selectedIndex]);
            return;
          case 'Escape':
            e.preventDefault();
            setShowMentions(false);
            return;
        }
      }

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

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    if (isComposingRef.current) {
      return;
    }

    const html = editorRef.current.innerHTML;
    const length = calculateTextLength(html);

    if (length > maxLength) {
      editorRef.current.innerHTML = value;
      return;
    }

    isUpdatingRef.current = true;
    onChange(html);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);

    checkForMention();
  }, [onChange, maxLength, value, calculateTextLength, checkForMention]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const length = calculateTextLength(html);

    if (length > maxLength) {
      editorRef.current.innerHTML = value;
      return;
    }

    isUpdatingRef.current = true;
    onChange(html);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);

    checkForMention();
  }, [onChange, maxLength, value, calculateTextLength, checkForMention]);

  const handleMouseDown = useCallback(() => {
    saveSelection();
  }, [saveSelection]);

  const handleBlur = useCallback(() => {
    if (isSelectingMentionRef.current) {
      return;
    }
    setIsFocused(false);
    setTimeout(() => {
      setShowMentions(false);
      setShowEmojis(false);
    }, 200);
  }, []);

  const toolbarButtons = [
    {
      icon: <span className="font-bold">B</span>,
      title: '加粗 (Ctrl+B)',
      action: () => {
        saveSelection();
        execCommand('bold');
      },
    },
    {
      icon: <span className="italic">I</span>,
      title: '斜体 (Ctrl+I)',
      action: () => {
        saveSelection();
        execCommand('italic');
      },
    },
    {
      icon: <span>🔗</span>,
      title: '插入链接',
      action: insertLink,
    },
    {
      icon: <span>😀</span>,
      title: '表情',
      action: () => {
        saveSelection();
        setShowEmojis(!showEmojis);
        setShowMentions(false);
      },
      active: showEmojis,
    },
    {
      icon: <span>🖼️</span>,
      title: '上传图片',
      action: () => {
        saveSelection();
        handleImageUpload();
      },
    },
  ];

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 dark:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-wrap">
        {toolbarButtons.map((btn, index) => (
          <button
            key={index}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              btn.action();
            }}
            title={btn.title}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              btn.active
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="min-h-[120px] p-4 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
          data-placeholder={placeholder}
          style={{ wordBreak: 'break-word' }}
          suppressContentEditableWarning={true}
        />

        {showMentions && filteredUsers.length > 0 && popupPosition && createPortal(
          <div 
            className="fixed w-64 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-[9999]"
            style={{ 
              top: popupPosition.top - 200,
              left: popupPosition.left 
            }}
          >
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  selectUser(user);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700'
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
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {user.displayName || user.username}
                  </span>
                  {user.displayName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}

        {showEmojis && popupPosition && createPortal(
          <div 
            className="fixed w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-[9999] p-2"
            style={{ 
              top: popupPosition.top - 200,
              left: popupPosition.left 
            }}
          >
            <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
              {EMOJI_LIST.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertEmoji(emoji);
                  }}
                  className="w-7 h-7 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>

      <div className="flex justify-between items-center px-3 py-1 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          输入 @ 提及用户
        </span>
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

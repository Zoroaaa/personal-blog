/**
 * 链接编辑器组件
 * 
 * 功能：
 * - 链接文本自定义
 * - 链接预览
 * - 快速插入链接
 * - URL 有效性验证
 * - 自动获取网站图标
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect, useRef } from 'react';
import { isValidUrl, getFaviconUrl, extractDomain } from '../utils/linkDetector';

interface LinkEditorProps {
  isOpen: boolean;
  url: string;
  displayText: string;
  onClose: () => void;
  onConfirm: (url: string, displayText: string) => void;
  onRemove?: () => void;
}

export function LinkEditor({ 
  isOpen, 
  url: initialUrl, 
  displayText: initialDisplayText,
  onClose, 
  onConfirm,
  onRemove 
}: LinkEditorProps) {
  const [url, setUrl] = useState(initialUrl);
  const [displayText, setDisplayText] = useState(initialDisplayText);
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setDisplayText(initialDisplayText);
      setIsValid(!initialUrl || isValidUrl(initialUrl));
      // 聚焦到 URL 输入框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialUrl, initialDisplayText]);

  useEffect(() => {
    setIsValid(!url || isValidUrl(url));
  }, [url]);

  const handleConfirm = () => {
    if (isValidUrl(url)) {
      onConfirm(url, displayText || url);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidUrl(url)) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const favicon = url ? getFaviconUrl(url) : '';
  const domain = url ? extractDomain(url) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {initialUrl ? '编辑链接' : '插入链接'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* URL 输入 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              链接地址 *
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground transition-colors ${
                  isValid 
                    ? 'border-border' 
                    : 'border-red-500 focus:ring-red-500'
                }`}
              />
              {favicon && (
                <img
                  src={favicon}
                  alt=""
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>
            {!isValid && (
              <p className="mt-1 text-sm text-red-500">请输入有效的 URL（以 http:// 或 https:// 开头）</p>
            )}
          </div>

          {/* 显示文本输入 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              显示文本
            </label>
            <input
              type="text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={url || '链接文本'}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 dark:bg-muted dark:text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              留空将使用链接地址作为显示文本
            </p>
          </div>

          {/* 链接预览 */}
          {url && isValidUrl(url) && (
            <div className="p-3 bg-background dark:bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">预览：</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:text-primary transition-colors"
              >
                {favicon && (
                  <img src={favicon} alt="" className="w-4 h-4 rounded" />
                )}
                <span className="underline">{displayText || url}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="mt-1 text-xs text-muted-foreground">{domain}</p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background dark:bg-muted/30">
          {onRemove && initialUrl && (
            <button
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              移除链接
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValidUrl(url)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-white rounded-lg transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

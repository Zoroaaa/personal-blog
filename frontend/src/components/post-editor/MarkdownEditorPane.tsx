/**
 * Markdown 编辑内容区
 *
 * 编辑/分屏模式显示 textarea（含内容统计与检测到的链接），预览/分屏模式显示预览
 *
 * @author 博客系统
 */

import type { RefObject } from 'react';
import type { EditorTab } from '../../hooks/useMarkdownEditor';
import { ContentStats } from '../ContentStats';
import { SplitPreview } from '../MarkdownPreview';

interface MarkdownEditorPaneProps {
  content: string;
  onChange: (value: string) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  activeTab: EditorTab;
  importing: boolean;
  detectedLinks: string[];
  onConvertLink: (url: string) => void;
}

export function MarkdownEditorPane({
  content,
  onChange,
  onPaste,
  onKeyDown,
  textareaRef,
  activeTab,
  importing,
  detectedLinks,
  onConvertLink,
}: MarkdownEditorPaneProps) {
  return (
    <div className={`grid gap-4 ${activeTab === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
      {/* 编辑区域 */}
      {activeTab !== 'preview' && (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            disabled={importing}
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm dark:bg-muted dark:text-foreground disabled:opacity-50 resize-y"
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
            <div className="mt-2 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary mb-2">
                检测到 {detectedLinks.length} 个链接，点击转换为 Markdown 格式：
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedLinks.slice(0, 5).map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onConvertLink(url)}
                    className="text-xs px-2 py-1 bg-card text-primary rounded border border-primary/30 hover:bg-primary/10 transition-colors truncate max-w-xs"
                    title={url}
                  >
                    {url.length > 40 ? url.substring(0, 40) + '...' : url}
                  </button>
                ))}
                {detectedLinks.length > 5 && (
                  <span className="text-xs text-muted-foreground py-1">
                    还有 {detectedLinks.length - 5} 个...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 预览区域 */}
      {(activeTab === 'preview' || activeTab === 'split') && (
        <SplitPreview content={content} isVisible={true} />
      )}
    </div>
  );
}
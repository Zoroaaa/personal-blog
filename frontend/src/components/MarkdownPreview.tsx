/**
 * Markdown 实时预览组件
 * 功能：
 * - 实时渲染 Markdown
 * - GitHub 风格样式
 * - 代码高亮
 * - 目录生成
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { getMarkdownComponents, generateToc } from '../utils/markdownRenderer';
import 'highlight.js/styles/github-dark.css';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  showToc?: boolean;
}

export function MarkdownPreview({ content, className = '', showToc = false }: MarkdownPreviewProps) {
  const components = useMemo(() => getMarkdownComponents(), []);
  const toc = useMemo(() => generateToc(content), [content]);

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* 目录侧边栏 */}
      {showToc && toc.length > 0 && (
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-20">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
              目录
            </h4>
            <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
              {toc.map((item, index) => (
                <a
                  key={index}
                  href={`#${item.id}`}
                  className={`block text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                    item.level === 1 ? 'font-medium' : ''
                  }`}
                  style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
          className="markdown-body"
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * 简单的 Markdown 预览（无目录）
 */
export function SimpleMarkdownPreview({ content, className = '' }: Omit<MarkdownPreviewProps, 'showToc'>) {
  const components = useMemo(() => getMarkdownComponents(), []);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
      className={className}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * 分屏预览组件
 */
interface SplitPreviewProps {
  content: string;
  isVisible: boolean;
}

export function SplitPreview({ content, isVisible }: SplitPreviewProps) {
  if (!isVisible) return null;

  const components = useMemo(() => getMarkdownComponents(), []);

  return (
    <div className="h-full overflow-auto bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

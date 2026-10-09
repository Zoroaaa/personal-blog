/**
 * 文章正文区域：目录侧边栏 + Markdown 正文 + 标签。
 */

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { getMarkdownComponents, generateToc } from '../../utils/markdownRenderer';
import type { Post } from '../../types';

// 导入代码高亮样式
import 'highlight.js/styles/github-dark.css';

interface PostContentProps {
  post: Post;
}

export function PostContent({ post }: PostContentProps) {
  const [showToc, setShowToc] = useState(true);

  // 获取 Markdown 组件和目录
  const markdownComponents = useMemo(() => getMarkdownComponents(), []);
  const toc = useMemo(() => generateToc(post.content), [post]);

  return (
    <>
      <div className="flex gap-8">
        {/* 目录侧边栏 */}
        {toc.length > 0 && (
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  目录
                </h4>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowToc(!showToc);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  {showToc ? '收起' : '展开'}
                </button>
              </div>
              {showToc && (
                <nav
                  className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]"
                >
                  {toc.map((item, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const element = document.getElementById(item.id);
                        if (element) {
                          const offset = 120;
                          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                          window.scrollTo({
                            top: elementPosition - offset,
                            behavior: 'smooth'
                          });
                          window.history.replaceState(null, '', `#${item.id}`);
                        }
                      }}
                      className={`block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer bg-transparent border-none ${
                        item.level === 1 ? 'font-medium' : ''
                      }`}
                      style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                    >
                      {item.text}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </aside>
        )}

        {/* 正文内容 */}
        <div className="flex-1 min-w-0">
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* 标签 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-3 py-1 bg-muted text-foreground rounded-full text-sm hover:bg-border cursor-pointer"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
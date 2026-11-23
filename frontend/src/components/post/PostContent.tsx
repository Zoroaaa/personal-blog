/**
 * 文章正文区域：目录（含滚动高亮）+ Markdown 正文 + 标签。
 *
 * 目录交互抽到 TableOfContents：桌面固定侧栏、移动端折叠面板，
 * 本组件只负责编排正文渲染与标签入口。
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { rehypeHighlightPlugin } from '../../utils/markdownPlugins';
import { getMarkdownComponents, generateToc } from '../../utils/markdownRenderer';
import { TableOfContents } from './TableOfContents';
import { ReadingSettings } from './ReadingSettings';
import type { Post } from '../../types';

// 代码高亮样式（markdownRenderer 中代码块固定深色背景）
import 'highlight.js/styles/github-dark.css';

interface PostContentProps {
  post: Post;
}

export function PostContent({ post }: PostContentProps) {
  const markdownComponents = useMemo(() => getMarkdownComponents(), []);
  const toc = useMemo(() => generateToc(post.content), [post.content]);

  return (
    <>
      {/* 阅读设置按钮放在正文区右上角，读者可随时调节字号/行距 */}
      <div className="flex justify-end mb-3">
        <ReadingSettings />
      </div>

      {/* 移动端纵向堆叠（目录面板在正文上方），xl 起横向排列（目录侧栏在左） */}
      <div id="article-content" className="flex flex-col xl:flex-row gap-8">
        {toc.length > 0 && <TableOfContents items={toc} />}

        {/* 正文内容：样式来自 src/styles/markdown.css */}
        <div className="flex-1 min-w-0">
          <div className="max-w-none mb-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlightPlugin]}
              components={markdownComponents}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* 标签：点击可跳转到对应标签的文章列表 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              to={`/tags/${tag.slug}`}
              className="px-3 py-1 bg-muted text-foreground rounded-full text-sm hover:bg-border hover:text-primary transition-colors"
              title={`查看标签「${tag.name}」下的文章`}
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

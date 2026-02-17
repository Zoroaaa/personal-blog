/**
 * Markdown 渲染增强工具
 * 功能：
 * - 链接在新标签页打开
 * - 增强的代码高亮
 * - 表格、任务列表等 GitHub 风格渲染
 *
 * 主题适配规范（v2.0）：
 * - 所有颜色使用语义化 token（text-foreground / text-muted-foreground / bg-card 等）
 * - 代码块区域固定深色背景，保障可读性
 * - 主色调引用使用 text-primary / bg-primary / border-primary
 *
 * @version 2.0.0 - 完整主题适配，保留所有原始功能
 */

import type { Components } from 'react-markdown';

/**
 * 自定义链接组件 - 在新标签页打开
 */
export const LinkComponent: Components['a'] = ({ node, children, href, ...props }) => {
  const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
  const baseClass = "text-primary hover:opacity-80 underline underline-offset-2 transition-opacity";

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass} {...props}>
        {children}
        <svg className="inline-block w-3.5 h-3.5 ml-0.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  return <a href={href} className={baseClass} {...props}>{children}</a>;
};

/**
 * 自定义代码块组件 - 增强的代码高亮
 * 代码块固定深色背景保障可读性，行内代码跟随主题
 */
export const CodeComponent: Components['code'] = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  if (!inline && match) {
    return (
      <div className="relative group my-4">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 rounded-t-lg border-b border-slate-700">
          <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
            className="text-xs text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1"
            title="复制代码"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制
          </button>
        </div>
        <pre className="!mt-0 !rounded-t-none bg-slate-900 text-slate-100 p-4 rounded-b-lg overflow-x-auto">
          <code className={className} {...props}>{children}</code>
        </pre>
      </div>
    );
  }

  return (
    <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono border border-border" {...props}>
      {children}
    </code>
  );
};

/**
 * 从 React children 中提取纯文本
 */
function extractTextFromChildren(children: any): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children?.props?.children) {
    return extractTextFromChildren(children.props.children);
  }
  return String(children || '');
}

/**
 * 生成 slug id
 * 支持中文、英文、数字等多种字符
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 自定义标题组件 - 添加锚点链接
 */
export const HeadingComponent = (level: number): Components[`h${1 | 2 | 3 | 4 | 5 | 6}`] => {
  return ({ node, children, ...props }: any) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    const textContent = extractTextFromChildren(children);
    const id = generateSlug(textContent);

    const sizeClasses = {
      1: 'text-3xl mt-8 mb-4',
      2: 'text-2xl mt-6 mb-3',
      3: 'text-xl mt-5 mb-2',
      4: 'text-lg mt-4 mb-2',
      5: 'text-lg mt-4 mb-2',
      6: 'text-lg mt-4 mb-2',
    };

    return (
      <Tag
        id={id}
        className={`group flex items-center gap-2 text-foreground font-bold scroll-mt-20 ${sizeClasses[level as keyof typeof sizeClasses]}`}
        {...props}
      >
        {children}
        <a
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            const offset = 100;
            const element = document.getElementById(id);
            if (element) {
              const elementPosition = element.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
              window.location.hash = id;
            }
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity cursor-pointer"
          title="复制链接"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </a>
      </Tag>
    );
  };
};

/**
 * 自定义表格组件
 */
export const TableComponent: Components['table'] = ({ node, children, ...props }) => (
  <div className="overflow-x-auto my-6">
    <table className="min-w-full border-collapse border border-border" {...props}>{children}</table>
  </div>
);

export const TableHeadComponent: Components['thead'] = ({ node, children, ...props }) => (
  <thead className="bg-muted" {...props}>{children}</thead>
);

export const TableRowComponent: Components['tr'] = ({ node, children, ...props }) => (
  <tr className="border-b border-border hover:bg-accent/50 transition-colors" {...props}>{children}</tr>
);

export const TableCellComponent: Components['td'] = ({ node, children, ...props }) => (
  <td className="px-4 py-3 border border-border text-foreground" {...props}>{children}</td>
);

export const TableHeaderCellComponent: Components['th'] = ({ node, children, ...props }) => (
  <th className="px-4 py-3 border border-border text-left font-semibold text-foreground" {...props}>{children}</th>
);

/**
 * 自定义引用块组件
 */
export const BlockquoteComponent: Components['blockquote'] = ({ node, children, ...props }) => (
  <blockquote className="border-l-4 border-primary pl-4 py-2 my-6 bg-primary/5 rounded-r-lg text-muted-foreground italic" {...props}>
    {children}
  </blockquote>
);

/**
 * 自定义列表组件
 */
export const ListComponent: Components['ul'] = ({ node, children, ...props }) => (
  <ul className="list-disc list-inside my-4 space-y-1 text-foreground" {...props}>{children}</ul>
);

export const OrderedListComponent: Components['ol'] = ({ node, children, ...props }) => (
  <ol className="list-decimal list-inside my-4 space-y-1 text-foreground" {...props}>{children}</ol>
);

export const ListItemComponent: Components['li'] = ({ node, children, ...props }) => (
  <li className="ml-4" {...props}>{children}</li>
);

/**
 * 自定义任务列表组件
 */
export const TaskListComponent: Components['input'] = ({ node, checked, ...props }: any) => (
  <input
    type="checkbox"
    checked={checked}
    readOnly
    className="mr-2 w-4 h-4 accent-primary rounded border-border focus:ring-primary/50"
    {...props}
  />
);

/**
 * 自定义段落组件
 */
export const ParagraphComponent: Components['p'] = ({ node, children, ...props }) => (
  <p className="my-4 leading-relaxed text-foreground" {...props}>{children}</p>
);

/**
 * 自定义分割线组件
 */
export const HorizontalRuleComponent: Components['hr'] = ({ node, ...props }) => (
  <hr className="my-8 border-t-2 border-border" {...props} />
);

/**
 * 自定义图片组件
 */
export const ImageComponent: Components['img'] = ({ node, src, alt, ...props }) => (
  <figure className="my-6">
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-lg shadow-md mx-auto border border-border"
      loading="lazy"
      {...props}
    />
    {alt && (
      <figcaption className="text-center text-sm text-muted-foreground mt-2">{alt}</figcaption>
    )}
  </figure>
);

/**
 * 获取所有自定义组件
 */
export function getMarkdownComponents(): Components {
  return {
    a: LinkComponent,
    code: CodeComponent,
    h1: HeadingComponent(1),
    h2: HeadingComponent(2),
    h3: HeadingComponent(3),
    h4: HeadingComponent(4),
    h5: HeadingComponent(5),
    h6: HeadingComponent(6),
    table: TableComponent,
    thead: TableHeadComponent,
    tr: TableRowComponent,
    td: TableCellComponent,
    th: TableHeaderCellComponent,
    blockquote: BlockquoteComponent,
    ul: ListComponent,
    ol: OrderedListComponent,
    li: ListItemComponent,
    input: TaskListComponent,
    p: ParagraphComponent,
    hr: HorizontalRuleComponent,
    img: ImageComponent,
  };
}

/**
 * 目录项类型
 */
export interface TocItem {
  level: number;
  text: string;
  id: string;
}

/**
 * 生成目录（Table of Contents）
 */
export function generateToc(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = generateSlug(text);
    toc.push({ level, text, id });
  }

  return toc;
}

/**
 * markdownComponents - 向后兼容别名
 * 等同于 getMarkdownComponents() 的返回值
 */
export const markdownComponents: Components = {
  a: LinkComponent,
  code: CodeComponent,
  h1: HeadingComponent(1),
  h2: HeadingComponent(2),
  h3: HeadingComponent(3),
  h4: HeadingComponent(4),
  h5: HeadingComponent(5),
  h6: HeadingComponent(6),
  table: TableComponent,
  thead: TableHeadComponent,
  tr: TableRowComponent,
  td: TableCellComponent,
  th: TableHeaderCellComponent,
  blockquote: BlockquoteComponent,
  ul: ListComponent,
  ol: OrderedListComponent,
  li: ListItemComponent,
  input: TaskListComponent,
  p: ParagraphComponent,
  hr: HorizontalRuleComponent,
  img: ImageComponent,
};

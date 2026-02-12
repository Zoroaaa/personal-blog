/**
 * Markdown 渲染增强工具
 * 功能：
 * - 链接在新标签页打开
 * - 增强的代码高亮
 * - 表格、任务列表等 GitHub 风格渲染
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { Components } from 'react-markdown';

/**
 * 自定义链接组件 - 在新标签页打开
 */
export const LinkComponent: Components['a'] = ({ node, children, href, ...props }) => {
  const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
  
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
        {...props}
      >
        {children}
        <svg 
          className="inline-block w-3.5 h-3.5 ml-0.5 opacity-70" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
          />
        </svg>
      </a>
    );
  }
  
  return (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
      {...props}
    >
      {children}
    </a>
  );
};

/**
 * 自定义代码块组件 - 增强的代码高亮
 */
export const CodeComponent: Components['code'] = ({ 
  node, 
  inline, 
  className, 
  children,
  ...props 
}: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  if (!inline && match) {
    return (
      <div className="relative group my-4">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 rounded-t-lg border-b border-gray-700">
          <span className="text-xs text-gray-400 uppercase font-medium">
            {language}
          </span>
          <button
            onClick={() => {
              const code = String(children).replace(/\n$/, '');
              navigator.clipboard.writeText(code);
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            title="复制代码"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制
          </button>
        </div>
        <pre className="!mt-0 !rounded-t-none bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }
  
  return (
    <code 
      className="bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    >
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
    // 保留中文、英文、数字、空格和连字符，其他特殊字符替换为空格
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
    // 将空格替换为连字符
    .replace(/\s+/g, '-')
    // 多个连字符合并为一个
    .replace(/-+/g, '-')
    // 移除开头和结尾的连字符
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
        className={`group flex items-center gap-2 text-gray-900 dark:text-white font-bold scroll-mt-20 ${sizeClasses[level as keyof typeof sizeClasses]}`}
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
              window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
              });
              window.location.hash = id;
            }
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity cursor-pointer"
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
export const TableComponent: Components['table'] = ({ node, children, ...props }) => {
  return (
    <div className="overflow-x-auto my-6">
      <table 
        className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeadComponent: Components['thead'] = ({ node, children, ...props }) => {
  return (
    <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
      {children}
    </thead>
  );
};

export const TableRowComponent: Components['tr'] = ({ node, children, ...props }) => {
  return (
    <tr className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" {...props}>
      {children}
    </tr>
  );
};

export const TableCellComponent: Components['td'] = ({ node, children, ...props }) => {
  return (
    <td className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </td>
  );
};

export const TableHeaderCellComponent: Components['th'] = ({ node, children, ...props }) => {
  return (
    <th className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-left font-semibold text-gray-900 dark:text-white" {...props}>
      {children}
    </th>
  );
};

/**
 * 自定义引用块组件
 */
export const BlockquoteComponent: Components['blockquote'] = ({ node, children, ...props }) => {
  return (
    <blockquote 
      className="border-l-4 border-blue-500 pl-4 py-2 my-6 bg-blue-50 dark:bg-blue-900/10 rounded-r-lg text-gray-700 dark:text-gray-300 italic"
      {...props}
    >
      {children}
    </blockquote>
  );
};

/**
 * 自定义列表组件
 */
export const ListComponent: Components['ul'] = ({ node, children, ...props }) => {
  return (
    <ul className="list-disc list-inside my-4 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </ul>
  );
};

export const OrderedListComponent: Components['ol'] = ({ node, children, ...props }) => {
  return (
    <ol className="list-decimal list-inside my-4 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </ol>
  );
};

export const ListItemComponent: Components['li'] = ({ node, children, ...props }) => {
  return (
    <li className="ml-4" {...props}>
      {children}
    </li>
  );
};

/**
 * 自定义任务列表组件
 */
export const TaskListComponent: Components['input'] = ({ node, checked, ...props }: any) => {
  return (
    <input 
      type="checkbox" 
      checked={checked}
      readOnly
      className="mr-2 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
      {...props}
    />
  );
};

/**
 * 自定义段落组件
 */
export const ParagraphComponent: Components['p'] = ({ node, children, ...props }) => {
  return (
    <p className="my-4 leading-relaxed text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </p>
  );
};

/**
 * 自定义分割线组件
 */
export const HorizontalRuleComponent: Components['hr'] = ({ node, ...props }) => {
  return (
    <hr className="my-8 border-t-2 border-gray-200 dark:border-gray-700" {...props} />
  );
};

/**
 * 自定义图片组件
 */
export const ImageComponent: Components['img'] = ({ node, src, alt, ...props }) => {
  return (
    <figure className="my-6">
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full h-auto rounded-lg shadow-md mx-auto"
        loading="lazy"
        {...props}
      />
      {alt && (
        <figcaption className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {alt}
        </figcaption>
      )}
    </figure>
  );
};

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
    // 使用相同的 slug 生成逻辑
    const id = generateSlug(text);
    
    toc.push({ level, text, id });
  }
  
  return toc;
}

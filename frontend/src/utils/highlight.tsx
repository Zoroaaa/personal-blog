/**
 * 搜索关键词高亮：把文本中命中的查询词包成 <mark>，让匹配原因一眼可见。
 *
 * 约束：
 * - 查询词按空格拆分，逐段做「不区分大小写」匹配；正则元字符先转义，避免注入；
 * - 返回 React 节点数组而非 HTML 字符串，不经过 dangerouslySetInnerHTML；
 * - 关键词为空或文本为空时原样返回，避免无意义渲染。
 */

import type { ReactNode } from 'react';

/** 转义正则特殊字符，防止用户输入被当作正则执行 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightText(text: string, query: string): ReactNode {
  if (!text) return text;
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return text;

  // 长词优先，避免短词先把长词拆开（如 "React" 与 "React Router"）
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${sorted.map(escapeRegExp).join('|')})`, 'gi');

  return text.split(pattern).map((part, index) => {
    const isMatch = sorted.some((term) => term.toLowerCase() === part.toLowerCase());
    return isMatch ? (
      <mark key={index} className="bg-primary/15 text-primary rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    );
  });
}

/**
 * HTML 净化工具（集中式出口）
 *
 * 用于所有把外部 HTML 注入 DOM 的场景，采用 DOMPurify 白名单策略：
 * - 仅允许常见富文本格式标签/属性
 * - 禁止 script/iframe/style 等危险标签
 * - 禁止 on* 事件属性（DOMPurify 默认）
 * - 禁止 javascript: 等危险协议（DOMPurify 默认）
 *
 * @version 1.0.0
 */
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div',
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
  'a', 'img',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class',
];

/**
 * 白名单净化外部 HTML 字符串，返回可安全渲染的 HTML。
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export default sanitizeHtml;
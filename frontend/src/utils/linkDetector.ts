/**
 * 链接检测与处理工具
 * 功能：
 * - 自动识别 HTTP/HTTPS URL
 * - 链接预览数据获取
 * - 链接文本自定义
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

export interface LinkInfo {
  url: string;
  displayText: string;
  title?: string;
  description?: string;
  favicon?: string;
  image?: string;
}

// URL 正则表达式
const URL_REGEX = /(https?:\/\/[^\s<>)"]+)/gi;

// 简单的 Markdown 链接正则
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s<>)"]+)\)/gi;

/**
 * 检测文本中的 URL
 */
export function detectUrls(text: string): string[] {
  const urls: string[] = [];
  let match;
  
  // 重置正则
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    // 检查是否已经是 Markdown 链接的一部分
    const beforeMatch = text.substring(Math.max(0, match.index - 1), match.index);
    const afterMatch = text.substring(match.index + match[0].length, match.index + match[0].length + 1);
    
    // 跳过已经是 Markdown 链接的 URL
    if (beforeMatch === '(' && afterMatch === ')') {
      continue;
    }
    
    urls.push(match[0]);
  }
  
  return [...new Set(urls)]; // 去重
}

/**
 * 检测 Markdown 格式的链接
 */
export function detectMarkdownLinks(text: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  let match;
  
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  
  while ((match = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    links.push({
      text: match[1],
      url: match[2]
    });
  }
  
  return links;
}

/**
 * 将纯文本 URL 转换为 Markdown 链接
 */
export function convertUrlsToMarkdown(
  text: string, 
  urlMap: Map<string, string> = new Map()
): string {
  return text.replace(URL_REGEX, (url) => {
    // 检查是否已经是 Markdown 链接
    const displayText = urlMap.get(url) || url;
    return `[${displayText}](${url})`;
  });
}

/**
 * 验证 URL 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 获取链接预览数据（使用 fetch 获取 Open Graph 数据）
 * 注意：由于 CORS 限制，实际项目中可能需要后端代理
 */
export async function fetchLinkPreview(url: string): Promise<Partial<LinkInfo>> {
  try {
    // 尝试获取页面内容
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors', // 注意：no-cors 模式下无法读取响应内容
      headers: {
        'Accept': 'text/html',
      }
    });
    
    // 由于 CORS 限制，这里返回基本信息
    const urlObj = new URL(url);
    return {
      url,
      displayText: url,
      title: urlObj.hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
    };
  } catch (error) {
    console.warn('Failed to fetch link preview:', error);
    return {
      url,
      displayText: url,
    };
  }
}

/**
 * 生成链接的 favicon URL
 */
export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/**
 * 提取域名
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * 高亮文本中的 URL
 */
export function highlightUrls(text: string): string {
  return text.replace(URL_REGEX, (url) => {
    return `<mark class="bg-blue-100 text-blue-800 px-1 rounded">${url}</mark>`;
  });
}

/**
 * 链接编辑器状态
 */
export interface LinkEditorState {
  isOpen: boolean;
  url: string;
  displayText: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * 在文本中插入或更新 Markdown 链接
 */
export function insertOrUpdateMarkdownLink(
  text: string,
  url: string,
  displayText: string,
  selectionStart: number,
  selectionEnd: number
): { newText: string; cursorPosition: number } {
  const before = text.substring(0, selectionStart);
  const selected = text.substring(selectionStart, selectionEnd);
  const after = text.substring(selectionEnd);
  
  // 使用用户输入的显示文本或选中的文本
  const linkText = displayText || selected || url;
  const markdownLink = `[${linkText}](${url})`;
  
  const newText = before + markdownLink + after;
  const cursorPosition = selectionStart + markdownLink.length;
  
  return { newText, cursorPosition };
}

/**
 * 从 Markdown 链接中提取信息
 */
export function extractLinkFromMarkdown(
  text: string, 
  position: number
): { text: string; url: string; start: number; end: number } | null {
  // 查找包含位置的 Markdown 链接
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  let match;
  
  while ((match = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    if (position >= match.index && position <= match.index + match[0].length) {
      return {
        text: match[1],
        url: match[2],
        start: match.index,
        end: match.index + match[0].length
      };
    }
  }
  
  return null;
}

/**
 * 共享 markdown 高亮插件（自建轻量版）
 *
 * 为什么不用 rehype-highlight：它在模块顶部静态 `import { common } from 'lowlight'`，
 * common 是 highlight.js ~40 种语言的全集（与 react-markdown 合成 ≈340KB 共享 chunk，
 * 公开文章页每个读者都要下载）；即使传 languages 白名单，common 也无法被 tree-shake。
 * 这里直接用 createLowlight 注册白名单语言，未注册语言的代码块照常渲染为纯 <code>（可接受降级）。
 */
import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// key 同时承担别名注册（js/ts/sh...）
const GRAMMARS: Record<string, any> = {
  javascript,
  js: javascript,
  typescript,
  ts: typescript,
  python,
  py: python,
  bash,
  sh: bash,
  shell: bash,
  sql,
  json,
  css,
  xml,
  html: xml,
  java,
  go,
  golang: go,
  rust,
  rs: rust,
  yaml,
  yml: yaml,
  markdown,
  md: markdown,
  c,
  cpp,
};

const lowlight = createLowlight(GRAMMARS);
const REGISTERED = new Set(Object.keys(GRAMMARS));

/** 递归收集 hast 节点纯文本（code 元素的子树） */
function toPlainText(node: any): string {
  if (node.type === 'text') return node.value || '';
  if (Array.isArray(node.children)) {
    return node.children.map(toPlainText).join('');
  }
  return '';
}

/**
 * rehype 插件（transformer 形态，可直接放入 rehypePlugins 数组）：
 * 命中 pre>code 且语言在白名单内时用 lowlight 高亮，其余原样保留。
 * 高亮异常不阻塞渲染，降级为纯代码块。
 */
export function rehypeHighlightPlugin(tree: any): void {
  walk(tree);

  function walk(node: any) {
    if (node.type === 'element' && node.tagName === 'pre' && Array.isArray(node.children)) {
      const code = node.children.find(
        (c: any) => c.type === 'element' && c.tagName === 'code'
      );
      if (code) {
        const classNames: string[] = Array.isArray(code.properties?.className)
          ? code.properties.className
          : [];
        const langClass = classNames.find((c) => String(c).startsWith('language-'));
        const lang = langClass ? String(langClass).slice('language-'.length).toLowerCase() : '';
        if (lang && REGISTERED.has(lang)) {
          try {
            const result = lowlight.highlight(lang, toPlainText(code));
            code.children = result.children as any;
            code.properties = { ...code.properties, className: ['hljs', `language-${lang}`] };
          } catch {
            // 高亮失败时保留原内容，文章可读性优先
          }
        }
        return;
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }
}

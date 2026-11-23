/**
 * 文章目录：桌面端固定侧栏 + 移动端可折叠面板，带滚动高亮（scroll spy）。
 *
 * 约束：
 * - 目录项 id 与 markdownRenderer.generateToc 生成的 slug 保持一致；
 * - 滚动监听用 rAF 节流，取「视口顶部之下 120px」以上的最后一个标题为当前节；
 * - 折叠交互不影响正文宽度；aria-current 标注当前节，便于无障碍访问。
 */

import { useEffect, useRef, useState } from 'react';
import type { TocItem } from '../../utils/markdownRenderer';

const ACTIVE_OFFSET = 120;

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');
  const [expanded, setExpanded] = useState(true);
  const ticking = useRef(false);

  useEffect(() => {
    if (items.length === 0) return;

    const updateActive = () => {
      // 找到最后一个已经滚过激活线的标题；都在激活线下方时默认高亮第一项
      let current = items[0].id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) {
          current = item.id;
        } else if (el && el.getBoundingClientRect().top > ACTIVE_OFFSET) {
          break;
        }
      }
      setActiveId(current);
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  const jumpTo = (item: TocItem) => {
    const element = document.getElementById(item.id);
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - ACTIVE_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
    window.history.replaceState(null, '', `#${item.id}`);
    setActiveId(item.id);
  };

  const list = (
    <nav className="space-y-1 overflow-y-auto max-h-[min(60vh,calc(100vh-200px))]">
      {items.map((item, index) => (
        <button
          key={`${item.id}-${index}`}
          onClick={() => jumpTo(item)}
          aria-current={activeId === item.id ? 'location' : undefined}
          className={`block w-full text-left text-sm py-1 cursor-pointer bg-transparent border-none transition-colors ${
            activeId === item.id
              ? 'text-primary font-medium'
              : 'text-muted-foreground hover:text-primary'
          } ${item.level === 1 ? 'font-medium' : ''}`}
          style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );

  if (items.length === 0) return null;

  return (
    <>
      {/* 桌面：固定侧栏 */}
      <aside className="hidden xl:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">目录</h4>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              {expanded ? '收起' : '展开'}
            </button>
          </div>
          {expanded && list}
        </div>
      </aside>

      {/* 移动端 / 平板：正文上方的折叠面板 */}
      <div className="xl:hidden mb-6 bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          aria-expanded={expanded}
        >
          <span>本页目录（{items.length} 节）</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expanded && <div className="px-4 pb-3">{list}</div>}
      </div>
    </>
  );
}

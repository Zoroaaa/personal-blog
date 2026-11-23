/**
 * 阅读设置：字号 / 行距调节，结果写入 CSS 变量并持久化到 localStorage。
 *
 * 约束：
 * - 只影响文章正文容器（#article-content），不改动全局 body，避免影响后台与导航；
 * - 设置存 localStorage，刷新后保留；隐私模式写入失败时静默降级；
 * - 提供「恢复默认」，避免用户调乱后找不到回去的路。
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blog_reading_prefs';
const DEFAULTS = { fontSize: 16, lineHeight: 1.8 };

interface ReadingPrefs {
  fontSize: number;
  lineHeight: number;
}

function loadPrefs(): ReadingPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      fontSize: typeof parsed.fontSize === 'number' ? Math.min(22, Math.max(14, parsed.fontSize)) : DEFAULTS.fontSize,
      lineHeight: typeof parsed.lineHeight === 'number' ? Math.min(2.4, Math.max(1.4, parsed.lineHeight)) : DEFAULTS.lineHeight,
    };
  } catch {
    return DEFAULTS;
  }
}

export function ReadingSettings() {
  const [prefs, setPrefs] = useState<ReadingPrefs>(loadPrefs);
  const [open, setOpen] = useState(false);

  // 把偏好写到正文容器的 CSS 变量；markdown.css 用 var(--article-font-size) 等读取
  useEffect(() => {
    const target = document.getElementById('article-content');
    if (target) {
      target.style.setProperty('--article-font-size', `${prefs.fontSize}px`);
      target.style.setProperty('--article-line-height', String(prefs.lineHeight));
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // 隐私模式下写入失败不影响本次会话
    }
  }, [prefs]);

  const update = (patch: Partial<ReadingPrefs>) => setPrefs((prev) => ({ ...prev, ...patch }));

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
        title="阅读设置"
        aria-label="阅读设置"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m-3 8h12M9 13v2m-3 6h12" />
        </svg>
        阅读设置
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-64 bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">阅读设置</h4>
            <button
              onClick={() => setPrefs(DEFAULTS)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              恢复默认
            </button>
          </div>
          <label className="block text-xs text-muted-foreground mb-1">
            字号 <span className="text-foreground">{prefs.fontSize}px</span>
          </label>
          <input
            type="range"
            min={14}
            max={22}
            step={1}
            value={prefs.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="w-full accent-[var(--primary-color)] mb-4"
            aria-label="正文字号"
          />
          <label className="block text-xs text-muted-foreground mb-1">
            行距 <span className="text-foreground">{prefs.lineHeight.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={1.4}
            max={2.4}
            step={0.1}
            value={prefs.lineHeight}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
            className="w-full accent-[var(--primary-color)]"
            aria-label="正文行距"
          />
        </div>
      )}
    </div>
  );
}

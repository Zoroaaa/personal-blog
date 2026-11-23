/**
 * 阅读进度条 + 返回顶部。
 *
 * 约束：
 * - 进度按「当前视口底部 / 文档可滚动高度」计算，到达页尾才到 100%；
 * - 滚动监听用 rAF 节流，避免高频 setState；passive 监听不阻塞滚动；
 * - 返回顶部按钮仅在滚动超过阈值后出现，subject 关闭时清理定时器；
 * - 颜色全部走语义化 token，适配亮/暗与自定义主色。
 */

import { useEffect, useRef, useState } from 'react';

const SHOW_TOP_THRESHOLD = 400;

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // 页面不足以滚动时按 0 处理，避免出现除零或瞬间 100%
      const next = scrollable > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollable) * 100)) : 0;
      setProgress(next);
      setShowTop(scrollTop > SHOW_TOP_THRESHOLD);
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* 顶部进度条：固定在 Header 之上，z-50 与 sticky header 同级，不遮挡内容 */}
      <div
        className="fixed top-0 left-0 right-0 h-0.5 bg-transparent z-50 pointer-events-none"
        role="progressbar"
        aria-label="阅读进度"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 返回顶部：滚动一段距离后淡入 */}
      <button
        onClick={backToTop}
        aria-label="返回顶部"
        title="返回顶部"
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-card border border-border shadow-lg
          flex items-center justify-center text-foreground hover:text-primary hover:border-primary
          transition-all duration-300 ${
            showTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  );
}

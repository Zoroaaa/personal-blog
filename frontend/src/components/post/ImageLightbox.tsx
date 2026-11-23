/**
 * 图片灯箱：正文图片点击后放大查看。
 *
 * 实现方式：正文图片（markdownRenderer.ImageComponent）点击时派发自定义事件
 * `blog:lightbox`，本组件在挂载期监听并展示。这样无需把状态透传到 markdown 渲染管线。
 *
 * 约束：
 * - 监听在卸载时移除，避免多篇文章切换后重复监听；
 * - ESC 与点击遮罩均可关闭；打开时锁定 body 滚动；
 * - 尺寸样式用语义色，不破坏主题。
 */

import { useEffect, useState } from 'react';

export const LIGHTBOX_EVENT = 'blog:lightbox';

interface LightboxPayload {
  src: string;
  alt?: string;
}

export function ImageLightbox() {
  const [image, setImage] = useState<LightboxPayload | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<LightboxPayload>).detail;
      if (detail?.src) setImage(detail);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImage(null);
    };

    window.addEventListener(LIGHTBOX_EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(LIGHTBOX_EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // 打开期间锁定背景滚动，关闭后恢复
  useEffect(() => {
    if (!image) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [image]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 p-4 sm:p-8"
      onClick={() => setImage(null)}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
    >
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={image.src}
          alt={image.alt || ''}
          className="max-w-full max-h-[85vh] object-contain rounded-lg bg-card"
        />
        {image.alt && <p className="text-center text-sm text-background mt-3">{image.alt}</p>}
      </div>
      <button
        onClick={() => setImage(null)}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-card/90 text-foreground flex items-center justify-center hover:bg-card transition-colors"
        aria-label="关闭预览"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

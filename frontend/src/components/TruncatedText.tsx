import { useState, useRef, useEffect, useCallback } from 'react';

interface TruncatedTextProps {
  text: string;
  className?: string;
  lines?: number;
}

export function TruncatedText({ text, className = '', lines = 2 }: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const textRef = useRef<HTMLParagraphElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 检查文本是否被截断
  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      const el = textRef.current;
      // 检查实际渲染高度是否超过可见高度
      const isTruncatedNow = el.scrollHeight > el.clientHeight + 2;
      setIsTruncated(isTruncatedNow);
    }
  }, [text]);

  // 初始化和监听变化
  useEffect(() => {
    checkTruncation();
    // 使用 requestAnimationFrame 确保 DOM 渲染完成后再检查
    const rafId = requestAnimationFrame(checkTruncation);
    // 延迟检查，以防字体未加载完成
    const timeoutId = setTimeout(checkTruncation, 100);
    
    window.addEventListener('resize', checkTruncation);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [text, checkTruncation]);

  // 更新 tooltip 位置
  const updateTooltipPosition = useCallback(() => {
    if (!textRef.current || !tooltipRef.current) return;

    const textRect = textRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 计算 tooltip 宽度和位置
    const tooltipWidth = Math.min(320, viewportWidth - 32);
    let left = textRect.left + textRect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));

    // 计算垂直位置（优先显示在上方）
    const spaceAbove = textRect.top;
    const spaceBelow = viewportHeight - textRect.bottom;
    const tooltipHeight = tooltipRect.height || 100;

    let top: number;
    if (spaceAbove >= tooltipHeight + 16) {
      // 上方有足够空间
      top = textRect.top - tooltipHeight - 8;
    } else if (spaceBelow >= tooltipHeight + 16) {
      // 下方有足够空间
      top = textRect.bottom + 8;
    } else {
      // 都不够，放在上方尽可能高的位置
      top = Math.max(8, Math.min(spaceAbove - tooltipHeight - 8, textRect.top - tooltipHeight - 8));
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: 'max-content',
      maxWidth: `${tooltipWidth}px`,
      zIndex: 99999,
      pointerEvents: 'auto',
    });
  }, []);

  // 鼠标进入文本区域
  const handleMouseEnter = useCallback(() => {
    if (!isTruncated) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setShowTooltip(true);
  }, [isTruncated]);

  // 更新 tooltip 位置（当 tooltip 显示时）
  useEffect(() => {
    if (showTooltip) {
      requestAnimationFrame(() => {
        updateTooltipPosition();
      });
    }
  }, [showTooltip, updateTooltipPosition]);

  // 鼠标离开文本区域
  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }, []);

  // 鼠标进入 tooltip 区域
  const handleTooltipMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // 鼠标离开 tooltip 区域
  const handleTooltipMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <p
        ref={textRef}
        className={`${className} ${isTruncated ? 'cursor-help' : ''}`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="" // 清空默认 title，避免浏览器默认 tooltip
      >
        {text}
      </p>

      {/* Tooltip 弹窗 */}
      {showTooltip && isTruncated && (
        <div
          ref={tooltipRef}
          className="fixed p-3 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 leading-relaxed animate-tooltip-fade-in"
          style={tooltipStyle}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
            {text}
          </div>
        </div>
      )}

      {/* 动画样式 */}
      <style>{`
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-tooltip-fade-in {
          animation: tooltip-fade-in 0.15s ease-out forwards;
        }
      `}</style>
    </>
  );
}

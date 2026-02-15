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

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      const el = textRef.current;
      setIsTruncated(el.scrollHeight > el.clientHeight + 2);
    }
  }, []);

  useEffect(() => {
    checkTruncation();
    const rafId = requestAnimationFrame(checkTruncation);
    const timeoutId = setTimeout(checkTruncation, 100);
    window.addEventListener('resize', checkTruncation);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [text, checkTruncation]);

  const updateTooltipPosition = useCallback(() => {
    if (!textRef.current || !tooltipRef.current) return;

    const textRect = textRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const tooltipWidth = Math.min(320, viewportWidth - 32);
    let left = textRect.left + textRect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));

    const spaceAbove = textRect.top;
    const spaceBelow = viewportHeight - textRect.bottom;
    const tooltipHeight = tooltipRect.height || 100;

    let top: number;

    if (spaceAbove >= tooltipHeight + 16) {
      top = textRect.top - tooltipHeight - 8;
    } else if (spaceBelow >= tooltipHeight + 16) {
      top = textRect.bottom + 8;
    } else {
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

  const handleMouseEnter = useCallback(() => {
    if (!isTruncated) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setShowTooltip(true);
  }, [isTruncated]);

  useEffect(() => {
    if (showTooltip) {
      requestAnimationFrame(() => {
        updateTooltipPosition();
      });
    }
  }, [showTooltip, updateTooltipPosition]);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }, []);

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
        className={`${className} ${isTruncated ? 'cursor-pointer' : ''}`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </p>

      {showTooltip && isTruncated && (
        <div
          ref={tooltipRef}
          className="fixed p-3 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 leading-relaxed animate-tooltip-fade-in"
          style={tooltipStyle}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="whitespace-pre-wrap break-words">{text}</div>
        </div>
      )}

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

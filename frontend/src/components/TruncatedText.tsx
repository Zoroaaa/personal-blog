import { useState, useRef, useEffect, useCallback } from 'react';

interface TruncatedTextProps {
  text: string;
  className?: string;
  lines?: number;
}

export function TruncatedText({ text, className = '', lines = 2 }: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [tooltipDirection, setTooltipDirection] = useState<'up' | 'down'>('up');
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const textRef = useRef<HTMLParagraphElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      const el = textRef.current;
      const isContentTruncated = el.scrollHeight > el.clientHeight + 2;
      setIsTruncated(isContentTruncated);
    }
  }, []);

  useEffect(() => {
    checkTruncation();

    const rafId = requestAnimationFrame(() => {
      checkTruncation();
    });

    const timeoutId = setTimeout(() => {
      checkTruncation();
    }, 100);

    window.addEventListener('resize', checkTruncation);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [text, checkTruncation]);

  useEffect(() => {
    if (showTooltip && tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight);
    }
  }, [showTooltip]);

  const calculatePosition = useCallback(() => {
    if (!textRef.current) return;

    const rect = textRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(320, viewportWidth - 32);

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));

    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    let direction: 'up' | 'down' = 'up';
    let top: number;

    if (spaceAbove >= 120 || spaceAbove > spaceBelow) {
      direction = 'up';
      top = rect.top - 10;
    } else {
      direction = 'down';
      top = rect.bottom + 10;
    }

    setPosition({ top, left });
    setTooltipDirection(direction);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isTruncated) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    calculatePosition();
    setShowTooltip(true);
  }, [isTruncated, calculatePosition]);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100);
  }, []);

  const handleTouchStart = useCallback(() => {
    if (!isTruncated) return;

    touchTimeoutRef.current = setTimeout(() => {
      calculatePosition();
      setShowTooltip(true);
    }, 500);
  }, [isTruncated, calculatePosition]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
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
    }, 100);
  }, []);

  const handleDocumentTouch = useCallback((e: TouchEvent) => {
    if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        textRef.current && !textRef.current.contains(e.target as Node)) {
      setShowTooltip(false);
    }
  }, []);

  useEffect(() => {
    if (showTooltip) {
      document.addEventListener('touchstart', handleDocumentTouch);
    }
    return () => {
      document.removeEventListener('touchstart', handleDocumentTouch);
    };
  }, [showTooltip, handleDocumentTouch]);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const lineClampStyle = {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  };

  const finalTop = tooltipDirection === 'up' 
    ? position.top - tooltipHeight 
    : position.top;

  return (
    <>
      <p
        ref={textRef}
        className={`${className} ${isTruncated ? 'cursor-pointer' : ''}`}
        style={lineClampStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        title={isTruncated ? '悬停查看完整内容' : undefined}
      >
        {text}
      </p>

      {showTooltip && isTruncated && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] max-w-[320px] p-3 rounded-lg shadow-xl border border-gray-200/80 dark:border-slate-600/80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
          style={{
            top: finalTop,
            left: position.left,
            width: 'max-content',
            maxWidth: '320px',
            animation: 'tooltip-fade-in 0.2s ease-out forwards',
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {tooltipDirection === 'down' && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-200/80 dark:border-b-slate-600/80" />
          )}
          <div className="whitespace-pre-wrap break-words">{text}</div>
          {tooltipDirection === 'up' && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-200/80 dark:border-t-slate-600/80" />
          )}
        </div>
      )}

      <style>{`
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateY(${tooltipDirection === 'up' ? '8px' : '-8px'});
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

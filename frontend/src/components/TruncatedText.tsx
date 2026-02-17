import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TruncatedTextProps {
  text: string;
  className?: string;
  lines?: number;
}

export function TruncatedText({ text, className = '', lines = 2 }: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const textRef = useRef<HTMLParagraphElement>(null);
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

  const calculatePosition = useCallback(() => {
    if (!textRef.current) return { top: 0, left: 0 };

    const rect = textRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const tooltipWidth = Math.min(320, viewportWidth - 32);
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));

    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    let top: number;
    if (spaceAbove >= 150 || spaceAbove > spaceBelow) {
      top = rect.top - 10;
    } else {
      top = rect.bottom + 10;
    }

    return { top, left };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isTruncated) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const pos = calculatePosition();
    setTooltipPosition(pos);
    setShowTooltip(true);
  }, [isTruncated, calculatePosition]);

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

  const tooltipContent = showTooltip && isTruncated ? (
    <div
      className="fixed p-3 rounded-lg shadow-xl border border-border dark:border-border bg-card text-sm text-foreground leading-relaxed"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        width: 'max-content',
        maxWidth: '320px',
        zIndex: 99999,
        transform: tooltipPosition.top < (textRef.current?.getBoundingClientRect().top || 0) 
          ? 'translateY(-100%)' 
          : 'translateY(0)',
        animation: 'tooltip-fade-in 0.15s ease-out forwards',
      }}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
    >
      <div className="whitespace-pre-wrap break-words">{text}</div>
    </div>
  ) : null;

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
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </p>

      {tooltipContent && createPortal(tooltipContent, document.body)}

      {showTooltip && (
        <style>{`
          @keyframes tooltip-fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      )}
    </>
  );
}

import { useRef, useState, useEffect } from 'react';

/**
 * AutoScrollText
 * Minimizes long text within maxWidth and smoothly auto-scrolls horizontally
 * with an alternating marquee animation if the text overflows.
 */
export default function AutoScrollText({ text = '', maxWidth = 130, className = '' }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const scrollW = textRef.current.scrollWidth;
      const clientW = containerRef.current.clientWidth;
      if (scrollW > clientW + 2) {
        setIsOverflowing(true);
        setOverflowDistance(scrollW - clientW);
      } else {
        setIsOverflowing(false);
        setOverflowDistance(0);
      }
    }
  }, [text, maxWidth]);

  const animDuration = Math.max(4, Math.min(12, Math.round(overflowDistance / 15) || 5));

  return (
    <span
      ref={containerRef}
      style={{ maxWidth, display: 'inline-block', verticalAlign: 'middle', overflow: 'hidden' }}
      className={`relative whitespace-nowrap select-none ${className}`}
      title={text}
    >
      <span
        ref={textRef}
        style={
          isOverflowing
            ? {
                display: 'inline-block',
                whiteSpace: 'nowrap',
                animation: `autoScrollMarquee ${animDuration}s ease-in-out infinite alternate`,
                ['--scroll-dist']: `-${overflowDistance + 4}px`
              }
            : { display: 'inline-block', whiteSpace: 'nowrap' }
        }
      >
        {text}
      </span>
      <style>{`
        @keyframes autoScrollMarquee {
          0%, 18% { transform: translateX(0); }
          82%, 100% { transform: translateX(var(--scroll-dist, -40px)); }
        }
      `}</style>
    </span>
  );
}

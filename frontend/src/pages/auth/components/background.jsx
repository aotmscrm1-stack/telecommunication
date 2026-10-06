'use client';

import { useEffect, useRef } from 'react';

const LABEL_FONT = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FALLOFF_STEPS = 8;
const SPRING = 320;
const DAMPING = 22;

const approach = (current, target, dt, seconds) => current + (target - current) * (1 - Math.exp(-dt / seconds));

const hexToRgb = hex => {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = (hex, alpha) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const noise = (...values) => {
  let h = 2166136261;
  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
};

const signed = value => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0');

export const TechText = ({
  text = 'React Bits',
  fontFamily = '',
  fontWeight = 600,
  fontSize = 120,
  color = '#43b02a',
  accentColor = '#84d364',
  letterSpacing = 0,
  reach = 120,
  softness = 0.6,
  strokeWidth = 1,
  dashLength = 4,
  dashGap = 2,
  specks = 12,
  lineStyle = 'dashed',
  speed = 1,
  sweep = false,
  reveal = 'letter',
  labels = false,
  selection = false,
  draggable = false
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let animId;
    let t = 0;

    const render = () => {
      t += 0.016 * speed;
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [speed]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fontFamily || 'monospace',
        fontWeight,
        fontSize: `${fontSize}px`,
        color,
        letterSpacing: `${letterSpacing}em`,
        userSelect: selection ? 'auto' : 'none',
        cursor: draggable ? 'grab' : 'default'
      }}
    >
      {text}
    </div>
  );
};

export default TechText;

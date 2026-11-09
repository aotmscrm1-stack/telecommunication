import React, { useId } from 'react';

/**
 * AOTMS Signature Orange & Blue Gradient Rotating Circle (Refresh / Loading Symbol)
 * Clean, modern circular ring rotating smoothly with Orange (#F97316) to Blue (#1677C8) gradient.
 * Uniform standard size: 38px across all modules.
 */
export default function AotmsSpinner({
  size = 38,
  text = '',
  className = '',
  fullPage = false,
  center = false,
}) {
  const rawId = useId ? useId() : 'aotms';
  const gradId = `aotms-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const numSize = typeof size === 'number' ? size : {
    sm: 18,
    md: 26,
    default: 38,
    lg: 38,
    xl: 48,
  }[size] || 38;

  const spinnerContent = (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        width={numSize}
        height={numSize}
        viewBox="0 0 44 44"
        fill="none"
        data-no-gradient
        className="animate-spin"
        style={{
          transformOrigin: 'center',
          filter: 'drop-shadow(0 2px 5px rgba(249, 115, 22, 0.22))',
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="45%" stopColor="#FB923C" />
            <stop offset="85%" stopColor="#1677C8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Subtle Background Track Ring */}
        <circle
          cx="22"
          cy="22"
          r="17"
          stroke="#e2e8f0"
          strokeWidth="3.6"
          opacity="0.4"
        />

        {/* Smooth Rotating Gradient Circle Arc */}
        <circle
          cx="22"
          cy="22"
          r="17"
          stroke={`url(#${gradId})`}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeDasharray="72 35"
        />
      </svg>

      {text && (
        <span className="mt-3 text-xs font-semibold text-slate-500 tracking-wide animate-pulse">
          {text}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {spinnerContent}
      </div>
    );
  }

  if (center) {
    return (
      <div className="flex items-center justify-center w-full py-16">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}

export { AotmsSpinner };

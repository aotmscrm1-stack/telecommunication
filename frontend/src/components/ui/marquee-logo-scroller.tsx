import React from 'react';
import { cn } from '@/lib/utils';

// Define the type for individual logo props
export interface Logo {
  src?: string;
  alt: string;
  gradient: {
    from: string;
    via: string;
    to: string;
  };
  icon?: React.ReactNode;
  label?: string;
}

// Define the props for the main component
export interface MarqueeLogoScrollerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  logos: Logo[];
  speed?: 'normal' | 'slow' | 'fast';
}

/**
 * A responsive, self-contained, and infinitely scrolling marquee component.
 * It pauses on hover and uses shadcn/ui theme variables for styling.
 * This component includes its own CSS animation and does not require tailwind.config.js modifications.
 */
const MarqueeLogoScroller = React.forwardRef<HTMLDivElement, MarqueeLogoScrollerProps>(
  ({ title, description, logos, speed = 'normal', className, ...props }, ref) => {
    // Map speed prop to animation duration
    const durationMap = {
      normal: '40s',
      slow: '80s',
      fast: '15s',
    };
    const animationDuration = durationMap[speed] || durationMap.normal;

    return (
      <>
        {/* The @keyframes for the marquee animation are defined directly here for robustness. */}
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>

        <section
          ref={ref}
          aria-label={title}
          className={cn(
            'w-full bg-background text-foreground rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden',
            className
          )}
          {...props}
        >
          {/* Header Section */}
          <div className="p-6 md:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-8 pb-6 md:pb-8 border-b border-slate-200/80">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter text-balance">
                {title}
              </h2>
              <p className="text-muted-foreground self-start lg:justify-self-end text-balance text-sm md:text-base leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Marquee Section */}
          <div
            className="w-full overflow-hidden"
            style={{
              maskImage:
                'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            }}
          >
            <div
              className="flex w-max items-center gap-4 py-4 pr-4 hover:[animation-play-state:paused] transition-all duration-300 ease-in-out"
              style={{
                animation: `marquee ${animationDuration} linear infinite`,
              }}
            >
              {/* Render logos twice to create a seamless loop */}
              {[...logos, ...logos].map((logo, index) => (
                <div
                  key={index}
                  className="group relative h-24 w-44 shrink-0 flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 overflow-hidden shadow-xs transition-shadow duration-300 hover:shadow-md cursor-pointer"
                >
                  {/* Gradient background revealed on hover */}
                  <div
                    style={{
                      '--from': logo.gradient.from,
                      '--via': logo.gradient.via,
                      '--to': logo.gradient.to,
                    } as React.CSSProperties}
                    className="absolute inset-0 scale-150 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-100 bg-gradient-to-br from-[var(--from)] via-[var(--via)] to-[var(--to)]"
                  />
                  {/* Logo Content */}
                  {logo.src ? (
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      className="relative z-10 h-3/4 max-w-[80%] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : logo.icon ? (
                    <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 transition-transform duration-300 group-hover:scale-105 px-3 text-center">
                      <div className="text-slate-800 dark:text-slate-200 transition-colors duration-300 group-hover:text-white">
                        {logo.icon}
                      </div>
                      <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-200 transition-colors duration-300 group-hover:text-white">
                        {logo.label || logo.alt}
                      </span>
                    </div>
                  ) : (
                    <span className="relative z-10 font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-white transition-colors duration-300">
                      {logo.alt}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }
);

MarqueeLogoScroller.displayName = 'MarqueeLogoScroller';

export { MarqueeLogoScroller };
export default MarqueeLogoScroller;


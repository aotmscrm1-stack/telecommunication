import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(
  ({ className, min = 0, max = 1, step = 0.01, value = [0], onValueChange, ...props }, ref) => {
    const val = Array.isArray(value) ? value[0] : value;

    const handleChange = (e) => {
      const num = parseFloat(e.target.value);
      if (onValueChange) {
        onValueChange([num]);
      }
    };

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={handleChange}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

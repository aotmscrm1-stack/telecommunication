"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function useMeasure<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T>(null);
  const [bounds, setBounds] = React.useState({ height: 0, width: 0 });

  React.useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setBounds({
          height: entry.contentRect.height,
          width: entry.contentRect.width,
        });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, bounds] as const;
}

export interface AnimatedTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function AnimatedTabs({
  defaultValue = "email",
  value,
  onValueChange,
  className,
  children,
  ...props
}: AnimatedTabsProps) {
  const [selected, setSelected] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelected(value);
    }
  }, [value]);

  const setActiveTab = React.useCallback(
    (val: string) => {
      if (value === undefined) {
        setSelected(val);
      }
      onValueChange?.(val);
    },
    [value, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab: selected, setActiveTab }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function AnimatedTabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AnimatedTabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export function AnimatedTabsTrigger({
  value,
  className,
  children,
  ...props
}: AnimatedTabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("AnimatedTabsTrigger must be used within AnimatedTabs");
  }

  const isActive = ctx.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.setActiveTab(value)}
      className={cn(
        "relative z-10 flex flex-1 items-center justify-center py-2 text-sm font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId="family-tab-active-indicator"
          className="absolute inset-0 z-[-1] rounded-xl bg-background shadow-sm"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span className="flex items-center justify-center">{children}</span>
    </button>
  );
}

export interface AnimatedTabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

export function AnimatedTabsContent({
  value,
  className,
  children,
  ...props
}: AnimatedTabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("AnimatedTabsContent must be used within AnimatedTabs");
  }

  if (ctx.activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn("w-full transition-opacity duration-200", className)}
      {...props}
    >
      {children}
    </div>
  );
}

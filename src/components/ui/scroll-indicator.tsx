"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScrollIndicatorProps {
  containerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export function ScrollIndicator({ containerRef, className }: ScrollIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef?.current || window;
    const checkScroll = () => {
      if (container === window) {
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const clientHeight = window.innerHeight;
        const isScrollable = scrollHeight > clientHeight;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
        
        setIsVisible(isScrollable && !atBottom);
        setIsAtBottom(atBottom);
      } else {
        const element = container as HTMLElement;
        const isScrollable = element.scrollHeight > element.clientHeight;
        const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
        
        setIsVisible(isScrollable && !atBottom);
        setIsAtBottom(atBottom);
      }
    };

    checkScroll();
    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [containerRef]);

  if (!isVisible || isAtBottom) return null;

  const scrollDown = () => {
    if (containerRef?.current) {
      const element = containerRef.current;
      element.scrollTo({
        top: element.scrollTop + element.clientHeight * 0.8,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: window.scrollY + window.innerHeight * 0.8,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      ref={indicatorRef}
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-20",
        "flex flex-col items-center gap-2",
        "animate-bounce cursor-pointer",
        "transition-opacity duration-300",
        className
      )}
      onClick={scrollDown}
      aria-label="Scroll down"
    >
      <div className="w-10 h-16 rounded-full border-2 border-primary/30 flex items-start justify-center p-2 backdrop-blur-sm bg-background/80">
        <svg
          className="w-5 h-5 text-primary animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
      <span className="text-xs text-muted-foreground font-medium">Scroll</span>
    </div>
  );
}



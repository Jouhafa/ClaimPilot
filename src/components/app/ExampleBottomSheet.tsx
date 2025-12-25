"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StoryCard {
  id: string;
  emoji: string;
  name: string;
  age: number;
  location: string;
  whatHappened: string[];
  theFix: string[];
  theOutcome: string;
}

interface ExampleBottomSheetProps {
  example: StoryCard | null;
  isOpen: boolean;
  onClose: () => void;
  color: string;
}

export function ExampleBottomSheet({ example, isOpen, onClose, color }: ExampleBottomSheetProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const screens = example ? [
    { title: "What happened", content: example.whatHappened, icon: "⚡" },
    { title: "The fix", content: example.theFix, icon: "🔧" },
    { title: "The outcome", content: [example.theOutcome], icon: "💎" },
  ] : [];

  // Reset to first screen when example changes
  useEffect(() => {
    if (example) {
      setCurrentScreen(0);
    }
  }, [example]);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    let startX = 0;
    let startY = 0;

    const handleStart = (e: TouchEvent | MouseEvent) => {
      const point = "touches" in e ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
    };

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!startX || !startY) return;
      const point = "touches" in e ? e.touches[0] : e;
      const deltaX = point.clientX - startX;
      const deltaY = point.clientY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        if (deltaX > 0 && currentScreen > 0) {
          setCurrentScreen(currentScreen - 1);
        } else if (deltaX < 0 && currentScreen < screens.length - 1) {
          setCurrentScreen(currentScreen + 1);
        }
        startX = 0;
        startY = 0;
      }
    };

    container.addEventListener("touchstart", handleStart);
    container.addEventListener("touchmove", handleMove);
    container.addEventListener("mousedown", handleStart);
    container.addEventListener("mousemove", handleMove);

    return () => {
      container.removeEventListener("touchstart", handleStart);
      container.removeEventListener("touchmove", handleMove);
      container.removeEventListener("mousedown", handleStart);
      container.removeEventListener("mousemove", handleMove);
    };
  }, [isOpen, currentScreen, screens.length]);


  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && currentScreen > 0) {
        setCurrentScreen(currentScreen - 1);
      } else if (e.key === "ArrowRight" && currentScreen < screens.length - 1) {
        setCurrentScreen(currentScreen + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentScreen, screens.length, onClose]);

  if (!isOpen || !example) return null;

  const currentScreenData = screens[currentScreen];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Centered Modal Card */}
      <div
        ref={containerRef}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 rounded-2xl shadow-2xl transition-all duration-300 ease-out",
          "bg-card border-2 border-border",
          "w-[90%] max-w-lg max-h-[85vh] overflow-hidden",
          "flex flex-col"
        )}
        style={{
          transform: isOpen
            ? `translate(-50%, -50%) scale(1)`
            : `translate(-50%, -50%) scale(0.9)`,
          opacity: isOpen ? 1 : 0,
          transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="example-title"
        aria-describedby="example-content"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl" aria-hidden="true">
              {example.emoji}
            </div>
            <div>
              <h3 id="example-title" className="font-bold text-lg text-foreground">
                {example.name}
                {example.age > 0 && `, ${example.age}`}
              </h3>
              <p className="text-sm text-muted-foreground">{example.location}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close example story"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Screen Content */}
        <div id="example-content" className="flex-1 px-6 py-6 overflow-y-auto" role="region" aria-live="polite">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl" aria-hidden="true">{currentScreenData.icon}</span>
            </div>
            <h4 className="font-semibold text-base uppercase tracking-wide text-foreground">
              {currentScreenData.title}
            </h4>
          </div>

          <ul className="space-y-4 text-base text-foreground">
            {currentScreenData.content.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 pl-2">
                <span className="mt-1.5 text-primary font-bold" aria-hidden="true">→</span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={() => setCurrentScreen(Math.max(0, currentScreen - 1))}
              disabled={currentScreen === 0}
              className="px-4 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-border hover:bg-muted text-foreground"
              aria-label="Previous screen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Progress Dots */}
            <div className="flex gap-2" role="tablist" aria-label="Story screens">
              {screens.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === currentScreen ? "w-8 bg-primary" : "w-2 bg-muted"
                  )}
                  role="tab"
                  aria-selected={idx === currentScreen}
                  aria-label={`Screen ${idx + 1} of ${screens.length}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentScreen(Math.min(screens.length - 1, currentScreen + 1))}
              disabled={currentScreen === screens.length - 1}
              className="px-4 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-border hover:bg-muted text-foreground"
              aria-label="Next screen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


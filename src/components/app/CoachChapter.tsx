"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { ExampleChips } from "./ExampleChips";

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

interface CoachChapterProps {
  hook: string;
  visual: React.ReactNode;
  bullets: string[];
  cta: { text: string; tab: string };
  examples: StoryCard[];
  gradient: string;
  color: string;
  onNavigate?: (tab: string) => void;
  onExampleClick: (example: StoryCard) => void;
}

export function CoachChapter({
  hook,
  visual,
  bullets,
  cta,
  examples,
  gradient,
  color,
  onNavigate,
  onExampleClick,
}: CoachChapterProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [visualAnimated, setVisualAnimated] = useState(false);
  const [bulletsVisible, setBulletsVisible] = useState(false);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);
    
    // Animate visual after a short delay
    setTimeout(() => setVisualAnimated(true), 100);
    
    // Animate bullets after visual
    setTimeout(() => setBulletsVisible(true), 300);
    
    // Pulse CTA button once
    if (ctaButtonRef.current) {
      ctaButtonRef.current.style.animation = "pulse-once 0.6s ease-out";
      setTimeout(() => {
        if (ctaButtonRef.current) {
          ctaButtonRef.current.style.animation = "";
        }
      }, 600);
    }
  }, []);

  // Create theme-aware gradient - convert dark gradients to light versions
  const getLightGradient = (darkGrad: string): string => {
    // Map dark shades to light shades
    const shadeMap: Record<string, string> = {
      "600": "100",
      "500": "100",
      "400": "200",
      "300": "300",
    };
    
    return darkGrad
      .replace(/(from|via|to)-(\w+)-(\d+)/g, (match, prefix, color, shade) => {
        const lightShade = shadeMap[shade] || "100";
        return `${prefix}-${color}-${lightShade}`;
      });
  };

  const themeGradient = isDark ? gradient : getLightGradient(gradient);

  return (
    <div
      className={cn("absolute inset-0 flex flex-col", themeGradient)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="flex-1 flex flex-col px-6 py-12 max-w-4xl mx-auto w-full h-screen overflow-y-auto">
        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Hook */}
          <div className="text-center mb-8">
            <h1 className={cn(
              "text-4xl md:text-5xl font-bold mb-4 leading-tight",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {hook}
            </h1>
          </div>

          {/* Your Numbers - Visual */}
          <div
            className="mb-8"
            style={{
              transform: visualAnimated ? "scale(1)" : "scale(0.98)",
              filter: visualAnimated ? "blur(0)" : "blur(4px)",
              opacity: visualAnimated ? 1 : 0,
              transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDelay: "100ms",
            }}
          >
            {visual}
          </div>

          {/* What It Means - Bullets */}
          {bullets.length > 0 && (
            <div
              className="mb-8"
              style={{
                opacity: bulletsVisible ? 1 : 0,
                transform: bulletsVisible ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 300ms ease-out, transform 300ms ease-out",
                transitionDelay: "200ms",
              }}
            >
              <ul className="space-y-4 text-lg md:text-xl">
                {bullets.map((bullet, idx) => (
                  <li key={idx} className={cn(
                    "flex items-start gap-3 backdrop-blur-sm rounded-lg p-4 border",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white/95" 
                      : "bg-white/80 border-gray-200/50 text-gray-900 shadow-md"
                  )}>
                    <span className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      isDark 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "bg-primary/10 text-primary border border-primary/20"
                    )}>
                      {idx + 1}
                    </span>
                    <span className="flex-1">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Button and Examples Row */}
          <div className="mb-8 space-y-6">
            <Button
              ref={ctaButtonRef}
              onClick={() => onNavigate?.(cta.tab)}
              size="lg"
              className={cn(
                "w-full max-w-md mx-auto h-14 text-lg font-semibold shadow-lg animate-pulse-once",
                isDark 
                  ? "bg-white text-gray-900 hover:bg-white/90" 
                  : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              {cta.text} →
            </Button>
            
            {/* Examples Row */}
            <ExampleChips examples={examples} onExampleClick={onExampleClick} color={color} />
          </div>
        </div>
      </div>

    </div>
  );
}


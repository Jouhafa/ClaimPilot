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
      <div className="flex-1 flex flex-col px-8 py-16 max-w-5xl mx-auto w-full h-screen overflow-y-auto smooth-scroll">
        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Hook */}
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className={cn(
              "text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {hook}
            </h1>
          </div>

          {/* Your Numbers - Visual */}
          <div
            className="mb-12 animate-scale-in"
            style={{
              transform: visualAnimated ? "scale(1)" : "scale(0.95)",
              filter: visualAnimated ? "blur(0)" : "blur(4px)",
              opacity: visualAnimated ? 1 : 0,
              transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), filter 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDelay: "150ms",
            }}
          >
            <div className="transform hover:scale-105 transition-transform duration-300">
              {visual}
            </div>
          </div>

          {/* What It Means - Bullets */}
          {bullets.length > 0 && (
            <div
              className="mb-12"
              style={{
                opacity: bulletsVisible ? 1 : 0,
                transform: bulletsVisible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 400ms ease-out, transform 400ms ease-out",
                transitionDelay: "300ms",
              }}
            >
              <ul className="space-y-6">
                {bullets.map((bullet, idx) => (
                  <li 
                    key={idx} 
                    className={cn(
                      "flex items-start gap-5 backdrop-blur-md rounded-xl p-6 border-2 shadow-lg stagger-item",
                      "hover:scale-[1.02] transition-transform duration-200",
                      isDark 
                        ? "bg-white/10 border-white/20 text-white/95" 
                        : "bg-white/90 border-gray-200/60 text-gray-900"
                    )}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <span className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 shadow-md",
                      isDark 
                        ? "bg-primary/30 text-primary border-2 border-primary/40" 
                        : "bg-primary/15 text-primary border-2 border-primary/30"
                    )}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-xl md:text-2xl font-medium leading-relaxed pt-1">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Button and Examples Row */}
          <div className="mb-12 space-y-8">
            <Button
              ref={ctaButtonRef}
              onClick={() => onNavigate?.(cta.tab)}
              size="lg"
              className={cn(
                "w-full max-w-lg mx-auto h-20 text-xl font-bold shadow-2xl animate-pulse-glow-enhanced",
                "hover:scale-105 transition-all duration-200",
                isDark 
                  ? "bg-white text-gray-900 hover:bg-white/95 hover:shadow-3xl" 
                  : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              {cta.text} →
            </Button>
            
            {/* Examples Row */}
            <div className="animate-fade-in-up" style={{ animationDelay: "500ms", opacity: 0 }}>
              <ExampleChips examples={examples} onExampleClick={onExampleClick} color={color} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


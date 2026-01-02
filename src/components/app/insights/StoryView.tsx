"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorySlide } from "./StorySlide";
import { AnimatedDonutChart } from "@/components/app/charts/AnimatedDonutChart";
import { AnimatedCounter } from "@/components/app/AnimatedChart";
import { cn } from "@/lib/utils";
import type { StoryDeck } from "./StoryTopics";
import type { StorySlideDeepDive } from "@/lib/services/aiDeepDive";

interface StoryViewProps {
  deck: StoryDeck;
  monthKey: string;
  aiDeepDives?: Map<string, StorySlideDeepDive>;
  isLoadingAI?: boolean;
  onClose: () => void;
}

/**
 * Layer 2: Story View
 * Slide deck component with navigation
 */
export function StoryView({ deck, monthKey, aiDeepDives, isLoadingAI, onClose }: StoryViewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const currentSlide = deck.slides[currentSlideIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      } else if (e.key === "ArrowRight" && currentSlideIndex < deck.slides.length - 1) {
        setCurrentSlideIndex(currentSlideIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, deck.slides.length, onClose]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-background px-4 py-4">
        <div className="flex items-center justify-between max-w-[1120px] mx-auto">
          <div>
            <h2 className="text-[24px] font-bold">{deck.title}</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Slide {currentSlideIndex + 1} of {deck.slides.length}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
        {deck.slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlideIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentSlideIndex
                ? "bg-primary w-6"
                : "bg-muted hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Slide Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1120px] mx-auto px-4 py-8">
          {currentSlide && (
            <StorySlide
              slide={currentSlide}
              aiDeepDive={aiDeepDives?.get(currentSlide.id)}
              isLoadingAI={isLoadingAI}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-border/50 bg-background px-4 py-4">
        <div className="flex items-center justify-between max-w-[1120px] mx-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={currentSlideIndex === 0}
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
          >
            ← Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            disabled={currentSlideIndex === deck.slides.length - 1}
            onClick={() => setCurrentSlideIndex(Math.min(deck.slides.length - 1, currentSlideIndex + 1))}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}

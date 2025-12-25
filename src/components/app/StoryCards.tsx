"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StoryCard {
  id: string;
  emoji: string;
  name: string;
  age: number;
  location: string;
  color: string;
  whatHappened: string[];
  theFix: string[];
  theOutcome: string;
}

interface StoryCardsProps {
  stories: StoryCard[];
}

export function StoryCards({ stories }: StoryCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStory = stories[currentIndex];

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % stories.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  if (stories.length === 0) return null;

  const colorMap: Record<string, { border: string; bg: string; bgLight: string }> = {
    blue: { border: "border-blue-500/30", bg: "bg-blue-500/20", bgLight: "from-blue-500/10 to-blue-500/5" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-500/20", bgLight: "from-purple-500/10 to-purple-500/5" },
    amber: { border: "border-amber-500/30", bg: "bg-amber-500/20", bgLight: "from-amber-500/10 to-amber-500/5" },
    green: { border: "border-green-500/30", bg: "bg-green-500/20", bgLight: "from-green-500/10 to-green-500/5" },
  };

  const colors = colorMap[currentStory.color] || colorMap.blue;

  return (
    <div className="relative">
      <Card className={cn("overflow-hidden border-2", colors.border)}>
        <div className={cn("p-6 bg-gradient-to-br", colors.bgLight)}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl", colors.bg)}>
              {currentStory.emoji}
            </div>
            <div>
              <p className="font-semibold">{currentStory.name}, {currentStory.age}</p>
              <p className="text-sm text-muted-foreground">{currentStory.location}</p>
            </div>
          </div>

          {/* What Happened */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">What happened</p>
            <ul className="space-y-1.5">
              {currentStory.whatHappened.map((item, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The Fix */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">The fix</p>
            <ul className="space-y-1.5">
              {currentStory.theFix.map((item, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The Outcome */}
          <div className={cn("p-3 rounded-lg border", colors.border, colors.bg.replace("/20", "/10"))}>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">The outcome</p>
            <p className="text-sm font-semibold">{currentStory.theOutcome}</p>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      {stories.length > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={goToPrev}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Previous story"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-1.5">
            {stories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentIndex ? "bg-primary w-6" : "bg-muted"
                )}
                aria-label={`Go to story ${idx + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Next story"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}


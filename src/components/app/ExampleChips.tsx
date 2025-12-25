"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

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

interface ExampleChipsProps {
  examples: StoryCard[];
  onExampleClick: (example: StoryCard) => void;
  color: string;
}

export function ExampleChips({ examples, onExampleClick, color }: ExampleChipsProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (examples.length === 0) return null;

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "bg-blue-500/10 hover:bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-700 dark:text-blue-300" },
    amber: { bg: "bg-amber-500/10 hover:bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-300" },
    purple: { bg: "bg-purple-500/10 hover:bg-purple-500/20", border: "border-purple-500/30", text: "text-purple-700 dark:text-purple-300" },
    red: { bg: "bg-red-500/10 hover:bg-red-500/20", border: "border-red-500/30", text: "text-red-700 dark:text-red-300" },
    green: { bg: "bg-green-500/10 hover:bg-green-500/20", border: "border-green-500/30", text: "text-green-700 dark:text-green-300" },
    teal: { bg: "bg-teal-500/10 hover:bg-teal-500/20", border: "border-teal-500/30", text: "text-teal-700 dark:text-teal-300" },
    indigo: { bg: "bg-indigo-500/10 hover:bg-indigo-500/20", border: "border-indigo-500/30", text: "text-indigo-700 dark:text-indigo-300" },
    gray: { bg: "bg-gray-500/10 hover:bg-gray-500/20", border: "border-gray-500/30", text: "text-gray-700 dark:text-gray-300" },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-4">
        <p className={cn(
          "text-sm font-semibold uppercase tracking-wide drop-shadow-sm",
          isDark ? "text-white/90" : "text-gray-900/90"
        )}>See an example</p>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {examples.map((example) => (
          <button
            key={example.id}
            onClick={() => onExampleClick(example)}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95",
              "backdrop-blur-sm shadow-lg hover:shadow-xl",
              colors.bg,
              colors.border,
              colors.text
            )}
            aria-label={`See example: ${example.name}${example.age > 0 ? `, ${example.age}` : ""} from ${example.location}`}
          >
            <div className="text-3xl">{example.emoji}</div>
            <div className="text-left">
              <div className="font-semibold text-sm">
                {example.name}
                {example.age > 0 && `, ${example.age}`}
              </div>
              <div className="text-xs opacity-70">{example.location}</div>
            </div>
            <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}


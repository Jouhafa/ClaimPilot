"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg p-1 bg-white border border-[#E6DDD3]",
        className
      )}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#D65A4A] focus:ring-offset-2",
            value === option.id
              ? "bg-[#D65A4A] text-white shadow-sm"
              : "text-[#6B6B6B] hover:text-[#121212] hover:bg-[#F6F1EA]"
          )}
          role="tab"
          aria-selected={value === option.id}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}


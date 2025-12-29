"use client";

import { motion } from "framer-motion";
import { useReducedMotion, getAnimationDuration } from "@/lib/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface AnimatedProgressBarProps {
  value: number;
  max: number;
  color: string;
  label?: string;
  showPercentage?: boolean;
  delay?: number;
  height?: number;
  className?: string;
}

/**
 * Premium progress bar with:
 * - Smooth fill animation from 0 → value
 * - Respects reduced motion preference
 * - Customizable height and styling
 */
export function AnimatedProgressBar({
  value,
  max,
  color,
  label,
  showPercentage = true,
  delay = 0,
  height = 8,
  className,
}: AnimatedProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const duration = getAnimationDuration(
    prefersReducedMotion ? 200 : 500,
    prefersReducedMotion
  );

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className="rounded-full overflow-hidden bg-muted"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: duration / 1000,
            delay: delay / 1000,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>
    </div>
  );
}


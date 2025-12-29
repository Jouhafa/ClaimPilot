"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChartTooltipProps {
  label?: string;
  value: string | number;
  percentage?: number;
  delta?: number;
  deltaLabel?: string;
  isVisible: boolean;
  position?: { x: number; y: number };
  className?: string;
  children?: ReactNode;
}

/**
 * Premium tooltip with fade+slide animation
 * Appears on hover/focus with smooth transitions
 */
export function ChartTooltip({
  label,
  value,
  percentage,
  delta,
  deltaLabel,
  isVisible,
  position,
  className,
  children,
}: ChartTooltipProps) {
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0.1 : 0.15;

  if (children) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration, ease: "easeOut" }}
            className={cn(
              "absolute z-50 rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg",
              "pointer-events-none",
              className
            )}
            style={
              position
                ? {
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    transform: "translate(-50%, -100%)",
                    marginTop: "-8px",
                  }
                : undefined
            }
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration, ease: "easeOut" }}
          className={cn(
            "absolute z-50 rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg",
            "pointer-events-none",
            className
          )}
          style={
            position
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  transform: "translate(-50%, -100%)",
                  marginTop: "-8px",
                }
              : undefined
          }
        >
          {label && (
            <div className="font-medium mb-1 text-foreground">{label}</div>
          )}
          <div className="text-foreground font-semibold">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {percentage !== undefined && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {percentage.toFixed(1)}% of total
            </div>
          )}
          {delta !== undefined && (
            <div
              className={cn(
                "text-xs mt-0.5",
                delta > 0 ? "text-destructive" : delta < 0 ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(0)}% {deltaLabel || "vs last month"}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}


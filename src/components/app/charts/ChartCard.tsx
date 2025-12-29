"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ChartCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

/**
 * Chart container with subtle hover lift effect
 */
export function ChartCard({ 
  children, 
  className,
  onClick,
  hoverable = true 
}: ChartCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("rounded-lg border bg-card", className)}
      whileHover={
        hoverable && !prefersReducedMotion
          ? {
              y: -2,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              transition: { duration: 0.15, ease: "easeOut" },
            }
          : undefined
      }
      style={{
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </motion.div>
  );
}


"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useReducedMotion, getAnimationDuration } from "@/lib/hooks/useReducedMotion";
import { ChartTooltip } from "./ChartTooltip";
import { cn } from "@/lib/utils";

interface DonutData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

interface AnimatedDonutChartProps {
  data: DonutData[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  selectedIndex?: number;
  onSegmentClick?: (index: number) => void;
  showTooltip?: boolean;
  accentColor?: string;
  maxSegments?: number;
}

/**
 * Premium donut/pie chart with:
 * - Arc sweep reveal animation
 * - Hover interactions with brightness increase
 * - Selection state with desaturation
 * - Smooth transitions
 */
export function AnimatedDonutChart({
  data,
  height = 300,
  innerRadius,
  outerRadius,
  selectedIndex,
  onSegmentClick,
  showTooltip = true,
  accentColor = "hsl(var(--primary))",
  maxSegments = 8,
}: AnimatedDonutChartProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Limit segments for performance
  const displayData = useMemo(() => data.slice(0, maxSegments), [data, maxSegments]);

  const total = useMemo(
    () => displayData.reduce((sum, d) => sum + d.value, 0),
    [displayData]
  );

  const entranceDuration = getAnimationDuration(
    prefersReducedMotion ? 200 : 600,
    prefersReducedMotion
  );

  // Calculate segment colors with selection/desaturation
  const segmentColors = useMemo(() => {
    return displayData.map((item, index) => {
      const isSelected = selectedIndex === index;
      const isHovered = hoveredIndex === index;
      const isNeutral = selectedIndex !== undefined && !isSelected;

      if (isSelected) {
        return accentColor;
      }

      if (isNeutral) {
        // Desaturate non-selected segments
        return item.color + "80"; // Add opacity
      }

      if (isHovered) {
        // Brighten on hover (~10% brighter)
        return item.color;
      }

      return item.color;
    });
  }, [displayData, selectedIndex, hoveredIndex, accentColor]);


  const defaultInnerRadius = innerRadius ?? height * 0.3;
  const defaultOuterRadius = outerRadius ?? height * 0.45;

  return (
    <motion.div
      className="relative"
      style={{ height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: entranceDuration / 1000 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={defaultInnerRadius}
            outerRadius={defaultOuterRadius}
            dataKey="value"
            labelLine={false}
            label={({ name, percent }) => {
              if (!percent || percent < 0.05) return ""; // Hide labels for small slices
              return `${name}: ${(percent * 100).toFixed(0)}%`;
            }}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            animationDuration={prefersReducedMotion ? 0 : entranceDuration}
            animationEasing="ease-out"
          >
            {displayData.map((entry, index) => {
              const isSelected = selectedIndex === index;
              const isHovered = hoveredIndex === index;
              const isNeutral = selectedIndex !== undefined && !isSelected;

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={segmentColors[index]}
                  opacity={isNeutral ? 0.5 : isHovered ? 1 : 0.85}
                  style={{
                    cursor: onSegmentClick ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => {
                    if (showTooltip) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                      });
                      setHoveredIndex(index);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setTooltipPosition(null);
                  }}
                  onClick={() => onSegmentClick?.(index)}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>


      {showTooltip && hoveredIndex !== null && tooltipPosition && displayData[hoveredIndex] && (
        <ChartTooltip
          label={displayData[hoveredIndex].name}
          value={displayData[hoveredIndex].value}
          percentage={
            total > 0
              ? (displayData[hoveredIndex].value / total) * 100
              : undefined
          }
          isVisible={true}
          position={tooltipPosition}
        />
      )}
    </motion.div>
  );
}


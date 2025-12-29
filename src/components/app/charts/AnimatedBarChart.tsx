"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { useReducedMotion, getAnimationDuration } from "@/lib/hooks/useReducedMotion";
import { ChartTooltip } from "./ChartTooltip";
import { cn } from "@/lib/utils";

interface BarData {
  name: string;
  value: number;
  color: string;
}

interface AnimatedBarChartProps {
  data: BarData[];
  height?: number;
  selectedIndex?: number;
  onBarClick?: (index: number) => void;
  showTooltip?: boolean;
  accentColor?: string;
  maxBars?: number;
}

/**
 * Premium bar chart with:
 * - Staggered entrance animation (bars grow from baseline)
 * - Hover interactions with brightness increase
 * - Selection state with desaturation
 * - Smooth transitions between data changes
 */
export function AnimatedBarChart({
  data,
  height = 300,
  selectedIndex,
  onBarClick,
  showTooltip = true,
  accentColor = "hsl(var(--primary))",
  maxBars = 8,
}: AnimatedBarChartProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Limit bars for performance
  const displayData = useMemo(() => data.slice(0, maxBars), [data, maxBars]);

  const total = useMemo(
    () => displayData.reduce((sum, d) => sum + d.value, 0),
    [displayData]
  );

  const entranceDuration = getAnimationDuration(
    prefersReducedMotion ? 200 : 450,
    prefersReducedMotion
  );
  const staggerDelay = prefersReducedMotion ? 0 : 30;

  // Calculate bar colors with selection/desaturation
  const barColors = useMemo(() => {
    return displayData.map((item, index) => {
      const isSelected = selectedIndex === index;
      const isHovered = hoveredIndex === index;
      const isNeutral = selectedIndex !== undefined && !isSelected;

      if (isSelected) {
        return accentColor;
      }

      if (isNeutral) {
        // Desaturate non-selected bars
        return item.color + "80"; // Add opacity
      }

      if (isHovered) {
        // Brighten on hover (~10% brighter)
        return item.color;
      }

      return item.color;
    });
  }, [displayData, selectedIndex, hoveredIndex, accentColor]);

  return (
    <motion.div
      className="relative"
      style={{ height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: entranceDuration / 1000 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={displayData}
          margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (value.length > 8) return value.substring(0, 8) + "...";
              return value;
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
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
                  fill={barColors[index]}
                  opacity={isNeutral ? 0.5 : isHovered ? 1 : 0.85}
                  style={{
                    cursor: onBarClick ? "pointer" : "default",
                    transition: prefersReducedMotion ? "none" : "opacity 0.15s ease-out",
                  }}
                  onMouseEnter={(e) => {
                    if (showTooltip) {
                      const rect = (e.target as SVGElement).getBoundingClientRect();
                      setTooltipPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                      setHoveredIndex(index);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setTooltipPosition(null);
                  }}
                  onClick={() => onBarClick?.(index)}
                />
              );
            })}
          </Bar>
        </BarChart>
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


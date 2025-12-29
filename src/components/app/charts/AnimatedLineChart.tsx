"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Dot,
  CartesianGrid,
} from "recharts";
import { useReducedMotion, getAnimationDuration } from "@/lib/hooks/useReducedMotion";
import { ChartTooltip } from "./ChartTooltip";

interface LineData {
  name: string;
  value: number;
  color?: string;
}

interface AnimatedLineChartProps {
  data: LineData[];
  height?: number;
  strokeWidth?: number;
  showDots?: boolean;
  showTooltip?: boolean;
  accentColor?: string;
}

/**
 * Premium line chart with:
 * - Path reveal animation (stroke-dashoffset)
 * - Smooth transitions between data changes
 * - Hover interactions with tooltip
 */
export function AnimatedLineChart({
  data,
  height = 300,
  strokeWidth = 2,
  showDots = true,
  showTooltip = true,
  accentColor = "hsl(var(--primary))",
}: AnimatedLineChartProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const entranceDuration = getAnimationDuration(
    prefersReducedMotion ? 200 : 550,
    prefersReducedMotion
  );

  // Calculate path length for animation
  const pathLength = useMemo(() => {
    // Approximate path length based on data points
    return data.length * 50; // Rough estimate
  }, [data.length]);

  const CustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    const isHovered = hoveredIndex === index;

    if (!showDots || !cx || !cy) return null;

    return (
      <g>
        <motion.circle
          cx={cx}
          cy={cy}
          r={isHovered ? 5 : 3}
          fill={accentColor}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          transition={{
            duration: entranceDuration / 1000,
            delay: (entranceDuration / 1000) * 0.7,
            ease: "easeOut",
          }}
          onMouseEnter={(e) => {
            if (showTooltip) {
              const rect = e.currentTarget.getBoundingClientRect();
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
        />
      </g>
    );
  };

  return (
    <motion.div
      className="relative"
      style={{ height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: entranceDuration / 1000 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={accentColor}
            strokeWidth={strokeWidth}
            dot={showDots ? <CustomDot /> : false}
            activeDot={{ r: 6, fill: accentColor }}
            animationDuration={prefersReducedMotion ? 0 : entranceDuration}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>

      {showTooltip && hoveredIndex !== null && tooltipPosition && data[hoveredIndex] && (
        <ChartTooltip
          label={data[hoveredIndex].name}
          value={data[hoveredIndex].value}
          isVisible={true}
          position={tooltipPosition}
        />
      )}
    </motion.div>
  );
}


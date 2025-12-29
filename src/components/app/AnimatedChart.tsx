"use client";

import React from "react";
// Re-export premium chart components
export {
  AnimatedBarChart,
  AnimatedDonutChart as AnimatedPieChart,
  AnimatedProgressBar,
  AnimatedLineChart,
  ChartCard,
  ChartTooltip,
} from "./charts";

// Keep AnimatedCounter for backward compatibility
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({ value, duration = 1.2, prefix = "", suffix = "", decimals = 0 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(value);
  const prevValueRef = React.useRef(value);

  React.useEffect(() => {
    // Only animate if value actually changed
    if (prevValueRef.current === value) {
      setDisplayValue(value);
      return;
    }

    let startTime: number;
    let animationFrame: number;
    const startValue = prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      const current = startValue + (endValue - startValue) * progress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toFixed(decimals).toLocaleString()}
      {suffix}
    </span>
  );
}


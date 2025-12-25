"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryBreakdown } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

interface SpendingChartProps {
  transactions: Transaction[];
}

export function SpendingChart({ transactions }: SpendingChartProps) {
  const categoryBreakdown = useMemo(() => {
    return getCategoryBreakdown(transactions).slice(0, 5);
  }, [transactions]);

  const total = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);

  if (categoryBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No spending data yet</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate angles for donut chart
  let currentAngle = -90; // Start at top
  const segments = categoryBreakdown.map((cat) => {
    const percentage = (cat.total / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...cat,
      percentage,
      startAngle,
      endAngle,
    };
  });

  const radius = 60;
  const innerRadius = 40;
  const centerX = 120;
  const centerY = 120;

  const createArcPath = (startAngle: number, endAngle: number, inner: boolean) => {
    const r = inner ? innerRadius : radius;
    const start = {
      x: centerX + r * Math.cos((startAngle * Math.PI) / 180),
      y: centerY + r * Math.sin((startAngle * Math.PI) / 180),
    };
    const end = {
      x: centerX + r * Math.cos((endAngle * Math.PI) / 180),
      y: centerY + r * Math.sin((endAngle * Math.PI) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    if (inner) {
      return `M ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 0 ${start.x} ${start.y} L ${centerX} ${centerY} Z`;
    } else {
      return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} L ${centerX} ${centerY} Z`;
    }
  };

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base text-white">Top Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <div className="shrink-0">
            <svg width="240" height="240" viewBox="0 0 240 240">
              {segments.map((seg, idx) => (
                <path
                  key={seg.category}
                  d={createArcPath(seg.startAngle, seg.endAngle, false)}
                  fill={seg.color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all hover:opacity-80"
                />
              ))}
              {/* Inner circle for donut effect */}
              <circle
                cx={centerX}
                cy={centerY}
                r={innerRadius}
                fill="rgba(255, 255, 255, 0.1)"
              />
              {/* Center text */}
              <text
                x={centerX}
                y={centerY - 5}
                textAnchor="middle"
                className="text-xs font-semibold fill-white"
              >
                Top 5
              </text>
              <text
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                className="text-xs fill-white/80"
              >
                Categories
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm text-white">{cat.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-white">{cat.percentage.toFixed(0)}%</span>
                  <span className="text-xs text-white/70 ml-1">
                    ({cat.total.toFixed(0)} AED)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/app/AnimatedChart";
import { AnimatedDonutChart } from "@/components/app/charts/AnimatedDonutChart";
import { AnimatedProgressBar } from "@/components/app/charts/AnimatedProgressBar";
import { cn } from "@/lib/utils";
import type { InsightCardData } from "./InsightCardTopics";
import type { HomeCardDeepDive } from "@/lib/services/aiDeepDive";

/**
 * Memoized donut chart to prevent infinite re-renders
 */
function MiniDonutChartMemo({ data }: { data: any[] }) {
  // Create stable data reference - only recreate if values actually change
  const dataKey = data.map(d => `${d.name}-${d.value}-${d.color}`).join('|');
  
  const memoizedData = useMemo(() => {
    return data.map(item => ({
      name: String(item.name),
      value: Number(item.value),
      color: String(item.color),
    }));
  }, [dataKey]);
  
  return (
    <div className="w-full h-[120px] min-h-[120px]" key={dataKey}>
      <AnimatedDonutChart
        key={dataKey}
        data={memoizedData}
        height={120}
        innerRadius={30}
        outerRadius={50}
      />
    </div>
  );
}

interface InsightCardProps {
  data: InsightCardData;
  aiDeepDive?: HomeCardDeepDive | null;
  isLoadingAI?: boolean;
  onViewStory: () => void;
}

/**
 * Insight Card Component
 * Shows deterministic metrics + optional AI deep dive section
 */
export function InsightCard({ data, aiDeepDive, isLoadingAI, onViewStory }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { keyMetric, chartData } = data;

  return (
    <Card className="border border-border/50">
      <CardContent className="pt-6">
        {/* Title */}
        <h3 className="text-[16px] font-semibold mb-4">{data.title}</h3>

        {/* Key Metric */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-bold">
              <AnimatedCounter value={Math.abs(keyMetric.value)} decimals={0} />
            </span>
            <span className="text-[14px] text-muted-foreground">{keyMetric.unit}</span>
          </div>
          
          {/* Delta */}
          {keyMetric.delta && (
            <div className="mt-1 flex items-center gap-2">
              <Badge 
                variant={keyMetric.delta.isPositive ? "default" : "destructive"}
                className="text-[11px]"
              >
                {keyMetric.delta.isPositive ? "+" : ""}
                {keyMetric.delta.percentage.toFixed(0)}%
              </Badge>
              <span className="text-[12px] text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>

        {/* Mini Chart */}
        {chartData && (
          <div className="mb-4">
            {chartData.type === "mini-bars" && (
              <div className="space-y-2">
                {chartData.data.slice(0, 3).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate">{item.label}</span>
                      <span className="font-medium">{item.value.toFixed(0)} AED</span>
                    </div>
                    <AnimatedProgressBar
                      value={item.value}
                      max={chartData.data.reduce((sum, d) => sum + d.value, 0)}
                      color={item.color}
                      label=""
                      height={4}
                      delay={index * 0.03}
                    />
                  </div>
                ))}
              </div>
            )}

            {chartData.type === "mini-list" && (
              <div className="space-y-2">
                {chartData.data.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.color && (
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="text-right ml-4">
                      <span className="font-medium">{item.value.toFixed(0)}</span>
                      {item.percentage !== undefined && (
                        <span className="text-muted-foreground ml-1">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      )}
                      {item.count !== undefined && (
                        <span className="text-muted-foreground ml-1">
                          {item.count}x
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chartData.type === "mini-donut" && (
              <MiniDonutChartMemo data={chartData.data} />
            )}
          </div>
        )}

        {/* AI Deep Dive Section (collapsed by default) */}
        {aiDeepDive && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{aiDeepDive.headline}</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px]",
                      aiDeepDive.confidence === "high" && "border-green-500 text-green-500",
                      aiDeepDive.confidence === "med" && "border-yellow-500 text-yellow-500",
                      aiDeepDive.confidence === "low" && "border-gray-500 text-gray-500"
                    )}
                  >
                    {aiDeepDive.confidence}
                  </Badge>
                </div>
                <svg
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expanded && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <p className="text-[12px] text-muted-foreground">{aiDeepDive.takeaway}</p>
            </button>

            {expanded && (
              <div className="mt-3 space-y-3">
                {aiDeepDive.bullets && aiDeepDive.bullets.length > 0 && (
                  <ul className="space-y-1.5">
                    {aiDeepDive.bullets.map((bullet, index) => (
                      <li key={index} className="text-[12px] text-muted-foreground flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {aiDeepDive.suggested_action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[12px]"
                    onClick={() => {
                      // Navigate to deep link
                      window.location.href = aiDeepDive.suggested_action!.deepLink;
                    }}
                  >
                    {aiDeepDive.suggested_action.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading indicator for AI */}
        {isLoadingAI && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>AI is generating deeper insights...</span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 text-[12px]"
          onClick={onViewStory}
        >
          View story →
        </Button>
      </CardContent>
    </Card>
  );
}

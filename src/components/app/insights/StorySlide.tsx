"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedDonutChart } from "@/components/app/charts/AnimatedDonutChart";
import { AnimatedCounter } from "@/components/app/AnimatedChart";
import { AnimatedProgressBar } from "@/components/app/charts/AnimatedProgressBar";
import { ChartCard } from "@/components/app/charts/ChartCard";
import { cn } from "@/lib/utils";
import type { StorySlide as StorySlideType } from "./StoryTopics";
import type { StorySlideDeepDive } from "@/lib/services/aiDeepDive";

/**
 * Memoized donut chart to prevent infinite re-renders
 */
function DonutChartMemo({ data }: { data: any[] }) {
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
    <div className="w-full h-[400px] min-h-[400px] flex items-center justify-center" key={dataKey}>
      <AnimatedDonutChart
        key={dataKey}
        data={memoizedData}
        height={400}
        innerRadius={80}
        outerRadius={140}
      />
    </div>
  );
}

interface StorySlideProps {
  slide: StorySlideType;
  aiDeepDive?: StorySlideDeepDive;
  isLoadingAI?: boolean;
}

/**
 * Individual Story Slide Component
 * Renders chart/metric based on slide data + optional AI note
 */
export function StorySlide({ slide, aiDeepDive, isLoadingAI }: StorySlideProps) {
  const [showAINote, setShowAINote] = useState(false);

  const renderChart = () => {
    switch (slide.chartType) {
      case "metric":
        return (
          <div className="text-center py-12">
            <div className="text-[48px] font-bold mb-2">
              <AnimatedCounter 
                value={Math.abs(slide.data.value)} 
                decimals={0}
                prefix={slide.data.value < 0 ? "-" : ""}
              />
            </div>
            <div className="text-[18px] text-muted-foreground">
              {slide.data.unit || "AED"}
            </div>
            {slide.data.label && (
              <div className="text-[14px] text-muted-foreground mt-2">
                {slide.data.label}
              </div>
            )}
          </div>
        );

      case "donut":
        return (
          <DonutChartMemo data={slide.data} />
        );

      case "bars":
        const maxValue = Math.max(...slide.data.map((d: any) => Math.abs(d.value)));
        return (
          <div className="space-y-4">
            {slide.data.map((item: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.count && (
                      <span className="text-muted-foreground">{item.count}x</span>
                    )}
                    <span className="font-semibold">
                      {Math.abs(item.value).toFixed(0)} AED
                    </span>
                    {item.percentage !== undefined && (
                      <Badge variant="outline" className={cn(
                        item.isPositive === false && "border-red-500 text-red-500"
                      )}>
                        {item.percentage > 0 ? "+" : ""}{item.percentage.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <AnimatedProgressBar
                  value={Math.abs(item.value)}
                  max={maxValue}
                  color={item.color || "#3b82f6"}
                  label=""
                  height={8}
                  delay={index * 0.05}
                />
              </div>
            ))}
          </div>
        );

      default:
        return <div>Unknown chart type</div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ChartCard>
        <CardHeader>
          <CardTitle className="text-[20px] font-semibold">{slide.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </ChartCard>

      {/* AI Note Overlay */}
      {aiDeepDive && (
        <div className="mt-4">
          <button
            onClick={() => setShowAINote(!showAINote)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  AI Note
                </Badge>
                <span className="text-[13px] font-medium">{aiDeepDive.headline}</span>
              </div>
              <svg
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showAINote && "rotate-180"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showAINote && (
            <Card className="mt-2 border-border/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-[13px] font-medium mb-1">Why it matters</p>
                    <p className="text-[12px] text-muted-foreground">{aiDeepDive.why_it_matters}</p>
                  </div>
                  
                  {aiDeepDive.suggested_action && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[12px]"
                      onClick={() => {
                        window.location.href = aiDeepDive.suggested_action!.deepLink;
                      }}
                    >
                      {aiDeepDive.suggested_action.label}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isLoadingAI && !aiDeepDive && (
        <div className="mt-4 p-3 rounded-lg border border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>AI is generating insights...</span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeepDiveResult } from "@/lib/services/aiDeepDive";

interface AIHintsPanelProps {
  hints?: DeepDiveResult | null;
  isLoading?: boolean;
}

/**
 * AI Hints Panel for Analyst Mode
 * Collapsible panel showing structured AI hints (not prose)
 */
export function AIHintsPanel({ hints, isLoading }: AIHintsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hints && !isLoading) {
    return null;
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-center justify-between"
        >
          <CardTitle className="text-[14px] font-semibold">AI Hints</CardTitle>
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
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Generating hints...</span>
            </div>
          )}

          {hints && (
            <>
              {/* Headline */}
              {hints.headline && (
                <div>
                  <p className="text-[13px] font-semibold mb-1">{hints.headline}</p>
                </div>
              )}

              {/* Takeaway */}
              {hints.takeaway && (
                <div>
                  <p className="text-[12px] text-muted-foreground mb-2">{hints.takeaway}</p>
                </div>
              )}

              {/* Why it matters */}
              {hints.why_it_matters && (
                <div>
                  <p className="text-[12px] font-medium mb-1">Why it matters</p>
                  <p className="text-[11px] text-muted-foreground">{hints.why_it_matters}</p>
                </div>
              )}

              {/* Bullets */}
              {hints.bullets && hints.bullets.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium mb-2">Key Points</p>
                  <ul className="space-y-1">
                    {hints.bullets.map((bullet, index) => (
                      <li key={index} className="text-[11px] text-muted-foreground">
                        • {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Action */}
              {hints.suggested_action && (
                <div>
                  <p className="text-[12px] font-medium mb-2">Suggested Action</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] justify-start"
                    onClick={() => {
                      window.location.href = hints.suggested_action!.deepLink;
                    }}
                  >
                    {hints.suggested_action.label}
                  </Button>
                </div>
              )}

              {/* Confidence */}
              {hints.confidence && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Confidence:</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px]",
                        hints.confidence === "high" && "border-green-500 text-green-500",
                        hints.confidence === "med" && "border-yellow-500 text-yellow-500",
                        hints.confidence === "low" && "border-gray-500 text-gray-500"
                      )}
                    >
                      {hints.confidence}
                    </Badge>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

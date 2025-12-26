"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadWrapSnapshots, deleteWrapSnapshot } from "@/lib/storage";
import type { WrapSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecapsLibraryProps {
  onPlayWrap: (snapshot: WrapSnapshot) => void;
  onNavigate?: (tab: string) => void;
}

export function RecapsLibrary({ onPlayWrap, onNavigate }: RecapsLibraryProps) {
  const [wraps, setWraps] = useState<WrapSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWraps();
  }, []);

  const loadWraps = async () => {
    setIsLoading(true);
    const loaded = await loadWrapSnapshots();
    // Sort by creation date, newest first
    loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setWraps(loaded);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this wrap?")) {
      await deleteWrapSnapshot(id);
      loadWraps();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading wraps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
            Recaps Library
          </h1>
          <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
            All your saved monthly and custom wraps
          </p>
        </div>
        {onNavigate && (
          <Button
            onClick={() => onNavigate("create-wrap")}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Wrap
          </Button>
        )}
      </div>

      {wraps.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No wraps yet</p>
            <p className="text-sm text-muted-foreground">
              Wraps are automatically created after importing statements, or you can create custom wraps.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wraps.map((wrap) => (
            <Card key={wrap.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{wrap.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {wrap.type === "monthly" ? "Monthly wrap" : "Custom wrap"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {formatDate(wrap.createdAt)}
                    </p>
                    {wrap.watchedAt && (
                      <p className="text-xs text-muted-foreground">
                        Watched {formatDate(wrap.watchedAt)}
                      </p>
                    )}
                  </div>
                  {!wrap.watchedAt && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hero number</span>
                    <span className="font-medium">
                      {wrap.wrapData.heroNumber} {wrap.wrapData.heroLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total spent</span>
                    <span className="font-medium">
                      {wrap.wrapData.currency} {wrap.wrapData.totalSpent.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onPlayWrap(wrap)}
                    size="sm"
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Play
                  </Button>
                  <Button
                    onClick={() => handleDelete(wrap.id)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


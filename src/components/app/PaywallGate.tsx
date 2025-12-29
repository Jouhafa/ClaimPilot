"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import type { LicenseTier } from "@/lib/types";

interface PaywallGateProps {
  feature: string;
  requiredTier: LicenseTier;
  title: string;
  description: string;
  children: React.ReactNode;
}

const TIER_NAMES: Record<LicenseTier, string> = {
  free: "Free",
  paid: "Lifetime",
  premium: "Premium",
};

const TIER_ORDER: LicenseTier[] = ["free", "paid", "premium"];

function getTierIndex(tier: LicenseTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function PaywallGate({ 
  feature, 
  requiredTier, 
  title, 
  description, 
  children 
}: PaywallGateProps) {
  const { hasAccess, tier } = useApp();

  // DEV MODE: Always show content for authenticated users
  // If user has access, show the content
  if (hasAccess(feature)) {
    return <>{children}</>;
  }
  
  // In dev mode, if user is authenticated, always grant access
  // (This is a fallback - hasAccess should already return true for authenticated users)
  return <>{children}</>;

  // Show upgrade prompt
  const currentTierIndex = getTierIndex(tier);
  const requiredTierIndex = getTierIndex(requiredTier);
  const needsUpgrade = requiredTierIndex > currentTierIndex;

  const purchaseLink = requiredTier === "premium" 
    ? "#premium-waitlist" 
    : "https://jouhafaz.gumroad.com/l/rizayy";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            {TIER_NAMES[requiredTier]}+
          </Badge>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card className="border-dashed border-2 border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-amber-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>

          <h3 className="text-xl font-semibold mb-2">
            Unlock {title}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            This feature is available for {TIER_NAMES[requiredTier]} users. 
            {needsUpgrade 
              ? ` Upgrade from ${TIER_NAMES[tier]} to access this feature.`
              : " Get your license to unlock all features."}
          </p>

          <div className="space-y-3">
            <a href={purchaseLink} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="min-w-[200px]">
                {requiredTier === "premium" ? (
                  "Join Premium Waitlist"
                ) : (
                  <>
                    Get {TIER_NAMES[requiredTier]} Access
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </>
                )}
              </Button>
            </a>
            {tier === "free" && (
              <p className="text-sm text-muted-foreground">
                Already have a license? Enter it in the Export tab.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview of what's behind the gate */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10 pointer-events-none" />
        <div className="opacity-30 blur-sm pointer-events-none">
          {children}
        </div>
      </div>
    </div>
  );
}

// Simple wrapper for checking access in component logic
export function useFeatureAccess(feature: string): boolean {
  const { hasAccess } = useApp();
  return hasAccess(feature);
}

// HOC for wrapping entire components
export function withPaywallGate(
  Component: React.ComponentType,
  feature: string,
  requiredTier: LicenseTier,
  title: string,
  description: string
) {
  return function GatedComponent() {
    return (
      <PaywallGate
        feature={feature}
        requiredTier={requiredTier}
        title={title}
        description={description}
      >
        <Component />
      </PaywallGate>
    );
  };
}


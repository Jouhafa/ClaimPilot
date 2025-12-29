"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/context";
import type { UserProfile } from "@/lib/appState";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import type { Bucket, MerchantAlias } from "@/lib/types";

const ONBOARDING_KEY = "claimpilot_onboarding_completed";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { profile, setProfile, buckets, addBucket, aliases, addAlias } = useApp();
  const [step, setStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  // Form state
  const [nickname, setNickname] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [income, setIncome] = useState("");
  const [city, setCity] = useState("");
  const [defaultStatementType, setDefaultStatementType] = useState<"credit" | "debit">("credit");

  useEffect(() => {
    // Check if onboarding already completed
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed && (!profile || !profile.onboardingCompleted)) {
      setIsVisible(true);
    }
  }, [profile]);

  const handleStep1Next = async () => {
    if (!nickname.trim()) {
      alert("Please enter a nickname");
      return;
    }
    setStep(2);
  };

  const handleStep2Next = async () => {
    // Create default buckets if none exist
    if (buckets.length === 0) {
      const defaultBuckets: Bucket[] = [
        {
          id: uuidv4(),
          name: "Needs",
          targetPercentage: 50,
          linkedCategories: ["rent", "utilities", "groceries", "transport", "health", "insurance"],
          color: "#3b82f6",
          createdAt: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: "Wants",
          targetPercentage: 30,
          linkedCategories: ["dining", "shopping", "entertainment", "subscriptions", "travel"],
          color: "#f97316",
          createdAt: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: "Goals",
          targetPercentage: 20,
          linkedCategories: ["savings", "investment"],
          color: "#22c55e",
          createdAt: new Date().toISOString(),
        },
      ];
      
      for (const bucket of defaultBuckets) {
        await addBucket(bucket);
      }
    }
    
    // Ensure default merchant aliases exist for new users
    if (aliases.length === 0) {
      const defaultAliases = [
        { id: "careem", variants: ["CAREEM", "CAREEM HALA", "CAREEM UAE"], normalizedName: "Careem" },
        { id: "uber", variants: ["UBER", "UBER BV", "UBER TRIP", "UBER EATS"], normalizedName: "Uber" },
        { id: "amazon", variants: ["AMAZON", "AMAZON.AE", "AMZN", "AMAZON AWS"], normalizedName: "Amazon" },
        { id: "netflix", variants: ["NETFLIX", "NETFLIX.COM"], normalizedName: "Netflix" },
        { id: "spotify", variants: ["SPOTIFY", "SPOTIFY AB"], normalizedName: "Spotify" },
        { id: "starbucks", variants: ["STARBUCKS", "STARBUCKS COFFEE"], normalizedName: "Starbucks" },
        { id: "marriott", variants: ["MARRIOTT", "MARRIOTT HOTEL", "MARRIOTT BONVOY"], normalizedName: "Marriott" },
        { id: "hilton", variants: ["HILTON", "HILTON HOTEL", "HILTON HONORS"], normalizedName: "Hilton" },
      ];
      
      for (const alias of defaultAliases) {
        await addAlias(alias);
      }
    }
    
    setStep(3);
  };

  const handleStep3Next = () => {
    setStep(4);
  };

  const handleComplete = async () => {
    const newProfile: UserProfile = {
      nickname: nickname.trim(),
      currency,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      income: income ? parseFloat(income) : undefined,
      city: city.trim() || undefined,
      defaultStatementType,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setProfile(newProfile);
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl space-y-8 page-transition">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                s === step ? "bg-primary w-8" : s < step ? "bg-primary/50 w-4" : "bg-muted w-4"
              )}
            />
          ))}
        </div>

        {/* Step content - full screen focus */}
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[34px] font-bold mb-2" style={{ fontWeight: 700, lineHeight: 1.35 }}>Welcome to ClaimPilot</h2>
                <p className="text-[15px] text-muted-foreground" style={{ lineHeight: 1.6 }}>
                  Let's get you set up in 2 minutes
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="nickname" className="text-[15px] font-medium mb-2 block">Nickname *</Label>
                  <Input
                    id="nickname"
                    placeholder="How should we call you?"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="h-12 text-[15px]"
                  />
                </div>
                <div>
                  <Label htmlFor="currency" className="text-[15px] font-medium mb-2 block">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-12 text-[15px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED (UAE Dirham)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                      <SelectItem value="SAR">SAR (Saudi Riyal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-[15px] font-medium mb-2 block">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-[15px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[15px] font-medium mb-2 block">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+971 50 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 text-[15px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="income" className="text-[15px] font-medium mb-2 block">Monthly Income (optional)</Label>
                    <Input
                      id="income"
                      type="number"
                      placeholder="50000"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      className="h-12 text-[15px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-[15px] font-medium mb-2 block">City (optional)</Label>
                    <Input
                      id="city"
                      placeholder="Dubai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-12 text-[15px]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleStep1Next} size="lg" className="h-12 px-8">Next →</Button>
              </div>
            </div>
          )}

          {/* Step 2: Buckets & Goals */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[34px] font-bold mb-2" style={{ fontWeight: 700, lineHeight: 1.35 }}>Budget Buckets</h2>
                <p className="text-[15px] text-muted-foreground mb-6" style={{ lineHeight: 1.6 }}>
                  We've set up default buckets (Needs, Wants, Goals). You can customize these later.
                </p>
                <div className="space-y-2">
                  {[
                    { name: "Needs", percentage: 50, color: "#3b82f6" },
                    { name: "Wants", percentage: 30, color: "#f97316" },
                    { name: "Goals", percentage: 20, color: "#22c55e" },
                  ].map((bucket) => (
                    <div
                      key={bucket.name}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{ borderLeftColor: bucket.color, borderLeftWidth: 4 }}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{bucket.name}</p>
                        <p className="text-xs text-muted-foreground">{bucket.percentage}% of income</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} size="lg" className="h-12 px-8">← Back</Button>
                <Button onClick={handleStep2Next} size="lg" className="h-12 px-8">Next →</Button>
              </div>
            </div>
          )}

          {/* Step 3: Bank Profile */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[34px] font-bold mb-2" style={{ fontWeight: 700, lineHeight: 1.35 }}>Default Statement Type</h2>
                <p className="text-[15px] text-muted-foreground mb-6" style={{ lineHeight: 1.6 }}>
                  What type of statements do you usually import? You can change this per upload.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setDefaultStatementType("credit")}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      defaultStatementType === "credit"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <div>
                        <p className="font-medium">Credit Card</p>
                        <p className="text-xs text-muted-foreground">Most common for reimbursements</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setDefaultStatementType("debit")}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      defaultStatementType === "debit"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <div>
                        <p className="font-medium">Debit / Current / Savings Account</p>
                        <p className="text-xs text-muted-foreground">Bank account statements</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} size="lg" className="h-12 px-8">← Back</Button>
                <Button onClick={handleStep3Next} size="lg" className="h-12 px-8">Next →</Button>
              </div>
            </div>
          )}

          {/* Step 4: Start Tour or Skip */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[34px] font-bold mb-2" style={{ fontWeight: 700, lineHeight: 1.35 }}>You're all set!</h2>
                <p className="text-[15px] text-muted-foreground mb-6" style={{ lineHeight: 1.6 }}>
                  Would you like to take a quick tour of ClaimPilot, or skip and explore on your own?
                </p>
              </div>
              <div className="space-y-4">
                <Button 
                  onClick={handleComplete} 
                  size="lg" 
                  className="w-full h-14 text-[15px]"
                >
                  Start Tour
                </Button>
                <Button 
                  onClick={handleComplete} 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-14 text-[15px]"
                >
                  Skip and Explore
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

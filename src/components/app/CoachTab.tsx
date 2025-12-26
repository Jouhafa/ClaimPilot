"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useApp } from "@/lib/context";
import { estimateMonthlySavings, isGoalOnTrack } from "@/lib/goalEngine";
import { CoachChapter } from "./CoachChapter";
import { ExampleBottomSheet } from "./ExampleBottomSheet";
import { SpendingChart } from "./SpendingChart";
import { ReimbursementPipeline } from "./ReimbursementPipeline";
import { CardSafetyMeter } from "./CardSafetyMeter";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";

interface StoryCard {
  id: string;
  emoji: string;
  name: string;
  age: number;
  location: string;
  whatHappened: string[];
  theFix: string[];
  theOutcome: string;
}

interface CoachTabProps {
  onNavigate?: (tab: string) => void;
}

export function CoachTab({ onNavigate }: CoachTabProps) {
  const { theme } = useTheme();
  const [currentChapter, setCurrentChapter] = useState(0);
  const [selectedExample, setSelectedExample] = useState<StoryCard | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const { transactions, goals, buckets, cardSafety, recurring, incomeConfig } = useApp();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const navigateTo = (tab: string) => {
    if (onNavigate) {
      const tabName = tab.split("?")[0].split("/")[0];
      onNavigate(tabName);
    }
  };

  // Calculate pending reimbursements
  const pendingReimbursements = useMemo(() => {
    return transactions
      .filter(t => t.tag === "reimbursable" && t.status !== "paid" && !t.parentId)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  // Calculate goal status
  const goalStatus = useMemo(() => {
    if (goals.length === 0) return null;
    
    const monthlySavings = estimateMonthlySavings(transactions, 3, incomeConfig?.monthlyIncome);
    const topGoal = goals.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];

    const trackStatus = isGoalOnTrack(topGoal, monthlySavings);
    const progress = (topGoal.currentAmount / topGoal.targetAmount) * 100;

    return {
      goal: topGoal,
      progress,
      isOnTrack: trackStatus.isOnTrack,
    };
  }, [goals, transactions, incomeConfig]);

  // Animate progress counter
  useEffect(() => {
    const target = currentChapter + 1;
    const duration = 300;
    const steps = 20;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setProgressCount(target);
        clearInterval(timer);
      } else {
        setProgressCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [currentChapter]);

  // Chapters data with new structure
  const chapters = useMemo(() => {
    return [
      {
        id: "spending-truth",
        hook: "What your statement is really telling you",
        visual: transactions.length > 0 ? <SpendingChart transactions={transactions} /> : (
          <div className={cn(
            "rounded-lg p-8 backdrop-blur-sm border text-center",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <p className={isDark ? "text-white/80" : "text-gray-700"}>Import your statement to see your spending breakdown</p>
          </div>
        ),
        bullets: [
          "What are my top 3 categories?",
          "Am I spending more than I earn?"
        ],
        cta: { text: "Open Analytics", tab: "analytics" },
        gradient: "from-blue-500 via-blue-600 to-cyan-500",
        color: "blue",
        examples: [
          {
            id: "yasmine",
            emoji: "💼",
            name: "Yasmine",
            age: 26,
            location: "Dubai",
            whatHappened: [
              "I earn well but still feel broke sometimes",
              "Rent: 6,900 AED",
              "Dining + coffee: 3,400 AED",
              "Transport: 2,100 AED",
              "Subscriptions: 220 AED",
              "Reimbursable travel pending: 7,500 AED"
            ],
            theFix: [
              "Found biggest leak: Dining/Coffee (10% of income)",
              "Identified floating reimbursements: 7,500 AED (money owed to you)",
              "Cancelled 1-2 subscriptions likely unused"
            ],
            theOutcome: "Saved 800 AED/month by cutting dining by 30% and submitting reimbursements faster"
          },
          {
            id: "mohammed",
            emoji: "📊",
            name: "Mohammed",
            age: 32,
            location: "Abu Dhabi",
            whatHappened: [
              "Thought I was spending 5,000 AED/month on groceries",
              "Actually spending 8,200 AED/month",
              "Multiple small purchases at different stores",
              "No visibility into total spending"
            ],
            theFix: [
              "Consolidated grocery shopping to 2 stores",
              "Set up monthly grocery budget bucket",
              "Tracked all food-related expenses together"
            ],
            theOutcome: "Reduced grocery spending by 25% (2,050 AED/month saved) by planning meals and shopping strategically"
          }
        ]
      },
      {
        id: "reimbursements",
        hook: "Reimbursements are money you're owed",
        visual: transactions.length > 0 ? <ReimbursementPipeline transactions={transactions} /> : (
          <div className={cn(
            "rounded-lg p-8 backdrop-blur-sm border text-center",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <p className={isDark ? "text-white/80" : "text-gray-700"}>Track your reimbursements to get your money back faster</p>
          </div>
        ),
        bullets: [
          "Keep everything in 3 states: Draft → Submitted → Paid",
          "Submit before card due date to avoid interest"
        ],
        cta: { text: "Open Reimbursements", tab: "reimbursements" },
        gradient: "from-amber-600 via-orange-600 to-red-600",
        color: "amber",
        examples: [
          {
            id: "interest-trap",
            emoji: "💸",
            name: "The interest trap",
            age: 0,
            location: "Common mistake",
            whatHappened: [
              "Card due in 10 days: 8,457 AED",
              "Pending reimbursements: 7,500 AED",
              "Didn't account for reimbursements when paying"
            ],
            theFix: [
              "Used Card Safety calculator",
              "Paid only 957 AED (8,457 - 7,500)",
              "Submitted reimbursements same day"
            ],
            theOutcome: "Avoided paying interest on 7,500 AED, got reimbursed 2 weeks later"
          },
          {
            id: "late-submission",
            emoji: "⏳",
            name: "Late submission cost",
            age: 0,
            location: "Real scenario",
            whatHappened: [
              "Had 12,000 AED in reimbursements",
              "Forgot to submit for 2 months",
              "Paid full card balance including reimbursements",
              "Lost cash flow for 60 days"
            ],
            theFix: [
              "Set up weekly reminder to submit",
              "Created batch template for common expenses",
              "Tracked all reimbursements in one place"
            ],
            theOutcome: "Now submitting weekly, getting money back in 7-10 days instead of 60+ days"
          }
        ]
      },
      {
        id: "buckets",
        hook: "Buckets beat budgets",
        visual: (
          <div className={cn(
            "rounded-lg p-8 backdrop-blur-sm border",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl mb-2">📊</div>
                <p className={cn("text-sm", isDark ? "text-white/90" : "text-gray-700")}>Bills + Living</p>
                <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>60%</p>
              </div>
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <p className={cn("text-sm", isDark ? "text-white/90" : "text-gray-700")}>Goals</p>
                <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>10%</p>
              </div>
              <div>
                <div className="text-3xl mb-2">💰</div>
                <p className={cn("text-sm", isDark ? "text-white/90" : "text-gray-700")}>Investing</p>
                <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>5%</p>
              </div>
            </div>
          </div>
        ),
        bullets: [
          "Organize money into clear categories: Bills, Living, Fun, Buffer, Goals, Investing",
          "Feel structured, not restricted"
        ],
        cta: { text: "Set up buckets", tab: "buckets" },
        gradient: "from-purple-600 via-fuchsia-600 to-pink-600",
        color: "purple",
        examples: [
          {
            id: "bucket-templates",
            emoji: "📐",
            name: "Pick a template",
            age: 0,
            location: "Quick start",
            whatHappened: [
              "Didn't know how to allocate money",
              "Tried strict budgets, failed after 2 weeks",
              "Felt restricted and gave up"
            ],
            theFix: [
              "Balanced: Bills+Living 60% | Fun 15% | Buffer 10% | Goals 10% | Investing 5%",
              "Aggressive: Bills+Living 55% | Fun 10% | Buffer 10% | Goals 15% | Investing 10%",
              "Chill: Bills+Living 70% | Fun 15% | Buffer 10% | Goals/Invest 5%"
            ],
            theOutcome: "Chose Balanced template, now tracking spending without feeling restricted"
          },
          {
            id: "overspending-fun",
            emoji: "🎪",
            name: "Sarah",
            age: 28,
            location: "Dubai",
            whatHappened: [
              "Spent 40% of income on 'fun' (dining, shopping, events)",
              "Couldn't save for vacation goal",
              "Felt guilty but kept overspending"
            ],
            theFix: [
              "Set up Fun bucket with 15% limit",
              "Tracked all fun spending in one place",
              "Moved excess to Goals bucket when fun bucket full"
            ],
            theOutcome: "Reduced fun spending to 15%, saved 2,500 AED/month for vacation goal"
          }
        ]
      },
      {
        id: "credit-cards",
        hook: "The Card Safety rule",
        visual: cardSafety ? <CardSafetyMeter cardSafety={cardSafety} pendingReimbursements={pendingReimbursements} /> : (
          <div className={cn(
            "rounded-lg p-8 backdrop-blur-sm border text-center",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <p className={isDark ? "text-white/80" : "text-gray-700"}>Calculate exactly what to pay to avoid interest</p>
          </div>
        ),
        bullets: [
          "Before the due date, pay enough to avoid interest",
          "Account for reimbursements you expect before the due date"
        ],
        cta: { text: "Open Card Safety", tab: "card-safety" },
        gradient: "from-red-600 via-rose-600 to-pink-600",
        color: "red",
        examples: [
          {
            id: "taxi-car",
            emoji: "🚙",
            name: "Taxi → car isn't always cheaper",
            age: 0,
            location: "Cost shift reality",
            whatHappened: [
              "Before car: Taxi 300/week ≈ 1,200/month",
              "Thought buying car would save money",
              "Didn't plan for all costs"
            ],
            theFix: [
              "After car: fuel + parking + salik ≈ 1,000-1,500/month",
              "It's not always a saving — it's a cost shift",
              "Added car as a goal to plan for it properly"
            ],
            theOutcome: "Planned for 1,200/month car costs, avoided financial stress"
          },
          {
            id: "minimum-payment-trap",
            emoji: "⚠️",
            name: "The minimum payment trap",
            age: 0,
            location: "Common mistake",
            whatHappened: [
              "Paid only minimum payment (500 AED)",
              "Statement balance was 8,000 AED",
              "Paid 450 AED in interest over 3 months",
              "Didn't realize how much interest was costing"
            ],
            theFix: [
              "Used Card Safety to calculate exact amount needed",
              "Paid statement balance minus reimbursements",
              "Set up automatic payment reminder"
            ],
            theOutcome: "Saved 450 AED in interest, now paying strategically every month"
          }
        ]
      },
      {
        id: "goals",
        hook: "Goal math (no drama)",
        visual: goalStatus ? (
          <div className={cn(
            "rounded-lg p-4 backdrop-blur-sm border",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className={isDark ? "text-white/90" : "text-gray-700"}>Progress</span>
                <span className={cn("font-bold text-2xl", isDark ? "text-white" : "text-gray-900")}>{goalStatus.progress.toFixed(0)}%</span>
              </div>
              <Progress value={goalStatus.progress} className="h-4" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={goalStatus.isOnTrack ? "default" : "destructive"}>
                {goalStatus.isOnTrack ? "On track" : "Behind"}
              </Badge>
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-lg p-8 backdrop-blur-sm border text-center",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <p className={isDark ? "text-white/80" : "text-gray-700"}>Monthly needed = (Target − Current saved) ÷ Months</p>
          </div>
        ),
        bullets: [
          "Set realistic targets with clear deadlines",
          "Track progress monthly and adjust if needed"
        ],
        cta: { text: "Create a goal", tab: "goals" },
        gradient: "from-green-600 via-emerald-600 to-teal-600",
        color: "green",
        examples: [
          {
            id: "home-goal",
            emoji: "🏡",
            name: "Home goal reality check",
            age: 0,
            location: "Common scenario",
            whatHappened: [
              "Goal: 200,000 AED in 36 months",
              "Needed: ~5,550 AED/month",
              "Could only save 3,000 AED/month"
            ],
            theFix: [
              "Extended timeline to 60 months",
              "Reduced target to 180,000 AED",
              "Cut fun spend by 500 AED/month"
            ],
            theOutcome: "Now on track: 3,000 AED/month for 60 months = 180,000 AED goal"
          },
          {
            id: "vacation-goal",
            emoji: "🌴",
            name: "Ahmed",
            age: 30,
            location: "Dubai",
            whatHappened: [
              "Wanted to go to Japan (30,000 AED)",
              "Tried to save but kept dipping into savings",
              "Never reached the goal after 2 years"
            ],
            theFix: [
              "Created dedicated vacation goal bucket",
              "Set up automatic monthly transfer",
              "Tracked progress visually every month"
            ],
            theOutcome: "Saved 30,000 AED in 10 months, went on dream vacation without debt"
          }
        ]
      },
      {
        id: "investing",
        hook: "Boring investing wins",
        visual: (
          <div className={cn(
            "rounded-lg p-8 backdrop-blur-sm border text-center",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <p className={cn("mb-4", isDark ? "text-white/80" : "text-gray-700")}>3 questions to guide your strategy:</p>
            <ul className={cn("space-y-2 text-left max-w-md mx-auto", isDark ? "text-white/90" : "text-gray-800")}>
              <li>• When do you need the money?</li>
              <li>• Can you handle a dip without panic-selling?</li>
              <li>• Are you diversified?</li>
            </ul>
            <p className={cn("text-xs italic mt-4", isDark ? "text-white/60" : "text-gray-500")}>Educational only. Not financial advice.</p>
          </div>
        ),
        bullets: [
          "This isn't stock-picking. It's building a machine.",
          "Set clear rules and stick to them"
        ],
        cta: { text: "Set investment policy", tab: "investments" },
        gradient: "from-teal-600 via-cyan-600 to-blue-600",
        color: "teal",
        examples: [
          {
            id: "fomo-investing",
            emoji: "📈",
            name: "FOMO investing mistake",
            age: 0,
            location: "Common trap",
            whatHappened: [
              "Bought hot stocks based on social media",
              "Panic sold when market dipped 15%",
              "Lost 8,000 AED in 3 months",
              "No clear strategy or timeline"
            ],
            theFix: [
              "Set up investment policy with clear rules",
              "Diversified across index funds",
              "Set 10-year timeline, ignored short-term dips"
            ],
            theOutcome: "Now investing consistently, portfolio up 12% over 2 years with less stress"
          }
        ]
      },
      {
        id: "monthly-routine",
        hook: "The 30-minute monthly reset",
        visual: (
          <div className={cn(
            "rounded-lg p-6 backdrop-blur-sm border",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl mb-2">📊</div>
                <p className={cn("text-xs", isDark ? "text-white/90" : "text-gray-700")}>Week 1: Review</p>
              </div>
              <div>
                <div className="text-2xl mb-2">🔍</div>
                <p className={cn("text-xs", isDark ? "text-white/90" : "text-gray-700")}>Week 2: Cancel leaks</p>
              </div>
              <div>
                <div className="text-2xl mb-2">💸</div>
                <p className={cn("text-xs", isDark ? "text-white/90" : "text-gray-700")}>Week 3: Submit claims</p>
              </div>
              <div>
                <div className="text-2xl mb-2">🎯</div>
                <p className={cn("text-xs", isDark ? "text-white/90" : "text-gray-700")}>Week 4: Fund goals</p>
              </div>
            </div>
          </div>
        ),
        bullets: [
          "A simple routine to stay on top of your finances",
          "Week 1: Review → Week 2: Cancel → Week 3: Submit → Week 4: Fund"
        ],
        cta: { text: "Generate this month's plan", tab: "action-plan" },
        gradient: "from-indigo-600 via-purple-600 to-pink-600",
        color: "indigo",
        examples: [
          {
            id: "routine-success",
            emoji: "🎯",
            name: "Fatima",
            age: 29,
            location: "Abu Dhabi",
            whatHappened: [
              "Used to check finances only when bills were due",
              "Always surprised by spending",
              "Goals never progressed",
              "Felt out of control"
            ],
            theFix: [
              "Set up 30-minute monthly routine",
              "Week 1: Reviewed spending, found 3 leaks",
              "Week 2: Cancelled unused subscriptions",
              "Week 3: Submitted all reimbursements",
              "Week 4: Funded goals and planned next month"
            ],
            theOutcome: "Now feels in control, goals on track, saved 1,200 AED/month from cancelled subscriptions"
          }
        ]
      },
      {
        id: "what-to-expect",
        hook: "What to expect",
        visual: (
          <div className={cn(
            "rounded-lg p-6 backdrop-blur-sm border",
            isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
          )}>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <span className={isDark ? "text-white/90" : "text-gray-700"}>Instant: spending breakdown</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <span className={isDark ? "text-white/90" : "text-gray-700"}>2 min: tag reimbursements</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <span className={isDark ? "text-white/90" : "text-gray-700"}>5 min: set goals</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <span className={isDark ? "text-white/90" : "text-gray-700"}>10 min: monthly plan</span>
              </div>
            </div>
          </div>
        ),
        bullets: [
          "What happens after you import",
          "What the app won't do (realistic expectations)"
        ],
        cta: { text: "Get started", tab: "import" },
        gradient: "from-slate-600 via-gray-600 to-zinc-600",
        color: "gray",
        examples: [
          {
            id: "what-app-wont-do",
            emoji: "🎪",
            name: "What the app won't do",
            age: 0,
            location: "Realistic expectations",
            whatHappened: [
              "Won't magically raise your income",
              "Won't pick stocks like a wizard",
              "Won't be perfect day 1"
            ],
            theFix: [
              "Your rules make it smarter over time",
              "You control the data and decisions",
              "It's a tool, not a magic solution"
            ],
            theOutcome: "Realistic expectations lead to better long-term use and results"
          },
          {
            id: "first-week",
            emoji: "⭐",
            name: "First week experience",
            age: 0,
            location: "New user journey",
            whatHappened: [
              "Imported first statement",
              "Saw spending breakdown instantly",
              "Found 3 recurring subscriptions forgot about",
              "Tagged reimbursements in 5 minutes"
            ],
            theFix: [
              "Set up first goal (vacation)",
              "Applied bucket template",
              "Generated first monthly plan",
              "Felt in control for first time"
            ],
            theOutcome: "Went from confused to clear action plan in 15 minutes, cancelled 2 unused subscriptions saving 400 AED/month"
          }
        ]
      }
    ];
  }, [transactions, cardSafety, pendingReimbursements, goalStatus]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isBottomSheetOpen) return; // Don't navigate chapters when bottom sheet is open

      if (e.key === "ArrowLeft" && currentChapter > 0) {
        setCurrentChapter(currentChapter - 1);
      } else if (e.key === "ArrowRight" && currentChapter < chapters.length - 1) {
        setCurrentChapter(currentChapter + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentChapter, chapters.length, isBottomSheetOpen]);

  const handleExampleClick = (example: StoryCard) => {
    setSelectedExample(example);
    setIsBottomSheetOpen(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
    setTimeout(() => setSelectedExample(null), 300);
  };

  const currentChapterData = chapters[currentChapter];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background" style={{ height: "100vh" }}>
      {/* Back/Close Button */}
      <button
        onClick={() => onNavigate?.("home")}
        className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-background/90 backdrop-blur-sm border border-border hover:bg-muted transition-colors shadow-lg"
        aria-label="Close Coach and return to home"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Indicator */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4 pointer-events-none" role="progressbar" aria-valuenow={currentChapter + 1} aria-valuemin={1} aria-valuemax={chapters.length} aria-label={`Chapter ${currentChapter + 1} of ${chapters.length}`}>
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto" aria-hidden="true">
          {chapters.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                index === currentChapter
                  ? "bg-primary shadow-lg"
                  : "bg-primary/30"
              )}
            />
          ))}
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-foreground/80 font-medium bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
            {progressCount} / {chapters.length}
          </span>
        </div>
      </div>

      {/* Chapter Content */}
      <div className="relative w-full h-full" role="region" aria-live="polite" aria-label={`Chapter ${currentChapter + 1}: ${currentChapterData?.hook}`}>
        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className="absolute inset-0"
            style={{
              opacity: index === currentChapter ? 1 : 0,
              pointerEvents: index === currentChapter ? "auto" : "none",
              transition: "opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            aria-hidden={index !== currentChapter}
          >
            <CoachChapter
              hook={chapter.hook}
              visual={chapter.visual}
              bullets={chapter.bullets}
              cta={chapter.cta}
              examples={chapter.examples}
              gradient={chapter.gradient}
              color={chapter.color}
              onNavigate={navigateTo}
              onExampleClick={handleExampleClick}
            />
          </div>
        ))}
      </div>

      {/* Navigation Buttons - Always Visible */}
      <div className="absolute bottom-8 left-0 right-0 z-20 px-8">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button
            onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
            disabled={currentChapter === 0}
            variant="outline"
            size="lg"
            className="bg-background/95 backdrop-blur-md border-2 border-border shadow-lg hover:scale-105 transition-all duration-200 h-16 text-lg font-semibold"
            aria-label="Previous chapter"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>

          <Button
            onClick={() => setCurrentChapter(Math.min(chapters.length - 1, currentChapter + 1))}
            disabled={currentChapter === chapters.length - 1}
            variant="outline"
            size="lg"
            className="bg-background/95 backdrop-blur-md border-2 border-border shadow-lg hover:scale-105 transition-all duration-200 h-16 text-lg font-semibold"
            aria-label="Next chapter"
          >
            Next
            <svg className="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Example Bottom Sheet */}
      <ExampleBottomSheet
        example={selectedExample}
        isOpen={isBottomSheetOpen}
        onClose={handleCloseBottomSheet}
        color={currentChapterData?.color || "blue"}
      />
    </div>
  );
}

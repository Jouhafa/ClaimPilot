"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useApp } from "@/lib/context";
import { RulesManager } from "./RulesManager";
import { SplitTransactionModal } from "./SplitTransactionModal";
import { DuplicateDetector } from "./DuplicateDetector";
import { MerchantManager } from "./MerchantManager";
import { PaginationControls } from "@/components/ui/pagination";
import { getAutoTagStats, findSimilarTransactions } from "@/lib/autoTagger";
import { findDuplicates, calculateCurrencyTotals, CATEGORY_CONFIG, type TransactionCategory } from "@/lib/types";
import type { Transaction, TransactionTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { 
  Pencil, 
  Scissors, 
  Trash2, 
  Tag, 
  StickyNote, 
  Wallet, 
  BadgeCheck, 
  CircleDollarSign,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  FileText,
  X,
  Check,
  Filter,
  SlidersHorizontal,
  // Category icons
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Repeat,
  Plane,
  ShoppingBag,
  Heart,
  Film,
  GraduationCap,
  Shield,
  PiggyBank,
  TrendingUp,
  ArrowDownCircle,
  ArrowRightLeft,
  AlertCircle,
  MoreHorizontal,
  type LucideIcon
} from "lucide-react";

// Category icon mapping
const CATEGORY_ICONS: Record<TransactionCategory, LucideIcon> = {
  groceries: ShoppingCart,
  dining: Utensils,
  transport: Car,
  rent: Home,
  utilities: Zap,
  subscriptions: Repeat,
  travel: Plane,
  shopping: ShoppingBag,
  health: Heart,
  entertainment: Film,
  education: GraduationCap,
  insurance: Shield,
  savings: PiggyBank,
  investment: TrendingUp,
  income: ArrowDownCircle,
  transfer: ArrowRightLeft,
  fees: AlertCircle,
  other: MoreHorizontal,
};

interface TransactionsReviewTabProps {
  onNavigate?: (tab: string) => void;
}

type SortField = "date" | "merchant" | "amount" | "category" | "status";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "pending" | "cleared" | "reviewed";

// Helper to get transaction status for filtering
function getTransactionStatus(tx: Transaction): "pending" | "cleared" | "reviewed" {
  // Reviewed = manually tagged (not auto-tagged)
  if (tx.tag && !tx.isAutoTagged) {
    return "reviewed";
  }
  // Pending = transactionStatus is pending OR auto-tagged with low/medium confidence
  if (tx.transactionStatus === "pending" || (tx.isAutoTagged && (tx.tagConfidence === "low" || tx.tagConfidence === "medium"))) {
    return "pending";
  }
  // Cleared = confirmed or imported and not pending
  return "cleared";
}

// Category icon component with actual icons
function CategoryIcon({ category, size = "sm" }: { category?: TransactionCategory; size?: "sm" | "md" }) {
  if (!category) return null;
  const config = CATEGORY_CONFIG[category];
  const IconComponent = CATEGORY_ICONS[category];
  if (!config || !IconComponent) return null;
  
  const sizeClasses = size === "sm" ? "w-4 h-4 p-0.5" : "w-5 h-5 p-1";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  
  return (
    <div 
      className={cn("rounded flex-shrink-0 flex items-center justify-center", sizeClasses)}
      style={{ backgroundColor: `${config.color}20` }}
      title={config.label}
    >
      <IconComponent className={iconSize} style={{ color: config.color }} />
    </div>
  );
}

// Status indicator dot
function StatusDot({ status }: { status: "pending" | "cleared" | "reviewed" }) {
  const colors = {
    pending: "bg-orange-500",
    cleared: "bg-green-500",
    reviewed: "bg-blue-500",
  };
  return (
    <div className={cn("w-2 h-2 rounded-full", colors[status])} title={status} />
  );
}

export function TransactionsReviewTab({ onNavigate }: TransactionsReviewTabProps) {
  const { 
    transactions, 
    updateTransaction, 
    updateTransactions,
    deleteTransaction, 
    addTransactions,
    isLoading, 
    rules, 
    addRule, 
    splitTransaction 
  } = useApp();
  
  // Filter state
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"last30" | "last90" | "all">("last30");
  const [selectedCategories, setSelectedCategories] = useState<Set<TransactionCategory>>(new Set());
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Manual transaction form state
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split("T")[0],
    merchant: "",
    amount: "-",
    category: "" as TransactionCategory | "",
    description: "",
    note: "",
    tag: "" as TransactionTag | ""
  });
  const [accountFilter, setAccountFilter] = useState<string | "all">("all");
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 10000]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<TransactionTag | "all">("all");
  
  // Selection and editing state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [editingMerchant, setEditingMerchant] = useState<string | null>(null);
  const [editMerchantValue, setEditMerchantValue] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{date?: string; amount?: string; description?: string}>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Modal state
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showMerchants, setShowMerchants] = useState(false);
  const [splitModalTx, setSplitModalTx] = useState<Transaction | null>(null);
  const [showApplySimilarToast, setShowApplySimilarToast] = useState<{
    tx: Transaction;
    similar: Transaction[];
    tag: TransactionTag;
  } | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Responsive items per page - reduced to avoid vertical scroll
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(5);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(6);
      } else {
        setItemsPerPage(7);
      }
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // Get available accounts from transactions
  const availableAccounts = useMemo(() => {
    const accounts = new Set<string>();
    transactions.forEach(tx => {
      if (tx.accountId) {
        accounts.add(tx.accountId);
      } else if (tx.sourceDocType && tx.sourceDocType !== "unknown") {
        accounts.add(tx.sourceDocType);
      }
    });
    return Array.from(accounts);
  }, [transactions]);

  // Get available categories from transactions
  const availableCategories = useMemo(() => {
    const categories = new Set<TransactionCategory>();
    transactions.forEach(tx => {
      if (tx.category) {
        categories.add(tx.category);
      }
    });
    return Array.from(categories);
  }, [transactions]);

  // Calculate amount range from transactions
  const transactionAmountRange = useMemo(() => {
    if (transactions.length === 0) return [0, 10000];
    const amounts = transactions
      .filter(tx => !tx.parentId)
      .map(tx => Math.abs(tx.amount));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    return [Math.floor(min), Math.ceil(max)];
  }, [transactions]);

  // Initialize amount range slider
  useEffect(() => {
    if (transactionAmountRange[1] > 0) {
      setAmountRange([0, transactionAmountRange[1]]);
    }
  }, [transactionAmountRange]);

  // Get auto-tag statistics (from ReviewTab)
  const stats = useMemo(() => getAutoTagStats(transactions), [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((tx) => {
      // Hide split children in main list
      if (tx.parentId) return false;
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matches =
          tx.merchant.toLowerCase().includes(searchLower) ||
          tx.description.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      // Date range filter
      if (dateRange !== "all") {
        const now = new Date();
        const txDate = new Date(tx.date);
        let cutoffDate: Date;
        if (dateRange === "last30") {
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        }
        if (txDate < cutoffDate) return false;
      }
      
      // Category filter (multi-select)
      if (selectedCategories.size > 0 && tx.category && !selectedCategories.has(tx.category)) {
        return false;
      }
      
      // Account filter
      if (accountFilter !== "all") {
        const txAccount = tx.accountId || tx.sourceDocType;
        if (txAccount !== accountFilter) return false;
      }
      
      // Amount range filter
      const absAmount = Math.abs(tx.amount);
      if (absAmount < amountRange[0] || absAmount > amountRange[1]) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== "all") {
        const txStatus = getTransactionStatus(tx);
        if (txStatus !== statusFilter) return false;
      }
      
      // Tag filter
      if (tagFilter !== "all") {
        if (tagFilter === null && tx.tag !== null) return false;
        if (tagFilter !== null && tx.tag !== tagFilter) return false;
      }
      
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case "date":
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case "merchant":
          aVal = a.merchant.toLowerCase();
          bVal = b.merchant.toLowerCase();
          break;
        case "amount":
          aVal = Math.abs(a.amount);
          bVal = Math.abs(b.amount);
          break;
        case "category":
          aVal = a.category || "";
          bVal = b.category || "";
          break;
        case "status":
          aVal = getTransactionStatus(a);
          bVal = getTransactionStatus(b);
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    transactions, 
    search, 
    dateRange, 
    selectedCategories, 
    accountFilter, 
    amountRange, 
    statusFilter, 
    tagFilter,
    sortField,
    sortDirection
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateRange, selectedCategories, accountFilter, amountRange, statusFilter, tagFilter, sortField, sortDirection]);

  // Get split children for a transaction
  const getSplitChildren = (parentId: string) => {
    return transactions.filter((tx) => tx.parentId === parentId);
  };

  // Duplicate count
  const duplicateCount = useMemo(() => {
    return findDuplicates(transactions).size;
  }, [transactions]);

  // Multi-currency totals
  const currencyTotals = useMemo(() => {
    return calculateCurrencyTotals(transactions);
  }, [transactions]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle tag change
  const handleTagChange = async (id: string, tag: TransactionTag) => {
    const updates: Partial<Transaction> = { tag, isAutoTagged: false };
    if (tag === "reimbursable") {
      updates.status = "draft";
    } else {
      updates.status = undefined;
    }
    await updateTransaction(id, updates);

    // Check for similar transactions (from ReviewTab)
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      const similar = findSimilarTransactions(tx, transactions).filter(
        (s) => s.isAutoTagged || !s.tag
      );
      if (similar.length > 0) {
        setShowApplySimilarToast({ tx, similar, tag });
      }
    }
  };

  // Apply tag to similar transactions
  const handleApplyToSimilar = async () => {
    if (!showApplySimilarToast) return;
    const { similar, tag } = showApplySimilarToast;
    const ids = similar.map((tx) => tx.id);
    await updateTransactions(ids, {
      tag,
      isAutoTagged: false,
      status: tag === "reimbursable" ? "draft" : undefined,
    });
    setShowApplySimilarToast(null);
  };

  // Bulk tag
  const handleBulkTag = async (tag: TransactionTag) => {
    for (const id of selectedIds) {
      await handleTagChange(id, tag);
    }
    setSelectedIds(new Set());
  };

  // Approve all high confidence suggestions (from ReviewTab)
  const handleApproveAllHigh = async () => {
    const highConfidence = transactions.filter(
      tx => !tx.parentId && tx.isAutoTagged && tx.tagConfidence === "high"
    );
    const ids = highConfidence.map((tx) => tx.id);
    await updateTransactions(ids, { isAutoTagged: false });
  };

  // Handle split transaction
  const handleSplitTransaction = async (splits: { percentage: number; tag: TransactionTag }[]) => {
    if (!splitModalTx) return;
    await splitTransaction(splitModalTx.id, splits);
    setSplitModalTx(null);
  };

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  // Toggle select
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isInInput = document.activeElement?.tagName === "INPUT" || 
                      document.activeElement?.tagName === "SELECT" ||
                      document.activeElement?.tagName === "TEXTAREA";
    
    if (isInInput && !["ArrowUp", "ArrowDown", "Escape"].includes(e.key)) {
      return;
    }

    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredTransactions.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === " " && focusedIndex >= 0) {
      e.preventDefault();
      const tx = filteredTransactions[focusedIndex];
      if (tx) toggleSelect(tx.id);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      if (selectedIds.size > 0) {
        handleBulkTag("reimbursable");
      } else if (focusedIndex >= 0) {
        const tx = filteredTransactions[focusedIndex];
        if (tx) handleTagChange(tx.id, "reimbursable");
      }
    } else if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (selectedIds.size > 0) {
        handleBulkTag("personal");
      } else if (focusedIndex >= 0) {
        const tx = filteredTransactions[focusedIndex];
        if (tx) handleTagChange(tx.id, "personal");
      }
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      if (selectedIds.size > 0) {
        handleBulkTag("ignore");
      } else if (focusedIndex >= 0) {
        const tx = filteredTransactions[focusedIndex];
        if (tx) handleTagChange(tx.id, "ignore");
      }
    } else if (e.key === "/" && !isInInput) {
      e.preventDefault();
      searchRef.current?.focus();
    } else if (e.key === "Escape") {
      setSelectedIds(new Set());
      setFocusedIndex(-1);
      setEditingMerchant(null);
      (document.activeElement as HTMLElement)?.blur();
    }
  }, [filteredTransactions, focusedIndex, selectedIds, handleBulkTag, handleTagChange]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (focusedIndex >= 0 && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-row-index="${focusedIndex}"]`);
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  // Merchant editing
  const startEditingMerchant = (tx: Transaction) => {
    setEditingMerchant(tx.id);
    setEditMerchantValue(tx.merchant);
  };

  const saveEditedMerchant = async () => {
    if (editingMerchant && editMerchantValue.trim()) {
      await updateTransaction(editingMerchant, { merchant: editMerchantValue.trim() });
    }
    setEditingMerchant(null);
    setEditMerchantValue("");
  };

  // Transaction editing
  const startEditing = (tx: Transaction) => {
    setEditingTransaction(tx.id);
    setEditValues({
      date: tx.date,
      amount: Math.abs(tx.amount).toString(),
      description: tx.description,
    });
  };

  const saveEditedTransaction = async () => {
    if (!editingTransaction) return;
    const tx = transactions.find(t => t.id === editingTransaction);
    if (!tx) return;

    const updates: Partial<Transaction> = {};
    if (editValues.date && editValues.date !== tx.date) {
      updates.date = editValues.date;
    }
    if (editValues.amount) {
      const newAmount = parseFloat(editValues.amount);
      if (!isNaN(newAmount)) {
        updates.amount = tx.amount < 0 ? -Math.abs(newAmount) : Math.abs(newAmount);
      }
    }
    if (editValues.description !== undefined && editValues.description !== tx.description) {
      updates.description = editValues.description;
    }

    if (Object.keys(updates).length > 0) {
      await updateTransaction(editingTransaction, updates);
    }
    setEditingTransaction(null);
    setEditValues({});
  };

  const cancelEditing = () => {
    setEditingTransaction(null);
    setEditValues({});
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (deleteConfirm === id) {
      await deleteTransaction(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(prev => prev === id ? null : prev), 3000);
    }
  };

  // Create rule from selection
  const handleCreateRuleFromSelection = async () => {
    if (selectedIds.size === 0) return;
    const firstId = Array.from(selectedIds)[0];
    const tx = transactions.find((t) => t.id === firstId);
    if (!tx) return;

    const keyword = tx.merchant.split(" ")[0];
    const promptKeyword = prompt("Create a rule for transactions containing:", keyword);
    if (!promptKeyword) return;

    const tag = tx.tag || "reimbursable";
    await addRule({
      id: uuidv4(),
      contains: promptKeyword,
      tag: tag as Exclude<TransactionTag, null>,
      conditions: [],
      action: { tag: tag as Exclude<TransactionTag, null> },
    });
    alert(`Rule created: "${promptKeyword}" → ${tag}`);
  };

  // Helper functions
  const getTagBadge = (tag: TransactionTag) => {
    switch (tag) {
      case "reimbursable":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Reimbursable</Badge>;
      case "personal":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Personal</Badge>;
      case "ignore":
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Ignore</Badge>;
      default:
        return <Badge variant="outline">Untagged</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === "asc" ? (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
            Transactions & Review
          </h1>
          <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
            Import a statement to see your transactions here
          </p>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground text-sm">
              Import a statement to get started
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate high confidence count for review
  const highConfidenceCount = transactions.filter(
    tx => !tx.parentId && tx.isAutoTagged && tx.tagConfidence === "high"
  ).length;

  // Helper to toggle category selection
  const toggleCategory = (cat: TransactionCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cat)) {
        newSet.delete(cat);
      } else {
        newSet.add(cat);
      }
      return newSet;
    });
  };

  // Handle manual transaction submit
  const handleManualSubmit = () => {
    if (!manualForm.merchant || !manualForm.amount) return;
    
    const newTx: Transaction = {
      id: uuidv4(),
      date: manualForm.date,
      merchant: manualForm.merchant,
      description: manualForm.description || manualForm.merchant,
      amount: parseFloat(manualForm.amount),
      currency: "AED",
      category: (manualForm.category || "other") as TransactionCategory,
      tag: manualForm.tag ? manualForm.tag as TransactionTag : null,
      note: manualForm.note || undefined,
      transactionStatus: "pending",
      sourceDocType: "unknown",
      createdAt: new Date().toISOString()
    };
    
    addTransactions([newTx]);
    setShowManualModal(false);
    setManualForm({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      amount: "-",
      category: "",
      description: "",
      note: "",
      tag: ""
    });
  };

    return (
    <div className="flex gap-4 w-full">
      {/* Left Sidebar - Filters (Collapsible) */}
      <div className={cn(
        "flex-shrink-0 transition-all duration-300 ease-in-out",
        showFilters ? "w-64" : "w-0"
      )}>
        {showFilters && (
          <Card className="sticky top-4 bg-gradient-to-b from-slate-50 to-stone-50 dark:from-zinc-900 dark:to-zinc-950 border-slate-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-gradient-to-r from-[rgba(231,91,78,0.08)] to-transparent rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <SlidersHorizontal className="w-4 h-4 text-[#e75b4e]" />
                Filters
              </CardTitle>
              <button 
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5 px-4 pt-4">
              {/* Time Period */}
          <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Time Period</label>
                <Select value={dateRange} onValueChange={(value: typeof dateRange) => setDateRange(value)}>
                  <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="last90">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
          </div>

              {/* Categories - Multi-select Dropdown */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Categories</label>
                <div className="relative">
          <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full h-9 px-3 text-sm text-left border border-slate-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="truncate">
                      {selectedCategories.size === 0 
                        ? "All Categories" 
                        : `${selectedCategories.size} selected`}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showCategoryDropdown && "rotate-180")} />
          </button>
                  {showCategoryDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)} />
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md shadow-lg max-h-[280px] overflow-y-auto">
                        <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900">
                          <span className="text-xs text-muted-foreground">Select categories</span>
                          {selectedCategories.size > 0 && (
          <button
                              onClick={() => setSelectedCategories(new Set())}
                              className="text-xs text-[#e75b4e] hover:underline"
                            >
                              Clear
          </button>
                          )}
        </div>
                        <div className="p-1">
                {availableCategories.map((cat) => {
                  const config = CATEGORY_CONFIG[cat];
                            const IconComp = CATEGORY_ICONS[cat];
                            const isSelected = selectedCategories.has(cat);
                  return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => toggleCategory(cat)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded hover:bg-slate-50 dark:hover:bg-zinc-800 text-left transition-colors",
                                  isSelected && "bg-slate-100/70 dark:bg-zinc-800/70"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                  isSelected ? "bg-[#e75b4e] border-[#e75b4e]" : "border-slate-300 dark:border-zinc-600"
                                )}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div 
                                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${config?.color}15` }}
                                >
                                  <IconComp className="w-3.5 h-3.5" style={{ color: config?.color }} />
                      </div>
                                <span className="text-slate-700 dark:text-slate-200">{config?.label || cat}</span>
                              </button>
                  );
                })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {/* Selected categories tags */}
                {selectedCategories.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.from(selectedCategories).map((cat) => {
                      const config = CATEGORY_CONFIG[cat];
                      const IconComp = CATEGORY_ICONS[cat];
                      return (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300"
                        >
                          <IconComp className="w-3 h-3" style={{ color: config?.color }} />
                          <span className="truncate max-w-[80px]">{config?.label}</span>
                          <button
                            onClick={() => toggleCategory(cat)}
                            className="ml-0.5 hover:text-[#e75b4e] transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Accounts - Radio Items */}
            {availableAccounts.length > 0 && (
              <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Accounts</label>
                  <div className="space-y-1">
                    <button
                      onClick={() => setAccountFilter("all")}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                        accountFilter === "all" 
                          ? "bg-[rgba(231,91,78,0.1)] text-[#e75b4e] font-medium" 
                          : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                        accountFilter === "all" ? "border-[#e75b4e]" : "border-slate-300 dark:border-zinc-600"
                      )}>
                        {accountFilter === "all" && <div className="w-1.5 h-1.5 rounded-full bg-[#e75b4e]" />}
                      </div>
                      All Accounts
                    </button>
                  {availableAccounts.map((account) => (
                      <button
                        key={account}
                        onClick={() => setAccountFilter(account)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                          accountFilter === account 
                            ? "bg-[rgba(231,91,78,0.1)] text-[#e75b4e] font-medium" 
                            : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300"
                        )}
                      >
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                          accountFilter === account ? "border-[#e75b4e]" : "border-slate-300 dark:border-zinc-600"
                        )}>
                          {accountFilter === account && <div className="w-1.5 h-1.5 rounded-full bg-[#e75b4e]" />}
                        </div>
                        {account === "enbd_credit" ? "Credit" : account === "enbd_debit" ? "Debit" : account}
                      </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Range */}
            <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                  Amount Range
                </label>
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  {amountRange[0].toLocaleString()} - {amountRange[1].toLocaleString()}
                </div>
                <Slider
                  value={amountRange}
                  onValueChange={(value) => setAmountRange(value as [number, number])}
                  min={transactionAmountRange[0]}
                  max={transactionAmountRange[1]}
                  step={Math.max(1, Math.floor(transactionAmountRange[1] / 1000))}
                  className="w-full"
                />
            </div>

              {/* Status - Radio Items */}
            <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                <div className="space-y-1">
                {(["all", "pending", "cleared", "reviewed"] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left capitalize",
                        statusFilter === status 
                          ? "bg-[rgba(231,91,78,0.1)] text-[#e75b4e] font-medium" 
                          : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                        statusFilter === status ? "border-[#e75b4e]" : "border-slate-300 dark:border-zinc-600"
                      )}>
                        {statusFilter === status && <div className="w-1.5 h-1.5 rounded-full bg-[#e75b4e]" />}
                      </div>
                      {status === "all" ? "All" : status}
                    </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
              Transactions & Review
            </h1>
            {!showFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(true)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            )}
          </div>
          
          {/* Top Bar - Search, Duplicates, Merchants, Rules, Add Transaction */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-sm">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  ref={searchRef}
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 h-9 border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:border-[#e75b4e] focus:ring-[#e75b4e]/20"
                />
              </div>
            </div>

            {/* Action Buttons */}
            {duplicateCount > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowDuplicates(true)} 
                size="sm" 
                className="text-amber-600 border-amber-400 bg-amber-50 hover:bg-amber-100 hover:border-amber-500 hover:text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-900/40"
              >
                {duplicateCount} Duplicates
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowMerchants(true)} size="sm">
            Merchants
          </Button>
          <Button variant="outline" onClick={() => setShowRulesManager(true)} size="sm">
            Rules ({rules.length})
          </Button>
            
            {/* Add Transaction Dropdown */}
            <div className="relative ml-auto">
              <Button 
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
                <ChevronDown className={cn("w-4 h-4 transition-transform", showAddDropdown && "rotate-180")} />
              </Button>
              {showAddDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAddDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-popover border rounded-md shadow-lg z-50">
            <button
                      onClick={() => {
                        setShowAddDropdown(false);
                        setShowManualModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 text-left"
                    >
                      <FileText className="w-4 h-4" />
                      Add Manually
            </button>
            <button
                      onClick={() => {
                        setShowAddDropdown(false);
                        setShowScreenshotModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 text-left"
                    >
                      <Camera className="w-4 h-4" />
                      Add Screenshots
            </button>
          </div>
                </>
              )}
            </div>
          </div>
          
          {/* Auto-tag suggestion */}
          {highConfidenceCount > 0 && (
            <div className="mt-3">
              <Button variant="outline" onClick={handleApproveAllHigh} size="sm">
                Auto-tag {highConfidenceCount} obvious ones
              </Button>
            </div>
          )}
        </div>

        {/* Multi-Currency Totals */}
        {currencyTotals.size > 1 && (
          <Card className="bg-primary/5 border-primary/20 mb-4">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium">Reimbursable Totals:</span>
                {Array.from(currencyTotals.entries()).map(([currency, total]) => (
                  <Badge key={currency} variant="outline" className="text-sm">
                    {total.toFixed(2)} {currency}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="border-primary mb-4">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handleBulkTag("reimbursable")}>
                    <kbd className="mr-1 text-xs opacity-50">R</kbd> Reimbursable
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkTag("personal")}>
                    <kbd className="mr-1 text-xs opacity-50">P</kbd> Personal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkTag("ignore")}>
                    <kbd className="mr-1 text-xs opacity-50">I</kbd> Ignore
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCreateRuleFromSelection}>
                    Create Rule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
      <div className="flex flex-col">
        <div ref={tableRef} className="border rounded-lg overflow-hidden">
            <table className="w-full table-fixed border-collapse">
              {/* Column widths: indicator(4px), checkbox(40px), date(100px), desc(200px), category(130px), account(70px), amount(110px), status(90px), actions(120px) */}
              <colgroup>
                <col style={{ width: "4px" }} /><col style={{ width: "40px" }} /><col style={{ width: "100px" }} /><col style={{ width: "200px" }} /><col style={{ width: "130px" }} /><col style={{ width: "70px" }} /><col style={{ width: "110px" }} /><col style={{ width: "90px" }} /><col style={{ width: "120px" }} />
              </colgroup>
              <thead className="border-b bg-background">
                <tr><th className="p-0"></th><th className="px-2 py-3 text-left">
                      <input
                        type="checkbox"
                      checked={selectedIds.size === paginatedTransactions.length && paginatedTransactions.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                    <th 
                    className="px-3 py-3 text-left text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
                      onClick={() => handleSort("date")}
                    >
                    <div className="flex items-center gap-1">
                        Date
                        <SortIcon field="date" />
                      </div>
                    </th>
                    <th 
                    className="px-3 py-3 text-left text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
                      onClick={() => handleSort("merchant")}
                    >
                    <div className="flex items-center gap-1">
                        Description
                        <SortIcon field="merchant" />
                      </div>
                    </th>
                    <th 
                    className="px-3 py-3 text-left text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
                      onClick={() => handleSort("category")}
                    >
                    <div className="flex items-center gap-1">
                        Category
                        <SortIcon field="category" />
                      </div>
                    </th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Account</th>
                    <th 
                    className="px-3 py-3 text-right text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
                      onClick={() => handleSort("amount")}
                    >
                    <div className="flex items-center justify-end gap-1">
                        Amount
                        <SortIcon field="amount" />
                      </div>
                    </th>
                    <th 
                    className="px-3 py-3 text-left text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground"
                      onClick={() => handleSort("status")}
                    >
                    <div className="flex items-center gap-1">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </th>
                  </tr>
                </thead>
              <tbody className="bg-white dark:bg-zinc-900">
                  {paginatedTransactions.map((tx, index) => {
                    const actualIndex = startIndex + index;
                    const splitChildren = getSplitChildren(tx.id);
                    const hasSplits = splitChildren.length > 0;
                    const isExpanded = expandedRows.has(tx.id);
                    const txStatus = getTransactionStatus(tx);
                    
                    return (
                      <React.Fragment key={tx.id}>
                        {/* Main Row */}
                        <tr 
                          data-row-index={actualIndex}
                          className={cn(
                            "transition-all duration-200 cursor-pointer group/row",
                            isExpanded 
                              ? "border-b-0" 
                              : "border-b border-slate-100 dark:border-zinc-800",
                            focusedIndex === actualIndex && !isExpanded ? "bg-slate-100/70 dark:bg-zinc-800/70" : "",
                            selectedIds.has(tx.id) && !isExpanded ? "bg-indigo-50/50 dark:bg-indigo-900/20" : "",
                            !isExpanded && !selectedIds.has(tx.id) && focusedIndex !== actualIndex ? "bg-white dark:bg-zinc-900" : "",
                            "hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                          )}
                          style={isExpanded ? { backgroundColor: "rgba(231, 91, 78, 0.05)" } : undefined}
                          onClick={() => {
                            setFocusedIndex(actualIndex);
                              toggleRowExpansion(tx.id);
                          }}
                        ><td 
                            className="w-1 p-0 transition-colors"
                            style={{ backgroundColor: isExpanded ? "rgba(231, 91, 78, 0.7)" : "transparent" }}
                          ></td><td className="px-2 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(tx.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(tx.id);
                              }}
                              className="rounded"
                              disabled={hasSplits}
                            />
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="px-3 py-3 overflow-hidden">
                            <div 
                              className="cursor-pointer overflow-hidden"
                              title={`${tx.merchant}\n${tx.description || ''}`}
                            >
                              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-colors flex items-center gap-2 overflow-hidden">
                                <span className="truncate block max-w-[160px]">{tx.merchant}</span>
                                  {hasSplits && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">Split</Badge>
                                  )}
                                </div>
                              {tx.description && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={tx.description}>
                                  {tx.description}
                              </div>
                            )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={tx.category} />
                              <span className="text-sm truncate">{tx.category ? CATEGORY_CONFIG[tx.category]?.label : "—"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground truncate">
                            {tx.sourceDocType === "enbd_credit" ? "Credit" : tx.sourceDocType === "enbd_debit" ? "Debit" : tx.accountId || "—"}
                          </td>
                          <td className={cn(
                            "px-3 py-3 text-sm text-right font-mono whitespace-nowrap",
                            tx.amount >= 0 ? "text-green-500" : "text-foreground",
                            hasSplits && "line-through text-muted-foreground"
                          )}>
                            {formatAmount(tx.amount)} {tx.currency}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={txStatus} />
                              <span className="text-sm capitalize">{txStatus}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {txStatus !== "reviewed" && !hasSplits ? (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    handleTagChange(tx.id, tx.tag || "personal");
                                    updateTransaction(tx.id, { isAutoTagged: false });
                                  }}
                                  className="text-white text-xs px-4 transition-all rounded-md"
                                  style={{ backgroundColor: "rgba(231, 91, 78, 0.85)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(231, 91, 78, 1)"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(231, 91, 78, 0.85)"}
                                >
                                  Mark as Reviewed
                                  </Button>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Reviewed</span>
                              )}
                              <ChevronDown className={cn(
                                "w-4 h-4 text-slate-400 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Detail Row */}
                        {isExpanded && (
                          <tr style={{ borderBottomColor: "rgba(231, 91, 78, 0.3)", backgroundColor: "rgba(231, 91, 78, 0.05)" }} className="border-b"><td className="w-1 p-0" style={{ backgroundColor: "rgba(231, 91, 78, 0.7)" }}></td><td colSpan={8} className="p-0">
                              <div className="relative">
                                {/* Main content area */}
                                <div className="px-5 py-4">
                                  <div className="flex items-start justify-between gap-6">
                                    {/* Left side - Categorization & Notes */}
                                    <div className="flex gap-6 flex-1">
                                      {/* Merchant / Categorized */}
                                      <div className="space-y-2 min-w-[180px]">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Categorized</label>
                                        <Input
                                          value={editingMerchant === tx.id ? editMerchantValue : tx.merchant}
                                          onChange={(e) => {
                                            setEditingMerchant(tx.id);
                                            setEditMerchantValue(e.target.value);
                                          }}
                                          onBlur={saveEditedMerchant}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") saveEditedMerchant();
                                            if (e.key === "Escape") setEditingMerchant(null);
                                          }}
                                          className="h-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all text-sm"
                                          placeholder="Merchant name"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <Select
                                            value={tx.category || "other"}
                                            onValueChange={(value) => {
                                              updateTransaction(tx.id, { category: value as TransactionCategory });
                                            }}
                                          >
                                            <SelectTrigger className="h-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 transition-colors text-sm">
                                              <div className="flex items-center gap-2">
                                                <CategoryIcon category={tx.category || "other"} size="sm" />
                                                <span>{tx.category ? CATEGORY_CONFIG[tx.category]?.label : "Other"}</span>
                                              </div>
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="max-h-[280px] w-[200px]">
                                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                                              const IconComp = CATEGORY_ICONS[key as TransactionCategory];
                                              return (
                                                <SelectItem 
                                                  key={key} 
                                                  value={key}
                                                  className="cursor-pointer"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div 
                                                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                                                      style={{ backgroundColor: `${config.color}20` }}
                                                    >
                                                      <IconComp className="w-3 h-3" style={{ color: config.color }} />
                                                    </div>
                                                    <span className="text-sm">{config.label}</span>
                                                  </div>
                                                </SelectItem>
                                              );
                                            })}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      
                                      {/* Notes */}
                                      <div className="space-y-2 flex-1 max-w-[280px]">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</label>
                                        <textarea
                                          value={tx.note || ""}
                                          onChange={(e) => {
                                            updateTransaction(tx.id, { note: e.target.value });
                                          }}
                                          placeholder="Add a note..."
                                          className="w-full h-[72px] px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-md resize-none bg-white dark:bg-zinc-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 focus:outline-none transition-all placeholder:text-slate-400"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Right side - Action Buttons */}
                                    <div className="flex items-center gap-2 pt-5">
                                  <Button
                                        variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                          startEditing(tx);
                                    }}
                                        className="h-8 px-3 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:border-blue-500 dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 text-sm transition-all shadow-sm hover:shadow"
                                  >
                                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                        Edit
                                  </Button>
                                  {!hasSplits && !tx.isSplit && (
                                    <Button
                                          variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSplitModalTx(tx);
                                      }}
                                          className="h-8 px-3 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:border-amber-500 dark:hover:text-amber-300 text-slate-700 dark:text-slate-200 text-sm transition-all shadow-sm hover:shadow"
                                    >
                                          <Scissors className="w-3.5 h-3.5 mr-1.5" />
                                          Split
                                    </Button>
                                  )}
                                  <Button
                                        variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                          handleDeleteTransaction(tx.id);
                                        }}
                                        className={cn(
                                          "h-8 px-3 bg-white dark:bg-zinc-900 text-sm transition-all shadow-sm",
                                          deleteConfirm === tx.id 
                                            ? "text-red-600 border-red-500 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 hover:border-red-600" 
                                            : "border-slate-300 dark:border-zinc-600 hover:bg-red-100 hover:border-red-400 hover:text-red-600 hover:shadow dark:hover:bg-red-900/40 dark:hover:border-red-500 dark:hover:text-red-400 text-slate-700 dark:text-slate-200"
                                        )}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                        {deleteConfirm === tx.id ? "Confirm" : "Delete"}
                                  </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Tag selection row */}
                                {!hasSplits && (
                                  <div className="px-5 py-3 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center gap-4">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tag:</span>
                                    <div className="flex gap-2">
                                      <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                          handleTagChange(tx.id, "reimbursable");
                                        }}
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                          tx.tag === "reimbursable" 
                                            ? "bg-emerald-500 text-white" 
                                            : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:border-emerald-300 hover:text-emerald-600"
                                        )}
                                      >
                                        <CircleDollarSign className={cn(
                                          "w-3.5 h-3.5",
                                          tx.tag === "reimbursable" ? "text-white" : "text-emerald-500"
                                        )} />
                                        Reimbursable
                                      </button>
                                      <button
                                        onClick={(e) => {
                                        e.stopPropagation();
                                          handleTagChange(tx.id, "personal");
                                        }}
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                          tx.tag === "personal" 
                                            ? "bg-blue-500 text-white" 
                                            : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:border-blue-300 hover:text-blue-600"
                                        )}
                                      >
                                        <BadgeCheck className={cn(
                                          "w-3.5 h-3.5",
                                          tx.tag === "personal" ? "text-white" : "text-blue-500"
                                        )} />
                                        Personal
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTagChange(tx.id, "ignore");
                                        }}
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                          tx.tag === "ignore" 
                                            ? "bg-slate-500 text-white" 
                                            : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:border-slate-400 hover:text-slate-700"
                                        )}
                                      >
                                        <Ban className={cn(
                                          "w-3.5 h-3.5",
                                          tx.tag === "ignore" ? "text-white" : "text-slate-400"
                                        )} />
                                        Ignore
                                      </button>
                                    </div>
                                  </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        )}
                        
                        {/* Edit mode row */}
                        {editingTransaction === tx.id && (
                          <tr className="border-b bg-yellow-50 dark:bg-yellow-900/20"><td className="w-1 p-0 bg-yellow-400 dark:bg-yellow-500"></td><td colSpan={8} className="px-4 py-4">
                              <div className="flex items-end gap-4">
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                                  <Input
                                    type="date"
                                    value={editValues.date || tx.date}
                                    onChange={(e) => setEditValues(prev => ({ ...prev, date: e.target.value }))}
                                    className="h-9 w-36"
                                  />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                                  <Input
                                    value={editValues.description ?? tx.description}
                                    onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                                    className="h-9"
                                    placeholder="Description"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">Amount</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editValues.amount || Math.abs(tx.amount).toString()}
                                    onChange={(e) => setEditValues(prev => ({ ...prev, amount: e.target.value }))}
                                    className="h-9 w-28 text-right"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={saveEditedTransaction}
                                    className="bg-green-500 hover:bg-green-600"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelEditing}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Split children rows */}
                        {isExpanded && splitChildren.map((child) => (
                          <tr 
                            key={child.id}
                            className="border-b last:border-0 bg-muted/10 hover:bg-muted/20"
                          >
                            <td className="px-4 py-2 pl-8">
                              <span className="text-muted-foreground">↳</span>
                            </td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{child.date}</td>
                            <td className="px-4 py-2">
                              <div className="text-sm text-muted-foreground">
                                {child.splitPercentage}% split
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <CategoryIcon category={child.category} />
                            </td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">—</td>
                            <td className="px-4 py-2 text-sm text-right font-mono">
                              {formatAmount(child.amount)} {child.currency}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <StatusDot status={getTransactionStatus(child)} />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <select
                                value={child.tag || ""}
                                onChange={(e) => handleTagChange(child.id, (e.target.value || null) as TransactionTag)}
                                className="text-sm bg-transparent border rounded px-2 py-1"
                              >
                                <option value="">Untagged</option>
                                <option value="reimbursable">Reimbursable</option>
                                <option value="personal">Personal</option>
                                <option value="ignore">Ignore</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          
          {/* Pagination with page numbers and arrows - always visible */}
          <div className="flex items-center justify-center gap-2 py-4 border-t mt-2 bg-background flex-shrink-0">
            {/* First page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="First page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            {/* Previous page */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.max(1, Math.min(5, totalPages)) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded text-sm font-medium transition-colors border",
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            {/* Next page */}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {/* Last page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Last page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-4">
          <span className="px-2 py-1 rounded bg-muted">
            <kbd className="font-mono">R</kbd> Reimbursable
          </span>
          <span className="px-2 py-1 rounded bg-muted">
            <kbd className="font-mono">P</kbd> Personal
          </span>
          <span className="px-2 py-1 rounded bg-muted">
            <kbd className="font-mono">I</kbd> Ignore
          </span>
          <span className="px-2 py-1 rounded bg-muted">
            <kbd className="font-mono">↑↓</kbd> Navigate
          </span>
          <span className="px-2 py-1 rounded bg-muted">
            <kbd className="font-mono">Space</kbd> Select
          </span>
          <span className="px-2 py-1 rounded bg-muted">
            <kbd className="font-mono">/</kbd> Search
          </span>
        </div>
      </div>

      {/* Modals */}
      <RulesManager isOpen={showRulesManager} onClose={() => setShowRulesManager(false)} />
      <DuplicateDetector isOpen={showDuplicates} onClose={() => setShowDuplicates(false)} />
      <MerchantManager isOpen={showMerchants} onClose={() => setShowMerchants(false)} />
      {splitModalTx && (
        <SplitTransactionModal
          transaction={splitModalTx}
          onSplit={handleSplitTransaction}
          onClose={() => setSplitModalTx(null)}
        />
      )}
      
      {/* Manual Transaction Modal - Simplified */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowManualModal(false)} />
          <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Transaction</h2>
              <button onClick={() => setShowManualModal(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Date *</label>
                  <Input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Merchant *</label>
                  <Input
                    placeholder="e.g., Starbucks"
                    value={manualForm.merchant}
                    onChange={(e) => setManualForm(prev => ({ ...prev, merchant: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Amount *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-50.00"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Negative for expenses</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <Select 
                    value={manualForm.category} 
                    onValueChange={(value) => setManualForm(prev => ({ ...prev, category: value as TransactionCategory }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                        const IconComp = CATEGORY_ICONS[key as TransactionCategory];
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <IconComp className="w-4 h-4" style={{ color: config.color }} />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Input
                  placeholder="Optional description"
                  value={manualForm.description}
                  onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowManualModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleManualSubmit}
                  disabled={!manualForm.merchant || !manualForm.amount}
                  className="flex-1"
                  style={{ backgroundColor: "rgba(231, 91, 78, 0.9)" }}
                >
                  Add Transaction
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Screenshot Upload Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowScreenshotModal(false)} />
          <div className="relative bg-background rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload Screenshots</h2>
              <button onClick={() => setShowScreenshotModal(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  setShowScreenshotModal(false);
                  onNavigate?.("import");
                }}
              >
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Drop screenshots here or click to upload</p>
                <p className="text-xs text-muted-foreground">
                  Upload transaction screenshots to extract data automatically
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Supports PNG, JPG, PDF files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Similar Toast */}
      {showApplySimilarToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <Card className="border-primary shadow-lg">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">
                    Tag all {showApplySimilarToast.similar.length + 1} "{showApplySimilarToast.tx.merchant.split(" ")[0]}" transactions?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    As {showApplySimilarToast.tag}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowApplySimilarToast(null)}>
                    No
                  </Button>
                  <Button size="sm" onClick={handleApplyToSimilar}>
                    Yes, tag all
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}


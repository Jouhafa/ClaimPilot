"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Account, AccountType, AccountGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  investment: "Investment",
  loan: "Loan",
  other: "Other",
};

const ACCOUNT_GROUP_LABELS: Record<AccountGroup, string> = {
  personal: "Personal",
  business: "Business",
  joint: "Joint",
  other: "Other",
};

const ACCOUNT_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ef4444", // red
];

export function AccountManagementTab() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount, setSelectedAccount, selectedAccountId, profile } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Account>>({
    name: "",
    type: "checking",
    group: "personal",
    bankName: "",
    accountNumber: "",
    currency: profile?.currency || "AED",
    initialBalance: 0,
    isActive: true,
    color: ACCOUNT_COLORS[0],
    notes: "",
  });

  // Calculate current balances for each account
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    accounts.forEach((account) => {
      const accountTransactions = transactions.filter(
        (tx) => tx.accountId === account.id || (!tx.accountId && account.isActive)
      );
      
      // Calculate balance: initial + sum of all transactions
      const balance = accountTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        account.initialBalance
      );
      balances[account.id] = balance;
    });
    
    return balances;
  }, [accounts, transactions]);

  // Calculate net worth
  const netWorth = useMemo(() => {
    return Object.values(accountBalances).reduce((sum, balance) => sum + balance, 0);
  }, [accountBalances]);

  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<AccountType, Account[]> = {
      checking: [],
      savings: [],
      credit_card: [],
      investment: [],
      loan: [],
      other: [],
    };
    
    accounts.forEach((account) => {
      if (account.isActive) {
        grouped[account.type].push(account);
      }
    });
    
    return grouped;
  }, [accounts]);

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      name: "",
      type: "checking",
      group: "personal",
      bankName: "",
      accountNumber: "",
      currency: profile?.currency || "AED",
      initialBalance: 0,
      isActive: true,
      color: ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length],
      notes: "",
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      alert("Please enter an account name");
      return;
    }

    const account: Account = {
      id: editingId || uuidv4(),
      name: formData.name.trim(),
      type: formData.type || "checking",
      group: formData.group || "personal",
      bankName: formData.bankName?.trim() || undefined,
      accountNumber: formData.accountNumber?.trim() || undefined,
      currency: formData.currency || "AED",
      initialBalance: formData.initialBalance || 0,
      isActive: formData.isActive ?? true,
      color: formData.color || ACCOUNT_COLORS[0],
      notes: formData.notes?.trim() || undefined,
      createdAt: editingId ? accounts.find(a => a.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      await updateAccount(editingId, account);
      setEditingId(null);
    } else {
      await addAccount(account);
      setIsAdding(false);
    }
    
    setFormData({
      name: "",
      type: "checking",
      group: "personal",
      bankName: "",
      accountNumber: "",
      currency: profile?.currency || "AED",
      initialBalance: 0,
      isActive: true,
      color: ACCOUNT_COLORS[0],
      notes: "",
    });
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      type: account.type,
      group: account.group,
      bankName: account.bankName || "",
      accountNumber: account.accountNumber || "",
      currency: account.currency,
      initialBalance: account.initialBalance,
      isActive: account.isActive,
      color: account.color || ACCOUNT_COLORS[0],
      notes: account.notes || "",
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this account? This will not delete transactions, but they will no longer be associated with this account.")) {
      await deleteAccount(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: "",
      type: "checking",
      group: "personal",
      bankName: "",
      accountNumber: "",
      currency: profile?.currency || "AED",
      initialBalance: 0,
      isActive: true,
      color: ACCOUNT_COLORS[0],
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Net Worth Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth</CardTitle>
          <CardDescription>Total across all accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-4xl font-bold mb-2">
              {profile?.currency || "AED"} {netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">
              {accounts.filter(a => a.isActive).length} active account{accounts.filter(a => a.isActive).length !== 1 ? "s" : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Account" : "Add New Account"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Account Name *</label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ENBD Checking"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account Type *</label>
                <select
                  value={formData.type || "checking"}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Group</label>
                <select
                  value={formData.group || "personal"}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value as AccountGroup })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {Object.entries(ACCOUNT_GROUP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bank Name</label>
                <Input
                  value={formData.bankName || ""}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g., Emirates NBD"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account Number (Last 4)</label>
                <Input
                  value={formData.accountNumber || ""}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Currency</label>
                <Input
                  value={formData.currency || "AED"}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  placeholder="AED"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Initial Balance</label>
                <Input
                  type="number"
                  value={formData.initialBalance || 0}
                  onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Color</label>
                <div className="flex gap-2">
                  {ACCOUNT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all",
                        formData.color === color ? "border-foreground scale-110" : "border-border"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this account"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm">Active account</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editingId ? "Update" : "Add"} Account</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      <div className="space-y-4">
        {!isAdding && (
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Accounts</h2>
            <Button onClick={handleAdd}>+ Add Account</Button>
          </div>
        )}

        {accounts.length === 0 && !isAdding ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add your first account to start tracking balances
              </p>
              <Button onClick={handleAdd}>Add Account</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const balance = accountBalances[account.id] ?? account.initialBalance;
              const isSelected = selectedAccountId === account.id;
              
              return (
                <Card
                  key={account.id}
                  className={cn(
                    "relative transition-all hover:shadow-lg",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: account.color || ACCOUNT_COLORS[0] }}
                        />
                        <div>
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {ACCOUNT_TYPE_LABELS[account.type]} • {ACCOUNT_GROUP_LABELS[account.group]}
                          </CardDescription>
                        </div>
                      </div>
                      {!account.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          balance >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {account.currency} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      {account.bankName && (
                        <div>
                          <p className="text-xs text-muted-foreground">Bank</p>
                          <p className="text-sm font-medium">{account.bankName}</p>
                        </div>
                      )}
                      {account.accountNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground">Account Number</p>
                          <p className="text-sm font-mono">****{account.accountNumber}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedAccount(isSelected ? null : account.id)}
                          className="flex-1"
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Summary by Type */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(accountsByType).map(([type, typeAccounts]) => {
                if (typeAccounts.length === 0) return null;
                
                const totalBalance = typeAccounts.reduce(
                  (sum, acc) => sum + (accountBalances[acc.id] ?? acc.initialBalance),
                  0
                );
                
                return (
                  <div key={type} className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">{ACCOUNT_TYPE_LABELS[type as AccountType]}</p>
                    <p className="text-xl font-bold">
                      {typeAccounts[0].currency} {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{typeAccounts.length} account{typeAccounts.length !== 1 ? "s" : ""}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/context";
import { PWAInstallButton } from "./PWAInstallButton";
import { RulesManager } from "./RulesManager";
import { MerchantManager } from "./MerchantManager";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  onNavigate?: (tab: string) => void;
}

type SettingsSection = "general" | "data-privacy" | "notifications" | "rules-merchants" | "buckets-goals" | "statement-defaults" | "account-management";

export function SettingsTab({ onNavigate }: SettingsTabProps) {
  const { profile, setProfile, deleteAllData, refreshData } = useApp();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [showMerchantManager, setShowMerchantManager] = useState(false);
  const [showStatementTypeModal, setShowStatementTypeModal] = useState(false);
  const [editingField, setEditingField] = useState<"nickname" | "currency" | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editCurrency, setEditCurrency] = useState("AED");
  const [editStatementType, setEditStatementType] = useState<"credit" | "debit">("credit");

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await deleteAllData();
      await refreshData();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete all data:", error);
      alert("Failed to delete all data. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const sections: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
    {
      id: "general",
      label: "General",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "statement-defaults",
      label: "Statement Defaults",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "rules-merchants",
      label: "Rules & Merchants",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: "buckets-goals",
      label: "Buckets & Goals",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: "data-privacy",
      label: "Data & Privacy",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: "account-management",
      label: "Account Management",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">General</h2>
              <p className="text-muted-foreground">Your personal information and preferences</p>
            </div>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Profile</CardTitle>
                <CardDescription className="text-[14px]">Your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Nickname</p>
                      <p className="text-[13px] text-muted-foreground">{profile?.nickname || "Not set"}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditNickname(profile?.nickname || "");
                        setEditingField("nickname");
                        setShowProfileEdit(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Currency</p>
                      <p className="text-[13px] text-muted-foreground">{profile?.currency || "AED"}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditCurrency(profile?.currency || "AED");
                        setEditingField("currency");
                        setShowProfileEdit(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Install App</CardTitle>
                <CardDescription className="text-[14px]">Install ClaimPilot as a Progressive Web App</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Add to Home Screen</p>
                    <p className="text-[13px] text-muted-foreground">Install for quick access and offline use</p>
                  </div>
                  <PWAInstallButton />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "statement-defaults":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Statement & Parsing Defaults</h2>
              <p className="text-muted-foreground">Default statement type, bank mapping, and parsing preferences</p>
            </div>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Statement & Parsing Defaults</CardTitle>
                <CardDescription className="text-[14px]">Default statement type, bank mapping, and parsing preferences</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Default Statement Type</p>
                      <p className="text-[13px] text-muted-foreground">
                        {profile?.defaultStatementType === "credit" ? "Credit Card" : profile?.defaultStatementType === "debit" ? "Debit / Current / Savings Account" : "Not set"}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditStatementType(profile?.defaultStatementType || "credit");
                        setShowStatementTypeModal(true);
                      }}
                    >
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between opacity-60">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Bank Mapping</p>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground">Manage bank account mappings</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "rules-merchants":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Rules & Merchants</h2>
              <p className="text-muted-foreground">Auto-tagging rules and merchant management</p>
            </div>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Rules & Merchants</CardTitle>
                <CardDescription className="text-[14px]">Auto-tagging rules and merchant management</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Auto-tagging Rules</p>
                      <p className="text-[13px] text-muted-foreground">Configure automatic transaction tagging</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowRulesManager(true)}
                    >
                      Manage
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Merchants</p>
                      <p className="text-[13px] text-muted-foreground">Manage merchant names and aliases</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowMerchantManager(true)}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "buckets-goals":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Buckets & Goals</h2>
              <p className="text-muted-foreground">Quick access to buckets and goals management</p>
            </div>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Buckets & Goals</CardTitle>
                <CardDescription className="text-[14px]">Quick access to buckets and goals management</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Budget Buckets</p>
                      <p className="text-[13px] text-muted-foreground">Organize your money into Needs, Wants, and Goals</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (onNavigate) {
                          onNavigate("buckets");
                        }
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Financial Goals</p>
                      <p className="text-[13px] text-muted-foreground">Set goals, track progress, and get feasibility calculations</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (onNavigate) {
                          onNavigate("goals");
                        }
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Notifications</h2>
              <p className="text-muted-foreground">Manage notification preferences</p>
            </div>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Notifications</CardTitle>
                <CardDescription className="text-[14px]">Manage notification preferences</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Email Notifications</p>
                      <p className="text-[13px] text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // TODO: Open email notifications configuration modal
                        alert("Email notifications configuration coming soon!");
                      }}
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "data-privacy":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Data & Privacy</h2>
              <p className="text-muted-foreground">Manage your data and privacy settings</p>
            </div>
            <Card style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Data & Privacy</CardTitle>
                <CardDescription className="text-[14px]">Manage your data and privacy settings</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Backup & Restore</p>
                      <p className="text-[13px] text-muted-foreground">Export or restore your data</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onNavigate?.("export")}
                    >
                      Manage
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-medium text-destructive" style={{ fontWeight: 500 }}>Delete All Data</p>
                      <p className="text-[13px] text-muted-foreground">Permanently delete all your data</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "account-management":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Account Management</h2>
              <p className="text-muted-foreground">Manage your accounts and track balances across all accounts</p>
            </div>
            <Card style={{ borderRadius: "16px" }} className="opacity-60">
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Account Management</CardTitle>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </div>
                <CardDescription className="text-[14px]">Manage your accounts and track balances across all accounts</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "20px" }}>
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    Account management is currently under development and will be available in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <h1 className="text-[24px] font-bold">Settings</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="min-w-[44px] min-h-[44px]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-background">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Settings</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px]",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {section.icon}
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 md:border-r md:flex-col md:h-full">
        <div className="p-6 border-b">
          <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage your preferences</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {section.icon}
              <span className="font-medium">{section.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-full">
        <div className="p-6 max-w-4xl">
          {renderSectionContent()}
        </div>
      </main>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowProfileEdit(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300" style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[20px]" style={{ fontWeight: 600 }}>
                  Edit {editingField === "nickname" ? "Nickname" : "Currency"}
                </CardTitle>
                <CardDescription className="text-[14px]">
                  Update your {editingField === "nickname" ? "nickname" : "currency"} preference
                </CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  {editingField === "nickname" ? (
                    <div className="space-y-2">
                      <Label htmlFor="nickname">Nickname</Label>
                      <Input
                        id="nickname"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        placeholder="Enter your nickname"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={editCurrency} onValueChange={setEditCurrency}>
                        <SelectTrigger id="currency">
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
                  )}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowProfileEdit(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        const now = new Date().toISOString();
                        if (editingField === "nickname") {
                          await setProfile({
                            ...(profile || {}),
                            nickname: editNickname.trim(),
                            currency: profile?.currency || "AED",
                            updatedAt: now,
                            createdAt: profile?.createdAt || now,
                            onboardingCompleted: profile?.onboardingCompleted ?? false,
                          });
                        } else {
                          await setProfile({
                            ...(profile || {}),
                            currency: editCurrency,
                            nickname: profile?.nickname || "",
                            updatedAt: now,
                            createdAt: profile?.createdAt || now,
                            onboardingCompleted: profile?.onboardingCompleted ?? false,
                          });
                        }
                        setShowProfileEdit(false);
                        setEditingField(null);
                      }}
                      className="flex-1"
                      disabled={editingField === "nickname" && !editNickname.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Rules Manager Modal */}
      <RulesManager isOpen={showRulesManager} onClose={() => setShowRulesManager(false)} />

      {/* Merchant Manager Modal */}
      <MerchantManager isOpen={showMerchantManager} onClose={() => setShowMerchantManager(false)} />

      {/* Default Statement Type Modal */}
      {showStatementTypeModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowStatementTypeModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300" style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[20px]" style={{ fontWeight: 600 }}>
                  Default Statement Type
                </CardTitle>
                <CardDescription className="text-[14px]">
                  Choose your default statement type for imports
                </CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <button
                      onClick={() => setEditStatementType("credit")}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        editStatementType === "credit"
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
                      onClick={() => setEditStatementType("debit")}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        editStatementType === "debit"
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
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowStatementTypeModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        const now = new Date().toISOString();
                        await setProfile({
                          ...(profile || {}),
                          defaultStatementType: editStatementType,
                          currency: profile?.currency || "AED",
                          nickname: profile?.nickname || "",
                          updatedAt: now,
                          createdAt: profile?.createdAt || now,
                          onboardingCompleted: profile?.onboardingCompleted ?? false,
                        });
                        setShowStatementTypeModal(false);
                      }}
                      className="flex-1"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Delete All Data Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300" style={{ borderRadius: "16px" }}>
              <CardHeader style={{ padding: "20px 20px 16px" }}>
                <CardTitle className="text-[20px] text-destructive" style={{ fontWeight: 600 }}>
                  Delete All Data
                </CardTitle>
                <CardDescription className="text-[14px]">This action cannot be undone</CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <p className="text-[15px] text-muted-foreground">This will permanently delete:</p>
                  <ul className="space-y-2 text-[14px] text-muted-foreground list-disc list-inside">
                    <li>All transactions</li>
                    <li>All goals and buckets</li>
                    <li>All rules and merchant aliases</li>
                    <li>All recurring transactions</li>
                    <li>All account data</li>
                    <li>All wraps and recaps</li>
                    <li>All other app data</li>
                  </ul>
                  <p className="text-[14px] font-medium text-foreground pt-2">Your license will be preserved.</p>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAllData} disabled={isDeleting} className="flex-1">
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        "Delete All Data"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

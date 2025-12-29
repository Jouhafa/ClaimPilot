"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { PWAInstallButton } from "./PWAInstallButton";
import { AccountManagementTab } from "./AccountManagementTab";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  onNavigate?: (tab: string) => void;
}

export function SettingsTab({ onNavigate }: SettingsTabProps) {
  const { profile, deleteAllData, refreshData } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await deleteAllData();
      await refreshData();
      setShowDeleteConfirm(false);
      // Optionally show a success message or navigate
    } catch (error) {
      console.error("Failed to delete all data:", error);
      alert("Failed to delete all data. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
          Settings
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
          Manage your account, preferences, and data
        </p>
      </div>

      {/* Profile */}
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
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Currency</p>
                <p className="text-[13px] text-muted-foreground">{profile?.currency || "AED"}</p>
              </div>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statement & Parsing Defaults */}
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
                <p className="text-[13px] text-muted-foreground">Debit / Credit</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Bank Mapping</p>
                <p className="text-[13px] text-muted-foreground">Manage bank account mappings</p>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules & Merchants */}
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
              <Button variant="outline" size="sm" onClick={() => onNavigate?.("rules")}>
                Manage
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Merchants</p>
                <p className="text-[13px] text-muted-foreground">Manage merchant names and aliases</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.("merchants")}>
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Management */}
      <Card style={{ borderRadius: "16px" }}>
        <CardHeader style={{ padding: "20px 20px 16px" }}>
          <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>Account Management</CardTitle>
          <CardDescription className="text-[14px]">Manage your accounts and track balances across all accounts</CardDescription>
        </CardHeader>
        <CardContent style={{ padding: "20px" }}>
          <AccountManagementTab />
        </CardContent>
      </Card>

      {/* Buckets & Goals */}
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
              <Button variant="outline" size="sm" onClick={() => onNavigate?.("buckets")}>
                Manage
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Financial Goals</p>
                <p className="text-[13px] text-muted-foreground">Set goals, track progress, and get feasibility calculations</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.("goals")}>
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA Install */}
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

      {/* Data & Privacy */}
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
              <Button variant="outline" size="sm">
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

      {/* Notifications */}
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
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <CardDescription className="text-[14px]">
                  This action cannot be undone
                </CardDescription>
              </CardHeader>
              <CardContent style={{ padding: "0 20px 20px" }}>
                <div className="space-y-4">
                  <p className="text-[15px] text-muted-foreground">
                    This will permanently delete:
                  </p>
                  <ul className="space-y-2 text-[14px] text-muted-foreground list-disc list-inside">
                    <li>All transactions</li>
                    <li>All goals and buckets</li>
                    <li>All rules and merchant aliases</li>
                    <li>All recurring transactions</li>
                    <li>All account data</li>
                    <li>All wraps and recaps</li>
                    <li>All other app data</li>
                  </ul>
                  <p className="text-[14px] font-medium text-foreground pt-2">
                    Your license will be preserved.
                  </p>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllData}
                      disabled={isDeleting}
                      className="flex-1"
                    >
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


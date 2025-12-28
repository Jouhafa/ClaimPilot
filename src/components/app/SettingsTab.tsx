"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { PWAInstallButton } from "./PWAInstallButton";
import { AccountManagementTab } from "./AccountManagementTab";

interface SettingsTabProps {
  onNavigate?: (tab: string) => void;
}

export function SettingsTab({ onNavigate }: SettingsTabProps) {
  const { profile } = useApp();

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
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
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
    </div>
  );
}


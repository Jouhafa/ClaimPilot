"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/context";
import { exportToCSV, exportToExcel, downloadCSV, downloadExcel, calculateSummary } from "@/lib/export";
import { saveLicense, loadLicense, clearLicense } from "@/lib/storage";

export function ExportTab() {
  const { transactions } = useApp();
  const [licenseKey, setLicenseKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseInfo, setPurchaseInfo] = useState<{ email?: string } | null>(null);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);
  const reimbursables = useMemo(
    () => transactions.filter((t) => t.tag === "reimbursable"),
    [transactions]
  );

  // Check for existing license on mount
  useEffect(() => {
    loadLicense().then((license) => {
      if (license) {
        setIsUnlocked(true);
        setLicenseKey(license.key);
      }
    });
  }, []);

  const handleVerify = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsUnlocked(true);
        setPurchaseInfo(data.purchase);
        await saveLicense(licenseKey.trim());
      } else {
        setError(data.error || "Invalid license key");
      }
    } catch (err) {
      setError("Failed to verify license. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveLicense = async () => {
    await clearLicense();
    setIsUnlocked(false);
    setLicenseKey("");
    setPurchaseInfo(null);
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(transactions);
    if (csv) {
      const date = new Date().toISOString().split("T")[0];
      downloadCSV(csv, `reimbursements-${date}.csv`);
    }
  };

  const handleExportExcel = () => {
    const blob = exportToExcel(transactions);
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(blob, `reimbursements-${date}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Reports</h1>
        <p className="text-muted-foreground mt-2">
          Download finance-ready reports for your reimbursements
        </p>
      </div>

      {/* License Key Input */}
      {!isUnlocked ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <CardTitle className="text-lg">Unlock Exports</CardTitle>
            </div>
            <CardDescription>
              Enter your license key to enable CSV and Excel exports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="licenseKey" className="sr-only">License Key</Label>
                <Input
                  id="licenseKey"
                  placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  className="font-mono"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  disabled={isVerifying}
                />
              </div>
              <Button onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Don&apos;t have a license?{" "}
              <a href="https://gumroad.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Get one for $54 (~199 AED) →
              </a>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-500">License Activated</p>
                  <p className="text-sm text-muted-foreground">
                    {purchaseInfo?.email || "Export features unlocked"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveLicense}>
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {reimbursables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Reimbursable</p>
              <p className="text-2xl font-bold">{summary.grandTotal.toFixed(2)} AED</p>
              <p className="text-xs text-muted-foreground">{summary.totalCount} items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Draft</p>
              <p className="text-2xl font-bold text-yellow-500">{summary.byStatus.draft.total.toFixed(2)} AED</p>
              <p className="text-xs text-muted-foreground">{summary.byStatus.draft.count} items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="text-2xl font-bold text-blue-500">{summary.byStatus.submitted.total.toFixed(2)} AED</p>
              <p className="text-xs text-muted-foreground">{summary.byStatus.submitted.count} items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-green-500">{summary.byStatus.paid.total.toFixed(2)} AED</p>
              <p className="text-xs text-muted-foreground">{summary.byStatus.paid.count} items</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className={!isUnlocked ? "opacity-60" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">CSV Export</CardTitle>
              {!isUnlocked && <Badge variant="outline">Locked</Badge>}
            </div>
            <CardDescription>
              Download as CSV for spreadsheet apps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Includes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {["All reimbursable transactions", "Date, merchant, amount, status", "Summary totals by status"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full"
              disabled={!isUnlocked || reimbursables.length === 0}
              onClick={handleExportCSV}
            >
              {!isUnlocked ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Unlock to Export
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className={!isUnlocked ? "opacity-60" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Excel Export</CardTitle>
              {!isUnlocked && <Badge variant="outline">Locked</Badge>}
            </div>
            <CardDescription>
              Download as Excel with multiple sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Includes:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {["Transactions sheet", "Summary by status", "Monthly breakdown"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full"
              disabled={!isUnlocked || reimbursables.length === 0}
              onClick={handleExportExcel}
            >
              {!isUnlocked ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Unlock to Export
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {reimbursables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Preview</CardTitle>
            <CardDescription>
              Preview of your export data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 font-mono text-xs overflow-x-auto">
              <pre className="text-muted-foreground">
{`Date,Merchant,Description,Amount,Currency,Status
${reimbursables.slice(0, 5).map((t) => 
  `${t.date},${t.merchant},"${t.description.substring(0, 30)}...",${Math.abs(t.amount).toFixed(2)},${t.currency},${t.status || "draft"}`
).join("\n")}
${reimbursables.length > 5 ? `\n... and ${reimbursables.length - 5} more rows` : ""}

--- Summary ---
Draft: ${summary.byStatus.draft.total.toFixed(2)} AED (${summary.byStatus.draft.count} items)
Submitted: ${summary.byStatus.submitted.total.toFixed(2)} AED (${summary.byStatus.submitted.count} items)
Paid: ${summary.byStatus.paid.total.toFixed(2)} AED (${summary.byStatus.paid.count} items)
Total: ${summary.grandTotal.toFixed(2)} AED`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {reimbursables.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No reimbursable transactions</h3>
            <p className="text-muted-foreground text-sm">
              Tag transactions as &quot;Reimbursable&quot; to export them
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { loadProfiles, saveProfiles, deleteProfile as deleteProfileFromStorage } from "@/lib/storage";
import type { ImportProfile } from "@/lib/types";

interface ImportProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: ImportProfile) => void;
  currentColumns?: string[];
  detectedFileType?: "csv" | "excel" | "pdf";
}

export function ImportProfileManager({ 
  isOpen, 
  onClose, 
  onSelectProfile, 
  currentColumns,
  detectedFileType 
}: ImportProfileManagerProps) {
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // New profile form
  const [newProfileName, setNewProfileName] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [descriptionColumn, setDescriptionColumn] = useState("");
  const [debitColumn, setDebitColumn] = useState("");
  const [creditColumn, setCreditColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");

  useEffect(() => {
    loadProfiles().then(setProfiles);
  }, []);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    if (!newProfileName.trim() || !newBankName.trim()) {
      alert("Please enter a profile name and bank name");
      return;
    }

    const profile: ImportProfile = {
      id: uuidv4(),
      name: newProfileName.trim(),
      bankName: newBankName.trim(),
      fileType: detectedFileType || "csv",
      columnMappings: {
        date: dateColumn || undefined,
        description: descriptionColumn || undefined,
        debit: debitColumn || undefined,
        credit: creditColumn || undefined,
        amount: amountColumn || undefined,
      },
      createdAt: new Date().toISOString(),
    };

    const updated = [...profiles, profile];
    await saveProfiles(updated);
    setProfiles(updated);
    
    // Reset form
    setNewProfileName("");
    setNewBankName("");
    setDateColumn("");
    setDescriptionColumn("");
    setDebitColumn("");
    setCreditColumn("");
    setAmountColumn("");
    setShowCreateForm(false);
  };

  const handleDeleteProfile = async (id: string) => {
    if (confirm("Delete this import profile?")) {
      const updated = await deleteProfileFromStorage(id);
      setProfiles(updated);
    }
  };

  const handleUseProfile = (profile: ImportProfile) => {
    onSelectProfile(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Import Profiles</CardTitle>
              <CardDescription>
                Save column mappings for different banks and cards
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto pt-6 space-y-6">
          {/* Create New Profile */}
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} variant="outline" className="w-full">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Profile
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Import Profile</CardTitle>
                <CardDescription>
                  Map columns from your statement to ClaimPilot fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Profile Name</Label>
                    <Input
                      placeholder="e.g., ENBD Credit Card"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      placeholder="e.g., Emirates NBD"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    Column Mappings
                    {currentColumns && currentColumns.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {currentColumns.length} columns detected
                      </Badge>
                    )}
                  </Label>
                  
                  {currentColumns && currentColumns.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Detected columns: {currentColumns.join(", ")}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Date Column</Label>
                      <Input
                        placeholder="Date"
                        value={dateColumn}
                        onChange={(e) => setDateColumn(e.target.value)}
                        list="column-suggestions"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description Column</Label>
                      <Input
                        placeholder="Description"
                        value={descriptionColumn}
                        onChange={(e) => setDescriptionColumn(e.target.value)}
                        list="column-suggestions"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Debit Column</Label>
                      <Input
                        placeholder="Debit"
                        value={debitColumn}
                        onChange={(e) => setDebitColumn(e.target.value)}
                        list="column-suggestions"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Credit Column</Label>
                      <Input
                        placeholder="Credit"
                        value={creditColumn}
                        onChange={(e) => setCreditColumn(e.target.value)}
                        list="column-suggestions"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-muted-foreground">Amount Column (if combined)</Label>
                      <Input
                        placeholder="Amount (optional, if not split into debit/credit)"
                        value={amountColumn}
                        onChange={(e) => setAmountColumn(e.target.value)}
                        list="column-suggestions"
                      />
                    </div>
                  </div>

                  {currentColumns && (
                    <datalist id="column-suggestions">
                      {currentColumns.map((col) => (
                        <option key={col} value={col} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} className="flex-1">
                    Save Profile
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Profiles */}
          <div className="space-y-3">
            <h3 className="font-medium">Saved Profiles ({profiles.length})</h3>
            
            {profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No profiles saved yet.</p>
                <p className="mt-1">Create one to speed up future imports!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div 
                    key={profile.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{profile.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {profile.fileType.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.bankName}</p>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          {profile.columnMappings.date && (
                            <span>Date: {profile.columnMappings.date}</span>
                          )}
                          {profile.columnMappings.description && (
                            <span>• Desc: {profile.columnMappings.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleUseProfile(profile)}
                        >
                          Use
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="text-destructive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Common Bank Templates */}
          <div className="space-y-3">
            <h3 className="font-medium">Quick Templates</h3>
            <p className="text-sm text-muted-foreground">
              Common bank statement formats
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "ENBD", bank: "Emirates NBD", date: "Date", desc: "Description", debit: "Debit", credit: "Credit" },
                { name: "ADCB", bank: "ADCB", date: "Transaction Date", desc: "Details", debit: "Debit Amount", credit: "Credit Amount" },
                { name: "FAB", bank: "First Abu Dhabi Bank", date: "Date", desc: "Narrative", debit: "Debit", credit: "Credit" },
                { name: "Mashreq", bank: "Mashreq Bank", date: "Date", desc: "Description", debit: "Debit", credit: "Credit" },
              ].map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={async () => {
                    const profile: ImportProfile = {
                      id: uuidv4(),
                      name: `${template.name} Template`,
                      bankName: template.bank,
                      fileType: "csv",
                      columnMappings: {
                        date: template.date,
                        description: template.desc,
                        debit: template.debit,
                        credit: template.credit,
                      },
                      createdAt: new Date().toISOString(),
                    };
                    const updated = [...profiles, profile];
                    await saveProfiles(updated);
                    setProfiles(updated);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


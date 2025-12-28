"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/context";
import { 
  loadReminders, 
  saveReminders, 
  updateReminder as updateReminderStorage,
  addReminder as addReminderStorage 
} from "@/lib/storage";
import { 
  calculateNextTrigger, 
  shouldTriggerReminder, 
  createDefaultReminders,
  getReminderMessage 
} from "@/lib/reminders";
import { generateICS, downloadICS } from "@/lib/icsExporter";
import { requestNotificationPermission, showNotification } from "@/lib/browserNotifications";
import type { Reminder, ReminderDeliveryMethod } from "@/lib/types";

const REMINDER_LABELS: Record<string, { title: string; description: string }> = {
  monthly_import: {
    title: "Monthly Statement Import",
    description: "Reminder to import your monthly statement",
  },
  card_due: {
    title: "Credit Card Due Date",
    description: "Reminder to pay credit card before due date",
  },
  stale_reimbursement: {
    title: "Stale Reimbursements",
    description: "Reminder to follow up on submitted reimbursements",
  },
};

export function RemindersTab() {
  const { transactions, cardSafety } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    loadReminders().then((loaded) => {
      if (loaded.length === 0) {
        // Create default reminders if none exist
        const defaults = createDefaultReminders();
        saveReminders(defaults).then(() => setReminders(defaults));
      } else {
        setReminders(loaded);
      }
      setIsLoading(false);
    });
    
    // Check notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Update next trigger dates
  useEffect(() => {
    if (reminders.length === 0) return;
    
    const updated = reminders.map(reminder => {
      const nextTrigger = calculateNextTrigger(reminder, cardSafety, transactions);
      if (nextTrigger) {
        return {
          ...reminder,
          nextTrigger: nextTrigger.toISOString(),
        };
      }
      return reminder;
    });
    
    // Only update if changed
    const hasChanges = updated.some((r, i) => r.nextTrigger !== reminders[i]?.nextTrigger);
    if (hasChanges) {
      saveReminders(updated).then(() => setReminders(updated));
    }
  }, [cardSafety, transactions, reminders.length]);

  const handleToggleEnabled = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    const updated = await updateReminderStorage(id, { enabled: !reminder.enabled });
    setReminders(updated);
  };

  const handleUpdateTriggerDays = async (id: string, days: number) => {
    await updateReminderStorage(id, { triggerDays: days });
    const updated = await loadReminders();
    setReminders(updated);
  };

  const handleToggleDeliveryMethod = async (id: string, method: ReminderDeliveryMethod) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    // If enabling in_app, request notification permission
    if (method === "in_app" && !reminder.deliveryMethods.includes(method)) {
      await requestNotificationPermission();
    }
    
    const methods = reminder.deliveryMethods.includes(method)
      ? reminder.deliveryMethods.filter(m => m !== method)
      : [...reminder.deliveryMethods, method];
    
    await updateReminderStorage(id, { deliveryMethods: methods });
    const updated = await loadReminders();
    setReminders(updated);
  };

  const handleExportCalendar = (reminder: Reminder) => {
    if (!reminder.nextTrigger) return;
    
    const triggerDate = new Date(reminder.nextTrigger);
    const message = getReminderMessage(reminder, cardSafety, transactions);
    const label = REMINDER_LABELS[reminder.type];
    
    const icsContent = generateICS(
      reminder.id,
      label.title,
      message,
      triggerDate
    );
    
    const filename = `reminder-${reminder.type}-${triggerDate.toISOString().split("T")[0]}.ics`;
    downloadICS(icsContent, filename);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
          Reminders
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
          Set up reminders to stay on top of your finances
        </p>
      </div>

      <div className="space-y-4">
        {reminders.map((reminder) => {
          const label = REMINDER_LABELS[reminder.type];
          const message = getReminderMessage(reminder, cardSafety, transactions);
          const shouldTrigger = shouldTriggerReminder(reminder, cardSafety, transactions);
          const nextTriggerDate = reminder.nextTrigger ? new Date(reminder.nextTrigger) : null;

          return (
            <Card key={reminder.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
                        {label.title}
                      </CardTitle>
                      {shouldTrigger && reminder.enabled && (
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Due
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-[14px]">
                      {label.description}
                    </CardDescription>
                  </div>
                  <Button
                    variant={reminder.enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleEnabled(reminder.id)}
                  >
                    {reminder.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {reminder.enabled && (
                  <>
                    {/* Trigger Days */}
                    {(reminder.type === "card_due" || reminder.type === "stale_reimbursement") && (
                      <div>
                        <Label className="text-sm">
                          {reminder.type === "card_due" 
                            ? "Days before due date" 
                            : "Days after submission"}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={reminder.triggerDays || 3}
                            onChange={(e) => handleUpdateTriggerDays(reminder.id, parseInt(e.target.value) || 3)}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground flex items-center">days</span>
                        </div>
                      </div>
                    )}

                    {/* Delivery Methods */}
                    <div>
                      <Label className="text-sm mb-2 block">Delivery Methods</Label>
                      <div className="flex gap-3 flex-wrap">
                        {(["in_app", "calendar", "email"] as ReminderDeliveryMethod[]).map((method) => (
                          <Button
                            key={method}
                            variant={reminder.deliveryMethods.includes(method) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleDeliveryMethod(reminder.id, method)}
                            disabled={method === "email"} // Email not implemented yet
                          >
                            {method === "in_app" && (
                              <>
                                In-App
                                {notificationPermission === "denied" && (
                                  <span className="ml-1 text-xs opacity-70">(Permission denied)</span>
                                )}
                              </>
                            )}
                            {method === "calendar" && "Calendar"}
                            {method === "email" && "Email (Coming soon)"}
                          </Button>
                        ))}
                      </div>
                      {notificationPermission === "denied" && reminder.deliveryMethods.includes("in_app") && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Enable notifications in your browser settings to receive in-app reminders
                        </p>
                      )}
                    </div>

                    {/* Next Trigger */}
                    {nextTriggerDate && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">Next reminder</p>
                          <p className="text-xs text-muted-foreground">
                            {nextTriggerDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {reminder.deliveryMethods.includes("calendar") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportCalendar(reminder)}
                          >
                            Export .ics
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Current Message */}
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-1">Message:</p>
                      <p className="text-sm font-medium">{message}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


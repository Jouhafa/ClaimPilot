"use client";

import { useEffect, useState, useMemo } from "react";
import { useApp } from "@/lib/context";
import { loadReminders } from "@/lib/storage";
import { shouldTriggerReminder, getReminderMessage, calculateNextTrigger } from "@/lib/reminders";
import { showNotification } from "@/lib/browserNotifications";
import type { Reminder } from "@/lib/types";

/**
 * Component that checks reminders and shows browser notifications
 */
export function ReminderAlerts() {
  const { transactions, cardSafety } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [triggeredReminders, setTriggeredReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReminders().then(setReminders);
  }, []);

  // Check reminders periodically
  useEffect(() => {
    if (reminders.length === 0) return;

    const checkReminders = () => {
      reminders.forEach((reminder) => {
        if (!reminder.enabled) return;
        if (!reminder.deliveryMethods.includes("in_app")) return;
        if (triggeredReminders.has(reminder.id)) return; // Already triggered this session

        if (shouldTriggerReminder(reminder, cardSafety, transactions)) {
          const message = getReminderMessage(reminder, cardSafety, transactions);
          
          // Show browser notification
          showNotification("ClaimPilot Reminder", {
            body: message,
            tag: `reminder-${reminder.id}`,
            data: { reminderId: reminder.id },
          });

          // Mark as triggered
          setTriggeredReminders(prev => new Set(prev).add(reminder.id));
        }
      });
    };

    // Check immediately
    checkReminders();

    // Check every minute
    const interval = setInterval(checkReminders, 60 * 1000);

    return () => clearInterval(interval);
  }, [reminders, cardSafety, transactions, triggeredReminders]);

  // Update next trigger dates when dependencies change
  useEffect(() => {
    if (reminders.length === 0) return;

    const updated = reminders.map(reminder => {
      const nextTrigger = calculateNextTrigger(reminder, cardSafety, transactions);
      if (nextTrigger && reminder.nextTrigger !== nextTrigger.toISOString()) {
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
      setReminders(updated);
      // Reset triggered reminders when next trigger changes
      setTriggeredReminders(new Set());
    }
  }, [cardSafety, transactions]);

  return null; // This component doesn't render anything
}


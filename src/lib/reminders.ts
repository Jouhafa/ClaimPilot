import { v4 as uuidv4 } from "uuid";
import type { Reminder, ReminderType, CardSafetyData, Transaction } from "./types";

/**
 * Calculate next trigger date for a reminder
 */
export function calculateNextTrigger(
  reminder: Reminder,
  cardSafety: CardSafetyData | null,
  transactions: Transaction[]
): Date | null {
  if (!reminder.enabled) return null;

  const now = new Date();
  
  switch (reminder.type) {
    case "monthly_import": {
      // Trigger on 1st of next month (or configurable day)
      const triggerDay = reminder.triggerDays || 1;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, triggerDay);
      return nextMonth;
    }

    case "card_due": {
      // Trigger N days before due date
      if (!cardSafety?.dueDate) return null;
      const dueDate = new Date(cardSafety.dueDate);
      const daysBefore = reminder.triggerDays || 3;
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      // Only return if trigger is in the future
      return triggerDate > now ? triggerDate : null;
    }

    case "stale_reimbursement": {
      // Trigger if reimbursements have been submitted for N days
      const daysOld = reminder.triggerDays || 14;
      const submittedReimbursements = transactions.filter(
        t => t.tag === "reimbursable" && t.status === "submitted"
      );
      
      if (submittedReimbursements.length === 0) return null;
      
      // Find oldest submitted reimbursement
      const oldestDate = submittedReimbursements
        .map(t => new Date(t.createdAt || t.date))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      
      const staleTriggerDate = new Date(oldestDate);
      staleTriggerDate.setDate(staleTriggerDate.getDate() + daysOld);
      
      // Only return if trigger is in the past (meaning it should have triggered already)
      // or within next 24 hours
      return staleTriggerDate <= now || (staleTriggerDate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000 
        ? staleTriggerDate 
        : null;
    }

    default:
      return null;
  }
}

/**
 * Check if a reminder should trigger now
 */
export function shouldTriggerReminder(
  reminder: Reminder,
  cardSafety: CardSafetyData | null,
  transactions: Transaction[]
): boolean {
  if (!reminder.enabled) return false;
  
  const nextTrigger = reminder.nextTrigger ? new Date(reminder.nextTrigger) : null;
  if (!nextTrigger) return false;
  
  const now = new Date();
  
  // Trigger if next trigger time has passed
  return nextTrigger <= now;
}

/**
 * Create default reminders
 */
export function createDefaultReminders(): Reminder[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: uuidv4(),
      type: "monthly_import",
      enabled: true,
      triggerDays: 1, // 1st of month
      deliveryMethods: ["in_app", "calendar"],
      createdAt: now,
    },
    {
      id: uuidv4(),
      type: "card_due",
      enabled: true,
      triggerDays: 3, // 3 days before due date
      deliveryMethods: ["in_app", "calendar"],
      createdAt: now,
    },
    {
      id: uuidv4(),
      type: "stale_reimbursement",
      enabled: true,
      triggerDays: 14, // 14 days after submission
      deliveryMethods: ["in_app"],
      createdAt: now,
    },
  ];
}

/**
 * Get reminder message text
 */
export function getReminderMessage(reminder: Reminder, cardSafety: CardSafetyData | null, transactions: Transaction[]): string {
  switch (reminder.type) {
    case "monthly_import":
      return "Time to import this month's statement";
    
    case "card_due":
      if (!cardSafety?.dueDate) return "Credit card payment due soon";
      const dueDate = new Date(cardSafety.dueDate);
      const remaining = cardSafety.statementBalance - (cardSafety.paymentsMade || 0);
      return `Pay ${remaining > 0 ? remaining.toFixed(2) : '0'} AED by ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    
    case "stale_reimbursement":
      const stale = transactions.filter(
        t => t.tag === "reimbursable" && t.status === "submitted"
      );
      const total = stale.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return `${stale.length} reimbursement${stale.length > 1 ? 's' : ''} (${total.toFixed(2)} AED) submitted ${reminder.triggerDays || 14} days ago`;
    
    default:
      return "Reminder";
  }
}


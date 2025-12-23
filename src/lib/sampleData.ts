import { v4 as uuidv4 } from "uuid";
import type { Transaction } from "./types";

// Generate realistic sample transactions for demo mode
export function generateSampleTransactions(): Transaction[] {
  const now = new Date();
  const transactions: Transaction[] = [];

  const merchants = [
    // Reimbursable (travel/work)
    { name: "MARRIOTT HOTEL DUBAI", category: "reimbursable", minAmount: 800, maxAmount: 2500 },
    { name: "EMIRATES AIRLINES", category: "reimbursable", minAmount: 1500, maxAmount: 5000 },
    { name: "HILTON RIYADH", category: "reimbursable", minAmount: 600, maxAmount: 1800 },
    { name: "UBER BUSINESS", category: "reimbursable", minAmount: 30, maxAmount: 150 },
    { name: "ZOOM VIDEO COMM", category: "reimbursable", minAmount: 50, maxAmount: 100 },
    { name: "LINKEDIN PREMIUM", category: "reimbursable", minAmount: 100, maxAmount: 150 },
    { name: "REGUS OFFICE", category: "reimbursable", minAmount: 200, maxAmount: 500 },
    { name: "STARBUCKS MEETING", category: "reimbursable", minAmount: 50, maxAmount: 150 },
    
    // Personal
    { name: "CAREEM HALA", category: "personal", minAmount: 15, maxAmount: 80 },
    { name: "AMAZON.AE", category: "personal", minAmount: 50, maxAmount: 500 },
    { name: "NETFLIX", category: "personal", minAmount: 40, maxAmount: 60 },
    { name: "SPOTIFY", category: "personal", minAmount: 20, maxAmount: 35 },
    { name: "LULU HYPERMARKET", category: "personal", minAmount: 100, maxAmount: 600 },
    { name: "CARREFOUR", category: "personal", minAmount: 80, maxAmount: 400 },
    { name: "NOON.COM", category: "personal", minAmount: 30, maxAmount: 300 },
    { name: "DELIVEROO", category: "personal", minAmount: 40, maxAmount: 120 },
    { name: "TALABAT", category: "personal", minAmount: 35, maxAmount: 100 },
    { name: "SHARAF DG", category: "personal", minAmount: 100, maxAmount: 2000 },
    
    // Could be either
    { name: "APPLE.COM", category: "mixed", minAmount: 30, maxAmount: 500 },
    { name: "MICROSOFT", category: "mixed", minAmount: 50, maxAmount: 200 },
  ];

  // Generate 50 transactions over the past 45 days
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 45);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const amount = -(merchant.minAmount + Math.random() * (merchant.maxAmount - merchant.minAmount));

    transactions.push({
      id: uuidv4(),
      date: date.toISOString().split("T")[0],
      merchant: merchant.name,
      description: `${merchant.name} - Transaction ${i + 1}`,
      amount: Math.round(amount * 100) / 100,
      currency: "AED",
      tag: null,
      createdAt: new Date().toISOString(),
    });
  }

  // Add a couple of credits (payments)
  transactions.push({
    id: uuidv4(),
    date: new Date(now.setDate(now.getDate() - 10)).toISOString().split("T")[0],
    merchant: "PAYMENT RECEIVED",
    description: "Online Banking Payment - Thank You",
    amount: 5000,
    currency: "AED",
    tag: "ignore",
    createdAt: new Date().toISOString(),
  });

  transactions.push({
    id: uuidv4(),
    date: new Date(now.setDate(now.getDate() - 25)).toISOString().split("T")[0],
    merchant: "PAYMENT RECEIVED",
    description: "Online Banking Payment - Thank You",
    amount: 3500,
    currency: "AED",
    tag: "ignore",
    createdAt: new Date().toISOString(),
  });

  // Sort by date descending
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


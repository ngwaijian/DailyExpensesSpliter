export interface User {
  id: string;
  name: string;
}

export interface Exchange {
  id: string;
  currency: string;
  foreignAmount: number;
  myrSpent: number;
  date: string;
}

export interface Expense {
  id: string;
  desc: string;
  memo?: string; // Optional memo/notes for the transaction
  amountOriginal: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string;
  splitAmong: string[]; // array of user names
  rate?: number; // snapshot rate if needed, though we usually calculate dynamic
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  isSponsored?: boolean; // If true, this expense won't affect user balances
  sponsoredBy?: string; // The user who sponsored this expense
  type?: 'expense' | 'sponsorship' | 'settlement'; // Distinguishes normal expenses from fixed-amount sponsorships and settlements
  splitDetails?: { [userName: string]: number }; // Optional: specific amount for each person
  isSettled?: boolean; // If true, this expense won't affect user balances (just for recording)
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string;
  color?: string;
  icon?: string;
}

export interface RecurringTransaction {
  id: string;
  desc: string;
  amountOriginal: number;
  currency: string;
  category: string;
  paidBy: string;
  splitAmong: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  endDate?: string;
}

export interface Budget {
  id: string;
  name?: string; // Optional name for the budget
  categories: string[];
  amount: number;
  currency: string;
  period: 'trip' | 'monthly';
}

export interface Trip {
  id: string;
  name: string;
  users: string[]; // names
  expenses: Expense[];
  exchanges: Exchange[];
  goals?: Goal[];
  recurringTransactions?: RecurringTransaction[];
  budgets?: Budget[];
  monthlyBudget?: number;
  categories?: string[];
  gistId?: string; // For syncing this specific trip
}

export interface AppData {
  trips: Trip[];
}

export const CATEGORIES = [
  "🍔 Food & Dining",
  "🛒 Groceries",
  "🏠 Rent & Bills",
  "🚗 Transport",
  "🚕 Ride Hailing",
  "🛍️ Shopping",
  "🎭 Entertainment",
  "🏥 Health & Medical",
  "✈️ Travel",
  "🎁 Gifts & Donations",
  "🎓 Education",
  "💼 Work",
  "📝 Other",
];

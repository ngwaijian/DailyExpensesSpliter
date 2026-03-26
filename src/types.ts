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
  category: Category;
  subCategory?: string; // Optional sub-category
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
  type?: 'expense' | 'income' | 'sponsorship' | 'settlement'; // Distinguishes normal expenses from income, fixed-amount sponsorships and settlements
  splitDetails?: { [userName: string]: number }; // Optional: specific amount for each person
  isSettled?: boolean; // If true, this expense won't affect user balances (just for recording)
  goalId?: string; // Optional link to a goal
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
  category: Category;
  subCategory?: string;
  paidBy: string;
  splitAmong: string[];
  splitDetails?: { [userName: string]: number };
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
  period: 'ledger' | 'monthly';
}

export interface Loan {
  id: string;
  name: string;
  type: 'loan' | 'installment';
  totalAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  interestRate: number;
  termMonths: number;
  currency: string;
  category: Category;
  subCategory?: string;
  startDate: string;
  dueDate: string;
  nextInstallmentDate: string; // Added
  paidBy: string; // The person who took the loan
  splitAmong: string[];
  splitDetails?: { [userName: string]: number };
  status: 'active' | 'paid_off';
}

export interface Ledger {
  id: string;
  name: string;
  lastUpdated: string;
  lastSynced?: string; // Timestamp of the last successful sync with the cloud
  users: string[]; // names
  expenses: Expense[];
  exchanges: Exchange[];
  goals?: Goal[];
  recurringTransactions?: RecurringTransaction[];
  loans?: Loan[];
  budgets?: Budget[];
  monthlyBudget?: number;
  categories?: Category[];
  gistId?: string; // For syncing this specific ledger
}

export interface AppData {
  ledgers: Ledger[];
}

export interface Category {
  name: string;
  subCategories?: string[];
}

export const CATEGORIES: Category[] = [
  { name: "🍔 Food & Dining", subCategories: ["Breakfast", "Lunch", "Dinner", "Snacks"] },
  { name: "🛒 Groceries", subCategories: ["Supermarket", "Market"] },
  { name: "🏠 Rent & Bills", subCategories: ["Rent", "Utilities", "Internet"] },
  { name: "🚗 Transport", subCategories: ["Fuel", "Parking", "Public Transport"] },
  { name: "🚕 Ride Hailing", subCategories: ["Grab", "Taxi"] },
  { name: "🛍️ Shopping", subCategories: ["Clothes", "Electronics", "Home"] },
  { name: "🎭 Entertainment", subCategories: ["Movies", "Games", "Hobbies"] },
  { name: "🏥 Health & Medical", subCategories: ["Doctor", "Medicine"] },
  { name: "✈️ Travel", subCategories: ["Flights", "Accommodation", "Tours"] },
  { name: "🎁 Gifts & Donations", subCategories: [] },
  { name: "🎓 Education", subCategories: [] },
  { name: "💼 Work", subCategories: [] },
  { name: "📝 Other", subCategories: [] },
];

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

export interface Trip {
  id: string;
  name: string;
  users: string[]; // names
  expenses: Expense[];
  exchanges: Exchange[];
  gistId?: string; // For syncing this specific trip
}

export interface AppData {
  trips: Trip[];
}

export const CATEGORIES = [
  "🍽️ Meals & Dining",
  "🏨 Accommodation",
  "🚕 Transport & Fuel",
  "✈️ Flights",
  "🎢 Activities & Tours",
  "🛍️ Shopping",
  "🍻 Drinks & Nightlife",
  "📝 General / Other",
];

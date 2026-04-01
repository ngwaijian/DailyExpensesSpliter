import type { AppData, Ledger, Expense, Category } from '../types';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isCategory(x: unknown): x is Category {
  if (!isRecord(x) || typeof x.name !== 'string') return false;
  if (x.subCategories === undefined) return true;
  if (!Array.isArray(x.subCategories)) return false;
  return x.subCategories.every((s) => typeof s === 'string');
}

function isExpense(x: unknown): x is Expense {
  if (!isRecord(x)) return false;
  if (typeof x.id !== 'string') return false;
  if (typeof x.desc !== 'string') return false;
  if (typeof x.amountOriginal !== 'number' || Number.isNaN(x.amountOriginal)) return false;
  if (typeof x.currency !== 'string') return false;
  if (!isCategory(x.category)) return false;
  if (x.subCategory !== undefined && typeof x.subCategory !== 'string') return false;
  if (typeof x.date !== 'string') return false;
  if (typeof x.paidBy !== 'string') return false;
  if (!Array.isArray(x.splitAmong) || !x.splitAmong.every((u) => typeof u === 'string')) return false;
  if (
    x.type !== undefined &&
    x.type !== 'expense' &&
    x.type !== 'income' &&
    x.type !== 'sponsorship' &&
    x.type !== 'settlement'
  ) {
    return false;
  }
  return true;
}

function isLedger(x: unknown): x is Ledger {
  if (!isRecord(x)) return false;
  if (typeof x.id !== 'string') return false;
  if (typeof x.name !== 'string') return false;
  if (typeof x.lastUpdated !== 'string') return false;
  if (!Array.isArray(x.users) || !x.users.every((u) => typeof u === 'string')) return false;
  if (!Array.isArray(x.expenses) || !x.expenses.every(isExpense)) return false;
  if (!Array.isArray(x.exchanges)) return false;
  if (x.categories !== undefined) {
    if (!Array.isArray(x.categories) || !x.categories.every(isCategory)) return false;
  }
  return true;
}

/** Accepts full backup `{ ledgers: [...] }` or a single ledger object. */
export function normalizeImportedData(raw: unknown): AppData | null {
  if (isLedger(raw)) {
    return { ledgers: [raw] };
  }
  if (!isRecord(raw) || !Array.isArray(raw.ledgers)) return null;
  if (!raw.ledgers.every(isLedger)) return null;
  return { ledgers: raw.ledgers as Ledger[] };
}

export function parseBackupJsonText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Migrates Cashew app SQLite export → DailyExpensesSpliter AppData JSON.
 *
 * Cashew exports are typically SQLite binaries (magic "SQLite format 3") even when named *.sql.
 *
 * Usage:
 *   node scripts/migrate-cashew.js [path-to-cashew.db] [output.json]
 *
 * Example:
 *   node scripts/migrate-cashew.js "D:/Downloads/Blip/cashew-2026-04-01-11-57-28-430628.sql" ./cashew_migrated.json
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import sqlite3 from 'sqlite3';

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.join(process.cwd(), 'cashew_migrated.json');

if (!inputPath) {
  console.error('Usage: node scripts/migrate-cashew.js <cashew-sqlite-file> [output.json]');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

const openDb = () =>
  new Promise((resolve, reject) => {
    const db = new sqlite3.Database(inputPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const close = (db) =>
  new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

/** Unix seconds or ms → YYYY-MM-DD (UTC) */
function toDateString(ts) {
  if (ts == null || Number.isNaN(Number(ts))) return new Date().toISOString().split('T')[0];
  let n = Number(ts);
  if (n > 1e12) n = Math.floor(n / 1000);
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

function normalizeNote(note) {
  if (note == null) return undefined;
  const s = String(note).trim();
  return s.length ? s : undefined;
}

function resolveExpenseCategory(rows, catByPk, categoryFk, subCategoryFk) {
  const other = { name: '📝 Other' };
  if (!categoryFk) return { category: other, subCategory: undefined };

  const row = catByPk.get(String(categoryFk));
  if (!row) return { category: other, subCategory: undefined };

  const isMain = row.main_category_pk == null || row.main_category_pk === 'NULL';

  let mainName;
  let subName;

  if (isMain) {
    mainName = row.name || 'Other';
    if (subCategoryFk && String(subCategoryFk) !== 'NULL') {
      const subRow = catByPk.get(String(subCategoryFk));
      subName = subRow?.name;
    }
  } else {
    const parent = catByPk.get(String(row.main_category_pk));
    mainName = parent?.name || row.name || 'Other';
    subName = row.name;
  }

  return {
    category: { name: mainName },
    subCategory: subName,
  };
}

function buildLedgerCategories(mainRows, subRows) {
  const byMainPk = new Map(mainRows.map((m) => [m.category_pk, m]));
  const subsByMain = new Map();
  for (const s of subRows) {
    const pk = s.main_category_pk;
    if (!pk) continue;
    if (!subsByMain.has(pk)) subsByMain.set(pk, []);
    subsByMain.get(pk).push(s.name);
  }

  const ordered = [...mainRows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return ordered.map((m) => {
    const subs = subsByMain.get(m.category_pk) || [];
    const unique = [...new Set(subs.filter(Boolean))];
    return unique.length ? { name: m.name, subCategories: unique } : { name: m.name };
  });
}

async function main() {
  let db;
  try {
    db = await openDb();
  } catch (e) {
    console.error('Failed to open SQLite file (is it a valid Cashew export?).', e.message);
    process.exit(1);
  }

  try {
    const categoryRows = await all(
      db,
      `SELECT category_pk, name, main_category_pk, "order", income FROM categories`
    );
    const catByPk = new Map(categoryRows.map((r) => [String(r.category_pk), r]));

    const mainRows = categoryRows.filter(
      (r) => r.main_category_pk == null || r.main_category_pk === 'NULL'
    );
    const subRows = categoryRows.filter(
      (r) => r.main_category_pk != null && r.main_category_pk !== 'NULL'
    );

    const ledgerCategories = buildLedgerCategories(mainRows, subRows);

    const wallets = await all(db, `SELECT wallet_pk, name, currency FROM wallets ORDER BY "order"`);
    const defaultUser =
      (wallets[0]?.name && String(wallets[0].name).trim()) || 'Me';

    const defaultCurrency = (wallets[0]?.currency || 'MYR').toUpperCase();

    const transactionRows = await all(
      db,
      `SELECT transaction_pk, name, amount, note, category_fk, sub_category_fk, income, date_created
       FROM transactions
       ORDER BY date_created ASC`
    );

    const expenses = [];
    for (const row of transactionRows) {
      const rawAmount = row.amount;
      const amt =
        rawAmount == null || Number.isNaN(Number(rawAmount)) ? 0 : Math.abs(Number(rawAmount));

      const { category, subCategory } = resolveExpenseCategory(
        row,
        catByPk,
        row.category_fk,
        row.sub_category_fk
      );

      const incomeFlag = Number(row.income) === 1;
      const memo = normalizeNote(row.note);

      const expense = {
        id: String(row.transaction_pk),
        desc: row.name ? String(row.name) : 'Transaction',
        amountOriginal: amt,
        currency: defaultCurrency,
        category,
        ...(subCategory ? { subCategory } : {}),
        date: toDateString(row.date_created),
        paidBy: defaultUser,
        splitAmong: [defaultUser],
        type: incomeFlag ? 'income' : 'expense',
      };
      if (memo) expense.memo = memo;
      expenses.push(expense);
    }

    const now = new Date().toISOString();
    const ledger = {
      id: `ledger_cashew_${Date.now()}`,
      name: `Imported from Cashew (${path.basename(inputPath)})`,
      lastUpdated: now,
      users: [defaultUser],
      expenses,
      exchanges: [],
      categories: ledgerCategories.length ? ledgerCategories : undefined,
    };

    const appData = { ledgers: [ledger] };

    fs.writeFileSync(outputPath, JSON.stringify(appData, null, 2), 'utf8');
    console.log(`Wrote ${expenses.length} expenses to ${outputPath}`);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    if (db) await close(db);
  }
}

main();

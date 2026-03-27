import { Ledger } from '../types';
import { getAverageRates } from './currency';

export function calculateBalances(ledger: Ledger): Record<string, number> {
  const rates = getAverageRates(ledger);
  const balances: Record<string, number> = {};
  
  ledger.users.forEach(u => balances[u] = 0);

  ledger.expenses.forEach(e => {
    if (e.isSettled) return; // Skip settled expenses for balances calculations

    const rate = rates[e.currency] || e.rate || 1;
    const myr = e.amountOriginal * rate;

    if (e.type === 'settlement') {
      // paidBy gives money to splitAmong[0]
      if (balances[e.paidBy] !== undefined) balances[e.paidBy] += myr;
      if (e.splitAmong.length > 0 && balances[e.splitAmong[0]] !== undefined) {
        balances[e.splitAmong[0]] -= myr;
      }
    } else if (e.type === 'sponsorship') {
      // Legacy sponsorship type: paidBy paid and sponsored. No balance change needed.
      // It's a gift to the group.
    } else if (e.type === 'income') {
      // paidBy received the money, they owe it to the group
      if (balances[e.paidBy] !== undefined) balances[e.paidBy] -= myr;
      
      if (e.splitAmong.length > 0) {
        const splitAmt = myr / e.splitAmong.length;
        e.splitAmong.forEach(p => {
          if (balances[p] !== undefined) balances[p] += splitAmt;
        });
      }
    } else {
      // Payer gets positive balance (owed money)
      if (balances[e.paidBy] !== undefined) balances[e.paidBy] += myr;

      const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);

      if (sponsor && balances[sponsor] !== undefined) {
        balances[sponsor] -= myr;
      } else if (e.splitDetails) {
        Object.entries(e.splitDetails).forEach(([person, amount]) => {
          if (balances[person] !== undefined) {
            balances[person] -= Number(amount) * rate;
          }
        });
      } else if (e.splitAmong.length > 0) {
        const splitAmt = myr / e.splitAmong.length;
        e.splitAmong.forEach(p => {
          if (balances[p] !== undefined) balances[p] -= splitAmt;
        });
      }
    }
  });

  return balances;
}

export function getSimplifiedDebts(balances: Record<string, number>, ledger?: Ledger) {
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, amt]) => {
    const rounded = Math.round(amt * 100) / 100;
    if (rounded <= -0.01) debtors.push({ name, amount: Math.abs(rounded) });
    else if (rounded >= 0.01) creditors.push({ name, amount: rounded });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: { from: string; to: string; amount: number }[] = [];
  
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const settle = Math.min(debtors[i].amount, creditors[j].amount);
    
    transactions.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount: Math.round(settle * 100) / 100
    });
    
    debtors[i].amount -= settle;
    creditors[j].amount -= settle;

    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }

  return transactions;
}

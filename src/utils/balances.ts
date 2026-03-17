import { Group } from '../types';
import { getAverageRates } from './currency';

export function calculateBalances(group: Group): Record<string, number> {
  const rates = getAverageRates(group);
  const balances: Record<string, number> = {};
  
  group.users.forEach(u => balances[u] = 0);

  group.expenses.forEach(e => {
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
      // Sponsor gives money to the group
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
            balances[person] -= amount * rate;
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

export function getSimplifiedDebts(balances: Record<string, number>) {
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, amt]) => {
    const rounded = Math.round(amt * 100) / 100;
    if (rounded < -0.01) debtors.push({ name, amount: Math.abs(rounded) });
    else if (rounded > 0.01) creditors.push({ name, amount: rounded });
  });

  const transactions: { from: string; to: string; amount: number }[] = [];
  const debtorsCopy = debtors.map(d => ({ ...d }));
  const creditorsCopy = creditors.map(c => ({ ...c }));
  
  let i = 0, j = 0;
  while (i < debtorsCopy.length && j < creditorsCopy.length) {
    const settle = Math.min(debtorsCopy[i].amount, creditorsCopy[j].amount);
    transactions.push({
      from: debtorsCopy[i].name,
      to: creditorsCopy[j].name,
      amount: settle
    });
    
    debtorsCopy[i].amount -= settle;
    creditorsCopy[j].amount -= settle;

    if (debtorsCopy[i].amount < 0.01) i++;
    if (creditorsCopy[j].amount < 0.01) j++;
  }

  return transactions;
}

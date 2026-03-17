import { Trip, Exchange } from '../types';

export function getAverageRates(trip: Trip): Record<string, number> {
  const rates: Record<string, number> = { 'MYR': 1 };
  const totals: Record<string, { myr: number; foreign: number }> = {};

  trip.exchanges.forEach(ex => {
    if (!totals[ex.currency]) totals[ex.currency] = { myr: 0, foreign: 0 };
    totals[ex.currency].myr += ex.myrSpent;
    totals[ex.currency].foreign += ex.foreignAmount;
  });

  for (const cur in totals) {
    if (totals[cur].foreign > 0) {
      rates[cur] = totals[cur].myr / totals[cur].foreign;
    }
  }
  return rates;
}

export function formatCurrency(amount: number, currency: string = 'MYR') {
  try {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency.length === 3 ? currency.toUpperCase() : 'MYR',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    return `RM ${amount.toFixed(2)}`;
  }
}

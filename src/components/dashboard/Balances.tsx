import React from 'react';
import { Trip } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { calculateBalances, getSimplifiedDebts } from '../../utils/balances';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BalancesProps {
  trip: Trip;
}

export function Balances({ trip }: BalancesProps) {
  const { t } = useLanguage();
  const balances = calculateBalances(trip);
  const transactions = getSimplifiedDebts(balances);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {t('bal_settlements')}
        </h3>
        {transactions.length > 0 && (
          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
            {transactions.length} Pending
          </span>
        )}
      </div>
      
      <ul className="space-y-3">
        {transactions.length > 0 ? (
          transactions.map((t_trans, idx) => (
            <li key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border border-gray-100 dark:border-gray-700/50 transition-all hover:border-indigo-100 dark:hover:border-indigo-900/50">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">From</span>
                  <span className="font-bold text-gray-900 dark:text-white truncate text-sm">{t_trans.from}</span>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm shrink-0">
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">To</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate text-sm">{t_trans.to}</span>
                </div>
              </div>
              <div className="text-right ml-4 shrink-0">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Amount</span>
                <span className="font-black text-gray-900 dark:text-white text-base">{formatCurrency(t_trans.amount)}</span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-center py-12 bg-gray-50/30 dark:bg-gray-700/10 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium italic">{t('bal_all_settled')}</p>
          </li>
        )}
      </ul>
    </div>
  );
}

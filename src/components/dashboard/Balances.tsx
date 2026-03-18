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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        {t('bal_settlements')}
      </h3>
      
      <ul className="space-y-2">
        {transactions.length > 0 ? (
          transactions.map((t_trans, idx) => (
            <li key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 transition-colors">
              <div className="flex items-center gap-3 text-sm min-w-0 flex-1">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-0.5">From</span>
                  <span className="font-bold text-gray-900 dark:text-white truncate">{t_trans.from}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-4" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-0.5">To</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 truncate">{t_trans.to}</span>
                </div>
              </div>
              <div className="text-right ml-4">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-0.5">Amount</span>
                <span className="font-bold text-gray-900 dark:text-white text-base">{formatCurrency(t_trans.amount)}</span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-center text-gray-400 dark:text-gray-500 text-sm italic py-8 bg-gray-50/30 dark:bg-gray-700/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            {t('bal_all_settled')}
          </li>
        )}
      </ul>
    </div>
  );
}

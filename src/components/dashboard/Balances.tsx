import React from 'react';
import { Group } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { calculateBalances, getSimplifiedDebts } from '../../utils/balances';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BalancesProps {
  group: Group;
}

export function Balances({ group }: BalancesProps) {
  const { t } = useLanguage();
  const balances = calculateBalances(group);
  const transactions = getSimplifiedDebts(balances);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        {t('bal_settlements')}
      </h3>
      
      <ul className="space-y-3 mb-6">
        {transactions.length > 0 ? (
          transactions.map((t_trans, idx) => (
            <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm min-w-0 flex-1 mr-2">
                <span className="font-semibold text-red-500 dark:text-red-400 break-words">{t_trans.from}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-semibold text-blue-600 dark:text-blue-400 break-words">{t_trans.to}</span>
              </div>
              <span className="font-bold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">{formatCurrency(t_trans.amount)}</span>
            </li>
          ))
        ) : (
          <li className="text-center text-gray-400 dark:text-gray-500 italic py-4">{t('bal_all_settled')}</li>
        )}
      </ul>
    </div>
  );
}

import React from 'react';
import { Ledger } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { calculateBalances, getSimplifiedDebts } from '../../utils/balances';
import { ArrowRight, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface BalancesProps {
  ledger: Ledger;
  onSettleUp?: () => void;
}

export function Balances({ ledger, onSettleUp }: BalancesProps) {
  const { t } = useLanguage();
  const balances = calculateBalances(ledger);
  const transactions = getSimplifiedDebts(balances, ledger);

  // Calculate spending ratio for the first two users
  const u1 = ledger.users[0];
  const u2 = ledger.users[1];
  
  let u1Spent = 0;
  let u2Spent = 0;
  
  if (u1 && u2) {
    ledger.expenses.forEach(e => {
      if (e.type !== 'expense') return;
      const rate = e.rate || 1;
      const amount = e.amountOriginal * rate;
      
      if (e.splitDetails) {
        if (e.splitDetails[u1]) u1Spent += (parseFloat(e.splitDetails[u1].toString()) || 0) * rate;
        if (e.splitDetails[u2]) u2Spent += (parseFloat(e.splitDetails[u2].toString()) || 0) * rate;
      } else if (e.splitAmong.length > 0) {
        const perPerson = amount / e.splitAmong.length;
        if (e.splitAmong.includes(u1)) u1Spent += perPerson;
        if (e.splitAmong.includes(u2)) u2Spent += perPerson;
      }
    });
  }
  
  const totalSpent = u1Spent + u2Spent;
  const u1Ratio = totalSpent > 0 ? (u1Spent / totalSpent) * 100 : 50;
  const u2Ratio = totalSpent > 0 ? (u2Spent / totalSpent) * 100 : 50;

  return (
    <div className="space-y-6">
      {ledger.users.length === 2 ? (
        <>
          {/* Hero Widget for Net Balance (2 Users) */}
          {transactions.length > 0 ? (
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-lg p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-blue-100 text-sm font-medium uppercase tracking-wider">Net Balance</h2>
                  {onSettleUp && (
                    <button
                      onClick={onSettleUp}
                      className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 px-3 rounded-full transition-colors backdrop-blur-sm whitespace-nowrap ml-2"
                    >
                      {t('bal_settle_up') || 'Settle Up'}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {transactions.map((t_trans, idx) => (
                    <div key={idx} className="flex flex-col gap-1 overflow-hidden">
                      <div className="text-3xl sm:text-4xl lg:text-3xl xl:text-4xl font-black tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis leading-none">
                        {formatCurrency(t_trans.amount)}
                      </div>
                      <div className="text-blue-100 text-base sm:text-lg mt-1 truncate">
                        <span className="font-bold text-white">{t_trans.from}</span> owes <span className="font-bold text-white">{t_trans.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-lg p-6 sm:p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-white mb-3" />
                <h2 className="text-2xl font-black tracking-tight mb-1">All Settled Up!</h2>
                <p className="text-emerald-100">No pending balances between users.</p>
              </div>
            </div>
          )}

          {/* Spending Ratio Progress Bar (2 Users) */}
          {u1 && u2 && totalSpent > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 transition-colors duration-200">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                Spending Ratio
              </h3>
              
              <div className="flex justify-between text-sm font-medium mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-900 dark:text-white">{u1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white">{u2}</span>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${u1Ratio}%` }}
                ></div>
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${u2Ratio}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>{formatCurrency(u1Spent)} ({u1Ratio.toFixed(0)}%)</span>
                <span>{formatCurrency(u2Spent)} ({u2Ratio.toFixed(0)}%)</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Multi-User Net Balances */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 transition-colors duration-200">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('bal_net_balances')}
            </h3>
            <ul className="space-y-3">
              {Object.entries(balances)
                .sort(([, a], [, b]) => b - a)
                .map(([user, balance]) => (
                  <li key={user} className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{user}</span>
                    <span className={cn(
                      "font-bold text-base",
                      balance > 0 ? "text-emerald-600 dark:text-emerald-400" : 
                      balance < 0 ? "text-red-600 dark:text-red-400" : 
                      "text-gray-500 dark:text-gray-400"
                    )}>
                      {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          {/* Multi-User Settlements List */}
          {transactions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 transition-colors duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('bal_settlements')}
                </h3>
              </div>
              
              <ul className="space-y-3">
                {transactions.map((t_trans, idx) => (
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
                    <div className="text-right ml-4 shrink-0 flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Amount</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white text-base">{formatCurrency(t_trans.amount)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Ledger, Budget, CATEGORIES } from '../../types';
import { Wallet, Plus, Edit2, Trash2, AlertCircle, PieChart, TrendingUp } from 'lucide-react';
import { formatCurrency, getAverageRates } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface BudgetManagerProps {
  ledger: Ledger;
  onUpdateLedger: (ledger: Ledger) => void;
}

export function BudgetManager({ ledger, onUpdateLedger }: BudgetManagerProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>(['All']);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [period, setPeriod] = useState<'ledger' | 'monthly'>('ledger');

  const budgets = ledger.budgets || [];
  const ledgerCategories = (ledger.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);

  const calculateSpending = (budget: Budget) => {
    if (!budget || !budget.categories) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate average rates for conversion
    const rates = getAverageRates(ledger);

    return ledger.expenses.reduce((acc, exp) => {
      if (exp.type === 'income' || exp.type === 'settlement') return acc;

      // Filter by category
      const budgetCats = Array.isArray(budget.categories) ? budget.categories : [];
      if (!budgetCats.includes('All') && !budgetCats.includes(typeof exp.category === 'string' ? exp.category : exp.category?.name || 'Other')) return acc;

      // Filter by period
      if (budget.period === 'monthly') {
        const expDate = new Date(exp.date);
        if (expDate.getMonth() !== currentMonth || expDate.getFullYear() !== currentYear) return acc;
      }

      // Convert expense to MYR first, then to budget currency
      const rateToMYR = rates[exp.currency] || exp.rate || 1;
      const amountInMYR = exp.amountOriginal * rateToMYR;
      
      const budgetRateToMYR = rates[budget.currency] || 1;
      const amountInBudgetCurrency = amountInMYR / budgetRateToMYR;

      return acc + amountInBudgetCurrency; 
    }, 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || categories.length === 0) return;

    const newBudget: Budget = {
      id: editingId || Date.now().toString(),
      name,
      categories,
      amount: parseFloat(amount),
      currency,
      period,
    };

    let newBudgets;
    if (editingId) {
      newBudgets = budgets.map(b => b.id === editingId ? newBudget : b);
    } else {
      newBudgets = [...budgets, newBudget];
    }

    onUpdateLedger({ ...ledger, budgets: newBudgets });
    resetForm();
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setName(budget.name || '');
    setCategories(budget.categories);
    setAmount(budget.amount.toString());
    setCurrency(budget.currency);
    setPeriod(budget.period);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('app_delete_budget_confirm') || 'Delete this budget?')) {
      onUpdateLedger({ ...ledger, budgets: budgets.filter(b => b.id !== id) });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setCategories(['All']);
    setAmount('');
    setCurrency('MYR');
    setPeriod('ledger');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-500" />
          {t('plan_budgets') || 'Budgets'}
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Add Budget
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="mb-8 p-6 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Budget Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Food, Transport, etc."
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setAmount(val);
                        }
                      }}
                      placeholder="0.00"
                      className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white transition-all font-bold"
                      required
                    />
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-24 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-bold"
                    >
                      <option value="MYR">MYR</option>
                      {ledger.exchanges.map(ex => (
                        <option key={ex.currency} value={ex.currency}>{ex.currency}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Period</label>
                  <div className="flex p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPeriod('ledger')}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        period === 'ledger' ? "bg-indigo-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      Entire Ledger
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod('monthly')}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        period === 'monthly' ? "bg-indigo-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Categories</label>
                <div className="max-h-[220px] overflow-y-auto p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2 custom-scrollbar">
                  <label className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      checked={categories.includes('All')}
                      onChange={() => setCategories(['All'])}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">All Categories</span>
                  </label>
                  {ledgerCategories.map(c => (
                    <label key={c.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors group">
                      <input
                        type="checkbox"
                        checked={!categories.includes('All') && categories.includes(c.name)}
                        onChange={() => {
                          setCategories(prev => {
                            const next = prev.includes('All') ? [] : [...prev];
                            return next.includes(c.name) ? next.filter(i => i !== c.name) : [...next, c.name];
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
              >
                {editingId ? 'Update Budget' : 'Save Budget'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {budgets.map(budget => {
          if (!budget || !budget.categories) return null;
          const spent = calculateSpending(budget);
          const remaining = budget.amount - spent;
          const percentage = Math.min(100, (spent / budget.amount) * 100);
          const isOver = spent > budget.amount;

          return (
            <div key={budget.id} className="group">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-black text-gray-900 dark:text-white truncate">
                      {budget.name || ((budget.categories || []).includes('All') ? 'Total Budget' : (budget.categories || []).map(c => c.split(' ')[0]).join(', '))}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg uppercase font-black tracking-widest">
                      {budget.period}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <span className={cn(isOver ? "text-rose-500" : "text-indigo-500")}>{formatCurrency(spent, budget.currency)}</span>
                    <span className="opacity-50">/</span>
                    <span>{formatCurrency(budget.amount, budget.currency)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(budget)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(budget.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out rounded-full",
                    isOver ? "bg-rose-500" : percentage > 85 ? "bg-amber-500" : "bg-indigo-500"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isOver ? "bg-rose-500" : percentage > 85 ? "bg-amber-500" : "bg-indigo-500"
                  )} />
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isOver ? "text-rose-500" : "text-gray-400 dark:text-gray-500"
                  )}>
                    {isOver ? 'Over budget!' : `${percentage.toFixed(0)}% used`}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {remaining > 0 ? `${formatCurrency(remaining, budget.currency)} left` : '0 left'}
                </span>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && !isAdding && (
          <div className="text-center py-16 bg-gray-50/30 dark:bg-gray-900/10 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
            <PieChart className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium italic">
              No budgets set yet. Track your spending limits!
            </p>
          </div>
        )}
      </div>

      {budgets.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              <span className="font-black uppercase tracking-widest block mb-1">Pro Tip</span>
              Setting category budgets helps you identify where you're overspending most.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Trip, Budget, CATEGORIES } from '../../types';
import { Wallet, Plus, Edit2, Trash2, AlertCircle, PieChart, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface BudgetManagerProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

export function BudgetManager({ trip, onUpdateTrip }: BudgetManagerProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>(['All']);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [period, setPeriod] = useState<'trip' | 'monthly'>('trip');

  const budgets = trip.budgets || [];
  const tripCategories = trip.categories || CATEGORIES;

  const calculateSpending = (budget: Budget) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return trip.expenses.reduce((acc, exp) => {
      // Filter by category
      if (!budget.categories.includes('All') && !budget.categories.includes(exp.category)) return acc;

      // Filter by period
      if (budget.period === 'monthly') {
        const expDate = new Date(exp.date);
        if (expDate.getMonth() !== currentMonth || expDate.getFullYear() !== currentYear) return acc;
      }

      // Convert to budget currency (simplified for now, assuming same currency or using stored rate)
      // In a real app, we'd use the exchange rates
      return acc + exp.amountOriginal; 
    }, 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || categories.length === 0) return;

    const newBudget: Budget = {
      id: editingId || Date.now().toString(),
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

    onUpdateTrip({ ...trip, budgets: newBudgets });
    resetForm();
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setCategories(budget.categories);
    setAmount(budget.amount.toString());
    setCurrency(budget.currency);
    setPeriod(budget.period);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('app_delete_budget_confirm') || 'Delete this budget?')) {
      onUpdateTrip({ ...trip, budgets: budgets.filter(b => b.id !== id) });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setCategories(['All']);
    setAmount('');
    setCurrency('MYR');
    setPeriod('trip');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-500" />
          {t('plan_budgets') || 'Budgets'}
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Categories</label>
                <div className="max-h-40 overflow-y-auto p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm">
                  <label className="flex items-center gap-2 p-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categories.includes('All')}
                      onChange={() => setCategories(['All'])}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-gray-900 dark:text-white">All Categories</span>
                  </label>
                  {tripCategories.map(c => (
                    <label key={c} className="flex items-center gap-2 p-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!categories.includes('All') && categories.includes(c)}
                        onChange={() => {
                          setCategories(prev => {
                            const next = prev.includes('All') ? [] : [...prev];
                            return next.includes(c) ? next.filter(i => i !== c) : [...next, c];
                          });
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-gray-900 dark:text-white">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Period</label>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as any)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="trip">Entire Trip</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Budget Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                  required
                />
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-24 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="MYR">MYR</option>
                  {trip.exchanges.map(ex => (
                    <option key={ex.currency} value={ex.currency}>{ex.currency}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {budgets.map(budget => {
          const spent = calculateSpending(budget);
          const remaining = budget.amount - spent;
          const percentage = Math.min(100, (spent / budget.amount) * 100);
          const isOver = spent > budget.amount;

          return (
            <div key={budget.id} className="group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">
                      {budget.categories.includes('All') ? 'Total Budget' : budget.categories.map(c => c.split(' ')[0]).join(', ')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded uppercase font-bold tracking-wider">
                      {budget.period}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(budget)} className="p-1.5 text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(budget.id)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    isOver ? "bg-red-500" : percentage > 85 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className={cn(
                  "text-[10px] font-bold",
                  isOver ? "text-red-500" : "text-gray-400 dark:text-gray-500"
                )}>
                  {isOver ? 'Over budget!' : `${percentage.toFixed(0)}% used`}
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                  {remaining > 0 ? `${formatCurrency(remaining)} left` : '0 left'}
                </span>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && !isAdding && (
          <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl">
            <PieChart className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No budgets set yet. Track your spending limits!
            </p>
          </div>
        )}
      </div>

      {budgets.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-bold">Pro Tip:</span> Setting category budgets helps you identify where you're overspending most.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

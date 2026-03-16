import React, { useState } from 'react';
import { Trip, RecurringTransaction } from '../../types';
import { Repeat, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface RecurringTransactionsProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

export function RecurringTransactions({ trip, onUpdateTrip }: RecurringTransactionsProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [category, setCategory] = useState('📝 General / Other');
  const [paidBy, setPaidBy] = useState(trip.users[0] || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  const recurring = trip.recurringTransactions || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !paidBy) return;

    const newTx: RecurringTransaction = {
      id: editingId || Date.now().toString(),
      desc,
      amountOriginal: parseFloat(amount),
      currency,
      category,
      paidBy,
      splitAmong: trip.users,
      frequency,
      nextDate,
    };

    let newRecurring;
    if (editingId) {
      newRecurring = recurring.map(r => r.id === editingId ? newTx : r);
    } else {
      newRecurring = [...recurring, newTx];
    }

    onUpdateTrip({ ...trip, recurringTransactions: newRecurring });
    resetForm();
  };

  const handleEdit = (tx: RecurringTransaction) => {
    setEditingId(tx.id);
    setDesc(tx.desc);
    setAmount(tx.amountOriginal.toString());
    setCurrency(tx.currency);
    setCategory(tx.category);
    setPaidBy(tx.paidBy);
    setFrequency(tx.frequency);
    setNextDate(tx.nextDate);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('app_delete_recurring_confirm') || 'Delete this recurring transaction?')) {
      onUpdateTrip({ ...trip, recurringTransactions: recurring.filter(r => r.id !== id) });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setDesc('');
    setAmount('');
    setCurrency('MYR');
    setCategory('📝 General / Other');
    setPaidBy(trip.users[0] || '');
    setFrequency('monthly');
    setNextDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Repeat className="w-6 h-6 text-blue-500" />
          {t('plan_recurring') || 'Recurring'}
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as any)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Next Date</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={e => setNextDate(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Paid By</label>
                <select
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  {trip.users.map(u => (
                    <option key={u} value={u}>{u}</option>
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
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {recurring.map(tx => (
          <div key={tx.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 group flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                {tx.desc}
              </h4>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrency(tx.amountOriginal)}
                </span>
                <span className="capitalize bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs">
                  {tx.frequency}
                </span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Next: {new Date(tx.nextDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(tx)} className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {recurring.length === 0 && !isAdding && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
            No recurring transactions yet.
          </div>
        )}
      </div>
    </div>
  );
}

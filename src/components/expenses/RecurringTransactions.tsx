import React, { useState } from 'react';
import { Ledger, RecurringTransaction, CATEGORIES, Category } from '../../types';
import { Repeat, Plus, Edit2, Trash2, Calendar, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface RecurringTransactionsProps {
  ledger: Ledger;
  onUpdateLedger: (ledger: Ledger) => void;
}

export function RecurringTransactions({ ledger, onUpdateLedger }: RecurringTransactionsProps) {
  const { t } = useLanguage();
  const ledgerCategories = (ledger.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [category, setCategory] = useState<Category>(ledgerCategories[0]);
  const [subCategory, setSubCategory] = useState<string>('');
  const defaultPaidBy = ledger.users.includes('Jian') ? 'Jian' : (ledger.users.length > 0 ? ledger.users[0] : '');
  const [paidBy, setPaidBy] = useState(defaultPaidBy);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  const [splitAmong, setSplitAmong] = useState<string[]>([defaultPaidBy].filter(Boolean));
  const [splitMode, setSplitMode] = useState<'equal' | 'unequal' | 'shares'>('equal');
  const [splitDetails, setSplitDetails] = useState<{ [key: string]: number | string }>({});
  const [splitShares, setSplitShares] = useState<{ [key: string]: number }>({});
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  // Update splitDetails when amount changes in equal or shares mode
  React.useEffect(() => {
    if (splitMode === 'equal' && amount && !isNaN(parseFloat(amount)) && splitAmong.length > 0) {
      const total = parseFloat(amount);
      const perPerson = total / splitAmong.length;
      const newDetails: { [key: string]: number } = {};
      splitAmong.forEach(user => {
        newDetails[user] = perPerson;
      });
      setSplitDetails(newDetails);
    } else if (splitMode === 'shares' && amount && !isNaN(parseFloat(amount)) && splitAmong.length > 0) {
      const total = parseFloat(amount);
      const totalShares = splitAmong.reduce((sum, user) => sum + (splitShares[user] ?? 1), 0);
      
      const newDetails: { [key: string]: number } = {};
      
      if (totalShares > 0) {
        const perShare = total / totalShares;
        let distributed = 0;
        let firstUserWithShares: string | null = null;
        
        splitAmong.forEach(user => {
          const shares = splitShares[user] ?? 1;
          if (shares > 0 && !firstUserWithShares) firstUserWithShares = user;
          const userAmount = Math.floor((shares * perShare) * 100) / 100;
          newDetails[user] = userAmount;
          distributed += userAmount;
        });
        
        const diff = total - distributed;
        if (firstUserWithShares && Math.abs(diff) > 0.001) {
          newDetails[firstUserWithShares] = Number((newDetails[firstUserWithShares] + diff).toFixed(2));
        }
      } else {
        splitAmong.forEach(user => newDetails[user] = 0);
      }
      
      setSplitDetails(newDetails);
    }
  }, [amount, splitAmong, splitMode, splitShares]);

  const toggleUser = (user: string) => {
    setSplitAmong(prev => 
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    );
  };

  const selectAll = () => setSplitAmong(ledger.users);
  const selectNone = () => setSplitAmong([]);

  const handleSplitRemaining = () => {
    const totalAmount = parseFloat(amount) || 0;
    const currentTotal = Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0);
    const remaining = totalAmount - currentTotal;
    
    if (remaining > 0 && splitAmong.length > 0) {
      const perPerson = remaining / splitAmong.length;
      setSplitDetails(prev => {
        const next = { ...prev };
        splitAmong.forEach(u => {
          next[u] = Number(((parseFloat(next[u]?.toString() || '0')) + perPerson).toFixed(2));
        });
        return next;
      });
    }
  };

  const handleClearSplit = () => {
    setSplitDetails({});
  };

  // Update paidBy if it's empty and users become available
  React.useEffect(() => {
    if (!paidBy && ledger.users.length > 0) {
      setPaidBy(defaultPaidBy);
    }
  }, [ledger.users, paidBy, defaultPaidBy]);

  const recurring = ledger.recurringTransactions || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDesc = desc.trim();
    if (!finalDesc) {
      if (subCategory) {
        finalDesc = subCategory;
      } else if (category && category.name) {
        finalDesc = category.name;
      } else {
        alert('Please enter a description.');
        return;
      }
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!paidBy) {
      alert('Please select who pays.');
      return;
    }
    if (splitAmong.length === 0) {
      alert('Please select at least one person to split among.');
      return;
    }

    let finalSplitDetails: { [key: string]: number } | undefined = undefined;

    if (splitMode === 'unequal' || splitMode === 'shares') {
      const totalSplit = Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0);
      const totalAmount = parseFloat(amount);
      
      if (Math.abs(totalSplit - totalAmount) > 0.1) {
        alert(`The sum of split amounts (${totalSplit.toFixed(2)}) must equal the total amount (${totalAmount.toFixed(2)}). Difference: ${(totalAmount - totalSplit).toFixed(2)}`);
        return;
      }
      // Filter out 0 amounts and ensure only selected users are included
      finalSplitDetails = {};
      splitAmong.forEach(user => {
        const val = parseFloat(splitDetails[user]?.toString() || '0');
        if (val > 0) {
          finalSplitDetails![user] = val;
        }
      });
    }

    const newTx: RecurringTransaction = {
      id: editingId || Date.now().toString(),
      desc: finalDesc,
      amountOriginal: parseFloat(amount),
      currency,
      category,
      subCategory: subCategory || undefined,
      paidBy,
      splitAmong,
      splitDetails: finalSplitDetails,
      frequency,
      nextDate,
    };

    let newRecurring;
    if (editingId) {
      newRecurring = recurring.map(r => r.id === editingId ? newTx : r);
    } else {
      newRecurring = [...recurring, newTx];
    }

    onUpdateLedger({ ...ledger, recurringTransactions: newRecurring });
    resetForm();
  };

  const handleEdit = (tx: RecurringTransaction) => {
    setEditingId(tx.id);
    setDesc(tx.desc);
    setAmount(tx.amountOriginal.toString());
    setCurrency(tx.currency);
    setCategory(tx.category);
    setSubCategory(tx.subCategory || '');
    setPaidBy(tx.paidBy);
    setSplitAmong(tx.splitAmong || [tx.paidBy]);
    if (tx.splitDetails) {
      setSplitMode('unequal');
      setSplitDetails(tx.splitDetails);
    } else {
      setSplitMode('equal');
      setSplitDetails({});
    }
    setFrequency(tx.frequency);
    setNextDate(tx.nextDate);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('app_delete_recurring_confirm') || 'Delete this recurring transaction?')) {
      onUpdateLedger({ ...ledger, recurringTransactions: recurring.filter(r => r.id !== id) });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setDesc('');
    setAmount('');
    setCurrency('MYR');
    setCategory(ledgerCategories[0]);
    setSubCategory('');
    setPaidBy(defaultPaidBy);
    setSplitAmong([defaultPaidBy].filter(Boolean));
    setSplitMode('equal');
    setSplitDetails({});
    setSplitShares({});
    setErrors({});
    setFrequency('monthly');
    setNextDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
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
          {ledger.users.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                {t('form_add_people_first') || "Please add people to the group first."}
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl text-sm font-medium"
              >
                {t('form_cancel') || "Cancel"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  placeholder="e.g. Monthly Rent"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                  <select
                    value={category.name}
                    onChange={e => {
                      setCategory(ledgerCategories.find(c => c.name === e.target.value) || ledgerCategories[0]);
                      setSubCategory('');
                    }}
                    className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    {ledgerCategories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {category.subCategories && category.subCategories.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sub-category</label>
                    <select
                      value={subCategory}
                      onChange={e => setSubCategory(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
                      {category.subCategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <div className="flex rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden transition-colors">
                    <div className="relative border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                      <select 
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="h-full pl-3 pr-8 py-2.5 bg-transparent outline-none uppercase appearance-none font-medium text-gray-700 dark:text-gray-300 text-sm"
                      >
                        {Array.from(new Set(['MYR', ...ledger.exchanges.map(e => e.currency)])).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
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
                      className="flex-1 p-2.5 bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
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
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Paid By</label>
                  <select
                    value={paidBy}
                    onChange={e => setPaidBy(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    {ledger.users.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t('form_split_among') || 'Split Among'}
                    </label>
                    <div className="text-xs space-x-2 text-blue-600 dark:text-blue-400 font-medium">
                      <button type="button" onClick={selectAll} className="hover:underline">{t('form_all') || 'All'}</button>
                      <button type="button" onClick={selectNone} className="hover:underline">{t('form_none') || 'None'}</button>
                    </div>
                  </div>
                  <div className={cn(
                    "flex flex-wrap gap-2 p-2 rounded-xl border",
                    errors.splitAmong ? "border-red-500 dark:border-red-500" : "border-transparent"
                  )}>
                    {ledger.users.map(user => (
                      <button
                        key={user}
                        type="button"
                        onClick={() => {
                          if (errors.splitAmong) setErrors(prev => ({ ...prev, splitAmong: false }));
                          toggleUser(user);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-colors",
                          splitAmong.includes(user) 
                            ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" 
                            : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                        )}
                      >
                        {user}
                      </button>
                    ))}
                    {ledger.users.length === 0 && <span className="text-sm text-gray-400 italic">{t('form_add_people_first') || 'Add people first'}</span>}
                  </div>

                  {/* Split Mode Toggle */}
                  {splitAmong.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('form_split_method') || 'Split Method'}</label>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setSplitMode('equal')}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                              splitMode === 'equal' ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                            )}
                          >
                            {t('form_equally') || 'Equally'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSplitMode('shares');
                              const newShares = { ...splitShares };
                              splitAmong.forEach(u => { if (newShares[u] === undefined) newShares[u] = 1; });
                              setSplitShares(newShares);
                            }}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                              splitMode === 'shares' ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                            )}
                          >
                            {t('form_shares') || 'Shares'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSplitMode('unequal');
                              setSplitDetails({});
                            }}
                            className={cn(
                              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                              splitMode === 'unequal' ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                            )}
                          >
                            {t('form_split_unequally') || 'Unequally'}
                          </button>
                        </div>
                      </div>

                      {splitMode === 'shares' && (() => {
                        const totalShares = splitAmong.reduce((sum, u) => sum + (splitShares[u] ?? 1), 0);
                        const maxShares = splitAmong.length;
                        const remainingShares = Math.max(0, maxShares - totalShares);
                        
                        return (
                          <div className="space-y-2 animate-in slide-in-from-top-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                              <span>{(t('form_assign_shares') || 'Assign up to {maxShares} shares').replace('{maxShares}', maxShares.toString())}</span>
                              <span className={cn("font-bold", remainingShares > 0 ? "text-orange-500" : "text-blue-600")}>
                                {(t('form_remaining_shares') || '{remainingShares} remaining').replace('{remainingShares}', remainingShares.toString())}
                              </span>
                            </div>
                            {splitAmong.map(user => (
                              <div key={user} className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 dark:text-gray-300 w-20 truncate">{user}</span>
                                <div className="flex-1 flex items-center gap-3">
                                  <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                    <button 
                                      type="button"
                                      onClick={() => setSplitShares(prev => ({ ...prev, [user]: Math.max(0, (prev[user] ?? 1) - 1) }))}
                                      className="px-3 py-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >-</button>
                                    <input
                                      type="number" inputMode="decimal"
                                      pattern="[0-9]*\.?[0-9]*"
                                      value={splitShares[user] ?? 1}
                                      onChange={e => {
                                        const valStr = e.target.value;
                                        if (valStr === '') {
                                          setSplitShares(prev => ({ ...prev, [user]: 0 }));
                                          return;
                                        }
                                        const val = parseFloat(valStr);
                                        if (!isNaN(val)) {
                                          const currentVal = splitShares[user] ?? 1;
                                          const maxAllowed = currentVal + remainingShares;
                                          setSplitShares(prev => ({ ...prev, [user]: Math.min(Math.max(0, val), maxAllowed) }));
                                        }
                                      }}
                                      className="w-12 text-center bg-transparent text-sm font-medium outline-none text-gray-900 dark:text-white"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (remainingShares > 0) {
                                          setSplitShares(prev => ({ ...prev, [user]: (prev[user] ?? 1) + 1 }));
                                        }
                                      }}
                                      disabled={remainingShares <= 0}
                                      className="px-3 py-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                    >+</button>
                                  </div>
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 ml-auto">
                                    {currency} {(parseFloat(splitDetails[user]?.toString() || '0')).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {splitMode === 'unequal' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                          {splitAmong.map(user => (
                            <div key={user} className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 dark:text-gray-300 w-20 truncate">{user}</span>
                              <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">{currency}</span>
                                <input
                                  type="number" inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={splitDetails[user] ?? ''}
                                  onChange={e => {
                                    setSplitDetails(prev => ({
                                      ...prev,
                                      [user]: e.target.value
                                    }));
                                  }}
                                  className="w-full pl-12 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSplitRemaining}
                                className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                {t('form_split_remaining') || 'Split Remaining'}
                              </button>
                              <button
                                type="button"
                                onClick={handleClearSplit}
                                className="text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                {t('form_clear') || 'Clear'}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">{t('form_total') || 'Total'}</span>
                              <span className={cn(
                                "text-sm font-bold",
                                Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2) === (parseFloat(amount) || 0).toFixed(2) 
                                  ? "text-blue-600" 
                                  : "text-red-500"
                              )}>
                                {Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2)} / {amount || '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {t('form_cancel') || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {editingId ? (t('form_update') || 'Update') : (t('form_save') || 'Save')}
                </button>
              </div>
            </div>
          )}
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
                  {formatCurrency(tx.amountOriginal, tx.currency)}
                </span>
                <span className="capitalize bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs">
                  {tx.frequency}
                </span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-blue-500 dark:text-blue-400 font-medium">{tx.paidBy}</span>
                {tx.splitAmong && tx.splitAmong.length > 0 && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">→</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={tx.splitAmong.join(', ')}>
                      {tx.splitAmong.join(', ')}
                    </span>
                  </>
                )}
                <span>•</span>
                <Calendar className="w-3 h-3 ml-1" />
                Next: {new Date(tx.nextDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
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

import React, { useState, useRef, useEffect } from 'react';
import { Ledger, RecurringTransaction, CATEGORIES, Category } from '../../types';
import { Repeat, Plus, Edit2, Trash2, Calendar, DollarSign, X, Target } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface RecurringTransactionsProps {
  ledger: Ledger;
  onUpdateLedger: (ledger: Ledger) => void;
}

export function RecurringTransactions({ ledger, onUpdateLedger }: RecurringTransactionsProps) {
  const { t } = useLanguage();
  const ledgerCategories = (ledger.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const formRef = useRef<HTMLFormElement>(null);

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
  const [linkToGoal, setLinkToGoal] = useState(false);
  const [goalId, setGoalId] = useState('');

  useEffect(() => {
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
    if (splitAmong.includes(user)) {
      setSplitAmong(splitAmong.filter(u => u !== user));
    } else {
      setSplitAmong([...splitAmong, user]);
    }
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

  useEffect(() => {
    if (!paidBy && ledger.users.length > 0) {
      setPaidBy(defaultPaidBy);
    }
  }, [ledger.users, paidBy, defaultPaidBy]);

  const recurring = ledger.recurringTransactions || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDesc = desc.trim();
    if (!finalDesc) {
      if (subCategory) finalDesc = subCategory;
      else if (category && category.name) finalDesc = category.name;
      else { alert('Please enter a description.'); return; }
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
    if (linkToGoal && ledger.goals && ledger.goals.length > 0 && !goalId) {
      alert(t('form_goal_required', 'Please choose a goal, or turn off "Link payments to a goal".'));
      return;
    }

    let finalSplitDetails: { [key: string]: number } | undefined = undefined;

    if (splitMode === 'unequal' || splitMode === 'shares') {
      const totalSplit = Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0);
      const totalAmount = parseFloat(amount);
      
      if (Math.abs(totalSplit - totalAmount) > 0.1) {
        alert(`Split amounts (${totalSplit.toFixed(2)}) must equal total amount (${totalAmount.toFixed(2)}). Update splits!`);
        return;
      }
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
      ...(linkToGoal && goalId ? { goalId } : {}),
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
    if (tx.splitDetails && Object.keys(tx.splitDetails).length > 0) {
      setSplitMode('unequal');
      setSplitDetails(tx.splitDetails);
    } else {
      setSplitMode('equal');
      setSplitDetails({});
    }
    setFrequency(tx.frequency);
    setNextDate(tx.nextDate);
    setLinkToGoal(!!tx.goalId);
    setGoalId(tx.goalId || '');
    setIsAdding(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
    setLinkToGoal(false);
    setGoalId('');
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
        <form ref={formRef} onSubmit={handleSave} className="mb-6 space-y-4 p-5 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {editingId ? 'Edit Recurring Payment' : 'New Recurring Payment'}
            </h4>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4">
            {/* Amount */}
            <div className="col-span-2 md:col-span-12 lg:col-span-7 lg:order-2">
              <label className="hidden lg:block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
              <div className="flex flex-col lg:flex-row lg:rounded-xl lg:bg-gray-50 lg:dark:bg-gray-700 lg:border lg:border-gray-200 lg:dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden transition-colors">
                <div className="relative border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex justify-center lg:justify-start">
                  <select 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="h-full pl-3 pr-8 py-2.5 bg-transparent outline-none uppercase appearance-none font-medium text-gray-700 dark:text-gray-300 text-sm text-center lg:text-left"
                  >
                    {Array.from(new Set(['MYR', ...ledger.exchanges.map(e => e.currency)])).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="relative flex-1 flex items-center bg-white dark:bg-gray-800 py-4 lg:py-0">
                  <div className="absolute left-3 pointer-events-none hidden lg:block"><DollarSign className="w-4 h-4 text-gray-400" /></div>
                  <input
                    type="number" inputMode="decimal"
                    value={amount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val);
                    }}
                    className="w-full p-3 lg:pl-10 pr-4 bg-transparent border-none outline-none font-mono font-semibold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 text-center lg:text-left text-4xl lg:text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="col-span-2 md:col-span-7 lg:order-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input 
                type="text" value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="e.g. Netflix, Rent"
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 min-h-[42px]"
                required
              />
            </div>

            {/* Date & Frequency */}
            <div className="col-span-2 md:col-span-5 lg:order-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Next Payment & Frequency</label>
              <div className="flex gap-3">
                <input 
                  type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                  className="w-full flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                  required
                />
                <select 
                  value={frequency} onChange={e => setFrequency(e.target.value as any)}
                  className="w-full flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            {/* Category Grid */}
            <div className="col-span-2 md:col-span-12 lg:order-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {ledgerCategories.map(c => (
                  <button
                    key={c.name} type="button"
                    onClick={() => { setCategory(c); setSubCategory(''); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5 group relative overflow-hidden",
                      category.name === c.name ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm" : "bg-white dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <span className={cn("text-2xl transition-transform", category.name === c.name ? "scale-110" : "group-hover:scale-110")}>{c.name.split(' ')[0]}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-center truncate w-full">{c.name.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
              {category.subCategories && category.subCategories.length > 0 && (
                <div className="mt-4">
                  <div className="flex gap-2 flex-wrap">
                    {category.subCategories.map(sub => (
                      <button
                        key={sub} type="button" onClick={() => setSubCategory(sub)}
                        className={cn("px-4 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-tight transition-all", subCategory === sub ? "bg-blue-100 dark:bg-blue-900/40 border-blue-500 text-blue-700" : "bg-white dark:bg-gray-700/30 border-gray-100 text-gray-500 hover:border-gray-300")}
                      >{sub}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Paid By</label>
              <select 
                value={paidBy} onChange={e => setPaidBy(e.target.value)} 
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              >
                {ledger.users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-500">Split Among</label>
                <div className="text-xs space-x-2 text-blue-600 dark:text-blue-400 font-medium">
                  <button type="button" onClick={selectAll} className="hover:underline">All</button>
                  <button type="button" onClick={selectNone} className="hover:underline">None</button>
                </div>
              </div>
              <div className={cn("flex flex-wrap gap-2 p-2 rounded-xl border", errors.splitAmong ? "border-red-500" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50")}>
                {ledger.users.map(user => (
                  <button
                    key={user} type="button" onClick={() => toggleUser(user)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-bold border transition-colors", splitAmong.includes(user) ? "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300" : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100")}
                  >{user}</button>
                ))}
              </div>

              {/* Split Mode */}
              {splitAmong.length > 0 && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-gray-500">Split Method</label>
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                      {['equal', 'shares', 'unequal'].map(mode => (
                        <button key={mode} type="button" onClick={() => setSplitMode(mode as any)} className={cn("px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors", splitMode === mode ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white" : "text-gray-500")}>
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {splitMode === 'shares' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      {splitAmong.map(user => (
                        <div key={user} className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-20 truncate">{user}</span>
                          <div className="flex-1 flex items-center bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <button type="button" onClick={() => setSplitShares(p => ({...p, [user]: Math.max(0, (p[user]??1)-1)}))} className="px-4 py-2 font-bold">-</button>
                            <input type="number" value={splitShares[user]??1} onChange={e => setSplitShares(p => ({...p, [user]: parseFloat(e.target.value)||0}))} className="w-12 text-center bg-transparent border-x border-gray-200 dark:border-gray-700 outline-none text-sm font-bold" />
                            <button type="button" onClick={() => setSplitShares(p => ({...p, [user]: (p[user]??1)+1}))} className="px-4 py-2 font-bold">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {splitMode === 'unequal' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      {splitAmong.map(user => (
                        <div key={user} className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-20 truncate">{user}</span>
                          <div className="flex-1 flex items-center bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3">
                            <span className="text-gray-400 font-bold text-sm">{currency}</span>
                            <input type="number" inputMode="decimal" value={splitDetails[user] ?? ''} onChange={e => setSplitDetails(p => ({...p, [user]: e.target.value}))} className="flex-1 p-2 bg-transparent outline-none font-mono font-bold text-sm" placeholder="0.00" />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={handleSplitRemaining} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Split Remaining</button>
                          <button type="button" onClick={handleClearSplit} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Clear</button>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={cn("font-bold", Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2) === (parseFloat(amount) || 0).toFixed(2) ? "text-blue-600" : "text-red-500")}>
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

          {ledger.goals && ledger.goals.length > 0 && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={linkToGoal}
                  onChange={e => {
                    const on = e.target.checked;
                    setLinkToGoal(on);
                    if (!on) setGoalId('');
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('form_link_recurring_goal', 'Link payments to a goal')}
                  <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('form_link_recurring_goal_hint', 'When you mark this recurring as paid, the expense will count toward the goal you choose.')}
                  </span>
                </span>
              </label>
              {linkToGoal && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_goal_select', 'Goal')}</label>
                  <select
                    value={goalId}
                    onChange={e => setGoalId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">-- {t('form_goal_placeholder', 'Select a goal')} --</option>
                    {ledger.goals.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2 items-center">
            <button type="button" onClick={resetForm} className="px-5 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">{editingId ? 'Update Recurring' : 'Save Recurring'}</button>
          </div>
        </form>
      )}

      {/* Existing List Map (Unchanged visuals for list) */}
      <div className="space-y-4">
        {recurring.map(tx => {
          const linkedGoal = tx.goalId ? ledger.goals?.find(g => g.id === tx.goalId) : undefined;
          return (
          <div key={tx.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 group flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 flex-wrap">{tx.desc}</h4>
              {linkedGoal && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <Target className="w-3 h-3 shrink-0" />
                  {linkedGoal.name}
                </div>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(tx.amountOriginal, tx.currency)}</span>
                <span className="capitalize bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs">{tx.frequency}</span>
              </div>
              <div className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                <span className="text-blue-500 font-medium">{tx.paidBy}</span>
                {tx.splitAmong?.length > 0 && <><span>→</span><span className="truncate max-w-[120px]">{tx.splitAmong.join(', ')}</span></>}
                <span>•</span><Calendar className="w-3 h-3 ml-1" />Next: {new Date(tx.nextDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => handleEdit(tx)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
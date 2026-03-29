import React, { useState, useEffect } from 'react';
import { Loan, Category, CATEGORIES } from '../../types';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: Loan) => void;
  initialData?: Loan;
  users: string[];
  defaultCurrency: string;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSave, initialData, users, defaultCurrency }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'loan' | 'installment'>(initialData?.type || 'loan');
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount.toString() || '');
  const [remainingAmount, setRemainingAmount] = useState(initialData?.remainingAmount.toString() || '');
  const [installmentAmount, setInstallmentAmount] = useState(initialData?.installmentAmount.toString() || '');
  const [interestRate, setInterestRate] = useState(initialData?.interestRate.toString() || '');
const [termMonths, setTermMonths] = useState(initialData?.termMonths.toString() || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(initialData?.frequency || 'monthly');
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [nextInstallmentDate, setNextInstallmentDate] = useState(initialData?.nextInstallmentDate || '');
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || users[0] || '');
  const [status, setStatus] = useState(initialData?.status || 'active');

  // New state variables for category and split logic
  const defaultCategory = CATEGORIES.find(c => c.name === '🏦 Bank / Finance') || CATEGORIES[0];
  const [category, setCategory] = useState<string>(initialData?.category?.name || defaultCategory.name);
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  
  const [splitAmong, setSplitAmong] = useState<string[]>(initialData?.splitAmong || (initialData?.paidBy ? [initialData.paidBy] : (users[0] ? [users[0]] : [])));
  const [splitMode, setSplitMode] = useState<'equal' | 'unequal' | 'shares'>(initialData?.splitDetails ? 'unequal' : 'equal');
  const [splitDetails, setSplitDetails] = useState<{ [userName: string]: number | string }>(initialData?.splitDetails || {});
  const [splitShares, setSplitShares] = useState<{ [userName: string]: number }>({});
  const [errors, setErrors] = useState<{ splitAmong?: boolean; amount?: boolean }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || 'loan');
      setTotalAmount(initialData.totalAmount.toString() || '');
      setRemainingAmount(initialData.remainingAmount.toString() || '');
      setInstallmentAmount(initialData.installmentAmount.toString() || '');
      setInterestRate(initialData.interestRate.toString() || '');
setTermMonths(initialData.termMonths.toString() || '');
      setFrequency(initialData.frequency || 'monthly');
      setCurrency(initialData.currency || 'MYR');

      setStartDate(initialData.startDate || '');
      setDueDate(initialData.dueDate || '');
      setNextInstallmentDate(initialData.nextInstallmentDate || '');
      setPaidBy(initialData.paidBy || '');
      setStatus(initialData.status || 'active');
      setCategory(initialData.category?.name || defaultCategory.name);
      setSubCategory(initialData.subCategory || '');
      setSplitAmong(initialData.splitAmong || (initialData.paidBy ? [initialData.paidBy] : (users[0] ? [users[0]] : [])));
      setSplitMode(initialData.splitDetails ? 'unequal' : 'equal');
      setSplitDetails(initialData.splitDetails || {});
      setSplitShares({});
    } else {
      setName('');
      setType('loan');
      setTotalAmount('');
      setRemainingAmount('');
      setInstallmentAmount('');
      setInterestRate('');
 setTermMonths('');
      setFrequency('monthly');
      setCurrency(defaultCurrency || 'MYR');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setNextInstallmentDate('');
      setPaidBy(users[0] || '');
      setStatus('active');
      setCategory(defaultCategory.name);
      setSubCategory('');
      setSplitAmong(users[0] ? [users[0]] : []);
      setSplitMode('equal');
      setSplitDetails({});
      setSplitShares({});
    }
  }, [initialData, isOpen, users, defaultCurrency]);

  // Recalculate split details when amount, splitAmong, splitMode, or splitShares change
  useEffect(() => {
    if (splitMode === 'equal' && splitAmong.length > 0) {
      const parsedAmount = parseFloat(installmentAmount) || 0;
      const splitAmount = parsedAmount / splitAmong.length;
      const newSplitDetails: { [userName: string]: number } = {};
      splitAmong.forEach(user => {
        newSplitDetails[user] = Number(splitAmount.toFixed(2));
      });
      // Adjust for rounding errors
      const totalSplit = Object.values(newSplitDetails).reduce((a, b) => a + b, 0);
      const diff = parsedAmount - totalSplit;
      if (Math.abs(diff) > 0.001 && splitAmong.length > 0) {
        newSplitDetails[splitAmong[0]] = Number((newSplitDetails[splitAmong[0]] + diff).toFixed(2));
      }
      setSplitDetails(newSplitDetails);
    } else if (splitMode === 'shares' && splitAmong.length > 0) {
      const parsedAmount = parseFloat(installmentAmount) || 0;
      const totalShares = splitAmong.reduce((sum, u) => sum + (splitShares[u] ?? 1), 0);
      
      if (totalShares > 0) {
        const newSplitDetails: { [userName: string]: number } = {};
        let currentTotal = 0;
        
        splitAmong.forEach((user, index) => {
          if (index === splitAmong.length - 1) {
            newSplitDetails[user] = Number((parsedAmount - currentTotal).toFixed(2));
          } else {
            const share = splitShares[user] ?? 1;
            const amount = Number(((parsedAmount * share) / totalShares).toFixed(2));
            newSplitDetails[user] = amount;
            currentTotal += amount;
          }
        });
        setSplitDetails(newSplitDetails);
      }
    }
  }, [installmentAmount, splitAmong, splitMode, splitShares]);

  if (!isOpen) return null;

  const toggleUser = (user: string) => {
    if (splitAmong.includes(user)) {
      setSplitAmong(splitAmong.filter(u => u !== user));
    } else {
      setSplitAmong([...splitAmong, user]);
    }
  };

  const selectAll = () => setSplitAmong(users);
  const selectNone = () => setSplitAmong([]);

  const handleSplitRemaining = () => {
    const parsedAmount = parseFloat(installmentAmount) || 0;
    const currentTotal = splitAmong.reduce((sum, u) => sum + (parseFloat(splitDetails[u]?.toString() || '0') || 0), 0);
    const remaining = parsedAmount - currentTotal;
    
    if (remaining > 0 && splitAmong.length > 0) {
      const usersWithZero = splitAmong.filter(u => !parseFloat(splitDetails[u]?.toString() || '0'));
      const targetUsers = usersWithZero.length > 0 ? usersWithZero : splitAmong;
      
      const splitAmount = remaining / targetUsers.length;
      const newSplitDetails = { ...splitDetails };
      
      targetUsers.forEach(user => {
        const current = parseFloat(newSplitDetails[user]?.toString() || '0') || 0;
        newSplitDetails[user] = Number((current + splitAmount).toFixed(2));
      });
      
      setSplitDetails(newSplitDetails);
    }
  };

  const handleClearSplit = () => {
    const newSplitDetails: { [userName: string]: number } = {};
    splitAmong.forEach(u => newSplitDetails[u] = 0);
    setSplitDetails(newSplitDetails);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (splitAmong.length === 0) {
      setErrors(prev => ({ ...prev, splitAmong: true }));
      alert(t('form_error_split_among') || 'Please select at least one person to split the cost with.');
      return;
    }

    let finalSplitDetails: { [userName: string]: number } | undefined = undefined;
    
    if (splitMode === 'unequal' || splitMode === 'shares') {
      const parsedAmount = parseFloat(installmentAmount) || 0;
      const totalSplit = splitAmong.reduce((sum, user) => sum + (parseFloat(splitDetails[user]?.toString() || '0') || 0), 0);
      
      if (Math.abs(totalSplit - parsedAmount) > 0.01) {
        alert(`The sum of split amounts (${totalSplit.toFixed(2)}) must equal the installment amount (${parsedAmount.toFixed(2)}). Difference: ${(parsedAmount - totalSplit).toFixed(2)}`);
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

    const categoryObj = CATEGORIES.find(c => c.name === category) || { name: category, subCategories: [] };

    onSave({
      id: initialData?.id || Date.now().toString(),
      name,
      type,
      totalAmount: parseFloat(totalAmount) || 0,
      remainingAmount: parseFloat(remainingAmount) || 0,
      installmentAmount: parseFloat(installmentAmount) || 0,
interestRate: parseFloat(interestRate) || 0,
      termMonths: parseInt(termMonths) || 0,
      frequency,
      currency,
      category: categoryObj,
      subCategory: subCategory || undefined,
      startDate,
      dueDate,
      nextInstallmentDate,
      paidBy,
      splitAmong,
      splitDetails: finalSplitDetails,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/20 overflow-hidden">
        <div className="flex justify-between items-center p-6 sm:p-8 pb-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{initialData ? 'Edit Loan' : 'Add New Loan'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Track your installments and debts</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-4 overflow-y-auto space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Loan Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-medium" 
              placeholder="e.g. Car Loan"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Type</label>
            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setType('loan')}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all",
                  type === 'loan' ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Loan
              </button>
              <button
                type="button"
                onClick={() => setType('installment')}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all",
                  type === 'installment' ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Installment
              </button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Paid By</label>
            <select 
              value={paidBy} 
              onChange={e => setPaidBy(e.target.value)} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-medium appearance-none"
              required
            >
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Currency</label>
            <input 
              type="text" 
              value={currency} 
              onChange={e => setCurrency(e.target.value.toUpperCase())} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold" 
              placeholder="MYR"
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Total Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{currency}</span>
              <input 
                type="number" 
                inputMode="decimal" 
                value={totalAmount} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setTotalAmount(val);
                  }
                }} 
                className="w-full p-4 pl-14 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold text-lg" 
                placeholder="0.00"
                required 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Remaining Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{currency}</span>
              <input 
                type="number" inputMode="decimal" 
                value={remainingAmount} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setRemainingAmount(val);
                  }
                }} 
                className="w-full p-4 pl-14 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold text-lg" 
                placeholder="0.00"
                required 
              />
            </div>
          </div>

<div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Monthly Installment</label>
            <input 
              type="number" inputMode="decimal" 
              pattern="[0-9]*\.?[0-9]*" 
              value={installmentAmount} 
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                  setInstallmentAmount(val);
                }
              }} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold" 
              placeholder="0.00"
              required 
            />
          </div>
            <input 
              type="number" inputMode="decimal" 
              pattern="[0-9]*\.?[0-9]*" 
              value={installmentAmount} 
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                  setInstallmentAmount(val);
                }
              }} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold" 
              placeholder="0.00"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Interest Rate (%)</label>
            <input 
              type="number" inputMode="decimal" 
              pattern="[0-9]*\.?[0-9]*" 
              value={interestRate} 
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                  setInterestRate(val);
                }
              }} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold" 
              placeholder="0.00"
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Term (Months)</label>
            <input 
              type="number" 
              inputMode="numeric" 
              pattern="[0-9]*" 
              value={termMonths} 
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^[0-9]*$/.test(val)) {
                  setTermMonths(val);
                }
              }} 
              className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-mono font-bold" 
              placeholder="0"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-medium" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Final Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-medium" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Next Payment</label>
            <input type="date" value={nextInstallmentDate} onChange={e => setNextInstallmentDate(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-medium" required />
          </div>

          {/* Category */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('form_category') || 'Category'}</label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {CATEGORIES.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { setCategory(c.name); setSubCategory(''); }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5 group relative overflow-hidden",
                    category === c.name 
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm" 
                      : "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                >
                  <span className={cn(
                    "text-2xl transition-transform duration-200",
                    category === c.name ? "scale-110" : "group-hover:scale-110"
                  )}>
                    {c.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-tight truncate w-full">
                    {c.name.split(' ').slice(1).join(' ')}
                  </span>
                </button>
              ))}
            </div>
            {category && CATEGORIES.find(c => c.name === category)?.subCategories && CATEGORIES.find(c => c.name === category)!.subCategories!.length > 0 && (
              <div className="mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Sub-category</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.find(c => c.name === category)!.subCategories!.map(sub => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubCategory(sub)}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-tight transition-all",
                        subCategory === sub
                          ? "bg-blue-100 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm"
                          : "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Split Among */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {t('form_split_among') || 'Split Among'}
              </label>
              <div className="text-xs space-x-2 text-blue-600 dark:text-blue-400 font-medium">
                <button type="button" onClick={() => setSplitAmong([...users])} className="hover:underline">{t('form_all') || 'All'}</button>
                <button type="button" onClick={() => setSplitAmong([])} className="hover:underline">{t('form_none') || 'None'}</button>
              </div>
            </div>
            <div className={cn(
              "flex flex-wrap gap-2 p-3 rounded-2xl border",
              errors.splitAmong ? "border-red-500 dark:border-red-500" : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            )}>
              {users.map(user => (
                <button
                  key={user}
                  type="button"
                  onClick={() => {
                    if (errors.splitAmong) setErrors(prev => ({ ...prev, splitAmong: false }));
                    setSplitAmong(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold border transition-colors",
                    splitAmong.includes(user) 
                      ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" 
                      : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  )}
                >
                  {user}
                </button>
              ))}
              {users.length === 0 && <span className="text-sm text-gray-400 italic">{t('form_add_people_first') || 'Add people first'}</span>}
            </div>

            {/* Split Mode Toggle */}
            {splitAmong.length > 0 && (
              <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('form_split_method') || 'Split Method'}</label>
                  <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setSplitMode('equal')}
                      className={cn(
                        "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                        splitMode === 'equal' ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
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
                        "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                        splitMode === 'shares' ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
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
                        "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                        splitMode === 'unequal' ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
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
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border border-gray-100 dark:border-gray-700">
                        <span>{(t('form_assign_shares') || 'Assign up to {maxShares} shares').replace('{maxShares}', maxShares.toString())}</span>
                        <span className={cn("font-bold", remainingShares > 0 ? "text-orange-500" : "text-blue-600")}>
                          {(t('form_remaining_shares') || '{remainingShares} remaining').replace('{remainingShares}', remainingShares.toString())}
                        </span>
                      </div>
                      {splitAmong.map(user => (
                        <div key={user} className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-24 truncate">{user}</span>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                              <button 
                                type="button"
                                onClick={() => setSplitShares(prev => ({ ...prev, [user]: Math.max(0, (prev[user] ?? 1) - 1) }))}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold"
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
                                    const diff = val - currentVal;
                                    if (diff > 0 && remainingShares < diff) {
                                      setSplitShares(prev => ({ ...prev, [user]: currentVal + remainingShares }));
                                    } else {
                                      setSplitShares(prev => ({ ...prev, [user]: val }));
                                    }
                                  }
                                }}
                                className="w-12 text-center bg-transparent border-x border-gray-100 dark:border-gray-700 py-2 outline-none text-sm font-bold text-gray-900 dark:text-white"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  if (remainingShares > 0) {
                                    setSplitShares(prev => ({ ...prev, [user]: (prev[user] ?? 1) + 1 }));
                                  }
                                }}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold"
                                disabled={remainingShares <= 0}
                              >+</button>
                            </div>
                            <span className="text-sm font-mono font-bold text-gray-500 dark:text-gray-400 w-20 text-right">
                              {currency} {((parseFloat(installmentAmount) || 0) * (splitShares[user] ?? 1) / (totalShares || 1)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {splitMode === 'unequal' && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    {splitAmong.map(user => (
                      <div key={user} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-24 truncate">{user}</span>
                        <div className="flex-1 flex items-center bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden px-3">
                          <span className="text-gray-400 font-bold text-sm">{currency}</span>
                          <input
                            type="number" inputMode="decimal"
                            value={splitDetails[user] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setSplitDetails(prev => ({ ...prev, [user]: val }));
                              }
                            }}
                            className="flex-1 p-3 bg-transparent outline-none text-sm font-mono font-bold text-gray-900 dark:text-white"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'paid_off')} className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white font-bold appearance-none">
              <option value="active">Active</option>
              <option value="paid_off">Paid Off</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
          {initialData ? 'Update Loan' : 'Create Loan'}
        </button>
        </form>
      </div>
    </div>
  );
};

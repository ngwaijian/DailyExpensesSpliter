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
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [nextInstallmentDate, setNextInstallmentDate] = useState(initialData?.nextInstallmentDate || '');
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || users[0] || '');
  const [status, setStatus] = useState(initialData?.status || 'active');

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

  useEffect(() => {
    if (splitMode === 'equal' && splitAmong.length > 0) {
      const parsedAmount = parseFloat(installmentAmount) || 0;
      const splitAmount = parsedAmount / splitAmong.length;
      const newSplitDetails: { [userName: string]: number } = {};
      splitAmong.forEach(user => newSplitDetails[user] = Number(splitAmount.toFixed(2)));
      const diff = parsedAmount - Object.values(newSplitDetails).reduce((a, b) => a + b, 0);
      if (Math.abs(diff) > 0.001) newSplitDetails[splitAmong[0]] = Number((newSplitDetails[splitAmong[0]] + diff).toFixed(2));
      setSplitDetails(newSplitDetails);
    } else if (splitMode === 'shares' && splitAmong.length > 0) {
      const parsedAmount = parseFloat(installmentAmount) || 0;
      const totalShares = splitAmong.reduce((sum, u) => sum + (splitShares[u] ?? 1), 0);
      if (totalShares > 0) {
        const newSplitDetails: { [userName: string]: number } = {};
        let currentTotal = 0;
        splitAmong.forEach((user, index) => {
          if (index === splitAmong.length - 1) newSplitDetails[user] = Number((parsedAmount - currentTotal).toFixed(2));
          else {
            const amount = Number(((parsedAmount * (splitShares[user] ?? 1)) / totalShares).toFixed(2));
            newSplitDetails[user] = amount;
            currentTotal += amount;
          }
        });
        setSplitDetails(newSplitDetails);
      }
    }
  }, [installmentAmount, splitAmong, splitMode, splitShares]);

  if (!isOpen) return null;

  const toggleUser = (user: string) => setSplitAmong(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]);
  const handleSplitRemaining = () => {
    const parsedAmount = parseFloat(installmentAmount) || 0;
    const remaining = parsedAmount - splitAmong.reduce((sum, u) => sum + (parseFloat(splitDetails[u]?.toString() || '0') || 0), 0);
    if (remaining > 0 && splitAmong.length > 0) {
      const targets = splitAmong.filter(u => !parseFloat(splitDetails[u]?.toString() || '0'));
      const activeTargets = targets.length > 0 ? targets : splitAmong;
      const amount = remaining / activeTargets.length;
      setSplitDetails(prev => {
        const next = { ...prev };
        activeTargets.forEach(u => next[u] = Number(((parseFloat(next[u]?.toString() || '0') || 0) + amount).toFixed(2)));
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (splitAmong.length === 0) {
      setErrors(prev => ({ ...prev, splitAmong: true }));
      alert(t('form_error_split_among') || 'Please select at least one person.');
      return;
    }

    let finalSplitDetails: { [userName: string]: number } | undefined = undefined;
    if (splitMode === 'unequal' || splitMode === 'shares') {
      const parsedAmount = parseFloat(installmentAmount) || 0;
      const totalSplit = splitAmong.reduce((sum, user) => sum + (parseFloat(splitDetails[user]?.toString() || '0') || 0), 0);
      if (Math.abs(totalSplit - parsedAmount) > 0.01) {
        alert(`Split amounts (${totalSplit.toFixed(2)}) must equal installment amount (${parsedAmount.toFixed(2)}). Difference: ${(parsedAmount - totalSplit).toFixed(2)}`);
        return;
      }
      finalSplitDetails = {};
      splitAmong.forEach(user => {
        const val = parseFloat(splitDetails[user]?.toString() || '0');
        if (val > 0) finalSplitDetails![user] = val;
      });
    }

    onSave({
      id: initialData?.id || Date.now().toString(),
      name, type,
      totalAmount: parseFloat(totalAmount) || 0,
      remainingAmount: parseFloat(remainingAmount) || 0,
      installmentAmount: parseFloat(installmentAmount) || 0,
      interestRate: parseFloat(interestRate) || 0,
      termMonths: parseInt(termMonths) || 0,
      currency,
      category: CATEGORIES.find(c => c.name === category) || { name: category, subCategories: [] },
      subCategory: subCategory || undefined,
      startDate, dueDate, nextInstallmentDate, paidBy, splitAmong,
      splitDetails: finalSplitDetails,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/20 overflow-hidden">
        <div className="flex justify-between items-center p-6 sm:p-8 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{initialData ? 'Edit Loan' : 'Add New Loan'}</h2>
            <p className="text-xs text-gray-500 font-medium">Track installments and debts</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:text-gray-900 rounded-full text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-4 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Loan Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors" placeholder="e.g. Car Loan" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                <button type="button" onClick={() => setType('loan')} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg", type === 'loan' ? "bg-white text-purple-600 dark:bg-gray-800 shadow-sm" : "text-gray-500")}>Loan</button>
                <button type="button" onClick={() => setType('installment')} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg", type === 'installment' ? "bg-white text-blue-600 dark:bg-gray-800 shadow-sm" : "text-gray-500")}>Installment</button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Currency</label>
              <input type="text" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-mono font-bold" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Amount</label>
              <input type="number" inputMode="decimal" value={totalAmount} onChange={e => {if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setTotalAmount(e.target.value);}} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-mono font-bold" placeholder="0.00" required />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Remaining</label>
              <input type="number" inputMode="decimal" value={remainingAmount} onChange={e => {if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setRemainingAmount(e.target.value);}} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-mono font-bold" placeholder="0.00" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Monthly Installment</label>
              <input type="number" inputMode="decimal" value={installmentAmount} onChange={e => {if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setInstallmentAmount(e.target.value);}} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-mono font-bold" placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Interest Rate (%)</label>
              <input type="number" inputMode="decimal" value={interestRate} onChange={e => {if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setInterestRate(e.target.value);}} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-mono font-bold" placeholder="0.00" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Term (Months)</label>
              <input type="number" inputMode="numeric" value={termMonths} onChange={e => {if (e.target.value === '' || /^\d*$/.test(e.target.value)) setTermMonths(e.target.value);}} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none font-mono font-bold" placeholder="0" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Final Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Next Payment</label>
              <input type="date" value={nextInstallmentDate} onChange={e => setNextInstallmentDate(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" required />
            </div>

            {/* Category Grid from Expense Form */}
            <div className="md:col-span-2 space-y-2 mt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {CATEGORIES.map(c => (
                  <button
                    key={c.name} type="button" onClick={() => { setCategory(c.name); setSubCategory(''); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5 group overflow-hidden",
                      category === c.name ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" : "bg-white dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <span className={cn("text-2xl transition-transform", category === c.name ? "scale-110" : "group-hover:scale-110")}>{c.name.split(' ')[0]}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-center truncate w-full">{c.name.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Paid By</label>
                <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white" required>
                  {users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white font-bold">
                  <option value="active">Active</option>
                  <option value="paid_off">Paid Off</option>
                </select>
              </div>
            </div>

            {/* Split UI from Expense Form */}
            <div className="md:col-span-2 space-y-3 mt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-500">Split Among</label>
                <div className="text-xs space-x-2 text-blue-600 font-medium">
                  <button type="button" onClick={() => setSplitAmong([...users])} className="hover:underline">All</button>
                  <button type="button" onClick={() => setSplitAmong([])} className="hover:underline">None</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                {users.map(user => (
                  <button key={user} type="button" onClick={() => toggleUser(user)} className={cn("px-3 py-1.5 rounded-full text-sm font-bold border transition-colors", splitAmong.includes(user) ? "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600")}>{user}</button>
                ))}
              </div>

              {splitAmong.length > 0 && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-gray-500">Split Method</label>
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                      {['equal', 'shares', 'unequal'].map(mode => (
                        <button key={mode} type="button" onClick={() => setSplitMode(mode as any)} className={cn("px-3 py-1.5 text-xs font-bold rounded-md capitalize", splitMode === mode ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white" : "text-gray-500")}>{mode}</button>
                      ))}
                    </div>
                  </div>

                  {splitMode === 'shares' && (
                    <div className="space-y-2">
                      {splitAmong.map(user => (
                        <div key={user} className="flex items-center gap-2">
                          <span className="text-sm font-bold w-20 truncate dark:text-gray-300">{user}</span>
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
                    <div className="space-y-2">
                      {splitAmong.map(user => (
                        <div key={user} className="flex items-center gap-2">
                          <span className="text-sm font-bold w-20 truncate dark:text-gray-300">{user}</span>
                          <div className="flex-1 flex items-center bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3">
                            <span className="text-gray-400 font-bold text-sm">{currency}</span>
                            <input type="number" inputMode="decimal" value={splitDetails[user] ?? ''} onChange={e => setSplitDetails(p => ({...p, [user]: e.target.value}))} className="flex-1 p-2 bg-transparent outline-none font-mono font-bold text-sm" placeholder="0.00" />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <button type="button" onClick={handleSplitRemaining} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Split Remaining</button>
                        <span className={cn("text-sm font-bold", Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2) === (parseFloat(installmentAmount) || 0).toFixed(2) ? "text-blue-600" : "text-red-500")}>
                          {Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2)} / {installmentAmount || '0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg mt-4">{initialData ? 'Update Loan' : 'Save Loan'}</button>
        </form>
      </div>
    </div>
  );
};
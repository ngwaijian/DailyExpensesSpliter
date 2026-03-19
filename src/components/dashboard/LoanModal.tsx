import React, { useState } from 'react';
import { Loan } from '../../types';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: Loan) => void;
  initialData?: Loan;
  users: string[];
  defaultCurrency: string;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSave, initialData, users, defaultCurrency }) => {
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

  React.useEffect(() => {
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
    }
  }, [initialData, isOpen, users, defaultCurrency]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || Date.now().toString(),
      name,
      type,
      totalAmount: parseFloat(totalAmount) || 0,
      remainingAmount: parseFloat(remainingAmount) || 0,
      installmentAmount: parseFloat(installmentAmount) || 0,
      interestRate: parseFloat(interestRate) || 0,
      termMonths: parseInt(termMonths) || 0,
      currency,
      startDate,
      dueDate,
      nextInstallmentDate,
      paidBy,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2rem] shadow-2xl w-full max-w-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10 pb-4 border-b border-gray-100 dark:border-gray-800">
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
                type="text" 
                inputMode="decimal" 
                value={totalAmount} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^[0-9+\-*/().\s,.]*$/.test(val)) {
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
                type="text" 
                inputMode="decimal" 
                value={remainingAmount} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^[0-9+\-*/().\s,.]*$/.test(val)) {
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
              type="text" 
              inputMode="decimal" 
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
              type="text" 
              inputMode="decimal" 
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
              type="text" 
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
  );
};

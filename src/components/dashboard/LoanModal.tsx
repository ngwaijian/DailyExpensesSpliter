import React, { useState } from 'react';
import { Loan } from '../../types';
import { X } from 'lucide-react';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: Loan) => void;
  initialData?: Loan;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'loan' | 'installment'>(initialData?.type || 'loan');
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount.toString() || '');
  const [remainingAmount, setRemainingAmount] = useState(initialData?.remainingAmount.toString() || '');
  const [installmentAmount, setInstallmentAmount] = useState(initialData?.installmentAmount.toString() || '');
  const [interestRate, setInterestRate] = useState(initialData?.interestRate.toString() || '');
  const [termMonths, setTermMonths] = useState(initialData?.termMonths.toString() || '');
  const [currency, setCurrency] = useState(initialData?.currency || 'MYR');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [nextInstallmentDate, setNextInstallmentDate] = useState(initialData?.nextInstallmentDate || '');
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || '');
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
      setCurrency('MYR');
      setStartDate('');
      setDueDate('');
      setNextInstallmentDate('');
      setPaidBy('');
      setStatus('active');
    }
  }, [initialData]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{initialData ? 'Edit Loan' : 'Add New Loan'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Loan Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Type</label>
            <select value={type} onChange={e => setType(e.target.value as 'loan' | 'installment')} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
              <option value="loan">Loan</option>
              <option value="installment">Installment</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Paid By</label>
            <input type="text" value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Currency</label>
            <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Total Amount</label>
            <input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Remaining Amount</label>
            <input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" value={remainingAmount} onChange={e => setRemainingAmount(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Installment Amount</label>
            <input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Interest Rate (%)</label>
            <input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Term (Months)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={termMonths} onChange={e => setTermMonths(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Next Installment Date</label>
            <input type="date" value={nextInstallmentDate} onChange={e => setNextInstallmentDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'paid_off')} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
              <option value="active">Active</option>
              <option value="paid_off">Paid Off</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors">
          {initialData ? 'Save Changes' : 'Add Loan'}
        </button>
      </form>
    </div>
  );
};

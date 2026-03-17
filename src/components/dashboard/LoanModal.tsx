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
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount || 0);
  const [remainingAmount, setRemainingAmount] = useState(initialData?.remainingAmount || 0);
  const [installmentAmount, setInstallmentAmount] = useState(initialData?.installmentAmount || 0);
  const [interestRate, setInterestRate] = useState(initialData?.interestRate || 0);
  const [termMonths, setTermMonths] = useState(initialData?.termMonths || 0);
  const [currency, setCurrency] = useState(initialData?.currency || 'MYR');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || '');
  const [status, setStatus] = useState(initialData?.status || 'active');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || Date.now().toString(),
      name,
      totalAmount,
      remainingAmount,
      installmentAmount,
      interestRate,
      termMonths,
      currency,
      startDate,
      dueDate,
      paidBy,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg space-y-6 max-h-[90vh] overflow-y-auto">
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
            <label className="text-xs font-medium text-gray-500">Paid By</label>
            <input type="text" value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Total Amount</label>
            <input type="number" value={totalAmount} onChange={e => setTotalAmount(Number(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Remaining Amount</label>
            <input type="number" value={remainingAmount} onChange={e => setRemainingAmount(Number(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Installment Amount</label>
            <input type="number" value={installmentAmount} onChange={e => setInstallmentAmount(Number(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Interest Rate (%)</label>
            <input type="number" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Term (Months)</label>
            <input type="number" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Currency</label>
            <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl" required />
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

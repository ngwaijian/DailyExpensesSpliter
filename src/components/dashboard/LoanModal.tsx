import React, { useState } from 'react';
import { Loan } from '../../types';

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
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold">{initialData ? 'Edit Loan' : 'Add Loan'}</h2>
        <input type="text" placeholder="Loan Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg" required />
        <input type="number" placeholder="Total Amount" value={totalAmount} onChange={e => setTotalAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg" required />
        <input type="number" placeholder="Remaining Amount" value={remainingAmount} onChange={e => setRemainingAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg" required />
        <input type="number" placeholder="Installment Amount" value={installmentAmount} onChange={e => setInstallmentAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg" required />
        <input type="number" placeholder="Interest Rate (%)" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className="w-full p-2 border rounded-lg" required />
        <input type="number" placeholder="Term (Months)" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className="w-full p-2 border rounded-lg" required />
        <input type="text" placeholder="Currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 border rounded-lg" required />
        <label className="text-xs text-gray-500">Start Date</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
        <label className="text-xs text-gray-500">Due Date</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
        <input type="text" placeholder="Paid By" value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full p-2 border rounded-lg" required />
        <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'paid_off')} className="w-full p-2 border rounded-lg">
          <option value="active">Active</option>
          <option value="paid_off">Paid Off</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
        </div>
      </form>
    </div>
  );
};

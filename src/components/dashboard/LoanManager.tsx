import React, { useState } from 'react';
import { Loan } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { LoanModal } from './LoanModal';
import { cn } from '../../lib/utils';

export const LoanManager: React.FC<{ 
  loans: Loan[], 
  onAdd: (loan: Loan) => void,
  onEdit: (loan: Loan) => void,
  onDelete: (id: string) => void
}> = ({ loans, onAdd, onEdit, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | undefined>(undefined);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Loans</h3>
        <button onClick={() => { setEditingLoan(undefined); setIsModalOpen(true); }} className="text-sm text-blue-600 font-medium">+ Add</button>
      </div>
      {loans.length === 0 ? (
        <p className="text-gray-500 text-sm">No loans yet.</p>
      ) : (
        <div className="space-y-4">
          {loans.map(loan => (
            <div key={loan.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
              <div onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }} className="cursor-pointer">
                <p className="font-bold text-sm">{loan.name}</p>
                <p className="text-xs text-gray-500">{formatCurrency(loan.remainingAmount)} / {formatCurrency(loan.totalAmount)} {loan.currency}</p>
                <p className="text-[10px] text-gray-400">{loan.interestRate}% APR • {loan.termMonths} months</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="font-bold text-sm">{formatCurrency(loan.installmentAmount)}/mo</p>
                  <p className="text-[10px] text-gray-400">Due: {loan.dueDate}</p>
                  <p className={cn("text-[10px] font-bold", loan.status === 'active' ? "text-green-500" : "text-gray-500")}>
                    {loan.status === 'active' ? 'Active' : 'Paid Off'}
                  </p>
                </div>
                <button onClick={() => onDelete(loan.id)} className="text-red-500 text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <LoanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={(loan) => { editingLoan ? onEdit(loan) : onAdd(loan); setIsModalOpen(false); }}
        initialData={editingLoan}
      />
    </div>
  );
};

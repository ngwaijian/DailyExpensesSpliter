import React, { useState } from 'react';
import { Loan } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { LoanModal } from './LoanModal';
import { cn } from '../../lib/utils';
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react';

export const LoanManager: React.FC<{ 
  loans: Loan[], 
  onAdd: (loan: Loan) => void,
  onEdit: (loan: Loan) => void,
  onDelete: (id: string) => void
}> = ({ loans, onAdd, onEdit, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | undefined>(undefined);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Loans & Installments
        </h3>
        <button 
          onClick={() => { setEditingLoan(undefined); setIsModalOpen(true); }} 
          className="flex items-center gap-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Loan
        </button>
      </div>
      
      {loans.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No loans recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map(loan => {
            const progress = loan.totalAmount > 0 ? ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100 : 0;
            return (
              <div key={loan.id} className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{loan.name}</p>
                    <p className="text-xs text-gray-500">{loan.paidBy}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(loan.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between items-end gap-2 text-sm pt-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">Remaining</p>
                    <p className="font-semibold truncate">{formatCurrency(loan.remainingAmount)}</p>
                  </div>
                  <div className="text-right min-w-0">
                    <p className="text-xs text-gray-500 truncate">Installment</p>
                    <p className="font-semibold truncate">{formatCurrency(loan.installmentAmount)}<span className="text-xs font-normal text-gray-500">/mo</span></p>
                  </div>
                </div>
              </div>
            );
          })}
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

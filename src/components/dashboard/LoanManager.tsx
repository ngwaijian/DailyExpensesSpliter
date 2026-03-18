import React, { useState } from 'react';
import { Loan, Trip } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { LoanModal } from './LoanModal';
import { cn } from '../../lib/utils';
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react';

export const LoanManager: React.FC<{ 
  trip: Trip, 
  onAdd: (loan: Loan) => void,
  onEdit: (loan: Loan) => void,
  onDelete: (id: string) => void
}> = ({ trip, onAdd, onEdit, onDelete }) => {
  const loans = trip.loans || [];
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
        <div className="space-y-3">
          {loans.map(loan => {
            const progress = loan.totalAmount > 0 ? ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100 : 0;
            return (
              <div key={loan.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-blue-200 dark:hover:border-blue-900/50 group">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        loan.type === 'loan' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}>
                        {loan.type}
                      </span>
                      <p className="font-bold text-gray-900 dark:text-white truncate">{loan.name}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                      <span className="font-medium">{loan.paidBy}</span>
                      <span>•</span>
                      <span>{new Date(loan.startDate).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(loan.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Remaining</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(loan.remainingAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Installment</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(loan.installmentAmount)}<span className="text-[10px] font-normal text-gray-500">/mo</span></p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-gray-400">Payoff Progress</span>
                    <span className="text-blue-600 dark:text-blue-400">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    ></div>
                  </div>
                </div>
                
                {loan.nextInstallmentDate && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Next Payment</span>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      {new Date(loan.nextInstallmentDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )
}
      <LoanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={(loan) => { editingLoan ? onEdit(loan) : onAdd(loan); setIsModalOpen(false); }}
        initialData={editingLoan}
        users={trip.users}
        defaultCurrency={trip.expenses[0]?.currency || 'MYR'}
      />
    </div>
  );
};

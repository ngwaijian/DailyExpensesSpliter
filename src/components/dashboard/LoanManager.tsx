import React, { useState } from 'react';
import { Loan, Ledger } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { LoanModal } from './LoanModal';
import { cn } from '../../lib/utils';
import { Plus, Trash2, Edit2, CreditCard, Calendar, Clock } from 'lucide-react';

export const LoanManager: React.FC<{ 
  ledger: Ledger, 
  onAdd: (loan: Loan) => void,
  onEdit: (loan: Loan) => void,
  onDelete: (id: string) => void,
  onAddExpense: (expense: any) => void
}> = ({ ledger, onAdd, onEdit, onDelete, onAddExpense }) => {
  const loans = ledger.loans || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | undefined>(undefined);

  const handlePay = (loan: Loan) => {
    if (loan.status === 'paid_off') return;

    const expense = {
      desc: `Payment for ${loan.name}`,
      amountOriginal: loan.installmentAmount,
      currency: loan.currency,
      category: loan.category?.name || '🏦 Bank / Finance',
      subCategory: loan.subCategory,
      date: new Date().toISOString(),
      paidBy: loan.paidBy,
      splitAmong: loan.splitAmong || [loan.paidBy],
      splitDetails: loan.splitDetails,
      type: 'expense'
    };
    onAddExpense(expense);
    
    // Also update the loan remaining amount and next installment date
    const newRemaining = Math.max(0, loan.remainingAmount - loan.installmentAmount);
    // Calculate next installment date (add 1 month)
    const nextDate = new Date(loan.nextInstallmentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    
    onEdit({
      ...loan,
      remainingAmount: newRemaining,
      nextInstallmentDate: nextDate.toISOString().split('T')[0],
      status: newRemaining <= 0 ? 'paid_off' : 'active'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Loans & Installments
          </h3>
        </div>
        <button 
          onClick={() => { setEditingLoan(undefined); setIsModalOpen(true); }} 
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all active:scale-95"
          title="Add New"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      {loans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/10 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-400 dark:text-gray-500 text-sm font-medium italic">No active loans or installments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
          {loans.map(loan => {
            const progress = loan.totalAmount > 0 ? ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100 : 0;
            const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date() && loan.status === 'active';
            
            return (
              <div key={loan.id} className={cn(
                "bg-white dark:bg-gray-800/40 p-5 rounded-3xl border transition-all group relative",
                isOverdue ? "border-red-200 dark:border-red-900/50" : "border-gray-100 dark:border-gray-700/50"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{loan.name}</p>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        loan.type === 'loan' ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      )}>
                        {loan.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{loan.paidBy}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{loan.currency}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }} 
                      className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDelete(loan.id)} 
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Remaining</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{formatCurrency(loan.remainingAmount, loan.currency)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Installment</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{formatCurrency(loan.installmentAmount, loan.currency)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          loan.status === 'paid_off' ? "bg-emerald-500" : (loan.type === 'loan' ? "bg-purple-500" : "bg-blue-500")
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Calendar className={cn("w-3 h-3", isOverdue ? "text-red-500" : "text-gray-400")} />
                        <span className={cn("text-[10px] font-bold", isOverdue ? "text-red-500" : "text-gray-500")}>
                          {loan.status === 'paid_off' ? 'Paid Off' : `Due: ${new Date(loan.dueDate).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-900 dark:text-white">{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {loan.status !== 'paid_off' && (
                    <button
                      onClick={() => handlePay(loan)}
                      className="w-full mt-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors active:scale-95"
                    >
                      Log Payment
                    </button>
                  )}
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
        users={ledger.users}
        defaultCurrency={ledger.expenses[0]?.currency || 'MYR'}
      />
    </div>
  );
};

import React from 'react';
import { Loan } from '../../types';
import { formatCurrency } from '../../utils/currency';

export const LoanManager: React.FC<{ loans: Loan[] }> = ({ loans }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
      <h3 className="text-lg font-bold mb-4">Loans</h3>
      {loans.length === 0 ? (
        <p className="text-gray-500 text-sm">No loans yet.</p>
      ) : (
        <div className="space-y-4">
          {loans.map(loan => (
            <div key={loan.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
              <div>
                <p className="font-bold text-sm">{loan.name}</p>
                <p className="text-xs text-gray-500">{formatCurrency(loan.remainingAmount)} / {formatCurrency(loan.totalAmount)} {loan.currency}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{formatCurrency(loan.installmentAmount)}/mo</p>
                <p className="text-[10px] text-gray-400">Due: {loan.dueDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

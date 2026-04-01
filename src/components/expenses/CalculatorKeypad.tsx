import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CalculatorKeypadProps {
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  setShowCalculator: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CalculatorKeypad({ amount, setAmount, setShowCalculator }: CalculatorKeypadProps) {
  const updateAmountWithDigit = (digit: number) => {
    const currentNumeric = parseInt(amount.toString().replace('.', '')) || 0;
    const newNumeric = (currentNumeric * 10 + digit) / 100;
    setAmount(newNumeric.toFixed(2));
  };

  const updateAmountWithDelete = () => {
    const currentNumeric = parseInt(amount.toString().replace('.', '')) || 0;
    const newNumeric = Math.floor(currentNumeric / 10) / 100;
    setAmount(newNumeric.toFixed(2));
  };

  const handleCalcInput = (key: string) => {
    if (key === 'C') {
      setAmount('');
    } else if (key === 'DEL') {
      // If it's a simple number, use the cash register delete
      // Otherwise, just remove the last character
      const hasOperators = /[+\-*/()]/.test(amount.toString());
      if (!hasOperators && amount.toString().length > 0 && !isNaN(parseFloat(amount.toString()))) {
        updateAmountWithDelete();
      } else {
        setAmount(prev => prev.toString().slice(0, -1));
      }
    } else if (key === '=') {
      try {
        const sanitized = amount.toString().replace(/[^0-9+\-*/().\s]/g, '');
        if (!sanitized) return;
        // eslint-disable-next-line no-new-func
        const result = new Function('return ' + sanitized)();
        if (isFinite(result)) {
          setAmount(parseFloat(result).toFixed(2));
          setShowCalculator(false);
        }
      } catch (e) {
        // ignore
      }
    } else if (/[0-9]/.test(key)) {
      // If it's a simple number (or empty), use cash register style
      // If it already has operators, just append
      const hasOperators = /[+\-*/()]/.test(amount.toString());
      if (!hasOperators) {
        updateAmountWithDigit(parseInt(key));
      } else {
        setAmount(prev => prev.toString() + key);
      }
    } else {
      setAmount(prev => prev.toString() + key);
    }
  };

  return (
    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl grid grid-cols-4 gap-2 animate-in slide-in-from-top-2 duration-200">
      {['1','2','3','/','4','5','6','*','7','8','9','-','.','0','DEL','+'].map(key => (
        <button 
          key={key} 
          type="button"
          onClick={() => handleCalcInput(key)}
          className={cn(
            "h-10 rounded-lg font-semibold text-lg transition-colors active:scale-95 flex items-center justify-center",
            key === 'DEL' ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
            ['/','*','-','+'].includes(key) ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
            "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
          )}
        >
          {key === 'DEL' ? <X size={18} /> : key}
        </button>
      ))}
      <div className="col-span-4 grid grid-cols-4 gap-2">
        <button 
          type="button"
          onClick={() => handleCalcInput('C')}
          className="h-10 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg font-bold shadow-sm active:scale-95 transition-all"
        >
          C
        </button>
        <button 
          type="button"
          onClick={() => handleCalcInput('=')}
          className="col-span-3 h-10 bg-blue-600 text-white rounded-lg font-bold shadow-sm active:scale-95 transition-all"
        >
          =
        </button>
      </div>
    </div>
  );
}

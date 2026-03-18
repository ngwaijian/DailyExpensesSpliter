import React, { useState } from 'react';
import { Trip, Goal } from '../../types';
import { Target, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface GoalsProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

interface GoalItemProps {
  goal: Goal;
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}

function GoalItem({ goal, trip, onUpdateTrip, onEdit, onDelete, t }: GoalItemProps) {
  const linkedExpensesTotal = trip.expenses?.filter(e => e.goalId === goal.id).reduce((sum, e) => sum + e.amountOriginal, 0) || 0;
  const totalCurrentAmount = goal.currentAmount + linkedExpensesTotal;
  const [localAmount, setLocalAmount] = useState(goal.currentAmount.toString());
  const progress = Math.min(100, Math.max(0, (totalCurrentAmount / goal.targetAmount) * 100));
  const isCompleted = progress >= 100;

  const handleBlur = () => {
    const val = parseFloat(localAmount) || 0;
    if (val !== goal.currentAmount) {
      const updatedGoals = (trip.goals || []).map(g => g.id === goal.id ? { ...g, currentAmount: val } : g);
      onUpdateTrip({ ...trip, goals: updatedGoals });
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 group">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            {goal.name}
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </h4>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(totalCurrentAmount)}</span>
              <span>of {formatCurrency(goal.targetAmount)}</span>
            </div>
            {linkedExpensesTotal > 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                ({formatCurrency(goal.currentAmount)} manual + {formatCurrency(linkedExpensesTotal)} from expenses)
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 transition-opacity">
          <button onClick={() => onEdit(goal)} className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(goal.id)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="h-3 w-full bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mt-3">
        <div 
          className={cn(
            "h-full transition-all duration-500 rounded-full",
            isCompleted ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Manual Entry:</span>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-16 p-1 bg-transparent border-b border-gray-300 dark:border-gray-600 hover:border-blue-300 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all font-medium text-gray-700 dark:text-gray-300 text-xs"
            placeholder="0.00"
          />
        </div>
        <div className="text-right text-xs text-gray-400 dark:text-gray-500 font-medium">
          {progress.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export function Goals({ trip, onUpdateTrip }: GoalsProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currency, setCurrency] = useState('MYR');

  const goals = trip.goals || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    const newGoal: Goal = {
      id: editingId || Date.now().toString(),
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      currency,
    };

    let newGoals;
    if (editingId) {
      newGoals = goals.map(g => g.id === editingId ? newGoal : g);
    } else {
      newGoals = [...goals, newGoal];
    }

    onUpdateTrip({ ...trip, goals: newGoals });
    resetForm();
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setCurrency(goal.currency);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('app_delete_goal_confirm') || 'Delete this goal?')) {
      onUpdateTrip({ ...trip, goals: goals.filter(g => g.id !== id) });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setCurrency('MYR');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-500" />
          {t('plan_goals') || 'Goals'}
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goal Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={currentAmount}
                  onChange={e => setCurrentAmount(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {goals.map(goal => (
          <GoalItem 
            key={goal.id} 
            goal={goal} 
            trip={trip} 
            onUpdateTrip={onUpdateTrip} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
            t={t}
          />
        ))}
        {goals.length === 0 && !isAdding && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
            No goals set yet. Add one to start tracking!
          </div>
        )}
      </div>
    </div>
  );
}

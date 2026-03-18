import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Expense, CATEGORIES } from '../../types';
import { CATEGORY_COLORS, CATEGORY_STRIP_COLORS } from '../../constants';
import { getAverageRates, formatCurrency } from '../../utils/currency';
import { Edit2, Trash2, Calendar, User, MapPin, Gift, Handshake, Filter, ArrowUpDown, X, Search, Tag, RotateCcw, Settings, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../hooks/useTheme';
import { CategoryManager } from '../settings/CategoryManager';
import { useStore } from '../../hooks/useStore';

interface ExpenseListProps {
  trip: Trip;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  lastUpdatedId?: string | null;
  onUpdateTrip: (trip: Trip) => void;
  undo: () => void;
  canUndo: boolean;
}

export function ExpenseList({ trip, onEdit, onView, onDelete, lastUpdatedId, onUpdateTrip, undo, canUndo }: ExpenseListProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const rates = getAverageRates(trip);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (lastUpdatedId) {
      setHighlightedId(lastUpdatedId);
      setTimeout(() => {
        const element = document.getElementById(`expense-${lastUpdatedId}`);
        if (element) {
          const rect = element.getBoundingClientRect();
          const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!isInViewport) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 100); // Small delay to ensure DOM is updated

      // Remove highlight after 1.2 seconds
      const timer = setTimeout(() => {
        setHighlightedId(null);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [lastUpdatedId]);

  const handleResetFilters = () => {
    setFilterCategory('All');
    setSortOrder('date-desc');
    setStartDate('');
    setEndDate('');
    setSearchKeyword('');
  };

  const activeFilterCount = (filterCategory !== 'All' ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0) + (sortOrder !== 'date-desc' ? 1 : 0) + (searchKeyword ? 1 : 0);

  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...trip.expenses];

    // Filter by search keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter(e => 
        e.desc.toLowerCase().includes(keyword) ||
        (typeof e.category === 'string' ? e.category : e.category?.name || '').toLowerCase().includes(keyword) ||
        e.paidBy.toLowerCase().includes(keyword) ||
        e.splitAmong.some(p => p.toLowerCase().includes(keyword)) ||
        (e.location?.name && e.location.name.toLowerCase().includes(keyword))
      );
    }

    // Filter by category
    if (filterCategory !== 'All') {
      if (filterCategory === 'Sponsorship') {
        result = result.filter(e => e.type === 'sponsorship');
      } else if (filterCategory === 'Settlement') {
        result = result.filter(e => e.type === 'settlement');
      } else {
        result = result.filter(e => (typeof e.category === 'string' ? e.category : e.category?.name) === filterCategory && e.type !== 'sponsorship' && e.type !== 'settlement');
      }
    }

    // Filter by date range
    if (startDate) {
      result = result.filter(e => e.date >= startDate);
    }
    if (endDate) {
      result = result.filter(e => e.date <= endDate);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'date-desc') {
        const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return timeDiff !== 0 ? timeDiff : parseInt(b.id) - parseInt(a.id);
      } else if (sortOrder === 'date-asc') {
        const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return timeDiff !== 0 ? timeDiff : parseInt(a.id) - parseInt(b.id);
      } else {
        const rateA = rates[a.currency] || a.rate || 1;
        const myrA = a.amountOriginal * rateA;
        const rateB = rates[b.currency] || b.rate || 1;
        const myrB = b.amountOriginal * rateB;
        if (sortOrder === 'amount-desc') {
          return myrB - myrA;
        } else {
          return myrA - myrB;
        }
      }
    });

    return result;
  }, [trip.expenses, filterCategory, sortOrder, startDate, endDate, rates]);

  const upcomingRecurring = useMemo(() => {
    if (!trip.recurringTransactions) return [];
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    return trip.recurringTransactions.filter(rt => {
      const nextDate = new Date(rt.nextDate);
      return nextDate >= now && nextDate <= threeDaysFromNow;
    });
  }, [trip.recurringTransactions]);

  if (trip.expenses.length === 0 && upcomingRecurring.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-200 flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-inner">
          <img 
            src={resolvedTheme === 'dark' ? "/icon-dark.svg" : "/icon.svg"} 
            alt="" 
            className="w-12 h-12 object-contain opacity-20 grayscale" 
          />
        </div>
        <p className="text-gray-400 dark:text-gray-500 font-medium">{t('list_no_expenses')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Recurring Reminders */}
      {upcomingRecurring.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-4">
          <h4 className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold mb-3">
            <Clock className="w-5 h-5" />
            Upcoming Recurring Expenses
          </h4>
          <div className="space-y-2">
            {upcomingRecurring.map(rt => (
              <div key={rt.id} className="flex justify-between items-center bg-white/60 dark:bg-gray-800/60 p-3 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{rt.desc}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Due: {new Date(rt.nextDate).toLocaleDateString()} • {rt.frequency}
                  </div>
                </div>
                <div className="font-semibold text-amber-700 dark:text-amber-400">
                  {formatCurrency(rt.amountOriginal, rt.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toggle Button */}
      <div className="flex justify-end gap-2">
        {canUndo && (
          <button
            onClick={undo}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Undo last action"
          >
            <RotateCcw className="w-4 h-4" />
            Undo
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('list_filters')} {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {showCategoryManager && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200 animate-in slide-in-from-top-2">
          <CategoryManager trip={trip} onUpdateTrip={onUpdateTrip} />
        </div>
      )}

      {/* Filter and Sort Controls */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200 animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3" /> {t('list_search')}
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder={t('list_search_placeholder')}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm transition-colors"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                {searchKeyword && (
                  <button 
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> {t('list_category')}
              </label>
              <select 
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm transition-colors"
              >
                <option value="All">{t('list_all_categories')}</option>
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{t(`cat_${c.name}`, c.name)}</option>)}
                <option value="Sponsorship">{t('list_sponsorships')}</option>
                <option value="Settlement">{t('list_settlements')}</option>
              </select>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('list_from')}</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('list_to')}</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm transition-colors"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> {t('list_sort_by')}
              </label>
              <select 
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm transition-colors"
              >
                <option value="date-desc">{t('list_date_desc')}</option>
                <option value="date-asc">{t('list_date_asc')}</option>
                <option value="amount-desc">{t('list_amount_desc')}</option>
                <option value="amount-asc">{t('list_amount_asc')}</option>
              </select>
            </div>
          </div>
          </div>
          
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                {t('list_reset_filters')}
              </button>
            </div>
          )}
        </div>
      )}

      {filteredAndSortedExpenses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-200">
          <p className="text-gray-400 dark:text-gray-500">{t('list_no_match')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {filteredAndSortedExpenses.map((exp, index) => {
            const rate = rates[exp.currency] || exp.rate || 1;
            const myrAmount = exp.amountOriginal * rate;
            
            const getDatePart = (d: string) => d.includes('T') ? d.split('T')[0] : d;
            const showDateHeader = (sortOrder === 'date-desc' || sortOrder === 'date-asc') && 
              (index === 0 || getDatePart(filteredAndSortedExpenses[index - 1].date) !== getDatePart(exp.date));

            let dailyNet = 0;
            if (showDateHeader) {
              const currentDay = getDatePart(exp.date);
              dailyNet = filteredAndSortedExpenses
                .filter(e => getDatePart(e.date) === currentDay && e.type !== 'settlement')
                .reduce((sum, e) => {
                  const r = rates[e.currency] || e.rate || 1;
                  const val = e.amountOriginal * r;
                  return e.type === 'income' ? sum + val : sum - val;
                }, 0);
            }

            return (
              <React.Fragment key={exp.id}>
                {showDateHeader && (
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 px-6 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-700/50">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">
                      {new Date(exp.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full",
                      dailyNet >= 0 
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                        : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                    )}>
                      {formatCurrency(dailyNet)}
                    </span>
                  </div>
                )}
                <div 
                  id={`expense-${exp.id}`}
                  onClick={() => onView(exp.id)}
                  className={cn(
                    "group px-6 py-4 flex items-center gap-4 transition-colors relative cursor-pointer",
                    index !== filteredAndSortedExpenses.length - 1 && !filteredAndSortedExpenses[index + 1]?.date.startsWith(getDatePart(exp.date)) && "border-b border-gray-50 dark:border-gray-700/50",
                    index !== filteredAndSortedExpenses.length - 1 && "border-b border-gray-50 dark:border-gray-700/30",
                    highlightedId === exp.id ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                  )}
                >
                  {/* Minimal Category Icon */}
                  <div className={cn(
                    "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xl transition-colors",
                    exp.type === 'sponsorship' ? "bg-amber-50 dark:bg-amber-900/20" :
                    exp.type === 'settlement' ? "bg-blue-50 dark:bg-blue-900/20" :
                    "bg-gray-50 dark:bg-gray-700/50"
                  )}>
                    {exp.type === 'sponsorship' ? '🎁' : 
                     exp.type === 'settlement' ? '🤝' : 
                     (typeof exp.category === 'string' ? exp.category : exp.category?.name || 'Other').split(' ')[0]}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">{exp.desc}</h4>
                      {exp.isSettled && exp.type !== 'settlement' && (
                        <span className="text-[8px] px-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">FIXED</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                      <span className="text-blue-500 dark:text-blue-400 font-medium">{exp.paidBy}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">
                        {t(`cat_${typeof exp.category === 'string' ? exp.category : exp.category?.name}`, typeof exp.category === 'string' ? exp.category : exp.category?.name || 'Other').replace(/^[^\s]+\s/, '')}
                        {exp.subCategory ? ` / ${exp.subCategory}` : ''}
                      </span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      {exp.isSponsored && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500 flex items-center gap-0.5">
                            <Gift size={10} /> {exp.sponsoredBy || 'Sponsor'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className={cn(
                      "font-bold text-sm",
                      exp.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                    )}>
                      {exp.type === 'income' ? '+' : ''}{formatCurrency(myrAmount)}
                    </div>
                    {exp.currency !== 'MYR' && (
                      <div className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tight">
                        {exp.amountOriginal.toFixed(2)} {exp.currency}
                      </div>
                    )}
                    
                    {/* Subtle Actions */}
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(exp.id); }} 
                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(exp.id); }} 
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

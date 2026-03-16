import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Expense, CATEGORIES } from '../../types';
import { CATEGORY_COLORS, CATEGORY_STRIP_COLORS } from '../../constants';
import { getAverageRates, formatCurrency } from '../../utils/currency';
import { Edit2, Trash2, Calendar, User, MapPin, Gift, Handshake, Filter, ArrowUpDown, X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../hooks/useTheme';

interface ExpenseListProps {
  trip: Trip;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  lastUpdatedId?: string | null;
}

export function ExpenseList({ trip, onEdit, onView, onDelete, lastUpdatedId }: ExpenseListProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const rates = getAverageRates(trip);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
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
        e.category.toLowerCase().includes(keyword) ||
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
        result = result.filter(e => e.category === filterCategory && e.type !== 'sponsorship' && e.type !== 'settlement');
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

  if (trip.expenses.length === 0) {
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
      {/* Filter Toggle Button */}
      <div className="flex justify-end">
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

      {/* Filter and Sort Controls */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200 animate-in slide-in-from-top-2">
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
                {CATEGORIES.map(c => <option key={c} value={c}>{t(`cat_${c}`, c)}</option>)}
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
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-200">
          <p className="text-gray-400 dark:text-gray-500">{t('list_no_match')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedExpenses.map((exp, index) => {
            const rate = rates[exp.currency] || exp.rate || 1;
            const myrAmount = exp.amountOriginal * rate;
            
            const getDatePart = (d: string) => d.includes('T') ? d.split('T')[0] : d;
            const showDateHeader = (sortOrder === 'date-desc' || sortOrder === 'date-asc') && 
              (index === 0 || getDatePart(filteredAndSortedExpenses[index - 1].date) !== getDatePart(exp.date));

            let dailyTotal = 0;
            if (showDateHeader) {
              const currentDay = getDatePart(exp.date);
              dailyTotal = filteredAndSortedExpenses
                .filter(e => getDatePart(e.date) === currentDay && e.type !== 'settlement')
                .reduce((sum, e) => {
                  const r = rates[e.currency] || e.rate || 1;
                  return sum + (e.amountOriginal * r);
                }, 0);
            }

            return (
              <React.Fragment key={exp.id}>
                {showDateHeader && (
                  <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-2 px-1 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span>{new Date(exp.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{t('list_total')} {formatCurrency(dailyTotal)}</span>
                  </div>
                )}
                <div 
                  id={`expense-${exp.id}`}
                  onClick={() => onView(exp.id)}
                  className={cn(
                    "group p-4 rounded-2xl shadow-sm border transition-all relative duration-500 cursor-pointer overflow-hidden",
                    highlightedId === exp.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/50"
                      : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-md"
                  )}
                >
                  {/* Category Color Strip */}
                  {exp.type === 'expense' && (
                    <div 
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-colors opacity-80",
                        CATEGORY_STRIP_COLORS[exp.category] || "bg-gray-200 dark:bg-gray-700"
                      )} 
                    />
                  )}

                  <div className="flex justify-between items-start pl-2">
                    <div className="flex gap-3">
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {exp.type === 'sponsorship' ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Gift className="w-3 h-3" /> {t('form_type_sponsorship')}
                            </span>
                          ) : exp.type === 'settlement' ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                              <Handshake className="w-3 h-3" /> {t('form_type_settlement')}
                            </span>
                          ) : (
                            <span className={cn(
                              "text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full border transition-colors whitespace-nowrap",
                              CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["📝 General / Other"]
                            )}>
                              {t(`cat_${exp.category}`, exp.category)}
                            </span>
                          )}
                          {exp.isSettled && exp.type !== 'settlement' && (
                            <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                              ✅ {t('bal_settled')}
                            </span>
                          )}
                          {exp.isSponsored && exp.type !== 'sponsorship' && (
                            <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                              🎁 {t('list_sponsored')}{exp.sponsoredBy && exp.sponsoredBy !== exp.paidBy ? `${t('list_sponsored_by')}${exp.sponsoredBy}` : ''}
                            </span>
                          )}
                          {exp.location && (
                            <a 
                              href={exp.location.lat ? `https://www.google.com/maps/search/?api=1&query=${exp.location.lat},${exp.location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exp.location.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 text-xs text-blue-500 hover:underline whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{exp.location.name}</span>
                            </a>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white break-words pr-2">{exp.desc}</h4>
                        {exp.memo && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words pr-2 italic">
                            {exp.memo}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                          {exp.date.includes('T') && (
                            <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 mr-1">
                              {new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          <User className="w-3 h-3 shrink-0" />
                          <span className="text-blue-600 dark:text-blue-400 font-medium break-words">{exp.paidBy}</span>
                          <span className="shrink-0">{exp.type === 'sponsorship' ? t('list_sponsored') : exp.type === 'settlement' ? t('list_paid_to') : t('list_paid')}</span>
                          {exp.type === 'settlement' && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium break-words">{exp.splitAmong[0]}</span>
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap ml-1">
                            {exp.currency} {exp.amountOriginal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2 flex flex-col items-end justify-between">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white whitespace-nowrap">~ {formatCurrency(myrAmount)}</div>
                        {exp.type !== 'settlement' && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right max-w-[150px] leading-tight break-words">
                            {exp.splitAmong.length > 0 ? `${exp.splitAmong.join(', ')} (${exp.splitAmong.length})` : t('list_no_one')}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 mt-2 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(exp.id);
                          }} 
                          className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                          <Edit2 className="w-5 h-5 lg:w-4 lg:h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(exp.id);
                          }} 
                          className="p-2 lg:p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        >
                          <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
                        </button>
                      </div>
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

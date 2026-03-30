import React, { useState, useRef, useEffect } from 'react';
import { Ledger } from '../../types';
import { getAverageRates, formatCurrency } from '../../utils/currency';
import { TrendingUp, Download, FileText, Table, Users, PieChart as PieChartIcon, List, Calendar, Target, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toJpeg } from 'html-to-image';

import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../hooks/useTheme';

interface SummaryProps {
  ledger: Ledger;
  onUpdateLedger?: (ledger: Ledger) => void;
}

const CATEGORY_HEX_COLORS: { [key: string]: string } = {
  "🍽️ Meals & Dining": "#f97316",
  "🏨 Accommodation": "#0ea5e9",
  "🚕 Transport & Fuel": "#3b82f6",
  "✈️ Flights": "#3b82f6",
  "🎢 Activities & Tours": "#ef4444",
  "🛍️ Shopping": "#eab308",
  "🍻 Drinks & Nightlife": "#a855f7",
  "📝 General / Other": "#d1d5db",
};

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export function Summary({ ledger, onUpdateLedger }: SummaryProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [view, setView] = useState<'category' | 'person'>('category');
  const [selectedPerson, setSelectedPerson] = useState<string>('All');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(ledger.monthlyBudget?.toString() || '');
  const [exportRange, setExportRange] = useState<'all' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  // --- ADD CASHEW SCOPES ---
  const [timeRange, setTimeRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime'>('thisMonth');
  const [chartType, setChartType] = useState<'expense' | 'income'>('expense');
  // -------------------------
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const rates = getAverageRates(ledger);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  let totalMYR = 0;
  let totalIncomeMYR = 0;
  let thisMonthTotalMYR = 0;
  const categoryTotals: Record<string, number> = {};
  const thisMonthCategoryTotals: Record<string, number> = {};
  const personStats: Record<string, { paid: number; share: number }> = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Initialize stats for current users
  ledger.users.forEach(u => {
    personStats[u] = { paid: 0, share: 0 };
  });

  ledger.expenses.forEach(e => {
    // Filter by selected person if not 'All'
    if (selectedPerson !== 'All' && e.paidBy !== selectedPerson && !e.splitAmong.includes(selectedPerson)) {
      return;
    }

    const rate = rates[e.currency] || e.rate || 1;
    const myr = e.amountOriginal * rate;

    if (e.type === 'settlement') {
      if (personStats[e.paidBy]) {
        personStats[e.paidBy].paid += myr;
      }
      if (e.splitAmong.length > 0 && personStats[e.splitAmong[0]]) {
        personStats[e.splitAmong[0]].paid -= myr;
      }
      return; // Settlements don't affect total spent or individual shares
    } else if (e.type === 'income') {
      totalIncomeMYR += myr;
      
      // Person Paid (for income, 'paidBy' is who received it)
      if (personStats[e.paidBy]) {
        personStats[e.paidBy].paid -= myr; // Receiving income is like "negative paying"
      }

      // Person Share (who benefits from the income)
      if (e.splitAmong.length > 0) {
        const splitAmount = myr / e.splitAmong.length;
        e.splitAmong.forEach(u => {
          if (personStats[u]) {
            personStats[u].share -= splitAmount;
          }
        });
      }
      return;
    } else if (e.type === 'sponsorship') {
      // Sponsorships don't change total spent or categories, 
      // but they transfer the "share" (burden) to the sponsor.
      if (personStats[e.paidBy]) {
        personStats[e.paidBy].share += myr;
        // Do not add to 'paid' because a sponsorship is a transfer of burden, not a new payment
      } else if (!ledger.users.includes(e.paidBy)) {
        personStats[e.paidBy] = { paid: 0, share: myr };
      }

      if (e.splitAmong.length > 0) {
        const splitAmount = myr / e.splitAmong.length;
        e.splitAmong.forEach(u => {
          if (personStats[u]) {
            personStats[u].share -= splitAmount;
          } else if (!ledger.users.includes(u)) {
             personStats[u] = { paid: 0, share: -splitAmount };
          }
        });
      }
    } else {
      totalMYR += myr;
      
      const expDate = new Date(e.date);
      const isThisMonth = expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      if (isThisMonth) {
        thisMonthTotalMYR += myr;
      }
      
      // Category Totals
      const cat = (typeof e.category === 'string' ? e.category : e.category?.name) || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + myr;
      if (isThisMonth) {
        thisMonthCategoryTotals[cat] = (thisMonthCategoryTotals[cat] || 0) + myr;
      }

      if (e.isSettled) {
        // For settled expenses, we assume everyone already paid their own share.
        // This keeps the total paid and total share correct, but results in a 0 balance for this expense.
        const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
        if (sponsor) {
          if (personStats[sponsor]) {
            personStats[sponsor].paid += myr;
            personStats[sponsor].share += myr;
          } else if (!ledger.users.includes(sponsor)) {
            personStats[sponsor] = { paid: myr, share: myr };
          }
        } else if (e.splitDetails) {
          Object.entries(e.splitDetails).forEach(([u, amt]) => {
            const numAmt = Number(amt);
            if (personStats[u]) {
              personStats[u].paid += numAmt * rate;
              personStats[u].share += numAmt * rate;
            } else if (!ledger.users.includes(u)) {
              personStats[u] = { paid: numAmt * rate, share: numAmt * rate };
            }
          });
        } else if (e.splitAmong.length > 0) {
          const splitAmount = myr / e.splitAmong.length;
          e.splitAmong.forEach(u => {
            if (personStats[u]) {
              personStats[u].paid += splitAmount;
              personStats[u].share += splitAmount;
            } else if (!ledger.users.includes(u)) {
               personStats[u] = { paid: splitAmount, share: splitAmount };
            }
          });
        }
        return;
      }

      // Person Paid
      if (personStats[e.paidBy]) {
        personStats[e.paidBy].paid += myr;
      } else if (!ledger.users.includes(e.paidBy)) {
        // Handle users not in the list (e.g. removed)
        personStats[e.paidBy] = { paid: myr, share: 0 };
      }

      // Person Share
      const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
      
      if (sponsor) {
        if (personStats[sponsor]) {
          personStats[sponsor].share += myr;
        } else if (!ledger.users.includes(sponsor)) {
          personStats[sponsor] = { paid: 0, share: myr };
        }
      } else if (e.splitDetails) {
        Object.entries(e.splitDetails).forEach(([u, amt]) => {
          const numAmt = Number(amt);
          if (personStats[u]) {
            personStats[u].share += numAmt * rate;
          } else if (!ledger.users.includes(u)) {
            personStats[u] = { paid: 0, share: numAmt * rate };
          }
        });
      } else if (e.splitAmong.length > 0) {
        const splitAmount = myr / e.splitAmong.length;
        e.splitAmong.forEach(u => {
          if (personStats[u]) {
            personStats[u].share += splitAmount;
          } else if (!ledger.users.includes(u)) {
            personStats[u] = { paid: 0, share: splitAmount };
          }
        });
      }
    }
  });

  // If a specific person is selected, we adjust the totalMYR and categoryTotals to reflect ONLY their involvement
  if (selectedPerson !== 'All') {
    totalMYR = 0;
    totalIncomeMYR = 0;
    thisMonthTotalMYR = 0;
    Object.keys(categoryTotals).forEach(cat => categoryTotals[cat] = 0);
    Object.keys(thisMonthCategoryTotals).forEach(cat => thisMonthCategoryTotals[cat] = 0);

    ledger.expenses.forEach(e => {
      if (e.type === 'settlement') return;
      
      const rate = rates[e.currency] || e.rate || 1;
      const cat = (typeof e.category === 'string' ? e.category : e.category?.name) || 'Other';
      
      // How much did this person contribute to this expense?
      // Their "contribution" is their share.
      let personShare = 0;
      if (e.type === 'sponsorship') {
        if (e.paidBy === selectedPerson) {
          personShare = e.amountOriginal * rate;
        }
        if (e.splitAmong.includes(selectedPerson)) {
          personShare -= (e.amountOriginal * rate) / e.splitAmong.length;
        }
      } else {
        const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
        if (sponsor === selectedPerson) {
          personShare = e.amountOriginal * rate;
        } else if (e.splitDetails && e.splitDetails[selectedPerson]) {
          personShare = Number(e.splitDetails[selectedPerson]) * rate;
        } else if (e.splitAmong.includes(selectedPerson)) {
          personShare = (e.amountOriginal * rate) / e.splitAmong.length;
        }
      }

      if (personShare !== 0) {
        if (e.type === 'income') {
          totalIncomeMYR += Math.abs(personShare);
        } else {
          totalMYR += Math.abs(personShare);
          categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(personShare);
          
          const expDate = new Date(e.date);
          const isThisMonth = expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
          if (isThisMonth) {
            thisMonthTotalMYR += Math.abs(personShare);
            thisMonthCategoryTotals[cat] = (thisMonthCategoryTotals[cat] || 0) + Math.abs(personShare);
          }
        }
      }
    });
  }

  const avgPerPerson = ledger.users.length > 0 ? totalMYR / ledger.users.length : 0;
  const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const sortedThisMonthCats = Object.entries(thisMonthCategoryTotals).sort((a, b) => b[1] - a[1]);
  const sortedPeople = Object.entries(personStats).sort((a, b) => b[1].share - a[1].share);


// --- CASHEW STYLE DYNAMIC BREAKDOWN ---
  const dynamicCategoryTotals: Record<string, number> = {};
  let dynamicTotal = 0;

  ledger.expenses.forEach(e => {
    const typeMatch = chartType === 'expense' ? (e.type !== 'income' && e.type !== 'settlement') : (e.type === 'income');
    if (!typeMatch) return;

    const expDate = new Date(e.date);
    let timeMatch = false;
    if (timeRange === 'thisMonth') {
      timeMatch = expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    } else if (timeRange === 'lastMonth') {
      const lastMonth = new Date(currentYear, currentMonth - 1, 1);
      timeMatch = expDate.getMonth() === lastMonth.getMonth() && expDate.getFullYear() === lastMonth.getFullYear();
    } else if (timeRange === 'thisYear') {
      timeMatch = expDate.getFullYear() === currentYear;
    } else {
      timeMatch = true; // allTime
    }

    if (!timeMatch) return;

    // Apply person filter bounds
    let personShare = 0;
    const rate = rates[e.currency] || e.rate || 1;
    const val = e.amountOriginal * rate;

    if (selectedPerson !== 'All') {
      if (e.type === 'sponsorship') {
        if (e.paidBy === selectedPerson) personShare += val;
        if (e.splitAmong.includes(selectedPerson)) personShare -= val / e.splitAmong.length;
      } else {
        const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
        if (sponsor === selectedPerson) personShare = val;
        else if (e.splitDetails && e.splitDetails[selectedPerson]) personShare = Number(e.splitDetails[selectedPerson]) * rate;
        else if (e.splitAmong.includes(selectedPerson)) personShare = val / e.splitAmong.length;
      }
    } else {
      personShare = val;
    }

    if (Math.abs(personShare) > 0) {
      const cat = (typeof e.category === 'string' ? e.category : e.category?.name) || 'Other';
      dynamicCategoryTotals[cat] = (dynamicCategoryTotals[cat] || 0) + Math.abs(personShare);
      dynamicTotal += Math.abs(personShare);
    }
  });

  const sortedDynamicCats = Object.entries(dynamicCategoryTotals).sort((a, b) => b[1] - a[1]);
  const dynamicChartData = sortedDynamicCats.map(([name, value]) => ({ name, value }));
  // --------------------------------------
  
  // Prepare daily chart data
  const last7Days: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    last7Days[dateStr] = 0;
  }

  ledger.expenses.forEach(e => {
    if (e.type === 'settlement') return;
    
    // Filter by selected person if not 'All'
    if (selectedPerson !== 'All') {
      let personInvolved = false;
      if (e.type === 'sponsorship') {
        if (e.paidBy === selectedPerson || e.splitAmong.includes(selectedPerson)) {
          personInvolved = true;
        }
      } else {
        const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
        if (sponsor === selectedPerson || (e.splitDetails && e.splitDetails[selectedPerson]) || e.splitAmong.includes(selectedPerson)) {
          personInvolved = true;
        }
      }
      if (!personInvolved) return;
    }

    const expenseDateStr = e.date.split('T')[0];
    if (last7Days[expenseDateStr] !== undefined) {
      const rate = rates[e.currency] || e.rate || 1;
      // For the spending chart, we only count expenses
      if (e.type !== 'income') {
        const val = e.amountOriginal * rate;
        
        // If a person is selected, we should only count THEIR share in the daily chart
        if (selectedPerson !== 'All') {
          let personShare = 0;
          if (e.type === 'sponsorship') {
            if (e.paidBy === selectedPerson) personShare += val;
            if (e.splitAmong.includes(selectedPerson)) personShare -= val / e.splitAmong.length;
          } else {
            const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
            if (sponsor === selectedPerson) {
              personShare = val;
            } else if (e.splitDetails && e.splitDetails[selectedPerson]) {
              personShare = Number(e.splitDetails[selectedPerson]) * rate;
            } else if (e.splitAmong.includes(selectedPerson)) {
              personShare = val / e.splitAmong.length;
            }
          }
          last7Days[expenseDateStr] += Math.abs(personShare);
        } else {
          last7Days[expenseDateStr] += val;
        }
      }
    }
  });

  const dailyData = Object.entries(last7Days).map(([date, value]) => ({
    date: date.split('-').slice(1).join('/'),
    value
  }));

  // Prepare chart data
  const chartData = sortedThisMonthCats.map(([name, value]) => ({ name, value }));

  const handleSaveBudget = () => {
    if (!onUpdateLedger) return;
    const budget = parseFloat(tempBudget);
    onUpdateLedger({ ...ledger, monthlyBudget: isNaN(budget) ? undefined : budget });
    setIsEditingBudget(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const filteredExpensesToExport = ledger.expenses.filter(e => {
    if (exportRange === 'all') return true;
    
    const expDate = new Date(e.date);
    if (exportRange === 'this_month') {
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    
    if (exportRange === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      
      const expTime = expDate.getTime();
      let startValid = true;
      let endValid = true;
      
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        startValid = expTime >= start.getTime();
      }
      
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        endValid = expTime <= end.getTime();
      }
      
      return startValid && endValid;
    }
    
    return true;
  });

  const exportTotalMYR = filteredExpensesToExport.reduce((sum, e) => {
    if (e.type === 'income' || e.type === 'settlement') return sum;
    const rate = rates[e.currency] || e.rate || 1;
    return sum + (e.amountOriginal * rate);
  }, 0);

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Paid By', 'Amount (Original)', 'Currency', 'Amount (MYR)', 'Split Among', 'Type'];
    const rows = filteredExpensesToExport.map(e => {
      const rate = rates[e.currency] || e.rate || 1;
      const myr = e.amountOriginal * rate;
      return [
        formatDate(e.date),
        `"${e.desc.replace(/"/g, '""')}"`,
        `"${e.category || ''}"`,
        `"${e.paidBy}"`,
        e.amountOriginal.toFixed(2),
        e.currency,
        myr.toFixed(2),
        `"${e.splitAmong.join(', ')}"`,
        e.type || 'expense'
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${ledger.name.replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportImage = async () => {
    if (isExporting) return;
    
    const element = document.getElementById('pdf-export-container');
    if (!element) return;
    
    setIsExporting(true);
    setShowExportMenu(false);
    
    // Create a full-screen loading overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `
      <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      <div style="margin-top: 20px; font-size: 20px; font-weight: 600; color: #111827; font-family: sans-serif;">${t('dash_generating_pdf')}</div>
      <div style="margin-top: 8px; font-size: 14px; color: #6b7280; font-family: sans-serif;">${t('dash_preparing_receipt')}</div>
    `;
    document.body.appendChild(overlay);
    
    const origParent = element.parentNode;
    const origNextSibling = element.nextSibling;
    
    const rootElement = document.getElementById('root');
    const origRootDisplay = rootElement ? rootElement.style.display : '';
    
    try {
      if (rootElement) {
        rootElement.style.display = 'none';
      }
      
      // Move element to body to avoid parent CSS constraints
      document.body.appendChild(element);
      
      // Make the element perfectly visible in the viewport, but UNDER the overlay
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '800px';
      element.style.zIndex = '999998';
      
      // Wait for the browser to fully paint the element
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const imgData = await toJpeg(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      // We need to get the dimensions of the generated image
      const img = new Image();
      img.src = imgData;
      await new Promise(resolve => {
        img.onload = resolve;
      });
      
      // Download the image directly instead of using jsPDF
      const link = document.createElement('a');
      link.download = `${ledger.name.replace(/\s+/g, '_')}_summary.jpeg`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error("Error generating Image:", error);
      alert(`Failed to generate Image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (rootElement) {
        rootElement.style.display = origRootDisplay;
      }
      
      // Restore element to its original place
      if (element) {
        element.style.display = 'none';
        element.style.position = '';
        element.style.top = '';
        element.style.left = '';
        element.style.width = '';
        element.style.zIndex = '';
        
        if (origParent) {
          if (origNextSibling) {
            origParent.insertBefore(element, origNextSibling);
          } else {
            origParent.appendChild(element);
          }
        }
      }
      
      if (overlay && overlay.parentNode) {
        document.body.removeChild(overlay);
      }
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t('dash_summary')}
        </h3>
        
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-95"
            title={t('dash_export')}
          >
            <Download className="w-5 h-5" />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Date Range</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="exportRange" 
                      value="all" 
                      checked={exportRange === 'all'} 
                      onChange={() => setExportRange('all')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    All Time
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="exportRange" 
                      value="this_month" 
                      checked={exportRange === 'this_month'} 
                      onChange={() => setExportRange('this_month')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    This Month
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="exportRange" 
                      value="custom" 
                      checked={exportRange === 'custom'} 
                      onChange={() => setExportRange('custom')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Custom
                  </label>
                </div>
                
                {exportRange === 'custom' && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={exportImage}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 text-red-500" />
                {isExporting ? t('dash_generating_pdf') : t('dash_export_pdf')}
              </button>
              <button
                onClick={exportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-t border-gray-100 dark:border-gray-700"
              >
                <Table className="w-4 h-4 text-blue-500" />
                {t('dash_export_csv')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              {t('dash_net_balance', 'Net Balance')}
            </div>
          </div>
          <div className={cn(
            "text-2xl font-black tracking-tight",
            (totalIncomeMYR - totalMYR) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          )} title={formatCurrency(totalIncomeMYR - totalMYR)}>
            {formatCurrency(totalIncomeMYR - totalMYR)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              {t('dash_total_income', 'Total Income')}
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400" title={formatCurrency(totalIncomeMYR)}>
            {formatCurrency(totalIncomeMYR)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
              {selectedPerson === 'All' ? t('dash_total_spent') : `${selectedPerson}'s Total`}
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-white" title={formatCurrency(-totalMYR)}>
            {formatCurrency(-totalMYR)}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl w-fit">
          <button
            onClick={() => setSelectedPerson('All')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
              selectedPerson === 'All'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            All People
          </button>
          {ledger.users.map(user => (
            <button
              key={user}
              onClick={() => setSelectedPerson(user)}
              className={cn(
                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                selectedPerson === user
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {user}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Budget Status</span>
          </div>
          {!ledger.budgets?.length && !ledger.monthlyBudget && (
            <button 
              onClick={() => setIsEditingBudget(true)}
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              Set Budget
            </button>
          )}
        </div>
        
        {ledger.budgets && ledger.budgets.length > 0 ? (
          <div className="space-y-4">
            {ledger.budgets.slice(0, 3).map(budget => {
              if (!budget || !budget.categories) return null;
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              
              const spentInMYR = ledger.expenses.reduce((acc, exp) => {
                if (exp.type === 'income' || exp.type === 'settlement') return acc;
                const budgetCats = Array.isArray(budget.categories) ? budget.categories : [];
                if (!budgetCats.includes('All') && !budgetCats.includes(exp.category.name)) return acc;
                if (budget.period === 'monthly') {
                  const expDate = new Date(exp.date);
                  if (expDate.getMonth() !== currentMonth || expDate.getFullYear() !== currentYear) return acc;
                }
                const rate = rates[exp.currency] || exp.rate || 1;
                return acc + (exp.amountOriginal * rate);
              }, 0);

              const budgetRateToMYR = rates[budget.currency] || 1;
              const spent = spentInMYR / budgetRateToMYR;

              const percentage = Math.min(100, (spent / budget.amount) * 100);
              const isOver = spent > budget.amount;

              return (
                <div key={budget.id} className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-gray-600 dark:text-gray-400">
                      {budget.name || (
                        (budget.categories || []).includes('All') 
                          ? 'Total' 
                          : (budget.categories || []).map(c => c.split(' ')[0]).join(', ')
                      )} ({budget.period})
                    </span>
                    <span className={cn("font-bold", isOver ? "text-red-500" : "text-gray-500")}>
                      {formatCurrency(spent, budget.currency)} / {formatCurrency(budget.amount, budget.currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        isOver ? "bg-red-500" : percentage > 85 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {ledger.budgets.length > 3 && (
              <div className="text-[10px] text-center text-gray-400 italic">
                + {ledger.budgets.length - 3} more budgets in Planning tab
              </div>
            )}
          </div>
        ) : ledger.monthlyBudget ? (
          <div className="space-y-3">
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  (thisMonthTotalMYR / ledger.monthlyBudget) > 0.9 ? "bg-red-500" : (thisMonthTotalMYR / ledger.monthlyBudget) > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(100, (thisMonthTotalMYR / ledger.monthlyBudget) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>{((thisMonthTotalMYR / ledger.monthlyBudget) * 100).toFixed(1)}% used</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(Math.max(0, ledger.monthlyBudget - thisMonthTotalMYR))} remaining</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Set budgets in the Planning tab to track spending limits.</p>
        )}
      </div>

     {/* Category Breakdown Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col mb-4 gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Analytics Breakdown</h4>
              <div className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(dynamicTotal)}</div>
            </div>
            
            {/* Cashew Style Togglers */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-1 rounded-xl">
              <div className="flex gap-1">
                {['expense', 'income'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t as any)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      chartType === t ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select 
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-gray-500 outline-none"
              >
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="allTime">All Time</option>
              </select>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dynamicChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {dynamicChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_HEX_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '11px', fontWeight: 600, color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), t(`cat_${name}`, name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Last 7 Days Spending</h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              Stable
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: isDarkMode ? '#374151' : 'rgba(59, 130, 246, 0.05)', radius: 8 }}
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                  formatter={(value: number) => [formatCurrency(value), t('dash_spending')]}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 6, 6]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Last 7 Days Spending</h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              Stable
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: isDarkMode ? '#374151' : 'rgba(59, 130, 246, 0.05)', radius: 8 }}
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                  formatter={(value: number) => [formatCurrency(value), t('dash_spending')]}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 6, 6]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dash_breakdown')}</h4>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button 
              onClick={() => setView('category')}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-all", 
                view === 'category' ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {t('dash_category')}
            </button>
            <button 
              onClick={() => setView('person')}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-all", 
                view === 'person' ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {t('dash_person')}
            </button>
          </div>
        </div>

<div className="space-y-6 w-full">
          {view === 'category' ? (
            <>
              {sortedDynamicCats.slice(0, 8).map(([cat, amt], idx) => (
                <div key={cat} className="group">
                  <div className="flex items-center justify-between gap-4 w-full min-w-0 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-lg shrink-0 transition-transform">
                        {cat.split(' ')[0]}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-gray-900 dark:text-white truncate text-sm">
                          {t(`cat_${cat}`, cat).split(' ').slice(1).join(' ') || t(`cat_${cat}`, cat)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                            {(dynamicTotal > 0 ? (amt / dynamicTotal) * 100 : 0).toFixed(1)}%
                          </span>
                          <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                            {ledger.expenses.filter(e => (typeof e.category === 'string' ? e.category : e.category?.name) === cat).length} Transactions
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-gray-900 dark:text-white text-sm block">{formatCurrency(amt)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${dynamicTotal > 0 ? (amt / dynamicTotal) * 100 : 0}%`, opacity: 1 - (idx * 0.08) }}
                    />
                  </div>
                </div>
              ))}
              {sortedDynamicCats.length === 0 && (
                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <PieChartIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium italic">{t('dash_no_data')}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {sortedPeople.map(([name, stats]) => {
                const balance = stats.paid - stats.share;
                const isOwed = balance > 0.01;
                const owes = balance < -0.01;

                return (
                  <div key={name} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border border-gray-100 dark:border-gray-700/50 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-black shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-gray-900 dark:text-white truncate font-bold text-sm">{name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          Paid {formatCurrency(stats.paid)} • Share {formatCurrency(stats.share)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-0.5", 
                        isOwed ? "text-emerald-500" : 
                        owes ? "text-red-500" : 
                        "text-gray-400"
                      )}>
                        {isOwed ? t('bal_gets_back', 'Gets Back') : 
                         owes ? t('bal_owes', 'Owes') : 
                         t('bal_settled', 'Settled')}
                      </div>
                      <div className={cn("font-black text-base",
                        isOwed ? "text-emerald-600 dark:text-emerald-400" : 
                        owes ? "text-red-600 dark:text-red-400" : 
                        "text-gray-500 dark:text-gray-400"
                      )}>
                        {formatCurrency(Math.abs(balance))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {sortedPeople.length === 0 && (
                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium italic">{t('dash_no_people')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden Image Export Template */}
      <div id="pdf-export-container" style={{ display: 'none', backgroundColor: '#ffffff', color: '#000000' }} className="w-[1000px] p-8 font-sans relative">
        <style dangerouslySetInnerHTML={{ __html: `
          #pdf-export-container, #pdf-export-container * {
            border-color: #e5e7eb !important;
            outline-color: transparent !important;
            text-decoration-color: transparent !important;
            box-shadow: none !important;
            caret-color: transparent !important;
            column-rule-color: transparent !important;
            -webkit-tap-highlight-color: transparent !important;
          }
        `}} />
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: '#111827' }}>
              <span style={{ color: '#2563eb' }}>📈</span>
              {ledger.name} - {t('dash_summary')}
            </h1>
            <p className="mt-2 flex items-center gap-1" style={{ color: '#6b7280' }}>
              <span>📅</span> 
              {t('dash_exported')}: {formatDate(new Date().toISOString())}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: '#6b7280' }}>{t('dash_total_spent')}</div>
            <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{formatCurrency(exportTotalMYR)}</div>
          </div>
        </div>

        {/* Ledger Overview */}
        <div className="mb-8 grid grid-cols-4 gap-4 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_people')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>{ledger.users.length}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_expenses_count')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>{filteredExpensesToExport.length}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_start_date')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>
              {filteredExpensesToExport.length > 0 
                ? formatDate(new Date(Math.min(...filteredExpensesToExport.map(e => new Date(e.date).getTime()))).toISOString())
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_end_date')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>
              {filteredExpensesToExport.length > 0 
                ? formatDate(new Date(Math.max(...filteredExpensesToExport.map(e => new Date(e.date).getTime()))).toISOString())
                : '-'}
            </div>
          </div>
        </div>

        {/* Person Breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1f2937' }}>
            <span style={{ color: '#3b82f6' }}>👥</span>
            {t('dash_person_breakdown')}
          </h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_person')}</th>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_paid')}</th>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_share')}</th>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_balance')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPeople.map(([name, stats]) => {
                const balance = stats.paid - stats.share;
                return (
                  <tr key={name} style={{ color: '#1f2937' }}>
                    <td className="p-3 font-medium" style={{ border: '1px solid #e5e7eb' }}>{name}</td>
                    <td className="p-3" style={{ border: '1px solid #e5e7eb' }}>{formatCurrency(stats.paid)}</td>
                    <td className="p-3" style={{ border: '1px solid #e5e7eb' }}>{formatCurrency(stats.share)}</td>
                    <td className="p-3 font-bold" style={{ border: '1px solid #e5e7eb', color: balance > 0.01 ? '#2563eb' : balance < -0.01 ? '#dc2626' : '#6b7280' }}>
                      {balance > 0.01 ? `+${formatCurrency(balance)} (${t('bal_gets_back')})` : balance < -0.01 ? `${formatCurrency(balance)} (${t('bal_owes')})` : t('bal_settled')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Category Breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1f2937' }}>
            <span style={{ color: '#a855f7' }}>📊</span>
            {t('dash_category_breakdown')}
          </h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_category')}</th>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_amount')}</th>
                <th className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t('dash_percentage')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCats.map(([cat, amt]) => {
                const percentage = totalMYR > 0 ? ((amt / totalMYR) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={cat} style={{ color: '#1f2937' }}>
                    <td className="p-3" style={{ border: '1px solid #e5e7eb' }}>{t(`cat_${cat}`, cat)}</td>
                    <td className="p-3" style={{ border: '1px solid #e5e7eb' }}>{formatCurrency(amt)}</td>
                    <td className="p-3" style={{ border: '1px solid #e5e7eb' }}>{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expenses List */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1f2937' }}>
            <span style={{ color: '#f97316' }}>🧾</span>
            {t('dash_detailed_expenses')}
          </h2>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('detail_date')}</th>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('detail_category')}</th>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('form_desc')}</th>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('detail_paid_by')}</th>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('form_split_among')}</th>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('dash_original')}</th>
                <th className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t('dash_myr')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpensesToExport.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => {
                const rate = rates[e.currency] || e.rate || 1;
                const myr = e.amountOriginal * rate;
                return (
                  <tr key={e.id} style={{ color: '#1f2937' }}>
                    <td className="p-2 whitespace-nowrap" style={{ border: '1px solid #e5e7eb' }}>{formatDate(e.date)}</td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>
                      {t(`cat_${typeof e.category === 'string' ? e.category : e.category?.name}`, typeof e.category === 'string' ? e.category : e.category?.name)}
                      {e.subCategory && <span style={{ color: '#6b7280', fontSize: '0.875em' }}> / {e.subCategory}</span>}
                    </td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span>{e.desc}</span>
                        {e.type === 'sponsorship' && <span style={{ fontSize: '10px', color: '#d97706', backgroundColor: '#fef3c7', padding: '1px 4px', borderRadius: '4px', border: '1px solid #fde68a' }}>{t('form_type_sponsorship')}</span>}
                        {e.type === 'settlement' && <span style={{ fontSize: '10px', color: '#2563eb', backgroundColor: '#dbeafe', padding: '1px 4px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>{t('form_type_settlement')}</span>}
                        {e.isSettled && e.type !== 'settlement' && <span style={{ fontSize: '10px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>{t('bal_settled')}</span>}
                        {e.isSponsored && e.type !== 'sponsorship' && <span style={{ fontSize: '10px', color: '#d97706', backgroundColor: '#fef3c7', padding: '1px 4px', borderRadius: '4px', border: '1px solid #fde68a' }}>{t('list_sponsored')}{e.sponsoredBy && e.sponsoredBy !== e.paidBy ? `${t('list_sponsored_by')}${e.sponsoredBy}` : ''}</span>}
                      </div>
                      {e.memo && <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', fontStyle: 'italic' }}>{e.memo}</div>}
                    </td>
                    <td className="p-2 font-medium" style={{ border: '1px solid #e5e7eb' }}>{e.paidBy}</td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>
                      <div>{e.splitAmong.length === ledger.users.length ? t('list_all_categories').replace('All Categories', 'All').replace('所有分类', '所有人') : e.splitAmong.join(', ')}</div>
                      {e.splitDetails && Object.keys(e.splitDetails).length > 0 && (
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 500 }}>[{t('detail_unequal')}]</span>{' '}
                          {Object.entries(e.splitDetails)
                            .filter(([_, amt]) => amt > 0)
                            .map(([user, amt]) => `${user}: ${amt.toFixed(2)}`)
                            .join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap" style={{ border: '1px solid #e5e7eb' }}>{e.currency} {e.amountOriginal.toFixed(2)}</td>
                    <td className="p-2 whitespace-nowrap font-medium" style={{ border: '1px solid #e5e7eb' }}>{formatCurrency(myr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

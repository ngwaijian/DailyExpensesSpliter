import React, { useState, useRef, useEffect } from 'react';
import { Trip } from '../../types';
import { getAverageRates, formatCurrency } from '../../utils/currency';
import { TrendingUp, Download, FileText, Table, Users, PieChart as PieChartIcon, List, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { useLanguage } from '../../contexts/LanguageContext';

interface SummaryProps {
  trip: Trip;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export function Summary({ trip }: SummaryProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<'category' | 'person'>('category');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const rates = getAverageRates(trip);

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
  const categoryTotals: Record<string, number> = {};
  const personStats: Record<string, { paid: number; share: number }> = {};

  // Initialize stats for current users
  trip.users.forEach(u => {
    personStats[u] = { paid: 0, share: 0 };
  });

  trip.expenses.forEach(e => {
    const rate = rates[e.currency] || e.rate || 1;
    const myr = e.amountOriginal * rate;

    if (e.type === 'settlement') {
      return; // Settlements don't affect total spent or individual shares
    } else if (e.type === 'sponsorship') {
      // Sponsorships don't change total spent or categories, 
      // but they transfer the "share" (burden) to the sponsor.
      if (personStats[e.paidBy]) {
        personStats[e.paidBy].share += myr;
        // Do not add to 'paid' because a sponsorship is a transfer of burden, not a new payment
      } else if (!trip.users.includes(e.paidBy)) {
        personStats[e.paidBy] = { paid: 0, share: myr };
      }

      if (e.splitAmong.length > 0) {
        const splitAmount = myr / e.splitAmong.length;
        e.splitAmong.forEach(u => {
          if (personStats[u]) {
            personStats[u].share -= splitAmount;
          } else if (!trip.users.includes(u)) {
             personStats[u] = { paid: 0, share: -splitAmount };
          }
        });
      }
    } else {
      totalMYR += myr;
      
      // Category Totals
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + myr;

      if (e.isSettled) {
        // For settled expenses, we assume everyone already paid their own share.
        // This keeps the total paid and total share correct, but results in a 0 balance for this expense.
        const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
        if (sponsor) {
          if (personStats[sponsor]) {
            personStats[sponsor].paid += myr;
            personStats[sponsor].share += myr;
          } else if (!trip.users.includes(sponsor)) {
            personStats[sponsor] = { paid: myr, share: myr };
          }
        } else if (e.splitDetails) {
          Object.entries(e.splitDetails).forEach(([u, amt]) => {
            if (personStats[u]) {
              personStats[u].paid += amt * rate;
              personStats[u].share += amt * rate;
            } else if (!trip.users.includes(u)) {
              personStats[u] = { paid: amt * rate, share: amt * rate };
            }
          });
        } else if (e.splitAmong.length > 0) {
          const splitAmount = myr / e.splitAmong.length;
          e.splitAmong.forEach(u => {
            if (personStats[u]) {
              personStats[u].paid += splitAmount;
              personStats[u].share += splitAmount;
            } else if (!trip.users.includes(u)) {
               personStats[u] = { paid: splitAmount, share: splitAmount };
            }
          });
        }
        return;
      }

      // Person Paid
      if (personStats[e.paidBy]) {
        personStats[e.paidBy].paid += myr;
      } else if (!trip.users.includes(e.paidBy)) {
        // Handle users not in the list (e.g. removed)
        personStats[e.paidBy] = { paid: myr, share: 0 };
      }

      // Person Share
      const sponsor = e.sponsoredBy || (e.isSponsored ? e.paidBy : null);
      
      if (sponsor) {
        if (personStats[sponsor]) {
          personStats[sponsor].share += myr;
        } else if (!trip.users.includes(sponsor)) {
          personStats[sponsor] = { paid: 0, share: myr };
        }
      } else if (e.splitDetails) {
        Object.entries(e.splitDetails).forEach(([u, amt]) => {
          if (personStats[u]) {
            personStats[u].share += amt * rate;
          } else if (!trip.users.includes(u)) {
            personStats[u] = { paid: 0, share: amt * rate };
          }
        });
      } else if (e.splitAmong.length > 0) {
        const splitAmount = myr / e.splitAmong.length;
        e.splitAmong.forEach(u => {
          if (personStats[u]) {
            personStats[u].share += splitAmount;
          } else if (!trip.users.includes(u)) {
             personStats[u] = { paid: 0, share: splitAmount };
          }
        });
      }
    }
  });

  const avgPerPerson = trip.users.length > 0 ? totalMYR / trip.users.length : 0;
  const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const sortedPeople = Object.entries(personStats).sort((a, b) => b[1].share - a[1].share);

  // Prepare chart data
  const chartData = sortedCats.map(([name, value]) => ({ name, value }));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Paid By', 'Amount (Original)', 'Currency', 'Amount (MYR)', 'Split Among', 'Type'];
    const rows = trip.expenses.map(e => {
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
    link.setAttribute('download', `${trip.name.replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportPDF = async () => {
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
      <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #059669; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdfWidth = Math.max(1, Math.round(canvas.width / 2));
      const pdfHeight = Math.max(1, Math.round(canvas.height / 2));
      
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'l' : 'p',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${trip.name.replace(/\s+/g, '_')}_summary.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {t('dash_summary')}
        </h3>
        
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('dash_export')}
          >
            <Download className="w-5 h-5" />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={exportPDF}
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
                <Table className="w-4 h-4 text-emerald-500" />
                {t('dash_export_csv')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center">
          <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium uppercase tracking-wide mb-1">{t('dash_total_spent')}</div>
          <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 break-words" title={formatCurrency(totalMYR)}>{formatCurrency(totalMYR)}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
          <div className="text-xs text-blue-800 dark:text-blue-300 font-medium uppercase tracking-wide mb-1">{t('dash_per_person')}</div>
          <div className="text-xl font-bold text-blue-900 dark:text-blue-100 break-words" title={formatCurrency(avgPerPerson)}>{formatCurrency(avgPerPerson)}</div>
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

        <div className="space-y-3">
          {view === 'category' ? (
            <>
              {chartData.length > 0 && (
                <div className="h-48 w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#1f2937', fontSize: '12px', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {sortedCats.map(([cat, amt], idx) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{t(`cat_${cat}`, cat)}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white shrink-0">{formatCurrency(amt)}</span>
                </div>
              ))}
              {sortedCats.length === 0 && <div className="text-gray-400 dark:text-gray-500 text-sm italic">{t('dash_no_data')}</div>}
            </>
          ) : (
            <>
              {sortedPeople.map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 truncate font-medium">{name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.share)}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">{t('dash_paid')} {formatCurrency(stats.paid)}</div>
                  </div>
                </div>
              ))}
              {sortedPeople.length === 0 && <div className="text-gray-400 dark:text-gray-500 text-sm italic">{t('dash_no_people')}</div>}
            </>
          )}
        </div>
      </div>

      {/* Hidden PDF Export Template */}
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
              <span style={{ color: '#059669' }}>📈</span>
              {trip.name} - {t('dash_summary')}
            </h1>
            <p className="mt-2 flex items-center gap-1" style={{ color: '#6b7280' }}>
              <span>📅</span> 
              {t('dash_exported')}: {formatDate(new Date().toISOString())}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: '#6b7280' }}>{t('dash_total_spent')}</div>
            <div className="text-3xl font-bold" style={{ color: '#059669' }}>{formatCurrency(totalMYR)}</div>
          </div>
        </div>

        {/* Trip Overview */}
        <div className="mb-8 grid grid-cols-4 gap-4 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_people')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>{trip.users.length}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_expenses_count')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>{trip.expenses.length}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_start_date')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>
              {trip.expenses.length > 0 
                ? formatDate(new Date(Math.min(...trip.expenses.map(e => new Date(e.date).getTime()))).toISOString())
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{t('dash_end_date')}</div>
            <div className="font-semibold" style={{ color: '#1f2937' }}>
              {trip.expenses.length > 0 
                ? formatDate(new Date(Math.max(...trip.expenses.map(e => new Date(e.date).getTime()))).toISOString())
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
                    <td className="p-3 font-bold" style={{ border: '1px solid #e5e7eb', color: balance > 0.01 ? '#059669' : balance < -0.01 ? '#dc2626' : '#6b7280' }}>
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
              {trip.expenses.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => {
                const rate = rates[e.currency] || e.rate || 1;
                const myr = e.amountOriginal * rate;
                return (
                  <tr key={e.id} style={{ color: '#1f2937' }}>
                    <td className="p-2 whitespace-nowrap" style={{ border: '1px solid #e5e7eb' }}>{formatDate(e.date)}</td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>{t(`cat_${e.category}`, e.category)}</td>
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
                      <div>{e.splitAmong.length === trip.users.length ? t('list_all_categories').replace('All Categories', 'All').replace('所有分类', '所有人') : e.splitAmong.join(', ')}</div>
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

import React, { useState, useRef } from 'react';
import { useStore } from './hooks/useStore';
import { CATEGORIES, Loan, Category } from './types';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './contexts/LanguageContext';
import { LedgerSelector, PeopleWallet } from './components/ledger-management';
import { SettingsModal } from './components/settings/SettingsModal';
import { ExpenseForm } from './components/expenses/ExpenseForm';
import { ExpenseList } from './components/expenses/ExpenseList';
import { Summary } from './components/dashboard/Summary';
import { Balances } from './components/dashboard/Balances';
import { Goals } from './components/dashboard/Goals';
import { RecurringTransactions } from './components/expenses/RecurringTransactions';
import { BudgetManager } from './components/planning/BudgetManager';
import { LoanManager } from './components/dashboard/LoanManager';
import { ExpenseDetailsModal } from './components/expenses/ExpenseDetailsModal';
import { ShieldCheck, LayoutGrid, List, Users, RefreshCw, Plus, Globe, Target, RotateCcw, Settings, Sun, Moon, Monitor, Wallet, Check } from 'lucide-react';
import { cn } from './lib/utils';
import { motion } from 'framer-motion';

import { useUrlShortcuts } from './hooks/useUrlShortcuts';

function App() {
  const { 
    appData, currentLedger: currentLedger, currentLedgerId: currentLedgerId, setCurrentLedgerId: setCurrentLedgerId, 
    addLedger: addLedger, deleteLedger: deleteLedger, renameLedger: renameLedger, updateLedger: updateLedger,
    isSyncing, needsSync, syncError, isOnline,
    githubToken, setGithubToken, 
    fetchFromCloud, pushToCloud, createGistForLedger: createGistForLedger, fetchAllLedgersFromCloud: fetchAllLedgersFromCloud,
    undo, canUndo, isLoading // <-- ADD THIS HERE
  } = useStore();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null);
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);
  const [isSettlingUp, setIsSettlingUp] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'expenses' | 'dashboard' | 'people' | 'planning'>('expenses');
  const [showFab, setShowFab] = useState(false);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  const {
    shortcutAmount,
    shortcutCategory,
    shortcutDesc,
    shortcutCurrency,
    shortcutGoalId,
    shortcutSplitAmong,
    shortcutPaidBy,
    shortcutSubCategory,
    shortcutLocName,
    shortcutLat,
    shortcutLng,
    isAutoSaved,
    clearShortcuts
  } = useUrlShortcuts({ currentLedger: isLoading ? null : currentLedger,updateLedger, t, pushToCloud });

  React.useEffect(() => {
    if (shortcutAmount !== null || shortcutCategory || shortcutDesc || shortcutLocName) {
      setIsMobileFormOpen(true);
      setActiveTab('expenses');
    }
  }, [shortcutAmount, shortcutCategory, shortcutDesc, shortcutLocName]);

if (isLoading || !currentLedger) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAutoSaved) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Expense Saved!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You can safely close this tab or return to the app.</p>
          <button onClick={() => window.location.href = '/'} className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium transition-colors">
            View Expenses
          </button>
        </div>
      </div>
    );
  }

  const scrollToForm = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab('expenses');
    setIsMobileFormOpen(true);
    setTimeout(() => {
      document.getElementById('desc-input')?.focus();
    }, 300);
  };

  // Handlers
  const handleEditExpenseId = (id: string) => {
    setEditingExpenseId(id);
    setIsMobileFormOpen(true);
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleAddExpense = (data: any) => {
    const newExpenses = [...currentLedger.expenses];
    const ledgerCategories = (currentLedger.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);
    const categoryObj = ledgerCategories.find(c => c.name === data.category) || { name: data.category, subCategories: [] };
    
    // Ensure subCategory is explicitly handled to allow clearing it
    const expenseData = { 
      ...data, 
      category: categoryObj,
      subCategory: data.subCategory || undefined 
    };
    
    let updatedId = '';
    if (editingExpenseId) {
      const idx = newExpenses.findIndex(e => e.id === editingExpenseId);
      if (idx !== -1) {
        // Explicitly clear subCategory if it's not in expenseData
        const { subCategory, ...rest } = newExpenses[idx];
        newExpenses[idx] = { ...rest, ...expenseData };
        updatedId = editingExpenseId;
      }
    } else {
      updatedId = Date.now().toString();
      newExpenses.push({ id: updatedId, ...expenseData });
    }
    updateLedger({ ...currentLedger, expenses: newExpenses });
    setEditingExpenseId(null);
    setIsMobileFormOpen(false);
    clearShortcuts();
    setLastUpdatedId(updatedId);
    
    // Clear the lastUpdatedId after a short delay so it doesn't keep jumping back
    // if the user modifies other expenses later.
    setTimeout(() => {
      setLastUpdatedId(null);
    }, 2000);
  };

  const handleLogPayment = (data: any) => {
    const newExpenses = [...currentLedger.expenses];
    const ledgerCategories = (currentLedger.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);
    const categoryObj = ledgerCategories.find(c => c.name === data.category) || { name: data.category, subCategories: [] };
    
    const expenseData = { 
      ...data, 
      category: categoryObj,
      subCategory: data.subCategory || undefined 
    };
    
    const updatedId = Date.now().toString();
    newExpenses.push({ id: updatedId, ...expenseData });
    
    updateLedger({ ...currentLedger, expenses: newExpenses });
    setLastUpdatedId(updatedId);
    
    setTimeout(() => {
      setLastUpdatedId(null);
    }, 2000);
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm(t('app_delete_expense_confirm'))) return;
    updateLedger({ 
      ...currentLedger, 
      expenses: currentLedger.expenses.filter(e => e.id !== id) 
    });
  };

  const handleAddPerson = (name: string) => {
    if (currentLedger.users.includes(name)) return;
    updateLedger({ ...currentLedger, users: [...currentLedger.users, name] });
  };

  const handleEditPerson = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (currentLedger.users.includes(trimmed)) {
      alert(t('app_person_exists'));
      return;
    }

    updateLedger({
      ...currentLedger,
      users: currentLedger.users.map(u => u === oldName ? trimmed : u),
      expenses: currentLedger.expenses.map(e => ({
        ...e,
        paidBy: e.paidBy === oldName ? trimmed : e.paidBy,
        splitAmong: e.splitAmong.map(u => u === oldName ? trimmed : u),
        sponsoredBy: e.sponsoredBy === oldName ? trimmed : e.sponsoredBy
      }))
    });
  };

  const handleRemovePerson = (name: string) => {
    if (!confirm(`${t('app_remove_person_confirm')}${name}?`)) return;
    updateLedger({ 
      ...currentLedger, 
      users: currentLedger.users.filter(u => u !== name),
      expenses: currentLedger.expenses.map(e => ({
        ...e,
        splitAmong: e.splitAmong.filter(u => u !== name)
      }))
    });
  };

  const handleAddExchange = (currency: string, foreignAmount: number, myrSpent: number) => {
    updateLedger({
      ...currentLedger,
      exchanges: [...currentLedger.exchanges, {
        id: Date.now().toString(),
        currency, foreignAmount, myrSpent, date: new Date().toISOString()
      }]
    });
  };

  const handleRemoveExchange = (id: string) => {
    updateLedger({
      ...currentLedger,
      exchanges: currentLedger.exchanges.filter(e => e.id !== id)
    });
  };

  const handleAddLoan = (loan: Loan) => {
    updateLedger({
      ...currentLedger,
      loans: [...(currentLedger.loans || []), loan]
    });
  };

  const handleEditLoan = (loan: Loan) => {
    updateLedger({
      ...currentLedger,
      loans: (currentLedger.loans || []).map(l => l.id === loan.id ? loan : l)
    });
  };

  const handleDeleteLoan = (id: string) => {
    updateLedger({
      ...currentLedger,
      loans: (currentLedger.loans || []).filter(l => l.id !== id)
    });
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-5 h-5 sm:w-6 h-6" />;
    if (theme === 'dark') return <Moon className="w-5 h-5 sm:w-6 h-6" />;
    return <Monitor className="w-5 h-5 sm:w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-32 md:pb-0 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors duration-200">
        <div className="w-full max-w-[98%] mx-auto px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-0.5 rounded-lg sm:rounded-xl overflow-hidden shadow-sm transition-transform hover:scale-105">
              <img 
                src={resolvedTheme === 'dark' ? "/icon-dark.svg" : "/icon.svg"} 
                alt="Logo" 
                className="w-6 h-6 sm:w-8 sm:h-8 object-contain" 
              />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white hidden md:block">DailyBudgetTracker</h1>
          </div>

          <LedgerSelector 
            ledgers={appData.ledgers}
            currentLedgerId={currentLedgerId}
            onSelect={setCurrentLedgerId}
            onAdd={() => {
              const name = prompt(t('app_new_ledger_prompt'));
              if (name) addLedger(name);
            }}
            onDelete={() => {
              if (confirm(t('app_delete_ledger_confirm'))) deleteLedger(currentLedgerId);
            }}
            onRename={() => {
              const name = prompt(t('app_rename_ledger_prompt'), currentLedger.name);
              if (name) renameLedger(currentLedgerId, name);
            }}
          />

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-95"
              title={`Theme: ${theme}`}
            >
              {getThemeIcon()}
            </button>

            {canUndo && (
              <button
                onClick={undo}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-95"
                title="Undo last action"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 h-6" />
              </button>
            )}

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl relative transition-all active:scale-95"
              title="Admin Settings"
            >
              <ShieldCheck className="w-5 h-5 sm:w-6 h-6" />
              {needsSync && isOnline && currentLedger.gistId && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full shadow-sm animate-pulse" />
              )}
              {!isOnline && <span className="absolute top-2 right-2 w-2 h-2 bg-gray-400 rounded-full border border-white dark:border-gray-800" />}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Desktop: Left Sidebar (Planning & People) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <BudgetManager ledger={currentLedger} onUpdateLedger={updateLedger} />
            <Goals ledger={currentLedger} onUpdateLedger={updateLedger} />
            <RecurringTransactions ledger={currentLedger} onUpdateLedger={updateLedger} />
            <PeopleWallet 
              ledger={currentLedger} 
              onAddPerson={handleAddPerson}
              onEditPerson={handleEditPerson}
              onRemovePerson={handleRemovePerson}
              onAddExchange={handleAddExchange}
              onRemoveExchange={handleRemoveExchange}
            />
          </div>

          {/* Center: Expenses (Always visible on Desktop, Tab on Mobile) */}
          <div className={cn(
            "lg:col-span-6",
            activeTab === 'expenses' ? 'block' : 'hidden lg:block'
          )}>
            <div key={editingExpenseId || (isSettlingUp ? 'settling' : '') || `${shortcutAmount}-${shortcutCategory}-${shortcutDesc}-${shortcutCurrency}-${shortcutGoalId}-${shortcutSplitAmong?.join(',')}-${shortcutPaidBy}-${shortcutSubCategory}-${shortcutLocName}-${shortcutLat}-${shortcutLng}`} ref={formRef}>
              <ExpenseForm 
                ledger={currentLedger} 
                onSubmit={(data) => {
                  handleAddExpense(data);
                  setIsSettlingUp(false);
                }}
                onUpdateLedger={updateLedger}
                onCancel={() => {
                  setEditingExpenseId(null);
                  setIsSettlingUp(false);
                  clearShortcuts();
                  setIsMobileFormOpen(false);
                }}
                initialData={editingExpenseId 
                  ? currentLedger.expenses.find(e => e.id === editingExpenseId) 
                  : (shortcutAmount !== null || shortcutCategory || shortcutGoalId || shortcutDesc || shortcutCurrency || shortcutSplitAmong || shortcutPaidBy || shortcutSubCategory || shortcutLocName || shortcutLat !== null || shortcutLng !== null ? { 
                      amountOriginal: shortcutAmount ?? undefined,
                      category: shortcutCategory ?? undefined,
                      desc: shortcutDesc ?? undefined,
                      currency: shortcutCurrency ?? undefined,
                      goalId: shortcutGoalId ?? undefined,
                      splitAmong: shortcutSplitAmong ?? undefined,
                      paidBy: shortcutPaidBy ?? undefined,
                      subCategory: shortcutSubCategory ?? undefined,
                      location: (shortcutLocName || shortcutLat !== null || shortcutLng !== null) ? {
                        name: shortcutLocName || '',
                        lat: shortcutLat ?? undefined,
                        lng: shortcutLng ?? undefined
                      } : undefined
                    } : undefined)}
                defaultType={isSettlingUp ? 'settlement' : undefined}
                isMobileModal={isMobileFormOpen}
                onCloseMobile={() => setIsMobileFormOpen(false)}
              />
            </div>
            <ExpenseList 
              ledger={currentLedger}
              onEdit={handleEditExpenseId}
              onView={setViewingExpenseId}
              onDelete={handleDeleteExpense}
              lastUpdatedId={lastUpdatedId}
              onUpdateLedger={updateLedger}
              undo={undo}
              canUndo={canUndo}
            />
          </div>

          {/* Desktop: Right Sidebar (Stats & Balances) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <Summary ledger={currentLedger} onUpdateLedger={updateLedger} />
            <Balances 
              ledger={currentLedger} 
              onSettleUp={() => {
                setIsSettlingUp(true);
                setActiveTab('expenses');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
            />
            <LoanManager ledger={currentLedger} onAdd={handleAddLoan} onEdit={handleEditLoan} onDelete={handleDeleteLoan} onAddExpense={handleLogPayment} />
          </div>

          {/* Mobile Only Views */}
          <div className={cn("lg:hidden", activeTab === 'dashboard' ? 'block' : 'hidden')}>
            <div className="space-y-6">
              <Summary ledger={currentLedger} onUpdateLedger={updateLedger} />
              <Balances 
                ledger={currentLedger} 
                onSettleUp={() => {
                  setIsSettlingUp(true);
                  setActiveTab('expenses');
                  setIsMobileFormOpen(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
              />
              <LoanManager ledger={currentLedger} onAdd={handleAddLoan} onEdit={handleEditLoan} onDelete={handleDeleteLoan} onAddExpense={handleLogPayment} />
            </div>
          </div>

          <div className={cn("lg:hidden", activeTab === 'planning' ? 'block' : 'hidden')}>
            <div className="space-y-6">
              <BudgetManager ledger={currentLedger} onUpdateLedger={updateLedger} />
              <Goals ledger={currentLedger} onUpdateLedger={updateLedger} />
              <RecurringTransactions ledger={currentLedger} onUpdateLedger={updateLedger} />
            </div>
          </div>

          <div className={cn("lg:hidden", activeTab === 'people' ? 'block' : 'hidden')}>
            <PeopleWallet 
              ledger={currentLedger} 
              onAddPerson={handleAddPerson}
              onEditPerson={handleEditPerson}
              onRemovePerson={handleRemovePerson}
              onAddExchange={handleAddExchange}
              onRemoveExchange={handleRemoveExchange}
            />
          </div>

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 lg:hidden z-40 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-2 transition-colors duration-200">
        <div className="flex justify-around items-center px-2 relative">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: t('nav_dashboard') },
            { id: 'expenses', icon: List, label: t('nav_expenses') },
            { id: 'spacer', icon: null, label: '' },
            { id: 'planning', icon: Target, label: t('nav_planning') || 'Planning' },
            { id: 'people', icon: Wallet, label: t('ledger_wallet') }
          ].map((tab) => {
            if (tab.id === 'spacer') {
              return <div key="spacer" className="w-16 h-14" />;
            }
            const Icon = tab.icon!;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "p-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors w-16 relative", 
                  isActive 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-6 h-6" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        githubToken={githubToken} setGithubToken={setGithubToken}
        currentLedger={currentLedger}
        onUpdateLedger={updateLedger}
        createGistForLedger={createGistForLedger}
        onSync={fetchFromCloud}
        onPush={pushToCloud}
        fetchAllLedgersFromCloud={fetchAllLedgersFromCloud}
        isSyncing={isSyncing}
        needsSync={needsSync}
        syncError={syncError}
        isOnline={isOnline}
      />

      <ExpenseDetailsModal
        expense={viewingExpenseId ? currentLedger.expenses.find(e => e.id === viewingExpenseId) || null : null}
        isOpen={!!viewingExpenseId}
        onClose={() => setViewingExpenseId(null)}
        onEdit={handleEditExpenseId}
        onDelete={handleDeleteExpense}
      />

      {/* Floating Action Button to quickly add new expense */}
      <button
        onClick={scrollToForm}
        className={cn(
          "fixed z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center border-4 border-white dark:border-gray-800",
          "bottom-[calc(max(env(safe-area-inset-bottom),1.5rem)+1.5rem)] left-1/2 -translate-x-1/2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0 lg:border-none",
          "translate-y-0 opacity-100"
        )}
        title={t('app_add_new_entry')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

export default App;

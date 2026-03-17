import React, { useState, useRef } from 'react';
import { useStore } from './hooks/useStore';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './contexts/LanguageContext';
import { TripSelector } from './components/trips/TripSelector';
import { SettingsModal } from './components/settings/SettingsModal';
import { ExpenseForm } from './components/expenses/ExpenseForm';
import { ExpenseList } from './components/expenses/ExpenseList';
import { Summary } from './components/dashboard/Summary';
import { Balances } from './components/dashboard/Balances';
import { Goals } from './components/dashboard/Goals';
import { RecurringTransactions } from './components/expenses/RecurringTransactions';
import { BudgetManager } from './components/planning/BudgetManager';
import { PeopleWallet } from './components/trips/PeopleWallet';
import { ExpenseDetailsModal } from './components/expenses/ExpenseDetailsModal';
import { Settings, LayoutGrid, List, Users, Sun, Moon, Monitor, RefreshCw, Plus, Globe, Target } from 'lucide-react';
import { cn } from './lib/utils';

function App() {
  const { 
    appData, currentTrip, currentTripId, setCurrentTripId, 
    addTrip, deleteTrip, renameTrip, updateTrip,
    isSyncing, needsSync, syncError, isOnline,
    githubToken, setGithubToken, 
    fetchFromCloud, pushToCloud, createGistForTrip, fetchAllTripsFromCloud
  } = useStore();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null);
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'expenses' | 'dashboard' | 'people' | 'planning'>('expenses');
  const [showFab, setShowFab] = useState(false);
  const [shortcutAmount, setShortcutAmount] = useState<number | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amount = params.get('amount');
    if (amount) {
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        setShortcutAmount(parsed);
        // Clear the param from URL to avoid re-population on refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const scrollToForm = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab('expenses');
    setTimeout(() => {
      document.getElementById('desc-input')?.focus();
    }, 300);
  };

  // Handlers
  const handleEditExpenseId = (id: string) => {
    setEditingExpenseId(id);
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleAddExpense = (data: any) => {
    const newExpenses = [...currentTrip.expenses];
    let updatedId = '';
    if (editingExpenseId) {
      const idx = newExpenses.findIndex(e => e.id === editingExpenseId);
      if (idx !== -1) {
        newExpenses[idx] = { ...newExpenses[idx], ...data };
        updatedId = editingExpenseId;
      }
    } else {
      updatedId = Date.now().toString();
      newExpenses.push({ id: updatedId, ...data });
    }
    updateTrip({ ...currentTrip, expenses: newExpenses });
    setEditingExpenseId(null);
    setShortcutAmount(null); // Clear shortcut amount after use
    setLastUpdatedId(updatedId);
    
    // Clear the lastUpdatedId after a short delay so it doesn't keep jumping back
    // if the user modifies other expenses later.
    setTimeout(() => {
      setLastUpdatedId(null);
    }, 2000);
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm(t('app_delete_expense_confirm'))) return;
    updateTrip({ 
      ...currentTrip, 
      expenses: currentTrip.expenses.filter(e => e.id !== id) 
    });
  };

  const handleAddPerson = (name: string) => {
    if (currentTrip.users.includes(name)) return;
    updateTrip({ ...currentTrip, users: [...currentTrip.users, name] });
  };

  const handleEditPerson = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (currentTrip.users.includes(trimmed)) {
      alert(t('app_person_exists'));
      return;
    }

    updateTrip({
      ...currentTrip,
      users: currentTrip.users.map(u => u === oldName ? trimmed : u),
      expenses: currentTrip.expenses.map(e => ({
        ...e,
        paidBy: e.paidBy === oldName ? trimmed : e.paidBy,
        splitAmong: e.splitAmong.map(u => u === oldName ? trimmed : u),
        sponsoredBy: e.sponsoredBy === oldName ? trimmed : e.sponsoredBy
      }))
    });
  };

  const handleRemovePerson = (name: string) => {
    if (!confirm(`${t('app_remove_person_confirm')}${name}?`)) return;
    updateTrip({ 
      ...currentTrip, 
      users: currentTrip.users.filter(u => u !== name),
      expenses: currentTrip.expenses.map(e => ({
        ...e,
        splitAmong: e.splitAmong.filter(u => u !== name)
      }))
    });
  };

  const handleAddExchange = (currency: string, foreignAmount: number, myrSpent: number) => {
    updateTrip({
      ...currentTrip,
      exchanges: [...currentTrip.exchanges, {
        id: Date.now().toString(),
        currency, foreignAmount, myrSpent, date: new Date().toISOString()
      }]
    });
  };

  const handleRemoveExchange = (id: string) => {
    updateTrip({
      ...currentTrip,
      exchanges: currentTrip.exchanges.filter(e => e.id !== id)
    });
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20 md:pb-0 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors duration-200">
        <div className="w-full max-w-[98%] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-0.5 rounded-xl overflow-hidden shadow-sm transition-transform hover:scale-105">
              <img 
                src={resolvedTheme === 'dark' ? "/icon-dark.svg" : "/icon.svg"} 
                alt="Logo" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">DailyExpensesSpliter</h1>
          </div>

          <TripSelector 
            trips={appData.trips}
            currentTripId={currentTripId}
            onSelect={setCurrentTripId}
            onAdd={() => {
              const name = prompt(t('app_new_trip_prompt'));
              if (name) addTrip(name);
            }}
            onDelete={() => {
              if (confirm(t('app_delete_trip_confirm'))) deleteTrip(currentTripId);
            }}
            onRename={() => {
              const name = prompt(t('app_rename_trip_prompt'), currentTrip.name);
              if (name) renameTrip(currentTripId, name);
            }}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFromCloud}
              disabled={isSyncing || !isOnline || !currentTrip.gistId}
              className={cn(
                "p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors",
                isSyncing && "animate-spin text-blue-500",
                !currentTrip.gistId && "opacity-50 cursor-not-allowed"
              )}
              title={t('app_sync_data')}
            >
              <RefreshCw className="w-6 h-6" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={`${t('app_theme')} ${theme}`}
            >
              <ThemeIcon className="w-6 h-6" />
            </button>

            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                  language === 'en' 
                    ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                  language === 'zh' 
                    ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                中
              </button>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors"
            >
              <Settings className="w-6 h-6" />
              {needsSync && isOnline && currentTrip.gistId && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] px-1 rounded-full font-bold shadow-sm animate-pulse">
                  SYNC
                </span>
              )}
              {!isOnline && <span className="absolute top-2 right-2 w-2 h-2 bg-gray-400 rounded-full border border-white dark:border-gray-800" />}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Desktop: Left Sidebar (People & Wallet) */}
          <div className="hidden lg:block lg:col-span-3">
            <PeopleWallet 
              trip={currentTrip} 
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
            <div key={editingExpenseId || (shortcutAmount ? 'shortcut' : 'new')} ref={formRef}>
              <ExpenseForm 
                trip={currentTrip} 
                onSubmit={handleAddExpense}
                onCancel={() => {
                  setEditingExpenseId(null);
                  setShortcutAmount(null);
                }}
                initialData={editingExpenseId 
                  ? currentTrip.expenses.find(e => e.id === editingExpenseId) 
                  : (shortcutAmount ? { amountOriginal: shortcutAmount } : undefined)}
              />
            </div>
            <ExpenseList 
              trip={currentTrip}
              onEdit={handleEditExpenseId}
              onView={setViewingExpenseId}
              onDelete={handleDeleteExpense}
              lastUpdatedId={lastUpdatedId}
            />
          </div>

          {/* Desktop: Right Sidebar (Stats & Planning) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <Summary trip={currentTrip} onUpdateTrip={updateTrip} />
            <Balances trip={currentTrip} />
            <BudgetManager trip={currentTrip} onUpdateTrip={updateTrip} />
            <Goals trip={currentTrip} onUpdateTrip={updateTrip} />
            <RecurringTransactions trip={currentTrip} onUpdateTrip={updateTrip} />
          </div>

          {/* Mobile Only Views */}
          <div className={cn("lg:hidden", activeTab === 'dashboard' ? 'block' : 'hidden')}>
            <div className="space-y-6">
              <Summary trip={currentTrip} onUpdateTrip={updateTrip} />
              <Balances trip={currentTrip} />
            </div>
          </div>

          <div className={cn("lg:hidden", activeTab === 'planning' ? 'block' : 'hidden')}>
            <div className="space-y-6">
              <BudgetManager trip={currentTrip} onUpdateTrip={updateTrip} />
              <Goals trip={currentTrip} onUpdateTrip={updateTrip} />
              <RecurringTransactions trip={currentTrip} onUpdateTrip={updateTrip} />
            </div>
          </div>

          <div className={cn("lg:hidden", activeTab === 'people' ? 'block' : 'hidden')}>
            <PeopleWallet 
              trip={currentTrip} 
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
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 lg:hidden z-40 pb-[env(safe-area-inset-bottom)] transition-colors duration-200">
        <div className="flex justify-around items-center px-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "p-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors w-16", 
              activeTab === 'dashboard' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            <LayoutGrid className="w-6 h-6" />
            {t('nav_dashboard')}
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={cn(
              "p-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors w-16", 
              activeTab === 'expenses' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            <List className="w-6 h-6" />
            {t('nav_expenses')}
          </button>
          
          {/* Spacer for FAB */}
          <div className="w-16 h-14" />

          <button 
            onClick={() => setActiveTab('planning')}
            className={cn(
              "p-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors w-16", 
              activeTab === 'planning' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            <Target className="w-6 h-6" />
            {t('nav_planning') || 'Planning'}
          </button>
          <button 
            onClick={() => setActiveTab('people')}
            className={cn(
              "p-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors w-16", 
              activeTab === 'people' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            <Users className="w-6 h-6" />
            {t('nav_people')}
          </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        githubToken={githubToken} setGithubToken={setGithubToken}
        currentTrip={currentTrip}
        onUpdateTrip={updateTrip}
        createGistForTrip={createGistForTrip}
        onSync={fetchFromCloud}
        onPush={pushToCloud}
        fetchAllTripsFromCloud={fetchAllTripsFromCloud}
        isSyncing={isSyncing}
        needsSync={needsSync}
        syncError={syncError}
        isOnline={isOnline}
      />

      <ExpenseDetailsModal
        expense={viewingExpenseId ? currentTrip.expenses.find(e => e.id === viewingExpenseId) || null : null}
        isOpen={!!viewingExpenseId}
        onClose={() => setViewingExpenseId(null)}
        onEdit={handleEditExpenseId}
        onDelete={handleDeleteExpense}
      />

      {/* Floating Action Button to quickly add new expense */}
      <button
        onClick={scrollToForm}
        className={cn(
          "fixed z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center border-4 border-white dark:border-gray-800",
          "bottom-8 left-1/2 -translate-x-1/2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0 lg:border-none",
          showFab || activeTab !== 'expenses' ? "translate-y-0 opacity-100" : "lg:translate-y-16 lg:opacity-0"
        )}
        title={t('app_add_new_entry')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

export default App;

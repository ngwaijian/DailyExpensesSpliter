import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppData, Ledger, CATEGORIES } from '../types';
import { GITHUB_TOKEN } from '../config';
import { useCloudSync } from './useCloudSync';
import { db } from '../lib/db';

const STORAGE_KEY = 'sw_app_data';
const CURRENT_LEDGER_KEY = 'sw_current_ledger';
const SYNC_KEY = 'sw_unsynced_ledgers';
const GITHUB_TOKEN_KEY = 'sw_github_token';

const DEFAULT_DATA: AppData = {
  ledgers: [{ 
    id: 'ledger_' + Date.now(), 
    name: 'My Default Ledger', 
    lastUpdated: new Date().toISOString(),
    users: [], 
    expenses: [], 
    exchanges: [] 
  }]
};

export function useStore() {
  const ledgers = useLiveQuery(() => db.ledgers.toArray());
  const settings = useLiveQuery(() => db.settings.get('settings'));

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        const count = await db.ledgers.count();
        if (count === 0) {
          // Migration from localStorage
          const storedData = localStorage.getItem(STORAGE_KEY);
          if (storedData) {
            try {
              const parsed = JSON.parse(storedData);
              const oldTrips = parsed.trips || parsed.ledgers;
              if (oldTrips && Array.isArray(oldTrips) && oldTrips.length > 0) {
                const ledgersToSave = oldTrips.map((t: any) => ({
                  ...t,
                  id: t.id.replace('trip_', 'ledger_'),
                  lastUpdated: t.lastUpdated || new Date().toISOString()
                }));
                await db.ledgers.bulkAdd(ledgersToSave);
                
                const storedLedgerId = (localStorage.getItem('sw_current_trip') || localStorage.getItem('sw_current_ledger') || ledgersToSave[0].id).replace('trip_', 'ledger_');
                const storedSync = localStorage.getItem('sw_unsynced_trips') || localStorage.getItem('sw_unsynced_ledgers');
                const unsynced = storedSync ? JSON.parse(storedSync).map((id: string) => id.replace('trip_', 'ledger_')) : [];
                const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY) || GITHUB_TOKEN || '';
                
                await db.settings.put({
                  id: 'settings',
                  currentLedgerId: storedLedgerId,
                  unsyncedLedgerIds: unsynced,
                  githubToken: storedToken
                });
                setIsInitialized(true);
                return;
              }
            } catch (e) {
              console.error("Migration failed", e);
            }
          }
          
          // Default initialization
          await db.ledgers.add(DEFAULT_DATA.ledgers[0]);
          await db.settings.put({
            id: 'settings',
            currentLedgerId: DEFAULT_DATA.ledgers[0].id,
            unsyncedLedgerIds: [],
            githubToken: (GITHUB_TOKEN || '').trim()
          });
        }
      } catch (e) {
        console.error("Failed to initialize DB", e);
      } finally {
        setIsInitialized(true);
      }
    };
    initDb();
  }, []);

  const [history, setHistory] = useState<AppData[]>([]);

  // Derived state
  const appData: AppData = useMemo(() => ({ ledgers: ledgers || DEFAULT_DATA.ledgers }), [ledgers]);
  const currentLedgerId = settings?.currentLedgerId || DEFAULT_DATA.ledgers[0].id;
  const unsyncedLedgerIds = settings?.unsyncedLedgerIds || [];
  const githubToken = settings?.githubToken || (GITHUB_TOKEN || '').trim();
  
  // Add this line right here:
  const isLoading = ledgers === undefined || settings === undefined || !isInitialized;
  // ... existing code

  // For useCloudSync compatibility, we still write SYNC_KEY to localStorage
  // because useCloudSync reads it directly in setInterval to avoid stale closures.
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(SYNC_KEY, JSON.stringify(unsyncedLedgerIds));
    }
  }, [unsyncedLedgerIds, isInitialized]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // We don't need to handle STORAGE_KEY or CURRENT_LEDGER_KEY anymore as Dexie + useLiveQuery handles cross-tab reactivity for IndexedDB.
      // However, we still sync SYNC_KEY because useCloudSync relies on it.
      if (e.key === SYNC_KEY && e.newValue) {
        try {
          const newUnsynced = JSON.parse(e.newValue);
          db.settings.update('settings', { unsyncedLedgerIds: newUnsynced });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setAppData = useCallback((value: React.SetStateAction<AppData>) => {
    db.transaction('rw', db.ledgers, async () => {
      const currentLedgers = await db.ledgers.toArray();
      const currentAppData = { ledgers: currentLedgers };
      const newAppData = typeof value === 'function' ? value(currentAppData) : value;
      
      const newLedgerIds = new Set(newAppData.ledgers.map(t => t.id));
      const ledgersToDelete = currentLedgers.filter(t => !newLedgerIds.has(t.id)).map(t => t.id);
      
      if (ledgersToDelete.length > 0) {
        await db.ledgers.bulkDelete(ledgersToDelete);
      }
      await db.ledgers.bulkPut(newAppData.ledgers);
    });
  }, []);

  const setCurrentLedgerId = useCallback((value: React.SetStateAction<string>) => {
    db.transaction('rw', db.settings, async () => {
      const currentSettings = await db.settings.get('settings');
      const currentId = currentSettings?.currentLedgerId || DEFAULT_DATA.ledgers[0].id;
      const newId = typeof value === 'function' ? value(currentId) : value;
      
      if (currentSettings) {
        await db.settings.update('settings', { currentLedgerId: newId });
      } else {
        await db.settings.put({
          id: 'settings',
          currentLedgerId: newId,
          unsyncedLedgerIds: [],
          githubToken: (GITHUB_TOKEN || '').trim()
        });
      }
    });
  }, []);

  const setUnsyncedLedgerIds = useCallback((value: React.SetStateAction<string[]>) => {
    db.transaction('rw', db.settings, async () => {
      const currentSettings = await db.settings.get('settings');
      const currentIds = currentSettings?.unsyncedLedgerIds || [];
      const newIds = typeof value === 'function' ? value(currentIds) : value;
      
      if (currentSettings) {
        await db.settings.update('settings', { unsyncedLedgerIds: newIds });
      } else {
        await db.settings.put({
          id: 'settings',
          currentLedgerId: DEFAULT_DATA.ledgers[0].id,
          unsyncedLedgerIds: newIds,
          githubToken: (GITHUB_TOKEN || '').trim()
        });
      }
    });
  }, []);

  const setGithubToken = useCallback((value: React.SetStateAction<string>) => {
    db.transaction('rw', db.settings, async () => {
      const currentSettings = await db.settings.get('settings');
      const currentToken = currentSettings?.githubToken || '';
      const newToken = typeof value === 'function' ? value(currentToken) : value;
      
      if (currentSettings) {
        await db.settings.update('settings', { githubToken: newToken });
      } else {
        await db.settings.put({
          id: 'settings',
          currentLedgerId: DEFAULT_DATA.ledgers[0].id,
          unsyncedLedgerIds: [],
          githubToken: newToken
        });
      }
    });
  }, []);

  const currentLedger = useMemo(() => appData.ledgers.find(t => t.id === currentLedgerId) || appData.ledgers[0], [appData.ledgers, currentLedgerId]);

  const saveToHistory = useCallback((data: AppData) => {
    setHistory(prev => {
      const newHistory = [data, ...prev].slice(0, 50);
      return newHistory;
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const [lastState, ...remainingHistory] = history;
    setAppData(lastState);
    setHistory(remainingHistory);
    setUnsyncedLedgerIds(prev => prev.includes(currentLedgerId) ? prev : [...prev, currentLedgerId]);
  }, [history, currentLedgerId, setAppData, setUnsyncedLedgerIds]);

  const updateLedger = useCallback((updatedLedger: Ledger) => {
    const now = new Date().toISOString();
    const ledgerWithTimestamp = { ...updatedLedger, lastUpdated: now };
    saveToHistory(appData);
    setAppData(prev => ({
      ...prev,
      ledgers: prev.ledgers.map(t => t.id === updatedLedger.id ? ledgerWithTimestamp : t)
    }));
    setUnsyncedLedgerIds(prev => prev.includes(updatedLedger.id) ? prev : [...prev, updatedLedger.id]);
  }, [appData, saveToHistory, setAppData, setUnsyncedLedgerIds]);

  const addLedger = useCallback((name: string) => {
    saveToHistory(appData);
    const now = new Date().toISOString();
    const newLedger: Ledger = {
      id: 'ledger_' + Date.now(),
      name,
      lastUpdated: now,
      users: ['Me'],
      expenses: [],
      exchanges: [],
      categories: CATEGORIES,
      budgets: []
    };
    setAppData(prev => ({ ...prev, ledgers: [...prev.ledgers, newLedger] }));
    setCurrentLedgerId(newLedger.id);
    setUnsyncedLedgerIds(prev => [...prev, newLedger.id]);
  }, [appData, saveToHistory, setAppData, setCurrentLedgerId, setUnsyncedLedgerIds]);

  const deleteLedger = useCallback((id: string) => {
    if (appData.ledgers.length <= 1) return;
    saveToHistory(appData);
    const newLedgers = appData.ledgers.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, ledgers: newLedgers }));
    setCurrentLedgerId(newLedgers[0].id);
    setUnsyncedLedgerIds(prev => prev.filter(tid => tid !== id));
  }, [appData, saveToHistory, setAppData, setCurrentLedgerId, setUnsyncedLedgerIds]);

  const renameLedger = useCallback((id: string, name: string) => {
    saveToHistory(appData);
    const now = new Date().toISOString();
    setAppData(prev => ({
      ...prev,
      ledgers: prev.ledgers.map(t => t.id === id ? { ...t, name, lastUpdated: now } : t)
    }));
    setUnsyncedLedgerIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, [appData, saveToHistory, setAppData, setUnsyncedLedgerIds]);

  const {
    isSyncing,
    needsSync,
    syncError,
    isOnline,
    fetchFromCloud,
    pushToCloud,
    fetchAllLedgersFromCloud,
    createGistForLedger
  } = useCloudSync({
    appData,
    setAppData,
    currentLedgerId,
    setCurrentLedgerId,
    githubToken,
    unsyncedLedgerIds,
    setUnsyncedLedgerIds,
    updateLedger
  });

  const getLedgerCategories = useCallback((ledger: Ledger) => {
    return ledger.categories || CATEGORIES;
  }, []);

  const archiveYear = useCallback(async (ledgerId: string, year: number) => {
    if (!githubToken) throw new Error("GitHub token required for archiving.");
    
    const ledger = appData.ledgers.find(l => l.id === ledgerId);
    if (!ledger) throw new Error("Ledger not found.");

    const yearStr = year.toString();
    
    const archivedExpenses = ledger.expenses.filter(e => e.date.startsWith(yearStr));
    const archivedExchanges = ledger.exchanges.filter(e => e.date.startsWith(yearStr));
    
    if (archivedExpenses.length === 0 && archivedExchanges.length === 0) {
      throw new Error("No records found for the specified year.");
    }

    const archiveData = {
      ...ledger,
      expenses: archivedExpenses,
      exchanges: archivedExchanges,
      name: `Archive ${year} - ${ledger.name}`,
      archivedYears: undefined
    };

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        description: `Archive ${year} - ${ledger.name}`,
        public: false,
        files: {
          'split_wallet_archive.json': {
            content: JSON.stringify(archiveData, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create archive gist: ${response.statusText}`);
    }

    const gistData = await response.json();
    const archiveGistId = gistData.id;

    const remainingExpenses = ledger.expenses.filter(e => !e.date.startsWith(yearStr));
    const remainingExchanges = ledger.exchanges.filter(e => !e.date.startsWith(yearStr));

    const updatedLedger = {
      ...ledger,
      expenses: remainingExpenses,
      exchanges: remainingExchanges,
      archivedYears: [...(ledger.archivedYears || []), { year: yearStr, gistId: archiveGistId }],
      lastUpdated: new Date().toISOString()
    };

    updateLedger(updatedLedger);
  }, [appData.ledgers, githubToken, updateLedger]);

  const fetchArchive = useCallback(async (gistId: string): Promise<Ledger> => {
    if (!githubToken) throw new Error("GitHub token required to fetch archive.");
    
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch archive gist: ${response.statusText}`);
    }

    const gistData = await response.json();
    const file = gistData.files['split_wallet_archive.json'] || gistData.files['split_wallet.json'];
    if (!file) {
      throw new Error("Archive file not found in gist.");
    }

    return JSON.parse(file.content) as Ledger;
  }, [githubToken]);

  return {
	  isLoading, // <-- ADD THIS
    appData,
    currentLedger,
    currentLedgerId,
    setCurrentLedgerId,
    addLedger,
    deleteLedger,
    renameLedger,
    updateLedger,
    isSyncing,
    needsSync,
    syncError,
    isOnline,
    githubToken,
    setGithubToken,
    fetchFromCloud,
    pushToCloud,
    createGistForLedger,
    fetchAllLedgersFromCloud,
    getLedgerCategories,
    archiveYear,
    fetchArchive,
    undo,
    canUndo: history.length > 0
  };
}

import { useState, useEffect, useCallback } from 'react';
import { AppData, Ledger } from '../types';
import { customFetch } from '../utils/api';

const SYNC_KEY = 'sw_unsynced_ledgers';

interface UseCloudSyncProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  currentLedgerId: string;
  setCurrentLedgerId: React.Dispatch<React.SetStateAction<string>>;
  githubToken: string;
  unsyncedLedgerIds: string[];
  setUnsyncedLedgerIds: React.Dispatch<React.SetStateAction<string[]>>;
  updateLedger: (ledger: Ledger) => void;
  isInitialized: boolean; // <--- ADD THIS
}

export function useCloudSync({
  appData,
  setAppData,
  currentLedgerId,
  setCurrentLedgerId,
  githubToken,
  unsyncedLedgerIds,
  setUnsyncedLedgerIds,
  updateLedger
  isInitialized // <--- ADD THIS
}: UseCloudSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const currentLedger = appData.ledgers.find(t => t.id === currentLedgerId) || appData.ledgers[0];
  const needsSync = unsyncedLedgerIds.includes(currentLedgerId);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchFromCloud = useCallback(async (overrideGistId?: string | any, switchLedger: boolean = true) => {
    const targetGistId = typeof overrideGistId === 'string' ? overrideGistId : currentLedger?.gistId;
    if (!targetGistId) return;
    
    // CRITICAL: If we have unsynced local changes for THIS ledger, DO NOT pull and overwrite
    // unless explicitly requested (e.g. initial load or manual pull)
    const storedUnsynced = localStorage.getItem(SYNC_KEY);
    const unsyncedIds: string[] = storedUnsynced ? JSON.parse(storedUnsynced) : [];
    const localNeedsSync = unsyncedIds.includes(targetGistId === currentLedger?.gistId ? currentLedgerId : '');
    
    if (localNeedsSync && typeof overrideGistId !== 'string') {
      console.log("Skipping cloud pull: Local changes pending sync for this ledger.");
      return;
    }

    if (!navigator.onLine) {
      setSyncError("Offline: Cannot pull data.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const headers: any = {};
      const token = githubToken?.trim();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await customFetch(`https://api.github.com/gists/${targetGistId}?t=${Date.now()}`, { headers });
      if (res.status === 401) throw new Error("401: Invalid GitHub token. Please check your settings.");
      if (res.status === 403) throw new Error("403: GitHub token lacks 'gist' permission or is rate limited. Please create a new token with 'gist' scope.");
      if (res.status === 404) throw new Error("404: Cloud storage (Gist) not found.");
      if (!res.ok) throw new Error(`Failed to fetch gist: ${res.status}`);
      
      const data = await res.json();
      
      // Check for new per-ledger format first
      const ledgerContent = data.files['ledger.json']?.content;
      if (ledgerContent) {
        const parsedLedger = JSON.parse(ledgerContent);
        parsedLedger.gistId = targetGistId; // Ensure gistId is set
        
        setAppData(prev => {
          const index = prev.ledgers.findIndex(t => t.id === parsedLedger.id);
          if (index >= 0) {
            const currentLedgerData = prev.ledgers[index];
            // Only update if the incoming ledger is newer
            const currentLastUpdated = currentLedgerData.lastUpdated || '0';
            const incomingLastUpdated = parsedLedger.lastUpdated || '0';
            if (incomingLastUpdated > currentLastUpdated || typeof overrideGistId === 'string') {
              const mergeArrays = <T extends { id: string }>(localArr: T[] = [], cloudArr: T[] = []) => {
                const map = new Map<string, T>();
                cloudArr.forEach(item => map.set(item.id, item)); // cloud first
                localArr.forEach(item => map.set(item.id, item)); // local overwrites
                return Array.from(map.values());
              };

              const mergedLedger = {
                ...parsedLedger,
                lastUpdated: incomingLastUpdated > currentLastUpdated ? incomingLastUpdated : currentLastUpdated,
                lastSynced: incomingLastUpdated,
                users: Array.from(new Set([...(currentLedgerData.users || []), ...(parsedLedger.users || [])])),
                expenses: mergeArrays(currentLedgerData.expenses, parsedLedger.expenses),
                exchanges: mergeArrays(currentLedgerData.exchanges, parsedLedger.exchanges),
                goals: mergeArrays(currentLedgerData.goals, parsedLedger.goals),
                recurringTransactions: mergeArrays(currentLedgerData.recurringTransactions, parsedLedger.recurringTransactions),
                loans: mergeArrays(currentLedgerData.loans, parsedLedger.loans),
                budgets: mergeArrays(currentLedgerData.budgets, parsedLedger.budgets),
              };
              return { ...prev, ledgers: prev.ledgers.map(t => t.id === parsedLedger.id ? mergedLedger : t) };
            }
            return prev;
          } else {
            return { ...prev, ledgers: [...prev.ledgers, { ...parsedLedger, lastSynced: parsedLedger.lastUpdated }] };
          }
        });
        if (typeof overrideGistId === 'string' && switchLedger) setCurrentLedgerId(parsedLedger.id);
        if (!localNeedsSync) {
          setUnsyncedLedgerIds(prev => prev.filter(id => id !== parsedLedger.id));
        }
      } else {
        // Fallback for legacy global data format
        const content = data.files['data.json']?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.appData) {
            setAppData(parsed.appData);
            setUnsyncedLedgerIds([]);
            if (!parsed.appData.ledgers.find((t: Ledger) => t.id === currentLedgerId)) {
               if (parsed.appData.ledgers.length > 0) setCurrentLedgerId(parsed.appData.ledgers[0].id);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncError(error.message || "Failed to pull data from cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentLedger?.gistId, currentLedgerId, setAppData, setCurrentLedgerId, setUnsyncedLedgerIds]);

const pushToCloud = useCallback(async (ledgerId?: string, overrideLedger?: Ledger) => {
    const targetId = ledgerId || currentLedgerId;
    let targetLedger = overrideLedger || appData.ledgers.find(t => t.id === targetId);
    const token = githubToken?.trim();
    if (!token || !targetLedger?.gistId) return;
    if (!navigator.onLine) {
      setSyncError("Offline: Cannot push data."); 
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      // --- NEW: Timestamp Verification & Conflict Resolution ---
      const checkRes = await customFetch(`https://api.github.com/gists/${targetLedger.gistId}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const cloudLedgerContent = checkData.files['ledger.json']?.content;
        if (cloudLedgerContent) {
          const cloudLedger = JSON.parse(cloudLedgerContent);
          const cloudLastUpdated = cloudLedger.lastUpdated || '0';
          const lastSynced = targetLedger.lastSynced || '0';
          
          if (cloudLastUpdated > lastSynced) {
            console.warn("Cloud data has been updated since last sync. Aborting push, fetching to merge.");
            setIsSyncing(false);
            await fetchFromCloud(targetLedger.gistId, false);
            return;
          }
        }
      } else if (checkRes.status === 401) {
        throw new Error("401: Invalid GitHub token. Please check your settings.");
      } else if (checkRes.status === 404) {
        throw new Error("404: Cloud storage (Gist) not found.");
      }
      // ---------------------------------------------------------

      const payload = { files: { 'ledger.json': { content: JSON.stringify(targetLedger, null, 2) } } };
      const res = await customFetch(`https://api.github.com/gists/${targetLedger.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.status === 401) throw new Error("401: Invalid GitHub token. Please check your settings.");
      if (res.status === 403) throw new Error("403: GitHub token lacks 'gist' permission or is rate limited. Please create a new token with 'gist' scope.");
      if (res.status === 404) throw new Error("404: Cloud storage (Gist) not found.");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to push to gist: ${res.status} ${JSON.stringify(errorData)}`);
      }
      
      // Update lastSynced locally
      setAppData(prev => ({
        ...prev,
        ledgers: prev.ledgers.map(t => t.id === targetId ? { ...t, lastSynced: targetLedger!.lastUpdated } : t)
      }));
      
      setUnsyncedLedgerIds(prev => prev.filter(id => id !== targetId));
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncError(error.message || "Failed to push data to cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentLedgerId, appData.ledgers, fetchFromCloud, setAppData, setUnsyncedLedgerIds]);

  const fetchAllLedgersFromCloud = useCallback(async () => {
    const token = githubToken?.trim();
    if (!token) return;
    if (!navigator.onLine) {
      setSyncError("Offline: Cannot pull data.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await customFetch(`https://api.github.com/gists?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (res.status === 401) throw new Error("401: Invalid GitHub token. Please check your settings.");
      if (res.status === 403) throw new Error("403: GitHub token lacks 'gist' permission or is rate limited. Please create a new token with 'gist' scope.");
      if (!res.ok) {
        let errorText = "";
        try {
          errorText = await res.text();
        } catch (e) {}
        throw new Error(`Failed to fetch gists: ${res.status} ${res.statusText} - ${errorText}`);
      }
      const gists = await res.json();
      
      if (!Array.isArray(gists)) {
        console.error("Expected array of gists, got:", gists);
        throw new Error("Invalid response format from GitHub API");
      }
      
      const newLedgers: Ledger[] = [];
      if (Array.isArray(gists)) {
        for (const gist of gists) {
          if (gist.files['ledger.json']) {
            try {
              const gistRes = await customFetch(gist.url, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (gistRes.ok) {
                const gistData = await gistRes.json();
                const ledgerContent = gistData.files['ledger.json']?.content;
                if (ledgerContent) {
                  const parsedLedger = JSON.parse(ledgerContent);
                  parsedLedger.gistId = gist.id;
                  newLedgers.push(parsedLedger);
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch gist ${gist.id}:`, err);
            }
          }
        }
      }

      if (newLedgers.length > 0) {
        setAppData(prev => {
          const updatedLedgers = [...prev.ledgers];
          newLedgers.forEach(newLedger => {
            const index = updatedLedgers.findIndex(t => t.id === newLedger.id);
            if (index >= 0) {
              // Only update if the incoming ledger is newer
              const currentLastUpdated = updatedLedgers[index].lastUpdated || '0';
              const incomingLastUpdated = newLedger.lastUpdated || '0';
              if (incomingLastUpdated > currentLastUpdated) {
                const currentLedgerData = updatedLedgers[index];
                const mergeArrays = <T extends { id: string }>(localArr: T[] = [], cloudArr: T[] = []) => {
                  const map = new Map<string, T>();
                  cloudArr.forEach(item => map.set(item.id, item)); // cloud first
                  localArr.forEach(item => map.set(item.id, item)); // local overwrites
                  return Array.from(map.values());
                };

                updatedLedgers[index] = {
                  ...newLedger,
                  lastUpdated: incomingLastUpdated > currentLastUpdated ? incomingLastUpdated : currentLastUpdated,
                  lastSynced: incomingLastUpdated,
                  users: Array.from(new Set([...(currentLedgerData.users || []), ...(newLedger.users || [])])),
                  expenses: mergeArrays(currentLedgerData.expenses, newLedger.expenses),
                  exchanges: mergeArrays(currentLedgerData.exchanges, newLedger.exchanges),
                  goals: mergeArrays(currentLedgerData.goals, newLedger.goals),
                  recurringTransactions: mergeArrays(currentLedgerData.recurringTransactions, newLedger.recurringTransactions),
                  loans: mergeArrays(currentLedgerData.loans, newLedger.loans),
                  budgets: mergeArrays(currentLedgerData.budgets, newLedger.budgets),
                };
              }
            } else {
              updatedLedgers.push({ ...newLedger, lastSynced: newLedger.lastUpdated });
            }
          });
          
          // If the current ledger is empty and we fetched new ledgers, switch to the first fetched ledger
          const currentLedger = updatedLedgers.find(t => t.id === currentLedgerId);
          if (currentLedger && !currentLedger.gistId && currentLedger.expenses.length === 0 && currentLedger.users.length === 0) {
            setCurrentLedgerId(newLedgers[0].id);
            // Optionally remove the empty default ledger
            return { ...prev, ledgers: updatedLedgers.filter(t => t.id !== currentLedger.id) };
          }
          
          return { ...prev, ledgers: updatedLedgers };
        });
        // We don't setUnsyncedLedgerIds([]) here because we might have local changes in other ledgers
      }
    } catch (error) {
      console.error("Fetch all ledgers error:", error);
      setSyncError("Failed to pull all ledgers from cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentLedgerId, setAppData, setCurrentLedgerId]);

  const createGistForLedger = useCallback(async () => {
    if (!githubToken || !currentLedger) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const payload = {
        description: `DailyExpensesSpliter Group: ${currentLedger.name}`,
        public: false,
        files: {
          'ledger.json': { content: JSON.stringify(currentLedger, null, 2) }
        }
      };
      const res = await customFetch(`https://api.github.com/gists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to create gist");
      const data = await res.json();
      if (data.id) {
        updateLedger({ ...currentLedger, gistId: data.id, lastSynced: currentLedger.lastUpdated });
      }
    } catch (error) {
      console.error("Create gist error:", error);
      setSyncError("Failed to create shareable link.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentLedger, updateLedger]);

  // Handle URL parameters for shared ledgers
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ledgerGistId = params.get('ledgerGistId');
    if (ledgerGistId) {
      fetchFromCloud(ledgerGistId);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchFromCloud]);

  // Auto-sync on network connection
  useEffect(() => {
    const handleOnline = () => {
		if (!isInitialized) return; // <--- ADD THIS
      if (needsSync && currentLedger?.gistId) {
        pushToCloud();
      } else if (currentLedger?.gistId) {
        fetchFromCloud();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [needsSync, pushToCloud, fetchFromCloud, currentLedger?.gistId]);

  // Initial sync on mount/credential change if online
  useEffect(() => {
	  if (!isInitialized) return; // <--- ADD THIS
    if (navigator.onLine && githubToken && !isSyncing) {
      if (unsyncedLedgerIds.length > 0) {
        // Push all unsynced ledgers
        unsyncedLedgerIds.forEach(id => {
          const ledger = appData.ledgers.find(t => t.id === id);
          if (ledger?.gistId) pushToCloud(id);
        });
      } else {
        // Fetch all ledgers to ensure we have the latest list of ledgers
        fetchAllLedgersFromCloud();
      }
    }
  }, [githubToken, isInitialized]); // <--- ADD isInitialized

  // Auto-push on data change (debounced)
  useEffect(() => {
	  if (!isInitialized) return; // <--- ADD THIS
    if (needsSync && githubToken && currentLedger?.gistId && !isSyncing && isOnline) {
      const timer = setTimeout(() => {
        pushToCloud(currentLedgerId);
      }, 2000); // 2 second debounce
      return () => clearTimeout(timer);
    }
  }, [needsSync, githubToken, currentLedgerId, currentLedger?.gistId, isSyncing, pushToCloud, isOnline]);

  // Background polling (Auto-pull)
  useEffect(() => {
if (!currentLedger?.gistId || !isOnline || !isInitialized) return; // <--- ADD !isInitialized

    const interval = setInterval(() => {
      // Check localStorage directly to be tab-aware
      const storedUnsynced = localStorage.getItem(SYNC_KEY);
      const unsyncedIds: string[] = storedUnsynced ? JSON.parse(storedUnsynced) : [];
      const currentNeedsSync = unsyncedIds.includes(currentLedgerId);
      
      if (!currentNeedsSync && !isSyncing) {
        console.log("Auto-syncing: Pulling data from cloud...");
        fetchFromCloud();
      }
    }, 10000); // Increased to 10 seconds to reduce race conditions

    return () => clearInterval(interval);
  }, [currentLedger?.gistId, currentLedgerId, isOnline, isSyncing, fetchFromCloud]);

  // Auto-Fetch on Wake
  useEffect(() => {
    const handleVisibilityChange = () => {
		if (!isInitialized) return; // <--- ADD THIS
      if (document.visibilityState === 'visible' && currentLedger?.gistId && isOnline && !isSyncing) {
        console.log("App regained focus: Pulling data from cloud...");
        fetchFromCloud();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentLedger?.gistId, isOnline, isSyncing, fetchFromCloud, isInitialized]); // <--- ADD isInitialized

  return {
    isSyncing,
    needsSync,
    syncError,
    isOnline,
    fetchFromCloud,
    pushToCloud,
    fetchAllLedgersFromCloud,
    createGistForLedger
  };
}

import { useState, useEffect, useCallback } from 'react';
import { AppData, Group, Expense, Exchange, CATEGORIES } from '../types';
import { GITHUB_TOKEN } from '../config';

const STORAGE_KEY = 'sw_app_data';
const CURRENT_GROUP_KEY = 'sw_current_group';
const SYNC_KEY = 'sw_needs_sync';
const GITHUB_TOKEN_KEY = 'sw_github_token';

const DEFAULT_DATA: AppData = {
  groups: [{ id: 'group_' + Date.now(), name: 'My First Group', users: [], expenses: [], exchanges: [] }]
};

export function useStore() {
  const [appData, setAppData] = useState<AppData>(DEFAULT_DATA);
  const [currentGroupId, setCurrentGroupId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [githubToken, setGithubToken] = useState(GITHUB_TOKEN);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Load initial data
  useEffect(() => {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const storedGroupId = localStorage.getItem(CURRENT_GROUP_KEY);
    const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
    const storedSync = localStorage.getItem(SYNC_KEY) === 'true';

    if (storedData) {
      setAppData(JSON.parse(storedData));
    }
    if (storedGroupId) {
      setCurrentGroupId(storedGroupId);
    } else if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.groups.length > 0) setCurrentGroupId(parsed.groups[0].id);
    }

    if (storedToken) setGithubToken(storedToken);
    setNeedsSync(storedSync);
  }, []);

  // Process recurring transactions
  useEffect(() => {
    if (appData.trips.length === 0) return;
    
    let hasChanges = false;
    const today = new Date().toISOString().split('T')[0];
    
    const newTrips = appData.trips.map(trip => {
      if (!trip.recurringTransactions || trip.recurringTransactions.length === 0) return trip;
      
      let tripChanged = false;
      const newExpenses = [...trip.expenses];
      const newRecurring = trip.recurringTransactions.map(tx => {
        let currentNextDate = tx.nextDate;
        let txChanged = false;

        let loopCount = 0;
        while (currentNextDate <= today && loopCount < 100) {
          loopCount++;
          tripChanged = true;
          hasChanges = true;
          txChanged = true;
          
          // Create new expense
          const newExpense: Expense = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            desc: tx.desc + ' (Recurring)',
            amountOriginal: tx.amountOriginal,
            currency: tx.currency,
            category: tx.category,
            paidBy: tx.paidBy,
            splitAmong: tx.splitAmong,
            date: currentNextDate,
          };
          newExpenses.push(newExpense);
          
          // Calculate next date
          const dateObj = new Date(currentNextDate);
          if (isNaN(dateObj.getTime())) {
            // Invalid date, break to avoid infinite loop
            break;
          }
          if (tx.frequency === 'daily') dateObj.setDate(dateObj.getDate() + 1);
          else if (tx.frequency === 'weekly') dateObj.setDate(dateObj.getDate() + 7);
          else if (tx.frequency === 'monthly') dateObj.setMonth(dateObj.getMonth() + 1);
          else if (tx.frequency === 'yearly') dateObj.setFullYear(dateObj.getFullYear() + 1);
          
          currentNextDate = dateObj.toISOString().split('T')[0];
        }
        
        if (txChanged) {
          return { ...tx, nextDate: currentNextDate };
        }
        return tx;
      });
      
      if (tripChanged) {
        return { ...trip, expenses: newExpenses, recurringTransactions: newRecurring };
      }
      return trip;
    });
    
    if (hasChanges) {
      setAppData(prev => ({ ...prev, trips: newTrips }));
      setNeedsSync(true);
    }
  }, [appData.groups]);

  // Persist data whenever it changes
  useEffect(() => {
    if (appData.groups.length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    localStorage.setItem(CURRENT_GROUP_KEY, currentGroupId);
  }, [appData, currentGroupId]);

  // Sync flag
  useEffect(() => {
    localStorage.setItem(SYNC_KEY, String(needsSync));
  }, [needsSync]);

  // Settings persistence
  useEffect(() => {
    localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
  }, [githubToken]);

  const currentGroup = appData.groups.find(t => t.id === currentGroupId) || appData.groups[0];

  const updateGroup = (updatedGroup: Group) => {
    setAppData(prev => ({
      ...prev,
      groups: prev.groups.map(t => t.id === updatedGroup.id ? updatedGroup : t)
    }));
    setNeedsSync(true);
  };

  const addGroup = (name: string) => {
    const newGroup: Group = {
      id: 'group_' + Date.now(),
      name,
      users: [],
      expenses: [],
      exchanges: [],
      categories: CATEGORIES,
      budgets: []
    };
    setAppData(prev => ({ ...prev, groups: [...prev.groups, newGroup] }));
    setCurrentGroupId(newGroup.id);
    setNeedsSync(true);
  };

  const deleteGroup = (id: string) => {
    if (appData.groups.length <= 1) return;
    const newGroups = appData.groups.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, groups: newGroups }));
    setCurrentGroupId(newGroups[0].id);
    setNeedsSync(true);
  };

  const renameGroup = (id: string, name: string) => {
    setAppData(prev => ({
      ...prev,
      groups: prev.groups.map(t => t.id === id ? { ...t, name } : t)
    }));
    setNeedsSync(true);
  };

  // Cloud Sync Logic (Per Group)
  const fetchFromCloud = useCallback(async (overrideGistId?: string | any) => {
    const targetGistId = typeof overrideGistId === 'string' ? overrideGistId : currentGroup?.syncId;
    if (!targetGistId) return;
    if (!navigator.onLine) {
      setSyncError("Offline: Cannot pull data.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const headers: any = {};
      if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;
      
      const res = await fetch(`https://api.github.com/gists/${targetGistId}?t=${Date.now()}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch gist");
      const data = await res.json();
      
      // Check for new per-group format first
      const groupContent = data.files['trip.json']?.content;
      if (groupContent) {
        const parsedGroup = JSON.parse(groupContent);
        parsedGroup.syncId = targetGistId; // Ensure syncId is set
        setAppData(prev => {
          const exists = prev.groups.some(t => t.id === parsedGroup.id);
          if (exists) {
            return { ...prev, groups: prev.groups.map(t => t.id === parsedGroup.id ? parsedGroup : t) };
          } else {
            return { ...prev, groups: [...prev.groups, parsedGroup] };
          }
        });
        if (typeof overrideGistId === 'string') setCurrentGroupId(parsedGroup.id);
        setNeedsSync(false);
      } else {
        // Fallback for legacy global data format
        const content = data.files['data.json']?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.appData) {
            setAppData(parsed.appData);
            setNeedsSync(false);
            if (!parsed.appData.groups.find((t: Group) => t.id === currentGroupId)) {
               if (parsed.appData.groups.length > 0) setCurrentGroupId(parsed.appData.groups[0].id);
            }
          }
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncError("Failed to pull data from cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentGroup?.syncId, currentGroupId]);

  const pushToCloud = useCallback(async () => {
    if (!githubToken || !currentGroup?.syncId) return;
    if (!navigator.onLine) {
      setSyncError(null); 
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const payload = { files: { 'trip.json': { content: JSON.stringify(currentGroup, null, 2) } } };
      const res = await fetch(`https://api.github.com/gists/${currentGroup.syncId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to push to gist");
      setNeedsSync(false);
    } catch (error) {
      console.error("Sync error:", error);
      setSyncError("Failed to push data to cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentGroup]);

  const fetchAllGroupsFromCloud = useCallback(async () => {
    if (!githubToken) return;
    if (!navigator.onLine) {
      setSyncError("Offline: Cannot pull data.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`https://api.github.com/gists`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch gists");
      const gists = await res.json();
      
      const newGroups: Group[] = [];
      for (const gist of gists) {
        if (gist.files['trip.json']) {
          const gistRes = await fetch(gist.url, {
            headers: { 'Authorization': `Bearer ${githubToken}` }
          });
          if (gistRes.ok) {
            const gistData = await gistRes.json();
            const groupContent = gistData.files['trip.json']?.content;
            if (groupContent) {
              const parsedGroup = JSON.parse(groupContent);
              parsedGroup.syncId = gist.id;
              newGroups.push(parsedGroup);
            }
          }
        }
      }

      if (newGroups.length > 0) {
        setAppData(prev => {
          const updatedGroups = [...prev.groups];
          newGroups.forEach(newGroup => {
            const index = updatedGroups.findIndex(t => t.id === newGroup.id);
            if (index >= 0) {
              updatedGroups[index] = newGroup;
            } else {
              updatedGroups.push(newGroup);
            }
          });
          return { ...prev, groups: updatedGroups };
        });
        setNeedsSync(false);
      }
    } catch (error) {
      console.error("Fetch all groups error:", error);
      setSyncError("Failed to pull all groups from cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken]);

  const createGistForGroup = useCallback(async () => {
    if (!githubToken || !currentGroup) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const payload = {
        description: `DailyExpensesSpliter Group: ${currentGroup.name}`,
        public: false,
        files: {
          'trip.json': { content: JSON.stringify(currentGroup, null, 2) }
        }
      };
      const res = await fetch(`https://api.github.com/gists`, {
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
        updateGroup({ ...currentGroup, syncId: data.id });
      }
    } catch (error) {
      console.error("Create gist error:", error);
      setSyncError("Failed to create shareable link.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentGroup]);

  // Handle URL parameters for shared groups
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupSyncId = params.get('groupSyncId');
    if (groupSyncId) {
      fetchFromCloud(groupSyncId);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchFromCloud]);

  // Auto-sync on network connection
  useEffect(() => {
    const handleOnline = () => {
      if (needsSync && currentGroup?.syncId) {
        pushToCloud();
      } else if (currentGroup?.syncId) {
        fetchFromCloud();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [needsSync, pushToCloud, fetchFromCloud, currentGroup?.syncId]);

  // Initial sync on mount/credential change if online
  useEffect(() => {
    if (navigator.onLine && currentGroup?.syncId && !isSyncing) {
        if (needsSync) {
            pushToCloud();
        } else {
            fetchFromCloud();
        }
    }
  }, [githubToken, currentGroup?.syncId]); // Run when credentials change or group changes

  // Auto-push on data change (debounced)
  useEffect(() => {
    if (needsSync && githubToken && currentGroup?.syncId && !isSyncing && isOnline) {
      const timer = setTimeout(() => {
        pushToCloud();
      }, 2000); // 2 second debounce
      return () => clearTimeout(timer);
    }
  }, [needsSync, githubToken, currentGroup?.syncId, appData, isSyncing, pushToCloud, isOnline]);

  // Background polling (Auto-pull)
  useEffect(() => {
    if (!currentGroup?.syncId || !isOnline) return;

    const interval = setInterval(() => {
      if (!needsSync && !isSyncing) {
        console.log("Auto-syncing: Pulling data from cloud...");
        fetchFromCloud();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentGroup?.syncId, isOnline, needsSync, isSyncing, fetchFromCloud]);

  const getGroupCategories = useCallback((group: Group) => {
    return group.categories || CATEGORIES;
  }, []);

  return {
    appData,
    currentGroup,
    currentGroupId,
    setCurrentGroupId,
    addGroup,
    deleteGroup,
    renameGroup,
    updateGroup,
    isSyncing,
    needsSync,
    syncError,
    isOnline,
    githubToken,
    setGithubToken,
    fetchFromCloud,
    pushToCloud,
    createGistForGroup,
    fetchAllGroupsFromCloud,
    getGroupCategories
  };
}

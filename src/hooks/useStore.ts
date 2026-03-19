import { useState, useEffect, useCallback } from 'react';
import { AppData, Trip, Expense, Exchange, CATEGORIES } from '../types';
import { GITHUB_TOKEN } from '../config';

const STORAGE_KEY = 'sw_app_data';
const CURRENT_TRIP_KEY = 'sw_current_trip';
const SYNC_KEY = 'sw_unsynced_trips'; // Changed to track multiple trips
const GITHUB_TOKEN_KEY = 'sw_github_token';

const DEFAULT_DATA: AppData = {
  trips: [{ 
    id: 'trip_' + Date.now(), 
    name: 'My First Trip', 
    lastUpdated: new Date().toISOString(),
    users: [], 
    expenses: [], 
    exchanges: [] 
  }]
};

export function useStore() {
  const [appData, setAppData] = useState<AppData>(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
          // Ensure all trips have lastUpdated
          parsed.trips = parsed.trips.map((t: Trip) => ({
            ...t,
            lastUpdated: t.lastUpdated || new Date().toISOString()
          }));
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load stored data:", e);
    }
    return DEFAULT_DATA;
  });

  const [currentTripId, setCurrentTripId] = useState<string>(() => {
    try {
      const storedTripId = localStorage.getItem(CURRENT_TRIP_KEY);
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
          if (storedTripId && parsed.trips.some((t: Trip) => t.id === storedTripId)) {
            return storedTripId;
          }
          return parsed.trips[0].id;
        }
      }
    } catch (e) {
      console.error("Failed to load stored data:", e);
    }
    return DEFAULT_DATA.trips[0].id;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedTripIds, setUnsyncedTripIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SYNC_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const needsSync = unsyncedTripIds.includes(currentTripId);
  const [githubToken, setGithubToken] = useState(() => {
    return localStorage.getItem(GITHUB_TOKEN_KEY) || GITHUB_TOKEN;
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [history, setHistory] = useState<AppData[]>([]);

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

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // MERGE STRATEGY: Instead of blind overwrite, ensure we keep our trips
          // and update/add based on IDs.
          setAppData(prev => {
            const newTrips = [...prev.trips];
            parsed.trips.forEach((newTrip: Trip) => {
              const index = newTrips.findIndex(t => t.id === newTrip.id);
              if (index >= 0) {
                // Only update if the incoming trip is newer
                const currentLastUpdated = newTrips[index].lastUpdated || '0';
                const incomingLastUpdated = newTrip.lastUpdated || '0';
                if (incomingLastUpdated > currentLastUpdated) {
                  newTrips[index] = newTrip;
                }
              } else {
                newTrips.push(newTrip); // Add new
              }
            });
            return { ...prev, trips: newTrips };
          });
        } catch (e) {
          console.error("Failed to parse storage data from another tab:", e);
        }
      }
      if (e.key === CURRENT_TRIP_KEY && e.newValue) {
        setCurrentTripId(e.newValue);
      }
      if (e.key === SYNC_KEY && e.newValue) {
        try {
          setUnsyncedTripIds(JSON.parse(e.newValue));
        } catch {
          setUnsyncedTripIds([]);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
      setUnsyncedTripIds(prev => prev.includes(currentTripId) ? prev : [...prev, currentTripId]);
    }
  }, [appData.trips, currentTripId]);

  // Persist data whenever it changes
  useEffect(() => {
    if (appData.trips.length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    localStorage.setItem(CURRENT_TRIP_KEY, currentTripId);
  }, [appData, currentTripId]);

  // Sync flag
  useEffect(() => {
    localStorage.setItem(SYNC_KEY, JSON.stringify(unsyncedTripIds));
  }, [unsyncedTripIds]);

  // Settings persistence
  useEffect(() => {
    localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
  }, [githubToken]);

  const currentTrip = appData.trips.find(t => t.id === currentTripId) || appData.trips[0];

  const saveToHistory = useCallback((data: AppData) => {
    setHistory(prev => {
      const newHistory = [data, ...prev].slice(0, 50); // Keep last 50 states
      return newHistory;
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const [lastState, ...remainingHistory] = history;
    setAppData(lastState);
    setHistory(remainingHistory);
    setUnsyncedTripIds(prev => prev.includes(currentTripId) ? prev : [...prev, currentTripId]);
  }, [history, currentTripId]);

  const updateTrip = (updatedTrip: Trip) => {
    const now = new Date().toISOString();
    const tripWithTimestamp = { ...updatedTrip, lastUpdated: now };
    saveToHistory(appData);
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === updatedTrip.id ? tripWithTimestamp : t)
    }));
    setUnsyncedTripIds(prev => prev.includes(updatedTrip.id) ? prev : [...prev, updatedTrip.id]);
  };

  const addTrip = (name: string) => {
    saveToHistory(appData);
    const now = new Date().toISOString();
    const newTrip: Trip = {
      id: 'trip_' + Date.now(),
      name,
      lastUpdated: now,
      users: ['Me'],
      expenses: [],
      exchanges: [],
      categories: CATEGORIES,
      budgets: []
    };
    setAppData(prev => ({ ...prev, trips: [...prev.trips, newTrip] }));
    setCurrentTripId(newTrip.id);
    setUnsyncedTripIds(prev => [...prev, newTrip.id]);
  };

  const deleteTrip = (id: string) => {
    if (appData.trips.length <= 1) return;
    saveToHistory(appData);
    const newTrips = appData.trips.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, trips: newTrips }));
    setCurrentTripId(newTrips[0].id);
    setUnsyncedTripIds(prev => prev.filter(tid => tid !== id));
  };

  const renameTrip = (id: string, name: string) => {
    saveToHistory(appData);
    const now = new Date().toISOString();
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === id ? { ...t, name, lastUpdated: now } : t)
    }));
    setUnsyncedTripIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  // Cloud Sync Logic (Per Trip)
  const fetchFromCloud = useCallback(async (overrideGistId?: string | any) => {
    const targetGistId = typeof overrideGistId === 'string' ? overrideGistId : currentTrip?.gistId;
    if (!targetGistId) return;
    
    // CRITICAL: If we have unsynced local changes for THIS trip, DO NOT pull and overwrite
    // unless explicitly requested (e.g. initial load or manual pull)
    const storedUnsynced = localStorage.getItem(SYNC_KEY);
    const unsyncedIds: string[] = storedUnsynced ? JSON.parse(storedUnsynced) : [];
    const localNeedsSync = unsyncedIds.includes(targetGistId === currentTrip?.gistId ? currentTripId : '');
    
    if (localNeedsSync && typeof overrideGistId !== 'string') {
      console.log("Skipping cloud pull: Local changes pending sync for this trip.");
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
      if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;
      
      const res = await fetch(`https://api.github.com/gists/${targetGistId}?t=${Date.now()}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch gist");
      const data = await res.json();
      
      // Check for new per-trip format first
      const tripContent = data.files['trip.json']?.content;
      if (tripContent) {
        const parsedTrip = JSON.parse(tripContent);
        parsedTrip.gistId = targetGistId; // Ensure gistId is set
        
        setAppData(prev => {
          const index = prev.trips.findIndex(t => t.id === parsedTrip.id);
          if (index >= 0) {
            // Only update if the incoming trip is newer
            const currentLastUpdated = prev.trips[index].lastUpdated || '0';
            const incomingLastUpdated = parsedTrip.lastUpdated || '0';
            if (incomingLastUpdated > currentLastUpdated || typeof overrideGistId === 'string') {
              return { ...prev, trips: prev.trips.map(t => t.id === parsedTrip.id ? parsedTrip : t) };
            }
            return prev;
          } else {
            return { ...prev, trips: [...prev.trips, parsedTrip] };
          }
        });
        if (typeof overrideGistId === 'string') setCurrentTripId(parsedTrip.id);
        setUnsyncedTripIds(prev => prev.filter(id => id !== parsedTrip.id));
      } else {
        // Fallback for legacy global data format
        const content = data.files['data.json']?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.appData) {
            setAppData(parsed.appData);
            setUnsyncedTripIds([]);
            if (!parsed.appData.trips.find((t: Trip) => t.id === currentTripId)) {
               if (parsed.appData.trips.length > 0) setCurrentTripId(parsed.appData.trips[0].id);
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
  }, [githubToken, currentTrip?.gistId, currentTripId]);

  const pushToCloud = useCallback(async (tripId?: string) => {
    const targetId = tripId || currentTripId;
    let targetTrip = appData.trips.find(t => t.id === targetId);
    if (!githubToken || !targetTrip?.gistId) return;
    if (!navigator.onLine) {
      setSyncError(null); 
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      // --- NEW: Timestamp Verification & Conflict Resolution ---
      const checkRes = await fetch(`https://api.github.com/gists/${targetTrip.gistId}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${githubToken}` }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const cloudTripContent = checkData.files['trip.json']?.content;
        if (cloudTripContent) {
          const cloudTrip = JSON.parse(cloudTripContent);
          const cloudLastUpdated = cloudTrip.lastUpdated || '0';
          const localLastUpdated = targetTrip.lastUpdated || '0';
          
          if (cloudLastUpdated > localLastUpdated) {
            console.warn("Cloud data is newer than local data. Merging before push.");
            
            // Merge strategy: combine arrays by ID, keep local changes if conflict
            const mergeArrays = <T extends { id: string }>(arr1: T[] = [], arr2: T[] = []) => {
              const map = new Map<string, T>();
              arr2.forEach(item => map.set(item.id, item)); // cloud first
              arr1.forEach(item => map.set(item.id, item)); // local overwrites
              return Array.from(map.values());
            };

            const mergedTrip = {
              ...(localLastUpdated > cloudLastUpdated ? targetTrip : cloudTrip),
              lastUpdated: new Date().toISOString(), // Update timestamp to now
              expenses: mergeArrays(targetTrip.expenses, cloudTrip.expenses),
              exchanges: mergeArrays(targetTrip.exchanges, cloudTrip.exchanges),
              goals: mergeArrays(targetTrip.goals, cloudTrip.goals),
              recurringTransactions: mergeArrays(targetTrip.recurringTransactions, cloudTrip.recurringTransactions),
              loans: mergeArrays(targetTrip.loans, cloudTrip.loans),
              budgets: mergeArrays(targetTrip.budgets, cloudTrip.budgets),
              gistId: targetTrip.gistId
            };
            
            // Update local state with merged data
            setAppData(prev => ({
              ...prev,
              trips: prev.trips.map(t => t.id === mergedTrip.id ? mergedTrip : t)
            }));
            
            targetTrip = mergedTrip; // Use merged trip for pushing
          }
        }
      }
      // ---------------------------------------------------------

      const payload = { files: { 'trip.json': { content: JSON.stringify(targetTrip, null, 2) } } };
      const res = await fetch(`https://api.github.com/gists/${targetTrip.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to push to gist");
      setUnsyncedTripIds(prev => prev.filter(id => id !== targetId));
    } catch (error) {
      console.error("Sync error:", error);
      setSyncError("Failed to push data to cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentTripId, appData.trips]);

  const fetchAllTripsFromCloud = useCallback(async () => {
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
      
      const newTrips: Trip[] = [];
      for (const gist of gists) {
        if (gist.files['trip.json']) {
          const gistRes = await fetch(gist.url, {
            headers: { 'Authorization': `Bearer ${githubToken}` }
          });
          if (gistRes.ok) {
            const gistData = await gistRes.json();
            const tripContent = gistData.files['trip.json']?.content;
            if (tripContent) {
              const parsedTrip = JSON.parse(tripContent);
              parsedTrip.gistId = gist.id;
              newTrips.push(parsedTrip);
            }
          }
        }
      }

      if (newTrips.length > 0) {
        setAppData(prev => {
          const updatedTrips = [...prev.trips];
          newTrips.forEach(newTrip => {
            const index = updatedTrips.findIndex(t => t.id === newTrip.id);
            if (index >= 0) {
              // Only update if the incoming trip is newer
              const currentLastUpdated = updatedTrips[index].lastUpdated || '0';
              const incomingLastUpdated = newTrip.lastUpdated || '0';
              if (incomingLastUpdated > currentLastUpdated) {
                updatedTrips[index] = newTrip;
              }
            } else {
              updatedTrips.push(newTrip);
            }
          });
          
          // If the current trip is empty and we fetched new trips, switch to the first fetched trip
          const currentTrip = updatedTrips.find(t => t.id === currentTripId);
          if (currentTrip && !currentTrip.gistId && currentTrip.expenses.length === 0 && currentTrip.users.length === 0) {
            setCurrentTripId(newTrips[0].id);
            // Optionally remove the empty default trip
            return { ...prev, trips: updatedTrips.filter(t => t.id !== currentTrip.id) };
          }
          
          return { ...prev, trips: updatedTrips };
        });
        // We don't setUnsyncedTripIds([]) here because we might have local changes in other trips
      }
    } catch (error) {
      console.error("Fetch all trips error:", error);
      setSyncError("Failed to pull all trips from cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentTripId]);

  const createGistForTrip = useCallback(async () => {
    if (!githubToken || !currentTrip) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const payload = {
        description: `DailyExpensesSpliter Group: ${currentTrip.name}`,
        public: false,
        files: {
          'trip.json': { content: JSON.stringify(currentTrip, null, 2) }
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
        updateTrip({ ...currentTrip, gistId: data.id });
      }
    } catch (error) {
      console.error("Create gist error:", error);
      setSyncError("Failed to create shareable link.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentTrip]);

  // Handle URL parameters for shared trips
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripGistId = params.get('tripGistId');
    if (tripGistId) {
      fetchFromCloud(tripGistId);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchFromCloud]);

  // Auto-sync on network connection
  useEffect(() => {
    const handleOnline = () => {
      if (needsSync && currentTrip?.gistId) {
        pushToCloud();
      } else if (currentTrip?.gistId) {
        fetchFromCloud();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [needsSync, pushToCloud, fetchFromCloud, currentTrip?.gistId]);

  // Initial sync on mount/credential change if online
  useEffect(() => {
    if (navigator.onLine && githubToken && !isSyncing) {
      if (unsyncedTripIds.length > 0) {
        // Push all unsynced trips
        unsyncedTripIds.forEach(id => {
          const trip = appData.trips.find(t => t.id === id);
          if (trip?.gistId) pushToCloud(id);
        });
      } else {
        // Fetch all trips to ensure we have the latest list of trips
        fetchAllTripsFromCloud();
      }
    }
  }, [githubToken]); // Run when credentials change or on mount

  // Auto-push on data change (debounced)
  useEffect(() => {
    if (needsSync && githubToken && currentTrip?.gistId && !isSyncing && isOnline) {
      const timer = setTimeout(() => {
        pushToCloud(currentTripId);
      }, 2000); // 2 second debounce
      return () => clearTimeout(timer);
    }
  }, [needsSync, githubToken, currentTripId, currentTrip?.gistId, isSyncing, pushToCloud, isOnline]);

  // Background polling (Auto-pull)
  useEffect(() => {
    if (!currentTrip?.gistId || !isOnline) return;

    const interval = setInterval(() => {
      // Check localStorage directly to be tab-aware
      const storedUnsynced = localStorage.getItem(SYNC_KEY);
      const unsyncedIds: string[] = storedUnsynced ? JSON.parse(storedUnsynced) : [];
      const currentNeedsSync = unsyncedIds.includes(currentTripId);
      
      if (!currentNeedsSync && !isSyncing) {
        console.log("Auto-syncing: Pulling data from cloud...");
        fetchFromCloud();
      }
    }, 10000); // Increased to 10 seconds to reduce race conditions

    return () => clearInterval(interval);
  }, [currentTrip?.gistId, isOnline, isSyncing, fetchFromCloud]);

  const getTripCategories = useCallback((trip: Trip) => {
    return trip.categories || CATEGORIES;
  }, []);

  return {
    appData,
    currentTrip,
    currentTripId,
    setCurrentTripId,
    addTrip,
    deleteTrip,
    renameTrip,
    updateTrip,
    isSyncing,
    needsSync,
    syncError,
    isOnline,
    githubToken,
    setGithubToken,
    fetchFromCloud,
    pushToCloud,
    createGistForTrip,
    fetchAllTripsFromCloud,
    getTripCategories,
    undo,
    canUndo: history.length > 0
  };
}

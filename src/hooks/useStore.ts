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
    const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
    return (stored || GITHUB_TOKEN || '').trim();
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
  const fetchFromCloud = useCallback(async (overrideGistId?: string | any, switchTrip: boolean = true) => {
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
      const token = githubToken?.trim();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`https://api.github.com/gists/${targetGistId}?t=${Date.now()}`, { headers });
      if (res.status === 401) throw new Error("401: Invalid GitHub token.");
      if (res.status === 403) throw new Error("403: GitHub token lacks permission or rate limited.");
      if (res.status === 404) throw new Error("404: Cloud storage (Gist) not found.");
      if (!res.ok) throw new Error(`Failed to fetch gist: ${res.status}`);
      
      const data = await res.json();
      
      // Check for new per-trip format first
      const tripContent = data.files['trip.json']?.content;
      if (tripContent) {
        const parsedTrip = JSON.parse(tripContent);
        parsedTrip.gistId = targetGistId; // Ensure gistId is set
        
        setAppData(prev => {
          const index = prev.trips.findIndex(t => t.id === parsedTrip.id);
          if (index >= 0) {
            const currentTripData = prev.trips[index];
            // Only update if the incoming trip is newer
            const currentLastUpdated = currentTripData.lastUpdated || '0';
            const incomingLastUpdated = parsedTrip.lastUpdated || '0';
            if (incomingLastUpdated > currentLastUpdated || typeof overrideGistId === 'string') {
              const mergeArrays = <T extends { id: string }>(localArr: T[] = [], cloudArr: T[] = []) => {
                const map = new Map<string, T>();
                cloudArr.forEach(item => map.set(item.id, item)); // cloud first
                localArr.forEach(item => map.set(item.id, item)); // local overwrites
                return Array.from(map.values());
              };

              const mergedTrip = {
                ...parsedTrip,
                lastUpdated: incomingLastUpdated > currentLastUpdated ? incomingLastUpdated : currentLastUpdated,
                lastSynced: incomingLastUpdated,
                users: Array.from(new Set([...(currentTripData.users || []), ...(parsedTrip.users || [])])),
                expenses: mergeArrays(currentTripData.expenses, parsedTrip.expenses),
                exchanges: mergeArrays(currentTripData.exchanges, parsedTrip.exchanges),
                goals: mergeArrays(currentTripData.goals, parsedTrip.goals),
                recurringTransactions: mergeArrays(currentTripData.recurringTransactions, parsedTrip.recurringTransactions),
                loans: mergeArrays(currentTripData.loans, parsedTrip.loans),
                budgets: mergeArrays(currentTripData.budgets, parsedTrip.budgets),
              };
              return { ...prev, trips: prev.trips.map(t => t.id === parsedTrip.id ? mergedTrip : t) };
            }
            return prev;
          } else {
            return { ...prev, trips: [...prev.trips, { ...parsedTrip, lastSynced: parsedTrip.lastUpdated }] };
          }
        });
        if (typeof overrideGistId === 'string' && switchTrip) setCurrentTripId(parsedTrip.id);
        if (!localNeedsSync) {
          setUnsyncedTripIds(prev => prev.filter(id => id !== parsedTrip.id));
        }
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
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncError(error.message || "Failed to pull data from cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentTrip?.gistId, currentTripId]);

  const pushToCloud = useCallback(async (tripId?: string) => {
    const targetId = tripId || currentTripId;
    let targetTrip = appData.trips.find(t => t.id === targetId);
    const token = githubToken?.trim();
    if (!token || !targetTrip?.gistId) return;
    if (!navigator.onLine) {
      setSyncError("Offline: Cannot push data."); 
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      // --- NEW: Timestamp Verification & Conflict Resolution ---
      const checkRes = await fetch(`https://api.github.com/gists/${targetTrip.gistId}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const cloudTripContent = checkData.files['trip.json']?.content;
        if (cloudTripContent) {
          const cloudTrip = JSON.parse(cloudTripContent);
          const cloudLastUpdated = cloudTrip.lastUpdated || '0';
          const lastSynced = targetTrip.lastSynced || '0';
          
          if (cloudLastUpdated > lastSynced) {
            console.warn("Cloud data has been updated since last sync. Aborting push, fetching to merge.");
            setIsSyncing(false);
            await fetchFromCloud(targetTrip.gistId, false);
            return;
          }
        }
      } else if (checkRes.status === 401) {
        throw new Error("401: Invalid GitHub token.");
      } else if (checkRes.status === 404) {
        throw new Error("404: Cloud storage (Gist) not found.");
      }
      // ---------------------------------------------------------

      const payload = { files: { 'trip.json': { content: JSON.stringify(targetTrip, null, 2) } } };
      const res = await fetch(`https://api.github.com/gists/${targetTrip.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.status === 401) throw new Error("401: Invalid GitHub token.");
      if (res.status === 403) throw new Error("403: GitHub token lacks permission or rate limited.");
      if (res.status === 404) throw new Error("404: Cloud storage (Gist) not found.");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to push to gist: ${res.status} ${JSON.stringify(errorData)}`);
      }
      
      // Update lastSynced locally
      setAppData(prev => ({
        ...prev,
        trips: prev.trips.map(t => t.id === targetId ? { ...t, lastSynced: targetTrip!.lastUpdated } : t)
      }));
      
      setUnsyncedTripIds(prev => prev.filter(id => id !== targetId));
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncError(error.message || "Failed to push data to cloud.");
    } finally {
      setIsSyncing(false);
    }
  }, [githubToken, currentTripId, appData.trips, fetchFromCloud]);

  const fetchAllTripsFromCloud = useCallback(async () => {
    const token = githubToken?.trim();
    if (!token) return;
    if (!navigator.onLine) {
      setSyncError("Offline: Cannot pull data.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`https://api.github.com/gists?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (res.status === 401) throw new Error("401: Invalid GitHub token.");
      if (res.status === 403) throw new Error("403: GitHub token lacks permission or rate limited.");
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
      
      const newTrips: Trip[] = [];
      if (Array.isArray(gists)) {
        for (const gist of gists) {
          if (gist.files['trip.json']) {
            try {
              const gistRes = await fetch(gist.url, {
                headers: { 'Authorization': `Bearer ${token}` }
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
            } catch (err) {
              console.warn(`Failed to fetch gist ${gist.id}:`, err);
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
                const currentTripData = updatedTrips[index];
                const mergeArrays = <T extends { id: string }>(localArr: T[] = [], cloudArr: T[] = []) => {
                  const map = new Map<string, T>();
                  cloudArr.forEach(item => map.set(item.id, item)); // cloud first
                  localArr.forEach(item => map.set(item.id, item)); // local overwrites
                  return Array.from(map.values());
                };

                updatedTrips[index] = {
                  ...newTrip,
                  lastUpdated: incomingLastUpdated > currentLastUpdated ? incomingLastUpdated : currentLastUpdated,
                  lastSynced: incomingLastUpdated,
                  users: Array.from(new Set([...(currentTripData.users || []), ...(newTrip.users || [])])),
                  expenses: mergeArrays(currentTripData.expenses, newTrip.expenses),
                  exchanges: mergeArrays(currentTripData.exchanges, newTrip.exchanges),
                  goals: mergeArrays(currentTripData.goals, newTrip.goals),
                  recurringTransactions: mergeArrays(currentTripData.recurringTransactions, newTrip.recurringTransactions),
                  loans: mergeArrays(currentTripData.loans, newTrip.loans),
                  budgets: mergeArrays(currentTripData.budgets, newTrip.budgets),
                };
              }
            } else {
              updatedTrips.push({ ...newTrip, lastSynced: newTrip.lastUpdated });
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
        updateTrip({ ...currentTrip, gistId: data.id, lastSynced: currentTrip.lastUpdated });
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
  }, [currentTrip?.gistId, currentTripId, isOnline, isSyncing, fetchFromCloud]);

  // Auto-Fetch on Wake
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentTrip?.gistId && isOnline && !isSyncing) {
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

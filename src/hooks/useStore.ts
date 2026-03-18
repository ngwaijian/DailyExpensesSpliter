import { useState, useEffect, useCallback } from 'react';
import { AppData, Trip, Expense, Exchange, CATEGORIES } from '../types';
import { GITHUB_TOKEN } from '../config';

const STORAGE_KEY = 'sw_app_data';
const CURRENT_TRIP_KEY = 'sw_current_trip';
const SYNC_KEY = 'sw_needs_sync';
const GITHUB_TOKEN_KEY = 'sw_github_token';

const DEFAULT_DATA: AppData = {
  trips: [{ id: 'trip_' + Date.now(), name: 'My First Trip', users: [], expenses: [], exchanges: [] }]
};

export function useStore() {
  const [appData, setAppData] = useState<AppData>(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
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
  const [needsSync, setNeedsSync] = useState(() => {
    return localStorage.getItem(SYNC_KEY) === 'true';
  });
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
                newTrips[index] = newTrip; // Update existing
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
      setNeedsSync(true);
    }
  }, [appData.trips]);

  // Persist data whenever it changes
  useEffect(() => {
    if (appData.trips.length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    localStorage.setItem(CURRENT_TRIP_KEY, currentTripId);
  }, [appData, currentTripId]);

  // Sync flag
  useEffect(() => {
    localStorage.setItem(SYNC_KEY, String(needsSync));
  }, [needsSync]);

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
    setNeedsSync(true);
  }, [history]);

  const updateTrip = (updatedTrip: Trip) => {
    saveToHistory(appData);
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t)
    }));
    setNeedsSync(true);
  };

  const addTrip = (name: string) => {
    saveToHistory(appData);
    const newTrip: Trip = {
      id: 'trip_' + Date.now(),
      name,
      users: [],
      expenses: [],
      exchanges: [],
      categories: CATEGORIES,
      budgets: []
    };
    setAppData(prev => ({ ...prev, trips: [...prev.trips, newTrip] }));
    setCurrentTripId(newTrip.id);
    setNeedsSync(true);
  };

  const deleteTrip = (id: string) => {
    if (appData.trips.length <= 1) return;
    saveToHistory(appData);
    const newTrips = appData.trips.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, trips: newTrips }));
    setCurrentTripId(newTrips[0].id);
    setNeedsSync(true);
  };

  const renameTrip = (id: string, name: string) => {
    saveToHistory(appData);
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === id ? { ...t, name } : t)
    }));
    setNeedsSync(true);
  };

  // Cloud Sync Logic (Per Trip)
  const fetchFromCloud = useCallback(async (overrideGistId?: string | any) => {
    const targetGistId = typeof overrideGistId === 'string' ? overrideGistId : currentTrip?.gistId;
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
      
      // Check for new per-trip format first
      const tripContent = data.files['trip.json']?.content;
      if (tripContent) {
        const parsedTrip = JSON.parse(tripContent);
        parsedTrip.gistId = targetGistId; // Ensure gistId is set
        setAppData(prev => {
          const exists = prev.trips.some(t => t.id === parsedTrip.id);
          if (exists) {
            return { ...prev, trips: prev.trips.map(t => t.id === parsedTrip.id ? parsedTrip : t) };
          } else {
            return { ...prev, trips: [...prev.trips, parsedTrip] };
          }
        });
        if (typeof overrideGistId === 'string') setCurrentTripId(parsedTrip.id);
        setNeedsSync(false);
      } else {
        // Fallback for legacy global data format
        const content = data.files['data.json']?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.appData) {
            setAppData(parsed.appData);
            setNeedsSync(false);
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

  const pushToCloud = useCallback(async () => {
    if (!githubToken || !currentTrip?.gistId) return;
    if (!navigator.onLine) {
      setSyncError(null); 
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const payload = { files: { 'trip.json': { content: JSON.stringify(currentTrip, null, 2) } } };
      const res = await fetch(`https://api.github.com/gists/${currentTrip.gistId}`, {
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
  }, [githubToken, currentTrip]);

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
              updatedTrips[index] = newTrip;
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
        setNeedsSync(false);
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
      if (needsSync && currentTrip?.gistId) {
        pushToCloud();
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
        pushToCloud();
      }, 2000); // 2 second debounce
      return () => clearTimeout(timer);
    }
  }, [needsSync, githubToken, currentTrip?.gistId, appData, isSyncing, pushToCloud, isOnline]);

  // Background polling (Auto-pull)
  useEffect(() => {
    if (!currentTrip?.gistId || !isOnline) return;

    const interval = setInterval(() => {
      if (!needsSync && !isSyncing) {
        console.log("Auto-syncing: Pulling data from cloud...");
        fetchFromCloud();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentTrip?.gistId, isOnline, needsSync, isSyncing, fetchFromCloud]);

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

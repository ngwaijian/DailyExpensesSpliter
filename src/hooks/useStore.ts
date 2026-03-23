import { useState, useEffect, useCallback } from 'react';
import { AppData, Trip, Expense, Exchange, CATEGORIES } from '../types';
import { GITHUB_TOKEN } from '../config';
import { useCloudSync } from './useCloudSync';

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

  const [unsyncedTripIds, setUnsyncedTripIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SYNC_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [githubToken, setGithubToken] = useState(() => {
    const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
    return (stored || GITHUB_TOKEN || '').trim();
  });
  const [history, setHistory] = useState<AppData[]>([]);

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

  const updateTrip = useCallback((updatedTrip: Trip) => {
    const now = new Date().toISOString();
    const tripWithTimestamp = { ...updatedTrip, lastUpdated: now };
    saveToHistory(appData);
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === updatedTrip.id ? tripWithTimestamp : t)
    }));
    setUnsyncedTripIds(prev => prev.includes(updatedTrip.id) ? prev : [...prev, updatedTrip.id]);
  }, [appData, saveToHistory]);

  const addTrip = useCallback((name: string) => {
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
  }, [appData, saveToHistory]);

  const deleteTrip = useCallback((id: string) => {
    if (appData.trips.length <= 1) return;
    saveToHistory(appData);
    const newTrips = appData.trips.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, trips: newTrips }));
    setCurrentTripId(newTrips[0].id);
    setUnsyncedTripIds(prev => prev.filter(tid => tid !== id));
  }, [appData, saveToHistory]);

  const renameTrip = useCallback((id: string, name: string) => {
    saveToHistory(appData);
    const now = new Date().toISOString();
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === id ? { ...t, name, lastUpdated: now } : t)
    }));
    setUnsyncedTripIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, [appData, saveToHistory]);

  const {
    isSyncing,
    needsSync,
    syncError,
    isOnline,
    fetchFromCloud,
    pushToCloud,
    fetchAllTripsFromCloud,
    createGistForTrip
  } = useCloudSync({
    appData,
    setAppData,
    currentTripId,
    setCurrentTripId,
    githubToken,
    unsyncedTripIds,
    setUnsyncedTripIds,
    updateTrip
  });

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

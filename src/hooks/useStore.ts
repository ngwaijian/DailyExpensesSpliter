import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppData, Trip, CATEGORIES } from '../types';
import { GITHUB_TOKEN } from '../config';
import { useCloudSync } from './useCloudSync';
import { db } from '../lib/db';

const STORAGE_KEY = 'sw_app_data';
const CURRENT_TRIP_KEY = 'sw_current_trip';
const SYNC_KEY = 'sw_unsynced_trips';
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
  const trips = useLiveQuery(() => db.trips.toArray());
  const settings = useLiveQuery(() => db.settings.get('settings'));

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        const count = await db.trips.count();
        if (count === 0) {
          // Migration from localStorage
          const storedData = localStorage.getItem(STORAGE_KEY);
          if (storedData) {
            try {
              const parsed = JSON.parse(storedData);
              if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
                const tripsToSave = parsed.trips.map((t: Trip) => ({
                  ...t,
                  lastUpdated: t.lastUpdated || new Date().toISOString()
                }));
                await db.trips.bulkAdd(tripsToSave);
                
                const storedTripId = localStorage.getItem(CURRENT_TRIP_KEY) || tripsToSave[0].id;
                const storedSync = localStorage.getItem(SYNC_KEY);
                const unsynced = storedSync ? JSON.parse(storedSync) : [];
                const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY) || GITHUB_TOKEN || '';
                
                await db.settings.put({
                  id: 'settings',
                  currentTripId: storedTripId,
                  unsyncedTripIds: unsynced,
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
          await db.trips.add(DEFAULT_DATA.trips[0]);
          await db.settings.put({
            id: 'settings',
            currentTripId: DEFAULT_DATA.trips[0].id,
            unsyncedTripIds: [],
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
  const appData: AppData = useMemo(() => ({ trips: trips || DEFAULT_DATA.trips }), [trips]);
  const currentTripId = settings?.currentTripId || DEFAULT_DATA.trips[0].id;
  const unsyncedTripIds = settings?.unsyncedTripIds || [];
  const githubToken = settings?.githubToken || (GITHUB_TOKEN || '').trim();

  // For useCloudSync compatibility, we still write SYNC_KEY to localStorage
  // because useCloudSync reads it directly in setInterval to avoid stale closures.
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(SYNC_KEY, JSON.stringify(unsyncedTripIds));
    }
  }, [unsyncedTripIds, isInitialized]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // We don't need to handle STORAGE_KEY or CURRENT_TRIP_KEY anymore as Dexie + useLiveQuery handles cross-tab reactivity for IndexedDB.
      // However, we still sync SYNC_KEY because useCloudSync relies on it.
      if (e.key === SYNC_KEY && e.newValue) {
        try {
          const newUnsynced = JSON.parse(e.newValue);
          db.settings.update('settings', { unsyncedTripIds: newUnsynced });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setAppData = useCallback((value: React.SetStateAction<AppData>) => {
    db.transaction('rw', db.trips, async () => {
      const currentTrips = await db.trips.toArray();
      const currentAppData = { trips: currentTrips };
      const newAppData = typeof value === 'function' ? value(currentAppData) : value;
      
      const newTripIds = new Set(newAppData.trips.map(t => t.id));
      const tripsToDelete = currentTrips.filter(t => !newTripIds.has(t.id)).map(t => t.id);
      
      if (tripsToDelete.length > 0) {
        await db.trips.bulkDelete(tripsToDelete);
      }
      await db.trips.bulkPut(newAppData.trips);
    });
  }, []);

  const setCurrentTripId = useCallback((value: React.SetStateAction<string>) => {
    db.transaction('rw', db.settings, async () => {
      const currentSettings = await db.settings.get('settings');
      const currentId = currentSettings?.currentTripId || DEFAULT_DATA.trips[0].id;
      const newId = typeof value === 'function' ? value(currentId) : value;
      
      if (currentSettings) {
        await db.settings.update('settings', { currentTripId: newId });
      } else {
        await db.settings.put({
          id: 'settings',
          currentTripId: newId,
          unsyncedTripIds: [],
          githubToken: (GITHUB_TOKEN || '').trim()
        });
      }
    });
  }, []);

  const setUnsyncedTripIds = useCallback((value: React.SetStateAction<string[]>) => {
    db.transaction('rw', db.settings, async () => {
      const currentSettings = await db.settings.get('settings');
      const currentIds = currentSettings?.unsyncedTripIds || [];
      const newIds = typeof value === 'function' ? value(currentIds) : value;
      
      if (currentSettings) {
        await db.settings.update('settings', { unsyncedTripIds: newIds });
      } else {
        await db.settings.put({
          id: 'settings',
          currentTripId: DEFAULT_DATA.trips[0].id,
          unsyncedTripIds: newIds,
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
          currentTripId: DEFAULT_DATA.trips[0].id,
          unsyncedTripIds: [],
          githubToken: newToken
        });
      }
    });
  }, []);

  const currentTrip = useMemo(() => appData.trips.find(t => t.id === currentTripId) || appData.trips[0], [appData.trips, currentTripId]);

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
    setUnsyncedTripIds(prev => prev.includes(currentTripId) ? prev : [...prev, currentTripId]);
  }, [history, currentTripId, setAppData, setUnsyncedTripIds]);

  const updateTrip = useCallback((updatedTrip: Trip) => {
    const now = new Date().toISOString();
    const tripWithTimestamp = { ...updatedTrip, lastUpdated: now };
    saveToHistory(appData);
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === updatedTrip.id ? tripWithTimestamp : t)
    }));
    setUnsyncedTripIds(prev => prev.includes(updatedTrip.id) ? prev : [...prev, updatedTrip.id]);
  }, [appData, saveToHistory, setAppData, setUnsyncedTripIds]);

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
  }, [appData, saveToHistory, setAppData, setCurrentTripId, setUnsyncedTripIds]);

  const deleteTrip = useCallback((id: string) => {
    if (appData.trips.length <= 1) return;
    saveToHistory(appData);
    const newTrips = appData.trips.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, trips: newTrips }));
    setCurrentTripId(newTrips[0].id);
    setUnsyncedTripIds(prev => prev.filter(tid => tid !== id));
  }, [appData, saveToHistory, setAppData, setCurrentTripId, setUnsyncedTripIds]);

  const renameTrip = useCallback((id: string, name: string) => {
    saveToHistory(appData);
    const now = new Date().toISOString();
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === id ? { ...t, name, lastUpdated: now } : t)
    }));
    setUnsyncedTripIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, [appData, saveToHistory, setAppData, setUnsyncedTripIds]);

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

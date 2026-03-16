import { useState, useEffect, useCallback } from 'react';
import { AppData, Trip, Expense, Exchange } from '../types';
import { getAverageRates } from '../utils/currency';
import { GITHUB_TOKEN } from '../config';

const STORAGE_KEY = 'sw_app_data';
const CURRENT_TRIP_KEY = 'sw_current_trip';
const SYNC_KEY = 'sw_needs_sync';
const GITHUB_TOKEN_KEY = 'sw_github_token';

const DEFAULT_DATA: AppData = {
  trips: [{ id: 'trip_' + Date.now(), name: 'My First Trip', users: [], expenses: [], exchanges: [] }]
};

export function useStore() {
  const [appData, setAppData] = useState<AppData>(DEFAULT_DATA);
  const [currentTripId, setCurrentTripId] = useState<string>('');
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
    const storedTripId = localStorage.getItem(CURRENT_TRIP_KEY);
    const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
    const storedSync = localStorage.getItem(SYNC_KEY) === 'true';

    if (storedData) {
      setAppData(JSON.parse(storedData));
    }
    if (storedTripId) {
      setCurrentTripId(storedTripId);
    } else if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.trips.length > 0) setCurrentTripId(parsed.trips[0].id);
    }

    if (storedToken) setGithubToken(storedToken);
    setNeedsSync(storedSync);
  }, []);

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

  const updateTrip = (updatedTrip: Trip) => {
    setAppData(prev => ({
      ...prev,
      trips: prev.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t)
    }));
    setNeedsSync(true);
  };

  const addTrip = (name: string) => {
    const newTrip: Trip = {
      id: 'trip_' + Date.now(),
      name,
      users: [],
      expenses: [],
      exchanges: []
    };
    setAppData(prev => ({ ...prev, trips: [...prev.trips, newTrip] }));
    setCurrentTripId(newTrip.id);
    setNeedsSync(true);
  };

  const deleteTrip = (id: string) => {
    if (appData.trips.length <= 1) return;
    const newTrips = appData.trips.filter(t => t.id !== id);
    setAppData(prev => ({ ...prev, trips: newTrips }));
    setCurrentTripId(newTrips[0].id);
    setNeedsSync(true);
  };

  const renameTrip = (id: string, name: string) => {
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
    if (navigator.onLine && currentTrip?.gistId && !isSyncing) {
        if (needsSync) {
            pushToCloud();
        } else {
            fetchFromCloud();
        }
    }
  }, [githubToken, currentTrip?.gistId]); // Run when credentials change or trip changes

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
    createGistForTrip
  };
}

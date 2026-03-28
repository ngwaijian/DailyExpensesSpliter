import { useState, useEffect } from 'react';
import { Ledger, CATEGORIES, Category } from '../types';

interface UseUrlShortcutsProps {
  currentLedger: Ledger | null;
  updateLedger: (ledger: Ledger) => void;
  t: (key: string, fallback?: string) => string;
}

export function useUrlShortcuts({ currentLedger, updateLedger, t }: UseUrlShortcutsProps) {
  const [shortcutAmount, setShortcutAmount] = useState<number | null>(null);
  const [shortcutCategory, setShortcutCategory] = useState<string | null>(null);
  const [shortcutDesc, setShortcutDesc] = useState<string | null>(null);
  const [shortcutCurrency, setShortcutCurrency] = useState<string | null>(null);
  const [shortcutGoalId, setShortcutGoalId] = useState<string | null>(null);
  const [shortcutSplitAmong, setShortcutSplitAmong] = useState<string[] | null>(null);
  const [shortcutPaidBy, setShortcutPaidBy] = useState<string | null>(null);
  const [shortcutSubCategory, setShortcutSubCategory] = useState<string | null>(null);
  const [shortcutLocName, setShortcutLocName] = useState<string | null>(null);
  const [shortcutLat, setShortcutLat] = useState<number | null>(null);
  const [shortcutLng, setShortcutLng] = useState<number | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Helper to get parameter case-insensitively
    const getParam = (names: string[]) => {
      for (const name of names) {
        const val = params.get(name) || params.get(name.toLowerCase()) || params.get(name.charAt(0).toUpperCase() + name.slice(1));
        if (val) return val;
      }
      return null;
    };

    const amount = getParam(['amount', 'amt']);
    const category = getParam(['category', 'cat', 'type']);
    const desc = getParam(['desc', 'description', 'note']);
    const currency = getParam(['currency', 'curr']);
    const goalId = getParam(['goalId', 'goal']);
    const autoSaveRaw = getParam(['autoSave']);
    const autoSave = autoSaveRaw ? autoSaveRaw.toLowerCase() === 'true' : false;
    const splitAmongParam = getParam(['splitAmong', 'split', 'split_among', 'users']);
    const paidByParam = getParam(['paidBy', 'payer', 'paid_by', 'paidby']);
    const subCategory = getParam(['subCategory', 'subcat']);
    const locName = getParam(['locName', 'location', 'loc']);
    const lat = getParam(['lat', 'latitude']);
    const lng = getParam(['lng', 'lon', 'longitude']);
    
    if (!currentLedger) return;

    let shouldClear = false;

    // --- Parse paidBy ---
    let parsedPaidBy = paidByParam;
    if (paidByParam) {
      const paidByLower = paidByParam.toLowerCase();
      const matchedUser = currentLedger.users.find(u => u.toLowerCase() === paidByLower);
      if (matchedUser) {
        parsedPaidBy = matchedUser;
      }
    }

    // --- Parse splitAmong ---
    let parsedSplitAmong: string[] | null = null;
    if (splitAmongParam) {
      if (splitAmongParam.includes(',')) {
        parsedSplitAmong = splitAmongParam.split(',').map(u => u.trim()).filter(Boolean);
      } else {
        // Filter currentLedger.users to see which existing user names are included in the raw string
        const rawLower = splitAmongParam.toLowerCase();
        const matchedUsers = currentLedger.users.filter(u => rawLower.includes(u.toLowerCase()));
        if (matchedUsers.length > 0) {
          parsedSplitAmong = matchedUsers;
        } else {
          parsedSplitAmong = splitAmongParam.split(' ').map(u => u.trim()).filter(Boolean);
        }
      }
    }

    // --- Category Matching ---
    const ledgerCategories = (currentLedger.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);
    let cleanCategory: Category = ledgerCategories[0]; // Default to first category
    let matchedCategory = false;

    if (category) {
      const rawCategory = category.split(',')[0].trim();
      const normalizedRaw = rawCategory.toLowerCase();
      
      // Try exact match first
      let match = ledgerCategories.find(c => {
        const translated = t(`cat_${c.name}`, c.name).toLowerCase();
        return c.name.toLowerCase() === normalizedRaw || translated === normalizedRaw;
      });
      
      // Then try fuzzy match
      if (!match) {
        match = ledgerCategories.find(c => {
          const lowerC = c.name.toLowerCase();
          const translated = t(`cat_${c.name}`, c.name).toLowerCase();
          const nameOnly = lowerC.replace(/^[^\s]+\s/, '').trim();
          const translatedNameOnly = translated.replace(/^[^\s]+\s/, '').trim();
          
          return lowerC.includes(normalizedRaw) || 
                 translated.includes(normalizedRaw) ||
                 normalizedRaw.includes(nameOnly) ||
                 normalizedRaw.includes(translatedNameOnly) ||
                 (nameOnly.length > 2 && nameOnly.includes(normalizedRaw)) ||
                 (translatedNameOnly.length > 2 && translatedNameOnly.includes(normalizedRaw));
        });
      }
      if (match) {
        cleanCategory = match;
        matchedCategory = true;
      }
      shouldClear = true;
    }

    // --- SubCategory Guessing ---
    let finalSubCategory = subCategory;
    if (desc && !finalSubCategory) {
      const subCategories = cleanCategory.subCategories || [];
      const descLower = desc.toLowerCase();
      for (const sub of subCategories) {
        const subLower = sub.toLowerCase();
        if (descLower.includes(subLower) || subLower.includes(descLower)) {
          finalSubCategory = sub;
          break;
        }
      }
    }

    if (autoSave && amount) {
      const parsedAmount = parseFloat(amount);
      if (!isNaN(parsedAmount)) {
        const paidBy = parsedPaidBy || (currentLedger.users.length > 0 ? currentLedger.users[0] : 'Me');
        
        let splitAmong = currentLedger.users.length > 0 ? currentLedger.users : ['Me'];
        if (parsedSplitAmong && parsedSplitAmong.length > 0) {
          splitAmong = parsedSplitAmong;
        }

        // Handle timezone offset formatting
        const now = new Date();
        const tzo = -now.getTimezoneOffset();
        const dif = tzo >= 0 ? '+' : '-';
        const pad = (num: number) => {
            const norm = Math.floor(Math.abs(num));
            return (norm < 10 ? '0' : '') + norm;
        };
        const isoString = now.getFullYear() +
            '-' + pad(now.getMonth() + 1) +
            '-' + pad(now.getDate()) +
            'T' + pad(now.getHours()) +
            ':' + pad(now.getMinutes()) +
            ':' + pad(now.getSeconds()) +
            dif + pad(tzo / 60) +
            ':' + pad(tzo % 60);

        let locationObj = undefined;
        if (locName || lat || lng) {
          const parsedLat = lat ? parseFloat(lat) : undefined;
          const parsedLng = lng ? parseFloat(lng) : undefined;
          locationObj = {
            name: locName || '',
            lat: parsedLat && !isNaN(parsedLat) ? parsedLat : undefined,
            lng: parsedLng && !isNaN(parsedLng) ? parsedLng : undefined
          };
        }

        const newExpense = {
          id: Date.now().toString(),
          desc: desc || cleanCategory.name || 'Quick Add',
          amountOriginal: parsedAmount,
          currency: currency || 'MYR',
          category: cleanCategory,
          subCategory: finalSubCategory || undefined,
          date: isoString,
          paidBy,
          splitAmong,
          type: 'expense' as const,
          goalId: goalId || undefined,
          location: locationObj,
        };
        
        const updatedLedgerData = {
          ...currentLedger,
          expenses: [newExpense, ...currentLedger.expenses]
        };
        
        updateLedger(updatedLedgerData);
        
        // Synchronous failsafe for localStorage
        try {
          const stored = localStorage.getItem('sw_app_data');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.ledgers) {
              parsed.ledgers = parsed.ledgers.map((l: any) => l.id === currentLedger.id ? updatedLedgerData : l);
              localStorage.setItem('sw_app_data', JSON.stringify(parsed));
            }
          }
        } catch (e) {
          console.error('Failsafe sync error:', e);
        }
        
        window.history.replaceState({}, '', window.location.pathname);
        setIsAutoSaved(true);
        setTimeout(() => {
          alert('Expense saved! You can close this Safari tab.');
        }, 400);
        return;
      }
    }

    if (amount) {
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        setShortcutAmount(parsed);
        shouldClear = true;
      }
    }
    
    if (matchedCategory) {
      setShortcutCategory(cleanCategory.name);
    }

    if (goalId) {
      setShortcutGoalId(goalId);
      shouldClear = true;
    }

    if (desc) {
      setShortcutDesc(desc);
      shouldClear = true;
    }

    if (currency) {
      setShortcutCurrency(currency);
      shouldClear = true;
    }

    if (parsedSplitAmong && parsedSplitAmong.length > 0) {
      setShortcutSplitAmong(parsedSplitAmong);
      shouldClear = true;
    }

    if (parsedPaidBy) {
      setShortcutPaidBy(parsedPaidBy);
      shouldClear = true;
    }

    if (finalSubCategory) {
      setShortcutSubCategory(finalSubCategory);
      shouldClear = true;
    }

    if (locName) {
      setShortcutLocName(locName);
      shouldClear = true;
    }

    if (lat) {
      const parsedLat = parseFloat(lat);
      if (!isNaN(parsedLat)) {
        setShortcutLat(parsedLat);
        shouldClear = true;
      }
    }

    if (lng) {
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLng)) {
        setShortcutLng(parsedLng);
        shouldClear = true;
      }
    }

    if (shouldClear) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentLedger?.id, currentLedger?.users, currentLedger?.expenses, updateLedger, t]);

  const clearShortcuts = () => {
    setShortcutAmount(null);
    setShortcutCategory(null);
    setShortcutDesc(null);
    setShortcutCurrency(null);
    setShortcutGoalId(null);
    setShortcutSplitAmong(null);
    setShortcutPaidBy(null);
    setShortcutSubCategory(null);
    setShortcutLocName(null);
    setShortcutLat(null);
    setShortcutLng(null);
  };

  return {
    shortcutAmount,
    shortcutCategory,
    shortcutDesc,
    shortcutCurrency,
    shortcutGoalId,
    shortcutSplitAmong,
    shortcutPaidBy,
    shortcutSubCategory,
    shortcutLocName,
    shortcutLat,
    shortcutLng,
    isAutoSaved,
    clearShortcuts
  };
}

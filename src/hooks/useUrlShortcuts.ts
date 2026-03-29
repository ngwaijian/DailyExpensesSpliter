import { useState, useEffect, useRef } from 'react';
import { Ledger, CATEGORIES, Category } from '../types';
import { db } from '../lib/db';

interface UseUrlShortcutsProps {
  currentLedger: Ledger | null;
  updateLedger: (ledger: Ledger) => void;
  t: (key: string, fallback?: string) => string;
  pushToCloud: (id?: string, overrideLedger?: Ledger) => Promise<void>;
}

export function useUrlShortcuts({ currentLedger, updateLedger, t, pushToCloud }: UseUrlShortcutsProps) {
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
  const hasProcessedShortcut = useRef(false);

  useEffect(() => {
    if (hasProcessedShortcut.current) return;
	 if (!currentLedger) return; // <--- ADD THIS: Wait for the database to load the ledger
    const params = new URLSearchParams(window.location.search);
    
    // Helper to get parameter case-insensitively
    const getParam = (names: string[]) => {
      const lowerNames = names.map(n => n.toLowerCase());
      for (const [key, value] of params.entries()) {
        if (lowerNames.includes(key.toLowerCase())) {
          return value.replace(/^=+/, '');
        }
      }
      return null;
    };
	
	// --- ADD THIS NEW HELPER ---
    // Helper to safely extract arrays (handles ?split=A&split=B AND ?split=A,B)
    const getArrayParam = (names: string[]) => {
      const lowerNames = names.map(n => n.toLowerCase());
      let results: string[] = [];
      for (const [key, value] of params.entries()) {
        if (lowerNames.includes(key.toLowerCase()) || lowerNames.includes(key.toLowerCase().replace(/\[\]$/, ''))) {
          const cleanedValue = value.replace(/^=+/, '');
          // Split by comma in case they passed "A,B", then trim spaces
          const parts = cleanedValue.split(',').map(s => s.trim()).filter(Boolean);
          results = [...results, ...parts];
        }
      }
      return results;
    };
    // ---------------------------

    const amount = getParam(['amount', 'amt']);
    const category = getParam(['category', 'cat', 'type']);
    const desc = getParam(['desc', 'description', 'note']);
    const currency = getParam(['currency', 'curr']);
    const goalId = getParam(['goalId', 'goal']);
    const autoSaveRaw = getParam(['autoSave']);
    const autoSave = autoSaveRaw ? autoSaveRaw.toLowerCase().includes('true') : false;
    
    // --- USE THE NEW HELPER ---
    const parsedSplit = getArrayParam(['splitAmong', 'split', 'split_among', 'users']);
    let parsedSplitAmong: string[] | null = parsedSplit.length > 0 ? parsedSplit : null;
    // --------------------------
    
    const paidByParam = getParam(['paidBy', 'payer', 'paid_by', 'paidby']);
	
	    // --- MISSING DECLARATIONS FIX ---
    const parsedPaidBy = paidByParam;
    const subCategory = getParam(['subCategory', 'subcat', 'sub']);
    const locName = getParam(['locName', 'location', 'loc']);
    const lat = getParam(['lat', 'latitude']);
    const lng = getParam(['lng', 'longitude']);
    let shouldClear = false;
    // --------------------------------

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
      let finalAmountStr = amount.toString();
      try {
        if (/^[0-9+\-*/().\s,.]+$/.test(finalAmountStr)) {
          // eslint-disable-next-line no-eval
          finalAmountStr = eval(finalAmountStr.replace(/[^0-9+\-*/.]/g, '')).toString();
        }
      } catch (e) {
        // Ignore eval errors
      }

      const parsedAmount = parseFloat(finalAmountStr);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        const paidBy = parsedPaidBy || (currentLedger.users.length > 0 ? currentLedger.users[0] : 'Me');
        
        const finalSplitAmong = parsedSplit.length > 0 ? parsedSplit : (currentLedger.users.length > 0 ? currentLedger.users : ['Me']);

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

        let finalDesc = desc ? desc.trim() : '';
        if (!finalDesc) {
          if (finalSubCategory) {
            finalDesc = finalSubCategory;
          } else if (cleanCategory.name) {
            finalDesc = cleanCategory.name;
          } else {
            finalDesc = 'Quick Add';
          }
        }

        const newExpense = {
          id: Date.now().toString(),
          desc: finalDesc,
          amountOriginal: parsedAmount,
          currency: (currency || 'MYR').toUpperCase(),
          category: cleanCategory,
          subCategory: finalSubCategory || undefined,
          date: isoString,
          paidBy,
          splitAmong: finalSplitAmong,
          type: 'expense' as const,
          goalId: goalId || undefined,
          location: locationObj,
        };
        
        const updatedLedgerData = {
          ...currentLedger,
          expenses: [newExpense, ...currentLedger.expenses],
          lastUpdated: new Date().toISOString()
        };
        
        const saveAndExit = async () => {
          hasProcessedShortcut.current = true;
          
          try {
            // Asynchronous failsafe for IndexedDB to ensure data is written before the tab closes
            await db.ledgers.put(updatedLedgerData);
            
            // Also update local storage as fallback
            try {
              const s = localStorage.getItem('sw_app_data');
              if (s) {
                const p = JSON.parse(s);
                if (p.ledgers) {
                  p.ledgers = p.ledgers.map((t: any) => t.id === currentLedger.id ? { ...t, expenses: [newExpense, ...t.expenses] } : t);
                  localStorage.setItem('sw_app_data', JSON.stringify(p));
                }
              }
            } catch(e) {}
            
            updateLedger(updatedLedgerData);
            window.history.replaceState({}, '', window.location.pathname);
            setIsAutoSaved(true);
            
            // Push to cloud in the background without triggering a system alert
            pushToCloud(currentLedger.id, updatedLedgerData).catch((err) => {
              console.error('Background sync error:', err);
            });
          } catch (e) {
            console.error('Failsafe sync error:', e);
            alert('Failed to save expense to database. Please try again.');
          }
        };
        
        saveAndExit();
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
      hasProcessedShortcut.current = true;
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentLedger?.id, currentLedger?.users, currentLedger?.expenses, updateLedger, t, pushToCloud]);

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

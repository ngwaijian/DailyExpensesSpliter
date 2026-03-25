import { useState, useEffect } from 'react';
import { Trip, CATEGORIES, Category } from '../types';

interface UseUrlShortcutsProps {
  currentTrip: Trip | null;
  updateTrip: (trip: Trip) => void;
  t: (key: string, fallback?: string) => string;
}

export function useUrlShortcuts({ currentTrip, updateTrip, t }: UseUrlShortcutsProps) {
  const [shortcutAmount, setShortcutAmount] = useState<number | null>(null);
  const [shortcutCategory, setShortcutCategory] = useState<string | null>(null);
  const [shortcutDesc, setShortcutDesc] = useState<string | null>(null);
  const [shortcutCurrency, setShortcutCurrency] = useState<string | null>(null);
  const [shortcutGoalId, setShortcutGoalId] = useState<string | null>(null);
  const [shortcutSplitAmong, setShortcutSplitAmong] = useState<string[] | null>(null);
  const [shortcutPaidBy, setShortcutPaidBy] = useState<string | null>(null);
  const [shortcutSubCategory, setShortcutSubCategory] = useState<string | null>(null);

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
    const autoSave = getParam(['autoSave']) === 'true';
    const splitAmongParam = getParam(['splitAmong', 'split']);
    const paidByParam = getParam(['paidBy', 'payer', 'who']);
    const subCategory = getParam(['subCategory', 'subcat']);
    
    if (!currentTrip) return;

    let shouldClear = false;

    // --- Category Matching ---
    const tripCategories = (currentTrip.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);
    let cleanCategory: Category = tripCategories[0]; // Default to first category
    let matchedCategory = false;

    if (category) {
      const rawCategory = category.split(',')[0].trim();
      const normalizedRaw = rawCategory.toLowerCase();
      
      // Try exact match first
      let match = tripCategories.find(c => {
        const translated = t(`cat_${c.name}`, c.name).toLowerCase();
        return c.name.toLowerCase() === normalizedRaw || translated === normalizedRaw;
      });
      
      // Then try fuzzy match
      if (!match) {
        match = tripCategories.find(c => {
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
        const paidBy = paidByParam || (currentTrip.users.length > 0 ? currentTrip.users[0] : 'Me');
        
        let splitAmong = currentTrip.users.length > 0 ? currentTrip.users : ['Me'];
        if (splitAmongParam) {
          const splitUsers = splitAmongParam.split(',').map(u => u.trim()).filter(Boolean);
          if (splitUsers.length > 0) {
            splitAmong = splitUsers;
          }
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
        };
        
        updateTrip({
          ...currentTrip,
          expenses: [newExpense, ...currentTrip.expenses]
        });
        
        window.history.replaceState({}, '', window.location.pathname);
        setTimeout(() => {
          alert('Expense saved! You can close this Safari tab.');
        }, 100);
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

    if (splitAmongParam) {
      const splitUsers = splitAmongParam.split(',').map(u => u.trim()).filter(Boolean);
      if (splitUsers.length > 0) {
        setShortcutSplitAmong(splitUsers);
        shouldClear = true;
      }
    }

    if (paidByParam) {
      setShortcutPaidBy(paidByParam);
      shouldClear = true;
    }

    if (finalSubCategory) {
      setShortcutSubCategory(finalSubCategory);
      shouldClear = true;
    }

    if (shouldClear) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentTrip?.id, currentTrip?.users, currentTrip?.expenses, updateTrip, t]);

  const clearShortcuts = () => {
    setShortcutAmount(null);
    setShortcutCategory(null);
    setShortcutDesc(null);
    setShortcutCurrency(null);
    setShortcutGoalId(null);
    setShortcutSplitAmong(null);
    setShortcutPaidBy(null);
    setShortcutSubCategory(null);
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
    clearShortcuts
  };
}

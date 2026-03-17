import React, { useState, useEffect, useMemo } from 'react';
import { Trip, CATEGORIES } from '../../types';
import { CATEGORY_COLORS, CATEGORY_STRIP_COLORS } from '../../constants';
import { Calendar, Tag, DollarSign, Users, X, Calculator, MapPin, Loader2, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAverageRates, formatCurrency } from '../../utils/currency';
import { calculateBalances, getSimplifiedDebts } from '../../utils/balances';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../hooks/useStore';
import { CategoryManager } from '../settings/CategoryManager';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ExpenseFormProps {
  trip: Trip;
  onSubmit: (expenseData: any) => void;
  onCancel: () => void;
  initialData?: any;
  onUpdateTrip: (trip: Trip) => void;
}

// Component to handle map clicks and updates
function LocationMarker({ position, setPosition }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} draggable={true} eventHandlers={{
      dragend: (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        setPosition(position);
      },
    }} />
  );
}

const formatDateTime = (d?: string) => {
  if (d) {
    if (d.includes('T')) return d.slice(0, 16);
    return `${d}T12:00`;
  }
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function ExpenseForm({ trip, onSubmit, onCancel, initialData, onUpdateTrip }: ExpenseFormProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income' | 'sponsorship' | 'settlement'>(initialData?.type || 'expense');
  const [desc, setDesc] = useState(initialData?.desc || '');
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [amount, setAmount] = useState(initialData?.amountOriginal || '');
  const [currency, setCurrency] = useState(initialData?.currency || 'MYR');
  const tripCategories = trip.categories || CATEGORIES;
  const [category, setCategory] = useState(initialData?.category || tripCategories[0]);
  const [date, setDate] = useState(formatDateTime(initialData?.date));
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || (trip.users.includes('Jian') ? 'Jian' : (trip.users.length > 0 ? trip.users[0] : '')));
  const [splitAmong, setSplitAmong] = useState<string[]>(initialData?.splitAmong || trip.users);
  const [splitMode, setSplitMode] = useState<'equal' | 'unequal' | 'shares'>(initialData?.splitDetails ? 'unequal' : 'equal');
  const [splitDetails, setSplitDetails] = useState<{ [key: string]: number | string }>(initialData?.splitDetails || {});
  const [splitShares, setSplitShares] = useState<{ [key: string]: number }>({});
  const [goalId, setGoalId] = useState<string>(initialData?.goalId || '');

  // Update splitDetails when amount changes in equal or shares mode
  useEffect(() => {
    if (splitMode === 'equal' && amount && !isNaN(parseFloat(amount)) && splitAmong.length > 0) {
      const total = parseFloat(amount);
      const perPerson = total / splitAmong.length;
      const newDetails: { [key: string]: number } = {};
      splitAmong.forEach(user => {
        newDetails[user] = perPerson;
      });
      setSplitDetails(newDetails);
    } else if (splitMode === 'shares' && amount && !isNaN(parseFloat(amount)) && splitAmong.length > 0) {
      const total = parseFloat(amount);
      const totalShares = splitAmong.reduce((sum, user) => sum + (splitShares[user] ?? 1), 0);
      
      const newDetails: { [key: string]: number } = {};
      
      if (totalShares > 0) {
        const perShare = total / totalShares;
        let distributed = 0;
        let firstUserWithShares: string | null = null;
        
        splitAmong.forEach(user => {
          const shares = splitShares[user] ?? 1;
          if (shares > 0 && !firstUserWithShares) firstUserWithShares = user;
          const userAmount = Math.floor((shares * perShare) * 100) / 100;
          newDetails[user] = userAmount;
          distributed += userAmount;
        });
        
        const diff = total - distributed;
        if (firstUserWithShares && Math.abs(diff) > 0.001) {
          newDetails[firstUserWithShares] = Number((newDetails[firstUserWithShares] + diff).toFixed(2));
        }
      } else {
        splitAmong.forEach(user => newDetails[user] = 0);
      }
      
      setSplitDetails(newDetails);
    }
  }, [amount, splitAmong, splitMode, splitShares]);

  // Suggested settlement amount logic
  const suggestedAmount = useMemo(() => {
    if (type !== 'settlement' || !paidBy || splitAmong.length === 0) return null;
    
    const receiver = splitAmong[0];
    if (paidBy === receiver) return null;

    const balances = calculateBalances(trip);
    const transactions = getSimplifiedDebts(balances);
    
    // Find if there's a debt from paidBy to receiver
    const debt = transactions.find(t => t.from === paidBy && t.to === receiver);
    
    if (debt) {
      // If the currency is not MYR, we need to convert the debt back to the original currency
      // using the average rate for that currency.
      if (currency === 'MYR') return debt.amount;
      
      const rates = getAverageRates(trip);
      const rate = rates[currency] || 1;
      return debt.amount / rate;
    }
    
    return null;
  }, [type, paidBy, splitAmong, trip, currency]);

  // Get unique descriptions from existing expenses for autocomplete
  const descriptionSuggestions = useMemo(() => {
    const descs = trip.expenses.map(e => e.desc);
    return Array.from(new Set(descs)).filter(d => d.length > 0).sort();
  }, [trip.expenses]);

  const [showCalculator, setShowCalculator] = useState(false);
  
  const [locationName, setLocationName] = useState(initialData?.location?.name || '');
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | undefined>(
    initialData?.location?.lat ? {lat: initialData.location.lat, lng: initialData.location.lng} : undefined
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showMap, setShowMap] = useState(!!initialData?.location?.lat);
  const [isSponsored, setIsSponsored] = useState(initialData?.isSponsored || false);
  const [isSettled, setIsSettled] = useState(initialData?.isSettled || false);
  const [sponsoredBy, setSponsoredBy] = useState(initialData?.sponsoredBy || '');

  const rates = useMemo(() => getAverageRates(trip), [trip]);

  const currentMyrEquivalent = useMemo(() => {
    if (currency === 'MYR') return null;
    
    try {
      const sanitized = amount.toString().replace(/[^0-9+\-*/().\s]/g, '');
      if (!sanitized) return null;
      // eslint-disable-next-line no-new-func
      const parsedAmount = new Function('return ' + sanitized)();
      if (!isFinite(parsedAmount) || parsedAmount <= 0) return null;
      
      const rate = rates[currency] || 1;
      return parsedAmount * rate;
    } catch (e) {
      return null;
    }
  }, [amount, currency, rates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!desc.trim()) {
      alert('Please enter a description.');
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }
    if (!date) {
      alert('Please select a date.');
      return;
    }
    if (!paidBy) {
      alert(type === 'sponsorship' ? 'Please select a sponsor.' : 'Please select who paid.');
      return;
    }
    if (splitAmong.length === 0) {
      if (type === 'sponsorship') {
        alert('Please select at least one beneficiary.');
        return;
      } else if (!isSponsored) {
        alert('Please select at least one person to split the cost with.');
        return;
      }
    }

    let finalSplitDetails: { [key: string]: number } | undefined = undefined;

    if (type === 'expense' && (splitMode === 'unequal' || splitMode === 'shares')) {
      const totalSplit = Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0);
      const totalAmount = parseFloat(amount);
      
      if (Math.abs(totalSplit - totalAmount) > 0.1) {
        alert(`The sum of split amounts (${totalSplit.toFixed(2)}) must equal the total amount (${totalAmount.toFixed(2)}). Difference: ${(totalAmount - totalSplit).toFixed(2)}`);
        return;
      }
      // Filter out 0 amounts and ensure only selected users are included
      finalSplitDetails = {};
      splitAmong.forEach(user => {
        const val = parseFloat(splitDetails[user]?.toString() || '0');
        if (val > 0) {
          finalSplitDetails![user] = val;
        }
      });
    }

    onSubmit({
      desc: desc.trim(),
      memo: memo.trim() || undefined,
      amountOriginal: parseFloat(amount),
      currency: currency.toUpperCase(),
      category,
      date,
      paidBy,
      splitAmong,
      isSponsored,
      isSettled,
      sponsoredBy: isSponsored ? (sponsoredBy || paidBy) : undefined,
      type,
      splitDetails: finalSplitDetails,
      goalId: goalId || undefined,
      location: locationName ? {
        name: locationName,
        ...locationCoords
      } : undefined
    });
    // Reset form if not editing
    if (!initialData) {
      handleReset();
    }
  };

  const handleReset = () => {
    if (initialData) {
      setDesc(initialData.desc || '');
      setMemo(initialData.memo || '');
      setAmount(initialData.amountOriginal || '');
      setCurrency(initialData.currency || 'MYR');
      setCategory(initialData.category || CATEGORIES[0]);
      setDate(formatDateTime(initialData.date));
      setPaidBy(initialData.paidBy || (trip.users.length > 0 ? trip.users[0] : ''));
      setSplitAmong(initialData.splitAmong || trip.users);
      setLocationName(initialData.location?.name || '');
      setLocationCoords(initialData.location?.lat ? {lat: initialData.location.lat, lng: initialData.location.lng} : undefined);
      setShowMap(!!initialData.location?.lat);
      setIsSponsored(initialData.isSponsored || false);
      setIsSettled(initialData.isSettled || false);
      setSponsoredBy(initialData.sponsoredBy || '');
      setType(initialData.type || 'expense');
      setSplitMode(initialData.splitDetails ? 'unequal' : 'equal');
      setSplitDetails(initialData.splitDetails || {});
      setSplitShares({});
    } else {
      setDesc('');
      setMemo('');
      setAmount('');
      setCurrency('MYR');
      setCategory(CATEGORIES[0]);
      setDate(formatDateTime());
      setPaidBy(trip.users.length > 0 ? trip.users[0] : '');
      setSplitAmong(trip.users);
      setLocationName('');
      setLocationCoords(undefined);
      setShowMap(false);
      setIsSponsored(false);
      setIsSettled(false);
      setSponsoredBy('');
      setType('expense');
      setSplitMode('equal');
      setSplitDetails({});
      setSplitShares({});
    }
  };

  const toggleUser = (user: string) => {
    if (splitAmong.includes(user)) {
      setSplitAmong(splitAmong.filter(u => u !== user));
    } else {
      setSplitAmong([...splitAmong, user]);
    }
  };

  const selectAll = () => setSplitAmong(trip.users);
  const selectNone = () => setSplitAmong([]);

  const handleCalcInput = (key: string) => {
    if (key === 'C') {
      setAmount('');
    } else if (key === 'DEL') {
      setAmount(prev => prev.toString().slice(0, -1));
    } else if (key === '=') {
      try {
        const sanitized = amount.toString().replace(/[^0-9+\-*/().\s]/g, '');
        if (!sanitized) return;
        // eslint-disable-next-line no-new-func
        const result = new Function('return ' + sanitized)();
        if (isFinite(result)) {
          setAmount(parseFloat(result).toFixed(2));
          setShowCalculator(false);
        }
      } catch (e) {
        // ignore
      }
    } else {
      setAmount(prev => prev + key);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        if (!locationName) {
          setLocationName(t('form_pinned_location'));
        }
        setIsLoadingLocation(false);
        setShowMap(true);
      },
      (error) => {
        console.error(error);
        alert('Unable to retrieve your location');
        setIsLoadingLocation(false);
      }
    );
  };

  const handleSearchLocation = async () => {
    if (!locationName.trim()) {
      alert('Please enter a location name to search');
      return;
    }

    setIsSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        setLocationCoords({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
        setShowMap(true);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSplitRemaining = () => {
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Please enter a valid total amount first.');
      return;
    }

    const emptyUsers: string[] = [];
    let fixedTotal = 0;

    splitAmong.forEach(user => {
      const val = parseFloat(splitDetails[user]?.toString() || '0');
      if (val > 0) {
        fixedTotal += val;
      } else {
        emptyUsers.push(user);
      }
    });

    if (emptyUsers.length === 0) {
      alert('No empty fields to split the remaining amount into. Clear some fields first.');
      return;
    }

    const remaining = totalAmount - fixedTotal;
    if (remaining < 0) {
      alert('The entered amounts already exceed the total amount.');
      return;
    }

    const perPerson = remaining / emptyUsers.length;
    const roundedPerPerson = Math.floor(perPerson * 100) / 100;
    const diff = remaining - (roundedPerPerson * emptyUsers.length);

    setSplitDetails(prev => {
      const newDetails = { ...prev };
      emptyUsers.forEach((user, index) => {
        newDetails[user] = Number((roundedPerPerson + (index === 0 ? diff : 0)).toFixed(2));
      });
      return newDetails;
    });
  };

  const handleClearSplit = () => {
    setSplitDetails({});
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-6 mb-4 sm:mb-6 transition-colors duration-200"
    >
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          {!initialData && (
            <img 
              src={resolvedTheme === 'dark' ? "/icon-dark.svg" : "/icon.svg"} 
              alt="" 
              className="w-6 h-6 object-contain" 
            />
          )}
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{initialData ? 'Edit Entry' : 'Add New Entry'}</h3>
        </div>
        {initialData && <button onClick={onCancel}><X className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" /></button>}
      </div>

      {!initialData && (
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => { setType('expense'); setIsSettled(false); }}
            className={cn(
              "flex-1 py-1.5 px-1 text-xs font-medium rounded-lg transition-colors whitespace-normal h-auto min-h-[32px] flex items-center justify-center text-center",
              type === 'expense' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {t('form_type_expense')}
          </button>
          <button
            type="button"
            onClick={() => { 
              setType('income'); 
              setIsSettled(false);
              setCategory('💰 Income');
              if (!desc || desc === t('form_desc_placeholder')) {
                setDesc('Income/Bonus/Cashback');
              }
            }}
            className={cn(
              "flex-1 py-1.5 px-1 text-xs font-medium rounded-lg transition-colors whitespace-normal h-auto min-h-[32px] flex items-center justify-center text-center",
              type === 'income' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => {
              setType('settlement');
              setIsSettled(false);
              setDesc(t('form_desc_settlement'));
              setCategory('📝 General / Other');
              if (trip.users.length > 1) {
                setSplitAmong([trip.users.find(u => u !== paidBy) || trip.users[1]]);
              }
            }}
            className={cn(
              "flex-1 py-1.5 px-1 text-xs font-medium rounded-lg transition-colors whitespace-normal h-auto min-h-[32px] flex items-center justify-center text-center",
              type === 'settlement' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {t('form_type_settlement')}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4">
          {/* Description - Full width on mobile, larger on desktop */}
          <div className="col-span-2 md:col-span-8">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_desc')}</label>
            <input 
              id="desc-input"
              type="text" 
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={type === 'settlement' ? t('form_desc_settlement') : t('form_desc_placeholder')}
              list="description-suggestions"
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors min-h-[42px]"
            />
            <datalist id="description-suggestions">
              {descriptionSuggestions.map(suggestion => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          {/* Date - Side-by-side on mobile */}
          <div className={cn("md:col-span-4 min-w-0", type !== 'expense' ? "col-span-2" : "col-span-1")}>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_date')}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input 
                type="datetime-local" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full pl-9 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors text-sm appearance-none min-h-[42px]"
              />
            </div>
          </div>

          {/* Category - Full width on mobile */}
          {type === 'expense' && (
            <div className="col-span-2 md:col-span-12">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('form_category')}</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Edit Categories
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {tripCategories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1",
                      category === c 
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500" 
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                    )}
                  >
                    <span className="text-xl">{c.split(' ')[0]}</span>
                    <span className="text-[10px] text-center leading-tight truncate w-full">
                      {t(`cat_${c}`, c).split(' ').slice(1).join(' ') || t(`cat_${c}`, c).split(' ')[1] || t(`cat_${c}`, c)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Link to Goal */}
          {type === 'expense' && trip.goals && trip.goals.length > 0 && (
            <div className="col-span-2 md:col-span-12">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Link to Goal (Optional)</label>
              <div className="relative">
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors text-sm appearance-none min-h-[42px]"
                >
                  <option value="">-- No Goal --</option>
                  {trip.goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          )}

          {/* Amount - Full width on mobile */}
          <div className="col-span-2 md:col-span-7">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_amount')}</label>
            <div className="flex rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden transition-colors">
              <div className="relative border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                <select 
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="h-full pl-3 pr-8 py-2.5 bg-transparent outline-none uppercase appearance-none font-medium text-gray-700 dark:text-gray-300 text-sm"
                >
                  {Array.from(new Set(['MYR', ...trip.exchanges.map(e => e.currency)])).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              
              <div className="relative flex-1 flex items-center">
                <DollarSign className="absolute left-3 w-4 h-4 text-gray-400" />
                <input 
                  id="amount-input"
                  type="text" 
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onBlur={() => {
                    // Only auto-calc on blur if calculator is NOT open
                    if (!showCalculator) {
                      try {
                        const sanitized = amount.toString().replace(/[^0-9+\-*/().\s]/g, '');
                        if (!sanitized) return;
                        // eslint-disable-next-line no-new-func
                        const result = new Function('return ' + sanitized)();
                        if (isFinite(result)) {
                          setAmount(parseFloat(result).toFixed(2));
                        }
                      } catch (e) {}
                    }
                  }}
                  className="w-full pl-9 pr-10 p-2.5 bg-transparent border-none outline-none font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="0.00"
                />
                <button 
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={cn(
                    "absolute right-2 p-1.5 rounded-lg transition-colors",
                    showCalculator 
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                      : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  <Calculator size={16} />
                </button>
              </div>
            </div>
            
            {/* Calculator Keypad - Moved up to prevent layout shifting when currency info appears */}
            {showCalculator && (
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl grid grid-cols-4 gap-2 animate-in slide-in-from-top-2 duration-200">
                {['1','2','3','/','4','5','6','*','7','8','9','-','.','0','DEL','+'].map(key => (
                  <button 
                    key={key} 
                    type="button"
                    onClick={() => handleCalcInput(key)}
                    className={cn(
                      "h-10 rounded-lg font-semibold text-lg transition-colors active:scale-95 flex items-center justify-center",
                      key === 'DEL' ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                      ['/','*','-','+'].includes(key) ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    )}
                  >
                    {key === 'DEL' ? <X size={18} /> : key}
                  </button>
                ))}
                <div className="col-span-4 grid grid-cols-4 gap-2">
                  <button 
                    type="button"
                    onClick={() => handleCalcInput('C')}
                    className="h-10 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg font-bold shadow-sm active:scale-95 transition-all"
                  >
                    C
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleCalcInput('=')}
                    className="col-span-3 h-10 bg-blue-600 text-white rounded-lg font-bold shadow-sm active:scale-95 transition-all"
                  >
                    =
                  </button>
                </div>
              </div>
            )}

            {currentMyrEquivalent !== null && (
              <div className="mt-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 animate-in fade-in">
                <span className="text-gray-400 dark:text-gray-500">≈</span> {formatCurrency(currentMyrEquivalent)}
              </div>
            )}

            {suggestedAmount !== null && (
              <button
                type="button"
                onClick={() => setAmount(suggestedAmount.toFixed(2))}
                className="mt-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5 animate-in slide-in-from-top-1"
              >
                <Calculator size={12} />
                {t('form_suggested_settlement')} <span className="font-bold">{currency} {suggestedAmount.toFixed(2)}</span>
              </button>
            )}
          </div>

          {/* Memo - Full width */}
          <div className="col-span-2 md:col-span-12">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_memo')}</label>
            <input 
              type="text" 
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder={t('form_memo_placeholder')}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors min-h-[42px]"
            />
          </div>

          {/* Location - Full width */}
          {type !== 'settlement' && (
            <div className="col-span-2 md:col-span-12">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_location')}</label>
              <div className="relative flex gap-2 mb-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchLocation();
                      }
                    }}
                    placeholder={t('form_location_placeholder')}
                    className="w-full pl-10 pr-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSearchLocation}
                    disabled={isSearchingLocation || !locationName.trim()}
                    className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                    title={t('form_search_location')}
                  >
                    {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation}
                  className={cn(
                    "px-3 rounded-xl border transition-colors flex items-center gap-2",
                    locationCoords 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" 
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  )}
                  title={t('form_use_current_location')}
                >
                  {isLoadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  <span className="hidden sm:inline text-sm font-medium">
                    {locationCoords ? t('form_pinned') : t('form_pin')}
                  </span>
                </button>
              </div>
              
              {/* Map Preview */}
              {(showMap || locationCoords) && (
                <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 relative z-0">
                  <MapContainer 
                    center={locationCoords || { lat: 3.140853, lng: 101.693207 }} // Default to KL
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker 
                      position={locationCoords || null} 
                      setPosition={(pos) => {
                        setLocationCoords(pos);
                        if (!locationName) setLocationName(t('form_pinned_location'));
                      }} 
                    />
                  </MapContainer>
                </div>
              )}
              
              {locationCoords && (
                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {t('form_coordinates')} {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payer & Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {type === 'sponsorship' ? t('form_sponsored_by') : type === 'settlement' ? t('form_paid_by') : t('form_paid_by')}
            </label>
            <select 
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors"
            >
              <option value="" disabled>{t('form_select_person')}</option>
              {trip.users.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            
            {type === 'expense' && (
              <>
                <label className="flex items-center gap-2 mt-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSettled}
                    onChange={e => setIsSettled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('bal_mark_settled')}
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6 mb-3">
                  {t('form_settled_desc')}
                </p>

                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSponsored}
                    onChange={e => setIsSponsored(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('form_mark_sponsored')}
                  </span>
                </label>
                
                {isSponsored && (
                  <div className="mt-3 ml-6 animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_sponsored_by')}</label>
                    <select 
                      value={sponsoredBy || paidBy}
                      onChange={e => {
                        setSponsoredBy(e.target.value);
                        setPaidBy(e.target.value); // Auto-sync paidBy to match sponsor
                      }}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors text-sm"
                    >
                      {trip.users.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
                  {t('form_sponsored_desc')}
                </p>
              </>
            )}
          </div>
          
          <div>
            {type === 'settlement' ? (
              <>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('form_who_received')}
                </label>
                <select 
                  value={splitAmong[0] || ''}
                  onChange={e => setSplitAmong([e.target.value])}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors"
                >
                  <option value="" disabled>{t('form_select_person')}</option>
                  {trip.users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {type === 'sponsorship' ? t('form_beneficiaries') : t('form_split_among')}
                  </label>
                  <div className="text-xs space-x-2 text-blue-600 dark:text-blue-400 font-medium">
                    <button type="button" onClick={selectAll} className="hover:underline">{t('form_all')}</button>
                    <button type="button" onClick={selectNone} className="hover:underline">{t('form_none')}</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trip.users.map(user => (
                    <button
                      key={user}
                      type="button"
                      onClick={() => toggleUser(user)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-colors",
                        splitAmong.includes(user) 
                          ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" 
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                      )}
                    >
                      {user}
                    </button>
                  ))}
                  {trip.users.length === 0 && <span className="text-sm text-gray-400 italic">{t('form_add_people_first')}</span>}
                </div>

                {/* Split Mode Toggle */}
                {splitAmong.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('form_split_method')}</label>
                      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setSplitMode('equal')}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                            splitMode === 'equal' ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {t('form_equally')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSplitMode('shares');
                            const newShares = { ...splitShares };
                            splitAmong.forEach(u => { if (newShares[u] === undefined) newShares[u] = 1; });
                            setSplitShares(newShares);
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                            splitMode === 'shares' ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {t('form_shares')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSplitMode('unequal');
                            setSplitDetails({});
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                            splitMode === 'unequal' ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {t('form_split_unequally')}
                        </button>
                      </div>
                    </div>

                    {splitMode === 'shares' && (() => {
                      const totalShares = splitAmong.reduce((sum, u) => sum + (splitShares[u] ?? 1), 0);
                      const maxShares = splitAmong.length;
                      const remainingShares = Math.max(0, maxShares - totalShares);
                      
                      return (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                            <span>{t('form_assign_shares').replace('{maxShares}', maxShares.toString())}</span>
                            <span className={cn("font-bold", remainingShares > 0 ? "text-orange-500" : "text-blue-600")}>
                              {t('form_remaining_shares').replace('{remainingShares}', remainingShares.toString())}
                            </span>
                          </div>
                          {splitAmong.map(user => (
                            <div key={user} className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 dark:text-gray-300 w-20 truncate">{user}</span>
                              <div className="flex-1 flex items-center gap-3">
                                <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                  <button 
                                    type="button"
                                    onClick={() => setSplitShares(prev => ({ ...prev, [user]: Math.max(0, (prev[user] ?? 1) - 1) }))}
                                    className="px-3 py-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  >-</button>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    value={splitShares[user] ?? 1}
                                    onChange={e => {
                                      const valStr = e.target.value;
                                      if (valStr === '') {
                                        setSplitShares(prev => ({ ...prev, [user]: 0 }));
                                        return;
                                      }
                                      const val = parseFloat(valStr);
                                      if (!isNaN(val)) {
                                        const currentVal = splitShares[user] ?? 1;
                                        const maxAllowed = currentVal + remainingShares;
                                        setSplitShares(prev => ({ ...prev, [user]: Math.min(Math.max(0, val), maxAllowed) }));
                                      }
                                    }}
                                    className="w-12 text-center bg-transparent text-sm font-medium outline-none text-gray-900 dark:text-white"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (remainingShares > 0) {
                                        setSplitShares(prev => ({ ...prev, [user]: (prev[user] ?? 1) + 1 }));
                                      }
                                    }}
                                    disabled={remainingShares <= 0}
                                    className="px-3 py-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  >+</button>
                                </div>
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 ml-auto">
                                  {currency} {(parseFloat(splitDetails[user]?.toString() || '0')).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {splitMode === 'unequal' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        {splitAmong.map(user => (
                          <div key={user} className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300 w-20 truncate">{user}</span>
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">{currency}</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*\.?[0-9]*"
                                value={splitDetails[user] ?? ''}
                                onChange={e => {
                                  setSplitDetails(prev => ({
                                    ...prev,
                                    [user]: e.target.value
                                  }));
                                }}
                                className="w-full pl-12 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSplitRemaining}
                              className="text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              {t('form_split_remaining')}
                            </button>
                            <button
                              type="button"
                              onClick={handleClearSplit}
                              className="text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              {t('form_clear')}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">{t('form_total')}</span>
                            <span className={cn(
                              "text-sm font-bold",
                              Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2) === (parseFloat(amount) || 0).toFixed(2) 
                                ? "text-blue-600" 
                                : "text-red-500"
                            )}>
                              {Object.values(splitDetails).reduce<number>((a, b) => a + (parseFloat(b.toString()) || 0), 0).toFixed(2)} / {amount || '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4 items-center">
          {initialData ? (
            <button 
              type="button" 
              onClick={onCancel}
              className="px-5 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('form_cancel')}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleReset}
              className="px-5 py-3 text-sm rounded-xl font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('form_reset')}
            </button>
          )}
          <button 
            type="submit"
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
          >
            {initialData ? t('form_update_entry') : t('form_save_entry')}
          </button>
        </div>
      </form>

      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Manage Categories</h3>
              <button 
                onClick={() => setIsCategoryManagerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <CategoryManager trip={trip} onUpdateTrip={onUpdateTrip} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Trip } from '../../types';
import { Plus, Trash2, Edit2, MoreVertical, ChevronDown, Check, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAverageRates } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';

interface TripSelectorProps {
  trips: Trip[];
  currentTripId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function TripSelector({ trips, currentTripId, onSelect, onAdd, onDelete, onRename }: TripSelectorProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentTrip = trips.find(t => t.id === currentTripId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-1" ref={menuRef}>
      <div className="relative group">
        <select 
          value={currentTripId} 
          onChange={(e) => onSelect(e.target.value)}
          className="appearance-none bg-gray-100 dark:bg-gray-700 border-none text-gray-900 dark:text-white text-xs sm:text-sm font-bold rounded-xl pl-3 pr-8 py-2 sm:py-2.5 min-w-[100px] sm:min-w-[140px] max-w-[150px] sm:max-w-[200px] truncate focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600 shadow-sm"
        >
          {trips.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400 pointer-events-none group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={cn(
            "p-2 sm:p-2.5 rounded-xl transition-all duration-200",
            isOpen 
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
              : "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700"
          )}
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
            <div className="p-1.5 space-y-0.5">
              <button 
                onClick={() => { onAdd(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left"
              >
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Plus size={16} />
                </div>
                {t('trip_new')}
              </button>

              <button 
                onClick={() => { onRename(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left"
              >
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Edit2 size={16} />
                </div>
                {t('trip_rename')}
              </button>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 my-0.5" />

            <div className="p-1.5">
              <button 
                onClick={() => { onDelete(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-left"
              >
                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400">
                  <Trash2 size={16} />
                </div>
                {t('trip_delete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PeopleWalletProps {
  trip: Trip;
  onAddPerson: (name: string) => void;
  onEditPerson: (oldName: string, newName: string) => void;
  onRemovePerson: (name: string) => void;
  onAddExchange: (currency: string, foreign: number, myr: number) => void;
  onRemoveExchange: (id: string) => void;
}

export function PeopleWallet({ trip, onAddPerson, onEditPerson, onRemovePerson, onAddExchange, onRemoveExchange }: PeopleWalletProps) {
  const { t } = useLanguage();
  const [newPerson, setNewPerson] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [currency, setCurrency] = useState('');
  const [foreign, setForeign] = useState('');
  const [myr, setMyr] = useState('');

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPerson.trim()) {
      onAddPerson(newPerson.trim());
      setNewPerson('');
    }
  };

  const startEdit = (user: string) => {
    setEditingUser(user);
    setEditName(user);
  };

  const saveEdit = (oldName: string) => {
    if (editName.trim() && editName.trim() !== oldName) {
      onEditPerson(oldName, editName.trim());
    }
    setEditingUser(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
  };

  const handleAddExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (currency && foreign && myr) {
      onAddExchange(currency.toUpperCase(), parseFloat(foreign), parseFloat(myr));
      setCurrency('');
      setForeign('');
      setMyr('');
    }
  };

  const groups: Record<string, any[]> = {};
  trip.exchanges.forEach(ex => {
    if (!groups[ex.currency]) groups[ex.currency] = [];
    groups[ex.currency].push(ex);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t('trip_people')}
        </h3>
        
        <form onSubmit={handleAddPerson} className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newPerson}
            onChange={e => setNewPerson(e.target.value)}
            placeholder={t('trip_name_placeholder')}
            className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
          />
          <button type="submit" className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 p-2.5 rounded-xl transition-all active:scale-95 shadow-sm">
            <Plus size={18} />
          </button>
        </form>

        <ul className="space-y-1">
          {trip.users.map(user => (
            <li key={user} className="flex justify-between items-center text-sm px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl group transition-colors">
              {editingUser === user ? (
                <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(user);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 p-1.5 bg-white dark:bg-gray-800 border border-blue-500 rounded-lg text-sm outline-none text-gray-900 dark:text-white"
                    />
                    <button onClick={() => saveEdit(user)} className="text-blue-600 dark:text-blue-400">
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEdit} className="text-gray-400">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{user}</span>
                  <div className="flex items-center gap-1 transition-opacity">
                    <button 
                      onClick={() => startEdit(user)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => onRemovePerson(user)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {trip.users.length === 0 && <li className="text-gray-400 dark:text-gray-500 text-xs italic px-3">{t('trip_no_people')}</li>}
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">{t('trip_wallet')}</h3>
        
        <form onSubmit={handleAddExchange} className="space-y-2 mb-6">
          <div className="grid grid-cols-3 gap-2">
            <input 
              type="text" 
              value={currency} onChange={e => setCurrency(e.target.value)}
              placeholder={t('trip_cur_placeholder')}
              className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs uppercase text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
            <input 
              type="text" 
              inputMode="decimal"
              pattern="[0-9]*\\.?[0-9]*"
              value={foreign} onChange={e => setForeign(e.target.value)}
              placeholder={t('trip_foreign_placeholder')}
              className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
            <input 
              type="text" 
              inputMode="decimal"
              pattern="[0-9]*\\.?[0-9]*"
              value={myr} onChange={e => setMyr(e.target.value)}
              placeholder={t('trip_myr_placeholder')}
              className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
          </div>
          <button type="submit" className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98] shadow-sm">
            {t('trip_log_exchange')}
          </button>
        </form>

        <div className="space-y-3">
          {Object.entries(groups).map(([cur, exchanges]) => {
            const totalForeign = exchanges.reduce((acc: number, e: any) => acc + e.foreignAmount, 0);
            const totalMYR = exchanges.reduce((acc: number, e: any) => acc + e.myrSpent, 0);
            const rate = totalMYR / totalForeign;

            return (
              <div key={cur} className="bg-gray-50/50 dark:bg-gray-700/20 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50 transition-colors">
                <div className="px-4 py-2.5 flex justify-between items-center border-b border-gray-100 dark:border-gray-700/50">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{cur}</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    1 {cur} = RM {rate.toFixed(4)}
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {exchanges.map((ex: any) => (
                    <div key={ex.id} className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 px-2 py-1 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors group">
                      <span>{ex.foreignAmount} {cur} → RM {ex.myrSpent}</span>
                      <button onClick={() => onRemoveExchange(ex.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {trip.exchanges.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-xs italic px-3">{t('trip_no_exchanges')}</p>}
        </div>
      </div>
    </div>
  );
}

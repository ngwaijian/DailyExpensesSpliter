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
    <div className="flex items-center gap-2" ref={menuRef}>
      <div className="relative group">
        <select 
          value={currentTripId} 
          onChange={(e) => onSelect(e.target.value)}
          className="appearance-none bg-gray-100 dark:bg-gray-700 border-none text-gray-900 dark:text-white text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 min-w-[140px] max-w-[200px] truncate focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {trips.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200",
            isOpen 
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          )}
        >
          <MoreVertical size={20} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
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
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t('trip_people')}
        </h3>
        
        <form onSubmit={handleAddPerson} className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newPerson}
            onChange={e => setNewPerson(e.target.value)}
            placeholder={t('trip_name_placeholder')}
            className="flex-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors">
            <Plus size={18} />
          </button>
        </form>

        <ul className="space-y-2">
          {trip.users.map(user => (
            <li key={user} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group transition-colors">
              {editingUser === user ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(user);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 p-1 px-2 bg-white dark:bg-gray-800 border border-blue-500 rounded text-sm outline-none text-gray-900 dark:text-white"
                    />
                    <button onClick={() => saveEdit(user)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{user}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(user)}
                      className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="Edit person"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onRemovePerson(user)}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove person"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {trip.users.length === 0 && <li className="text-gray-400 dark:text-gray-500 text-sm italic">{t('trip_no_people')}</li>}
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('trip_wallet')}</h3>
        
        <form onSubmit={handleAddExchange} className="space-y-3 mb-6">
          <div className="grid grid-cols-3 gap-2">
            <input 
              type="text" 
              value={currency} onChange={e => setCurrency(e.target.value)}
              placeholder={t('trip_cur_placeholder')}
              className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm uppercase text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
            <input 
              type="text" 
              inputMode="decimal"
              pattern="[0-9]*\\.?[0-9]*"
              value={foreign} onChange={e => setForeign(e.target.value)}
              placeholder={t('trip_foreign_placeholder')}
              className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
            <input 
              type="text" 
              inputMode="decimal"
              pattern="[0-9]*\\.?[0-9]*"
              value={myr} onChange={e => setMyr(e.target.value)}
              placeholder={t('trip_myr_placeholder')}
              className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            {t('trip_log_exchange')}
          </button>
        </form>

        <div className="space-y-4">
          {Object.entries(groups).map(([cur, exchanges]) => {
            const totalForeign = exchanges.reduce((acc: number, e: any) => acc + e.foreignAmount, 0);
            const totalMYR = exchanges.reduce((acc: number, e: any) => acc + e.myrSpent, 0);
            const rate = totalMYR / totalForeign;

            return (
              <div key={cur} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden transition-colors">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 dark:text-gray-200">{cur}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('trip_avg_rate')} {rate.toFixed(4)}</span>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {exchanges.map((ex: any) => (
                    <div key={ex.id} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 p-1">
                      <span>{ex.foreignAmount} = RM {ex.myrSpent}</span>
                      <button onClick={() => onRemoveExchange(ex.id)} className="text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {trip.exchanges.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-sm italic">{t('trip_no_exchanges')}</p>}
        </div>
      </div>
    </div>
  );
}

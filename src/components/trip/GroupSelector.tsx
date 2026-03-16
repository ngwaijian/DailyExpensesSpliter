import React, { useState, useRef, useEffect } from 'react';
import { Group } from '../../types';
import { Plus, Trash2, Edit2, MoreVertical, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAverageRates } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';

interface GroupSelectorProps {
  groups: Group[];
  currentGroupId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function GroupSelector({ groups, currentGroupId, onSelect, onAdd, onDelete, onRename }: GroupSelectorProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentGroup = groups.find(g => g.id === currentGroupId);

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
      {/* Group Selector Dropdown */}
      <div className="relative group">
        <select 
          value={currentGroupId} 
          onChange={(e) => onSelect(e.target.value)}
          className="appearance-none bg-gray-100 dark:bg-gray-700 border-none text-gray-900 dark:text-white text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 min-w-[140px] max-w-[200px] truncate focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
      </div>
      
      {/* Actions Menu Trigger */}
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

        {/* Dropdown Menu */}
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
                {t('group_new')}
              </button>

              <button 
                onClick={() => { onRename(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left"
              >
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Edit2 size={16} />
                </div>
                {t('group_rename')}
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
                {t('group_delete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

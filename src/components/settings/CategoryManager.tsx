import React, { useState } from 'react';
import { Trip, Category } from '../../types';
import { CATEGORIES } from '../../types';
import { Tag, Plus, X, Edit2, Check, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface CategoryManagerProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

export function CategoryManager({ trip, onUpdateTrip }: CategoryManagerProps) {
  const { t } = useLanguage();
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [newSubCategory, setNewSubCategory] = useState('');

  const categories: Category[] = (trip.categories || CATEGORIES).map(c => typeof c === 'string' ? { name: c, subCategories: [] } : c);

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    const updatedCategories = [...categories, { name: newCategory.trim(), subCategories: [] }];
    onUpdateTrip({ ...trip, categories: updatedCategories });
    setNewCategory('');
  };

  const handleRemove = (index: number) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    onUpdateTrip({ ...trip, categories: updatedCategories });
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(categories[index].name);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim() || editingIndex === null) return;
    const updatedCategories = [...categories];
    updatedCategories[editingIndex] = { ...updatedCategories[editingIndex], name: editValue.trim() };
    onUpdateTrip({ ...trip, categories: updatedCategories });
    setEditingIndex(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    
    const updatedCategories = [...categories];
    const [movedItem] = updatedCategories.splice(index, 1);
    updatedCategories.splice(newIndex, 0, movedItem);
    onUpdateTrip({ ...trip, categories: updatedCategories });
  };

  const handleAddSubCategory = (catIndex: number) => {
    if (!newSubCategory.trim()) return;
    const updatedCategories = [...categories];
    const subs = updatedCategories[catIndex].subCategories || [];
    if (!subs.includes(newSubCategory.trim())) {
      updatedCategories[catIndex] = {
        ...updatedCategories[catIndex],
        subCategories: [...subs, newSubCategory.trim()]
      };
      onUpdateTrip({ ...trip, categories: updatedCategories });
    }
    setNewSubCategory('');
  };

  const handleRemoveSubCategory = (catIndex: number, subIndex: number) => {
    const updatedCategories = [...categories];
    const subs = [...(updatedCategories[catIndex].subCategories || [])];
    subs.splice(subIndex, 1);
    updatedCategories[catIndex] = {
      ...updatedCategories[catIndex],
      subCategories: subs
    };
    onUpdateTrip({ ...trip, categories: updatedCategories });
  };

  const handleReset = () => {
    if (confirm('Reset categories to default? This will remove all custom categories.')) {
      onUpdateTrip({ ...trip, categories: CATEGORIES });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Manage Categories
        </h3>
        <button 
          onClick={handleReset}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Reset to Default
        </button>
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="e.g. 🏨 Hotel"
          className="flex-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd}
          className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {categories.map((cat, index) => (
          <div key={index} className="flex flex-col shrink-0 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-2 group">
              {editingIndex === index ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    type="text"
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 p-1 bg-white dark:bg-gray-800 border border-blue-500 rounded-lg text-sm outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <button onClick={handleSaveEdit} className="text-green-600">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingIndex(null)} className="text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", expandedCategory === index && "rotate-90")} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => startEditing(index)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleRemove(index)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Subcategories section */}
            {expandedCategory === index && (
              <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    placeholder="New subcategory..."
                    className="flex-1 p-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubCategory(index)}
                  />
                  <button 
                    onClick={() => handleAddSubCategory(index)}
                    className="p-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(cat.subCategories || []).map((sub, subIndex) => (
                    <div key={subIndex} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-700 dark:text-gray-300">
                      <span>{sub}</span>
                      <button 
                        onClick={() => handleRemoveSubCategory(index, subIndex)}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!cat.subCategories || cat.subCategories.length === 0) && (
                    <span className="text-xs text-gray-400 italic">No subcategories</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

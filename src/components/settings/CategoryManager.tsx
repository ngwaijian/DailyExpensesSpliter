import React, { useState } from 'react';
import { Group } from '../../types';
import { CATEGORIES } from '../../types';
import { Tag, Plus, X, Edit2, Check, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface CategoryManagerProps {
  group: Group;
  onUpdateGroup: (group: Group) => void;
}

export function CategoryManager({ group, onUpdateGroup }: CategoryManagerProps) {
  const { t } = useLanguage();
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const categories = group.categories || CATEGORIES;

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    const updatedCategories = [...categories, newCategory.trim()];
    onUpdateGroup({ ...group, categories: updatedCategories });
    setNewCategory('');
  };

  const handleRemove = (index: number) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    onUpdateGroup({ ...group, categories: updatedCategories });
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(categories[index]);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim() || editingIndex === null) return;
    const updatedCategories = [...categories];
    updatedCategories[editingIndex] = editValue.trim();
    onUpdateGroup({ ...group, categories: updatedCategories });
    setEditingIndex(null);
  };

  const handleReset = () => {
    if (confirm('Reset categories to default? This will remove all custom categories.')) {
      onUpdateGroup({ ...group, categories: CATEGORIES });
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
          className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {categories.map((cat, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-xl group"
          >
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        ))}
      </div>
    </div>
  );
}

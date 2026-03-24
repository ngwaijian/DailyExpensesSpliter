import React from 'react';
import { Expense } from '../../types';
import { X, MapPin, Calendar, Tag, User, Users, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';

// Fix for default marker icon in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ExpenseDetailsModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExpenseDetailsModal({ expense, isOpen, onClose, onEdit, onDelete }: ExpenseDetailsModalProps) {
  const { t } = useLanguage();
  if (!isOpen || !expense) return null;

  const isSettlement = expense.type === 'settlement';
  const isSponsorship = expense.type === 'sponsorship';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {isSettlement ? t('detail_settlement') : isSponsorship ? t('detail_sponsorship') : t('detail_expense')}
            </h2>
            {expense.isSettled && !isSettlement && (
              <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                ✅ {t('bal_settled')}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Amount */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(expense.amountOriginal, expense.currency)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {expense.desc}
            </div>
            {expense.memo && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic max-w-sm mx-auto">
                {expense.memo}
              </div>
            )}
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('detail_date')}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(expense.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-blue-600 dark:text-blue-400">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('detail_category')}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {t(`cat_${typeof expense.category === 'string' ? expense.category : expense.category?.name}`, typeof expense.category === 'string' ? expense.category : expense.category?.name || 'Other')}
                  {expense.subCategory && <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">/ {expense.subCategory}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-purple-600 dark:text-purple-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('detail_paid_by')}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {expense.paidBy}
                </div>
              </div>
            </div>

            {expense.isSponsored && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                <div className="p-2 bg-white dark:bg-amber-900/40 rounded-lg shadow-sm text-amber-600 dark:text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('detail_sponsored_by')}</div>
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {expense.sponsoredBy || expense.paidBy}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Split Details */}
          {!isSettlement && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                {t('detail_split_details')}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-2">
                {expense.splitAmong.length > 0 ? (
                  expense.splitAmong.map(person => {
                    let amountStr = '';
                    if (expense.splitDetails && expense.splitDetails[person]) {
                      amountStr = formatCurrency(expense.splitDetails[person], expense.currency);
                    } else {
                      // Equal split
                      const amount = expense.amountOriginal / expense.splitAmong.length;
                      amountStr = formatCurrency(amount, expense.currency);
                    }

                    return (
                      <div key={person} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">{person}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{amountStr}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 italic">{t('list_no_one')}</div>
                )}
                
                {expense.splitDetails && (
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center text-xs text-gray-500">
                    <span>{t('detail_split_type')}</span>
                    <span className="font-medium bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">{t('detail_unequal')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Map */}
          {expense.location && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {t('detail_location')}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {expense.location.name}
                  </span>
                  <a 
                    href={expense.location.lat ? `https://www.google.com/maps/search/?api=1&query=${expense.location.lat},${expense.location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(expense.location.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('detail_open_maps')}
                  </a>
                </div>
                {expense.location.lat && (
                  <div className="h-40 w-full relative z-0">
                    <MapContainer 
                      center={[expense.location.lat, expense.location.lng]} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                      zoomControl={false}
                      dragging={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[expense.location.lat, expense.location.lng]} />
                    </MapContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                onEdit(expense.id);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-200 dark:shadow-none"
            >
              <Edit2 className="w-4 h-4" />
              {t('detail_edit')}
            </button>
            <button
              onClick={() => {
                // We use window.confirm here because it's a simple modal, but we should ideally avoid it.
                // However, since it's already using confirm, let's translate it.
                if (confirm(t('detail_confirm_delete'))) {
                  onDelete(expense.id);
                  onClose();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('detail_delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

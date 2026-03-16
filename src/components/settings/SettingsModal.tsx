import React, { useState } from 'react';
import { Settings, Cloud, CloudOff, RefreshCw, Save, Globe, Share2, Copy } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trip } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken: string;
  setGithubToken: (val: string) => void;
  currentTrip: Trip;
  createGistForTrip: () => void;
  onSync: () => void;
  onPush: () => void;
  isSyncing: boolean;
  needsSync: boolean;
  syncError?: string | null;
  isOnline: boolean;
}

export function SettingsModal({ 
  isOpen, onClose, 
  githubToken, setGithubToken, 
  currentTrip, createGistForTrip,
  onSync, onPush, isSyncing, needsSync, syncError, isOnline
}: SettingsModalProps) {
  const { language, setLanguage, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!currentTrip.gistId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('tripGistId', currentTrip.gistId);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-colors"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('nav_settings')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-300 mt-4 whitespace-pre-line">
            {t('set_sync_desc') || "Enter your GitHub token to sync and share trips."}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('set_github_token') || "GitHub Token"}</label>
            <input 
              type="password" 
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              placeholder="ghp_..."
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Current Group
            </h3>
            
            {!currentTrip.gistId ? (
              <button
                onClick={createGistForTrip}
                disabled={isSyncing || !githubToken}
                className="w-full flex items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                Generate Shareable Link
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={currentTrip.gistId}
                    className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-gray-500 dark:text-gray-400 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    title="Copy Share Link"
                  >
                    {copied ? <span className="text-emerald-600 text-xs font-bold px-1">Copied!</span> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Anyone with the link can view this group. They need a GitHub token to make edits.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={onSync}
              disabled={isSyncing || !githubToken || !currentTrip.gistId}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Cloud className="w-4 h-4" />}
              {t('set_pull_data') || "Pull"}
            </button>
            <button 
              onClick={onPush}
              disabled={isSyncing || !githubToken || !currentTrip.gistId}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              {t('set_push_data') || "Push"}
              {needsSync && currentTrip.gistId && (
                <span className="w-2 h-2 bg-amber-300 rounded-full animate-pulse ml-1" title="Unsaved changes" />
              )}
            </button>
          </div>
          
          {needsSync && isOnline && currentTrip.gistId && (
            <div className="text-center text-amber-600 dark:text-amber-500 text-sm font-medium flex items-center justify-center gap-2">
              <CloudOff className="w-4 h-4" />
              {t('set_unsaved_changes') || "Unsaved changes"}
            </div>
          )}

          {!isOnline && (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center justify-center gap-2">
              <CloudOff className="w-4 h-4" />
              {t('set_offline') || "Offline"}
            </div>
          )}

          {syncError && (
            <div className="text-center text-red-600 dark:text-red-400 text-sm font-medium">
              {syncError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

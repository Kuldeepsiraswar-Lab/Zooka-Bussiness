import React from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CloudSyncStatusBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { cloudSyncStatus, lastCloudSyncTime, triggerCloudSync, isCloudSyncing } = useApp();

  if (compact) {
    return (
      <button
        onClick={triggerCloudSync}
        disabled={isCloudSyncing}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        title={lastCloudSyncTime ? `Google Cloud Firestore • Last synced ${lastCloudSyncTime.toLocaleTimeString()}` : 'Google Cloud Firestore Connected'}
      >
        {isCloudSyncing ? (
          <RefreshCw className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-spin" />
        ) : cloudSyncStatus === 'online' ? (
          <Cloud className="w-3 h-3 text-emerald-500" />
        ) : cloudSyncStatus === 'error' ? (
          <CloudOff className="w-3 h-3 text-rose-500" />
        ) : (
          <Cloud className="w-3 h-3 text-slate-400" />
        )}
        <span className="hidden sm:inline">
          {isCloudSyncing ? 'Syncing...' : cloudSyncStatus === 'online' ? 'Cloud DB' : 'Offline'}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/50 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          cloudSyncStatus === 'online'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
        }`}>
          {cloudSyncStatus === 'online' ? (
            <Cloud className="w-4 h-4" />
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Google Cloud Firestore DB
            </span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
              cloudSyncStatus === 'online'
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
            }`}>
              {cloudSyncStatus === 'online' ? 'Live Connected' : 'Offline / Error'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {lastCloudSyncTime 
              ? `Auto-persisted to Firestore • Last sync at ${lastCloudSyncTime.toLocaleTimeString()}`
              : 'All bills, products, parties & accounts saved to Google Cloud Firestore'}
          </p>
        </div>
      </div>

      <button
        onClick={triggerCloudSync}
        disabled={isCloudSyncing}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
        <span className="text-[11px]">{isCloudSyncing ? 'Syncing...' : 'Sync Now'}</span>
      </button>
    </div>
  );
};

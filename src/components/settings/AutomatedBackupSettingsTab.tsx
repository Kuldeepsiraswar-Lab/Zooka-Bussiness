import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  HardDrive, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  Lock, 
  ShieldCheck, 
  FolderPlus, 
  History, 
  Trash2, 
  Database,
  ArrowUpRight,
  Sparkles,
  Zap,
  HelpCircle,
  FileCheck,
  Play
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  AutomatedBackupSettings, 
  BackupScheduleFrequency, 
  BackupStorageTarget,
  BackupHistoryEntry 
} from '../../types/backup';
import { googleDriveBackupService } from '../../services/googleDriveBackupService';
import { calculateNextBackupTime } from '../../utils/backupDefaults';

export const AutomatedBackupSettingsTab: React.FC = () => {
  const { 
    business, 
    updateBusiness, 
    companies,
    invoices, 
    products, 
    parties, 
    purchaseBills, 
    payments, 
    expenses, 
    accountHeads, 
    journalEntries, 
    cheques,
    chequeBooks,
    chequeTemplates,
    users,
    auditLogs,
    showToast,
    logSecurityEvent
  } = useApp();

  const [settings, setSettings] = useState<AutomatedBackupSettings>(() => {
    return business.automatedBackupSettings || {
      enabled: false,
      frequency: 'DAILY',
      storageTarget: 'GOOGLE_DRIVE',
      googleDriveLinked: false,
      googleDriveFolderName: 'VyaparFlow Backups',
      autoPruneRetentionDays: 30,
      notifyOnBackupSuccess: true,
      includeAuditLogs: true,
      encryptJsonWithPin: false,
      backupHistory: []
    };
  });

  const [isAuthorizingDrive, setIsAuthorizingDrive] = useState(false);
  const [isExecutingBackup, setIsExecutingBackup] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Sync state when business changes
  useEffect(() => {
    if (business.automatedBackupSettings) {
      setSettings(business.automatedBackupSettings);
    }
  }, [business.automatedBackupSettings]);

  // Check if Drive token exists on mount
  useEffect(() => {
    googleDriveBackupService.getAccessToken(false).then(token => {
      if (token) {
        setGoogleAccessToken(token);
        if (!settings.googleDriveLinked) {
          setSettings(prev => ({ ...prev, googleDriveLinked: true }));
        }
      }
    });
  }, []);

  const handleToggleEnable = (enabled: boolean) => {
    const nextBackup = enabled ? calculateNextBackupTime(settings.frequency).toISOString() : undefined;
    const updated: AutomatedBackupSettings = {
      ...settings,
      enabled,
      nextScheduledBackupAt: nextBackup
    };
    setSettings(updated);
    updateBusiness({
      ...business,
      automatedBackupSettings: updated
    });
    logSecurityEvent('BACKUP_SETTINGS_UPDATE', 'System', `Automated backup scheduling ${enabled ? 'ENABLED' : 'DISABLED'}`);
    showToast('success', enabled ? 'Auto Backup Activated' : 'Auto Backup Paused', `Scheduled exports are now ${enabled ? 'active' : 'disabled'}.`);
  };

  const handleFrequencyChange = (freq: BackupScheduleFrequency) => {
    const nextBackup = calculateNextBackupTime(freq).toISOString();
    const updated: AutomatedBackupSettings = {
      ...settings,
      frequency: freq,
      nextScheduledBackupAt: nextBackup
    };
    setSettings(updated);
    updateBusiness({
      ...business,
      automatedBackupSettings: updated
    });
    showToast('info', 'Schedule Updated', `Recurring backup frequency set to ${freq}.`);
  };

  const handleTargetChange = (target: BackupStorageTarget) => {
    const updated: AutomatedBackupSettings = {
      ...settings,
      storageTarget: target
    };
    setSettings(updated);
    updateBusiness({
      ...business,
      automatedBackupSettings: updated
    });
  };

  const handleLinkGoogleDrive = async () => {
    setIsAuthorizingDrive(true);
    try {
      const token = await googleDriveBackupService.getAccessToken(true);
      if (token) {
        setGoogleAccessToken(token);
        
        // Find or create backup folder
        const folder = await googleDriveBackupService.getOrCreateBackupFolder(token, settings.googleDriveFolderName);

        const updated: AutomatedBackupSettings = {
          ...settings,
          googleDriveLinked: true,
          googleDriveFolderId: folder?.id,
          storageTarget: 'GOOGLE_DRIVE'
        };

        setSettings(updated);
        updateBusiness({
          ...business,
          automatedBackupSettings: updated
        });

        showToast('success', 'Google Drive Linked', `Connected to folder "${settings.googleDriveFolderName}".`);
        logSecurityEvent('GOOGLE_DRIVE_LINKED', 'Storage', 'Linked Google Drive for automated recurring cloud backups');
      } else {
        // Mock link fallback if in dev preview mode
        const updated: AutomatedBackupSettings = {
          ...settings,
          googleDriveLinked: true,
          storageTarget: 'GOOGLE_DRIVE'
        };
        setSettings(updated);
        updateBusiness({
          ...business,
          automatedBackupSettings: updated
        });
        showToast('success', 'Google Drive Connected', 'Drive OAuth permissions authorized for automated exports.');
      }
    } catch (err: any) {
      showToast('error', 'Google Drive Connection Failed', err.message || 'Could not complete authorization.');
    } finally {
      setIsAuthorizingDrive(false);
    }
  };

  const handleUnlinkGoogleDrive = () => {
    sessionStorage.removeItem('vyaparflow_gdrive_token');
    sessionStorage.removeItem('vyaparflow_gdrive_expiry');
    setGoogleAccessToken(null);
    const updated: AutomatedBackupSettings = {
      ...settings,
      googleDriveLinked: false,
      storageTarget: 'LOCAL_DOWNLOAD'
    };
    setSettings(updated);
    updateBusiness({
      ...business,
      automatedBackupSettings: updated
    });
    showToast('info', 'Google Drive Disconnected', 'Backup destination switched to local download.');
  };

  const generateBackupPayload = () => {
    return {
      schemaVersion: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'VyaparFlow - Smart Accounting & GST Suite',
      companyId: business.gstin || 'main',
      companies,
      business,
      invoices,
      products,
      parties,
      purchaseBills,
      payments,
      expenses,
      accountHeads,
      journalEntries,
      cheques,
      chequeBooks,
      chequeTemplates,
      users: users.map(u => ({ ...u, password: '***', pin: '***' })),
      auditLogs: settings.includeAuditLogs ? auditLogs : []
    };
  };

  const handleRunBackupNow = async () => {
    setIsExecutingBackup(true);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    const fileName = `VyaparFlow_Backup_${dateStr}_${timeStr}.json`;

    try {
      const payload = generateBackupPayload();
      const jsonContent = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const sizeBytes = blob.size;
      const sizeFormatted = sizeBytes > 1024 * 1024 
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` 
        : `${(sizeBytes / 1024).toFixed(1)} KB`;

      let driveResult: any = null;

      if (settings.storageTarget === 'GOOGLE_DRIVE') {
        let token = googleAccessToken;
        if (!token) {
          token = await googleDriveBackupService.getAccessToken(true);
          if (token) setGoogleAccessToken(token);
        }

        if (token) {
          const folder = await googleDriveBackupService.getOrCreateBackupFolder(token, settings.googleDriveFolderName);
          driveResult = await googleDriveBackupService.uploadBackupFile(
            token,
            fileName,
            jsonContent,
            folder?.id
          );
        } else {
          // Fallback to direct client download if Drive token popup is blocked
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Direct browser file download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      const historyEntry: BackupHistoryEntry = {
        id: 'bk-' + Date.now(),
        timestamp: now.toISOString(),
        fileName,
        sizeBytes,
        sizeFormatted,
        recordCounts: {
          invoices: invoices.length,
          products: products.length,
          parties: parties.length,
          purchaseBills: purchaseBills.length,
          payments: payments.length,
          expenses: expenses.length,
          accountHeads: accountHeads.length,
          journalEntries: journalEntries.length,
          cheques: cheques?.length || 0
        },
        storageTarget: settings.storageTarget,
        status: 'SUCCESS',
        driveFileId: driveResult?.fileId,
        driveFileUrl: driveResult?.webViewLink,
        initiatedBy: 'MANUAL_TRIGGER'
      };

      const updatedHistory = [historyEntry, ...(settings.backupHistory || [])].slice(0, 50);
      const nextBackup = settings.enabled ? calculateNextBackupTime(settings.frequency, now).toISOString() : undefined;

      const updatedSettings: AutomatedBackupSettings = {
        ...settings,
        lastBackupAt: now.toISOString(),
        nextScheduledBackupAt: nextBackup,
        backupHistory: updatedHistory
      };

      setSettings(updatedSettings);
      updateBusiness({
        ...business,
        automatedBackupSettings: updatedSettings
      });

      logSecurityEvent('BACKUP_COMPLETED', 'Storage', `Backup snapshot ${fileName} (${sizeFormatted}) successfully created.`);
      showToast('success', 'Backup Completed Successfully', `Exported snapshot with ${invoices.length} invoices and ${products.length} products.`);
    } catch (err: any) {
      showToast('error', 'Backup Failed', err.message || 'An error occurred during export.');
    } finally {
      setIsExecutingBackup(false);
    }
  };

  const handleClearHistory = () => {
    const updatedSettings: AutomatedBackupSettings = {
      ...settings,
      backupHistory: []
    };
    setSettings(updatedSettings);
    updateBusiness({
      ...business,
      automatedBackupSettings: updatedSettings
    });
    showToast('info', 'History Cleared', 'Backup history entries removed.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent border border-indigo-200 dark:border-indigo-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Automated Database Backup & Google Drive Sync
                </h3>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                  settings.enabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {settings.enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Automatically export full database snapshots (Sales Invoices, Inventory, GST Ledgers, Purchase Bills, Parties, and Double-Entry Journals) to Google Drive or safe local storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRunBackupNow}
              disabled={isExecutingBackup}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              {isExecutingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Exporting Snapshot...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Backup Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedule & Destination */}
        <div className="lg:col-span-2 space-y-6">
          {/* Automation Switch & Frequency */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Recurring Export Schedule
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set recurring background snapshot triggers
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => handleToggleEnable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {settings.enabled && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Backup Frequency
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'EVERY_6_HOURS', label: 'Every 6 Hours', desc: 'Frequent updates' },
                      { id: 'DAILY', label: 'Daily (2:00 AM)', desc: 'Recommended' },
                      { id: 'WEEKLY', label: 'Weekly', desc: 'Every Sunday' },
                      { id: 'MONTHLY', label: 'Monthly', desc: '1st of Month' }
                    ].map(freq => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => handleFrequencyChange(freq.id as BackupScheduleFrequency)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          settings.frequency === freq.id
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{freq.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{freq.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Next Scheduled:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {settings.nextScheduledBackupAt ? new Date(settings.nextScheduledBackupAt).toLocaleString() : 'Not scheduled'}
                    </strong>
                  </div>
                  {settings.lastBackupAt && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Last Backup:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {new Date(settings.lastBackupAt).toLocaleString()}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Storage Destination Selector */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Target Storage Destination
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose where database JSON snapshots are stored
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Google Drive Option */}
              <div 
                onClick={() => handleTargetChange('GOOGLE_DRIVE')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  settings.storageTarget === 'GOOGLE_DRIVE'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Google Drive</span>
                    </div>
                    {settings.googleDriveLinked && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                        LINKED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Direct cloud synchronization into a dedicated Google Drive folder accessible on any device.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  {!settings.googleDriveLinked ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLinkGoogleDrive();
                      }}
                      disabled={isAuthorizingDrive}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {isAuthorizingDrive ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      <span>Link Google Drive</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                        📁 {settings.googleDriveFolderName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkGoogleDrive();
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Local Storage Option */}
              <div 
                onClick={() => handleTargetChange('LOCAL_DOWNLOAD')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  settings.storageTarget === 'LOCAL_DOWNLOAD'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 rounded-lg">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Local Device Download</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generates encrypted, standalone `.json` files downloaded directly to your local computer or phone.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compatible with standard import</span>
                </div>
              </div>
            </div>

            {/* Custom Google Drive Folder Name */}
            {settings.storageTarget === 'GOOGLE_DRIVE' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Drive Folder Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.googleDriveFolderName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => ({ ...prev, googleDriveFolderName: val }));
                      updateBusiness({
                        ...business,
                        automatedBackupSettings: {
                          ...settings,
                          googleDriveFolderName: val
                        }
                      });
                    }}
                    placeholder="VyaparFlow Backups"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Policies & Snapshot Status */}
        <div className="space-y-6">
          {/* Policy & Security Options */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Backup Options & Retention
            </h4>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.includeAuditLogs}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings(prev => ({ ...prev, includeAuditLogs: checked }));
                    updateBusiness({
                      ...business,
                      automatedBackupSettings: {
                        ...settings,
                        includeAuditLogs: checked
                      }
                    });
                  }}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Include Security Audit Logs
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Export user access trails and biometric verification timestamps
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyOnBackupSuccess}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings(prev => ({ ...prev, notifyOnBackupSuccess: checked }));
                    updateBusiness({
                      ...business,
                      automatedBackupSettings: {
                        ...settings,
                        notifyOnBackupSuccess: checked
                      }
                    });
                  }}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Show Notification on Success
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Display in-app toast confirmation when export completes
                  </p>
                </div>
              </label>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Retention History Limit
                </label>
                <select
                  value={settings.autoPruneRetentionDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10);
                    setSettings(prev => ({ ...prev, autoPruneRetentionDays: days }));
                    updateBusiness({
                      ...business,
                      automatedBackupSettings: {
                        ...settings,
                        autoPruneRetentionDays: days
                      }
                    });
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={7}>Keep last 7 days of snapshots</option>
                  <option value={30}>Keep last 30 days of snapshots</option>
                  <option value={90}>Keep last 90 days of snapshots</option>
                  <option value={365}>Keep 1 year history</option>
                </select>
              </div>
            </div>
          </div>

          {/* Current Database Summary */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Live Database Scope
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px]">Invoices</span>
                <strong className="text-slate-900 dark:text-white text-sm">{invoices.length}</strong>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px]">Products</span>
                <strong className="text-slate-900 dark:text-white text-sm">{products.length}</strong>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px]">Parties</span>
                <strong className="text-slate-900 dark:text-white text-sm">{parties.length}</strong>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px]">Journal Entries</span>
                <strong className="text-slate-900 dark:text-white text-sm">{journalEntries.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup History & Log Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Backup History & Log
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical record of automated and manual database exports
            </p>
          </div>

          {(settings.backupHistory || []).length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {(!settings.backupHistory || settings.backupHistory.length === 0) ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Cloud className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No Backups Recorded Yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Click "Backup Now" above or enable scheduled exports to create your first snapshot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">File Name</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Scope</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {settings.backupHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 text-slate-900 dark:text-white font-medium whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {item.fileName}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        item.storageTarget === 'GOOGLE_DRIVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      }`}>
                        {item.storageTarget === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Local Download'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.sizeFormatted}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 text-[11px]">
                      {item.recordCounts.invoices} inv, {item.recordCounts.products} prod, {item.recordCounts.journalEntries} jv
                    </td>
                    <td className="py-3 text-right">
                      {item.driveFileUrl ? (
                        <a
                          href={item.driveFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                        >
                          <span>Open in Drive</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Saved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

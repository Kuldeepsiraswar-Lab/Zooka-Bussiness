import { AutomatedBackupSettings, BackupScheduleFrequency } from '../types/backup';

export const DEFAULT_AUTOMATED_BACKUP_SETTINGS: AutomatedBackupSettings = {
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

export const normalizeAutomatedBackupSettings = (
  settings?: Partial<AutomatedBackupSettings> | null
): AutomatedBackupSettings => {
  const base = DEFAULT_AUTOMATED_BACKUP_SETTINGS;
  if (!settings) return base;

  return {
    ...base,
    ...settings,
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : base.enabled,
    frequency: settings.frequency || base.frequency,
    storageTarget: settings.storageTarget || base.storageTarget,
    googleDriveLinked: typeof settings.googleDriveLinked === 'boolean' ? settings.googleDriveLinked : base.googleDriveLinked,
    googleDriveFolderName: settings.googleDriveFolderName || base.googleDriveFolderName,
    autoPruneRetentionDays: typeof settings.autoPruneRetentionDays === 'number' ? settings.autoPruneRetentionDays : base.autoPruneRetentionDays,
    notifyOnBackupSuccess: typeof settings.notifyOnBackupSuccess === 'boolean' ? settings.notifyOnBackupSuccess : base.notifyOnBackupSuccess,
    includeAuditLogs: typeof settings.includeAuditLogs === 'boolean' ? settings.includeAuditLogs : base.includeAuditLogs,
    encryptJsonWithPin: typeof settings.encryptJsonWithPin === 'boolean' ? settings.encryptJsonWithPin : base.encryptJsonWithPin,
    backupHistory: Array.isArray(settings.backupHistory) ? settings.backupHistory : []
  };
};

export const calculateNextBackupTime = (frequency: BackupScheduleFrequency, fromDate: Date = new Date()): Date => {
  const next = new Date(fromDate);
  switch (frequency) {
    case 'EVERY_6_HOURS':
      next.setHours(next.getHours() + 6);
      break;
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      next.setHours(2, 0, 0, 0); // Scheduled around 2:00 AM off-peak
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      next.setHours(2, 0, 0, 0);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      next.setHours(2, 0, 0, 0);
      break;
    case 'OFF':
    default:
      return next;
  }
  return next;
};

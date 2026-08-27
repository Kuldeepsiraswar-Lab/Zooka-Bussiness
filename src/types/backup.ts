/**
 * Auto-Backup Configuration & History Types
 */

export type BackupScheduleFrequency = 'OFF' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EVERY_6_HOURS';

export type BackupStorageTarget = 'GOOGLE_DRIVE' | 'LOCAL_DOWNLOAD' | 'CLOUD_FIRESTORE';

export interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  fileName: string;
  sizeBytes: number;
  sizeFormatted: string;
  recordCounts: {
    invoices: number;
    products: number;
    parties: number;
    purchaseBills: number;
    payments: number;
    expenses: number;
    accountHeads: number;
    journalEntries: number;
    cheques: number;
  };
  storageTarget: BackupStorageTarget;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  driveFileId?: string;
  driveFileUrl?: string;
  initiatedBy: 'AUTOMATIC_SCHEDULE' | 'MANUAL_TRIGGER';
}

export interface AutomatedBackupSettings {
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  storageTarget: BackupStorageTarget;
  googleDriveLinked: boolean;
  googleDriveUserEmail?: string;
  googleDriveFolderName: string;
  googleDriveFolderId?: string;
  lastBackupAt?: string;
  nextScheduledBackupAt?: string;
  autoPruneRetentionDays: number; // e.g. 30 days
  notifyOnBackupSuccess: boolean;
  includeAuditLogs: boolean;
  encryptJsonWithPin: boolean;
  backupHistory: BackupHistoryEntry[];
}

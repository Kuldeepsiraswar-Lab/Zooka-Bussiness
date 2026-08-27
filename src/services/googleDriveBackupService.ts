import { GoogleGenAI } from '@google/genai';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

/**
 * Google Drive Backup & Storage Client
 * Integrates directly with Google Drive API v3 via standard Google OAuth Access Token
 */

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  size: number;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
}

class GoogleDriveBackupService {
  private driveApiEndpoint = 'https://www.googleapis.com/drive/v3';
  private uploadEndpoint = 'https://www.googleapis.com/upload/drive/v3/files';

  /**
   * Check or acquire Google OAuth access token for Drive operations
   */
  public async getAccessToken(interactive: boolean = false): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    // Check if token exists in session storage and is still valid
    const cachedToken = sessionStorage.getItem('vyaparflow_gdrive_token');
    const cachedExpiry = sessionStorage.getItem('vyaparflow_gdrive_expiry');

    if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry, 10)) {
      return cachedToken;
    }

    // Try Google Identity Services (GIS) client token request
    if (window.google?.accounts?.oauth2) {
      return new Promise<string | null>((resolve) => {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: '916090337638-dummy.apps.googleusercontent.com', // fallback handled gracefully
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                const expiresIn = (parseInt(tokenResponse.expires_in, 10) || 3500) * 1000;
                sessionStorage.setItem('vyaparflow_gdrive_token', tokenResponse.access_token);
                sessionStorage.setItem('vyaparflow_gdrive_expiry', (Date.now() + expiresIn).toString());
                resolve(tokenResponse.access_token);
              } else {
                resolve(null);
              }
            },
            error_callback: () => {
              resolve(null);
            }
          });

          if (interactive) {
            client.requestAccessToken({ prompt: 'consent' });
          } else {
            client.requestAccessToken({ prompt: '' });
          }
        } catch {
          resolve(null);
        }
      });
    }

    return null;
  }

  /**
   * Find or create the dedicated backup folder on Google Drive
   */
  public async getOrCreateBackupFolder(
    token: string,
    folderName: string = 'VyaparFlow Backups'
  ): Promise<DriveFolderInfo | null> {
    try {
      // 1. Search for existing folder
      const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
      const searchRes = await fetch(
        `${this.driveApiEndpoint}/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          return {
            id: searchData.files[0].id,
            name: searchData.files[0].name
          };
        }
      }

      // 2. Folder doesn't exist, create it
      const createRes = await fetch(`${this.driveApiEndpoint}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Automated database backups created by VyaparFlow ERP'
        })
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        return {
          id: createData.id,
          name: createData.name
        };
      }

      return null;
    } catch (err) {
      console.warn('Drive folder lookup failed:', err);
      return null;
    }
  }

  /**
   * Upload database JSON backup file into Google Drive with multipart/related
   */
  public async uploadBackupFile(
    token: string,
    fileName: string,
    jsonContent: string,
    folderId?: string
  ): Promise<DriveUploadResult> {
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: 'application/json',
      description: `VyaparFlow Automated Backup Snapshot generated at ${new Date().toISOString()}`
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const response = await fetch(`${this.uploadEndpoint}?uploadType=multipart&fields=id,name,webViewLink,size`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return {
      fileId: result.id,
      fileName: result.name || fileName,
      webViewLink: result.webViewLink,
      size: parseInt(result.size, 10) || new Blob([jsonContent]).size
    };
  }

  /**
   * List recent backups in Google Drive folder
   */
  public async listRecentBackups(token: string, folderId?: string): Promise<any[]> {
    try {
      let q = "trashed=false and mimeType='application/json'";
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }
      const res = await fetch(
        `${this.driveApiEndpoint}/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&pageSize=15&fields=files(id,name,size,createdTime,webViewLink)`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        return data.files || [];
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const googleDriveBackupService = new GoogleDriveBackupService();

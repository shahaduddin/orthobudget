
/**
 * DriveService handles interaction with the Google Drive API.
 * It uses the 'drive.file' scope for security.
 */

const BACKUP_FILENAME = 'ortho_backup.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

class DriveService {
  private accessToken: string | null = null;
  private client: any = null;

  constructor() {
    this.accessToken = localStorage.getItem('ortho_drive_token');
  }

  async initClient(): Promise<boolean> {
    // If running in Median Native App, we skip the Web Client Init
    if (this.isNativeApp()) return true;

    return new Promise((resolve) => {
      if (this.client) return resolve(true);

      const checkScript = setInterval(() => {
        if (typeof window.google !== 'undefined') {
          clearInterval(checkScript);
          this.client = window.google.accounts.oauth2.initTokenClient({
            // Note: In a real app, this Client ID should be in process.env.GOOGLE_CLIENT_ID
            client_id: '188804817573-bvqi85eda7i84hnbh4h93tnr64t51e13.apps.googleusercontent.com',
            scope: DRIVE_SCOPE,
            callback: (response: any) => {
              if (response.access_token) {
                this.accessToken = response.access_token;
                localStorage.setItem('ortho_drive_token', this.accessToken!);
                resolve(true);
              } else {
                resolve(false);
              }
            },
          });
          resolve(true);
        }
      }, 500);
    });
  }

  // Helper to detect Median/GoNative environment
  private isNativeApp(): boolean {
    return navigator.userAgent.indexOf('gonative') > -1 || !!window.median;
  }

  async connect(): Promise<boolean> {
    // 1. Handle Native Median App Flow (Only if plugin is confirmed available)
    if (this.isNativeApp() && window.median?.socialLogin?.google?.login) {
        return new Promise((resolve) => {
            // Define the global callback that Median calls upon success
            window.gonative_social_login_google_callback = (data: any) => {
                if (data && data.accessToken) {
                    this.accessToken = data.accessToken;
                    localStorage.setItem('ortho_drive_token', this.accessToken!);
                    resolve(true);
                } else {
                    console.error('Native login failed or cancelled', data);
                    resolve(false);
                }
            };

            // Trigger the native plugin
            try {
                window.median.socialLogin.google.login();
            } catch (e) {
                // If call fails, return false to let caller handle error
                console.error("Native login call failed", e);
                resolve(false);
            }

            // Safety timeout: If native callback never fires (e.g. user cancels overlay on some devices)
            setTimeout(() => {
                resolve(false);
            }, 30000); // 30 second timeout
        });
    }

    // 2. Handle Standard Web Flow (Fallback)
    await this.initClient();
    if (!this.client) return false;
    
    return new Promise((resolve) => {
      this.client.requestAccessToken();
      // The callback in initClient will handle the response
      const checkToken = setInterval(() => {
        if (this.accessToken) {
          clearInterval(checkToken);
          resolve(true);
        }
      }, 1000);
      
      // Timeout after 60s
      setTimeout(() => {
        clearInterval(checkToken);
        if (!this.accessToken) resolve(false);
      }, 60000);
    });
  }

  disconnect() {
    this.accessToken = null;
    localStorage.removeItem('ortho_drive_token');
  }

  isConnected(): boolean {
    return !!this.accessToken;
  }

  private async fetchWithToken(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) throw new Error('Not connected to Google Drive');
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
        // Token expired
        this.disconnect();
        throw new Error('Session expired. Please reconnect Google Drive.');
    }
    
    return response;
  }

  async findBackupFile(): Promise<string | null> {
    const q = encodeURIComponent(`name = '${BACKUP_FILENAME}' and trashed = false`);
    const response = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }
  
  // Lightweight check if backup exists
  async checkForBackup(): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
        const fileId = await this.findBackupFile();
        return !!fileId;
    } catch (e) {
        console.error("Error checking backup", e);
        return false;
    }
  }

  async uploadBackup(jsonContent: string): Promise<boolean> {
    const fileId = await this.findBackupFile();
    
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await this.fetchWithToken(url, {
      method: fileId ? 'PATCH' : 'POST',
      body: form,
    });

    return response.ok;
  }

  async downloadBackup(): Promise<string | null> {
    const fileId = await this.findBackupFile();
    if (!fileId) return null;

    const response = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    if (!response.ok) return null;
    
    return await response.text();
  }
}

export const driveService = new DriveService();
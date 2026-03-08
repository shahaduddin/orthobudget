
// Simple client-side encryption to obfuscate data at rest in IndexedDB.
// Note: The key is stored in localStorage. This prevents casual inspection of IndexedDB
// but does not protect against an attacker with full access to the unlocked device/browser.

const STORAGE_KEY = 'ortho_secure_key';

class SecurityService {
  private key: string;

  constructor() {
    let storedKey = localStorage.getItem(STORAGE_KEY);
    if (!storedKey) {
      storedKey = this.generateKey();
      localStorage.setItem(STORAGE_KEY, storedKey);
    }
    this.key = storedKey;
  }

  private generateKey(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // A basic XOR cipher for client-side obfuscation (fast and synchronous)
  // For higher security, Web Crypto API should be used, but that requires async handling
  // which might complicate the sync nature of some UI components expecting instant data.
  // Given the requirement is "necessary security measure" for a PWA, this prevents
  // plain text reading of the DB.
  
  encrypt(text: string | undefined): string {
    if (!text) return '';
    try {
        const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
        const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
        const applySaltToChar = (code: any) => textToChars(this.key).reduce((a, b) => a ^ b, code);

        return text
            .split('')
            .map(textToChars)
            .map(applySaltToChar)
            .map(byteHex)
            .join('');
    } catch (e) {
        console.error("Encryption failed", e);
        return text;
    }
  }

  decrypt(encoded: string | undefined): string {
    if (!encoded) return '';
    // Check if string is likely encrypted (hex only). If not, return original (migration path)
    if (!/^[0-9a-fA-F]+$/.test(encoded)) return encoded;

    try {
        const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
        const applySaltToChar = (code: any) => textToChars(this.key).reduce((a, b) => a ^ b, code);
        
        return (encoded.match(/.{1,2}/g) || [])
            .map(hex => parseInt(hex, 16))
            .map(applySaltToChar)
            .map(charCode => String.fromCharCode(charCode))
            .join('');
    } catch (e) {
        // Fail safe: return original text if decryption fails (assumes it wasn't encrypted)
        return encoded;
    }
  }
}

export const securityService = new SecurityService();

import { User, Transaction, UserRole, UserTier, RecurringTransaction, Investment, Job, WorkLog, PortfolioSnapshot } from '../types';
import { securityService } from './security';

const DB_NAME = 'WealthWiseDB';
const DB_VERSION = 4; // Bumped version for new stores
const USERS_STORE = 'users';
const TRANSACTIONS_STORE = 'transactions';
const RECURRING_STORE = 'recurring_transactions';
const INVESTMENTS_STORE = 'investments';
const SNAPSHOTS_STORE = 'portfolio_snapshots';
const JOBS_STORE = 'jobs';
const WORK_LOGS_STORE = 'work_logs';

class DBService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject('Error opening DB');
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(USERS_STORE)) {
          const userStore = db.createObjectStore(USERS_STORE, { keyPath: 'email' });
          userStore.createIndex('username', 'username', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const txStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
          txStore.createIndex('userId', 'userId', { unique: false });
          txStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains(RECURRING_STORE)) {
          const recStore = db.createObjectStore(RECURRING_STORE, { keyPath: 'id' });
          recStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains(INVESTMENTS_STORE)) {
          const invStore = db.createObjectStore(INVESTMENTS_STORE, { keyPath: 'id' });
          invStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
          const snapStore = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
          snapStore.createIndex('userId', 'userId', { unique: false });
          snapStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains(JOBS_STORE)) {
          const jobStore = db.createObjectStore(JOBS_STORE, { keyPath: 'id' });
          jobStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains(WORK_LOGS_STORE)) {
          const logStore = db.createObjectStore(WORK_LOGS_STORE, { keyPath: 'id' });
          logStore.createIndex('userId', 'userId', { unique: false });
          logStore.createIndex('jobId', 'jobId', { unique: false });
          logStore.createIndex('date', 'date', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // Backup & Restore
  async exportDatabase(): Promise<string> {
    const db = await this.dbPromise;
    const exportData: any = { version: DB_VERSION, timestamp: Date.now() };
    const stores = [USERS_STORE, TRANSACTIONS_STORE, RECURRING_STORE, INVESTMENTS_STORE, SNAPSHOTS_STORE, JOBS_STORE, WORK_LOGS_STORE];
    
    // For export, we export the raw (potentially encrypted) data. 
    // This serves as a secure backup file.
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        exportData[storeName] = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
        });
      }
    }
    return JSON.stringify(exportData);
  }

  async importDatabase(jsonString: string): Promise<boolean> {
    try {
        const data = JSON.parse(jsonString);
        const db = await this.dbPromise;
        const stores = [USERS_STORE, TRANSACTIONS_STORE, RECURRING_STORE, INVESTMENTS_STORE, SNAPSHOTS_STORE, JOBS_STORE, WORK_LOGS_STORE];

        for (const storeName of stores) {
          if (!data[storeName]) continue;
          
          if (db.objectStoreNames.contains(storeName)) {
              const tx = db.transaction(storeName, 'readwrite');
              const store = tx.objectStore(storeName);
              
              // Clear existing data
              await new Promise<void>((resolve, reject) => {
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
              });

              // Add new data
              for (const item of data[storeName]) {
                store.put(item);
              }
          }
        }
        return true;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
  }

  // Destruction Method
  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    const stores = [USERS_STORE, TRANSACTIONS_STORE, RECURRING_STORE, INVESTMENTS_STORE, SNAPSHOTS_STORE, JOBS_STORE, WORK_LOGS_STORE];
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach(s => {
          if (db.objectStoreNames.contains(s)) {
            tx.objectStore(s).clear();
          }
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // User Methods
  async saveUser(user: User): Promise<void> {
    const store = await this.getStore(USERS_STORE, 'readwrite');
    // Ensure email is lowercase for consistent ID matching
    user.email = user.email.toLowerCase();
    
    // Encrypt sensitive PII
    if (user.fullName) user.fullName = securityService.encrypt(user.fullName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUser(email: string): Promise<User | undefined> {
    const store = await this.getStore(USERS_STORE, 'readonly');
    const normalizedEmail = email.toLowerCase();
    
    return new Promise((resolve, reject) => {
      const request = store.get(normalizedEmail);
      request.onsuccess = () => {
          const user = request.result;
          if (user && user.fullName) {
              user.fullName = securityService.decrypt(user.fullName);
          }
          resolve(user);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers(): Promise<User[]> {
    const store = await this.getStore(USERS_STORE, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(email: string): Promise<void> {
    const store = await this.getStore(USERS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(email.toLowerCase());
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Transaction Methods
  async addTransaction(transaction: Transaction): Promise<void> {
    const store = await this.getStore(TRANSACTIONS_STORE, 'readwrite');
    transaction.userId = transaction.userId.toLowerCase();
    
    // Encrypt description for privacy
    transaction.description = securityService.encrypt(transaction.description);
    
    return new Promise((resolve, reject) => {
      const request = store.put(transaction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    const store = await this.getStore(TRANSACTIONS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    const store = await this.getStore(TRANSACTIONS_STORE, 'readonly');
    const index = store.index('userId');
    const normalizedId = userId.toLowerCase();
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(normalizedId);
      request.onsuccess = () => {
          const transactions = request.result || [];
          // Decrypt descriptions
          transactions.forEach((t: Transaction) => {
              t.description = securityService.decrypt(t.description);
          });
          resolve(transactions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Recurring Transaction Methods
  async addRecurringTransaction(transaction: RecurringTransaction): Promise<void> {
    const store = await this.getStore(RECURRING_STORE, 'readwrite');
    transaction.userId = transaction.userId.toLowerCase();
    
    // Encrypt description
    transaction.description = securityService.encrypt(transaction.description);

    return new Promise((resolve, reject) => {
      const request = store.put(transaction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
    const store = await this.getStore(RECURRING_STORE, 'readonly');
    const index = store.index('userId');
    const normalizedId = userId.toLowerCase();

    return new Promise((resolve, reject) => {
      const request = index.getAll(normalizedId);
      request.onsuccess = () => {
          const items = request.result || [];
          items.forEach((t: RecurringTransaction) => {
              t.description = securityService.decrypt(t.description);
          });
          resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateRecurringTransaction(transaction: RecurringTransaction): Promise<void> {
    const store = await this.getStore(RECURRING_STORE, 'readwrite');
    transaction.userId = transaction.userId.toLowerCase();
    transaction.description = securityService.encrypt(transaction.description);
    
    return new Promise((resolve, reject) => {
      const request = store.put(transaction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecurringTransaction(id: string): Promise<void> {
    const store = await this.getStore(RECURRING_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Investment Methods
  async addInvestment(investment: Investment): Promise<void> {
    const store = await this.getStore(INVESTMENTS_STORE, 'readwrite');
    investment.userId = investment.userId.toLowerCase();
    
    // Encrypt name
    investment.name = securityService.encrypt(investment.name);

    return new Promise((resolve, reject) => {
      const request = store.put(investment);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getInvestments(userId: string): Promise<Investment[]> {
    const store = await this.getStore(INVESTMENTS_STORE, 'readonly');
    const index = store.index('userId');
    const normalizedId = userId.toLowerCase();

    return new Promise((resolve, reject) => {
      const request = index.getAll(normalizedId);
      request.onsuccess = () => {
          const items = request.result || [];
          items.forEach((i: Investment) => {
              i.name = securityService.decrypt(i.name);
          });
          resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteInvestment(id: string): Promise<void> {
    const store = await this.getStore(INVESTMENTS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Portfolio Snapshot Methods
  async addPortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
    const store = await this.getStore(SNAPSHOTS_STORE, 'readwrite');
    snapshot.userId = snapshot.userId.toLowerCase();
    return new Promise((resolve, reject) => {
      const request = store.put(snapshot);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPortfolioSnapshots(userId: string): Promise<PortfolioSnapshot[]> {
    const store = await this.getStore(SNAPSHOTS_STORE, 'readonly');
    const index = store.index('userId');
    const normalizedId = userId.toLowerCase();
    return new Promise((resolve, reject) => {
      const request = index.getAll(normalizedId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Job & Work Log Methods
  async addJob(job: Job): Promise<void> {
    const store = await this.getStore(JOBS_STORE, 'readwrite');
    job.userId = job.userId.toLowerCase();
    
    // Encrypt Title
    job.title = securityService.encrypt(job.title);

    return new Promise((resolve, reject) => {
      const request = store.put(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getJobs(userId: string): Promise<Job[]> {
    const store = await this.getStore(JOBS_STORE, 'readonly');
    const index = store.index('userId');
    const normalizedId = userId.toLowerCase();

    return new Promise((resolve, reject) => {
      const request = index.getAll(normalizedId);
      request.onsuccess = () => {
          const items = request.result || [];
          items.forEach((j: Job) => {
              j.title = securityService.decrypt(j.title);
          });
          resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteJob(id: string): Promise<void> {
    const store = await this.getStore(JOBS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addWorkLog(log: WorkLog): Promise<void> {
    const store = await this.getStore(WORK_LOGS_STORE, 'readwrite');
    log.userId = log.userId.toLowerCase();
    
    // Encrypt Notes
    if (log.notes) log.notes = securityService.encrypt(log.notes);

    return new Promise((resolve, reject) => {
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteWorkLog(id: string): Promise<void> {
    const store = await this.getStore(WORK_LOGS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getWorkLogs(userId: string): Promise<WorkLog[]> {
    const store = await this.getStore(WORK_LOGS_STORE, 'readonly');
    const index = store.index('userId');
    const normalizedId = userId.toLowerCase();

    return new Promise((resolve, reject) => {
      const request = index.getAll(normalizedId);
      request.onsuccess = () => {
          const items = request.result || [];
          items.forEach((l: WorkLog) => {
              if (l.notes) l.notes = securityService.decrypt(l.notes);
          });
          resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DBService();

// Mock Server Backup
export const syncWithServer = async (user: User, transactions: Transaction[]): Promise<boolean> => {
  // In a real app, this would POST to an API.
  console.log('Syncing to server backup...', { user, transactionsCount: transactions.length });
  return true;
};
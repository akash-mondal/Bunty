/**
 * IndexedDB wrapper for secure local storage of witness data
 * Provides encrypted storage with automatic database initialization
 */

const DB_NAME = 'BuntyWitnessDB';
const DB_VERSION = 1;
const WITNESS_STORE = 'witnesses';

export interface StoredWitness {
  id: string;
  userId: string;
  encryptedData: string;
  iv: string;
  timestamp: number;
  hash: string;
}

class IndexedDBWrapper {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create witness store if it doesn't exist
        if (!db.objectStoreNames.contains(WITNESS_STORE)) {
          const objectStore = db.createObjectStore(WITNESS_STORE, {
            keyPath: 'id',
          });
          objectStore.createIndex('userId', 'userId', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Store a witness in IndexedDB
   */
  async storeWitness(witness: StoredWitness): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WITNESS_STORE], 'readwrite');
      const store = transaction.objectStore(WITNESS_STORE);
      const request = store.put(witness);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store witness'));
    });
  }

  /**
   * Retrieve a witness by ID
   */
  async getWitness(id: string): Promise<StoredWitness | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WITNESS_STORE], 'readonly');
      const store = transaction.objectStore(WITNESS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Failed to retrieve witness'));
    });
  }

  /**
   * Get all witnesses for a user
   */
  async getWitnessesByUser(userId: string): Promise<StoredWitness[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WITNESS_STORE], 'readonly');
      const store = transaction.objectStore(WITNESS_STORE);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(new Error('Failed to retrieve witnesses'));
    });
  }

  /**
   * Get the most recent witness for a user
   */
  async getLatestWitness(userId: string): Promise<StoredWitness | null> {
    const witnesses = await this.getWitnessesByUser(userId);
    if (witnesses.length === 0) {
      return null;
    }
    // Sort by timestamp descending and return the most recent
    witnesses.sort((a, b) => b.timestamp - a.timestamp);
    return witnesses[0];
  }

  /**
   * Delete a witness by ID
   */
  async deleteWitness(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WITNESS_STORE], 'readwrite');
      const store = transaction.objectStore(WITNESS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete witness'));
    });
  }

  /**
   * Delete all witnesses for a user
   */
  async deleteWitnessesByUser(userId: string): Promise<void> {
    const witnesses = await this.getWitnessesByUser(userId);
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WITNESS_STORE], 'readwrite');
      const store = transaction.objectStore(WITNESS_STORE);

      let completed = 0;
      let hasError = false;

      witnesses.forEach((witness) => {
        const request = store.delete(witness.id);
        request.onsuccess = () => {
          completed++;
          if (completed === witnesses.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          hasError = true;
          reject(new Error('Failed to delete witnesses'));
        };
      });

      // Handle empty array case
      if (witnesses.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Clear all data from the database
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WITNESS_STORE], 'readwrite');
      const store = transaction.objectStore(WITNESS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear database'));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBWrapper();

import { openDB, type IDBPDatabase } from 'idb';
import type { HistoryEntry, ChallengeHistoryEntry } from '@/types';

const DB_NAME = 'koreksikoding-db';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1 || !db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp');
        }
        if (oldVersion < 2 || !db.objectStoreNames.contains('challenges')) {
          const challengeStore = db.createObjectStore('challenges', { keyPath: 'id' });
          challengeStore.createIndex('timestamp', 'timestamp');
          challengeStore.createIndex('challengeId', 'challengeId');
        }
      },
    });
    return dbInstance;
  } catch {
    dbInstance = null;
    throw new Error('Gagal membuka database. Coba muat ulang halaman.');
  }
}

export const db = {
  async addHistory(entry: HistoryEntry): Promise<void> {
    const database = await getDB();
    await database.put('history', entry);
  },

  async getAllHistory(): Promise<HistoryEntry[]> {
    const database = await getDB();
    return database.getAllFromIndex('history', 'timestamp');
  },

  async deleteHistory(id: string): Promise<void> {
    const database = await getDB();
    await database.delete('history', id);
  },

  async clearHistory(): Promise<void> {
    const database = await getDB();
    await database.clear('history');
  },

  async importHistory(entries: HistoryEntry[]): Promise<number> {
    const database = await getDB();
    const tx = database.transaction('history', 'readwrite');
    let count = 0;
    for (const entry of entries) {
      await tx.store.put(entry);
      count++;
    }
    await tx.done;
    return count;
  },

  async addChallengeHistory(entry: ChallengeHistoryEntry): Promise<void> {
    const database = await getDB();
    await database.put('challenges', entry);
  },

  async getChallengeHistoryByChallengeId(challengeId: string): Promise<ChallengeHistoryEntry | undefined> {
    const database = await getDB();
    const results = await database.getAllFromIndex('challenges', 'challengeId', challengeId);
    return results[0];
  },

  async getAllChallengeHistory(): Promise<ChallengeHistoryEntry[]> {
    const database = await getDB();
    return database.getAllFromIndex('challenges', 'timestamp');
  },

  async deleteChallengeHistory(id: string): Promise<void> {
    const database = await getDB();
    await database.delete('challenges', id);
  },

  async clearChallengeHistory(): Promise<void> {
    const database = await getDB();
    await database.clear('challenges');
  },

  async importChallengeHistory(entries: ChallengeHistoryEntry[]): Promise<number> {
    const database = await getDB();
    const tx = database.transaction('challenges', 'readwrite');
    let count = 0;
    for (const entry of entries) {
      await tx.store.put(entry);
      count++;
    }
    await tx.done;
    return count;
  },
};

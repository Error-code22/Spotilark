"use client";

const DB_NAME = "SpotilarkMusicDB";
const STORE_NAME = "tracks";
const DB_VERSION = 3; // Incremented to force a clean schema migration
const MAX_CACHED_TRACKS = 50; // Keep only the 50 most recent tracks

interface CacheEntry {
    blob: Blob;
    lastUsed: number;
    id: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: any) => {
            const db = request.result;

            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }

            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("lastUsed", "lastUsed", { unique: false });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromise = null; // Reset on error
            reject(request.error);
        };
    });
    return dbPromise;
};

export const getCachedTrack = async (trackId: string): Promise<Blob | null> => {
    try {
        const db = await openDB();
        const entry = await new Promise<CacheEntry | null>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(trackId);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // Update lastUsed timestamp (LRU)
                    result.lastUsed = Date.now();
                    store.put(result);
                    resolve(result);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
        return entry ? entry.blob : null;
    } catch (error) {
        console.error("Cache Read Error:", error);
        return null;
    }
};

const performCleanup = async (db: IDBDatabase) => {
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();

        countRequest.onsuccess = () => {
            if (countRequest.result >= MAX_CACHED_TRACKS) {
                const index = store.index("lastUsed");
                const cursorRequest = index.openCursor(); // Oldest first due to index
                let deletedCount = 0;
                const toDelete = countRequest.result - MAX_CACHED_TRACKS + 1;

                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (cursor && deletedCount < toDelete) {
                        store.delete(cursor.primaryKey);
                        deletedCount++;
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
            } else {
                resolve();
            }
        };
        countRequest.onerror = () => reject(countRequest.error);
    });
};

export const cacheTrack = async (trackId: string, blob: Blob): Promise<void> => {
    try {
        const db = await openDB();
        await performCleanup(db);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const entry: CacheEntry = {
                id: trackId,
                blob,
                lastUsed: Date.now()
            };
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Cache Write Error:", error);
    }
};

export const clearMusicCache = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

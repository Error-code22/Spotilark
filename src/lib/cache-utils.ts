"use client";

const DB_NAME = "SpotilarkMusicDB";
const STORE_NAME = "tracks";
const COVERS_STORE = "covers";
const METADATA_STORE = "metadata";
const DB_VERSION = 5;

interface CacheEntry {
    blob: Blob;
    lastUsed: number;
    id: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let dbRetryCount = 0;
const MAX_DB_RETRIES = 3;

export const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: any) => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                store.createIndex("lastUsed", "lastUsed", { unique: false });
            }

            if (!db.objectStoreNames.contains(COVERS_STORE)) {
                db.createObjectStore(COVERS_STORE, { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                db.createObjectStore(METADATA_STORE, { keyPath: "id" });
            }
        };
        request.onsuccess = () => {
            dbRetryCount = 0;
            resolve(request.result);
        };
        request.onerror = () => {
            dbPromise = null;
            if (dbRetryCount < MAX_DB_RETRIES) {
                dbRetryCount++;
                console.warn(`[DB] IndexedDB open failed (attempt ${dbRetryCount}/${MAX_DB_RETRIES}), retrying...`);
                setTimeout(() => {
                    dbPromise = null;
                    resolve(openDB());
                }, 100 * dbRetryCount);
            } else {
                console.error("[DB] IndexedDB open failed after max retries:", request.error);
                reject(request.error);
            }
        };
        request.onblocked = () => {
            console.warn("[DB] IndexedDB open blocked — another connection is open");
        };
    });
    return dbPromise;
};

// --- Audio blob cache ---
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

export const cacheTrack = async (trackId: string, blob: Blob): Promise<void> => {
    try {
        const db = await openDB();

        // Try to store — if quota exceeded, evict oldest tracks
        try {
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const entry: CacheEntry = { id: trackId, blob, lastUsed: Date.now() };
                const request = store.put(entry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
                console.warn('[Cache] Quota exceeded, evicting oldest tracks...');
                await evictOldestTracks(db, 10);
                // Retry
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                store.put({ id: trackId, blob, lastUsed: Date.now() });
            } else {
                throw e;
            }
        }
    } catch (error) {
        console.error("Cache Write Error:", error);
    }
};

const evictOldestTracks = async (db: IDBDatabase, count: number) => {
    return new Promise<void>((resolve) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("lastUsed");
        const cursorRequest = index.openCursor();
        let deleted = 0;

        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor && deleted < count) {
                store.delete(cursor.primaryKey);
                deleted++;
                cursor.continue();
            } else {
                resolve();
            }
        };
        cursorRequest.onerror = () => resolve();
    });
};

export const clearMusicCache = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Cover cache ---
export const saveCover = async (trackId: string, coverUrl: string): Promise<void> => {
    if (!coverUrl || coverUrl.startsWith('/') || coverUrl.startsWith('http')) return;
    try {
        const db = await openDB();
        const transaction = db.transaction(COVERS_STORE, "readwrite");
        const store = transaction.objectStore(COVERS_STORE);
        await new Promise<void>((resolve, reject) => {
            const request = store.put({ id: trackId, cover: coverUrl });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Cover Save Error:", error);
    }
};

export const getCover = async (trackId: string): Promise<string | null> => {
    console.log(`[CacheDB] Reading cover for ${trackId} from IndexedDB...`);
    try {
        const db = await openDB();
        const transaction = db.transaction(COVERS_STORE, "readonly");
        const store = transaction.objectStore(COVERS_STORE);
        return new Promise((resolve, reject) => {
            const request = store.get(trackId);
            request.onsuccess = () => {
                const cover = request.result?.cover || null;
                console.log(`[CacheDB] Read cover for ${trackId} success: ${cover ? cover.substring(0, 100) + '...' : 'NULL'}`);
                resolve(cover);
            };
            request.onerror = () => {
                console.error(`[CacheDB] Read cover for ${trackId} failed:`, request.error);
                reject(request.error);
            };
        });
    } catch (err) {
        console.error(`[CacheDB] Read cover try-catch failed for ${trackId}:`, err);
        return null;
    }
};

export const saveCoversBatch = async (covers: Record<string, string>): Promise<void> => {
    console.log(`[CacheDB] Writing batch of ${Object.keys(covers).length} covers to IndexedDB...`);
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(COVERS_STORE, "readwrite");
            const store = transaction.objectStore(COVERS_STORE);
            for (const [trackId, coverUrl] of Object.entries(covers)) {
                if (coverUrl && (coverUrl.startsWith('data:') || coverUrl.startsWith('blob:'))) {
                    console.log(`[CacheDB] Storing cover in batch for trackId: ${trackId}`);
                    store.put({ id: trackId, cover: coverUrl });
                } else {
                    console.warn(`[CacheDB] Skipping invalid cover in batch for trackId: ${trackId} (starts with: ${coverUrl ? coverUrl.substring(0, 20) : 'falsy'})`);
                }
            }
            transaction.oncomplete = () => {
                console.log(`[CacheDB] Batch cover write transaction COMPLETED`);
                resolve();
            };
            transaction.onerror = () => {
                console.error(`[CacheDB] Batch cover write transaction FAILED:`, transaction.error);
                reject(transaction.error);
            };
        });
    } catch (error) {
        console.error("Cover Batch Save Error:", error);
    }
};

// --- Metadata cache (replaces localStorage for track lists) ---
export const saveLocalLibrary = async (tracks: any[]): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(METADATA_STORE, "readwrite");
        const store = transaction.objectStore(METADATA_STORE);
        // Store as a single entry with key 'local-library'
        await new Promise<void>((resolve, reject) => {
            const request = store.put({ id: 'local-library', tracks, updatedAt: Date.now() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Metadata Save Error:", error);
    }
};

export const loadLocalLibrary = async (): Promise<any[] | null> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(METADATA_STORE, "readonly");
        const store = transaction.objectStore(METADATA_STORE);
        return new Promise((resolve, reject) => {
            const request = store.get('local-library');
            request.onsuccess = () => resolve(request.result?.tracks || null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
};

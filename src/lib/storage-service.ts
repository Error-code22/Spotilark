"use client";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

// ============================================================
// Platform-aware storage service
// Capacitor: Filesystem (audio) + SQLite (metadata)
// Electron: Filesystem via Node.js (bundled in preload)
// Web: IndexedDB (everything)
// ============================================================

const isNative = () => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI || Capacitor.isNativePlatform();
};
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  if (!!(window as any).electronAPI) return false;
  return Capacitor.isNativePlatform();
};

const isElectron = () => typeof window !== 'undefined' && !!(window as any).electronAPI;

// --- SQLite initialization (Capacitor only) ---
let sqliteReady = false;
let db: any = null;

const initSQLite = async () => {
  if (sqliteReady) return db;
  if (typeof window === 'undefined') return null;
  if (!!(window as any).electronAPI) return null;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
    const sqlite = new SQLiteConnection(CapacitorSQLite);

    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection("spotilark", false)).result;

    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection("spotilark", false);
    } else {
      db = await sqlite.createConnection("spotilark", false, "no-encryption", 1, false);
    }

    await db.open();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        album TEXT,
        duration REAL,
        cover_path TEXT,
        source_path TEXT,
        storage_type TEXT,
        created_at TEXT,
        created_by TEXT,
        genre TEXT,
        extra TEXT
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    sqliteReady = true;
    console.log("[Storage] SQLite initialized");
    return db;
  } catch (e: any) {
    console.error("[Storage] SQLite init failed:", e);
    return null;
  }
};

// ============================================================
// AUDIO BLOB STORAGE
// ============================================================

export const storeAudioBlob = async (trackId: string, blob: Blob, filePath?: string): Promise<string> => {
  if (isCapacitor()) {
    // Capacitor: save to native filesystem
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const capPath = `audio/${trackId}.dat`;
    await Filesystem.writeFile({
      path: capPath,
      data: base64,
      directory: Directory.Data,
      encoding: 'base64' as any,
    });

    console.log(`[Storage] Saved ${blob.size} bytes to filesystem: ${capPath}`);
    return capPath;
  } else if (isElectron()) {
    // Electron: if we have the original file path, reference it AND cache blob in IndexedDB as fallback
    if (filePath) {
      console.log(`[Storage] Local file, storing path reference: ${filePath}`);
      const { cacheTrack } = await import("./cache-utils");
      cacheTrack(trackId, blob).catch(() => {});
      return filePath;
    }
    // Otherwise (cloud/YouTube downloads), save to AppData
    const api = (window as any).electronAPI;
    const paths = await api.getPaths();
    const audioDir = `${paths.userData}\\audio`;
    await api.mkdir(audioDir);
    const savePath = `${audioDir}\\${trackId}.dat`;
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await api.writeFile(savePath, uint8Array);
    console.log(`[Storage] Saved ${blob.size} bytes to Electron AppData: ${savePath}`);
    return savePath;
  } else {
    // Web: use IndexedDB
    const { cacheTrack } = await import("./cache-utils");
    await cacheTrack(trackId, blob);
    return `idb://${trackId}`;
  }
};

export const loadAudioBlob = async (trackId: string, sourcePath?: string): Promise<Blob | null> => {
  if (isCapacitor() && sourcePath && !sourcePath.startsWith("idb://")) {
    try {
      const result = await Filesystem.readFile({
        path: sourcePath,
        directory: Directory.Data,
        encoding: 'base64' as any,
      });

      const base64 = result.data as string;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log(`[Storage] Loaded ${bytes.length} bytes from filesystem: ${sourcePath}`);
      return new Blob([bytes], { type: "audio/mpeg" });
    } catch (e: any) {
      console.error(`[Storage] Filesystem read failed:`, e);
      return null;
    }
  } else if (isElectron() && sourcePath && !sourcePath.startsWith("idb://")) {
    // Electron: load from file path (original location or AppData)
    try {
      const api = (window as any).electronAPI;
      const exists = await api.exists(sourcePath);
      if (!exists) return null;
      const buffer = await api.readFile(sourcePath);
      return new Blob([buffer], { type: "audio/mpeg" });
    } catch (e: any) {
      console.error(`[Storage] Electron filesystem read failed:`, e);
      return null;
    }
  } else {
    // Web: use IndexedDB
    const { getCachedTrack } = await import("./cache-utils");
    return getCachedTrack(trackId);
  }
};

export const deleteAudioFile = async (trackId: string, sourcePath?: string): Promise<void> => {
  if (isCapacitor() && sourcePath && !sourcePath.startsWith("idb://")) {
    try {
      await Filesystem.deleteFile({ path: sourcePath, directory: Directory.Data });
    } catch {}
  } else {
    const { openDB } = await import("./cache-utils");
    try {
      const database = await openDB();
      const tx = database.transaction("tracks", "readwrite");
      tx.objectStore("tracks").delete(trackId);
    } catch {}
  }
};

// ============================================================
// METADATA STORAGE
// ============================================================

export const saveTrackMetadata = async (tracks: any[]): Promise<void> => {
  if (isCapacitor()) {
    const database = await initSQLite();
    if (!database) return;

    for (const track of tracks) {
      await database.run(
        `INSERT OR REPLACE INTO tracks (id, title, artist, album, duration, cover_path, source_path, storage_type, created_at, created_by, genre, extra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          track.id, track.title, track.artist || "", track.album || "",
          track.duration || 0, track.coverPath || "", track.sourcePath || "",
          track.storage_type || "local", track.created_at || new Date().toISOString(),
          track.created_by || "", track.genre || "", JSON.stringify(track.extra || {})
        ]
      );
    }
    console.log(`[Storage] Saved ${tracks.length} tracks to SQLite`);
  } else {
    const { saveLocalLibrary } = await import("./cache-utils");
    await saveLocalLibrary(tracks);
  }
};

export const loadTrackMetadata = async (): Promise<any[]> => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const { loadLocalLibrary } = await import("./cache-utils");
    return (await loadLocalLibrary()) || [];
  }
  if (isCapacitor()) {
    const database = await initSQLite();
    if (!database) return [];

    const result = await database.query("SELECT * FROM tracks ORDER BY created_at DESC");
    return result.values || [];
  } else {
    const { loadLocalLibrary } = await import("./cache-utils");
    return (await loadLocalLibrary()) || [];
  }
};

export const deleteTrackMetadata = async (trackId: string): Promise<void> => {
  if (isCapacitor()) {
    const database = await initSQLite();
    if (!database) return;
    await database.run("DELETE FROM tracks WHERE id = ?", [trackId]);
  } else {
    const { loadLocalLibrary, saveLocalLibrary } = await import("./cache-utils");
    const tracks = (await loadLocalLibrary()) || [];
    await saveLocalLibrary(tracks.filter((t: any) => t.id !== trackId));
  }
};

// ============================================================
// COVER STORAGE
// ============================================================

export const saveCover = async (trackId: string, coverDataUrl: string): Promise<void> => {
  if (!coverDataUrl || (!coverDataUrl.startsWith("data:") && !coverDataUrl.startsWith("blob:"))) return;

  if (isCapacitor()) {
    // Save cover image to filesystem
    try {
      const base64Data = coverDataUrl.startsWith("data:")
        ? coverDataUrl.split(",")[1]
        : await blobToBase64(await fetch(coverDataUrl).then(r => r.blob()));

      const coverPath = `covers/${trackId}.jpg`;
      try {
        await Filesystem.mkdir({
          path: 'covers',
          directory: Directory.Data,
          recursive: true,
        });
      } catch {
        // Directory might already exist
      }

      await Filesystem.writeFile({
        path: coverPath,
        data: base64Data,
        directory: Directory.Data,
        encoding: 'base64' as any,
      });

      // Update track metadata with cover path
      const database = await initSQLite();
      if (database) {
        await database.run("UPDATE tracks SET cover_path = ? WHERE id = ?", [coverPath, trackId]);
      }
    } catch (e) {
      console.error("[Storage] Cover save failed:", e);
    }
  } else {
    const { saveCover: saveCoverIDB } = await import("./cache-utils");
    await saveCoverIDB(trackId, coverDataUrl);
  }
};

export const loadCover = async (trackId: string, coverPath?: string): Promise<string | null> => {
  if (isCapacitor() && coverPath) {
    try {
      const result = await Filesystem.readFile({
        path: coverPath,
        directory: Directory.Data,
        encoding: 'base64' as any,
      });
      return `data:image/jpeg;base64,${result.data}`;
    } catch {
      return null;
    }
  } else {
    const { getCover } = await import("./cache-utils");
    return getCover(trackId);
  }
};

export const saveCoversBatch = async (covers: Record<string, string>): Promise<void> => {
  if (isCapacitor()) {
    for (const [trackId, coverUrl] of Object.entries(covers)) {
      await saveCover(trackId, coverUrl);
    }
  } else {
    const { saveCoversBatch: saveBatchIDB } = await import("./cache-utils");
    await saveBatchIDB(covers);
  }
};

// ============================================================
// SETTINGS STORAGE
// ============================================================

export const saveSetting = async (key: string, value: string): Promise<void> => {
  if (isCapacitor()) {
    const database = await initSQLite();
    if (database) {
      await database.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    }
  } else {
    localStorage.setItem(key, value);
  }
};

export const loadSetting = async (key: string): Promise<string | null> => {
  if (isCapacitor()) {
    const database = await initSQLite();
    if (!database) return null;
    const result = await database.query("SELECT value FROM settings WHERE key = ?", [key]);
    return result.values?.[0]?.value || null;
  } else {
    return localStorage.getItem(key);
  }
};

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export const clearAllStorage = async (): Promise<void> => {
  if (isCapacitor()) {
    // Delete audio files
    try {
      await Filesystem.rmdir({ path: "audio", directory: Directory.Data, recursive: true });
    } catch {}
    try {
      await Filesystem.rmdir({ path: "covers", directory: Directory.Data, recursive: true });
    } catch {}

    // Clear SQLite
    const database = await initSQLite();
    if (database) {
      await database.execute("DELETE FROM tracks");
      await database.execute("DELETE FROM settings");
    }
  } else {
    const { clearMusicCache } = await import("./cache-utils");
    await clearMusicCache();
  }
};

// ============================================================
// HELPERS
// ============================================================

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(blob);
  });

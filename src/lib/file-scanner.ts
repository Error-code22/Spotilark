import { Track } from './data';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.opus'];

function isAudioFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        resolve(audio.duration || 0);
        audio.src = '';
      };
      audio.onerror = () => resolve(0);
      audio.src = filePath;
      setTimeout(() => resolve(0), 5000);
    } catch {
      resolve(0);
    }
  });
}

interface ScanResult {
  folderName: string;
  tracks: Track[];
  trackCount: number;
}

export async function scanNativeFolders(): Promise<ScanResult[]> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return [];

  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const results: ScanResult[] = [];

  try {
    const result = await scanDirectoryRecursive(Filesystem, Directory, Directory.ExternalStorage, '', 'Internal Storage');
    if (result.tracks.length > 0) {
      results.push(result);
    }
  } catch {
    // Directory might not be accessible
  }

  return results;
}

async function scanDirectoryRecursive(Filesystem: any, Directory: any, baseDir: any, path: string, folderName: string): Promise<ScanResult> {
  const tracks: Track[] = [];

  try {
    const entries = await Filesystem.readdir({
      path,
      directory: baseDir,
    });

    for (const entry of entries.files) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.type === 'directory') {
        const subResult = await scanDirectoryRecursive(Filesystem, Directory, baseDir, entryPath, folderName);
        tracks.push(...subResult.tracks);
      } else if (isAudioFile(entry.name)) {
        let duration = 0;
        try {
          const uri = await Filesystem.getUri({ path: entryPath, directory: baseDir });
          duration = await getAudioDuration(uri.uri);
        } catch {
          // Duration extraction failed, use 0
        }

        const track: Track = {
          id: `local-${entryPath}-${entry.size}-${entry.mtime}`,
          title: entry.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          source_url: '',
          duration: duration || 0,
          cover: '/spotilark-without-text-white.png',
          created_at: new Date(entry.mtime).toISOString(),
          created_by: 'local-user',
          storage_type: 'local',
        };
        tracks.push(track);
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return { folderName, tracks, trackCount: tracks.length };
}

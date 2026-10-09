import { Directory, Filesystem } from '@capacitor/filesystem';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma', '.opus'];

const ANDROID_MUSIC_PATHS = [
  'Music',
  'Download',
  'Download/YouTube Music',
  'Download/Audio',
  'WhatsApp/Media/WhatsApp Audio',
  'Telegram/Telegram Audio',
  'Recordings',
  'MIUI/music',
  'DCIM',
];

export interface MusicFolder {
  path: string;
  name: string;
  fileCount: number;
}

async function scanDir(path: string): Promise<string[]> {
  try {
    const result = await Filesystem.readdir({
      path,
      directory: Directory.ExternalStorage,
    });
    return result.files.map(f => f.name);
  } catch {
    return [];
  }
}

async function countAudioFiles(dirPath: string): Promise<number> {
  try {
    const result = await Filesystem.readdir({
      path: dirPath,
      directory: Directory.ExternalStorage,
    });
    let count = 0;
    for (const file of result.files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

export async function detectMusicFolders(): Promise<MusicFolder[]> {
  const folders: MusicFolder[] = [];

  for (const relativePath of ANDROID_MUSIC_PATHS) {
    const audioCount = await countAudioFiles(relativePath);
    if (audioCount > 0) {
      folders.push({
        path: relativePath,
        name: relativePath.split('/').pop() || relativePath,
        fileCount: audioCount,
      });
    }
  }

  // Also scan root for any folders we missed
  try {
    const rootFiles = await Filesystem.readdir({
      path: '',
      directory: Directory.ExternalStorage,
    });
    for (const item of rootFiles.files) {
      if (item.type === 'directory') {
        const alreadyFound = folders.some(f => f.path === item.name);
        if (!alreadyFound) {
          const audioCount = await countAudioFiles(item.name);
          if (audioCount > 0) {
            folders.push({
              path: item.name,
              name: item.name,
              fileCount: audioCount,
            });
          }
        }
      }
    }
  } catch {}

  return folders.sort((a, b) => b.fileCount - a.fileCount);
}

export async function scanFolderForTracks(folderPath: string): Promise<any[]> {
  try {
    const result = await Filesystem.readdir({
      path: folderPath,
      directory: Directory.ExternalStorage,
    });
    const tracks: any[] = [];
    for (const file of result.files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) {
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        tracks.push({
          id: `local-${folderPath}/${file.name}`,
          title,
          artist: 'Unknown Artist',
          album: folderPath.split('/').pop() || 'Local Music',
          cover: null,
          duration: 0,
          storage_type: 'local',
          source_url: null,
          file_path: `${folderPath}/${file.name}`,
        });
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

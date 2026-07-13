import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Auto-detect yt-dlp and ffmpeg paths.
 * Priority: env variable → PATH lookup → common locations
 */
function findBinary(name: string, envVar: string, commonPaths: string[]): string {
  // 1. Check env variable
  const envPath = process.env[envVar];
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2. Check PATH
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${which} ${name}`, { encoding: 'utf-8', timeout: 3000 }).trim();
    if (result && fs.existsSync(result)) return result;
  } catch {}

  // 3. Check common locations
  for (const p of commonPaths) {
    const expanded = p.replace('~', os.homedir());
    if (fs.existsSync(expanded)) return expanded;
  }

  // 4. Return the first common path as fallback (will fail gracefully at runtime)
  return commonPaths[0] || name;
}

export const YTDLP_PATH = findBinary(
  'yt-dlp',
  'YTDLP_PATH',
  process.platform === 'win32'
    ? [
        'C:\\src\\DevTools\\yt-dlp.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'yt-dlp.exe'),
        'C:\\tools\\yt-dlp.exe',
        'yt-dlp.exe',
      ]
    : [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        path.join(os.homedir(), '.local', 'bin', 'yt-dlp'),
        'yt-dlp',
      ]
);

/**
 * Get the directory containing ffmpeg (for yt-dlp --ffmpeg-location).
 * If FFMPEG_PATH points to a file, returns its parent directory.
 */
function findFFmpegDir(): string {
  const rawPath = findBinary(
    'ffmpeg',
    'FFMPEG_PATH',
    process.platform === 'win32'
      ? [
          'C:\\src\\DevTools\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin\\ffmpeg.exe',
          path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'ffmpeg', 'bin', 'ffmpeg.exe'),
          'C:\\tools\\ffmpeg.exe',
          'ffmpeg.exe',
        ]
      : [
          '/usr/local/bin/ffmpeg',
          '/usr/bin/ffmpeg',
          'ffmpeg',
        ]
  );

  // If it's a file, return the parent directory
  if (fs.existsSync(rawPath) && fs.statSync(rawPath).isFile()) {
    return path.dirname(rawPath);
  }

  // If it's a directory, return it directly
  if (fs.existsSync(rawPath) && fs.statSync(rawPath).isDirectory()) {
    return rawPath;
  }

  // Fallback: try to find ffmpeg in common directories
  const commonDirs = process.platform === 'win32'
    ? [
        'C:\\src\\DevTools\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'ffmpeg', 'bin'),
        'C:\\tools',
        'C:\\ffmpeg\\bin',
      ]
    : [
        '/usr/local/bin',
        '/usr/bin',
      ];

  for (const dir of commonDirs) {
    const expanded = dir.replace('~', os.homedir());
    const ffmpegPath = path.join(expanded, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(ffmpegPath)) return expanded;
  }

  return path.dirname(rawPath);
}

export const FFMPEG_PATH = findFFmpegDir();

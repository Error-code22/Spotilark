# Fix Capacitor Mobile Build - Server-Backed Approach

## Context
Spotilark is a Next.js 16 cross-platform music player. The Capacitor Android build fails because:
1. Build scripts reference Tauri (which isn't installed) instead of Capacitor
2. `next.config.ts` uses `output: 'standalone'` but Capacitor needs `output: 'export'`
3. Server-dependent features (YouTube streaming, search) can't work in a static build
4. The workaround of hiding the API folder doesn't actually fix the output mode

**Goal:** Fix the Capacitor mobile build to work with a deployed backend server.

## Issues to Fix

### 1. Fix Build Scripts (Remove Tauri References)

**File: `build-android-debug.bat`**
- Currently uses `npx tauri android build` — Tauri is not installed
- Replace with proper Capacitor build commands

**File: `build-all.bat`**
- References `src-tauri/tauri.conf.json` — doesn't exist
- Remove Tauri sections, focus on Capacitor for mobile

**New approach for `build-android-debug.bat`:**
```bat
@echo off
echo ==========================================
echo    SPOTILARK ANDROID DEBUG BUILD
echo ==========================================
echo.

:: 1. Build Next.js for static export
echo [1/3] Building Web App (Static Export)...
set NEXT_PUBLIC_ENV=export
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Web Build failed!
    pause
    exit /b 1
)

:: 2. Sync to Android
echo [2/3] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [!] Capacitor Sync failed!
    pause
    exit /b 1
)

:: 3. Build APK
echo [3/3] Building Android APK...
call cd android && gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo [!] Android Build failed!
    pause
    exit /b 1
)

echo.
echo Build complete! APK: android/app/build/outputs/apk/debug/app-debug.apk
pause
```

### 2. Fix next.config.ts for Dual Output Modes

The config needs to support both:
- `output: 'standalone'` for Electron (server-side)
- `output: 'export'` for Capacitor (static)

**Solution:** Use environment variable to switch modes:

```typescript
import type { NextConfig } from 'next';

const isExport = process.env.NEXT_PUBLIC_ENV === 'export';

const nextConfig: NextConfig = {
  output: isExport ? 'export' : 'standalone',
  // ... rest of config
};
```

### 3. Fix capacitor.config.ts

**Current issues:**
- `server.url: 'http://10.0.7.130:9002'` — this is a local dev IP, not suitable for production
- For production builds, this should be removed (uses `webDir: 'out'` instead)
- Need to add server URL configuration for the deployed backend

**Updated config:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spotilark.app',
  appName: 'Spotilark',
  webDir: 'out',
  server: {
    // For development, point to local Next.js server
    // For production, comment out to use static files from webDir
    // url: 'http://YOUR_SERVER_IP:9002',
    // cleartext: true,
    allowNavigation: ['*'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
} as CapacitorConfig & { customScheme: string };

Object.assign(config, { customScheme: 'spotilark' });

export default config;
```

### 4. Create Environment Configuration

Create `.env.capacitor` for mobile-specific settings:
```env
# Server URL for API calls (your deployed Next.js server)
NEXT_PUBLIC_API_URL=https://your-server.com

# Disable features that require server-side processing
NEXT_PUBLIC_YOUTUBE_ENABLED=true
NEXT_PUBLIC_UPLOAD_ENABLED=true
```

### 5. Update API Routes for External Server

When running in Capacitor, API calls need to go to the external server, not `localhost`.

**Create `src/lib/api-config.ts`:**
```typescript
export function getApiBaseUrl(): string {
  // In Capacitor, use external server
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  // In browser/electron, use relative URLs
  return '';
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
```

### 6. Fix YouTube Stream Route (force-static)

**File: `src/app/api/stream/youtube/route.ts`**
- Remove `export const dynamic = 'force-static'` if present
- This route performs runtime operations (yt-dlp) and must be dynamic

**File: `src/app/api/search/remote/route.ts`**
- Same fix — remove force-static

## Build Process (After Fixes)

### For Development (Testing on Device):
1. Start local Next.js server: `npm run dev`
2. Update `capacitor.config.ts` with your local IP: `url: 'http://YOUR_IP:9002'`
3. Run: `npx cap sync android && npx cap open android`
4. Build and run from Android Studio

### For Production (APK Build):
1. Deploy Next.js server to your hosting (Railway, Vercel, VPS)
2. Update `NEXT_PUBLIC_API_URL` in `.env.capacitor`
3. Remove `server.url` from `capacitor.config.ts` (use static files)
4. Run: `npm run build` (with `NEXT_PUBLIC_ENV=export`)
5. Run: `npx cap sync android`
6. Build APK: `cd android && gradlew assembleRelease`

### For Production with Live Server:
1. Build web: `NEXT_PUBLIC_ENV=export npm run build`
2. Sync to Android: `npx cap sync android`
3. Build APK: `cd android && gradlew assembleRelease`
4. The app will call your server for YouTube/streaming features

## Testing Checklist

After fixes, verify:
- [ ] `npm run build` works with `NEXT_PUBLIC_ENV=export`
- [ ] `npx cap sync android` completes without errors
- [ ] Android APK builds successfully
- [ ] App launches and shows splash screen
- [ ] Local library works (scan folders, play local files)
- [ ] YouTube search works (calls external server)
- [ ] YouTube streaming works (proxied through server)
- [ ] Upload functionality works (via server)
- [ ] Background audio works on Android
- [ ] Deep linking works (`spotilark://track/:id`)

## Expected Outcome
- Capacitor Android build succeeds
- App launches and functions correctly
- Server-dependent features work via deployed backend
- Local features work offline
- Build scripts are clean and maintainable
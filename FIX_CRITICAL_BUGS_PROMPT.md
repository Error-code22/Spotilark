# Critical Bug Fix Prompt for Spotilark

## Context
Spotilark is a Next.js 16 cross-platform music player (web, Electron desktop, Capacitor Android) with Supabase backend. The codebase has several critical security and reliability issues that need immediate attention.

## Critical Issues to Fix

### 1. Security Vulnerability: Electron IPC Arbitrary Filesystem Access
**File:** `electron/main.js` (lines 294, 306)
**Problem:** The `fs-read-file` and `fs-write-file` IPC handlers expose arbitrary filesystem access from the renderer process with no path validation. This is a severe security vulnerability.
**Solution:**
- Implement path whitelisting for IPC handlers
- Restrict file access to specific directories (user data folder, app resources)
- Add path validation that rejects paths containing `..`, absolute paths outside allowed directories
- Use `app.getPath('userData')` as the base directory for user data
- Log and reject any attempts to access files outside allowed paths

### 2. Production Breaking: `force-static` on Dynamic API Routes
**Files:** 
- `src/app/api/stream/youtube/route.ts` (line 12)
- `src/app/api/search/remote/route.ts` (line 8)
**Problem:** These routes export `force-static` but they perform runtime operations (call yt-dlp, fetch from external APIs). In production, this will cause stale/empty responses.
**Solution:**
- Remove `export const dynamic = 'force-static'` from both files
- Ensure routes are dynamic (default behavior) since they perform runtime operations
- Verify that any caching logic still works correctly without force-static

### 3. Hardcoded Windows Paths
**Files:**
- `electron/main.js` (lines 31-35): `C:\\src\\DevTools\\yt-dlp.exe`
- `package.json` (line 122): `C:\\src\\DevTools\\yt-dlp.exe`
**Problem:** Hardcoded Windows paths break cross-platform builds and fail on other systems.
**Solution:**
- Replace hardcoded paths with `process.env.YT_DLP_PATH` or relative paths
- Use `path.join(__dirname, '..', 'yt-dlp.exe')` for Electron resources
- Update `package.json` to use `yt-dlp.exe` without absolute path (electron-builder handles this)
- Add environment variable fallback: `const ytDlpPath = process.env.YT_DLP_PATH || path.join(app.getPath('exe'), '..', 'yt-dlp.exe');`

## Additional Security Improvements (Recommended)

### 4. Supabase Client Consolidation
**Problem:** 16+ `createClient()` instantiations across components
**Solution:**
- Create a single Supabase client instance in `src/lib/supabase/client.ts`
- Export and reuse throughout the app
- Remove duplicate `createClient()` calls in ThemeContext and other components

### 5. Remove Debug Console Banners
**Files:**
- `src/context/PlayerContext.tsx` (line 105)
- `src/context/DeviceContext.tsx` (line 69)
**Problem:** Debug console banners fire on every component mount, cluttering production logs.
**Solution:**
- Remove or wrap in `process.env.NODE_ENV === 'development'` checks
- Consider using a proper logging library with log levels

## Implementation Guidelines

1. **Test each change** - Verify fixes don't break existing functionality
2. **Maintain backward compatibility** - Existing users shouldn't experience regressions
3. **Update environment documentation** - Document any new environment variables
4. **Security audit** - After fixes, review other IPC handlers and API routes for similar issues

## Expected Outcome
- Critical security vulnerability patched
- Production API routes will function correctly
- Cross-platform builds will work
- Improved code quality with proper logging and client management

## Priority Order
1. Electron IPC security (immediate risk)
2. `force-static` removal (production breakage)
3. Hardcoded paths (build failures)
4. Supabase consolidation (code quality)
5. Debug cleanup (log hygiene)
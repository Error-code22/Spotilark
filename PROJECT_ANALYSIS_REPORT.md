# Spotilark — Complete Project Analysis Report

## Overview

**Spotilark** is a cross-platform music player (v0.1.8) that blends cloud streaming (YouTube/Spotify), local file playback, and a Supabase-backed social library. It runs as a **Next.js web app**, **Electron desktop app**, and **Capacitor Android app** from a single codebase.

---

## Project Structure

```
C:\src\spotilark-web\
├── package.json              # Next.js + Electron + Capacitor
├── next.config.ts            # Standalone output, Turbopack, jsmediatags alias
├── capacitor.config.ts       # Android config (com.spotilark.app)
├── tailwind.config.ts        # Tailwind v3 config
├── tsconfig.json             # Path alias @/* → src/*
├── jest.config.ts            # Jest test config
├── database_setup.sql        # Supabase schema (tracks, playlists, playlist_songs)
├── PROGRESS.md               # Detailed changelog across sessions
├── cloud_integration_plan.md
├── project_progress.md
├── project_walkthru.md
│
├── electron/                 # Electron desktop shell
│   ├── main.js               # ~300 lines — window, IPC, yt-dlp integration
│   └── preload.js            # contextBridge API
│
├── src/
│   ├── middleware.ts          # Supabase SSR auth middleware
│   │
│   ├── app/                  # Next.js App Router pages (29 routes)
│   │   ├── layout.tsx        # Root layout (Providers, SettingsProvider, Caveat font)
│   │   ├── page.tsx          # Home → SpotilarkLayout + TrackList
│   │   ├── globals.css       # Tailwind base + theme variables
│   │   ├── api/              # 22 API route directories
│   │   │   ├── stream/       # YouTube/audio/video streaming proxy
│   │   │   ├── search/       # YouTube search (yt-dlp + Data API + Piped + Invidious)
│   │   │   ├── download/     # YouTube download (youtube-dl-exec)
│   │   │   ├── youtube/      # YouTube cookie management
│   │   │   ├── upload/       # File upload to Supabase Storage
│   │   │   ├── library/      # Library CRUD
│   │   │   ├── friends/      # Friend system
│   │   │   ├── auth/         # Supabase auth
│   │   │   ├── cloud/        # Cloud storage integration
│   │   │   ├── video/        # Video search/proxy
│   │   │   └── ...           # 12 more API directories
│   │   ├── login/            # Login page
│   │   ├── signup/           # Signup page
│   │   ├── search/           # Search page (YouTube + library)
│   │   ├── playlists/        # Playlists list
│   │   ├── playlist/         # Single playlist view
│   │   ├── folders/          # Local folders scanner + storage dashboard
│   │   ├── lyrics/           # Full-screen lyrics view
│   │   ├── settings/         # Settings page (7 sections)
│   │   ├── profile/          # User profile with stats
│   │   ├── video/            # YouTube + local video player page
│   │   ├── music/            # Music library
│   │   ├── artist/           # Artist view
│   │   ├── albums/           # Album view
│   │   ├── messages/         # Messaging
│   │   ├── admin/            # Admin panel
│   │   ├── upload/           # Upload page
│   │   ├── offline/          # Offline page
│   │   ├── random/           # Random track
│   │   └── fonts/            # Caveat font files
│   │
│   ├── context/              # React Context providers (6)
│   │   ├── PlayerContext.tsx  # ~1800 lines — CORE: playback, queue, split audio, local+cloud library
│   │   ├── SettingsContext.tsx # Crossfade, playback speed, streaming quality, filters
│   │   ├── ThemeContext.tsx   # 24 themes (12 light + 12 dark), wallpaper
│   │   ├── DeviceContext.tsx  # Multi-device sync (Spotify-style device switching)
│   │   ├── UploadContext.tsx  # Upload state management
│   │   └── Providers.tsx     # Combines all providers
│   │
│   ├── lib/                  # Business logic (28 files)
│   │   ├── data.ts           # Track, Lyric interfaces
│   │   ├── types.ts          # Theme types (LightTheme, DarkTheme, ThemeSettings, User)
│   │   ├── youtube-utils.ts  # 5-tier stream resolution (Piped→yt-dlp→ytdl-core→Invidious→Cobalt)
│   │   ├── youtube-cookies.ts # Cookie path management for yt-dlp
│   │   ├── network-instances.ts # Piped/Invidious/Cobalt instance lists
│   │   ├── lyrics.ts         # Lyrics fetcher (LRCLIB)
│   │   ├── lrclib.ts         # LRCLIB API client
│   │   ├── cache-utils.ts    # IndexedDB (SpotilarkMusicDB, 3 stores)
│   │   ├── storage-service.ts # Capacitor native storage
│   │   ├── file-scanner.ts   # Native folder scanning (Capacitor Filesystem)
│   │   ├── sync-service.ts   # Offline sync queue (localStorage)
│   │   ├── capacitor-audio.ts # Background audio + media notification
│   │   ├── capacitor-init.ts # Splash screen + deep linking
│   │   ├── supabase/         # Supabase client + server helpers
│   │   ├── supabaseClient.ts # Legacy Supabase client
│   │   ├── auth-actions.ts   # Auth helper functions
│   │   ├── badge-system.ts   # Achievement badges
│   │   ├── mood-analyzer.ts  # Mood tagging for tracks
│   │   ├── cloudinary.ts     # Image optimization
│   │   ├── multer.ts         # File upload middleware
│   │   ├── rate-limit.ts     # API rate limiting
│   │   ├── presence-utils.ts # User presence tracking
│   │   ├── friend-code.ts    # Friend code system
│   │   ├── device-utils.ts   # Device identification
│   │   ├── telegram.ts       # Telegram bot integration
│   │   ├── telegram-client.ts # Telegram bot client
│   │   ├── utils.ts          # cn(), formatTime() utilities
│   │   └── suppress-errors.ts # Error suppression
│   │
│   ├── components/           # UI components (24 top-level)
│   │   ├── layout/           # Core layout components (11)
│   │   │   ├── spotilark-layout.tsx  # Main app shell (sidebar + content + right panel)
│   │   │   ├── left-sidebar.tsx      # Navigation sidebar
│   │   │   ├── main-content.tsx      # Route content wrapper
│   │   │   ├── right-panel.tsx       # Album art + lyrics panel
│   │   │   ├── now-playing.tsx       # ~1100 lines — Full NowPlaying view (split lyrics/player)
│   │   │   ├── player-controls.tsx   # Bottom player bar
│   │   │   ├── track-list.tsx        # Library track list with multi-select, view modes
│   │   │   ├── track-tile.tsx        # Individual track row/card
│   │   │   ├── queue-list.tsx        # Play queue
│   │   │   ├── lyrics-view.tsx       # Full-screen lyrics
│   │   │   ├── RedoDotIcon.tsx       # Custom icon
│   │   │   └── UndoDotIcon.tsx       # Custom icon
│   │   ├── ui/               # shadcn/ui primitives (standard set)
│   │   ├── AppProviders.tsx   # App-level provider wrapper (local-first loading)
│   │   ├── PlayerAudio.tsx    # 3 hidden <audio> elements (primary + next + right)
│   │   ├── WaveformProgress.tsx # SoundCloud-style waveform progress bar
│   │   ├── FloatingVideoPlayer.tsx # Floating video overlay (ported from Splayer)
│   │   ├── Equalizer.tsx     # Audio equalizer
│   │   ├── TagEditor.tsx     # ID3 tag editor
│   │   ├── DownloadManager.tsx # YouTube download manager
│   │   ├── ImportDialog.tsx  # Format picker for imports
│   │   ├── YouTubeAuth.tsx   # YouTube cookie upload dialog
│   │   ├── SyncIndicator.tsx # Offline sync status badge
│   │   ├── ThemeSelector.tsx # Theme picker (24 themes)
│   │   ├── MusicUploadForm.tsx # Upload form
│   │   ├── create-playlist-dialog.tsx
│   │   ├── edit-playlist-dialog.tsx
│   │   ├── add-songs-to-playlist-dialog.tsx
│   │   ├── LayoutContent.tsx # Client-side layout wrapper
│   │   ├── ModeToggle.tsx    # Light/dark mode toggle
│   │   ├── TauriUpdater.tsx  # Tauri auto-updater
│   │   ├── theme-provider.tsx # next-themes provider
│   │   └── upload-music.tsx  # Upload music component
│   │
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript declarations
│   └── tailwind.config.ts    # App-level Tailwind config
│
├── supabase/
│   └── migrations/           # 5 SQL migrations
│       ├── 20240523000000_create_user_stats.sql
│       ├── 20241228000000_add_video_url_to_tracks.sql
│       ├── 20260119000000_create_devices_table.sql
│       ├── 20260121000000_create_profiles_table.sql
│       └── 20260122000000_add_snippet_to_tracks.sql
│
├── android/                  # Capacitor Android project
├── dist-electron/            # Electron build output
├── out/                      # Next.js static export
└── public/                   # Static assets (icons, screenshots, manifest)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| State | React Context (6 providers) |
| Data Backend | Supabase (PostgreSQL + Auth + Storage) |
| Data Persistence | IndexedDB (SpotilarkMusicDB) + localStorage |
| Desktop | Electron 43 |
| Mobile | Capacitor 8.4 |
| YouTube | yt-dlp (CLI) + youtube-dl-exec + @distube/ytdl-core |
| Lyrics | LRCLIB API |
| Images | Cloudinary |
| Bot | node-telegram-bot-api |
| Package Manager | npm (not pnpm) |
| Build | Next.js standalone output + electron-builder |
| Testing | Jest + Testing Library |
| Font | Caveat (handwritten style) |

---

## Key Features & Architecture

### 1. Audio Playback Engine (`PlayerContext.tsx` — 1800+ lines)
- **3 hidden `<audio>` elements**: primary, next (pre-fetched), right (split audio)
- **Crossfade**: Configurable duration, pre-fetches next track
- **Split Audio**: Side-by-side dual-player mode (left/right audio)
- **Playback Speed**: Configurable, persisted
- **Sleep Timer**: Countdown with auto-pause
- **Play Count Tracking**: Per-track counts, persisted in localStorage
- **Recently Played**: Max 50 entries, persisted
- **Queue Management**: Shuffle, repeat (off/all/one), play next, play after
- **Lyrics Sync**: Fetches from LRCLIB, supports LRC timestamps

### 2. YouTube Integration (5-Tier Fallback)
- **Tier 1**: Piped instances (parallel racing, 7s timeout each)
- **Tier 2**: yt-dlp local binary (with cookie auth, 5-min cache)
- **Tier 3**: @distube/ytdl-core (Node.js)
- **Tier 4**: Invidious instances (parallel racing)
- **Tier 5**: Cobalt API (ultimate fallback)
- **Cookie Auth**: Server-side cookie management, Netscape format
- **Search**: yt-dlp local search → YouTube Data API v3 → yt-search → Piped → Invidious
- **Streaming**: Server-side proxy (`/api/stream/youtube`) to bypass CORS

### 3. Cloud Library (Supabase)
- **Tracks table**: UUID, title, artist, album, cover, source_url, duration, lyrics, genre, videoUrl, snippet data
- **Playlists table**: User-owned, with playlist_songs join table
- **Row Level Security**: Users can only access their own data
- **Real-time sync**: Presence tracking, device synchronization
- **Storage**: Audio files stored in Supabase Storage

### 4. Local-First Architecture
- **Dual library**: Cloud (Supabase) + Local (file system / Capacitor)
- **Unified library**: Merged view of both sources
- **Offline bypass**: Can use app without login for local files
- **Capacitor storage**: Native platform storage for audio blobs, covers, metadata
- **IndexedDB cache**: Audio blob caching with LRU eviction (3 stores: tracks, covers, metadata)

### 5. Multi-Device Sync (DeviceContext)
- **Device registration**: Identifies browser/app/device type
- **Heartbeat**: Periodic sync to Supabase
- **Remote control**: Transfer playback between devices
- **Commands**: Play/pause, seek, skip, volume, set track
- **Active device display**: Shows which device is playing

### 6. Offline Sync Queue (`sync-service.ts`)
- **Actions**: play_event, like, unlike
- **Storage**: localStorage queue
- **Auto-sync**: Triggers on reconnect
- **UI indicator**: Floating SyncIndicator badge

### 7. Video Player
- **Dedicated `/video` page**: YouTube search + local video import
- **FloatingVideoPlayer**: Draggable overlay (ported from Splayer)
- **3 view modes**: Small (list), Medium (details), Large (grid)
- **Quality picker**: 360p, 480p, 720p, 1080p
- **Download**: MP3 or MP4 via API endpoint
- **Local video import**: File/folder picker, cover extraction, duration detection

### 8. Theming System
- **24 themes**: 12 light + 12 dark color palettes
- **Named themes**: Classic White, Soft Gray, Warm Beige, Pastel Sky, Minty Fresh, Lavender, Coral, Rose, Ocean, Golden, Arctic, Sand (light); Classic Dark, Slate Gray, Midnight Blue, Coffee Dark, Forest Night, Deep Purple, Crimson, Rose Night, Deep Ocean, Obsidian, Glacier, Desert (dark)
- **Wallpaper**: Custom background image with blur effect
- **CSS variables**: Full theme variable system

### 9. Social Features
- **Friend system**: Friend codes, friend list
- **Presence**: Online status tracking
- **Messages**: In-app messaging
- **Share**: Web Share API with clipboard fallback
- **Profile**: Stats, badges, mood tags

### 10. Capacitor Native Features
- **Background audio**: Web Media Session API for notification/lock screen controls
- **Native file scanning**: Capacitor Filesystem plugin, recursive directory traversal
- **Storage dashboard**: Internal storage, cloud tracks, local tracks, offline cached
- **Deep linking**: `spotilark://track/:id` and `spotilark://playlist/:id`
- **Splash screen**: 2s display, black background, white spinner

---

## Database Schema (Supabase)

### tracks
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| title | TEXT | Required |
| artist | TEXT | |
| album | TEXT | |
| cover | TEXT | URL to cover image |
| source_url | TEXT | Required — audio file URL |
| duration | INTEGER | Seconds |
| lyrics | JSONB | Array of {time, text} |
| genre | TEXT | e.g. "Podcast" |
| video_url | TEXT | Added in migration |
| snippet_url | TEXT | 15s intro snippet |
| snippet_data | TEXT | Base64 encoded snippet |
| created_at | TIMESTAMP | Auto |
| created_by | UUID | FK to auth.users |

### playlists
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| name | TEXT | Required |
| description | TEXT | |
| cover | TEXT | |
| created_at | TIMESTAMP | Auto |

### playlist_songs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| playlist_id | UUID | FK to playlists |
| track_id | UUID | FK to tracks |
| created_at | TIMESTAMP | Auto |
| | | UNIQUE(playlist_id, track_id) |

### user_stats
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | Primary key |
| listening_time | INTEGER | Total seconds |
| songs_played | INTEGER | Total count |

### devices
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| name | TEXT | Device name |
| type | TEXT | Device type |
| is_active | BOOLEAN | |
| last_seen | TIMESTAMP | |
| current_track_json | JSONB | Currently playing track |
| position_ms | INTEGER | Playback position |
| is_playing | BOOLEAN | |
| volume | INTEGER | 0-100 |
| queue_ids | UUID[] | Queue track IDs |

---

## Electron Desktop (`electron/main.js`)

| Feature | Implementation |
|---------|---------------|
| Window | 1400x900, min 1000x600, black background |
| Dev Mode | Loads localhost:9002, DevTools detached |
| Production | Starts Next.js standalone server on port 9100 |
| YouTube Login | Opens Google login window, captures cookies, exports to Netscape format |
| yt-dlp | Spawns as child process (search, stream URL, download) |
| File System | IPC handlers for read, readdir, exists |
| App Paths | Returns userData, downloads, music, home paths |
| Custom Protocol | `local-audio://` for local file playback |
| Menu | Minimal (Reload, DevTools, Zoom, Quit) |

---

## Build & Distribution

| Platform | Command | Output |
|----------|---------|--------|
| Dev Web | `npm run dev` | localhost:9002 |
| Dev Electron | `npm run electron:dev` | Electron + Next.js dev |
| Build Web | `npm run build` | .next/ + out/ |
| Build Electron | `npm run electron:build:win` | NSIS installer in dist-electron/ |
| Build Android | Capacitor sync + Android Studio | APK |

---

## Notable Implementation Details

- **Caveat font**: Handwritten-style font for the UI (loaded locally)
- **SoundCloud-style waveform**: Canvas-based progress bar with 180 amplitude bars
- **Multi-select mode**: Checkbox selection with batch actions
- **View modes**: Small/Medium/Large cover art sizes
- **Lyrics add/edit**: Paste plain text or LRC format, auto-detects timestamps
- **Podcast section**: Dedicated tab for podcast-tagged tracks
- **Min duration/file size filters**: Hide short tracks from library
- **Continuous playback**: Toggle for auto-advance
- **Badge system**: Achievement badges for user engagement
- **Mood tags**: Colored mood tag badges for tracks
- **Friend codes**: Social connection system
- **Telegram bot**: Bot integration for notifications
- **Local-first loading**: AppProviders no longer clears tracks on Supabase error
- **Blob URL expiration fix**: Converts to data URLs (base64) for local songs
- **Search history**: localStorage, max 20 queries, dropdown on focus

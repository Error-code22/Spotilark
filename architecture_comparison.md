# Architecture Comparison: Spotilark vs. Splayer

This document compares the architectural designs of your project **Spotilark** and the reference project **Splayer**. It highlights why you feel Spotilark is over-complicating things and provides recommendations on how to simplify your setup.

---

## 1. High-Level Architecture Comparison

### Splayer Architecture (Static SPA + Electron IPC)
Splayer uses a **Single Page Application (SPA)** model. The React frontend is compiled into static HTML/JS/CSS files. There is **no backend web server** running in the application.

```mermaid
graph TD
    subgraph Frontend [React Frontend (Static Files)]
        UI[React Components]
        API[platform-api.ts]
        UI -->|Calls| API
    end

    subgraph OS [Electron Main Process (Node.js)]
        IPC[IPC Main Handlers]
        YTDLP[yt-dlp & ffmpeg]
        FS[Local File System]
        
        API -->|window.electronAPI| IPC
        IPC -->|Spawns| YTDLP
        IPC -->|Reads/Writes| FS
    end
```

*   **How it works:** Electron simply loads the static `index.html` file directly from the disk. When the frontend needs to download a song, run `yt-dlp`, or read a local file, it invokes Electron's Inter-Process Communication (IPC) via `window.electronAPI`. All system-level operations happen inside Electron's main process.
*   **Capacitor (Android/iOS) Compatibility:** Because the frontend is just static files, Capacitor can bundle them directly. In `platform-api.ts`, Splayer detects if it is running on Android and routes the same functions (like `ytDownload`) to native Capacitor plugins instead of Electron IPC.

---

### Spotilark Architecture (Next.js + Electron Server)
Spotilark tries to run a full **Next.js Server** inside Electron.

```mermaid
graph TD
    subgraph Electron [Electron Process]
        Win[BrowserWindow]
    end

    subgraph NextJS_Frontend [Next.js Client (Chromium Window)]
        UI[React Pages/Components]
    end

    subgraph NextJS_Server [Next.js Server (Separate Node.js Process)]
        API[API Routes /api/stream/youtube]
        YTDLP[yt-dlp & ffmpeg]
        FS[Local File System]
    end

    Win -->|Loads Local URL http://localhost:9002| NextJS_Frontend
    UI -->|HTTP fetch requests| API
    API -->|Spawns| YTDLP
    API -->|Reads/Writes| FS
```

*   **How it works:** Spotilark spins up two Node.js processes:
    1.  The Electron main process.
    2.  A Next.js server (dev server on port `9002` or a standalone production server on port `9100`).
    Electron then opens a window loading `http://localhost:9002`. The frontend makes HTTP requests (like `fetch('/api/stream/youtube')`) to the local Next.js server. The Next.js server then spawns `yt-dlp` and `ffmpeg`.

---

## 2. Why Spotilark is Getting Complicated (and Failing)

Here are the direct consequences of the Next.js + Electron architecture that are causing your errors:

### 1. The "Double Node" Environment & Path Issues
Because Next.js runs as a **separate server process** started by `concurrently` before Electron runs, it does not inherit the environment variables or paths set inside Electron's `main.js`. 
*   **The Error:** `ERROR: Postprocessing: ffprobe and ffmpeg not found.`
*   **Why it happens:** In `electron/main.js`, you detect `FFMPEG_PATH` and set `process.env.FFMPEG_PATH = FFMPEG_PATH`. However, since Next.js is running in a completely different process, it doesn't see this environment variable! It falls back to default values in `src/lib/binary-paths.ts`, which fail if they aren't exactly right on your system.

### 2. Port Conflicts & Server Management
Running a local web server in a desktop app is fragile:
*   If port `9002` or `9100` is already in use by another app, Spotilark will fail to start.
*   Next.js has to build, compile, and boot up. This makes startup slow and resource-heavy (high RAM usage).

### 3. Isolation of API Routes from Electron
Next.js API routes run in the backend Node process, completely isolated from Electron.
*   **The Problem:** If an API route needs to open a native "Select Folder" dialog box or check if the window is maximized, it **cannot** do it, because Next.js has no access to Electron's `dialog` or `BrowserWindow` APIs.

---

## 3. Comparison Summary Table

| Feature | Splayer (Vite + Electron SPA) | Spotilark (Next.js + Electron) |
| :--- | :--- | :--- |
| **Server Requirement** | None (loads static `index.html`) | Local Node.js server running in background |
| **Startup Speed** | Instant | Slow (must wait for Next.js to start) |
| **Native API Access** | Direct access via Electron IPC | Limited (separated by HTTP border) |
| **Resource Usage** | Low (single Chromium process) | High (Chromium + two Node.js processes) |
| **Port Conflicts** | Impossible | Possible (if ports 9002/9100 are busy) |
| **Mobile (Capacitor)** | fully offline on-device native plugins | Needs a remote hosted API server |

---

## 4. Recommendations for Spotilark

To stop complicating things and get your project working smoothly, you have two paths:

### Option A: Clean and Simplify (The Splayer Way - Recommended)
If you want a single codebase that runs beautifully on Desktop (Electron) and Mobile (Capacitor) without server-side complications:
1.  **Migrate to Vite:** Convert the Next.js project to a Vite project (like Splayer).
2.  **Move API Routes to Electron IPC:** Move the logic inside `src/app/api/...` (like streaming and downloading) into `electron/main.js` as IPC handlers (`ipcMain.handle`).
3.  **Use Frontend IPC Calls:** In your React components, call `window.electronAPI.ytDownload(...)` instead of making `fetch('/api/download')` calls.

### Option B: Fix the Current Next.js Setup
If you want to keep Next.js and fix the current errors without a major rewrite:
1.  **Configure FFMPEG_PATH in `.env.local`:** Add the following line to `C:\src\spotilark-web\.env.local` so the Next.js server knows exactly where it is:
    ```env
    FFMPEG_PATH=C:\src\DevTools\ffmpeg\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe
    ```
2.  **Pass Environment Variables in Package.json:** Ensure `concurrently` passes the paths down when launching:
    Modify `package.json` dev scripts to make sure both environments are aligned.

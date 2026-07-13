@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo ==========================================
echo    SPOTILARK ANDROID BUILD
echo ==========================================
echo.

:: Kill any running Node.js processes
echo [0/4] Stopping any running dev servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

:: 1. Temporarily hide API folder
echo [1/4] Preparing build...
if exist "src\app\api" (
    echo       Hiding API folder for static export...
    ren "src\app\api" "_api_tmp" 2>nul
    if exist "src\app\_api_tmp" (
        echo       API folder hidden successfully.
    ) else (
        echo       [!] Warning: Could not hide API folder, trying alternative...
        xcopy "src\app\api" "src\app\_api_tmp_backup\" /E /I /Q /Y >nul 2>&1
        rmdir /S /Q "src\app\api" 2>nul
    )
)

:: 2. Build Next.js for static export
echo [2/4] Building Web App (Static Export)...
set NEXT_PUBLIC_ENV=export
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo       [!] Web Build failed!
    goto :restore
    pause
    exit /b 1
)

:restore
:: Restore API folder
if exist "src\app\_api_tmp" (
    echo       Restoring API folder...
    ren "src\app\_api_tmp" "api"
)
if exist "src\app\_api_tmp_backup" (
    xcopy "src\app\_api_tmp_backup\*" "src\app\api\" /E /I /Q /Y >nul 2>&1
    rmdir /S /Q "src\app\_api_tmp_backup" 2>nul
)

if %ERRORLEVEL% NEQ 0 (
    pause
    exit /b 1
)

:: 3. Sync to Android
echo [3/4] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [!] Capacitor Sync failed!
    pause
    exit /b 1
)

:: 4. Build APK
echo [4/4] Building Android APK...
set JAVA_HOME=D:\Android studio\jbr
call C:\gradle-9.1.0\bin\gradle.bat assembleDebug -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo [!] Android Build failed!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    BUILD COMPLETE!
echo ==========================================
echo APK: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause

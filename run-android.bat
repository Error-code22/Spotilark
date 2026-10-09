@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo ==========================================
echo    SPOTILARK ANDROID BUILD
echo ==========================================
echo.

:: Set environment
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot
set ANDROID_HOME=C:\android-sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%

:: Kill any running Node.js processes
echo [0/5] Stopping any running dev servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

:: Clean .next cache to avoid stale type errors
echo [1/5] Cleaning build cache...
if exist ".next" rmdir /S /Q ".next" 2>nul

:: Temporarily hide API folder
echo [2/5] Preparing build...
if exist "src\app\api" (
    echo       Hiding API folder for static export...
    ren "src\app\api" "_api_tmp" 2>nul
    if not exist "src\app\_api_tmp" (
        echo       [!] Rename failed, trying alternative...
        xcopy "src\app\api" "src\app\_api_tmp_backup\" /E /I /Q /Y >nul 2>&1
        rmdir /S /Q "src\app\api" 2>nul
    )
)

:: Build Next.js for static export
echo [3/5] Building Web App (Static Export)...
set NEXT_PUBLIC_ENV=export
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo       [!] Web Build failed!
    goto :restore
)

:: Restore API folder
:restore
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

:: Sync to Android
echo [4/5] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [!] Capacitor Sync failed!
    pause
    exit /b 1
)

:: Build Release APK using gradlew (downloads correct Gradle version automatically)
echo [5/5] Building Android Release APK...
call android\gradlew.bat assembleRelease -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo [!] Android Build failed!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    BUILD COMPLETE!
echo ==========================================
echo APK: android\app\build\outputs\apk\release\app-release.apk
echo.
pause

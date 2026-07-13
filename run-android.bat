@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo ==========================================
echo    SPOTILARK ANDROID BUILD
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
set JAVA_HOME=D:\Android studio\jbr
call C:\gradle-9.1.0\bin\gradle.bat assembleDebug -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo [!] Android Build failed!
    pause
    exit /b 1
)

:: 4. Install to Phone
echo.
echo [4/4] Installing to Phone...
call D:\Android\Sdk\platform-tools\adb -d install -r android\app\build\outputs\apk\debug\app-debug.apk
if %ERRORLEVEL% NEQ 0 (
    echo [!] Installation failed! Make sure your phone is plugged in.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    SUCCESS! APP INSTALLED ON PHONE
echo ==========================================
echo.
timeout /t 5

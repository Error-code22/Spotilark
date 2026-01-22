@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo ==========================================
echo    SPOTILARK SAFE LAUNCHER (PHYSICAL)
echo ==========================================
echo.

:: 1. Build Next.js
echo [1/3] Building Web App (Data Saving Mode)...

:: Temporarily hide API folder for static export
if exist "src\app\api" (
    echo       [i] Hiding API folder...
    ren "src\app\api" "_api_tmp"
)

:: Set Env Var and Call Build separately to prevent script exit
set NEXT_PUBLIC_ENV=export
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo       [!] Web Build failed!
    :: Restore API folder if build fails
    if exist "src\app\_api_tmp" ren "src\app\_api_tmp" "api"
    pause
    exit /b 1
)

:: Restore API folder after build
if exist "src\app\_api_tmp" (
    echo       [i] Restoring API folder...
    ren "src\app\_api_tmp" "api"
)

:: 1.5 Sync Assets to Android
@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo [INFO] Starting Spotilark Safe Android Build (Data Saving Mode)
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo       [!] Capacitor Sync failed!
    pause
    exit /b 1
)

:: 2. Build Android APK (Manual Safe Mode)
echo.
echo [2/3] Building Android APK (Java 21 / No Daemon)...
:: Force use of Android Studio's included Java 21 to match Gradle requirements
set JAVA_HOME=D:\Android studio\jbr
:: Use local Gradle 9.1.0 to avoid downloads/wrapper issues
:: Use --no-daemon to save RAM and avoid "BindException" errors
call C:\gradle-9.1.0\bin\gradle.bat assembleDebug -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo       [!] Android Build failed!
    pause
    exit /b 1
)

:: 3. Install to Phone
echo.
echo [3/3] Installing to Phone...
:: -d means "only attached USB device", -r means "reinstall/update"
call D:\Android\Sdk\platform-tools\adb -d install -r android\app\build\outputs\apk\debug\app-debug.apk
if %ERRORLEVEL% NEQ 0 (
    echo       [!] Installation failed! Make sure your phone is plugged in.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    SUCCESS! APP INSTALLED ON PHONE
echo ==========================================
echo.
timeout /t 5

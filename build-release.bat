@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo ==========================================
echo    SPOTILARK RELEASE BUILD
echo ==========================================
echo.

:: Check if signing key exists
if not exist "android\spotilark-release.jks" (
    echo [!] Release signing key not found.
    echo     Run 'generate-release-key.bat' first.
    pause
    exit /b 1
)

:: Kill any running Node.js processes
echo [0/4] Stopping any running dev servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

:: 1. Temporarily hide API folder
echo [1/4] Preparing build...
if exist "src\app\api" (
    echo       Hiding API folder for static export...
    ren "src\app\api" "_api_tmp" 2>nul
    if not exist "src\app\_api_tmp" (
        echo       [!] Trying alternative method...
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

:: 4. Build Release APK
echo [4/4] Building Release APK...
set JAVA_HOME=D:\Android studio\jbr
call C:\gradle-9.1.0\bin\gradle.bat assembleRelease -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo [!] Android Build failed!
    pause
    exit /b 1
)

:: Copy APK to root
copy "android\app\build\outputs\apk\release\app-release.apk" "Spotilark-v1.0.0.apk" >nul 2>&1

echo.
echo ==========================================
echo    RELEASE BUILD COMPLETE!
echo ==========================================
echo APK: Spotilark-v1.0.0.apk
echo.
pause

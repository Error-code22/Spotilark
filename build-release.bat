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

:: 1. Temporarily hide API folder
echo [1/4] Preparing build...
if exist "src\app\api" (
    echo       Hiding API folder for static export...
    ren "src\app\api" "_api_tmp"
)

:: 2. Build Next.js for static export
echo [2/4] Building Web App (Static Export)...
set NEXT_PUBLIC_ENV=export
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo       [!] Web Build failed!
    if exist "src\app\_api_tmp" ren "src\app\_api_tmp" "api"
    pause
    exit /b 1
)

:: Restore API folder
if exist "src\app\_api_tmp" (
    echo       Restoring API folder...
    ren "src\app\_api_tmp" "api"
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
    exit /b 1
)

:: 1. Build Next.js for static export
echo [1/4] Building Web App (Static Export)...
set NEXT_PUBLIC_ENV=export
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Web Build failed!
    pause
    exit /b 1
)

:: 2. Sync to Android
echo [2/4] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [!] Capacitor Sync failed!
    pause
    exit /b 1
)

:: 3. Build Release APK
echo [3/4] Building Release APK...
set JAVA_HOME=D:\Android studio\jbr
call C:\gradle-9.1.0\bin\gradle.bat assembleRelease -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo [!] Android Build failed!
    pause
    exit /b 1
)

:: 4. Copy APK to root for easy access
echo [4/4] Copying APK...
copy "android\app\build\outputs\apk\release\app-release.apk" "Spotilark-v1.0.0.apk" >nul 2>&1

echo.
echo ==========================================
echo    RELEASE BUILD COMPLETE!
echo ==========================================
echo.
echo APK Location:
echo   android\app\build\outputs\apk\release\app-release.apk
echo.
echo   OR
echo.
echo   Spotilark-v1.0.0.apk (copied to project root)
echo.
echo To install on phone:
echo   adb install -r android\app\build\outputs\apk\release\app-release.apk
echo.
echo To share: Upload Spotilark-v1.0.0.apk to GitHub Releases
echo.
pause

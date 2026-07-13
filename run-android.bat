@echo off
SET NEXT_TELEMETRY_DISABLED=1
echo ==========================================
echo    SPOTILARK ANDROID BUILD
echo ==========================================
echo.

:: Kill any running Node.js processes
echo [0/5] Stopping any running dev servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

:: Clean .next cache to avoid stale type errors
echo [1/5] Cleaning build cache...
if exist ".next" rmdir /S /Q ".next" 2>nul

:: 2. Temporarily hide API folder
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

:: 3. Build Next.js for static export
echo [3/5] Building Web App (Static Export)...
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

:: 4. Sync to Android
echo [4/5] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [!] Capacitor Sync failed!
    pause
    exit /b 1
)

:: 5. Build APK
echo [5/5] Building Android APK...
:: Try to find gradle
set GRADLE_CMD=
if exist "C:\gradle\bin\gradle.bat" (
    set GRADLE_CMD=C:\gradle\bin\gradle.bat
) else if exist "C:\gradle-9.1.0\bin\gradle.bat" (
    set GRADLE_CMD=C:\gradle-9.1.0\bin\gradle.bat
) else if exist "%USERPROFILE%\.gradle\wrapper\dists\gradle*\bin\gradle.bat" (
    for /d %%i in ("%USERPROFILE%\.gradle\wrapper\dists\gradle*") do set GRADLE_CMD=%%i\bin\gradle.bat
) else (
    echo [!] Gradle not found. Trying gradlew...
    if exist "android\gradlew.bat" (
        set GRADLE_CMD=android\gradlew.bat
    ) else (
        echo [!] No Gradle found. Install Gradle or use Android Studio.
        pause
        exit /b 1
    )
)
echo       Using: %GRADLE_CMD%
set JAVA_HOME=D:\Android studio\jbr
call %GRADLE_CMD% assembleDebug -p android --no-daemon
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

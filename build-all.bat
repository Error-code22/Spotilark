@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo    SPOTILARK UNIFIED BUILD SYSTEM
echo ==========================================
echo.

:: 1. Ask for Version
set /p VERSION="Enter new version number (e.g., 0.1.1): "

echo.
echo [1/4] Updating configuration files...
:: Update package.json
powershell -Command "(gc package.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Out-File -encoding ASCII package.json"
:: Update tauri.conf.json
powershell -Command "(gc src-tauri/tauri.conf.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Out-File -encoding ASCII src-tauri/tauri.conf.json"

:: Temporary move API folder to avoid Next.js static export errors
if exist "src\app\api" (
    echo [!] Temporarily hiding API folder for static export...
    ren "src\app\api" "_api_tmp"
)

echo.
echo [2/4] Select build platform:
echo  1. Desktop (Windows .exe)
echo  2. Mobile (Android .apk)
echo  3. Both (Desktop + Mobile)
set /p CHOICE="Enter choice (1-3): "

:: 3. Handle Desktop Build
if "%CHOICE%"=="1" goto desktop
if "%CHOICE%"=="3" goto desktop
goto android_check

:desktop
echo.
echo [3/4] Starting Desktop Build (Tauri)...
echo To sign the update for the HappyMod-style updater, you need your PRIVATE KEY.
set /p PRIVKEY="Paste your Private Key (or press Enter if already set in ENV): "
if not "%PRIVKEY%"=="" set TAURI_PRIVATE_KEY=%PRIVKEY%

echo Building Windows version...
call npx tauri build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Desktop build failed! Check errors above.
    goto done
)
echo.
echo Desktop build complete! Output in: src-tauri/target/release/bundle/msi/
if "%CHOICE%"=="1" goto done

:android_check
if "%CHOICE%"=="2" goto android
if "%CHOICE%"=="3" goto android
goto done

:android
echo.
echo [4/4] Starting Android Build (Tauri)...
echo Ensure your Android device/emulator is visible or SDK is ready.
call npx tauri android build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Android build failed! Check errors above.
    goto done
)
echo.
echo Android build complete! Output in: src-tauri/gen/android/app/build/outputs/apk/
goto done

:done
:: Restore API folder if it was moved
if exist "src\app\_api_tmp" (
    echo [!] Restoring API folder...
    ren "src\app\_api_tmp" "api"
)

echo.
echo ==========================================
echo    BUILD PROCESS FINISHED SUCCESSFULLY
echo ==========================================
echo.
echo NEXT STEPS:
echo 1. Go to your GitHub (spotilark-site) and create a New Release v%VERSION%.
echo 2. Upload the .msi.zip and the .apk files.
echo 3. Update the 'version' and 'signature' in your project's update.json.
echo.
pause

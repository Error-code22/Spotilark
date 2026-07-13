@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo    SPOTILARK UNIFIED BUILD SYSTEM
echo ==========================================
echo.

:: 1. Ask for Version
set /p VERSION="Enter new version number (e.g., 0.1.1): "

echo.
echo [1/4] Updating package.json version...
powershell -Command "(gc package.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Out-File -encoding ASCII package.json"

echo.
echo [2/4] Select build platform:
echo  1. Desktop (Windows .exe via Electron)
echo  2. Mobile (Android .apk via Capacitor)
echo  3. Both (Desktop + Mobile)
set /p CHOICE="Enter choice (1-3): "

:: 3. Handle Desktop Build
if "%CHOICE%"=="1" goto desktop
if "%CHOICE%"=="3" goto desktop
goto android_check

:desktop
echo.
echo [3/4] Starting Desktop Build (Electron)...
call npm run electron:build:win
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Desktop build failed! Check errors above.
    goto done
)
echo.
echo Desktop build complete! Output in: dist-electron\
if "%CHOICE%"=="1" goto done

:android_check
if "%CHOICE%"=="2" goto android
if "%CHOICE%"=="3" goto android
goto done

:android
echo.
echo [4/4] Starting Android Build (Capacitor)...

:: Build static export
echo [a] Building web static export...
set NEXT_PUBLIC_ENV=export
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Web build failed! Check errors above.
    goto done
)

:: Sync to Android
echo [b] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Capacitor sync failed! Check errors above.
    goto done
)

:: Build APK
echo [c] Building Android APK...
set JAVA_HOME=D:\Android studio\jbr
call C:\gradle-9.1.0\bin\gradle.bat assembleRelease -p android --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Android build failed! Check errors above.
    goto done
)
echo.
echo Android build complete! Output in: android\app\build\outputs\apk\
goto done

:done
echo.
echo ==========================================
echo    BUILD PROCESS FINISHED
echo ==========================================
echo.
pause

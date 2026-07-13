@echo off
echo ==========================================
echo    ANDROID SDK AUTO-INSTALLER
echo ==========================================
echo.

set SDK_DIR=C:\android-sdk
set CMDLINE_TOOLS_URL=https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip

:: Check if already installed
if exist "%SDK_DIR%\platform-tools\adb.exe" (
    echo [i] Android SDK already installed at %SDK_DIR%
    echo     To reinstall, delete %SDK_DIR% first.
    pause
    exit /b 0
)

echo This will download ~300 MB of Android SDK tools.
echo Location: %SDK_DIR%
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    exit /b 0
)

:: Create directory
echo.
echo [1/5] Creating SDK directory...
if not exist "%SDK_DIR%" mkdir "%SDK_DIR%"

:: Download command line tools
echo [2/5] Downloading Android command line tools...
echo This may take a few minutes depending on your connection...
powershell -Command "Invoke-WebRequest -Uri '%CMDLINE_TOOLS_URL%' -OutFile '%SDK_DIR%\cmdline-tools.zip'"

if not exist "%SDK_DIR%\cmdline-tools.zip" (
    echo [!] Download failed. Check your internet connection.
    pause
    exit /b 1
)

:: Extract
echo [3/5] Extracting...
powershell -Command "Expand-Archive -Path '%SDK_DIR%\cmdline-tools.zip' -DestinationPath '%SDK_DIR%\cmdline-tools-tmp' -Force"

:: Rename to correct structure
echo [4/5] Setting up directory structure...
if exist "%SDK_DIR%\cmdline-tools" rmdir /S /Q "%SDK_DIR%\cmdline-tools"
mkdir "%SDK_DIR%\cmdline-tools\latest"
xcopy "%SDK_DIR%\cmdline-tools-tmp\cmdline-tools\*" "%SDK_DIR%\cmdline-tools\latest\" /E /I /Q /Y >nul
rmdir /S /Q "%SDK_DIR%\cmdline-tools-tmp"
del "%SDK_DIR%\cmdline-tools.zip"

:: Install required packages
echo [5/5] Installing SDK packages (platforms, build-tools, platform-tools)...
echo This will download ~150 MB more...
set JAVA_HOME=D:\Android studio\jbr
"%SDK_DIR%\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-34" "build-tools;34.0.0" "platform-tools"

if %ERRORLEVEL% NEQ 0 (
    echo [!] SDK package installation failed.
    echo     Make sure Java/JDK is installed.
    pause
    exit /b 1
)

:: Accept licenses
echo.
echo Accepting licenses...
echo y | "%SDK_DIR%\cmdline-tools\latest\bin\sdkmanager.bat" --licenses >nul 2>&1

:: Set environment variables
echo.
echo Setting environment variables...
setx ANDROID_HOME "%SDK_DIR%" >nul 2>&1
setx PATH "%PATH%;%SDK_DIR%\platform-tools;%SDK_DIR%\cmdline-tools\latest\bin" >nul 2>&1

echo.
echo ==========================================
echo    ANDROID SDK INSTALLED SUCCESSFULLY!
echo ==========================================
echo.
echo Location: %SDK_DIR%
echo.
echo You can now build APKs with:
echo   run-android.bat
echo.
echo NOTE: You may need to restart your terminal
echo       for environment variables to take effect.
echo.
pause

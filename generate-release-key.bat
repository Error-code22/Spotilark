@echo off
echo ==========================================
echo    GENERATE RELEASE SIGNING KEY
echo ==========================================
echo.

:: Check if keytool exists
where keytool >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] keytool not found. Make sure Java/JDK is installed.
    echo     Download from: https://adoptium.net/
    pause
    exit /b 1
)

:: Check if key already exists
if exist "android\spotilark-release.jks" (
    echo [i] Signing key already exists.
    echo     File: android\spotilark-release.jks
    pause
    exit /b 0
)

echo Creating release signing key...
keytool -genkeypair -v -keystore android\spotilark-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias spotilark -storepass spotilark2026 -keypass spotilark2026 -dname "CN=Spotilark, OU=Development, O=Spotilark, L=Unknown, ST=Unknown, C=US"

if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to create signing key.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    SIGNING KEY CREATED SUCCESSFULLY
echo ==========================================
echo.
echo File: android\spotilark-release.jks
echo Alias: spotilark
echo Password: spotilark2026
echo.
echo IMPORTANT: Keep this file safe! You need it for future updates.
echo.
pause

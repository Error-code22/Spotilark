@echo off
echo ==========================================
echo    SPOTILARK DESKTOP DEBUG BUILD
echo ==========================================
echo.

:: Temporary move API folder to avoid Next.js static export errors
if exist "src\app\api" (
    echo [!] Temporarily hiding API folder for static export...
    ren "src\app\api" "_api_tmp"
)

echo.
echo Starting Desktop Debug Build...
call npx tauri build --debug
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Build failed! Check errors above.
    goto restore
)

echo.
echo Build complete! You can now Right Click -> Inspect inside the app.

:restore
:: Restore API folder if it was moved
if exist "src\app\_api_tmp" (
    echo [!] Restoring API folder...
    ren "src\app\_api_tmp" "api"
)

echo.
pause

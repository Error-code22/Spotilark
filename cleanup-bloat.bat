@echo off
echo ========================================
echo Spotilark Cleanup Script
echo Removing Tauri and Android build bloat
echo ========================================
echo.

echo [1/4] Removing Tauri build artifacts...
if exist "src-tauri\target" (
    echo Deleting src-tauri\target...
    rmdir /s /q "src-tauri\target"
    echo ✓ Deleted Tauri target folder
) else (
    echo - Tauri target folder not found
)

echo.
echo [2/4] Removing Android build artifacts...
if exist "src-android\app\build" (
    echo Deleting src-android\app\build...
    rmdir /s /q "src-android\app\build"
    echo ✓ Deleted Android build folder
) else (
    echo - Android build folder not found
)

if exist "src-android\.gradle" (
    echo Deleting src-android\.gradle...
    rmdir /s /q "src-android\.gradle"
    echo ✓ Deleted Gradle cache
) else (
    echo - Gradle cache not found
)

echo.
echo [3/4] Removing Next.js cache...
if exist ".next" (
    echo Deleting .next...
    rmdir /s /q ".next"
    echo ✓ Deleted Next.js build
) else (
    echo - Next.js build not found
)

if exist "out" (
    echo Deleting out...
    rmdir /s /q "out"
    echo ✓ Deleted static export
) else (
    echo - Static export not found
)

echo.
echo [4/4] Removing node_modules cache...
if exist "node_modules\.cache" (
    echo Deleting node_modules\.cache...
    rmdir /s /q "node_modules\.cache"
    echo ✓ Deleted npm cache
) else (
    echo - npm cache not found
)

echo.
echo ========================================
echo Cleanup complete!
echo You should have freed up ~20-25GB
echo ========================================
echo.
pause

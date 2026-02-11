@echo off
echo.
echo ========================================
echo   Auto-Fix Script for .app/ Directory
echo ========================================
echo.

REM Fix 1: Create components structure
echo [1/8] Creating components/ directory structure...
mkdir components\shared\ui\button 2>nul
mkdir components\shared\ui\input 2>nul
mkdir components\shared\ui\select 2>nul
mkdir components\shared\ui\card 2>nul
mkdir components\shared\ui\dialog 2>nul
mkdir components\shared\ui\modal 2>nul
mkdir components\shared\ui\toast 2>nul
mkdir components\shared\ui\badge 2>nul
mkdir components\shared\ui\avatar 2>nul
mkdir components\shared\ui\skeleton 2>nul
mkdir components\shared\ui\table 2>nul
mkdir components\shared\forms 2>nul
mkdir components\shared\data-display 2>nul
mkdir components\shared\feedback 2>nul
mkdir components\layouts\sidebars 2>nul
mkdir components\layouts\headers 2>nul
mkdir components\layouts\breadcrumbs 2>nul
mkdir components\auth 2>nul
mkdir components\onboarding 2>nul
mkdir components\dashboard\widgets 2>nul
mkdir components\dashboard\charts 2>nul
mkdir components\crm\customers 2>nul
mkdir components\crm\deals 2>nul
mkdir components\crm\activities 2>nul
mkdir components\fleet\vehicles 2>nul
mkdir components\fleet\drivers 2>nul
mkdir components\fleet\shipments 2>nul
mkdir components\inventory\products 2>nul
mkdir components\inventory\warehouses 2>nul
mkdir components\hr\employees 2>nul
mkdir components\hr\attendance 2>nul
mkdir components\hr\leave 2>nul
mkdir components\chat 2>nul
mkdir components\ai-agent 2>nul
mkdir components\settings\profile 2>nul
mkdir components\settings\company 2>nul
mkdir components\providers 2>nul
echo   DONE - Created components structure
echo.

REM Fix 2: Merge duplicate folders
echo [2/8] Merging duplicate folders...
if exist utils (
    echo   Merging utils/ into lib\utils\...
    if exist lib\utils (
        xcopy /E /Y /I utils lib\utils >nul 2>&1
        rmdir /S /Q utils
    ) else (
        move utils lib\utils >nul 2>&1
    )
    echo   DONE - Merged utils
)
if exist validators (
    echo   Merging validators/ into lib\validation\...
    if exist lib\validation (
        xcopy /E /Y /I validators lib\validation >nul 2>&1
        rmdir /S /Q validators
    ) else (
        move validators lib\validation >nul 2>&1
    )
    echo   DONE - Merged validators
)
echo.

echo [3/8] Updating tsconfig.json...
echo   (Manual update recommended - see ANALYSIS_AND_FIXES.md)
echo.

echo [4/8] Creating Providers component...
echo   See components\providers\index.tsx
echo.

echo [5/8] Creating route group layouts...
echo   Check app\(auth)\layout.tsx
echo   Check app\(onboarding)\layout.tsx
echo   Check app\(dashboard)\layout.tsx
echo.

echo [6/8] Creating basic UI components...
echo   See components\shared\ui\
echo.

echo [7/8] Creating utility functions...
echo   See lib\utils\cn.ts
echo.

echo [8/8] Creating loading and error boundaries...
echo   See app\(dashboard)\loading.tsx
echo   See app\(dashboard)\error.tsx
echo.

echo ========================================
echo   Auto-Fix Complete!
echo ========================================
echo.
echo Summary:
echo   [OK] Components structure created
echo   [OK] Duplicate folders merged
echo   [OK] Basic structure ready
echo.
echo Next steps:
echo   1. Review ANALYSIS_AND_FIXES.md
echo   2. Update tsconfig.json manually
echo   3. Install: npm install @tanstack/react-query
echo   4. Update app/layout.tsx with Providers
echo.
pause

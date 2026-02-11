@echo off
echo Creating complete project structure...
echo.

REM Root folders
mkdir .app 2>nul
mkdir components 2>nul
mkdir composables 2>nul
mkdir lib 2>nul
mkdir types 2>nul
mkdir config 2>nul
mkdir locales 2>nul
mkdir assets 2>nul
mkdir styles 2>nul
mkdir __tests__ 2>nul
mkdir public 2>nul
mkdir scripts 2>nul
mkdir docs 2>nul
mkdir .github 2>nul
mkdir .vscode 2>nul

REM Components structure
mkdir components\shared\ui\button 2>nul
mkdir components\shared\ui\input 2>nul
mkdir components\shared\ui\select 2>nul
mkdir components\shared\ui\checkbox 2>nul
mkdir components\shared\ui\dialog 2>nul
mkdir components\shared\ui\modal 2>nul
mkdir components\shared\ui\card 2>nul
mkdir components\shared\ui\badge 2>nul
mkdir components\shared\ui\avatar 2>nul
mkdir components\shared\ui\table 2>nul
mkdir components\shared\forms 2>nul
mkdir components\shared\data-display 2>nul
mkdir components\shared\feedback 2>nul
mkdir components\shared\utils 2>nul
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
mkdir components\fleet\maps 2>nul
mkdir components\inventory\products 2>nul
mkdir components\inventory\warehouses 2>nul
mkdir components\inventory\purchase-orders 2>nul
mkdir components\hr\employees 2>nul
mkdir components\hr\attendance 2>nul
mkdir components\hr\leave 2>nul
mkdir components\hr\payroll 2>nul
mkdir components\chat 2>nul
mkdir components\ai-agent 2>nul
mkdir components\settings\profile 2>nul
mkdir components\settings\company 2>nul
mkdir components\settings\users 2>nul
mkdir components\settings\roles 2>nul
mkdir components\admin\tenants 2>nul
mkdir components\admin\analytics 2>nul
mkdir components\providers 2>nul

REM Composables structure
mkdir composables\auth 2>nul
mkdir composables\company 2>nul
mkdir composables\api\crm 2>nul
mkdir composables\api\fleet 2>nul
mkdir composables\api\inventory 2>nul
mkdir composables\api\hr 2>nul
mkdir composables\ui 2>nul
mkdir composables\realtime 2>nul

REM Lib structure
mkdir lib\supabase 2>nul
mkdir lib\api 2>nul
mkdir lib\auth 2>nul
mkdir lib\validation 2>nul
mkdir lib\utils 2>nul
mkdir lib\constants 2>nul

REM Locales
mkdir locales\en 2>nul
mkdir locales\ar 2>nul
mkdir locales\fr 2>nul

REM Assets
mkdir assets\images\logos 2>nul
mkdir assets\images\illustrations 2>nul
mkdir assets\images\avatars 2>nul
mkdir assets\icons\crm 2>nul
mkdir assets\icons\fleet 2>nul
mkdir assets\icons\inventory 2>nul
mkdir assets\icons\hr 2>nul
mkdir assets\fonts 2>nul

REM Styles
mkdir styles\themes 2>nul
mkdir styles\animations 2>nul

REM Tests
mkdir __tests__\unit\components\shared\ui 2>nul
mkdir __tests__\unit\components\crm 2>nul
mkdir __tests__\unit\components\fleet 2>nul
mkdir __tests__\unit\composables 2>nul
mkdir __tests__\unit\lib 2>nul
mkdir __tests__\integration 2>nul
mkdir __tests__\e2e 2>nul
mkdir __tests__\fixtures 2>nul
mkdir __tests__\mocks 2>nul

REM GitHub
mkdir .github\workflows 2>nul
mkdir .github\ISSUE_TEMPLATE 2>nul

echo.
echo ✅ Folder structure created successfully!
echo.
echo 📁 Created folders for:
echo   - Components (shared UI + modules)
echo   - Composables (React Hooks)
echo   - Lib (utilities + API clients)
echo   - Assets (images, icons, fonts)
echo   - Locales (i18n support)
echo   - Tests (unit, integration, e2e)
echo.
echo 🚀 Next: Run this to see all folders:
echo    tree /F /A
echo.
pause

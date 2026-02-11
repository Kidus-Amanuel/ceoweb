# PowerShell Script to Generate Complete Project Structure
# Run this from the project root: .\scripts\generate-structure.ps1

Write-Host "🚀 Starting folder structure generation..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\user\Desktop\New folder (3)\New folder (6)\ceo"

# Change to project root
Set-Location $projectRoot

# Function to create directories
function New-DirectoryIfNotExists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Host "✅ Created: $Path" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Exists: $Path" -ForegroundColor Yellow
    }
}

Write-Host "📁 Creating root-level folders..." -ForegroundColor Magenta
Write-Host ""

# Root folders
$rootFolders = @(
    ".app",
    "app",
    "components",
    "composables",
    "lib",
    "types",
    "config",
    "locales",
    "assets",
    "styles",
    "__tests__",
    "public",
    "scripts",
    "docs",
    ".github"
)

foreach ($folder in $rootFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "🧩 Creating component folders..." -ForegroundColor Magenta
Write-Host ""

# Components structure
$componentFolders = @(
    "components/shared/ui/button",
    "components/shared/ui/input",
    "components/shared/ui/select",
    "components/shared/ui/checkbox",
    "components/shared/ui/radio",
    "components/shared/ui/textarea",
    "components/shared/ui/dialog",
    "components/shared/ui/modal",
    "components/shared/ui/dropdown",
    "components/shared/ui/tooltip",
    "components/shared/ui/toast",
    "components/shared/ui/card",
    "components/shared/ui/badge",
    "components/shared/ui/avatar",
    "components/shared/ui/skeleton",
    "components/shared/ui/spinner",
    "components/shared/ui/tabs",
    "components/shared/ui/accordion",
    "components/shared/ui/table",
    "components/shared/ui/pagination",
    "components/shared/ui/datepicker",
    "components/shared/ui/timepicker",
    "components/shared/forms",
    "components/shared/data-display",
    "components/shared/feedback",
    "components/shared/utils",
    "components/layouts/sidebars",
    "components/layouts/headers",
    "components/layouts/breadcrumbs",
    "components/layouts/footers",
    "components/auth",
    "components/onboarding",
    "components/dashboard/widgets",
    "components/dashboard/charts",
    "components/crm/customers",
    "components/crm/deals",
    "components/crm/activities",
    "components/fleet/vehicles",
    "components/fleet/drivers",
    "components/fleet/shipments",
    "components/fleet/maps",
    "components/inventory/products",
    "components/inventory/warehouses",
    "components/inventory/purchase-orders",
    "components/hr/employees",
    "components/hr/attendance",
    "components/hr/leave",
    "components/hr/payroll",
    "components/chat",
    "components/ai-agent",
    "components/settings/profile",
    "components/settings/company",
    "components/settings/users",
    "components/settings/roles",
    "components/admin/tenants",
    "components/admin/analytics",
    "components/providers"
)

foreach ($folder in $componentFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "🪝 Creating composables (hooks) folders..." -ForegroundColor Magenta
Write-Host ""

# Composables structure
$composableFolders = @(
    "composables/auth",
    "composables/company",
    "composables/api/crm",
    "composables/api/fleet",
    "composables/api/inventory",
    "composables/api/hr",
    "composables/ui",
    "composables/realtime"
)

foreach ($folder in $composableFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "🛠️  Creating lib folders..." -ForegroundColor Magenta
Write-Host ""

# Lib structure
$libFolders = @(
    "lib/supabase",
    "lib/api",
    "lib/auth",
    "lib/validation",
    "lib/utils",
    "lib/constants"
)

foreach ($folder in $libFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "⚙️  Creating config folders..." -ForegroundColor Magenta
Write-Host ""

# Config (files will be created in config root)
New-DirectoryIfNotExists -Path "config"

Write-Host ""
Write-Host "🌍 Creating locales folders..." -ForegroundColor Magenta
Write-Host ""

# Locales structure
$localeFolders = @(
    "locales/en",
    "locales/ar",
    "locales/fr"
)

foreach ($folder in $localeFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "🎨 Creating assets folders..." -ForegroundColor Magenta
Write-Host ""

# Assets structure
$assetFolders = @(
    "assets/images/logos",
    "assets/images/illustrations",
    "assets/images/avatars",
    "assets/images/placeholders",
    "assets/icons/crm",
    "assets/icons/fleet",
    "assets/icons/inventory",
    "assets/icons/hr",
    "assets/fonts",
    "assets/videos"
)

foreach ($folder in $assetFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "🎨 Creating styles folders..." -ForegroundColor Magenta
Write-Host ""

# Styles structure
$styleFolders = @(
    "styles/themes",
    "styles/animations"
)

foreach ($folder in $styleFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "🧪 Creating test folders..." -ForegroundColor Magenta
Write-Host ""

# Test structure
$testFolders = @(
    "__tests__/unit/components/shared/ui",
    "__tests__/unit/components/crm",
    "__tests__/unit/components/fleet",
    "__tests__/unit/components/inventory",
    "__tests__/unit/components/hr",
    "__tests__/unit/composables",
    "__tests__/unit/lib",
    "__tests__/integration",
    "__tests__/e2e",
    "__tests__/fixtures",
    "__tests__/mocks"
)

foreach ($folder in $testFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "📚 Creating docs folders..." -ForegroundColor Magenta
Write-Host ""

# Docs (files will be created in docs root)
New-DirectoryIfNotExists -Path "docs"

Write-Host ""
Write-Host "🔧 Creating scripts folder..." -ForegroundColor Magenta
Write-Host ""

# Scripts (this file will be in scripts)
New-DirectoryIfNotExists -Path "scripts"

Write-Host ""
Write-Host "🐙 Creating GitHub folders..." -ForegroundColor Magenta
Write-Host ""

# GitHub structure
$githubFolders = @(
    ".github/workflows",
    ".github/ISSUE_TEMPLATE"
)

foreach ($folder in $githubFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "💻 Creating VS Code folders..." -ForegroundColor Magenta
Write-Host ""

# VS Code
New-DirectoryIfNotExists -Path ".vscode"

Write-Host ""
Write-Host "⚡ Creating app folders (Next.js App Router)..." -ForegroundColor Magenta
Write-Host ""

# App structure (detailed Next.js App Router structure)
$appFolders = @(
    "app/(auth)/login",
    "app/(auth)/signup",
    "app/(auth)/reset-password",
    "app/(auth)/verify-email",
    "app/(auth)/callback",
    "app/(onboarding)/onboarding",
    "app/(onboarding)/onboarding/contact",
    "app/(onboarding)/onboarding/branding",
    "app/(onboarding)/onboarding/preferences",
    "app/(onboarding)/onboarding/complete",
    "app/(dashboard)/dashboard",
    "app/(dashboard)/crm/customers/new",
    "app/(dashboard)/crm/customers/[id]/edit",
    "app/(dashboard)/crm/deals/new",
    "app/(dashboard)/crm/deals/[id]/edit",
    "app/(dashboard)/crm/activities/[id]",
    "app/(dashboard)/crm/reports/sales-funnel",
    "app/(dashboard)/crm/reports/customer-insights",
    "app/(dashboard)/fleet/vehicles/new",
    "app/(dashboard)/fleet/vehicles/[id]/edit",
    "app/(dashboard)/fleet/vehicles/[id]/history",
    "app/(dashboard)/fleet/drivers/new",
    "app/(dashboard)/fleet/drivers/[id]/edit",
    "app/(dashboard)/fleet/drivers/[id]/performance",
    "app/(dashboard)/fleet/shipments/new",
    "app/(dashboard)/fleet/shipments/[id]/edit",
    "app/(dashboard)/fleet/shipments/[id]/tracking",
    "app/(dashboard)/fleet/maintenance/new",
    "app/(dashboard)/fleet/maintenance/[id]/edit",
    "app/(dashboard)/fleet/reports/fuel-efficiency",
    "app/(dashboard)/inventory/products/new",
    "app/(dashboard)/inventory/products/[id]/edit",
    "app/(dashboard)/inventory/products/[id]/stock-movements",
    "app/(dashboard)/inventory/warehouses/new",
    "app/(dashboard)/inventory/warehouses/[id]/edit",
    "app/(dashboard)/inventory/warehouses/[id]/inventory",
    "app/(dashboard)/inventory/purchase-orders/new",
    "app/(dashboard)/inventory/purchase-orders/[id]/edit",
    "app/(dashboard)/inventory/purchase-orders/[id]/receive",
    "app/(dashboard)/inventory/vendors/new",
    "app/(dashboard)/inventory/vendors/[id]/edit",
    "app/(dashboard)/inventory/vendors/[id]/orders",
    "app/(dashboard)/inventory/reports/stock-valuation",
    "app/(dashboard)/inventory/reports/turnover",
    "app/(dashboard)/hr/employees/new",
    "app/(dashboard)/hr/employees/[id]/edit",
    "app/(dashboard)/hr/employees/[id]/documents",
    "app/(dashboard)/hr/employees/[id]/history",
    "app/(dashboard)/hr/attendance/clock-in",
    "app/(dashboard)/hr/attendance/reports",
    "app/(dashboard)/hr/leave/request",
    "app/(dashboard)/hr/leave/[id]",
    "app/(dashboard)/hr/payroll/run",
    "app/(dashboard)/hr/payroll/[id]",
    "app/(dashboard)/hr/performance/new",
    "app/(dashboard)/hr/performance/[id]/edit",
    "app/(dashboard)/hr/reports/headcount",
    "app/(dashboard)/hr/reports/turnover",
    "app/(dashboard)/chat/new",
    "app/(dashboard)/chat/[channelId]/settings",
    "app/(dashboard)/ai-agent/[conversationId]/share",
    "app/(dashboard)/settings/profile",
    "app/(dashboard)/settings/account",
    "app/(dashboard)/settings/notifications",
    "app/(dashboard)/settings/security",
    "app/(dashboard)/settings/company/branding",
    "app/(dashboard)/settings/users/invite",
    "app/(dashboard)/settings/users/[id]/edit",
    "app/(dashboard)/settings/roles/new",
    "app/(dashboard)/settings/roles/[id]/edit",
    "app/(dashboard)/settings/integrations/[integrationId]",
    "app/(dashboard)/settings/billing/subscription",
    "app/(dashboard)/settings/billing/invoices",
    "app/(dashboard)/settings/billing/payment-methods",
    "app/admin/tenants/new",
    "app/admin/tenants/[id]/edit",
    "app/admin/tenants/[id]/impersonate",
    "app/admin/users/[id]",
    "app/admin/analytics",
    "app/admin/settings",
    "app/api/auth/login",
    "app/api/auth/signup",
    "app/api/auth/logout",
    "app/api/auth/refresh",
    "app/api/auth/verify-email",
    "app/api/auth/reset-password",
    "app/api/auth/callback",
    "app/api/onboarding/status",
    "app/api/onboarding/complete",
    "app/api/crm/customers/[id]",
    "app/api/crm/deals/[id]",
    "app/api/crm/activities/[id]",
    "app/api/fleet/vehicles/[id]",
    "app/api/fleet/drivers/[id]",
    "app/api/fleet/shipments/[id]",
    "app/api/inventory/products/[id]",
    "app/api/inventory/warehouses/[id]",
    "app/api/inventory/purchase-orders/[id]",
    "app/api/inventory/vendors/[id]",
    "app/api/hr/employees/[id]",
    "app/api/hr/leave/[id]",
    "app/api/hr/payroll/[id]",
    "app/api/chat/channels/[id]/messages",
    "app/api/chat/messages/[id]",
    "app/api/ai-agent/conversations/[id]",
    "app/api/ai-agent/chat",
    "app/api/users/me",
    "app/api/users/[id]",
    "app/api/upload",
    "app/api/webhooks/supabase",
    "app/api/webhooks/stripe",
    "app/api/health"
)

foreach ($folder in $appFolders) {
    New-DirectoryIfNotExists -Path $folder
}

Write-Host ""
Write-Host "✨ Folder structure generation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  - Components: Organized by module with shared UI library" -ForegroundColor White
Write-Host "  - Composables: Custom React hooks for all features" -ForegroundColor White
Write-Host "  - Tests: Unit, integration, E2E test folders" -ForegroundColor White
Write-Host "  - Assets: Images, icons, fonts organized" -ForegroundColor White
Write-Host "  - Locales: i18n support (EN, AR, FR)" -ForegroundColor White
Write-Host "  - App Router: Complete Next.js 14+ structure" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Magenta
Write-Host "  1. Review the generated structure" -ForegroundColor White
Write-Host "  2. Create index.ts barrel exports" -ForegroundColor White
Write-Host "  3. Set up TypeScript path aliases in tsconfig.json" -ForegroundColor White
Write-Host "  4. Start building shared UI components" -ForegroundColor White
Write-Host "  5. Implement auth system and middleware" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "  - See COMPLETE_PROJECT_STRUCTURE.md for details" -ForegroundColor White
Write-Host "  - See .app/APP_STRUCTURE.md for app routing" -ForegroundColor White
Write-Host "  - See .app/ROLE_PERMISSIONS.md for RBAC" -ForegroundColor White
Write-Host ""

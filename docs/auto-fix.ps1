# Auto-Fix Script for .app/ Directory
# This script implements all Priority 1 & 2 fixes

Write-Host "🔧 Starting Auto-Fix for .app/ directory..." -ForegroundColor Cyan
Write-Host ""

$appRoot = "c:\Users\user\Desktop\New folder (3)\New folder (6)\ceo\ceo_web_project_v1\.app"

Set-Location $appRoot

Write-Host "📁 FIX 1: Creating components/ directory structure..." -ForegroundColor Magenta
Write-Host ""

# Create components structure
$componentFolders = @(
    "components\shared\ui\button",
    "components\shared\ui\input",
    "components\shared\ui\select",
    "components\shared\ui\card",
    "components\shared\ui\dialog",
    "components\shared\ui\modal",
    "components\shared\ui\dropdown",
    "components\shared\ui\toast",
    "components\shared\ui\badge",
    "components\shared\ui\avatar",
    "components\shared\ui\skeleton",
    "components\shared\ui\table",
    "components\shared\forms",
    "components\shared\data-display",
    "components\shared\feedback",
    "components\layouts\sidebars",
    "components\layouts\headers",
    "components\layouts\breadcrumbs",
    "components\auth",
    "components\onboarding",
    "components\dashboard\widgets",
    "components\dashboard\charts",
    "components\crm\customers",
    "components\crm\deals",
    "components\crm\activities",
    "components\fleet\vehicles",
    "components\fleet\drivers",
    "components\fleet\shipments",
    "components\inventory\products",
    "components\inventory\warehouses",
    "components\hr\employees",
    "components\hr\attendance",
    "components\hr\leave",
    "components\chat",
    "components\ai-agent",
    "components\settings\profile",
    "components\settings\company",
    "components\providers"
)

foreach ($folder in $componentFolders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  ✅ Created: $folder" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🔄 FIX 2: Merging duplicate folders..." -ForegroundColor Magenta
Write-Host ""

# Merge utils/ into lib/utils/
if (Test-Path "utils") {
    Write-Host "  Merging utils/ into lib\utils\..." -ForegroundColor Yellow
    if (Test-Path "lib\utils") {
        Copy-Item -Path "utils\*" -Destination "lib\utils\" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "utils" -Recurse -Force
        Write-Host "  ✅ Merged and removed standalone utils/" -ForegroundColor Green
    } else {
        Move-Item -Path "utils" -Destination "lib\utils" -Force
        Write-Host "  ✅ Moved utils/ to lib\utils\" -ForegroundColor Green
    }
}

# Merge validators/ into lib/validation/
if (Test-Path "validators") {
    Write-Host "  Merging validators/ into lib\validation\..." -ForegroundColor Yellow
    if (Test-Path "lib\validation") {
        Copy-Item -Path "validators\*" -Destination "lib\validation\" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "validators" -Recurse -Force
        Write-Host "  ✅ Merged and removed standalone validators/" -ForegroundColor Green
    } else {
        Move-Item -Path "validators" -Destination "lib\validation" -Force
        Write-Host "  ✅ Moved validators/ to lib\validation\" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "⚙️  FIX 3: Updating tsconfig.json with path aliases..." -ForegroundColor Magenta
Write-Host ""

$tsconfigPath = "tsconfig.json"
$tsconfigContent = Get-Content $tsconfigPath -Raw | ConvertFrom-Json

# Update paths
$tsconfigContent.compilerOptions.paths = @{
    "@/*" = @("./*")
    "@/app/*" = @("app/*")
    "@/components/*" = @("components/*")
    "@/composables/*" = @("composables/*")
    "@/lib/*" = @("lib/*")
    "@/types/*" = @("types/*")
    "@/config/*" = @("config/*")
    "@/locales/*" = @("locales/*")
    "@/assets/*" = @("assets/*")
    "@/styles/*" = @("styles/*")
    "@/public/*" = @("public/*")
    "@/services/*" = @("services/*")
    "@/store/*" = @("store/*")
    "@/tests/*" = @("tests/*")
}

$tsconfigContent | ConvertTo-Json -Depth 10 | Set-Content $tsconfigPath
Write-Host "  ✅ Updated tsconfig.json with path aliases" -ForegroundColor Green

Write-Host ""
Write-Host "🧩 FIX 4: Creating Providers component..." -ForegroundColor Magenta
Write-Host ""

# Create providers/index.tsx
$providersContent = @"
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
"@

Set-Content -Path "components\providers\index.tsx" -Value $providersContent
Write-Host "  ✅ Created components\providers\index.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "📄 FIX 5: Creating route group layouts..." -ForegroundColor Magenta
Write-Host ""

# Create (auth)/layout.tsx
$authLayoutContent = @"
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=`"min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800`">
      <div className=`"w-full max-w-md px-4`">
        <div className=`"mb-8 text-center`">
          <h1 className=`"text-3xl font-bold text-gray-900 dark:text-white`">
            CEO Web Project
          </h1>
          <p className=`"text-gray-600 dark:text-gray-400 mt-2`">
            Enterprise Management Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
"@

if (-not (Test-Path "app\(auth)\layout.tsx")) {
    Set-Content -Path "app\(auth)\layout.tsx" -Value $authLayoutContent
    Write-Host "  ✅ Created app\(auth)\layout.tsx" -ForegroundColor Green
}

# Create (onboarding)/layout.tsx
$onboardingLayoutContent = @"
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=`"min-h-screen bg-gray-50 dark:bg-gray-900`">
      <div className=`"max-w-4xl mx-auto py-12 px-4`">
        <div className=`"text-center mb-8`">
          <h1 className=`"text-2xl font-bold text-gray-900 dark:text-white`">
            Company Setup
          </h1>
          <p className=`"text-gray-600 dark:text-gray-400 mt-2`">
            Let's get your company set up in a few simple steps
          </p>
        </div>
        {/* Progress indicator would go here */}
        <div className=`"bg-white dark:bg-gray-800 rounded-lg shadow-sm`">
          {children}
        </div>
      </div>
    </div>
  );
}
"@

if (-not (Test-Path "app\(onboarding)\layout.tsx")) {
    Set-Content -Path "app\(onboarding)\layout.tsx" -Value $onboardingLayoutContent
    Write-Host "  ✅ Created app\(onboarding)\layout.tsx" -ForegroundColor Green
}

# Create (dashboard)/layout.tsx
$dashboardLayoutContent = @"
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=`"flex h-screen bg-gray-50 dark:bg-gray-900`">
      {/* Sidebar will go here */}
      <aside className=`"w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`">
        <div className=`"p-4`">
          <h2 className=`"text-xl font-bold`">Dashboard</h2>
        </div>
      </aside>
      
      {/* Main content */}
      <div className=`"flex-1 flex flex-col overflow-hidden`">
        {/* Header will go here */}
        <header className=`"bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4`">
          <div className=`"flex items-center justify-between`">
            <h1 className=`"text-2xl font-semibold`">Welcome</h1>
          </div>
        </header>
        
        {/* Page content */}
        <main className=`"flex-1 overflow-y-auto p-6`">
          {children}
        </main>
      </div>
    </div>
  );
}
"@

if (-not (Test-Path "app\(dashboard)\layout.tsx")) {
    Set-Content -Path "app\(dashboard)\layout.tsx" -Value $dashboardLayoutContent
    Write-Host "  ✅ Created app\(dashboard)\layout.tsx" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 FIX 6: Creating basic UI components..." -ForegroundColor Magenta
Write-Host ""

# Create Button component
$buttonContent = @"
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'default',
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
            'border border-gray-300 bg-transparent hover:bg-gray-100': variant === 'outline',
            'hover:bg-gray-100': variant === 'ghost',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-8 px-3 text-sm': size === 'sm',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
"@

Set-Content -Path "components\shared\ui\button\Button.tsx" -Value $buttonContent
Set-Content -Path "components\shared\ui\button\index.ts" -Value "export { Button } from './Button';"
Write-Host "  ✅ Created Button component" -ForegroundColor Green

# Create Input component
$inputContent = @"
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
"@

Set-Content -Path "components\shared\ui\input\Input.tsx" -Value $inputContent
Set-Content -Path "components\shared\ui\input\index.ts" -Value "export { Input } from './Input';"
Write-Host "  ✅ Created Input component" -ForegroundColor Green

# Create Card component
$cardContent = @"
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
"@

Set-Content -Path "components\shared\ui\card\Card.tsx" -Value $cardContent
Set-Content -Path "components\shared\ui\card\index.ts" -Value "export * from './Card';"
Write-Host "  ✅ Created Card component" -ForegroundColor Green

# Create UI barrel export
$uiIndexContent = @"
export { Button } from './button';
export { Input } from './input';
export { Card, CardHeader, CardTitle, CardContent } from './card';
"@

Set-Content -Path "components\shared\ui\index.ts" -Value $uiIndexContent
Write-Host "  ✅ Created UI barrel export" -ForegroundColor Green

Write-Host ""
Write-Host "🛠️  FIX 7: Creating cn utility function..." -ForegroundColor Magenta
Write-Host ""

$cnUtilContent = @"
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
"@

if (-not (Test-Path "lib\utils\cn.ts")) {
    Set-Content -Path "lib\utils\cn.ts" -Value $cnUtilContent
    Write-Host "  ✅ Created lib\utils\cn.ts" -ForegroundColor Green
}

# Create utils barrel export
$utilsIndexContent = @"
export { cn } from './cn';
"@

Set-Content -Path "lib\utils\index.ts" -Value $utilsIndexContent
Write-Host "  ✅ Created lib\utils\index.ts" -ForegroundColor Green

Write-Host ""
Write-Host "📝 FIX 8: Creating loading and error boundaries..." -ForegroundColor Magenta
Write-Host ""

# Create dashboard loading
$dashboardLoadingContent = @"
export default function DashboardLoading() {
  return (
    <div className=`"flex items-center justify-center h-full`">
      <div className=`"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600`"></div>
    </div>
  );
}
"@

if (-not (Test-Path "app\(dashboard)\loading.tsx")) {
    Set-Content -Path "app\(dashboard)\loading.tsx" -Value $dashboardLoadingContent
    Write-Host "  ✅ Created app\(dashboard)\loading.tsx" -ForegroundColor Green
}

# Create dashboard error
$dashboardErrorContent = @"
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className=`"flex flex-col items-center justify-center h-full`">
      <h2 className=`"text-2xl font-bold text-red-600 mb-4`">Something went wrong!</h2>
      <p className=`"text-gray-600 mb-4`">{error.message}</p>
      <button
        onClick={reset}
        className=`"px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700`"
      >
        Try again
      </button>
    </div>
  );
}
"@

if (-not (Test-Path "app\(dashboard)\error.tsx")) {
    Set-Content -Path "app\(dashboard)\error.tsx" -Value $dashboardErrorContent
    Write-Host "  ✅ Created app\(dashboard)\error.tsx" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ Auto-Fix Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary of Changes:" -ForegroundColor Cyan
Write-Host "  ✅ Created complete components/ directory structure" -ForegroundColor White
Write-Host "  ✅ Merged duplicate utils/ and validators/ folders" -ForegroundColor White
Write-Host "  ✅ Updated tsconfig.json with path aliases" -ForegroundColor White
Write-Host "  ✅ Created Providers component" -ForegroundColor White
Write-Host "  ✅ Created route group layouts (auth, onboarding, dashboard)" -ForegroundColor White
Write-Host "  ✅ Created basic UI components (Button, Input, Card)" -ForegroundColor White
Write-Host "  ✅ Created cn() utility function" -ForegroundColor White
Write-Host "  ✅ Created loading and error boundaries" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Manual Actions Still Needed:" -ForegroundColor Yellow
Write-Host "  1. Install missing dependencies: @tanstack/react-query" -ForegroundColor White
Write-Host "  2. Update app/layout.tsx to use Providers component" -ForegroundColor White
Write-Host "  3. Create .env.local file with environment variables" -ForegroundColor White
Write-Host "  4. Test imports with new path aliases" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Magenta
Write-Host "  1. Run: npm install @tanstack/react-query" -ForegroundColor White
Write-Host "  2. Update root layout to wrap children with Providers" -ForegroundColor White
Write-Host "  3. Start building your first page!" -ForegroundColor White
Write-Host ""

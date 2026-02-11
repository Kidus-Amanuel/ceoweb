# PowerShell Script to Move Folders to ceo_web_project_v1/.app/
# This script moves all application folders from ceo/ root to ceo_web_project_v1/.app/

Write-Host "🚀 Starting folder migration to .app/ directory..." -ForegroundColor Cyan
Write-Host ""

$sourceRoot = "c:\Users\user\Desktop\New folder (3)\New folder (6)\ceo"
$targetRoot = "c:\Users\user\Desktop\New folder (3)\New folder (6)\ceo\ceo_web_project_v1\.app"

# Change to source root
Set-Location $sourceRoot

# Folders to move to .app/
$foldersToMove = @(
    "components",
    "composables",
    "config",
    "locales",
    "assets",
    "styles",
    "types",
    "__tests__"
)

# Folders that need special handling
$specialFolders = @{
    "lib" = "lib"           # Merge with existing
    "public" = "public"     # Move (Next.js needs this in app root)
}

Write-Host "📁 Moving application folders to .app/..." -ForegroundColor Magenta
Write-Host ""

foreach ($folder in $foldersToMove) {
    $sourcePath = Join-Path $sourceRoot $folder
    $targetPath = Join-Path $targetRoot $folder
    
    if (Test-Path $sourcePath) {
        Write-Host "Moving: $folder" -ForegroundColor Yellow
        
        # Check if target already exists
        if (Test-Path $targetPath) {
            Write-Host "  ⚠️  Target exists: $targetPath" -ForegroundColor Red
            Write-Host "  ⚠️  Skipping to avoid data loss. Please merge manually." -ForegroundColor Red
        } else {
            try {
                Move-Item -Path $sourcePath -Destination $targetPath -Force
                Write-Host "  ✅ Moved successfully" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Error: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ⏭️  Folder not found: $folder" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host ""
Write-Host "🔧 Special handling for lib/ and public/..." -ForegroundColor Magenta
Write-Host ""

# Handle lib/ - needs merging
$libSource = Join-Path $sourceRoot "lib"
$libTarget = Join-Path $targetRoot "lib"

if (Test-Path $libSource) {
    Write-Host "📦 lib/ folder found" -ForegroundColor Yellow
    if (Test-Path $libTarget) {
        Write-Host "  ⚠️  Target lib/ already exists" -ForegroundColor Red
        Write-Host "  📝 Action needed: Manually merge these folders:" -ForegroundColor Cyan
        Write-Host "     Source: $libSource" -ForegroundColor White
        Write-Host "     Target: $libTarget" -ForegroundColor White
        Write-Host ""
        Write-Host "  Suggested structure after merge:" -ForegroundColor Cyan
        Write-Host "    lib/" -ForegroundColor White
        Write-Host "    ├── supabase/     (from new)" -ForegroundColor White
        Write-Host "    ├── api/          (from new)" -ForegroundColor White
        Write-Host "    ├── auth/         (from new)" -ForegroundColor White
        Write-Host "    ├── validation/   (from new)" -ForegroundColor White
        Write-Host "    ├── utils/        (merge with existing)" -ForegroundColor White
        Write-Host "    └── constants/    (from new)" -ForegroundColor White
    } else {
        Move-Item -Path $libSource -Destination $libTarget -Force
        Write-Host "  ✅ Moved lib/ successfully" -ForegroundColor Green
    }
} else {
    Write-Host "  ⏭️  lib/ not found at source" -ForegroundColor Gray
}

Write-Host ""

# Handle public/ - Next.js needs this at app root
$publicSource = Join-Path $sourceRoot "public"
$publicTarget = Join-Path $targetRoot "public"

if (Test-Path $publicSource) {
    Write-Host "📁 public/ folder found" -ForegroundColor Yellow
    if (Test-Path $publicTarget) {
        Write-Host "  ⚠️  Target public/ already exists" -ForegroundColor Red
        Write-Host "  📝 Action needed: Manually merge static files" -ForegroundColor Cyan
        Write-Host "     Source: $publicSource" -ForegroundColor White
        Write-Host "     Target: $publicTarget" -ForegroundColor White
    } else {
        Move-Item -Path $publicSource -Destination $publicTarget -Force
        Write-Host "  ✅ Moved public/ successfully" -ForegroundColor Green
    }
} else {
    Write-Host "  ⏭️  public/ not found at source" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔄 Moving scripts to workspace root..." -ForegroundColor Magenta
Write-Host ""

# Move scripts to workspace root (ceo_web_project_v1/scripts)
$scriptsSource = Join-Path $sourceRoot "scripts"
$scriptsTarget = "c:\Users\user\Desktop\New folder (3)\New folder (6)\ceo\ceo_web_project_v1\scripts"

if (Test-Path $scriptsSource) {
    Write-Host "Moving: scripts/ to workspace root" -ForegroundColor Yellow
    if (Test-Path $scriptsTarget) {
        Write-Host "  ⚠️  Target exists. Merging contents..." -ForegroundColor Yellow
        # Copy contents and remove source
        Copy-Item -Path "$scriptsSource\*" -Destination $scriptsTarget -Recurse -Force
        Remove-Item -Path $scriptsSource -Recurse -Force
        Write-Host "  ✅ Merged successfully" -ForegroundColor Green
    } else {
        Move-Item -Path $scriptsSource -Destination $scriptsTarget -Force
        Write-Host "  ✅ Moved successfully" -ForegroundColor Green
    }
} else {
    Write-Host "  ⏭️  scripts/ not found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  - Application folders moved to: ceo_web_project_v1\.app\" -ForegroundColor White
Write-Host "  - Scripts moved to workspace root: ceo_web_project_v1\scripts\" -ForegroundColor White
Write-Host "  - Documentation remains at project root (ceo\)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Manual Actions Required:" -ForegroundColor Yellow
Write-Host "  1. Merge lib/ if it already existed" -ForegroundColor White
Write-Host "  2. Merge public/ if it already existed" -ForegroundColor White
Write-Host "  3. Update tsconfig.json path aliases" -ForegroundColor White
Write-Host "  4. Verify all imports still work" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Magenta
Write-Host "  1. Review the .app/ directory structure" -ForegroundColor White
Write-Host "  2. Update tsconfig.json with correct paths" -ForegroundColor White
Write-Host "  3. Test import statements" -ForegroundColor White
Write-Host "  4. Start building your first component!" -ForegroundColor White
Write-Host ""

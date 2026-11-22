<#
.SYNOPSIS
    Applies ASHA schema and seeds demo data to a linked remote Supabase project.
    Uses only the Supabase CLI - no psql required.
.USAGE
    .\setup-supabase.ps1
#>

$migrationsDir = Join-Path $PSScriptRoot "packages\database\migrations"
$seedDir       = Join-Path $PSScriptRoot "packages\database\seeds"

# -------------------------------------------------------------------------
# Step 1: Apply schema via combined migration file
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "Step 1: Applying schema..." -ForegroundColor Cyan

$combinedMigration = Join-Path $migrationsDir "000_combined_all_migrations.sql"

if (-not (Test-Path $combinedMigration)) {
    Write-Error "File not found: $combinedMigration"
    exit 1
}

supabase db query --remote --file $combinedMigration

if ($LASTEXITCODE -ne 0) {
    Write-Host "Combined file had errors - trying individual files..." -ForegroundColor Yellow

    $individualFiles = @(
        "001_enums.sql",
        "002_profiles_and_shg.sql",
        "003_rls_policies.sql",
        "004_buyers_and_orders.sql",
        "005_orders_rls.sql",
        "006_planning_and_tasks.sql",
        "007_planning_rls.sql",
        "008_progress_quality_costing.sql",
        "009_progress_quality_rls.sql",
        "010_payouts.sql",
        "011_payouts_rls.sql"
    )

    foreach ($f in $individualFiles) {
        $fPath = Join-Path $migrationsDir $f
        Write-Host "  Applying $f ..." -ForegroundColor DarkGray
        supabase db query --remote --file $fPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Warning: $f had errors (may already exist, continuing)." -ForegroundColor Yellow
        }
    }
}

Write-Host "Schema step done." -ForegroundColor Green

# -------------------------------------------------------------------------
# Step 2: Run seed SQL files
# -------------------------------------------------------------------------
$seedFiles = @(
    "01-demo-seed.sql",
    "02-orders-seed.sql"
)

foreach ($file in $seedFiles) {
    $fullPath = Join-Path $seedDir $file

    if (-not (Test-Path $fullPath)) {
        Write-Error "Seed file not found: $fullPath"
        exit 1
    }

    Write-Host ""
    Write-Host "Step 2: Running seed $file ..." -ForegroundColor Cyan

    supabase db query --remote --file $fullPath

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: $file had errors (rows may already exist, continuing)." -ForegroundColor Yellow
    } else {
        Write-Host "$file executed successfully." -ForegroundColor Green
    }
}

# -------------------------------------------------------------------------
# Step 3: Verify row counts
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "Step 3: Verifying row counts..." -ForegroundColor Cyan

$tables = @("profiles","shgs","shg_members","buyers","orders","plans","tasks","cost_components","payout_sheets")

foreach ($t in $tables) {
    $q = "SELECT COUNT(*) AS rows FROM " + $t + ";"
    $result = supabase db query --remote $q 2>&1
    Write-Host ("  " + $t + " : " + ($result -join " ")) -ForegroundColor White
}

# -------------------------------------------------------------------------
# Done
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Magenta
Write-Host "Update your .env with the new project credentials, then run: pnpm dev" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Create these users in Supabase Dashboard, Authentication, Users, Add user:" -ForegroundColor DarkGray
Write-Host "  leader@asha.demo     / AshaDemoLeader123!" -ForegroundColor White
Write-Host "  member@asha.demo     / AshaDemoMember123!" -ForegroundColor White
Write-Host "  approver@asha.demo   / AshaDemoApprover123!" -ForegroundColor White
Write-Host "  buyer@asha.demo      / AshaDemoBuyer123!" -ForegroundColor White
Write-Host ""

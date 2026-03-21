param()

$ErrorActionPreference = "Stop"

$migrationDir = "packages/db/migrations"
if (-not (Test-Path $migrationDir)) {
  Write-Error "Migration directory missing: $migrationDir"
}

$files = Get-ChildItem -Path $migrationDir -File -Filter "*.sql"
if ($files.Count -eq 0) {
  Write-Error "No SQL migration files found in $migrationDir"
}

$bad = @()
foreach ($file in $files) {
  if ($file.Name -notmatch "^\d{14}_[a-z0-9_]+\.sql$") {
    $bad += $file.Name
  }
}

if ($bad.Count -gt 0) {
  Write-Error ("Invalid migration names:`n - " + ($bad -join "`n - "))
}

Write-Host ("Migration naming verification passed for " + $files.Count + " file(s).")


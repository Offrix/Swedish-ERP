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

$legacyFormatErrors = @()
foreach ($file in $files) {
  $content = Get-Content -Path $file.FullName -Raw
  $expectedMigrationId = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  $canonicalMatches = [regex]::Matches(
    $content,
    "INSERT\s+INTO\s+schema_migrations\s*\(\s*migration_id\s*\)\s*VALUES\s*\(\s*'([^']+)'\s*\)",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )

  if ($content -match "schema_migrations\s*\(\s*version\s*,\s*description\s*\)") {
    $legacyFormatErrors += ($file.Name + ": legacy schema_migrations(version, description) columns")
  }

  if ($content -match "ON\s+CONFLICT\s*\(\s*version\s*\)") {
    $legacyFormatErrors += ($file.Name + ": legacy ON CONFLICT(version) key")
  }

  if ($content -match "INSERT\s+INTO\s+schema_migrations" -and $content -notmatch "INSERT\s+INTO\s+schema_migrations\s*\(\s*migration_id\s*\)") {
    $legacyFormatErrors += ($file.Name + ": schema_migrations inserts must use canonical migration_id column")
  }

  if ($canonicalMatches.Count -eq 0) {
    $legacyFormatErrors += ($file.Name + ": must register itself exactly once in schema_migrations using migration_id '" + $expectedMigrationId + "'")
    continue
  }

  if ($canonicalMatches.Count -gt 1) {
    $legacyFormatErrors += ($file.Name + ": must register itself exactly once in schema_migrations; found " + $canonicalMatches.Count + " canonical inserts")
    continue
  }

  $actualMigrationId = $canonicalMatches[0].Groups[1].Value
  if ($actualMigrationId -ne $expectedMigrationId) {
    $legacyFormatErrors += ($file.Name + ": must register migration_id '" + $expectedMigrationId + "', found '" + $actualMigrationId + "'")
  }
}

if ($legacyFormatErrors.Count -gt 0) {
  Write-Error ("Invalid schema_migrations usage:`n - " + ($legacyFormatErrors -join "`n - "))
}

Write-Host ("Migration naming verification passed for " + $files.Count + " file(s).")

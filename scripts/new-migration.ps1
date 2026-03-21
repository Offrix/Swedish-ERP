param(
  [Parameter(Mandatory = $true)]
  [string]$name
)

$ErrorActionPreference = "Stop"

if ($name -notmatch "^[a-z0-9_]+$") {
  Write-Error "Name must match ^[a-z0-9_]+$"
}

$dir = "packages/db/migrations"
if (-not (Test-Path $dir)) {
  New-Item -Path $dir -ItemType Directory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$file = Join-Path $dir ($timestamp + "_" + $name + ".sql")

$content = @"
-- Migration: $name
-- Created at: $timestamp

BEGIN;

-- TODO: add migration SQL here.

INSERT INTO schema_migrations (migration_id)
VALUES ('${timestamp}_${name}')
ON CONFLICT (migration_id) DO NOTHING;

COMMIT;
"@

Set-Content -Path $file -Value $content -NoNewline
Write-Host ("Created migration: " + $file)

param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/server.mjs",
  "packages/document-engine/src/index.mjs",
  "packages/domain-documents/src/index.mjs",
  "packages/db/migrations/20260321030000_phase2_company_inbox.sql",
  "packages/db/seeds/20260321030010_phase2_company_inbox_seed.sql",
  "packages/db/seeds/20260321031000_phase2_company_inbox_demo_seed.sql",
  "tests/unit/document-engine-phase2-inbox.test.mjs",
  "tests/integration/phase2-company-inbox-api.test.mjs",
  "tests/e2e/phase2-company-inbox-flow.test.mjs",
  "docs/runbooks/fas-2-company-inbox-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 2.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 2.2 company inbox verification passed."

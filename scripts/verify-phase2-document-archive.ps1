param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/document-engine/src/index.mjs",
  "packages/domain-documents/src/index.mjs",
  "packages/db/migrations/20260321020000_phase2_document_archive.sql",
  "packages/db/seeds/20260321020010_phase2_document_archive_seed.sql",
  "packages/db/seeds/20260321021000_phase2_document_archive_demo_seed.sql",
  "tests/unit/document-engine-phase2.test.mjs",
  "tests/integration/phase2-document-archive-api.test.mjs",
  "tests/e2e/phase2-document-archive-flow.test.mjs",
  "docs/runbooks/fas-2-document-archive-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 2.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 2.1 document archive verification passed."

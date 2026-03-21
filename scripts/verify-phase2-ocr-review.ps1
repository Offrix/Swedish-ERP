param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/server.mjs",
  "packages/document-engine/src/index.mjs",
  "packages/domain-documents/src/index.mjs",
  "packages/db/migrations/20260321040000_phase2_ocr_review.sql",
  "packages/db/seeds/20260321040010_phase2_ocr_review_seed.sql",
  "packages/db/seeds/20260321041000_phase2_ocr_review_demo_seed.sql",
  "tests/unit/document-engine-phase2-ocr.test.mjs",
  "tests/integration/phase2-ocr-review-api.test.mjs",
  "tests/e2e/phase2-ocr-review-flow.test.mjs",
  "docs/runbooks/ocr-malware-scanning-operations.md",
  "docs/runbooks/fas-2-ocr-review-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 2.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 2.3 OCR and review verification passed."

param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/server.mjs",
  "apps/desktop-web/src/server.mjs",
  "apps/field-mobile/src/server.mjs",
  "apps/worker/src/worker.mjs",
  "packages/auth-core/src/index.ts",
  "packages/events/src/index.ts",
  "packages/db/migrations/20260321000000_phase0_foundation.sql",
  "packages/db/seeds/20260321000010_phase0_seed.sql",
  "packages/db/seeds/20260321001000_phase0_demo_seed.sql",
  "packages/rule-engine/src/index.ts",
  "packages/document-engine/src/index.ts",
  "packages/integration-core/src/index.ts",
  "packages/test-fixtures/src/index.ts",
  "packages/domain-core/src/index.ts",
  "packages/domain-org-auth/src/index.ts",
  "packages/domain-documents/src/index.ts",
  "packages/domain-ledger/src/index.ts",
  "packages/domain-vat/src/index.ts",
  "packages/domain-ar/src/index.ts",
  "packages/domain-ap/src/index.ts",
  "packages/domain-banking/src/index.ts",
  "packages/domain-hr/src/index.ts",
  "packages/domain-time/src/index.ts",
  "packages/domain-payroll/src/index.ts",
  "packages/domain-benefits/src/index.ts",
  "packages/domain-travel/src/index.ts",
  "packages/domain-pension/src/index.ts",
  "packages/domain-hus/src/index.ts",
  "packages/domain-projects/src/index.ts",
  "packages/domain-field/src/index.ts",
  "packages/domain-reporting/src/index.ts",
  "packages/domain-annual-reporting/src/index.ts",
  "packages/domain-integrations/src/index.ts",
  "packages/domain-personalliggare/src/index.ts",
  "packages/test-fixtures/golden/rule-pack.sample.json",
  "infra/docker/docker-compose.yml",
  "infra/terraform/main.tf",
  "infra/ecs/README.md",
  "docs/runbooks/fas-0-bootstrap-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 0 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 0 structure verification passed."

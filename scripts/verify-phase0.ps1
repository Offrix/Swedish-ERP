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
  "docs/runbooks/go-live-no-go-enforcement.md"
  "docs/implementation-control/GO_LIVE_NO_GO_POLICY.md"
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

$roadmap = Get-Content "docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md" -Raw
$library = Get-Content "docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md" -Raw
$policy = Get-Content "docs/implementation-control/GO_LIVE_NO_GO_POLICY.md" -Raw
$supersessionRunbook = Get-Content "docs/runbooks/governance-supersession.md" -Raw
$enforcementRunbook = Get-Content "docs/runbooks/go-live-no-go-enforcement.md" -Raw
$decisionDoc = Get-Content "docs/implementation-control/GOVERNANCE_SUPERSESSION_DECISION.md" -Raw

$contentErrors = @()

if ($roadmap -notmatch "\[x\]\s+0\.6") {
  $contentErrors += "GO_LIVE_ROADMAP_FINAL.md does not mark phase 0.6 as complete."
}

$requiredPolicyHeadings = @(
  "## Absolute live no-go rules",
  "## Absolute parity no-go rules",
  "## Absolute advantage no-go rules",
  "## Non-waivable no-go conditions",
  "## Waiver policy",
  "## Evidence bundle required before any live, parity or advantage claim"
)

foreach ($heading in $requiredPolicyHeadings) {
  if ($policy -notmatch [regex]::Escape($heading)) {
    $contentErrors += "GO_LIVE_NO_GO_POLICY.md is missing heading: $heading"
  }
}

if ($library -notmatch [regex]::Escape("docs/runbooks/go-live-no-go-enforcement.md")) {
  $contentErrors += "PHASE_IMPLEMENTATION_LIBRARY_FINAL.md does not require the no-go enforcement runbook."
}

if ($supersessionRunbook -notmatch [regex]::Escape("GO_LIVE_NO_GO_POLICY.md")) {
  $contentErrors += "governance-supersession.md does not reference GO_LIVE_NO_GO_POLICY.md."
}

if ($enforcementRunbook -notmatch [regex]::Escape("GO_LIVE_NO_GO_POLICY.md")) {
  $contentErrors += "go-live-no-go-enforcement.md does not reference GO_LIVE_NO_GO_POLICY.md."
}

if ($decisionDoc -notmatch [regex]::Escape("GO_LIVE_NO_GO_POLICY.md")) {
  $contentErrors += "GOVERNANCE_SUPERSESSION_DECISION.md does not include GO_LIVE_NO_GO_POLICY.md in its evidence chain."
}

if ($contentErrors.Count -gt 0) {
  Write-Error ("Phase 0 content verification failed:`n - " + ($contentErrors -join "`n - "))
}

Write-Host "Phase 0 structure verification passed."

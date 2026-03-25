param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$goldenCatalogPath = Join-Path $repoRoot "docs/test-plans/golden-data-catalog.md"

Push-Location $repoRoot
try {
  if (-not (Test-Path $goldenCatalogPath)) {
    Write-Error "Golden data catalog is missing at $goldenCatalogPath."
  }

  & node --test `
    "tests/unit/phase14-document-classification.test.mjs" `
    "tests/unit/phase28-hus-gates.test.mjs" `
    "tests/unit/phase29-personalliggare-industry-packs.test.mjs" `
    "tests/unit/phase48-legal-form-golden-scenarios.test.mjs" `
    "tests/integration/phase48-tax-account-offset-api.test.mjs" `
    "tests/e2e/phase48-public-annual-tax-account-flow.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Step 48 golden scenario verification failed."
  }

  Write-Host "Step 48 golden scenario verification passed."
}
finally {
  Pop-Location
}

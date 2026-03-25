param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/e2e/phase2-company-inbox-flow.test.mjs" `
    "tests/e2e/phase2-ocr-review-flow.test.mjs" `
    "tests/e2e/phase4-vat-reporting-flow.test.mjs" `
    "tests/e2e/phase5-ar-invoicing-flow.test.mjs" `
    "tests/e2e/phase6-ap-payments-flow.test.mjs" `
    "tests/e2e/phase8-payroll-tax-agi-flow.test.mjs" `
    "tests/e2e/phase10-build-flow.test.mjs" `
    "tests/e2e/phase10-projects-flow.test.mjs" `
    "tests/e2e/phase11-close-flow.test.mjs" `
    "tests/e2e/phase12-annual-reporting-flow.test.mjs" `
    "tests/e2e/phase12-tax-submission-flow.test.mjs" `
    "tests/e2e/phase13-public-api-flow.test.mjs" `
    "tests/e2e/phase13-partner-integrations-flow.test.mjs" `
    "tests/e2e/phase14-migration-flow.test.mjs" `
    "tests/e2e/phase14-resilience-flow.test.mjs" `
    "tests/e2e/phase48-public-annual-tax-account-flow.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Pilot parallel run verification failed."
  }

  Write-Host "Pilot parallel runs passed."
}
finally {
  Pop-Location
}

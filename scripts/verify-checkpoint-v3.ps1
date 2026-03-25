param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/unit/phase14-document-classification.test.mjs" `
    "tests/integration/phase14-document-classification-api.test.mjs" `
    "tests/unit/phase17-balances.test.mjs" `
    "tests/integration/phase17-balances-api.test.mjs" `
    "tests/unit/phase18-collective-agreements.test.mjs" `
    "tests/integration/phase18-collective-agreements-api.test.mjs" `
    "tests/unit/phase19-payroll-migration.test.mjs" `
    "tests/integration/phase19-payroll-migration-api.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V3 classification, balances, agreements or migration tests failed."
  }

  & "$PSScriptRoot\verify-phase8-payroll-core.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V3 payroll core verification failed."
  }

  & "$PSScriptRoot\verify-phase8-payroll-tax-agi.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V3 payroll tax and AGI verification failed."
  }

  & "$PSScriptRoot\verify-phase9-benefits.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V3 benefits verification failed."
  }

  Write-Host "Checkpoint V3 document and payroll chain verification passed."
}
finally {
  Pop-Location
}

param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/unit/phase14-accounting-method.test.mjs" `
    "tests/integration/phase14-accounting-method-api.test.mjs" `
    "tests/unit/phase14-fiscal-year.test.mjs" `
    "tests/integration/phase14-fiscal-year-api.test.mjs" `
    "tests/unit/phase14-series-runtime.test.mjs" `
    "tests/integration/phase14-series-api.test.mjs" `
    "tests/unit/phase14-tax-account.test.mjs" `
    "tests/integration/phase14-tax-account-api.test.mjs" `
    "tests/integration/phase48-tax-account-offset-api.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V2 foundation tests failed."
  }

  & "$PSScriptRoot\verify-phase3-ledger-foundation.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V2 ledger foundation verification failed."
  }

  & "$PSScriptRoot\verify-phase4-vat.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V2 VAT verification failed."
  }

  & "$PSScriptRoot\verify-phase4-vat-rules.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V2 VAT rules verification failed."
  }

  & "$PSScriptRoot\verify-phase4-vat-reporting.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V2 VAT reporting verification failed."
  }

  Write-Host "Checkpoint V2 finance and tax foundation verification passed."
}
finally {
  Pop-Location
}

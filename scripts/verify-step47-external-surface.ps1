param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & "$PSScriptRoot\verify-phase13-public-api.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Step 47 public API verification failed."
  }

  & "$PSScriptRoot\verify-phase13-partner-integrations.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Step 47 partner integration verification failed."
  }

  & node --test `
    "tests/e2e/phase13-public-api-flow.test.mjs" `
    "tests/e2e/phase13-partner-integrations-flow.test.mjs" `
    "tests/e2e/phase48-public-annual-tax-account-flow.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Step 47 external surface end-to-end verification failed."
  }

  Write-Host "Step 47 external surface verification passed."
}
finally {
  Pop-Location
}

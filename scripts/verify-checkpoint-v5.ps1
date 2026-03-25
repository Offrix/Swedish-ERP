param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/unit/phase34-legal-form.test.mjs" `
    "tests/integration/phase34-legal-form-api.test.mjs" `
    "tests/unit/phase35-annual-reporting-evidence.test.mjs" `
    "tests/unit/phase48-legal-form-golden-scenarios.test.mjs" `
    "tests/e2e/phase48-public-annual-tax-account-flow.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V5 legal form or annual reporting tests failed."
  }

  & "$PSScriptRoot\verify-phase12-annual-reporting.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V5 annual reporting verification failed."
  }

  & "$PSScriptRoot\verify-phase12-tax-submissions.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V5 tax submission verification failed."
  }

  Write-Host "Checkpoint V5 annual and filing verification passed."
}
finally {
  Pop-Location
}

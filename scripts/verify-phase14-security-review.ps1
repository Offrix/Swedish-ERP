param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "tests/unit/phase14-security.test.mjs",
  "tests/integration/phase14-security-api.test.mjs",
  "tests/e2e/phase14-security-flow.test.mjs"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 14.1 verification paths:`n - " + ($missing -join "`n - "))
}

& node --test `
  "tests/unit/phase14-security.test.mjs" `
  "tests/integration/phase14-security-api.test.mjs" `
  "tests/e2e/phase14-security-flow.test.mjs"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 14.1 verification failed."
}

Write-Host "Phase 14.1 security review verification passed."

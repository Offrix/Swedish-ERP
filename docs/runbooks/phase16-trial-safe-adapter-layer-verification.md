# Fas 16.7 Trial Safe Adapter Layer Verification

## Scope

Verifiera att adapterlagret ar trial-safe:
- capability manifests bar explicit receipt mode policy
- connections far resolved receipt mode per environment
- trial kan aldrig bara legal effect
- icke trial-safe adapters blockas i trial

## Minsta verifiering

1. Kor riktade tester:
   - `node --test tests/unit/phase16-trial-safe-adapter-layer.test.mjs`
   - `node --test tests/integration/phase16-trial-safe-adapter-layer-api.test.mjs`
2. Kor full gate:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Godkant resultat

- manifests exponerar `receiptModePolicy`
- trial-safe adapters materialiserar `receiptMode = trial_simulated` i trial
- live-capable adapters materialiserar `receiptMode = provider_receipt_required` i production
- non-legal adapters stannar i `internal_audit_only`
- trial-otillaten regulated adapter kan inte skapas i trial

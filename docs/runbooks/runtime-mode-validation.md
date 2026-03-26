# Runtime Mode Validation

## Purpose

Ensure every starter chooses an explicit runtime mode and that non-live modes never masquerade as legal-effect production runtime.

## Canonical runtime modes

- `trial`
- `sandbox_internal`
- `test`
- `pilot_parallel`
- `production`

## Rules

1. Main starters must declare runtime mode explicitly through `runtimeMode` or `ERP_RUNTIME_MODE`.
2. `production` and `pilot_parallel` may never rely on implicit demo boot.
3. Runtime mode must be attached to the composed API platform and available to worker execution.
4. Trial, sandbox and test must report `supportsLegalEffect=false`.
5. Production must report `supportsLegalEffect=true`.
6. API and worker startup must run runtime invariant diagnostics before boot continues.
7. `production` and `pilot_parallel` must fail fast if startup diagnostics detect:
   - missing persistent runtime store
   - forbidden bootstrap or scenario seeding
   - flat platform merge collisions
   - Map-only critical truth in regulated domains
   - stub providers
   - simulated filing or receipt runtime
   - forbidden sandbox route families
8. Runtime diagnostics must be observable through:
   - `GET /v1/system/runtime-mode`
   - `GET /v1/system/invariants`
   - `POST /v1/system/bootstrap/validate`

## Validation

Run:

```powershell
node --test tests/unit/phase1-runtime-mode.test.mjs
node --test tests/unit/phase1-startup-diagnostics.test.mjs
node --test tests/integration/phase1-runtime-diagnostics-api.test.mjs
node --test tests/e2e/apps-smoke.test.mjs
```

Then run the full verification suite before the next roadmap subphase.

## Failure conditions

- API main process starts without explicit runtime mode.
- Worker main process starts without explicit runtime mode.
- A platform exposes no `runtimeModeProfile`.
- A non-live mode claims `supportsLegalEffect=true`.
- A starter silently falls back to demo semantics.
- Protected boot proceeds despite blocking runtime invariant findings.
- Runtime diagnostics endpoint omits current findings or startupAllowed state.
- Honesty scanner misses Map-only truth, stub providers, simulated submission runtime or forbidden sandbox route families.

# Phase 16.3 Partner Adapter Contract Tests and Health Verification

## Syfte

Verifiera att partneradapters har first-class contract-test packs, produktionsspärr mot ogröna adapters, läsbar adapterhälsa och connection-aware async/dead-letter/replay-flöden.

## Körning

1. Riktade 16.3-sviter:
   - `node --test tests/unit/phase16-partner-api-hardening.test.mjs`
   - `node --test tests/integration/phase16-partner-api-hardening-api.test.mjs`
2. Regression på äldre partnerflöden:
   - `node --test tests/unit/phase13-partners.test.mjs`
   - `node --test tests/integration/phase13-partner-integrations-api.test.mjs`
   - `node --test tests/e2e/phase13-partner-integrations-flow.test.mjs`
3. Full verifiering:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Måste verifieras

- `/v1/partners/contract-test-packs` returnerar first-class test packs per adapter med:
  - `testPackCode`
  - `connectionType`
  - `providerCode`
  - `supportedModes`
  - `assertions`
  - `requiredEvents`
  - `replaySafe`
- production partner operations blockeras med `409 partner_contract_test_required` tills senaste contract test är grönt
- `/v1/partners/connections/:connectionId/health-checks` går både att köra och läsa
- `/v1/partners/connections/:connectionId/health-summary` exponerar:
  - latest health check
  - latest contract-test status
  - dead-letter count
  - replay-planned count
  - retry-scheduled count
  - fallback/rate-limited counters
- `/v1/jobs?connectionId=...` filtrerar adapterbundna jobb deterministiskt
- `/v1/jobs/dead-letters` returnerar connection-aware dead letters med job summary

## Exit

16.3 är verifierad först när partner contract-test packs, adapter health och async dead-letter/replay är bevisade i både riktade tester och full svit.

# Phase 16.2 Public API Catalog Verification

## Syfte

Verifiera att public API-specen, scope-katalogen, sandbox-katalogen och compatibility-baseline-flödet är versionslåsta, trial-säkra och tillräckligt hårda för extern användning.

## Körning

1. Kör unit-sviten:
   - `node --test tests/unit/phase16-public-api-catalog.test.mjs`
2. Kör API-sviten:
   - `node --test tests/integration/phase16-public-api-catalog-api.test.mjs`
3. Kör regression på äldre public-API-ytor:
   - `node --test tests/unit/phase13-public-api.test.mjs`
   - `node --test tests/integration/phase13-public-api-api.test.mjs`
   - `node --test tests/e2e/phase13-public-api-flow.test.mjs`
4. Kör full verifiering:
   - `node scripts/run-tests.mjs all`
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
   - `node scripts/security-scan.mjs`

## Måste verifieras

- `/v1/public/spec` returnerar:
  - `version`
  - `currentVersion`
  - `canonicalApiVersion`
  - `supportedVersions`
  - `auth.scopeCatalog`
  - `compatibility.baselineRecordingSupported`
  - `compatibility.routeHashAlgorithm`
- ogiltig specversion returnerar `400 public_api_spec_version_unsupported`
- `/v1/public/sandbox/catalog` returnerar:
  - `watermarkCode=SANDBOX_PUBLIC_API`
  - `supportsLegalEffect=false`
  - `scopeCatalog`
  - `clientCredentials`
  - `reportSnapshotExamples`
  - `taxAccountSummaryExample`
  - `exampleWebhookEvents`
- `/v1/public-api/compatibility-baselines` lagrar:
  - validerad `version`
  - `routeHash`
  - `specHash`
  - `endpointCount`
- public API-klienter exponerar:
  - `specVersion`
  - `supportedGrantTypes`
  - `tokenEndpoint`

## Exit

Fasen är verifierad först när alla ovanstående kontrakt är gröna i riktade tester och full svit.

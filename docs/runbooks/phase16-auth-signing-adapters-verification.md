# Phase 16.5 verification

## Scope

Verify that auth, federation, local-factor and signing/evidence-archive adapters are first-class control-plane providers and that runtime signing flows now emit immutable archive references.

## Required commands

```powershell
node --test tests/unit/phase16-auth-signing-adapters.test.mjs
node --test tests/integration/phase16-auth-signing-adapters-api.test.mjs
node --test tests/unit/phase13-regulated-submissions-package.test.mjs
node --test tests/unit/annual-reporting-phase12-1.test.mjs
```

## Expected outcomes

- `GET /v1/integrations/capability-manifests` exposes:
  - `auth_identity` with `signicat-bankid`
  - `enterprise_federation` with `workos-federation`
  - `auth_local_factor` with `local-passkey` and `local-totp`
  - `evidence_archive` with `signicat_signing_archive`
- Credentialless local-factor connections can be created without secrets and do not fail health checks on credentials.
- Async auth/federation connections fail health if callback domain/path is missing and pass once both are configured.
- `signAuthoritySubmission` produces:
  - `signatureReference`
  - `signatureArchiveRefs[]`
  - evidence-pack signoff refs backed by immutable archive metadata
- `signAnnualReportVersion` produces:
  - signatory `signatureReference`
  - signatory `signatureArchiveRef`
  - annual evidence pack rotation with populated `signatureArchiveRefs`

## Full gate after targeted verification

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```

## Exit criteria

- All targeted 16.5 tests green
- Full suite green
- Lint, typecheck, build and security green
- `docs/implementation-control/GO_LIVE_ROADMAP.md` marks `16.5` complete

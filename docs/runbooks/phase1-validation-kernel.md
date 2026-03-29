# Phase 1.5 Validation Kernel Verification

## Purpose

Verify that the central validation kernel is the single source of truth for Swedish identifiers, VAT alias normalization, OCR/payment references and time-zone normalization.

## Required coverage

- `domain-core/src/validation.mjs` is present and exported through `domain-core/src/index.mjs`.
- Auth uses the kernel for Swedish organization numbers.
- HR uses the kernel for personnummer and samordningsnummer.
- Time and payroll use the kernel for IANA time zones and ISO dates.
- HUS uses the kernel for buyer identities, housing association organization numbers and payment references.
- AR/AP use the kernel for Swedish organization numbers and VAT-number normalization.
- VAT uses the kernel for `GR`/`EL` alias handling and ISO dates.
- Migration uses the kernel for country-code normalization.

## Verification steps

1. Run:
   - `node --test tests/unit/phase1-validation-kernel.test.mjs`
2. Run:
   - `powershell -ExecutionPolicy Bypass -File scripts/verify-phase1.ps1`
3. Confirm failures for invalid fixtures are corrected rather than bypassed.

## Exit criteria

- Invalid Swedish org/person identifiers fail with deterministic validation errors.
- Valid personnummer/samordningsnummer normalize to canonical 10-digit form.
- `GR` VAT prefixes normalize to `EL`.
- Invalid non-IANA time zones are rejected.
- Phase 1 verification passes without local fallback validators in the covered domains.

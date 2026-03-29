# Mandatory Capability Locks

Status: support document for `GO_LIVE_ROADMAP_FINAL.md` phase `0.5`.  
This document is not a new source of truth. It exists to lock in mandatory build obligations that may not be de-scoped, deferred into UI, or silently replaced by weaker substitutes.

## Locked capabilities

| Lock ID | Mandatory capability | Binding roadmap phases | Required code or module targets | Why it cannot be de-scoped | No-go if missing |
| --- | --- | --- | --- | --- | --- |
| N-001 | Bank-grade security architecture | 3.1-3.6 | `packages/domain-core/src/security-classes.mjs`, `packages/domain-core/src/crypto.mjs`, `packages/domain-core/src/secrets.mjs`, auth/session hardening, KMS/HSM integration points, masking and audit controls | Final docs require explicit encryption, hashing, tokenization, key rotation, step-up and secrets segregation. Weak security invalidates every later regulated phase. | No live, no pilot, no parity and no advantage claims. |
| N-005 | One-click migration/import engine | 16.1-16.6 | migration discovery, source adapters, mapping, diff, blockers, signoff, rollback, promotion, bureau mode and trial-to-live safe promotion paths | Market-winning onboarding depends on starting migration in one click while preserving guided review and rollback. CSV-only or cockpit-only migration is not enough. | No broad customer win, no bureau win, no migration parity. |
| N-003 | SIE4 import/export | 7.6, 16.2 | `packages/domain-sie/src/index.mjs`, import/export routes, reconciliation, evidence and migration handoff support | SIE4 is mandatory for Swedish accounting mobility, bureau cooperation, audit and migration. | No serious Swedish bureau/revision go-live. |
| N-002 | Aktieutdelning / owner distributions | 12.5 | `packages/domain-owner-distributions/src/index.mjs`, decision, ledger, payout, KU31 and kupongskatt flows | Aktiebolag cannot be honestly supported without board/shareholder distribution logic, tax handling and evidence chain. | No AB go-live. |
| N-004 | Corporate tax / tax declaration pack | 12.4 | annual/tax declaration pack, current tax computation, declaration evidence, filing and correction support | Corporate tax is part of the stated platform scope and required for annual close and legal entity truth. | No compliant AB close or declaration story. |

## Binding interpretation

1. These capability locks are mandatory even if other parts of the repo appear more mature.
2. None of these items may be moved into "later polish", "UI phase", "post-GA hardening" or equivalent language.
3. A phase may not be marked complete if it leaves one of the locked capabilities undefined, optional or dependent on historical docs.
4. Equivalent wording is allowed, weaker scope is not.

## Verification checklist

- `GO_LIVE_ROADMAP_FINAL.md` still maps `N-001` to `N-005` into explicit subphases.
- `BLOCKER_TRACEABILITY_MATRIX_FINAL.md` includes `N-001` to `N-005`.
- No governance doc describes any of these as optional, premium-only or post-go-live.

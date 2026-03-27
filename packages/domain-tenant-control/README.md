# @swedish-erp/domain-tenant-control

Tenant bootstrap, company setup, module activation and trial/promotion control boundary.

## FAS 7.1 scope

- tenant bootstrap and resumable checklist mirror
- company setup profile source of truth for finance-readiness state
- tenant module definition and activation orchestration
- trial environment profile lifecycle
- promotion plan and parallel-run plan objects

## Notes

- The package is the canonical tenant-control boundary in the API platform.
- Legacy onboarding and module flows can still be bridged through org-auth while source of truth moves here.
- Trial, promotion and parallel-run objects are introduced here and hardened in later fas 7 delfaser.

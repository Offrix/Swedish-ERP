# @swedish-erp/domain-org-auth

Organization and access-control boundary for companies, company users, roles, delegations and attestation chains.

## FAS 1 scope

- company and company-user lifecycle
- RBAC and object-based authorization decisions
- delegation windows and approval-chain modeling
- session, MFA and BankID stub orchestration
- onboarding runs, resumable checklist state and company setup blueprint

## Notes

- The package keeps domain logic out of UI and transport.
- API uses the service through explicit application-level calls.
- Audit events are emitted for auth, delegation, access and onboarding actions.

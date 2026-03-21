# API

HTTP baseline plus FAS 1 organization, auth and onboarding routes.

## Start

```bash
pnpm --filter @swedish-erp/api start
```

## Endpoints

- `GET /`
- `GET /healthz`
- `GET /readyz`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/mfa/totp/enroll`
- `POST /v1/auth/mfa/totp/verify`
- `POST /v1/auth/mfa/passkeys/register-options`
- `POST /v1/auth/mfa/passkeys/register-verify`
- `POST /v1/auth/mfa/passkeys/assert`
- `POST /v1/auth/bankid/start`
- `POST /v1/auth/bankid/collect`
- `GET/POST /v1/org/companies/:companyId/users`
- `POST /v1/org/delegations`
- `POST /v1/org/object-grants`
- `POST /v1/org/attest-chains`
- `GET /v1/org/attest-chains/:id`
- `POST /v1/authz/check`
- `POST /v1/onboarding/runs`
- `GET /v1/onboarding/runs/:id`
- `GET /v1/onboarding/runs/:id/checklist`
- `POST /v1/onboarding/runs/:id/steps/company`
- `POST /v1/onboarding/runs/:id/steps/registrations`
- `POST /v1/onboarding/runs/:id/steps/chart`
- `POST /v1/onboarding/runs/:id/steps/vat`
- `POST /v1/onboarding/runs/:id/steps/periods`
- `POST /v1/documents`
- `POST /v1/documents/:documentId/versions`
- `POST /v1/documents/:documentId/links`
- `GET /v1/documents/:documentId/export?companyId=...`
- `POST /v1/inbox/channels`
- `POST /v1/inbox/messages`
- `GET /v1/inbox/messages/:emailIngestMessageId?companyId=...`
- `POST /v1/documents/:documentId/ocr/runs`
- `GET /v1/documents/:documentId/ocr/runs?companyId=...`
- `GET /v1/review-tasks/:reviewTaskId?companyId=...`
- `POST /v1/review-tasks/:reviewTaskId/claim`
- `POST /v1/review-tasks/:reviewTaskId/correct`
- `POST /v1/review-tasks/:reviewTaskId/approve`

## Disable strategy

Set `PHASE1_AUTH_ONBOARDING_ENABLED=false` to return `503` for FAS 1 routes without touching the rest of the API process.

Set `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false` to return `503` for FAS 2.1 document archive routes while keeping the rest of the API process alive.

Set `PHASE2_COMPANY_INBOX_ENABLED=false` to return `503` for FAS 2.2 company inbox routes while keeping the rest of the API process alive.

Set `PHASE2_OCR_REVIEW_ENABLED=false` to return `503` for FAS 2.3 OCR and review routes while keeping the rest of the API process alive.

# API

HTTP baseline plus phased domain routes through FAS 9.3.

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
- `POST /v1/ledger/chart/install`
- `GET /v1/ledger/accounts?companyId=...`
- `GET /v1/ledger/accounting-periods?companyId=...`
- `GET /v1/ledger/dimensions?companyId=...`
- `GET /v1/ledger/voucher-series?companyId=...`
- `POST /v1/ledger/journal-entries`
- `GET /v1/ledger/journal-entries/:journalEntryId?companyId=...`
- `POST /v1/ledger/journal-entries/:journalEntryId/validate`
- `POST /v1/ledger/journal-entries/:journalEntryId/post`
- `POST /v1/ledger/accounting-periods/:accountingPeriodId/lock`
- `POST /v1/ledger/accounting-periods/:accountingPeriodId/reopen`
- `POST /v1/ledger/journal-entries/:journalEntryId/reverse`
- `POST /v1/ledger/journal-entries/:journalEntryId/correct`
- `GET /v1/reporting/report-definitions?companyId=...`
- `POST /v1/reporting/report-snapshots`
- `GET /v1/reporting/report-snapshots/:reportSnapshotId?companyId=...`
- `GET /v1/reporting/report-snapshots/:reportSnapshotId/drilldown?companyId=...&lineKey=...`
- `GET /v1/reporting/journal-search?companyId=...`
- `GET /v1/reporting/reconciliations?companyId=...`
- `POST /v1/reporting/reconciliations`
- `GET /v1/reporting/reconciliations/:reconciliationRunId?companyId=...`
- `POST /v1/reporting/reconciliations/:reconciliationRunId/signoff`
- `GET /v1/vat/codes?companyId=...`
- `GET /v1/vat/rule-packs?companyId=...&effectiveDate=...`
- `POST /v1/vat/decisions`
- `GET /v1/vat/decisions/:vatDecisionId?companyId=...`
- `GET /v1/vat/review-queue?companyId=...`
- `POST /v1/vat/declaration-runs`
- `GET /v1/vat/declaration-runs/:vatDeclarationRunId?companyId=...`
- `POST /v1/vat/periodic-statements`
- `GET /v1/vat/periodic-statements/:vatPeriodicStatementRunId?companyId=...`
- `GET /v1/ar/customers?companyId=...`
- `POST /v1/ar/customers`
- `GET /v1/ar/customers/:customerId?companyId=...`
- `GET /v1/ar/customers/:customerId/contacts?companyId=...`
- `POST /v1/ar/customers/:customerId/contacts`
- `POST /v1/ar/customers/imports`
- `GET /v1/ar/customers/imports/:customerImportBatchId?companyId=...`
- `GET /v1/ar/items?companyId=...`
- `POST /v1/ar/items`
- `GET /v1/ar/items/:itemId?companyId=...`
- `GET /v1/ar/price-lists?companyId=...`
- `POST /v1/ar/price-lists`
- `GET /v1/ar/price-lists/:priceListId?companyId=...`
- `GET /v1/ar/quotes?companyId=...`
- `POST /v1/ar/quotes`
- `GET /v1/ar/quotes/:quoteId?companyId=...`
- `POST /v1/ar/quotes/:quoteId/status`
- `POST /v1/ar/quotes/:quoteId/revise`
- `GET /v1/ar/contracts?companyId=...`
- `POST /v1/ar/contracts`
- `GET /v1/ar/contracts/:contractId?companyId=...`
- `POST /v1/ar/contracts/:contractId/status`
- `GET /v1/ar/invoices?companyId=...`
- `POST /v1/ar/invoices`
- `GET /v1/ar/invoices/:customerInvoiceId?companyId=...`
- `POST /v1/ar/invoices/:customerInvoiceId/issue`
- `POST /v1/ar/invoices/:customerInvoiceId/deliver`
- `POST /v1/ar/invoices/:customerInvoiceId/payment-links`
- `GET /v1/ar/open-items?companyId=...`
- `GET /v1/ar/open-items/:arOpenItemId?companyId=...`
- `POST /v1/ar/open-items/:arOpenItemId/collection-state`
- `POST /v1/ar/open-items/:arOpenItemId/allocations`
- `POST /v1/ar/open-items/:arOpenItemId/writeoffs`
- `POST /v1/ar/allocations/:arAllocationId/reverse`
- `GET /v1/ar/payment-matching-runs?companyId=...`
- `POST /v1/ar/payment-matching-runs`
- `GET /v1/ar/payment-matching-runs/:arPaymentMatchingRunId?companyId=...`
- `GET /v1/ar/dunning-runs?companyId=...`
- `POST /v1/ar/dunning-runs`
- `GET /v1/ar/dunning-runs/:arDunningRunId?companyId=...`
- `GET /v1/ar/aging-snapshots?companyId=...`
- `POST /v1/ar/aging-snapshots`
- `GET /v1/ap/suppliers?companyId=...`
- `POST /v1/ap/suppliers`
- `GET /v1/ap/suppliers/:supplierId?companyId=...`
- `POST /v1/ap/suppliers/:supplierId/status`
- `POST /v1/ap/suppliers/imports`
- `GET /v1/ap/suppliers/imports/:supplierImportBatchId?companyId=...`
- `GET /v1/ap/purchase-orders?companyId=...`
- `POST /v1/ap/purchase-orders`
- `GET /v1/ap/purchase-orders/:purchaseOrderId?companyId=...`
- `POST /v1/ap/purchase-orders/:purchaseOrderId/status`
- `POST /v1/ap/purchase-orders/imports`
- `GET /v1/ap/purchase-orders/imports/:purchaseOrderImportBatchId?companyId=...`
- `GET /v1/ap/receipts?companyId=...`
- `POST /v1/ap/receipts`
- `GET /v1/ap/receipts/:apReceiptId?companyId=...`
- `GET /v1/ap/invoices?companyId=...`
- `POST /v1/ap/invoices/ingest`
- `GET /v1/ap/invoices/:supplierInvoiceId?companyId=...`
- `POST /v1/ap/invoices/:supplierInvoiceId/approve`
- `POST /v1/ap/invoices/:supplierInvoiceId/match`
- `POST /v1/ap/invoices/:supplierInvoiceId/post`
- `GET /v1/ap/open-items?companyId=...`
- `GET /v1/ap/open-items/:apOpenItemId?companyId=...`
- `GET /v1/banking/accounts?companyId=...`
- `POST /v1/banking/accounts`
- `GET /v1/banking/accounts/:bankAccountId?companyId=...`
- `GET /v1/banking/payment-proposals?companyId=...`
- `POST /v1/banking/payment-proposals`
- `GET /v1/banking/payment-proposals/:paymentProposalId?companyId=...`
- `POST /v1/banking/payment-proposals/:paymentProposalId/approve`
- `POST /v1/banking/payment-proposals/:paymentProposalId/export`
- `POST /v1/banking/payment-proposals/:paymentProposalId/submit`
- `POST /v1/banking/payment-proposals/:paymentProposalId/accept`
- `POST /v1/banking/payment-orders/:paymentOrderId/book`
- `POST /v1/banking/payment-orders/:paymentOrderId/reject`
- `POST /v1/banking/payment-orders/:paymentOrderId/return`
- `GET /v1/time/schedule-templates?companyId=...`
- `POST /v1/time/schedule-templates`
- `GET /v1/time/schedule-assignments?companyId=...&employmentId=...`
- `POST /v1/time/schedule-assignments`
- `GET /v1/time/clock-events?companyId=...&employmentId=...`
- `POST /v1/time/clock-events`
- `GET /v1/time/entries?companyId=...&employmentId=...`
- `POST /v1/time/entries`
- `GET /v1/time/balances?companyId=...&employmentId=...&cutoffDate=...`
- `GET /v1/time/period-locks?companyId=...`
- `POST /v1/time/period-locks`
- `GET /v1/hr/leave-types?companyId=...`
- `POST /v1/hr/leave-types`
- `GET /v1/hr/leave-entries?companyId=...`
- `GET /v1/hr/leave-entries/:leaveEntryId?companyId=...`
- `POST /v1/hr/leave-entries/:leaveEntryId/approve`
- `POST /v1/hr/leave-entries/:leaveEntryId/reject`
- `GET /v1/hr/leave-signals?companyId=...`
- `GET /v1/hr/leave-signal-locks?companyId=...`
- `POST /v1/hr/leave-signal-locks`
- `GET /v1/hr/employee-portal/me?companyId=...`
- `GET /v1/hr/employee-portal/me/leave-entries?companyId=...`
- `POST /v1/hr/employee-portal/me/leave-entries`
- `GET /v1/hr/employee-portal/me/leave-entries/:leaveEntryId?companyId=...`
- `PATCH /v1/hr/employee-portal/me/leave-entries/:leaveEntryId`
- `POST /v1/hr/employee-portal/me/leave-entries/:leaveEntryId/submit`
- `GET /v1/hr/employees?companyId=...`
- `POST /v1/hr/employees`
- `GET /v1/hr/employees/:employeeId?companyId=...`
- `GET /v1/hr/employees/:employeeId/employments?companyId=...`
- `POST /v1/hr/employees/:employeeId/employments`
- `GET /v1/hr/employees/:employeeId/contracts?companyId=...&employmentId=...`
- `POST /v1/hr/employees/:employeeId/contracts`
- `GET /v1/hr/employees/:employeeId/manager-assignments?companyId=...&employmentId=...`
- `POST /v1/hr/employees/:employeeId/manager-assignments`
- `GET /v1/hr/employees/:employeeId/bank-accounts?companyId=...`
- `POST /v1/hr/employees/:employeeId/bank-accounts`
- `GET /v1/hr/employees/:employeeId/documents?companyId=...`
- `POST /v1/hr/employees/:employeeId/documents`
- `GET /v1/hr/employees/:employeeId/audit-events?companyId=...`
- `GET /v1/benefits/catalog?companyId=...`
- `GET /v1/benefits/events?companyId=...&reportingPeriod=...&employmentId=...`
- `POST /v1/benefits/events`
- `GET /v1/benefits/events/:benefitEventId?companyId=...`
- `GET /v1/benefits/audit-events?companyId=...&benefitEventId=...`
- `GET /v1/travel/foreign-allowances?taxYear=2026`
- `GET /v1/travel/claims?companyId=...&reportingPeriod=...&employmentId=...`
- `POST /v1/travel/claims`
- `GET /v1/travel/claims/:travelClaimId?companyId=...`
- `GET /v1/travel/audit-events?companyId=...&travelClaimId=...`
- `GET /v1/pension/plans?companyId=...`
- `GET /v1/pension/enrollments?companyId=...&employmentId=...`
- `POST /v1/pension/enrollments`
- `POST /v1/pension/salary-exchange/simulations`
- `GET /v1/pension/salary-exchange-agreements?companyId=...&employmentId=...`
- `POST /v1/pension/salary-exchange-agreements`
- `GET /v1/pension/events?companyId=...&reportingPeriod=...&employmentId=...`
- `GET /v1/pension/events/:pensionEventId?companyId=...`
- `GET /v1/pension/reports?companyId=...&reportingPeriod=...&providerCode=...`
- `POST /v1/pension/reports`
- `GET /v1/pension/reconciliations?companyId=...&reportingPeriod=...&providerCode=...`
- `POST /v1/pension/reconciliations`
- `GET /v1/pension/audit-events?companyId=...&employmentId=...`
- `GET /v1/payroll/rule-packs?companyId=...&effectiveDate=...`
- `GET /v1/payroll/statutory-profiles?companyId=...`
- `POST /v1/payroll/statutory-profiles`
- `GET /v1/payroll/pay-items?companyId=...`
- `POST /v1/payroll/pay-items`
- `GET /v1/payroll/pay-items/:payItemId?companyId=...`
- `GET /v1/payroll/pay-calendars?companyId=...`
- `POST /v1/payroll/pay-calendars`
- `GET /v1/payroll/pay-calendars/:payCalendarId?companyId=...`
- `GET /v1/payroll/pay-runs?companyId=...`
- `POST /v1/payroll/pay-runs`
- `GET /v1/payroll/pay-runs/:payRunId?companyId=...`
- `POST /v1/payroll/pay-runs/:payRunId/approve`
- `GET /v1/payroll/pay-runs/:payRunId/payslips?companyId=...`
- `GET /v1/payroll/pay-runs/:payRunId/payslips/:employmentId?companyId=...`
- `POST /v1/payroll/pay-runs/:payRunId/payslips/:employmentId/regenerate`
- `GET /v1/payroll/agi-submissions?companyId=...`
- `POST /v1/payroll/agi-submissions`
- `GET /v1/payroll/agi-submissions/:agiSubmissionId?companyId=...`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/validate`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/ready-for-sign`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/submit`
- `POST /v1/payroll/agi-submissions/:agiSubmissionId/correction`
- `GET /v1/payroll/postings?companyId=...`
- `POST /v1/payroll/postings`
- `GET /v1/payroll/postings/:payrollPostingId?companyId=...`
- `GET /v1/payroll/payout-batches?companyId=...`
- `POST /v1/payroll/payout-batches`
- `GET /v1/payroll/payout-batches/:payrollPayoutBatchId?companyId=...`
- `POST /v1/payroll/payout-batches/:payrollPayoutBatchId/match-bank`
- `GET /v1/payroll/vacation-liability-snapshots?companyId=...`
- `POST /v1/payroll/vacation-liability-snapshots`

## Disable strategy

Set `PHASE1_AUTH_ONBOARDING_ENABLED=false` to return `503` for FAS 1 routes without touching the rest of the API process.

Set `PHASE2_DOCUMENT_ARCHIVE_ENABLED=false` to return `503` for FAS 2.1 document archive routes while keeping the rest of the API process alive.

Set `PHASE2_COMPANY_INBOX_ENABLED=false` to return `503` for FAS 2.2 company inbox routes while keeping the rest of the API process alive.

Set `PHASE2_OCR_REVIEW_ENABLED=false` to return `503` for FAS 2.3 OCR and review routes while keeping the rest of the API process alive.

Set `PHASE3_LEDGER_ENABLED=false` to return `503` for FAS 3.1, 3.2 and 3.3 ledger/reporting routes while keeping the rest of the API process alive.

Set `PHASE4_VAT_ENABLED=false` to return `503` for FAS 4.1, 4.2 and 4.3 VAT routes while keeping the rest of the API process alive.

Set `PHASE5_AR_ENABLED=false` to return `503` for FAS 5 AR routes while keeping the rest of the API process alive.

Set `PHASE6_AP_ENABLED=false` to return `503` for FAS 6.1, 6.2 and 6.3 AP and banking routes while keeping the rest of the API process alive.

Set `PHASE7_HR_ENABLED=false` to return `503` for FAS 7.1 HR masterdata routes while keeping the rest of the API process alive.

Set `PHASE7_TIME_ENABLED=false` to return `503` for FAS 7.2 time reporting routes while keeping the rest of the API process alive.

Set `PHASE7_ABSENCE_ENABLED=false` to return `503` for FAS 7.3 leave, approval and employee-portal routes while keeping the rest of the API process alive.

Set `PHASE8_PAYROLL_ENABLED=false` to return `503` for FAS 8 payroll routes while keeping the rest of the API process alive.

Set `PHASE9_BENEFITS_ENABLED=false` to return `503` for FAS 9.1 benefits routes while keeping the rest of the API process alive.
Set `PHASE9_TRAVEL_ENABLED=false` to return `503` for FAS 9.2 travel routes while keeping the rest of the API process alive.
Set `PHASE9_PENSION_ENABLED=false` to return `503` for FAS 9.3 pension routes while keeping the rest of the API process alive.

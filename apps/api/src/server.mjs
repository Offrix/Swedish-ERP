import crypto from "node:crypto";
import http from "node:http";
import { defaultApiPlatform } from "./platform.mjs";
import { tryHandlePhase13Route } from "./phase13-routes.mjs";
import { tryHandlePhase14Route } from "./phase14-routes.mjs";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createApiServer({ platform = defaultApiPlatform, flags = readFeatureFlags(process.env) } = {}) {
  return http.createServer((req, res) => {
    handleRequest({ req, res, platform, flags }).catch((error) => {
      writeError(res, error);
    });
  });
}

export async function startApiServer({
  port = Number(process.env.PORT || 3000),
  logger = console.log,
  platform = defaultApiPlatform,
  flags = readFeatureFlags(process.env)
} = {}) {
  const server = createApiServer({ platform, flags });
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`api listening on http://localhost:${port}`);
  return {
    port,
    server,
    stop: () => stopServer(server)
  };
}

async function handleRequest({ req, res, platform, flags }) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (path === "/" || path === "/healthz" || path === "/readyz") {
    writeJson(
      res,
      200,
      path === "/"
        ? {
            service: "api",
            status: "ok",
            registeredDomains:
              typeof platform.listRegisteredDomains === "function"
                ? platform.listRegisteredDomains().map(({ domainKey, label, dependsOn, capabilityCount }) => ({
                    domainKey,
                    label,
                    dependsOn,
                    capabilityCount
                  }))
                : [],
            platformContractVersions: platform.platformContractVersions || null,
            phase1AuthOnboardingEnabled: flags.phase1AuthOnboardingEnabled,
            phase2DocumentArchiveEnabled: flags.phase2DocumentArchiveEnabled,
            phase2CompanyInboxEnabled: flags.phase2CompanyInboxEnabled,
            phase2OcrReviewEnabled: flags.phase2OcrReviewEnabled,
            phase3LedgerEnabled: flags.phase3LedgerEnabled,
            phase4VatEnabled: flags.phase4VatEnabled,
            phase5ArEnabled: flags.phase5ArEnabled,
            phase6ApEnabled: flags.phase6ApEnabled,
            phase7HrEnabled: flags.phase7HrEnabled,
            phase7TimeEnabled: flags.phase7TimeEnabled,
            phase7AbsenceEnabled: flags.phase7AbsenceEnabled,
            phase8PayrollEnabled: flags.phase8PayrollEnabled,
            phase9BenefitsEnabled: flags.phase9BenefitsEnabled,
            phase9TravelEnabled: flags.phase9TravelEnabled,
            phase9PensionEnabled: flags.phase9PensionEnabled,
            phase10ProjectsEnabled: flags.phase10ProjectsEnabled,
            phase10FieldEnabled: flags.phase10FieldEnabled,
            phase10BuildEnabled: flags.phase10BuildEnabled,
            phase13PublicApiEnabled: flags.phase13PublicApiEnabled,
            phase13PartnerEnabled: flags.phase13PartnerEnabled,
            phase13AutomationEnabled: flags.phase13AutomationEnabled,
            phase14SecurityEnabled: flags.phase14SecurityEnabled,
            phase14ResilienceEnabled: flags.phase14ResilienceEnabled,
            phase14MigrationEnabled: flags.phase14MigrationEnabled,
            routes: [
              "/healthz",
              "/readyz",
              "/v1/auth/login",
              "/v1/auth/logout",
              "/v1/auth/mfa/totp/enroll",
              "/v1/auth/mfa/totp/verify",
              "/v1/auth/mfa/passkeys/register-options",
              "/v1/auth/mfa/passkeys/register-verify",
              "/v1/auth/mfa/passkeys/assert",
              "/v1/auth/bankid/start",
              "/v1/auth/bankid/collect",
              "/v1/auth/sessions/:sessionId/revoke",
              "/v1/authz/check",
              "/v1/org/companies/:companyId/users",
              "/v1/org/delegations",
              "/v1/org/object-grants",
              "/v1/org/attest-chains",
              "/v1/org/attest-chains/:approvalChainId",
              "/v1/org/tenant-setup/profile",
              "/v1/org/module-definitions",
              "/v1/org/module-activations",
              "/v1/org/module-activations/:moduleCode/suspend",
              "/v1/onboarding/runs",
              "/v1/onboarding/runs/:runId",
              "/v1/onboarding/runs/:runId/checklist",
              "/v1/documents",
              "/v1/documents/:documentId/versions",
              "/v1/documents/:documentId/links",
              "/v1/documents/:documentId/export",
              "/v1/inbox/channels",
              "/v1/inbox/messages",
              "/v1/inbox/messages/:emailIngestMessageId",
              "/v1/documents/:documentId/ocr/runs",
              "/v1/review-tasks/:reviewTaskId",
              "/v1/review-tasks/:reviewTaskId/claim",
              "/v1/review-tasks/:reviewTaskId/correct",
              "/v1/review-tasks/:reviewTaskId/approve",
              "/v1/ledger/chart/install",
              "/v1/ledger/accounts",
              "/v1/ledger/accounting-periods",
              "/v1/ledger/accounting-periods/:accountingPeriodId/lock",
              "/v1/ledger/accounting-periods/:accountingPeriodId/reopen",
              "/v1/accounting-method/eligibility-assessments",
              "/v1/accounting-method/profiles",
              "/v1/accounting-method/profiles/:methodProfileId",
              "/v1/accounting-method/profiles/:methodProfileId/activate",
              "/v1/accounting-method/active",
              "/v1/accounting-method/history",
              "/v1/accounting-method/change-requests",
              "/v1/accounting-method/change-requests/:methodChangeRequestId/approve",
              "/v1/accounting-method/change-requests/:methodChangeRequestId/reject",
              "/v1/accounting-method/year-end-catch-up-runs",
              "/v1/accounting-method/year-end-catch-up-runs/:yearEndCatchUpRunId",
              "/v1/fiscal-years/profiles",
              "/v1/fiscal-years/change-requests",
              "/v1/fiscal-years/change-requests/:changeRequestId/approve",
              "/v1/fiscal-years",
              "/v1/fiscal-years/:fiscalYearId",
              "/v1/fiscal-years/:fiscalYearId/activate",
              "/v1/fiscal-years/:fiscalYearId/generate-periods",
              "/v1/fiscal-years/active",
              "/v1/fiscal-years/periods/lookup",
              "/v1/fiscal-years/periods/:periodId/reopen",
              "/v1/fiscal-years/history",
              "/v1/tax-account/events",
              "/v1/tax-account/imports",
              "/v1/tax-account/reconciliations",
              "/v1/tax-account/offsets",
              "/v1/notifications",
              "/v1/notifications/:notificationId/read",
              "/v1/notifications/:notificationId/ack",
              "/v1/notifications/:notificationId/snooze",
              "/v1/activity",
              "/v1/review-center/queues",
              "/v1/review-center/items",
              "/v1/review-center/items/:reviewItemId",
              "/v1/review-center/items/:reviewItemId/claim",
              "/v1/review-center/items/:reviewItemId/decide",
              "/v1/documents/:documentId/classification-cases",
              "/v1/documents/:documentId/classification-cases/:classificationCaseId",
              "/v1/documents/:documentId/classification-cases/:classificationCaseId/decide",
              "/v1/documents/:documentId/classification-cases/:classificationCaseId/dispatch",
              "/v1/documents/:documentId/classification-cases/:classificationCaseId/correct",
              "/v1/import-cases",
              "/v1/import-cases/:importCaseId",
              "/v1/import-cases/:importCaseId/attach-document",
              "/v1/import-cases/:importCaseId/components",
              "/v1/import-cases/:importCaseId/recalculate",
              "/v1/import-cases/:importCaseId/approve",
              "/v1/payroll/migrations",
              "/v1/payroll/migrations/:payrollMigrationBatchId",
              "/v1/payroll/migrations/:payrollMigrationBatchId/employees",
              "/v1/payroll/migrations/:payrollMigrationBatchId/import-records",
              "/v1/payroll/migrations/:payrollMigrationBatchId/balance-baselines",
              "/v1/payroll/migrations/:payrollMigrationBatchId/validate",
              "/v1/payroll/migrations/:payrollMigrationBatchId/diffs",
              "/v1/payroll/migrations/:payrollMigrationBatchId/diffs/:payrollMigrationDiffId/decide",
              "/v1/payroll/migrations/:payrollMigrationBatchId/approve",
              "/v1/payroll/migrations/:payrollMigrationBatchId/finalize",
              "/v1/payroll/migrations/:payrollMigrationBatchId/rollback",
              "/v1/ledger/dimensions",
              "/v1/ledger/voucher-series",
              "/v1/ledger/journal-entries",
              "/v1/ledger/journal-entries/:journalEntryId",
              "/v1/ledger/journal-entries/:journalEntryId/validate",
              "/v1/ledger/journal-entries/:journalEntryId/post",
              "/v1/ledger/journal-entries/:journalEntryId/reverse",
              "/v1/ledger/journal-entries/:journalEntryId/correct",
              "/v1/reporting/report-definitions",
              "/v1/reporting/metric-definitions",
              "/v1/reporting/report-snapshots",
              "/v1/reporting/report-snapshots/:reportSnapshotId",
              "/v1/reporting/report-snapshots/:reportSnapshotId/drilldown",
              "/v1/reporting/export-jobs",
              "/v1/reporting/export-jobs/:reportExportJobId",
              "/v1/reporting/export-jobs/:reportExportJobId/retry",
              "/v1/reporting/journal-search",
              "/v1/reporting/reconciliations",
              "/v1/reporting/reconciliations/:reconciliationRunId",
              "/v1/reporting/reconciliations/:reconciliationRunId/signoff",
              "/v1/search/contracts",
              "/v1/search/reindex",
              "/v1/search/documents",
              "/v1/search/documents/:searchDocumentId",
              "/v1/saved-views",
              "/v1/saved-views/:savedViewId",
              "/v1/saved-views/:savedViewId/share",
              "/v1/saved-views/:savedViewId/archive",
              "/v1/saved-views/:savedViewId/repair",
              "/v1/dashboard/widgets",
              "/v1/bureau/portfolio",
              "/v1/bureau/portfolio/memberships",
              "/v1/bureau/client-requests",
              "/v1/bureau/client-requests/:requestId/send",
              "/v1/bureau/client-requests/:requestId/respond",
              "/v1/bureau/client-requests/:requestId/accept",
              "/v1/bureau/approval-packages",
              "/v1/bureau/approval-packages/:approvalPackageId/send",
              "/v1/bureau/approval-packages/:approvalPackageId/respond",
              "/v1/bureau/mass-actions",
              "/v1/bureau/work-items",
              "/v1/close/workbench",
              "/v1/close/workbench/:checklistId",
              "/v1/close/checklists",
              "/v1/close/checklists/:checklistId/steps/:stepCode/complete",
              "/v1/close/checklists/:checklistId/blockers",
              "/v1/close/blockers/:blockerId/resolve",
              "/v1/close/blockers/:blockerId/override",
              "/v1/close/checklists/:checklistId/signoff",
              "/v1/close/checklists/:checklistId/reopen",
              "/v1/legal-forms/profiles",
              "/v1/legal-forms/profiles/:legalFormProfileId",
              "/v1/legal-forms/profiles/:legalFormProfileId/activate",
              "/v1/legal-forms/active",
              "/v1/legal-forms/reporting-obligations",
              "/v1/legal-forms/reporting-obligations/:reportingObligationProfileId",
              "/v1/legal-forms/reporting-obligations/:reportingObligationProfileId/approve",
              "/v1/legal-forms/declaration-profile",
              "/v1/annual-reporting/packages",
              "/v1/annual-reporting/packages/:packageId",
              "/v1/annual-reporting/packages/:packageId/versions",
              "/v1/annual-reporting/packages/:packageId/versions/:versionId/diff",
              "/v1/annual-reporting/packages/:packageId/versions/:versionId/signatories",
              "/v1/annual-reporting/packages/:packageId/versions/:versionId/sign",
              "/v1/annual-reporting/packages/:packageId/corrections",
              "/v1/annual-reporting/packages/:packageId/evidence",
              "/v1/annual-reporting/packages/:packageId/evidence/:evidencePackId",
              "/v1/annual-reporting/packages/:packageId/authority-overview",
              "/v1/annual-reporting/packages/:packageId/tax-declarations",
              "/v1/annual-reporting/packages/:packageId/tax-declarations/:taxDeclarationPackageId",
              "/v1/submissions",
              "/v1/submissions/:submissionId",
              "/v1/submissions/:submissionId/sign",
              "/v1/submissions/:submissionId/submit",
              "/v1/submissions/:submissionId/receipts",
              "/v1/submissions/:submissionId/retry",
              "/v1/submissions/action-queue",
              "/v1/submissions/action-queue/:queueItemId/resolve",
              "/v1/collaboration/comments",
              "/v1/vat/codes",
              "/v1/vat/rule-packs",
              "/v1/vat/decisions",
              "/v1/vat/decisions/:vatDecisionId",
              "/v1/vat/review-queue",
              "/v1/vat/declaration-runs",
              "/v1/vat/declaration-runs/:vatDeclarationRunId",
              "/v1/vat/periodic-statements",
              "/v1/vat/periodic-statements/:vatPeriodicStatementRunId",
              "/v1/ar/customers",
              "/v1/ar/invoice-series",
              "/v1/ar/customers/:customerId",
              "/v1/ar/customers/:customerId/contacts",
              "/v1/ar/customers/imports",
              "/v1/ar/customers/imports/:customerImportBatchId",
              "/v1/ar/items",
              "/v1/ar/items/:itemId",
              "/v1/ar/price-lists",
              "/v1/ar/price-lists/:priceListId",
              "/v1/ar/quotes",
              "/v1/ar/quotes/:quoteId",
              "/v1/ar/quotes/:quoteId/status",
              "/v1/ar/quotes/:quoteId/revise",
              "/v1/ar/contracts",
              "/v1/ar/contracts/:contractId",
              "/v1/ar/contracts/:contractId/status",
              "/v1/ar/invoices",
              "/v1/ar/invoices/:customerInvoiceId",
              "/v1/ar/invoices/:customerInvoiceId/field-evaluation",
              "/v1/ar/invoices/:customerInvoiceId/issue",
              "/v1/ar/invoices/:customerInvoiceId/deliver",
              "/v1/ar/invoices/:customerInvoiceId/payment-links",
              "/v1/ar/open-items",
              "/v1/ar/open-items/:arOpenItemId",
              "/v1/ar/open-items/:arOpenItemId/collection-state",
              "/v1/ar/open-items/:arOpenItemId/allocations",
              "/v1/ar/open-items/:arOpenItemId/writeoffs",
              "/v1/ar/allocations/:arAllocationId/reverse",
              "/v1/ar/payment-matching-runs",
              "/v1/ar/payment-matching-runs/:arPaymentMatchingRunId",
              "/v1/ar/dunning-runs",
              "/v1/ar/dunning-runs/:arDunningRunId",
              "/v1/ar/aging-snapshots",
              "/v1/ap/suppliers",
              "/v1/ap/suppliers/:supplierId",
              "/v1/ap/suppliers/:supplierId/status",
              "/v1/ap/suppliers/imports",
              "/v1/ap/suppliers/imports/:supplierImportBatchId",
              "/v1/ap/purchase-orders",
              "/v1/ap/purchase-orders/:purchaseOrderId",
              "/v1/ap/purchase-orders/:purchaseOrderId/status",
              "/v1/ap/purchase-orders/imports",
              "/v1/ap/purchase-orders/imports/:purchaseOrderImportBatchId",
              "/v1/ap/receipts",
              "/v1/ap/receipts/:apReceiptId",
              "/v1/ap/invoices",
              "/v1/ap/invoices/ingest",
              "/v1/ap/invoices/:supplierInvoiceId",
              "/v1/ap/invoices/:supplierInvoiceId/approve",
              "/v1/ap/invoices/:supplierInvoiceId/match",
              "/v1/ap/invoices/:supplierInvoiceId/post",
              "/v1/ap/open-items",
              "/v1/ap/open-items/:apOpenItemId",
              "/v1/banking/accounts",
              "/v1/banking/accounts/:bankAccountId",
              "/v1/banking/statement-events",
              "/v1/banking/statement-events/import",
              "/v1/banking/statement-events/:bankStatementEventId",
              "/v1/banking/reconciliation-cases",
              "/v1/banking/reconciliation-cases/:reconciliationCaseId",
              "/v1/banking/reconciliation-cases/:reconciliationCaseId/resolve",
              "/v1/banking/payment-proposals",
              "/v1/banking/payment-proposals/:paymentProposalId",
              "/v1/banking/payment-proposals/:paymentProposalId/approve",
              "/v1/banking/payment-proposals/:paymentProposalId/export",
              "/v1/banking/payment-proposals/:paymentProposalId/submit",
              "/v1/banking/payment-proposals/:paymentProposalId/accept",
              "/v1/banking/payment-orders/:paymentOrderId/book",
              "/v1/banking/payment-orders/:paymentOrderId/reject",
              "/v1/banking/payment-orders/:paymentOrderId/return",
              "/v1/time/clock-events",
              "/v1/time/entries",
              "/v1/time/entries/:timeEntryId/submit",
              "/v1/time/entries/:timeEntryId/approve",
              "/v1/time/entries/:timeEntryId/reject",
              "/v1/time/employment-base",
              "/v1/time/schedule-templates",
              "/v1/time/schedule-assignments",
              "/v1/time/period-locks",
              "/v1/time/balances",
              "/v1/balances/types",
              "/v1/balances/accounts",
              "/v1/balances/accounts/:balanceAccountId",
              "/v1/balances/accounts/:balanceAccountId/transactions",
              "/v1/balances/accounts/:balanceAccountId/snapshot",
              "/v1/balances/carry-forwards",
              "/v1/balances/expiry-runs",
              "/v1/collective-agreements/families",
              "/v1/collective-agreements/versions",
              "/v1/collective-agreements/versions/:agreementVersionId",
              "/v1/collective-agreements/assignments",
              "/v1/collective-agreements/assignments/:agreementAssignmentId/overrides",
              "/v1/collective-agreements/active",
              "/v1/hr/leave-types",
              "/v1/hr/leave-entries",
              "/v1/hr/leave-entries/:leaveEntryId",
              "/v1/hr/leave-entries/:leaveEntryId/approve",
              "/v1/hr/leave-entries/:leaveEntryId/reject",
              "/v1/hr/leave-signals",
              "/v1/hr/leave-signal-locks",
              "/v1/hr/employee-portal/me",
              "/v1/hr/employee-portal/me/leave-entries",
              "/v1/hr/employee-portal/me/leave-entries/:leaveEntryId",
              "/v1/hr/employee-portal/me/leave-entries/:leaveEntryId/submit",
              "/v1/hr/employees",
              "/v1/hr/employees/:employeeId",
              "/v1/hr/employees/:employeeId/employments",
              "/v1/hr/employees/:employeeId/employments/:employmentId/snapshot",
              "/v1/hr/employees/:employeeId/contracts",
              "/v1/hr/employees/:employeeId/manager-assignments",
              "/v1/hr/employees/:employeeId/bank-accounts",
              "/v1/hr/employees/:employeeId/documents",
              "/v1/hr/employees/:employeeId/audit-events",
              "/v1/benefits/catalog",
              "/v1/benefits/events",
              "/v1/benefits/events/:benefitEventId",
              "/v1/benefits/audit-events",
              "/v1/travel/foreign-allowances",
              "/v1/travel/claims",
              "/v1/travel/claims/:travelClaimId",
              "/v1/travel/audit-events",
              "/v1/pension/plans",
              "/v1/pension/enrollments",
              "/v1/pension/salary-exchange/simulations",
              "/v1/pension/salary-exchange-agreements",
              "/v1/pension/events",
              "/v1/pension/events/:pensionEventId",
              "/v1/pension/reports",
              "/v1/pension/reconciliations",
              "/v1/pension/audit-events",
              "/v1/kalkyl/estimates",
              "/v1/kalkyl/estimates/:estimateVersionId",
              "/v1/kalkyl/estimates/:estimateVersionId/lines",
              "/v1/kalkyl/estimates/:estimateVersionId/assumptions",
              "/v1/kalkyl/estimates/:estimateVersionId/review",
              "/v1/kalkyl/estimates/:estimateVersionId/approve",
              "/v1/kalkyl/estimates/:estimateVersionId/convert-to-quote",
              "/v1/kalkyl/estimates/:estimateVersionId/convert-to-project-budget",
              "/v1/projects",
              "/v1/projects/:projectId",
              "/v1/projects/:projectId/workspace",
              "/v1/projects/:projectId/deviations",
              "/v1/projects/:projectId/deviations/:projectDeviationId/assign",
              "/v1/projects/:projectId/deviations/:projectDeviationId/status",
              "/v1/projects/:projectId/budgets",
              "/v1/projects/:projectId/resource-allocations",
              "/v1/projects/:projectId/payroll-cost-allocations",
              "/v1/projects/:projectId/cost-snapshots",
              "/v1/projects/:projectId/wip-snapshots",
              "/v1/projects/:projectId/forecast-snapshots",
              "/v1/projects/:projectId/change-orders",
              "/v1/projects/:projectId/change-orders/:projectChangeOrderId/status",
              "/v1/projects/:projectId/build-vat-decisions",
              "/v1/projects/:projectId/audit-events",
              "/v1/hus/cases",
              "/v1/hus/cases/:husCaseId",
              "/v1/hus/cases/:husCaseId/classify",
              "/v1/hus/cases/:husCaseId/invoice",
              "/v1/hus/cases/:husCaseId/readiness",
              "/v1/hus/cases/:husCaseId/payments",
              "/v1/hus/cases/:husCaseId/claims",
              "/v1/hus/cases/:husCaseId/recovery-candidates",
              "/v1/hus/claims/:husClaimId",
              "/v1/hus/claims/:husClaimId/submit",
              "/v1/hus/claims/:husClaimId/decisions",
              "/v1/hus/decision-differences",
              "/v1/hus/decision-differences/:husDecisionDifferenceId/resolve",
              "/v1/hus/claims/:husClaimId/payouts",
              "/v1/hus/cases/:husCaseId/credit-adjustments",
              "/v1/hus/cases/:husCaseId/recoveries",
              "/v1/hus/audit-events",
              "/v1/personalliggare/sites",
              "/v1/personalliggare/industry-packs",
              "/v1/personalliggare/sites/:constructionSiteId",
              "/v1/personalliggare/sites/:constructionSiteId/registrations",
              "/v1/personalliggare/sites/:constructionSiteId/attendance-events",
              "/v1/personalliggare/sites/:constructionSiteId/identity-snapshots",
              "/v1/personalliggare/sites/:constructionSiteId/contractor-snapshots",
              "/v1/personalliggare/attendance-events/:attendanceEventId/corrections",
              "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices",
              "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/trust",
              "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/revoke",
              "/v1/personalliggare/sites/:constructionSiteId/exports",
              "/v1/personalliggare/audit-events",
              "/v1/egenkontroll/templates",
              "/v1/egenkontroll/templates/:checklistTemplateId",
              "/v1/egenkontroll/templates/:checklistTemplateId/activate",
              "/v1/egenkontroll/instances",
              "/v1/egenkontroll/instances/:checklistInstanceId",
              "/v1/egenkontroll/instances/:checklistInstanceId/start",
              "/v1/egenkontroll/instances/:checklistInstanceId/outcomes",
              "/v1/egenkontroll/instances/:checklistInstanceId/deviations",
              "/v1/egenkontroll/deviations/:checklistDeviationId/acknowledge",
              "/v1/egenkontroll/deviations/:checklistDeviationId/resolve",
              "/v1/egenkontroll/instances/:checklistInstanceId/signoffs",
              "/v1/field/inventory/locations",
              "/v1/field/inventory/items",
              "/v1/field/inventory/balances",
              "/v1/field/work-orders",
              "/v1/field/work-orders/:workOrderId",
              "/v1/field/work-orders/:workOrderId/dispatches",
              "/v1/field/work-orders/:workOrderId/dispatches/:dispatchAssignmentId/en-route",
              "/v1/field/work-orders/:workOrderId/dispatches/:dispatchAssignmentId/on-site",
              "/v1/field/work-orders/:workOrderId/material-withdrawals",
              "/v1/field/work-orders/:workOrderId/customer-signatures",
              "/v1/field/work-orders/:workOrderId/complete",
              "/v1/field/work-orders/:workOrderId/invoice",
              "/v1/field/mobile/today",
              "/v1/field/sync/envelopes",
              "/v1/field/audit-events",
              "/v1/payroll/rule-packs",
              "/v1/payroll/statutory-profiles",
              "/v1/payroll/pay-items",
              "/v1/payroll/pay-items/:payItemId",
              "/v1/payroll/pay-calendars",
              "/v1/payroll/pay-calendars/:payCalendarId",
              "/v1/payroll/pay-runs",
              "/v1/payroll/pay-runs/:payRunId",
              "/v1/payroll/pay-runs/:payRunId/exceptions",
              "/v1/payroll/pay-runs/:payRunId/exceptions/:payrollExceptionId/resolve",
              "/v1/payroll/pay-runs/:payRunId/approve",
              "/v1/payroll/pay-runs/:payRunId/correction",
              "/v1/payroll/pay-runs/:payRunId/payslips",
              "/v1/payroll/pay-runs/:payRunId/payslips/:employmentId",
              "/v1/payroll/pay-runs/:payRunId/payslips/:employmentId/regenerate",
              "/v1/payroll/agi-submissions",
              "/v1/payroll/agi-submissions/:agiSubmissionId",
              "/v1/payroll/agi-submissions/:agiSubmissionId/validate",
              "/v1/payroll/agi-submissions/:agiSubmissionId/ready-for-sign",
              "/v1/payroll/agi-submissions/:agiSubmissionId/submit",
              "/v1/payroll/agi-submissions/:agiSubmissionId/correction",
              "/v1/payroll/postings",
              "/v1/payroll/postings/:payrollPostingId",
              "/v1/payroll/payout-batches",
              "/v1/payroll/payout-batches/:payrollPayoutBatchId",
              "/v1/payroll/payout-batches/:payrollPayoutBatchId/match-bank",
              "/v1/payroll/vacation-liability-snapshots",
              "/v1/public/spec",
              "/v1/public/oauth/token",
              "/v1/public/sandbox/catalog",
              "/v1/public/report-snapshots",
              "/v1/public/submissions",
              "/v1/public/legal-forms/declaration-profile",
              "/v1/public/annual-reporting/packages",
              "/v1/public/tax-account/summary",
              "/v1/public/tax-account/reconciliations",
              "/v1/public-api/clients",
              "/v1/public-api/tokens",
              "/v1/public-api/compatibility-baselines",
              "/v1/public-api/webhooks",
              "/v1/public-api/webhook-events",
              "/v1/public-api/webhook-deliveries",
              "/v1/partners/catalog",
              "/v1/partners/connections",
              "/v1/partners/connections/:connectionId/capabilities",
              "/v1/partners/connections/:connectionId/health",
              "/v1/partners/connections/:connectionId/contract-tests",
              "/v1/partners/contract-tests",
              "/v1/partners/operations",
              "/v1/jobs",
              "/v1/jobs/:jobId",
              "/v1/jobs/:jobId/claim",
              "/v1/jobs/:jobId/complete",
              "/v1/jobs/:jobId/fail",
              "/v1/jobs/:jobId/replay-plan",
              "/v1/jobs/:jobId/replay",
              "/v1/jobs/mass-retry",
              "/v1/automation/rule-packs",
              "/v1/automation/posting-suggestions",
              "/v1/automation/classifications",
              "/v1/automation/anomalies",
              "/v1/automation/decisions",
              "/v1/automation/decisions/:decisionId",
              "/v1/automation/decisions/:decisionId/override",
              "/v1/backoffice/support-cases",
              "/v1/backoffice/support-cases/:supportCaseId/approve-actions",
              "/v1/backoffice/support-cases/:supportCaseId/diagnostics",
              "/v1/backoffice/audit-events",
              "/v1/backoffice/impersonations",
              "/v1/backoffice/impersonations/:sessionId/approve",
              "/v1/backoffice/impersonations/:sessionId/end",
              "/v1/backoffice/access-reviews",
              "/v1/backoffice/access-reviews/:reviewBatchId/findings/:findingId",
              "/v1/backoffice/break-glass",
              "/v1/backoffice/break-glass/:breakGlassId/approve",
              "/v1/backoffice/break-glass/:breakGlassId/close",
              "/v1/ops/feature-flags",
              "/v1/ops/emergency-disables",
              "/v1/ops/emergency-disables/:emergencyDisableId/release",
              "/v1/ops/load-profiles",
              "/v1/ops/restore-drills",
              "/v1/ops/chaos-scenarios",
              "/v1/migration/mapping-sets",
              "/v1/migration/mapping-sets/:mappingSetId/approve",
              "/v1/migration/import-batches",
              "/v1/migration/import-batches/:importBatchId/run",
              "/v1/migration/import-batches/:importBatchId/corrections",
              "/v1/migration/diff-reports",
              "/v1/migration/diff-reports/:diffReportId/items/:itemId",
              "/v1/migration/cutover-plans",
              "/v1/migration/cutover-plans/:cutoverPlanId/start",
              "/v1/migration/cutover-plans/:cutoverPlanId/final-extract",
              "/v1/migration/cutover-plans/:cutoverPlanId/validate",
              "/v1/migration/cutover-plans/:cutoverPlanId/switch",
              "/v1/migration/cutover-plans/:cutoverPlanId/stabilize",
              "/v1/migration/cutover-plans/:cutoverPlanId/signoffs",
              "/v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode",
              "/v1/migration/cutover-plans/:cutoverPlanId/rollback",
              "/v1/migration/cutover-plans/:cutoverPlanId/rollback/complete",
              "/v1/migration/cockpit"
            ]
          }
        : { status: "ok" }
    );
    return;
  }

  if (!flags.phase1AuthOnboardingEnabled && isPhase1Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 1 auth and onboarding routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase2DocumentArchiveEnabled && isPhase2Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.1 document archive routes are disabled by configuration."
    });
    return;
  }

  if ((!flags.phase2DocumentArchiveEnabled || !flags.phase2CompanyInboxEnabled) && isPhase2InboxRoute(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.2 company inbox routes are disabled by configuration."
    });
    return;
  }

  if ((!flags.phase2DocumentArchiveEnabled || !flags.phase2OcrReviewEnabled) && isPhase23Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 2.3 OCR and review routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase3LedgerEnabled && isPhase3Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 3 ledger and reporting routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase4VatEnabled && isPhase4Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 4 VAT routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase5ArEnabled && isPhase5Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 5 AR routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase6ApEnabled && isPhase6Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 6 AP routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase7HrEnabled && isPhase7Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 7.1 HR masterdata routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase7TimeEnabled && isPhase72Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 7.2 time reporting routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase7AbsenceEnabled && isPhase73Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 7.3 leave and employee portal routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase8PayrollEnabled && isPhase8Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 8 payroll routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase9BenefitsEnabled && isPhase91Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 9.1 benefits routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase9TravelEnabled && isPhase92Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 9.2 travel routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase9PensionEnabled && isPhase93Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 9.3 pension routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase10ProjectsEnabled && isPhase101Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 10.1 project routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase10FieldEnabled && isPhase102Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 10.2 field routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase10BuildEnabled && isPhase103Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 10.3 build routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase13PublicApiEnabled && isPhase131Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 13.1 public API routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase13PartnerEnabled && isPhase132Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 13.2 partner integration routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase13AutomationEnabled && isPhase133Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 13.3 automation routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase14SecurityEnabled && isPhase141Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 14.1 security and backoffice routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase14ResilienceEnabled && isPhase142Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 14.2 resilience routes are disabled by configuration."
    });
    return;
  }

  if (!flags.phase14MigrationEnabled && isPhase143Route(path)) {
    writeJson(res, 503, {
      error: "feature_disabled",
      message: "FAS 14.3 migration routes are disabled by configuration."
    });
    return;
  }

  assertReadSurfaceRoleAccess({ platform, req, url, path });

  if (await tryHandlePhase13Route({ req, res, url, path, platform })) {
    return;
  }

  if (await tryHandlePhase14Route({ req, res, url, path, platform })) {
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/login") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startLogin(body));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/logout") {
    writeJson(res, 200, {
      session: platform.logout({ sessionToken: readSessionToken(req, await readJsonBody(req, true)) })
    });
    return;
  }

  const revokeMatch = matchPath(path, "/v1/auth/sessions/:sessionId/revoke");
  if (req.method === "POST" && revokeMatch) {
    writeJson(res, 200, {
      session: platform.revokeSession({
        sessionToken: readSessionToken(req, await readJsonBody(req, true)),
        targetSessionId: revokeMatch.sessionId
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/totp/enroll") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.beginTotpEnrollment({ sessionToken: readSessionToken(req, body), label: body.label }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/totp/verify") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.verifyTotp({
        sessionToken: readSessionToken(req, body),
        code: body.code,
        factorId: body.factorId || null
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/register-options") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.beginPasskeyRegistration({ sessionToken: readSessionToken(req, body), deviceName: body.deviceName }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/register-verify") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.finishPasskeyRegistration({
        sessionToken: readSessionToken(req, body),
        challengeId: body.challengeId,
        credentialId: body.credentialId,
        publicKey: body.publicKey,
        deviceName: body.deviceName
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/mfa/passkeys/assert") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.assertPasskey({
        sessionToken: readSessionToken(req, body),
        credentialId: body.credentialId,
        assertion: body.assertion
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/start") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.startBankIdAuthentication({ sessionToken: readSessionToken(req, body) }));
    return;
  }

  if (req.method === "POST" && path === "/v1/auth/bankid/collect") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.collectBankIdAuthentication({
        sessionToken: readSessionToken(req, body),
        orderRef: body.orderRef,
        completionToken: body.completionToken
      })
    );
    return;
  }

  const usersMatch = matchPath(path, "/v1/org/companies/:companyId/users");
  if (usersMatch && req.method === "GET") {
    writeJson(res, 200, {
      items: platform.listCompanyUsers({
        sessionToken: readSessionToken(req),
        companyId: usersMatch.companyId
      })
    });
    return;
  }

  if (usersMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createCompanyUser({
        sessionToken: readSessionToken(req, body),
        companyId: usersMatch.companyId,
        email: body.email,
        displayName: body.displayName,
        roleCode: body.roleCode,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        requiresMfa: body.requiresMfa
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/delegations") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createDelegation({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/object-grants") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createObjectGrant({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/attest-chains") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createApprovalChain({
        sessionToken: readSessionToken(req, body),
        ...body
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/org/tenant-setup/profile") {
    writeJson(
      res,
      200,
      platform.getTenantSetupProfile({
        sessionToken: readSessionToken(req),
        companyId: requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.")
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/module-definitions") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.registerModuleDefinition({
        sessionToken: readSessionToken(req, body),
        companyId: body.companyId,
        moduleCode: body.moduleCode,
        label: body.label,
        riskClass: body.riskClass,
        coreModule: body.coreModule,
        dependencyModuleCodes: body.dependencyModuleCodes,
        requiredPolicyCodes: body.requiredPolicyCodes,
        requiredRulepackCodes: body.requiredRulepackCodes,
        requiresCompletedTenantSetup: body.requiresCompletedTenantSetup,
        allowSuspend: body.allowSuspend
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/org/module-definitions") {
    writeJson(
      res,
      200,
      {
        items: platform.listModuleDefinitions({
          sessionToken: readSessionToken(req),
          companyId: requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.")
        })
      }
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/org/module-activations") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.activateModule({
        sessionToken: readSessionToken(req, body),
        companyId: body.companyId,
        moduleCode: body.moduleCode,
        effectiveFrom: body.effectiveFrom,
        activationReason: body.activationReason,
        approvalActorIds: body.approvalActorIds
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/org/module-activations") {
    writeJson(
      res,
      200,
      {
        items: platform.listModuleActivations({
          sessionToken: readSessionToken(req),
          companyId: requireText(url.searchParams.get("companyId"), "company_id_required", "companyId is required.")
        })
      }
    );
    return;
  }

  const moduleActivationSuspendMatch = matchPath(path, "/v1/org/module-activations/:moduleCode/suspend");
  if (moduleActivationSuspendMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.suspendModuleActivation({
        sessionToken: readSessionToken(req, body),
        companyId: body.companyId,
        moduleCode: moduleActivationSuspendMatch.moduleCode,
        reasonCode: body.reasonCode
      })
    );
    return;
  }

  const approvalChainMatch = matchPath(path, "/v1/org/attest-chains/:approvalChainId");
  if (approvalChainMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getApprovalChain({
        sessionToken: readSessionToken(req),
        approvalChainId: approvalChainMatch.approvalChainId
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/authz/check") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.checkAuthorization({
        sessionToken: readSessionToken(req, body),
        action: body.action,
        resource: body.resource
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/onboarding/runs") {
    const body = await readJsonBody(req);
    writeJson(res, 201, platform.createOnboardingRun(body));
    return;
  }

  const onboardingRunMatch = matchPath(path, "/v1/onboarding/runs/:runId");
  if (onboardingRunMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getOnboardingRun({
        runId: onboardingRunMatch.runId,
        resumeToken: url.searchParams.get("resumeToken") || req.headers["x-resume-token"]
      })
    );
    return;
  }

  const onboardingChecklistMatch = matchPath(path, "/v1/onboarding/runs/:runId/checklist");
  if (onboardingChecklistMatch && req.method === "GET") {
    writeJson(
      res,
      200,
      platform.getOnboardingChecklist({
        runId: onboardingChecklistMatch.runId,
        resumeToken: url.searchParams.get("resumeToken") || req.headers["x-resume-token"]
      })
    );
    return;
  }

  const stepMatchers = {
    company_profile: matchPath(path, "/v1/onboarding/runs/:runId/steps/company"),
    registrations: matchPath(path, "/v1/onboarding/runs/:runId/steps/registrations"),
    chart_template: matchPath(path, "/v1/onboarding/runs/:runId/steps/chart"),
    vat_setup: matchPath(path, "/v1/onboarding/runs/:runId/steps/vat"),
    fiscal_periods: matchPath(path, "/v1/onboarding/runs/:runId/steps/periods")
  };

  if (req.method === "POST") {
    for (const [stepCode, match] of Object.entries(stepMatchers)) {
      if (!match) {
        continue;
      }
      const body = await readJsonBody(req);
      writeJson(
        res,
        200,
        platform.updateOnboardingStep({
          runId: match.runId,
          resumeToken: body.resumeToken || req.headers["x-resume-token"],
          stepCode,
          payload: body
        })
      );
      return;
    }
  }

  if (req.method === "POST" && path === "/v1/documents") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.createDocumentRecord({
        companyId,
        documentType: body.documentType || null,
        sourceChannel: body.sourceChannel || "manual",
        sourceReference: body.sourceReference || null,
        retentionPolicyCode: body.retentionPolicyCode || null,
        metadataJson: body.metadataJson || {},
        receivedAt: body.receivedAt || new Date().toISOString(),
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentVersionsMatch = matchPath(path, "/v1/documents/:documentId/versions");
  if (documentVersionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.appendDocumentVersion({
        companyId,
        documentId: documentVersionsMatch.documentId,
        variantType: body.variantType,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        contentText: body.contentText || null,
        contentBase64: body.contentBase64 || null,
        fileHash: body.fileHash || null,
        fileSizeBytes: body.fileSizeBytes ?? null,
        sourceReference: body.sourceReference || null,
        derivesFromDocumentVersionId: body.derivesFromDocumentVersionId || null,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentLinksMatch = matchPath(path, "/v1/documents/:documentId/links");
  if (documentLinksMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.linkDocumentRecord({
        companyId,
        documentId: documentLinksMatch.documentId,
        targetType: body.targetType,
        targetId: body.targetId,
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const documentExportMatch = matchPath(path, "/v1/documents/:documentId/export");
  if (documentExportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.exportDocumentChain({
        companyId,
        documentId: documentExportMatch.documentId,
        actorId: principal.userId,
        correlationId: createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/inbox/channels") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.registerInboxChannel({
        companyId,
        channelCode: body.channelCode,
        inboundAddress: body.inboundAddress,
        useCase: body.useCase,
        allowedMimeTypes: body.allowedMimeTypes,
        maxAttachmentSizeBytes: body.maxAttachmentSizeBytes,
        defaultDocumentType: body.defaultDocumentType || null,
        classificationConfidenceThreshold: body.classificationConfidenceThreshold ?? null,
        fieldConfidenceThreshold: body.fieldConfidenceThreshold ?? null,
        defaultReviewQueueCode: body.defaultReviewQueueCode || "classification_low_confidence",
        metadataJson: body.metadataJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/inbox/messages") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    const result = platform.ingestEmailMessage({
      companyId,
      recipientAddress: body.recipientAddress,
      messageId: body.messageId,
      rawStorageKey: body.rawStorageKey,
      senderAddress: body.senderAddress || null,
      subject: body.subject || null,
      payloadJson: body.payloadJson || {},
      receivedAt: body.receivedAt || new Date().toISOString(),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    });
    writeJson(res, result.duplicateDetected ? 200 : 201, result);
    return;
  }

  const emailIngestMessageMatch = matchPath(path, "/v1/inbox/messages/:emailIngestMessageId");
  if (emailIngestMessageMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getEmailIngestMessage({
        companyId,
        emailIngestMessageId: emailIngestMessageMatch.emailIngestMessageId
      })
    );
    return;
  }

  const documentOcrRunsMatch = matchPath(path, "/v1/documents/:documentId/ocr/runs");
  if (documentOcrRunsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      201,
      platform.runDocumentOcr({
        companyId,
        documentId: documentOcrRunsMatch.documentId,
        reasonCode: body.reasonCode || "initial_ingest",
        modelVersion: body.modelVersion || "textract-stub-2026-03-21",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (documentOcrRunsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getDocumentOcrRuns({
        companyId,
        documentId: documentOcrRunsMatch.documentId
      })
    );
    return;
  }

  const reviewTaskMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId");
  if (reviewTaskMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read"
    });
    writeJson(
      res,
      200,
      platform.getReviewTask({
        companyId,
        reviewTaskId: reviewTaskMatch.reviewTaskId
      })
    );
    return;
  }

  const reviewTaskClaimMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId/claim");
  if (reviewTaskClaimMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      200,
      platform.claimReviewTask({
        companyId,
        reviewTaskId: reviewTaskClaimMatch.reviewTaskId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const reviewTaskCorrectMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId/correct");
  if (reviewTaskCorrectMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      200,
      platform.correctReviewTask({
        companyId,
        reviewTaskId: reviewTaskCorrectMatch.reviewTaskId,
        correctedDocumentType: body.correctedDocumentType,
        correctedFieldsJson: body.correctedFieldsJson || {},
        correctionComment: body.correctionComment || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const reviewTaskApproveMatch = matchPath(path, "/v1/review-tasks/:reviewTaskId/approve");
  if (reviewTaskApproveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeDocumentAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage"
    });
    writeJson(
      res,
      200,
      platform.approveReviewTask({
        companyId,
        reviewTaskId: reviewTaskApproveMatch.reviewTaskId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ledger/chart/install") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      201,
      platform.installLedgerCatalog({
        companyId,
        chartTemplateId: body.chartTemplateId || undefined,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/accounts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, {
      items: platform.listLedgerAccounts({ companyId })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/accounting-periods") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, {
      items: platform.listAccountingPeriods({ companyId })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/dimensions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, platform.listLedgerDimensions({ companyId }));
    return;
  }

  if (req.method === "GET" && path === "/v1/ledger/voucher-series") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(res, 200, {
      items: platform.listVoucherSeries({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ledger/voucher-series") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      201,
      platform.upsertVoucherSeries({
        companyId,
        seriesCode: body.seriesCode,
        description: body.description ?? null,
        nextNumber: body.nextNumber ?? null,
        status: body.status ?? null,
        purposeCodes: Array.isArray(body.purposeCodes) ? body.purposeCodes : null,
        importedSequencePreservationEnabled:
          body.importedSequencePreservationEnabled == null ? null : body.importedSequencePreservationEnabled === true,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ledger/journal-entries") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      201,
      platform.createJournalEntry({
        companyId,
        journalDate: body.journalDate,
        voucherSeriesCode: body.voucherSeriesCode,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        description: body.description || null,
        actorId: principal.userId,
        idempotencyKey: body.idempotencyKey,
        lines: body.lines,
        importedFlag: body.importedFlag === true,
        currencyCode: body.currencyCode || "SEK",
        metadataJson: body.metadataJson || {},
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const accountingPeriodLockMatch = matchPath(path, "/v1/ledger/accounting-periods/:accountingPeriodId/lock");
  if (accountingPeriodLockMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.lockAccountingPeriod({
        companyId,
        accountingPeriodId: accountingPeriodLockMatch.accountingPeriodId,
        status: body.status || "soft_locked",
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        approvedByActorId: body.approvedByActorId || null,
        approvedByRoleCode: body.approvedByRoleCode || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const accountingPeriodReopenMatch = matchPath(path, "/v1/ledger/accounting-periods/:accountingPeriodId/reopen");
  if (accountingPeriodReopenMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.reopenAccountingPeriod({
        companyId,
        accountingPeriodId: accountingPeriodReopenMatch.accountingPeriodId,
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        approvedByActorId: body.approvedByActorId,
        approvedByRoleCode: body.approvedByRoleCode || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId");
  if (journalEntryMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.getJournalEntry({
        companyId,
        journalEntryId: journalEntryMatch.journalEntryId
      })
    );
    return;
  }

  const journalEntryReverseMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/reverse");
  if (journalEntryReverseMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.reverseJournalEntry({
        companyId,
        journalEntryId: journalEntryReverseMatch.journalEntryId,
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        correctionKey: body.correctionKey,
        journalDate: body.journalDate || null,
        voucherSeriesCode: body.voucherSeriesCode || null,
        metadataJson: body.metadataJson || {},
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryCorrectMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/correct");
  if (journalEntryCorrectMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.correctJournalEntry({
        companyId,
        journalEntryId: journalEntryCorrectMatch.journalEntryId,
        actorId: principal.userId,
        reasonCode: body.reasonCode,
        correctionKey: body.correctionKey,
        lines: body.lines,
        journalDate: body.journalDate || null,
        voucherSeriesCode: body.voucherSeriesCode || null,
        reverseOriginal: body.reverseOriginal === true,
        metadataJson: body.metadataJson || {},
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryValidateMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/validate");
  if (journalEntryValidateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.validateJournalEntry({
        companyId,
        journalEntryId: journalEntryValidateMatch.journalEntryId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const journalEntryPostMatch = matchPath(path, "/v1/ledger/journal-entries/:journalEntryId/post");
  if (journalEntryPostMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ledger",
      scopeCode: "ledger"
    });
    writeJson(
      res,
      200,
      platform.postJournalEntry({
        companyId,
        journalEntryId: journalEntryPostMatch.journalEntryId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/report-definitions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(res, 200, {
      items: platform.listReportDefinitions({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/reporting/report-definitions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      201,
      platform.createReportDefinition({
        companyId,
        baseReportCode: body.baseReportCode,
        reportCode: body.reportCode || null,
        name: body.name,
        purpose: body.purpose || null,
        metricCodes: Array.isArray(body.metricCodes) ? body.metricCodes : [],
        defaultFilters: body.defaultFilters || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/metric-definitions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(res, 200, {
      items: platform.listMetricDefinitions({
        companyId,
        reportCode: url.searchParams.get("reportCode") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/reporting/report-snapshots") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      201,
      platform.runReportSnapshot({
        companyId,
        reportCode: body.reportCode,
        accountingPeriodId: body.accountingPeriodId || null,
        viewMode: body.viewMode || null,
        fromDate: body.fromDate || null,
        toDate: body.toDate || null,
        asOfDate: body.asOfDate || null,
        filters: body.filters || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const reportSnapshotMatch = matchPath(path, "/v1/reporting/report-snapshots/:reportSnapshotId");
  if (reportSnapshotMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReportSnapshot({
        companyId,
        reportSnapshotId: reportSnapshotMatch.reportSnapshotId
      })
    );
    return;
  }

  const reportDrilldownMatch = matchPath(path, "/v1/reporting/report-snapshots/:reportSnapshotId/drilldown");
  if (reportDrilldownMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReportLineDrilldown({
        companyId,
        reportSnapshotId: reportDrilldownMatch.reportSnapshotId,
        lineKey: requireText(url.searchParams.get("lineKey"), "line_key_required", "lineKey query parameter is required.")
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/reporting/export-jobs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      201,
      platform.requestReportExportJob({
        companyId,
        reportSnapshotId: body.reportSnapshotId,
        format: body.format,
        watermarkMode: body.watermarkMode || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/export-jobs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(res, 200, {
      items: platform.listReportExportJobs({
        companyId,
        reportSnapshotId: url.searchParams.get("reportSnapshotId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  const reportExportMatch = matchPath(path, "/v1/reporting/export-jobs/:reportExportJobId");
  if (reportExportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReportExportJob({
        companyId,
        reportExportJobId: reportExportMatch.reportExportJobId
      })
    );
    return;
  }

  const reportExportRetryMatch = matchPath(path, "/v1/reporting/export-jobs/:reportExportJobId/retry");
  if (reportExportRetryMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.retryReportExportJob({
        companyId,
        reportExportJobId: reportExportRetryMatch.reportExportJobId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/journal-search") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    const dimensionFilters = {};
    for (const key of ["projectId", "costCenterCode", "businessAreaCode"]) {
      const value = url.searchParams.get(key);
      if (value) {
        dimensionFilters[key] = value;
      }
    }
    writeJson(
      res,
      200,
      platform.searchJournalEntries({
        companyId,
        reportSnapshotId: url.searchParams.get("reportSnapshotId") || null,
        query: url.searchParams.get("query") || null,
        accountNumber: url.searchParams.get("accountNumber") || null,
        sourceType: url.searchParams.get("sourceType") || null,
        sourceId: url.searchParams.get("sourceId") || null,
        status: url.searchParams.get("status") || null,
        voucherSeriesCode: url.searchParams.get("voucherSeriesCode") || null,
        journalDateFrom: url.searchParams.get("journalDateFrom") || null,
        journalDateTo: url.searchParams.get("journalDateTo") || null,
        dimensionFilters
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/reporting/reconciliations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      201,
      platform.createReconciliationRun({
        companyId,
        accountingPeriodId: body.accountingPeriodId,
        areaCode: body.areaCode,
        cutoffDate: body.cutoffDate || null,
        ledgerAccountNumbers: Array.isArray(body.ledgerAccountNumbers) ? body.ledgerAccountNumbers : [],
        subledgerBalanceAmount: body.subledgerBalanceAmount ?? null,
        materialityThresholdAmount: body.materialityThresholdAmount ?? 0,
        differenceItems: Array.isArray(body.differenceItems) ? body.differenceItems : [],
        ownerUserId: body.ownerUserId || null,
        signoffRequired: body.signoffRequired !== false,
        checklistSnapshotRef: body.checklistSnapshotRef || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/reporting/reconciliations") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(res, 200, {
      items: platform.listReconciliationRuns({
        companyId,
        accountingPeriodId: url.searchParams.get("accountingPeriodId") || null,
        areaCode: url.searchParams.get("areaCode") || null
      })
    });
    return;
  }

  const reconciliationMatch = matchPath(path, "/v1/reporting/reconciliations/:reconciliationRunId");
  if (reconciliationMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.getReconciliationRun({
        companyId,
        reconciliationRunId: reconciliationMatch.reconciliationRunId
      })
    );
    return;
  }

  const reconciliationSignoffMatch = matchPath(path, "/v1/reporting/reconciliations/:reconciliationRunId/signoff");
  if (reconciliationSignoffMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "reporting",
      scopeCode: "reporting"
    });
    writeJson(
      res,
      200,
      platform.signOffReconciliationRun({
        companyId,
        reconciliationRunId: reconciliationSignoffMatch.reconciliationRunId,
        actorId: principal.userId,
        signatoryRole: body.signatoryRole || "close_signatory",
        comment: body.comment || null,
        evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs : [],
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/search/contracts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "search",
      scopeCode: "search"
    });
    writeJson(res, 200, {
      items: platform.listSearchProjectionContracts({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/search/reindex") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "search",
      scopeCode: "search"
    });
    writeJson(
      res,
      201,
      platform.requestSearchReindex({
        companyId,
        projectionCode: body.projectionCode || null,
        reasonCode: body.reasonCode || "manual_request",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/search/reindex") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "search",
      scopeCode: "search"
    });
    writeJson(res, 200, {
      items: platform.listSearchReindexRequests({
        companyId,
        projectionCode: url.searchParams.get("projectionCode") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/search/documents") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "search",
      scopeCode: "search"
    });
    writeJson(res, 200, {
      items: platform.listSearchDocuments({
        companyId,
        query: url.searchParams.get("query") || null,
        projectionCode: url.searchParams.get("projectionCode") || null,
        objectType: url.searchParams.get("objectType") || null,
        status: url.searchParams.get("status") || null,
        viewerUserId: principal.userId,
        viewerTeamIds: [],
        limit: url.searchParams.get("limit") || 50
      })
    });
    return;
  }

  const searchDocumentMatch = matchPath(path, "/v1/search/documents/:searchDocumentId");
  if (searchDocumentMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "search",
      scopeCode: "search"
    });
    writeJson(
      res,
      200,
      platform.getSearchDocument({
        companyId,
        searchDocumentId: searchDocumentMatch.searchDocumentId,
        viewerUserId: principal.userId,
        viewerTeamIds: []
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/saved-views") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(res, 200, {
      items: platform.listSavedViews({
        companyId,
        viewerUserId: principal.userId,
        viewerTeamIds: [],
        surfaceCode: url.searchParams.get("surfaceCode") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/saved-views") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(
      res,
      201,
      platform.createSavedView({
        companyId,
        ownerUserId: principal.userId,
        surfaceCode: body.surfaceCode,
        title: body.title,
        queryJson: body.queryJson || {},
        sortJson: body.sortJson || {},
        visibilityCode: body.visibilityCode || "private",
        sharedWithTeamId: body.sharedWithTeamId || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const savedViewMatch = matchPath(path, "/v1/saved-views/:savedViewId");
  if (savedViewMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(
      res,
      200,
      platform.getSavedView({
        companyId,
        savedViewId: savedViewMatch.savedViewId,
        viewerUserId: principal.userId,
        viewerTeamIds: []
      })
    );
    return;
  }

  if (savedViewMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(
      res,
      200,
      platform.updateSavedView({
        companyId,
        savedViewId: savedViewMatch.savedViewId,
        viewerUserId: principal.userId,
        title: body.title ?? null,
        queryJson: body.queryJson,
        sortJson: body.sortJson,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const savedViewShareMatch = matchPath(path, "/v1/saved-views/:savedViewId/share");
  if (savedViewShareMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(
      res,
      200,
      platform.shareSavedView({
        companyId,
        savedViewId: savedViewShareMatch.savedViewId,
        viewerUserId: principal.userId,
        visibilityCode: body.visibilityCode,
        sharedWithTeamId: body.sharedWithTeamId || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const savedViewArchiveMatch = matchPath(path, "/v1/saved-views/:savedViewId/archive");
  if (savedViewArchiveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(
      res,
      200,
      platform.archiveSavedView({
        companyId,
        savedViewId: savedViewArchiveMatch.savedViewId,
        viewerUserId: principal.userId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const savedViewRepairMatch = matchPath(path, "/v1/saved-views/:savedViewId/repair");
  if (savedViewRepairMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "saved_view",
      scopeCode: "search"
    });
    writeJson(
      res,
      200,
      platform.repairSavedView({
        companyId,
        savedViewId: savedViewRepairMatch.savedViewId,
        viewerUserId: principal.userId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/dashboard/widgets") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "dashboard_widget",
      scopeCode: "search"
    });
    writeJson(res, 200, {
      items: platform.listDashboardWidgets({
        companyId,
        ownerUserId: principal.userId,
        surfaceCode: url.searchParams.get("surfaceCode") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/dashboard/widgets") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "dashboard_widget",
      scopeCode: "search"
    });
    writeJson(
      res,
      201,
      platform.createDashboardWidget({
        companyId,
        ownerUserId: principal.userId,
        surfaceCode: body.surfaceCode,
        widgetTypeCode: body.widgetTypeCode,
        layoutSlot: body.layoutSlot,
        settingsJson: body.settingsJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/bureau/portfolio") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, {
      items: platform.listPortfolioMemberships({
        sessionToken: readSessionToken(req),
        bureauOrgId,
        search: url.searchParams.get("search")
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/bureau/portfolio/memberships") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createPortfolioMembership({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        clientCompanyId: body.clientCompanyId,
        responsibleConsultantId: body.responsibleConsultantId,
        backupConsultantId: body.backupConsultantId || null,
        statusProfile: body.statusProfile || "standard",
        criticality: body.criticality || "standard",
        activeFrom: body.activeFrom,
        activeTo: body.activeTo || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/bureau/client-requests") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, {
      items: platform.listClientRequests({
        sessionToken: readSessionToken(req),
        bureauOrgId,
        clientCompanyId: url.searchParams.get("clientCompanyId"),
        status: url.searchParams.get("status")
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/bureau/client-requests") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createClientRequest({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        clientCompanyId: body.clientCompanyId,
        periodId: body.periodId || null,
        sourceObjectType: body.sourceObjectType,
        sourceObjectId: body.sourceObjectId,
        requestType: body.requestType || "document_request",
        requestedFromContactId: body.requestedFromContactId,
        requestedFromContact: body.requestedFromContact || null,
        blockerScope: body.blockerScope || "none",
        targetDate: body.targetDate || null,
        deadlineAt: body.deadlineAt || null,
        requestedPayload: body.requestedPayload || {},
        reminderProfile: body.reminderProfile || null,
        ownerConsultantId: body.ownerConsultantId || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const bureauRequestSendMatch = matchPath(path, "/v1/bureau/client-requests/:requestId/send");
  if (bureauRequestSendMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.sendClientRequest({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        requestId: bureauRequestSendMatch.requestId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const bureauRequestRespondMatch = matchPath(path, "/v1/bureau/client-requests/:requestId/respond");
  if (bureauRequestRespondMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.submitClientResponse({
        requestId: bureauRequestRespondMatch.requestId,
        responseAccessCode: body.responseAccessCode,
        respondedByContactId: body.respondedByContactId,
        responseType: body.responseType || "documents_delivered",
        comment: body.comment || null,
        attachments: Array.isArray(body.attachments) ? body.attachments : []
      })
    );
    return;
  }

  const bureauRequestAcceptMatch = matchPath(path, "/v1/bureau/client-requests/:requestId/accept");
  if (bureauRequestAcceptMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.acceptClientRequest({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        requestId: bureauRequestAcceptMatch.requestId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/bureau/approval-packages") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, {
      items: platform.listApprovalPackages({
        sessionToken: readSessionToken(req),
        bureauOrgId,
        clientCompanyId: url.searchParams.get("clientCompanyId"),
        status: url.searchParams.get("status")
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/bureau/approval-packages") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createApprovalPackage({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        clientCompanyId: body.clientCompanyId,
        periodId: body.periodId || null,
        approvalType: body.approvalType || "period_close",
        snapshotRef: body.snapshotRef,
        targetDate: body.targetDate || null,
        approvalDeadlineAt: body.approvalDeadlineAt || null,
        namedApproverContactId: body.namedApproverContactId,
        namedApproverContact: body.namedApproverContact || null,
        requiresNamedApprover: body.requiresNamedApprover !== false,
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const bureauApprovalSendMatch = matchPath(path, "/v1/bureau/approval-packages/:approvalPackageId/send");
  if (bureauApprovalSendMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.sendApprovalPackage({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        approvalPackageId: bureauApprovalSendMatch.approvalPackageId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const bureauApprovalRespondMatch = matchPath(path, "/v1/bureau/approval-packages/:approvalPackageId/respond");
  if (bureauApprovalRespondMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.recordApprovalResponse({
        approvalPackageId: bureauApprovalRespondMatch.approvalPackageId,
        responseAccessCode: body.responseAccessCode,
        respondedByContactId: body.respondedByContactId,
        responseType: body.responseType,
        comment: body.comment || null,
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        delegatedFromContactId: body.delegatedFromContactId || null
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/bureau/mass-actions") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      200,
      platform.runPortfolioMassAction({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        actionType: body.actionType,
        clientCompanyIds: Array.isArray(body.clientCompanyIds) ? body.clientCompanyIds : [],
        newResponsibleConsultantId: body.newResponsibleConsultantId || null,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/bureau/work-items") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, {
      items: platform.listWorkItems({
        sessionToken: readSessionToken(req),
        bureauOrgId,
        clientCompanyId: url.searchParams.get("clientCompanyId"),
        ownerCompanyUserId: url.searchParams.get("ownerCompanyUserId"),
        status: url.searchParams.get("status")
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/close/workbench") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, {
      items: platform.listCloseWorkbenches({
        sessionToken: readSessionToken(req),
        bureauOrgId,
        clientCompanyId: url.searchParams.get("clientCompanyId"),
        accountingPeriodId: url.searchParams.get("accountingPeriodId"),
        status: url.searchParams.get("status")
      })
    });
    return;
  }

  const closeWorkbenchMatch = matchPath(path, "/v1/close/workbench/:checklistId");
  if (closeWorkbenchMatch && req.method === "GET") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, platform.getCloseWorkbench({
      sessionToken: readSessionToken(req),
      bureauOrgId,
      checklistId: closeWorkbenchMatch.checklistId
    }));
    return;
  }

  if (req.method === "POST" && path === "/v1/close/checklists") {
    const body = await readJsonBody(req);
    writeJson(res, 201, platform.instantiateCloseChecklist({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      clientCompanyId: body.clientCompanyId,
      accountingPeriodId: body.accountingPeriodId,
      targetCloseDate: body.targetCloseDate || null,
      ownerCompanyUserId: body.ownerCompanyUserId || null,
      signoffChain: Array.isArray(body.signoffChain) ? body.signoffChain : [],
      reportSnapshotId: body.reportSnapshotId || null,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const closeStepCompleteMatch = matchPath(path, "/v1/close/checklists/:checklistId/steps/:stepCode/complete");
  if (closeStepCompleteMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.completeCloseChecklistStep({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      checklistId: closeStepCompleteMatch.checklistId,
      stepCode: closeStepCompleteMatch.stepCode,
      reconciliationRunId: body.reconciliationRunId || null,
      evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs : [],
      comment: body.comment || null,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const closeBlockerCreateMatch = matchPath(path, "/v1/close/checklists/:checklistId/blockers");
  if (closeBlockerCreateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(res, 201, platform.openCloseBlocker({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      checklistId: closeBlockerCreateMatch.checklistId,
      stepCode: body.stepCode,
      severity: body.severity,
      reasonCode: body.reasonCode,
      ownerCompanyUserId: body.ownerCompanyUserId || null,
      comment: body.comment || null,
      waiverUntil: body.waiverUntil || null,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const closeBlockerResolveMatch = matchPath(path, "/v1/close/blockers/:blockerId/resolve");
  if (closeBlockerResolveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.resolveCloseBlocker({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      blockerId: closeBlockerResolveMatch.blockerId,
      resolutionType: body.resolutionType || "resolved",
      comment: body.comment || null,
      waiverUntil: body.waiverUntil || null,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const closeBlockerOverrideMatch = matchPath(path, "/v1/close/blockers/:blockerId/override");
  if (closeBlockerOverrideMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.approveCloseOverride({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      blockerId: closeBlockerOverrideMatch.blockerId,
      waiverUntil: body.waiverUntil,
      comment: body.comment || null,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const closeSignoffMatch = matchPath(path, "/v1/close/checklists/:checklistId/signoff");
  if (closeSignoffMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.signOffCloseChecklist({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      checklistId: closeSignoffMatch.checklistId,
      comment: body.comment || null,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const closeReopenMatch = matchPath(path, "/v1/close/checklists/:checklistId/reopen");
  if (closeReopenMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    writeJson(res, 200, platform.requestCloseReopen({
      sessionToken: readSessionToken(req, body),
      bureauOrgId: body.bureauOrgId,
      checklistId: closeReopenMatch.checklistId,
      reasonCode: body.reasonCode,
      impactSummary: body.impactSummary,
      approvedByCompanyUserId: body.approvedByCompanyUserId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/annual-reporting/packages") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAnnualReportPackages({
        companyId
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/annual-reporting/packages") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    const result = platform.createAnnualReportPackage({
      companyId,
      accountingPeriodId: body.accountingPeriodId,
      profileCode: body.profileCode,
      legalFormProfileId: body.legalFormProfileId ?? null,
      reportingObligationProfileId: body.reportingObligationProfileId ?? null,
      actorId: principal.userId,
      textSections: body.textSections || {},
      noteSections: body.noteSections || {},
      includeEstablishmentCertificate: body.includeEstablishmentCertificate !== false
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "annual_reporting.package.updated",
      resourceType: "annual_report_package",
      resourceId: result.packageId,
      payload: {
        packageId: result.packageId,
        status: result.status,
        profileCode: result.profileCode,
        legalFormCode: result.legalFormCode,
        declarationProfileCode: result.declarationProfileCode,
        versionCount: Array.isArray(result.versions) ? result.versions.length : 0
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return;
  }

  const annualPackageMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId");
  if (annualPackageMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, platform.getAnnualReportPackage({
      companyId,
      packageId: annualPackageMatch.packageId
    }));
    return;
  }

  const annualVersionCreateMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/versions");
  if (annualVersionCreateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    const result = platform.createAnnualReportVersion({
      companyId,
      packageId: annualVersionCreateMatch.packageId,
      actorId: principal.userId,
      textSections: body.textSections || {},
      noteSections: body.noteSections || {},
      includeEstablishmentCertificate: body.includeEstablishmentCertificate !== false
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "annual_reporting.package.updated",
      resourceType: "annual_report_package",
      resourceId: result.packageId,
      payload: {
        packageId: result.packageId,
        status: result.status,
        currentVersionId: result.currentVersionId,
        versionCount: Array.isArray(result.versions) ? result.versions.length : 0
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return;
  }

  const annualVersionDiffMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/versions/:versionId/diff");
  if (annualVersionDiffMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, platform.diffAnnualReportVersions({
      companyId,
      packageId: annualVersionDiffMatch.packageId,
      leftVersionId: requireText(url.searchParams.get("leftVersionId"), "left_version_id_required", "leftVersionId query parameter is required."),
      rightVersionId: annualVersionDiffMatch.versionId
    }));
    return;
  }

  const annualVersionSignatoryMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/versions/:versionId/signatories");
  if (annualVersionSignatoryMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 201, platform.inviteAnnualReportSignatory({
      companyId,
      packageId: annualVersionSignatoryMatch.packageId,
      versionId: annualVersionSignatoryMatch.versionId,
      companyUserId: body.companyUserId,
      signatoryRole: body.signatoryRole
    }));
    return;
  }

  const annualVersionSignMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/versions/:versionId/sign");
  if (annualVersionSignMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    writeJson(res, 200, platform.signAnnualReportVersion({
      companyId,
      packageId: annualVersionSignMatch.packageId,
      versionId: annualVersionSignMatch.versionId,
      actorId: principal.userId,
      comment: body.comment || null
    }));
    return;
  }

  const annualAuthorityOverviewMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/authority-overview");
  if (annualAuthorityOverviewMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getAnnualAuthorityOverview({
        companyId,
        packageId: annualAuthorityOverviewMatch.packageId,
        versionId: url.searchParams.get("versionId") || null
      })
    );
    return;
  }

  const annualTaxPackageMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/tax-declarations");
  if (annualTaxPackageMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listTaxDeclarationPackages({
        companyId,
        packageId: annualTaxPackageMatch.packageId
      })
    });
    return;
  }

  if (annualTaxPackageMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      201,
      platform.createTaxDeclarationPackage({
        companyId,
        packageId: annualTaxPackageMatch.packageId,
        versionId: body.versionId ?? null,
        actorId: principal.userId
      })
    );
    return;
  }

  const annualTaxPackageRecordMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/tax-declarations/:taxDeclarationPackageId");
  if (annualTaxPackageRecordMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getTaxDeclarationPackage({
        companyId,
        taxDeclarationPackageId: annualTaxPackageRecordMatch.taxDeclarationPackageId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/submissions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAuthoritySubmissions({
        companyId,
        submissionType: url.searchParams.get("submissionType") || null,
        sourceObjectType: url.searchParams.get("sourceObjectType") || null,
        sourceObjectId: url.searchParams.get("sourceObjectId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/submissions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    const payload = body.payload ?? buildSubmissionPayloadFromSource({
      platform,
      companyId,
      sourceObjectType: body.sourceObjectType,
      sourceObjectId: body.sourceObjectId
    });
    writeJson(
      res,
      201,
      platform.prepareAuthoritySubmission({
        companyId,
        submissionType: body.submissionType,
        periodId: body.periodId ?? null,
        sourceObjectType: body.sourceObjectType,
        sourceObjectId: body.sourceObjectId,
        payloadVersion: body.payloadVersion || "phase12.2",
        providerKey: body.providerKey,
        recipientId: body.recipientId,
        payload,
        signedState: body.signedState || "pending",
        signatoryRoleRequired: body.signatoryRoleRequired ?? null,
        submissionFamilyCode: body.submissionFamilyCode ?? payload.packageFamilyCode ?? null,
        evidencePackId: body.evidencePackId ?? payload.evidencePackId ?? null,
        correctionOfSubmissionId: body.correctionOfSubmissionId ?? null,
        correctionChainId: body.correctionChainId ?? null,
        priority: body.priority || "normal",
        retryClass: body.retryClass || "manual_only",
        actorId: principal.userId,
        idempotencyKey: body.idempotencyKey ?? null,
        correlationId: body.correlationId ?? null
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/submissions/action-queue") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listSubmissionActionQueue({
        companyId,
        status: url.searchParams.get("status") || null,
        ownerQueue: url.searchParams.get("ownerQueue") || null
      })
    });
    return;
  }

  const submissionMatch = matchPath(path, "/v1/submissions/:submissionId");
  if (submissionMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getAuthoritySubmission({
        companyId,
        submissionId: submissionMatch.submissionId
      })
    );
    return;
  }

  const submissionSignMatch = matchPath(path, "/v1/submissions/:submissionId/sign");
  if (submissionSignMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.signAuthoritySubmission({
        companyId,
        submissionId: submissionSignMatch.submissionId,
        actorId: principal.userId,
        signatureReference: body.signatureReference ?? null
      })
    );
    return;
  }

  const submissionSubmitMatch = matchPath(path, "/v1/submissions/:submissionId/submit");
  if (submissionSubmitMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.submitAuthoritySubmission({
        companyId,
        submissionId: submissionSubmitMatch.submissionId,
        actorId: principal.userId,
        mode: body.mode || "test",
        simulatedTransportOutcome: body.simulatedTransportOutcome || "technical_ack",
        providerReference: body.providerReference ?? null,
        message: body.message ?? null
      })
    );
    return;
  }

  const submissionReceiptMatch = matchPath(path, "/v1/submissions/:submissionId/receipts");
  if (submissionReceiptMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      201,
      platform.registerSubmissionReceipt({
        companyId,
        submissionId: submissionReceiptMatch.submissionId,
        receiptType: body.receiptType,
        providerStatus: body.providerStatus ?? null,
        rawReference: body.rawReference ?? null,
        message: body.message ?? null,
        isFinal: body.isFinal ?? null,
        requiredInput: Array.isArray(body.requiredInput) ? body.requiredInput : [],
        actorId: principal.userId
      })
    );
    return;
  }

  const submissionRetryMatch = matchPath(path, "/v1/submissions/:submissionId/retry");
  if (submissionRetryMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.retryAuthoritySubmission({
        companyId,
        submissionId: submissionRetryMatch.submissionId,
        actorId: principal.userId
      })
    );
    return;
  }

  const submissionQueueResolveMatch = matchPath(path, "/v1/submissions/action-queue/:queueItemId/resolve");
  if (submissionQueueResolveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "submission",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.resolveSubmissionQueueItem({
        companyId,
        queueItemId: submissionQueueResolveMatch.queueItemId,
        resolutionCode: body.resolutionCode,
        actorId: principal.userId,
        ownerUserId: body.ownerUserId ?? null
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/collaboration/comments") {
    const bureauOrgId = requireText(
      url.searchParams.get("bureauOrgId"),
      "bureau_org_id_required",
      "bureauOrgId query parameter is required."
    );
    writeJson(res, 200, {
      items: platform.listComments({
        sessionToken: readSessionToken(req),
        bureauOrgId,
        objectType: requireText(url.searchParams.get("objectType"), "comment_object_type_required", "objectType query parameter is required."),
        objectId: requireText(url.searchParams.get("objectId"), "comment_object_id_required", "objectId query parameter is required.")
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/collaboration/comments") {
    const body = await readJsonBody(req);
    writeJson(
      res,
      201,
      platform.createComment({
        sessionToken: readSessionToken(req, body),
        bureauOrgId: body.bureauOrgId,
        objectType: body.objectType,
        objectId: body.objectId,
        visibility: body.visibility || "internal",
        body: body.body,
        mentionCompanyUserIds: Array.isArray(body.mentionCompanyUserIds) ? body.mentionCompanyUserIds : [],
        createAssignment: body.createAssignment === true,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/vat/codes") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(res, 200, {
      items: platform.listVatCodes({
        companyId
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/vat/rule-packs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(res, 200, {
      items: platform.listVatRulePacks({
        effectiveDate: url.searchParams.get("effectiveDate") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/vat/decisions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      201,
      platform.evaluateVatDecision({
        companyId,
        transactionLine: body.transactionLine || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const vatDecisionMatch = matchPath(path, "/v1/vat/decisions/:vatDecisionId");
  if (vatDecisionMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      200,
      platform.getVatDecision({
        companyId,
        vatDecisionId: vatDecisionMatch.vatDecisionId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/vat/review-queue") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(res, 200, {
      items: platform.listVatReviewQueue({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/vat/declaration-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      201,
      platform.createVatDeclarationRun({
        companyId,
        fromDate: body.fromDate,
        toDate: body.toDate,
        previousSubmissionId: body.previousSubmissionId || null,
        correctionReason: body.correctionReason || null,
        signer: body.signer || principal.userId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const vatDeclarationRunMatch = matchPath(path, "/v1/vat/declaration-runs/:vatDeclarationRunId");
  if (vatDeclarationRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      200,
      platform.getVatDeclarationRun({
        companyId,
        vatDeclarationRunId: vatDeclarationRunMatch.vatDeclarationRunId
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/vat/periodic-statements") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      201,
      platform.createVatPeriodicStatementRun({
        companyId,
        fromDate: body.fromDate,
        toDate: body.toDate,
        previousSubmissionId: body.previousSubmissionId || null,
        correctionReason: body.correctionReason || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const vatPeriodicStatementRunMatch = matchPath(path, "/v1/vat/periodic-statements/:vatPeriodicStatementRunId");
  if (vatPeriodicStatementRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "vat_decision",
      scopeCode: "vat"
    });
    writeJson(
      res,
      200,
      platform.getVatPeriodicStatementRun({
        companyId,
        vatPeriodicStatementRunId: vatPeriodicStatementRunMatch.vatPeriodicStatementRunId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/customers") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listCustomers({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/customers") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createCustomer({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arCustomerMatch = matchPath(path, "/v1/ar/customers/:customerId");
  if (arCustomerMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getCustomer({
        companyId,
        customerId: arCustomerMatch.customerId
      })
    );
    return;
  }

  const arCustomerContactsMatch = matchPath(path, "/v1/ar/customers/:customerId/contacts");
  if (arCustomerContactsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listCustomerContacts({
        companyId,
        customerId: arCustomerContactsMatch.customerId
      })
    });
    return;
  }

  if (arCustomerContactsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_customer",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createCustomerContact({
        ...body,
        companyId,
        customerId: arCustomerContactsMatch.customerId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/customers/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_customer_import",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.importCustomers({
        companyId,
        batchKey: body.batchKey,
        rows: Array.isArray(body.rows) ? body.rows : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arCustomerImportBatchMatch = matchPath(path, "/v1/ar/customers/imports/:customerImportBatchId");
  if (arCustomerImportBatchMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_customer_import",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getCustomerImportBatch({
        companyId,
        customerImportBatchId: arCustomerImportBatchMatch.customerImportBatchId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_item",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listItems({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/items") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createItem({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arItemMatch = matchPath(path, "/v1/ar/items/:itemId");
  if (arItemMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getItem({
        companyId,
        itemId: arItemMatch.itemId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/price-lists") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_price_list",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listPriceLists({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/price-lists") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_price_list",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createPriceList({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arPriceListMatch = matchPath(path, "/v1/ar/price-lists/:priceListId");
  if (arPriceListMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_price_list",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getPriceList({
        companyId,
        priceListId: arPriceListMatch.priceListId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/quotes") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listQuotes({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/quotes") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createQuote({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arQuoteMatch = matchPath(path, "/v1/ar/quotes/:quoteId");
  if (arQuoteMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getQuote({
        companyId,
        quoteId: arQuoteMatch.quoteId
      })
    );
    return;
  }

  const arQuoteStatusMatch = matchPath(path, "/v1/ar/quotes/:quoteId/status");
  if (arQuoteStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.transitionQuote({
        companyId,
        quoteId: arQuoteStatusMatch.quoteId,
        targetStatus: body.targetStatus,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arQuoteReviseMatch = matchPath(path, "/v1/ar/quotes/:quoteId/revise");
  if (arQuoteReviseMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_quote",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.reviseQuote({
        ...body,
        companyId,
        quoteId: arQuoteReviseMatch.quoteId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/contracts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listContracts({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/contracts") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createContract({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arContractMatch = matchPath(path, "/v1/ar/contracts/:contractId");
  if (arContractMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getContract({
        companyId,
        contractId: arContractMatch.contractId
      })
    );
    return;
  }

  const arContractStatusMatch = matchPath(path, "/v1/ar/contracts/:contractId/status");
  if (arContractStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_contract",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.transitionContractStatus({
        companyId,
        contractId: arContractStatusMatch.contractId,
        targetStatus: body.targetStatus,
        resolvedEndDate: body.resolvedEndDate || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/invoices") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listInvoices({
        companyId,
        customerId: url.searchParams.get("customerId") || null,
        status: url.searchParams.get("status") || null,
        projectId: url.searchParams.get("projectId") || null
      })
    });
    return;
  }

  const annualCorrectionMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/corrections");
  if (annualCorrectionMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    const result = platform.openAnnualCorrectionPackage({
      companyId,
      packageId: annualCorrectionMatch.packageId,
      profileCode: body.profileCode ?? null,
      actorId: principal.userId,
      textSections: body.textSections || {},
      noteSections: body.noteSections || {},
      includeEstablishmentCertificate: body.includeEstablishmentCertificate !== false
    });
    platform.emitWebhookEvent({
      companyId,
      eventType: "annual_reporting.package.updated",
      resourceType: "annual_report_package",
      resourceId: result.packageId,
      payload: {
        packageId: result.packageId,
        correctionOfPackageId: result.correctionOfPackageId || null,
        status: result.status,
        currentVersionId: result.currentVersionId,
        versionCount: Array.isArray(result.versions) ? result.versions.length : 0
      },
      mode: "production"
    });
    writeJson(res, 201, result);
    return;
  }

  const annualEvidenceListMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/evidence");
  if (annualEvidenceListMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAnnualEvidencePacks({
        companyId,
        packageId: annualEvidenceListMatch.packageId
      })
    });
    return;
  }

  const annualEvidenceMatch = matchPath(path, "/v1/annual-reporting/packages/:packageId/evidence/:evidencePackId");
  if (annualEvidenceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "annual_report_package",
      scopeCode: "annual_reporting"
    });
    assertAnnualOperationsAccess({ principal });
    writeJson(res, 200, platform.getAnnualEvidencePack({
      companyId,
      evidencePackId: annualEvidenceMatch.evidencePackId
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/invoice-series") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listInvoiceSeries({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/invoice-series") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.upsertInvoiceSeries({
        companyId,
        seriesCode: body.seriesCode,
        prefix: body.prefix ?? null,
        description: body.description ?? null,
        nextNumber: body.nextNumber ?? null,
        status: body.status ?? null,
        invoiceTypeCodes: Array.isArray(body.invoiceTypeCodes) ? body.invoiceTypeCodes : null,
        voucherSeriesPurposeCode: body.voucherSeriesPurposeCode ?? null,
        importedSequencePreservationEnabled:
          body.importedSequencePreservationEnabled == null ? null : body.importedSequencePreservationEnabled === true,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/invoices") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createInvoice({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arInvoiceMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId");
  if (arInvoiceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getInvoice({
        companyId,
        customerInvoiceId: arInvoiceMatch.customerInvoiceId
      })
    );
    return;
  }

  const arInvoiceFieldEvaluationMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/field-evaluation");
  if (arInvoiceFieldEvaluationMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_invoice_field_evaluation",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getInvoiceFieldEvaluation({
        companyId,
        customerInvoiceId: arInvoiceFieldEvaluationMatch.customerInvoiceId
      })
    );
    return;
  }

  const arInvoiceIssueMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/issue");
  if (arInvoiceIssueMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.issueInvoice({
        companyId,
        customerInvoiceId: arInvoiceIssueMatch.customerInvoiceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arInvoiceDeliverMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/deliver");
  if (arInvoiceDeliverMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.deliverInvoice({
        companyId,
        customerInvoiceId: arInvoiceDeliverMatch.customerInvoiceId,
        deliveryChannel: body.deliveryChannel || null,
        recipientEmails: Array.isArray(body.recipientEmails) ? body.recipientEmails : null,
        buyerReference: body.buyerReference || null,
        purchaseOrderReference: body.purchaseOrderReference || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arInvoicePaymentLinksMatch = matchPath(path, "/v1/ar/invoices/:customerInvoiceId/payment-links");
  if (arInvoicePaymentLinksMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_invoice",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createInvoicePaymentLink({
        companyId,
        customerInvoiceId: arInvoicePaymentLinksMatch.customerInvoiceId,
        amount: body.amount ?? null,
        expiresAt: body.expiresAt || null,
        providerCode: body.providerCode || "internal_mock",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/open-items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listOpenItems({
        companyId,
        customerId: url.searchParams.get("customerId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  const arOpenItemMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId");
  if (arOpenItemMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getOpenItem({
        companyId,
        arOpenItemId: arOpenItemMatch.arOpenItemId
      })
    );
    return;
  }

  const arOpenItemCollectionMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId/collection-state");
  if (arOpenItemCollectionMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.updateOpenItemCollectionState({
        companyId,
        arOpenItemId: arOpenItemCollectionMatch.arOpenItemId,
        collectionStageCode: body.collectionStageCode || null,
        disputeFlag: body.disputeFlag,
        dunningHoldFlag: body.dunningHoldFlag,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arOpenItemAllocationMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId/allocations");
  if (arOpenItemAllocationMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createOpenItemAllocation({
        companyId,
        arOpenItemId: arOpenItemAllocationMatch.arOpenItemId,
        allocationAmount: body.allocationAmount,
        allocatedOn: body.allocatedOn || null,
        allocationType: body.allocationType || "payment",
        sourceChannel: body.sourceChannel || "manual",
        bankTransactionUid: body.bankTransactionUid || null,
        statementLineHash: body.statementLineHash || null,
        externalEventRef: body.externalEventRef || null,
        arPaymentMatchingRunId: body.arPaymentMatchingRunId || null,
        unmatchedBankReceiptId: body.unmatchedBankReceiptId || null,
        receiptAmount: body.receiptAmount ?? null,
        currencyCode: body.currencyCode || null,
        reasonCode: body.reasonCode || "manual_allocation",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arOpenItemWriteoffMatch = matchPath(path, "/v1/ar/open-items/:arOpenItemId/writeoffs");
  if (arOpenItemWriteoffMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_open_item",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createWriteoff({
        companyId,
        arOpenItemId: arOpenItemWriteoffMatch.arOpenItemId,
        writeoffAmount: body.writeoffAmount,
        writeoffDate: body.writeoffDate,
        reasonCode: body.reasonCode,
        policyLimitAmount: body.policyLimitAmount ?? undefined,
        approvedByActorId: body.approvedByActorId || null,
        ledgerAccountNumber: body.ledgerAccountNumber ?? undefined,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arAllocationReverseMatch = matchPath(path, "/v1/ar/allocations/:arAllocationId/reverse");
  if (arAllocationReverseMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_allocation",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.reverseOpenItemAllocation({
        companyId,
        arAllocationId: arAllocationReverseMatch.arAllocationId,
        reversedOn: body.reversedOn || null,
        reasonCode: body.reasonCode,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/payment-matching-runs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_payment_matching_run",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listPaymentMatchingRuns({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/payment-matching-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_payment_matching_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createPaymentMatchingRun({
        companyId,
        sourceChannel: body.sourceChannel,
        externalBatchRef: body.externalBatchRef || null,
        idempotencyKey: body.idempotencyKey || null,
        transactions: Array.isArray(body.transactions) ? body.transactions : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arPaymentMatchingRunMatch = matchPath(path, "/v1/ar/payment-matching-runs/:arPaymentMatchingRunId");
  if (arPaymentMatchingRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_payment_matching_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getPaymentMatchingRun({
        companyId,
        arPaymentMatchingRunId: arPaymentMatchingRunMatch.arPaymentMatchingRunId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/dunning-runs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_dunning_run",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listDunningRuns({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/dunning-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_dunning_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.createDunningRun({
        companyId,
        runDate: body.runDate,
        stageCode: body.stageCode,
        annualInterestRatePercent: body.annualInterestRatePercent ?? undefined,
        reminderFeeAmount: body.reminderFeeAmount ?? undefined,
        idempotencyKey: body.idempotencyKey || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const arDunningRunMatch = matchPath(path, "/v1/ar/dunning-runs/:arDunningRunId");
  if (arDunningRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_dunning_run",
      scopeCode: "ar"
    });
    writeJson(
      res,
      200,
      platform.getDunningRun({
        companyId,
        arDunningRunId: arDunningRunMatch.arDunningRunId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ar/aging-snapshots") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ar_aging_snapshot",
      scopeCode: "ar"
    });
    writeJson(res, 200, {
      items: platform.listAgingSnapshots({
        companyId,
        cutoffDate: url.searchParams.get("cutoffDate") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ar/aging-snapshots") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ar_aging_snapshot",
      scopeCode: "ar"
    });
    writeJson(
      res,
      201,
      platform.captureAgingSnapshot({
        companyId,
        cutoffDate: body.cutoffDate,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/suppliers") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listSuppliers({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/suppliers") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.createSupplier({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apSupplierMatch = matchPath(path, "/v1/ap/suppliers/:supplierId");
  if (apSupplierMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getSupplier({
        companyId,
        supplierId: apSupplierMatch.supplierId
      })
    );
    return;
  }

  const apSupplierStatusMatch = matchPath(path, "/v1/ap/suppliers/:supplierId/status");
  if (apSupplierStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.transitionSupplierStatus({
        companyId,
        supplierId: apSupplierStatusMatch.supplierId,
        targetStatus: body.targetStatus,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/suppliers/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.importSuppliers({
        companyId,
        batchKey: body.batchKey,
        suppliers: Array.isArray(body.suppliers) ? body.suppliers : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apSupplierImportMatch = matchPath(path, "/v1/ap/suppliers/imports/:supplierImportBatchId");
  if (apSupplierImportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getSupplierImportBatch({
        companyId,
        supplierImportBatchId: apSupplierImportMatch.supplierImportBatchId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/purchase-orders") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listPurchaseOrders({
        companyId,
        supplierId: url.searchParams.get("supplierId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/purchase-orders") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.createPurchaseOrder({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apPurchaseOrderMatch = matchPath(path, "/v1/ap/purchase-orders/:purchaseOrderId");
  if (apPurchaseOrderMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getPurchaseOrder({
        companyId,
        purchaseOrderId: apPurchaseOrderMatch.purchaseOrderId
      })
    );
    return;
  }

  const apPurchaseOrderStatusMatch = matchPath(path, "/v1/ap/purchase-orders/:purchaseOrderId/status");
  if (apPurchaseOrderStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_purchase_order",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.transitionPurchaseOrderStatus({
        companyId,
        purchaseOrderId: apPurchaseOrderStatusMatch.purchaseOrderId,
        targetStatus: body.targetStatus,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/purchase-orders/imports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_purchase_order_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.importPurchaseOrders({
        companyId,
        batchKey: body.batchKey,
        purchaseOrders: Array.isArray(body.purchaseOrders) ? body.purchaseOrders : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apPurchaseOrderImportMatch = matchPath(path, "/v1/ap/purchase-orders/imports/:purchaseOrderImportBatchId");
  if (apPurchaseOrderImportMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_purchase_order_import_batch",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getPurchaseOrderImportBatch({
        companyId,
        purchaseOrderImportBatchId: apPurchaseOrderImportMatch.purchaseOrderImportBatchId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/receipts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_receipt",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listReceipts({
        companyId,
        purchaseOrderId: url.searchParams.get("purchaseOrderId") || null,
        supplierInvoiceReference: url.searchParams.get("supplierInvoiceReference") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/receipts") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_receipt",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.createReceipt({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apReceiptMatch = matchPath(path, "/v1/ap/receipts/:apReceiptId");
  if (apReceiptMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_receipt",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getReceipt({
        companyId,
        apReceiptId: apReceiptMatch.apReceiptId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/invoices") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    const reviewRequired = url.searchParams.get("reviewRequired");
    writeJson(res, 200, {
      items: platform.listSupplierInvoices({
        companyId,
        status: url.searchParams.get("status") || null,
        reviewRequired: reviewRequired === null ? null : reviewRequired === "true"
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/ap/invoices/ingest") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      201,
      platform.ingestSupplierInvoice({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apInvoiceMatch = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId");
  if (apInvoiceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getSupplierInvoice({
        companyId,
        supplierInvoiceId: apInvoiceMatch.supplierInvoiceId
      })
    );
    return;
  }

  const apInvoiceApprove = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId/approve");
  if (apInvoiceApprove && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.approveSupplierInvoice({
        companyId,
        supplierInvoiceId: apInvoiceApprove.supplierInvoiceId,
        actorId: principal.userId,
        actorCompanyUserId: principal.companyUserId,
        actorRoleCodes: principal.roles,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apInvoiceMatchRun = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId/match");
  if (apInvoiceMatchRun && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.runSupplierInvoiceMatch({
        companyId,
        supplierInvoiceId: apInvoiceMatchRun.supplierInvoiceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const apInvoicePost = matchPath(path, "/v1/ap/invoices/:supplierInvoiceId/post");
  if (apInvoicePost && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "ap_supplier_invoice",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.postSupplierInvoice({
        companyId,
        supplierInvoiceId: apInvoicePost.supplierInvoiceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/ap/open-items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_open_item",
      scopeCode: "ap"
    });
    writeJson(res, 200, {
      items: platform.listApOpenItems({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  const apOpenItemMatch = matchPath(path, "/v1/ap/open-items/:apOpenItemId");
  if (apOpenItemMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "ap_open_item",
      scopeCode: "ap"
    });
    writeJson(
      res,
      200,
      platform.getApOpenItem({
        companyId,
        apOpenItemId: apOpenItemMatch.apOpenItemId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/banking/accounts") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "bank_account",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listBankAccounts({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/banking/accounts") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "bank_account",
      scopeCode: "bank"
    });
    writeJson(
      res,
      201,
      platform.createBankAccount({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const bankAccountMatch = matchPath(path, "/v1/banking/accounts/:bankAccountId");
  if (bankAccountMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "bank_account",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getBankAccount({
        companyId,
        bankAccountId: bankAccountMatch.bankAccountId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/banking/statement-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "bank_statement_event",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listBankStatementEvents({
        companyId,
        bankAccountId: url.searchParams.get("bankAccountId") || null,
        matchStatus: url.searchParams.get("matchStatus") || null,
        processingStatus: url.searchParams.get("processingStatus") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/banking/statement-events/import") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "bank_statement_event",
      scopeCode: "bank"
    });
    writeJson(
      res,
      201,
      platform.importBankStatementEvents({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const bankStatementEventMatch = matchPath(path, "/v1/banking/statement-events/:bankStatementEventId");
  if (bankStatementEventMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "bank_statement_event",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getBankStatementEvent({
        companyId,
        bankStatementEventId: bankStatementEventMatch.bankStatementEventId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/banking/reconciliation-cases") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "bank_reconciliation_case",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listBankReconciliationCases({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  const bankReconciliationCaseMatch = matchPath(path, "/v1/banking/reconciliation-cases/:reconciliationCaseId");
  if (bankReconciliationCaseMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "bank_reconciliation_case",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getBankReconciliationCase({
        companyId,
        reconciliationCaseId: bankReconciliationCaseMatch.reconciliationCaseId
      })
    );
    return;
  }

  const bankReconciliationResolve = matchPath(path, "/v1/banking/reconciliation-cases/:reconciliationCaseId/resolve");
  if (bankReconciliationResolve && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "bank_reconciliation_case",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.resolveBankReconciliationCase({
        companyId,
        reconciliationCaseId: bankReconciliationResolve.reconciliationCaseId,
        resolutionCode: body.resolutionCode,
        resolutionNote: body.resolutionNote || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/banking/payment-proposals") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listPaymentProposals({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/banking/payment-proposals") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    writeJson(
      res,
      201,
      platform.createPaymentProposal({
        ...body,
        companyId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentProposalMatch = matchPath(path, "/v1/banking/payment-proposals/:paymentProposalId");
  if (paymentProposalMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getPaymentProposal({
        companyId,
        paymentProposalId: paymentProposalMatch.paymentProposalId
      })
    );
    return;
  }

  const paymentProposalApprove = matchPath(path, "/v1/banking/payment-proposals/:paymentProposalId/approve");
  if (paymentProposalApprove && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.approvePaymentProposal({
        companyId,
        paymentProposalId: paymentProposalApprove.paymentProposalId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentProposalExport = matchPath(path, "/v1/banking/payment-proposals/:paymentProposalId/export");
  if (paymentProposalExport && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.exportPaymentProposal({
        companyId,
        paymentProposalId: paymentProposalExport.paymentProposalId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentProposalSubmit = matchPath(path, "/v1/banking/payment-proposals/:paymentProposalId/submit");
  if (paymentProposalSubmit && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.submitPaymentProposal({
        companyId,
        paymentProposalId: paymentProposalSubmit.paymentProposalId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentProposalAccept = matchPath(path, "/v1/banking/payment-proposals/:paymentProposalId/accept");
  if (paymentProposalAccept && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_proposal",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.acceptPaymentProposal({
        companyId,
        paymentProposalId: paymentProposalAccept.paymentProposalId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentOrderBook = matchPath(path, "/v1/banking/payment-orders/:paymentOrderId/book");
  if (paymentOrderBook && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_order",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.bookPaymentOrder({
        companyId,
        paymentOrderId: paymentOrderBook.paymentOrderId,
        bankEventId: body.bankEventId,
        bookedOn: body.bookedOn || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentOrderReject = matchPath(path, "/v1/banking/payment-orders/:paymentOrderId/reject");
  if (paymentOrderReject && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_order",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.rejectPaymentOrder({
        companyId,
        paymentOrderId: paymentOrderReject.paymentOrderId,
        bankEventId: body.bankEventId,
        reasonCode: body.reasonCode || "payment_rejected",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const paymentOrderReturn = matchPath(path, "/v1/banking/payment-orders/:paymentOrderId/return");
  if (paymentOrderReturn && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payment_order",
      scopeCode: "bank"
    });
    writeJson(
      res,
      200,
      platform.returnPaymentOrder({
        companyId,
        paymentOrderId: paymentOrderReturn.paymentOrderId,
        bankEventId: body.bankEventId,
        returnedOn: body.returnedOn || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/schedule-templates") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_schedule",
      scopeCode: "time"
    });
    writeJson(res, 200, {
      items: platform.listScheduleTemplates({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/time/schedule-templates") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_schedule",
      scopeCode: "time"
    });
    writeJson(
      res,
      201,
      platform.createScheduleTemplate({
        companyId,
        scheduleTemplateCode: body.scheduleTemplateCode || null,
        displayName: body.displayName,
        timezone: body.timezone || "Europe/Stockholm",
        active: body.active !== false,
        days: body.days || [],
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/schedule-assignments") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_schedule",
      scopeCode: "time"
    });
    writeJson(res, 200, {
      items: platform.listScheduleAssignments({
        companyId,
        employmentId
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/time/schedule-assignments") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_schedule",
      scopeCode: "time"
    });
    writeJson(
      res,
      201,
      platform.assignScheduleTemplate({
        companyId,
        employmentId: body.employmentId,
        scheduleTemplateId: body.scheduleTemplateId,
        validFrom: body.validFrom,
        validTo: body.validTo || null,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/clock-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(res, 200, {
      items: platform.listClockEvents({
        companyId,
        employmentId
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/time/clock-events") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(
      res,
      201,
      platform.recordClockEvent({
        companyId,
        employmentId: body.employmentId,
        eventType: body.eventType,
        occurredAt: body.occurredAt,
        sourceChannel: body.sourceChannel || "field_mobile",
        projectId: body.projectId || null,
        activityCode: body.activityCode || null,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/entries") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(res, 200, {
      items: platform.listTimeEntries({
        companyId,
        employmentId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/time/entries") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(
      res,
      201,
      platform.createTimeEntry({
        companyId,
        employmentId: body.employmentId,
        workDate: body.workDate,
        projectId: body.projectId || null,
        activityCode: body.activityCode || null,
        sourceType: body.sourceType || "manual",
        startsAt: body.startsAt || null,
        endsAt: body.endsAt || null,
        breakMinutes: body.breakMinutes ?? 0,
        workedMinutes: body.workedMinutes ?? null,
        overtimeMinutes: body.overtimeMinutes ?? 0,
        obMinutes: body.obMinutes ?? 0,
        jourMinutes: body.jourMinutes ?? 0,
        standbyMinutes: body.standbyMinutes ?? 0,
        flexDeltaMinutes: body.flexDeltaMinutes ?? null,
        compDeltaMinutes: body.compDeltaMinutes ?? 0,
        sourceClockEventIds: body.sourceClockEventIds || [],
        approvalMode: body.approvalMode || "auto",
        managerEmploymentId: body.managerEmploymentId || null,
        allocationRefs: body.allocationRefs || [],
        actorId: principal.userId
      })
    );
    return;
  }

  const timeEntrySubmitMatch = matchPath(path, "/v1/time/entries/:timeEntryId/submit");
  if (timeEntrySubmitMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const employmentId = requireText(body.employmentId, "employment_id_required", "Employment id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(
      res,
      200,
      platform.submitTimeEntry({
        companyId,
        employmentId,
        timeEntryId: timeEntrySubmitMatch.timeEntryId,
        actorId: principal.userId
      })
    );
    return;
  }

  const timeEntryApproveMatch = matchPath(path, "/v1/time/entries/:timeEntryId/approve");
  if (timeEntryApproveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const employmentId = requireText(body.employmentId, "employment_id_required", "Employment id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(
      res,
      200,
      platform.approveTimeEntry({
        companyId,
        employmentId,
        timeEntryId: timeEntryApproveMatch.timeEntryId,
        actorId: principal.userId
      })
    );
    return;
  }

  const timeEntryRejectMatch = matchPath(path, "/v1/time/entries/:timeEntryId/reject");
  if (timeEntryRejectMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const employmentId = requireText(body.employmentId, "employment_id_required", "Employment id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(
      res,
      200,
      platform.rejectTimeEntry({
        companyId,
        employmentId,
        timeEntryId: timeEntryRejectMatch.timeEntryId,
        reason: body.reason,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/employment-base") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_entry",
      scopeCode: "time"
    });
    writeJson(
      res,
      200,
      platform.getEmploymentTimeBase({
        companyId,
        employmentId,
        workDate: url.searchParams.get("workDate") || null,
        cutoffDate: url.searchParams.get("cutoffDate") || null
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/balances") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_balance",
      scopeCode: "time"
    });
    writeJson(
      res,
      200,
      platform.listTimeBalances({
        companyId,
        employmentId,
        cutoffDate: url.searchParams.get("cutoffDate") || null
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/time/period-locks") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "time_period_lock",
      scopeCode: "time"
    });
    writeJson(res, 200, {
      items: platform.listTimePeriodLocks({
        companyId,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/time/period-locks") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "time_period_lock",
      scopeCode: "time"
    });
    writeJson(
      res,
      201,
      platform.lockTimePeriod({
        companyId,
        employmentId: body.employmentId || null,
        startsOn: body.startsOn,
        endsOn: body.endsOn,
        reasonCode: body.reasonCode,
        note: body.note || null,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/leave-types") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_type",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listLeaveTypes({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/hr/leave-types") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "leave_type",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.createLeaveType({
        companyId,
        leaveTypeCode: body.leaveTypeCode || null,
        displayName: body.displayName,
        signalType: body.signalType || "none",
        requiresManagerApproval: body.requiresManagerApproval !== false,
        requiresSupportingDocument: body.requiresSupportingDocument === true,
        active: body.active !== false,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/leave-entries") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_entry",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listLeaveEntries({
        companyId,
        employeeId: url.searchParams.get("employeeId") || null,
        employmentId: url.searchParams.get("employmentId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  const leaveEntryMatch = matchPath(path, "/v1/hr/leave-entries/:leaveEntryId");
  if (leaveEntryMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_entry",
      scopeCode: "hr"
    });
    writeJson(
      res,
      200,
      platform.getLeaveEntry({
        companyId,
        leaveEntryId: leaveEntryMatch.leaveEntryId
      })
    );
    return;
  }

  const leaveEntryApproveMatch = matchPath(path, "/v1/hr/leave-entries/:leaveEntryId/approve");
  if (leaveEntryApproveMatch && req.method === "POST") {
    const body = await readJsonBody(req, true);
    const companyId = requireText(body.companyId || url.searchParams.get("companyId"), "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_entry",
      scopeCode: "hr"
    });
    const leaveEntry = platform.getLeaveEntry({
      companyId,
      leaveEntryId: leaveEntryApproveMatch.leaveEntryId
    });
    assertPrincipalCanApproveLeaveEntry({
      platform,
      principal,
      companyId,
      leaveEntry
    });
    writeJson(
      res,
      200,
      platform.approveLeaveEntry({
        companyId,
        leaveEntryId: leaveEntry.leaveEntryId,
        actorId: principal.userId
      })
    );
    return;
  }

  const leaveEntryRejectMatch = matchPath(path, "/v1/hr/leave-entries/:leaveEntryId/reject");
  if (leaveEntryRejectMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId || url.searchParams.get("companyId"), "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_entry",
      scopeCode: "hr"
    });
    const leaveEntry = platform.getLeaveEntry({
      companyId,
      leaveEntryId: leaveEntryRejectMatch.leaveEntryId
    });
    assertPrincipalCanApproveLeaveEntry({
      platform,
      principal,
      companyId,
      leaveEntry
    });
    writeJson(
      res,
      200,
      platform.rejectLeaveEntry({
        companyId,
        leaveEntryId: leaveEntry.leaveEntryId,
        reason: body.reason,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/leave-signals") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_signal",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listLeaveSignals({
        companyId,
        employeeId: url.searchParams.get("employeeId") || null,
        employmentId: url.searchParams.get("employmentId") || null,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/leave-signal-locks") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "leave_signal_lock",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listLeaveSignalLocks({
        companyId,
        employmentId: url.searchParams.get("employmentId") || null,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/hr/leave-signal-locks") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "leave_signal_lock",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.lockLeaveSignals({
        companyId,
        employmentId: body.employmentId || null,
        reportingPeriod: body.reportingPeriod,
        lockState: body.lockState || "signed",
        note: body.note || null,
        sourceReference: body.sourceReference || null,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/employee-portal/me") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee_portal",
      scopeCode: "hr"
    });
    const employee = resolvePortalEmployee({
      platform,
      companyId,
      email: principal.email
    });
    const employments = platform.listEmployments({
      companyId,
      employeeId: employee.employeeId
    });
    writeJson(res, 200, {
      employee,
      employments,
      leaveEntries: platform.listLeaveEntries({
        companyId,
        employeeId: employee.employeeId
      }),
      leaveSignals: platform.listLeaveSignals({
        companyId,
        employeeId: employee.employeeId
      }),
      timeBalances: employments.map((employment) =>
        platform.listTimeBalances({
          companyId,
          employmentId: employment.employmentId,
          cutoffDate: url.searchParams.get("cutoffDate") || null
        })
      )
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/employee-portal/me/leave-entries") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee_portal",
      scopeCode: "hr"
    });
    const employee = resolvePortalEmployee({
      platform,
      companyId,
      email: principal.email
    });
    writeJson(res, 200, {
      items: platform.listLeaveEntries({
        companyId,
        employeeId: employee.employeeId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/hr/employee-portal/me/leave-entries") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "employee_portal",
      scopeCode: "hr"
    });
    const employee = resolvePortalEmployee({
      platform,
      companyId,
      email: principal.email
    });
    platform.getEmployment({
      companyId,
      employeeId: employee.employeeId,
      employmentId: body.employmentId
    });
    writeJson(
      res,
      201,
      platform.createLeaveEntry({
        companyId,
        employmentId: body.employmentId,
        leaveTypeId: body.leaveTypeId,
        reportingPeriod: body.reportingPeriod || null,
        days: body.days,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        note: body.note || null,
        supportingDocumentId: body.supportingDocumentId || null,
        sourceChannel: "employee_portal",
        actorId: principal.userId
      })
    );
    return;
  }

  const portalLeaveEntryMatch = matchPath(path, "/v1/hr/employee-portal/me/leave-entries/:leaveEntryId");
  if (portalLeaveEntryMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee_portal",
      scopeCode: "hr"
    });
    const employee = resolvePortalEmployee({
      platform,
      companyId,
      email: principal.email
    });
    const leaveEntry = platform.getLeaveEntry({
      companyId,
      leaveEntryId: portalLeaveEntryMatch.leaveEntryId
    });
    assertPortalEmployeeOwnsLeaveEntry(employee, leaveEntry);
    writeJson(res, 200, leaveEntry);
    return;
  }

  if (portalLeaveEntryMatch && req.method === "PATCH") {
    const body = await readJsonBody(req, true);
    const companyId = requireText(body.companyId || url.searchParams.get("companyId"), "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "employee_portal",
      scopeCode: "hr"
    });
    const employee = resolvePortalEmployee({
      platform,
      companyId,
      email: principal.email
    });
    const leaveEntry = platform.getLeaveEntry({
      companyId,
      leaveEntryId: portalLeaveEntryMatch.leaveEntryId
    });
    assertPortalEmployeeOwnsLeaveEntry(employee, leaveEntry);
    writeJson(
      res,
      200,
      platform.updateLeaveEntry({
        companyId,
        leaveEntryId: leaveEntry.leaveEntryId,
        reportingPeriod: body.reportingPeriod,
        days: body.days,
        startDate: body.startDate,
        endDate: body.endDate,
        note: body.note,
        supportingDocumentId: body.supportingDocumentId,
        actorId: principal.userId
      })
    );
    return;
  }

  const portalLeaveEntrySubmitMatch = matchPath(path, "/v1/hr/employee-portal/me/leave-entries/:leaveEntryId/submit");
  if (portalLeaveEntrySubmitMatch && req.method === "POST") {
    const body = await readJsonBody(req, true);
    const companyId = requireText(body.companyId || url.searchParams.get("companyId"), "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.read",
      objectType: "employee_portal",
      scopeCode: "hr"
    });
    const employee = resolvePortalEmployee({
      platform,
      companyId,
      email: principal.email
    });
    const leaveEntry = platform.getLeaveEntry({
      companyId,
      leaveEntryId: portalLeaveEntrySubmitMatch.leaveEntryId
    });
    assertPortalEmployeeOwnsLeaveEntry(employee, leaveEntry);
    writeJson(
      res,
      200,
      platform.submitLeaveEntry({
        companyId,
        leaveEntryId: leaveEntry.leaveEntryId,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/hr/employees") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listEmployees({ companyId })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/hr/employees") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.createEmployee({
        companyId,
        employeeNo: body.employeeNo || null,
        givenName: body.givenName,
        familyName: body.familyName,
        preferredName: body.preferredName || null,
        dateOfBirth: body.dateOfBirth || null,
        identityType: body.identityType || "other",
        identityValue: body.identityValue || null,
        protectedIdentity: body.protectedIdentity === true,
        workEmail: body.workEmail || null,
        privateEmail: body.privateEmail || null,
        phone: body.phone || null,
        countryCode: body.countryCode || "SE",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const hrEmployeeMatch = matchPath(path, "/v1/hr/employees/:employeeId");
  if (hrEmployeeMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(
      res,
      200,
      platform.getEmployee({
        companyId,
        employeeId: hrEmployeeMatch.employeeId
      })
    );
    return;
  }

  const hrEmploymentsMatch = matchPath(path, "/v1/hr/employees/:employeeId/employments");
  if (hrEmploymentsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listEmployments({
        companyId,
        employeeId: hrEmploymentsMatch.employeeId
      })
    });
    return;
  }

  if (hrEmploymentsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.createEmployment({
        companyId,
        employeeId: hrEmploymentsMatch.employeeId,
        employmentNo: body.employmentNo || null,
        employmentTypeCode: body.employmentTypeCode,
        jobTitle: body.jobTitle,
        departmentCode: body.departmentCode || null,
        payModelCode: body.payModelCode,
        workerCategoryCode: body.workerCategoryCode || null,
        externalContractorRef: body.externalContractorRef || null,
        payrollMigrationAnchorRef: body.payrollMigrationAnchorRef || null,
        scheduleTemplateCode: body.scheduleTemplateCode || null,
        startDate: body.startDate,
        endDate: body.endDate || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const hrEmploymentSnapshotMatch = matchPath(path, "/v1/hr/employees/:employeeId/employments/:employmentId/snapshot");
  if (hrEmploymentSnapshotMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employment",
      scopeCode: "hr"
    });
    writeJson(
      res,
      200,
      platform.getEmploymentSnapshot({
        companyId,
        employeeId: hrEmploymentSnapshotMatch.employeeId,
        employmentId: hrEmploymentSnapshotMatch.employmentId,
        snapshotDate: url.searchParams.get("snapshotDate") || null
      })
    );
    return;
  }

  const hrContractsMatch = matchPath(path, "/v1/hr/employees/:employeeId/contracts");
  if (hrContractsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employment",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listEmploymentContracts({
        companyId,
        employeeId: hrContractsMatch.employeeId,
        employmentId
      })
    });
    return;
  }

  if (hrContractsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "employment",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.addEmploymentContract({
        companyId,
        employeeId: hrContractsMatch.employeeId,
        employmentId: body.employmentId,
        validFrom: body.validFrom,
        validTo: body.validTo || null,
        salaryModelCode: body.salaryModelCode,
        monthlySalary: body.monthlySalary ?? null,
        hourlyRate: body.hourlyRate ?? null,
        currencyCode: body.currencyCode || "SEK",
        collectiveAgreementCode: body.collectiveAgreementCode || null,
        salaryRevisionReason: body.salaryRevisionReason || null,
        termsDocumentId: body.termsDocumentId || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const hrManagerAssignmentsMatch = matchPath(path, "/v1/hr/employees/:employeeId/manager-assignments");
  if (hrManagerAssignmentsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employment",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listManagerAssignments({
        companyId,
        employeeId: hrManagerAssignmentsMatch.employeeId,
        employmentId
      })
    });
    return;
  }

  if (hrManagerAssignmentsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "employment",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.assignEmploymentManager({
        companyId,
        employeeId: hrManagerAssignmentsMatch.employeeId,
        employmentId: body.employmentId,
        managerEmploymentId: body.managerEmploymentId,
        validFrom: body.validFrom,
        validTo: body.validTo || null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const hrBankAccountsMatch = matchPath(path, "/v1/hr/employees/:employeeId/bank-accounts");
  if (hrBankAccountsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listEmployeeBankAccounts({
        companyId,
        employeeId: hrBankAccountsMatch.employeeId
      })
    });
    return;
  }

  if (hrBankAccountsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.addEmployeeBankAccount({
        companyId,
        employeeId: hrBankAccountsMatch.employeeId,
        payoutMethod: body.payoutMethod,
        accountHolderName: body.accountHolderName,
        countryCode: body.countryCode || "SE",
        clearingNumber: body.clearingNumber || null,
        accountNumber: body.accountNumber || null,
        bankgiro: body.bankgiro || null,
        plusgiro: body.plusgiro || null,
        iban: body.iban || null,
        bic: body.bic || null,
        bankName: body.bankName || null,
        primaryAccount: body.primaryAccount !== false,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const hrDocumentsMatch = matchPath(path, "/v1/hr/employees/:employeeId/documents");
  if (hrDocumentsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listEmployeeDocuments({
        companyId,
        employeeId: hrDocumentsMatch.employeeId
      })
    });
    return;
  }

  if (hrDocumentsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(
      res,
      201,
      platform.attachEmployeeDocument({
        companyId,
        employeeId: hrDocumentsMatch.employeeId,
        documentId: body.documentId,
        documentType: body.documentType || "employment_document",
        relationType: body.relationType || "employee_masterdata",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const hrAuditMatch = matchPath(path, "/v1/hr/employees/:employeeId/audit-events");
  if (hrAuditMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "employee",
      scopeCode: "hr"
    });
    writeJson(res, 200, {
      items: platform.listEmployeeAuditEvents({
        companyId,
        employeeId: hrAuditMatch.employeeId
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/rule-packs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayrollRulePacks({
        effectiveDate: url.searchParams.get("effectiveDate") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/statutory-profiles") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listEmploymentStatutoryProfiles({
        companyId,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/statutory-profiles") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.upsertEmploymentStatutoryProfile({
        companyId,
        employmentId: body.employmentId,
        taxMode: body.taxMode ?? "pending",
        taxRatePercent: body.taxRatePercent ?? null,
        contributionClassCode: body.contributionClassCode ?? null,
        sinkDecisionType: body.sinkDecisionType ?? null,
        sinkValidFrom: body.sinkValidFrom ?? null,
        sinkValidTo: body.sinkValidTo ?? null,
        sinkRatePercent: body.sinkRatePercent ?? null,
        sinkSeaIncome: body.sinkSeaIncome === true,
        sinkDecisionDocumentId: body.sinkDecisionDocumentId ?? null,
        fallbackTaxMode: body.fallbackTaxMode ?? null,
        fallbackTaxRatePercent: body.fallbackTaxRatePercent ?? null,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/benefits/catalog") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "benefit_catalog",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listBenefitCatalog({
        companyId
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/benefits/events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "benefit_event",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listBenefitEvents({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        employeeId: url.searchParams.get("employeeId") || null,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/benefits/events") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "benefit_event",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createBenefitEvent({
        companyId,
        employeeId: body.employeeId,
        employmentId: body.employmentId,
        benefitCode: body.benefitCode,
        reportingPeriod: body.reportingPeriod ?? null,
        occurredOn: body.occurredOn ?? null,
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        sourceType: body.sourceType ?? "manual_entry",
        sourceId: body.sourceId ?? null,
        sourcePayload: body.sourcePayload || {},
        employeePaidValue: body.employeePaidValue ?? 0,
        netDeductionValue: body.netDeductionValue ?? 0,
        supportingDocumentId: body.supportingDocumentId ?? null,
        dimensionJson: body.dimensionJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const benefitEventMatch = matchPath(path, "/v1/benefits/events/:benefitEventId");
  if (benefitEventMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "benefit_event",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getBenefitEvent({
        companyId,
        benefitEventId: benefitEventMatch.benefitEventId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/benefits/audit-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "benefit_event",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listBenefitAuditEvents({
        companyId,
        benefitEventId: url.searchParams.get("benefitEventId") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/travel/foreign-allowances") {
    writeJson(res, 200, {
      items: platform.listForeignNormalAmounts({
        taxYear: url.searchParams.get("taxYear") || "2026"
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/travel/claims") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "travel_claim",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listTravelClaims({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        employeeId: url.searchParams.get("employeeId") || null,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/travel/claims") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "travel_claim",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createTravelClaim({
        companyId,
        employeeId: body.employeeId,
        employmentId: body.employmentId,
        purpose: body.purpose,
        startAt: body.startAt,
        endAt: body.endAt,
        reportingPeriod: body.reportingPeriod ?? null,
        homeLocation: body.homeLocation ?? null,
        regularWorkLocation: body.regularWorkLocation ?? null,
        firstDestination: body.firstDestination ?? null,
        distanceFromHomeKm: body.distanceFromHomeKm ?? 0,
        distanceFromRegularWorkKm: body.distanceFromRegularWorkKm ?? 0,
        countryCode: body.countryCode ?? null,
        countryName: body.countryName ?? null,
        countrySegments: body.countrySegments || [],
        mealEvents: body.mealEvents || [],
        mileageLogs: body.mileageLogs || [],
        expenseReceipts: body.expenseReceipts || [],
        travelAdvances: body.travelAdvances || [],
        requestedAllowanceAmount: body.requestedAllowanceAmount ?? null,
        sameLocationDaysBeforeStart: body.sameLocationDaysBeforeStart ?? 0,
        sameLocationKey: body.sameLocationKey ?? null,
        lodgingPaidByEmployer: body.lodgingPaidByEmployer === true,
        preApproved: body.preApproved === true,
        approvalStatus: body.approvalStatus ?? "approved",
        sourceType: body.sourceType ?? "manual_entry",
        sourceId: body.sourceId ?? null,
        dimensionJson: body.dimensionJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const travelClaimMatch = matchPath(path, "/v1/travel/claims/:travelClaimId");
  if (travelClaimMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "travel_claim",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getTravelClaim({
        companyId,
        travelClaimId: travelClaimMatch.travelClaimId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/travel/audit-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "travel_claim",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listTravelAuditEvents({
        companyId,
        travelClaimId: url.searchParams.get("travelClaimId") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/plans") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_plan",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPensionPlans({ companyId })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/enrollments") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_enrollment",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPensionEnrollments({
        companyId,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/pension/enrollments") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "pension_enrollment",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPensionEnrollment({
        companyId,
        employeeId: body.employeeId,
        employmentId: body.employmentId,
        planCode: body.planCode,
        startsOn: body.startsOn,
        endsOn: body.endsOn ?? null,
        contributionMode: body.contributionMode ?? "rate_percent",
        contributionRatePercent: body.contributionRatePercent ?? null,
        fixedContributionAmount: body.fixedContributionAmount ?? null,
        contributionBasisCode: body.contributionBasisCode ?? null,
        providerCode: body.providerCode ?? null,
        status: body.status ?? "active",
        dimensionJson: body.dimensionJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/pension/salary-exchange/simulations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "salary_exchange_agreement",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.simulateSalaryExchangeAgreement({
        companyId,
        employeeId: body.employeeId ?? null,
        employmentId: body.employmentId ?? null,
        monthlyGrossSalary: body.monthlyGrossSalary,
        exchangeMode: body.exchangeMode ?? "fixed_amount",
        exchangeValue: body.exchangeValue,
        employerMarkupPercent: body.employerMarkupPercent ?? null,
        thresholdAmount: body.thresholdAmount ?? null,
        exceptionDecisionReference: body.exceptionDecisionReference ?? null
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/salary-exchange-agreements") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "salary_exchange_agreement",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listSalaryExchangeAgreements({
        companyId,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/pension/salary-exchange-agreements") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "salary_exchange_agreement",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createSalaryExchangeAgreement({
        companyId,
        employeeId: body.employeeId,
        employmentId: body.employmentId,
        startsOn: body.startsOn,
        endsOn: body.endsOn ?? null,
        exchangeMode: body.exchangeMode ?? "fixed_amount",
        exchangeValue: body.exchangeValue,
        employerMarkupPercent: body.employerMarkupPercent ?? null,
        thresholdAmount: body.thresholdAmount ?? null,
        basisTreatmentCode: body.basisTreatmentCode ?? "maintain_pre_exchange",
        providerCode: body.providerCode ?? null,
        status: body.status ?? "active",
        exceptionDecisionReference: body.exceptionDecisionReference ?? null,
        dimensionJson: body.dimensionJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_event",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPensionEvents({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  const pensionEventMatch = matchPath(path, "/v1/pension/events/:pensionEventId");
  if (pensionEventMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_event",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getPensionEvent({
        companyId,
        pensionEventId: pensionEventMatch.pensionEventId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/reports") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_report",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPensionReports({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        providerCode: url.searchParams.get("providerCode") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/pension/reports") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "pension_report",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPensionReport({
        companyId,
        reportingPeriod: body.reportingPeriod,
        providerCode: body.providerCode,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/reconciliations") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_reconciliation",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPensionReconciliations({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        providerCode: url.searchParams.get("providerCode") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/pension/reconciliations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "pension_reconciliation",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPensionReconciliation({
        companyId,
        reportingPeriod: body.reportingPeriod,
        providerCode: body.providerCode,
        invoicedAmount: body.invoicedAmount,
        invoiceDocumentId: body.invoiceDocumentId ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/pension/audit-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pension_event",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPensionAuditEvents({
        companyId,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/kalkyl/estimates") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listEstimateVersions({
        companyId,
        estimateNo: url.searchParams.get("estimateNo") || null,
        status: url.searchParams.get("status") || null,
        customerId: url.searchParams.get("customerId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/kalkyl/estimates") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createEstimateVersion({
        companyId,
        estimateVersionId: body.estimateVersionId ?? null,
        estimateNo: body.estimateNo ?? null,
        supersedesEstimateVersionId: body.supersedesEstimateVersionId ?? null,
        customerId: body.customerId,
        projectId: body.projectId ?? null,
        currencyCode: body.currencyCode ?? "SEK",
        validFrom: body.validFrom,
        validTo: body.validTo ?? null,
        title: body.title,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const kalkylEstimateMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId");
  if (kalkylEstimateMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.getEstimateVersion({
        companyId,
        estimateVersionId: kalkylEstimateMatch.estimateVersionId
      })
    );
    return;
  }

  const kalkylEstimateLinesMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId/lines");
  if (kalkylEstimateLinesMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.addEstimateLine({
        companyId,
        estimateVersionId: kalkylEstimateLinesMatch.estimateVersionId,
        estimateLineId: body.estimateLineId ?? null,
        lineTypeCode: body.lineTypeCode,
        description: body.description,
        quantity: body.quantity,
        unitCode: body.unitCode,
        costAmount: body.costAmount,
        salesAmount: body.salesAmount,
        projectPhaseCode: body.projectPhaseCode ?? null,
        riskClassCode: body.riskClassCode ?? "standard",
        costModelCode: body.costModelCode ?? "manual",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const kalkylEstimateAssumptionsMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId/assumptions");
  if (kalkylEstimateAssumptionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.addEstimateAssumption({
        companyId,
        estimateVersionId: kalkylEstimateAssumptionsMatch.estimateVersionId,
        estimateAssumptionId: body.estimateAssumptionId ?? null,
        assumptionCode: body.assumptionCode,
        description: body.description,
        impactAmount: body.impactAmount,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const kalkylEstimateReviewMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId/review");
  if (kalkylEstimateReviewMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.reviewEstimateVersion({
        companyId,
        estimateVersionId: kalkylEstimateReviewMatch.estimateVersionId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const kalkylEstimateApproveMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId/approve");
  if (kalkylEstimateApproveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.approveEstimateVersion({
        companyId,
        estimateVersionId: kalkylEstimateApproveMatch.estimateVersionId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const kalkylEstimateQuoteMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId/convert-to-quote");
  if (kalkylEstimateQuoteMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.convertEstimateToQuote({
        companyId,
        estimateVersionId: kalkylEstimateQuoteMatch.estimateVersionId,
        validUntil: body.validUntil ?? null,
        quoteTitle: body.quoteTitle ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const kalkylEstimateProjectBudgetMatch = matchPath(path, "/v1/kalkyl/estimates/:estimateVersionId/convert-to-project-budget");
  if (kalkylEstimateProjectBudgetMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "estimate_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.convertEstimateToProjectBudget({
        companyId,
        estimateVersionId: kalkylEstimateProjectBudgetMatch.estimateVersionId,
        projectId: body.projectId ?? null,
        budgetName: body.budgetName ?? null,
        validFrom: body.validFrom ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/projects") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listProjects({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/projects") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createProject({
        companyId,
        projectId: body.projectId ?? null,
        projectCode: body.projectCode ?? null,
        projectReferenceCode: body.projectReferenceCode ?? null,
        displayName: body.displayName,
        customerId: body.customerId ?? null,
        projectManagerEmployeeId: body.projectManagerEmployeeId ?? null,
        startsOn: body.startsOn,
        endsOn: body.endsOn ?? null,
        currencyCode: body.currencyCode ?? "SEK",
        status: body.status ?? "draft",
        billingModelCode: body.billingModelCode ?? null,
        revenueRecognitionModelCode: body.revenueRecognitionModelCode ?? null,
        contractValueAmount: body.contractValueAmount ?? 0,
        dimensionJson: body.dimensionJson || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectMatch = matchPath(path, "/v1/projects/:projectId");
  if (projectMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.getProject({
        companyId,
        projectId: projectMatch.projectId
      })
    );
    return;
  }

  const projectWorkspaceMatch = matchPath(path, "/v1/projects/:projectId/workspace");
  if (projectWorkspaceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_workspace",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getProjectWorkspace({
        companyId,
        projectId: projectWorkspaceMatch.projectId,
        cutoffDate: url.searchParams.get("cutoffDate") || null
      })
    );
    return;
  }

  const projectDeviationsMatch = matchPath(path, "/v1/projects/:projectId/deviations");
  if (projectDeviationsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_deviation",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectDeviations({
        companyId,
        projectId: projectDeviationsMatch.projectId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (projectDeviationsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_deviation",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createProjectDeviation({
        companyId,
        projectId: projectDeviationsMatch.projectId,
        projectDeviationId: body.projectDeviationId ?? null,
        deviationTypeCode: body.deviationTypeCode,
        severityCode: body.severityCode ?? "major",
        title: body.title,
        description: body.description,
        ownerUserId: body.ownerUserId ?? null,
        sourceDomainCode: body.sourceDomainCode ?? "projects",
        sourceObjectId: body.sourceObjectId ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectDeviationAssignMatch = matchPath(path, "/v1/projects/:projectId/deviations/:projectDeviationId/assign");
  if (projectDeviationAssignMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_deviation",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.assignProjectDeviation({
        companyId,
        projectId: projectDeviationAssignMatch.projectId,
        projectDeviationId: projectDeviationAssignMatch.projectDeviationId,
        ownerUserId: body.ownerUserId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectDeviationStatusMatch = matchPath(path, "/v1/projects/:projectId/deviations/:projectDeviationId/status");
  if (projectDeviationStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_deviation",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.transitionProjectDeviationStatus({
        companyId,
        projectId: projectDeviationStatusMatch.projectId,
        projectDeviationId: projectDeviationStatusMatch.projectDeviationId,
        nextStatus: body.nextStatus,
        resolutionNote: body.resolutionNote ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectBudgetsMatch = matchPath(path, "/v1/projects/:projectId/budgets");
  if (projectBudgetsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_budget_version",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectBudgetVersions({
        companyId,
        projectId: projectBudgetsMatch.projectId
      })
    });
    return;
  }

  if (projectBudgetsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_budget_version",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createProjectBudgetVersion({
        companyId,
        projectId: projectBudgetsMatch.projectId,
        budgetName: body.budgetName,
        validFrom: body.validFrom,
        lines: body.lines || [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectResourceAllocationsMatch = matchPath(path, "/v1/projects/:projectId/resource-allocations");
  if (projectResourceAllocationsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_resource_allocation",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectResourceAllocations({
        companyId,
        projectId: projectResourceAllocationsMatch.projectId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (projectResourceAllocationsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_resource_allocation",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createProjectResourceAllocation({
        companyId,
        projectId: projectResourceAllocationsMatch.projectId,
        employmentId: body.employmentId,
        reportingPeriod: body.reportingPeriod,
        plannedMinutes: body.plannedMinutes,
        billableMinutes: body.billableMinutes ?? null,
        billRateAmount: body.billRateAmount,
        costRateAmount: body.costRateAmount,
        activityCode: body.activityCode ?? null,
        status: body.status ?? "planned",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectCostSnapshotsMatch = matchPath(path, "/v1/projects/:projectId/cost-snapshots");
  const projectPayrollCostAllocationsMatch = matchPath(path, "/v1/projects/:projectId/payroll-cost-allocations");
  if (projectPayrollCostAllocationsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_payroll_cost_allocation",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectPayrollCostAllocations({
        companyId,
        projectId: projectPayrollCostAllocationsMatch.projectId,
        projectCostSnapshotId: url.searchParams.get("projectCostSnapshotId"),
        payRunId: url.searchParams.get("payRunId"),
        employmentId: url.searchParams.get("employmentId")
      })
    });
    return;
  }

  if (projectCostSnapshotsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_cost_snapshot",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectCostSnapshots({
        companyId,
        projectId: projectCostSnapshotsMatch.projectId
      })
    });
    return;
  }

  if (projectCostSnapshotsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_cost_snapshot",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.materializeProjectCostSnapshot({
        companyId,
        projectId: projectCostSnapshotsMatch.projectId,
        cutoffDate: body.cutoffDate,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectWipSnapshotsMatch = matchPath(path, "/v1/projects/:projectId/wip-snapshots");
  if (projectWipSnapshotsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_wip_snapshot",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectWipSnapshots({
        companyId,
        projectId: projectWipSnapshotsMatch.projectId
      })
    });
    return;
  }

  if (projectWipSnapshotsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_wip_snapshot",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.materializeProjectWipSnapshot({
        companyId,
        projectId: projectWipSnapshotsMatch.projectId,
        cutoffDate: body.cutoffDate,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectForecastSnapshotsMatch = matchPath(path, "/v1/projects/:projectId/forecast-snapshots");
  if (projectForecastSnapshotsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_forecast_snapshot",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectForecastSnapshots({
        companyId,
        projectId: projectForecastSnapshotsMatch.projectId
      })
    });
    return;
  }

  if (projectForecastSnapshotsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_forecast_snapshot",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.materializeProjectForecastSnapshot({
        companyId,
        projectId: projectForecastSnapshotsMatch.projectId,
        cutoffDate: body.cutoffDate,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectChangeOrdersMatch = matchPath(path, "/v1/projects/:projectId/change-orders");
  if (projectChangeOrdersMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_change_order",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectChangeOrders({
        companyId,
        projectId: projectChangeOrdersMatch.projectId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (projectChangeOrdersMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_change_order",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createProjectChangeOrder({
        companyId,
        projectId: projectChangeOrdersMatch.projectId,
        projectChangeOrderId: body.projectChangeOrderId ?? null,
        scopeCode: body.scopeCode,
        title: body.title,
        description: body.description ?? null,
        linkedWorkOrderId: body.linkedWorkOrderId ?? null,
        revenueImpactAmount: body.revenueImpactAmount ?? 0,
        costImpactAmount: body.costImpactAmount ?? 0,
        scheduleImpactMinutes: body.scheduleImpactMinutes ?? 0,
        customerApprovalRequiredFlag: body.customerApprovalRequiredFlag ?? true,
        quoteReference: body.quoteReference ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectChangeOrderStatusMatch = matchPath(path, "/v1/projects/:projectId/change-orders/:projectChangeOrderId/status");
  if (projectChangeOrderStatusMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_change_order",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.transitionProjectChangeOrderStatus({
        companyId,
        projectId: projectChangeOrderStatusMatch.projectId,
        projectChangeOrderId: projectChangeOrderStatusMatch.projectChangeOrderId,
        nextStatus: body.nextStatus,
        customerApprovedAt: body.customerApprovedAt ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectBuildVatDecisionsMatch = matchPath(path, "/v1/projects/:projectId/build-vat-decisions");
  if (projectBuildVatDecisionsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project_build_vat_assessment",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectBuildVatAssessments({
        companyId,
        projectId: projectBuildVatDecisionsMatch.projectId
      })
    });
    return;
  }

  if (projectBuildVatDecisionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "project_build_vat_assessment",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createProjectBuildVatAssessment({
        companyId,
        projectId: projectBuildVatDecisionsMatch.projectId,
        projectBuildVatAssessmentId: body.projectBuildVatAssessmentId ?? null,
        sourceDocumentId: body.sourceDocumentId ?? null,
        sourceDocumentType: body.sourceDocumentType ?? "project_change_order",
        description: body.description,
        invoiceDate: body.invoiceDate,
        deliveryDate: body.deliveryDate ?? null,
        buyerCountry: body.buyerCountry ?? "SE",
        buyerType: body.buyerType ?? "company",
        buyerVatNo: body.buyerVatNo ?? null,
        buyerVatNumber: body.buyerVatNumber ?? null,
        buyerVatNumberStatus: body.buyerVatNumberStatus ?? "valid",
        buyerIsTaxablePerson: body.buyerIsTaxablePerson ?? true,
        buyerBuildSectorFlag: body.buyerBuildSectorFlag ?? false,
        buyerResellsConstructionServicesFlag: body.buyerResellsConstructionServicesFlag ?? false,
        lineAmountExVat: body.lineAmountExVat,
        vatRate: body.vatRate ?? 25,
        goodsOrServices: body.goodsOrServices ?? "services",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const projectAuditEventsMatch = matchPath(path, "/v1/projects/:projectId/audit-events");
  if (projectAuditEventsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "project",
      scopeCode: "project"
    });
    assertProjectWorkspaceReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listProjectAuditEvents({
        companyId,
        projectId: projectAuditEventsMatch.projectId
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/hus/cases") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "hus_case",
      scopeCode: "project"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listHusCases({
        companyId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/hus/cases") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_case",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createHusCase({
        companyId,
        husCaseId: body.husCaseId ?? null,
        caseReference: body.caseReference ?? null,
        customerId: body.customerId ?? null,
        projectId: body.projectId ?? null,
        customerInvoiceId: body.customerInvoiceId ?? null,
        serviceTypeCode: body.serviceTypeCode ?? "rot",
        workCompletedOn: body.workCompletedOn,
        workCompletedFrom: body.workCompletedFrom ?? null,
        workCompletedTo: body.workCompletedTo ?? null,
        currencyCode: body.currencyCode ?? "SEK",
        ruleYear: body.ruleYear ?? 2026,
        housingFormCode: body.housingFormCode ?? null,
        propertyDesignation: body.propertyDesignation ?? null,
        apartmentDesignation: body.apartmentDesignation ?? null,
        housingAssociationOrgNumber: body.housingAssociationOrgNumber ?? null,
        serviceAddressLine1: body.serviceAddressLine1 ?? null,
        postalCode: body.postalCode ?? null,
        city: body.city ?? null,
        executorFskattApproved: body.executorFskattApproved === true,
        executorFskattValidatedOn: body.executorFskattValidatedOn ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husCaseMatch = matchPath(path, "/v1/hus/cases/:husCaseId");
  if (husCaseMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "hus_case",
      scopeCode: "project"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getHusCase({
        companyId,
        husCaseId: husCaseMatch.husCaseId
      })
    );
    return;
  }

  const husClassifyMatch = matchPath(path, "/v1/hus/cases/:husCaseId/classify");
  if (husClassifyMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_case",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.classifyHusCase({
        companyId,
        husCaseId: husClassifyMatch.husCaseId,
        serviceLines: body.serviceLines || [],
        buyers: body.buyers || [],
        housingFormCode: body.housingFormCode ?? null,
        propertyDesignation: body.propertyDesignation ?? null,
        apartmentDesignation: body.apartmentDesignation ?? null,
        housingAssociationOrgNumber: body.housingAssociationOrgNumber ?? null,
        serviceAddressLine1: body.serviceAddressLine1 ?? null,
        postalCode: body.postalCode ?? null,
        city: body.city ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husInvoiceMatch = matchPath(path, "/v1/hus/cases/:husCaseId/invoice");
    if (husInvoiceMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_case",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.markHusCaseInvoiced({
        companyId,
        husCaseId: husInvoiceMatch.husCaseId,
        customerInvoiceId: body.customerInvoiceId ?? null,
        invoiceNumber: body.invoiceNumber ?? null,
        invoiceIssuedOn: body.invoiceIssuedOn ?? null,
        invoiceGrossAmount: body.invoiceGrossAmount ?? null,
        invoiceLaborAmount: body.invoiceLaborAmount ?? null,
        invoicePreliminaryReductionAmount: body.invoicePreliminaryReductionAmount ?? null,
        invoiceCustomerShareAmount: body.invoiceCustomerShareAmount ?? null,
        housingFormCode: body.housingFormCode ?? null,
        propertyDesignation: body.propertyDesignation ?? null,
        apartmentDesignation: body.apartmentDesignation ?? null,
        housingAssociationOrgNumber: body.housingAssociationOrgNumber ?? null,
        serviceAddressLine1: body.serviceAddressLine1 ?? null,
        postalCode: body.postalCode ?? null,
        city: body.city ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
      );
      return;
    }

    const husReadinessMatch = matchPath(path, "/v1/hus/cases/:husCaseId/readiness");
    if (husReadinessMatch && req.method === "GET") {
      const companyId = requireText(
        url.searchParams.get("companyId"),
        "company_id_required",
        "companyId query parameter is required."
      );
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req),
        companyId,
        permissionCode: "company.read",
        objectType: "hus_case",
        scopeCode: "project"
      });
      assertFinanceOperationsAccess({ principal });
      writeJson(
        res,
        200,
        platform.evaluateHusCaseReadiness({
          companyId,
          husCaseId: husReadinessMatch.husCaseId,
          asOfDate: url.searchParams.get("asOfDate") || null
        })
      );
      return;
    }

    const husPaymentsMatch = matchPath(path, "/v1/hus/cases/:husCaseId/payments");
  if (husPaymentsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_case",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.recordHusCustomerPayment({
        companyId,
        husCaseId: husPaymentsMatch.husCaseId,
        paidAmount: body.paidAmount,
        paidOn: body.paidOn,
        paymentChannel: body.paymentChannel,
        paymentReference: body.paymentReference ?? null,
        externalTraceId: body.externalTraceId ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husCaseClaimsMatch = matchPath(path, "/v1/hus/cases/:husCaseId/claims");
    if (husCaseClaimsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "hus_claim",
      scopeCode: "project"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listHusClaims({
        companyId,
        husCaseId: husCaseClaimsMatch.husCaseId
      })
      });
      return;
    }

    const husRecoveryCandidatesMatch = matchPath(path, "/v1/hus/cases/:husCaseId/recovery-candidates");
    if (husRecoveryCandidatesMatch && req.method === "GET") {
      const companyId = requireText(
        url.searchParams.get("companyId"),
        "company_id_required",
        "companyId query parameter is required."
      );
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req),
        companyId,
        permissionCode: "company.read",
        objectType: "hus_case",
        scopeCode: "project"
      });
      assertFinanceOperationsAccess({ principal });
      writeJson(res, 200, {
        items: platform.listHusRecoveryCandidates({
          companyId,
          husCaseId: husRecoveryCandidatesMatch.husCaseId,
          status: url.searchParams.get("status") || null
        })
      });
      return;
    }

    if (husCaseClaimsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_claim",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createHusClaim({
        companyId,
        husCaseId: husCaseClaimsMatch.husCaseId,
        requestedAmount: body.requestedAmount ?? null,
        transportType: body.transportType ?? "json",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husClaimMatch = matchPath(path, "/v1/hus/claims/:husClaimId");
  if (husClaimMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "hus_claim",
      scopeCode: "project"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(
      res,
      200,
      platform.getHusClaim({
        companyId,
        husClaimId: husClaimMatch.husClaimId
      })
    );
    return;
  }

  const husClaimSubmitMatch = matchPath(path, "/v1/hus/claims/:husClaimId/submit");
  if (husClaimSubmitMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_claim",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.submitHusClaim({
        companyId,
        husClaimId: husClaimSubmitMatch.husClaimId,
        submittedOn: body.submittedOn ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husClaimDecisionsMatch = matchPath(path, "/v1/hus/claims/:husClaimId/decisions");
    if (husClaimDecisionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_claim",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.recordHusDecision({
        companyId,
        husClaimId: husClaimDecisionsMatch.husClaimId,
        decisionDate: body.decisionDate,
        approvedAmount: body.approvedAmount,
        rejectedAmount: body.rejectedAmount ?? null,
        reasonCode: body.reasonCode,
        rejectedOutcomeCode: body.rejectedOutcomeCode ?? "customer_reinvoice",
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
      );
      return;
    }

    if (req.method === "GET" && path === "/v1/hus/decision-differences") {
      const companyId = requireText(
        url.searchParams.get("companyId"),
        "company_id_required",
        "companyId query parameter is required."
      );
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req),
        companyId,
        permissionCode: "company.read",
        objectType: "hus_case",
        scopeCode: "project"
      });
      assertFinanceOperationsAccess({ principal });
      writeJson(res, 200, {
        items: platform.listHusDecisionDifferences({
          companyId,
          husCaseId: url.searchParams.get("husCaseId") || null,
          status: url.searchParams.get("status") || null
        })
      });
      return;
    }

    const husDecisionDifferenceResolveMatch = matchPath(path, "/v1/hus/decision-differences/:husDecisionDifferenceId/resolve");
    if (husDecisionDifferenceResolveMatch && req.method === "POST") {
      const body = await readJsonBody(req);
      const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req, body),
        companyId,
        permissionCode: "company.manage",
        objectType: "hus_case",
        scopeCode: "project"
      });
      writeJson(
        res,
        200,
        platform.resolveHusDecisionDifference({
          companyId,
          husDecisionDifferenceId: husDecisionDifferenceResolveMatch.husDecisionDifferenceId,
          resolutionCode: body.resolutionCode,
          resolutionNote: body.resolutionNote ?? null,
          actorId: principal.userId,
          correlationId: body.correlationId || createCorrelationId()
        })
      );
      return;
    }

    const husClaimPayoutsMatch = matchPath(path, "/v1/hus/claims/:husClaimId/payouts");
  if (husClaimPayoutsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_claim",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.recordHusPayout({
        companyId,
        husClaimId: husClaimPayoutsMatch.husClaimId,
        payoutAmount: body.payoutAmount,
        payoutDate: body.payoutDate,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husCreditAdjustmentsMatch = matchPath(path, "/v1/hus/cases/:husCaseId/credit-adjustments");
  if (husCreditAdjustmentsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_case",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.registerHusCreditAdjustment({
        companyId,
        husCaseId: husCreditAdjustmentsMatch.husCaseId,
        adjustmentAmount: body.adjustmentAmount,
        adjustmentDate: body.adjustmentDate,
        reasonCode: body.reasonCode,
        afterPayoutFlag: body.afterPayoutFlag ?? false,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const husRecoveriesMatch = matchPath(path, "/v1/hus/cases/:husCaseId/recoveries");
  if (husRecoveriesMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "hus_case",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
        platform.recordHusRecovery({
          companyId,
          husCaseId: husRecoveriesMatch.husCaseId,
          husRecoveryCandidateId: body.husRecoveryCandidateId ?? null,
          recoveryDate: body.recoveryDate,
          recoveryAmount: body.recoveryAmount,
          reasonCode: body.reasonCode,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/hus/audit-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "hus_case",
      scopeCode: "project"
    });
    assertFinanceOperationsAccess({ principal });
    writeJson(res, 200, {
      items: platform.listHusAuditEvents({
        companyId,
        husCaseId: url.searchParams.get("husCaseId") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/personalliggare/sites") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "construction_site",
      scopeCode: "project"
    });
    const thresholdRequired = url.searchParams.has("thresholdRequired")
      ? String(url.searchParams.get("thresholdRequired")).toLowerCase() === "true"
      : null;
    writeJson(res, 200, {
      items: platform.listConstructionSites({
        companyId,
        thresholdRequired
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/personalliggare/industry-packs") {
    writeJson(res, 200, {
      items: platform.listIndustryPacks()
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/personalliggare/sites") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "construction_site",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createConstructionSite({
        companyId,
        constructionSiteId: body.constructionSiteId ?? null,
        siteCode: body.siteCode,
        siteName: body.siteName,
        siteAddress: body.siteAddress,
        builderOrgNo: body.builderOrgNo,
        estimatedTotalCostExVat: body.estimatedTotalCostExVat,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        projectId: body.projectId ?? null,
        industryPackCode: body.industryPackCode ?? "bygg",
        workplaceIdentifier: body.workplaceIdentifier ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const personalliggareSiteMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId");
  if (personalliggareSiteMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "construction_site",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.getConstructionSite({
        companyId,
        constructionSiteId: personalliggareSiteMatch.constructionSiteId
      })
    );
    return;
  }

  const personalliggareRegistrationsMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/registrations");
  if (personalliggareRegistrationsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "construction_site_registration",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listConstructionSiteRegistrations({
        companyId,
        constructionSiteId: personalliggareRegistrationsMatch.constructionSiteId
      })
    });
    return;
  }

  if (personalliggareRegistrationsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "construction_site_registration",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
        platform.createConstructionSiteRegistration({
          companyId,
          constructionSiteId: personalliggareRegistrationsMatch.constructionSiteId,
          registrationReference: body.registrationReference,
          status: body.status ?? "registered",
          checklistItems: body.checklistItems || [],
          registeredOn: body.registeredOn ?? null,
          equipmentStatus: body.equipmentStatus ?? null,
          actorId: principal.userId,
          correlationId: body.correlationId || createCorrelationId()
        })
      );
      return;
  }

  const personalliggareAttendanceMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/attendance-events");
    if (personalliggareAttendanceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "attendance_event",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listAttendanceEvents({
        companyId,
        constructionSiteId: personalliggareAttendanceMatch.constructionSiteId,
        workerIdentityValue: url.searchParams.get("workerIdentityValue") || null
      })
    });
      return;
    }

    const personalliggareIdentitySnapshotsMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/identity-snapshots");
    if (personalliggareIdentitySnapshotsMatch && req.method === "GET") {
      const companyId = requireText(
        url.searchParams.get("companyId"),
        "company_id_required",
        "companyId query parameter is required."
      );
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req),
        companyId,
        permissionCode: "company.read",
        objectType: "construction_site",
        scopeCode: "project"
      });
      assertPersonalliggareControlReadAccess({ principal });
      writeJson(res, 200, {
        items: platform.listAttendanceIdentitySnapshots({
          companyId,
          constructionSiteId: personalliggareIdentitySnapshotsMatch.constructionSiteId
        })
      });
      return;
    }

    const personalliggareContractorSnapshotsMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/contractor-snapshots");
    if (personalliggareContractorSnapshotsMatch && req.method === "GET") {
      const companyId = requireText(
        url.searchParams.get("companyId"),
        "company_id_required",
        "companyId query parameter is required."
      );
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req),
        companyId,
        permissionCode: "company.read",
        objectType: "construction_site",
        scopeCode: "project"
      });
      assertPersonalliggareControlReadAccess({ principal });
      writeJson(res, 200, {
        items: platform.listContractorSnapshots({
          companyId,
          constructionSiteId: personalliggareContractorSnapshotsMatch.constructionSiteId
        })
      });
      return;
    }

    if (personalliggareAttendanceMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "attendance_event",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.recordAttendanceEvent({
        companyId,
        constructionSiteId: personalliggareAttendanceMatch.constructionSiteId,
        employmentId: body.employmentId ?? null,
        workerIdentityType: body.workerIdentityType ?? "personnummer",
        workerIdentityValue: body.workerIdentityValue,
          fullNameSnapshot: body.fullNameSnapshot,
          employerOrgNo: body.employerOrgNo,
          contractorOrgNo: body.contractorOrgNo,
          roleAtWorkplace: body.roleAtWorkplace ?? "worker",
          clientEventId: body.clientEventId ?? null,
          eventType: body.eventType,
          eventTimestamp: body.eventTimestamp,
        sourceChannel: body.sourceChannel,
        deviceId: body.deviceId ?? null,
        offlineFlag: body.offlineFlag ?? false,
        geoContext: body.geoContext || {},
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const personalliggareCorrectionsMatch = matchPath(path, "/v1/personalliggare/attendance-events/:attendanceEventId/corrections");
  if (personalliggareCorrectionsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "attendance_correction",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
        platform.correctAttendanceEvent({
          companyId,
          attendanceEventId: personalliggareCorrectionsMatch.attendanceEventId,
          correctedTimestamp: body.correctedTimestamp ?? null,
          correctedEventType: body.correctedEventType ?? null,
          correctedWorkerIdentityValue: body.correctedWorkerIdentityValue ?? null,
          correctedEmployerOrgNo: body.correctedEmployerOrgNo ?? null,
          correctedContractorOrgNo: body.correctedContractorOrgNo ?? null,
          correctedRoleAtWorkplace: body.correctedRoleAtWorkplace ?? null,
          correctionReason: body.correctionReason,
          actorId: principal.userId,
          correlationId: body.correlationId || createCorrelationId()
        })
      );
    return;
  }

  const personalliggareKioskMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices");
  if (personalliggareKioskMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "kiosk_device",
      scopeCode: "project"
    });
    assertPersonalliggareControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listKioskDevices({
        companyId,
        constructionSiteId: personalliggareKioskMatch.constructionSiteId
      })
    });
    return;
  }

    if (personalliggareKioskMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "kiosk_device",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createKioskDevice({
        companyId,
        constructionSiteId: personalliggareKioskMatch.constructionSiteId,
        deviceCode: body.deviceCode,
        displayName: body.displayName,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
      );
      return;
    }

    const personalliggareKioskTrustMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/trust");
    if (personalliggareKioskTrustMatch && req.method === "POST") {
      const body = await readJsonBody(req);
      const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req, body),
        companyId,
        permissionCode: "company.manage",
        objectType: "construction_site",
        scopeCode: "project"
      });
      writeJson(
        res,
        200,
        platform.trustKioskDevice({
          companyId,
          constructionSiteId: personalliggareKioskTrustMatch.constructionSiteId,
          kioskDeviceId: personalliggareKioskTrustMatch.kioskDeviceId,
          actorId: principal.userId,
          correlationId: body.correlationId || createCorrelationId()
        })
      );
      return;
    }

    const personalliggareKioskRevokeMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices/:kioskDeviceId/revoke");
    if (personalliggareKioskRevokeMatch && req.method === "POST") {
      const body = await readJsonBody(req);
      const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
      const principal = authorizeCompanyAccess({
        platform,
        sessionToken: readSessionToken(req, body),
        companyId,
        permissionCode: "company.manage",
        objectType: "construction_site",
        scopeCode: "project"
      });
      writeJson(
        res,
        200,
        platform.revokeKioskDevice({
          companyId,
          constructionSiteId: personalliggareKioskRevokeMatch.constructionSiteId,
          kioskDeviceId: personalliggareKioskRevokeMatch.kioskDeviceId,
          actorId: principal.userId,
          correlationId: body.correlationId || createCorrelationId()
        })
      );
      return;
    }

    const personalliggareExportsMatch = matchPath(path, "/v1/personalliggare/sites/:constructionSiteId/exports");
  if (personalliggareExportsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "attendance_export",
      scopeCode: "project"
    });
    assertPersonalliggareControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAttendanceExports({
        companyId,
        constructionSiteId: personalliggareExportsMatch.constructionSiteId
      })
    });
    return;
  }

  if (personalliggareExportsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "attendance_export",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.exportAttendanceControlChain({
        companyId,
        constructionSiteId: personalliggareExportsMatch.constructionSiteId,
        exportType: body.exportType,
        exportDate: body.exportDate ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/personalliggare/audit-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "construction_site",
      scopeCode: "project"
    });
    assertPersonalliggareControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listAttendanceAuditEvents({
        companyId,
        constructionSiteId: url.searchParams.get("constructionSiteId") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/egenkontroll/templates") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "checklist_template",
      scopeCode: "project"
    });
    assertEgenkontrollControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listChecklistTemplates({
        companyId,
        templateCode: url.searchParams.get("templateCode") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/egenkontroll/templates") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_template",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createChecklistTemplate({
        companyId,
        checklistTemplateId: body.checklistTemplateId ?? null,
        templateCode: body.templateCode,
        displayName: body.displayName,
        industryPackCode: body.industryPackCode ?? "bygg",
        riskClassCode: body.riskClassCode ?? "standard",
        sections: body.sections,
        requiredSignoffRoleCodes: Array.isArray(body.requiredSignoffRoleCodes) ? body.requiredSignoffRoleCodes : ["site_lead"],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollTemplateMatch = matchPath(path, "/v1/egenkontroll/templates/:checklistTemplateId");
  if (egenkontrollTemplateMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "checklist_template",
      scopeCode: "project"
    });
    assertEgenkontrollControlReadAccess({ principal });
    writeJson(
      res,
      200,
      platform.getChecklistTemplate({
        companyId,
        checklistTemplateId: egenkontrollTemplateMatch.checklistTemplateId
      })
    );
    return;
  }

  const egenkontrollTemplateActivateMatch = matchPath(path, "/v1/egenkontroll/templates/:checklistTemplateId/activate");
  if (egenkontrollTemplateActivateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_template",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.activateChecklistTemplate({
        companyId,
        checklistTemplateId: egenkontrollTemplateActivateMatch.checklistTemplateId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/egenkontroll/instances") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "checklist_instance",
      scopeCode: "project"
    });
    assertEgenkontrollControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listChecklistInstances({
        companyId,
        projectId: url.searchParams.get("projectId") || null,
        workOrderId: url.searchParams.get("workOrderId") || null,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/egenkontroll/instances") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_instance",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.createChecklistInstance({
        companyId,
        checklistInstanceId: body.checklistInstanceId ?? null,
        checklistTemplateId: body.checklistTemplateId,
        projectId: body.projectId,
        workOrderId: body.workOrderId ?? null,
        assignedToUserId: body.assignedToUserId ?? null,
        dueDate: body.dueDate ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollInstanceMatch = matchPath(path, "/v1/egenkontroll/instances/:checklistInstanceId");
  if (egenkontrollInstanceMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "checklist_instance",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.getChecklistInstance({
        companyId,
        checklistInstanceId: egenkontrollInstanceMatch.checklistInstanceId
      })
    );
    return;
  }

  const egenkontrollInstanceStartMatch = matchPath(path, "/v1/egenkontroll/instances/:checklistInstanceId/start");
  if (egenkontrollInstanceStartMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_instance",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.startChecklistInstance({
        companyId,
        checklistInstanceId: egenkontrollInstanceStartMatch.checklistInstanceId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollInstanceOutcomesMatch = matchPath(path, "/v1/egenkontroll/instances/:checklistInstanceId/outcomes");
  if (egenkontrollInstanceOutcomesMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_instance",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.recordChecklistPointOutcome({
        companyId,
        checklistInstanceId: egenkontrollInstanceOutcomesMatch.checklistInstanceId,
        pointCode: body.pointCode,
        resultCode: body.resultCode,
        note: body.note ?? null,
        documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollInstanceDeviationsMatch = matchPath(path, "/v1/egenkontroll/instances/:checklistInstanceId/deviations");
  if (egenkontrollInstanceDeviationsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "checklist_deviation",
      scopeCode: "project"
    });
    assertEgenkontrollControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listChecklistDeviations({
        companyId,
        checklistInstanceId: egenkontrollInstanceDeviationsMatch.checklistInstanceId,
        status: url.searchParams.get("status") || null
      })
    });
    return;
  }

  if (egenkontrollInstanceDeviationsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_deviation",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.raiseChecklistDeviation({
        companyId,
        checklistInstanceId: egenkontrollInstanceDeviationsMatch.checklistInstanceId,
        pointCode: body.pointCode,
        severityCode: body.severityCode ?? "major",
        title: body.title,
        description: body.description,
        documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollDeviationAcknowledgeMatch = matchPath(path, "/v1/egenkontroll/deviations/:checklistDeviationId/acknowledge");
  if (egenkontrollDeviationAcknowledgeMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_deviation",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.acknowledgeChecklistDeviation({
        companyId,
        checklistDeviationId: egenkontrollDeviationAcknowledgeMatch.checklistDeviationId,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollDeviationResolveMatch = matchPath(path, "/v1/egenkontroll/deviations/:checklistDeviationId/resolve");
  if (egenkontrollDeviationResolveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_deviation",
      scopeCode: "project"
    });
    writeJson(
      res,
      200,
      platform.resolveChecklistDeviation({
        companyId,
        checklistDeviationId: egenkontrollDeviationResolveMatch.checklistDeviationId,
        resolutionNote: body.resolutionNote,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  const egenkontrollInstanceSignoffsMatch = matchPath(path, "/v1/egenkontroll/instances/:checklistInstanceId/signoffs");
  if (egenkontrollInstanceSignoffsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "checklist_signoff",
      scopeCode: "project"
    });
    assertEgenkontrollControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listChecklistSignoffs({
        companyId,
        checklistInstanceId: egenkontrollInstanceSignoffsMatch.checklistInstanceId
      })
    });
    return;
  }

  if (egenkontrollInstanceSignoffsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "checklist_signoff",
      scopeCode: "project"
    });
    writeJson(
      res,
      201,
      platform.signOffChecklist({
        companyId,
        checklistInstanceId: egenkontrollInstanceSignoffsMatch.checklistInstanceId,
        signoffRoleCode: body.signoffRoleCode,
        note: body.note ?? null,
        actorId: principal.userId,
        correlationId: body.correlationId || createCorrelationId()
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/field/inventory/locations") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "inventory_location",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listInventoryLocations({
        companyId,
        locationType: url.searchParams.get("locationType") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/field/inventory/locations") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "inventory_location",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createInventoryLocation({
      companyId,
      inventoryLocationId: body.inventoryLocationId ?? null,
      locationCode: body.locationCode,
      displayName: body.displayName,
      locationType: body.locationType ?? "warehouse",
      projectId: body.projectId ?? null,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/field/inventory/items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "inventory_item",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listInventoryItems({
        companyId,
        inventoryLocationId: url.searchParams.get("inventoryLocationId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/field/inventory/items") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "inventory_item",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createInventoryItem({
      companyId,
      inventoryItemId: body.inventoryItemId ?? null,
      itemCode: body.itemCode,
      displayName: body.displayName,
      unitCode: body.unitCode ?? "ea",
      arItemId: body.arItemId ?? null,
      salesUnitPriceAmount: body.salesUnitPriceAmount ?? 0,
      locationBalances: body.locationBalances || [],
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/field/inventory/balances") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "inventory_balance",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listInventoryBalances({
        companyId,
        inventoryItemId: url.searchParams.get("inventoryItemId") || null,
        inventoryLocationId: url.searchParams.get("inventoryLocationId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/field/inventory/balances") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "inventory_balance",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createOrReplaceInventoryBalance({
      companyId,
      inventoryItemId: body.inventoryItemId,
      inventoryLocationId: body.inventoryLocationId,
      onHandQuantity: body.onHandQuantity ?? 0,
      reservedQuantity: body.reservedQuantity ?? 0,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/field/work-orders") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_work_order",
      scopeCode: "project"
    });
      writeJson(res, 200, {
        items: platform.listWorkOrders({
          companyId,
          status: url.searchParams.get("status") || null,
          employmentId: url.searchParams.get("employmentId") || null,
          projectId: url.searchParams.get("projectId") || null
        })
      });
    return;
  }

  if (req.method === "POST" && path === "/v1/field/work-orders") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_work_order",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createWorkOrder({
      companyId,
      workOrderId: body.workOrderId ?? null,
      workOrderNo: body.workOrderNo ?? null,
      projectId: body.projectId,
      customerId: body.customerId ?? null,
      displayName: body.displayName,
      description: body.description ?? null,
      serviceTypeCode: body.serviceTypeCode ?? "service",
      priorityCode: body.priorityCode ?? "normal",
      scheduledStartAt: body.scheduledStartAt ?? null,
      scheduledEndAt: body.scheduledEndAt ?? null,
      laborItemId: body.laborItemId ?? null,
      laborRateAmount: body.laborRateAmount ?? 0,
      signatureRequired: body.signatureRequired !== false,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldWorkOrderMatch = matchPath(path, "/v1/field/work-orders/:workOrderId");
  if (fieldWorkOrderMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_work_order",
      scopeCode: "project"
    });
    writeJson(res, 200, platform.getWorkOrder({
      companyId,
      workOrderId: fieldWorkOrderMatch.workOrderId
    }));
    return;
  }

  const fieldDispatchesMatch = matchPath(path, "/v1/field/work-orders/:workOrderId/dispatches");
  if (fieldDispatchesMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_dispatch_assignment",
      scopeCode: "project"
    });
    assertFieldControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listDispatchAssignments({
        companyId,
        workOrderId: fieldDispatchesMatch.workOrderId
      })
    });
    return;
  }

  if (fieldDispatchesMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_dispatch_assignment",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createDispatchAssignment({
      companyId,
      workOrderId: fieldDispatchesMatch.workOrderId,
      employmentId: body.employmentId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldDispatchEnRouteMatch = matchPath(
    path,
    "/v1/field/work-orders/:workOrderId/dispatches/:dispatchAssignmentId/en-route"
  );
  if (fieldDispatchEnRouteMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_dispatch_assignment",
      scopeCode: "project"
    });
    writeJson(res, 200, platform.markDispatchEnRoute({
      companyId,
      workOrderId: fieldDispatchEnRouteMatch.workOrderId,
      dispatchAssignmentId: fieldDispatchEnRouteMatch.dispatchAssignmentId,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldDispatchOnSiteMatch = matchPath(
    path,
    "/v1/field/work-orders/:workOrderId/dispatches/:dispatchAssignmentId/on-site"
  );
  if (fieldDispatchOnSiteMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_dispatch_assignment",
      scopeCode: "project"
    });
    writeJson(res, 200, platform.markDispatchOnSite({
      companyId,
      workOrderId: fieldDispatchOnSiteMatch.workOrderId,
      dispatchAssignmentId: fieldDispatchOnSiteMatch.dispatchAssignmentId,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldMaterialWithdrawalsMatch = matchPath(path, "/v1/field/work-orders/:workOrderId/material-withdrawals");
  if (fieldMaterialWithdrawalsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_material_withdrawal",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listMaterialWithdrawals({
        companyId,
        workOrderId: fieldMaterialWithdrawalsMatch.workOrderId
      })
    });
    return;
  }

  if (fieldMaterialWithdrawalsMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_material_withdrawal",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createMaterialWithdrawal({
      companyId,
      workOrderId: fieldMaterialWithdrawalsMatch.workOrderId,
      inventoryItemId: body.inventoryItemId,
      inventoryLocationId: body.inventoryLocationId,
      quantity: body.quantity,
      sourceChannel: body.sourceChannel ?? "api",
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldSignaturesMatch = matchPath(path, "/v1/field/work-orders/:workOrderId/customer-signatures");
  if (fieldSignaturesMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_customer_signature",
      scopeCode: "project"
    });
    writeJson(res, 200, {
      items: platform.listCustomerSignatures({
        companyId,
        workOrderId: fieldSignaturesMatch.workOrderId
      })
    });
    return;
  }

  if (fieldSignaturesMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_customer_signature",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.captureCustomerSignature({
      companyId,
      workOrderId: fieldSignaturesMatch.workOrderId,
      signerName: body.signerName,
      signedAt: body.signedAt ?? null,
      signatureText: body.signatureText,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldCompleteMatch = matchPath(path, "/v1/field/work-orders/:workOrderId/complete");
  if (fieldCompleteMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_work_order",
      scopeCode: "project"
    });
    writeJson(res, 200, platform.completeWorkOrder({
      companyId,
      workOrderId: fieldCompleteMatch.workOrderId,
      completedAt: body.completedAt ?? null,
      laborMinutes: body.laborMinutes,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  const fieldInvoiceMatch = matchPath(path, "/v1/field/work-orders/:workOrderId/invoice");
  if (fieldInvoiceMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_work_order",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.createWorkOrderInvoice({
      companyId,
      workOrderId: fieldInvoiceMatch.workOrderId,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/field/mobile/today") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const employmentId = requireText(
      url.searchParams.get("employmentId"),
      "employment_id_required",
      "employmentId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_work_order",
      scopeCode: "project"
    });
    writeJson(res, 200, platform.listMobileToday({
      companyId,
      employmentId
    }));
    return;
  }

  if (req.method === "POST" && path === "/v1/field/sync/envelopes") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "field_sync_envelope",
      scopeCode: "project"
    });
    writeJson(res, 201, platform.syncOfflineEnvelope({
      companyId,
      clientMutationId: body.clientMutationId,
      clientDeviceId: body.clientDeviceId,
      clientUserId: body.clientUserId ?? principal.userId,
      objectType: body.objectType,
      localObjectId: body.localObjectId ?? null,
      serverObjectId: body.serverObjectId ?? null,
      mutationType: body.mutationType,
      baseServerVersion: body.baseServerVersion ?? null,
      payload: body.payload || {},
      actorId: principal.userId,
      correlationId: body.correlationId || createCorrelationId()
    }));
    return;
  }

  if (req.method === "GET" && path === "/v1/field/audit-events") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "field_work_order",
      scopeCode: "project"
    });
    assertFieldControlReadAccess({ principal });
    writeJson(res, 200, {
      items: platform.listFieldAuditEvents({
        companyId,
        projectId: url.searchParams.get("projectId") || null,
        workOrderId: url.searchParams.get("workOrderId") || null
      })
    });
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/pay-items") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pay_item",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayItems({
        companyId,
        activeOnly: url.searchParams.get("activeOnly") === "true"
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/pay-items") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "pay_item",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPayItem({
        companyId,
        payItemCode: body.payItemCode,
        payItemType: body.payItemType,
        displayName: body.displayName,
        calculationBasis: body.calculationBasis,
        unitCode: body.unitCode,
        compensationBucket: body.compensationBucket,
        defaultUnitAmount: body.defaultUnitAmount ?? null,
        defaultRateFactor: body.defaultRateFactor ?? null,
        taxTreatmentCode: body.taxTreatmentCode,
        employerContributionTreatmentCode: body.employerContributionTreatmentCode,
        agiMappingCode: body.agiMappingCode ?? null,
        ledgerAccountCode: body.ledgerAccountCode,
        defaultDimensions: body.defaultDimensions || {},
        affectsVacationBasis: body.affectsVacationBasis === true,
        affectsPensionBasis: body.affectsPensionBasis === true,
        includedInNetPay: body.includedInNetPay !== false,
        reportingOnly: body.reportingOnly === true,
        active: body.active !== false,
        actorId: principal.userId
      })
    );
    return;
  }

  const payItemMatch = matchPath(path, "/v1/payroll/pay-items/:payItemId");
  if (payItemMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pay_item",
      scopeCode: "payroll"
    });
    writeJson(res, 200, platform.getPayItem({ companyId, payItemId: payItemMatch.payItemId }));
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/pay-calendars") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pay_calendar",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayCalendars({
        companyId,
        activeOnly: url.searchParams.get("activeOnly") === "true"
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/pay-calendars") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "pay_calendar",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPayCalendar({
        companyId,
        payCalendarCode: body.payCalendarCode,
        displayName: body.displayName,
        frequencyCode: body.frequencyCode || "monthly",
        cutoffDay: body.cutoffDay ?? 5,
        payDay: body.payDay ?? 25,
        timezone: body.timezone || "Europe/Stockholm",
        defaultCurrencyCode: body.defaultCurrencyCode || "SEK",
        active: body.active !== false,
        actorId: principal.userId
      })
    );
    return;
  }

  const payCalendarMatch = matchPath(path, "/v1/payroll/pay-calendars/:payCalendarId");
  if (payCalendarMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "pay_calendar",
      scopeCode: "payroll"
    });
    writeJson(res, 200, platform.getPayCalendar({ companyId, payCalendarId: payCalendarMatch.payCalendarId }));
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/pay-runs") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayRuns({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null,
        runType: url.searchParams.get("runType") || null,
        employmentId: url.searchParams.get("employmentId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/pay-runs") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPayRun({
        companyId,
        sessionToken,
        payCalendarId: body.payCalendarId,
        reportingPeriod: body.reportingPeriod,
        payDate: body.payDate || null,
        runType: body.runType || "regular",
        employmentIds: Array.isArray(body.employmentIds) ? body.employmentIds : null,
        manualInputs: Array.isArray(body.manualInputs) ? body.manualInputs : [],
        retroAdjustments: Array.isArray(body.retroAdjustments) ? body.retroAdjustments : [],
        finalPayAdjustments: Array.isArray(body.finalPayAdjustments) ? body.finalPayAdjustments : [],
        leavePayItemMappings: Array.isArray(body.leavePayItemMappings) ? body.leavePayItemMappings : [],
        statutoryProfiles: Array.isArray(body.statutoryProfiles) ? body.statutoryProfiles : [],
        migrationBatchId: body.migrationBatchId || null,
        correctionOfPayRunId: body.correctionOfPayRunId || null,
        correctionReason: body.correctionReason || null,
        actorId: principal.userId
      })
    );
    return;
  }

  const payRunMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId");
  if (payRunMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(res, 200, platform.getPayRun({ companyId, payRunId: payRunMatch.payRunId }));
    return;
  }

  const payRunApproveMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId/approve");
  if (payRunApproveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.approvePayRun({
        companyId,
        payRunId: payRunApproveMatch.payRunId,
        actorId: principal.userId
      })
    );
    return;
  }

  const payRunExceptionsMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId/exceptions");
  if (payRunExceptionsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayrollExceptions({
        companyId,
        payRunId: payRunExceptionsMatch.payRunId,
        status: url.searchParams.get("status") || null,
        blockingOnly: url.searchParams.get("blockingOnly") === "true"
      })
    });
    return;
  }

  const payRunExceptionResolveMatch = matchPath(
    path,
    "/v1/payroll/pay-runs/:payRunId/exceptions/:payrollExceptionId/resolve"
  );
  if (payRunExceptionResolveMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.resolvePayrollException({
        companyId,
        payRunId: payRunExceptionResolveMatch.payRunId,
        payrollExceptionId: payRunExceptionResolveMatch.payrollExceptionId,
        resolutionType: body.resolutionType || "resolved",
        note: body.note,
        actorId: principal.userId
      })
    );
    return;
  }

  const payRunCorrectionMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId/correction");
  if (payRunCorrectionMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const sessionToken = readSessionToken(req, body);
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken,
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    const sourceRun = platform.getPayRun({
      companyId,
      payRunId: payRunCorrectionMatch.payRunId
    });
    writeJson(
      res,
      201,
      platform.createPayRun({
        companyId,
        sessionToken,
        payCalendarId: body.payCalendarId || sourceRun.payCalendarId,
        reportingPeriod: body.reportingPeriod || sourceRun.reportingPeriod,
        payDate: body.payDate || null,
        runType: "correction",
        employmentIds: Array.isArray(body.employmentIds) ? body.employmentIds : sourceRun.employmentIds,
        manualInputs: Array.isArray(body.manualInputs) ? body.manualInputs : [],
        retroAdjustments: Array.isArray(body.retroAdjustments) ? body.retroAdjustments : [],
        finalPayAdjustments: Array.isArray(body.finalPayAdjustments) ? body.finalPayAdjustments : [],
        leavePayItemMappings: Array.isArray(body.leavePayItemMappings) ? body.leavePayItemMappings : [],
        statutoryProfiles: Array.isArray(body.statutoryProfiles) ? body.statutoryProfiles : [],
        migrationBatchId: body.migrationBatchId || sourceRun.migrationBatchId || null,
        correctionOfPayRunId: sourceRun.payRunId,
        correctionReason: body.correctionReason || null,
        actorId: principal.userId
      })
    );
    return;
  }

  const payRunPayslipsMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId/payslips");
  if (payRunPayslipsMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPaySlips({
        companyId,
        payRunId: payRunPayslipsMatch.payRunId
      })
    });
    return;
  }

  const payRunPayslipMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId/payslips/:employmentId");
  if (payRunPayslipMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getPaySlip({
        companyId,
        payRunId: payRunPayslipMatch.payRunId,
        employmentId: payRunPayslipMatch.employmentId
      })
    );
    return;
  }

  const payslipRegenerateMatch = matchPath(path, "/v1/payroll/pay-runs/:payRunId/payslips/:employmentId/regenerate");
  if (payslipRegenerateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll_run",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.regeneratePaySlip({
        companyId,
        payRunId: payslipRegenerateMatch.payRunId,
        employmentId: payslipRegenerateMatch.employmentId,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/agi-submissions") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listAgiSubmissions({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/agi-submissions") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createAgiSubmission({
        companyId,
        reportingPeriod: body.reportingPeriod,
        actorId: principal.userId
      })
    );
    return;
  }

  const agiSubmissionMatch = matchPath(path, "/v1/payroll/agi-submissions/:agiSubmissionId");
  if (agiSubmissionMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getAgiSubmission({
        companyId,
        agiSubmissionId: agiSubmissionMatch.agiSubmissionId
      })
    );
    return;
  }

  const agiSubmissionValidateMatch = matchPath(path, "/v1/payroll/agi-submissions/:agiSubmissionId/validate");
  if (agiSubmissionValidateMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.validateAgiSubmission({
        companyId,
        agiSubmissionId: agiSubmissionValidateMatch.agiSubmissionId
      })
    );
    return;
  }

  const agiSubmissionReadyMatch = matchPath(path, "/v1/payroll/agi-submissions/:agiSubmissionId/ready-for-sign");
  if (agiSubmissionReadyMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.markAgiSubmissionReadyForSign({
        companyId,
        agiSubmissionId: agiSubmissionReadyMatch.agiSubmissionId,
        actorId: principal.userId
      })
    );
    return;
  }

  const agiSubmissionSubmitMatch = matchPath(path, "/v1/payroll/agi-submissions/:agiSubmissionId/submit");
  if (agiSubmissionSubmitMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.submitAgiSubmission({
        companyId,
        agiSubmissionId: agiSubmissionSubmitMatch.agiSubmissionId,
        actorId: principal.userId,
        mode: body.mode || "test",
        simulatedOutcome: body.simulatedOutcome || "accepted",
        receiptMessage: body.receiptMessage ?? null,
        receiptErrors: Array.isArray(body.receiptErrors) ? body.receiptErrors : []
      })
    );
    return;
  }

  const agiSubmissionCorrectionMatch = matchPath(path, "/v1/payroll/agi-submissions/:agiSubmissionId/correction");
  if (agiSubmissionCorrectionMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createAgiCorrectionVersion({
        companyId,
        agiSubmissionId: agiSubmissionCorrectionMatch.agiSubmissionId,
        correctionReason: body.correctionReason,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/postings") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayrollPostings({
        companyId,
        payRunId: url.searchParams.get("payRunId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/postings") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPayrollPosting({
        companyId,
        payRunId: body.payRunId,
        actorId: principal.userId
      })
    );
    return;
  }

  const payrollPostingMatch = matchPath(path, "/v1/payroll/postings/:payrollPostingId");
  if (payrollPostingMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getPayrollPosting({
        companyId,
        payrollPostingId: payrollPostingMatch.payrollPostingId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/payout-batches") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listPayrollPayoutBatches({
        companyId,
        payRunId: url.searchParams.get("payRunId") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/payout-batches") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createPayrollPayoutBatch({
        companyId,
        payRunId: body.payRunId,
        bankAccountId: body.bankAccountId ?? null,
        actorId: principal.userId
      })
    );
    return;
  }

  const payrollPayoutBatchMatch = matchPath(path, "/v1/payroll/payout-batches/:payrollPayoutBatchId");
  if (payrollPayoutBatchMatch && req.method === "GET") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.getPayrollPayoutBatch({
        companyId,
        payrollPayoutBatchId: payrollPayoutBatchMatch.payrollPayoutBatchId
      })
    );
    return;
  }

  const payrollPayoutMatchBankMatch = matchPath(path, "/v1/payroll/payout-batches/:payrollPayoutBatchId/match-bank");
  if (payrollPayoutMatchBankMatch && req.method === "POST") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      200,
      platform.matchPayrollPayoutBatch({
        companyId,
        payrollPayoutBatchId: payrollPayoutMatchBankMatch.payrollPayoutBatchId,
        bankEventId: body.bankEventId,
        matchedOn: body.matchedOn ?? null,
        actorId: principal.userId
      })
    );
    return;
  }

  if (req.method === "GET" && path === "/v1/payroll/vacation-liability-snapshots") {
    const companyId = requireText(
      url.searchParams.get("companyId"),
      "company_id_required",
      "companyId query parameter is required."
    );
    authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req),
      companyId,
      permissionCode: "company.read",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(res, 200, {
      items: platform.listVacationLiabilitySnapshots({
        companyId,
        reportingPeriod: url.searchParams.get("reportingPeriod") || null
      })
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/payroll/vacation-liability-snapshots") {
    const body = await readJsonBody(req);
    const companyId = requireText(body.companyId, "company_id_required", "Company id is required.");
    const principal = authorizeCompanyAccess({
      platform,
      sessionToken: readSessionToken(req, body),
      companyId,
      permissionCode: "company.manage",
      objectType: "payroll",
      scopeCode: "payroll"
    });
    writeJson(
      res,
      201,
      platform.createVacationLiabilitySnapshot({
        companyId,
        reportingPeriod: body.reportingPeriod,
        actorId: principal.userId
      })
    );
    return;
  }

  writeJson(res, 404, { error: "not_found" });
}

function authorizeDocumentAccess({ platform, sessionToken, companyId, permissionCode }) {
  return authorizeCompanyAccess({
    platform,
    sessionToken,
    companyId,
    permissionCode,
    objectType: "document",
    scopeCode: "document"
  });
}

function authorizeCompanyAccess({ platform, sessionToken, companyId, permissionCode, objectType, scopeCode }) {
  const { principal, decision } = platform.checkAuthorization({
    sessionToken,
    action: permissionCode,
    resource: {
      companyId,
      objectType,
      objectId: companyId,
      scopeCode
    }
  });
  if (!decision.allowed) {
    throw createHttpError(403, decision.reasonCode, decision.explanation);
  }
  return principal;
}

function resolvePortalEmployee({ platform, companyId, email }) {
  const employee = platform.findEmployeeByEmail({
    companyId,
    email
  });
  if (!employee) {
    throw createHttpError(404, "employee_portal_employee_not_found", "No employee profile matched the signed-in company user.");
  }
  return employee;
}

function assertPortalEmployeeOwnsLeaveEntry(employee, leaveEntry) {
  if (leaveEntry.employeeId !== employee.employeeId) {
    throw createHttpError(403, "employee_portal_scope_denied", "Employee portal cannot access another employee's leave entry.");
  }
}

function assertPrincipalCanApproveLeaveEntry({ platform, principal, companyId, leaveEntry }) {
  if (principal.roles.includes("company_admin")) {
    return;
  }
  const managerEmployee = principal.email
    ? platform.findEmployeeByEmail({
        companyId,
        email: principal.email
      })
    : null;
  if (!managerEmployee) {
    throw createHttpError(403, "leave_approval_denied", "The signed-in user is not linked to the manager approval chain.");
  }
  const managerEmployments = platform.listEmployments({
    companyId,
    employeeId: managerEmployee.employeeId
  });
  if (!managerEmployments.some((employment) => employment.employmentId === leaveEntry.managerEmploymentId)) {
    throw createHttpError(403, "leave_approval_denied", "The signed-in user is not the active manager for this leave entry.");
  }
}

const ANNUAL_OPERATIONS_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);
const FINANCE_OPERATIONS_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);
const DESKTOP_SURFACE_READ_ROLE_CODES = new Set(["company_admin", "approver", "payroll_admin", "bureau_user"]);
const PERSONALLIGGARE_CONTROL_READ_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);
const PROJECT_WORKSPACE_READ_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);
const EGENKONTROLL_CONTROL_READ_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);
const FIELD_CONTROL_READ_ROLE_CODES = new Set(["company_admin", "approver", "bureau_user"]);

function assertAnnualOperationsAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedOperator = [...ANNUAL_OPERATIONS_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedOperator) {
    throw createHttpError(403, "annual_operations_role_forbidden", "Current actor is not allowed to access annual reporting or filing operations.");
  }
}

function assertFinanceOperationsAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedOperator = [...FINANCE_OPERATIONS_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedOperator) {
    throw createHttpError(403, "finance_operations_role_forbidden", "Current actor is not allowed to access finance operations worklists.");
  }
}

function assertDesktopSurfaceReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...DESKTOP_SURFACE_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(403, "desktop_surface_role_forbidden", "Current actor is not allowed to access desktop-only read models.");
  }
}

function assertPersonalliggareControlReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...PERSONALLIGGARE_CONTROL_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(
      403,
      "personalliggare_control_role_forbidden",
      "Current actor is not allowed to access personalliggare control, export or audit read models."
    );
  }
}

function assertProjectWorkspaceReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...PROJECT_WORKSPACE_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(
      403,
      "project_workspace_role_forbidden",
      "Current actor is not allowed to access project workspace or project control read models."
    );
  }
}

function assertEgenkontrollControlReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...EGENKONTROLL_CONTROL_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(
      403,
      "egenkontroll_control_role_forbidden",
      "Current actor is not allowed to access egenkontroll template, overview or deviation control read models."
    );
  }
}

function assertFieldControlReadAccess({ principal }) {
  const roleCodes = new Set((principal.roles || []).map((roleCode) => String(roleCode || "").toLowerCase()).filter(Boolean));
  const isAllowedReader = [...FIELD_CONTROL_READ_ROLE_CODES].some((roleCode) => roleCodes.has(roleCode));
  if (!isAllowedReader) {
    throw createHttpError(
      403,
      "field_control_role_forbidden",
      "Current actor is not allowed to access field dispatch, planning or audit read models."
    );
  }
}

function assertReadSurfaceRoleAccess({ platform, req, url, path }) {
  if (req.method !== "GET") {
    return;
  }
  const requiresFinanceOperationsAccess = isFinanceOperationsReadPath(path);
  const requiresDesktopSurfaceAccess = isDesktopSurfaceReadPath(path);
  if (!requiresFinanceOperationsAccess && !requiresDesktopSurfaceAccess) {
    return;
  }
  const companyId = url.searchParams.get("companyId");
  if (!companyId) {
    return;
  }
  const principal = authorizeCompanyAccess({
    platform,
    sessionToken: readSessionToken(req),
    companyId,
    permissionCode: "company.read",
    objectType: "company",
    scopeCode: "company"
  });
  if (requiresFinanceOperationsAccess) {
    assertFinanceOperationsAccess({ principal });
    return;
  }
  if (requiresDesktopSurfaceAccess) {
    assertDesktopSurfaceReadAccess({ principal });
  }
}

function isFinanceOperationsReadPath(path) {
  return (
    path.startsWith("/v1/ledger") ||
    path.startsWith("/v1/reporting") ||
    path.startsWith("/v1/vat") ||
    path.startsWith("/v1/ar") ||
    path.startsWith("/v1/ap")
  );
}

function isDesktopSurfaceReadPath(path) {
  return (
    path.startsWith("/v1/search") ||
    path.startsWith("/v1/saved-views") ||
    path.startsWith("/v1/dashboard")
  );
}

function buildSubmissionPayloadFromSource({ platform, companyId, sourceObjectType, sourceObjectId }) {
  const resolvedSourceType = requireText(sourceObjectType, "submission_source_object_type_required", "sourceObjectType is required.");
  const resolvedSourceId = requireText(sourceObjectId, "submission_source_object_id_required", "sourceObjectId is required.");
  if (resolvedSourceType === "tax_declaration_package") {
    const taxPackage = platform.getTaxDeclarationPackage({
      companyId,
      taxDeclarationPackageId: resolvedSourceId
    });
    return {
      sourceObjectType: resolvedSourceType,
      sourceObjectId: resolvedSourceId,
      taxDeclarationPackageId: taxPackage.taxDeclarationPackageId,
      annualReportPackageId: taxPackage.annualReportPackageId,
      annualReportVersionId: taxPackage.annualReportVersionId,
      packageCode: taxPackage.packageCode,
      declarationProfileCode: taxPackage.declarationProfileCode,
      packageFamilyCode: taxPackage.packageFamilyCode,
      fiscalYear: taxPackage.fiscalYear,
      outputChecksum: taxPackage.outputChecksum,
      evidencePackId: taxPackage.evidencePackId || null,
      authorityOverview: taxPackage.authorityOverview,
      submissionFamilies: taxPackage.submissionFamilies || [],
      exports: taxPackage.exports
    };
  }
  if (resolvedSourceType === "annual_report_package") {
    const annualPackage = platform.getAnnualReportPackage({
      companyId,
      packageId: resolvedSourceId
    });
    return {
      sourceObjectType: resolvedSourceType,
      sourceObjectId: resolvedSourceId,
      packageId: annualPackage.packageId,
      fiscalYear: annualPackage.fiscalYear,
      legalFormCode: annualPackage.legalFormCode,
      declarationProfileCode: annualPackage.declarationProfileCode,
      packageFamilyCode: annualPackage.packageFamilyCode,
      profileCode: annualPackage.profileCode,
      status: annualPackage.status,
      currentVersionId: annualPackage.currentVersion?.versionId || null,
      checksum: annualPackage.currentVersion?.checksum || null,
      evidencePackId: annualPackage.currentEvidencePack?.evidencePackId || null
    };
  }
  throw createHttpError(400, "submission_source_object_unsupported", "Automatic payload building is only supported for annual-reporting source objects.");
}

function matchPath(actualPath, template) {
  const actualParts = actualPath.split("/").filter(Boolean);
  const templateParts = template.split("/").filter(Boolean);
  if (actualParts.length !== templateParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const actualPart = actualParts[index];
    if (templatePart.startsWith(":")) {
      params[templatePart.slice(1)] = decodeURIComponent(actualPart);
      continue;
    }
    if (templatePart !== actualPart) {
      return null;
    }
  }
  return params;
}

function isPhase1Route(path) {
  return path.startsWith("/v1/auth") || path.startsWith("/v1/org") || path.startsWith("/v1/onboarding");
}

function isPhase2Route(path) {
  return path.startsWith("/v1/documents");
}

function isPhase2InboxRoute(path) {
  return path.startsWith("/v1/inbox");
}

function isPhase23Route(path) {
  return path.includes("/ocr/") || path.startsWith("/v1/review-tasks");
}

function isPhase3Route(path) {
  return path.startsWith("/v1/ledger") || path.startsWith("/v1/reporting") || path.startsWith("/v1/search") || path.startsWith("/v1/saved-views") || path.startsWith("/v1/dashboard");
}

function isPhase4Route(path) {
  return path.startsWith("/v1/vat");
}

function isPhase5Route(path) {
  return path.startsWith("/v1/ar");
}

function isPhase6Route(path) {
  return path.startsWith("/v1/ap") || path.startsWith("/v1/banking");
}

function isPhase7Route(path) {
  return path.startsWith("/v1/hr");
}

function isPhase72Route(path) {
  return path.startsWith("/v1/time");
}

function isPhase73Route(path) {
  return path.startsWith("/v1/hr/leave") || path.startsWith("/v1/hr/employee-portal");
}

function isPhase8Route(path) {
  return path.startsWith("/v1/payroll");
}

function isPhase91Route(path) {
  return path.startsWith("/v1/benefits");
}

function isPhase92Route(path) {
  return path.startsWith("/v1/travel");
}

function isPhase93Route(path) {
  return path.startsWith("/v1/pension");
}

function isPhase101Route(path) {
  return path.startsWith("/v1/projects") || path.startsWith("/v1/kalkyl");
}

function isPhase102Route(path) {
  return path.startsWith("/v1/field");
}

function isPhase103Route(path) {
  return (
    path.startsWith("/v1/hus") ||
    path.startsWith("/v1/personalliggare") ||
    path.startsWith("/v1/egenkontroll") ||
    path.includes("/change-orders") ||
    path.includes("/build-vat-decisions")
  );
}

function isPhase131Route(path) {
  return path.startsWith("/v1/public") || path.startsWith("/v1/public-api");
}

function isPhase132Route(path) {
  return path.startsWith("/v1/partners") || path.startsWith("/v1/jobs");
}

function isPhase133Route(path) {
  return path.startsWith("/v1/automation");
}

function isPhase141Route(path) {
  return path.startsWith("/v1/backoffice");
}

function isPhase142Route(path) {
  return path.startsWith("/v1/ops");
}

function isPhase143Route(path) {
  return path.startsWith("/v1/migration");
}

async function readJsonBody(req, allowEmpty = false) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return allowEmpty ? {} : {};
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body is not valid JSON.");
    error.status = 400;
    error.code = "json_invalid";
    throw error;
  }
}

function readSessionToken(req, body = {}) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return body.sessionToken || null;
}

function requireText(value, code, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(400, code, message);
  }
  return value.trim();
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeError(res, error) {
  writeJson(res, error.status || error.statusCode || 500, {
    error: error.code || error.error || "internal_error",
    message: error.message || "Unexpected error"
  });
}

function createCorrelationId() {
  return crypto.randomUUID();
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function readFeatureFlags(env) {
  return {
    phase1AuthOnboardingEnabled: String(env.PHASE1_AUTH_ONBOARDING_ENABLED || "true").toLowerCase() !== "false",
    phase2DocumentArchiveEnabled: String(env.PHASE2_DOCUMENT_ARCHIVE_ENABLED || "true").toLowerCase() !== "false",
    phase2CompanyInboxEnabled: String(env.PHASE2_COMPANY_INBOX_ENABLED || "true").toLowerCase() !== "false",
    phase2OcrReviewEnabled: String(env.PHASE2_OCR_REVIEW_ENABLED || "true").toLowerCase() !== "false",
    phase3LedgerEnabled: String(env.PHASE3_LEDGER_ENABLED || "true").toLowerCase() !== "false",
    phase4VatEnabled: String(env.PHASE4_VAT_ENABLED || "true").toLowerCase() !== "false",
    phase5ArEnabled: String(env.PHASE5_AR_ENABLED || "true").toLowerCase() !== "false",
    phase6ApEnabled: String(env.PHASE6_AP_ENABLED || "true").toLowerCase() !== "false",
    phase7HrEnabled: String(env.PHASE7_HR_ENABLED || "true").toLowerCase() !== "false",
    phase7TimeEnabled: String(env.PHASE7_TIME_ENABLED || "true").toLowerCase() !== "false",
    phase7AbsenceEnabled: String(env.PHASE7_ABSENCE_ENABLED || "true").toLowerCase() !== "false",
    phase8PayrollEnabled: String(env.PHASE8_PAYROLL_ENABLED || "true").toLowerCase() !== "false",
    phase9BenefitsEnabled: String(env.PHASE9_BENEFITS_ENABLED || "true").toLowerCase() !== "false",
    phase9TravelEnabled: String(env.PHASE9_TRAVEL_ENABLED || "true").toLowerCase() !== "false",
    phase9PensionEnabled: String(env.PHASE9_PENSION_ENABLED || "true").toLowerCase() !== "false",
    phase10ProjectsEnabled: String(env.PHASE10_PROJECTS_ENABLED || "true").toLowerCase() !== "false",
    phase10FieldEnabled: String(env.PHASE10_FIELD_ENABLED || "true").toLowerCase() !== "false",
    phase10BuildEnabled: String(env.PHASE10_BUILD_ENABLED || "true").toLowerCase() !== "false",
    phase13PublicApiEnabled: String(env.PHASE13_PUBLIC_API_ENABLED || "true").toLowerCase() !== "false",
    phase13PartnerEnabled: String(env.PHASE13_PARTNER_ENABLED || "true").toLowerCase() !== "false",
    phase13AutomationEnabled: String(env.PHASE13_AUTOMATION_ENABLED || "true").toLowerCase() !== "false",
    phase14SecurityEnabled: String(env.PHASE14_SECURITY_ENABLED || "true").toLowerCase() !== "false",
    phase14ResilienceEnabled: String(env.PHASE14_RESILIENCE_ENABLED || "true").toLowerCase() !== "false",
    phase14MigrationEnabled: String(env.PHASE14_MIGRATION_ENABLED || "true").toLowerCase() !== "false"
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startApiServer();
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}

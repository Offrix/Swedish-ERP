import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const REQUIRED_ROUTE_METADATA = Object.freeze([
  "/v1/system/runtime-mode",
  "/v1/system/invariants",
  "/v1/system/bootstrap/validate",
  "/v1/auth/providers/isolation",
  "/v1/auth/logout",
  "/v1/auth/factors",
  "/v1/auth/challenges",
  "/v1/auth/challenges/:challengeId/complete",
  "/v1/auth/devices",
  "/v1/auth/devices/:deviceTrustRecordId/trust",
  "/v1/auth/devices/:deviceTrustRecordId/revoke",
  "/v1/auth/mfa/totp/enroll",
  "/v1/auth/mfa/totp/verify",
  "/v1/auth/mfa/passkeys/register-options",
  "/v1/auth/mfa/passkeys/register-verify",
  "/v1/auth/mfa/passkeys/assert",
  "/v1/auth/bankid/start",
  "/v1/auth/bankid/collect",
  "/v1/auth/federation/start",
  "/v1/auth/federation/callback",
  "/v1/auth/sessions/:sessionId/revoke",
  "/v1/authz/check",
  "/v1/onboarding/runs/:runId",
  "/v1/onboarding/runs/:runId/checklist",
  "/v1/tenant/bootstrap",
  "/v1/tenant/bootstrap/:tenantBootstrapId",
  "/v1/tenant/bootstrap/:tenantBootstrapId/checklist",
  "/v1/tenant/bootstrap/profile",
  "/v1/tenant/modules/definitions",
  "/v1/tenant/modules/activations",
  "/v1/tenant/modules/activations/:moduleCode/suspend",
  "/v1/tenant/parallel-runs",
  "/v1/trial/environments",
  "/v1/trial/environments/:trialEnvironmentProfileId/reset",
  "/v1/trial/environments/:trialEnvironmentProfileId/refresh",
  "/v1/trial/promotions",
  "/v1/trial/promotions/:promotionPlanId/execute",
  "/v1/trial/promotions/workflows",
  "/v1/trial/support-policy",
  "/v1/trial/operations",
  "/v1/trial/operations/alerts",
  "/v1/trial/operations/queues",
  "/v1/trial/analytics",
  "/v1/pilot/executions",
  "/v1/pilot/executions/:pilotExecutionId",
  "/v1/pilot/executions/:pilotExecutionId/scenarios/:scenarioCode",
  "/v1/pilot/executions/:pilotExecutionId/complete",
  "/v1/pilot/executions/:pilotExecutionId/evidence",
  "/v1/release/advantage-bundles",
  "/v1/release/advantage-bundles/:advantageReleaseBundleId",
  "/v1/release/advantage-bundles/:advantageReleaseBundleId/evidence",
  "/v1/release/ui-contract-freezes",
  "/v1/release/ui-contract-freezes/:uiContractFreezeRecordId",
  "/v1/release/ui-contract-freezes/:uiContractFreezeRecordId/evidence",
  "/v1/release/go-live-gates",
  "/v1/release/go-live-gates/:goLiveGateRecordId",
  "/v1/release/go-live-gates/:goLiveGateRecordId/evidence",
  "/v1/integrations/capability-manifests",
  "/v1/integrations/connections",
  "/v1/integrations/connections/:connectionId",
  "/v1/integrations/connections/:connectionId/credentials",
  "/v1/integrations/connections/:connectionId/consents",
  "/v1/integrations/connections/:connectionId/health-checks",
  "/v1/mission-control/dashboards",
  "/v1/mission-control/dashboards/:dashboardCode",
  "/v1/documents/:documentId/versions",
  "/v1/documents/:documentId/links",
  "/v1/inbox/messages/:emailIngestMessageId",
  "/v1/documents/:documentId/ocr/runs/:ocrRunId/provider-callback",
  "/v1/review-tasks/:reviewTaskId/claim",
  "/v1/review-tasks/:reviewTaskId/correct",
  "/v1/review-tasks/:reviewTaskId/approve",
  "/v1/review-center/items/:reviewItemId/approve",
  "/v1/review-center/items/:reviewItemId/reject",
  "/v1/review-center/items/:reviewItemId/escalate",
  "/v1/ledger/accounting-periods/:accountingPeriodId/lock",
  "/v1/ledger/accounting-periods/:accountingPeriodId/reopen",
  "/v1/ledger/accounts",
  "/v1/ledger/opening-balances",
  "/v1/ledger/opening-balances/:openingBalanceBatchId",
  "/v1/ledger/opening-balances/:openingBalanceBatchId/reverse",
  "/v1/ledger/dimensions/:dimensionType",
  "/v1/ledger/voucher-series",
  "/v1/ledger/journal-entries/:journalEntryId/validate",
  "/v1/ledger/journal-entries/:journalEntryId/post",
  "/v1/ar/invoice-series",
  "/v1/work-items",
  "/v1/work-items/queues",
  "/v1/work-items/:workItemId/claim",
  "/v1/work-items/:workItemId/assign",
  "/v1/work-items/:workItemId/escalate",
  "/v1/work-items/:workItemId/dual-approve",
  "/v1/work-items/:workItemId/resolve",
  "/v1/notifications/:notificationId/acknowledge",
  "/v1/activity/object/:objectType/:objectId",
  "/v1/backoffice/support-cases/:supportCaseId/evidence",
  "/v1/backoffice/support-cases/:supportCaseId/close",
  "/v1/backoffice/support-cases/:supportCaseId/approve-actions",
  "/v1/backoffice/audit-correlations",
  "/v1/backoffice/audit-correlations/:correlationId",
  "/v1/backoffice/jobs",
  "/v1/backoffice/replays",
  "/v1/backoffice/replays/:replayPlanId/approve",
  "/v1/backoffice/replays/:replayPlanId/execute",
  "/v1/backoffice/checkpoints",
  "/v1/backoffice/checkpoints/:rollbackCheckpointId/seal",
  "/v1/backoffice/checkpoints/:rollbackCheckpointId/use",
  "/v1/backoffice/checkpoints/:rollbackCheckpointId/expire",
  "/v1/backoffice/replay-drills",
  "/v1/backoffice/replay-drills/:replayDrillId/start",
  "/v1/backoffice/replay-drills/:replayDrillId/complete",
  "/v1/backoffice/dead-letters/:deadLetterId/triage",
  "/v1/backoffice/submissions/monitor",
  "/v1/backoffice/review-center/sla-scan",
  "/v1/backoffice/incidents/:incidentId/post-review",
  "/v1/backoffice/incidents/:incidentId/status",
  "/v1/backoffice/impersonations/:sessionId/evidence",
  "/v1/backoffice/impersonations/:sessionId/start",
  "/v1/backoffice/access-reviews/:reviewBatchId/sign-off",
  "/v1/backoffice/break-glass/:breakGlassId/evidence",
  "/v1/backoffice/break-glass/:breakGlassId/start",
  "/v1/security/classes",
  "/v1/ops/security/alerts",
  "/v1/ops/security/budgets",
  "/v1/ops/security/failure-series",
  "/v1/ops/security/risk-summary",
  "/v1/ops/observability",
  "/v1/ops/transaction-boundary",
  "/v1/ops/secrets",
  "/v1/ops/secrets/:managedSecretId/rotate",
  "/v1/ops/secret-rotations",
  "/v1/ops/certificate-chains",
  "/v1/ops/callback-secrets",
  "/v1/ops/rule-governance/changes/:regulatoryChangeEntryId/publish",
  "/v1/ops/restore-drills/:restoreDrillId/start",
  "/v1/ops/restore-drills/:restoreDrillId/complete",
  "/v1/close/reopen-requests",
  "/v1/close/reopen-requests/:reopenRequestId",
  "/v1/close/reopen-requests/:reopenRequestId/adjustments",
  "/v1/close/reopen-requests/:reopenRequestId/relock",
  "/v1/close/adjustments",
  "/v1/close/adjustments/:adjustmentId",
  "/v1/ledger/year-end-transfers",
  "/v1/ledger/year-end-transfers/:yearEndTransferBatchId",
  "/v1/ledger/year-end-transfers/:yearEndTransferBatchId/reverse",
  "/v1/ledger/vat-clearing-runs",
  "/v1/ledger/vat-clearing-runs/:vatClearingRunId",
  "/v1/ledger/vat-clearing-runs/:vatClearingRunId/reverse",
  "/v1/ledger/asset-cards",
  "/v1/ledger/asset-cards/:assetCardId",
  "/v1/ledger/depreciation-batches",
  "/v1/ledger/depreciation-batches/:depreciationBatchId",
  "/v1/ledger/depreciation-batches/:depreciationBatchId/reverse",
  "/v1/ledger/accrual-schedules",
  "/v1/ledger/accrual-schedules/:accrualScheduleId",
  "/v1/ledger/accrual-batches",
  "/v1/ledger/accrual-batches/:accrualBatchId",
  "/v1/ledger/accrual-batches/:accrualBatchId/reverse",
  "/v1/sie/exports",
  "/v1/sie/exports/:sieExportJobId",
  "/v1/sie/imports",
  "/v1/sie/imports/:sieImportJobId",
  "/v1/submissions/:submissionId/evidence-pack",
  "/v1/submissions/:submissionId/attempts",
  "/v1/submissions/:submissionId/recoveries",
  "/v1/submissions/:submissionId/recoveries/:recoveryId/resolve",
  "/v1/submissions/:submissionId/reconciliation",
  "/v1/submissions/:submissionId/replay",
  "/v1/submissions/:submissionId/corrections",
  "/v1/vat/review-queue/:vatReviewQueueItemId/resolve",
  "/v1/vat/period-locks",
  "/v1/vat/period-locks/:vatPeriodLockId/unlock",
  "/v1/tax-account/liabilities",
  "/v1/tax-account/liabilities/:reconciliationItemId",
  "/v1/tax-account/events/:taxAccountEventId/classify",
  "/v1/tax-account/offset-suggestions",
  "/v1/tax-account/discrepancy-cases",
  "/v1/tax-account/discrepancy-cases/:discrepancyCaseId",
  "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/review",
  "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/resolve",
  "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/waive",
  "/v1/banking/statement-imports",
  "/v1/banking/statement-imports/:statementImportId",
  "/v1/banking/payment-batches",
  "/v1/banking/payment-batches/:paymentBatchId",
  "/v1/banking/settlement-links",
  "/v1/migration/acceptance-records",
  "/v1/migration/acceptance-records/:migrationAcceptanceRecordId/evidence",
  "/v1/migration/parallel-run-results",
  "/v1/migration/parallel-run-results/:parallelRunResultId/accept",
  "/v1/migration/post-cutover-correction-cases",
  "/v1/migration/cutover-plans/:cutoverPlanId/concierge",
  "/v1/migration/cutover-plans/:cutoverPlanId/signoffs",
  "/v1/migration/cutover-plans/:cutoverPlanId/signoff-evidence",
  "/v1/migration/cutover-plans/:cutoverPlanId/checklist/:itemCode",
  "/v1/migration/cutover-plans/:cutoverPlanId/source-extract-checklist/:itemCode",
  "/v1/migration/cutover-plans/:cutoverPlanId/rehearsals",
  "/v1/migration/cutover-plans/:cutoverPlanId/variance-report",
  "/v1/migration/cutover-plans/:cutoverPlanId/rollback-drill",
  "/v1/import-cases/:importCaseId/correction-requests",
  "/v1/import-cases/:importCaseId/correction-requests/:importCaseCorrectionRequestId/decide",
  "/v1/import-cases/:importCaseId/apply",
  "/v1/projects/quote-handoffs",
  "/v1/projects/trial-scenarios",
  "/v1/projects/trial-scenarios/:scenarioCode/materialize",
  "/v1/projects/import-batches",
  "/v1/projects/import-batches/:projectImportBatchId/commit",
  "/v1/projects/:projectId/opportunity-links",
  "/v1/projects/:projectId/quote-links",
  "/v1/projects/:projectId/engagements",
  "/v1/projects/:projectId/work-models",
  "/v1/projects/:projectId/work-packages",
  "/v1/projects/:projectId/delivery-milestones",
  "/v1/projects/:projectId/work-logs",
  "/v1/projects/:projectId/revenue-plans",
  "/v1/projects/:projectId/revenue-plans/:projectRevenuePlanId/approve",
  "/v1/projects/:projectId/billing-plans",
  "/v1/projects/:projectId/status-updates",
  "/v1/projects/:projectId/capacity-reservations",
  "/v1/projects/:projectId/capacity-reservations/:projectCapacityReservationId/status",
  "/v1/projects/:projectId/assignment-plans",
  "/v1/projects/:projectId/assignment-plans/:projectAssignmentPlanId/status",
  "/v1/projects/:projectId/risks",
  "/v1/projects/:projectId/risks/:projectRiskId/status",
  "/v1/projects/:projectId/profitability-adjustments",
  "/v1/projects/:projectId/profitability-adjustments/:projectProfitabilityAdjustmentId/decide",
  "/v1/projects/:projectId/invoice-readiness-assessments",
  "/v1/projects/:projectId/invoice-simulations",
  "/v1/projects/:projectId/profitability-snapshots",
  "/v1/projects/portfolio/nodes",
  "/v1/projects/portfolio/summary",
  "/v1/projects/:projectId/live-conversion-plans",
  "/v1/personalliggare/industry-packs",
  "/v1/personalliggare/sites/:constructionSiteId/identity-snapshots",
  "/v1/personalliggare/sites/:constructionSiteId/contractor-snapshots",
  "/v1/personalliggare/sites/:constructionSiteId/kiosk-devices",
  "/v1/personalliggare/sites/:constructionSiteId/exports",
  "/v1/personalliggare/audit-events",
  "/v1/id06/companies/verify",
  "/v1/id06/companies/verifications",
  "/v1/id06/persons/verify",
  "/v1/id06/persons/verifications",
  "/v1/id06/cards/validate",
  "/v1/id06/cards/statuses",
  "/v1/id06/workplaces/:workplaceId/bindings",
  "/v1/id06/workplaces/:workplaceId/work-passes",
  "/v1/id06/workplaces/:workplaceId/exports",
  "/v1/id06/audit-events",
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
  "/v1/field/operational-cases",
  "/v1/field/operational-cases/:operationalCaseId",
  "/v1/field/operational-cases/:operationalCaseId/material-reservations",
  "/v1/field/operational-cases/:operationalCaseId/evidence",
  "/v1/field/operational-cases/:operationalCaseId/conflicts",
  "/v1/field/operational-cases/:operationalCaseId/conflicts/:conflictRecordId/resolve",
  "/v1/payroll/garnishments",
  "/v1/payroll/garnishments/:garnishmentDecisionSnapshotId/approve",
  "/v1/payroll/garnishment-remittances",
  "/v1/payroll/garnishment-remittances/:remittanceInstructionId",
  "/v1/payroll/garnishment-remittances/:remittanceInstructionId/settle",
  "/v1/payroll/garnishment-remittances/:remittanceInstructionId/return",
  "/v1/payroll/garnishment-remittances/:remittanceInstructionId/correct"
]);

function parseRoutesFromSource(sourceText) {
  const bindings = new Map(
    [...sourceText.matchAll(/const\s+(\w+)\s*=\s*matchPath\(path,\s*"([^"]+)"\)/g)].map((match) => [match[1], match[2]])
  );
  const routes = [];

  for (const match of sourceText.matchAll(/if\s*\(([^\{]+)\)\s*\{/g)) {
    const condition = match[1];
    const methods = [...condition.matchAll(/req\.method\s*===\s*"([A-Z]+)"/g)];
    if (methods.length === 0) {
      continue;
    }
    const directPaths = [...condition.matchAll(/path\s*===\s*"([^"]+)"/g)].map((directPath) => directPath[1]);
    const boundPaths = [...bindings.entries()]
      .filter(([binding]) => condition.includes(binding))
      .map(([, route]) => route);
    for (const { 1: method } of methods) {
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        continue;
      }
      for (const route of new Set([...directPaths, ...boundPaths])) {
        routes.push({ method, path: route });
      }
    }
  }
  return routes.filter((route) => !["/", "/healthz", "/readyz"].includes(route.path));
}

test("api root metadata lists critical auth, backoffice and migration routes without duplicates", async () => {
  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(Array.isArray(payload.routes), true);
    assert.equal(Array.isArray(payload.routeContracts), true);

    for (const route of REQUIRED_ROUTE_METADATA) {
      assert.equal(payload.routes.includes(route), true, `${route} should be exposed in api root metadata`);
    }

    const supportCaseCloseContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/backoffice/support-cases/:supportCaseId/close"
    );
      assert.ok(supportCaseCloseContract);
      assert.equal(supportCaseCloseContract.requiredActionClass, "support_case_operate");
      assert.equal(supportCaseCloseContract.requiredTrustLevel, "strong_mfa");
      assert.equal(supportCaseCloseContract.requiredScopeType, "support_case");
      assert.equal(supportCaseCloseContract.expectedObjectVersion, true);

      const rollbackCheckpointUseContract = payload.routeContracts.find(
        (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/backoffice/checkpoints/:rollbackCheckpointId/use"
      );
      assert.ok(rollbackCheckpointUseContract);
      assert.equal(rollbackCheckpointUseContract.requiredActionClass, "rollback_checkpoint_use");
      assert.equal(rollbackCheckpointUseContract.requiredTrustLevel, "strong_mfa");
      assert.equal(rollbackCheckpointUseContract.requiredScopeType, "rollback_checkpoint");

      const replayDrillCompleteContract = payload.routeContracts.find(
        (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/backoffice/replay-drills/:replayDrillId/complete"
      );
      assert.ok(replayDrillCompleteContract);
      assert.equal(replayDrillCompleteContract.requiredActionClass, "replay_drill_complete");
      assert.equal(replayDrillCompleteContract.requiredTrustLevel, "strong_mfa");
      assert.equal(replayDrillCompleteContract.requiredScopeType, "replay_drill");

      const workItemAssignContract = payload.routeContracts.find(
        (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/work-items/:workItemId/assign"
      );
      assert.ok(workItemAssignContract);
      assert.equal(workItemAssignContract.requiredActionClass, "operational_work_item_assign");
      assert.equal(workItemAssignContract.requiredTrustLevel, "strong_mfa");
      assert.equal(workItemAssignContract.requiredScopeType, "operational_work_item");

      const workItemEscalateContract = payload.routeContracts.find(
        (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/work-items/:workItemId/escalate"
      );
      assert.ok(workItemEscalateContract);
      assert.equal(workItemEscalateContract.requiredActionClass, "operational_work_item_escalate");
      assert.equal(workItemEscalateContract.requiredTrustLevel, "strong_mfa");
      assert.equal(workItemEscalateContract.requiredScopeType, "operational_work_item");

      const workItemDualApproveContract = payload.routeContracts.find(
        (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/work-items/:workItemId/dual-approve"
      );
      assert.ok(workItemDualApproveContract);
      assert.equal(workItemDualApproveContract.requiredActionClass, "operational_work_item_dual_approve");
      assert.equal(workItemDualApproveContract.requiredTrustLevel, "strong_mfa");
      assert.equal(workItemDualApproveContract.requiredScopeType, "operational_work_item");

    const totpEnrollContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/auth/mfa/totp/enroll"
    );
    assert.ok(totpEnrollContract);
    assert.equal(totpEnrollContract.requiredActionClass, "identity_factor_manage");
    assert.equal(totpEnrollContract.requiredTrustLevel, "mfa");

    const passkeyRegistrationContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/auth/mfa/passkeys/register-options"
    );
    assert.ok(passkeyRegistrationContract);
    assert.equal(passkeyRegistrationContract.requiredActionClass, "identity_factor_manage");
    assert.equal(passkeyRegistrationContract.requiredTrustLevel, "strong_mfa");

    const tenantBootstrapContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/tenant/bootstrap"
    );
    assert.ok(tenantBootstrapContract);
    assert.equal(tenantBootstrapContract.requiredTrustLevel, "public");
    assert.equal(tenantBootstrapContract.requiredScopeType, "public");

    const integrationConnectionCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/integrations/connections"
    );
    assert.ok(integrationConnectionCreateContract);
    assert.equal(integrationConnectionCreateContract.requiredActionClass, "integration_connection_create");
    assert.equal(integrationConnectionCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(integrationConnectionCreateContract.requiredScopeType, "company");

    const integrationCredentialManageContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/integrations/connections/:connectionId/credentials"
    );
    assert.ok(integrationCredentialManageContract);
    assert.equal(integrationCredentialManageContract.requiredActionClass, "integration_credentials_manage");
    assert.equal(integrationCredentialManageContract.requiredTrustLevel, "strong_mfa");
    assert.equal(integrationCredentialManageContract.requiredScopeType, "integration_connection");

    const integrationConsentAuthorizeContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/integrations/connections/:connectionId/consents"
    );
    assert.ok(integrationConsentAuthorizeContract);
    assert.equal(integrationConsentAuthorizeContract.requiredActionClass, "integration_consent_authorize");
    assert.equal(integrationConsentAuthorizeContract.requiredTrustLevel, "strong_mfa");
    assert.equal(integrationConsentAuthorizeContract.requiredScopeType, "integration_connection");

    const integrationHealthCheckRunContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/integrations/connections/:connectionId/health-checks"
    );
    assert.ok(integrationHealthCheckRunContract);
    assert.equal(integrationHealthCheckRunContract.requiredActionClass, "integration_health_check_run");
    assert.equal(integrationHealthCheckRunContract.requiredTrustLevel, "strong_mfa");
    assert.equal(integrationHealthCheckRunContract.requiredScopeType, "integration_connection");

    const advantageReleaseBundleCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/release/advantage-bundles"
    );
    assert.ok(advantageReleaseBundleCreateContract);
    assert.equal(advantageReleaseBundleCreateContract.requiredActionClass, "advantage_release_bundle_record");
    assert.equal(advantageReleaseBundleCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(advantageReleaseBundleCreateContract.requiredScopeType, "company");

    const uiContractFreezeCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/release/ui-contract-freezes"
    );
    assert.ok(uiContractFreezeCreateContract);
    assert.equal(uiContractFreezeCreateContract.requiredActionClass, "ui_contract_freeze_record");
    assert.equal(uiContractFreezeCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(uiContractFreezeCreateContract.requiredScopeType, "company");

    const goLiveGateCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/release/go-live-gates"
    );
    assert.ok(goLiveGateCreateContract);
    assert.equal(goLiveGateCreateContract.requiredActionClass, "go_live_gate_record");
    assert.equal(goLiveGateCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(goLiveGateCreateContract.requiredScopeType, "company");

    const closeAdjustmentContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/close/reopen-requests/:reopenRequestId/adjustments"
    );
    assert.ok(closeAdjustmentContract);
    assert.equal(closeAdjustmentContract.requiredActionClass, "close_adjustment_post");
    assert.equal(closeAdjustmentContract.requiredTrustLevel, "strong_mfa");
    assert.equal(closeAdjustmentContract.requiredScopeType, "close_reopen_request");

    const closeRelockContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/close/reopen-requests/:reopenRequestId/relock"
    );
    assert.ok(closeRelockContract);
    assert.equal(closeRelockContract.requiredActionClass, "close_reopen_request_relock");
    assert.equal(closeRelockContract.requiredTrustLevel, "strong_mfa");
    assert.equal(closeRelockContract.requiredScopeType, "close_reopen_request");

    const yearEndTransferContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/ledger/year-end-transfers"
    );
    assert.ok(yearEndTransferContract);
    assert.equal(yearEndTransferContract.requiredActionClass, "ledger_year_end_transfer_post");
    assert.equal(yearEndTransferContract.requiredTrustLevel, "strong_mfa");
    assert.equal(yearEndTransferContract.requiredScopeType, "company");

    const yearEndTransferReverseContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/ledger/year-end-transfers/:yearEndTransferBatchId/reverse"
    );
    assert.ok(yearEndTransferReverseContract);
    assert.equal(yearEndTransferReverseContract.requiredActionClass, "ledger_year_end_transfer_reverse");
    assert.equal(yearEndTransferReverseContract.requiredTrustLevel, "strong_mfa");
    assert.equal(yearEndTransferReverseContract.requiredScopeType, "year_end_transfer_batch");

    const vatClearingContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/ledger/vat-clearing-runs"
    );
    assert.ok(vatClearingContract);
    assert.equal(vatClearingContract.requiredActionClass, "ledger_vat_clearing_post");
    assert.equal(vatClearingContract.requiredTrustLevel, "strong_mfa");
    assert.equal(vatClearingContract.requiredScopeType, "company");

    const vatClearingReverseContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/ledger/vat-clearing-runs/:vatClearingRunId/reverse"
    );
    assert.ok(vatClearingReverseContract);
    assert.equal(vatClearingReverseContract.requiredActionClass, "ledger_vat_clearing_reverse");
    assert.equal(vatClearingReverseContract.requiredTrustLevel, "strong_mfa");
    assert.equal(vatClearingReverseContract.requiredScopeType, "vat_clearing_run");

    const vatReviewResolveContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/vat/review-queue/:vatReviewQueueItemId/resolve"
    );
    assert.ok(vatReviewResolveContract);
    assert.equal(vatReviewResolveContract.requiredActionClass, "vat_review_resolve");
    assert.equal(vatReviewResolveContract.requiredTrustLevel, "strong_mfa");
    assert.equal(vatReviewResolveContract.requiredScopeType, "vat_review_queue_item");

    const taxAccountClassifyContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/tax-account/events/:taxAccountEventId/classify"
    );
    assert.ok(taxAccountClassifyContract);
    assert.equal(taxAccountClassifyContract.requiredActionClass, "tax_account_event_classify");
    assert.equal(taxAccountClassifyContract.requiredTrustLevel, "strong_mfa");
    assert.equal(taxAccountClassifyContract.requiredScopeType, "company");

    const taxAccountWaiveContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/tax-account/discrepancy-cases/:discrepancyCaseId/waive"
    );
    assert.ok(taxAccountWaiveContract);
    assert.equal(taxAccountWaiveContract.requiredActionClass, "tax_account_discrepancy_waive");
    assert.equal(taxAccountWaiveContract.requiredTrustLevel, "strong_mfa");
    assert.equal(taxAccountWaiveContract.requiredScopeType, "company");

    const projectRevenuePlanApproveContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/revenue-plans/:projectRevenuePlanId/approve"
    );
    assert.ok(projectRevenuePlanApproveContract);
    assert.equal(projectRevenuePlanApproveContract.requiredActionClass, "project_revenue_plan_approve");
    assert.equal(projectRevenuePlanApproveContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectRevenuePlanApproveContract.requiredScopeType, "project");

    const projectCapacityReservationContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/capacity-reservations"
    );
    assert.ok(projectCapacityReservationContract);
    assert.equal(projectCapacityReservationContract.requiredActionClass, "project_capacity_reservation_create");
    assert.equal(projectCapacityReservationContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectCapacityReservationContract.requiredScopeType, "project");

    const projectAssignmentPlanStatusContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/assignment-plans/:projectAssignmentPlanId/status"
    );
    assert.ok(projectAssignmentPlanStatusContract);
    assert.equal(projectAssignmentPlanStatusContract.requiredActionClass, "project_assignment_plan_status");
    assert.equal(projectAssignmentPlanStatusContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectAssignmentPlanStatusContract.requiredScopeType, "project");

    const projectRiskStatusContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/risks/:projectRiskId/status"
    );
    assert.ok(projectRiskStatusContract);
    assert.equal(projectRiskStatusContract.requiredActionClass, "project_risk_status");
    assert.equal(projectRiskStatusContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectRiskStatusContract.requiredScopeType, "project");

    const projectProfitabilitySnapshotContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/profitability-snapshots"
    );
    assert.ok(projectProfitabilitySnapshotContract);
    assert.equal(projectProfitabilitySnapshotContract.requiredActionClass, "project_profitability_snapshot_materialize");
    assert.equal(projectProfitabilitySnapshotContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectProfitabilitySnapshotContract.requiredScopeType, "project");

    const projectQuoteHandoffContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/quote-handoffs"
    );
    assert.ok(projectQuoteHandoffContract);
    assert.equal(projectQuoteHandoffContract.requiredActionClass, "project_quote_handoff_create");
    assert.equal(projectQuoteHandoffContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectQuoteHandoffContract.requiredScopeType, "company");

    const projectTrialScenarioContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/trial-scenarios/:scenarioCode/materialize"
    );
    assert.ok(projectTrialScenarioContract);
    assert.equal(projectTrialScenarioContract.requiredActionClass, "project_trial_scenario_materialize");
    assert.equal(projectTrialScenarioContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectTrialScenarioContract.requiredScopeType, "company");

    const projectImportBatchCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/import-batches"
    );
    assert.ok(projectImportBatchCreateContract);
    assert.equal(projectImportBatchCreateContract.requiredActionClass, "project_import_batch_create");
    assert.equal(projectImportBatchCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectImportBatchCreateContract.requiredScopeType, "company");

    const projectImportBatchCommitContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/import-batches/:projectImportBatchId/commit"
    );
    assert.ok(projectImportBatchCommitContract);
    assert.equal(projectImportBatchCommitContract.requiredActionClass, "project_import_batch_commit");
    assert.equal(projectImportBatchCommitContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectImportBatchCommitContract.requiredScopeType, "company");

    const projectProfitabilityAdjustmentCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/profitability-adjustments"
    );
    assert.ok(projectProfitabilityAdjustmentCreateContract);
    assert.equal(projectProfitabilityAdjustmentCreateContract.requiredActionClass, "project_profitability_adjustment_create");
    assert.equal(projectProfitabilityAdjustmentCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectProfitabilityAdjustmentCreateContract.requiredScopeType, "project");

    const projectProfitabilityAdjustmentDecisionContract = payload.routeContracts.find(
      (routeContract) =>
        routeContract.method === "POST"
        && routeContract.path === "/v1/projects/:projectId/profitability-adjustments/:projectProfitabilityAdjustmentId/decide"
    );
    assert.ok(projectProfitabilityAdjustmentDecisionContract);
    assert.equal(projectProfitabilityAdjustmentDecisionContract.requiredActionClass, "project_profitability_adjustment_decide");
    assert.equal(projectProfitabilityAdjustmentDecisionContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectProfitabilityAdjustmentDecisionContract.requiredScopeType, "project");

    const projectInvoiceReadinessAssessContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/invoice-readiness-assessments"
    );
    assert.ok(projectInvoiceReadinessAssessContract);
    assert.equal(projectInvoiceReadinessAssessContract.requiredActionClass, "project_invoice_readiness_assess");
    assert.equal(projectInvoiceReadinessAssessContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectInvoiceReadinessAssessContract.requiredScopeType, "project");

    const projectInvoiceSimulationCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/invoice-simulations"
    );
    assert.ok(projectInvoiceSimulationCreateContract);
    assert.equal(projectInvoiceSimulationCreateContract.requiredActionClass, "project_invoice_simulation_create");
    assert.equal(projectInvoiceSimulationCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectInvoiceSimulationCreateContract.requiredScopeType, "project");

    const projectLiveConversionPlanCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/projects/:projectId/live-conversion-plans"
    );
    assert.ok(projectLiveConversionPlanCreateContract);
    assert.equal(projectLiveConversionPlanCreateContract.requiredActionClass, "project_live_conversion_plan_create");
    assert.equal(projectLiveConversionPlanCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(projectLiveConversionPlanCreateContract.requiredScopeType, "project");

    const fieldOperationalCaseCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/field/operational-cases"
    );
    assert.ok(fieldOperationalCaseCreateContract);
    assert.equal(fieldOperationalCaseCreateContract.requiredActionClass, "field_operational_case_create");
    assert.equal(fieldOperationalCaseCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(fieldOperationalCaseCreateContract.requiredScopeType, "project");

    const fieldConflictResolveContract = payload.routeContracts.find(
      (routeContract) =>
        routeContract.method === "POST"
        && routeContract.path === "/v1/field/operational-cases/:operationalCaseId/conflicts/:conflictRecordId/resolve"
    );
    assert.ok(fieldConflictResolveContract);
    assert.equal(fieldConflictResolveContract.requiredActionClass, "field_conflict_record_resolve");
    assert.equal(fieldConflictResolveContract.requiredTrustLevel, "strong_mfa");
    assert.equal(fieldConflictResolveContract.requiredScopeType, "project");

    const personalliggareAttendanceRecordContract = payload.routeContracts.find(
      (routeContract) =>
        routeContract.method === "POST"
        && routeContract.path === "/v1/personalliggare/sites/:constructionSiteId/attendance-events"
    );
    assert.ok(personalliggareAttendanceRecordContract);
    assert.equal(personalliggareAttendanceRecordContract.requiredActionClass, "personalliggare_attendance_event_record");
    assert.equal(personalliggareAttendanceRecordContract.requiredTrustLevel, "mfa");
    assert.equal(personalliggareAttendanceRecordContract.requiredScopeType, "construction_site");

    const id06CompanyVerifyContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/id06/companies/verify"
    );
    assert.ok(id06CompanyVerifyContract);
    assert.equal(id06CompanyVerifyContract.requiredActionClass, "id06_company_verify");
    assert.equal(id06CompanyVerifyContract.requiredTrustLevel, "strong_mfa");
    assert.equal(id06CompanyVerifyContract.requiredScopeType, "company");

    const id06BindingCreateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/id06/workplaces/:workplaceId/bindings"
    );
    assert.ok(id06BindingCreateContract);
    assert.equal(id06BindingCreateContract.requiredActionClass, "id06_workplace_binding_create");
    assert.equal(id06BindingCreateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(id06BindingCreateContract.requiredScopeType, "workplace");

    const egenkontrollTemplateActivateContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/egenkontroll/templates/:checklistTemplateId/activate"
    );
    assert.ok(egenkontrollTemplateActivateContract);
    assert.equal(egenkontrollTemplateActivateContract.requiredActionClass, "egenkontroll_template_activate");
    assert.equal(egenkontrollTemplateActivateContract.requiredTrustLevel, "strong_mfa");
    assert.equal(egenkontrollTemplateActivateContract.requiredScopeType, "checklist_template");

    const egenkontrollSignoffContract = payload.routeContracts.find(
      (routeContract) => routeContract.method === "POST" && routeContract.path === "/v1/egenkontroll/instances/:checklistInstanceId/signoffs"
    );
    assert.ok(egenkontrollSignoffContract);
    assert.equal(egenkontrollSignoffContract.requiredActionClass, "egenkontroll_signoff_record");
    assert.equal(egenkontrollSignoffContract.requiredTrustLevel, "strong_mfa");
    assert.equal(egenkontrollSignoffContract.requiredScopeType, "checklist_instance");

    const uniqueCount = new Set(payload.routes).size;
    assert.equal(uniqueCount, payload.routes.length, "api root metadata should not contain duplicate route entries");
    assert.equal(
      payload.routeContracts.every(
        (routeContract) =>
          typeof routeContract.requiredActionClass === "string"
          && routeContract.requiredActionClass.length > 0
          && typeof routeContract.requiredTrustLevel === "string"
          && routeContract.requiredTrustLevel.length > 0
          && typeof routeContract.requiredScopeType === "string"
          && routeContract.requiredScopeType.length > 0
          && typeof routeContract.expectedObjectVersion === "boolean"
      ),
      true,
      "every published route contract should expose action class, trust, scope and object-version requirements"
    );
  } finally {
    await stopServer(server);
  }
});

test("api root metadata covers all parsed route patterns from server and phase14 route handlers", async () => {
  const routeDirectoryEntries = await fs.readdir("apps/api/src", { withFileTypes: true });
  const routeFiles = [
    "apps/api/src/server.mjs",
    ...routeDirectoryEntries
      .filter((entry) => entry.isFile() && /^phase\d+(?:-[a-z0-9]+)*-routes\.mjs$/i.test(entry.name))
      .map((entry) => path.join("apps/api/src", entry.name))
      .sort()
  ];
  const routeSources = await Promise.all(routeFiles.map((routeFile) => fs.readFile(routeFile, "utf8")));
  const parsedRoutes = routeSources.flatMap((sourceText) => parseRoutesFromSource(sourceText));

  const server = createApiServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    const exposedRoutes = new Set(payload.routes || []);
    const exposedContracts = new Set((payload.routeContracts || []).map((routeContract) => `${routeContract.method} ${routeContract.path}`));
    const missingRoutes = parsedRoutes.map((route) => route.path).filter((route) => !exposedRoutes.has(route)).sort();
    const missingContracts = parsedRoutes
      .map((route) => `${route.method} ${route.path}`)
      .filter((route) => !exposedContracts.has(route))
      .sort();

    assert.deepEqual(missingRoutes, []);
    assert.deepEqual(missingContracts, []);
    assert.equal(payload.routeContracts.some((routeContract) => routeContract.path === "/v1/submissions/:submissionId/replay"), true);
  } finally {
    await stopServer(server);
  }
});

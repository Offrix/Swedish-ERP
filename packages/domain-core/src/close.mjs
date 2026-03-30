import crypto from "node:crypto";
import { cloneValue as clone } from "./clone.mjs";

export const CLOSE_CHECKLIST_STATUSES = Object.freeze(["created", "in_progress", "review_ready", "signoff_pending", "signed_off", "closed", "reopened"]);
export const CLOSE_STEP_STATUSES = Object.freeze(["not_started", "in_progress", "awaiting_review", "complete", "blocked", "reopened"]);
export const CLOSE_BLOCKER_SEVERITIES = Object.freeze(["informational", "warning", "hard_stop", "critical"]);
export const CLOSE_BLOCKER_STATUSES = Object.freeze(["open", "waived", "resolved", "closed"]);
export const PERIOD_CLOSE_STATES = Object.freeze(["open", "subledger_locked", "vat_locked", "ledger_locked", "signed_off", "hard_closed", "reopened"]);
export const CLOSE_REOPEN_REQUEST_STATUSES = Object.freeze(["impact_assessed", "executed", "relocked"]);
export const CLOSE_ADJUSTMENT_TYPES = Object.freeze(["reversal", "correction_replacement"]);
export const CLOSE_ADJUSTMENT_STATUSES = Object.freeze(["posted"]);

const CLOSE_IMPACT_AREA_CODES = Object.freeze(["ledger", "vat", "agi", "hus", "tax_account", "annual_reporting"]);
const RELOCK_TARGET_STATUSES = Object.freeze(["soft_locked", "hard_closed"]);

const DEFAULT_STEP_BLUEPRINTS = Object.freeze([
  { stepCode: "bank_reconciliation", title: "Bank reconciliation", mandatory: true, evidenceType: "reconciliation_run", reconciliationAreaCode: "bank" },
  { stepCode: "ar_reconciliation", title: "AR reconciliation", mandatory: true, evidenceType: "reconciliation_run", reconciliationAreaCode: "ar" },
  { stepCode: "ap_reconciliation", title: "AP reconciliation", mandatory: true, evidenceType: "reconciliation_run", reconciliationAreaCode: "ap" },
  { stepCode: "vat_reconciliation", title: "VAT reconciliation", mandatory: true, evidenceType: "reconciliation_run", reconciliationAreaCode: "vat" },
  { stepCode: "suspense_followup", title: "Suspense follow-up", mandatory: true, evidenceType: "manual_evidence", reconciliationAreaCode: null },
  { stepCode: "manual_journal_review", title: "Manual journal review", mandatory: true, evidenceType: "manual_evidence", reconciliationAreaCode: null },
  { stepCode: "document_queue_review", title: "Document queue review", mandatory: true, evidenceType: "manual_evidence", reconciliationAreaCode: null },
  { stepCode: "report_backup", title: "Report backup", mandatory: true, evidenceType: "report_snapshot", reconciliationAreaCode: null }
]);

export function createCloseModule(context) {
  return createCloseEngine(context);
}

function createCloseEngine({
  state,
  authorize,
  assertVisible,
  requireCompany,
  requireBureauUser,
  findActivePortfolioForClient,
  upsertWorkItem,
  reportingPlatform = null,
  ledgerPlatform = null,
  evidencePlatform = null,
  now,
  audit,
  error
}) {
  const helpers = {
    state,
    authorize,
    assertVisible,
    requireCompany,
    requireBureauUser,
    findActivePortfolioForClient,
    upsertWorkItem,
    reportingPlatform,
    ledgerPlatform,
    evidencePlatform,
    now,
    audit,
    error
  };
  if (!helpers.state.closeAdjustments) {
    helpers.state.closeAdjustments = new Map();
  }

  return {
    closeChecklistStatuses: CLOSE_CHECKLIST_STATUSES,
    closeStepStatuses: CLOSE_STEP_STATUSES,
    closeBlockerSeverities: CLOSE_BLOCKER_SEVERITIES,
    closeBlockerStatuses: CLOSE_BLOCKER_STATUSES,
    periodCloseStates: PERIOD_CLOSE_STATES,
    closeReopenRequestStatuses: CLOSE_REOPEN_REQUEST_STATUSES,
    closeAdjustmentTypes: CLOSE_ADJUSTMENT_TYPES,
    closeAdjustmentStatuses: CLOSE_ADJUSTMENT_STATUSES,
    instantiateCloseChecklist(input) {
      return instantiateCloseChecklist(helpers, input);
    },
    listCloseWorkbenches(input) {
      return listCloseWorkbenches(helpers, input);
    },
    getCloseWorkbench(input) {
      return getCloseWorkbench(helpers, input);
    },
    completeCloseChecklistStep(input) {
      return completeCloseChecklistStep(helpers, input);
    },
    openCloseBlocker(input) {
      return openCloseBlocker(helpers, input);
    },
    resolveCloseBlocker(input) {
      return resolveCloseBlocker(helpers, input);
    },
    approveCloseOverride(input) {
      return approveCloseOverride(helpers, input);
    },
    signOffCloseChecklist(input) {
      return signOffCloseChecklist(helpers, input);
    },
    listCloseReopenRequests(input) {
      return listCloseReopenRequests(helpers, input);
    },
    getCloseReopenRequest(input) {
      return getCloseReopenRequest(helpers, input);
    },
    requestCloseReopen(input) {
      return requestCloseReopen(helpers, input);
    },
    listCloseAdjustments(input) {
      return listCloseAdjustments(helpers, input);
    },
    getCloseAdjustment(input) {
      return getCloseAdjustment(helpers, input);
    },
    createCloseAdjustment(input) {
      return createCloseAdjustment(helpers, input);
    },
    relockCloseReopenRequest(input) {
      return relockCloseReopenRequest(helpers, input);
    },
    snapshotClose(snapshotState = state) {
      return snapshotClose(snapshotState);
    }
  };
}

function instantiateCloseChecklist(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    clientCompanyId,
    accountingPeriodId,
    targetCloseDate = null,
    ownerCompanyUserId = null,
    signoffChain,
    reportSnapshotId = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const principal = helpers.authorize(sessionToken, bureauOrgId, "company.read");
  const portfolio = helpers.findActivePortfolioForClient(bureauOrgId, text(clientCompanyId, "client_company_id_required"));
  helpers.assertVisible(principal, portfolio.portfolioId);
  const accountingPeriod = requireAccountingPeriod(helpers, clientCompanyId, accountingPeriodId);
  const owner = ownerCompanyUserId ? helpers.requireBureauUser(bureauOrgId, ownerCompanyUserId) : helpers.requireBureauUser(bureauOrgId, principal.companyUserId);
  const resolvedSignoffChain = normalizeSignoffChain(helpers, bureauOrgId, signoffChain);
  const deadline = deriveCloseDeadline(helpers, clientCompanyId, targetCloseDate || accountingPeriod.endsOn);
  const createdAt = helpers.now();
  const checklistId = crypto.randomUUID();
  const checklist = {
    checklistId,
    bureauOrgId,
    portfolioId: portfolio.portfolioId,
    clientCompanyId,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    periodCode: accountingPeriod.label || accountingPeriod.periodCode || accountingPeriod.accountingPeriodId,
    checklistTemplateCode: "monthly_standard",
    checklistVersion: nextChecklistVersion(helpers.state, clientCompanyId, accountingPeriod.accountingPeriodId),
    status: "created",
    ownerCompanyUserId: owner.companyUserId,
    createdByUserId: principal.userId,
    targetCloseDate: targetCloseDate || accountingPeriod.endsOn,
    deadlineAt: deadline.deadlineAt,
    deadlineBasis: deadline.deadlineBasis,
    closeState: accountingPeriod.status === "hard_closed" ? "hard_closed" : "open",
    reportSnapshotId: norm(reportSnapshotId),
    signoffChain: resolvedSignoffChain,
    steps: createDefaultSteps({
      bureauOrgId,
      ownerCompanyUserId: owner.companyUserId,
      deadlineAt: deadline.deadlineAt,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      reportSnapshotId,
      nowIso: createdAt
    }),
    createdAt,
    updatedAt: createdAt,
    signedOffAt: null,
    closedAt: null,
    currentEvidenceBundleId: null,
    supersededByChecklistId: null,
    supersedesChecklistId: null
  };
  helpers.state.closeChecklists.set(checklist.checklistId, checklist);
  helpers.upsertWorkItem({
    bureauOrgId,
    portfolioId: portfolio.portfolioId,
    clientCompanyId,
    sourceType: "close_checklist",
    sourceId: checklist.checklistId,
    ownerCompanyUserId: owner.companyUserId,
    deadlineAt: checklist.deadlineAt,
    blockerScope: "close",
    status: "open",
    actorId: principal.userId,
    correlationId,
    reasonCode: "close_checklist_created"
  });
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_checklist.created",
    entityType: "close_checklist",
    entityId: checklist.checklistId,
    explanation: `Created close checklist ${checklist.checklistId} for accounting period ${accountingPeriod.accountingPeriodId}.`
  });
  return materializeChecklist(helpers, checklist);
}

function listCloseWorkbenches(
  helpers,
  { sessionToken, bureauOrgId, clientCompanyId = null, accountingPeriodId = null, status = null } = {}
) {
  const principal = helpers.authorize(sessionToken, bureauOrgId, "company.read");
  return [...helpers.state.closeChecklists.values()]
    .filter((checklist) => checklist.bureauOrgId === bureauOrgId)
    .filter((checklist) => !clientCompanyId || checklist.clientCompanyId === clientCompanyId)
    .filter((checklist) => !accountingPeriodId || checklist.accountingPeriodId === accountingPeriodId)
    .filter((checklist) => !status || checklist.status === status)
    .filter((checklist) => canReadChecklist(helpers, principal, checklist))
    .sort((left, right) => left.targetCloseDate.localeCompare(right.targetCloseDate))
    .map((checklist) => materializeChecklist(helpers, checklist));
}

function getCloseWorkbench(helpers, { sessionToken, bureauOrgId, checklistId } = {}) {
  const principal = helpers.authorize(sessionToken, bureauOrgId, "company.read");
  const checklist = requireChecklist(helpers, checklistId);
  if (checklist.bureauOrgId !== bureauOrgId) {
    throw helpers.error(404, "close_checklist_not_found", "Close checklist was not found.");
  }
  helpers.assertVisible(principal, checklist.portfolioId);
  return materializeChecklist(helpers, checklist);
}

function completeCloseChecklistStep(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    checklistId,
    stepCode,
    reconciliationRunId = null,
    evidenceRefs = [],
    comment = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const { principal, checklist } = requireChecklistAccess(helpers, sessionToken, bureauOrgId, checklistId);
  const step = requireChecklistStep(checklist, stepCode);
  if (["signed_off", "closed"].includes(checklist.status)) {
    throw helpers.error(400, "close_checklist_immutable", "Signed or closed close checklist cannot be changed.");
  }
  if (step.reconciliationAreaCode) {
    const run = requireSignedReconciliationRun(helpers, checklist, step, reconciliationRunId);
    step.reconciliationRunId = run.reconciliationRunId;
    step.evidenceRefs = [{
      evidenceType: "reconciliation_run",
      reconciliationRunId: run.reconciliationRunId,
      snapshotHash: run.snapshotHash,
      areaCode: run.areaCode
    }];
  } else if (step.evidenceType === "report_snapshot") {
    const reportSnapshotId = norm(reconciliationRunId) || checklist.reportSnapshotId || evidenceRefs[0]?.reportSnapshotId;
    if (!reportSnapshotId) {
      throw helpers.error(400, "close_report_snapshot_required", "Report backup step requires a report snapshot.");
    }
    step.evidenceRefs = [{ evidenceType: "report_snapshot", reportSnapshotId }];
  } else {
    step.evidenceRefs = normalizeEvidenceRefs(evidenceRefs, step.evidenceType);
  }
  step.status = "complete";
  step.comment = norm(comment);
  step.completedAt = helpers.now();
  step.completedByUserId = principal.userId;
  step.updatedAt = helpers.now();
  checklist.updatedAt = helpers.now();
  if (checklist.status === "created") {
    checklist.status = "in_progress";
  }
  refreshChecklistReadiness(helpers, checklist, principal, correlationId);
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_step.completed",
    entityType: "close_checklist_step",
    entityId: step.stepId,
    explanation: `Completed close checklist step ${step.stepCode} on checklist ${checklist.checklistId}.`
  });
  return materializeChecklist(helpers, checklist);
}

function openCloseBlocker(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    checklistId,
    stepCode,
    severity,
    reasonCode,
    ownerCompanyUserId = null,
    comment = null,
    waiverUntil = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const { principal, checklist } = requireChecklistAccess(helpers, sessionToken, bureauOrgId, checklistId);
  const step = requireChecklistStep(checklist, stepCode);
  const resolvedSeverity = text(severity, "close_blocker_severity_required");
  if (!CLOSE_BLOCKER_SEVERITIES.includes(resolvedSeverity)) {
    throw helpers.error(400, "close_blocker_severity_invalid", "Close blocker severity is not supported.");
  }
  const owner = ownerCompanyUserId ? helpers.requireBureauUser(bureauOrgId, ownerCompanyUserId) : helpers.requireBureauUser(bureauOrgId, checklist.ownerCompanyUserId);
  const blocker = {
    blockerId: crypto.randomUUID(),
    bureauOrgId,
    checklistId: checklist.checklistId,
    stepId: step.stepId,
    severity: resolvedSeverity,
    reasonCode: text(reasonCode, "close_blocker_reason_code_required"),
    ownerCompanyUserId: owner.companyUserId,
    openedByUserId: principal.userId,
    comment: norm(comment),
    status: "open",
    overrideState: "not_requested",
    waiverUntil: norm(waiverUntil),
    approvedByUserId: null,
    approvedByRoleCode: null,
    resolvedAt: null,
    resolvedByUserId: null,
    createdAt: helpers.now(),
    updatedAt: helpers.now()
  };
  helpers.state.closeBlockers.set(blocker.blockerId, blocker);
  step.status = "blocked";
  step.blockerIds = [...new Set([...(step.blockerIds || []), blocker.blockerId])];
  step.updatedAt = helpers.now();
  checklist.status = "in_progress";
  checklist.updatedAt = helpers.now();
  helpers.upsertWorkItem({
    bureauOrgId,
    portfolioId: checklist.portfolioId,
    clientCompanyId: checklist.clientCompanyId,
    sourceType: "close_blocker",
    sourceId: blocker.blockerId,
    ownerCompanyUserId: owner.companyUserId,
    deadlineAt: checklist.deadlineAt,
    blockerScope: "close",
    status: resolvedSeverity === "critical" ? "blocked" : "open",
    actorId: principal.userId,
    correlationId,
    reasonCode: "close_blocker_opened"
  });
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_blocker.opened",
    entityType: "close_blocker",
    entityId: blocker.blockerId,
    explanation: `Opened ${resolvedSeverity} blocker ${blocker.blockerId} on checklist ${checklist.checklistId}.`
  });
  return clone(blocker);
}

function resolveCloseBlocker(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    blockerId,
    resolutionType = "resolved",
    comment = null,
    waiverUntil = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const blocker = requireBlocker(helpers, blockerId);
  const { principal, checklist } = requireChecklistAccess(helpers, sessionToken, bureauOrgId, blocker.checklistId);
  const step = checklist.steps.find((candidate) => candidate.stepId === blocker.stepId);
  const resolvedType = text(resolutionType, "close_blocker_resolution_type_required");
  if (!["resolved", "closed"].includes(resolvedType)) {
    throw helpers.error(400, "close_blocker_resolution_type_invalid", "Close blocker resolution type is not supported.");
  }
  blocker.status = resolvedType;
  blocker.comment = norm(comment) || blocker.comment;
  blocker.waiverUntil = norm(waiverUntil) || blocker.waiverUntil;
  blocker.resolvedAt = helpers.now();
  blocker.resolvedByUserId = principal.userId;
  blocker.updatedAt = helpers.now();
  if (step) {
    step.status = step.completedAt ? "complete" : "in_progress";
    step.updatedAt = helpers.now();
  }
  checklist.updatedAt = helpers.now();
  refreshChecklistReadiness(helpers, checklist, principal, correlationId);
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_blocker.resolved",
    entityType: "close_blocker",
    entityId: blocker.blockerId,
    explanation: `Resolved blocker ${blocker.blockerId} with status ${resolvedType}.`
  });
  return clone(blocker);
}

function approveCloseOverride(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    blockerId,
    waiverUntil,
    comment = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const blocker = requireBlocker(helpers, blockerId);
  const { principal, checklist } = requireChecklistAccess(helpers, sessionToken, bureauOrgId, blocker.checklistId);
  const step = checklist.steps.find((candidate) => candidate.stepId === blocker.stepId);
  const approver = helpers.requireBureauUser(bureauOrgId, principal.companyUserId);
  if (!["close_signatory", "finance_manager", "company_admin"].includes(String(approver.roleCode || "").toLowerCase())) {
    throw helpers.error(403, "override_not_authorized", "Override requires a senior finance role.");
  }
  blocker.status = "waived";
  blocker.overrideState = "approved";
  blocker.waiverUntil = dateOnly(waiverUntil, "close_blocker_waiver_until_required");
  blocker.approvedByUserId = principal.userId;
  blocker.approvedByRoleCode = String(approver.roleCode || "").toLowerCase();
  blocker.comment = norm(comment) || blocker.comment;
  blocker.updatedAt = helpers.now();
  if (step) {
    step.status = step.completedAt ? "complete" : "in_progress";
    step.updatedAt = helpers.now();
  }
  checklist.updatedAt = helpers.now();
  refreshChecklistReadiness(helpers, checklist, principal, correlationId);
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_blocker.override_approved",
    entityType: "close_blocker",
    entityId: blocker.blockerId,
    explanation: `Approved override for blocker ${blocker.blockerId}.`
  });
  return clone(blocker);
}

function signOffCloseChecklist(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    checklistId,
    comment = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const { principal, checklist } = requireChecklistAccess(helpers, sessionToken, bureauOrgId, checklistId);
  const companyUser = helpers.requireBureauUser(bureauOrgId, principal.companyUserId);
  refreshChecklistReadiness(helpers, checklist, principal, correlationId);
  assertChecklistSignoffReady(helpers, checklist);
  const pendingSignatory = nextPendingSignatory(helpers, checklist);
  if (!pendingSignatory) {
    throw helpers.error(400, "close_signoff_complete", "Close checklist already has a complete sign-off chain.");
  }
  if (pendingSignatory.companyUserId !== principal.companyUserId) {
    throw helpers.error(403, "close_signatory_mismatch", "The current principal is not the expected signatory for this step.");
  }
  if ((hasAnyWaivers(helpers, checklist) || hasMaterialDifferences(helpers, checklist)) && checklist.signoffChain.length < 2) {
    throw helpers.error(400, "close_dual_control_required", "Checklist requires at least two signatories because it contains waivers or material differences.");
  }
  checklist.status = "signoff_pending";
  checklist.updatedAt = helpers.now();
  const workbench = materializeChecklist(helpers, checklist);
  const signoff = {
    signoffId: crypto.randomUUID(),
    bureauOrgId,
    checklistId: checklist.checklistId,
    sequence: pendingSignatory.sequence,
    signatoryRole: pendingSignatory.roleCode,
    signatoryCompanyUserId: pendingSignatory.companyUserId,
    signatoryUserId: principal.userId,
    decision: "approved",
    decisionAt: helpers.now(),
    evidenceSnapshotRef: workbench.evidenceSnapshotRef,
    evidenceBundleId: null,
    comment: norm(comment),
    supersededAt: null
  };
  helpers.state.closeSignoffs.set(signoff.signoffId, signoff);
  if (!nextPendingSignatory(helpers, checklist)) {
    hardCloseChecklist(helpers, checklist, companyUser, principal, correlationId);
  }
  const closeEvidenceBundle = syncCloseChecklistEvidenceBundle({
    helpers,
    checklist,
    actorId: principal.userId,
    correlationId
  });
  signoff.evidenceBundleId = closeEvidenceBundle.evidenceBundleId;
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_checklist.signed_off",
    entityType: "close_signoff_record",
    entityId: signoff.signoffId,
    explanation: `Recorded close sign-off sequence ${signoff.sequence} for checklist ${checklist.checklistId}.`
  });
  return materializeChecklist(helpers, checklist);
}

function requestCloseReopen(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    checklistId,
    reasonCode,
    impactSummary,
    impactAnalysis,
    approvedByCompanyUserId,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const { principal, checklist } = requireChecklistAccess(helpers, sessionToken, bureauOrgId, checklistId);
  if (!["signed_off", "closed", "reopened"].includes(checklist.status)) {
    throw helpers.error(400, "close_reopen_state_invalid", "Only signed or closed checklists can be reopened.");
  }
  const approver = helpers.requireBureauUser(bureauOrgId, text(approvedByCompanyUserId, "approved_by_company_user_id_required"));
  if (approver.companyUserId === principal.companyUserId) {
    throw helpers.error(400, "dual_control_required", "Requester and approver must be different users.");
  }
  if (!["close_signatory", "finance_manager", "company_admin"].includes(String(approver.roleCode || "").toLowerCase())) {
    throw helpers.error(400, "senior_finance_role_required", "Reopen requires a senior finance approver.");
  }
  const normalizedImpactAnalysis = normalizeReopenImpactAnalysis({ impactSummary, impactAnalysis });
  helpers.ledgerPlatform?.reopenAccountingPeriod?.({
    companyId: checklist.clientCompanyId,
    accountingPeriodId: checklist.accountingPeriodId,
    actorId: principal.userId,
    reasonCode: text(reasonCode, "reopen_reason_code_required"),
    approvedByActorId: approver.userId,
    approvedByRoleCode: String(approver.roleCode || "").toLowerCase(),
    correlationId
  });
  checklist.status = "reopened";
  checklist.closeState = "reopened";
  checklist.updatedAt = helpers.now();
  for (const signoff of helpers.state.closeSignoffs.values()) {
    if (signoff.checklistId === checklist.checklistId && !signoff.supersededAt) {
      signoff.supersededAt = helpers.now();
    }
  }
  const successor = clone(checklist);
  successor.checklistId = crypto.randomUUID();
  successor.checklistVersion = nextChecklistVersion(helpers.state, checklist.clientCompanyId, checklist.accountingPeriodId);
  successor.status = "in_progress";
  successor.closeState = "open";
  successor.createdAt = helpers.now();
  successor.updatedAt = helpers.now();
  successor.closedAt = null;
  successor.signedOffAt = null;
  successor.currentEvidenceBundleId = null;
  successor.supersedesChecklistId = checklist.checklistId;
  successor.supersededByChecklistId = null;
  successor.reopenRequestId = null;
  successor.reopenImpactSummary = normalizedImpactAnalysis.impactSummary;
  successor.steps = checklist.steps.map((step) => ({
    ...clone(step),
    stepId: crypto.randomUUID(),
    status: step.mandatory ? "reopened" : "not_started",
    completedAt: null,
    completedByUserId: null,
    blockerIds: [],
    updatedAt: helpers.now()
  }));
  checklist.supersededByChecklistId = successor.checklistId;
  helpers.state.closeChecklists.set(successor.checklistId, successor);
  const reopenRequest = {
    reopenRequestId: crypto.randomUUID(),
    bureauOrgId,
    checklistId: checklist.checklistId,
    successorChecklistId: successor.checklistId,
    clientCompanyId: checklist.clientCompanyId,
    accountingPeriodId: checklist.accountingPeriodId,
    requestedByUserId: principal.userId,
    approvedByUserId: approver.userId,
    approvedByRoleCode: String(approver.roleCode || "").toLowerCase(),
    reasonCode: text(reasonCode, "reopen_reason_code_required"),
    impactSummary: normalizedImpactAnalysis.impactSummary,
    impactAnalysis: normalizedImpactAnalysis,
    status: "executed",
    impactAssessedAt: helpers.now(),
    approvedAt: helpers.now(),
    executedAt: helpers.now(),
    relockedAt: null,
    relockedByUserId: null,
    relockApprovedByUserId: null,
    relockApprovedByRoleCode: null,
    relockReasonCode: null,
    relockTargetStatus: normalizedImpactAnalysis.relockTargetStatus,
    adjustmentIds: [],
    currentEvidenceBundleId: null,
    createdAt: helpers.now(),
    updatedAt: helpers.now()
  };
  successor.reopenRequestId = reopenRequest.reopenRequestId;
  helpers.state.closeReopenRequests.set(reopenRequest.reopenRequestId, reopenRequest);
  syncCloseChecklistEvidenceBundle({
    helpers,
    checklist,
    actorId: principal.userId,
    correlationId
  });
  syncCloseReopenEvidenceBundle({
    helpers,
    reopenRequest,
    actorId: principal.userId,
    correlationId
  });
  helpers.upsertWorkItem({
    bureauOrgId,
    portfolioId: successor.portfolioId,
    clientCompanyId: successor.clientCompanyId,
    sourceType: "close_reopen_request",
    sourceId: reopenRequest.reopenRequestId,
    ownerCompanyUserId: successor.ownerCompanyUserId,
    deadlineAt: successor.deadlineAt,
    blockerScope: "close",
    status: "open",
    actorId: principal.userId,
    correlationId,
    reasonCode: "close_reopened"
  });
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_checklist.reopened",
    entityType: "close_reopen_request",
    entityId: reopenRequest.reopenRequestId,
    explanation: `Reopened close checklist ${checklist.checklistId} into successor ${successor.checklistId}.`
  });
  return {
    reopenRequest: materializeReopenRequest(helpers, reopenRequest),
    successorChecklist: materializeChecklist(helpers, successor),
    supersededChecklist: materializeChecklist(helpers, checklist)
  };
}

function snapshotClose(state) {
  return clone({
    closeChecklists: [...state.closeChecklists.values()],
    closeBlockers: [...state.closeBlockers.values()],
    closeSignoffs: [...state.closeSignoffs.values()],
    closeReopenRequests: [...state.closeReopenRequests.values()],
    closeAdjustments: [...state.closeAdjustments.values()]
  });
}

function materializeChecklist(helpers, checklist) {
  const blockers = listChecklistBlockers(helpers, checklist);
  const signoffs = listChecklistSignoffs(helpers, checklist);
  const reopenRequests = [...helpers.state.closeReopenRequests.values()]
    .filter((candidate) => candidate.checklistId === checklist.checklistId || candidate.successorChecklistId === checklist.checklistId)
    .map((candidate) => materializeReopenRequest(helpers, candidate));
  const requiredOpenBlockers = blockers.filter((candidate) => candidate.status === "open" && ["hard_stop", "critical"].includes(candidate.severity));
  const period = getAccountingPeriod(helpers, checklist.clientCompanyId, checklist.accountingPeriodId);
  const evidenceSnapshotRef = createChecklistEvidenceSnapshotRef(helpers, checklist, { blockers, signoffs });
  const closeEvidenceBundle = materializeEvidenceBundleForCompany(helpers, checklist.clientCompanyId, checklist.currentEvidenceBundleId);
  return clone({
    ...checklist,
    accountingPeriod: period,
    blockers,
    signoffs,
    reopenRequests,
    openHardStopBlockerCount: requiredOpenBlockers.length,
    closeEvidenceBundleId: checklist.currentEvidenceBundleId || null,
    closeEvidenceBundle,
    evidenceSnapshotRef
  });
}

function listCloseReopenRequests(
  helpers,
  { sessionToken, bureauOrgId, clientCompanyId = null, accountingPeriodId = null, status = null } = {}
) {
  const principal = helpers.authorize(sessionToken, bureauOrgId, "company.read");
  return [...helpers.state.closeReopenRequests.values()]
    .filter((candidate) => candidate.bureauOrgId === bureauOrgId)
    .filter((candidate) => !clientCompanyId || candidate.clientCompanyId === clientCompanyId)
    .filter((candidate) => !accountingPeriodId || candidate.accountingPeriodId === accountingPeriodId)
    .filter((candidate) => !status || candidate.status === status)
    .filter((candidate) => canReadChecklist(helpers, principal, requireChecklist(helpers, candidate.checklistId)))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((candidate) => materializeReopenRequest(helpers, candidate));
}

function getCloseReopenRequest(helpers, { sessionToken, bureauOrgId, reopenRequestId } = {}) {
  const { reopenRequest } = requireReopenRequestAccess(helpers, sessionToken, bureauOrgId, reopenRequestId);
  return materializeReopenRequest(helpers, reopenRequest);
}

function listCloseAdjustments(
  helpers,
  { sessionToken, bureauOrgId, reopenRequestId = null, checklistId = null } = {}
) {
  const principal = helpers.authorize(sessionToken, bureauOrgId, "company.read");
  return [...helpers.state.closeAdjustments.values()]
    .filter((candidate) => candidate.bureauOrgId === bureauOrgId)
    .filter((candidate) => !reopenRequestId || candidate.reopenRequestId === reopenRequestId)
    .filter((candidate) => !checklistId || candidate.checklistId === checklistId)
    .filter((candidate) => canReadChecklist(helpers, principal, requireChecklist(helpers, candidate.checklistId)))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((candidate) => materializeCloseAdjustment(helpers, candidate));
}

function getCloseAdjustment(helpers, { sessionToken, bureauOrgId, adjustmentId } = {}) {
  const { adjustment } = requireCloseAdjustmentAccess(helpers, sessionToken, bureauOrgId, adjustmentId);
  return materializeCloseAdjustment(helpers, adjustment);
}

function createCloseAdjustment(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    reopenRequestId,
    adjustmentType,
    journalEntryId,
    reasonCode,
    correctionKey,
    approvedByCompanyUserId,
    journalDate = null,
    voucherSeriesCode = null,
    lines = null,
    comment = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const { principal, reopenRequest, checklist } = requireReopenRequestAccess(helpers, sessionToken, bureauOrgId, reopenRequestId);
  if (reopenRequest.status !== "executed") {
    throw helpers.error(409, "close_reopen_request_not_executed", "Close reopen request must be executed before adjustments can be created.");
  }
  const approver = helpers.requireBureauUser(bureauOrgId, text(approvedByCompanyUserId, "approved_by_company_user_id_required"));
  if (approver.companyUserId === principal.companyUserId) {
    throw helpers.error(400, "dual_control_required", "Requester and approver must be different users.");
  }
  if (!["close_signatory", "finance_manager", "company_admin"].includes(String(approver.roleCode || "").toLowerCase())) {
    throw helpers.error(400, "senior_finance_role_required", "Close adjustment requires a senior finance approver.");
  }
  const resolvedAdjustmentType = text(adjustmentType, "close_adjustment_type_required");
  if (!CLOSE_ADJUSTMENT_TYPES.includes(resolvedAdjustmentType)) {
    throw helpers.error(400, "close_adjustment_type_invalid", "Close adjustment type is not supported.");
  }
  const sourceJournalEntry = helpers.ledgerPlatform?.getJournalEntry?.({
    companyId: checklist.clientCompanyId,
    journalEntryId: text(journalEntryId, "journal_entry_id_required")
  });
  if (!sourceJournalEntry) {
    throw helpers.error(404, "journal_entry_not_found", "Journal entry was not found.");
  }
  const checklistAccountingPeriod = requireAccountingPeriod(helpers, checklist.clientCompanyId, checklist.accountingPeriodId);
  const sourceAccountingPeriod = getAccountingPeriod(helpers, checklist.clientCompanyId, sourceJournalEntry.accountingPeriodId);
  if (
    sourceAccountingPeriod
    && (
      sourceAccountingPeriod.startsOn < checklistAccountingPeriod.startsOn
      || sourceAccountingPeriod.endsOn > checklistAccountingPeriod.endsOn
    )
  ) {
    throw helpers.error(409, "close_adjustment_period_mismatch", "Close adjustment journal entry must belong to the reopened accounting period.");
  }

  let ledgerResult;
  if (resolvedAdjustmentType === "reversal") {
    ledgerResult = helpers.ledgerPlatform?.reverseJournalEntry?.({
      companyId: checklist.clientCompanyId,
      journalEntryId: sourceJournalEntry.journalEntryId,
      actorId: principal.userId,
      reasonCode: text(reasonCode, "close_adjustment_reason_code_required"),
      correctionKey: text(correctionKey, "close_adjustment_correction_key_required"),
      journalDate,
      voucherSeriesCode,
      metadataJson: {
        closeReopenRequestId: reopenRequest.reopenRequestId,
        closeAdjustmentType: resolvedAdjustmentType,
        closeAdjustmentComment: norm(comment)
      },
      correlationId
    });
  } else {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw helpers.error(400, "close_adjustment_lines_required", "Correction replacement requires replacement journal lines.");
    }
    ledgerResult = helpers.ledgerPlatform?.correctJournalEntry?.({
      companyId: checklist.clientCompanyId,
      journalEntryId: sourceJournalEntry.journalEntryId,
      actorId: principal.userId,
      reasonCode: text(reasonCode, "close_adjustment_reason_code_required"),
      correctionKey: text(correctionKey, "close_adjustment_correction_key_required"),
      lines,
      journalDate,
      voucherSeriesCode,
      reverseOriginal: true,
      metadataJson: {
        closeReopenRequestId: reopenRequest.reopenRequestId,
        closeAdjustmentType: resolvedAdjustmentType,
        closeAdjustmentComment: norm(comment)
      },
      correlationId
    });
  }

  const adjustment = {
    adjustmentId: crypto.randomUUID(),
    bureauOrgId,
    reopenRequestId: reopenRequest.reopenRequestId,
    checklistId: checklist.checklistId,
    successorChecklistId: reopenRequest.successorChecklistId,
    clientCompanyId: checklist.clientCompanyId,
    accountingPeriodId: checklist.accountingPeriodId,
    adjustmentType: resolvedAdjustmentType,
    status: "posted",
    sourceJournalEntryId: sourceJournalEntry.journalEntryId,
    reversalJournalEntryId: ledgerResult?.reversalJournalEntry?.journalEntryId || null,
    replacementJournalEntryId: ledgerResult?.correctedJournalEntry?.journalEntryId || null,
    correctionKey: text(correctionKey, "close_adjustment_correction_key_required"),
    reasonCode: text(reasonCode, "close_adjustment_reason_code_required"),
    comment: norm(comment),
    createdByUserId: principal.userId,
    approvedByUserId: approver.userId,
    approvedByRoleCode: String(approver.roleCode || "").toLowerCase(),
    createdAt: helpers.now(),
    updatedAt: helpers.now()
  };
  helpers.state.closeAdjustments.set(adjustment.adjustmentId, adjustment);
  reopenRequest.adjustmentIds = [...new Set([...(reopenRequest.adjustmentIds || []), adjustment.adjustmentId])];
  reopenRequest.updatedAt = helpers.now();
  helpers.upsertWorkItem({
    bureauOrgId,
    portfolioId: checklist.portfolioId,
    clientCompanyId: checklist.clientCompanyId,
    sourceType: "close_adjustment",
    sourceId: adjustment.adjustmentId,
    ownerCompanyUserId: checklist.ownerCompanyUserId,
    deadlineAt: checklist.deadlineAt,
    blockerScope: "close",
    status: "resolved",
    actorId: principal.userId,
    correlationId,
    reasonCode: "close_adjustment_posted"
  });
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_adjustment.posted",
    entityType: "close_adjustment",
    entityId: adjustment.adjustmentId,
    explanation: `Posted ${resolvedAdjustmentType} adjustment ${adjustment.adjustmentId} for reopen request ${reopenRequest.reopenRequestId}.`
  });
  syncCloseReopenEvidenceBundle({
    helpers,
    reopenRequest,
    actorId: principal.userId,
    correlationId
  });
  return materializeCloseAdjustment(helpers, adjustment);
}

function relockCloseReopenRequest(
  helpers,
  {
    sessionToken,
    bureauOrgId,
    reopenRequestId,
    reasonCode,
    approvedByCompanyUserId,
    targetLockStatus = null,
    correlationId = crypto.randomUUID()
  } = {}
) {
  const { principal, reopenRequest, checklist } = requireReopenRequestAccess(helpers, sessionToken, bureauOrgId, reopenRequestId);
  if (reopenRequest.status !== "executed") {
    throw helpers.error(409, "close_reopen_request_not_relockable", "Only executed reopen requests can be relocked.");
  }
  const approver = helpers.requireBureauUser(bureauOrgId, text(approvedByCompanyUserId, "approved_by_company_user_id_required"));
  if (approver.companyUserId === principal.companyUserId) {
    throw helpers.error(400, "dual_control_required", "Requester and approver must be different users.");
  }
  if (!["close_signatory", "finance_manager", "company_admin"].includes(String(approver.roleCode || "").toLowerCase())) {
    throw helpers.error(400, "senior_finance_role_required", "Relock requires a senior finance approver.");
  }
  const resolvedTargetLockStatus = targetLockStatus
    ? text(targetLockStatus, "close_relock_target_status_required")
    : reopenRequest.relockTargetStatus || "soft_locked";
  if (!RELOCK_TARGET_STATUSES.includes(resolvedTargetLockStatus)) {
    throw helpers.error(400, "close_relock_target_status_invalid", "Relock target status is not supported.");
  }
  if (resolvedTargetLockStatus === "hard_closed") {
    throw helpers.error(409, "close_relock_requires_successor_signoff", "Reopen relock must return the period to soft-locked state before close sign-off can hard close it again.");
  }
  if (reopenRequest.impactAnalysis?.requiresCorrectionReplacement && (reopenRequest.adjustmentIds || []).length === 0) {
    throw helpers.error(409, "close_relock_adjustment_required", "Reopen request requires at least one posted close adjustment before relock.");
  }
  const successorChecklist = requireChecklist(helpers, reopenRequest.successorChecklistId);
  helpers.ledgerPlatform?.lockAccountingPeriod?.({
    companyId: checklist.clientCompanyId,
    accountingPeriodId: checklist.accountingPeriodId,
    status: resolvedTargetLockStatus,
    actorId: principal.userId,
    reasonCode: text(reasonCode, "close_relock_reason_code_required"),
    approvedByActorId: approver.userId,
    approvedByRoleCode: String(approver.roleCode || "").toLowerCase(),
    correlationId
  });
  reopenRequest.status = "relocked";
  reopenRequest.relockedAt = helpers.now();
  reopenRequest.relockedByUserId = principal.userId;
  reopenRequest.relockApprovedByUserId = approver.userId;
  reopenRequest.relockApprovedByRoleCode = String(approver.roleCode || "").toLowerCase();
  reopenRequest.relockReasonCode = text(reasonCode, "close_relock_reason_code_required");
  reopenRequest.updatedAt = helpers.now();
  successorChecklist.closeState = "subledger_locked";
  successorChecklist.updatedAt = helpers.now();
  helpers.upsertWorkItem({
    bureauOrgId,
    portfolioId: checklist.portfolioId,
    clientCompanyId: checklist.clientCompanyId,
    sourceType: "close_reopen_request",
    sourceId: reopenRequest.reopenRequestId,
    ownerCompanyUserId: successorChecklist.ownerCompanyUserId,
    deadlineAt: successorChecklist.deadlineAt,
    blockerScope: "close",
    status: "resolved",
    actorId: principal.userId,
    correlationId,
    reasonCode: "close_reopen_relocked"
  });
  syncCloseReopenEvidenceBundle({
    helpers,
    reopenRequest,
    actorId: principal.userId,
    correlationId
  });
  helpers.audit({
    companyId: bureauOrgId,
    actorId: principal.userId,
    correlationId,
    action: "core.close_reopen_request.relocked",
    entityType: "close_reopen_request",
    entityId: reopenRequest.reopenRequestId,
    explanation: `Relocked reopen request ${reopenRequest.reopenRequestId} for accounting period ${checklist.accountingPeriodId}.`
  });
  return materializeReopenRequest(helpers, reopenRequest);
}

function refreshChecklistReadiness(helpers, checklist, principal, correlationId) {
  const mandatorySteps = checklist.steps.filter((step) => step.mandatory);
  const incompleteMandatoryStep = mandatorySteps.find((step) => !["complete"].includes(step.status));
  const openBlockingBlockers = [...helpers.state.closeBlockers.values()].filter(
    (candidate) => candidate.checklistId === checklist.checklistId
      && candidate.status === "open"
      && ["hard_stop", "critical"].includes(candidate.severity)
  );
  if (openBlockingBlockers.length === 0 && !incompleteMandatoryStep) {
    checklist.status = "review_ready";
    if (helpers.ledgerPlatform?.lockAccountingPeriod) {
      const period = getAccountingPeriod(helpers, checklist.clientCompanyId, checklist.accountingPeriodId);
      if (period && period.status === "open") {
        helpers.ledgerPlatform.lockAccountingPeriod({
          companyId: checklist.clientCompanyId,
          accountingPeriodId: checklist.accountingPeriodId,
          status: "soft_locked",
          actorId: principal.userId,
          reasonCode: "close_review_ready",
          correlationId
        });
      }
      checklist.closeState = "subledger_locked";
    }
  } else if (checklist.status !== "reopened") {
    checklist.status = mandatorySteps.some((step) => step.status === "complete") ? "in_progress" : checklist.status;
  }
  checklist.updatedAt = helpers.now();
}

function assertChecklistSignoffReady(helpers, checklist) {
  const openBlockingBlockers = [...helpers.state.closeBlockers.values()].filter(
    (candidate) => candidate.checklistId === checklist.checklistId
      && candidate.status === "open"
      && ["hard_stop", "critical"].includes(candidate.severity)
  );
  if (openBlockingBlockers.length > 0) {
    throw helpers.error(400, "close_blocker_open", "Open hard-stop or critical blockers prevent sign-off.");
  }
  const incompleteMandatoryStep = checklist.steps.find((step) => step.mandatory && step.status !== "complete");
  if (incompleteMandatoryStep) {
    throw helpers.error(400, "close_checklist_incomplete", "All mandatory close checklist steps must be complete before sign-off.");
  }
}

function nextPendingSignatory(helpers, checklist) {
  const completedSequences = new Set(
    [...helpers.state.closeSignoffs.values()]
      .filter((candidate) => candidate.checklistId === checklist.checklistId && !candidate.supersededAt)
      .map((candidate) => candidate.sequence)
  );
  return checklist.signoffChain.find((candidate) => !completedSequences.has(candidate.sequence)) || null;
}

function materializeReopenRequest(helpers, reopenRequest) {
  const adjustments = [...helpers.state.closeAdjustments.values()]
    .filter((candidate) => candidate.reopenRequestId === reopenRequest.reopenRequestId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((candidate) => materializeCloseAdjustment(helpers, candidate));
  const reopenEvidenceBundle = materializeEvidenceBundleForCompany(helpers, reopenRequest.clientCompanyId, reopenRequest.currentEvidenceBundleId);
  return clone({
    ...reopenRequest,
    reopenEvidenceBundleId: reopenRequest.currentEvidenceBundleId || null,
    reopenEvidenceBundle,
    adjustments
  });
}

function materializeCloseAdjustment(helpers, adjustment) {
  return clone({
    ...adjustment,
    sourceJournalEntry: helpers.ledgerPlatform?.getJournalEntry?.({
      companyId: adjustment.clientCompanyId,
      journalEntryId: adjustment.sourceJournalEntryId
    }) || null,
    reversalJournalEntry: adjustment.reversalJournalEntryId
      ? helpers.ledgerPlatform?.getJournalEntry?.({
        companyId: adjustment.clientCompanyId,
        journalEntryId: adjustment.reversalJournalEntryId
      }) || null
      : null,
    replacementJournalEntry: adjustment.replacementJournalEntryId
      ? helpers.ledgerPlatform?.getJournalEntry?.({
        companyId: adjustment.clientCompanyId,
        journalEntryId: adjustment.replacementJournalEntryId
      }) || null
      : null
  });
}

function hardCloseChecklist(helpers, checklist, companyUser, principal, correlationId) {
  if (!["close_signatory", "finance_manager", "company_admin"].includes(String(companyUser.roleCode || "").toLowerCase())) {
    throw helpers.error(403, "close_signatory_role_required", "Final close sign-off requires a senior finance role.");
  }
  helpers.ledgerPlatform?.lockAccountingPeriod?.({
    companyId: checklist.clientCompanyId,
    accountingPeriodId: checklist.accountingPeriodId,
    status: "hard_closed",
    actorId: checklist.createdByUserId,
    reasonCode: "close_signoff",
    approvedByActorId: principal.userId,
    approvedByRoleCode: String(companyUser.roleCode || "").toLowerCase(),
    correlationId
  });
  checklist.status = "closed";
  checklist.closeState = "hard_closed";
  checklist.signedOffAt = helpers.now();
  checklist.closedAt = helpers.now();
  checklist.updatedAt = helpers.now();
}

function listChecklistBlockers(helpers, checklist) {
  return [...helpers.state.closeBlockers.values()]
    .filter((candidate) => candidate.checklistId === checklist.checklistId)
    .map(clone);
}

function listChecklistSignoffs(helpers, checklist) {
  return [...helpers.state.closeSignoffs.values()]
    .filter((candidate) => candidate.checklistId === checklist.checklistId)
    .sort((left, right) => left.sequence - right.sequence)
    .map(clone);
}

function createChecklistEvidenceSnapshotRef(helpers, checklist, { blockers = null, signoffs = null } = {}) {
  const resolvedBlockers = blockers || listChecklistBlockers(helpers, checklist);
  const resolvedSignoffs = signoffs || listChecklistSignoffs(helpers, checklist);
  const evidenceSnapshotHash = hashSnapshot({
    checklistId: checklist.checklistId,
    checklistVersion: checklist.checklistVersion,
    accountingPeriodId: checklist.accountingPeriodId,
    status: checklist.status,
    closeState: checklist.closeState,
    steps: checklist.steps.map((step) => ({
      stepCode: step.stepCode,
      status: step.status,
      reconciliationRunId: step.reconciliationRunId,
      evidenceRefs: step.evidenceRefs
    })),
    blockers: resolvedBlockers.map((blocker) => ({
      blockerId: blocker.blockerId,
      severity: blocker.severity,
      status: blocker.status,
      overrideState: blocker.overrideState
    })),
    signoffs: resolvedSignoffs.map((signoff) => ({
      signoffId: signoff.signoffId,
      sequence: signoff.sequence,
      signatoryCompanyUserId: signoff.signatoryCompanyUserId,
      decisionAt: signoff.decisionAt,
      supersededAt: signoff.supersededAt
    }))
  });
  return {
    snapshotType: "close_workbench",
    snapshotHash: evidenceSnapshotHash,
    accountingPeriodId: checklist.accountingPeriodId,
    checklistId: checklist.checklistId,
    checklistVersion: checklist.checklistVersion
  };
}

function materializeEvidenceBundleForCompany(helpers, companyId, evidenceBundleId) {
  if (!companyId || !evidenceBundleId || !helpers.evidencePlatform?.getEvidenceBundle) {
    return null;
  }
  return helpers.evidencePlatform.getEvidenceBundle({
    companyId,
    evidenceBundleId
  });
}

function syncCloseChecklistEvidenceBundle({ helpers, checklist, actorId, correlationId }) {
  if (!helpers.evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    throw helpers.error(500, "evidence_platform_required", "Evidence platform is required.");
  }
  const blockers = listChecklistBlockers(helpers, checklist);
  const signoffs = listChecklistSignoffs(helpers, checklist);
  const period = getAccountingPeriod(helpers, checklist.clientCompanyId, checklist.accountingPeriodId);
  const evidenceSnapshotRef = createChecklistEvidenceSnapshotRef(helpers, checklist, { blockers, signoffs });
  const compatibilityPayload = {
    bureauOrgId: checklist.bureauOrgId,
    clientCompanyId: checklist.clientCompanyId,
    checklistId: checklist.checklistId,
    checklistVersion: checklist.checklistVersion,
    accountingPeriodId: checklist.accountingPeriodId,
    periodCode: checklist.periodCode,
    status: checklist.status,
    closeState: checklist.closeState,
    reportSnapshotId: checklist.reportSnapshotId || null,
    targetCloseDate: checklist.targetCloseDate,
    deadlineAt: checklist.deadlineAt,
    ownerCompanyUserId: checklist.ownerCompanyUserId,
    evidenceSnapshotRef,
    openHardStopBlockerCount: blockers.filter((candidate) => candidate.status === "open" && ["hard_stop", "critical"].includes(candidate.severity)).length,
    accountingPeriodStatus: period?.status || null,
    steps: checklist.steps.map((step) => ({
      stepCode: step.stepCode,
      title: step.title,
      status: step.status,
      evidenceType: step.evidenceType,
      reconciliationAreaCode: step.reconciliationAreaCode,
      reconciliationRunId: step.reconciliationRunId,
      completedAt: step.completedAt,
      completedByUserId: step.completedByUserId,
      evidenceRefs: clone(step.evidenceRefs || [])
    })),
    blockers: blockers.map((blocker) => ({
      blockerId: blocker.blockerId,
      stepCode: blocker.stepCode,
      severity: blocker.severity,
      status: blocker.status,
      reasonCode: blocker.reasonCode,
      overrideState: blocker.overrideState,
      comment: blocker.comment || null,
      resolvedAt: blocker.resolvedAt || null
    })),
    signoffs: signoffs.map((signoff) => ({
      signoffId: signoff.signoffId,
      sequence: signoff.sequence,
      signatoryRole: signoff.signatoryRole,
      signatoryCompanyUserId: signoff.signatoryCompanyUserId,
      signatoryUserId: signoff.signatoryUserId,
      decisionAt: signoff.decisionAt,
      supersededAt: signoff.supersededAt || null
    }))
  };
  const bundle = helpers.evidencePlatform.createFrozenEvidenceBundleSnapshot({
    companyId: checklist.clientCompanyId,
    bundleType: "close_signoff",
    sourceObjectType: "close_checklist",
    sourceObjectId: checklist.checklistId,
    sourceObjectVersion: checklist.updatedAt || checklist.createdAt,
    title: `Close checklist ${checklist.periodCode}`,
    retentionClass: "regulated",
    classificationCode: "restricted_internal",
    metadata: {
      compatibilityPayload
    },
    artifactRefs: checklist.steps.flatMap((step) => {
      const refs = [];
      if (step.reconciliationRunId) {
        refs.push({
          artifactType: "close_reconciliation_run",
          artifactRef: step.reconciliationRunId,
          checksum: hashSnapshot({
            stepCode: step.stepCode,
            reconciliationRunId: step.reconciliationRunId,
            status: step.status
          }),
          roleCode: step.stepCode,
          metadata: {
            reconciliationAreaCode: step.reconciliationAreaCode || null
          }
        });
      }
      for (const evidenceRef of step.evidenceRefs || []) {
        refs.push({
          artifactType: "close_step_evidence",
          artifactRef: evidenceRef.documentId || evidenceRef.reportSnapshotId || evidenceRef.evidenceRefId || evidenceRef.note,
          checksum: hashSnapshot({
            stepCode: step.stepCode,
            evidenceRef
          }),
          roleCode: step.stepCode,
          metadata: {
            evidenceType: evidenceRef.evidenceType || step.evidenceType,
            documentId: evidenceRef.documentId || null,
            reportSnapshotId: evidenceRef.reportSnapshotId || null
          }
        });
      }
      return refs;
    }).concat(
      blockers.map((blocker) => ({
        artifactType: "close_blocker",
        artifactRef: blocker.blockerId,
        checksum: hashSnapshot({
          blockerId: blocker.blockerId,
          severity: blocker.severity,
          status: blocker.status,
          overrideState: blocker.overrideState
        }),
        roleCode: blocker.stepCode || null,
        metadata: {
          severity: blocker.severity,
          reasonCode: blocker.reasonCode
        }
      })),
      signoffs.map((signoff) => ({
        artifactType: "close_signoff",
        artifactRef: signoff.signoffId,
        checksum: hashSnapshot({
          signoffId: signoff.signoffId,
          sequence: signoff.sequence,
          decisionAt: signoff.decisionAt,
          supersededAt: signoff.supersededAt
        }),
        roleCode: signoff.signatoryRole,
        metadata: {
          sequence: signoff.sequence,
          signatoryCompanyUserId: signoff.signatoryCompanyUserId
        }
      }))
    ),
    auditRefs: signoffs.map((signoff) => ({
      signoffId: signoff.signoffId,
      signatoryUserId: signoff.signatoryUserId,
      decisionAt: signoff.decisionAt
    })),
    signoffRefs: signoffs.map((signoff) => ({
      signoffId: signoff.signoffId,
      sequence: signoff.sequence,
      signatoryRole: signoff.signatoryRole,
      signatoryCompanyUserId: signoff.signatoryCompanyUserId
    })),
    sourceRefs: [
      evidenceSnapshotRef,
      {
        accountingPeriodId: checklist.accountingPeriodId,
        accountingPeriodStatus: period?.status || null
      }
    ],
    relatedObjectRefs: [
      {
        objectType: "accounting_period",
        objectId: checklist.accountingPeriodId
      },
      ...(checklist.reportSnapshotId
        ? [
            {
              objectType: "report_snapshot",
              objectId: checklist.reportSnapshotId
            }
          ]
        : []),
      ...signoffs.map((signoff) => ({
        objectType: "company_user",
        objectId: signoff.signatoryCompanyUserId
      }))
    ],
    actorId,
    correlationId,
    previousEvidenceBundleId: checklist.currentEvidenceBundleId || null
  });
  checklist.currentEvidenceBundleId = bundle.evidenceBundleId;
  return {
    closeEvidenceBundleId: bundle.evidenceBundleId,
    evidenceBundleId: bundle.evidenceBundleId,
    checksum: bundle.checksum,
    status: bundle.status,
    frozenAt: bundle.frozenAt,
    archivedAt: bundle.archivedAt
  };
}

function syncCloseReopenEvidenceBundle({ helpers, reopenRequest, actorId, correlationId }) {
  if (!helpers.evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    throw helpers.error(500, "evidence_platform_required", "Evidence platform is required.");
  }
  const checklist = requireChecklist(helpers, reopenRequest.checklistId);
  const successorChecklist = requireChecklist(helpers, reopenRequest.successorChecklistId);
  const adjustments = [...helpers.state.closeAdjustments.values()]
    .filter((candidate) => candidate.reopenRequestId === reopenRequest.reopenRequestId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(clone);
  const compatibilityPayload = {
    bureauOrgId: reopenRequest.bureauOrgId,
    clientCompanyId: reopenRequest.clientCompanyId,
    reopenRequestId: reopenRequest.reopenRequestId,
    checklistId: reopenRequest.checklistId,
    successorChecklistId: reopenRequest.successorChecklistId,
    accountingPeriodId: reopenRequest.accountingPeriodId,
    requestedByUserId: reopenRequest.requestedByUserId,
    approvedByUserId: reopenRequest.approvedByUserId,
    approvedByRoleCode: reopenRequest.approvedByRoleCode,
    reasonCode: reopenRequest.reasonCode,
    impactSummary: reopenRequest.impactSummary,
    impactAnalysis: clone(reopenRequest.impactAnalysis || {}),
    status: reopenRequest.status,
    impactAssessedAt: reopenRequest.impactAssessedAt,
    approvedAt: reopenRequest.approvedAt,
    executedAt: reopenRequest.executedAt,
    relockedAt: reopenRequest.relockedAt || null,
    relockedByUserId: reopenRequest.relockedByUserId || null,
    relockApprovedByUserId: reopenRequest.relockApprovedByUserId || null,
    relockApprovedByRoleCode: reopenRequest.relockApprovedByRoleCode || null,
    relockReasonCode: reopenRequest.relockReasonCode || null,
    relockTargetStatus: reopenRequest.relockTargetStatus,
    adjustmentIds: [...(reopenRequest.adjustmentIds || [])],
    supersededChecklistStatus: checklist.status,
    successorChecklistStatus: successorChecklist.status,
    successorCloseState: successorChecklist.closeState
  };
  const bundle = helpers.evidencePlatform.createFrozenEvidenceBundleSnapshot({
    companyId: reopenRequest.clientCompanyId,
    bundleType: "close_reopen",
    sourceObjectType: "close_reopen_request",
    sourceObjectId: reopenRequest.reopenRequestId,
    sourceObjectVersion: reopenRequest.updatedAt || reopenRequest.createdAt,
    title: `Close reopen ${reopenRequest.reopenRequestId}`,
    retentionClass: "regulated",
    classificationCode: "restricted_internal",
    metadata: {
      compatibilityPayload
    },
    artifactRefs: adjustments.flatMap((adjustment) => [
      {
        artifactType: "close_adjustment",
        artifactRef: adjustment.adjustmentId,
        checksum: hashSnapshot({
          adjustmentId: adjustment.adjustmentId,
          adjustmentType: adjustment.adjustmentType,
          status: adjustment.status,
          updatedAt: adjustment.updatedAt
        }),
        roleCode: adjustment.adjustmentType,
        metadata: {
          reasonCode: adjustment.reasonCode,
          sourceJournalEntryId: adjustment.sourceJournalEntryId
        }
      },
      ...(adjustment.reversalJournalEntryId
        ? [{
            artifactType: "journal_entry",
            artifactRef: adjustment.reversalJournalEntryId,
            checksum: hashSnapshot({
              journalEntryId: adjustment.reversalJournalEntryId,
              adjustmentId: adjustment.adjustmentId
            }),
            roleCode: "reversal"
          }]
        : []),
      ...(adjustment.replacementJournalEntryId
        ? [{
            artifactType: "journal_entry",
            artifactRef: adjustment.replacementJournalEntryId,
            checksum: hashSnapshot({
              journalEntryId: adjustment.replacementJournalEntryId,
              adjustmentId: adjustment.adjustmentId
            }),
            roleCode: "replacement"
          }]
        : [])
    ]),
    auditRefs: [
      {
        requestedByUserId: reopenRequest.requestedByUserId,
        approvedByUserId: reopenRequest.approvedByUserId,
        approvedByRoleCode: reopenRequest.approvedByRoleCode
      },
      ...(reopenRequest.relockedByUserId
        ? [{
            relockedByUserId: reopenRequest.relockedByUserId,
            relockApprovedByUserId: reopenRequest.relockApprovedByUserId,
            relockApprovedByRoleCode: reopenRequest.relockApprovedByRoleCode
          }]
        : [])
    ],
    sourceRefs: [
      ...(Array.isArray(reopenRequest.impactAnalysis?.affectedObjectRefs)
        ? reopenRequest.impactAnalysis.affectedObjectRefs.map((candidate) => clone(candidate))
        : []),
      {
        reasonCode: reopenRequest.reasonCode,
        relockReasonCode: reopenRequest.relockReasonCode || null,
        relockTargetStatus: reopenRequest.relockTargetStatus
      }
    ],
    relatedObjectRefs: [
      {
        objectType: "close_checklist",
        objectId: reopenRequest.checklistId
      },
      {
        objectType: "close_checklist",
        objectId: reopenRequest.successorChecklistId
      },
      {
        objectType: "accounting_period",
        objectId: reopenRequest.accountingPeriodId
      },
      ...adjustments.flatMap((adjustment) => [
        {
          objectType: "close_adjustment",
          objectId: adjustment.adjustmentId
        },
        ...(adjustment.sourceJournalEntryId
          ? [{
              objectType: "journal_entry",
              objectId: adjustment.sourceJournalEntryId
            }]
          : []),
        ...(adjustment.reversalJournalEntryId
          ? [{
              objectType: "journal_entry",
              objectId: adjustment.reversalJournalEntryId
            }]
          : []),
        ...(adjustment.replacementJournalEntryId
          ? [{
              objectType: "journal_entry",
              objectId: adjustment.replacementJournalEntryId
            }]
          : [])
      ])
    ],
    actorId,
    correlationId,
    previousEvidenceBundleId: reopenRequest.currentEvidenceBundleId || null
  });
  reopenRequest.currentEvidenceBundleId = bundle.evidenceBundleId;
  return {
    reopenEvidenceBundleId: bundle.evidenceBundleId,
    evidenceBundleId: bundle.evidenceBundleId,
    checksum: bundle.checksum,
    status: bundle.status,
    frozenAt: bundle.frozenAt,
    archivedAt: bundle.archivedAt
  };
}

function hasAnyWaivers(helpers, checklist) {
  return [...helpers.state.closeBlockers.values()].some(
    (candidate) => candidate.checklistId === checklist.checklistId && candidate.status === "waived"
  );
}

function hasMaterialDifferences(helpers, checklist) {
  return checklist.steps.some((step) => {
    if (!step.reconciliationRunId || !helpers.reportingPlatform?.getReconciliationRun) {
      return false;
    }
    const run = helpers.reportingPlatform.getReconciliationRun({
      companyId: checklist.clientCompanyId,
      reconciliationRunId: step.reconciliationRunId
    });
    return Number(run.totalDifferenceAmount || 0) !== 0
      || (run.differenceItems || []).some((item) => ["waived", "open", "investigating", "proposed_adjustment"].includes(item.state));
  });
}

function requireSignedReconciliationRun(helpers, checklist, step, reconciliationRunId) {
  if (!helpers.reportingPlatform?.getReconciliationRun) {
    throw helpers.error(500, "reporting_platform_required", "Reporting platform is required for reconciliation steps.");
  }
  const run = helpers.reportingPlatform.getReconciliationRun({
    companyId: checklist.clientCompanyId,
    reconciliationRunId: text(reconciliationRunId, "reconciliation_run_id_required")
  });
  if (run.accountingPeriodId !== checklist.accountingPeriodId) {
    throw helpers.error(400, "reconciliation_period_mismatch", "Reconciliation run period does not match the close checklist.");
  }
  if (step.reconciliationAreaCode && run.areaCode !== step.reconciliationAreaCode) {
    throw helpers.error(400, "reconciliation_area_mismatch", "Reconciliation run area does not match the close checklist step.");
  }
  if (!["signed", "closed"].includes(run.status)) {
    throw helpers.error(400, "reconciliation_not_ready", "Reconciliation run must be signed or closed before the step can be completed.");
  }
  return run;
}

function normalizeEvidenceRefs(value, evidenceType) {
  if (!Array.isArray(value) || value.length === 0) {
    throw errorWithStatus(400, "close_evidence_required", "Close checklist step requires evidence.");
  }
  return value.map((item, index) => ({
    evidenceRefId: norm(item?.evidenceRefId) || crypto.randomUUID(),
    evidenceType: norm(item?.evidenceType) || evidenceType || "manual_evidence",
    documentId: norm(item?.documentId),
    reportSnapshotId: norm(item?.reportSnapshotId),
    note: norm(item?.note) || `evidence_${index + 1}`
  }));
}

function createDefaultSteps({ bureauOrgId, ownerCompanyUserId, deadlineAt, accountingPeriodId, reportSnapshotId, nowIso }) {
  return DEFAULT_STEP_BLUEPRINTS.map((blueprint, index) => ({
    stepId: crypto.randomUUID(),
    stepCode: blueprint.stepCode,
    title: blueprint.title,
    mandatory: blueprint.mandatory,
    sequence: index + 1,
    status: "not_started",
    ownerCompanyUserId,
    deadlineAt,
    accountingPeriodId,
    evidenceType: blueprint.evidenceType,
    reconciliationAreaCode: blueprint.reconciliationAreaCode,
    reconciliationRunId: null,
    evidenceRefs: blueprint.stepCode === "report_backup" && reportSnapshotId
      ? [{ evidenceType: "report_snapshot", reportSnapshotId }]
      : [],
    comment: null,
    completedAt: null,
    completedByUserId: null,
    blockerIds: [],
    createdAt: nowIso,
    updatedAt: nowIso
  }));
}

function normalizeSignoffChain(helpers, bureauOrgId, value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw helpers.error(400, "close_signoff_chain_required", "A sign-off chain is required.");
  }
  return value.map((item, index) => {
    const companyUser = helpers.requireBureauUser(bureauOrgId, text(item?.companyUserId, "close_signoff_company_user_id_required"));
    return {
      sequence: Number.isInteger(item?.sequence) ? item.sequence : index + 1,
      companyUserId: companyUser.companyUserId,
      userId: companyUser.userId,
      roleCode: text(item?.roleCode || companyUser.roleCode, "close_signoff_role_code_required").toLowerCase(),
      label: norm(item?.label) || companyUser.user?.displayName || companyUser.userId
    };
  }).sort((left, right) => left.sequence - right.sequence);
}

function normalizeReopenImpactAnalysis({ impactSummary, impactAnalysis } = {}) {
  if (!impactAnalysis || typeof impactAnalysis !== "object") {
    throw errorWithStatus(400, "reopen_impact_analysis_required", "Reopen request requires a structured impact analysis.");
  }
  const affectedAreaCodes = [...new Set((Array.isArray(impactAnalysis.affectedAreaCodes) ? impactAnalysis.affectedAreaCodes : [])
    .map((candidate) => norm(candidate))
    .filter(Boolean))];
  if (affectedAreaCodes.length === 0) {
    throw errorWithStatus(400, "reopen_affected_areas_required", "Reopen request must declare at least one affected area.");
  }
  for (const affectedAreaCode of affectedAreaCodes) {
    if (!CLOSE_IMPACT_AREA_CODES.includes(affectedAreaCode)) {
      throw errorWithStatus(400, "reopen_affected_area_invalid", `Unsupported reopen affected area ${affectedAreaCode}.`);
    }
  }
  const requiresCorrectionReplacement = Boolean(impactAnalysis.requiresCorrectionReplacement);
  const correctionPlanSummary = norm(impactAnalysis.correctionPlanSummary);
  if (requiresCorrectionReplacement && !correctionPlanSummary) {
    throw errorWithStatus(400, "reopen_correction_plan_required", "Reopen request requires a correction plan summary when corrections are needed.");
  }
  const relockTargetStatus = norm(impactAnalysis.relockTargetStatus) || "soft_locked";
  if (!RELOCK_TARGET_STATUSES.includes(relockTargetStatus)) {
    throw errorWithStatus(400, "reopen_relock_target_status_invalid", "Reopen relock target status is not supported.");
  }
  return {
    impactSummary: text(impactSummary || impactAnalysis.impactSummary, "reopen_impact_summary_required"),
    affectedAreaCodes,
    requiresCorrectionReplacement,
    correctionPlanSummary,
    affectedObjectRefs: normalizeSourceObjectRefs(impactAnalysis.affectedObjectRefs),
    relockTargetStatus
  };
}

function normalizeSourceObjectRefs(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      const sourceDomain = norm(item?.sourceDomain);
      const sourceObjectType = norm(item?.sourceObjectType);
      const sourceObjectId = norm(item?.sourceObjectId);
      if (!sourceDomain || !sourceObjectType || !sourceObjectId) {
        return null;
      }
      return {
        sourceDomain,
        sourceObjectType,
        sourceObjectId,
        sourceObjectVersion: norm(item?.sourceObjectVersion),
        note: norm(item?.note)
      };
    })
    .filter(Boolean);
}

function nextChecklistVersion(state, clientCompanyId, accountingPeriodId) {
  return [...state.closeChecklists.values()]
    .filter((candidate) => candidate.clientCompanyId === clientCompanyId && candidate.accountingPeriodId === accountingPeriodId)
    .reduce((highest, candidate) => Math.max(highest, Number(candidate.checklistVersion) || 0), 0) + 1;
}

function canReadChecklist(helpers, principal, checklist) {
  try {
    helpers.assertVisible(principal, checklist.portfolioId);
    return true;
  } catch {
    return false;
  }
}

function requireChecklist(helpers, checklistId) {
  const checklist = helpers.state.closeChecklists.get(text(checklistId, "close_checklist_id_required"));
  if (!checklist) {
    throw helpers.error(404, "close_checklist_not_found", "Close checklist was not found.");
  }
  return checklist;
}

function requireChecklistAccess(helpers, sessionToken, bureauOrgId, checklistId, action = "company.read") {
  const principal = helpers.authorize(sessionToken, bureauOrgId, action);
  const checklist = requireChecklist(helpers, checklistId);
  if (checklist.bureauOrgId !== bureauOrgId) {
    throw helpers.error(404, "close_checklist_not_found", "Close checklist was not found.");
  }
  helpers.assertVisible(principal, checklist.portfolioId);
  return { principal, checklist };
}

function requireChecklistStep(checklist, stepCode) {
  const step = checklist.steps.find((candidate) => candidate.stepCode === text(stepCode, "close_step_code_required"));
  if (!step) {
    throw errorWithStatus(404, "close_step_not_found", "Close checklist step was not found.");
  }
  return step;
}

function requireBlocker(helpers, blockerId) {
  const blocker = helpers.state.closeBlockers.get(text(blockerId, "close_blocker_id_required"));
  if (!blocker) {
    throw helpers.error(404, "close_blocker_not_found", "Close blocker was not found.");
  }
  return blocker;
}

function requireCloseReopenRequest(helpers, reopenRequestId) {
  const reopenRequest = helpers.state.closeReopenRequests.get(text(reopenRequestId, "close_reopen_request_id_required"));
  if (!reopenRequest) {
    throw helpers.error(404, "close_reopen_request_not_found", "Close reopen request was not found.");
  }
  return reopenRequest;
}

function requireCloseAdjustment(helpers, adjustmentId) {
  const adjustment = helpers.state.closeAdjustments.get(text(adjustmentId, "close_adjustment_id_required"));
  if (!adjustment) {
    throw helpers.error(404, "close_adjustment_not_found", "Close adjustment was not found.");
  }
  return adjustment;
}

function requireReopenRequestAccess(helpers, sessionToken, bureauOrgId, reopenRequestId, action = "company.read") {
  const principal = helpers.authorize(sessionToken, bureauOrgId, action);
  const reopenRequest = requireCloseReopenRequest(helpers, reopenRequestId);
  if (reopenRequest.bureauOrgId !== bureauOrgId) {
    throw helpers.error(404, "close_reopen_request_not_found", "Close reopen request was not found.");
  }
  const checklist = requireChecklist(helpers, reopenRequest.checklistId);
  helpers.assertVisible(principal, checklist.portfolioId);
  return { principal, reopenRequest, checklist };
}

function requireCloseAdjustmentAccess(helpers, sessionToken, bureauOrgId, adjustmentId, action = "company.read") {
  const principal = helpers.authorize(sessionToken, bureauOrgId, action);
  const adjustment = requireCloseAdjustment(helpers, adjustmentId);
  if (adjustment.bureauOrgId !== bureauOrgId) {
    throw helpers.error(404, "close_adjustment_not_found", "Close adjustment was not found.");
  }
  const checklist = requireChecklist(helpers, adjustment.checklistId);
  helpers.assertVisible(principal, checklist.portfolioId);
  return { principal, adjustment, checklist };
}

function requireAccountingPeriod(helpers, clientCompanyId, accountingPeriodId) {
  const period = getAccountingPeriod(helpers, clientCompanyId, accountingPeriodId);
  if (!period) {
    throw helpers.error(404, "accounting_period_not_found", "Accounting period was not found.");
  }
  return period;
}

function getAccountingPeriod(helpers, clientCompanyId, accountingPeriodId) {
  if (!helpers.ledgerPlatform?.listAccountingPeriods) {
    return null;
  }
  return helpers.ledgerPlatform.listAccountingPeriods({ companyId: clientCompanyId })
    .find((candidate) => candidate.accountingPeriodId === accountingPeriodId) || null;
}

function deriveCloseDeadline(helpers, clientCompanyId, targetDate) {
  const settings = helpers.requireCompany(clientCompanyId).settingsJson?.bureauDelivery || {};
  const leadDays = Number(settings.closeLeadBusinessDays);
  if (!Number.isInteger(leadDays) || leadDays <= 0) {
    throw helpers.error(400, "client_deadline_settings_missing", "Company settings are missing a positive closeLeadBusinessDays value.");
  }
  const target = dateOnly(targetDate, "close_target_date_required");
  return {
    deadlineAt: `${subtractBusinessDays(target, leadDays)}T09:00:00.000Z`,
    deadlineBasis: {
      basisType: "closeLeadBusinessDays",
      basisValue: target,
      bufferBusinessDays: leadDays
    }
  };
}

function hashSnapshot(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}


function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw errorWithStatus(400, code, `${code} is required.`);
  }
  return value.trim();
}

function norm(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function dateOnly(value, code) {
  const resolved = text(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw errorWithStatus(400, code, `${code} must be in YYYY-MM-DD format.`);
  }
  return resolved;
}

function subtractBusinessDays(value, amount) {
  const date = new Date(`${String(value).slice(0, 10)}T09:00:00.000Z`);
  let remaining = amount;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() - 1);
    if (![0, 6].includes(date.getUTCDay())) {
      remaining -= 1;
    }
  }
  return date.toISOString().slice(0, 10);
}

function errorWithStatus(status, code, message) {
  const instance = new Error(message);
  instance.status = status;
  instance.code = code;
  return instance;
}

import crypto from "node:crypto";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import { applyDurableStateSnapshot, serializeDurableState } from "../../domain-core/src/state-snapshots.mjs";
import { createRulePackRegistry } from "../../rule-engine/src/index.mjs";

export const OWNER_DISTRIBUTION_DECISION_STATUSES = Object.freeze([
  "draft",
  "board_proposed",
  "review_pending",
  "stamma_ready",
  "stamma_resolved",
  "payable",
  "scheduled",
  "paid",
  "partially_paid",
  "reversed"
]);
export const OWNER_DISTRIBUTION_TAX_PROFILE_CODES = Object.freeze([
  "swedish_private_person",
  "swedish_company",
  "foreign_recipient"
]);
export const FREE_EQUITY_PROOF_SOURCE_TYPES = Object.freeze([
  "annual_report_package",
  "interim_balance"
]);
export const DIVIDEND_PAYMENT_INSTRUCTION_STATUSES = Object.freeze([
  "scheduled",
  "partially_paid",
  "paid",
  "reversed"
]);
export const KU31_DRAFT_STATUSES = Object.freeze([
  "draft",
  "ready",
  "superseded"
]);
export const KUPONGSKATT_RECORD_STATUSES = Object.freeze([
  "scheduled",
  "partially_paid",
  "paid",
  "reversed"
]);
export const OWNER_DISTRIBUTION_RULEPACK_CODE = "RP-OWNER-DISTRIBUTION-SE";
export const OWNER_DISTRIBUTION_RULEPACK_VERSION = "se-owner-distribution-2026.1";
export const OWNER_DISTRIBUTION_MAIN_KUPONGSKATT_RATE = 0.3;

const MONEY_EPSILON = 0.01;
const KU31_FILING_MONTH = 1;
const KU31_FILING_DAY = 31;
const KUPONGSKATT_DISCLOSURE_MONTHS = 4;
const SUPPORTED_DISTRIBUTION_LEGAL_FORM_CODES = new Set(["AKTIEBOLAG"]);
const KU31_ELIGIBLE_TAX_PROFILE_CODES = new Set(["swedish_private_person"]);

const OWNER_DISTRIBUTION_RULE_PACKS = Object.freeze([
  Object.freeze({
    rulePackId: "owner-distribution-se-2026.1",
    rulePackCode: OWNER_DISTRIBUTION_RULEPACK_CODE,
    domain: "owner_distributions",
    jurisdiction: "SE",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: OWNER_DISTRIBUTION_RULEPACK_VERSION,
    checksum: "owner-distribution-se-2026.1",
    sourceSnapshotDate: "2026-04-01",
    semanticChangeSummary: "Swedish owner-distribution baseline for dividend decisions, KU31 support and kupongskatt handling.",
    machineReadableRules: Object.freeze({
      legalFormCodes: ["AKTIEBOLAG"],
      standardKupongskattRate: OWNER_DISTRIBUTION_MAIN_KUPONGSKATT_RATE,
      ku31ControlDeadlineRule: "31_january_following_income_year",
      kupongskattDisclosureDeadlineRule: "four_months_after_distribution",
      requiresTreatyEvidenceForReducedWithholding: true
    }),
    humanReadableExplanation: Object.freeze([
      "Dividend decisions require proven free equity, binding stamma resolution and explicit payout approval.",
      "Foreign recipients default to 30 percent kupongskatt unless treaty evidence supports a lower rate."
    ]),
    officialSourceRefs: Object.freeze([
      "https://www.skatteverket.se/foretag/skatterochavdrag/kontrolluppgifter/kontrolluppgiftomutdelningmedmerapadelagarratt.4.96cca41179bad4b1aaa568.html",
      "https://www.skatteverket.se/foretag/etjansterochblanketter/svarpavanligafragor/fleromraden/foretagkupongskattfaq/forvemskakupongskattinnehallasochvemskabetalaindenhurhogarkupongskatten.5.1f4b0dc10351b8449e80001078.html"
    ]),
    testVectors: Object.freeze([]),
    migrationNotes: Object.freeze([])
  })
]);

export function createOwnerDistributionsPlatform(options = {}) {
  return createOwnerDistributionsEngine(options);
}

export function createOwnerDistributionsEngine({
  clock = () => new Date(),
  ledgerPlatform = null,
  annualReportingPlatform = null,
  legalFormPlatform = null,
  orgAuthPlatform = null,
  ruleRegistry = null
} = {}) {
  const rules = ruleRegistry || createRulePackRegistry({
    clock,
    seedRulePacks: OWNER_DISTRIBUTION_RULE_PACKS
  });
  const state = {
    shareClasses: new Map(),
    holdingSnapshots: new Map(),
    freeEquitySnapshots: new Map(),
    decisions: new Map(),
    paymentInstructions: new Map(),
    ku31Drafts: new Map(),
    kupongskattRecords: new Map(),
    auditEvents: new Map()
  };

  const engine = {
    ownerDistributionDecisionStatuses: OWNER_DISTRIBUTION_DECISION_STATUSES,
    ownerDistributionTaxProfileCodes: OWNER_DISTRIBUTION_TAX_PROFILE_CODES,
    freeEquityProofSourceTypes: FREE_EQUITY_PROOF_SOURCE_TYPES,
    dividendPaymentInstructionStatuses: DIVIDEND_PAYMENT_INSTRUCTION_STATUSES,
    ku31DraftStatuses: KU31_DRAFT_STATUSES,
    kupongskattRecordStatuses: KUPONGSKATT_RECORD_STATUSES,
    createShareClass: (input) => createShareClass({ state, clock, orgAuthPlatform }, input),
    listShareClasses: ({ companyId } = {}) => listRecordsByCompany(state.shareClasses, companyId),
    getShareClass: ({ companyId, shareClassId } = {}) =>
      getCompanyRecord(state.shareClasses, companyId, shareClassId, "share_class_not_found", "Share class was not found."),
    createShareholderHoldingSnapshot: (input) =>
      createShareholderHoldingSnapshot({ state, clock, orgAuthPlatform }, input),
    listShareholderHoldingSnapshots: ({ companyId } = {}) => listRecordsByCompany(state.holdingSnapshots, companyId),
    getShareholderHoldingSnapshot: ({ companyId, snapshotId } = {}) =>
      getCompanyRecord(
        state.holdingSnapshots,
        companyId,
        snapshotId,
        "shareholder_holding_snapshot_not_found",
        "Shareholder holding snapshot was not found."
      ),
    createFreeEquitySnapshot: (input) =>
      createFreeEquitySnapshot({
        state,
        clock,
        orgAuthPlatform,
        annualReportingPlatform
      }, input),
    listFreeEquitySnapshots: ({ companyId } = {}) => listRecordsByCompany(state.freeEquitySnapshots, companyId),
    getFreeEquitySnapshot: ({ companyId, freeEquitySnapshotId } = {}) =>
      getCompanyRecord(
        state.freeEquitySnapshots,
        companyId,
        freeEquitySnapshotId,
        "free_equity_snapshot_not_found",
        "Free-equity snapshot was not found."
      ),
    proposeDividendDecision: (input) =>
      proposeDividendDecision({
        state,
        clock,
        legalFormPlatform,
        orgAuthPlatform,
        rules
      }, input),
    submitDividendDecisionForReview: (input) =>
      transitionDividendDecision({
        state,
        clock,
        orgAuthPlatform,
        decisionId: input?.decisionId,
        companyId: input?.companyId,
        actorId: input?.actorId,
        fromStatuses: ["board_proposed"],
        toStatus: "review_pending",
        eventCode: "dividend.review_submitted",
        eventMessage: "Dividend decision was submitted for review.",
        metadata: {
          reviewEvidenceRef: normalizeOptionalText(input?.reviewEvidenceRef),
          reviewComment: normalizeOptionalText(input?.comment)
        }
      }),
    markDividendDecisionStammaReady: (input) =>
      transitionDividendDecision({
        state,
        clock,
        orgAuthPlatform,
        decisionId: input?.decisionId,
        companyId: input?.companyId,
        actorId: input?.actorId,
        fromStatuses: ["review_pending"],
        toStatus: "stamma_ready",
        eventCode: "dividend.stamma_ready",
        eventMessage: "Dividend decision was marked ready for stamma resolution.",
        metadata: {
          stammaNoticeEvidenceRef: normalizeOptionalText(input?.stammaNoticeEvidenceRef),
          comment: normalizeOptionalText(input?.comment)
        }
      }),
    resolveDividendAtStamma: (input) =>
      resolveDividendAtStamma({
        state,
        clock,
        ledgerPlatform,
        orgAuthPlatform
      }, input),
    scheduleDividendPayout: (input) =>
      scheduleDividendPayout({
        state,
        clock,
        orgAuthPlatform
      }, input),
    listDividendDecisions: ({ companyId } = {}) =>
      [...state.decisions.values()]
        .filter((candidate) => candidate.companyId === requireText(companyId, "company_id_required"))
        .sort((left, right) => left.decisionDate.localeCompare(right.decisionDate) || left.createdAt.localeCompare(right.createdAt))
        .map((candidate) => materializeDecision(state, candidate)),
    getDividendDecision: ({ companyId, decisionId } = {}) =>
      materializeDecision(
        state,
        getCompanyRecord(state.decisions, companyId, decisionId, "dividend_decision_not_found", "Dividend decision was not found.")
      ),
    listDividendPaymentInstructions: ({ companyId, decisionId = null } = {}) =>
      [...state.paymentInstructions.values()]
        .filter((candidate) => candidate.companyId === requireText(companyId, "company_id_required"))
        .filter((candidate) => (normalizeOptionalText(decisionId) ? candidate.decisionId === decisionId.trim() : true))
        .sort((left, right) => left.paymentDate.localeCompare(right.paymentDate) || left.createdAt.localeCompare(right.createdAt))
        .map(copy),
    recordDividendPayout: (input) =>
      recordDividendPayout({
        state,
        clock,
        ledgerPlatform,
        orgAuthPlatform
      }, input),
    reverseDividendPayout: (input) =>
      reverseDividendPayout({
        state,
        clock,
        ledgerPlatform,
        orgAuthPlatform
      }, input),
    buildKu31Draft: (input) =>
      buildKu31Draft({
        state,
        clock,
        orgAuthPlatform
      }, input),
    listKu31Drafts: ({ companyId, decisionId = null } = {}) =>
      [...state.ku31Drafts.values()]
        .filter((candidate) => candidate.companyId === requireText(companyId, "company_id_required"))
        .filter((candidate) => (normalizeOptionalText(decisionId) ? candidate.decisionId === decisionId.trim() : true))
        .sort((left, right) => left.filingYear - right.filingYear || left.createdAt.localeCompare(right.createdAt))
        .map(copy),
    getKu31Draft: ({ companyId, draftId } = {}) =>
      getCompanyRecord(state.ku31Drafts, companyId, draftId, "ku31_draft_not_found", "KU31 draft was not found."),
    listKupongskattRecords: ({ companyId, decisionId = null } = {}) =>
      [...state.kupongskattRecords.values()]
        .filter((candidate) => candidate.companyId === requireText(companyId, "company_id_required"))
        .filter((candidate) => (normalizeOptionalText(decisionId) ? candidate.decisionId === decisionId.trim() : true))
        .sort((left, right) => left.paymentDate.localeCompare(right.paymentDate) || left.createdAt.localeCompare(right.createdAt))
        .map(copy),
    getKupongskattRecord: ({ companyId, kupongskattRecordId } = {}) =>
      getCompanyRecord(
        state.kupongskattRecords,
        companyId,
        kupongskattRecordId,
        "kupongskatt_record_not_found",
        "Kupongskatt record was not found."
      ),
    listOwnerDistributionAuditEvents: ({ companyId, resourceId = null } = {}) =>
      [...state.auditEvents.values()]
        .filter((candidate) => candidate.companyId === requireText(companyId, "company_id_required"))
        .filter((candidate) => (normalizeOptionalText(resourceId) ? candidate.resourceId === resourceId.trim() : true))
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
        .map(copy),
    snapshotOwnerDistributions: () =>
      copy({
        shareClasses: [...state.shareClasses.values()],
        holdingSnapshots: [...state.holdingSnapshots.values()],
        freeEquitySnapshots: [...state.freeEquitySnapshots.values()],
        decisions: [...state.decisions.values()].map((candidate) => materializeDecision(state, candidate)),
        paymentInstructions: [...state.paymentInstructions.values()],
        ku31Drafts: [...state.ku31Drafts.values()],
        kupongskattRecords: [...state.kupongskattRecords.values()],
        auditEvents: [...state.auditEvents.values()]
      }),
    exportDurableState,
    importDurableState
  };

  Object.defineProperty(engine, "rulePackGovernance", {
    value: Object.freeze({
      listRulePacks: (filters = {}) => rules.listRulePacks({ domain: "owner_distributions", jurisdiction: "SE", ...filters }),
      getRulePack: (filters) => rules.getRulePack(filters)
    }),
    enumerable: false
  });

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  return engine;
}

function createShareClass({ state, clock, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const now = nowIso(clock);
  const shareClass = Object.freeze({
    shareClassId: crypto.randomUUID(),
    companyId,
    name: requireText(input.name, "share_class_name_required"),
    votesPerShare: normalizePositiveNumber(input.votesPerShare ?? 1, "votes_per_share_invalid"),
    dividendPriorityCode: requireText(input.dividendPriorityCode || "ordinary", "dividend_priority_code_required"),
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  });
  const duplicate = [...state.shareClasses.values()].find(
    (candidate) => candidate.companyId === companyId && candidate.name.toLowerCase() === shareClass.name.toLowerCase()
  );
  if (duplicate) {
    throw error(409, "share_class_name_exists", "Share class name already exists.");
  }
  state.shareClasses.set(shareClass.shareClassId, shareClass);
  appendAuditEvent(state, {
    companyId,
    resourceType: "share_class",
    resourceId: shareClass.shareClassId,
    eventCode: "share_class.created",
    message: "Share class created.",
    actorId,
    recordedAt: now,
    metadata: {
      shareClassId: shareClass.shareClassId,
      name: shareClass.name,
      dividendPriorityCode: shareClass.dividendPriorityCode
    }
  });
  return copy(shareClass);
}

function createShareholderHoldingSnapshot({ state, clock, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const effectiveDate = normalizeDate(input.effectiveDate, "holding_snapshot_effective_date_invalid");
  const holders = normalizeHoldingSnapshotHolders(state, companyId, input.holders);
  const now = nowIso(clock);
  const snapshot = Object.freeze({
    snapshotId: crypto.randomUUID(),
    companyId,
    effectiveDate,
    evidenceRef: requireText(input.evidenceRef, "holding_snapshot_evidence_ref_required"),
    holders,
    totalShareCount: holders.reduce((sum, holder) => normalizeMoney(sum + holder.totalShareCount), 0),
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  });
  state.holdingSnapshots.set(snapshot.snapshotId, snapshot);
  appendAuditEvent(state, {
    companyId,
    resourceType: "shareholder_holding_snapshot",
    resourceId: snapshot.snapshotId,
    eventCode: "shareholder_holding_snapshot.created",
    message: "Shareholder holding snapshot created.",
    actorId,
    recordedAt: now,
    metadata: {
      snapshotId: snapshot.snapshotId,
      effectiveDate,
      holderCount: holders.length,
      evidenceRef: snapshot.evidenceRef
    }
  });
  return copy(snapshot);
}

function createFreeEquitySnapshot({ state, clock, orgAuthPlatform, annualReportingPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const proofSourceType = assertAllowed(
    requireText(input.proofSourceType, "free_equity_proof_source_type_required"),
    FREE_EQUITY_PROOF_SOURCE_TYPES,
    "free_equity_proof_source_type_invalid"
  );
  const effectiveDate = normalizeDate(input.effectiveDate, "free_equity_effective_date_invalid");
  const freeEquityAmount = normalizePositiveMoney(input.freeEquityAmount, "free_equity_amount_invalid");
  const now = nowIso(clock);
  let proofRef;
  if (proofSourceType === "annual_report_package") {
    const annualPackage = requireAnnualPackageProof({
      annualReportingPlatform,
      companyId,
      packageId: input.annualReportPackageId,
      versionId: input.annualReportVersionId || null
    });
    proofRef = Object.freeze({
      proofSourceType,
      annualReportPackageId: annualPackage.packageId,
      annualReportVersionId: annualPackage.currentVersion.versionId,
      annualReportVersionLockedAt: annualPackage.currentVersion.lockedAt,
      annualReportVersionSignoffHash: annualPackage.currentVersion.signoffHash,
      evidenceRef: annualPackage.currentEvidencePack?.evidencePackId || annualPackage.currentEvidencePackId || null,
      approvedByActorId: null,
      approvedByRoleCode: null,
      approvedAt: annualPackage.currentVersion.signoffCompletedAt || annualPackage.currentVersion.lockedAt || null
    });
  } else {
    const approvedByActorId = requireText(input.approvedByActorId, "interim_balance_approved_by_actor_id_required");
    const approvedByRoleCode = requireText(input.approvedByRoleCode, "interim_balance_approved_by_role_code_required");
    assertSeparateApproval({ actorId, approvedByActorId, code: "interim_balance_approver_must_be_separate" });
    proofRef = Object.freeze({
      proofSourceType,
      annualReportPackageId: null,
      annualReportVersionId: null,
      annualReportVersionLockedAt: null,
      annualReportVersionSignoffHash: null,
      evidenceRef: requireText(input.evidenceRef, "interim_balance_evidence_ref_required"),
      approvedByActorId,
      approvedByRoleCode,
      approvedAt: normalizeDateTimeOrDate(input.approvedAt || now, "interim_balance_approved_at_invalid")
    });
  }
  const snapshot = Object.freeze({
    freeEquitySnapshotId: crypto.randomUUID(),
    companyId,
    effectiveDate,
    freeEquityAmount,
    proofRef,
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  });
  state.freeEquitySnapshots.set(snapshot.freeEquitySnapshotId, snapshot);
  appendAuditEvent(state, {
    companyId,
    resourceType: "free_equity_snapshot",
    resourceId: snapshot.freeEquitySnapshotId,
    eventCode: "free_equity_snapshot.created",
    message: "Free-equity snapshot created.",
    actorId,
    recordedAt: now,
    metadata: {
      freeEquitySnapshotId: snapshot.freeEquitySnapshotId,
      freeEquityAmount,
      proofSourceType,
      proofRef
    }
  });
  return copy(snapshot);
}

function proposeDividendDecision({ state, clock, legalFormPlatform, orgAuthPlatform, rules }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const decisionDate = normalizeDate(input.decisionDate, "dividend_decision_date_invalid");
  const legalFormProfile = resolveLegalFormProfile({ legalFormPlatform, companyId, asOfDate: decisionDate });
  if (!SUPPORTED_DISTRIBUTION_LEGAL_FORM_CODES.has(legalFormProfile.legalFormCode)) {
    throw error(
      409,
      "owner_distribution_legal_form_not_supported",
      `Owner distributions are only supported for ${[...SUPPORTED_DISTRIBUTION_LEGAL_FORM_CODES].join(", ")}.`
    );
  }
  const holdingSnapshot = getCompanyRecord(
    state.holdingSnapshots,
    companyId,
    input.holdingSnapshotId,
    "shareholder_holding_snapshot_not_found",
    "Shareholder holding snapshot was not found."
  );
  const freeEquitySnapshot = getCompanyRecord(
    state.freeEquitySnapshots,
    companyId,
    input.freeEquitySnapshotId,
    "free_equity_snapshot_not_found",
    "Free-equity snapshot was not found."
  );
  if (holdingSnapshot.effectiveDate > decisionDate) {
    throw error(409, "holding_snapshot_effective_after_decision", "Holding snapshot cannot be effective after the decision date.");
  }
  if (freeEquitySnapshot.effectiveDate > decisionDate) {
    throw error(409, "free_equity_snapshot_effective_after_decision", "Free-equity snapshot cannot be effective after the decision date.");
  }
  const boardProposal = normalizeBoardProposal(input, actorId);
  const journalPlan = normalizeDividendJournalPlan(input.journalPlan);
  const shareAllocationPlan = normalizeDecisionShareAllocationPlan({
    shareClasses: state.shareClasses,
    companyId,
    holders: holdingSnapshot.holders,
    perShareAmount: input.perShareAmount ?? null,
    shareClassAmounts: input.shareClassAmounts ?? null
  });
  const recipientAllocations = buildRecipientAllocations({
    holdingSnapshot,
    shareAllocationPlan
  });
  const totalAmount = recipientAllocations.reduce((sum, allocation) => normalizeMoney(sum + allocation.grossAmount), 0);
  if (!isPositiveMoney(totalAmount)) {
    throw error(409, "dividend_total_amount_required", "Dividend decision must produce a positive total amount.");
  }
  if (totalAmount - freeEquitySnapshot.freeEquityAmount > MONEY_EPSILON) {
    throw error(409, "free_equity_insufficient", "Dividend decision exceeds proven free equity.");
  }
  const now = nowIso(clock);
  const rulePack = rules.resolveRulePack({
    rulePackCode: OWNER_DISTRIBUTION_RULEPACK_CODE,
    domain: "owner_distributions",
    jurisdiction: "SE",
    effectiveDate: decisionDate
  });
  const decision = {
    decisionId: crypto.randomUUID(),
    companyId,
    decisionDate,
    legalFormCode: legalFormProfile.legalFormCode,
    status: "board_proposed",
    holdingSnapshotId: holdingSnapshot.snapshotId,
    freeEquitySnapshotId: freeEquitySnapshot.freeEquitySnapshotId,
    boardProposal,
    stammaResolution: null,
    journalPlan,
    shareAllocationPlan,
    totalAmount,
    recipientAllocations,
    paymentInstructionIds: [],
    ku31DraftIds: [],
    kupongskattRecordIds: [],
    payoutRuns: [],
    stateHistory: [
      Object.freeze({
        fromStatus: "draft",
        toStatus: "board_proposed",
        changedAt: now,
        actorId,
        reasonCode: "board_proposal_created"
      })
    ],
    paidGrossAmount: 0,
    paidNetAmount: 0,
    paidWithholdingAmount: 0,
    reversalJournalEntryIds: [],
    rulepackRefs: [
      materializeRulepackRef(rulePack)
    ],
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  };
  state.decisions.set(decision.decisionId, decision);
  appendAuditEvent(state, {
    companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode: "dividend.board_proposed",
    message: "Dividend decision proposed by the board.",
    actorId,
    recordedAt: now,
    metadata: {
      decisionId: decision.decisionId,
      totalAmount,
      freeEquitySnapshotId: freeEquitySnapshot.freeEquitySnapshotId,
      holdingSnapshotId: holdingSnapshot.snapshotId,
      rulepackRefs: decision.rulepackRefs
    }
  });
  return materializeDecision(state, decision);
}

function resolveDividendAtStamma({ state, clock, ledgerPlatform, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const decision = getCompanyRecord(state.decisions, companyId, input.decisionId, "dividend_decision_not_found", "Dividend decision was not found.");
  if (decision.status !== "stamma_ready") {
    throw error(409, "dividend_decision_not_ready_for_stamma_resolution", "Dividend decision is not ready for stamma resolution.");
  }
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const approvedByActorId = requireText(input.approvedByActorId, "approved_by_actor_id_required");
  const approvedByRoleCode = requireText(input.approvedByRoleCode, "approved_by_role_code_required");
  assertSeparateApproval({ actorId, approvedByActorId, code: "dividend_resolution_approver_must_be_separate" });
  const resolvedAt = normalizeDate(input.resolutionDate || decision.decisionDate, "stamma_resolution_date_invalid");
  if (resolvedAt < decision.decisionDate) {
    throw error(409, "stamma_resolution_date_before_board_decision", "Stamma resolution cannot predate the board proposal date.");
  }
  const evidenceRef = requireText(input.evidenceRef, "stamma_resolution_evidence_ref_required");
  const journalPosting = postDividendResolutionJournal({
    ledgerPlatform,
    decision,
    journalDate: resolvedAt,
    actorId,
    approvedByActorId,
    approvedByRoleCode
  });
  decision.stammaResolution = Object.freeze({
    resolvedAt,
    evidenceRef,
    resolvedByActorId: actorId,
    approvedByActorId,
    approvedByRoleCode,
    journalEntryId: journalPosting.journalEntryId
  });
  decision.status = "stamma_resolved";
  decision.stateHistory = Object.freeze([
    ...decision.stateHistory,
    Object.freeze({
      fromStatus: "stamma_ready",
      toStatus: "stamma_resolved",
      changedAt: nowIso(clock),
      actorId,
      reasonCode: "stamma_resolution_recorded"
    })
  ]);
  decision.updatedAt = nowIso(clock);
  appendAuditEvent(state, {
    companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode: "dividend.stamma_resolved",
    message: "Dividend decision resolved at stamma and liability journal posted.",
    actorId,
    recordedAt: decision.updatedAt,
    approvedByActorId,
    approvedByRoleCode,
    metadata: {
      decisionId: decision.decisionId,
      evidenceRef,
      journalEntryId: journalPosting.journalEntryId
    }
  });
  return materializeDecision(state, decision);
}

function scheduleDividendPayout({ state, clock, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const decision = getCompanyRecord(state.decisions, companyId, input.decisionId, "dividend_decision_not_found", "Dividend decision was not found.");
  if (decision.status !== "stamma_resolved") {
    throw error(409, "dividend_decision_not_payable", "Dividend payout can only be scheduled after binding stamma resolution.");
  }
  if (decision.paymentInstructionIds.length > 0) {
    throw error(409, "dividend_payout_already_scheduled", "Dividend payout is already scheduled for this decision.");
  }
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const approvedByActorId = requireText(input.approvedByActorId, "approved_by_actor_id_required");
  const approvedByRoleCode = requireText(input.approvedByRoleCode, "approved_by_role_code_required");
  assertSeparateApproval({ actorId, approvedByActorId, code: "dividend_payout_approver_must_be_separate" });
  const paymentDate = normalizeDate(input.paymentDate, "dividend_payment_date_invalid");
  if (paymentDate < decision.stammaResolution.resolvedAt) {
    throw error(409, "dividend_payment_date_before_resolution", "Dividend payout date cannot be before stamma resolution.");
  }
  const overridesByHolderId = indexRecipientOverrides(input.recipientOverrides || []);
  const now = nowIso(clock);
  const paymentInstructions = [];
  const kupongskattRecords = [];
  for (const allocation of decision.recipientAllocations) {
    const override = overridesByHolderId.get(allocation.recipientRef.holderId) || null;
    const withholdingProfile = resolveWithholdingProfile({
      actorId,
      allocation,
      override,
      journalPlan: decision.journalPlan,
      paymentDate
    });
    const instruction = {
      instructionId: crypto.randomUUID(),
      companyId,
      decisionId: decision.decisionId,
      recipientRef: allocation.recipientRef,
      grossAmount: allocation.grossAmount,
      withholdingProfile,
      withheldAmount: withholdingProfile.withholdingAmount,
      netAmount: normalizeMoney(allocation.grossAmount - withholdingProfile.withholdingAmount),
      paymentDate,
      status: "scheduled",
      paidGrossAmount: 0,
      paidNetAmount: 0,
      paidWithholdingAmount: 0,
      journalEntryIds: [],
      createdAt: now,
      updatedAt: now
    };
    paymentInstructions.push(instruction);
    state.paymentInstructions.set(instruction.instructionId, instruction);
    if (instruction.withheldAmount > 0) {
      const kupongskattRecord = {
        kupongskattRecordId: crypto.randomUUID(),
        recordId: crypto.randomUUID(),
        companyId,
        decisionId: decision.decisionId,
        instructionId: instruction.instructionId,
        recipientRef: allocation.recipientRef,
        withholdingRate: withholdingProfile.withholdingRate,
        treatyEvidenceRef: withholdingProfile.treatyEvidenceRef,
        paymentDate,
        amount: instruction.withheldAmount,
        paidAmount: 0,
        status: "scheduled",
        authorityPaymentDueDate: addMonthsIso(paymentDate, KUPONGSKATT_DISCLOSURE_MONTHS),
        treatyApprovedByActorId: withholdingProfile.treatyApprovedByActorId,
        treatyApprovedByRoleCode: withholdingProfile.treatyApprovedByRoleCode,
        createdAt: now,
        updatedAt: now
      };
      kupongskattRecords.push(kupongskattRecord);
      state.kupongskattRecords.set(kupongskattRecord.kupongskattRecordId, kupongskattRecord);
    }
  }
  decision.paymentInstructionIds = Object.freeze(paymentInstructions.map((entry) => entry.instructionId));
  decision.kupongskattRecordIds = Object.freeze(kupongskattRecords.map((entry) => entry.kupongskattRecordId));
  decision.status = "scheduled";
  decision.stateHistory = Object.freeze([
    ...decision.stateHistory,
    Object.freeze({
      fromStatus: "stamma_resolved",
      toStatus: "payable",
      changedAt: now,
      actorId,
      reasonCode: "payout_window_opened"
    }),
    Object.freeze({
      fromStatus: "payable",
      toStatus: "scheduled",
      changedAt: now,
      actorId,
      reasonCode: "payout_instructions_created"
    })
  ]);
  decision.updatedAt = now;
  appendAuditEvent(state, {
    companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode: "dividend.payout_scheduled",
    message: "Dividend payout scheduled.",
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    recordedAt: now,
    metadata: {
      decisionId: decision.decisionId,
      paymentDate,
      instructionIds: decision.paymentInstructionIds,
      kupongskattRecordIds: decision.kupongskattRecordIds
    }
  });
  return materializeDecision(state, decision);
}

function recordDividendPayout({ state, clock, ledgerPlatform, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const decision = getCompanyRecord(state.decisions, companyId, input.decisionId, "dividend_decision_not_found", "Dividend decision was not found.");
  if (!["scheduled", "partially_paid"].includes(decision.status)) {
    throw error(409, "dividend_payout_not_scheduled", "Dividend payout can only be recorded after scheduling.");
  }
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const approvedByActorId = requireText(input.approvedByActorId, "approved_by_actor_id_required");
  const approvedByRoleCode = requireText(input.approvedByRoleCode, "approved_by_role_code_required");
  assertSeparateApproval({ actorId, approvedByActorId, code: "dividend_payout_approver_must_be_separate" });
  const payoutDate = normalizeDate(input.payoutDate || input.paymentDate, "dividend_payout_date_invalid");
  const payoutRequests = normalizePayoutRequests({
    state,
    decision,
    payoutRequests: input.payouts || []
  });
  const settlement = materializePayoutSettlement({
    state,
    decision,
    payoutDate,
    payoutRequests
  });
  const journalPosting = postDividendPayoutJournal({
    ledgerPlatform,
    decision,
    payoutDate,
    settlement,
    actorId,
    approvedByActorId,
    approvedByRoleCode
  });
  for (const entry of settlement.lines) {
    const instruction = state.paymentInstructions.get(entry.instructionId);
    instruction.paidGrossAmount = normalizeMoney(instruction.paidGrossAmount + entry.grossAmount);
    instruction.paidNetAmount = normalizeMoney(instruction.paidNetAmount + entry.netAmount);
    instruction.paidWithholdingAmount = normalizeMoney(instruction.paidWithholdingAmount + entry.withheldAmount);
    instruction.journalEntryIds = Object.freeze([...instruction.journalEntryIds, journalPosting.journalEntryId]);
    instruction.status = remainingMoney(instruction.grossAmount, instruction.paidGrossAmount) > 0 ? "partially_paid" : "paid";
    instruction.updatedAt = nowIso(clock);
    const kupongskattRecord = [...state.kupongskattRecords.values()].find((candidate) => candidate.instructionId === instruction.instructionId);
    if (kupongskattRecord) {
      kupongskattRecord.paidAmount = normalizeMoney(kupongskattRecord.paidAmount + entry.withheldAmount);
      kupongskattRecord.status = remainingMoney(kupongskattRecord.amount, kupongskattRecord.paidAmount) > 0 ? "partially_paid" : "paid";
      kupongskattRecord.updatedAt = instruction.updatedAt;
    }
  }
  decision.paidGrossAmount = normalizeMoney(decision.paidGrossAmount + settlement.totalGrossAmount);
  decision.paidNetAmount = normalizeMoney(decision.paidNetAmount + settlement.totalNetAmount);
  decision.paidWithholdingAmount = normalizeMoney(decision.paidWithholdingAmount + settlement.totalWithholdingAmount);
  decision.payoutRuns = Object.freeze([
    ...decision.payoutRuns,
    Object.freeze({
      payoutRunId: crypto.randomUUID(),
      payoutDate,
      journalEntryId: journalPosting.journalEntryId,
      totalGrossAmount: settlement.totalGrossAmount,
      totalNetAmount: settlement.totalNetAmount,
      totalWithholdingAmount: settlement.totalWithholdingAmount,
      instructionIds: settlement.lines.map((entry) => entry.instructionId),
      createdAt: nowIso(clock),
      actorId,
      approvedByActorId,
      approvedByRoleCode
    })
  ]);
  decision.status = remainingMoney(decision.totalAmount, decision.paidGrossAmount) > 0 ? "partially_paid" : "paid";
  decision.stateHistory = Object.freeze([
    ...decision.stateHistory,
    Object.freeze({
      fromStatus: "scheduled",
      toStatus: decision.status,
      changedAt: nowIso(clock),
      actorId,
      reasonCode: "payout_recorded"
    })
  ]);
  decision.updatedAt = nowIso(clock);
  appendAuditEvent(state, {
    companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode: "dividend.payout_recorded",
    message: "Dividend payout recorded and journal posted.",
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    recordedAt: decision.updatedAt,
    metadata: {
      decisionId: decision.decisionId,
      payoutDate,
      journalEntryId: journalPosting.journalEntryId,
      totalGrossAmount: settlement.totalGrossAmount,
      totalWithholdingAmount: settlement.totalWithholdingAmount
    }
  });
  return materializeDecision(state, decision);
}

function reverseDividendPayout({ state, clock, ledgerPlatform, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const decision = getCompanyRecord(state.decisions, companyId, input.decisionId, "dividend_decision_not_found", "Dividend decision was not found.");
  if (decision.payoutRuns.length === 0) {
    throw error(409, "dividend_payout_not_found_for_reversal", "Dividend payout reversal requires a posted payout run.");
  }
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const approvedByActorId = requireText(input.approvedByActorId, "approved_by_actor_id_required");
  const approvedByRoleCode = requireText(input.approvedByRoleCode, "approved_by_role_code_required");
  assertSeparateApproval({ actorId, approvedByActorId, code: "dividend_reversal_approver_must_be_separate" });
  const targetPayoutRunId = normalizeOptionalText(input.payoutRunId) || decision.payoutRuns[decision.payoutRuns.length - 1].payoutRunId;
  const payoutRun = decision.payoutRuns.find((candidate) => candidate.payoutRunId === targetPayoutRunId);
  if (!payoutRun) {
    throw error(404, "dividend_payout_run_not_found", "Dividend payout run was not found.");
  }
  const reversalDate = normalizeDate(input.reversalDate || payoutRun.payoutDate, "dividend_reversal_date_invalid");
  const journalEntryId = reverseLedgerJournal({
    ledgerPlatform,
    companyId,
    originalJournalEntryId: payoutRun.journalEntryId,
    reversalDate,
    actorId,
    approvedByActorId,
    approvedByRoleCode
  });
  for (const instructionId of payoutRun.instructionIds) {
    const instruction = state.paymentInstructions.get(instructionId);
    if (!instruction) {
      continue;
    }
    const previousPaidGrossAmount = normalizeMoney(instruction.paidGrossAmount);
    const previousPaidWithholdingAmount = normalizeMoney(instruction.paidWithholdingAmount);
    instruction.paidGrossAmount = 0;
    instruction.paidNetAmount = 0;
    instruction.paidWithholdingAmount = 0;
    instruction.status = "reversed";
    instruction.updatedAt = nowIso(clock);
    const kupongskattRecord = [...state.kupongskattRecords.values()].find((candidate) => candidate.instructionId === instructionId);
    if (kupongskattRecord) {
      kupongskattRecord.paidAmount = 0;
      kupongskattRecord.status = "reversed";
      kupongskattRecord.updatedAt = instruction.updatedAt;
    }
    decision.paidGrossAmount = normalizeMoney(decision.paidGrossAmount - previousPaidGrossAmount);
    decision.paidWithholdingAmount = normalizeMoney(decision.paidWithholdingAmount - previousPaidWithholdingAmount);
  }
  decision.paidNetAmount = normalizeMoney(decision.paidGrossAmount - decision.paidWithholdingAmount);
  decision.reversalJournalEntryIds = Object.freeze([...decision.reversalJournalEntryIds, journalEntryId]);
  decision.status = "reversed";
  decision.stateHistory = Object.freeze([
    ...decision.stateHistory,
    Object.freeze({
      fromStatus: payoutRun.totalGrossAmount >= decision.totalAmount ? "paid" : "partially_paid",
      toStatus: "reversed",
      changedAt: nowIso(clock),
      actorId,
      reasonCode: "payout_reversed"
    })
  ]);
  decision.updatedAt = nowIso(clock);
  appendAuditEvent(state, {
    companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode: "dividend.payout_reversed",
    message: "Dividend payout reversed.",
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    recordedAt: decision.updatedAt,
    metadata: {
      decisionId: decision.decisionId,
      payoutRunId: payoutRun.payoutRunId,
      reversalJournalEntryId: journalEntryId
    }
  });
  return materializeDecision(state, decision);
}

function buildKu31Draft({ state, clock, orgAuthPlatform }, input = {}) {
  const companyId = requireText(input.companyId, "company_id_required");
  const actorId = requireActor(orgAuthPlatform, input.actorId);
  const decision = getCompanyRecord(state.decisions, companyId, input.decisionId, "dividend_decision_not_found", "Dividend decision was not found.");
  const paidInstructions = decision.paymentInstructionIds
    .map((instructionId) => state.paymentInstructions.get(instructionId))
    .filter(Boolean)
    .filter((instruction) => instruction.paidGrossAmount > 0);
  if (paidInstructions.length === 0) {
    throw error(409, "ku31_requires_paid_dividend", "KU31 draft requires at least one paid dividend instruction.");
  }
  const companyProfile = requireCompanyProfile(orgAuthPlatform, companyId);
  const now = nowIso(clock);
  const drafts = [];
  const skippedRecipients = [];
  for (const instruction of paidInstructions) {
    if (!KU31_ELIGIBLE_TAX_PROFILE_CODES.has(instruction.recipientRef.taxProfileCode)) {
      skippedRecipients.push(
        Object.freeze({
          recipientRef: instruction.recipientRef,
          reasonCode:
            instruction.recipientRef.taxProfileCode === "swedish_company"
              ? "ku31_not_required_for_swedish_legal_person"
              : "ku31_current_profile_not_supported_for_foreign_recipient"
        })
      );
      continue;
    }
    const paymentYear = Number(instruction.paymentDate.slice(0, 4));
    const filingYear = paymentYear + 1;
    const controlStatementDueDate = `${filingYear}-${String(KU31_FILING_MONTH).padStart(2, "0")}-${String(KU31_FILING_DAY).padStart(2, "0")}`;
    const statutoryDisclosureDueDate = addMonthsIso(instruction.paymentDate, KUPONGSKATT_DISCLOSURE_MONTHS);
    const existing = [...state.ku31Drafts.values()].find(
      (candidate) =>
        candidate.companyId === companyId &&
        candidate.decisionId === decision.decisionId &&
        candidate.recipientRef.holderId === instruction.recipientRef.holderId &&
        candidate.paymentDate === instruction.paymentDate &&
        candidate.status !== "superseded"
    );
    if (existing) {
      drafts.push(existing);
      continue;
    }
    const draft = Object.freeze({
      draftId: crypto.randomUUID(),
      companyId,
      decisionId: decision.decisionId,
      recipientRef: instruction.recipientRef,
      paymentInstructionId: instruction.instructionId,
      paymentDate: instruction.paymentDate,
      fieldMap: Object.freeze({
        payerOrgNumber: companyProfile.orgNumber,
        payerDisplayName: companyProfile.name,
        recipientDisplayName: instruction.recipientRef.displayName,
        recipientIdentityReference: instruction.recipientRef.identityReference,
        recipientIdentityMaskedValue: instruction.recipientRef.identityMaskedValue,
        grossDividendAmount: instruction.paidGrossAmount,
        withheldKupongskattAmount: instruction.paidWithholdingAmount,
        specificationNumber: `${decision.decisionId}:${instruction.recipientRef.holderId}:${instruction.paymentDate}`,
        paymentDate: instruction.paymentDate
      }),
      filingYear,
      controlStatementDueDate,
      statutoryDisclosureDueDate,
      status: "ready",
      createdByActorId: actorId,
      createdAt: now,
      updatedAt: now
    });
    state.ku31Drafts.set(draft.draftId, draft);
    drafts.push(draft);
  }
  decision.ku31DraftIds = Object.freeze([
    ...new Set([...decision.ku31DraftIds, ...drafts.map((entry) => entry.draftId)])
  ]);
  decision.updatedAt = now;
  appendAuditEvent(state, {
    companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode: "ku31.draft_built",
    message: "KU31 drafts built for paid dividend instructions.",
    actorId,
    recordedAt: now,
    metadata: {
      decisionId: decision.decisionId,
      draftIds: drafts.map((entry) => entry.draftId),
      skippedRecipients
    }
  });
  return copy({
    decisionId: decision.decisionId,
    items: drafts,
    skippedRecipients
  });
}

function transitionDividendDecision({
  state,
  clock,
  orgAuthPlatform,
  decisionId,
  companyId,
  actorId,
  fromStatuses,
  toStatus,
  eventCode,
  eventMessage,
  metadata = {}
}) {
  const decision = getCompanyRecord(state.decisions, companyId, decisionId, "dividend_decision_not_found", "Dividend decision was not found.");
  if (!fromStatuses.includes(decision.status)) {
    throw error(409, "dividend_decision_state_invalid", `Dividend decision must be in ${fromStatuses.join(", ")} state.`);
  }
  const resolvedActorId = requireActor(orgAuthPlatform, actorId);
  const now = nowIso(clock);
  const previousStatus = decision.status;
  decision.status = toStatus;
  decision.stateHistory = Object.freeze([
    ...decision.stateHistory,
    Object.freeze({
      fromStatus: previousStatus,
      toStatus,
      changedAt: now,
      actorId: resolvedActorId,
      reasonCode: eventCode
    })
  ]);
  decision.updatedAt = now;
  appendAuditEvent(state, {
    companyId: decision.companyId,
    resourceType: "dividend_decision",
    resourceId: decision.decisionId,
    eventCode,
    message: eventMessage,
    actorId: resolvedActorId,
    recordedAt: now,
    metadata
  });
  return materializeDecision(state, decision);
}

function normalizeHoldingSnapshotHolders(state, companyId, holders) {
  if (!Array.isArray(holders) || holders.length === 0) {
    throw error(400, "holding_snapshot_holders_required", "Holding snapshot requires at least one holder.");
  }
  const seenHolderIds = new Set();
  return Object.freeze(
    holders.map((holder, index) => {
      const holderRef = normalizeHolderRef(holder?.holderRef || {}, index);
      if (seenHolderIds.has(holderRef.holderId)) {
        throw error(409, "holding_snapshot_holder_duplicate", `Holder ${holderRef.holderId} is duplicated in the snapshot.`);
      }
      seenHolderIds.add(holderRef.holderId);
      const shareClassHoldings = normalizeShareClassHoldings(state, companyId, holder?.shareClassHoldings || []);
      const totalShareCount = shareClassHoldings.reduce((sum, entry) => normalizeMoney(sum + entry.shareCount), 0);
      if (!isPositiveMoney(totalShareCount)) {
        throw error(409, "holding_snapshot_share_count_required", "Each holder must own at least one share.");
      }
      return Object.freeze({
        holderRef,
        shareClassHoldings,
        totalShareCount
      });
    })
  );
}

function normalizeHolderRef(input = {}, index = 0) {
  return Object.freeze({
    holderId: requireText(input.holderId || `holder-${index + 1}`, "holder_id_required"),
    displayName: requireText(input.displayName, "holder_display_name_required"),
    taxProfileCode: assertAllowed(
      requireText(input.taxProfileCode, "holder_tax_profile_code_required"),
      OWNER_DISTRIBUTION_TAX_PROFILE_CODES,
      "holder_tax_profile_code_invalid"
    ),
    identityReference: requireText(input.identityReference, "holder_identity_reference_required"),
    identityMaskedValue: requireText(input.identityMaskedValue, "holder_identity_masked_value_required"),
    countryCode: requireText(input.countryCode || "SE", "holder_country_code_required").toUpperCase()
  });
}

function normalizeShareClassHoldings(state, companyId, holdings) {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    throw error(400, "share_class_holdings_required", "Holder requires at least one share-class holding.");
  }
  const seenShareClassIds = new Set();
  return Object.freeze(
    holdings.map((holding) => {
      const shareClass = getCompanyRecord(
        state.shareClasses,
        companyId,
        holding?.shareClassId,
        "share_class_not_found",
        "Share class was not found."
      );
      if (seenShareClassIds.has(shareClass.shareClassId)) {
        throw error(409, "share_class_holding_duplicate", `Share class ${shareClass.shareClassId} is duplicated for a holder.`);
      }
      seenShareClassIds.add(shareClass.shareClassId);
      return Object.freeze({
        shareClassId: shareClass.shareClassId,
        shareClassName: shareClass.name,
        dividendPriorityCode: shareClass.dividendPriorityCode,
        shareCount: normalizePositiveNumber(holding.shareCount, "share_count_invalid")
      });
    })
  );
}

function normalizeBoardProposal(input, actorId) {
  return Object.freeze({
    proposedByActorId: actorId,
    evidenceRef: requireText(input.boardEvidenceRef, "board_evidence_ref_required"),
    prudenceAssessmentText: requireText(input.prudenceAssessmentText, "prudence_assessment_required"),
    liquidityAssessmentText: requireText(input.liquidityAssessmentText, "liquidity_assessment_required"),
    comment: normalizeOptionalText(input.comment)
  });
}

function normalizeDividendJournalPlan(input = {}) {
  return Object.freeze({
    planId: crypto.randomUUID(),
    equityAccountRef: requireText(input.equityAccountNumber, "dividend_equity_account_required"),
    liabilityAccountRef: requireText(input.liabilityAccountNumber, "dividend_liability_account_required"),
    paymentAccountRef: requireText(input.paymentAccountNumber, "dividend_payment_account_required"),
    authorityLiabilityAccountRef: normalizeOptionalText(input.authorityLiabilityAccountNumber),
    voucherSeriesCode: normalizeOptionalText(input.voucherSeriesCode) || "A"
  });
}

function normalizeDecisionShareAllocationPlan({ shareClasses, companyId, holders, perShareAmount, shareClassAmounts }) {
  const shareClassIds = new Set();
  for (const holder of holders) {
    for (const holding of holder.shareClassHoldings) {
      shareClassIds.add(holding.shareClassId);
    }
  }
  const involvedShareClasses = [...shareClassIds].map((shareClassId) =>
    getCompanyRecord(shareClasses, companyId, shareClassId, "share_class_not_found", "Share class was not found.")
  );
  const priorityCodes = new Set(involvedShareClasses.map((entry) => entry.dividendPriorityCode));
  const hasSinglePerShare = normalizeOptionalMoney(perShareAmount) != null;
  const hasPerClass = Array.isArray(shareClassAmounts) && shareClassAmounts.length > 0;
  if (!hasSinglePerShare && !hasPerClass) {
    throw error(400, "dividend_per_share_amount_required", "Dividend decision requires per-share allocation input.");
  }
  if (hasSinglePerShare && hasPerClass) {
    throw error(409, "dividend_allocation_strategy_conflict", "Use either perShareAmount or shareClassAmounts, not both.");
  }
  if (hasSinglePerShare && priorityCodes.size > 1) {
    throw error(409, "dividend_priority_allocation_required", "Multiple dividend priorities require explicit shareClassAmounts.");
  }
  if (hasSinglePerShare) {
    const resolvedPerShareAmount = normalizePositiveMoney(perShareAmount, "dividend_per_share_amount_invalid");
    return Object.freeze({
      strategyCode: "uniform_per_share",
      perShareAmount: resolvedPerShareAmount,
      shareClassAmounts: involvedShareClasses.map((shareClass) =>
        Object.freeze({
          shareClassId: shareClass.shareClassId,
          shareClassName: shareClass.name,
          perShareAmount: resolvedPerShareAmount
        })
      )
    });
  }
  const normalizedByClass = new Map();
  for (const item of shareClassAmounts) {
    const shareClass = getCompanyRecord(shareClasses, companyId, item?.shareClassId, "share_class_not_found", "Share class was not found.");
    normalizedByClass.set(shareClass.shareClassId, Object.freeze({
      shareClassId: shareClass.shareClassId,
      shareClassName: shareClass.name,
      perShareAmount: normalizePositiveMoney(item.perShareAmount, "dividend_per_share_amount_invalid")
    }));
  }
  for (const shareClass of involvedShareClasses) {
    if (!normalizedByClass.has(shareClass.shareClassId)) {
      throw error(409, "dividend_share_class_amount_missing", `Missing per-share amount for share class ${shareClass.name}.`);
    }
  }
  return Object.freeze({
    strategyCode: "per_share_class",
    perShareAmount: null,
    shareClassAmounts: [...normalizedByClass.values()]
  });
}

function buildRecipientAllocations({ holdingSnapshot, shareAllocationPlan }) {
  const perShareAmountByClass = new Map(
    shareAllocationPlan.shareClassAmounts.map((entry) => [entry.shareClassId, entry.perShareAmount])
  );
  return Object.freeze(
    holdingSnapshot.holders.map((holder) => {
      const shareClassAllocations = holder.shareClassHoldings.map((holding) => {
        const perShareAmount = perShareAmountByClass.get(holding.shareClassId);
        const grossAmount = normalizeMoney(holding.shareCount * perShareAmount);
        return Object.freeze({
          shareClassId: holding.shareClassId,
          shareClassName: holding.shareClassName,
          shareCount: holding.shareCount,
          perShareAmount,
          grossAmount
        });
      });
      const grossAmount = shareClassAllocations.reduce((sum, entry) => normalizeMoney(sum + entry.grossAmount), 0);
      return Object.freeze({
        recipientRef: holder.holderRef,
        totalShareCount: holder.totalShareCount,
        shareClassAllocations,
        grossAmount
      });
    })
  );
}

function indexRecipientOverrides(overrides) {
  const map = new Map();
  for (const override of overrides || []) {
    const holderId = requireText(override?.holderId, "recipient_override_holder_id_required");
    if (map.has(holderId)) {
      throw error(409, "recipient_override_duplicate", `Recipient override for holder ${holderId} is duplicated.`);
    }
    map.set(holderId, copy(override));
  }
  return map;
}

function resolveWithholdingProfile({ actorId, allocation, override, journalPlan, paymentDate }) {
  const taxProfileCode = allocation.recipientRef.taxProfileCode;
  if (taxProfileCode === "swedish_private_person" || taxProfileCode === "swedish_company") {
    return Object.freeze({
      profileCode: taxProfileCode === "swedish_private_person" ? "resident_private_person" : "resident_company",
      withholdingRate: 0,
      withholdingAmount: 0,
      treatyEvidenceRef: null,
      treatyApprovedByActorId: null,
      treatyApprovedByRoleCode: null,
      paymentDate
    });
  }
  if (!journalPlan.authorityLiabilityAccountRef) {
    throw error(
      409,
      "kupongskatt_authority_account_required",
      "Foreign-recipient payout scheduling requires an authority liability account."
    );
  }
  const withholdingRate = normalizeOptionalRate(override?.withholdingRate) ?? OWNER_DISTRIBUTION_MAIN_KUPONGSKATT_RATE;
  if (withholdingRate > OWNER_DISTRIBUTION_MAIN_KUPONGSKATT_RATE + MONEY_EPSILON) {
    throw error(409, "kupongskatt_rate_above_main_rule_not_allowed", "Kupongskatt rate cannot exceed the 30 percent main rule.");
  }
  const treatyEvidenceRef = normalizeOptionalText(override?.treatyEvidenceRef);
  const treatyApprovedByActorId = normalizeOptionalText(override?.treatyApprovedByActorId);
  const treatyApprovedByRoleCode = normalizeOptionalText(override?.treatyApprovedByRoleCode);
  if (withholdingRate + MONEY_EPSILON < OWNER_DISTRIBUTION_MAIN_KUPONGSKATT_RATE) {
    if (!treatyEvidenceRef) {
      throw error(409, "kupongskatt_treaty_evidence_required", "Reduced kupongskatt requires treaty evidence.");
    }
    if (!treatyApprovedByActorId || !treatyApprovedByRoleCode) {
      throw error(409, "kupongskatt_treaty_approval_required", "Reduced kupongskatt requires explicit treaty approval.");
    }
    assertSeparateApproval({ actorId, approvedByActorId: treatyApprovedByActorId, code: "kupongskatt_treaty_approver_must_be_separate" });
  }
  return Object.freeze({
    profileCode: "foreign_recipient",
    withholdingRate,
    withholdingAmount: normalizeMoney(allocation.grossAmount * withholdingRate),
    treatyEvidenceRef,
    treatyApprovedByActorId,
    treatyApprovedByRoleCode,
    paymentDate
  });
}

function normalizePayoutRequests({ state, decision, payoutRequests }) {
  const instructions = decision.paymentInstructionIds.map((instructionId) => state.paymentInstructions.get(instructionId)).filter(Boolean);
  if (instructions.length === 0) {
    throw error(409, "dividend_payment_instructions_missing", "Dividend payout recording requires scheduled payment instructions.");
  }
  if (!Array.isArray(payoutRequests) || payoutRequests.length === 0) {
    return instructions
      .filter((instruction) => remainingMoney(instruction.grossAmount, instruction.paidGrossAmount) > 0)
      .map((instruction) => ({
        instructionId: instruction.instructionId,
        grossAmount: remainingMoney(instruction.grossAmount, instruction.paidGrossAmount)
      }));
  }
  return payoutRequests.map((entry) => {
    const instruction = state.paymentInstructions.get(requireText(entry?.instructionId, "dividend_instruction_id_required"));
    if (!instruction || instruction.decisionId !== decision.decisionId) {
      throw error(404, "dividend_instruction_not_found", "Dividend payment instruction was not found.");
    }
    const requestedGrossAmount = normalizePositiveMoney(entry.grossAmount, "dividend_payout_amount_invalid");
    const remainingGrossAmount = remainingMoney(instruction.grossAmount, instruction.paidGrossAmount);
    if (requestedGrossAmount - remainingGrossAmount > MONEY_EPSILON) {
      throw error(409, "dividend_payout_amount_exceeds_outstanding", "Dividend payout amount exceeds outstanding instruction amount.");
    }
    return {
      instructionId: instruction.instructionId,
      grossAmount: requestedGrossAmount
    };
  });
}

function materializePayoutSettlement({ state, decision, payoutDate, payoutRequests }) {
  const lines = payoutRequests.map((request) => {
    const instruction = state.paymentInstructions.get(request.instructionId);
    const remainingGrossAmount = remainingMoney(instruction.grossAmount, instruction.paidGrossAmount);
    const isFinalSettlement = Math.abs(request.grossAmount - remainingGrossAmount) <= MONEY_EPSILON;
    const remainingWithholdingAmount = remainingMoney(instruction.withheldAmount, instruction.paidWithholdingAmount);
    const withheldAmount = isFinalSettlement
      ? remainingWithholdingAmount
      : normalizeMoney(request.grossAmount * instruction.withholdingProfile.withholdingRate);
    const netAmount = normalizeMoney(request.grossAmount - withheldAmount);
    return Object.freeze({
      instructionId: instruction.instructionId,
      grossAmount: request.grossAmount,
      withheldAmount,
      netAmount,
      paymentDate: payoutDate
    });
  });
  return Object.freeze({
    lines,
    totalGrossAmount: lines.reduce((sum, entry) => normalizeMoney(sum + entry.grossAmount), 0),
    totalWithholdingAmount: lines.reduce((sum, entry) => normalizeMoney(sum + entry.withheldAmount), 0),
    totalNetAmount: lines.reduce((sum, entry) => normalizeMoney(sum + entry.netAmount), 0)
  });
}

function postDividendResolutionJournal({ ledgerPlatform, decision, journalDate, actorId, approvedByActorId, approvedByRoleCode }) {
  requireLedgerRuntime(ledgerPlatform);
  validateJournalPlanAccounts({ ledgerPlatform, companyId: decision.companyId, journalPlan: decision.journalPlan, requiresAuthorityLiability: false });
  const created = ledgerPlatform.createJournalEntry({
    companyId: decision.companyId,
    journalDate,
    voucherSeriesCode: decision.journalPlan.voucherSeriesCode,
    sourceType: "OWNER_DISTRIBUTION",
    sourceId: `decision:${decision.decisionId}:stamma_resolution`,
    description: `Dividend decision ${decision.decisionId} resolved at stamma`,
    actorId,
    idempotencyKey: `owner_distribution:resolve:${decision.decisionId}`,
    metadataJson: {
      ownerDistributionDecisionId: decision.decisionId,
      phaseCode: "stamma_resolution"
    },
    lines: [
      {
        accountNumber: decision.journalPlan.equityAccountRef,
        debitAmount: decision.totalAmount
      },
      {
        accountNumber: decision.journalPlan.liabilityAccountRef,
        creditAmount: decision.totalAmount
      }
    ]
  });
  ledgerPlatform.validateJournalEntry({
    companyId: decision.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
  const posted = ledgerPlatform.postJournalEntry({
    companyId: decision.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId,
    approvedByActorId,
    approvedByRoleCode
  });
  return posted.journalEntry || posted;
}

function postDividendPayoutJournal({ ledgerPlatform, decision, payoutDate, settlement, actorId, approvedByActorId, approvedByRoleCode }) {
  requireLedgerRuntime(ledgerPlatform);
  validateJournalPlanAccounts({
    ledgerPlatform,
    companyId: decision.companyId,
    journalPlan: decision.journalPlan,
    requiresAuthorityLiability: settlement.totalWithholdingAmount > 0
  });
  const lines = [
    {
      accountNumber: decision.journalPlan.liabilityAccountRef,
      debitAmount: settlement.totalGrossAmount
    },
    {
      accountNumber: decision.journalPlan.paymentAccountRef,
      creditAmount: settlement.totalNetAmount
    }
  ];
  if (settlement.totalWithholdingAmount > 0) {
    lines.push({
      accountNumber: decision.journalPlan.authorityLiabilityAccountRef,
      creditAmount: settlement.totalWithholdingAmount
    });
  }
  const payoutRunNo = decision.payoutRuns.length + 1;
  const created = ledgerPlatform.createJournalEntry({
    companyId: decision.companyId,
    journalDate: payoutDate,
    voucherSeriesCode: decision.journalPlan.voucherSeriesCode,
    sourceType: "OWNER_DISTRIBUTION",
    sourceId: `decision:${decision.decisionId}:payout:${payoutRunNo}`,
    description: `Dividend payout ${payoutRunNo} for decision ${decision.decisionId}`,
    actorId,
    idempotencyKey: `owner_distribution:payout:${decision.decisionId}:${payoutRunNo}`,
    metadataJson: {
      ownerDistributionDecisionId: decision.decisionId,
      phaseCode: "payout",
      totalWithholdingAmount: settlement.totalWithholdingAmount
    },
    lines
  });
  ledgerPlatform.validateJournalEntry({
    companyId: decision.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId
  });
  const posted = ledgerPlatform.postJournalEntry({
    companyId: decision.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId,
    approvedByActorId,
    approvedByRoleCode
  });
  return posted.journalEntry || posted;
}

function reverseLedgerJournal({ ledgerPlatform, companyId, originalJournalEntryId, reversalDate, actorId, approvedByActorId, approvedByRoleCode }) {
  requireLedgerRuntime(ledgerPlatform);
  const reversed = ledgerPlatform.reverseJournalEntry({
    companyId,
    journalEntryId: originalJournalEntryId,
    journalDate: reversalDate,
    actorId,
    approvedByActorId,
    approvedByRoleCode,
    reasonCode: "owner_distribution_reversal",
    correctionKey: `owner_distribution_reversal:${originalJournalEntryId}`
  });
  return reversed.reversalJournalEntry?.journalEntryId || reversed.journalEntryId || reversed.reversalJournalEntryId;
}

function validateJournalPlanAccounts({ ledgerPlatform, companyId, journalPlan, requiresAuthorityLiability }) {
  const accounts = indexLedgerAccounts(ledgerPlatform.listLedgerAccounts({ companyId }));
  const equityAccount = requireLedgerAccount(accounts, journalPlan.equityAccountRef, "dividend_equity_account_not_found");
  if (equityAccount.accountClass !== "2") {
    throw error(409, "dividend_equity_account_invalid", "Dividend equity account must be a class 2 equity or liability account.");
  }
  const liabilityAccount = requireLedgerAccount(accounts, journalPlan.liabilityAccountRef, "dividend_liability_account_not_found");
  if (liabilityAccount.accountClass !== "2") {
    throw error(409, "dividend_liability_account_invalid", "Dividend liability account must be a class 2 balance-sheet account.");
  }
  const paymentAccount = requireLedgerAccount(accounts, journalPlan.paymentAccountRef, "dividend_payment_account_not_found");
  if (paymentAccount.accountClass !== "1") {
    throw error(409, "dividend_payment_account_invalid", "Dividend payment account must be a class 1 bank or asset account.");
  }
  if (requiresAuthorityLiability) {
    const authorityAccount = requireLedgerAccount(
      accounts,
      journalPlan.authorityLiabilityAccountRef,
      "dividend_authority_liability_account_not_found"
    );
    if (authorityAccount.accountClass !== "2") {
      throw error(409, "dividend_authority_liability_account_invalid", "Kupongskatt authority account must be a class 2 balance-sheet account.");
    }
  }
}

function materializeDecision(state, decision) {
  return copy({
    ...decision,
    paymentInstructions: decision.paymentInstructionIds.map((instructionId) => state.paymentInstructions.get(instructionId)).filter(Boolean).map(copy),
    ku31Drafts: decision.ku31DraftIds.map((draftId) => state.ku31Drafts.get(draftId)).filter(Boolean).map(copy),
    kupongskattRecords: decision.kupongskattRecordIds.map((recordId) => state.kupongskattRecords.get(recordId)).filter(Boolean).map(copy)
  });
}

function resolveLegalFormProfile({ legalFormPlatform, companyId, asOfDate }) {
  if (!legalFormPlatform || typeof legalFormPlatform.resolveActiveLegalFormProfile !== "function") {
    throw error(409, "legal_form_runtime_required", "Owner distributions require the legal-form runtime.");
  }
  return legalFormPlatform.resolveActiveLegalFormProfile({
    companyId,
    asOfDate
  });
}

function requireAnnualPackageProof({ annualReportingPlatform, companyId, packageId, versionId }) {
  if (!annualReportingPlatform || typeof annualReportingPlatform.getAnnualReportPackage !== "function") {
    throw error(409, "annual_reporting_runtime_required", "Free-equity proof requires the annual-reporting runtime.");
  }
  const annualPackage = annualReportingPlatform.getAnnualReportPackage({
    companyId,
    packageId: requireText(packageId, "annual_report_package_id_required")
  });
  const version =
    annualPackage.versions.find((candidate) => candidate.versionId === normalizeOptionalText(versionId))
    || annualPackage.currentVersion
    || null;
  if (!version || version.packageStatus !== "signed" || !version.lockedAt || version.signoffHash !== version.checksum) {
    throw error(409, "annual_report_version_not_locked_for_dividend_proof", "Free-equity proof requires a locked signed annual-report version.");
  }
  return copy({
    ...annualPackage,
    currentVersion: version
  });
}

function requireLedgerRuntime(ledgerPlatform) {
  if (
    !ledgerPlatform
    || typeof ledgerPlatform.createJournalEntry !== "function"
    || typeof ledgerPlatform.validateJournalEntry !== "function"
    || typeof ledgerPlatform.postJournalEntry !== "function"
    || typeof ledgerPlatform.listLedgerAccounts !== "function"
  ) {
    throw error(409, "ledger_runtime_required", "Owner distributions require the ledger runtime.");
  }
}

function requireActor(orgAuthPlatform, actorId) {
  const resolvedActorId = requireText(actorId, "actor_id_required");
  if (orgAuthPlatform && typeof orgAuthPlatform.listIdentityAccounts === "function") {
    const exists = orgAuthPlatform.listIdentityAccounts().some((candidate) => candidate.userId === resolvedActorId);
    if (!exists) {
      throw error(404, "actor_not_found", `Actor ${resolvedActorId} was not found.`);
    }
  }
  return resolvedActorId;
}

function requireCompanyProfile(orgAuthPlatform, companyId) {
  if (!orgAuthPlatform || typeof orgAuthPlatform.getCompanyProfile !== "function") {
    throw error(409, "org_auth_runtime_required", "Owner distributions require the org-auth runtime.");
  }
  return orgAuthPlatform.getCompanyProfile({
    companyId: requireText(companyId, "company_id_required")
  });
}

function appendAuditEvent(state, input) {
  const auditEvent = Object.freeze({
    ownerDistributionAuditEventId: crypto.randomUUID(),
    companyId: input.companyId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    eventCode: input.eventCode,
    message: input.message,
    actorId: input.actorId,
    approvedByActorId: normalizeOptionalText(input.approvedByActorId),
    approvedByRoleCode: normalizeOptionalText(input.approvedByRoleCode),
    metadata: copy(input.metadata || {}),
    recordedAt: normalizeDateTimeOrDate(input.recordedAt, "owner_distribution_audit_recorded_at_invalid")
  });
  state.auditEvents.set(auditEvent.ownerDistributionAuditEventId, auditEvent);
  return auditEvent;
}

function getCompanyRecord(collection, companyId, recordId, code, message) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  const resolvedRecordId = requireText(recordId, "record_id_required");
  const record = collection.get(resolvedRecordId);
  if (!record || record.companyId !== resolvedCompanyId) {
    throw error(404, code, message);
  }
  return record;
}

function listRecordsByCompany(collection, companyId) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  return [...collection.values()]
    .filter((candidate) => candidate.companyId === resolvedCompanyId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(copy);
}

function materializeRulepackRef(rulePack) {
  return Object.freeze({
    rulepackId: rulePack.rulePackId,
    rulepackCode: rulePack.rulePackCode,
    rulepackVersion: rulePack.version,
    rulepackChecksum: rulePack.checksum,
    effectiveFrom: rulePack.effectiveFrom,
    effectiveTo: rulePack.effectiveTo || null,
    officialSourceRefs: copy(rulePack.officialSourceRefs || [])
  });
}

function indexLedgerAccounts(accounts) {
  return new Map((accounts || []).map((account) => [account.accountNumber, account]));
}

function requireLedgerAccount(accounts, accountNumber, code) {
  const account = accounts.get(requireText(accountNumber, "ledger_account_number_required"));
  if (!account) {
    throw error(404, code, `Ledger account ${accountNumber} was not found.`);
  }
  return account;
}

function normalizePositiveNumber(value, code) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw error(400, code, "Value must be a positive number.");
  }
  return numericValue;
}

function normalizeMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeOptionalMoney(value) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeMoney(value);
}

function normalizePositiveMoney(value, code) {
  const money = normalizeMoney(value);
  if (money <= 0) {
    throw error(400, code, "Amount must be positive.");
  }
  return money;
}

function isPositiveMoney(value) {
  return normalizeMoney(value) > 0;
}

function remainingMoney(total, paid) {
  return normalizeMoney(Math.max(0, normalizeMoney(total) - normalizeMoney(paid)));
}

function normalizeOptionalRate(value) {
  if (value == null || value === "") {
    return null;
  }
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw error(400, "withholding_rate_invalid", "Withholding rate must be between 0 and 1.");
  }
  return Number(rate.toFixed(6));
}

function normalizeDate(value, code) {
  const resolved = requireText(value, code);
  const parsed = new Date(`${resolved}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw error(400, code, "Date is invalid.");
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeDateTimeOrDate(value, code) {
  const resolved = requireText(value, code);
  const parsed = new Date(resolved.includes("T") ? resolved : `${resolved}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw error(400, code, "Timestamp is invalid.");
  }
  return parsed.toISOString();
}

function nowIso(clock) {
  return clock().toISOString();
}

function addMonthsIso(dateValue, monthsToAdd) {
  const base = new Date(`${normalizeDate(dateValue, "date_invalid")}T00:00:00.000Z`);
  const day = base.getUTCDate();
  base.setUTCMonth(base.getUTCMonth() + Number(monthsToAdd || 0));
  while (base.getUTCDate() !== day && base.getUTCDate() < day) {
    base.setUTCDate(base.getUTCDate() - 1);
  }
  return base.toISOString().slice(0, 10);
}

function requireText(value, code) {
  const resolved = normalizeOptionalText(value);
  if (!resolved) {
    throw error(400, code, "Required text value is missing.");
  }
  return resolved;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function assertAllowed(value, allowedValues, code) {
  if (!allowedValues.includes(value)) {
    throw error(400, code, `Unsupported value ${value}.`);
  }
  return value;
}

function assertSeparateApproval({ actorId, approvedByActorId, code }) {
  if (requireText(actorId, "actor_id_required") === requireText(approvedByActorId, "approved_by_actor_id_required")) {
    throw error(409, code, "Approval actor must be separate from the initiating actor.");
  }
}

function error(statusCode, code, message) {
  return Object.assign(new Error(message), {
    statusCode,
    status: statusCode,
    code,
    error: code
  });
}

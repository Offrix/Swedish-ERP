import crypto from "node:crypto";

export const HUS_CASE_STATES = Object.freeze([
  "draft",
  "classified",
  "invoiced",
  "customer_partially_paid",
  "customer_paid",
  "claim_draft",
  "claim_submitted",
  "claim_accepted",
  "claim_partially_accepted",
  "claim_rejected",
  "paid_out",
  "credit_pending",
  "recovery_pending",
  "closed"
]);
export const HUS_SERVICE_TYPE_CODES = Object.freeze(["rot", "rut", "not_eligible"]);
export const HUS_PAYMENT_CHANNELS = Object.freeze(["bank_transfer", "card", "swish", "plusgiro", "bankgiro"]);
export const HUS_CLAIM_TRANSPORT_TYPES = Object.freeze(["json", "xml"]);

export function createHusPlatform(options = {}) {
  return createHusEngine(options);
}

export function createHusEngine({
  clock = () => new Date(),
  arPlatform = null,
  projectsPlatform = null
} = {}) {
  const state = {
    husCases: new Map(),
    husCaseIdsByCompany: new Map(),
    husClaims: new Map(),
    auditEvents: []
  };

  return {
    husCaseStates: HUS_CASE_STATES,
    husServiceTypeCodes: HUS_SERVICE_TYPE_CODES,
    husPaymentChannels: HUS_PAYMENT_CHANNELS,
    husClaimTransportTypes: HUS_CLAIM_TRANSPORT_TYPES,
    listHusCases,
    getHusCase,
    createHusCase,
    classifyHusCase,
    markHusCaseInvoiced,
    recordHusCustomerPayment,
    listHusClaims,
    getHusClaim,
    createHusClaim,
    submitHusClaim,
    recordHusDecision,
    recordHusPayout,
    registerHusCreditAdjustment,
    recordHusRecovery,
    listHusAuditEvents
  };

  function listHusCases({ companyId, status = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedStatus = normalizeOptionalText(status);
    return (state.husCaseIdsByCompany.get(resolvedCompanyId) || [])
      .map((husCaseId) => state.husCases.get(husCaseId))
      .filter(Boolean)
      .filter((record) => (resolvedStatus ? record.status === resolvedStatus : true))
      .sort((left, right) => left.caseReference.localeCompare(right.caseReference))
      .map(copy);
  }

  function getHusCase({ companyId, husCaseId } = {}) {
    return copy(requireHusCase(companyId, husCaseId));
  }

  function createHusCase({
    companyId,
    husCaseId = null,
    caseReference = null,
    customerId = null,
    projectId = null,
    customerInvoiceId = null,
    serviceTypeCode = "rot",
    workCompletedOn,
    currencyCode = "SEK",
    ruleYear = 2026,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    if (customerId && arPlatform?.getCustomer) {
      arPlatform.getCustomer({ companyId: resolvedCompanyId, customerId });
    }
    if (projectId && projectsPlatform?.getProject) {
      projectsPlatform.getProject({ companyId: resolvedCompanyId, projectId });
    }
    if (customerInvoiceId && arPlatform?.getInvoice) {
      arPlatform.getInvoice({ companyId: resolvedCompanyId, customerInvoiceId });
    }
    const record = {
      husCaseId: normalizeOptionalText(husCaseId) || crypto.randomUUID(),
      companyId: resolvedCompanyId,
      caseReference: normalizeOptionalText(caseReference) || generateCaseReference(state, resolvedCompanyId),
      customerId: normalizeOptionalText(customerId),
      projectId: normalizeOptionalText(projectId),
      customerInvoiceId: normalizeOptionalText(customerInvoiceId),
      serviceTypeCode: requireEnum(HUS_SERVICE_TYPE_CODES, serviceTypeCode, "hus_service_type_invalid"),
      workCompletedOn: normalizeRequiredDate(workCompletedOn, "hus_work_completed_on_required"),
      currencyCode: normalizeUpperCode(currencyCode, "hus_currency_code_required", 3),
      ruleYear: normalizeWholeNumber(ruleYear, "hus_rule_year_invalid"),
      status: "draft",
      totalGrossAmount: 0,
      totalEligibleLaborAmount: 0,
      preliminaryReductionAmount: 0,
      customerShareAmount: 0,
      paidCustomerAmount: 0,
      outstandingCustomerShareAmount: 0,
      buyers: [],
      serviceLines: [],
      classificationDecisions: [],
      customerPayments: [],
      claims: [],
      decisions: [],
      payouts: [],
      recoveries: [],
      creditAdjustments: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.husCases.set(record.husCaseId, record);
    appendToIndex(state.husCaseIdsByCompany, record.companyId, record.husCaseId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.created",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Created HUS case ${record.caseReference}.`
    });
    return copy(record);
  }

  function classifyHusCase({ companyId, husCaseId, serviceLines = [], buyers = [], actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    if (["claim_submitted", "paid_out", "closed"].includes(record.status)) {
      throw createError(409, "hus_case_not_classifiable", "The HUS case can no longer be reclassified.");
    }
    const normalizedLines = normalizeServiceLines(serviceLines, record.serviceTypeCode);
    const totals = summarizeServiceLines(normalizedLines);
    const normalizedBuyers = normalizeBuyers(buyers, totals.customerShareAmount, totals.preliminaryReductionAmount);
    record.serviceLines = normalizedLines;
    record.buyers = normalizedBuyers;
    record.classificationDecisions.push({
      husClassificationDecisionId: crypto.randomUUID(),
      ruleYear: record.ruleYear,
      decisionHash: hashObject({ normalizedLines, normalizedBuyers, ruleYear: record.ruleYear }),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    });
    record.totalGrossAmount = totals.totalGrossAmount;
    record.totalEligibleLaborAmount = totals.totalEligibleLaborAmount;
    record.preliminaryReductionAmount = totals.preliminaryReductionAmount;
    record.customerShareAmount = totals.customerShareAmount;
    record.outstandingCustomerShareAmount = roundMoney(Math.max(0, record.customerShareAmount - record.paidCustomerAmount));
    record.status = record.customerInvoiceId ? "invoiced" : "classified";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.classified",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Classified HUS case ${record.caseReference}.`
    });
    return copy(record);
  }

  function markHusCaseInvoiced({ companyId, husCaseId, customerInvoiceId = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const resolvedCustomerInvoiceId = normalizeOptionalText(customerInvoiceId) || record.customerInvoiceId;
    if (resolvedCustomerInvoiceId && arPlatform?.getInvoice) {
      arPlatform.getInvoice({ companyId: record.companyId, customerInvoiceId: resolvedCustomerInvoiceId });
    }
    record.customerInvoiceId = resolvedCustomerInvoiceId;
    record.status = record.outstandingCustomerShareAmount === 0 && record.customerShareAmount > 0 ? "customer_paid" : "invoiced";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.invoiced",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Marked HUS case ${record.caseReference} as invoiced.`
    });
    return copy(record);
  }

  function recordHusCustomerPayment({ companyId, husCaseId, paidAmount, paidOn, paymentChannel, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    if (record.customerShareAmount <= 0) {
      throw createError(409, "hus_customer_share_missing", "Customer share must be classified before payments can be registered.");
    }
    const paymentRecord = {
      husCustomerPaymentId: crypto.randomUUID(),
      paidAmount: normalizeMoney(paidAmount, "hus_customer_payment_amount_invalid"),
      paidOn: normalizeRequiredDate(paidOn, "hus_customer_payment_date_required"),
      paymentChannel: requireEnum(HUS_PAYMENT_CHANNELS, paymentChannel, "hus_payment_channel_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.customerPayments.push(paymentRecord);
    record.paidCustomerAmount = roundMoney(record.customerPayments.reduce((sum, payment) => sum + payment.paidAmount, 0));
    record.outstandingCustomerShareAmount = roundMoney(Math.max(0, record.customerShareAmount - record.paidCustomerAmount));
    record.status = record.outstandingCustomerShareAmount === 0 ? "customer_paid" : "customer_partially_paid";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.customer_payment_recorded",
      entityType: "hus_case",
      entityId: record.husCaseId,
      projectId: record.projectId,
      explanation: `Recorded customer payment for HUS case ${record.caseReference}.`
    });
    return copy(record);
  }

  function listHusClaims({ companyId, husCaseId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCaseId = normalizeOptionalText(husCaseId);
    const cases = resolvedCaseId
      ? [requireHusCase(resolvedCompanyId, resolvedCaseId)]
      : (state.husCaseIdsByCompany.get(resolvedCompanyId) || []).map((id) => state.husCases.get(id)).filter(Boolean);
    return cases.flatMap((record) => record.claims.map(copy));
  }

  function getHusClaim({ companyId, husClaimId } = {}) {
    const claimRecord = state.husClaims.get(requireText(husClaimId, "hus_claim_id_required"));
    if (!claimRecord || claimRecord.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "hus_claim_not_found", "HUS claim was not found.");
    }
    return copy(claimRecord);
  }

  function createHusClaim({ companyId, husCaseId, requestedAmount = null, transportType = "json", actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    if (record.status !== "customer_paid" && record.status !== "claim_draft") {
      throw createError(409, "hus_claim_not_ready", "The HUS case must have a fully paid customer share before claim drafting.");
    }
    const claimRecord = {
      husClaimId: crypto.randomUUID(),
      companyId: record.companyId,
      husCaseId: record.husCaseId,
      versionNo: record.claims.length + 1,
      requestedAmount: normalizeMoney(
        requestedAmount ?? Math.max(0, record.preliminaryReductionAmount - sumAmounts(record.creditAdjustments, "adjustmentAmount")),
        "hus_claim_amount_invalid"
      ),
      transportType: requireEnum(HUS_CLAIM_TRANSPORT_TYPES, transportType, "hus_claim_transport_invalid"),
      status: "claim_draft",
      submittedOn: null,
      payloadHash: null,
      versions: [],
      statusEvents: [],
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    const version = {
      husClaimVersionId: crypto.randomUUID(),
      versionNo: claimRecord.versionNo,
      payloadJson: buildClaimPayload(record, claimRecord),
      payloadHash: hashObject(buildClaimPayload(record, claimRecord)),
      createdAt: nowIso(clock)
    };
    claimRecord.versions.push(version);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "claim_draft",
      payloadJson: { requestedAmount: claimRecord.requestedAmount },
      createdAt: nowIso(clock)
    });
    record.claims.push(claimRecord);
    state.husClaims.set(claimRecord.husClaimId, claimRecord);
    record.status = "claim_draft";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.drafted",
      entityType: "hus_claim",
      entityId: claimRecord.husClaimId,
      projectId: record.projectId,
      explanation: `Drafted HUS claim for case ${record.caseReference}.`
    });
    return copy(claimRecord);
  }

  function submitHusClaim({ companyId, husClaimId, submittedOn = null, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    if (claimRecord.status !== "claim_draft") {
      throw createError(409, "hus_claim_not_submittable", "Only draft HUS claims can be submitted.");
    }
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const resolvedSubmittedOn = normalizeRequiredDate(submittedOn || nowIso(clock).slice(0, 10), "hus_claim_submission_date_required");
    const latestPaymentDate = record.customerPayments.map((payment) => payment.paidOn).sort().pop();
    if (!latestPaymentDate) {
      throw createError(409, "hus_customer_payment_missing", "Customer payment is required before claim submission.");
    }
    const latestAllowedSubmissionDate = `${String(Number(latestPaymentDate.slice(0, 4)) + 1)}-01-31`;
    if (resolvedSubmittedOn > latestAllowedSubmissionDate) {
      throw createError(409, "hus_claim_submission_deadline_passed", "The HUS claim cannot be submitted after 31 January following the payment year.");
    }
    claimRecord.status = "claim_submitted";
    claimRecord.submittedOn = resolvedSubmittedOn;
    claimRecord.payloadHash = claimRecord.versions.at(-1).payloadHash;
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "claim_submitted",
      payloadJson: { submittedOn: resolvedSubmittedOn, payloadHash: claimRecord.payloadHash },
      createdAt: nowIso(clock)
    });
    record.status = "claim_submitted";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.submitted",
      entityType: "hus_claim",
      entityId: claimRecord.husClaimId,
      projectId: record.projectId,
      explanation: `Submitted HUS claim for case ${record.caseReference}.`
    });
    return copy(claimRecord);
  }

  function recordHusDecision({ companyId, husClaimId, decisionDate, approvedAmount, rejectedAmount = null, reasonCode, rejectedOutcomeCode = "customer_reinvoice", actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const resolvedApprovedAmount = normalizeMoney(approvedAmount, "hus_decision_approved_amount_invalid");
    const resolvedRejectedAmount = normalizeMoney(rejectedAmount ?? Math.max(0, claimRecord.requestedAmount - resolvedApprovedAmount), "hus_decision_rejected_amount_invalid");
    const decision = {
      husDecisionId: crypto.randomUUID(),
      husClaimId: claimRecord.husClaimId,
      decisionDate: normalizeRequiredDate(decisionDate, "hus_decision_date_required"),
      requestedAmount: claimRecord.requestedAmount,
      approvedAmount: resolvedApprovedAmount,
      rejectedAmount: resolvedRejectedAmount,
      reasonCode: requireText(reasonCode, "hus_decision_reason_required"),
      rejectedOutcomeCode: requireText(rejectedOutcomeCode, "hus_rejected_outcome_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.decisions.push(decision);
    if (resolvedRejectedAmount === 0) {
      claimRecord.status = "claim_accepted";
      record.status = "claim_accepted";
    } else if (resolvedApprovedAmount === 0) {
      claimRecord.status = "claim_rejected";
      record.status = "claim_rejected";
    } else {
      claimRecord.status = "claim_partially_accepted";
      record.status = "claim_partially_accepted";
    }
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: claimRecord.status,
      payloadJson: { approvedAmount: resolvedApprovedAmount, rejectedAmount: resolvedRejectedAmount, reasonCode: decision.reasonCode },
      createdAt: nowIso(clock)
    });
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.decision_recorded",
      entityType: "hus_decision",
      entityId: decision.husDecisionId,
      projectId: record.projectId,
      explanation: `Recorded HUS decision for case ${record.caseReference}.`
    });
    return { husClaim: copy(claimRecord), husDecision: copy(decision) };
  }

  function recordHusPayout({ companyId, husClaimId, payoutDate, payoutAmount, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const claimRecord = requireHusClaim(companyId, husClaimId);
    const record = requireHusCase(companyId, claimRecord.husCaseId);
    const payout = {
      husPayoutId: crypto.randomUUID(),
      husClaimId: claimRecord.husClaimId,
      payoutDate: normalizeRequiredDate(payoutDate, "hus_payout_date_required"),
      payoutAmount: normalizeMoney(payoutAmount, "hus_payout_amount_invalid"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.payouts.push(payout);
    claimRecord.status = "paid_out";
    claimRecord.updatedAt = nowIso(clock);
    claimRecord.statusEvents.push({
      husClaimStatusEventId: crypto.randomUUID(),
      eventCode: "paid_out",
      payloadJson: { payoutAmount: payout.payoutAmount, payoutDate: payout.payoutDate },
      createdAt: nowIso(clock)
    });
    record.status = "paid_out";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.claim.payout_recorded",
      entityType: "hus_payout",
      entityId: payout.husPayoutId,
      projectId: record.projectId,
      explanation: `Recorded HUS payout for case ${record.caseReference}.`
    });
    return { husClaim: copy(claimRecord), husPayout: copy(payout) };
  }

  function registerHusCreditAdjustment({ companyId, husCaseId, adjustmentDate, adjustmentAmount, reasonCode, afterPayoutFlag = false, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const adjustment = {
      husCreditAdjustmentId: crypto.randomUUID(),
      adjustmentDate: normalizeRequiredDate(adjustmentDate, "hus_credit_adjustment_date_required"),
      adjustmentAmount: normalizeMoney(adjustmentAmount, "hus_credit_adjustment_amount_invalid"),
      reasonCode: requireText(reasonCode, "hus_credit_adjustment_reason_required"),
      afterPayoutFlag: afterPayoutFlag === true,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.creditAdjustments.push(adjustment);
    record.status = adjustment.afterPayoutFlag ? "recovery_pending" : "credit_pending";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.credit_adjusted",
      entityType: "hus_credit_adjustment",
      entityId: adjustment.husCreditAdjustmentId,
      projectId: record.projectId,
      explanation: `Registered credit adjustment for HUS case ${record.caseReference}.`
    });
    return { husCase: copy(record), husCreditAdjustment: copy(adjustment) };
  }

  function recordHusRecovery({ companyId, husCaseId, recoveryDate, recoveryAmount, reasonCode, actorId = "system", correlationId = crypto.randomUUID() } = {}) {
    const record = requireHusCase(companyId, husCaseId);
    const recovery = {
      husRecoveryId: crypto.randomUUID(),
      recoveryDate: normalizeRequiredDate(recoveryDate, "hus_recovery_date_required"),
      recoveryAmount: normalizeMoney(recoveryAmount, "hus_recovery_amount_invalid"),
      reasonCode: requireText(reasonCode, "hus_recovery_reason_required"),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock)
    };
    record.recoveries.push(recovery);
    const outstanding = roundMoney(Math.max(0, sumAmounts(record.creditAdjustments, "adjustmentAmount") - sumAmounts(record.recoveries, "recoveryAmount")));
    record.status = outstanding === 0 ? "closed" : "recovery_pending";
    record.updatedAt = nowIso(clock);
    pushAudit(state, clock, {
      companyId: record.companyId,
      caseId: record.husCaseId,
      actorId,
      correlationId,
      action: "hus.case.recovery_recorded",
      entityType: "hus_recovery",
      entityId: recovery.husRecoveryId,
      projectId: record.projectId,
      explanation: `Recorded HUS recovery for case ${record.caseReference}.`
    });
    return { husCase: copy(record), husRecovery: copy(recovery) };
  }

  function listHusAuditEvents({ companyId, husCaseId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedCaseId = normalizeOptionalText(husCaseId);
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (resolvedCaseId ? event.caseId === resolvedCaseId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function requireHusCase(companyId, husCaseId) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const record = state.husCases.get(requireText(husCaseId, "hus_case_id_required"));
    if (!record || record.companyId !== resolvedCompanyId) {
      throw createError(404, "hus_case_not_found", "HUS case was not found.");
    }
    return record;
  }

  function requireHusClaim(companyId, husClaimId) {
    const claimRecord = state.husClaims.get(requireText(husClaimId, "hus_claim_id_required"));
    if (!claimRecord || claimRecord.companyId !== requireText(companyId, "company_id_required")) {
      throw createError(404, "hus_claim_not_found", "HUS claim was not found.");
    }
    return claimRecord;
  }
}

function normalizeServiceLines(serviceLines, defaultServiceTypeCode) {
  if (!Array.isArray(serviceLines) || serviceLines.length === 0) {
    throw createError(400, "hus_service_lines_required", "At least one HUS service line is required.");
  }
  return serviceLines.map((line, index) => {
    const serviceTypeCode = requireEnum(HUS_SERVICE_TYPE_CODES, line?.serviceTypeCode ?? defaultServiceTypeCode, "hus_service_line_type_invalid");
    const laborCostAmount = normalizeMoney(line?.laborCostAmount ?? 0, "hus_service_line_labor_invalid");
    const materialAmount = normalizeMoney(line?.materialAmount ?? 0, "hus_service_line_material_invalid");
    const travelAmount = normalizeMoney(line?.travelAmount ?? 0, "hus_service_line_travel_invalid");
    const equipmentAmount = normalizeMoney(line?.equipmentAmount ?? 0, "hus_service_line_equipment_invalid");
    const adminAmount = normalizeMoney(line?.adminAmount ?? 0, "hus_service_line_admin_invalid");
    const otherAmount = normalizeMoney(line?.otherAmount ?? 0, "hus_service_line_other_invalid");
    const totalAmount = roundMoney(laborCostAmount + materialAmount + travelAmount + equipmentAmount + adminAmount + otherAmount);
    const reductionRate = serviceTypeCode === "rot" ? 0.3 : serviceTypeCode === "rut" ? 0.5 : 0;
    return {
      husServiceLineId: crypto.randomUUID(),
      lineNo: index + 1,
      description: requireText(line?.description || `Service line ${index + 1}`, "hus_service_line_description_required"),
      serviceTypeCode,
      laborCostAmount,
      materialAmount,
      travelAmount,
      equipmentAmount,
      adminAmount,
      otherAmount,
      totalAmount,
      eligibleLaborAmount: serviceTypeCode === "not_eligible" ? 0 : laborCostAmount,
      preliminaryReductionAmount: roundMoney(laborCostAmount * reductionRate),
      customerShareAmount: roundMoney(totalAmount - laborCostAmount * reductionRate)
    };
  });
}

function summarizeServiceLines(serviceLines) {
  return serviceLines.reduce(
    (accumulator, line) => ({
      totalGrossAmount: roundMoney(accumulator.totalGrossAmount + line.totalAmount),
      totalEligibleLaborAmount: roundMoney(accumulator.totalEligibleLaborAmount + line.eligibleLaborAmount),
      preliminaryReductionAmount: roundMoney(accumulator.preliminaryReductionAmount + line.preliminaryReductionAmount),
      customerShareAmount: roundMoney(accumulator.customerShareAmount + line.customerShareAmount)
    }),
    {
      totalGrossAmount: 0,
      totalEligibleLaborAmount: 0,
      preliminaryReductionAmount: 0,
      customerShareAmount: 0
    }
  );
}

function normalizeBuyers(buyers, customerShareAmount, preliminaryReductionAmount) {
  if (!Array.isArray(buyers) || buyers.length === 0) {
    throw createError(400, "hus_case_buyers_required", "At least one HUS buyer is required.");
  }
  const normalized = buyers.map((buyer, index) => ({
    husCaseBuyerId: crypto.randomUUID(),
    buyerNo: index + 1,
    displayName: requireText(buyer?.displayName, "hus_buyer_name_required"),
    personalIdentityNumber: requireText(buyer?.personalIdentityNumber, "hus_buyer_identity_required"),
    allocationPercent: Number(buyer?.allocationPercent ?? (buyers.length === 1 ? 100 : 0))
  }));
  const totalPercent = roundMoney(normalized.reduce((sum, buyer) => sum + buyer.allocationPercent, 0));
  if (totalPercent !== 100) {
    throw createError(400, "hus_buyer_allocation_invalid", "HUS buyer allocation must sum to 100 percent.");
  }
  return normalized.map((buyer) => ({
    ...buyer,
    customerShareAmount: roundMoney(customerShareAmount * (buyer.allocationPercent / 100)),
    preliminaryReductionAmount: roundMoney(preliminaryReductionAmount * (buyer.allocationPercent / 100))
  }));
}

function buildClaimPayload(record, claimRecord) {
  return {
    husCaseId: record.husCaseId,
    caseReference: record.caseReference,
    customerInvoiceId: record.customerInvoiceId,
    ruleYear: record.ruleYear,
    workCompletedOn: record.workCompletedOn,
    serviceLines: record.serviceLines,
    buyers: record.buyers,
    customerPayments: record.customerPayments,
    requestedAmount: claimRecord.requestedAmount,
    transportType: claimRecord.transportType
  };
}

function generateCaseReference(state, companyId) {
  const count = (state.husCaseIdsByCompany.get(companyId) || []).length + 1;
  return `HUS-${new Date().getUTCFullYear()}-${String(count).padStart(4, "0")}`;
}

function appendToIndex(map, key, value) {
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function sumAmounts(items, fieldName) {
  return roundMoney((items || []).reduce((sum, item) => sum + Number(item[fieldName] || 0), 0));
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, "Required value is missing.");
  }
  return normalized;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeRequiredDate(value, code) {
  const normalized = normalizeOptionalDate(value, code);
  if (!normalized) {
    throw createError(400, code, "Date is required.");
  }
  return normalized;
}

function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, "Date must use YYYY-MM-DD.");
  }
  return normalized;
}

function normalizeUpperCode(value, code, length = null) {
  const normalized = requireText(value, code).toUpperCase();
  if (length != null && normalized.length !== length) {
    throw createError(400, code, `Expected ${length} characters.`);
  }
  return normalized;
}

function normalizeMoney(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw createError(400, code, "Expected a non-negative numeric amount.");
  }
  return roundMoney(numberValue);
}

function normalizeWholeNumber(value, code) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw createError(400, code, "Expected a non-negative whole number.");
  }
  return Math.round(numberValue);
}

function requireEnum(allowedValues, value, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `Value ${normalized} is not allowed.`);
  }
  return normalized;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function pushAudit(state, clock, entry) {
  state.auditEvents.push({
    auditEventId: crypto.randomUUID(),
    companyId: entry.companyId,
    caseId: entry.caseId || null,
    actorId: entry.actorId,
    correlationId: entry.correlationId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    projectId: entry.projectId || null,
    createdAt: nowIso(clock),
    explanation: entry.explanation
  });
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function copy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}

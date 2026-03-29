import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";

const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PAYROLL_CONSUMPTION_STAGES = Object.freeze(["calculated", "approved"]);
const PENSION_PAYROLL_SOURCE_TYPES = Object.freeze(["pension_event", "salary_exchange_agreement", "pension_basis_snapshot"]);

const PENSION_PLAN_CODES = Object.freeze(["ITP1", "ITP2", "FORA", "EXTRA_PENSION"]);
const PENSION_PROVIDER_CODES = Object.freeze(["collectum", "fora", "custom"]);
const CONTRIBUTION_MODES = Object.freeze(["rate_percent", "fixed_amount"]);
const SALARY_EXCHANGE_STATUSES = Object.freeze(["draft", "active", "paused", "stopped"]);
const SALARY_EXCHANGE_MODES = Object.freeze(["fixed_amount", "percent_of_gross"]);
const BASIS_TREATMENT_CODES = Object.freeze(["maintain_pre_exchange", "reduce_with_exchange"]);
const REPORT_STATUSES = Object.freeze(["draft", "ready", "submitted", "corrected"]);
const SALARY_EXCHANGE_POLICY_REGISTRY = Object.freeze([
  createSalaryExchangePolicySeed({
    policyVersionRef: "se_salary_exchange_policy_2026_v1",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    minimumRemainingCashSalaryAmount: 56087,
    minimumMonthlyExchangeAmount: 500,
    maximumExchangeShare: 0.2,
    defaultEmployerMarkupPercent: 5.8,
    specialPayrollTaxRatePercent: 24.26,
    minimumEmploymentTypeCode: "permanent"
  })
]);

const PENSION_PROVIDER_EXPORT_INSTRUCTION_REGISTRY = Object.freeze([
  createProviderExportInstructionSeed({
    instructionVersionRef: "collectum_export_instruction_2026_v1",
    providerCode: "collectum",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    transportModeCode: "manual_portal_upload",
    payloadFormatCode: "collectum_salary_change_export_v1",
    submissionChannelCode: "provider_portal",
    legalEffectMode: "provider_portal_receipt",
    reportDueStrategy: "manual_policy_window",
    invoiceDueDayOfNextMonth: 15
  }),
  createProviderExportInstructionSeed({
    instructionVersionRef: "fora_export_instruction_2026_v1",
    providerCode: "fora",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    transportModeCode: "manual_portal_upload",
    payloadFormatCode: "fora_monthly_wage_export_v1",
    submissionChannelCode: "provider_portal",
    legalEffectMode: "provider_portal_receipt",
    reportDueStrategy: "end_of_next_month",
    invoiceDueDayOfNextMonth: null
  }),
  createProviderExportInstructionSeed({
    instructionVersionRef: "custom_export_instruction_2026_v1",
    providerCode: "custom",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    transportModeCode: "manual_evidence_pack",
    payloadFormatCode: "custom_pension_export_v1",
    submissionChannelCode: "backoffice_managed",
    legalEffectMode: "manual_confirmation_required",
    reportDueStrategy: "manual_policy_window",
    invoiceDueDayOfNextMonth: null
  })
]);

const PLAN_CATALOG_SEED = Object.freeze([
  createPlanSeed("ITP1", "collectum", "itp1", "ITP 1", "monthly_gross_salary", "PENSION_PREMIUM"),
  createPlanSeed("ITP2", "collectum", "itp2", "ITP 2", "annual_pensionable_salary", "PENSION_PREMIUM"),
  createPlanSeed("FORA", "fora", "fora", "Fora", "monthly_wage_report", "FORA_PREMIUM"),
  createPlanSeed("EXTRA_PENSION", "custom", "supplementary", "Extra pension", "supplementary_premium", "EXTRA_PENSION_PREMIUM")
]);

export function createPensionPlatform(options = {}) {
  return createPensionEngine(options);
}

export function createPensionEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  hrPlatform = null
} = {}) {
  const state = {
    plans: new Map(),
    planIdsByCompany: new Map(),
    planIdByCompanyCode: new Map(),
    enrollments: new Map(),
    enrollmentIdsByCompany: new Map(),
    enrollmentIdsByEmployment: new Map(),
    agreements: new Map(),
    agreementIdsByCompany: new Map(),
    agreementIdsByEmployment: new Map(),
    basisSnapshots: new Map(),
    basisSnapshotIdsByCompany: new Map(),
    basisSnapshotIdBySourceKey: new Map(),
    events: new Map(),
    eventIdsByCompany: new Map(),
    eventIdsByEmployment: new Map(),
    eventIdBySourceKey: new Map(),
    payrollConsumptions: new Map(),
    payrollConsumptionIdsBySourceKey: new Map(),
    payrollConsumptionIdByKey: new Map(),
    reports: new Map(),
    reportIdsByCompany: new Map(),
    reportIdByCompanyPeriodProvider: new Map(),
    reconciliations: new Map(),
    reconciliationIdsByCompany: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedPlanCatalog(state, { companyId: DEMO_COMPANY_ID, clock });
  }

  const engine = {
    pensionPlanCodes: PENSION_PLAN_CODES,
    pensionProviderCodes: PENSION_PROVIDER_CODES,
    contributionModes: CONTRIBUTION_MODES,
    salaryExchangeStatuses: SALARY_EXCHANGE_STATUSES,
    salaryExchangeModes: SALARY_EXCHANGE_MODES,
    basisTreatmentCodes: BASIS_TREATMENT_CODES,
    listPensionPlans,
    listPensionEnrollments,
    createPensionEnrollment,
    listSalaryExchangeAgreements,
    simulateSalaryExchangeAgreement,
    createSalaryExchangeAgreement,
    listPensionBasisSnapshots,
    listPensionEvents,
    getPensionEvent,
    listPensionReports,
    createPensionReport,
    listPensionReconciliations,
    createPensionReconciliation,
    listPensionAuditEvents,
    listPayrollPensionPayloads,
    registerPensionPayrollConsumption
  };

  Object.defineProperty(engine, "__durableState", {
    value: state,
    enumerable: false
  });

  return engine;

  function listPensionPlans({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    seedPlanCatalog(state, { companyId: resolvedCompanyId, clock });
    return (state.planIdsByCompany.get(resolvedCompanyId) || [])
      .map((pensionPlanId) => state.plans.get(pensionPlanId))
      .filter(Boolean)
      .sort((left, right) => left.planCode.localeCompare(right.planCode))
      .map(copy);
  }

  function listPensionEnrollments({ companyId, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    let candidates = (state.enrollmentIdsByCompany.get(resolvedCompanyId) || [])
      .map((pensionEnrollmentId) => state.enrollments.get(pensionEnrollmentId))
      .filter(Boolean);
    if (employmentId) {
      candidates = candidates.filter((candidate) => candidate.employmentId === employmentId);
    }
    return candidates
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createPensionEnrollment({
    companyId,
    employeeId,
    employmentId,
    planCode,
    startsOn,
    endsOn = null,
    contributionMode = "rate_percent",
    contributionRatePercent = null,
    fixedContributionAmount = null,
    contributionBasisCode = null,
    providerCode = null,
    status = "active",
    dimensionJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const employment = assertEmploymentLink({
      hrPlatform,
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId
    });
    seedPlanCatalog(state, { companyId: resolvedCompanyId, clock });
    const plan = requirePlan(state, resolvedCompanyId, planCode);
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "pension_enrollment_start_required");
    const resolvedEndsOn = normalizeOptionalDate(endsOn, "pension_enrollment_end_invalid");
    if (resolvedEndsOn && resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "pension_enrollment_dates_invalid", "Pension enrollment end date cannot be earlier than the start date.");
    }
    const resolvedContributionMode = assertAllowed(contributionMode, CONTRIBUTION_MODES, "pension_contribution_mode_invalid");
    const resolvedContributionRatePercent = normalizeOptionalMoney(contributionRatePercent, "pension_contribution_rate_invalid");
    const resolvedFixedContributionAmount = normalizeOptionalMoney(fixedContributionAmount, "pension_fixed_contribution_invalid");
    if (resolvedContributionMode === "rate_percent" && (resolvedContributionRatePercent == null || resolvedContributionRatePercent < 0)) {
      throw createError(400, "pension_contribution_rate_required", "Contribution rate percent is required for rate-based pension enrollments.");
    }
    if (resolvedContributionMode === "fixed_amount" && (resolvedFixedContributionAmount == null || resolvedFixedContributionAmount < 0)) {
      throw createError(400, "pension_fixed_contribution_required", "Fixed contribution amount is required for fixed pension enrollments.");
    }
    const dedupeKey = `${resolvedCompanyId}:${resolvedEmploymentId}:${plan.planCode}:${resolvedStartsOn}`;
    const existing = listPensionEnrollments({ companyId: resolvedCompanyId, employmentId: resolvedEmploymentId }).find(
      (candidate) => `${candidate.companyId}:${candidate.employmentId}:${candidate.planCode}:${candidate.startsOn}` === dedupeKey
    );
    if (existing) {
      return existing;
    }
    const resolvedProviderCode = assertAllowed(
      normalizeOptionalText(providerCode) || plan.providerCode,
      PENSION_PROVIDER_CODES,
      "pension_provider_code_invalid"
    );
    const record = {
      pensionEnrollmentId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      planCode: plan.planCode,
      providerCode: resolvedProviderCode,
      collectiveAgreementCode: plan.collectiveAgreementCode,
      contributionMode: resolvedContributionMode,
      contributionRatePercent: resolvedContributionRatePercent,
      fixedContributionAmount: resolvedFixedContributionAmount,
      contributionBasisCode: normalizeOptionalText(contributionBasisCode) || defaultContributionBasisCode(plan.planCode),
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      status: normalizeOptionalText(status) || "active",
      dimensionJson: normalizeDimensions(dimensionJson),
      employmentTypeCode: employment.employmentTypeCode,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.enrollments.set(record.pensionEnrollmentId, record);
    appendToIndex(state.enrollmentIdsByCompany, record.companyId, record.pensionEnrollmentId);
    appendToIndex(state.enrollmentIdsByEmployment, record.employmentId, record.pensionEnrollmentId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "pension.enrollment.created",
      entityType: "pension_enrollment",
      entityId: record.pensionEnrollmentId,
      employmentId: record.employmentId,
      explanation: `Created ${record.planCode} pension enrollment for employment ${record.employmentId}.`
    });
    return copy(record);
  }

  function listSalaryExchangeAgreements({ companyId, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    let candidates = (state.agreementIdsByCompany.get(resolvedCompanyId) || [])
      .map((salaryExchangeAgreementId) => state.agreements.get(salaryExchangeAgreementId))
      .filter(Boolean);
    if (employmentId) {
      candidates = candidates.filter((candidate) => candidate.employmentId === employmentId);
    }
    return candidates
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => presentSalaryExchangeAgreement(state, candidate));
  }

  function simulateSalaryExchangeAgreement({
    companyId = null,
    employeeId = null,
    employmentId = null,
    monthlyGrossSalary,
    effectiveDate = null,
    exchangeMode = "fixed_amount",
    exchangeValue,
    employerMarkupPercent = null,
    thresholdAmount = null,
    exceptionDecisionReference = null
  } = {}) {
    const resolvedEffectiveDate = normalizeOptionalDate(effectiveDate, "salary_exchange_effective_date_invalid") || currentIsoDate(clock);
    const policy = resolveSalaryExchangePolicyForDate(resolvedEffectiveDate);
    const resolvedMonthlyGrossSalary = normalizeMoney(monthlyGrossSalary, "salary_exchange_monthly_salary_invalid");
    const resolvedExchangeMode = assertAllowed(exchangeMode, SALARY_EXCHANGE_MODES, "salary_exchange_mode_invalid");
    const resolvedExchangeValue = normalizeMoney(exchangeValue, "salary_exchange_value_invalid");
    const resolvedEmployerMarkupPercent = normalizeOptionalMoney(employerMarkupPercent, "salary_exchange_markup_invalid");
    const resolvedThresholdAmount = normalizeOptionalMoney(thresholdAmount, "salary_exchange_threshold_invalid");
    const warnings = [];
    const blockingIssues = [];
    const exchangedAmount =
      resolvedExchangeMode === "percent_of_gross"
        ? roundMoney(resolvedMonthlyGrossSalary * (resolvedExchangeValue / 100))
        : roundMoney(resolvedExchangeValue);
    const effectiveEmployerMarkupPercent =
      resolvedEmployerMarkupPercent == null ? policy.defaultEmployerMarkupPercent : resolvedEmployerMarkupPercent;
    const effectiveThresholdAmount =
      resolvedThresholdAmount == null ? policy.minimumRemainingCashSalaryAmount : resolvedThresholdAmount;
    const maxAllowedAmount = roundMoney(resolvedMonthlyGrossSalary * policy.maximumExchangeShare);
    if (exchangedAmount < policy.minimumMonthlyExchangeAmount) {
      blockingIssues.push("salary_exchange_minimum_violation");
    }
    if (exchangedAmount > maxAllowedAmount && !normalizeOptionalText(exceptionDecisionReference)) {
      blockingIssues.push("salary_exchange_percentage_limit_violation");
    }
    const projectedCashSalaryAfterExchange = roundMoney(resolvedMonthlyGrossSalary - exchangedAmount);
    if (projectedCashSalaryAfterExchange < effectiveThresholdAmount) {
      warnings.push("salary_exchange_threshold_warning");
    }
    if (companyId && employeeId && employmentId && hrPlatform?.getEmployment) {
      const employment = assertEmploymentLink({ hrPlatform, companyId, employeeId, employmentId });
      if (employment.employmentTypeCode !== policy.minimumEmploymentTypeCode) {
        blockingIssues.push("salary_exchange_requires_permanent_employment");
      }
    }
    warnings.push("salary_exchange_social_insurance_review_required");
    return Object.freeze({
      policyVersionRef: policy.policyVersionRef,
      policyEffectiveFrom: policy.effectiveFrom,
      policyEffectiveTo: policy.effectiveTo,
      minimumMonthlyExchangeAmount: policy.minimumMonthlyExchangeAmount,
      maximumExchangeShare: policy.maximumExchangeShare,
      exchangedAmount,
      employerMarkupPercent: effectiveEmployerMarkupPercent,
      employerMarkupAmount: roundMoney(exchangedAmount * (effectiveEmployerMarkupPercent / 100)),
      employerPensionContributionAmount: roundMoney(exchangedAmount * (1 + effectiveEmployerMarkupPercent / 100)),
      projectedCashSalaryAfterExchange,
      thresholdAmount: effectiveThresholdAmount,
      specialPayrollTaxRatePercent: policy.specialPayrollTaxRatePercent,
      warnings,
      blockingIssues
    });
  }

  function createSalaryExchangeAgreement({
    companyId,
    employeeId,
    employmentId,
    startsOn,
    endsOn = null,
    exchangeMode = "fixed_amount",
    exchangeValue,
    employerMarkupPercent = null,
    thresholdAmount = null,
    basisTreatmentCode = "maintain_pre_exchange",
    providerCode = null,
    status = "active",
    exceptionDecisionReference = null,
    dimensionJson = {},
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const employment = assertEmploymentLink({
      hrPlatform,
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId
    });
    const resolvedStartsOn = normalizeRequiredDate(startsOn, "salary_exchange_start_required");
    const resolvedEndsOn = normalizeOptionalDate(endsOn, "salary_exchange_end_invalid");
    const policy = resolveSalaryExchangePolicyForDate(resolvedStartsOn);
    if (resolvedEndsOn && resolvedEndsOn < resolvedStartsOn) {
      throw createError(400, "salary_exchange_dates_invalid", "Salary exchange end date cannot be earlier than the start date.");
    }
    const yearlyChangeCount = listSalaryExchangeAgreements({ companyId: resolvedCompanyId, employmentId: resolvedEmploymentId }).filter(
      (candidate) => candidate.startsOn.slice(0, 4) === resolvedStartsOn.slice(0, 4)
    ).length;
    if (yearlyChangeCount >= 2 && !normalizeOptionalText(exceptionDecisionReference)) {
      throw createError(
        409,
        "salary_exchange_change_limit_exceeded",
        "Salary exchange cannot be changed more than two times per calendar year without an exception decision reference."
      );
    }
    const preview = simulateSalaryExchangeAgreement({
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      monthlyGrossSalary: resolveEmploymentMonthlySalary({ hrPlatform, employment }),
      effectiveDate: resolvedStartsOn,
      exchangeMode,
      exchangeValue,
      employerMarkupPercent,
      thresholdAmount,
      exceptionDecisionReference
    });
    if (preview.blockingIssues.length > 0) {
      throw createError(409, preview.blockingIssues[0], `Salary exchange agreement could not be created due to: ${preview.blockingIssues.join(", ")}.`);
    }
    const record = {
      salaryExchangeAgreementId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      startsOn: resolvedStartsOn,
      endsOn: resolvedEndsOn,
      status: assertAllowed(status, SALARY_EXCHANGE_STATUSES, "salary_exchange_status_invalid"),
      exchangeMode: assertAllowed(exchangeMode, SALARY_EXCHANGE_MODES, "salary_exchange_mode_invalid"),
      exchangeValue: normalizeMoney(exchangeValue, "salary_exchange_value_invalid"),
      employerMarkupPercent: preview.employerMarkupPercent,
      thresholdAmount: preview.thresholdAmount,
      policyVersionRef: policy.policyVersionRef,
      policyEffectiveFrom: policy.effectiveFrom,
      policyEffectiveTo: policy.effectiveTo,
      minimumMonthlyExchangeAmount: policy.minimumMonthlyExchangeAmount,
      maximumExchangeShare: policy.maximumExchangeShare,
      specialPayrollTaxRatePercent: policy.specialPayrollTaxRatePercent,
      basisTreatmentCode: assertAllowed(basisTreatmentCode, BASIS_TREATMENT_CODES, "salary_exchange_basis_treatment_invalid"),
      providerCode: assertAllowed(
        normalizeOptionalText(providerCode) || resolveAgreementProviderCode(state, resolvedCompanyId, resolvedEmploymentId),
        PENSION_PROVIDER_CODES,
        "salary_exchange_provider_invalid"
      ),
      exceptionDecisionReference: normalizeOptionalText(exceptionDecisionReference),
      dimensionJson: normalizeDimensions(dimensionJson),
      preview,
      employmentTypeCode: employment.employmentTypeCode,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.agreements.set(record.salaryExchangeAgreementId, record);
    appendToIndex(state.agreementIdsByCompany, record.companyId, record.salaryExchangeAgreementId);
    appendToIndex(state.agreementIdsByEmployment, record.employmentId, record.salaryExchangeAgreementId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "salary_exchange.agreement.created",
      entityType: "salary_exchange_agreement",
      entityId: record.salaryExchangeAgreementId,
      employmentId: record.employmentId,
      explanation: `Created salary exchange agreement for employment ${record.employmentId}.`
    });
    return copy(record);
  }

  function listPensionBasisSnapshots({ companyId, reportingPeriod = null, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : null;
    return (state.basisSnapshotIdsByCompany.get(resolvedCompanyId) || [])
      .map((pensionBasisSnapshotId) => state.basisSnapshots.get(pensionBasisSnapshotId))
      .filter(Boolean)
      .filter((candidate) => (resolvedReportingPeriod ? candidate.reportingPeriod === resolvedReportingPeriod : true))
      .filter((candidate) => (employmentId ? candidate.employmentId === employmentId : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => presentPensionBasisSnapshot(state, candidate));
  }

  function listPensionEvents({ companyId, reportingPeriod = null, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : null;
    return (state.eventIdsByCompany.get(resolvedCompanyId) || [])
      .map((pensionEventId) => state.events.get(pensionEventId))
      .filter(Boolean)
      .filter((candidate) => candidate.status !== "superseded")
      .filter((candidate) => (resolvedReportingPeriod ? candidate.reportingPeriod === resolvedReportingPeriod : true))
      .filter((candidate) => (employmentId ? candidate.employmentId === employmentId : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map((candidate) => presentPensionEvent(state, candidate));
  }

  function getPensionEvent({ companyId, pensionEventId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedPensionEventId = requireText(pensionEventId, "pension_event_id_required");
    const record = state.events.get(resolvedPensionEventId);
    if (!record || record.companyId !== resolvedCompanyId || record.status === "superseded") {
      throw createError(404, "pension_event_not_found", "Pension event was not found.");
    }
    return presentPensionEvent(state, record);
  }

  function listPensionReports({ companyId, reportingPeriod = null, providerCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : null;
    return (state.reportIdsByCompany.get(resolvedCompanyId) || [])
      .map((pensionReportId) => state.reports.get(pensionReportId))
      .filter(Boolean)
      .filter((candidate) => (resolvedReportingPeriod ? candidate.reportingPeriod === resolvedReportingPeriod : true))
      .filter((candidate) => (providerCode ? candidate.providerCode === providerCode : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createPensionReport({
    companyId,
    reportingPeriod,
    providerCode,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "reporting_period_required");
    const resolvedProviderCode = assertAllowed(providerCode, PENSION_PROVIDER_CODES, "pension_report_provider_invalid");
    const exportInstruction = resolveProviderExportInstructionForPeriod({
      providerCode: resolvedProviderCode,
      reportingPeriod: resolvedReportingPeriod
    });
    const events = listPensionEvents({ companyId: resolvedCompanyId, reportingPeriod: resolvedReportingPeriod }).filter(
      (candidate) => candidate.providerCode === resolvedProviderCode
    );
    const lines = events.map((event) => ({
      pensionReportLineId: crypto.randomUUID(),
      collectiveAgreementCode: event.collectiveAgreementCode,
      planCode: event.planCode,
      providerCode: event.providerCode,
      employeeId: event.employeeId,
      employmentId: event.employmentId,
      reportingBasisAmount: event.reportBasisAmount,
      contributionAmount: event.contributionAmount,
      payloadJson: buildReportLinePayload(event, resolvedReportingPeriod, exportInstruction)
    }));
    const totals = {
      lineCount: lines.length,
      contributionAmount: roundMoney(lines.reduce((sum, line) => sum + Number(line.contributionAmount || 0), 0)),
      employeeCount: new Set(lines.map((line) => line.employeeId)).size
    };
    const payloadHash = buildSnapshotHash({ lines, totals });
    const key = `${resolvedCompanyId}:${resolvedReportingPeriod}:${resolvedProviderCode}`;
    const existingReportId = state.reportIdByCompanyPeriodProvider.get(key);
    const existing = existingReportId ? state.reports.get(existingReportId) : null;
    if (existing && existing.payloadHash === payloadHash) {
      return copy(existing);
    }
    const record = {
      pensionReportId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reportingPeriod: resolvedReportingPeriod,
      providerCode: resolvedProviderCode,
      reportStatus: "draft",
      providerExportInstruction: copy(exportInstruction),
      dueDate: resolveReportDueDate(exportInstruction, resolvedReportingPeriod),
      invoiceDueDate: resolveInvoiceDueDate(exportInstruction, resolvedReportingPeriod),
      totals,
      lines,
      payloadHash,
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.reports.set(record.pensionReportId, record);
    appendToIndex(state.reportIdsByCompany, record.companyId, record.pensionReportId);
    state.reportIdByCompanyPeriodProvider.set(key, record.pensionReportId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "pension.report.created",
      entityType: "pension_report",
      entityId: record.pensionReportId,
      explanation: `Created ${resolvedProviderCode} pension report for ${resolvedReportingPeriod}.`
    });
    return copy(record);
  }

  function listPensionReconciliations({ companyId, reportingPeriod = null, providerCode = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod, "reporting_period_invalid") : null;
    return (state.reconciliationIdsByCompany.get(resolvedCompanyId) || [])
      .map((pensionReconciliationId) => state.reconciliations.get(pensionReconciliationId))
      .filter(Boolean)
      .filter((candidate) => (resolvedReportingPeriod ? candidate.reportingPeriod === resolvedReportingPeriod : true))
      .filter((candidate) => (providerCode ? candidate.providerCode === providerCode : true))
      .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod) || left.createdAt.localeCompare(right.createdAt))
      .map(copy);
  }

  function createPensionReconciliation({
    companyId,
    reportingPeriod,
    providerCode,
    invoicedAmount,
    invoiceDocumentId = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "reporting_period_required");
    const resolvedProviderCode = assertAllowed(providerCode, PENSION_PROVIDER_CODES, "pension_reconciliation_provider_invalid");
    const expectedAmount = roundMoney(
      listPensionEvents({ companyId: resolvedCompanyId, reportingPeriod: resolvedReportingPeriod })
        .filter((candidate) => candidate.providerCode === resolvedProviderCode)
        .reduce((sum, candidate) => sum + Number(candidate.contributionAmount || 0), 0)
    );
    const resolvedInvoicedAmount = normalizeMoney(invoicedAmount, "pension_reconciliation_invoiced_amount_invalid");
    const differenceAmount = roundMoney(resolvedInvoicedAmount - expectedAmount);
    const record = {
      pensionReconciliationId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      reportingPeriod: resolvedReportingPeriod,
      providerCode: resolvedProviderCode,
      expectedAmount,
      invoicedAmount: resolvedInvoicedAmount,
      differenceAmount,
      status: Math.abs(differenceAmount) < 0.005 ? "matched" : "difference_detected",
      invoiceDocumentId: normalizeOptionalText(invoiceDocumentId),
      createdByActorId: requireText(actorId, "actor_id_required"),
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.reconciliations.set(record.pensionReconciliationId, record);
    appendToIndex(state.reconciliationIdsByCompany, record.companyId, record.pensionReconciliationId);
    pushAudit(state, clock, {
      companyId: record.companyId,
      actorId: record.createdByActorId,
      correlationId,
      action: "pension.reconciliation.created",
      entityType: "pension_reconciliation",
      entityId: record.pensionReconciliationId,
      explanation: `Created ${resolvedProviderCode} pension reconciliation for ${resolvedReportingPeriod}.`
    });
    return copy(record);
  }

  function listPensionAuditEvents({ companyId, employmentId = null } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return state.auditEvents
      .filter((event) => event.companyId === resolvedCompanyId)
      .filter((event) => (employmentId ? event.employmentId === employmentId : true))
      .map(copy);
  }

  function listPayrollPensionPayloads({
    companyId,
    employeeId,
    employmentId,
    reportingPeriod,
    periodStartsOn,
    periodEndsOn,
    contractMonthlySalary = null,
    grossCompensationBeforeDeductions = 0,
    pensionableBaseBeforeExchange = 0,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedEmployeeId = requireText(employeeId, "employee_id_required");
    const resolvedEmploymentId = requireText(employmentId, "employment_id_required");
    const resolvedReportingPeriod = normalizeReportingPeriod(reportingPeriod, "reporting_period_required");
    const resolvedPeriodStartsOn = normalizeRequiredDate(periodStartsOn, "period_starts_on_required");
    const resolvedPeriodEndsOn = normalizeRequiredDate(periodEndsOn, "period_ends_on_required");
    const salaryExchangePolicy = resolveSalaryExchangePolicyForDate(resolvedPeriodStartsOn);

    assertEmploymentLink({
      hrPlatform,
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId
    });

    const activeEnrollments = resolveActiveEnrollments(state, {
      companyId: resolvedCompanyId,
      employmentId: resolvedEmploymentId,
      periodStartsOn: resolvedPeriodStartsOn,
      periodEndsOn: resolvedPeriodEndsOn
    });
    const activeAgreement = resolveActiveSalaryExchangeAgreement(state, {
      companyId: resolvedCompanyId,
      employmentId: resolvedEmploymentId,
      periodStartsOn: resolvedPeriodStartsOn,
      periodEndsOn: resolvedPeriodEndsOn
    });

    const baseGrossSalary = roundMoney(
      normalizeOptionalMoney(contractMonthlySalary, "contract_monthly_salary_invalid") ??
        normalizeMoney(grossCompensationBeforeDeductions, "gross_compensation_before_deductions_invalid")
    );
    const resolvedPensionableBaseBeforeExchange = normalizeMoney(
      pensionableBaseBeforeExchange,
      "pensionable_base_before_exchange_invalid"
    );
    const warnings = [];
    const payLinePayloads = [];
    let salaryExchangeAmount = 0;
    let salaryExchangeContributionAmount = 0;
    let salaryExchangePreview = null;

    if (activeAgreement && activeAgreement.status === "active") {
      salaryExchangePreview = simulateSalaryExchangeAgreement({
        companyId: resolvedCompanyId,
        employeeId: resolvedEmployeeId,
        employmentId: resolvedEmploymentId,
        monthlyGrossSalary: baseGrossSalary,
        effectiveDate: resolvedPeriodStartsOn,
        exchangeMode: activeAgreement.exchangeMode,
        exchangeValue: activeAgreement.exchangeValue,
        employerMarkupPercent: activeAgreement.employerMarkupPercent,
        thresholdAmount: activeAgreement.thresholdAmount,
        exceptionDecisionReference: activeAgreement.exceptionDecisionReference
      });
      warnings.push(...salaryExchangePreview.warnings);
      salaryExchangeAmount = salaryExchangePreview.exchangedAmount;
      salaryExchangeContributionAmount = salaryExchangePreview.employerPensionContributionAmount;
      payLinePayloads.push({
        processingStep: 8,
        payItemCode: "SALARY_EXCHANGE_GROSS_DEDUCTION",
        amount: salaryExchangeAmount,
        sourceType: "salary_exchange_agreement",
        sourceId: activeAgreement.salaryExchangeAgreementId,
        sourcePeriod: resolvedReportingPeriod,
        note: "Lonevaxling",
        dimensionJson: normalizeDimensions(activeAgreement.dimensionJson)
      });
    }

    const resolvedPensionableBaseAfterExchange =
      activeAgreement && activeAgreement.basisTreatmentCode === "reduce_with_exchange"
        ? roundMoney(Math.max(0, resolvedPensionableBaseBeforeExchange - salaryExchangeAmount))
        : resolvedPensionableBaseBeforeExchange;

    const basisSnapshot = upsertBasisSnapshot({
      state,
      clock,
      companyId: resolvedCompanyId,
      employeeId: resolvedEmployeeId,
      employmentId: resolvedEmploymentId,
      reportingPeriod: resolvedReportingPeriod,
      monthlyGrossSalaryBeforeExchange: baseGrossSalary,
      salaryExchangeAmount,
      pensionableBaseBeforeExchange: resolvedPensionableBaseBeforeExchange,
      pensionableBaseAfterExchange: resolvedPensionableBaseAfterExchange,
      totalPensionPremiumAmount: 0,
      specialPayrollTaxAmount: 0,
      policyVersionRef: salaryExchangePolicy.policyVersionRef,
      policyEffectiveFrom: salaryExchangePolicy.effectiveFrom,
      policyEffectiveTo: salaryExchangePolicy.effectiveTo,
      specialPayrollTaxRatePercent: salaryExchangePolicy.specialPayrollTaxRatePercent,
      basisTreatmentCode: activeAgreement?.basisTreatmentCode || "maintain_pre_exchange",
      warningCodes: warnings,
      actorId
    });

    const events = [];
    for (const enrollment of activeEnrollments) {
      const contributionBasisAmount = resolveContributionBasisAmount({
        enrollment,
        monthlyGrossSalaryBeforeExchange: baseGrossSalary,
        pensionableBaseAfterExchange: resolvedPensionableBaseAfterExchange
      });
      const reportBasisAmount = resolveReportBasisAmount({
        planCode: enrollment.planCode,
        contributionBasisAmount,
        monthlyGrossSalaryBeforeExchange: baseGrossSalary,
        pensionableBaseAfterExchange: resolvedPensionableBaseAfterExchange
      });
      const contributionAmount =
        enrollment.contributionMode === "fixed_amount"
          ? roundMoney(enrollment.fixedContributionAmount || 0)
          : roundMoney(contributionBasisAmount * ((enrollment.contributionRatePercent || 0) / 100));
      if (contributionAmount <= 0) {
        continue;
      }
      const event = upsertPensionEvent({
        state,
        clock,
        sourceKey: `${resolvedCompanyId}:${resolvedEmploymentId}:${resolvedReportingPeriod}:${enrollment.planCode}:regular`,
        eventDraft: {
          companyId: resolvedCompanyId,
          employeeId: resolvedEmployeeId,
          employmentId: resolvedEmploymentId,
          reportingPeriod: resolvedReportingPeriod,
          planCode: enrollment.planCode,
          providerCode: enrollment.providerCode,
          collectiveAgreementCode: enrollment.collectiveAgreementCode,
          eventCode: "regular_pension_premium",
          pensionableSalary: resolvedPensionableBaseAfterExchange,
          reportBasisAmount,
          contributionRatePercent: enrollment.contributionMode === "rate_percent" ? enrollment.contributionRatePercent : null,
          contributionAmount,
          salaryExchangeFlag: false,
          extraPensionFlag: enrollment.planCode === "EXTRA_PENSION",
          reportStatus: "draft",
          invoiceReconciliationStatus: "pending",
          warningCodes: [],
          payrollLinePayloadJson: {
            processingStep: 9,
            payItemCode: resolvePayItemCodeForPlan(enrollment.planCode),
            amount: contributionAmount,
            sourceType: "pension_event",
            sourceId: "pending",
            sourcePeriod: resolvedReportingPeriod,
            note: `Pension ${enrollment.planCode}`,
            dimensionJson: normalizeDimensions(enrollment.dimensionJson)
          }
        }
      });
      event.payrollLinePayloadJson.sourceId = event.pensionEventId;
      state.events.set(event.pensionEventId, event);
      events.push(copy(event));
      payLinePayloads.push(copy(event.payrollLinePayloadJson));
    }

    if (activeAgreement && salaryExchangeContributionAmount > 0) {
      const event = upsertPensionEvent({
        state,
        clock,
        sourceKey: `${resolvedCompanyId}:${resolvedEmploymentId}:${resolvedReportingPeriod}:salary_exchange`,
        eventDraft: {
          companyId: resolvedCompanyId,
          employeeId: resolvedEmployeeId,
          employmentId: resolvedEmploymentId,
          reportingPeriod: resolvedReportingPeriod,
          planCode: "EXTRA_PENSION",
          providerCode: activeAgreement.providerCode,
          collectiveAgreementCode: resolveAgreementCollectiveAgreementCode(state, resolvedCompanyId, resolvedEmploymentId),
          eventCode: "salary_exchange_pension_premium",
          pensionableSalary: resolvedPensionableBaseAfterExchange,
          reportBasisAmount: salaryExchangeAmount,
          contributionRatePercent: null,
          contributionAmount: salaryExchangeContributionAmount,
          salaryExchangeFlag: true,
          extraPensionFlag: true,
          reportStatus: "draft",
          invoiceReconciliationStatus: "pending",
          warningCodes: salaryExchangePreview?.warnings || [],
          payrollLinePayloadJson: {
            processingStep: 9,
            payItemCode: "EXTRA_PENSION_PREMIUM",
            amount: salaryExchangeContributionAmount,
            sourceType: "salary_exchange_agreement",
            sourceId: activeAgreement.salaryExchangeAgreementId,
            sourcePeriod: resolvedReportingPeriod,
            note: "Lonevaxlingspremie",
            dimensionJson: normalizeDimensions(activeAgreement.dimensionJson)
          }
        }
      });
      events.push(copy(event));
      payLinePayloads.push(copy(event.payrollLinePayloadJson));
    }

    const totalPensionPremiumAmount = roundMoney(events.reduce((sum, event) => sum + Number(event.contributionAmount || 0), 0));
    const specialPayrollTaxAmount = roundMoney(totalPensionPremiumAmount * ((salaryExchangePolicy.specialPayrollTaxRatePercent || 0) / 100));
    if (specialPayrollTaxAmount > 0) {
      payLinePayloads.push({
        processingStep: 9,
        payItemCode: "PENSION_SPECIAL_PAYROLL_TAX",
        amount: specialPayrollTaxAmount,
        sourceType: "pension_basis_snapshot",
        sourceId: basisSnapshot.pensionBasisSnapshotId,
        sourcePeriod: resolvedReportingPeriod,
        note: "Sarskild loneskatt pa pensionskostnader",
        dimensionJson: {}
      });
    }
    state.basisSnapshots.set(basisSnapshot.pensionBasisSnapshotId, {
      ...basisSnapshot,
      totalPensionPremiumAmount,
      specialPayrollTaxAmount,
      updatedAt: nowIso(clock)
    });
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "pension.snapshot.materialized",
      entityType: "pension_basis_snapshot",
      entityId: basisSnapshot.pensionBasisSnapshotId,
      employmentId: resolvedEmploymentId,
      explanation: `Materialized pension basis snapshot for ${resolvedReportingPeriod}.`
    });
    return {
      enrollments: activeEnrollments.map(copy),
      activeAgreements: activeAgreement ? [presentSalaryExchangeAgreement(state, activeAgreement)] : [],
      basisSnapshots: [presentPensionBasisSnapshot(state, state.basisSnapshots.get(basisSnapshot.pensionBasisSnapshotId))],
      events,
      payLinePayloads,
      warnings: uniqueStrings(warnings)
    };
  }

  function registerPensionPayrollConsumption({
    companyId,
    sourceType,
    sourceId,
    payRunId,
    payRunLineId,
    payItemCode,
    processingStep,
    amount,
    sourceSnapshotHash = null,
    stage = "calculated",
    actorId = "system"
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSourceType = assertAllowed(sourceType, PENSION_PAYROLL_SOURCE_TYPES, "pension_payroll_consumption_source_type_invalid");
    const resolvedSourceId = requireText(sourceId, "pension_payroll_consumption_source_id_required");
    const sourceRecord = requirePensionPayrollSourceRecord(state, resolvedCompanyId, resolvedSourceType, resolvedSourceId);
    const resolvedStage = assertAllowed(stage, PAYROLL_CONSUMPTION_STAGES, "pension_payroll_consumption_stage_invalid");
    const resolvedPayRunId = requireText(payRunId, "pension_payroll_consumption_pay_run_id_required");
    const resolvedPayRunLineId = requireText(payRunLineId, "pension_payroll_consumption_pay_run_line_id_required");
    const resolvedPayItemCode = requireText(payItemCode, "pension_payroll_consumption_pay_item_code_required");
    const resolvedProcessingStep = normalizeProcessingStep(processingStep, "pension_payroll_consumption_processing_step_invalid");
    const resolvedAmount = normalizeMoney(amount, "pension_payroll_consumption_amount_invalid");
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const now = nowIso(clock);
    const existingId = state.payrollConsumptionIdByKey.get(resolvedPayRunLineId);
    const existing = existingId ? state.payrollConsumptions.get(existingId) : null;
    if (existing) {
      existing.stage = upgradeConsumptionStage(existing.stage, resolvedStage);
      existing.amount = resolvedAmount;
      existing.sourceSnapshotHash = normalizeOptionalText(sourceSnapshotHash);
      existing.updatedAt = now;
      if (existing.stage === "approved" && !existing.approvedAt) {
        existing.approvedAt = now;
        existing.approvedByActorId = resolvedActorId;
      }
      state.payrollConsumptions.set(existing.pensionPayrollConsumptionId, existing);
      return copy(existing);
    }

    const record = {
      pensionPayrollConsumptionId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      employeeId: sourceRecord.employeeId,
      employmentId: sourceRecord.employmentId,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      payRunId: resolvedPayRunId,
      payRunLineId: resolvedPayRunLineId,
      payItemCode: resolvedPayItemCode,
      processingStep: resolvedProcessingStep,
      amount: resolvedAmount,
      sourceSnapshotHash: normalizeOptionalText(sourceSnapshotHash),
      stage: resolvedStage,
      calculatedAt: now,
      calculatedByActorId: resolvedActorId,
      approvedAt: resolvedStage === "approved" ? now : null,
      approvedByActorId: resolvedStage === "approved" ? resolvedActorId : null,
      updatedAt: now
    };
    state.payrollConsumptions.set(record.pensionPayrollConsumptionId, record);
    appendToIndex(state.payrollConsumptionIdsBySourceKey, buildPensionPayrollSourceKey(resolvedSourceType, resolvedSourceId), record.pensionPayrollConsumptionId);
    state.payrollConsumptionIdByKey.set(resolvedPayRunLineId, record.pensionPayrollConsumptionId);
    pushAudit(state, clock, {
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId: resolvedPayRunId,
      action: resolvedStage === "approved" ? "pension.payroll.consumption.approved" : "pension.payroll.consumption.registered",
      entityType: resolvedSourceType,
      entityId: resolvedSourceId,
      employmentId: sourceRecord.employmentId,
      explanation: `Registered payroll consumption for ${resolvedSourceType} in pay run ${resolvedPayRunId}.`
    });
    return copy(record);
  }
}

function createPlanSeed(planCode, providerCode, collectiveAgreementCode, displayName, reportModelCode, defaultPayItemCode) {
  return Object.freeze({
    planCode,
    providerCode,
    collectiveAgreementCode,
    displayName,
    reportModelCode,
    defaultPayItemCode
  });
}

function createSalaryExchangePolicySeed({
  policyVersionRef,
  effectiveFrom,
  effectiveTo = null,
  minimumRemainingCashSalaryAmount,
  minimumMonthlyExchangeAmount,
  maximumExchangeShare,
  defaultEmployerMarkupPercent,
  specialPayrollTaxRatePercent,
  minimumEmploymentTypeCode
}) {
  return Object.freeze({
    policyVersionRef,
    effectiveFrom,
    effectiveTo,
    minimumRemainingCashSalaryAmount,
    minimumMonthlyExchangeAmount,
    maximumExchangeShare,
    defaultEmployerMarkupPercent,
    specialPayrollTaxRatePercent,
    minimumEmploymentTypeCode
  });
}

function createProviderExportInstructionSeed({
  instructionVersionRef,
  providerCode,
  effectiveFrom,
  effectiveTo = null,
  transportModeCode,
  payloadFormatCode,
  submissionChannelCode,
  legalEffectMode,
  reportDueStrategy,
  invoiceDueDayOfNextMonth
}) {
  return Object.freeze({
    instructionVersionRef,
    providerCode,
    effectiveFrom,
    effectiveTo,
    transportModeCode,
    payloadFormatCode,
    submissionChannelCode,
    legalEffectMode,
    reportDueStrategy,
    invoiceDueDayOfNextMonth
  });
}

function seedPlanCatalog(state, { companyId, clock }) {
  const resolvedCompanyId = requireText(companyId, "company_id_required");
  if ((state.planIdsByCompany.get(resolvedCompanyId) || []).length > 0) {
    return;
  }
  for (const seed of PLAN_CATALOG_SEED) {
    const record = {
      pensionPlanId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      planCode: seed.planCode,
      providerCode: seed.providerCode,
      collectiveAgreementCode: seed.collectiveAgreementCode,
      displayName: seed.displayName,
      reportModelCode: seed.reportModelCode,
      defaultPayItemCode: seed.defaultPayItemCode,
      active: true,
      createdAt: nowIso(clock),
      updatedAt: nowIso(clock)
    };
    state.plans.set(record.pensionPlanId, record);
    appendToIndex(state.planIdsByCompany, record.companyId, record.pensionPlanId);
    state.planIdByCompanyCode.set(`${record.companyId}:${record.planCode}`, record.pensionPlanId);
  }
}

function requirePlan(state, companyId, planCode) {
  const resolvedPlanCode = assertAllowed(planCode, PENSION_PLAN_CODES, "pension_plan_code_invalid");
  const planId = state.planIdByCompanyCode.get(`${companyId}:${resolvedPlanCode}`);
  const record = planId ? state.plans.get(planId) : null;
  if (!record) {
    throw createError(404, "pension_plan_not_found", `Pension plan ${resolvedPlanCode} was not found.`);
  }
  return record;
}

function assertEmploymentLink({ hrPlatform, companyId, employeeId, employmentId }) {
  if (!hrPlatform?.getEmployment) {
    return {
      companyId,
      employeeId,
      employmentId,
      employmentTypeCode: "permanent"
    };
  }
  const employment = hrPlatform.getEmployment({
    companyId,
    employeeId,
    employmentId
  });
  if (!employment) {
    throw createError(404, "employment_not_found", "Employment was not found.");
  }
  return employment;
}

function resolveEmploymentMonthlySalary({ hrPlatform, employment }) {
  if (!hrPlatform?.listEmploymentContracts) {
    return 0;
  }
  const contracts = hrPlatform.listEmploymentContracts({
    companyId: employment.companyId,
    employeeId: employment.employeeId,
    employmentId: employment.employmentId
  });
  const active = [...contracts]
    .sort((left, right) => left.validFrom.localeCompare(right.validFrom))
    .pop();
  return roundMoney(active?.monthlySalary || 0);
}

function resolveActiveEnrollments(state, { companyId, employmentId, periodStartsOn, periodEndsOn }) {
  return (state.enrollmentIdsByEmployment.get(employmentId) || [])
    .map((pensionEnrollmentId) => state.enrollments.get(pensionEnrollmentId))
    .filter(Boolean)
    .filter((candidate) => candidate.companyId === companyId)
    .filter((candidate) => candidate.status !== "inactive")
    .filter((candidate) => candidate.startsOn <= periodEndsOn)
    .filter((candidate) => !candidate.endsOn || candidate.endsOn >= periodStartsOn)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt));
}

function resolveActiveSalaryExchangeAgreement(state, { companyId, employmentId, periodStartsOn, periodEndsOn }) {
  return (state.agreementIdsByEmployment.get(employmentId) || [])
    .map((salaryExchangeAgreementId) => state.agreements.get(salaryExchangeAgreementId))
    .filter(Boolean)
    .filter((candidate) => candidate.companyId === companyId)
    .filter((candidate) => ["active", "paused"].includes(candidate.status))
    .filter((candidate) => candidate.startsOn <= periodEndsOn)
    .filter((candidate) => !candidate.endsOn || candidate.endsOn >= periodStartsOn)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn) || left.createdAt.localeCompare(right.createdAt))
    .pop() || null;
}

function resolveAgreementProviderCode(state, companyId, employmentId) {
  const activeEnrollment = resolveActiveEnrollments(state, {
    companyId,
    employmentId,
    periodStartsOn: "0001-01-01",
    periodEndsOn: "9999-12-31"
  })[0];
  return activeEnrollment?.providerCode || "collectum";
}

function resolveAgreementCollectiveAgreementCode(state, companyId, employmentId) {
  const activeEnrollment = resolveActiveEnrollments(state, {
    companyId,
    employmentId,
    periodStartsOn: "0001-01-01",
    periodEndsOn: "9999-12-31"
  })[0];
  return activeEnrollment?.collectiveAgreementCode || "supplementary";
}

function resolveSalaryExchangePolicyForDate(effectiveDate) {
  const resolvedDate = normalizeRequiredDate(effectiveDate, "salary_exchange_effective_date_required");
  const policy =
    SALARY_EXCHANGE_POLICY_REGISTRY.find((candidate) => isDateWithinWindow(resolvedDate, candidate.effectiveFrom, candidate.effectiveTo)) || null;
  if (!policy) {
    throw createError(409, "salary_exchange_policy_not_found", `No salary exchange policy exists for ${resolvedDate}.`);
  }
  return policy;
}

function defaultContributionBasisCode(planCode) {
  switch (planCode) {
    case "ITP2":
      return "annual_pensionable_salary";
    case "ITP1":
      return "monthly_gross_salary";
    default:
      return "monthly_pensionable_salary";
  }
}

function resolveContributionBasisAmount({ enrollment, monthlyGrossSalaryBeforeExchange, pensionableBaseAfterExchange }) {
  switch (enrollment.contributionBasisCode) {
    case "annual_pensionable_salary":
      return roundMoney(pensionableBaseAfterExchange * 12);
    case "monthly_gross_salary":
      return roundMoney(monthlyGrossSalaryBeforeExchange);
    default:
      return roundMoney(pensionableBaseAfterExchange);
  }
}

function resolveReportBasisAmount({ planCode, contributionBasisAmount, monthlyGrossSalaryBeforeExchange, pensionableBaseAfterExchange }) {
  if (planCode === "ITP1") {
    return roundMoney(monthlyGrossSalaryBeforeExchange);
  }
  if (planCode === "ITP2") {
    return roundMoney(pensionableBaseAfterExchange * 12);
  }
  return roundMoney(contributionBasisAmount);
}

function resolvePayItemCodeForPlan(planCode) {
  if (planCode === "FORA") {
    return "FORA_PREMIUM";
  }
  if (planCode === "EXTRA_PENSION") {
    return "EXTRA_PENSION_PREMIUM";
  }
  return "PENSION_PREMIUM";
}

function buildReportLinePayload(event, reportingPeriod, exportInstruction) {
  if (event.planCode === "ITP1") {
    return {
      reportingPeriod,
      instructionVersionRef: exportInstruction.instructionVersionRef,
      exportLineCode: "collectum_itp1_monthly_salary",
      reportType: "monthly_gross_salary",
      monthlyGrossSalary: event.reportBasisAmount,
      pensionableSalary: event.pensionableSalary,
      contributionAmount: event.contributionAmount
    };
  }
  if (event.planCode === "ITP2") {
    return {
      reportingPeriod,
      instructionVersionRef: exportInstruction.instructionVersionRef,
      exportLineCode: "collectum_itp2_annual_pensionable_salary",
      reportType: "annual_pensionable_salary",
      annualPensionableSalary: event.reportBasisAmount,
      contributionAmount: event.contributionAmount
    };
  }
  if (event.planCode === "FORA") {
    return {
      reportingPeriod,
      instructionVersionRef: exportInstruction.instructionVersionRef,
      exportLineCode: "fora_monthly_wage_report",
      reportType: "monthly_wage_report",
      wageAmount: event.reportBasisAmount,
      contributionAmount: event.contributionAmount,
      dueDate: resolveReportDueDate(exportInstruction, reportingPeriod)
    };
  }
  return {
    reportingPeriod,
    instructionVersionRef: exportInstruction.instructionVersionRef,
    exportLineCode: event.salaryExchangeFlag ? "salary_exchange_supplementary_premium" : "supplementary_premium",
    reportType: "supplementary_premium",
    contributionAmount: event.contributionAmount,
    salaryExchangeFlag: event.salaryExchangeFlag
  };
}

function resolveProviderExportInstructionForPeriod({ providerCode, reportingPeriod }) {
  const resolvedProviderCode = assertAllowed(providerCode, PENSION_PROVIDER_CODES, "pension_report_provider_invalid");
  const effectiveDate = `${reportingPeriod.slice(0, 4)}-${reportingPeriod.slice(4, 6)}-01`;
  const instruction =
    PENSION_PROVIDER_EXPORT_INSTRUCTION_REGISTRY.find(
      (candidate) => candidate.providerCode === resolvedProviderCode && isDateWithinWindow(effectiveDate, candidate.effectiveFrom, candidate.effectiveTo)
    ) || null;
  if (!instruction) {
    throw createError(
      409,
      "pension_provider_export_instruction_not_found",
      `No pension provider export instruction exists for ${resolvedProviderCode} ${reportingPeriod}.`
    );
  }
  return instruction;
}

function resolveReportDueDate(exportInstruction, reportingPeriod) {
  if (exportInstruction?.reportDueStrategy === "end_of_next_month") {
    return endOfNextMonth(reportingPeriod);
  }
  return null;
}

function resolveInvoiceDueDate(exportInstruction, reportingPeriod) {
  if (Number.isInteger(exportInstruction?.invoiceDueDayOfNextMonth)) {
    const year = Number(reportingPeriod.slice(0, 4));
    const month = Number(reportingPeriod.slice(4, 6));
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-${String(exportInstruction.invoiceDueDayOfNextMonth).padStart(2, "0")}`;
  }
  return null;
}

function endOfNextMonth(reportingPeriod) {
  const year = Number(reportingPeriod.slice(0, 4));
  const month = Number(reportingPeriod.slice(4, 6));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(Date.UTC(nextYear, nextMonth, 0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
}

function upsertBasisSnapshot({
  state,
  clock,
  companyId,
  employeeId,
  employmentId,
  reportingPeriod,
  monthlyGrossSalaryBeforeExchange,
  salaryExchangeAmount,
  pensionableBaseBeforeExchange,
  pensionableBaseAfterExchange,
  totalPensionPremiumAmount,
  specialPayrollTaxAmount,
  policyVersionRef,
  policyEffectiveFrom,
  policyEffectiveTo,
  specialPayrollTaxRatePercent,
  basisTreatmentCode,
  warningCodes,
  actorId
}) {
  const payload = {
    companyId,
    employeeId,
    employmentId,
    reportingPeriod,
    monthlyGrossSalaryBeforeExchange,
    salaryExchangeAmount,
    pensionableBaseBeforeExchange,
    pensionableBaseAfterExchange,
    totalPensionPremiumAmount,
    specialPayrollTaxAmount,
    policyVersionRef: requireText(policyVersionRef, "salary_exchange_policy_version_required"),
    policyEffectiveFrom: normalizeRequiredDate(policyEffectiveFrom, "salary_exchange_policy_effective_from_required"),
    policyEffectiveTo: normalizeOptionalDate(policyEffectiveTo, "salary_exchange_policy_effective_to_invalid"),
    specialPayrollTaxRatePercent: normalizeMoney(specialPayrollTaxRatePercent, "pension_special_payroll_tax_rate_invalid"),
    basisTreatmentCode: assertAllowed(basisTreatmentCode, BASIS_TREATMENT_CODES, "salary_exchange_basis_treatment_invalid"),
    warningCodes: uniqueStrings(warningCodes)
  };
  const snapshotHash = buildSnapshotHash(payload);
  const sourceKey = `${companyId}:${employmentId}:${reportingPeriod}`;
  const existingId = state.basisSnapshotIdBySourceKey.get(sourceKey);
  const existing = existingId ? state.basisSnapshots.get(existingId) : null;
  if (existing && existing.snapshotHash === snapshotHash) {
    return existing;
  }
  const record = {
    pensionBasisSnapshotId: crypto.randomUUID(),
    ...payload,
    snapshotHash,
    createdByActorId: requireText(actorId, "actor_id_required"),
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.basisSnapshots.set(record.pensionBasisSnapshotId, record);
  appendToIndex(state.basisSnapshotIdsByCompany, record.companyId, record.pensionBasisSnapshotId);
  state.basisSnapshotIdBySourceKey.set(sourceKey, record.pensionBasisSnapshotId);
  return record;
}

function upsertPensionEvent({ state, clock, sourceKey, eventDraft }) {
  const snapshotHash = buildSnapshotHash({
    reportingPeriod: eventDraft.reportingPeriod,
    planCode: eventDraft.planCode,
    providerCode: eventDraft.providerCode,
    reportBasisAmount: eventDraft.reportBasisAmount,
    contributionAmount: eventDraft.contributionAmount,
    salaryExchangeFlag: eventDraft.salaryExchangeFlag
  });
  const existingId = state.eventIdBySourceKey.get(sourceKey);
  const existing = existingId ? state.events.get(existingId) : null;
  if (existing && existing.snapshotHash === snapshotHash) {
    return existing;
  }
  if (existing) {
    existing.status = "superseded";
    existing.updatedAt = nowIso(clock);
    state.events.set(existing.pensionEventId, existing);
  }
  const record = {
    pensionEventId: crypto.randomUUID(),
    ...eventDraft,
    payrollLinePayloadJson: copy(eventDraft.payrollLinePayloadJson),
    warningCodes: uniqueStrings(eventDraft.warningCodes || []),
    status: "draft",
    snapshotHash,
    createdAt: nowIso(clock),
    updatedAt: nowIso(clock)
  };
  state.events.set(record.pensionEventId, record);
  appendToIndex(state.eventIdsByCompany, record.companyId, record.pensionEventId);
  appendToIndex(state.eventIdsByEmployment, record.employmentId, record.pensionEventId);
  state.eventIdBySourceKey.set(sourceKey, record.pensionEventId);
  return record;
}

function presentPensionEvent(state, record) {
  const payrollConsumptions = listPensionPayrollConsumptions(state, "pension_event", record.pensionEventId);
  return copy({
    ...record,
    payrollConsumptions,
    payrollDispatchStatus: summarizePayrollConsumptions(payrollConsumptions)
  });
}

function presentSalaryExchangeAgreement(state, record) {
  const payrollConsumptions = listPensionPayrollConsumptions(state, "salary_exchange_agreement", record.salaryExchangeAgreementId);
  return copy({
    ...record,
    payrollConsumptions,
    payrollDispatchStatus: summarizePayrollConsumptions(payrollConsumptions)
  });
}

function presentPensionBasisSnapshot(state, record) {
  const payrollConsumptions = listPensionPayrollConsumptions(state, "pension_basis_snapshot", record.pensionBasisSnapshotId);
  return copy({
    ...record,
    payrollConsumptions,
    payrollDispatchStatus: summarizePayrollConsumptions(payrollConsumptions)
  });
}

function listPensionPayrollConsumptions(state, sourceType, sourceId) {
  return (state.payrollConsumptionIdsBySourceKey.get(buildPensionPayrollSourceKey(sourceType, sourceId)) || [])
    .map((payrollConsumptionId) => state.payrollConsumptions.get(payrollConsumptionId))
    .filter(Boolean)
    .map(copy);
}

function buildPensionPayrollSourceKey(sourceType, sourceId) {
  return `${requireText(sourceType, "pension_payroll_consumption_source_type_required")}:${requireText(sourceId, "pension_payroll_consumption_source_id_required")}`;
}

function requirePensionPayrollSourceRecord(state, companyId, sourceType, sourceId) {
  if (sourceType === "pension_event") {
    const record = state.events.get(sourceId);
    if (!record || record.companyId !== companyId || record.status === "superseded") {
      throw createError(404, "pension_payroll_consumption_source_not_found", "Pension event was not found for payroll consumption.");
    }
    return record;
  }
  if (sourceType === "salary_exchange_agreement") {
    const record = state.agreements.get(sourceId);
    if (!record || record.companyId !== companyId) {
      throw createError(404, "pension_payroll_consumption_source_not_found", "Salary exchange agreement was not found for payroll consumption.");
    }
    return record;
  }
  if (sourceType === "pension_basis_snapshot") {
    const record = state.basisSnapshots.get(sourceId);
    if (!record || record.companyId !== companyId) {
      throw createError(404, "pension_payroll_consumption_source_not_found", "Pension basis snapshot was not found for payroll consumption.");
    }
    return record;
  }
  throw createError(400, "pension_payroll_consumption_source_type_invalid", "Unsupported pension payroll consumption source type.");
}

function summarizePayrollConsumptions(records) {
  const items = Array.isArray(records) ? records : [];
  return {
    totalCount: items.length,
    calculatedCount: items.filter((record) => record.stage === "calculated").length,
    approvedCount: items.filter((record) => record.stage === "approved").length,
    latestStage: items.some((record) => record.stage === "approved") ? "approved" : items.length > 0 ? "calculated" : "not_dispatched",
    payRunIds: Array.from(new Set(items.map((record) => record.payRunId))).sort()
  };
}

function upgradeConsumptionStage(currentStage, nextStage) {
  return currentStage === "approved" || nextStage === "approved" ? "approved" : "calculated";
}

function normalizeProcessingStep(value, code) {
  const resolved = Number(value);
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw createError(400, code, `${code} must be a positive integer.`);
  }
  return resolved;
}

function normalizeRequiredDate(value, code) {
  const normalized = normalizeOptionalDate(value, code);
  if (!normalized) {
    throw createError(400, code, `${code} is required.`);
  }
  return normalized;
}

function normalizeOptionalDate(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, code, `${code} must use YYYY-MM-DD format.`);
  }
  return normalized;
}

function normalizeReportingPeriod(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized || !/^\d{6}$/.test(normalized)) {
    throw createError(400, code, `${code} must use YYYYMM format.`);
  }
  return normalized;
}

function normalizeMoney(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw createError(400, code, `${code} must be numeric.`);
  }
  return roundMoney(number);
}

function normalizeOptionalMoney(value, code) {
  if (value == null || value === "") {
    return null;
  }
  return normalizeMoney(value, code);
}

function normalizeDimensions(value) {
  return copy(value || {});
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requireText(value, code) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, code, `${code} is required.`);
  }
  return normalized;
}

function assertAllowed(value, allowedValues, code) {
  const normalized = requireText(value, code);
  if (!allowedValues.includes(normalized)) {
    throw createError(400, code, `${normalized} is not an allowed value.`);
  }
  return normalized;
}

function appendToIndex(index, key, value) {
  const values = index.get(key) || [];
  values.push(value);
  index.set(key, values);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nowIso(clock) {
  return clock().toISOString();
}

function currentIsoDate(clock) {
  return nowIso(clock).slice(0, 10);
}

function isDateWithinWindow(dateValue, effectiveFrom, effectiveTo) {
  return effectiveFrom <= dateValue && (!effectiveTo || dateValue <= effectiveTo);
}

function buildSnapshotHash(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}


function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function pushAudit(state, clock, event) {
  state.auditEvents.push(
    createAuditEnvelopeFromLegacyEvent({
      clock,
      auditClass: "pension_action",
      event
    })
  );
}

function createError(statusCode, errorCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

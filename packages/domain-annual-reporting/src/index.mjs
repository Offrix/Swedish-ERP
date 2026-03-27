import crypto from "node:crypto";
import { createProviderBaselineRegistry } from "../../rule-engine/src/index.mjs";

export const ANNUAL_REPORT_PROFILE_CODES = Object.freeze(["k1", "k2", "k3"]);
export const ANNUAL_REPORT_PACKAGE_STATUSES = Object.freeze(["draft", "ready_for_signature", "signed", "submitted", "locked", "superseded"]);
export const ANNUAL_REPORT_SIGNATORY_STATUSES = Object.freeze(["invited", "signed", "declined", "superseded"]);
export const TAX_DECLARATION_PACKAGE_STATUSES = Object.freeze(["ready", "submitted", "accepted", "rejected", "superseded"]);
export const ANNUAL_REPORTING_PROVIDER_BASELINES = Object.freeze([
  Object.freeze({
    providerBaselineId: "annual-declaration-json-se-2026.1",
    baselineCode: "SE-ANNUAL-DECLARATION-JSON",
    providerCode: "skatteverket-json-support",
    domain: "annual_reporting",
    jurisdiction: "SE",
    formatFamily: "annual_declaration_support_json",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "phase14.35",
    checksum: "annual-declaration-json-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Annual declaration support JSON baseline for INK2, INK4 and NE package generation."
  }),
  Object.freeze({
    providerBaselineId: "annual-sru-export-se-2026.1",
    baselineCode: "SE-SRU-FILE",
    providerCode: "skatteverket-sru",
    domain: "annual_reporting",
    jurisdiction: "SE",
    formatFamily: "sru_file",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "1.0",
    checksum: "annual-sru-export-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "SRU export baseline for annual declaration balance and income rows."
  }),
  Object.freeze({
    providerBaselineId: "authority-audit-json-se-2026.1",
    baselineCode: "SE-AUTHORITY-AUDIT-JSON",
    providerCode: "skatteverket-audit-json",
    domain: "annual_reporting",
    jurisdiction: "SE",
    formatFamily: "authority_audit_json",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "phase12.2",
    checksum: "authority-audit-json-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Authority audit overview baseline for VAT, AGI, HUS and special payroll tax support outputs."
  }),
  Object.freeze({
    providerBaselineId: "annual-ixbrl-se-2026.1",
    baselineCode: "SE-IXBRL-FILING",
    providerCode: "bolagsverket-ixbrl",
    domain: "annual_reporting",
    jurisdiction: "SE",
    formatFamily: "ixbrl_filing",
    effectiveFrom: "2026-01-01",
    version: "2026.1",
    specVersion: "2026.1",
    checksum: "annual-ixbrl-se-2026.1",
    sourceSnapshotDate: "2026-03-27",
    semanticChangeSummary: "Baseline registry entry for Bolagsverket iXBRL annual filing formats and checksums."
  })
]);

export function createAnnualReportingPlatform(options = {}) {
  return createAnnualReportingEngine(options);
}

export function createAnnualReportingEngine({
  ledgerPlatform = null,
  reportingPlatform = null,
  orgAuthPlatform = null,
  vatPlatform = null,
  payrollPlatform = null,
  husPlatform = null,
  pensionPlatform = null,
  fiscalYearPlatform = null,
  legalFormPlatform = null,
  integrationPlatform = null,
  evidencePlatform = null,
  clock = () => new Date(),
  providerBaselineRegistry = null
} = {}) {
  const providerBaselines =
    providerBaselineRegistry
    || createProviderBaselineRegistry({ clock, seedProviderBaselines: ANNUAL_REPORTING_PROVIDER_BASELINES });
  const state = {
    packages: new Map(),
    versions: new Map(),
    evidencePacks: new Map(),
    signatories: new Map(),
    submissionEvents: new Map(),
    taxPackages: new Map()
  };

  return {
    annualReportProfileCodes: ANNUAL_REPORT_PROFILE_CODES,
    annualReportPackageStatuses: ANNUAL_REPORT_PACKAGE_STATUSES,
    annualReportSignatoryStatuses: ANNUAL_REPORT_SIGNATORY_STATUSES,
    taxDeclarationPackageStatuses: TAX_DECLARATION_PACKAGE_STATUSES,
    createAnnualReportPackage: (input) =>
      createAnnualReportPackage({ state, ledgerPlatform, reportingPlatform, orgAuthPlatform, fiscalYearPlatform, legalFormPlatform, evidencePlatform, providerBaselineRegistry: providerBaselines, clock }, input),
    createAnnualReportVersion: (input) =>
      createAnnualReportVersion({ state, ledgerPlatform, reportingPlatform, orgAuthPlatform, fiscalYearPlatform, legalFormPlatform, evidencePlatform, providerBaselineRegistry: providerBaselines, clock }, input),
    listAnnualReportPackages: ({ companyId } = {}) =>
      [...state.packages.values()]
        .filter((candidate) => candidate.companyId === text(companyId, "company_id_required"))
        .sort((left, right) => left.fiscalYear.localeCompare(right.fiscalYear) || left.createdAt.localeCompare(right.createdAt))
        .map((candidate) => materializePackage(state, candidate)),
    getAnnualReportPackage: ({ companyId, packageId } = {}) => materializePackage(state, requirePackage(state, text(companyId, "company_id_required"), packageId)),
    listAnnualEvidencePacks: ({ companyId, packageId = null } = {}) =>
      [...state.evidencePacks.values()]
        .filter((candidate) => candidate.companyId === text(companyId, "company_id_required"))
        .filter((candidate) => (normalizeText(packageId) ? candidate.packageId === packageId.trim() : true))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(clone),
    getAnnualEvidencePack: ({ companyId, evidencePackId } = {}) => {
      const record = state.evidencePacks.get(text(evidencePackId, "annual_evidence_pack_id_required"));
      if (!record || record.companyId !== text(companyId, "company_id_required")) {
        throw error(404, "annual_evidence_pack_not_found", "Annual evidence pack was not found.");
      }
      return clone(record);
    },
    inviteAnnualReportSignatory: (input) => inviteAnnualReportSignatory({ state, orgAuthPlatform, clock }, input),
    signAnnualReportVersion: (input) => signAnnualReportVersion({ state, orgAuthPlatform, clock }, input),
    openAnnualCorrectionPackage: (input) =>
      openAnnualCorrectionPackage({ state, ledgerPlatform, reportingPlatform, orgAuthPlatform, fiscalYearPlatform, legalFormPlatform, evidencePlatform, providerBaselineRegistry: providerBaselines, clock }, input),
    diffAnnualReportVersions: ({ companyId, packageId, leftVersionId, rightVersionId } = {}) => {
      requirePackage(state, text(companyId, "company_id_required"), packageId);
      return {
        packageId,
        leftVersionId,
        rightVersionId,
        changes: buildVersionDiff(requireVersion(state, packageId, leftVersionId), requireVersion(state, packageId, rightVersionId))
      };
    },
    createTaxDeclarationPackage: (input) =>
      createTaxDeclarationPackage(
        {
          state,
          ledgerPlatform,
          reportingPlatform,
          orgAuthPlatform,
          vatPlatform,
          payrollPlatform,
          husPlatform,
          pensionPlatform,
          integrationPlatform,
          providerBaselineRegistry: providerBaselines,
          clock
        },
        input
      ),
    listTaxDeclarationPackages: ({ companyId, packageId = null } = {}) =>
      [...state.taxPackages.values()]
        .filter((candidate) => candidate.companyId === text(companyId, "company_id_required"))
        .filter((candidate) => (normalizeText(packageId) ? candidate.annualReportPackageId === packageId.trim() : true))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(clone),
    getTaxDeclarationPackage: ({ companyId, taxDeclarationPackageId } = {}) => {
      const record = state.taxPackages.get(text(taxDeclarationPackageId, "tax_declaration_package_id_required"));
      if (!record || record.companyId !== text(companyId, "company_id_required")) {
        throw error(404, "tax_declaration_package_not_found", "Tax declaration package was not found.");
      }
      return clone(record);
    },
    getAnnualAuthorityOverview: ({ companyId, packageId, versionId = null } = {}) => {
      const annualPackage = requirePackage(state, text(companyId, "company_id_required"), packageId);
      const version = requireVersion(state, annualPackage.packageId, versionId || annualPackage.currentVersionId);
      const accountingPeriod = requireHardClosedPeriod(ledgerPlatform, annualPackage.companyId, annualPackage.accountingPeriodId);
      return buildAuthorityOverview({
        orgAuthPlatform,
        reportingPlatform,
        vatPlatform,
        payrollPlatform,
        husPlatform,
        pensionPlatform,
        annualPackage,
        version,
        accountingPeriod
      });
    },
    snapshotAnnualReporting: () =>
      clone({
        packages: [...state.packages.values()],
        versions: [...state.versions.values()],
        evidencePacks: [...state.evidencePacks.values()],
        signatories: [...state.signatories.values()],
        submissionEvents: [...state.submissionEvents.values()],
        taxDeclarationPackages: [...state.taxPackages.values()],
        providerBaselines: providerBaselines.snapshotProviderBaselineRegistry()
      })
  };
}

function createAnnualReportPackage(context, input = {}) {
  const { state, ledgerPlatform, orgAuthPlatform, fiscalYearPlatform, legalFormPlatform, providerBaselineRegistry, clock } = context;
  const companyId = text(input.companyId, "company_id_required");
  const accountingPeriod = requireHardClosedPeriod(ledgerPlatform, companyId, input.accountingPeriodId);
  const annualContext = resolveAnnualContext({
    fiscalYearPlatform,
    legalFormPlatform,
    companyId,
    accountingPeriod,
    legalFormProfileId: input.legalFormProfileId || null,
    reportingObligationProfileId: input.reportingObligationProfileId || null
  });
  const providerBaselineRefs = resolveAnnualVersionProviderBaselineRefs({
    providerBaselineRegistry,
    annualContext,
    accountingPeriod
  });
  const profileCode = requireProfileCode(input.profileCode, annualContext.legalFormCode);
  const actorId = text(input.actorId, "actor_id_required");
  ensureUserExists(orgAuthPlatform, actorId);
  const existing = [...state.packages.values()].find(
    (candidate) =>
      candidate.companyId === companyId &&
      candidate.accountingPeriodId === accountingPeriod.accountingPeriodId &&
      candidate.profileCode === profileCode &&
      candidate.packageFamilyCode === annualContext.packageFamilyCode &&
      normalizeText(candidate.correctionOfPackageId) === normalizeText(input.correctionOfPackageId) &&
      candidate.status !== "superseded"
  );
  if (existing) {
    return createAnnualReportVersion(context, { ...input, companyId, packageId: existing.packageId, actorId });
  }
  const now = nowIso(clock);
  const annualPackage = {
    packageId: crypto.randomUUID(),
    companyId,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    fiscalYearId: annualContext.fiscalYearId,
    fiscalYear: annualContext.fiscalYear,
    profileCode,
    legalFormProfileId: annualContext.legalFormProfileId,
    legalFormCode: annualContext.legalFormCode,
    reportingObligationProfileId: annualContext.reportingObligationProfileId,
    declarationProfileCode: annualContext.declarationProfileCode,
    signatoryClassCode: annualContext.signatoryClassCode,
    filingProfileCode: annualContext.filingProfileCode,
    packageFamilyCode: annualContext.packageFamilyCode,
    requiresAnnualReport: annualContext.requiresAnnualReport,
    requiresBolagsverketFiling: annualContext.requiresBolagsverketFiling,
    requiresTaxDeclarationPackage: annualContext.requiresTaxDeclarationPackage,
    correctionOfPackageId: normalizeText(input.correctionOfPackageId),
    rulepackRefs: buildAnnualRulepackRefs(annualContext),
    providerBaselineRefs,
    status: "draft",
    currentVersionId: null,
    currentEvidencePackId: null,
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  };
  state.packages.set(annualPackage.packageId, annualPackage);
  return createAnnualReportVersion(context, { ...input, companyId, packageId: annualPackage.packageId, actorId });
}

function createAnnualReportVersion(context, input = {}) {
  const { state, ledgerPlatform, reportingPlatform, orgAuthPlatform, fiscalYearPlatform, legalFormPlatform, evidencePlatform, providerBaselineRegistry, clock } = context;
  const companyId = text(input.companyId, "company_id_required");
  const annualPackage = requirePackage(state, companyId, input.packageId);
  const accountingPeriod = requireHardClosedPeriod(ledgerPlatform, companyId, annualPackage.accountingPeriodId);
  const actorId = text(input.actorId, "actor_id_required");
  ensureUserExists(orgAuthPlatform, actorId);
  const annualContext = resolveAnnualContext({
    fiscalYearPlatform,
    legalFormPlatform,
    companyId,
    accountingPeriod,
    legalFormProfileId: annualPackage.legalFormProfileId,
    reportingObligationProfileId: annualPackage.reportingObligationProfileId
  });
  const providerBaselineRefs = resolveAnnualVersionProviderBaselineRefs({
    providerBaselineRegistry,
    annualContext,
    accountingPeriod
  });
  const payload = materializeVersionPayload({
    reportingPlatform,
    companyId,
    accountingPeriod,
    profileCode: annualPackage.profileCode,
    annualContext,
    providerBaselineRefs,
    textSections: input.textSections || {},
    noteSections: input.noteSections || {},
    includeEstablishmentCertificate: input.includeEstablishmentCertificate !== false,
    actorId
  });
  const currentVersion = annualPackage.currentVersionId ? state.versions.get(annualPackage.currentVersionId) : null;
  if (currentVersion && currentVersion.sourceFingerprint === payload.sourceFingerprint) {
    return materializePackage(state, annualPackage);
  }
  const now = nowIso(clock);
  payload.evidencePack.packageId = annualPackage.packageId;
  payload.evidencePack.versionId = currentVersion?.versionId || null;
  payload.evidencePack.createdAt = now;
  const version = {
    versionId: crypto.randomUUID(),
    packageId: annualPackage.packageId,
    companyId,
    versionNo: nextVersionNo(state, annualPackage.packageId),
    profileCode: annualPackage.profileCode,
    legalFormCode: annualContext.legalFormCode,
    declarationProfileCode: annualContext.declarationProfileCode,
    packageFamilyCode: annualContext.packageFamilyCode,
    signatoryClassCode: annualContext.signatoryClassCode,
    packageStatus: "draft",
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    balanceSheetReportSnapshotId: payload.balanceSheet.reportSnapshotId,
    incomeStatementReportSnapshotId: payload.incomeStatement.reportSnapshotId,
    documents: payload.documents,
    textSections: payload.textSections,
    noteSections: payload.noteSections,
    taxPackageOutputs: payload.taxPackageOutputs,
    evidencePackId: null,
    rulepackRefs: clone(payload.evidencePack.rulepackRefs || []),
    providerBaselineRefs: clone(payload.evidencePack.providerBaselineRefs || []),
    sourceFingerprint: payload.sourceFingerprint,
    checksum: payload.checksum,
    diffFromPrevious: currentVersion ? buildVersionDiff(currentVersion, candidateVersion(payload)) : [],
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now,
    supersedesVersionId: currentVersion?.versionId || null,
    lockedAt: null,
    submittedAt: null
  };
  payload.evidencePack.versionId = version.versionId;
  if (currentVersion) {
    currentVersion.packageStatus = "superseded";
    currentVersion.updatedAt = now;
  }
  const registeredEvidencePack = registerAnnualEvidencePack({
    evidencePlatform,
    annualPackage,
    version,
    evidencePack: payload.evidencePack,
    actorId,
    correlationId: input.correlationId || `${annualPackage.packageId}:${version.versionNo}`
  });
  payload.evidencePack = registeredEvidencePack;
  version.evidencePackId = registeredEvidencePack.evidencePackId;
  version.diffFromPrevious = currentVersion ? buildVersionDiff(currentVersion, candidateVersion(payload)) : [];
  state.versions.set(version.versionId, version);
  state.evidencePacks.set(registeredEvidencePack.evidencePackId, registeredEvidencePack);
  annualPackage.currentVersionId = version.versionId;
  annualPackage.currentEvidencePackId = registeredEvidencePack.evidencePackId;
  annualPackage.rulepackRefs = clone(version.rulepackRefs || []);
  annualPackage.providerBaselineRefs = clone(version.providerBaselineRefs || []);
  annualPackage.status = "draft";
  annualPackage.updatedAt = now;
  for (const signatory of state.signatories.values()) {
    if (signatory.packageId === annualPackage.packageId && signatory.versionId === currentVersion?.versionId && signatory.status !== "signed") {
      signatory.status = "superseded";
      signatory.updatedAt = now;
    }
  }
  appendSubmissionEvent(
    state,
    annualPackage.packageId,
    version.versionId,
    "package_prepared",
    version.checksum,
    {
      profileCode: version.profileCode,
      legalFormCode: version.legalFormCode,
      declarationProfileCode: version.declarationProfileCode,
      packageFamilyCode: version.packageFamilyCode,
      rulepackRefs: version.rulepackRefs,
      providerBaselineRefs: version.providerBaselineRefs,
      evidencePackId: payload.evidencePack.evidencePackId
    },
    clock
  );
  return materializePackage(state, annualPackage);
}

function inviteAnnualReportSignatory({ state, orgAuthPlatform, clock }, input = {}) {
  const companyId = text(input.companyId, "company_id_required");
  const annualPackage = requirePackage(state, companyId, input.packageId);
  const version = requireVersion(state, annualPackage.packageId, input.versionId);
  if (version.packageStatus === "superseded") {
    throw error(409, "annual_report_version_superseded", "Superseded annual-report versions cannot receive new signatories.");
  }
  const companyUser = requireCompanyUser(orgAuthPlatform, companyId, input.companyUserId);
  const existing = [...state.signatories.values()].find(
    (candidate) =>
      candidate.packageId === annualPackage.packageId &&
      candidate.versionId === version.versionId &&
      candidate.companyUserId === companyUser.companyUserId &&
      candidate.signatoryRole === text(input.signatoryRole, "annual_report_signatory_role_required") &&
      candidate.status !== "superseded"
  );
  if (existing) {
    return clone(existing);
  }
  const now = nowIso(clock);
  const signatory = {
    signatoryId: crypto.randomUUID(),
    packageId: annualPackage.packageId,
    versionId: version.versionId,
    companyId,
    companyUserId: companyUser.companyUserId,
    userId: companyUser.userId,
    signatoryRole: text(input.signatoryRole, "annual_report_signatory_role_required"),
    status: "invited",
    invitedAt: now,
    signedAt: null,
    comment: null,
    updatedAt: now
  };
  state.signatories.set(signatory.signatoryId, signatory);
  if (version.packageStatus === "draft") {
    version.packageStatus = "ready_for_signature";
    version.updatedAt = now;
    annualPackage.status = "ready_for_signature";
    annualPackage.updatedAt = now;
  }
  appendSubmissionEvent(state, annualPackage.packageId, version.versionId, "signatory_invited", version.checksum, { signatoryId: signatory.signatoryId, userId: signatory.userId, signatoryRole: signatory.signatoryRole }, clock);
  return clone(signatory);
}

function signAnnualReportVersion({ state, orgAuthPlatform, clock }, input = {}) {
  const companyId = text(input.companyId, "company_id_required");
  const annualPackage = requirePackage(state, companyId, input.packageId);
  const version = requireVersion(state, annualPackage.packageId, input.versionId);
  const user = ensureUserExists(orgAuthPlatform, text(input.actorId, "actor_id_required"));
  const signatories = [...state.signatories.values()].filter(
    (candidate) => candidate.packageId === annualPackage.packageId && candidate.versionId === version.versionId && candidate.status !== "superseded"
  );
  const signatory = signatories.find((candidate) => candidate.userId === user.userId);
  if (!signatory) {
    throw error(403, "annual_report_signatory_not_found", "The actor is not invited to sign this annual-report version.");
  }
  if (signatory.status === "signed") {
    return materializePackage(state, annualPackage);
  }
  if (!["ready_for_signature", "signed"].includes(version.packageStatus)) {
    throw error(409, "annual_report_version_not_ready_for_sign", "The annual-report version is not ready for signing.");
  }
  const now = nowIso(clock);
  signatory.status = "signed";
  signatory.comment = normalizeText(input.comment);
  signatory.signedAt = now;
  signatory.updatedAt = now;
  const allSigned = signatories.every((candidate) => candidate.signatoryId === signatory.signatoryId || candidate.status === "signed");
  if (allSigned) {
    version.packageStatus = "signed";
    version.updatedAt = now;
    annualPackage.status = "signed";
    annualPackage.updatedAt = now;
  }
  appendSubmissionEvent(state, annualPackage.packageId, version.versionId, "signatory_signed", version.checksum, { signatoryId: signatory.signatoryId, userId: signatory.userId, comment: signatory.comment }, clock);
  return materializePackage(state, annualPackage);
}

function openAnnualCorrectionPackage(context, input = {}) {
  const { state, clock } = context;
  const companyId = text(input.companyId, "company_id_required");
  const previousPackage = requirePackage(state, companyId, input.packageId);
  if (!previousPackage.currentVersionId) {
    throw error(409, "annual_report_correction_without_version", "Annual-report corrections require an existing package version.");
  }
  return createAnnualReportPackage(context, {
    ...input,
    companyId,
    accountingPeriodId: previousPackage.accountingPeriodId,
    profileCode: input.profileCode || previousPackage.profileCode,
    legalFormProfileId: previousPackage.legalFormProfileId,
    reportingObligationProfileId: previousPackage.reportingObligationProfileId,
    correctionOfPackageId: previousPackage.packageId,
    includeEstablishmentCertificate: input.includeEstablishmentCertificate !== false
  });
}

function createTaxDeclarationPackage(context, input = {}) {
  const {
    state,
    ledgerPlatform,
    reportingPlatform,
    orgAuthPlatform,
    vatPlatform,
    payrollPlatform,
    husPlatform,
    pensionPlatform,
    integrationPlatform,
    providerBaselineRegistry,
    clock
  } = context;
  const companyId = text(input.companyId, "company_id_required");
  const annualPackage = requirePackage(state, companyId, input.packageId);
  const version = requireVersion(state, annualPackage.packageId, input.versionId || annualPackage.currentVersionId);
  const actorId = text(input.actorId, "actor_id_required");
  ensureUserExists(orgAuthPlatform, actorId);
  const accountingPeriod = requireHardClosedPeriod(ledgerPlatform, companyId, annualPackage.accountingPeriodId);
  const model = buildTaxDeclarationPackageModel({
    orgAuthPlatform,
    reportingPlatform,
    vatPlatform,
    payrollPlatform,
    husPlatform,
    pensionPlatform,
    annualPackage,
    version,
    accountingPeriod,
    providerBaselineRegistry
  });
  const existing = [...state.taxPackages.values()].find(
    (candidate) =>
      candidate.companyId === companyId &&
      candidate.annualReportVersionId === version.versionId &&
      candidate.sourceFingerprint === model.sourceFingerprint &&
      candidate.status !== "superseded"
  );
  if (existing) {
    return clone(existing);
  }
  const now = nowIso(clock);
  const record = {
    taxDeclarationPackageId: crypto.randomUUID(),
    annualReportPackageId: annualPackage.packageId,
    annualReportVersionId: version.versionId,
    companyId,
    fiscalYear: annualPackage.fiscalYear,
    packageCode: `annual_tax_bundle_${annualPackage.declarationProfileCode.toLowerCase()}`,
    declarationProfileCode: annualPackage.declarationProfileCode,
    packageFamilyCode: annualPackage.packageFamilyCode,
    status: "ready",
    sourceFingerprint: model.sourceFingerprint,
    outputChecksum: model.outputChecksum,
    authorityOverview: model.authorityOverview,
    evidencePackId: annualPackage.currentEvidencePackId,
    rulepackRefs: clone(model.rulepackRefs || version.rulepackRefs || annualPackage.rulepackRefs || []),
    providerBaselineRefs: model.providerBaselineRefs,
    submissionFamilies: buildSubmissionFamilies(annualPackage, integrationPlatform),
    exports: model.exports,
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  };
  state.taxPackages.set(record.taxDeclarationPackageId, record);
  appendSubmissionEvent(
    state,
    annualPackage.packageId,
    version.versionId,
    "tax_package_prepared",
    record.outputChecksum,
    {
      taxDeclarationPackageId: record.taxDeclarationPackageId,
      exportCodes: record.exports.map((entry) => entry.exportCode),
      rulepackRefs: record.rulepackRefs,
      providerBaselineRefs: record.providerBaselineRefs
    },
    clock
  );
  return clone(record);
}

function buildTaxDeclarationPackageModel({
  orgAuthPlatform,
  reportingPlatform,
  vatPlatform,
  payrollPlatform,
  husPlatform,
  pensionPlatform,
  annualPackage,
  version,
  accountingPeriod,
  providerBaselineRegistry
}) {
  const company = requireCompany(orgAuthPlatform, annualPackage.companyId);
  const balanceSheet = reportingPlatform.getReportSnapshot({ companyId: annualPackage.companyId, reportSnapshotId: version.balanceSheetReportSnapshotId });
  const incomeStatement = reportingPlatform.getReportSnapshot({ companyId: annualPackage.companyId, reportSnapshotId: version.incomeStatementReportSnapshotId });
  const authorityOverview = buildAuthorityOverview({
    reportingPlatform,
    vatPlatform,
    payrollPlatform,
    husPlatform,
    pensionPlatform,
    annualPackage,
    version,
    accountingPeriod,
    company,
    balanceSheet,
    incomeStatement
  });
  const summarizedBalanceSheet = summarizeReportSnapshot(balanceSheet);
  const summarizedIncomeStatement = summarizeReportSnapshot(incomeStatement);
  const effectiveDate = accountingPeriod.endsOn || accountingPeriod.toDate || accountingPeriod.endDate || `${annualPackage.fiscalYear}-12-31`;
  const declarationBaselineRef = resolveAnnualProviderBaselineRef(providerBaselineRegistry, {
    providerCode: "skatteverket-json-support",
    baselineCode: "SE-ANNUAL-DECLARATION-JSON",
    effectiveDate,
    metadata: {
      declarationProfileCode: annualPackage.declarationProfileCode
    }
  });
  const sruBaselineRef = resolveAnnualProviderBaselineRef(providerBaselineRegistry, {
    providerCode: "skatteverket-sru",
    baselineCode: "SE-SRU-FILE",
    effectiveDate,
    metadata: {
      declarationProfileCode: annualPackage.declarationProfileCode
    }
  });
  const authorityAuditBaselineRef = resolveAnnualProviderBaselineRef(providerBaselineRegistry, {
    providerCode: "skatteverket-audit-json",
    baselineCode: "SE-AUTHORITY-AUDIT-JSON",
    effectiveDate,
    metadata: {
      declarationProfileCode: annualPackage.declarationProfileCode
    }
  });
  const declarationPayload = buildDeclarationSupportPayload({
    annualPackage,
    version,
    company,
    balanceSheet: summarizedBalanceSheet,
    incomeStatement: summarizedIncomeStatement,
    authorityOverview
  });
  const sruRows = buildSruRows(balanceSheet, incomeStatement, authorityOverview.specialPayrollTax);
  const sruPayloadText = ["record_type;field_code;amount", ...sruRows.map((row) => `${row.recordType};${row.fieldCode};${formatMoney(row.amount)}`)].join("\n");
  const vatOverviewPayload = { exportCode: "vat_audit_overview_json", schemaVersion: "phase12.2", companyId: annualPackage.companyId, fiscalYear: annualPackage.fiscalYear, overview: authorityOverview.vat };
  const agiOverviewPayload = { exportCode: "agi_audit_overview_json", schemaVersion: "phase12.2", companyId: annualPackage.companyId, fiscalYear: annualPackage.fiscalYear, overview: authorityOverview.agi };
  const husOverviewPayload = { exportCode: "hus_summary_json", schemaVersion: "phase12.2", companyId: annualPackage.companyId, fiscalYear: annualPackage.fiscalYear, overview: authorityOverview.hus };
  const pensionOverviewPayload = { exportCode: "special_payroll_tax_json", schemaVersion: "phase12.2", companyId: annualPackage.companyId, fiscalYear: annualPackage.fiscalYear, overview: authorityOverview.specialPayrollTax };
  const exports = [
    createJsonExportArtifact(declarationPayload.exportCode, `${declarationPayload.filePrefix}_${annualPackage.fiscalYear}.json`, declarationPayload.payload, [
      buildHashCheck("balance_sheet_snapshot_hash", balanceSheet.contentHash, declarationPayload.payload.balanceSheet.contentHash),
      buildHashCheck("income_statement_snapshot_hash", incomeStatement.contentHash, declarationPayload.payload.incomeStatement.contentHash)
    ], declarationBaselineRef),
    createTextExportArtifact("sru_rows_csv", `SRU_${annualPackage.fiscalYear}.csv`, sruPayloadText, [
      buildAmountCheck(
        "sru_total_balance_amount",
        roundMoney(Number(balanceSheet.totals.balanceAmount || 0) + Number(incomeStatement.totals.balanceAmount || 0) + Number(authorityOverview.specialPayrollTax.specialPayrollTaxAmount || 0)),
        roundMoney(sruRows.reduce((sum, row) => sum + Number(row.amount || 0), 0))
      )
    ], sruBaselineRef),
    createJsonExportArtifact("vat_audit_overview_json", `VAT_${annualPackage.fiscalYear}.json`, vatOverviewPayload, [
      buildAmountCheck("vat_declared_tax_amount", authorityOverview.vat.totalDeclaredTaxAmount, vatOverviewPayload.overview.totalDeclaredTaxAmount)
    ], authorityAuditBaselineRef),
    createJsonExportArtifact("agi_audit_overview_json", `AGI_${annualPackage.fiscalYear}.json`, agiOverviewPayload, [
      buildAmountCheck("agi_cash_compensation_amount", authorityOverview.agi.totalCashCompensationAmount, agiOverviewPayload.overview.totalCashCompensationAmount),
      buildAmountCheck("agi_preliminary_tax_amount", authorityOverview.agi.totalPreliminaryTaxAmount, agiOverviewPayload.overview.totalPreliminaryTaxAmount)
    ], authorityAuditBaselineRef),
    createJsonExportArtifact("hus_summary_json", `HUS_${annualPackage.fiscalYear}.json`, husOverviewPayload, [
      buildAmountCheck("hus_requested_amount", authorityOverview.hus.totalRequestedAmount, husOverviewPayload.overview.totalRequestedAmount),
      buildAmountCheck("hus_approved_amount", authorityOverview.hus.totalApprovedAmount, husOverviewPayload.overview.totalApprovedAmount)
    ], authorityAuditBaselineRef),
    createJsonExportArtifact("special_payroll_tax_json", `SLP_${annualPackage.fiscalYear}.json`, pensionOverviewPayload, [
      buildAmountCheck("special_payroll_tax_amount", authorityOverview.specialPayrollTax.specialPayrollTaxAmount, pensionOverviewPayload.overview.specialPayrollTaxAmount)
    ], authorityAuditBaselineRef)
  ];
  const providerBaselineRefs = dedupeProviderBaselineRefs(exports.map((entry) => entry.providerBaselineRef).filter(Boolean));
  const rulepackRefs = dedupeAnnualRulepackRefs(version.rulepackRefs || annualPackage.rulepackRefs || []);
  return {
    authorityOverview,
    exports,
    rulepackRefs,
    providerBaselineRefs,
    sourceFingerprint: hashPayload({
      annualReportVersionId: version.versionId,
      balanceSheetReportSnapshotId: balanceSheet.reportSnapshotId,
      balanceSheetHash: balanceSheet.contentHash,
      incomeStatementReportSnapshotId: incomeStatement.reportSnapshotId,
      incomeStatementHash: incomeStatement.contentHash,
      declarationProfileCode: annualPackage.declarationProfileCode,
      packageFamilyCode: annualPackage.packageFamilyCode,
      rulepackRefs,
      providerBaselineRefs,
      authorityOverview
    }),
    outputChecksum: hashPayload({
      exports: exports.map((entry) => ({
        exportCode: entry.exportCode,
        payloadHash: entry.payloadHash,
        providerBaselineId: entry.providerBaselineId || null,
        checks: entry.checks.map((check) => ({ checkCode: check.checkCode, passed: check.passed }))
      })),
      rulepackRefs,
      providerBaselineRefs,
      authorityOverview
    })
  };
}

function buildDeclarationSupportPayload({ annualPackage, version, company, balanceSheet, incomeStatement, authorityOverview }) {
  const basePayload = {
    schemaVersion: "phase14.35",
    companyId: annualPackage.companyId,
    orgNumber: company.orgNumber,
    fiscalYear: annualPackage.fiscalYear,
    annualReportVersionId: version.versionId,
    legalFormCode: annualPackage.legalFormCode,
    declarationProfileCode: annualPackage.declarationProfileCode,
    packageFamilyCode: annualPackage.packageFamilyCode,
    profileCode: annualPackage.profileCode,
    balanceSheet,
    incomeStatement,
    specialPayrollTaxSupport: authorityOverview.specialPayrollTax
  };
  switch (annualPackage.declarationProfileCode) {
    case "INK2":
      return {
        exportCode: "ink2_support_json",
        filePrefix: "INK2",
        payload: {
          ...basePayload,
          filingFamily: "ink2"
        }
      };
    case "INK4":
      return {
        exportCode: "ink4_support_json",
        filePrefix: "INK4",
        payload: {
          ...basePayload,
          filingFamily: "ink4"
        }
      };
    case "NE":
      return {
        exportCode: "ne_support_json",
        filePrefix: "NE",
        payload: {
          ...basePayload,
          filingFamily: "ne",
          supplementPackageCodes: ["NEA"]
        }
      };
    default:
      throw error(409, "annual_declaration_profile_unsupported", "Unsupported declaration profile for annual tax exports.");
  }
}

function buildEvidencePack({ companyId, accountingPeriod, annualContext, providerBaselineRefs = [], balanceSheet, incomeStatement, documents, sourceFingerprint, checksum }) {
  return {
    evidencePackId: crypto.randomUUID(),
    companyId,
    packageId: null,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    fiscalYearId: annualContext.fiscalYearId,
    fiscalYear: annualContext.fiscalYear,
    legalFormProfileId: annualContext.legalFormProfileId,
    reportingObligationProfileId: annualContext.reportingObligationProfileId,
    declarationProfileCode: annualContext.declarationProfileCode,
    packageFamilyCode: annualContext.packageFamilyCode,
    componentCodes: ["balance_sheet", "income_statement", "text_sections", "note_sections", "establishment_certificate"].filter((candidate) =>
      documents.some((document) => document.documentCode === candidate || candidate === "text_sections" || candidate === "note_sections")
    ),
    reportSnapshotRefs: [balanceSheet.reportSnapshotId, incomeStatement.reportSnapshotId],
    closeSnapshotRefs: [accountingPeriod.accountingPeriodId],
    rulepackRefs: buildAnnualRulepackRefs(annualContext),
    providerBaselineRefs: dedupeProviderBaselineRefs(providerBaselineRefs),
    documentChecksums: documents.map((document) => ({ documentCode: document.documentCode, checksum: document.checksum })),
    sourceFingerprint,
    checksum,
    createdAt: new Date().toISOString()
  };
}

function registerAnnualEvidencePack({
  evidencePlatform,
  annualPackage,
  version,
  evidencePack,
  actorId,
  correlationId
}) {
  if (!evidencePlatform?.createFrozenEvidenceBundleSnapshot) {
    return clone(evidencePack);
  }
  const bundle = evidencePlatform.createFrozenEvidenceBundleSnapshot({
    companyId: annualPackage.companyId,
    bundleType: "annual_reporting_package",
    sourceObjectType: "annual_report_package",
    sourceObjectId: annualPackage.packageId,
    sourceObjectVersion: version.versionId,
    title: `Annual evidence ${annualPackage.packageId} v${version.versionNo}`,
    retentionClass: "regulated",
    classificationCode: "restricted_internal",
    metadata: {
      compatibilityPayload: {
        ...clone(evidencePack),
        versionId: version.versionId,
        versionNo: version.versionNo
      }
    },
    artifactRefs: [
      ...evidencePack.documentChecksums.map((document) => ({
        artifactType: "annual_document_checksum",
        artifactRef: document.documentCode,
        checksum: document.checksum,
        roleCode: document.documentCode
      })),
      ...evidencePack.reportSnapshotRefs.map((reportSnapshotRef) => ({
        artifactType: "report_snapshot",
        artifactRef: reportSnapshotRef,
        checksum: hashPayload({
          reportSnapshotRef,
          sourceFingerprint: evidencePack.sourceFingerprint
        })
      }))
    ],
    sourceRefs: [
      ...evidencePack.closeSnapshotRefs.map((closeSnapshotRef) => ({
        closeSnapshotRef
      })),
      ...clone(evidencePack.rulepackRefs),
      ...clone(evidencePack.providerBaselineRefs)
    ],
    actorId,
    correlationId
  });
  return {
    ...clone(evidencePack),
    evidencePackId: bundle.evidenceBundleId,
    evidenceBundleId: bundle.evidenceBundleId,
    checksum: bundle.checksum,
    bundleStatus: bundle.status,
    frozenAt: bundle.frozenAt,
    archivedAt: bundle.archivedAt,
    createdAt: bundle.frozenAt || bundle.createdAt
  };
}

function buildSubmissionFamilies(annualPackage, integrationPlatform) {
  const baseFamilies = [
    {
      submissionFamilyCode: annualPackage.packageFamilyCode.includes("annual_report") ? "annual_report_submission" : "income_tax_return",
      signedState: annualPackage.requiresBolagsverketFiling === true ? "pending" : "not_required"
    }
  ];
  if (!integrationPlatform?.submissionStatuses) {
    return baseFamilies;
  }
  return baseFamilies;
}

function buildAuthorityOverview({ reportingPlatform, vatPlatform, payrollPlatform, husPlatform, pensionPlatform, annualPackage, version, accountingPeriod, company = null, balanceSheet = null, incomeStatement = null }) {
  const fiscalYear = annualPackage.fiscalYear;
  const resolvedBalanceSheet = balanceSheet || reportingPlatform.getReportSnapshot({ companyId: annualPackage.companyId, reportSnapshotId: version.balanceSheetReportSnapshotId });
  const resolvedIncomeStatement = incomeStatement || reportingPlatform.getReportSnapshot({ companyId: annualPackage.companyId, reportSnapshotId: version.incomeStatementReportSnapshotId });
  const vatRuns = (vatPlatform?.snapshotVat?.().vatDeclarationRuns || [])
    .filter((run) => run.companyId === annualPackage.companyId)
    .filter((run) => fiscalYearRangeIncludes(fiscalYear, run.fromDate, run.toDate));
  const agiSubmissions = (payrollPlatform?.listAgiSubmissions?.({ companyId: annualPackage.companyId }) || []).filter((submission) => submission.reportingPeriod?.startsWith(fiscalYear));
  const husCases = (husPlatform?.listHusCases?.({ companyId: annualPackage.companyId }) || []).filter((record) => caseTouchesFiscalYear(record, fiscalYear));
  const pensionSnapshots = (pensionPlatform?.listPensionBasisSnapshots?.({ companyId: annualPackage.companyId }) || []).filter((snapshot) => snapshot.reportingPeriod?.startsWith(fiscalYear));
  return {
    companyId: annualPackage.companyId,
    fiscalYear,
    legalFormCode: annualPackage.legalFormCode,
    declarationProfileCode: annualPackage.declarationProfileCode,
    packageFamilyCode: annualPackage.packageFamilyCode,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    balanceSheetSnapshotId: resolvedBalanceSheet.reportSnapshotId,
    incomeStatementSnapshotId: resolvedIncomeStatement.reportSnapshotId,
    vat: summarizeVatRuns(vatRuns),
    agi: summarizeAgiSubmissions(agiSubmissions),
    hus: summarizeHusCases(husCases),
    specialPayrollTax: summarizePensionSnapshots(pensionSnapshots)
  };
}

function materializeVersionPayload({ reportingPlatform, companyId, accountingPeriod, profileCode, annualContext, providerBaselineRefs = [], textSections, noteSections, includeEstablishmentCertificate, actorId }) {
  if (!reportingPlatform?.runReportSnapshot || !reportingPlatform?.getReportSnapshot) {
    throw error(500, "annual_reporting_reporting_platform_missing", "Reporting platform is required for annual reporting.");
  }
  const balanceSheet = reportingPlatform.runReportSnapshot({
    companyId,
    reportCode: "balance_sheet",
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    actorId
  });
  const incomeStatement = reportingPlatform.runReportSnapshot({
    companyId,
    reportCode: "income_statement",
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    actorId
  });
  const normalizedTextSections = normalizeSections(textSections);
  const normalizedNoteSections = normalizeSections(noteSections);
  const documents = [
    {
      documentCode: "balance_sheet",
      sourceType: "report_snapshot",
      sourceRef: balanceSheet.reportSnapshotId,
      checksum: balanceSheet.contentHash
    },
    {
      documentCode: "income_statement",
      sourceType: "report_snapshot",
      sourceRef: incomeStatement.reportSnapshotId,
      checksum: incomeStatement.contentHash
    },
    ...Object.entries(normalizedTextSections).map(([sectionCode, sectionText]) => ({
      documentCode: sectionCode,
      sourceType: "text_bundle",
      sourceRef: `text:${sectionCode}`,
      checksum: hashPayload({ sectionCode, sectionText })
    })),
    ...Object.entries(normalizedNoteSections).map(([sectionCode, sectionText]) => ({
      documentCode: sectionCode,
      sourceType: "text_bundle",
      sourceRef: `note:${sectionCode}`,
      checksum: hashPayload({ sectionCode, sectionText })
    }))
  ];
  if (includeEstablishmentCertificate) {
    documents.push({
      documentCode: "establishment_certificate",
      sourceType: "generated_text",
      sourceRef: `certificate:${annualContext.packageFamilyCode}:${accountingPeriod.accountingPeriodId}`,
      checksum: hashPayload({ profileCode, packageFamilyCode: annualContext.packageFamilyCode, accountingPeriodId: accountingPeriod.accountingPeriodId, kind: "establishment_certificate" })
    });
  }
  const taxPackageOutputs = [
    { taxPackageCode: `${annualContext.declarationProfileCode.toLowerCase()}_support`, outputChecksum: hashPayload({ companyId, accountingPeriodId: accountingPeriod.accountingPeriodId, declarationProfileCode: annualContext.declarationProfileCode, output: "income_tax_support" }) },
    { taxPackageCode: "special_payroll_tax_support", outputChecksum: hashPayload({ companyId, accountingPeriodId: accountingPeriod.accountingPeriodId, profileCode, output: "special_payroll_tax_support" }) },
    { taxPackageCode: "vat_audit_overview", outputChecksum: hashPayload({ companyId, accountingPeriodId: accountingPeriod.accountingPeriodId, profileCode, output: "vat_audit_overview" }) },
    { taxPackageCode: "agi_audit_overview", outputChecksum: hashPayload({ companyId, accountingPeriodId: accountingPeriod.accountingPeriodId, profileCode, output: "agi_audit_overview" }) },
    { taxPackageCode: "hus_summary", outputChecksum: hashPayload({ companyId, accountingPeriodId: accountingPeriod.accountingPeriodId, profileCode, output: "hus_summary" }) }
  ];
  const sourceFingerprint = hashPayload({
    companyId,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    profileCode,
    legalFormCode: annualContext.legalFormCode,
    declarationProfileCode: annualContext.declarationProfileCode,
    packageFamilyCode: annualContext.packageFamilyCode,
    balanceSheetReportSnapshotId: balanceSheet.reportSnapshotId,
    balanceSheetHash: balanceSheet.contentHash,
    incomeStatementReportSnapshotId: incomeStatement.reportSnapshotId,
    incomeStatementHash: incomeStatement.contentHash,
    providerBaselineRefs,
    textSections: normalizedTextSections,
    noteSections: normalizedNoteSections,
    includeEstablishmentCertificate
  });
  const evidencePack = buildEvidencePack({
    companyId,
    accountingPeriod,
    annualContext,
    providerBaselineRefs,
    balanceSheet,
    incomeStatement,
    documents,
    sourceFingerprint,
    providerBaselineRefs,
    checksum: hashPayload({
      annualContext,
      sourceFingerprint,
      documents,
      providerBaselineRefs
    })
  });
  const checksum = hashPayload({
    profileCode,
    legalFormCode: annualContext.legalFormCode,
    packageFamilyCode: annualContext.packageFamilyCode,
    documents,
    taxPackageOutputs,
    sourceFingerprint,
    providerBaselineRefs,
    evidencePackChecksum: evidencePack.checksum
  });
  return {
    balanceSheet,
    incomeStatement,
    documents,
    textSections: normalizedTextSections,
    noteSections: normalizedNoteSections,
    taxPackageOutputs,
    evidencePack,
    sourceFingerprint,
    checksum
  };
}

function materializePackage(state, annualPackage) {
  const versions = [...state.versions.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.versionNo - right.versionNo)
    .map(clone);
  const currentVersion = annualPackage.currentVersionId ? versions.find((candidate) => candidate.versionId === annualPackage.currentVersionId) || null : null;
  const signatories = [...state.signatories.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.invitedAt.localeCompare(right.invitedAt))
    .map(clone);
  const submissionEvents = [...state.submissionEvents.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .map(clone);
  const taxDeclarationPackages = [...state.taxPackages.values()]
    .filter((candidate) => candidate.annualReportPackageId === annualPackage.packageId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(clone);
  const evidencePacks = [...state.evidencePacks.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(clone);
  const currentEvidencePack = annualPackage.currentEvidencePackId
    ? evidencePacks.find((candidate) => candidate.evidencePackId === annualPackage.currentEvidencePackId) || null
    : null;
  return clone({
    ...annualPackage,
    currentVersion,
    currentEvidencePack,
    versions,
    evidencePacks,
    signatories,
    submissionEvents,
    taxDeclarationPackages
  });
}

function candidateVersion(payload) {
  return {
    balanceSheetReportSnapshotId: payload.balanceSheet.reportSnapshotId,
    incomeStatementReportSnapshotId: payload.incomeStatement.reportSnapshotId,
    documents: payload.documents,
    textSections: payload.textSections,
    noteSections: payload.noteSections,
    taxPackageOutputs: payload.taxPackageOutputs,
    evidencePackId: payload.evidencePack.evidencePackId,
    rulepackRefs: payload.evidencePack.rulepackRefs,
    providerBaselineRefs: payload.evidencePack.providerBaselineRefs,
    sourceFingerprint: payload.sourceFingerprint,
    checksum: payload.checksum
  };
}

function buildVersionDiff(leftVersion, rightVersion) {
  const fields = [
    ["balance_sheet_snapshot", leftVersion.balanceSheetReportSnapshotId, rightVersion.balanceSheetReportSnapshotId],
    ["income_statement_snapshot", leftVersion.incomeStatementReportSnapshotId, rightVersion.incomeStatementReportSnapshotId],
    ["documents", leftVersion.documents, rightVersion.documents],
    ["text_sections", leftVersion.textSections, rightVersion.textSections],
    ["note_sections", leftVersion.noteSections, rightVersion.noteSections],
    ["tax_package_outputs", leftVersion.taxPackageOutputs, rightVersion.taxPackageOutputs],
    ["evidence_pack_id", leftVersion.evidencePackId, rightVersion.evidencePackId],
    ["rulepack_refs", leftVersion.rulepackRefs, rightVersion.rulepackRefs],
    ["provider_baseline_refs", leftVersion.providerBaselineRefs, rightVersion.providerBaselineRefs],
    ["source_fingerprint", leftVersion.sourceFingerprint, rightVersion.sourceFingerprint],
    ["checksum", leftVersion.checksum, rightVersion.checksum]
  ];
  return fields
    .filter(([, leftValue, rightValue]) => hashPayload(leftValue) !== hashPayload(rightValue))
    .map(([fieldCode, leftValue, rightValue]) => ({
      fieldCode,
      changeType: "changed",
      leftValue: clone(leftValue),
      rightValue: clone(rightValue)
    }));
}

function appendSubmissionEvent(state, packageId, versionId, eventType, payloadChecksum, payload, clock, providerReference = null) {
  const record = {
    submissionEventId: crypto.randomUUID(),
    packageId,
    versionId,
    eventType: text(eventType, "annual_report_submission_event_type_required"),
    payloadChecksum: text(payloadChecksum, "annual_report_submission_payload_checksum_required"),
    providerReference: normalizeText(providerReference),
    payloadJson: clone(payload || {}),
    recordedAt: nowIso(clock)
  };
  state.submissionEvents.set(record.submissionEventId, record);
  return record;
}

function summarizeReportSnapshot(snapshot) {
  return {
    reportSnapshotId: snapshot.reportSnapshotId,
    reportCode: snapshot.reportCode,
    reportVersionNo: snapshot.reportVersionNo,
    contentHash: snapshot.contentHash,
    accountingPeriodId: snapshot.accountingPeriodId,
    fromDate: snapshot.fromDate,
    toDate: snapshot.toDate,
    lineCount: Number(snapshot.lineCount || (snapshot.lines || []).length || 0),
    totals: clone(snapshot.totals || {}),
    lines: (snapshot.lines || []).map((line) => ({
      lineKey: line.lineKey,
      displayName: line.displayName || line.accountName || line.lineKey,
      accountNumber: line.accountNumber || null,
      totalDebit: roundMoney(line.totalDebit || 0),
      totalCredit: roundMoney(line.totalCredit || 0),
      balanceAmount: roundMoney(line.balanceAmount || 0),
      metricValues: clone(line.metricValues || {})
    }))
  };
}

function buildSruRows(balanceSheet, incomeStatement, specialPayrollTax) {
  return [
    ...(balanceSheet.lines || []).map((line) => ({
      recordType: "BS",
      fieldCode: normalizeSruFieldCode(line.accountNumber || line.lineKey),
      amount: roundMoney(line.balanceAmount || 0)
    })),
    ...(incomeStatement.lines || []).map((line) => ({
      recordType: "IS",
      fieldCode: normalizeSruFieldCode(line.accountNumber || line.lineKey),
      amount: roundMoney(line.balanceAmount || 0)
    })),
    {
      recordType: "SLP",
      fieldCode: "special_payroll_tax",
      amount: roundMoney(specialPayrollTax.specialPayrollTaxAmount || 0)
    }
  ];
}

function createJsonExportArtifact(exportCode, fileName, payload, checks = [], providerBaselineRef = null) {
  const finalizedChecks = checks.map(finalizeCheck);
  return {
    exportCode,
    fileName,
    format: "json",
    payloadHash: hashPayload(payload),
    contentHash: hashPayload({ fileName, payload }),
    payload,
    content: JSON.stringify(payload, null, 2),
    providerBaselineId: providerBaselineRef?.providerBaselineId || null,
    providerBaselineCode: providerBaselineRef?.baselineCode || null,
    providerBaselineVersion: providerBaselineRef?.providerBaselineVersion || null,
    providerBaselineChecksum: providerBaselineRef?.providerBaselineChecksum || null,
    providerBaselineRef: providerBaselineRef ? clone(providerBaselineRef) : null,
    checks: finalizedChecks,
    allChecksPassed: finalizedChecks.every((check) => check.passed)
  };
}

function createTextExportArtifact(exportCode, fileName, payloadText, checks = [], providerBaselineRef = null) {
  const finalizedChecks = checks.map(finalizeCheck);
  return {
    exportCode,
    fileName,
    format: "text",
    payloadHash: hashPayload(payloadText),
    contentHash: hashPayload({ fileName, payloadText }),
    payloadText,
    content: payloadText,
    providerBaselineId: providerBaselineRef?.providerBaselineId || null,
    providerBaselineCode: providerBaselineRef?.baselineCode || null,
    providerBaselineVersion: providerBaselineRef?.providerBaselineVersion || null,
    providerBaselineChecksum: providerBaselineRef?.providerBaselineChecksum || null,
    providerBaselineRef: providerBaselineRef ? clone(providerBaselineRef) : null,
    checks: finalizedChecks,
    allChecksPassed: finalizedChecks.every((check) => check.passed)
  };
}

function resolveAnnualProviderBaselineRef(providerBaselineRegistry, { providerCode, baselineCode, effectiveDate, metadata = {} }) {
  const providerBaseline = providerBaselineRegistry.resolveProviderBaseline({
    domain: "annual_reporting",
    jurisdiction: "SE",
    providerCode,
    baselineCode,
    effectiveDate
  });
  return providerBaselineRegistry.buildProviderBaselineRef({
    effectiveDate,
    providerBaseline,
    metadata
  });
}

function dedupeProviderBaselineRefs(values = []) {
  const refs = [];
  for (const candidate of values) {
    if (!candidate?.providerBaselineId) {
      continue;
    }
    if (!refs.some((existing) => existing.providerBaselineId === candidate.providerBaselineId)) {
      refs.push(clone(candidate));
    }
  }
  return refs;
}

function dedupeAnnualRulepackRefs(values = []) {
  const refs = [];
  for (const candidate of values) {
    if (!candidate?.rulepackCode || !candidate?.rulepackVersion) {
      continue;
    }
    if (!refs.some((existing) => existing.rulepackCode === candidate.rulepackCode && existing.rulepackVersion === candidate.rulepackVersion)) {
      refs.push(clone(candidate));
    }
  }
  return refs;
}

function buildAnnualRulepackRefs(annualContext) {
  return dedupeAnnualRulepackRefs([
    {
      rulepackId: annualContext.rulepackId || null,
      rulepackCode: "RP-LEGAL-FORM-SE",
      rulepackVersion: annualContext.rulepackVersion,
      rulepackChecksum: annualContext.rulepackChecksum || null,
      effectiveDate: annualContext.fiscalYearEndsOn || null
    },
    {
      rulepackId: annualContext.rulepackId || null,
      rulepackCode: "RP-ANNUAL-FILING-SE",
      rulepackVersion: annualContext.rulepackVersion,
      rulepackChecksum: annualContext.rulepackChecksum || null,
      effectiveDate: annualContext.fiscalYearEndsOn || null
    }
  ]);
}

function resolveAnnualVersionProviderBaselineRefs({ providerBaselineRegistry, annualContext, accountingPeriod }) {
  if (!providerBaselineRegistry || annualContext.requiresBolagsverketFiling !== true) {
    return [];
  }
  const effectiveDate = accountingPeriod.endsOn || accountingPeriod.toDate || accountingPeriod.endDate || accountingPeriod.startsOn;
  return dedupeProviderBaselineRefs([
    resolveAnnualProviderBaselineRef(providerBaselineRegistry, {
      providerCode: "bolagsverket-ixbrl",
      baselineCode: "SE-IXBRL-FILING",
      effectiveDate,
      metadata: {
        packageFamilyCode: annualContext.packageFamilyCode,
        declarationProfileCode: annualContext.declarationProfileCode
      }
    })
  ]);
}

function buildHashCheck(checkCode, expectedHash, actualHash) {
  return {
    checkCode,
    checkType: "hash",
    expectedValue: text(expectedHash, "expected_hash_required"),
    actualValue: text(actualHash, "actual_hash_required")
  };
}

function buildAmountCheck(checkCode, expectedAmount, actualAmount) {
  return {
    checkCode,
    checkType: "amount",
    expectedValue: roundMoney(expectedAmount || 0),
    actualValue: roundMoney(actualAmount || 0)
  };
}

function finalizeCheck(check) {
  const expectedValue = check.checkType === "amount" ? roundMoney(check.expectedValue || 0) : text(check.expectedValue, "check_expected_value_required");
  const actualValue = check.checkType === "amount" ? roundMoney(check.actualValue || 0) : text(check.actualValue, "check_actual_value_required");
  return {
    checkCode: text(check.checkCode, "check_code_required"),
    checkType: text(check.checkType, "check_type_required"),
    expectedValue,
    actualValue,
    passed: hashPayload(expectedValue) === hashPayload(actualValue)
  };
}

function summarizeVatRuns(vatRuns) {
  const items = vatRuns
    .slice()
    .sort((left, right) => left.fromDate.localeCompare(right.fromDate))
    .map((run) => ({
      vatDeclarationRunId: run.vatDeclarationRunId,
      fromDate: run.fromDate,
      toDate: run.toDate,
      submittedAt: run.submittedAt,
      sourceSnapshotHash: run.sourceSnapshotHash,
      changedBoxes: clone(run.changedBoxes || []),
      changedAmounts: clone(run.changedAmounts || []),
      declarationBoxSummary: clone(run.declarationBoxSummary || []),
      declaredTaxAmount: sumBoxSummary(run.declarationBoxSummary || [])
    }));
  return {
    runCount: items.length,
    totalDeclaredTaxAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.declaredTaxAmount || 0), 0)),
    runs: items
  };
}

function summarizeAgiSubmissions(agiSubmissions) {
  const items = agiSubmissions
    .slice()
    .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod))
    .map((submission) => {
      const version = submission.currentVersion || submission.versions?.at(-1) || null;
      const totals = clone(version?.payloadJson?.totals || {});
      return {
        agiSubmissionId: submission.agiSubmissionId,
        reportingPeriod: submission.reportingPeriod,
        status: submission.status,
        currentVersionId: version?.agiSubmissionVersionId || null,
        sourceSnapshotHash: version?.sourceSnapshotHash || null,
        totals: {
          employeeCount: Number(totals.employeeCount || 0),
          cashCompensationAmount: roundMoney(totals.cashCompensationAmount || 0),
          taxableBenefitAmount: roundMoney(totals.taxableBenefitAmount || 0),
          preliminaryTaxAmount: roundMoney(totals.preliminaryTaxAmount || 0),
          sinkTaxAmount: roundMoney(totals.sinkTaxAmount || 0)
        }
      };
    });
  return {
    submissionCount: items.length,
    totalCashCompensationAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.totals.cashCompensationAmount || 0), 0)),
    totalPreliminaryTaxAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.totals.preliminaryTaxAmount || 0), 0)),
    totalSinkTaxAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.totals.sinkTaxAmount || 0), 0)),
    submissions: items
  };
}

function summarizeHusCases(husCases) {
  const items = husCases
    .slice()
    .sort((left, right) => String(left.createdAt || "").localeCompare(String(right.createdAt || "")))
    .map((record) => ({
      husCaseId: record.husCaseId,
      status: record.status,
      claims: (record.claims || []).map((claim) => ({
        husClaimId: claim.husClaimId,
        status: claim.status,
        requestedAmount: roundMoney(claim.requestedAmount || 0),
        submittedOn: claim.submittedOn || null
      })),
      decisions: (record.decisions || []).map((decision) => ({
        husDecisionId: decision.husDecisionId,
        approvedAmount: roundMoney(decision.approvedAmount || 0),
        rejectedAmount: roundMoney(decision.rejectedAmount || 0),
        decisionDate: decision.decisionDate
      }))
    }));
  const claims = items.flatMap((item) => item.claims);
  const decisions = items.flatMap((item) => item.decisions);
  return {
    caseCount: items.length,
    claimCount: claims.length,
    decisionCount: decisions.length,
    totalRequestedAmount: roundMoney(claims.reduce((sum, claim) => sum + Number(claim.requestedAmount || 0), 0)),
    totalApprovedAmount: roundMoney(decisions.reduce((sum, decision) => sum + Number(decision.approvedAmount || 0), 0)),
    totalRejectedAmount: roundMoney(decisions.reduce((sum, decision) => sum + Number(decision.rejectedAmount || 0), 0)),
    cases: items
  };
}

function summarizePensionSnapshots(pensionSnapshots) {
  const items = pensionSnapshots
    .slice()
    .sort((left, right) => left.reportingPeriod.localeCompare(right.reportingPeriod))
    .map((snapshot) => ({
      pensionBasisSnapshotId: snapshot.pensionBasisSnapshotId,
      reportingPeriod: snapshot.reportingPeriod,
      employmentId: snapshot.employmentId,
      totalPensionPremiumAmount: roundMoney(snapshot.totalPensionPremiumAmount || 0),
      specialPayrollTaxAmount: roundMoney(snapshot.specialPayrollTaxAmount || 0),
      salaryExchangeAmount: roundMoney(snapshot.salaryExchangeAmount || 0),
      snapshotHash: snapshot.snapshotHash
    }));
  return {
    snapshotCount: items.length,
    totalPensionPremiumAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.totalPensionPremiumAmount || 0), 0)),
    specialPayrollTaxAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.specialPayrollTaxAmount || 0), 0)),
    salaryExchangeAmount: roundMoney(items.reduce((sum, item) => sum + Number(item.salaryExchangeAmount || 0), 0)),
    snapshots: items
  };
}

function requireHardClosedPeriod(ledgerPlatform, companyId, accountingPeriodId) {
  if (!ledgerPlatform?.listAccountingPeriods) {
    throw error(500, "annual_reporting_ledger_platform_missing", "Ledger platform is required for annual reporting.");
  }
  const period = (ledgerPlatform.listAccountingPeriods({ companyId }) || []).find((candidate) => candidate.accountingPeriodId === text(accountingPeriodId, "accounting_period_id_required"));
  if (!period) {
    throw error(404, "annual_report_period_not_found", "Accounting period was not found.");
  }
  if (period.status !== "hard_closed") {
    throw error(409, "annual_report_period_not_closed", "The accounting period must be hard-closed before annual reporting.");
  }
  return clone(period);
}

function resolveAnnualContext({ fiscalYearPlatform, legalFormPlatform, companyId, accountingPeriod, legalFormProfileId = null, reportingObligationProfileId = null }) {
  if (!legalFormPlatform?.resolveActiveLegalFormProfile || !legalFormPlatform?.resolveReportingObligationProfile || !legalFormPlatform?.resolveDeclarationProfile) {
    throw error(500, "annual_reporting_legal_form_platform_missing", "Legal-form platform is required for annual reporting.");
  }
  const asOfDate = accountingPeriod.endsOn || accountingPeriod.toDate || accountingPeriod.endDate || accountingPeriod.startsOn;
  const fiscalYear = resolveFiscalYearSnapshot({ fiscalYearPlatform, companyId, accountingPeriod });
  const legalFormProfile = legalFormPlatform.resolveActiveLegalFormProfile({
    companyId,
    asOfDate,
    legalFormProfileId
  });
  const reportingObligationProfile =
    normalizeText(reportingObligationProfileId) == null
      ? legalFormPlatform.resolveReportingObligationProfile({
          companyId,
          legalFormProfileId: legalFormProfile.legalFormProfileId,
          accountingPeriodId: accountingPeriod.accountingPeriodId,
          fiscalYearId: fiscalYear.fiscalYearId,
          fiscalYearKey: fiscalYear.fiscalYear,
          asOfDate
        })
      : legalFormPlatform.getReportingObligationProfile({
          companyId,
          reportingObligationProfileId
        });
  const declarationProfile = legalFormPlatform.resolveDeclarationProfile({
    companyId,
    legalFormProfileId: legalFormProfile.legalFormProfileId,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    fiscalYearId: fiscalYear.fiscalYearId,
    fiscalYearKey: fiscalYear.fiscalYear,
    asOfDate
  });
  return {
    fiscalYearId: fiscalYear.fiscalYearId,
    fiscalYear: fiscalYear.fiscalYear,
    legalFormProfileId: legalFormProfile.legalFormProfileId,
    legalFormCode: legalFormProfile.legalFormCode,
    reportingObligationProfileId: reportingObligationProfile.reportingObligationProfileId,
    declarationProfileCode: declarationProfile.declarationProfileCode,
    filingProfileCode: declarationProfile.filingProfileCode,
    signatoryClassCode: declarationProfile.signatoryClassCode,
    packageFamilyCode: declarationProfile.packageFamilyCode,
    requiresAnnualReport: reportingObligationProfile.requiresAnnualReport === true,
    requiresBolagsverketFiling: reportingObligationProfile.requiresBolagsverketFiling === true,
    requiresTaxDeclarationPackage: reportingObligationProfile.requiresTaxDeclarationPackage !== false,
    rulepackId: reportingObligationProfile.rulepackId || legalFormProfile.rulepackId || null,
    rulepackCode: reportingObligationProfile.rulepackCode || legalFormProfile.rulepackCode || null,
    rulepackChecksum: reportingObligationProfile.rulepackChecksum || legalFormProfile.rulepackChecksum || null,
    rulepackVersion: reportingObligationProfile.rulepackVersion || legalFormProfile.rulepackVersion || "unknown"
  };
}

function resolveFiscalYearSnapshot({ fiscalYearPlatform, companyId, accountingPeriod }) {
  const fallback = {
    fiscalYearId: null,
    fiscalYear: formatFiscalYearKey(accountingPeriod.startsOn, accountingPeriod.endsOn || accountingPeriod.startsOn)
  };
  if (!fiscalYearPlatform?.listFiscalYears) {
    return fallback;
  }
  const fiscalYear = (fiscalYearPlatform.listFiscalYears({ companyId }) || []).find((candidate) => {
    const candidateStart = candidate.startDate || candidate.startsOn;
    const candidateEnd = candidate.endDate || candidate.endsOn;
    return candidateStart === accountingPeriod.startsOn && candidateEnd === accountingPeriod.endsOn;
  });
  if (!fiscalYear) {
    return fallback;
  }
  return {
    fiscalYearId: fiscalYear.fiscalYearId,
    fiscalYear: formatFiscalYearKey(fiscalYear.startDate || accountingPeriod.startsOn, fiscalYear.endDate || accountingPeriod.endsOn || accountingPeriod.startsOn)
  };
}

function requireCompany(orgAuthPlatform, companyId) {
  if (orgAuthPlatform?.getCompanyProfile) {
    return orgAuthPlatform.getCompanyProfile({ companyId: text(companyId, "company_id_required") });
  }
  const company = (orgAuthPlatform?.snapshot?.().companies || []).find((candidate) => candidate.companyId === text(companyId, "company_id_required"));
  if (!company) {
    throw error(404, "company_not_found", "Company was not found.");
  }
  return clone(company);
}

function requirePackage(state, companyId, packageId) {
  const annualPackage = state.packages.get(text(packageId, "annual_report_package_id_required"));
  if (!annualPackage || annualPackage.companyId !== text(companyId, "company_id_required")) {
    throw error(404, "annual_report_package_not_found", "Annual-report package was not found.");
  }
  return annualPackage;
}

function requireVersion(state, packageId, versionId) {
  const record = state.versions.get(text(versionId, "annual_report_version_id_required"));
  if (!record || record.packageId !== text(packageId, "annual_report_package_id_required")) {
    throw error(404, "annual_report_version_not_found", "Annual-report version was not found.");
  }
  return record;
}

function requireCompanyUser(orgAuthPlatform, companyId, companyUserId) {
  const snapshot = orgAuthPlatform?.snapshot?.() || { companyUsers: [], users: [] };
  const companyUser = snapshot.companyUsers.find(
    (candidate) => candidate.companyUserId === text(companyUserId, "company_user_id_required") && candidate.companyId === text(companyId, "company_id_required")
  );
  if (!companyUser) {
    throw error(404, "company_user_not_found", "Company user was not found.");
  }
  const user = snapshot.users.find((candidate) => candidate.userId === companyUser.userId);
  if (!user) {
    throw error(404, "user_not_found", "User was not found.");
  }
  return clone({
    ...companyUser,
    email: user.email || null,
    displayName: user.displayName || null
  });
}

function ensureUserExists(orgAuthPlatform, userId) {
  const user = (orgAuthPlatform?.snapshot?.().users || []).find((candidate) => candidate.userId === text(userId, "actor_id_required"));
  if (!user) {
    throw error(404, "user_not_found", "User was not found.");
  }
  return clone(user);
}

function requireProfileCode(value, legalFormCode = null) {
  const fallbackProfileCode = legalFormCode === "ENSKILD_NARINGSVERKSAMHET" ? "k1" : "k2";
  const profileCode = text(value || fallbackProfileCode, "annual_report_profile_code_required").toLowerCase();
  if (!ANNUAL_REPORT_PROFILE_CODES.includes(profileCode)) {
    throw error(400, "annual_report_profile_code_invalid", "Annual-report profile code must be k1, k2 or k3.");
  }
  if (profileCode === "k1" && legalFormCode && legalFormCode !== "ENSKILD_NARINGSVERKSAMHET") {
    throw error(409, "annual_report_profile_code_incompatible", "K1 is only supported on the sole-trader path.");
  }
  return profileCode;
}

function nextVersionNo(state, packageId) {
  return [...state.versions.values()].filter((candidate) => candidate.packageId === packageId).length + 1;
}

function normalizeSections(sections) {
  return Object.entries(sections || {}).reduce((accumulator, [key, value]) => {
    const normalizedKey = normalizeSectionCode(key);
    if (!normalizedKey) {
      return accumulator;
    }
    const normalizedValue = normalizeText(value);
    if (normalizedValue == null) {
      return accumulator;
    }
    accumulator[normalizedKey] = normalizedValue;
    return accumulator;
  }, {});
}

function normalizeSectionCode(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSruFieldCode(value) {
  return String(value || "field")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "field";
}

function sumBoxSummary(summary) {
  return roundMoney((Array.isArray(summary) ? summary : []).reduce((sum, row) => sum + Number(row.amount || 0), 0));
}

function formatFiscalYearKey(startDate, endDate) {
  const startYear = text(startDate, "fiscal_year_start_date_required").slice(0, 4);
  const endYear = text(endDate, "fiscal_year_end_date_required").slice(0, 4);
  return startYear === endYear ? startYear : `${startYear}-${endYear}`;
}

function fiscalYearRangeIncludes(fiscalYear, fromDate, toDate) {
  const year = text(fiscalYear, "fiscal_year_required");
  const yearParts = year.split("-").filter(Boolean);
  return yearParts.some((part) => String(fromDate || "").startsWith(part) || String(toDate || "").startsWith(part));
}

function caseTouchesFiscalYear(record, fiscalYear) {
  const year = text(fiscalYear, "fiscal_year_required");
  if (String(record.createdAt || "").startsWith(year) || String(record.updatedAt || "").startsWith(year)) {
    return true;
  }
  return (
    (record.claims || []).some((claim) => String(claim.submittedOn || claim.createdAt || "").startsWith(year)) ||
    (record.decisions || []).some((decision) => String(decision.decisionDate || decision.createdAt || "").startsWith(year)) ||
    (record.payouts || []).some((payout) => String(payout.payoutDate || payout.createdAt || "").startsWith(year))
  );
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function formatMoney(value) {
  return roundMoney(value || 0).toFixed(2);
}

function nowIso(clock = () => new Date()) {
  return new Date(clock()).toISOString();
}

function hashPayload(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw error(400, code, `${code} is required.`);
  }
  return value.trim();
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function error(status, code, message) {
  const failure = new Error(message);
  failure.status = status;
  failure.code = code;
  return failure;
}

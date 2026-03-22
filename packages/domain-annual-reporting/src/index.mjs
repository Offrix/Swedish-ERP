import crypto from "node:crypto";

export const ANNUAL_REPORT_PROFILE_CODES = Object.freeze(["k2", "k3"]);
export const ANNUAL_REPORT_PACKAGE_STATUSES = Object.freeze(["draft", "ready_for_signature", "signed", "submitted", "locked", "superseded"]);
export const ANNUAL_REPORT_SIGNATORY_STATUSES = Object.freeze(["invited", "signed", "declined", "superseded"]);

export function createAnnualReportingPlatform(options = {}) {
  return createAnnualReportingEngine(options);
}

export function createAnnualReportingEngine({
  ledgerPlatform = null,
  reportingPlatform = null,
  orgAuthPlatform = null,
  clock = () => new Date()
} = {}) {
  const state = {
    packages: new Map(),
    versions: new Map(),
    signatories: new Map(),
    submissionEvents: new Map()
  };

  return {
    annualReportProfileCodes: ANNUAL_REPORT_PROFILE_CODES,
    annualReportPackageStatuses: ANNUAL_REPORT_PACKAGE_STATUSES,
    annualReportSignatoryStatuses: ANNUAL_REPORT_SIGNATORY_STATUSES,
    createAnnualReportPackage(input) {
      return createAnnualReportPackage({ state, ledgerPlatform, reportingPlatform, orgAuthPlatform, clock }, input);
    },
    createAnnualReportVersion(input) {
      return createAnnualReportVersion({ state, ledgerPlatform, reportingPlatform, orgAuthPlatform, clock }, input);
    },
    listAnnualReportPackages(input) {
      return listAnnualReportPackages({ state }, input);
    },
    getAnnualReportPackage(input) {
      return getAnnualReportPackage({ state }, input);
    },
    inviteAnnualReportSignatory(input) {
      return inviteAnnualReportSignatory({ state, orgAuthPlatform, clock }, input);
    },
    signAnnualReportVersion(input) {
      return signAnnualReportVersion({ state, orgAuthPlatform, clock }, input);
    },
    diffAnnualReportVersions(input) {
      return diffAnnualReportVersions({ state }, input);
    },
    snapshotAnnualReporting() {
      return clone({
        packages: [...state.packages.values()],
        versions: [...state.versions.values()],
        signatories: [...state.signatories.values()],
        submissionEvents: [...state.submissionEvents.values()]
      });
    }
  };
}

function createAnnualReportPackage(context, input = {}) {
  const {
    state,
    ledgerPlatform,
    reportingPlatform,
    orgAuthPlatform,
    clock
  } = context;
  const companyId = text(input.companyId, "company_id_required");
  const accountingPeriod = requireHardClosedPeriod(ledgerPlatform, companyId, input.accountingPeriodId);
  const profileCode = requireProfileCode(input.profileCode);
  const actorId = text(input.actorId, "actor_id_required");
  ensureUserExists(orgAuthPlatform, actorId);
  const existing = findPackage(state, companyId, accountingPeriod.accountingPeriodId, profileCode);
  if (existing) {
    return createAnnualReportVersion(context, {
      companyId,
      packageId: existing.packageId,
      actorId,
      textSections: input.textSections || {},
      noteSections: input.noteSections || {},
      includeEstablishmentCertificate: input.includeEstablishmentCertificate !== false
    });
  }
  const now = nowIso(clock);
  const packageId = crypto.randomUUID();
  const annualPackage = {
    packageId,
    companyId,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    fiscalYear: accountingPeriod.startsOn.slice(0, 4),
    profileCode,
    status: "draft",
    currentVersionId: null,
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now
  };
  state.packages.set(packageId, annualPackage);
  return createAnnualReportVersion(context, {
    companyId,
    packageId,
    actorId,
    textSections: input.textSections || {},
    noteSections: input.noteSections || {},
    includeEstablishmentCertificate: input.includeEstablishmentCertificate !== false
  });
}

function createAnnualReportVersion(context, input = {}) {
  const {
    state,
    ledgerPlatform,
    reportingPlatform,
    orgAuthPlatform,
    clock
  } = context;
  const companyId = text(input.companyId, "company_id_required");
  const annualPackage = requirePackage(state, companyId, input.packageId);
  const accountingPeriod = requireHardClosedPeriod(ledgerPlatform, companyId, annualPackage.accountingPeriodId);
  const actorId = text(input.actorId, "actor_id_required");
  ensureUserExists(orgAuthPlatform, actorId);
  const payload = materializeVersionPayload({
    reportingPlatform,
    companyId,
    accountingPeriod,
    profileCode: annualPackage.profileCode,
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
  const versionId = crypto.randomUUID();
  const version = {
    versionId,
    packageId: annualPackage.packageId,
    companyId,
    versionNo: nextVersionNo(state, annualPackage.packageId),
    profileCode: annualPackage.profileCode,
    packageStatus: "draft",
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    balanceSheetReportSnapshotId: payload.balanceSheet.reportSnapshotId,
    incomeStatementReportSnapshotId: payload.incomeStatement.reportSnapshotId,
    documents: payload.documents,
    textSections: payload.textSections,
    noteSections: payload.noteSections,
    taxPackageOutputs: payload.taxPackageOutputs,
    sourceFingerprint: payload.sourceFingerprint,
    checksum: payload.checksum,
    diffFromPrevious: currentVersion ? buildDiff(currentVersion, payload) : [],
    createdByActorId: actorId,
    createdAt: now,
    updatedAt: now,
    supersedesVersionId: currentVersion?.versionId || null,
    lockedAt: null,
    submittedAt: null
  };
  if (currentVersion) {
    currentVersion.packageStatus = "superseded";
    currentVersion.updatedAt = now;
  }
  state.versions.set(versionId, version);
  annualPackage.currentVersionId = versionId;
  annualPackage.status = "draft";
  annualPackage.updatedAt = now;
  for (const signatory of state.signatories.values()) {
    if (signatory.packageId === annualPackage.packageId && signatory.versionId === currentVersion?.versionId && signatory.status !== "signed") {
      signatory.status = "superseded";
      signatory.updatedAt = now;
    }
  }
  state.submissionEvents.set(crypto.randomUUID(), {
    submissionEventId: crypto.randomUUID(),
    packageId: annualPackage.packageId,
    versionId,
    eventType: "package_prepared",
    payloadChecksum: version.checksum,
    recordedAt: now
  });
  return materializePackage(state, annualPackage);
}

function listAnnualReportPackages({ state }, { companyId } = {}) {
  const resolvedCompanyId = text(companyId, "company_id_required");
  return [...state.packages.values()]
    .filter((candidate) => candidate.companyId === resolvedCompanyId)
    .sort((left, right) => left.fiscalYear.localeCompare(right.fiscalYear))
    .map((candidate) => materializePackage(state, candidate));
}

function getAnnualReportPackage({ state }, { companyId, packageId } = {}) {
  return materializePackage(state, requirePackage(state, text(companyId, "company_id_required"), packageId));
}

function inviteAnnualReportSignatory({ state, orgAuthPlatform, clock }, input = {}) {
  const annualPackage = requirePackage(state, text(input.companyId, "company_id_required"), input.packageId);
  const version = requireVersion(state, annualPackage.packageId, input.versionId || annualPackage.currentVersionId);
  const companyUser = requireCompanyUser(orgAuthPlatform, text(input.companyUserId, "company_user_id_required"));
  const signatory = {
    signatoryId: crypto.randomUUID(),
    packageId: annualPackage.packageId,
    versionId: version.versionId,
    companyId: annualPackage.companyId,
    companyUserId: companyUser.companyUserId,
    userId: companyUser.userId,
    signatoryRole: text(input.signatoryRole, "annual_report_signatory_role_required"),
    status: "invited",
    invitedAt: nowIso(clock),
    signedAt: null,
    comment: null,
    updatedAt: nowIso(clock)
  };
  state.signatories.set(signatory.signatoryId, signatory);
  version.packageStatus = "ready_for_signature";
  version.updatedAt = nowIso(clock);
  return clone(signatory);
}

function signAnnualReportVersion({ state, orgAuthPlatform, clock }, input = {}) {
  const annualPackage = requirePackage(state, text(input.companyId, "company_id_required"), input.packageId);
  const version = requireVersion(state, annualPackage.packageId, input.versionId || annualPackage.currentVersionId);
  const actorId = text(input.actorId, "actor_id_required");
  ensureUserExists(orgAuthPlatform, actorId);
  const signatory = [...state.signatories.values()]
    .find((candidate) => candidate.packageId === annualPackage.packageId && candidate.versionId === version.versionId && candidate.userId === actorId && candidate.status === "invited");
  if (!signatory) {
    throw error(404, "annual_report_signatory_not_found", "Annual report signatory was not found for the current actor.");
  }
  signatory.status = "signed";
  signatory.signedAt = nowIso(clock);
  signatory.comment = norm(input.comment);
  signatory.updatedAt = nowIso(clock);
  if (![...state.signatories.values()].some((candidate) => candidate.packageId === annualPackage.packageId && candidate.versionId === version.versionId && candidate.status === "invited")) {
    version.packageStatus = "signed";
    version.lockedAt = nowIso(clock);
    version.updatedAt = nowIso(clock);
    annualPackage.status = "signed";
    annualPackage.updatedAt = nowIso(clock);
  }
  return materializePackage(state, annualPackage);
}

function diffAnnualReportVersions({ state }, { companyId, packageId, leftVersionId, rightVersionId } = {}) {
  requirePackage(state, text(companyId, "company_id_required"), packageId);
  const left = requireVersion(state, packageId, leftVersionId);
  const right = requireVersion(state, packageId, rightVersionId);
  return {
    packageId,
    leftVersionId: left.versionId,
    rightVersionId: right.versionId,
    changes: buildVersionDiff(left, right)
  };
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function materializeVersionPayload({
  reportingPlatform,
  companyId,
  accountingPeriod,
  profileCode,
  textSections,
  noteSections,
  includeEstablishmentCertificate,
  actorId
}) {
  if (!reportingPlatform?.runReportSnapshot) {
    throw error(500, "reporting_platform_required", "Reporting platform is required.");
  }
  const fromDate = accountingPeriod.startsOn;
  const toDate = accountingPeriod.endsOn;
  const balanceSheet = reportingPlatform.runReportSnapshot({
    companyId,
    reportCode: "balance_sheet",
    fromDate,
    toDate,
    actorId
  });
  const incomeStatement = reportingPlatform.runReportSnapshot({
    companyId,
    reportCode: "income_statement",
    fromDate,
    toDate,
    actorId
  });
  const normalizedTextSections = normalizeSections(textSections, profileCode === "k3"
    ? ["management_report", "accounting_policies", "material_events"]
    : ["management_report", "accounting_policies"]);
  const normalizedNoteSections = normalizeSections(noteSections, profileCode === "k3"
    ? ["notes_bundle", "cash_flow_commentary", "related_party_commentary"]
    : ["notes_bundle", "simplified_notes"]);
  const documents = [
    {
      documentCode: "balance_sheet",
      sourceType: "report_snapshot",
      reportSnapshotId: balanceSheet.reportSnapshotId,
      checksum: hashPayload(balanceSheet.lines.map((line) => ({ lineKey: line.lineKey, metricValues: line.metricValues })))
    },
    {
      documentCode: "income_statement",
      sourceType: "report_snapshot",
      reportSnapshotId: incomeStatement.reportSnapshotId,
      checksum: hashPayload(incomeStatement.lines.map((line) => ({ lineKey: line.lineKey, metricValues: line.metricValues })))
    },
    {
      documentCode: "notes_bundle",
      sourceType: "text_bundle",
      checksum: hashPayload(normalizedNoteSections)
    },
    {
      documentCode: "management_report",
      sourceType: "text_bundle",
      checksum: hashPayload(normalizedTextSections)
    },
    ...(includeEstablishmentCertificate
      ? [{
          documentCode: "establishment_certificate",
          sourceType: "generated_text",
          checksum: hashPayload({
            companyId,
            accountingPeriodId: accountingPeriod.accountingPeriodId,
            profileCode
          })
        }]
      : [])
  ];
  const taxPackageOutputs = [
    {
      taxPackageCode: "income_tax_support",
      derivedFrom: [incomeStatement.reportSnapshotId, balanceSheet.reportSnapshotId],
      outputChecksum: hashPayload({ profileCode, fromDate, toDate, reportCode: "income_tax_support" })
    },
    {
      taxPackageCode: "audit_summary",
      derivedFrom: [incomeStatement.reportSnapshotId, balanceSheet.reportSnapshotId],
      outputChecksum: hashPayload({ profileCode, fromDate, toDate, reportCode: "audit_summary" })
    }
  ];
  const sourceFingerprint = hashPayload({
    companyId,
    accountingPeriodId: accountingPeriod.accountingPeriodId,
    accountingPeriodUpdatedAt: accountingPeriod.updatedAt,
    profileCode,
    balanceSheetReportSnapshotId: balanceSheet.reportSnapshotId,
    balanceSheetHash: balanceSheet.snapshotHash,
    incomeStatementReportSnapshotId: incomeStatement.reportSnapshotId,
    incomeStatementHash: incomeStatement.snapshotHash,
    textSections: normalizedTextSections,
    noteSections: normalizedNoteSections,
    includeEstablishmentCertificate
  });
  return {
    balanceSheet,
    incomeStatement,
    documents,
    textSections: normalizedTextSections,
    noteSections: normalizedNoteSections,
    taxPackageOutputs,
    sourceFingerprint,
    checksum: hashPayload({
      documents,
      textSections: normalizedTextSections,
      noteSections: normalizedNoteSections,
      taxPackageOutputs
    })
  };
}

function materializePackage(state, annualPackage) {
  const currentVersion = annualPackage.currentVersionId ? state.versions.get(annualPackage.currentVersionId) : null;
  const versions = [...state.versions.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.versionNo - right.versionNo)
    .map(clone);
  const signatories = [...state.signatories.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.invitedAt.localeCompare(right.invitedAt))
    .map(clone);
  const submissionEvents = [...state.submissionEvents.values()]
    .filter((candidate) => candidate.packageId === annualPackage.packageId)
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .map(clone);
  return clone({
    ...annualPackage,
    currentVersion,
    versions,
    signatories,
    submissionEvents
  });
}

function buildDiff(previousVersion, payload) {
  return buildVersionDiff(previousVersion, {
    versionId: "candidate",
    checksum: payload.checksum,
    balanceSheetReportSnapshotId: payload.balanceSheet.reportSnapshotId,
    incomeStatementReportSnapshotId: payload.incomeStatement.reportSnapshotId,
    textSections: payload.textSections,
    noteSections: payload.noteSections
  });
}

function buildVersionDiff(left, right) {
  const changes = [];
  if (left.checksum !== right.checksum) {
    changes.push({ field: "checksum", left: left.checksum, right: right.checksum });
  }
  if (left.balanceSheetReportSnapshotId !== right.balanceSheetReportSnapshotId) {
    changes.push({ field: "balance_sheet_snapshot", left: left.balanceSheetReportSnapshotId, right: right.balanceSheetReportSnapshotId });
  }
  if (left.incomeStatementReportSnapshotId !== right.incomeStatementReportSnapshotId) {
    changes.push({ field: "income_statement_snapshot", left: left.incomeStatementReportSnapshotId, right: right.incomeStatementReportSnapshotId });
  }
  if (hashPayload(left.textSections) !== hashPayload(right.textSections)) {
    changes.push({ field: "text_sections", left: hashPayload(left.textSections), right: hashPayload(right.textSections) });
  }
  if (hashPayload(left.noteSections) !== hashPayload(right.noteSections)) {
    changes.push({ field: "note_sections", left: hashPayload(left.noteSections), right: hashPayload(right.noteSections) });
  }
  return changes;
}

function requireHardClosedPeriod(ledgerPlatform, companyId, accountingPeriodId) {
  if (!ledgerPlatform?.listAccountingPeriods) {
    throw error(500, "ledger_platform_required", "Ledger platform is required.");
  }
  const period = ledgerPlatform.listAccountingPeriods({ companyId })
    .find((candidate) => candidate.accountingPeriodId === text(accountingPeriodId, "accounting_period_id_required"));
  if (!period) {
    throw error(404, "accounting_period_not_found", "Accounting period was not found.");
  }
  if (period.status !== "hard_closed") {
    throw error(400, "annual_report_period_not_closed", "Annual reporting requires a hard-closed accounting period.");
  }
  return period;
}

function findPackage(state, companyId, accountingPeriodId, profileCode) {
  return [...state.packages.values()].find(
    (candidate) => candidate.companyId === companyId
      && candidate.accountingPeriodId === accountingPeriodId
      && candidate.profileCode === profileCode
      && candidate.status !== "superseded"
  ) || null;
}

function requirePackage(state, companyId, packageId) {
  const annualPackage = state.packages.get(text(packageId, "annual_report_package_id_required"));
  if (!annualPackage || annualPackage.companyId !== companyId) {
    throw error(404, "annual_report_package_not_found", "Annual report package was not found.");
  }
  return annualPackage;
}

function requireVersion(state, packageId, versionId) {
  const version = state.versions.get(text(versionId, "annual_report_version_id_required"));
  if (!version || version.packageId !== packageId) {
    throw error(404, "annual_report_version_not_found", "Annual report version was not found.");
  }
  return version;
}

function nextVersionNo(state, packageId) {
  return [...state.versions.values()]
    .filter((candidate) => candidate.packageId === packageId)
    .reduce((highest, candidate) => Math.max(highest, candidate.versionNo), 0) + 1;
}

function normalizeSections(value, defaultKeys) {
  const input = value && typeof value === "object" ? value : {};
  const normalized = {};
  for (const key of defaultKeys) {
    normalized[key] = String(input[key] || "").trim();
  }
  return normalized;
}

function requireProfileCode(value) {
  const resolved = text(value, "annual_report_profile_code_required").toLowerCase();
  if (!ANNUAL_REPORT_PROFILE_CODES.includes(resolved)) {
    throw error(400, "annual_report_profile_code_invalid", "Annual report profile code is not supported.");
  }
  return resolved;
}

function requireCompanyUser(orgAuthPlatform, companyUserId) {
  const companyUser = (orgAuthPlatform?.snapshot()?.companyUsers || []).find((candidate) => candidate.companyUserId === companyUserId);
  if (!companyUser) {
    throw error(404, "company_user_not_found", "Company user was not found.");
  }
  return companyUser;
}

function ensureUserExists(orgAuthPlatform, userId) {
  const user = (orgAuthPlatform?.snapshot()?.users || []).find((candidate) => candidate.userId === userId);
  if (!user) {
    throw error(404, "user_not_found", "Actor user was not found.");
  }
  return user;
}

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

function hashPayload(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function text(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw error(400, code, `${code} is required.`);
  }
  return value.trim();
}

function norm(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function error(status, code, message) {
  const instance = new Error(message);
  instance.status = status;
  instance.code = code;
  return instance;
}

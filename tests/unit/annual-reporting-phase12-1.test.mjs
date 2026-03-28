import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";

test("Phase 12.1 creates K2/K3 annual packages, tracks signatories and versions changed books", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T14:15:00Z")
  });
  const onboarding = platform.createOnboardingRun({
    legalName: "Annual Unit Client AB",
    orgNumber: "559900-5401",
    adminEmail: "annual.unit@example.com",
    adminDisplayName: "Annual Unit Admin",
    accountingYear: "2026"
  });
  const company = platform.getCompanyProfile({
    companyId: onboarding.companyId
  });
  const snapshot = platform.snapshot();
  const adminUser = snapshot.users.find((candidate) => candidate.email === "annual.unit@example.com");
  const adminCompanyUser = snapshot.companyUsers.find(
    (candidate) => candidate.companyId === company.companyId && candidate.userId === adminUser?.userId
  );
  const methodAssessment = platform.assessCashMethodEligibility({
    companyId: company.companyId,
    annualNetTurnoverSek: 0,
    legalFormCode: "AKTIEBOLAG",
    actorId: adminUser.userId
  });
  const methodProfile = platform.createMethodProfile({
    companyId: company.companyId,
    methodCode: "FAKTURERINGSMETOD",
    effectiveFrom: "2026-01-01",
    fiscalYearStartDate: "2026-01-01",
    eligibilityAssessmentId: methodAssessment.assessmentId,
    onboardingOverride: true,
    actorId: adminUser.userId
  });
  platform.activateMethodProfile({
    companyId: company.companyId,
    methodProfileId: methodProfile.methodProfileId,
    actorId: adminUser.userId
  });
  const fiscalYearProfile = platform.createFiscalYearProfile({
    companyId: company.companyId,
    legalFormCode: "AKTIEBOLAG",
    actorId: adminUser.userId
  });
  const fiscalYear = platform.createFiscalYear({
    companyId: company.companyId,
    fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    approvalBasisCode: "BASELINE",
    actorId: adminUser.userId
  });
  platform.activateFiscalYear({
    companyId: company.companyId,
    fiscalYearId: fiscalYear.fiscalYearId,
    actorId: adminUser.userId
  });
  platform.installLedgerCatalog({
    companyId: company.companyId,
    actorId: "phase12-1-unit"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: company.companyId,
    fiscalYear: 2026,
    actorId: "phase12-1-unit"
  });
  const legalFormProfile = platform.createLegalFormProfile({
    companyId: company.companyId,
    legalFormCode: "AKTIEBOLAG",
    effectiveFrom: "2026-01-01",
    actorId: adminUser.userId
  });
  platform.activateLegalFormProfile({
    companyId: company.companyId,
    legalFormProfileId: legalFormProfile.legalFormProfileId,
    actorId: adminUser.userId
  });
  const reportingObligation = platform.createReportingObligationProfile({
    companyId: company.companyId,
    legalFormProfileId: legalFormProfile.legalFormProfileId,
    fiscalYearKey: "2026",
    accountingPeriodId: period.accountingPeriodId,
    requiresAnnualReport: true,
    requiresYearEndAccounts: false,
    requiresBolagsverketFiling: true,
    requiresTaxDeclarationPackage: true,
    actorId: adminUser.userId
  });
  platform.approveReportingObligationProfile({
    companyId: company.companyId,
    reportingObligationProfileId: reportingObligation.reportingObligationProfileId,
    actorId: adminUser.userId
  });
  postJournal(platform, company.companyId, "phase12-1-unit-income-1", 6300);
  hardCloseYear(platform, company.companyId, period.accountingPeriodId);

  const annualPackage = platform.createAnnualReportPackage({
    companyId: company.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k2",
    legalFormProfileId: legalFormProfile.legalFormProfileId,
    reportingObligationProfileId: reportingObligation.reportingObligationProfileId,
    actorId: adminUser.userId,
    textSections: {
      management_report: "Stable annual report",
      accounting_policies: "K2 policy baseline"
    },
    noteSections: {
      notes_bundle: "General notes",
      simplified_notes: "Simplified K2 notes"
    }
  });
  assert.equal(annualPackage.profileCode, "k2");
  assert.equal(annualPackage.legalFormCode, "AKTIEBOLAG");
  assert.equal(annualPackage.declarationProfileCode, "INK2");
  assert.equal(annualPackage.currentVersion.versionNo, 1);
  assert.equal(annualPackage.currentVersion.checksum.length, 64);

  const signatory = platform.inviteAnnualReportSignatory({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: adminCompanyUser.companyUserId,
    signatoryRole: "ceo"
  });
  assert.equal(signatory.status, "invited");

  const signed = platform.signAnnualReportVersion({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    actorId: adminUser.userId,
    comment: "Signed annual report."
  });
  assert.equal(signed.status, "signed");
  assert.equal(signed.currentVersion.packageStatus, "signed");
  assert.equal(typeof signed.currentVersion.lockedAt, "string");
  assert.equal(signed.currentVersion.signoffHash, signed.currentVersion.checksum);

  platform.reopenAccountingPeriod({
    companyId: company.companyId,
    accountingPeriodId: period.accountingPeriodId,
    actorId: "phase12-1-reopen-requester",
    reasonCode: "material_annual_adjustment",
    approvedByActorId: adminUser.userId,
    approvedByRoleCode: "company_admin"
  });
  postJournal(platform, company.companyId, "phase12-1-unit-income-2", 1200);
  hardCloseYear(platform, company.companyId, period.accountingPeriodId);

  const revised = platform.createAnnualReportVersion({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    actorId: adminUser.userId,
    textSections: {
      management_report: "Stable annual report with adjustment",
      accounting_policies: "K2 policy baseline"
    },
    noteSections: {
      notes_bundle: "General notes updated",
      simplified_notes: "Simplified K2 notes"
    }
  });
  assert.equal(revised.currentVersion.versionNo, 2);
  assert.equal(revised.currentVersion.diffFromPrevious.length > 0, true);

  const diff = platform.diffAnnualReportVersions({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    leftVersionId: annualPackage.versions[0].versionId,
    rightVersionId: revised.currentVersion.versionId
  });
  assert.equal(diff.changes.length > 0, true);
});

function postJournal(platform, companyId, sourceId, amount) {
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-01-15",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "phase12-1-unit",
    idempotencyKey: sourceId,
    lines: [
      { accountNumber: "1510", debitAmount: amount },
      { accountNumber: "3010", creditAmount: amount }
    ]
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-1-unit"
  });
  platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-1-unit"
  });
}

function hardCloseYear(platform, companyId, accountingPeriodId) {
  const snapshot = platform.snapshot();
  const companyAdmin = snapshot.companyUsers.find((candidate) => candidate.companyId === companyId && candidate.roleCode === "company_admin");
  platform.lockAccountingPeriod({
    companyId,
    accountingPeriodId,
    status: "hard_closed",
    actorId: "phase12-1-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: companyAdmin.userId,
    approvedByRoleCode: "company_admin"
  });
}

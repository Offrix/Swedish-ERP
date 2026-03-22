import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 12.1 creates K2/K3 annual packages, tracks signatories and versions changed books", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T14:15:00Z")
  });
  const company = platform.createCompany({
    legalName: "Annual Unit Client AB",
    orgNumber: "559900-5401"
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
  postJournal(platform, company.companyId, "phase12-1-unit-income-1", 6300);
  hardCloseYear(platform, company.companyId, period.accountingPeriodId);

  const annualPackage = platform.createAnnualReportPackage({
    companyId: company.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k2",
    actorId: DEMO_IDS.userId,
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
  assert.equal(annualPackage.currentVersion.versionNo, 1);
  assert.equal(annualPackage.currentVersion.checksum.length, 64);

  const signatory = platform.inviteAnnualReportSignatory({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    companyUserId: DEMO_IDS.companyUserId,
    signatoryRole: "ceo"
  });
  assert.equal(signatory.status, "invited");

  const signed = platform.signAnnualReportVersion({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    versionId: annualPackage.currentVersion.versionId,
    actorId: DEMO_IDS.userId,
    comment: "Signed annual report."
  });
  assert.equal(signed.status, "signed");
  assert.equal(signed.currentVersion.packageStatus, "signed");

  platform.reopenAccountingPeriod({
    companyId: company.companyId,
    accountingPeriodId: period.accountingPeriodId,
    actorId: "phase12-1-reopen-requester",
    reasonCode: "material_annual_adjustment",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
  postJournal(platform, company.companyId, "phase12-1-unit-income-2", 1200);
  hardCloseYear(platform, company.companyId, period.accountingPeriodId);

  const revised = platform.createAnnualReportVersion({
    companyId: company.companyId,
    packageId: annualPackage.packageId,
    actorId: DEMO_IDS.userId,
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
  platform.lockAccountingPeriod({
    companyId,
    accountingPeriodId,
    status: "hard_closed",
    actorId: "phase12-1-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
}

import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

test("Step 35 annual reporting emits evidence packs and opens explicit correction packages", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T11:30:00Z")
  });

  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId: "phase35-unit"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId: "phase35-unit"
  });
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-20",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase35-income",
    actorId: "phase35-unit",
    idempotencyKey: "phase35-income",
    lines: [
      { accountNumber: "1510", debitAmount: 6400 },
      { accountNumber: "3010", creditAmount: 6400 }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase35-unit"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase35-unit"
  });
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    status: "hard_closed",
    actorId: "phase35-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });

  const annualPackage = platform.createAnnualReportPackage({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId: period.accountingPeriodId,
    profileCode: "k2",
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Evidence baseline"
    }
  });
  const evidencePacks = platform.listAnnualEvidencePacks({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId
  });
  const correctionPackage = platform.openAnnualCorrectionPackage({
    companyId: DEMO_IDS.companyId,
    packageId: annualPackage.packageId,
    actorId: DEMO_IDS.userId,
    textSections: {
      management_report: "Evidence correction"
    }
  });

  assert.equal(evidencePacks.length, 1);
  assert.equal(annualPackage.currentEvidencePack.packageFamilyCode, "annual_report_ab");
  assert.equal(annualPackage.currentEvidencePack.declarationProfileCode, "INK2");
  assert.equal(correctionPackage.correctionOfPackageId, annualPackage.packageId);
  assert.equal(correctionPackage.currentEvidencePack.evidencePackId !== annualPackage.currentEvidencePack.evidencePackId, true);
});

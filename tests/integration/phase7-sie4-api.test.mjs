import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";

function ensureDemoSieFixture(platform) {
  const fiscalYears = platform.listFiscalYears({ companyId: DEMO_IDS.companyId });
  if (fiscalYears.length === 0) {
    const fiscalYearProfile = platform.createFiscalYearProfile({
      companyId: DEMO_IDS.companyId,
      legalFormCode: "AKTIEBOLAG",
      actorId: "phase7-sie-api"
    });
    const fiscalYear = platform.createFiscalYear({
      companyId: DEMO_IDS.companyId,
      fiscalYearProfileId: fiscalYearProfile.fiscalYearProfileId,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      approvalBasisCode: "BASELINE",
      actorId: "phase7-sie-api"
    });
    platform.activateFiscalYear({
      companyId: DEMO_IDS.companyId,
      fiscalYearId: fiscalYear.fiscalYearId,
      actorId: "phase7-sie-api"
    });
    platform.installLedgerCatalog({
      companyId: DEMO_IDS.companyId,
      actorId: "phase7-sie-api"
    });
    platform.ensureAccountingYearPeriod({
      companyId: DEMO_IDS.companyId,
      fiscalYear: 2026,
      actorId: "phase7-sie-api"
    });
  }
  for (const account of [
    ["1510", "Kundfordringar", "1"],
    ["3010", "Försäljning varor", "3"]
  ]) {
    platform.upsertLedgerAccount({
      companyId: DEMO_IDS.companyId,
      accountNumber: account[0],
      accountName: account[1],
      accountClass: account[2],
      locked: false,
      allowManualPosting: false,
      actorId: "phase7-sie-api"
    });
  }
}

test("Phase 7.6 API exports and imports SIE4 jobs against live platform routes", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-05T09:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    ensureDemoSieFixture(platform);

    platform.upsertVoucherSeries({
      companyId: DEMO_IDS.companyId,
      seriesCode: "ZQ",
      description: "Phase 7 SIE API series",
      actorId: "phase7-sie-api"
    });

    const created = platform.createJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalDate: "2026-03-15",
      voucherSeriesCode: "ZQ",
      sourceType: "HISTORICAL_IMPORT",
      sourceId: "phase7-sie-api-export",
      description: "API-export-test",
      actorId: "phase7-sie-api",
      idempotencyKey: "phase7-sie-api-export",
      importedFlag: true,
      lines: [
        {
          accountNumber: "1510",
          debitAmount: 900,
          sourceType: "HISTORICAL_IMPORT",
          sourceId: "phase7-sie-api-export-line-1"
        },
        {
          accountNumber: "3010",
          creditAmount: 900,
          sourceType: "HISTORICAL_IMPORT",
          sourceId: "phase7-sie-api-export-line-2"
        }
      ]
    });
    const validated = platform.validateJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId: "phase7-sie-api"
    });
    platform.postJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId: "phase7-sie-api",
      importedVoucherNumber: 29
    });

    const exportJob = await requestJson(baseUrl, "/v1/sie/exports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        idempotencyKey: "phase7-sie-api-export-job"
      }
    });
    const exportList = await requestJson(baseUrl, `/v1/sie/exports?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const exportFetched = await requestJson(
      baseUrl,
      `/v1/sie/exports/${exportJob.sieExportJobId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );

    const importJob = await requestJson(baseUrl, "/v1/sie/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        modeCode: "journal_history",
        idempotencyKey: "phase7-sie-api-import-job",
        content: [
          "#FLAGGA 0",
          "#PROGRAM \"Fixture\" \"1.0\"",
          "#FORMAT PC8",
          "#SIETYP 4",
          "#FNAMN \"Demo Company\"",
          "#ORGNR 556677-8899",
          "#RAR 0 20260101 20261231",
          "#KONTO 1510 \"Kundfordringar\"",
          "#KONTO 3010 \"Försäljning\"",
          "#VER ZI 47 20260320 \"API-import-test\"",
          "{",
          "#TRANS 1510 {} 1100.00 20260320 \"API-import-test\"",
          "#TRANS 3010 {} -1100.00 20260320 \"API-import-test\"",
          "}"
        ].join("\r\n")
      }
    });
    const importList = await requestJson(baseUrl, `/v1/sie/imports?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const importFetched = await requestJson(
      baseUrl,
      `/v1/sie/imports/${importJob.sieImportJobId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: adminToken
      }
    );

    const importedJournal = platform.getJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: importJob.importedJournalEntryIds[0]
    });

    assert.equal(exportList.items.some((item) => item.sieExportJobId === exportJob.sieExportJobId), true);
    assert.equal(exportFetched.sieExportJobId, exportJob.sieExportJobId);
    assert.match(exportJob.content, /#SIETYP 4/);
    assert.match(exportJob.content, /#VER ZQ 29 20260315 "API-export-test"/);
    assert.equal(importList.items.some((item) => item.sieImportJobId === importJob.sieImportJobId), true);
    assert.equal(importFetched.sieImportJobId, importJob.sieImportJobId);
    assert.equal(importJob.importedJournalEntryIds.length, 1);
    assert.equal(importedJournal.voucherSeriesCode, "ZI");
    assert.equal(importedJournal.voucherNumber, 47);
    assert.equal(importedJournal.importedFlag, true);
  } finally {
    await stopServer(server);
  }
});

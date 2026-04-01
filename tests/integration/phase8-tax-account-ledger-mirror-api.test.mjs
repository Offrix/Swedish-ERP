import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 8.5 API exposes mirrored tax-account journals for assessments and manual adjustments", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-31T10:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: DEMO_IDS.companyId,
    actorId: "phase8-tax-account-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: DEMO_IDS.companyId,
    fiscalYear: 2026,
    actorId: "phase8-tax-account-api"
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

    platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "vat_run_phase85_api_2026_02",
      sourceReference: "VAT-PHASE85-API-2026-02",
      periodKey: "2026-02",
      dueDate: "2026-03-12",
      amount: 9300,
      actorId: DEMO_IDS.userId
    });

    const imported = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-03-31",
        events: [
          {
            eventTypeCode: "VAT_ASSESSMENT",
            eventDate: "2026-03-12",
            postingDate: "2026-03-12",
            amount: 9300,
            externalReference: "SKV-VAT-PHASE85-API"
          }
        ]
      }
    });
    await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const events = await requestJson(
      baseUrl,
      `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}&eventTypeCode=VAT_ASSESSMENT`,
      { token: adminToken }
    );
    const mirroredAssessment = events.items.find((item) => item.taxAccountEventId === imported.items[0].taxAccountEventId);
    assert.ok(mirroredAssessment.journalEntryId);
    assert.equal(mirroredAssessment.ledgerPostingStatus, "posted");

    const manualImport = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-03-31",
        events: [
          {
            eventTypeCode: "MANUAL_ADJUSTMENT",
            effectDirection: "debit",
            eventDate: "2026-03-31",
            postingDate: "2026-03-31",
            amount: 400,
            externalReference: "SKV-MANUAL-PHASE85-API"
          }
        ]
      }
    });
    const manualReconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(manualReconciliation.discrepancyCaseIds.length >= 1, true);

    const manualClassification = await requestJson(
      baseUrl,
      `/v1/tax-account/events/${manualImport.items[0].taxAccountEventId}/classify`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          liabilityTypeCode: "F_TAX",
          ledgerCounterAccountNumber: "2510",
          differenceCaseId: manualReconciliation.discrepancyCaseIds[0],
          resolutionNote: "Mapped to income-tax ledger mirror."
        }
      }
    );
    assert.ok(manualClassification.event.journalEntryId);
    assert.equal(manualClassification.event.ledgerCounterAccountNumber, "2510");
    assert.equal(manualClassification.event.reconciliationStatus, "closed");
  } finally {
    await stopServer(server);
  }
});

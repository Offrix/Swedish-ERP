import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 48 tax-account golden offset API scenario settles AGI before VAT and preserves remaining VAT liability", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T07:00:00Z")
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

    const agiLiability = platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "AGI",
      sourceDomainCode: "PAYROLL",
      sourceObjectType: "agi_run",
      sourceObjectId: "agi_run_phase48_2026_01",
      sourceReference: "AGI-2026-01",
      periodKey: "2026-01",
      dueDate: "2026-01-10",
      amount: 12000,
      actorId: "phase48-tax-account"
    });
    const vatLiability = platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "vat_run_phase48_2026_01",
      sourceReference: "VAT-2026-01",
      periodKey: "2026-01",
      dueDate: "2026-01-11",
      amount: 15000,
      actorId: "phase48-tax-account"
    });

    const importResponse = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-01-12",
        events: [
          {
            eventTypeCode: "AGI_ASSESSMENT",
            eventDate: "2026-01-10",
            postingDate: "2026-01-10",
            amount: 12000,
            externalReference: "SKV-AGI-PHASE48-2026-01",
            sourceObjectType: "agi_run",
            sourceObjectId: "agi_run_phase48_2026_01",
            periodKey: "2026-01"
          },
          {
            eventTypeCode: "VAT_ASSESSMENT",
            eventDate: "2026-01-11",
            postingDate: "2026-01-11",
            amount: 15000,
            externalReference: "SKV-VAT-PHASE48-2026-01",
            sourceObjectType: "vat_declaration_run",
            sourceObjectId: "vat_run_phase48_2026_01",
            periodKey: "2026-01"
          },
          {
            eventTypeCode: "PAYMENT",
            eventDate: "2026-01-12",
            postingDate: "2026-01-12",
            amount: 20000,
            externalReference: "SKV-PAY-PHASE48-2026-01"
          }
        ]
      }
    });
    assert.equal(importResponse.importBatch.importedCount, 3);

    const reconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    assert.equal(reconciliation.suggestedOffsets.length >= 2, true);
    const agiSuggestion = reconciliation.suggestedOffsets.find(
      (item) => item.reconciliationItemId === agiLiability.reconciliationItemId
    );
    const vatSuggestion = reconciliation.suggestedOffsets.find(
      (item) => item.reconciliationItemId === vatLiability.reconciliationItemId
    );

    assert.ok(agiSuggestion);
    assert.ok(vatSuggestion);
    assert.equal(agiSuggestion.priority, 1);
    assert.equal(agiSuggestion.offsetAmount, 12000);
    assert.equal(vatSuggestion.priority, 2);
    assert.equal(vatSuggestion.offsetAmount, 8000);

    const approvedAgi = await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        taxAccountEventId: agiSuggestion.taxAccountEventId,
        reconciliationItemId: agiSuggestion.reconciliationItemId,
        offsetAmount: agiSuggestion.offsetAmount,
        offsetReasonCode: agiSuggestion.offsetReasonCode,
        reconciliationRunId: reconciliation.reconciliationRunId
      }
    });
    const approvedVat = await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        taxAccountEventId: vatSuggestion.taxAccountEventId,
        reconciliationItemId: vatSuggestion.reconciliationItemId,
        offsetAmount: vatSuggestion.offsetAmount,
        offsetReasonCode: vatSuggestion.offsetReasonCode,
        reconciliationRunId: reconciliation.reconciliationRunId
      }
    });

    assert.equal(approvedAgi.status, "approved");
    assert.equal(approvedVat.status, "approved");

    const reconciliationsResponse = await requestJson(
      baseUrl,
      `/v1/tax-account/reconciliations?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    const paymentEvent = importResponse.items.find((item) => item.eventTypeCode === "PAYMENT");
    const eventsResponse = await requestJson(
      baseUrl,
      `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}&eventTypeCode=PAYMENT`,
      { token: adminToken }
    );

    const agiState = platform.getExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      reconciliationItemId: agiLiability.reconciliationItemId
    });
    const vatState = platform.getExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      reconciliationItemId: vatLiability.reconciliationItemId
    });

    assert.equal(agiState.status, "settled");
    assert.equal(agiState.remainingSettlementAmount, 0);
    assert.equal(vatState.status, "partially_offset");
    assert.equal(vatState.remainingSettlementAmount, 7000);
    assert.equal(reconciliationsResponse.balance.openCreditAmount, 0);
    assert.equal(reconciliationsResponse.balance.openSettlementAmount, 12000);
    assert.equal(reconciliationsResponse.openDifferenceCases.length, 0);
    assert.equal(
      eventsResponse.items.some(
        (item) => item.taxAccountEventId === paymentEvent.taxAccountEventId && item.remainingOffsetAmount === 0
      ),
      true
    );
  } finally {
    await stopServer(server);
  }
});

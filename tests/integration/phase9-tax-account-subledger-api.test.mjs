import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 9.5 API exposes tax-account liabilities, manual classification and offset suggestions", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T11:00:00Z")
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

    const importResponse = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-03-28",
        events: [
          {
            eventTypeCode: "VAT_ASSESSMENT",
            eventDate: "2026-03-12",
            postingDate: "2026-03-12",
            amount: 9300,
            externalReference: "SKV-VAT-PHASE95-API",
            periodKey: "2026-02"
          }
        ]
      }
    });
    const reconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reconciliation.discrepancyCaseIds.length, 1);

    const expectedLiability = platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "vat_run_phase95_api_2026_02",
      sourceReference: "VAT-PHASE95-API-2026-02",
      periodKey: "2026-02",
      dueDate: "2026-03-12",
      amount: 9300,
      actorId: DEMO_IDS.userId
    });

    const classified = await requestJson(
      baseUrl,
      `/v1/tax-account/events/${importResponse.items[0].taxAccountEventId}/classify`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          reconciliationItemId: expectedLiability.reconciliationItemId,
          differenceCaseId: reconciliation.discrepancyCaseIds[0],
          resolutionNote: "Linked after finance review."
        }
      }
    );
    assert.equal(classified.event.reconciliationStatus, "closed");
    assert.equal(classified.balance.openDifferenceCaseCount, 0);

    const liabilities = await requestJson(
      baseUrl,
      `/v1/tax-account/liabilities?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(
      liabilities.items.some(
        (item) => item.reconciliationItemId === expectedLiability.reconciliationItemId && item.status === "assessment_matched"
      ),
      true
    );

    await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-03-28",
        events: [
          {
            eventTypeCode: "PAYMENT",
            eventDate: "2026-03-28",
            postingDate: "2026-03-28",
            amount: 9300,
            externalReference: "SKV-PAY-PHASE95-API"
          }
        ]
      }
    });
    const paymentReconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    const suggestions = await requestJson(
      baseUrl,
      `/v1/tax-account/offset-suggestions?companyId=${DEMO_IDS.companyId}&reconciliationRunId=${paymentReconciliation.reconciliationRunId}`,
      { token: adminToken }
    );
    assert.equal(suggestions.items.length >= 1, true);

    await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        taxAccountEventId: suggestions.items[0].taxAccountEventId,
        reconciliationItemId: suggestions.items[0].reconciliationItemId,
        offsetAmount: suggestions.items[0].offsetAmount,
        offsetReasonCode: suggestions.items[0].offsetReasonCode,
        reconciliationRunId: paymentReconciliation.reconciliationRunId
      }
    });

    const offsets = await requestJson(
      baseUrl,
      `/v1/tax-account/offsets?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(offsets.items.length >= 1, true);
    assert.equal(offsets.balance.openSettlementAmount >= 0, true);
  } finally {
    await stopServer(server);
  }
});

test("Step 9.5 API exposes discrepancy review and waiver lifecycle", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T12:00:00Z")
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

    await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-03-28",
        events: [
          {
            eventTypeCode: "FEE",
            eventDate: "2026-03-12",
            postingDate: "2026-03-12",
            amount: 500,
            externalReference: "SKV-FEE-PHASE95-API"
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

    const openCases = await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases?companyId=${DEMO_IDS.companyId}&status=open`,
      { token: adminToken }
    );
    assert.equal(openCases.items.length >= 1, true);

    const reviewed = await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases/${openCases.items[0].discrepancyCaseId}/review`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          reviewNote: "Reviewed before waiver."
        }
      }
    );
    assert.equal(reviewed.status, "reviewed");

    const waived = await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases/${openCases.items[0].discrepancyCaseId}/waive`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          waiverReasonCode: "manual_reconciliation_outside_platform",
          resolutionNote: "Handled outside platform during migration."
        }
      }
    );
    assert.equal(waived.status, "waived");

    const stored = await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases/${openCases.items[0].discrepancyCaseId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(stored.item.status, "waived");

    const remainingOpenCases = await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases?companyId=${DEMO_IDS.companyId}&status=open`,
      { token: adminToken }
    );
    assert.equal(remainingOpenCases.items.length, 0);
  } finally {
    await stopServer(server);
  }
});

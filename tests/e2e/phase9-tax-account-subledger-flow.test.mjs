import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 9.5 end-to-end tax-account subledger flow clears blockers through classification and waiver", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T13:00:00Z")
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
            externalReference: "SKV-VAT-PHASE95-E2E",
            periodKey: "2026-02"
          },
          {
            eventTypeCode: "PAYMENT",
            eventDate: "2026-03-28",
            postingDate: "2026-03-28",
            amount: 9300,
            externalReference: "SKV-PAY-PHASE95-E2E"
          },
          {
            eventTypeCode: "FEE",
            eventDate: "2026-03-28",
            postingDate: "2026-03-28",
            amount: 250,
            externalReference: "SKV-FEE-PHASE95-E2E"
          }
        ]
      }
    });

    const firstRun = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: { companyId: DEMO_IDS.companyId }
    });
    assert.equal(firstRun.discrepancyCaseIds.length >= 2, true);

    const casesBefore = await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    const assessmentEvent = importResponse.items.find((item) => item.eventTypeCode === "VAT_ASSESSMENT");
    const feeEvent = importResponse.items.find((item) => item.eventTypeCode === "FEE");
    const assessmentCase = casesBefore.items.find((item) => item.taxAccountEventId === assessmentEvent.taxAccountEventId);
    const feeCase = casesBefore.items.find((item) => item.taxAccountEventId === feeEvent.taxAccountEventId);
    assert.ok(assessmentCase);
    assert.ok(feeCase);

    const vatLiability = platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "vat_run_phase95_e2e_2026_02",
      sourceReference: "VAT-PHASE95-E2E-2026-02",
      periodKey: "2026-02",
      dueDate: "2026-03-12",
      amount: 9300,
      actorId: DEMO_IDS.userId
    });

    const classified = await requestJson(
      baseUrl,
      `/v1/tax-account/events/${assessmentEvent.taxAccountEventId}/classify`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          reconciliationItemId: vatLiability.reconciliationItemId,
          differenceCaseId: assessmentCase.discrepancyCaseId,
          resolutionNote: "Manual finance mapping after expected liability registration."
        }
      }
    );
    assert.equal(classified.differenceCase.status, "resolved");

    const secondRun = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: { companyId: DEMO_IDS.companyId }
    });
    const paymentSuggestion = secondRun.suggestedOffsets.find(
      (item) => item.reconciliationItemId === vatLiability.reconciliationItemId
    );
    assert.ok(paymentSuggestion);

    await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        taxAccountEventId: paymentSuggestion.taxAccountEventId,
        reconciliationItemId: paymentSuggestion.reconciliationItemId,
        offsetAmount: paymentSuggestion.offsetAmount,
        offsetReasonCode: paymentSuggestion.offsetReasonCode,
        reconciliationRunId: secondRun.reconciliationRunId
      }
    });

    await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases/${feeCase.discrepancyCaseId}/review`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          reviewNote: "Fee reviewed before waiver."
        }
      }
    );
    await requestJson(
      baseUrl,
      `/v1/tax-account/discrepancy-cases/${feeCase.discrepancyCaseId}/waive`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          waiverReasonCode: "manual_reconciliation_outside_platform",
          resolutionNote: "Fee handled outside platform."
        }
      }
    );

    const summary = await requestJson(
      baseUrl,
      `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    const paymentEvent = summary.items.find((item) => item.externalReference === "SKV-PAY-PHASE95-E2E");
    assert.deepEqual(summary.balance.blockerCodes, []);
    assert.equal(summary.balance.readyForClose, true);
    assert.equal(["partially_matched", "closed"].includes(paymentEvent.reconciliationStatus), true);
  } finally {
    await stopServer(server);
  }
});

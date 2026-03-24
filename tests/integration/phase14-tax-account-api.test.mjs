import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 11 API imports tax-account events, creates reconciliation and approves offsets", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T12:00:00Z")
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

    const expectedLiability = platform.registerExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      liabilityTypeCode: "VAT",
      sourceDomainCode: "VAT",
      sourceObjectType: "vat_declaration_run",
      sourceObjectId: "vat_run_2026_03",
      sourceReference: "VAT-2026-03",
      periodKey: "2026-03",
      dueDate: "2026-01-05",
      amount: 9300,
      actorId: DEMO_IDS.userId
    });

    const importResponse = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-01-05",
        events: [
          {
            eventTypeCode: "VAT_ASSESSMENT",
            eventDate: "2026-01-05",
            postingDate: "2026-01-05",
            amount: 9300,
            externalReference: "SKV-VAT-2026-03",
            sourceObjectType: "vat_declaration_run",
            sourceObjectId: "vat_run_2026_03",
            periodKey: "2026-03"
          },
          {
            eventTypeCode: "PAYMENT",
            eventDate: "2026-01-05",
            postingDate: "2026-01-05",
            amount: 9300,
            externalReference: "SKV-PAY-2026-01-05"
          }
        ]
      }
    });
    assert.equal(importResponse.importBatch.importedCount, 2);

    const replayImport = await requestJson(baseUrl, "/v1/tax-account/imports", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        importSource: "SKV_CSV",
        statementDate: "2026-01-05",
        events: [
          {
            eventTypeCode: "PAYMENT",
            eventDate: "2026-01-05",
            postingDate: "2026-01-05",
            amount: 9300,
            externalReference: "SKV-PAY-2026-01-05"
          }
        ]
      }
    });
    assert.equal(replayImport.importBatch.duplicateCount >= 1, true);

    const reconciliation = await requestJson(baseUrl, "/v1/tax-account/reconciliations", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reconciliation.suggestedOffsets.length >= 1, true);

    const approvedOffset = await requestJson(baseUrl, "/v1/tax-account/offsets", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        taxAccountEventId: reconciliation.suggestedOffsets[0].taxAccountEventId,
        reconciliationItemId: reconciliation.suggestedOffsets[0].reconciliationItemId,
        offsetAmount: reconciliation.suggestedOffsets[0].offsetAmount,
        offsetReasonCode: reconciliation.suggestedOffsets[0].offsetReasonCode,
        reconciliationRunId: reconciliation.reconciliationRunId
      }
    });
    assert.equal(approvedOffset.status, "approved");

    const eventsResponse = await requestJson(
      baseUrl,
      `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(eventsResponse.items.some((item) => item.eventTypeCode === "PAYMENT" && item.remainingOffsetAmount === 0), true);

    const reconciliationsResponse = await requestJson(
      baseUrl,
      `/v1/tax-account/reconciliations?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(reconciliationsResponse.balance.openCreditAmount, 0);

    const liability = platform.getExpectedTaxLiability({
      companyId: DEMO_IDS.companyId,
      reconciliationItemId: expectedLiability.reconciliationItemId
    });
    assert.equal(liability.status, "settled");
  } finally {
    await stopServer(server);
  }
});

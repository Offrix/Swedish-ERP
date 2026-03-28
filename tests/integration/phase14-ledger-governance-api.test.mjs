import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 8.3 API governs ledger accounts, dimensions and voucher-series profiles", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T09:00:00Z")
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

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const governedAccount = await requestJson(baseUrl, "/v1/ledger/accounts", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        accountNumber: "6540",
        accountName: "API-governed consulting",
        accountClass: "6",
        requiredDimensionKeys: ["serviceLineCode"]
      }
    });
    assert.equal(governedAccount.requiredDimensionKeys.includes("serviceLineCode"), true);

    const dimensionCreate = await requestJson(baseUrl, "/v1/ledger/dimensions/serviceLines", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        code: "SL-CONSULT",
        label: "Consulting delivery"
      }
    });
    assert.equal(dimensionCreate.dimensionType, "serviceLines");

    const dimensions = await requestJson(baseUrl, `/v1/ledger/dimensions?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(dimensions.catalogVersion >= 2, true);
    assert.equal(dimensions.serviceLines.some((item) => item.code === "SL-CONSULT"), true);

    const missingDimension = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: adminToken,
      expectedStatus: 400,
      body: {
        companyId: DEMO_IDS.companyId,
        journalDate: "2026-03-28",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase8-3-api-missing-dimension",
        idempotencyKey: "phase8-3-api-missing-dimension",
        description: "Missing governed dimension",
        lines: [
          { accountNumber: "6540", debitAmount: 1400 },
          { accountNumber: "2010", creditAmount: 1400 }
        ]
      }
    });
    assert.equal(missingDimension.error, "required_dimension_missing");

    const created = await requestJson(baseUrl, "/v1/ledger/journal-entries", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        journalDate: "2026-03-28",
        voucherSeriesCode: "A",
        sourceType: "MANUAL_JOURNAL",
        sourceId: "phase8-3-api-dimension-ok",
        idempotencyKey: "phase8-3-api-dimension-ok",
        description: "Governed dimension ok",
        lines: [
          {
            accountNumber: "6540",
            debitAmount: 1400,
            dimensionJson: {
              serviceLineCode: "SL-CONSULT"
            }
          },
          { accountNumber: "2010", creditAmount: 1400 }
        ]
      }
    });
    assert.equal(created.journalEntry.dimensionCatalogVersion, dimensions.catalogVersion);
    assert.equal(created.journalEntry.lines[0].dimensionJson.serviceLineCode, "SL-CONSULT");
    assert.equal(typeof created.journalEntry.lines[0].accountVersion, "number");

    await requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/validate`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    await requestJson(baseUrl, `/v1/ledger/journal-entries/${created.journalEntry.journalEntryId}/post`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });

    const seriesChangeDenied = await requestJson(baseUrl, "/v1/ledger/voucher-series", {
      method: "POST",
      token: adminToken,
      expectedStatus: 409,
      body: {
        companyId: DEMO_IDS.companyId,
        seriesCode: "A",
        description: "Repurpose after use",
        purposeCodes: ["AR_INVOICE"],
        changeReasonCode: "attempted_repurpose_after_use"
      }
    });
    assert.equal(seriesChangeDenied.error, "voucher_series_purposes_locked_after_use");
  } finally {
    await stopServer(server);
  }
});

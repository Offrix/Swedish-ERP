import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 12.1 end-to-end flow exposes annual reporting routes and signs a package", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T14:45:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/annual-reporting/packages"), true);
    assert.equal(root.routes.includes("/v1/annual-reporting/packages/:packageId/versions/:versionId/sign"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    platform.installLedgerCatalog({
      companyId: DEMO_IDS.companyId,
      actorId: "phase12-e2e"
    });
    const period = platform.ensureAccountingYearPeriod({
      companyId: DEMO_IDS.companyId,
      fiscalYear: 2026,
      actorId: "phase12-e2e"
    });
    const created = platform.createJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalDate: "2026-01-17",
      voucherSeriesCode: "A",
      sourceType: "MANUAL_JOURNAL",
      sourceId: "phase12-e2e-income",
      actorId: "phase12-e2e",
      idempotencyKey: "phase12-e2e-income",
      lines: [
        { accountNumber: "1510", debitAmount: 8200 },
        { accountNumber: "3010", creditAmount: 8200 }
      ]
    });
    platform.validateJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId: "phase12-e2e"
    });
    platform.postJournalEntry({
      companyId: DEMO_IDS.companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId: "phase12-e2e"
    });
    platform.lockAccountingPeriod({
      companyId: DEMO_IDS.companyId,
      accountingPeriodId: period.accountingPeriodId,
      status: "hard_closed",
      actorId: "phase12-e2e-close-requester",
      reasonCode: "annual_reporting_ready",
      approvedByActorId: DEMO_IDS.userId,
      approvedByRoleCode: "company_admin"
    });

    const annualPackage = await requestJson(baseUrl, "/v1/annual-reporting/packages", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        accountingPeriodId: period.accountingPeriodId,
        profileCode: "k2",
        textSections: {
          management_report: "Annual package",
          accounting_policies: "K2 policies"
        },
        noteSections: {
          notes_bundle: "Notes",
          simplified_notes: "Simplified notes"
        }
      }
    });

    await requestJson(baseUrl, `/v1/annual-reporting/packages/${annualPackage.packageId}/versions/${annualPackage.currentVersion.versionId}/signatories`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        signatoryRole: "ceo"
      }
    });

    const signed = await requestJson(baseUrl, `/v1/annual-reporting/packages/${annualPackage.packageId}/versions/${annualPackage.currentVersion.versionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        comment: "Signed annual package"
      }
    });
    assert.equal(signed.status, "signed");
    assert.equal(signed.currentVersion.packageStatus, "signed");
  } finally {
    await stopServer(server);
  }
});

async function loginWithStrongAuth({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  const bankidStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
    method: "POST",
    token: started.sessionToken
  });
  await requestJson(baseUrl, "/v1/auth/bankid/collect", {
    method: "POST",
    token: started.sessionToken,
    body: {
      orderRef: bankidStart.orderRef,
      completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
    }
  });
  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}

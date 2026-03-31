import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly } from "../helpers/api-helpers.mjs";

test("Phase 12.1 API creates annual report package, signs it and versions changed books", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T14:30:00Z")
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
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "annual-reporting-field@example.test",
      displayName: "Annual Reporting Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "annual-reporting-field@example.test"
    });

    platform.installLedgerCatalog({
      companyId: DEMO_IDS.companyId,
      actorId: "phase12-api"
    });
    const period = platform.ensureAccountingYearPeriod({
      companyId: DEMO_IDS.companyId,
      fiscalYear: 2026,
      actorId: "phase12-api"
    });
    postJournal(platform, "phase12-api-income-1", 7100);
    hardCloseYear(platform, period.accountingPeriodId);

    const annualPackage = await requestJson(`${baseUrl}/v1/annual-reporting/packages`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        accountingPeriodId: period.accountingPeriodId,
        profileCode: "k3",
        textSections: {
          management_report: "K3 annual report",
          accounting_policies: "K3 policies",
          material_events: "No material events"
        },
        noteSections: {
          notes_bundle: "K3 notes",
          cash_flow_commentary: "Cash flow note",
          related_party_commentary: "Related parties note"
        }
      }
    });
    assert.equal(annualPackage.currentVersion.versionNo, 1);
    assert.deepEqual(
      annualPackage.currentVersion.rulepackRefs.map((entry) => entry.rulepackId).sort(),
      ["annual-filing-se-2026.1", "legal-form-se-2026.1"]
    );
    assert.deepEqual(
      annualPackage.currentVersion.providerBaselineRefs.map((entry) => entry.providerBaselineId),
      ["annual-ixbrl-se-2026.1"]
    );
    assert.equal(typeof annualPackage.currentVersion.providerBaselineRefs[0].providerBaselineVersion, "string");
    assert.equal(typeof annualPackage.currentVersion.providerBaselineRefs[0].providerBaselineChecksum, "string");

    const listed = await requestJson(`${baseUrl}/v1/annual-reporting/packages?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(listed.items.length, 1);

    await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/versions/${annualPackage.currentVersion.versionId}/signatories`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        companyUserId: DEMO_IDS.companyUserId,
        signatoryRole: "ceo"
      }
    });

    const signed = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/versions/${annualPackage.currentVersion.versionId}/sign`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        comment: "Signed"
      }
    });
    assert.equal(signed.status, "signed");

    platform.reopenAccountingPeriod({
      companyId: DEMO_IDS.companyId,
      accountingPeriodId: period.accountingPeriodId,
      actorId: "phase12-api-reopen-requester",
      reasonCode: "annual_adjustment",
      approvedByActorId: DEMO_IDS.userId,
      approvedByRoleCode: "company_admin"
    });
    postJournal(platform, "phase12-api-income-2", 900);
    hardCloseYear(platform, period.accountingPeriodId);

    const revised = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/versions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        textSections: {
          management_report: "K3 annual report revised",
          accounting_policies: "K3 policies",
          material_events: "Adjustment posted"
        },
        noteSections: {
          notes_bundle: "K3 notes revised",
          cash_flow_commentary: "Cash flow note",
          related_party_commentary: "Related parties note"
        }
      }
    });
    assert.equal(revised.currentVersion.versionNo, 2);

    const diff = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/versions/${revised.currentVersion.versionId}/diff?companyId=${DEMO_IDS.companyId}&leftVersionId=${annualPackage.versions[0].versionId}`, {
      token: adminToken
    });
    assert.equal(diff.changes.length > 0, true);

    const forbiddenList = await fetch(`${baseUrl}/v1/annual-reporting/packages?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenList.status, 403);
    await forbiddenList.json();
  } finally {
    await stopServer(server);
  }
});

function postJournal(platform, sourceId, amount) {
  const created = platform.createJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalDate: "2026-01-16",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId,
    actorId: "phase12-api",
    idempotencyKey: sourceId,
    lines: [
      { accountNumber: "1510", debitAmount: amount },
      { accountNumber: "3010", creditAmount: amount }
    ]
  });
  platform.validateJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-api"
  });
  platform.postJournalEntry({
    companyId: DEMO_IDS.companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase12-api"
  });
}

function hardCloseYear(platform, accountingPeriodId) {
  platform.lockAccountingPeriod({
    companyId: DEMO_IDS.companyId,
    accountingPeriodId,
    status: "hard_closed",
    actorId: "phase12-api-close-requester",
    reasonCode: "annual_reporting_ready",
    approvedByActorId: DEMO_IDS.userId,
    approvedByRoleCode: "company_admin"
  });
}

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}

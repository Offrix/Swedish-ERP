import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly } from "../helpers/api-helpers.mjs";

test("Step 34-35 API creates legal-form profiles, approves obligations and exposes annual evidence", async () => {
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
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "legal-form-field@example.test",
      displayName: "Legal Form Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "legal-form-field@example.test"
    });
    const period = prepareAccounting(platform, DEMO_IDS.companyId);

    const legalFormProfile = await requestJson(`${baseUrl}/v1/legal-forms/profiles`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalFormCode: "EKONOMISK_FORENING",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2025-12-31"
      }
    });
    const fetchedProfile = await requestJson(`${baseUrl}/v1/legal-forms/profiles/${legalFormProfile.legalFormProfileId}?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(fetchedProfile.legalFormCode, "EKONOMISK_FORENING");
    const obligation = await requestJson(`${baseUrl}/v1/legal-forms/reporting-obligations`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalFormProfileId: legalFormProfile.legalFormProfileId,
        fiscalYearKey: "2025",
        requiresAnnualReport: true,
        requiresYearEndAccounts: false,
        requiresBolagsverketFiling: true,
        requiresTaxDeclarationPackage: true
      }
    });
    const approvedObligation = await requestJson(`${baseUrl}/v1/legal-forms/reporting-obligations/${obligation.reportingObligationProfileId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(approvedObligation.status, "approved");
    const declarationProfile = await requestJson(`${baseUrl}/v1/legal-forms/declaration-profile?companyId=${DEMO_IDS.companyId}&asOfDate=2026-12-31&fiscalYearKey=2026&accountingPeriodId=${period.accountingPeriodId}`, {
      token: adminToken
    });
    assert.equal(declarationProfile.declarationProfileCode, "INK2");
    platform.lockAccountingPeriod({
      companyId: DEMO_IDS.companyId,
      accountingPeriodId: period.accountingPeriodId,
      status: "hard_closed",
      actorId: "phase34-legal-form-close",
      reasonCode: "annual_reporting_ready",
      approvedByActorId: DEMO_IDS.userId,
      approvedByRoleCode: "company_admin"
    });

    const annualPackage = await requestJson(`${baseUrl}/v1/annual-reporting/packages`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        accountingPeriodId: period.accountingPeriodId,
        profileCode: "k2",
        textSections: {
          management_report: "Legal-form API annual package"
        }
      }
    });
    const evidence = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/evidence?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const correction = await requestJson(`${baseUrl}/v1/annual-reporting/packages/${annualPackage.packageId}/corrections`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        textSections: {
          management_report: "Legal-form API correction"
        }
      }
    });

    assert.equal(evidence.items.length, 1);
    assert.equal(annualPackage.legalFormCode, "AKTIEBOLAG");
    assert.equal(correction.correctionOfPackageId, annualPackage.packageId);

    const forbiddenProfiles = await fetch(`${baseUrl}/v1/legal-forms/profiles?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenProfiles.status, 403);
    await forbiddenProfiles.json();
  } finally {
    await stopServer(server);
  }
});

test("Step 34 API rejects invalid legal-form reporting obligation combinations", async () => {
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

    const soleTraderProfile = await requestJson(`${baseUrl}/v1/legal-forms/profiles`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalFormCode: "ENSKILD_NARINGSVERKSAMHET",
        effectiveFrom: "2025-01-01",
        effectiveTo: "2025-12-31"
      }
    });

    const invalidObligation = await fetch(`${baseUrl}/v1/legal-forms/reporting-obligations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,        "idempotency-key": crypto.randomUUID(),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        legalFormProfileId: soleTraderProfile.legalFormProfileId,
        fiscalYearKey: "2025",
        requiresAnnualReport: false,
        requiresYearEndAccounts: true,
        requiresBolagsverketFiling: true,
        requiresTaxDeclarationPackage: true
      })
    });
    const invalidPayload = await invalidObligation.json();

    assert.equal(invalidObligation.status, 409, JSON.stringify(invalidPayload));
    assert.equal(invalidPayload.error, "sole_trader_bolagsverket_filing_not_supported");
  } finally {
    await stopServer(server);
  }
});

function prepareAccounting(platform, companyId) {
  platform.installLedgerCatalog({
    companyId,
    actorId: "phase34-api"
  });
  const period = platform.ensureAccountingYearPeriod({
    companyId,
    fiscalYear: 2026,
    actorId: "phase34-api"
  });
  const created = platform.createJournalEntry({
    companyId,
    journalDate: "2026-01-22",
    voucherSeriesCode: "A",
    sourceType: "MANUAL_JOURNAL",
    sourceId: "phase34-api-income",
    actorId: "phase34-api",
    idempotencyKey: "phase34-api-income",
    lines: [
      { accountNumber: "1510", debitAmount: 5000 },
      { accountNumber: "3010", creditAmount: 5000 }
    ]
  });
  platform.validateJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase34-api"
  });
  platform.postJournalEntry({
    companyId,
    journalEntryId: created.journalEntry.journalEntryId,
    actorId: "phase34-api"
  });
  return period;
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
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}

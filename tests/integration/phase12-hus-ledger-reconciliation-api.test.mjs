import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.2 API exposes submission, customer-difference and payout reconciliation for HUS claims", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase12-hus-ledger-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase12-hus-ledger-api"
  });

  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true,
      phase10BuildEnabled: true
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const husCase = await createBaseCase({
      baseUrl,
      token: sessionToken,
      caseReference: "HUS-12-LEDGER-API-001",
      propertyDesignation: "UPPSALA SUNNERSTA 1:51"
    });
    const claim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });
    const submittedClaim = await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        submittedOn: "2026-03-16"
      }
    });
    assert.ok(submittedClaim.submissionJournalEntryId);
    assert.ok(submittedClaim.authorityReceivableId);
    const submissionJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: submittedClaim.submissionJournalEntryId
    });
    assert.equal(submissionJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_SUBMITTED");

    const decision = await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/decisions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        decisionDate: "2026-03-18",
        approvedAmount: 2500,
        rejectedAmount: 500,
        reasonCode: "partial_acceptance",
        rejectedOutcomeCode: "customer_reinvoice"
      }
    });

    const resolvedDifference = await requestJson(baseUrl, `/v1/hus/decision-differences/${decision.husDecisionDifference.husDecisionDifferenceId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "customer_reinvoice",
        resolutionNote: "Customer reinvoiced."
      }
    });
    assert.ok(resolvedDifference.husCustomerReceivableId);
    const differenceJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: resolvedDifference.resolutionJournalEntryId
    });
    assert.equal(differenceJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_DIFFERENCE_CUSTOMER_RECEIVABLE");

    const payout = await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/payouts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutDate: "2026-03-20",
        payoutAmount: 2500,
        settlementModelCode: "tax_account"
      }
    });
    const payoutJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: payout.husPayout.journalEntryId
    });
    assert.equal(payoutJournal.metadataJson.postingRecipeCode, "HUS_PAYOUT_SETTLED");
    assert.equal(payoutJournal.metadataJson.settlementModelCode, "tax_account");
    assert.equal(payoutJournal.metadataJson.settlementAccountNumber, "1120");

    const projectedCase = platform.getHusCase({
      companyId: COMPANY_ID,
      husCaseId: husCase.husCaseId
    });
    assert.equal(projectedCase.authorityReceivables.length, 1);
    assert.equal(projectedCase.customerReceivables.length, 1);
    assert.equal(projectedCase.authorityReceivables[0].status, "paid_out");
    assert.equal(projectedCase.customerReceivables[0].outstandingAmount, 500);
  } finally {
    await stopServer(server);
  }
});

test("Phase 12.2 API writes off fully rejected HUS claims with canonical write-off posting", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase12-hus-ledger-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase12-hus-ledger-api"
  });

  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase2DocumentArchiveEnabled: true,
      phase2CompanyInboxEnabled: true,
      phase2OcrReviewEnabled: true,
      phase3LedgerEnabled: true,
      phase4VatEnabled: true,
      phase5ArEnabled: true,
      phase6ApEnabled: true,
      phase10BuildEnabled: true
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const husCase = await createBaseCase({
      baseUrl,
      token: sessionToken,
      caseReference: "HUS-12-LEDGER-API-002",
      propertyDesignation: "UPPSALA SUNNERSTA 1:52"
    });
    const claim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        submittedOn: "2026-03-16"
      }
    });
    const decision = await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/decisions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        decisionDate: "2026-03-18",
        approvedAmount: 0,
        rejectedAmount: 3000,
        reasonCode: "rejected",
        rejectedOutcomeCode: "internal_writeoff"
      }
    });
    const resolvedDifference = await requestJson(baseUrl, `/v1/hus/decision-differences/${decision.husDecisionDifference.husDecisionDifferenceId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "internal_writeoff",
        resolutionNote: "Approved internal write-off."
      }
    });
    const writeoffJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: resolvedDifference.resolutionJournalEntryId
    });
    assert.equal(writeoffJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_DIFFERENCE_WRITEOFF");

    const projectedCase = platform.getHusCase({
      companyId: COMPANY_ID,
      husCaseId: husCase.husCaseId
    });
    assert.equal(projectedCase.status, "written_off");
    assert.equal(projectedCase.authorityReceivables[0].status, "written_off");
    assert.equal(projectedCase.customerReceivables.length, 0);
  } finally {
    await stopServer(server);
  }
});

async function createBaseCase({ baseUrl, token, caseReference, propertyDesignation }) {
  const husCase = await requestJson(baseUrl, "/v1/hus/cases", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      caseReference,
      serviceTypeCode: "rot",
      workCompletedOn: "2026-03-10",
      housingFormCode: "smallhouse",
      propertyDesignation,
      executorFskattApproved: true,
      executorFskattValidatedOn: "2026-03-01"
    }
  });

  await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/classify`, {
    method: "POST",
    token,
    body: {
      companyId: COMPANY_ID,
      buyers: [
        {
          displayName: "Anna Andersson",
          personalIdentityNumber: "197501019991",
          allocationPercent: 100
        }
      ],
      serviceLines: [
        {
          description: "ROT labor and material",
          serviceTypeCode: "rot",
          workedHours: 8,
          laborCostAmount: 10000,
          materialAmount: 5000
        }
      ]
    }
  });

  await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/invoice`, {
    method: "POST",
    token,
    body: {
      companyId: COMPANY_ID,
      invoiceNumber: `${caseReference}-INV`,
      invoiceIssuedOn: "2026-03-11"
    }
  });

  await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      paidAmount: 12000,
      paidOn: "2026-03-15",
      paymentChannel: "bankgiro",
      paymentReference: `${caseReference}-PAY`
    }
  });

  return husCase;
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });

  const totpCode = platform.getTotpCodeForTesting({ companyId, email });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: totpCode
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
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, `Expected ${expectedStatus} for ${method} ${path} but got ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

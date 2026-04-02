import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.1 API exposes VAT-inclusive HUS truth, buyer identity refs and claim-ready evidence", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase12-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase12-api"
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

    const husCase = await requestJson(baseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        caseReference: "HUS-12-API-001",
        serviceTypeCode: "rot",
        workCompletedOn: "2026-03-10",
        housingFormCode: "smallhouse",
        propertyDesignation: "UPPSALA SUNNERSTA 1:41",
        executorFskattApproved: true,
        executorFskattValidatedOn: "2026-03-01"
      }
    });

    const classified = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/classify`, {
      method: "POST",
      token: sessionToken,
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
            description: "ROT labor with explicit VAT basis",
            serviceTypeCode: "rot",
            workedHours: 8,
            laborCostInclVatAmount: 12500,
            laborCostExVatAmount: 10000,
            vatAmount: 2500,
            materialAmount: 5000
          }
        ]
      }
    });
    assert.equal(classified.totalLaborCostInclVatAmount, 12500);
    assert.equal(classified.totalLaborCostExVatAmount, 10000);
    assert.equal(classified.totalVatAmount, 2500);
    assert.equal(classified.serviceLines[0].rulepackRef.rateWindowCode, "2026_standard");
    assert.match(classified.buyers[0].buyerIdentityRef, /^hus-buyer-identity:/);
    assert.equal(classified.buyers[0].buyerIdentityMaskedValue, "******9991");

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/invoice`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        invoiceNumber: "HUS-12-API-INV-001",
        invoiceIssuedOn: "2026-03-11"
      }
    });

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        paidAmount: 13750,
        paidOn: "2026-03-12",
        paymentChannel: "bankgiro",
        paymentReference: "BG-HUS-12-API-001"
      }
    });

    const readiness = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/readiness?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(readiness.claimReadyState, "claim_ready");
    assert.equal(readiness.activeRulepackRef.rateWindowCode, "2026_standard");
    assert.equal(readiness.buyerCapacities[0].buyerIdentityRef, classified.buyers[0].buyerIdentityRef);
    assert.equal(readiness.claimReadyEvidenceRefs.includes(classified.buyers[0].buyerIdentityRef), true);

    const claim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transportType: "json"
      }
    });
    assert.equal(claim.claimReadyState, "claim_ready");
    assert.equal(claim.rulepackRef.rateWindowCode, "2026_standard");
    assert.equal(claim.paymentAllocations[0].reductionRate, 0.3);
    assert.equal(claim.buyerAllocations[0].buyerIdentityRef, classified.buyers[0].buyerIdentityRef);
    assert.equal(claim.buyerAllocations[0].remainingAnnualCapAmountAfterClaim, 71250);
  } finally {
    await stopServer(server);
  }
});

test("Phase 12.1 API blocks mixed HUS rate windows until a claim rulepack is selected and rejects invalid identities", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-01-15T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase12-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2025,
    actorId: "phase12-api"
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

    const invalidCase = await requestJson(baseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        caseReference: "HUS-12-API-002",
        serviceTypeCode: "rot",
        workCompletedOn: "2025-05-01",
        ruleYear: 2025,
        housingFormCode: "smallhouse",
        propertyDesignation: "UPPSALA SUNNERSTA 1:42",
        executorFskattApproved: true,
        executorFskattValidatedOn: "2025-04-20"
      }
    });

    const invalidIdentity = await requestJson(baseUrl, `/v1/hus/cases/${invalidCase.husCaseId}/classify`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 400,
      body: {
        companyId: COMPANY_ID,
        buyers: [
          {
            displayName: "Anna Andersson",
            personalIdentityNumber: "197501019992",
            allocationPercent: 100
          }
        ],
        serviceLines: [
          {
            description: "ROT labor only",
            serviceTypeCode: "rot",
            workedHours: 4,
            laborCostAmount: 4000
          }
        ]
      }
    });
    assert.equal(invalidIdentity.errorCode, "hus_buyer_identity_required");

    const husCase = await requestJson(baseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        caseReference: "HUS-12-API-003",
        serviceTypeCode: "rot",
        workCompletedOn: "2025-05-01",
        ruleYear: 2025,
        housingFormCode: "smallhouse",
        propertyDesignation: "UPPSALA SUNNERSTA 1:43",
        executorFskattApproved: true,
        executorFskattValidatedOn: "2025-04-20"
      }
    });

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/classify`, {
      method: "POST",
      token: sessionToken,
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
            description: "ROT labor across 2025 rate windows",
            serviceTypeCode: "rot",
            workedHours: 8,
            laborCostAmount: 10000
          }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/invoice`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        invoiceNumber: "HUS-12-API-INV-003",
        invoiceIssuedOn: "2025-05-02",
        invoiceGrossAmount: 10000,
        invoiceLaborAmount: 10000,
        invoicePreliminaryReductionAmount: 3000,
        invoiceCustomerShareAmount: 7000
      }
    });

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        paidAmount: 3500,
        paidOn: "2025-05-10",
        paymentChannel: "bankgiro",
        paymentReference: "BG-HUS-12-API-003A"
      }
    });
    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        paidAmount: 2500,
        paidOn: "2025-05-20",
        paymentChannel: "swish",
        paymentReference: "SW-HUS-12-API-003B"
      }
    });

    const readiness = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/readiness?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(readiness.status, "blocked");
    assert.equal(readiness.blockerCodes.includes("hus_multiple_rate_windows_pending"), true);
    assert.deepEqual(
      readiness.paymentWindowSummaries.map((window) => ({
        rulepackId: window.rulepackId,
        reductionRate: window.reductionRate,
        remainingReductionAmount: window.remainingReductionAmount
      })),
      [
        {
          rulepackId: "hus-se-2025.1",
          reductionRate: 0.3,
          remainingReductionAmount: 1500
        },
        {
          rulepackId: "hus-se-2025.2",
          reductionRate: 0.5,
          remainingReductionAmount: 2500
        }
      ]
    );

    const blockedClaim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        transportType: "json"
      }
    });
    assert.equal(blockedClaim.errorCode, "hus_claim_not_ready");

    const selectedClaim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        claimRulepackId: "hus-se-2025.1",
        transportType: "json"
      }
    });
    assert.equal(selectedClaim.requestedAmount, 1500);
    assert.equal(selectedClaim.rulepackRef.rateWindowCode, "2025_standard");
    assert.equal(selectedClaim.paymentAllocations[0].reductionRate, 0.3);
    assert.equal(selectedClaim.paymentAllocations[0].rulepackRef.rulepackId, "hus-se-2025.1");
  } finally {
    await stopServer(server);
  }
});

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
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}

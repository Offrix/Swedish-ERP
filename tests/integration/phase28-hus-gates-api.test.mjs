import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 28 migration adds HUS gate hardening schema", async () => {
  const migration = await readText("packages/db/migrations/20260325001000_phase14_hus_gate_hardening.sql");
  for (const fragment of [
    "ALTER TABLE hus_cases",
    "ADD COLUMN IF NOT EXISTS invoice_gate_status",
    "ALTER TABLE hus_customer_payments",
    "CREATE TABLE IF NOT EXISTS hus_decision_differences",
    "CREATE TABLE IF NOT EXISTS hus_recovery_candidates",
    "ix_hus_decision_differences_phase14_status",
    "ix_hus_recovery_candidates_phase14_status"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Step 28 API exposes readiness, decision difference and recovery candidate chains", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
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
    platform.createCompanyUser({
      sessionToken,
      companyId: COMPANY_ID,
      email: "hus-field@example.test",
      displayName: "HUS Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: "hus-field@example.test"
    });

    const root = await requestJson(baseUrl, "/", { token: sessionToken });
    for (const route of [
      "/v1/hus/cases/:husCaseId/readiness",
      "/v1/hus/cases/:husCaseId/recovery-candidates",
      "/v1/hus/decision-differences",
      "/v1/hus/decision-differences/:husDecisionDifferenceId/resolve"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    const husCase = await requestJson(baseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        caseReference: "HUS-28-API-001",
        serviceTypeCode: "rot",
        workCompletedOn: "2026-03-10",
        housingFormCode: "smallhouse",
        propertyDesignation: "UPPSALA SUNNERSTA 1:23",
        executorFskattApproved: true,
        executorFskattValidatedOn: "2026-03-01"
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
            personalIdentityNumber: "197501019999",
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
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        invoiceNumber: "HUS-28-API-INV-001",
        invoiceIssuedOn: "2026-03-11"
      }
    });

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        paidAmount: 6000,
        paidOn: "2026-03-15",
        paymentChannel: "bankgiro",
        paymentReference: "BG-28-API-001"
      }
    });

    const readiness = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/readiness?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(readiness.status, "partial_ready");
    assert.equal(readiness.claimableReductionAmount, 1500);

    const claim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transportType: "json"
      }
    });
    assert.equal(claim.requestedAmount, 1500);

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
        approvedAmount: 1000,
        rejectedAmount: 500,
        reasonCode: "partial_acceptance",
        rejectedOutcomeCode: "customer_reinvoice"
      }
    });
    assert.equal(decision.husDecisionDifference.status, "open");

    const differences = await requestJson(baseUrl, `/v1/hus/decision-differences?companyId=${COMPANY_ID}&husCaseId=${husCase.husCaseId}&status=open`, {
      token: sessionToken
    });
    assert.equal(differences.items.length, 1);

    await requestJson(baseUrl, `/v1/hus/decision-differences/${differences.items[0].husDecisionDifferenceId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "customer_reinvoice",
        resolutionNote: "Customer notified."
      }
    });

    await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/payouts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutDate: "2026-03-20",
        payoutAmount: 1000
      }
    });

    const credit = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/credit-adjustments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        adjustmentDate: "2026-03-25",
        adjustmentAmount: 200,
        reasonCode: "credit_note_after_payout",
        afterPayoutFlag: true
      }
    });
    assert.equal(credit.husRecoveryCandidate.status, "open");

    const recoveryCandidates = await requestJson(
      baseUrl,
      `/v1/hus/cases/${husCase.husCaseId}/recovery-candidates?companyId=${COMPANY_ID}&status=open`,
      { token: sessionToken }
    );
    assert.equal(recoveryCandidates.items.length, 1);

    const recovery = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/recoveries`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        husRecoveryCandidateId: recoveryCandidates.items[0].husRecoveryCandidateId,
        recoveryDate: "2026-03-28",
        recoveryAmount: 200,
        reasonCode: "skatteverket_recovery"
      }
    });
    assert.equal(recovery.husCase.status, "closed");
    assert.equal(recovery.husRecoveryCandidate.status, "recovered");

    const forbiddenDifferences = await fetch(`${baseUrl}/v1/hus/decision-differences?companyId=${COMPANY_ID}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenDifferences.status, 403);
    await forbiddenDifferences.json();
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

async function loginWithTotpOnly({ baseUrl, platform, companyId, email }) {
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
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}

import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 13.1 API writes ledger journals for HUS decision and recovery flows", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T08:00:00Z")
  });
  platform.installLedgerCatalog({
    companyId: COMPANY_ID,
    actorId: "phase13-ledger-api"
  });
  platform.ensureAccountingYearPeriod({
    companyId: COMPANY_ID,
    fiscalYear: 2026,
    actorId: "phase13-ledger-api"
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
        caseReference: "HUS-13-LEDGER-API-001",
        serviceTypeCode: "rot",
        workCompletedOn: "2026-03-10",
        housingFormCode: "smallhouse",
        propertyDesignation: "UPPSALA SUNNERSTA 1:33",
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
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        invoiceNumber: "HUS-13-LEDGER-API-INV-001",
        invoiceIssuedOn: "2026-03-11"
      }
    });

    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        paidAmount: 12000,
        paidOn: "2026-03-15",
        paymentChannel: "bankgiro",
        paymentReference: "BG-HUS-13-LEDGER-API-001"
      }
    });

    const claim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transportType: "direct_api"
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
        approvedAmount: 2500,
        rejectedAmount: 500,
        reasonCode: "partial_acceptance",
        rejectedOutcomeCode: "customer_reinvoice"
      }
    });
    assert.ok(decision.husDecision.journalEntryId);
    const decisionJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: decision.husDecision.journalEntryId
    });
    assert.equal(decisionJournal.metadataJson.postingRecipeCode, "HUS_CLAIM_PARTIALLY_ACCEPTED");
    assert.equal(decisionJournal.metadataJson.husCaseId, husCase.husCaseId);

    await requestJson(baseUrl, `/v1/hus/decision-differences/${decision.husDecisionDifference.husDecisionDifferenceId}/resolve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        resolutionCode: "customer_reinvoice",
        resolutionNote: "Customer reinvoiced."
      }
    });

    await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/payouts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutDate: "2026-03-20",
        payoutAmount: 2500
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

    const recovery = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/recoveries`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        husRecoveryCandidateId: credit.husRecoveryCandidate.husRecoveryCandidateId,
        recoveryDate: "2026-03-28",
        recoveryAmount: 200,
        reasonCode: "skatteverket_recovery"
      }
    });
    assert.ok(recovery.husRecovery.journalEntryId);
    const recoveryJournal = platform.getJournalEntry({
      companyId: COMPANY_ID,
      journalEntryId: recovery.husRecovery.journalEntryId
    });
    assert.equal(recoveryJournal.metadataJson.postingRecipeCode, "HUS_RECOVERY_CONFIRMED");
    assert.equal(recoveryJournal.metadataJson.recoveryCandidateId, credit.husRecoveryCandidate.husRecoveryCandidateId);
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
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, `Expected ${expectedStatus} for ${method} ${path} but got ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

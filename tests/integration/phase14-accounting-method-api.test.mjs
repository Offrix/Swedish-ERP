import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Step 7 API manages accounting methods, change requests and cash-method year-end catch-up", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-01-05T09:00:00Z")
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
      email: "accounting-method-field@example.test",
      displayName: "Accounting Method Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "accounting-method-field@example.test"
    });

    const seededActive = await requestJson(
      baseUrl,
      `/v1/accounting-method/active?companyId=${DEMO_IDS.companyId}&accountingDate=2026-03-01`,
      { token: adminToken }
    );
    assert.equal(seededActive.methodCode, "FAKTURERINGSMETOD");

    const ineligibleAssessment = await requestJson(baseUrl, "/v1/accounting-method/eligibility-assessments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        annualNetTurnoverSek: 4_100_000,
        legalFormCode: "AB"
      }
    });
    assert.equal(ineligibleAssessment.eligibleForCashMethod, false);

    const eligibleAssessment = await requestJson(baseUrl, "/v1/accounting-method/eligibility-assessments", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        annualNetTurnoverSek: 950_000,
        legalFormCode: "AB"
      }
    });
    assert.equal(eligibleAssessment.eligibleForCashMethod, true);

    const disallowedCashProfileResponse = await fetch(`${baseUrl}/v1/accounting-method/profiles`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,        "idempotency-key": crypto.randomUUID(),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        methodCode: "KONTANTMETOD",
        effectiveFrom: "2025-01-01",
        fiscalYearStartDate: "2025-01-01",
        eligibilityAssessmentId: ineligibleAssessment.assessmentId,
        onboardingOverride: true
      })
    });
    const disallowedCashProfilePayload = await disallowedCashProfileResponse.json();
    assert.equal(disallowedCashProfileResponse.status, 409);
    assert.equal(disallowedCashProfilePayload.error, "cash_method_not_eligible");

    const changeRequest = await requestJson(baseUrl, "/v1/accounting-method/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        reasonCode: "METHOD_CHANGE"
      }
    });
    const approvedChangeRequest = await requestJson(
      baseUrl,
      `/v1/accounting-method/change-requests/${changeRequest.methodChangeRequestId}/approve`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          decisionNote: "Approved for the new fiscal year."
        }
      }
    );
    assert.equal(approvedChangeRequest.status, "approved");

    const plannedCashProfile = await requestJson(baseUrl, "/v1/accounting-method/profiles", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        methodCode: "KONTANTMETOD",
        effectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        eligibilityAssessmentId: eligibleAssessment.assessmentId,
        methodChangeRequestId: changeRequest.methodChangeRequestId
      }
    });
    const activatedCashProfile = await requestJson(
      baseUrl,
      `/v1/accounting-method/profiles/${plannedCashProfile.methodProfileId}/activate`,
      {
        method: "POST",
        token: adminToken,
        body: { companyId: DEMO_IDS.companyId }
      }
    );
    assert.equal(activatedCashProfile.status, "active");

    const currentActive = await requestJson(
      baseUrl,
      `/v1/accounting-method/active?companyId=${DEMO_IDS.companyId}&accountingDate=2027-01-05`,
      { token: adminToken }
    );
    assert.equal(currentActive.methodCode, "KONTANTMETOD");

    const catchUpRun = await requestJson(baseUrl, "/v1/accounting-method/year-end-catch-up-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearEndDate: "2027-12-31",
        openItems: [
          {
            openItemType: "customer_invoice",
            sourceId: "inv_2027_1",
            unpaidAmount: 1000,
            recognitionDate: "2027-12-20"
          },
          {
            openItemType: "supplier_invoice",
            sourceId: "sup_2027_1",
            unpaidAmount: 400,
            recognitionDate: "2027-12-21"
          }
        ]
      }
    });
    const replayCatchUpRun = await requestJson(baseUrl, "/v1/accounting-method/year-end-catch-up-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        fiscalYearEndDate: "2027-12-31",
        openItems: [
          {
            openItemType: "customer_invoice",
            sourceId: "inv_2027_1",
            unpaidAmount: 1000,
            recognitionDate: "2027-12-20"
          },
          {
            openItemType: "supplier_invoice",
            sourceId: "sup_2027_1",
            unpaidAmount: 400,
            recognitionDate: "2027-12-21"
          }
        ]
      }
    });
    assert.equal(catchUpRun.yearEndCatchUpRunId, replayCatchUpRun.yearEndCatchUpRunId);

    const history = await requestJson(baseUrl, `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(history.profiles.length >= 2, true);
    assert.equal(history.changeRequests.some((item) => item.status === "implemented"), true);

    const forbiddenHistory = await fetch(`${baseUrl}/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${fieldUserToken}`
      }
    });
    assert.equal(forbiddenHistory.status, 403);
    await forbiddenHistory.json();
  } finally {
    await stopServer(server);
  }
});

test("Step 7 API requires fiscal-year boundary metadata and supersedes earlier method change requests", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2027-01-05T09:00:00Z")
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

    const missingBoundaryResponse = await fetch(`${baseUrl}/v1/accounting-method/change-requests`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,        "idempotency-key": crypto.randomUUID(),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        reasonCode: "METHOD_CHANGE"
      })
    });
    const missingBoundaryPayload = await missingBoundaryResponse.json();
    assert.equal(missingBoundaryResponse.status, 409);
    assert.equal(missingBoundaryPayload.error, "method_change_request_fiscal_year_start_required");

    const firstRequest = await requestJson(baseUrl, "/v1/accounting-method/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        reasonCode: "METHOD_CHANGE"
      }
    });
    const secondRequest = await requestJson(baseUrl, "/v1/accounting-method/change-requests", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        requestedMethodCode: "KONTANTMETOD",
        requestedEffectiveFrom: "2027-01-01",
        fiscalYearStartDate: "2027-01-01",
        reasonCode: "METHOD_CHANGE_REVISED"
      }
    });
    const history = await requestJson(baseUrl, `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    const superseded = history.changeRequests.find((request) => request.methodChangeRequestId === firstRequest.methodChangeRequestId);
    const active = history.changeRequests.find((request) => request.methodChangeRequestId === secondRequest.methodChangeRequestId);

    assert.equal(superseded.status, "superseded");
    assert.equal(superseded.supersededByMethodChangeRequestId, secondRequest.methodChangeRequestId);
    assert.equal(active.status, "submitted");
  } finally {
    await stopServer(server);
  }
});

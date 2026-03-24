import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 14 API exposes document classification creation, approval and dispatch", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T17:00:00Z")
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

    const root = await requestJson(baseUrl, "/", { token: adminToken });
    assert.equal(root.routes.includes("/v1/documents/:documentId/classification-cases"), true);

    const employee = platform.createEmployee({
      companyId: DEMO_IDS.companyId,
      givenName: "Grace",
      familyName: "Hopper",
      workEmail: "grace@example.test",
      actorId: DEMO_IDS.userId
    });
    const employment = platform.createEmployment({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Architect",
      payModelCode: "monthly",
      startDate: "2026-01-01",
      actorId: DEMO_IDS.userId
    });
    const document = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "expense_receipt",
      sourceReference: "api-wellness-001",
      actorId: DEMO_IDS.userId,
      metadataJson: {
        totalAmount: 4500
      }
    });

    const created = await requestJson(baseUrl, `/v1/documents/${document.documentId}/classification-cases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        lineInputs: [
          {
            description: "Friskvard",
            amount: 4500,
            treatmentCode: "WELLNESS_ALLOWANCE",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId,
              personRelationCode: "employee"
            },
            factsJson: {
              benefitCode: "WELLNESS_ALLOWANCE",
              activityType: "massage",
              activityDate: "2026-03-24",
              vendorName: "Wellness Partner AB",
              equalTermsOffered: true,
              providedAsGiftCard: false,
              carryOverFromPriorYear: false,
              reimbursementAmount: 4500,
              calendarYearGrantedBeforeEvent: 0
            }
          }
        ]
      }
    });
    assert.equal(created.status, "suggested");
    assert.equal(created.requiresReview, false);

    const listed = await requestJson(
      baseUrl,
      `/v1/documents/${document.documentId}/classification-cases?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(listed.items.length, 1);

    const approved = await requestJson(baseUrl, `/v1/documents/${document.documentId}/classification-cases/${created.classificationCaseId}/decide`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        approvalNote: "Deterministisk friskvardsklassning."
      }
    });
    assert.equal(approved.status, "approved");

    const dispatched = await requestJson(baseUrl, `/v1/documents/${document.documentId}/classification-cases/${created.classificationCaseId}/dispatch`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(dispatched.status, "dispatched");
    assert.equal(dispatched.dispatchStatus.summary.realizedCount, 1);

    const fetched = await requestJson(
      baseUrl,
      `/v1/documents/${document.documentId}/classification-cases/${created.classificationCaseId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(fetched.dispatchStatus.summary.realizedCount, 1);

    const benefitEvents = platform.listBenefitEvents({
      companyId: DEMO_IDS.companyId,
      employmentId: employment.employmentId
    });
    assert.equal(benefitEvents.length, 1);
    assert.equal(benefitEvents[0].supportingDocumentId, document.documentId);
  } finally {
    await stopServer(server);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
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
      payModelCode: "monthly_salary",
      startDate: "2026-01-01",
      actorId: DEMO_IDS.userId
    });
    platform.addEmploymentContract({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2026-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary: 52000,
      actorId: DEMO_IDS.userId
    });
    platform.addEmployeeBankAccount({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      payoutMethod: "domestic_account",
      accountHolderName: "Grace Hopper",
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Integration Test Bank",
      primaryAccount: true,
      actorId: DEMO_IDS.userId
    });
    platform.upsertEmploymentStatutoryProfile({
      companyId: DEMO_IDS.companyId,
      employmentId: employment.employmentId,
      taxMode: "manual_rate",
      taxRatePercent: 30,
      contributionClassCode: "full",
      actorId: DEMO_IDS.userId
    });
    const document = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "expense_receipt",
      sourceReference: "api-benefit-001",
      actorId: DEMO_IDS.userId,
      metadataJson: {
        totalAmount: 1000
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
            description: "Sjukvardsforsakring",
            amount: 1000,
            treatmentCode: "TAXABLE_BENEFIT",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId,
              personRelationCode: "employee"
            },
            factsJson: {
              benefitCode: "HEALTH_INSURANCE",
              insurancePremium: 1000,
              taxablePremiumRatio: 0.6
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
    const payCalendar = platform.listPayCalendars({ companyId: DEMO_IDS.companyId })[0];
    const payRun = platform.createPayRun({
      companyId: DEMO_IDS.companyId,
      payCalendarId: payCalendar.payCalendarId,
      reportingPeriod: "202603",
      employmentIds: [employment.employmentId],
      actorId: DEMO_IDS.userId
    });
    platform.approvePayRun({
      companyId: DEMO_IDS.companyId,
      payRunId: payRun.payRunId,
      actorId: DEMO_IDS.userId
    });
    const consumedBenefitEvents = platform.listBenefitEvents({
      companyId: DEMO_IDS.companyId,
      employmentId: employment.employmentId
    });
    assert.equal(consumedBenefitEvents[0].payrollConsumptions.length, 1);
    assert.equal(consumedBenefitEvents[0].payrollConsumptions[0].payRunId, payRun.payRunId);
    assert.equal(consumedBenefitEvents[0].payrollConsumptions[0].stage, "approved");
  } finally {
    await stopServer(server);
  }
});

test("Step 14 API dispatches private spend into payroll net deduction flow", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T18:00:00Z")
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

    const employee = platform.createEmployee({
      companyId: DEMO_IDS.companyId,
      givenName: "Marie",
      familyName: "Curie",
      workEmail: "marie@example.test",
      actorId: DEMO_IDS.userId
    });
    const employment = platform.createEmployment({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Scientist",
      payModelCode: "monthly_salary",
      startDate: "2026-01-01",
      actorId: DEMO_IDS.userId
    });
    platform.addEmploymentContract({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      validFrom: "2026-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary: 48000,
      actorId: DEMO_IDS.userId
    });
    platform.upsertEmploymentStatutoryProfile({
      companyId: DEMO_IDS.companyId,
      employmentId: employment.employmentId,
      taxMode: "manual_rate",
      taxRatePercent: 30,
      contributionClassCode: "full",
      actorId: DEMO_IDS.userId
    });
    const document = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "expense_receipt",
      sourceReference: "api-private-001",
      actorId: DEMO_IDS.userId,
      metadataJson: {
        totalAmount: 1499
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
            description: "Privat kortkop pa foretagskort",
            amount: 1499,
            treatmentCode: "PRIVATE_RECEIVABLE",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId,
              personRelationCode: "employee"
            }
          }
        ]
      }
    });
    assert.equal(created.status, "under_review");

    const approved = await requestJson(
      baseUrl,
      `/v1/documents/${document.documentId}/classification-cases/${created.classificationCaseId}/decide`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId,
          approvalNote: "Privatkop ska regleras via nettoloneavdrag."
        }
      }
    );
    assert.equal(approved.status, "approved");

    const dispatched = await requestJson(
      baseUrl,
      `/v1/documents/${document.documentId}/classification-cases/${created.classificationCaseId}/dispatch`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: DEMO_IDS.companyId
        }
      }
    );
    assert.equal(dispatched.status, "dispatched");
    assert.equal(dispatched.treatmentIntents[0].status, "dispatched");

    const payloadBundle = platform.listPayrollDocumentClassificationPayloads({
      companyId: DEMO_IDS.companyId,
      employmentId: employment.employmentId,
      reportingPeriod: "202603"
    });
    assert.equal(payloadBundle.payloads.length, 1);
    assert.equal(payloadBundle.payloads[0].payItemCode, "NET_DEDUCTION");

    const payCalendar = platform.listPayCalendars({ companyId: DEMO_IDS.companyId })[0];
    const payRun = platform.createPayRun({
      companyId: DEMO_IDS.companyId,
      payCalendarId: payCalendar.payCalendarId,
      reportingPeriod: "202603",
      employmentIds: [employment.employmentId],
      actorId: DEMO_IDS.userId
    });
    platform.approvePayRun({
      companyId: DEMO_IDS.companyId,
      payRunId: payRun.payRunId,
      actorId: DEMO_IDS.userId
    });
    const approvedRun = platform.getPayRun({
      companyId: DEMO_IDS.companyId,
      payRunId: payRun.payRunId
    });
    const deductionLine = approvedRun.lines.find((line) => line.sourceId === created.treatmentIntents[0].treatmentIntentId);
    assert.equal(Boolean(deductionLine), true);
    assert.equal(deductionLine.payItemCode, "NET_DEDUCTION");
    assert.equal(deductionLine.sourceType, "document_classification_private_receivable");
  } finally {
    await stopServer(server);
  }
});

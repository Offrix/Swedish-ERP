import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createDefaultJobHandlers, runWorkerBatch } from "../../apps/worker/src/worker.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 14 migration adds extraction projection storage for document classification", async () => {
  const migration = await readText("packages/db/migrations/20260328143000_phase10_document_extraction_projections.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS\s+document_classification_extraction_projections/);
  assert.match(migration, /extraction_family_code\s+TEXT\s+NOT\s+NULL/);
  assert.match(migration, /candidate_object_type\s+TEXT\s+NOT\s+NULL/);
  assert.match(migration, /attachment_refs_json\s+JSONB\s+NOT\s+NULL\s+DEFAULT\s+'\[\]'::jsonb/);
  assert.match(migration, /payload_hash\s+TEXT\s+NOT\s+NULL/);
});

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
      manualRateReasonCode: "emergency_manual_transition",
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
      manualRateReasonCode: "emergency_manual_transition",
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

test("Phase 9.3 API reindexes masked document classification search documents without sensitive plaintext", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T09:00:00Z")
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
      givenName: "ApiLeakSentinel",
      familyName: "NineThree",
      workEmail: "api-leak-9-3@example.test",
      actorId: DEMO_IDS.userId
    });
    const employment = platform.createEmployment({
      companyId: DEMO_IDS.companyId,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Tester",
      payModelCode: "monthly_salary",
      startDate: "2026-01-01",
      actorId: DEMO_IDS.userId
    });
    const document = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "expense_receipt",
      sourceReference: "api-phase9-3-sensitive",
      actorId: DEMO_IDS.userId
    });

    const created = await requestJson(baseUrl, `/v1/documents/${document.documentId}/classification-cases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        lineInputs: [
          {
            description: "Sensitive vendor ApiLeakVendor AB",
            amount: 950,
            treatmentCode: "REIMBURSABLE_OUTLAY",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId,
              personRelationCode: "employee"
            },
            reviewReasonCodes: ["PERSON_IMPACT_REQUIRES_REVIEW"],
            factsJson: {
              vendorName: "ApiLeakVendor AB",
              reimbursementAmount: 950
            }
          }
        ]
      }
    });
    assert.equal(created.reviewQueueCode, "PAYROLL_REVIEW");

    const reindex = await requestJson(baseUrl, `/v1/search/reindex`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(reindex.reindexRequest.status, "requested");

    const processed = await runWorkerBatch({
      platform,
      handlers: createDefaultJobHandlers({ logger: () => {} }),
      logger: () => {},
      workerId: "worker-phase9-3-search"
    });
    assert.equal(processed, 1);

    const contracts = await requestJson(baseUrl, `/v1/search/contracts?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(
      contracts.items.some((item) => item.projectionCode === "document_classification.classification_case"),
      true
    );

    const classificationSearch = await requestJson(
      baseUrl,
      `/v1/search/documents?companyId=${DEMO_IDS.companyId}&query=classification`,
      { token: adminToken }
    );
    const classificationDocument = classificationSearch.items.find((item) => item.objectId === created.classificationCaseId);
    assert.equal(Boolean(classificationDocument), true);
    assert.equal(classificationDocument.objectType, "classification_case");
    assert.equal(classificationDocument.displayTitle.includes("ApiLeakSentinel"), false);
    assert.equal(classificationDocument.snippet.includes("maskat"), true);

    const leakSearch = await requestJson(
      baseUrl,
      `/v1/search/documents?companyId=${DEMO_IDS.companyId}&query=ApiLeakSentinel`,
      { token: adminToken }
    );
    assert.equal(leakSearch.items.some((item) => item.objectId === created.classificationCaseId), false);
  } finally {
    await stopServer(server);
  }
});

test("Step 14 API derives canonical extraction projections when classification is opened without explicit line inputs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T11:00:00Z")
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

    const supplierDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "supplier_invoice",
      sourceReference: "api-derived-supplier-001",
      actorId: DEMO_IDS.userId,
      metadataJson: {
        totalAmount: 1250
      }
    });

    const supplierCase = await requestJson(baseUrl, `/v1/documents/${supplierDocument.documentId}/classification-cases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        extractedFields: {
          counterparty: { value: "Demo Leverantor AB", confidence: 0.97 },
          invoiceNumber: { value: "SUP-API-001", confidence: 0.95 },
          invoiceDate: { value: "2026-03-28", confidence: 0.92 },
          dueDate: { value: "2026-04-27", confidence: 0.91 },
          totalAmount: { value: "1250.00", confidence: 0.98 },
          currencyCode: { value: "SEK", confidence: 0.99 }
        }
      }
    });
    assert.equal(supplierCase.treatmentIntents[0].targetDomainCode, "AP");
    assert.equal(supplierCase.extractionProjections[0].extractionFamilyCode, "AP_SUPPLIER_INVOICE");
    assert.equal(supplierCase.extractionProjections[0].candidateObjectType, "ap_supplier_invoice");
    assert.equal(supplierCase.extractionProjections[0].confidenceScore, 0.91);
    assert.equal(
      supplierCase.extractionProjections[0].fieldLineageJson["factsJson.invoiceNumber"].sourceFieldKey,
      "invoiceNumber"
    );
    assert.equal(
      supplierCase.extractionProjections[0].fieldLineageJson["factsJson.invoiceNumber"].confidenceScore,
      0.95
    );
    assert.equal(
      supplierCase.extractionProjections[0].attachmentRefs.includes(`document:${supplierDocument.documentId}`),
      true
    );
    assert.equal(supplierCase.extractionProjections[0].payloadHash.length, 64);

    const travelDocument = platform.createDocumentRecord({
      companyId: DEMO_IDS.companyId,
      documentType: "expense_receipt",
      sourceReference: "api-derived-travel-001",
      actorId: DEMO_IDS.userId,
      metadataJson: {
        totalAmount: 899
      }
    });

    const travelCase = await requestJson(baseUrl, `/v1/documents/${travelDocument.documentId}/classification-cases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        extractedFields: {
          storeName: { value: "Grand Hotel", confidence: 0.95 },
          receiptDate: { value: "2026-03-28", confidence: 0.93 },
          totalAmount: { value: "899.00", confidence: 0.97 }
        }
      }
    });
    assert.equal(travelCase.status, "under_review");
    assert.equal(travelCase.reviewQueueCode, "PAYROLL_REVIEW");
    assert.equal(travelCase.treatmentIntents[0].targetDomainCode, "TRAVEL");
    assert.equal(travelCase.extractionProjections[0].extractionFamilyCode, "TRAVEL_EXPENSE_CANDIDATE");
    assert.equal(travelCase.extractionProjections[0].confidenceScore, 0.93);
    assert.equal(
      travelCase.extractionProjections[0].fieldLineageJson["factsJson.expenseDate"].sourceFieldKey,
      "receiptDate"
    );
    assert.equal(
      travelCase.extractionProjections[0].fieldLineageJson["factsJson.expenseType"].sourceKind,
      "derived_rule"
    );
    assert.equal(travelCase.extractionProjections[0].normalizedFieldsJson.factsJson.expenseType, "lodging");
  } finally {
    await stopServer(server);
  }
});

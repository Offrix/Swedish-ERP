import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.2 migration and seeds add tax, SINK and AGI structures", async () => {
  const migration = await readText("packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS employment_statutory_profiles",
    "CREATE TABLE IF NOT EXISTS agi_periods",
    "CREATE TABLE IF NOT EXISTS agi_submission_versions",
    "CREATE TABLE IF NOT EXISTS agi_absence_payloads",
    "CREATE TABLE IF NOT EXISTS agi_receipts",
    "CREATE TABLE IF NOT EXISTS agi_signatures"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321210010_phase8_payroll_tax_agi_seed.sql");
  for (const fragment of [
    "payroll-tax-se-2026.1",
    "employment_statutory_profiles",
    "agi_submission_versions",
    "test:accepted"
  ]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321211000_phase8_payroll_tax_agi_demo_seed.sql");
  for (const fragment of [
    "ordinary_sink",
    "partially_rejected",
    "Added late-reported SINK employee and March correction.",
    "agi_demo_follow_up_required"
  ]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 8.2 API manages statutory profiles and AGI submissions with corrections", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
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

    const manual = createEmployeeWithContract({
      platform,
      givenName: "Iris",
      familyName: "Income",
      workEmail: "iris.income@example.com",
      identityValue: "19800112-1238",
      monthlySalary: 41000
    });
    const sink = createEmployeeWithContract({
      platform,
      givenName: "Nils",
      familyName: "Sink",
      workEmail: "nils.sink@example.com",
      identityValue: "19891103-4323",
      monthlySalary: 43500,
      protectedIdentity: true
    });

    const leaveType = platform.createLeaveType({
      companyId: COMPANY_ID,
      leaveTypeCode: "TEMP_PARENTAL",
      displayName: "Temporary parental benefit",
      signalType: "temporary_parental_benefit",
      requiresManagerApproval: false,
      actorId: "integration-test"
    });
    const leaveEntry = platform.createLeaveEntry({
      companyId: COMPANY_ID,
      employmentId: sink.employment.employmentId,
      leaveTypeId: leaveType.leaveTypeId,
      reportingPeriod: "202603",
      days: [
        { date: "2026-03-19", extentPercent: 50 },
        { date: "2026-03-20", extentPercent: 100 }
      ],
      actorId: "integration-test"
    });
    platform.submitLeaveEntry({
      companyId: COMPANY_ID,
      leaveEntryId: leaveEntry.leaveEntryId,
      actorId: "integration-test"
    });

    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: manual.employment.employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    });
    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: sink.employment.employmentId,
        taxMode: "sink",
        contributionClassCode: "full",
        sinkDecisionType: "ordinary_sink",
        sinkValidFrom: "2026-01-01",
        sinkValidTo: "2026-12-31",
        sinkRatePercent: 22.5,
        sinkDecisionDocumentId: "sink-decision-2026",
        fallbackTaxMode: "manual_rate",
        fallbackManualRateReasonCode: "sink_fallback_pending_decision",
        fallbackTaxRatePercent: 30
      }
    });

    const statutoryProfiles = await requestJson(baseUrl, `/v1/payroll/statutory-profiles?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(statutoryProfiles.items.length >= 2, true);

    const rulePacks = await requestJson(baseUrl, `/v1/payroll/rule-packs?companyId=${COMPANY_ID}&effectiveDate=2026-03-25`, {
      token: sessionToken
    });
    assert.equal(rulePacks.items.some((item) => item.rulePackId === "payroll-tax-se-2026.1"), true);

    const payCalendars = await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const payCalendar = payCalendars.items.find((item) => item.payCalendarCode === "MONTHLY_STANDARD");
    assert.ok(payCalendar);

    const regularRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        manualInputs: [
          {
            employmentId: manual.employment.employmentId,
            payItemCode: "BONUS",
            amount: 1700,
            processingStep: 4
          },
          {
            employmentId: sink.employment.employmentId,
            payItemCode: "BONUS",
            amount: 5000,
            processingStep: 4
          },
          {
            employmentId: sink.employment.employmentId,
            payItemCode: "BENEFIT",
            amount: 4200,
            processingStep: 6
          }
        ]
      }
    });
    assert.deepEqual(
      regularRun.providerBaselineRefs.map((entry) => entry.baselineCode),
      ["SE-SKATTEVERKET-AGI-API"]
    );
    assert.equal(typeof regularRun.providerBaselineRefs[0].providerBaselineId, "string");
    assert.equal(typeof regularRun.providerBaselineRefs[0].providerBaselineVersion, "string");
    assert.equal(typeof regularRun.providerBaselineRefs[0].providerBaselineChecksum, "string");
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${regularRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const createdSubmission = await requestJson(baseUrl, "/v1/payroll/agi-submissions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    assert.equal(createdSubmission.currentVersion.employees.length, 2);
    assert.deepEqual(
      createdSubmission.currentVersion.providerBaselineRefs.map((entry) => entry.baselineCode),
      ["SE-SKATTEVERKET-AGI-API"]
    );
    assert.equal(typeof createdSubmission.currentVersion.providerBaselineRefs[0].providerBaselineId, "string");
    assert.equal(typeof createdSubmission.currentVersion.providerBaselineRefs[0].providerBaselineVersion, "string");
    assert.equal(typeof createdSubmission.currentVersion.providerBaselineRefs[0].providerBaselineChecksum, "string");
    assert.equal(createdSubmission.currentVersion.evidenceBundleId != null, true);
    assert.equal(
      createdSubmission.currentVersion.payloadJson.employerTotals.field497SummaSkatteavdrag,
      Math.trunc(
        createdSubmission.currentVersion.payloadJson.totals.preliminaryTaxAmount
          + createdSubmission.currentVersion.payloadJson.totals.sinkTaxAmount
          + createdSubmission.currentVersion.payloadJson.totals.aSinkTaxAmount
      )
    );
    assert.equal(
      createdSubmission.currentVersion.payloadJson.employerTotals.field487SummaArbetsgivaravgifterOchSlf > 0,
      true
    );
    const initialSpecificationNumbers = new Map(
      createdSubmission.currentVersion.employees.map((employee) => [employee.employeeId, employee.payloadJson.specificationNumber])
    );
    assert.equal(new Set(initialSpecificationNumbers.values()).size, initialSpecificationNumbers.size);

    const validated = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(validated.currentVersion.state, "validated");
    assert.equal(validated.currentVersion.evidenceBundleId !== createdSubmission.currentVersion.evidenceBundleId, true);

    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID
      }
    }).then((response) => {
      assert.equal(response.error, "agi_version_immutable");
    });

    const accepted = await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        simulatedOutcome: "accepted"
      }
    });
    assert.equal(accepted.currentVersion.state, "accepted");
    assert.equal(typeof accepted.currentVersion.authoritySubmissionId, "string");
    const bridgedSubmissions = await requestJson(
      baseUrl,
      `/v1/submissions?companyId=${COMPANY_ID}&submissionType=agi_monthly`,
      {
        token: sessionToken
      }
    );
    assert.equal(bridgedSubmissions.items.length, 1);
    assert.equal(bridgedSubmissions.items[0].submissionId, accepted.currentVersion.authoritySubmissionId);
    assert.equal(bridgedSubmissions.items[0].sourceObjectType, "payroll_agi_submission_version");
    assert.equal(bridgedSubmissions.items[0].sourceObjectId, accepted.currentVersion.agiSubmissionVersionId);
    assert.deepEqual(
      bridgedSubmissions.items[0].receipts.map((receipt) => receipt.receiptType),
      ["technical_ack", "business_ack"]
    );

    const leaveLocks = platform.listLeaveSignalLocks({
      companyId: COMPANY_ID,
      employmentId: sink.employment.employmentId,
      reportingPeriod: "202603"
    });
    assert.deepEqual(
      leaveLocks.map((lock) => lock.lockState).sort(),
      ["ready_for_sign", "signed", "submitted"]
    );

    const correctionRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        runType: "correction",
        retroAdjustments: [
          {
            employmentId: sink.employment.employmentId,
            payItemCode: "CORRECTION",
            amount: 18000,
            originalPeriod: "202602",
            sourcePayRunId: regularRun.payRunId,
            sourceLineId: regularRun.lines.find((line) => line.employeeId === sink.employee.employeeId).payRunLineId
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${correctionRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const correctionDraft = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/correction`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          correctionReason: "Late March correction and SINK follow-up."
        }
      }
    );
    assert.equal(correctionDraft.currentVersion.versionNo, 2);
    assert.equal(correctionDraft.currentVersion.evidenceBundleId != null, true);
    const correctionSpecificationNumbers = new Map(
      correctionDraft.currentVersion.employees.map((employee) => [employee.employeeId, employee.payloadJson.specificationNumber])
    );
    assert.deepEqual(correctionSpecificationNumbers, initialSpecificationNumbers);

    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const correctionSubmitted = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}/submit`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          simulatedOutcome: "partially_rejected",
          receiptErrors: [
            {
              errorCode: "agi_follow_up_required",
              message: "Manual review required for corrected sink employee."
            }
          ]
        }
      }
    );
    assert.equal(correctionSubmitted.currentVersion.state, "partially_rejected");
    assert.equal(correctionSubmitted.currentVersion.errors.length, 1);
    assert.equal(typeof correctionSubmitted.currentVersion.authoritySubmissionId, "string");

    const bridgedCorrections = await requestJson(
      baseUrl,
      `/v1/submissions?companyId=${COMPANY_ID}&submissionType=agi_monthly`,
      {
        token: sessionToken
      }
    );
    assert.equal(bridgedCorrections.items.length, 2);
    const bridgedAccepted = bridgedCorrections.items.find(
      (candidate) => candidate.submissionId === accepted.currentVersion.authoritySubmissionId
    );
    const bridgedCorrection = bridgedCorrections.items.find(
      (candidate) => candidate.submissionId === correctionSubmitted.currentVersion.authoritySubmissionId
    );
    assert.equal(bridgedAccepted.status, "superseded");
    assert.equal(bridgedCorrection.correctionOfSubmissionId, bridgedAccepted.submissionId);
    assert.deepEqual(
      bridgedCorrection.receipts.map((receipt) => receipt.receiptType),
      ["technical_ack", "business_nack"]
    );

    const fetched = await requestJson(
      baseUrl,
      `/v1/payroll/agi-submissions/${createdSubmission.agiSubmissionId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(fetched.versions.length, 2);
    assert.equal(fetched.currentVersion.changedEmployeeIds.includes(sink.employee.employeeId), true);
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
    phase1AuthOnboardingEnabled: true,
    phase2DocumentArchiveEnabled: true,
    phase2CompanyInboxEnabled: true,
    phase2OcrReviewEnabled: true,
    phase3LedgerEnabled: true,
    phase4VatEnabled: true,
    phase5ArEnabled: true,
    phase6ApEnabled: true,
    phase7HrEnabled: true,
    phase7TimeEnabled: true,
    phase7AbsenceEnabled: true,
    phase8PayrollEnabled: true
  };
}

function createEmployeeWithContract({
  platform,
  givenName,
  familyName,
  workEmail,
  identityValue,
  monthlySalary,
  protectedIdentity = false
}) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    protectedIdentity,
    workEmail,
    actorId: "integration-test"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll employee",
    payModelCode: "monthly_salary",
    startDate: "2025-01-01",
    actorId: "integration-test"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "monthly_salary",
    monthlySalary,
    actorId: "integration-test"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: `12345${String(monthlySalary).padStart(5, "0")}`,
    bankName: "Integration Payroll Bank",
    primaryAccount: true,
    actorId: "integration-test"
  });
  return {
    employee,
    employment
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
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
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}

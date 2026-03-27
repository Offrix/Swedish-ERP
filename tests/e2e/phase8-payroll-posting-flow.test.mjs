import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 8.3 e2e flow posts payroll, exports payout, matches bank and reconstructs vacation liability", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });
    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    platform.createBankAccount({
      companyId: COMPANY_ID,
      bankName: "E2E Payroll Bank",
      ledgerAccountNumber: "1110",
      clearingNumber: "5000",
      accountNumber: "5566778899",
      isDefault: true,
      actorId: "e2e-test"
    });

    const employee = createHourlyEmployee({
      platform,
      givenName: "Elsa",
      familyName: "Flow",
      identityValue: "19800112-1234",
      hourlyRate: 215
    });
    platform.upsertEmploymentStatutoryProfile({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      taxMode: "manual_rate",
      taxRatePercent: 30,
      contributionClassCode: "full",
      actorId: "e2e-test"
    });
    platform.createTimeEntry({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      workDate: "2026-03-18",
      workedMinutes: 360,
      projectId: "project-demo-alpha",
      actorId: "e2e-test"
    });
    platform.createTimeEntry({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      workDate: "2026-03-19",
      workedMinutes: 240,
      projectId: "project-demo-beta",
      actorId: "e2e-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: adminToken
      })
    ).items[0];

    const run = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        employmentIds: [employee.employment.employmentId],
        manualInputs: [
          {
            employmentId: employee.employment.employmentId,
            payItemCode: "BONUS",
            amount: 900,
            processingStep: 4,
            dimensionJson: {
              costCenterCode: "CC-200",
              businessAreaCode: "BA-FIELD"
            }
          }
        ]
      }
    });
    assert.equal(run.calculationSteps.find((step) => step.stepNo === 17)?.status, "completed");
    assert.equal(run.calculationSteps.find((step) => step.stepNo === 18)?.status, "completed");

    await requestJson(baseUrl, `/v1/payroll/pay-runs/${run.payRunId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const posting = await requestJson(baseUrl, "/v1/payroll/postings", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: run.payRunId
      }
    });
    const fetchedPosting = await requestJson(
      baseUrl,
      `/v1/payroll/postings/${posting.payrollPostingId}?companyId=${COMPANY_ID}`,
      {
        token: adminToken
      }
    );
    assert.equal(fetchedPosting.status, "posted");
    assert.equal(fetchedPosting.journalLines.some((line) => line.dimensionJson.projectId === "project-demo-alpha"), true);
    assert.equal(fetchedPosting.journalLines.some((line) => line.dimensionJson.projectId === "project-demo-beta"), true);

    const payoutBatch = await requestJson(baseUrl, "/v1/payroll/payout-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: run.payRunId
      }
    });
    const matchedBatch = await requestJson(
      baseUrl,
      `/v1/payroll/payout-batches/${payoutBatch.payrollPayoutBatchId}/match-bank`,
      {
        method: "POST",
        token: adminToken,
        body: {
          companyId: COMPANY_ID,
          bankEventId: "bank-e2e-payroll-202603"
        }
      }
    );
    assert.equal(matchedBatch.status, "matched");
    assert.ok(matchedBatch.matchedJournalEntryId);

    const snapshot = await requestJson(baseUrl, "/v1/payroll/vacation-liability-snapshots", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    const repeatedSnapshot = await requestJson(baseUrl, "/v1/payroll/vacation-liability-snapshots", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    assert.equal(repeatedSnapshot.vacationLiabilitySnapshotId, snapshot.vacationLiabilitySnapshotId);
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

function createHourlyEmployee({ platform, givenName, familyName, identityValue, hourlyRate }) {
  const employee = platform.createEmployee({
    companyId: COMPANY_ID,
    givenName,
    familyName,
    identityType: "personnummer",
    identityValue,
    workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`,
    actorId: "e2e-test"
  });
  const employment = platform.createEmployment({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentTypeCode: "permanent",
    jobTitle: "Payroll operator",
    payModelCode: "hourly_salary",
    startDate: "2025-01-01",
    actorId: "e2e-test"
  });
  platform.addEmploymentContract({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    employmentId: employment.employmentId,
    validFrom: "2025-01-01",
    salaryModelCode: "hourly_salary",
    hourlyRate,
    actorId: "e2e-test"
  });
  platform.addEmployeeBankAccount({
    companyId: COMPANY_ID,
    employeeId: employee.employeeId,
    payoutMethod: "domestic_account",
    accountHolderName: `${givenName} ${familyName}`,
    clearingNumber: "5000",
    accountNumber: "1234567890",
    bankName: "E2E Employee Bank",
    primaryAccount: true,
    actorId: "e2e-test"
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

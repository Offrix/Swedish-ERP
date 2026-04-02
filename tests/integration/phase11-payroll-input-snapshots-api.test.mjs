import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.5 payroll API exposes locked input snapshot and pay run fingerprints", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-28T08:15:00Z")
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

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Mira",
        familyName: "Snapshot",
        workEmail: "mira.snapshot@example.com"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Snapshot API tester",
        payModelCode: "hourly_salary",
        startDate: "2025-01-01"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        validFrom: "2025-01-01",
        salaryModelCode: "hourly_salary",
        hourlyRate: 200
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payoutMethod: "domestic_account",
        accountHolderName: "Mira Snapshot",
        clearingNumber: "5000",
        accountNumber: "9988776655",
        bankName: "API Snapshot Bank",
        primaryAccount: true
      }
    });
    platform.upsertEmploymentStatutoryProfile({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      taxMode: "manual_rate",
      manualRateReasonCode: "emergency_manual_transition",
      taxRatePercent: 30,
      contributionClassCode: "full",
      actorId: "integration-test"
    });
    platform.createTimeEntry({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      workDate: "2026-03-18",
      workedMinutes: 480,
      overtimeMinutes: 60,
      allocationRefs: [
        {
          projectId: "project-api-alpha",
          activityCode: "installation",
          allocationMinutes: 360
        },
        {
          projectId: "project-api-beta",
          activityCode: "service",
          allocationMinutes: 120
        }
      ],
      actorId: "integration-test"
    });
    platform.approveTimeSet({
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      startsOn: "2026-03-01",
      endsOn: "2026-03-31",
      actorId: "integration-test"
    });
    const benefitEvent = platform.createBenefitEvent({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentId: employment.employmentId,
      benefitCode: "HEALTH_INSURANCE",
      reportingPeriod: "202603",
      occurredOn: "2026-03-12",
      sourceId: "phase117-api-benefit",
      sourcePayload: {
        insurancePremium: 1000
      },
      dimensionJson: {
        projectId: "project-api-benefit",
        costCenterCode: "CC-API-BEN"
      },
      actorId: "integration-test"
    });
    platform.approveBenefitEvent({
      companyId: COMPANY_ID,
      benefitEventId: benefitEvent.benefitEventId,
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items[0];

    const run = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        employmentIds: [employment.employmentId],
        manualInputs: [
          {
            employmentId: employment.employmentId,
            payItemCode: "BONUS",
            amount: 1500,
            processingStep: 4,
            dimensionJson: {
              projectId: "project-api-snapshot"
            }
          }
        ]
      }
    });
    const rereadRun = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${run.payRunId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );

    assert.equal(typeof run.payrollInputSnapshotId, "string");
    assert.equal(typeof run.payrollInputFingerprint, "string");
    assert.equal(typeof run.payRunFingerprint, "string");
    assert.equal(run.payrollInputSnapshot.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(run.payrollInputSnapshot.inputFingerprint, run.payrollInputFingerprint);
    assert.equal(run.payrollInputSnapshot.sourceSnapshot.manualInputs[0].dimensionJson.projectId, "project-api-snapshot");
    assert.equal(run.payrollInputSnapshot.sourceSnapshot[employment.employmentId].timeEntries[0].allocationRefs.length, 2);
    assert.equal(
      run.payrollInputSnapshot.sourceSnapshot[employment.employmentId].benefitEvents[0].dimensionJson.projectId,
      "project-api-benefit"
    );
    assert.equal(
      run.payrollInputSnapshot.sourceSnapshot[employment.employmentId].benefitPayrollPayloads[0].dimensionJson.costCenterCode,
      "CC-API-BEN"
    );
    assert.equal(
      run.lines.some(
        (line) => line.payItemCode === "HOURLY_SALARY" && line.dimensionJson.projectId === "project-api-alpha" && line.amount === 1050
      ),
      true
    );
    assert.equal(
      run.lines.some(
        (line) => line.payItemCode === "HOURLY_SALARY" && line.dimensionJson.projectId === "project-api-beta" && line.amount === 350
      ),
      true
    );
    assert.equal(rereadRun.payrollInputSnapshotId, run.payrollInputSnapshotId);
    assert.equal(rereadRun.payrollInputFingerprint, run.payrollInputFingerprint);
    assert.equal(rereadRun.payRunFingerprint, run.payRunFingerprint);
    assert.deepEqual(rereadRun.payrollInputSnapshot, run.payrollInputSnapshot);
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
    phase8PayrollEnabled: true,
    phase9BenefitsEnabled: true
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

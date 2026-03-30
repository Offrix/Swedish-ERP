import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 12.7 API keeps payroll trial flows non-live end-to-end", async () => {
  const platform = createApiPlatform({
    runtimeMode: "trial",
    env: {},
    criticalDomainStateStoreKind: "memory",
    bootstrapScenarioCode: "test_default_demo",
    clock: () => new Date("2026-03-28T13:30:00Z")
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

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });

    const employee = await createMonthlyEmployeeWithoutBank({
      baseUrl,
      token: sessionToken,
      givenName: "Tina",
      familyName: "Trialapi",
      identityValue: "19800112-7730"
    });

    await requestJson(baseUrl, "/v1/payroll/tax-decisions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        decisionType: "tabell",
        incomeYear: 2026,
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        municipalityCode: "0180",
        tableCode: "34",
        columnCode: "1",
        withholdingFixedAmount: 9800,
        decisionSource: "skatteverket_table_import",
        decisionReference: "tabell-34-1-2026-trial",
        evidenceRef: "evidence-tax-trial-2026"
      }
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
        employmentIds: [employee.employment.employmentId]
      }
    });
    assert.equal(run.executionBoundary.modeCode, "trial");
    assert.equal(run.payslips[0].watermark.watermarkCode, "TRIAL");
    assert.equal(run.payslips[0].bankPaymentPreview.bankRailMode, "trial_non_live");
    assert.match(run.payslips[0].bankPaymentPreview.accountTarget, /^trial:\/\/payroll\//u);

    await requestJson(baseUrl, `/v1/payroll/pay-runs/${run.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const submission = await requestJson(baseUrl, "/v1/payroll/agi-submissions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${submission.agiSubmissionId}/validate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${submission.agiSubmissionId}/ready-for-sign`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/payroll/agi-submissions/${submission.agiSubmissionId}/submit`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        mode: "live"
      }
    }).then((payload) => {
      assert.equal(payload.error, "agi_submission_live_mode_blocked");
    });

    const acceptedSubmission = await requestJson(baseUrl, `/v1/payroll/agi-submissions/${submission.agiSubmissionId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        simulatedOutcome: "accepted"
      }
    });
    assert.equal(acceptedSubmission.currentVersion.submissionMode, "trial");
    assert.equal(acceptedSubmission.currentVersion.receipts[0].payloadJson.legalEffect, false);
    assert.equal(acceptedSubmission.currentVersion.evidenceBundleId != null, true);

    const posting = await requestJson(baseUrl, "/v1/payroll/postings", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: run.payRunId
      }
    });
    assert.equal(posting.status, "posted");

    const payoutBatch = await requestJson(baseUrl, "/v1/payroll/payout-batches", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: run.payRunId
      }
    });
    assert.equal(payoutBatch.bankRailMode, "trial_non_live");
    assert.match(payoutBatch.exportFileName, /^TRIAL-PAYROLL-/u);
    assert.match(payoutBatch.lines[0].accountTarget, /^trial:\/\/payroll\//u);
    assert.equal(payoutBatch.evidenceBundleId != null, true);

    await requestJson(baseUrl, `/v1/payroll/payout-batches/${payoutBatch.payrollPayoutBatchId}/match-bank`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        bankEventId: "bank-live-ish-event"
      }
    }).then((payload) => {
      assert.equal(payload.error, "trial_bank_event_non_live_required");
    });

    const matched = await requestJson(baseUrl, `/v1/payroll/payout-batches/${payoutBatch.payrollPayoutBatchId}/match-bank`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        bankEventId: "trial:bank-event-202603"
      }
    });
    assert.equal(matched.status, "matched");
    assert.equal(matched.bankEventId, "trial:bank-event-202603");
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

async function createMonthlyEmployeeWithoutBank({ baseUrl, token, givenName, familyName, identityValue }) {
  const employee = await requestJson(baseUrl, "/v1/hr/employees", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      givenName,
      familyName,
      identityType: "personnummer",
      identityValue,
      workEmail: `${givenName.toLowerCase()}.${familyName.toLowerCase()}@example.com`
    }
  });
  const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      employmentTypeCode: "permanent",
      jobTitle: "Trial API tester",
      payModelCode: "monthly_salary",
      startDate: "2025-01-01"
    }
  });
  await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/contracts`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      employmentId: employment.employmentId,
      validFrom: "2025-01-01",
      salaryModelCode: "monthly_salary",
      monthlySalary: 36000
    }
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

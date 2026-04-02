import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 11.5 API manages employee receivables, offsets, zero-cash payouts and dual-review write-offs", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-04-01T08:15:00Z")
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const approverEmail = "receivable-approver@example.test";
    const adminToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });
    const approver = platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: COMPANY_ID,
      email: approverEmail,
      displayName: "Receivable Approver",
      roleCode: "approver",
      requiresMfa: false
    });
    platform.createObjectGrant({
      sessionToken: adminToken,
      companyId: COMPANY_ID,
      companyUserId: approver.companyUserId,
      permissionCode: "company.manage",
      objectType: "payroll",
      objectId: COMPANY_ID
    });
    const approverToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: approverEmail
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
      bankName: "Integration Payroll Bank",
      ledgerAccountNumber: "1110",
      clearingNumber: "5000",
      accountNumber: "5566778899",
      isDefault: true,
      actorId: "integration-test"
    });

    const employee = await createMonthlyEmployee({
      baseUrl,
      token: adminToken,
      givenName: "Erika",
      familyName: "Receivable",
      identityValue: "19800112-8886"
    });
    platform.upsertEmploymentStatutoryProfile({
      companyId: COMPANY_ID,
      employmentId: employee.employment.employmentId,
      taxMode: "manual_rate",
      manualRateReasonCode: "emergency_manual_transition",
      taxRatePercent: 30,
      contributionClassCode: "full",
      actorId: "integration-test"
    });

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: adminToken
      })
    ).items[0];

    const negativeRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202603",
        runType: "extra",
        employmentIds: [employee.employment.employmentId],
        manualInputs: [
          {
            employmentId: employee.employment.employmentId,
            payItemCode: "BENEFIT",
            amount: 1200,
            processingStep: 6
          }
        ]
      }
    });
    assert.equal(negativeRun.payslips[0].totals.cashNetPayAmount, 0);
    assert.equal(negativeRun.payslips[0].totals.employeeReceivableAmount, 360);

    const approvedNegativeRun = await requestJson(baseUrl, `/v1/payroll/pay-runs/${negativeRun.payRunId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approvedNegativeRun.employeeReceivables.length, 1);
    const receivableId = approvedNegativeRun.employeeReceivables[0].employeeReceivableId;
    assert.equal(approvedNegativeRun.employeeReceivables[0].status, "scheduled_offset");
    assert.equal(approvedNegativeRun.payslips[0].totals.employeeReceivableId, receivableId);

    const posting = await requestJson(baseUrl, "/v1/payroll/postings", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: negativeRun.payRunId
      }
    });
    assert.equal(posting.totals.cashNetPayAmount, 0);
    assert.equal(posting.totals.employeeReceivableAmount, 360);
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "1300" && line.debitAmount === 360), true);

    const payoutBatch = await requestJson(baseUrl, "/v1/payroll/payout-batches", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: negativeRun.payRunId
      }
    });
    assert.equal(payoutBatch.totalAmount, 0);
    assert.equal(payoutBatch.lines.length, 0);

    const listedReceivables = await requestJson(
      baseUrl,
      `/v1/payroll/receivables?companyId=${COMPANY_ID}&sourcePayRunId=${negativeRun.payRunId}`,
      {
        token: adminToken
      }
    );
    assert.equal(listedReceivables.items.length, 1);
    assert.equal(listedReceivables.items[0].employeeReceivableId, receivableId);

    const plans = await requestJson(
      baseUrl,
      `/v1/payroll/receivable-settlement-plans?companyId=${COMPANY_ID}&employeeReceivableId=${receivableId}`,
      {
        token: adminToken
      }
    );
    assert.equal(plans.items.length, 1);
    assert.equal(plans.items[0].installments[0].reportingPeriod, "202604");
    assert.equal(plans.items[0].installments[0].plannedAmount, 360);

    const offsetDecision = await requestJson(baseUrl, "/v1/payroll/receivable-offset-decisions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeReceivableId: receivableId,
        reportingPeriod: "202604",
        amount: 300,
        note: "Recover from next regular payroll."
      }
    });
    assert.equal(offsetDecision.status, "pending_execution");

    const offsetRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payCalendarId: payCalendar.payCalendarId,
        reportingPeriod: "202604",
        employmentIds: [employee.employment.employmentId]
      }
    });
    assert.equal(
      offsetRun.lines.some((line) => line.sourceId === offsetDecision.receivableOffsetDecisionId && line.ledgerAccountCode === "1300"),
      true
    );

    const approvedOffsetRun = await requestJson(baseUrl, `/v1/payroll/pay-runs/${offsetRun.payRunId}/approve`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(
      approvedOffsetRun.receivableOffsetDecisions.some(
        (decision) => decision.receivableOffsetDecisionId === offsetDecision.receivableOffsetDecisionId && decision.status === "executed"
      ),
      true
    );

    const updatedReceivable = await requestJson(
      baseUrl,
      `/v1/payroll/receivables/${receivableId}?companyId=${COMPANY_ID}`,
      {
        token: adminToken
      }
    );
    assert.equal(updatedReceivable.status, "partially_settled");
    assert.equal(updatedReceivable.outstandingAmount, 60);
    assert.equal(updatedReceivable.settlementPlan.installments[0].status, "partially_executed");
    assert.equal(updatedReceivable.settlementPlan.installments[1].plannedAmount, 60);

    const writeOff = await requestJson(baseUrl, "/v1/payroll/receivable-write-offs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeReceivableId: receivableId,
        amount: 60,
        reasonCode: "employee_departed_unrecoverable",
        note: "Close remaining balance after recovery attempt."
      }
    });
    assert.equal(writeOff.status, "draft");

    const approvedWriteOff = await requestJson(
      baseUrl,
      `/v1/payroll/receivable-write-offs/${writeOff.receivableWriteOffDecisionId}/approve`,
      {
        method: "POST",
        token: approverToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(approvedWriteOff.status, "approved");

    const writtenOffReceivable = await requestJson(
      baseUrl,
      `/v1/payroll/receivables/${receivableId}?companyId=${COMPANY_ID}`,
      {
        token: adminToken
      }
    );
    assert.equal(writtenOffReceivable.status, "written_off");
    assert.equal(writtenOffReceivable.outstandingAmount, 0);
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

async function createMonthlyEmployee({ baseUrl, token, givenName, familyName, identityValue }) {
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
      jobTitle: "Employee receivable API tester",
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
      monthlySalary: 32000
    }
  });
  await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/bank-accounts`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      payoutMethod: "domestic_account",
      accountHolderName: `${givenName} ${familyName}`,
      clearingNumber: "5000",
      accountNumber: "1234567890",
      bankName: "Receivable API Bank",
      primaryAccount: true
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
  if (Number(started.session.requiredFactorCount || 0) > 0) {
    await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
      method: "POST",
      token: started.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({ companyId, email })
      }
    });
  }
  if (Number(started.session.requiredFactorCount || 0) > 1) {
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

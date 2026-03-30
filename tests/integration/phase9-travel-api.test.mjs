import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.2 migration and seeds add travel claims, foreign allowances and payroll intents", async () => {
  const migration = await readText("packages/db/migrations/20260322000000_phase9_travel_expenses.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS travel_claims",
    "CREATE TABLE IF NOT EXISTS travel_foreign_allowances",
    "CREATE TABLE IF NOT EXISTS travel_valuations",
    "CREATE TABLE IF NOT EXISTS travel_posting_intents",
    "CREATE TABLE IF NOT EXISTS mileage_logs",
    "CREATE TABLE IF NOT EXISTS expense_receipts"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260322000010_phase9_travel_expenses_seed.sql");
  for (const fragment of ["Frankrike", "Tyskland", "TAX_FREE_TRAVEL_ALLOWANCE", "EXPENSE_REIMBURSEMENT"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260322001000_phase9_travel_expenses_demo_seed.sql");
  for (const fragment of ["BENEFIT_CAR", "travel_preapproval_required", "mileage_taxable", "Utlag privatkort"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 9.2 API manages travel claims and carries them into payroll, posting and AGI", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:20:00Z")
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

    const foreignAllowances = await requestJson(baseUrl, "/v1/travel/foreign-allowances?taxYear=2026");
    assert.equal(foreignAllowances.items.some((item) => item.countryName === "Frankrike" && item.amountSek === 850), true);

    const employee = await createEmployeeWithContract({
      baseUrl,
      token: sessionToken,
      givenName: "Tilde",
      familyName: "Travel",
      workEmail: "tilde.travel@example.com",
      payModelCode: "monthly_salary",
      monthlySalary: 42000
    });

    await requestJson(baseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        taxMode: "manual_rate",
        manualRateReasonCode: "emergency_manual_transition",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    });

    const claim = await requestJson(baseUrl, "/v1/travel/claims", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        purpose: "Kundmote i Malmo",
        startAt: "2026-03-10T08:15:00+01:00",
        endAt: "2026-03-11T20:30:00+01:00",
        homeLocation: "Uppsala",
        regularWorkLocation: "Uppsala",
        firstDestination: "Malmo",
        distanceFromHomeKm: 620,
        distanceFromRegularWorkKm: 620,
        requestedAllowanceAmount: 700,
        mealEvents: [
          {
            date: "2026-03-11",
            lunchProvided: true
          }
        ],
        mileageLogs: [
          {
            date: "2026-03-10",
            vehicleType: "OWN_CAR",
            distanceKm: 380,
            claimedAmount: 950
          }
        ],
        expenseReceipts: [
          {
            date: "2026-03-10",
            expenseType: "parking",
            paymentMethod: "private_card",
            amount: 140,
            currencyCode: "SEK"
          },
          {
            date: "2026-03-10",
            expenseType: "taxi",
            paymentMethod: "company_card",
            amount: 600,
            currencyCode: "SEK"
          }
        ],
        travelAdvances: [
          {
            date: "2026-03-09",
            amountSek: 300
          }
        ]
      }
    });
    assert.equal(claim.valuation.taxFreeTravelAllowance, 645);
    assert.equal(claim.valuation.taxableTravelAllowance, 55);
    assert.equal(claim.valuation.expenseSplit.companyCardExpenseAmount, 600);
    assert.equal(claim.valuation.expenseSplit.mixedFundingSources, true);
    assert.equal(claim.valuation.reviewCodes.includes("travel_expense_split_review"), true);
    assert.equal(claim.postingIntents.some((intent) => intent.payrollLinePayloadJson.payItemCode === "EXPENSE_REIMBURSEMENT"), true);

    const listedClaims = await requestJson(
      baseUrl,
      `/v1/travel/claims?companyId=${COMPANY_ID}&reportingPeriod=202603&employmentId=${employee.employment.employmentId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(listedClaims.items.length, 1);

    const fetchedClaim = await requestJson(
      baseUrl,
      `/v1/travel/claims/${claim.travelClaimId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(fetchedClaim.travelClaimId, claim.travelClaimId);

    const auditEvents = await requestJson(
      baseUrl,
      `/v1/travel/audit-events?companyId=${COMPANY_ID}&travelClaimId=${claim.travelClaimId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(auditEvents.items.some((event) => event.action === "travel.claim.created"), true);

    const payCalendar = (
      await requestJson(baseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items[0];

    const payRun = await requestJson(baseUrl, "/v1/payroll/pay-runs", {
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
    assert.equal(payRun.lines.some((line) => line.payItemCode === "TAX_FREE_TRAVEL_ALLOWANCE" && line.amount === 645), true);
    assert.equal(payRun.lines.some((line) => line.payItemCode === "TAXABLE_TRAVEL_ALLOWANCE" && line.amount === 55), true);
    assert.equal(payRun.lines.some((line) => line.payItemCode === "TAX_FREE_MILEAGE" && line.amount === 950), true);
    assert.equal(payRun.lines.some((line) => line.payItemCode === "EXPENSE_REIMBURSEMENT" && line.amount === 140), true);

    await requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const posting = await requestJson(baseUrl, "/v1/payroll/postings", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        payRunId: payRun.payRunId
      }
    });
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "7310"), true);
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "7320"), true);
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "7330"), true);

    const agiSubmission = await requestJson(baseUrl, "/v1/payroll/agi-submissions", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        reportingPeriod: "202603"
      }
    });
    const agiEmployee = agiSubmission.currentVersion.employees.find(
      (candidate) => candidate.employeeId === employee.employee.employeeId
    );
    assert.equal(agiEmployee.payloadJson.compensationFields.taxFreeAllowanceAmount, 1595);
    assert.equal(agiEmployee.payloadJson.compensationFields.cashCompensationAmount >= 42055, true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.2 travel routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:20:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      ...enabledFlags(),
      phase9TravelEnabled: false
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await requestJson(baseUrl, `/v1/travel/claims?companyId=${COMPANY_ID}`, {
      expectedStatus: 503
    });
    assert.equal(response.error, "feature_disabled");
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
    phase9BenefitsEnabled: true,
    phase9TravelEnabled: true
  };
}

async function createEmployeeWithContract({ baseUrl, token, givenName, familyName, workEmail, payModelCode, monthlySalary }) {
  const employee = await requestJson(baseUrl, "/v1/hr/employees", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      givenName,
      familyName,
      workEmail
    }
  });
  const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      employmentTypeCode: "permanent",
      jobTitle: "Consultant",
      payModelCode,
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
      salaryModelCode: payModelCode,
      monthlySalary
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
      bankName: "Travel Integration Bank",
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

async function requestJson(baseUrl, path, { method = "GET", body = null, token = null, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body == null ? null : JSON.stringify(body)
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}

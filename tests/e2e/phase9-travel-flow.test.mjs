import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.2 e2e flow creates a foreign multi-country claim and exposes taxable mileage plus audit", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:45:00Z")
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

    const employee = await createHourlyEmployee({
      baseUrl,
      token: sessionToken,
      givenName: "Siri",
      familyName: "Travel",
      workEmail: "siri.travel@example.com",
      hourlyRate: 330
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
        purpose: "Demo Paris Frankfurt",
        startAt: "2026-03-16T07:00:00+01:00",
        endAt: "2026-03-18T21:30:00+01:00",
        homeLocation: "Stockholm",
        regularWorkLocation: "Stockholm",
        distanceFromHomeKm: 720,
        distanceFromRegularWorkKm: 720,
        countrySegments: [
          {
            startAt: "2026-03-16T07:00:00+01:00",
            endAt: "2026-03-17T11:00:00+01:00",
            countryCode: "FR",
            locationKey: "Paris"
          },
          {
            startAt: "2026-03-17T11:00:00+01:00",
            endAt: "2026-03-18T21:30:00+01:00",
            countryCode: "DE",
            locationKey: "Frankfurt"
          }
        ],
        mealEvents: [
          {
            date: "2026-03-16",
            breakfastProvided: true
          },
          {
            date: "2026-03-17",
            lunchProvided: true
          }
        ],
        mileageLogs: [
          {
            date: "2026-03-18",
            vehicleType: "BENEFIT_CAR",
            distanceKm: 210,
            claimedAmount: 294,
            employeePaidAllFuel: false
          }
        ],
        expenseReceipts: [
          {
            date: "2026-03-18",
            expenseType: "taxi",
            paymentMethod: "private_card",
            amount: 320,
            currencyCode: "SEK"
          }
        ]
      }
    });
    assert.equal(claim.travelDays.some((day) => day.date === "2026-03-17" && day.countryName === "Tyskland"), true);
    assert.equal(claim.valuation.taxableMileage, 294);
    assert.equal(claim.valuation.warnings.includes("travel_mileage_tax_free_denied_benefit_car_fuel"), true);

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
    assert.equal(payRun.lines.some((line) => line.payItemCode === "TAXABLE_MILEAGE" && line.amount === 294), true);

    const payslip = await requestJson(
      baseUrl,
      `/v1/payroll/pay-runs/${payRun.payRunId}/payslips/${employee.employment.employmentId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(payslip.totals.taxFreeAllowanceAmount > 0, true);
    assert.equal(payslip.totals.expenseReimbursementAmount, 320);

    const auditEvents = await requestJson(
      baseUrl,
      `/v1/travel/audit-events?companyId=${COMPANY_ID}&travelClaimId=${claim.travelClaimId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(auditEvents.items.some((event) => event.action === "travel.claim.created"), true);
    assert.equal(auditEvents.items.some((event) => event.action === "travel.claim.valued"), true);
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

async function createHourlyEmployee({ baseUrl, token, givenName, familyName, workEmail, hourlyRate }) {
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
      jobTitle: "Field consultant",
      payModelCode: "hourly_salary",
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
      salaryModelCode: "hourly_salary",
      hourlyRate
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
      bankName: "Travel E2E Bank",
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

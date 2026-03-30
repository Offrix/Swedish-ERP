import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 9.1 migration and seeds add benefits catalog, events and reporting linkage", async () => {
  const migration = await readText("packages/db/migrations/20260321230000_phase9_benefits_engine.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS benefit_catalog",
    "CREATE TABLE IF NOT EXISTS benefit_events",
    "CREATE TABLE IF NOT EXISTS benefit_valuations",
    "CREATE TABLE IF NOT EXISTS benefit_posting_intents",
    "CREATE TABLE IF NOT EXISTS benefit_agi_mappings"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321230010_phase9_benefits_engine_seed.sql");
  for (const fragment of [
    "HEALTH_INSURANCE",
    "taxable_benefit",
    "benefit_events",
    "7230"
  ]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321231000_phase9_benefits_engine_demo_seed.sql");
  for (const fragment of [
    "CAR_BENEFIT",
    "FUEL_BENEFIT",
    "WELLNESS_ALLOWANCE",
    "benefit_posting_intents"
  ]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 9.1 API manages catalog, benefit events, payroll mapping, posting and AGI output", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:15:00Z")
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

    const employee = await createEmployeeWithContract({
      baseUrl,
      token: sessionToken,
      givenName: "Hedvig",
      familyName: "Benefit",
      workEmail: "hedvig.benefit@example.com",
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

    const catalog = await requestJson(baseUrl, `/v1/benefits/catalog?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(catalog.items.some((item) => item.benefitCode === "HEALTH_INSURANCE"), true);

    const benefitEvent = await requestJson(baseUrl, "/v1/benefits/events", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        benefitCode: "HEALTH_INSURANCE",
        reportingPeriod: "202603",
        occurredOn: "2026-03-09",
        sourceId: "phase9-health-api-202603",
        sourcePayload: {
          insurancePremium: 1000
        }
      }
    });
    assert.equal(benefitEvent.valuation.taxableValue, 600);
    assert.equal(benefitEvent.valuation.offsetBreakdown.totalOffsetValue, 0);
    assert.equal(benefitEvent.postingIntents.some((intent) => intent.ledgerAccountCode === "7230"), true);
    assert.equal(benefitEvent.agiMappings[0].reportableAmount, 600);
    assert.equal(benefitEvent.status, "valued");

    const offsetFuelBenefit = await requestJson(baseUrl, "/v1/benefits/events", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        benefitCode: "FUEL_BENEFIT",
        reportingPeriod: "202603",
        occurredOn: "2026-03-12",
        sourceId: "phase9-fuel-offset-api-202603",
        employeePaidValue: 100,
        netDeductionValue: 400,
        sourcePayload: {
          vehicleContext: "benefit_car",
          marketValuePrivateFuel: 2000,
          fuelType: "liquid_fuel"
        }
      }
    });
    assert.equal(offsetFuelBenefit.valuation.offsetBreakdown.totalOffsetValue, 500);
    assert.equal(offsetFuelBenefit.valuation.offsetBreakdown.mixedOffsetMethods, true);
    assert.equal(offsetFuelBenefit.valuation.reviewCodes.includes("benefit_mixed_offset_review"), true);
    assert.equal(offsetFuelBenefit.valuation.reviewCodes.includes("benefit_net_deduction_offset_review"), true);

    const approvedBenefitEvent = await requestJson(
      baseUrl,
      `/v1/benefits/events/${benefitEvent.benefitEventId}/approve`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(approvedBenefitEvent.status, "approved");
    assert.equal(approvedBenefitEvent.valuation.status, "approved");

    const listedEvents = await requestJson(
      baseUrl,
      `/v1/benefits/events?companyId=${COMPANY_ID}&reportingPeriod=202603&employmentId=${employee.employment.employmentId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(listedEvents.items.length, 2);

    const fetchedEvent = await requestJson(
      baseUrl,
      `/v1/benefits/events/${benefitEvent.benefitEventId}?companyId=${COMPANY_ID}`,
      {
        token: sessionToken
      }
    );
    assert.equal(fetchedEvent.benefitEventId, benefitEvent.benefitEventId);
    assert.equal(fetchedEvent.status, "approved");

    const auditEvents = await requestJson(
      baseUrl,
      `/v1/benefits/audit-events?companyId=${COMPANY_ID}&benefitEventId=${benefitEvent.benefitEventId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(auditEvents.items.some((event) => event.action === "benefit.event.created"), true);

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
    assert.equal(
      payRun.lines.some((line) => line.ledgerAccountCode === "7230" && line.agiMappingCode === "taxable_benefit"),
      true
    );

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
    assert.equal(posting.journalLines.some((line) => line.accountNumber === "7230"), true);

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
    assert.equal(agiEmployee.payloadJson.compensationFields.taxableBenefitAmount, 600);
  } finally {
    await stopServer(server);
  }
});

test("Phase 9.1 benefit routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T10:15:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      ...enabledFlags(),
      phase9BenefitsEnabled: false
    }
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
    const response = await fetch(`${baseUrl}/v1/benefits/catalog?companyId=${COMPANY_ID}`, {
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.error, "feature_disabled");
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

async function createEmployeeWithContract({
  baseUrl,
  token,
  givenName,
  familyName,
  workEmail,
  payModelCode,
  monthlySalary = null,
  hourlyRate = null
}) {
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
      jobTitle: "Benefit employee",
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
      monthlySalary,
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
      bankName: "Benefit Integration Bank",
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

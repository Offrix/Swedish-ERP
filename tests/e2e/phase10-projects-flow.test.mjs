import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.1 e2e flow covers project setup, payroll-backed actuals, AR tie-out and forecast", async () => {
  const clock = () => new Date("2026-03-22T12:45:00Z");
  const enabledPlatform = createApiPlatform({ clock });
  const enabledServer = createApiServer({
    platform: enabledPlatform,
    flags: enabledFlags()
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({ clock }),
    flags: {
      ...enabledFlags(),
      phase10ProjectsEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase10ProjectsEnabled, true);
    assert.equal(root.routes.includes("/v1/projects/:projectId/wip-snapshots"), true);
    assert.equal(root.routes.includes("/v1/projects/:projectId/forecast-snapshots"), true);
    assert.equal(root.routes.includes("/v1/projects/:projectId/payroll-cost-allocations"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/projects?companyId=${COMPANY_ID}`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const sessionToken = await loginWithRequiredFactors({
      baseUrl: enabledBaseUrl,
      platform: enabledPlatform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(enabledBaseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    const customer = await requestJson(enabledBaseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "E2E Project Customer AB",
        organizationNumber: "5591223301",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "E2Egatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "E2Egatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });
    const employee = await createEmployeeWithContract({
      baseUrl: enabledBaseUrl,
      token: sessionToken,
      givenName: "Elin",
      familyName: "E2E",
      workEmail: "elin.projects.e2e@example.com",
      monthlySalary: 40000
    });

    await requestJson(enabledBaseUrl, "/v1/payroll/statutory-profiles", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        taxMode: "manual_rate",
        taxRatePercent: 30,
        contributionClassCode: "full"
      }
    });

    const project = await requestJson(enabledBaseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-E2E-101",
        projectReferenceCode: "project-e2e-101",
        displayName: "E2E Project 10.1",
        customerId: customer.customerId,
        projectManagerEmployeeId: employee.employee.employeeId,
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 100000
      }
    });

    await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/budgets`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        budgetName: "E2E budget",
        validFrom: "2026-03-01",
        lines: [
          { lineKind: "cost", categoryCode: "labor", reportingPeriod: "202603", amount: 40000, employmentId: employee.employment.employmentId },
          { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202603", amount: 8000 },
          { lineKind: "cost", categoryCode: "labor", reportingPeriod: "202604", amount: 25000, employmentId: employee.employment.employmentId },
          { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202604", amount: 18000 }
        ]
      }
    });
    await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/resource-allocations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        reportingPeriod: "202603",
        plannedMinutes: 960,
        billableMinutes: 960,
        billRateAmount: 1000,
        costRateAmount: 600,
        activityCode: "CONSULTING"
      }
    });

    await requestJson(enabledBaseUrl, "/v1/time/entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        workDate: "2026-03-12",
        projectId: project.projectId,
        activityCode: "CONSULTING",
        workedMinutes: 480
      }
    });
    const projectBenefit = await requestJson(enabledBaseUrl, "/v1/benefits/events", {
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
        sourceId: "phase10-e2e-benefit-202603",
        sourcePayload: {
          insurancePremium: 1000
        },
        dimensionJson: {
          projectId: project.projectId
        }
      }
    });
    await requestJson(enabledBaseUrl, `/v1/benefits/events/${projectBenefit.benefitEventId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(enabledBaseUrl, "/v1/travel/claims", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        purpose: "E2E site visit",
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
        expenseReceipts: [
          {
            date: "2026-03-10",
            expenseType: "parking",
            paymentMethod: "private_card",
            amount: 140,
            currencyCode: "SEK"
          }
        ],
        dimensionJson: {
          projectId: project.projectId
        }
      }
    });
    await requestJson(enabledBaseUrl, "/v1/pension/enrollments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employeeId: employee.employee.employeeId,
        employmentId: employee.employment.employmentId,
        planCode: "ITP1",
        startsOn: "2025-01-01",
        contributionMode: "rate_percent",
        contributionRatePercent: 4.5,
        dimensionJson: {
          projectId: project.projectId
        }
      }
    });

    const payCalendar = (
      await requestJson(enabledBaseUrl, `/v1/payroll/pay-calendars?companyId=${COMPANY_ID}`, {
        token: sessionToken
      })
    ).items[0];
    const payRun = await requestJson(enabledBaseUrl, "/v1/payroll/pay-runs", {
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
    assert.equal(payRun.lines.some((line) => line.payItemCode === "PENSION_PREMIUM"), true);
    assert.equal(payRun.lines.some((line) => line.sourceType === "benefit_event"), true);
    assert.equal(payRun.lines.some((line) => line.sourceType === "travel_claim"), true);

    await requestJson(enabledBaseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });

    const item = await requestJson(enabledBaseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "PROJECT-E2E-ITEM",
        description: "E2E project service",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1000,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25",
        projectBoundFlag: true
      }
    });
    const invoice = await requestJson(enabledBaseUrl, "/v1/ar/invoices", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        invoiceType: "standard",
        issueDate: "2026-03-20",
        dueDate: "2026-04-19",
        lines: [
          {
            itemId: item.arItemId,
            quantity: 1,
            unitPrice: 3000,
            projectId: project.projectId
          }
        ]
      }
    });
    await requestJson(enabledBaseUrl, `/v1/ar/invoices/${invoice.customerInvoiceId}/issue`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });

    const costSnapshot = await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/cost-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-03-31"
      }
    });
    const payrollCostAllocations = await requestJson(
      enabledBaseUrl,
      `/v1/projects/${project.projectId}/payroll-cost-allocations?companyId=${COMPANY_ID}&projectCostSnapshotId=${costSnapshot.projectCostSnapshotId}`,
      {
        token: sessionToken
      }
    );
    const wipSnapshot = await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/wip-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-03-31"
      }
    });
    const forecastSnapshot = await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/forecast-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-03-31"
      }
    });

    const projectDetail = await requestJson(
      enabledBaseUrl,
      `/v1/projects/${project.projectId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const budgets = await requestJson(
      enabledBaseUrl,
      `/v1/projects/${project.projectId}/budgets?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const allocations = await requestJson(
      enabledBaseUrl,
      `/v1/projects/${project.projectId}/resource-allocations?companyId=${COMPANY_ID}&reportingPeriod=202603`,
      { token: sessionToken }
    );
    const auditEvents = await requestJson(
      enabledBaseUrl,
      `/v1/projects/${project.projectId}/audit-events?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );

    assert.equal(projectDetail.projectReferenceCode, "project-e2e-101");
    assert.equal(budgets.items.length, 1);
    assert.equal(allocations.items[0].plannedMinutes, 960);
    assert.equal(costSnapshot.costBreakdown.salaryAmount > 0, true);
    assert.equal(costSnapshot.costBreakdown.benefitAmount > 0, true);
    assert.equal(costSnapshot.costBreakdown.pensionAmount > 0, true);
    assert.equal(costSnapshot.costBreakdown.travelAmount > 0, true);
    assert.equal(costSnapshot.costBreakdown.employerContributionAmount > 0, true);
    assert.equal(payrollCostAllocations.items.length, costSnapshot.sourceCounts.payrollAllocations);
    assert.equal(payrollCostAllocations.items.some((item) => item.costBucketCode === "employer_contribution"), true);
    assert.equal(wipSnapshot.approvedValueAmount, 8000);
    assert.equal(wipSnapshot.billedAmount, 3000);
    assert.equal(wipSnapshot.wipAmount, 5000);
    assert.equal(forecastSnapshot.forecastRevenueAtCompletionAmount, 21000);
    assert.equal(forecastSnapshot.resourceLoadPercent, 50);
    assert.equal(auditEvents.items.some((event) => event.action === "project.cost_snapshot.materialized"), true);
    assert.equal(auditEvents.items.some((event) => event.action === "project.forecast_snapshot.materialized"), true);
  } finally {
    await stopServer(disabledServer);
    await stopServer(enabledServer);
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
    phase9TravelEnabled: true,
    phase9PensionEnabled: true,
    phase10ProjectsEnabled: true
  };
}

async function createEmployeeWithContract({ baseUrl, token, givenName, familyName, workEmail, monthlySalary }) {
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
      jobTitle: "Project operator",
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
      bankName: "Project E2E Bank",
      primaryAccount: true
    }
  });
  return { employee, employment };
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

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.4 API exposes resource, risk and portfolio runtime", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-05-05T09:00:00Z")
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

    const root = await requestJson(baseUrl, "/", { token: sessionToken });
    for (const route of [
      "/v1/projects/portfolio/nodes",
      "/v1/projects/portfolio/summary",
      "/v1/projects/:projectId/capacity-reservations",
      "/v1/projects/:projectId/capacity-reservations/:projectCapacityReservationId/status",
      "/v1/projects/:projectId/assignment-plans",
      "/v1/projects/:projectId/assignment-plans/:projectAssignmentPlanId/status",
      "/v1/projects/:projectId/risks",
      "/v1/projects/:projectId/risks/:projectRiskId/status"
    ]) {
      assert.equal(root.routes.includes(route), true, `${route} should be published`);
    }

    const customer = platform.createCustomer({
      companyId: COMPANY_ID,
      legalName: "API Portfolio Customer AB",
      organizationNumber: "5566778824",
      countryCode: "SE",
      languageCode: "SV",
      currencyCode: "SEK",
      paymentTermsCode: "NET30",
      invoiceDeliveryMethod: "pdf_email",
      reminderProfileCode: "standard",
      billingAddress: {
        line1: "API portfolio road 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      },
      deliveryAddress: {
        line1: "API portfolio road 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      },
      actorId: "system"
    });
    const employee = platform.createEmployee({
      companyId: COMPANY_ID,
      givenName: "Ari",
      familyName: "Planner",
      workEmail: "phase14.portfolio.api@example.com",
      actorId: "system"
    });
    const employment = platform.createEmployment({
      companyId: COMPANY_ID,
      employeeId: employee.employeeId,
      employmentTypeCode: "permanent",
      jobTitle: "Delivery architect",
      payModelCode: "monthly_salary",
      startDate: "2026-01-01",
      actorId: "system"
    });

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-144",
        projectReferenceCode: "phase14-api-144",
        displayName: "Phase 14.4 API project",
        customerId: customer.customerId,
        projectManagerEmployeeId: employee.employeeId,
        startsOn: "2026-05-01",
        status: "active",
        billingModelCode: "retainer_capacity",
        revenueRecognitionModelCode: "over_time",
        contractValueAmount: 150000
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/budgets`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        budgetName: "API portfolio budget",
        validFrom: "2026-05-01",
        lines: [
          { lineKind: "cost", categoryCode: "labor", reportingPeriod: "202605", amount: 90000, employmentId: employment.employmentId },
          { lineKind: "revenue", categoryCode: "revenue", reportingPeriod: "202605", amount: 160000 }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/resource-allocations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        reportingPeriod: "202605",
        plannedMinutes: 4800,
        billableMinutes: 4200,
        billRateAmount: 1300,
        costRateAmount: 750,
        activityCode: "DELIVERY",
        status: "confirmed"
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/forecast-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-05-31"
      }
    });

    const statusUpdate = await requestJson(baseUrl, `/v1/projects/${project.projectId}/status-updates`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        statusDate: "2026-05-10",
        healthCode: "amber",
        progressPercent: 38,
        blockerCodes: ["customer_signoff_pending"],
        atRiskReason: "Pending design signoff",
        note: "Weekly API update"
      }
    });

    const reservation = await requestJson(baseUrl, `/v1/projects/${project.projectId}/capacity-reservations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        roleCode: "delivery_architect",
        skillCodes: ["erp_delivery", "integration"],
        startsOn: "2026-05-01",
        endsOn: "2026-05-31",
        reservedMinutes: 4800,
        billableMinutes: 4200,
        note: "Reserved delivery capacity"
      }
    });
    const approvedReservation = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/capacity-reservations/${reservation.projectCapacityReservationId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "approved"
        }
      }
    );
    assert.equal(approvedReservation.status, "approved");

    const assignmentPlan = await requestJson(baseUrl, `/v1/projects/${project.projectId}/assignment-plans`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        projectCapacityReservationId: reservation.projectCapacityReservationId,
        roleCode: "delivery_architect",
        skillCodes: ["erp_delivery", "integration"],
        startsOn: "2026-05-05",
        endsOn: "2026-05-28",
        plannedMinutes: 4200,
        billableMinutes: 4000,
        deliveryModeCode: "hybrid",
        note: "Assignment plan for May"
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/assignment-plans/${assignmentPlan.projectAssignmentPlanId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "approved"
      }
    });
    const startedAssignment = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/assignment-plans/${assignmentPlan.projectAssignmentPlanId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "in_progress"
        }
      }
    );
    assert.equal(startedAssignment.status, "in_progress");

    const risk = await requestJson(baseUrl, `/v1/projects/${project.projectId}/risks`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        title: "Delayed signoff",
        description: "Customer steering group may move the signoff date",
        categoryCode: "schedule",
        severityCode: "high",
        probabilityCode: "high",
        ownerEmployeeId: employee.employeeId,
        mitigationPlan: "Escalate via sponsor",
        dueDate: "2026-05-15",
        sourceProjectStatusUpdateId: statusUpdate.projectStatusUpdateId
      }
    });
    assert.equal(risk.status, "open");

    const mitigatingRisk = await requestJson(baseUrl, `/v1/projects/${project.projectId}/risks/${risk.projectRiskId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "mitigating",
        mitigationPlan: "Sponsor escalation sent"
      }
    });
    assert.equal(mitigatingRisk.status, "mitigating");

    const listedReservations = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/capacity-reservations?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(listedReservations.items.length, 1);

    const listedAssignments = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/assignment-plans?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(listedAssignments.items[0].status, "in_progress");

    const listedRisks = await requestJson(baseUrl, `/v1/projects/${project.projectId}/risks?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(listedRisks.items.length, 1);

    const portfolioNodes = await requestJson(baseUrl, `/v1/projects/portfolio/nodes?companyId=${COMPANY_ID}&atRiskOnly=true`, {
      token: sessionToken
    });
    assert.equal(portfolioNodes.items.some((item) => item.projectId === project.projectId), true);

    const portfolioSummary = await requestJson(baseUrl, `/v1/projects/portfolio/summary?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(portfolioSummary.totalProjectCount >= 1, true);
    assert.equal(portfolioSummary.totalOpenRiskCount >= 1, true);
    assert.equal(portfolioSummary.roleDemand.some((item) => item.roleCode === "DELIVERY_ARCHITECT"), true);

    const workspace = await requestJson(baseUrl, `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-05-31`, {
      token: sessionToken
    });
    assert.equal(workspace.capacityReservationCount, 1);
    assert.equal(workspace.assignmentPlanCount, 1);
    assert.equal(workspace.openProjectRiskCount, 1);
    assert.equal(workspace.currentPortfolioNode.atRiskFlag, true);
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
    phase9TravelEnabled: true,
    phase9PensionEnabled: true,
    phase10ProjectsEnabled: true,
    phase10FieldEnabled: true,
    phase10BuildEnabled: true
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: { companyId, email }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: { code: platform.getTotpCodeForTesting({ companyId, email }) }
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

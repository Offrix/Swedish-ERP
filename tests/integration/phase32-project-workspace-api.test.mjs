import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Step 32 migration adds project workspace deviation schema", async () => {
  const migration = await readText("packages/db/migrations/20260325005000_phase14_project_workspace_contract.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS project_deviations",
    "deviation_type_code TEXT NOT NULL",
    "severity_code TEXT NOT NULL",
    "source_domain_code TEXT NOT NULL",
    "resolution_note TEXT NULL",
    "phase14 project workspace contract"
  ]) {
    assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Step 32 API exposes project workspace and deviation lifecycle across connected operational domains", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T11:30:00Z")
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
      "/v1/projects/:projectId/workspace",
      "/v1/projects/:projectId/deviations",
      "/v1/projects/:projectId/deviations/:projectDeviationId/assign",
      "/v1/projects/:projectId/deviations/:projectDeviationId/status"
    ]) {
      assert.equal(root.routes.includes(route), true);
    }

    await requestJson(baseUrl, "/v1/ledger/chart/install", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: { companyId: COMPANY_ID }
    });

    const customer = await createCustomer({
      baseUrl,
      token: sessionToken,
      legalName: "Workspace API Customer AB",
      organizationNumber: "5566889902"
    });
    const employee = await createEmployeeWithContract({
      baseUrl,
      token: sessionToken,
      givenName: "Wilma",
      familyName: "Workspace",
      workEmail: "wilma.workspace.api@example.com",
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

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-3201",
        projectReferenceCode: "project-api-3201",
        displayName: "Workspace API Project",
        customerId: customer.customerId,
        projectManagerEmployeeId: employee.employee.employeeId,
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 180000
      }
    });
    const siblingProject = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-API-3202",
        projectReferenceCode: "project-api-3202",
        displayName: "Workspace API Project 2",
        customerId: customer.customerId,
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 120000
      }
    });

    await requestJson(baseUrl, "/v1/time/entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employee.employment.employmentId,
        workDate: "2026-03-12",
        projectId: project.projectId,
        activityCode: "INSTALLATION",
        workedMinutes: 480
      }
    });

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
    await requestJson(baseUrl, `/v1/payroll/pay-runs/${payRun.payRunId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/budgets`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        budgetName: "Workspace API budget",
        validFrom: "2026-03-01",
        lines: [
          {
            lineKind: "cost",
            categoryCode: "labor",
            reportingPeriod: "202603",
            amount: 42000,
            employmentId: employee.employment.employmentId
          },
          {
            lineKind: "revenue",
            categoryCode: "revenue",
            reportingPeriod: "202603",
            amount: 90000
          }
        ]
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/resource-allocations`, {
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
        costRateAmount: 650,
        activityCode: "INSTALLATION"
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/cost-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-03-31"
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/wip-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-03-31"
      }
    });
    await requestJson(baseUrl, `/v1/projects/${project.projectId}/forecast-snapshots`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        cutoffDate: "2026-03-31"
      }
    });

    const workOrder = await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "Workspace work order",
        description: "Operational workspace order",
        serviceTypeCode: "service",
        priorityCode: "high",
        laborRateAmount: 950
      }
    });
    await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: siblingProject.projectId,
        displayName: "Sibling work order",
        description: "Noise for project filter",
        serviceTypeCode: "service",
        priorityCode: "normal",
        laborRateAmount: 850
      }
    });

    const projectWorkOrders = await requestJson(
      baseUrl,
      `/v1/field/work-orders?companyId=${COMPANY_ID}&projectId=${project.projectId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(projectWorkOrders.items.length, 1);
    assert.equal(projectWorkOrders.items[0].projectId, project.projectId);

    const husCase = await requestJson(baseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        projectId: project.projectId,
        serviceTypeCode: "rot",
        workCompletedOn: "2026-03-18",
        housingFormCode: "smallhouse",
        propertyDesignation: "UPPSALA SUNNERSTA 1:25",
        serviceAddressLine1: "Projektgatan 10",
        postalCode: "75320",
        city: "Uppsala",
        executorFskattApproved: true,
        executorFskattValidatedOn: "2026-03-01"
      }
    });
    await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/classify`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        buyers: [
          {
            displayName: "Anna Andersson",
            personalIdentityNumber: "197501019991",
            allocationPercent: 100
          }
        ],
        serviceLines: [
          {
            description: "ROT labor and material",
            serviceTypeCode: "rot",
            workedHours: 8,
            laborCostAmount: 10000,
            materialAmount: 5000
          }
        ]
      }
    });

    const site = await requestJson(baseUrl, "/v1/personalliggare/sites", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        siteCode: "SITE-32-API-001",
        siteName: "Workspace API Site",
        siteAddress: "Bygggatan 32, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: 250000,
        startDate: "2026-03-20",
        projectId: project.projectId
      }
    });
    assert.equal(site.thresholdRequiredFlag, true);

    const template = await requestJson(baseUrl, "/v1/egenkontroll/templates", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        templateCode: "EK-32-API",
        displayName: "Workspace API Checklist",
        sections: [
          {
            sectionCode: "install",
            label: "Installation",
            points: [
              {
                pointCode: "photo_marking",
                label: "Fotodokumentation",
                evidenceRequiredFlag: true
              }
            ]
          }
        ],
        requiredSignoffRoleCodes: ["site_lead"]
      }
    });
    const activeTemplate = await requestJson(baseUrl, `/v1/egenkontroll/templates/${template.checklistTemplateId}/activate`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const checklistInstance = await requestJson(baseUrl, "/v1/egenkontroll/instances", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        checklistTemplateId: activeTemplate.checklistTemplateId,
        projectId: project.projectId,
        workOrderId: workOrder.workOrderId,
        assignedToUserId: "field-user-1"
      }
    });
    const checklistDeviation = await requestJson(
      baseUrl,
      `/v1/egenkontroll/instances/${checklistInstance.checklistInstanceId}/deviations`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          pointCode: "photo_marking",
          severityCode: "major",
          title: "Saknar foto",
          description: "Fotobevis saknas i fÃ¶rsta kÃ¶rningen."
        }
      }
    );
    assert.equal(checklistDeviation.status, "open");

    const estimate = await requestJson(baseUrl, "/v1/kalkyl/estimates", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        customerId: customer.customerId,
        projectId: project.projectId,
        title: "Workspace API estimate",
        validFrom: "2026-03-25",
        validTo: "2026-04-25"
      }
    });
    await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/lines`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        lineTypeCode: "labor",
        description: "Installation labor",
        quantity: 16,
        unitCode: "hour",
        costAmount: 8000,
        salesAmount: 16000,
        projectPhaseCode: "INSTALL"
      }
    });
    await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/review`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/kalkyl/estimates/${estimate.estimateVersionId}/approve`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );
    assert.equal(workspace.projectId, project.projectId);
    assert.equal(workspace.openWorkOrderCount, 1);
    assert.equal(workspace.husCaseCount, 1);
    assert.equal(workspace.personalliggareAlertCount, 1);
    assert.equal(workspace.egenkontrollSummary.openDeviationCount, 1);
    assert.equal(workspace.kalkylSummary.estimateCount, 1);
    assert.equal(workspace.kalkylSummary.latestEstimateStatus, "approved");
    assert.equal(workspace.payrollActuals.actualCostAmount > 0, true);
    assert.equal(
      workspace.complianceIndicatorStrip.some(
        (indicator) => indicator.indicatorCode === "personalliggare" && indicator.status === "warning"
      ),
      true
    );

    const deviation = await requestJson(baseUrl, `/v1/projects/${project.projectId}/deviations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        deviationTypeCode: "safety",
        severityCode: "critical",
        title: "Open trench without barrier",
        description: "Barrier was missing during inspection.",
        sourceDomainCode: "field",
        sourceObjectId: workOrder.workOrderId
      }
    });
    assert.equal(deviation.status, "open");

    const assigned = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/deviations/${deviation.projectDeviationId}/assign`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          ownerUserId: "project-manager-1"
        }
      }
    );
    assert.equal(assigned.ownerUserId, "project-manager-1");

    const inProgress = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/deviations/${deviation.projectDeviationId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "in_progress"
        }
      }
    );
    assert.equal(inProgress.status, "in_progress");

    const resolved = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/deviations/${deviation.projectDeviationId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "resolved",
          resolutionNote: "Temporary barriers installed and checked by site lead."
        }
      }
    );
    assert.equal(resolved.status, "resolved");

    const closed = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/deviations/${deviation.projectDeviationId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "closed",
          resolutionNote: "Permanent fix verified and closed."
        }
      }
    );
    assert.equal(closed.status, "closed");

    const deviations = await requestJson(baseUrl, `/v1/projects/${project.projectId}/deviations?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(deviations.items.length, 1);
    assert.equal(deviations.items[0].status, "closed");
    assert.equal(deviations.items[0].ownerUserId, "project-manager-1");

    const postCloseWorkspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );
    assert.equal(postCloseWorkspace.openProjectDeviationCount, 0);
    assert.equal(postCloseWorkspace.projectDeviations.length, 0);
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

async function createCustomer({ baseUrl, token, legalName, organizationNumber }) {
  return requestJson(baseUrl, "/v1/ar/customers", {
    method: "POST",
    token,
    expectedStatus: 201,
    body: {
      companyId: COMPANY_ID,
      legalName,
      organizationNumber,
      countryCode: "SE",
      languageCode: "SV",
      currencyCode: "SEK",
      paymentTermsCode: "NET30",
      invoiceDeliveryMethod: "pdf_email",
      reminderProfileCode: "standard",
      billingAddress: {
        line1: "Projektgatan 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      },
      deliveryAddress: {
        line1: "Projektgatan 1",
        postalCode: "11157",
        city: "Stockholm",
        countryCode: "SE"
      }
    }
  });
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
      jobTitle: "Project consultant",
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
      bankName: "Project API Bank",
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

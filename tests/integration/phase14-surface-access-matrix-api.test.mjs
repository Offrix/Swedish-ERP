import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 14 access matrix denies field users on critical desktop-only surfaces", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T09:30:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    platform.createCompanyUser({
      sessionToken: adminToken,
      companyId: DEMO_IDS.companyId,
      email: "phase14-access-matrix-field@example.test",
      displayName: "Phase 14 Access Matrix Field",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldUserToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "phase14-access-matrix-field@example.test"
    });
    const personalliggareSite = await requestJson(baseUrl, "/v1/personalliggare/sites", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        siteCode: "SITE-ACCESS-MATRIX-001",
        siteName: "Access Matrix Site",
        siteAddress: "Kontrollgatan 14, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: 450000,
        startDate: "2026-03-25",
        industryPackCode: "bygg",
        workplaceIdentifier: "ARB-ACCESS-001"
      }
    });
    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        projectCode: "P-ACCESS-001",
        projectReferenceCode: "project-access-001",
        displayName: "Access Matrix Project",
        startsOn: "2026-03-25",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 125000
      }
    });
    const fieldWorkOrder = await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        projectId: project.projectId,
        displayName: "Access Matrix Field Work Order",
        serviceTypeCode: "installation",
        laborRateAmount: 850
      }
    });
    const checklistTemplate = await requestJson(baseUrl, "/v1/egenkontroll/templates", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        templateCode: "EK-ACCESS-001",
        displayName: "Access Matrix Checklist",
        industryPackCode: "bygg",
        riskClassCode: "standard",
        sections: [
          {
            sectionCode: "install",
            label: "Installation",
            points: [{ pointCode: "mount", label: "Mount component", evidenceRequiredFlag: false }]
          }
        ],
        requiredSignoffRoleCodes: ["site_lead"]
      }
    });
    await requestJson(baseUrl, `/v1/egenkontroll/templates/${checklistTemplate.checklistTemplateId}/activate`, {
      method: "POST",
      token: adminToken,
      body: { companyId: DEMO_IDS.companyId }
    });
    const checklistInstance = await requestJson(baseUrl, "/v1/egenkontroll/instances", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        checklistTemplateId: checklistTemplate.checklistTemplateId,
        projectId: project.projectId
      }
    });

    for (const surface of [
      { path: `/v1/ledger/accounts?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/reporting/metric-definitions?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/vat/codes?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/ar/customers?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/ap/suppliers?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/search/contracts?companyId=${DEMO_IDS.companyId}`, error: "desktop_surface_role_forbidden" },
      { path: `/v1/search/documents?companyId=${DEMO_IDS.companyId}&query=trial`, error: "desktop_surface_role_forbidden" },
      { path: `/v1/saved-views?companyId=${DEMO_IDS.companyId}`, error: "desktop_surface_role_forbidden" },
      { path: `/v1/dashboard/widgets?companyId=${DEMO_IDS.companyId}&surfaceCode=desktop_reporting`, error: "desktop_surface_role_forbidden" },
      { path: `/v1/banking/statement-events?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/hus/decision-differences?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/fiscal-years/history?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/review-center/queues?companyId=${DEMO_IDS.companyId}`, error: "review_center_role_forbidden" },
      { path: `/v1/activity?companyId=${DEMO_IDS.companyId}`, error: "activity_feed_role_forbidden" },
      { path: `/v1/hr/employees?companyId=${DEMO_IDS.companyId}`, error: "hr_operations_role_forbidden" },
      { path: `/v1/hr/leave-entries?companyId=${DEMO_IDS.companyId}`, error: "hr_operations_role_forbidden" },
      { path: `/v1/payroll/pay-runs?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      { path: `/v1/payroll/agi-submissions?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      {
        path: `/v1/personalliggare/sites/${personalliggareSite.constructionSiteId}/identity-snapshots?companyId=${DEMO_IDS.companyId}`,
        error: "personalliggare_control_role_forbidden"
      },
      {
        path: `/v1/personalliggare/sites/${personalliggareSite.constructionSiteId}/contractor-snapshots?companyId=${DEMO_IDS.companyId}`,
        error: "personalliggare_control_role_forbidden"
      },
      {
        path: `/v1/personalliggare/sites/${personalliggareSite.constructionSiteId}/kiosk-devices?companyId=${DEMO_IDS.companyId}`,
        error: "personalliggare_control_role_forbidden"
      },
      {
        path: `/v1/personalliggare/sites/${personalliggareSite.constructionSiteId}/exports?companyId=${DEMO_IDS.companyId}`,
        error: "personalliggare_control_role_forbidden"
      },
      {
        path: `/v1/personalliggare/audit-events?companyId=${DEMO_IDS.companyId}&constructionSiteId=${personalliggareSite.constructionSiteId}`,
        error: "personalliggare_control_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/workspace?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/deviations?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/budgets?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/resource-allocations?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/payroll-cost-allocations?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/cost-snapshots?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/wip-snapshots?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/forecast-snapshots?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/change-orders?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/build-vat-decisions?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/audit-events?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/field/work-orders/${fieldWorkOrder.workOrderId}/dispatches?companyId=${DEMO_IDS.companyId}`,
        error: "field_control_role_forbidden"
      },
      {
        path: `/v1/field/audit-events?companyId=${DEMO_IDS.companyId}&workOrderId=${fieldWorkOrder.workOrderId}`,
        error: "field_control_role_forbidden"
      },
      {
        path: `/v1/egenkontroll/templates?companyId=${DEMO_IDS.companyId}`,
        error: "egenkontroll_control_role_forbidden"
      },
      {
        path: `/v1/egenkontroll/templates/${checklistTemplate.checklistTemplateId}?companyId=${DEMO_IDS.companyId}`,
        error: "egenkontroll_control_role_forbidden"
      },
      {
        path: `/v1/egenkontroll/instances?companyId=${DEMO_IDS.companyId}&projectId=${project.projectId}`,
        error: "egenkontroll_control_role_forbidden"
      },
      {
        path: `/v1/egenkontroll/instances/${checklistInstance.checklistInstanceId}/deviations?companyId=${DEMO_IDS.companyId}`,
        error: "egenkontroll_control_role_forbidden"
      },
      {
        path: `/v1/egenkontroll/instances/${checklistInstance.checklistInstanceId}/signoffs?companyId=${DEMO_IDS.companyId}`,
        error: "egenkontroll_control_role_forbidden"
      },
      { path: `/v1/ops/feature-flags?companyId=${DEMO_IDS.companyId}`, error: "backoffice_role_forbidden" },
      { path: `/v1/migration/cockpit?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      { path: `/v1/legal-forms/profiles?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/annual-reporting/packages?companyId=${DEMO_IDS.companyId}`, error: "annual_operations_role_forbidden" },
      { path: `/v1/backoffice/support-cases?companyId=${DEMO_IDS.companyId}`, error: "backoffice_role_forbidden" }
    ]) {
      const response = await requestJson(baseUrl, surface.path, {
        token: fieldUserToken,
        expectedStatus: 403
      });
      assert.equal(response.error, surface.error, surface.path);
    }
  } finally {
    await stopServer(server);
  }
});

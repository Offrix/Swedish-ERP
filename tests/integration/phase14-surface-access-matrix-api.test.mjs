import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
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
    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        legalName: "Access Matrix Kalkylkund AB",
        organizationNumber: "5566778899",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "30d",
        invoiceDeliveryMethod: "email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Offertgatan 10",
          postalCode: "11122",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });
    const estimate = await requestJson(baseUrl, "/v1/kalkyl/estimates", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        customerId: customer.customerId,
        projectId: project.projectId,
        title: "Access Matrix Estimate",
        validFrom: "2026-03-25",
        validTo: "2026-04-25"
      }
    });
    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        givenName: "Tina",
        familyName: "Tid",
        identityType: "personnummer",
        identityValue: "900101-1239"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        employmentTypeCode: "permanent",
        jobTitle: "MontÃ¶r",
        payModelCode: "hourly_salary",
        startDate: "2026-03-01"
      }
    });
    const document = await requestJson(baseUrl, "/v1/documents", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        documentType: "supplier_invoice",
        sourceChannel: "manual",
        sourceReference: "phase14-access-matrix-doc"
      }
    });
    await requestJson(baseUrl, `/v1/documents/${document.documentId}/versions`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        variantType: "original",
        storageKey: "documents/originals/phase14-access-matrix-doc.pdf",
        mimeType: "application/pdf",
        contentText: "phase14 access matrix source"
      }
    });
    const inboxChannel = await requestJson(baseUrl, "/v1/inbox/channels", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        channelCode: "access_matrix_ap_inbox",
        inboundAddress: "access-matrix-ap@inbound.example.test",
        useCase: "supplier_invoice_inbox",
        allowedMimeTypes: ["application/pdf"],
        maxAttachmentSizeBytes: 1048576,
        defaultDocumentType: "supplier_invoice",
        classificationConfidenceThreshold: 0.9,
        fieldConfidenceThreshold: 0.9
      }
    });
    const inboxMessage = await requestJson(baseUrl, "/v1/inbox/messages", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        recipientAddress: inboxChannel.inboundAddress,
        messageId: "<phase14-access-matrix@inbound.example.test>",
        rawStorageKey: "raw-mail/company/phase14-access-matrix.eml",
        senderAddress: "supplier@example.test",
        subject: "Access Matrix Invoice",
        attachments: [
          {
            filename: "access-matrix-invoice.pdf",
            mimeType: "application/pdf",
            storageKey: "documents/originals/access-matrix-invoice.pdf",
            contentText: "invoice content"
          }
        ]
      }
    });
    const reviewSourceDocumentId = inboxMessage.routedDocuments[0].documentId;
    const reviewRun = await requestJson(baseUrl, `/v1/documents/${reviewSourceDocumentId}/ocr/runs`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        reasonCode: "access_matrix_review"
      }
    });
    const classificationCase = await requestJson(baseUrl, `/v1/documents/${document.documentId}/classification-cases`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        lineInputs: [
          {
            description: "Access Matrix Benefit",
            amount: 1000,
            treatmentCode: "TAXABLE_BENEFIT",
            person: {
              employeeId: employee.employeeId,
              employmentId: employment.employmentId,
              personRelationCode: "employee"
            },
            factsJson: {
              benefitCode: "HEALTH_INSURANCE",
              insurancePremium: 1000,
              taxablePremiumRatio: 0.6
            }
          }
        ]
      }
    });
    const importCase = await requestJson(baseUrl, "/v1/import-cases", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        caseReference: "IMP-ACCESS-001",
        goodsOriginCountry: "CN",
        customsReference: "IMP-CUST-ACCESS-001",
        initialDocuments: [
          {
            documentId: document.documentId,
            roleCode: "PRIMARY_SUPPLIER_DOCUMENT"
          }
        ],
        initialComponents: [
          {
            componentType: "GOODS",
            amount: 10000
          }
        ]
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
      { path: `/v1/search/contracts?companyId=${DEMO_IDS.companyId}`, error: "search_workspace_role_forbidden" },
      { path: `/v1/search/documents?companyId=${DEMO_IDS.companyId}&query=trial`, error: "search_workspace_role_forbidden" },
      { path: `/v1/saved-views?companyId=${DEMO_IDS.companyId}`, error: "search_workspace_role_forbidden" },
      { path: `/v1/dashboard/widgets?companyId=${DEMO_IDS.companyId}&surfaceCode=desktop_reporting`, error: "desktop_surface_role_forbidden" },
      { path: `/v1/documents/${document.documentId}/export?companyId=${DEMO_IDS.companyId}`, error: "desktop_surface_role_forbidden" },
      {
        path: `/v1/inbox/messages/${inboxMessage.message.emailIngestMessageId}?companyId=${DEMO_IDS.companyId}`,
        error: "desktop_surface_role_forbidden"
      },
      { path: `/v1/documents/${reviewSourceDocumentId}/ocr/runs?companyId=${DEMO_IDS.companyId}`, error: "desktop_surface_role_forbidden" },
      {
        path: `/v1/review-tasks/${reviewRun.reviewTask.reviewTaskId}?companyId=${DEMO_IDS.companyId}`,
        error: "desktop_surface_role_forbidden"
      },
      {
        path: `/v1/documents/${document.documentId}/classification-cases?companyId=${DEMO_IDS.companyId}`,
        error: "review_center_role_forbidden"
      },
      {
        path: `/v1/documents/${document.documentId}/classification-cases/${classificationCase.classificationCaseId}?companyId=${DEMO_IDS.companyId}`,
        error: "review_center_role_forbidden"
      },
      { path: `/v1/banking/statement-events?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/hus/decision-differences?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/accounting-method/history?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/fiscal-years/history?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/tax-account/events?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      { path: `/v1/import-cases?companyId=${DEMO_IDS.companyId}`, error: "finance_operations_role_forbidden" },
      {
        path: `/v1/import-cases/${importCase.importCaseId}?companyId=${DEMO_IDS.companyId}`,
        error: "finance_operations_role_forbidden"
      },
      { path: `/v1/review-center/queues?companyId=${DEMO_IDS.companyId}`, error: "review_center_role_forbidden" },
      { path: `/v1/activity?companyId=${DEMO_IDS.companyId}`, error: "activity_feed_role_forbidden" },
      { path: `/v1/hr/employees?companyId=${DEMO_IDS.companyId}`, error: "hr_operations_role_forbidden" },
      { path: `/v1/hr/leave-entries?companyId=${DEMO_IDS.companyId}`, error: "hr_operations_role_forbidden" },
      { path: `/v1/payroll/pay-runs?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      { path: `/v1/payroll/agi-submissions?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      { path: `/v1/benefits/catalog?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      {
        path: `/v1/travel/claims?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}`,
        error: "payroll_operations_role_forbidden"
      },
      { path: `/v1/pension/plans?companyId=${DEMO_IDS.companyId}`, error: "payroll_operations_role_forbidden" },
      { path: `/v1/projects?companyId=${DEMO_IDS.companyId}`, error: "project_workspace_role_forbidden" },
      { path: `/v1/projects/${project.projectId}?companyId=${DEMO_IDS.companyId}`, error: "project_workspace_role_forbidden" },
      { path: `/v1/kalkyl/estimates?companyId=${DEMO_IDS.companyId}`, error: "project_workspace_role_forbidden" },
      {
        path: `/v1/kalkyl/estimates/${estimate.estimateVersionId}?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      { path: `/v1/time/schedule-templates?companyId=${DEMO_IDS.companyId}`, error: "time_operations_role_forbidden" },
      {
        path: `/v1/time/entries?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}`,
        error: "time_operations_role_forbidden"
      },
      {
        path: `/v1/time/balances?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}&cutoffDate=2026-03-31`,
        error: "time_operations_role_forbidden"
      },
      {
        path: `/v1/time/employment-base?companyId=${DEMO_IDS.companyId}&employmentId=${employment.employmentId}&workDate=2026-03-25`,
        error: "time_operations_role_forbidden"
      },
      { path: `/v1/time/period-locks?companyId=${DEMO_IDS.companyId}`, error: "time_operations_role_forbidden" },
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
        path: `/v1/id06/companies/verifications?companyId=${DEMO_IDS.companyId}`,
        error: "id06_control_role_forbidden"
      },
      {
        path: `/v1/id06/persons/verifications?companyId=${DEMO_IDS.companyId}`,
        error: "id06_control_role_forbidden"
      },
      {
        path: `/v1/id06/cards/statuses?companyId=${DEMO_IDS.companyId}&workplaceId=${personalliggareSite.workplaceId}`,
        error: "id06_control_role_forbidden"
      },
      {
        path: `/v1/id06/workplaces/${personalliggareSite.workplaceId}/bindings?companyId=${DEMO_IDS.companyId}`,
        error: "id06_control_role_forbidden"
      },
      {
        path: `/v1/id06/workplaces/${personalliggareSite.workplaceId}/work-passes?companyId=${DEMO_IDS.companyId}`,
        error: "id06_control_role_forbidden"
      },
      {
        path: `/v1/id06/audit-events?companyId=${DEMO_IDS.companyId}&workplaceId=${personalliggareSite.workplaceId}`,
        error: "id06_control_role_forbidden"
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
        path: `/v1/projects/${project.projectId}/capacity-reservations?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/assignment-plans?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/${project.projectId}/risks?companyId=${DEMO_IDS.companyId}`,
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
        path: `/v1/projects/portfolio/nodes?companyId=${DEMO_IDS.companyId}`,
        error: "project_workspace_role_forbidden"
      },
      {
        path: `/v1/projects/portfolio/summary?companyId=${DEMO_IDS.companyId}`,
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
        path: `/v1/field/operational-cases/${fieldWorkOrder.workOrderId}/material-reservations?companyId=${DEMO_IDS.companyId}`,
        error: "field_control_role_forbidden"
      },
      {
        path: `/v1/field/operational-cases/${fieldWorkOrder.workOrderId}/evidence?companyId=${DEMO_IDS.companyId}`,
        error: "field_control_role_forbidden"
      },
      {
        path: `/v1/field/operational-cases/${fieldWorkOrder.workOrderId}/conflicts?companyId=${DEMO_IDS.companyId}`,
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

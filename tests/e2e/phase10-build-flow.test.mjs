import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createFieldMobileServer } from "../../apps/field-mobile/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.3 e2e covers field-mobile shell, build routes and deterministic operator flow", async () => {
  const clock = () => new Date("2026-03-24T06:00:00Z");
  const enabledPlatform = createApiPlatform({ clock });
  const enabledServer = createApiServer({
    platform: enabledPlatform,
    flags: enabledFlags()
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({ clock }),
    flags: {
      ...enabledFlags(),
      phase10BuildEnabled: false
    }
  });
  const mobileServer = createFieldMobileServer();

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  await new Promise((resolve) => mobileServer.listen(0, resolve));

  const enabledBaseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;
  const mobileBaseUrl = `http://127.0.0.1:${mobileServer.address().port}`;

  try {
    const root = await requestJson(enabledBaseUrl, "/");
    assert.equal(root.phase10BuildEnabled, true);
    assert.equal(root.routes.includes("/v1/projects/:projectId/build-vat-decisions"), true);
    assert.equal(root.routes.includes("/v1/personalliggare/sites"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/personalliggare/sites?companyId=${COMPANY_ID}`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const mobileResponse = await fetch(`${mobileBaseUrl}/`);
    const mobileHtml = await mobileResponse.text();
    assert.equal(mobileResponse.status, 200);
    for (const fragment of ["Personalliggare", "ROT/RUT", "ATA", "Check-in", "Material", "Signatur"]) {
      assert.match(mobileHtml, new RegExp(escapeRegExp(fragment)));
    }

    const sessionToken = await loginWithRequiredFactors({
      baseUrl: enabledBaseUrl,
      platform: enabledPlatform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const project = await requestJson(enabledBaseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-BUILD-E2E",
        projectReferenceCode: "project-build-e2e",
        displayName: "Build E2E Project",
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 140000
      }
    });

    const changeOrder = await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/change-orders`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scopeCode: "addition",
        title: "ATA expansion",
        description: "E2E ATA scenario for build-sector buyer.",
        revenueImpactAmount: 32000,
        costImpactAmount: 17000,
        scheduleImpactMinutes: 240,
        customerApprovalRequiredFlag: true
      }
    });
    await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "quoted"
      }
    });
    await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "approved",
        customerApprovedAt: "2026-03-18"
      }
    });

    const vatAssessment = await requestJson(enabledBaseUrl, `/v1/projects/${project.projectId}/build-vat-decisions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceDocumentId: changeOrder.projectChangeOrderId,
        sourceDocumentType: "project_change_order",
        description: "E2E build VAT assessment",
        invoiceDate: "2026-03-19",
        buyerCountry: "SE",
        buyerType: "company",
        buyerVatNo: "SE556677889901",
        buyerVatNumber: "SE556677889901",
        buyerVatNumberStatus: "valid",
        buyerBuildSectorFlag: true,
        lineAmountExVat: 32000,
        vatRate: 25,
        goodsOrServices: "services"
      }
    });
    assert.equal(vatAssessment.vatCode, "VAT_SE_RC_BUILD_SELL");

    const husCase = await requestJson(enabledBaseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          caseReference: "HUS-E2E-001",
          projectId: project.projectId,
          serviceTypeCode: "rot",
          workCompletedOn: "2026-03-10",
          housingFormCode: "smallhouse",
          propertyDesignation: "UPPSALA SUNNERSTA 1:23",
          executorFskattApproved: true,
          executorFskattValidatedOn: "2026-03-01"
        }
      });
    await requestJson(enabledBaseUrl, `/v1/hus/cases/${husCase.husCaseId}/classify`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        buyers: [
            {
              displayName: "Anna Andersson",
              personalIdentityNumber: "197501019999",
              allocationPercent: 100
            }
          ],
          serviceLines: [
            {
              description: "ROT work",
              serviceTypeCode: "rot",
              workedHours: 8,
              laborCostAmount: 10000,
              materialAmount: 5000
            }
          ]
        }
    });
      await requestJson(enabledBaseUrl, `/v1/hus/cases/${husCase.husCaseId}/invoice`, {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          invoiceNumber: "HUS-E2E-INV-001",
          invoiceIssuedOn: "2026-03-11"
        }
      });
    await requestJson(enabledBaseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          paidAmount: 12000,
          paidOn: "2026-03-15",
          paymentChannel: "bankgiro",
          paymentReference: "BG-E2E-HUS-001"
        }
      });
    const claim = await requestJson(enabledBaseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(enabledBaseUrl, `/v1/hus/claims/${claim.husClaimId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        submittedOn: "2026-03-16"
      }
    });

    const site = await requestJson(enabledBaseUrl, "/v1/personalliggare/sites", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        siteCode: "SITE-E2E-001",
        siteName: "E2E Site",
        siteAddress: "Bygggatan 21, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: 250000,
        startDate: "2026-03-20",
        projectId: project.projectId
      }
    });
    await requestJson(enabledBaseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/registrations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        registrationReference: "PL-E2E-001",
        status: "registered",
        registeredOn: "2026-03-20",
        checklistItems: ["site_created", "builder_confirmed"]
      }
    });
    const attendance = await requestJson(enabledBaseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112222",
        contractorOrgNo: "5561234567",
        eventType: "check_in",
        eventTimestamp: "2026-03-24T06:10:00Z",
        sourceChannel: "mobile",
        deviceId: "e2e-mobile",
        offlineFlag: true
      }
    });
    await requestJson(enabledBaseUrl, `/v1/personalliggare/attendance-events/${attendance.attendanceEventId}/corrections`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        correctedTimestamp: "2026-03-24T06:12:00Z",
        correctedEventType: "check_in",
        correctionReason: "Offline clock drift"
      }
    });
    const exported = await requestJson(enabledBaseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/exports`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        exportType: "audit",
        exportDate: "2026-03-24"
      }
    });
    assert.equal(exported.correctionCount, 1);

    const auditEvents = await requestJson(enabledBaseUrl, `/v1/personalliggare/audit-events?companyId=${COMPANY_ID}&constructionSiteId=${site.constructionSiteId}`, {
      token: sessionToken
    });
    assert.equal(auditEvents.items.some((event) => event.action === "personalliggare.export.created"), true);
  } finally {
    await stopServer(enabledServer);
    await stopServer(disabledServer);
    await stopServer(mobileServer);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

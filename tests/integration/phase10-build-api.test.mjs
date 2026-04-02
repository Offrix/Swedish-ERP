import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.3 migration and seeds cover HUS, project build VAT and personalliggare", async () => {
  const migration = await readText("packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS hus_cases",
    "CREATE TABLE IF NOT EXISTS hus_case_buyers",
    "ALTER TABLE hus_claims",
    "CREATE TABLE IF NOT EXISTS project_change_orders",
    "CREATE TABLE IF NOT EXISTS project_build_vat_assessments",
    "CREATE TABLE IF NOT EXISTS construction_sites",
    "CREATE TABLE IF NOT EXISTS attendance_events",
    "CREATE TABLE IF NOT EXISTS attendance_exports"
  ]) {
    assert.match(migration, new RegExp(escapeRegExp(fragment)));
  }

  const seed = await readText("packages/db/seeds/20260322040010_phase10_build_rules_hus_personalliggare_seed.sql");
  for (const fragment of ["HUS-2026-0001", "Additional cable routing", "SITE-ALPHA-01", "VAT_SE_RC_BUILD_SELL"]) {
    assert.match(seed, new RegExp(escapeRegExp(fragment)));
  }

  const demoSeed = await readText("packages/db/seeds/20260322041000_phase10_build_rules_hus_personalliggare_demo_seed.sql");
  for (const fragment of ["skatteverket_recovery", "SITE-BETA-02", "Offline client clock drift corrected by supervisor."]) {
    assert.match(demoSeed, new RegExp(escapeRegExp(fragment)));
  }
});

test("Phase 10.3 API handles change orders, build VAT, HUS and personalliggare flows", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T06:00:00Z")
  });
  const enabledServer = createApiServer({
    platform,
    flags: enabledFlags()
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({
      clock: () => new Date("2026-03-24T06:00:00Z")
    }),
    flags: {
      ...enabledFlags(),
      phase10BuildEnabled: false
    }
  });

  await new Promise((resolve) => enabledServer.listen(0, resolve));
  await new Promise((resolve) => disabledServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${enabledServer.address().port}`;
  const disabledBaseUrl = `http://127.0.0.1:${disabledServer.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.phase10BuildEnabled, true);
    assert.equal(root.routes.includes("/v1/hus/cases"), true);
    assert.equal(root.routes.includes("/v1/personalliggare/sites/:constructionSiteId/attendance-events"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/hus/cases?companyId=${COMPANY_ID}`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-BUILD-API",
        projectReferenceCode: "project-build-api",
        displayName: "Build API Project",
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 120000
      }
    });

    const changeOrder = await requestJson(baseUrl, `/v1/projects/${project.projectId}/change-orders`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scopeCode: "addition",
        title: "Approved cable route",
        description: "Additional construction service ordered by customer.",
        revenueImpactAmount: 25000,
        costImpactAmount: 12000,
        scheduleImpactMinutes: 180,
        customerApprovalRequiredFlag: true
      }
    });
    assert.equal(changeOrder.status, "draft");

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        nextStatus: "priced"
      }
    });
    const approved = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "approved",
          customerApprovedAt: "2026-03-18"
        }
      }
    );
    assert.equal(approved.status, "approved");
    const applied = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/change-orders/${changeOrder.projectChangeOrderId}/status`,
      {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          nextStatus: "applied",
          effectiveDate: "2026-03-19",
          billingPlanFrequencyCode: "one_off",
          billingPlanTriggerCode: "change_order_approval"
        }
      }
    );
    assert.equal(applied.status, "applied");
    assert.ok(applied.appliedRevenuePlanId);
    assert.ok(applied.appliedBillingPlanId);

    const vatAssessment = await requestJson(baseUrl, `/v1/projects/${project.projectId}/build-vat-decisions`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        sourceDocumentId: changeOrder.projectChangeOrderId,
        sourceDocumentType: "project_change_order",
        description: "Construction reverse-charge test assessment.",
        invoiceDate: "2026-03-19",
        deliveryDate: "2026-03-19",
        buyerCountry: "SE",
        buyerType: "company",
        buyerVatNo: "SE556677889901",
        buyerVatNumber: "SE556677889901",
        buyerVatNumberStatus: "valid",
        buyerIsTaxablePerson: true,
        buyerBuildSectorFlag: true,
        buyerResellsConstructionServicesFlag: false,
        lineAmountExVat: 25000,
        vatRate: 25,
        goodsOrServices: "services"
      }
    });
    assert.equal(vatAssessment.vatCode, "VAT_SE_RC_BUILD_SELL");

    const husCase = await requestJson(baseUrl, "/v1/hus/cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          caseReference: "HUS-API-001",
          projectId: project.projectId,
          serviceTypeCode: "rot",
          workCompletedOn: "2026-03-10",
          housingFormCode: "smallhouse",
          propertyDesignation: "UPPSALA SUNNERSTA 1:23",
          executorFskattApproved: true,
          executorFskattValidatedOn: "2026-03-01"
        }
      });
    const classified = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/classify`, {
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
    assert.equal(classified.preliminaryReductionAmount, 3000);

      await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/invoice`, {
        method: "POST",
        token: sessionToken,
        body: {
          companyId: COMPANY_ID,
          invoiceNumber: "HUS-API-INV-001",
          invoiceIssuedOn: "2026-03-11"
        }
      });
    const paid = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/payments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          paidAmount: 12000,
          paidOn: "2026-03-15",
          paymentChannel: "bankgiro",
          paymentReference: "BG-API-HUS-001"
        }
      });
    assert.equal(paid.status, "claim_ready");

    const claim = await requestJson(baseUrl, `/v1/hus/cases/${husCase.husCaseId}/claims`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        transportType: "json"
      }
    });
    assert.equal(claim.status, "claim_draft");

    const submitted = await requestJson(baseUrl, `/v1/hus/claims/${claim.husClaimId}/submit`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        submittedOn: "2026-03-16"
      }
    });
    assert.equal(submitted.status, "claim_submitted");

    const site = await requestJson(baseUrl, "/v1/personalliggare/sites", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        siteCode: "SITE-API-001",
        siteName: "API Construction Site",
        siteAddress: "Bygggatan 15, Stockholm",
        builderOrgNo: "5561234567",
        estimatedTotalCostExVat: 250000,
        startDate: "2026-03-20",
        projectId: project.projectId
      }
    });
    assert.equal(site.thresholdRequiredFlag, true);

    await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/registrations`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        registrationReference: "PL-API-001",
        status: "registered",
        registeredOn: "2026-03-20",
        checklistItems: ["site_created", "builder_confirmed"]
      }
    });

    const attendance = await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/attendance-events`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        workerIdentityType: "personnummer",
        workerIdentityValue: "198902029999",
        fullNameSnapshot: "Sara Nilsson",
        employerOrgNo: "5561112227",
        contractorOrgNo: "5561234567",
        eventType: "check_in",
        eventTimestamp: "2026-03-24T06:10:00Z",
        sourceChannel: "mobile",
        deviceId: "api-mobile",
        offlineFlag: true,
        geoContext: { lat: 59.3293, lng: 18.0686 }
      }
    });
    assert.equal(attendance.offlineFlag, true);

    const correction = await requestJson(
      baseUrl,
      `/v1/personalliggare/attendance-events/${attendance.attendanceEventId}/corrections`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          correctedTimestamp: "2026-03-24T06:12:00Z",
          correctedEventType: "check_in",
          correctionReason: "Offline clock drift"
        }
      }
    );
    assert.equal(correction.correctionReason, "Offline clock drift");

    const exported = await requestJson(baseUrl, `/v1/personalliggare/sites/${site.constructionSiteId}/exports`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        exportType: "audit",
        exportDate: "2026-03-24"
      }
    });
    assert.equal(exported.eventCount, 2);

    const husAuditEvents = await requestJson(baseUrl, `/v1/hus/audit-events?companyId=${COMPANY_ID}&husCaseId=${husCase.husCaseId}`, {
      token: sessionToken
    });
    const personalliggareAuditEvents = await requestJson(
      baseUrl,
      `/v1/personalliggare/audit-events?companyId=${COMPANY_ID}&constructionSiteId=${site.constructionSiteId}`,
      { token: sessionToken }
    );
    assert.equal(husAuditEvents.items.some((item) => item.action === "hus.claim.submitted"), true);
    assert.equal(personalliggareAuditEvents.items.some((item) => item.action === "personalliggare.export.created"), true);
  } finally {
    await stopServer(enabledServer);
    await stopServer(disabledServer);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

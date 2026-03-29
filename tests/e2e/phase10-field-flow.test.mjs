import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { createFieldMobileServer } from "../../apps/field-mobile/src/server.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.2 e2e covers field-mobile shell, disable flag, offline sync and invoicing", async () => {
  const clock = () => new Date("2026-03-25T06:00:00Z");
  const enabledPlatform = createApiPlatform({ clock });
  const enabledServer = createApiServer({
    platform: enabledPlatform,
    flags: enabledFlags()
  });
  const disabledServer = createApiServer({
    platform: createApiPlatform({ clock }),
    flags: {
      ...enabledFlags(),
      phase10FieldEnabled: false
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
    assert.equal(root.phase10FieldEnabled, true);
    assert.equal(root.routes.includes("/v1/field/inventory/balances"), true);
    assert.equal(root.routes.includes("/v1/field/work-orders/:workOrderId/dispatches/:dispatchAssignmentId/on-site"), true);

    const disabledAttempt = await fetch(`${disabledBaseUrl}/v1/field/work-orders?companyId=${COMPANY_ID}`);
    const disabledPayload = await disabledAttempt.json();
    assert.equal(disabledAttempt.status, 503);
    assert.equal(disabledPayload.error, "feature_disabled");

    const mobileResponse = await fetch(`${mobileBaseUrl}/`);
    const mobileHtml = await mobileResponse.text();
    assert.equal(mobileResponse.status, 200);
    for (const fragment of ["Idag", "Check-in", "Material", "Signatur", "Profil", "Offline state badge"]) {
      assert.match(mobileHtml, new RegExp(escapeRegExp(fragment)));
    }

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
        legalName: "Phase 10.2 E2E Customer AB",
        organizationNumber: "5591223382",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Mobilvagen 7",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Mobilvagen 7",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });
    const employee = await requestJson(enabledBaseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Mia",
        familyName: "Mobile",
        workEmail: "field.e2e.mobile@example.com"
      }
    });
    const employment = await requestJson(enabledBaseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "hourly_assignment",
        jobTitle: "Field operator",
        payModelCode: "hourly_salary",
        startDate: "2026-01-01"
      }
    });
    const project = await requestJson(enabledBaseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-FIELD-E2E",
        projectReferenceCode: "project-field-e2e",
        displayName: "Field E2E Project",
        customerId: customer.customerId,
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 75000
      }
    });
    const laborItem = await requestJson(enabledBaseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-LABOR-E2E",
        description: "Field labor E2E",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1100,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25",
        projectBoundFlag: true
      }
    });
    const materialArItem = await requestJson(enabledBaseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-MATERIAL-E2E",
        description: "Field material E2E",
        itemType: "goods",
        unitCode: "ea",
        standardPrice: 45,
        revenueAccountNumber: "3020",
        vatCode: "VAT_SE_DOMESTIC_25",
        projectBoundFlag: true
      }
    });
    const location = await requestJson(enabledBaseUrl, "/v1/field/inventory/locations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        locationCode: "E2E-WH-01",
        displayName: "E2E Warehouse 01",
        locationType: "warehouse"
      }
    });
    const inventoryItem = await requestJson(enabledBaseUrl, "/v1/field/inventory/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-MATERIAL-E2E",
        displayName: "Field material E2E",
        unitCode: "ea",
        arItemId: materialArItem.arItemId,
        salesUnitPriceAmount: 45,
        locationBalances: [
          {
            inventoryLocationId: location.inventoryLocationId,
            onHandQuantity: 20
          }
        ]
      }
    });

    const workOrder = await requestJson(enabledBaseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "E2E field order",
        serviceTypeCode: "service",
        laborItemId: laborItem.arItemId,
        laborRateAmount: 1100
      }
    });
    const dispatch = await requestJson(enabledBaseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/dispatches`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        startsAt: "2026-03-25T07:00:00Z",
        endsAt: "2026-03-25T09:30:00Z"
      }
    });
    await requestJson(enabledBaseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/dispatches/${dispatch.dispatchAssignmentId}/on-site`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const syncedEnvelope = await requestJson(enabledBaseUrl, "/v1/field/sync/envelopes", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        clientMutationId: "phase10-field-e2e-sync-001",
        clientDeviceId: "field-phone-e2e",
        objectType: "field_material_withdrawal",
        mutationType: "material_withdrawal.create",
        baseServerVersion: 3,
        payload: {
          workOrderId: workOrder.workOrderId,
          inventoryItemId: inventoryItem.inventoryItemId,
          inventoryLocationId: location.inventoryLocationId,
          quantity: 1
        }
      }
    });
    assert.equal(syncedEnvelope.syncStatus, "synced");

    await requestJson(enabledBaseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/customer-signatures`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        signerName: "E2E Customer",
        signedAt: "2026-03-25T09:20:00Z",
        signatureText: "Accepted on site."
      }
    });
    await requestJson(enabledBaseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/complete`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        completedAt: "2026-03-25T09:30:00Z",
        laborMinutes: 75
      }
    });
    const invoiceResult = await requestJson(enabledBaseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/invoice`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        issueDate: "2026-03-25",
        dueDate: "2026-04-24"
      }
    });

    const workOrderDetail = await requestJson(
      enabledBaseUrl,
      `/v1/field/work-orders/${workOrder.workOrderId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const balances = await requestJson(
      enabledBaseUrl,
      `/v1/field/inventory/balances?companyId=${COMPANY_ID}&inventoryItemId=${inventoryItem.inventoryItemId}&inventoryLocationId=${location.inventoryLocationId}`,
      { token: sessionToken }
    );
    const auditEvents = await requestJson(
      enabledBaseUrl,
      `/v1/field/audit-events?companyId=${COMPANY_ID}&workOrderId=${workOrder.workOrderId}`,
      { token: sessionToken }
    );

    assert.equal(invoiceResult.workOrder.status, "invoiced");
    assert.equal(Boolean(workOrderDetail.customerInvoiceId), true);
    assert.equal(balances.items[0].onHandQuantity, 19);
    assert.equal(auditEvents.items.some((event) => event.action === "field.sync.synced"), true);
    assert.equal(auditEvents.items.some((event) => event.action === "field.work_order.invoiced"), true);
  } finally {
    await stopServer(mobileServer);
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
    phase10ProjectsEnabled: true,
    phase10FieldEnabled: true
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

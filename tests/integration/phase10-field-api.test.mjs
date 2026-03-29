import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 10.2 migration and seeds add work-order, inventory and sync artifacts", async () => {
  const migration = await readText("packages/db/migrations/20260322030000_phase10_field_work_orders_mobile_inventory.sql");
  for (const fragment of [
    "ALTER TABLE work_orders",
    "CREATE TABLE IF NOT EXISTS inventory_locations",
    "CREATE TABLE IF NOT EXISTS inventory_items",
    "CREATE TABLE IF NOT EXISTS inventory_balances",
    "CREATE TABLE IF NOT EXISTS field_dispatch_assignments",
    "CREATE TABLE IF NOT EXISTS field_material_withdrawals",
    "CREATE TABLE IF NOT EXISTS field_customer_signatures",
    "CREATE TABLE IF NOT EXISTS field_sync_envelopes"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260322030010_phase10_field_work_orders_mobile_inventory_seed.sql");
  for (const fragment of ["MAIN-WH", "TRUCK-01", "WO-2026-0001", "field_dispatch_assignments"]) {
    assert.match(seed, new RegExp(escapeRegExp(fragment)));
  }

  const demoSeed = await readText("packages/db/seeds/20260322031000_phase10_field_work_orders_mobile_inventory_demo_seed.sql");
  for (const fragment of ["SITE-P-ALPHA", "demo-field-sync-001", "customer_signature_captured"]) {
    assert.match(demoSeed, new RegExp(escapeRegExp(fragment)));
  }
});

test("Phase 10.2 API manages dispatch, stock, signature, invoice and offline conflicts", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T06:00:00Z")
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
      body: { companyId: COMPANY_ID }
    });

    const customer = await requestJson(baseUrl, "/v1/ar/customers", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        legalName: "Phase 10.2 API Customer AB",
        organizationNumber: "5591223390",
        countryCode: "SE",
        languageCode: "SV",
        currencyCode: "SEK",
        paymentTermsCode: "NET30",
        invoiceDeliveryMethod: "pdf_email",
        reminderProfileCode: "standard",
        billingAddress: {
          line1: "Faltgatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        },
        deliveryAddress: {
          line1: "Faltgatan 1",
          postalCode: "11157",
          city: "Stockholm",
          countryCode: "SE"
        }
      }
    });
    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Falt",
        familyName: "Tekniker",
        workEmail: "field.api.tech@example.com"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "hourly_assignment",
        jobTitle: "Field technician",
        payModelCode: "hourly_salary",
        startDate: "2026-01-01"
      }
    });
    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-FIELD-API",
        projectReferenceCode: "project-field-api",
        displayName: "Field API Project",
        customerId: customer.customerId,
        startsOn: "2026-03-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 60000
      }
    });
    const laborItem = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-LABOR-API",
        description: "Field labor API",
        itemType: "service",
        unitCode: "hour",
        standardPrice: 1300,
        revenueAccountNumber: "3010",
        vatCode: "VAT_SE_DOMESTIC_25",
        projectBoundFlag: true
      }
    });
    const materialArItem = await requestJson(baseUrl, "/v1/ar/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-MATERIAL-API",
        description: "Field material API",
        itemType: "goods",
        unitCode: "ea",
        standardPrice: 45,
        revenueAccountNumber: "3020",
        vatCode: "VAT_SE_DOMESTIC_25",
        projectBoundFlag: true
      }
    });
    const location = await requestJson(baseUrl, "/v1/field/inventory/locations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        locationCode: "API-WH-01",
        displayName: "API Warehouse 01",
        locationType: "warehouse"
      }
    });
    const inventoryItem = await requestJson(baseUrl, "/v1/field/inventory/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-MATERIAL-API",
        displayName: "Field material API",
        unitCode: "ea",
        arItemId: materialArItem.arItemId,
        salesUnitPriceAmount: 45,
        locationBalances: [
          {
            inventoryLocationId: location.inventoryLocationId,
            onHandQuantity: 30
          }
        ]
      }
    });

    const locations = await requestJson(baseUrl, `/v1/field/inventory/locations?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(locations.items.some((item) => item.locationCode === "MAIN-WH"), true);

    const workOrder = await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "API field install",
        serviceTypeCode: "installation",
        laborItemId: laborItem.arItemId,
        laborRateAmount: 1300
      }
    });
    assert.equal(workOrder.status, "ready_for_dispatch");

    const dispatch = await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/dispatches`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        startsAt: "2026-03-25T07:00:00Z",
        endsAt: "2026-03-25T10:00:00Z"
      }
    });
    await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/dispatches/${dispatch.dispatchAssignmentId}/en-route`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/dispatches/${dispatch.dispatchAssignmentId}/on-site`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID
      }
    });

    const today = await requestJson(
      baseUrl,
      `/v1/field/mobile/today?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}`,
      { token: sessionToken }
    );
    assert.equal(today.summary.assignedWorkOrderCount >= 1, true);
    assert.equal(today.offlinePolicies.length, 3);

    const withdrawal = await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/material-withdrawals`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        inventoryItemId: inventoryItem.inventoryItemId,
        inventoryLocationId: location.inventoryLocationId,
        quantity: 2,
        sourceChannel: "mobile"
      }
    });
    assert.equal(withdrawal.projectId, project.projectId);

    const balances = await requestJson(
      baseUrl,
      `/v1/field/inventory/balances?companyId=${COMPANY_ID}&inventoryItemId=${inventoryItem.inventoryItemId}&inventoryLocationId=${location.inventoryLocationId}`,
      { token: sessionToken }
    );
    assert.equal(balances.items[0].onHandQuantity, 28);

    await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/customer-signatures`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        signerName: "API Customer",
        signedAt: "2026-03-25T10:05:00Z",
        signatureText: "Approved onsite."
      }
    });

    const completed = await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/complete`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        completedAt: "2026-03-25T10:10:00Z",
        laborMinutes: 90
      }
    });
    assert.equal(completed.status, "completed");

    const invoiced = await requestJson(baseUrl, `/v1/field/work-orders/${workOrder.workOrderId}/invoice`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        issueDate: "2026-03-25",
        dueDate: "2026-04-24"
      }
    });
    assert.equal(Boolean(invoiced.invoice.customerInvoiceId), true);
    assert.equal(invoiced.workOrder.status, "invoiced");

    const conflict = await requestJson(baseUrl, "/v1/field/sync/envelopes", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        clientMutationId: "phase10-field-conflict-001",
        clientDeviceId: "field-phone-01",
        objectType: "field_work_order",
        mutationType: "work_order.complete",
        baseServerVersion: 1,
        payload: {
          workOrderId: workOrder.workOrderId,
          completedAt: "2026-03-25T10:10:00Z",
          laborMinutes: 90
        }
      }
    });
    assert.equal(conflict.syncStatus, "conflicted");
    assert.equal(conflict.lastErrorCode, "version_conflict");

    const workOrderDetail = await requestJson(
      baseUrl,
      `/v1/field/work-orders/${workOrder.workOrderId}?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const auditEvents = await requestJson(
      baseUrl,
      `/v1/field/audit-events?companyId=${COMPANY_ID}&workOrderId=${workOrder.workOrderId}`,
      { token: sessionToken }
    );

    assert.equal(Boolean(workOrderDetail.customerInvoiceId), true);
    assert.equal(auditEvents.items.some((event) => event.action === "field.work_order.invoiced"), true);
    assert.equal(auditEvents.items.some((event) => event.action === "field.sync.conflicted"), true);
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

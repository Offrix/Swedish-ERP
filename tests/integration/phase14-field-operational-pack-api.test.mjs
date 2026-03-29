import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 14.5 API exposes operational cases, field evidence, reservations and conflict gating", async () => {
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
        legalName: "Phase 14.5 API Customer AB",
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
        projectCode: "P-FIELD-OPS-API",
        projectReferenceCode: "project-field-ops-api",
        displayName: "Field Operational API Project",
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
        itemCode: "FIELD-LABOR-OPS",
        description: "Field labor ops",
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
        itemCode: "FIELD-MATERIAL-OPS",
        description: "Field material ops",
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
        locationCode: "OPS-WH-01",
        displayName: "Ops Warehouse 01",
        locationType: "warehouse"
      }
    });
    const inventoryItem = await requestJson(baseUrl, "/v1/field/inventory/items", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        itemCode: "FIELD-MATERIAL-OPS",
        displayName: "Field material ops",
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

    const generalCase = await requestJson(baseUrl, "/v1/field/operational-cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "General service case",
        caseTypeCode: "service_case"
      }
    });
    assert.equal(generalCase.workOrderNo, null);

    const operationalCase = await requestJson(baseUrl, "/v1/field/operational-cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "Operational case with work order pack",
        caseTypeCode: "work_order",
        packCodes: ["work_order"],
        serviceTypeCode: "installation",
        laborItemId: laborItem.arItemId,
        laborRateAmount: 1300,
        signatureRequired: true
      }
    });
    assert.equal(operationalCase.packCodes.includes("work_order"), true);

    const operationalCases = await requestJson(baseUrl, `/v1/field/operational-cases?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    const workOrders = await requestJson(baseUrl, `/v1/field/work-orders?companyId=${COMPANY_ID}`, {
      token: sessionToken
    });
    assert.equal(operationalCases.items.length >= 2, true);
    assert.equal(workOrders.items.some((item) => item.operationalCaseId === generalCase.operationalCaseId), false);
    assert.equal(workOrders.items.some((item) => item.operationalCaseId === operationalCase.operationalCaseId), true);

    const reservation = await requestJson(
      baseUrl,
      `/v1/field/operational-cases/${operationalCase.operationalCaseId}/material-reservations`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: COMPANY_ID,
          inventoryItemId: inventoryItem.inventoryItemId,
          inventoryLocationId: location.inventoryLocationId,
          quantity: 2
        }
      }
    );
    assert.equal(reservation.status, "active");

    const dispatch = await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/dispatches`, {
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
    await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/dispatches/${dispatch.dispatchAssignmentId}/en-route`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });
    await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/dispatches/${dispatch.dispatchAssignmentId}/on-site`, {
      method: "POST",
      token: sessionToken,
      body: { companyId: COMPANY_ID }
    });

    await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/material-withdrawals`, {
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
    await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/customer-signatures`, {
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
    await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/complete`, {
      method: "POST",
      token: sessionToken,
      body: {
        companyId: COMPANY_ID,
        completedAt: "2026-03-25T10:10:00Z",
        laborMinutes: 90
      }
    });

    const conflict = await requestJson(baseUrl, "/v1/field/sync/envelopes", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        clientMutationId: "phase14-field-conflict-001",
        clientDeviceId: "field-phone-01",
        objectType: "field_work_order",
        mutationType: "work_order.complete",
        baseServerVersion: 1,
        payload: {
          workOrderId: operationalCase.workOrderId,
          completedAt: "2026-03-25T10:10:00Z",
          laborMinutes: 90
        }
      }
    });
    assert.equal(conflict.syncStatus, "conflicted");
    assert.equal(typeof conflict.conflictRecordId, "string");

    const evidence = await requestJson(
      baseUrl,
      `/v1/field/operational-cases/${operationalCase.operationalCaseId}/evidence?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const conflicts = await requestJson(
      baseUrl,
      `/v1/field/operational-cases/${operationalCase.operationalCaseId}/conflicts?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    const reservations = await requestJson(
      baseUrl,
      `/v1/field/operational-cases/${operationalCase.operationalCaseId}/material-reservations?companyId=${COMPANY_ID}`,
      { token: sessionToken }
    );
    assert.equal(evidence.items.some((item) => item.evidenceTypeCode === "material_usage"), true);
    assert.equal(evidence.items.some((item) => item.evidenceTypeCode === "signature_capture"), true);
    assert.equal(evidence.items.some((item) => item.evidenceTypeCode === "sync_conflict"), true);
    assert.equal(conflicts.items.length, 1);
    assert.equal(reservations.items.length, 1);

    await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/invoice`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        issueDate: "2026-03-25",
        dueDate: "2026-04-24"
      }
    });

    await requestJson(
      baseUrl,
      `/v1/field/operational-cases/${operationalCase.operationalCaseId}/conflicts/${conflict.conflictRecordId}/resolve`,
      {
        method: "POST",
        token: sessionToken,
        expectedStatus: 200,
        body: {
          companyId: COMPANY_ID,
          resolutionCode: "manual_review_completed"
        }
      }
    );

    const invoiced = await requestJson(baseUrl, `/v1/field/work-orders/${operationalCase.workOrderId}/invoice`, {
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

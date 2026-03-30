import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.3 e2e flow shows leave history for employee and admin across reject, resubmit, approve and sign lock", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-18T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
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
      phase7AbsenceEnabled: true
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, `/v1/org/companies/${COMPANY_ID}/users`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        email: "saga.portal@example.com",
        displayName: "Saga Portal",
        roleCode: "field_user"
      }
    });
    await requestJson(baseUrl, `/v1/org/companies/${COMPANY_ID}/users`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        email: "olof.chef@example.com",
        displayName: "Olof Chef",
        roleCode: "approver"
      }
    });

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Saga",
        familyName: "Portal",
        workEmail: "saga.portal@example.com"
      }
    });
    const employeeEmployment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Payroll specialist",
        payModelCode: "monthly_salary",
        startDate: "2025-01-01"
      }
    });

    const manager = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Olof",
        familyName: "Chef",
        workEmail: "olof.chef@example.com"
      }
    });
    const managerEmployment = await requestJson(baseUrl, `/v1/hr/employees/${manager.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Payroll manager",
        payModelCode: "monthly_salary",
        startDate: "2024-01-01"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/manager-assignments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        managerEmploymentId: managerEmployment.employmentId,
        validFrom: "2025-01-01"
      }
    });

    const vabType = await requestJson(baseUrl, "/v1/hr/leave-types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        leaveTypeCode: "VAB_E2E",
        displayName: "VAB E2E",
        signalType: "temporary_parental_benefit",
        requiresManagerApproval: true
      }
    });

    const portalToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: "saga.portal@example.com"
    });
    const managerToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: "olof.chef@example.com"
    });

    const firstEntry = await requestJson(baseUrl, "/v1/hr/employee-portal/me/leave-entries", {
      method: "POST",
      token: portalToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        leaveTypeId: vabType.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-03-18",
            extentPercent: 100,
            note: "Initial request."
          }
        ]
      }
    });
    await requestJson(baseUrl, `/v1/hr/employee-portal/me/leave-entries/${firstEntry.leaveEntryId}/submit`, {
      method: "POST",
      token: portalToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const rejected = await requestJson(baseUrl, `/v1/hr/leave-entries/${firstEntry.leaveEntryId}/reject`, {
      method: "POST",
      token: managerToken,
      body: {
        companyId: COMPANY_ID,
        reason: "Need exact child-care interval before approval."
      }
    });
    assert.equal(rejected.status, "rejected");

    const rejectedPortalView = await requestJson(
      baseUrl,
      `/v1/hr/employee-portal/me/leave-entries/${firstEntry.leaveEntryId}?companyId=${COMPANY_ID}`,
      {
        token: portalToken
      }
    );
    assert.equal(rejectedPortalView.rejectedReason, "Need exact child-care interval before approval.");
    assert.equal(rejectedPortalView.events.at(-1).eventType, "rejected");

    const secondEntry = await requestJson(baseUrl, "/v1/hr/employee-portal/me/leave-entries", {
      method: "POST",
      token: portalToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        leaveTypeId: vabType.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-03-19",
            extentPercent: 50,
            note: "AM only"
          },
          {
            date: "2026-03-20",
            extentPercent: 100,
            note: "Full day"
          }
        ],
        note: "Corrected request"
      }
    });
    await requestJson(baseUrl, `/v1/hr/employee-portal/me/leave-entries/${secondEntry.leaveEntryId}/submit`, {
      method: "POST",
      token: portalToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    const approved = await requestJson(baseUrl, `/v1/hr/leave-entries/${secondEntry.leaveEntryId}/approve`, {
      method: "POST",
      token: managerToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approved.status, "approved");

    await requestJson(baseUrl, "/v1/hr/leave-signal-locks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        reportingPeriod: "202603",
        lockState: "signed",
        sourceReference: "agi:202603:e2e"
      }
    });

    const lockBlockedResponse = await fetch(`${baseUrl}/v1/hr/employee-portal/me/leave-entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${portalToken}`,
        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        leaveTypeId: vabType.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-03-21",
            extentPercent: 100
          }
        ]
      })
    });
    const lockBlockedPayload = await lockBlockedResponse.json();
    assert.equal(lockBlockedResponse.status, 409);
    assert.equal(lockBlockedPayload.error, "leave_signals_locked");

    const portalHistory = await requestJson(baseUrl, `/v1/hr/employee-portal/me?companyId=${COMPANY_ID}`, {
      token: portalToken
    });
    const adminHistory = await requestJson(
      baseUrl,
      `/v1/hr/leave-entries?companyId=${COMPANY_ID}&employeeId=${employee.employeeId}`,
      {
        token: adminToken
      }
    );

    assert.equal(portalHistory.leaveEntries.length, 2);
    assert.equal(portalHistory.leaveEntries.some((entry) => entry.status === "rejected"), true);
    assert.equal(portalHistory.leaveEntries.some((entry) => entry.status === "approved"), true);
    assert.equal(portalHistory.leaveSignals.length, 2);
    assert.equal(adminHistory.items.length, 2);
    assert.equal(adminHistory.items.some((entry) => entry.rejectedReason === "Need exact child-care interval before approval."), true);
    assert.equal(adminHistory.items.some((entry) => entry.events.some((event) => event.eventType === "approved")), true);
  } finally {
    await stopServer(server);
  }
});

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

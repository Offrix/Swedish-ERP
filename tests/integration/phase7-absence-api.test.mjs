import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.3 migration and seeds add leave types, events, signals, locks and portal history", async () => {
  const migration = await readText("packages/db/migrations/20260321190000_phase7_absence_portal.sql");
  for (const fragment of [
    "ALTER TABLE leave_entries",
    "CREATE TABLE IF NOT EXISTS leave_types",
    "CREATE TABLE IF NOT EXISTS leave_entry_events",
    "CREATE TABLE IF NOT EXISTS leave_signals",
    "CREATE TABLE IF NOT EXISTS leave_signal_locks"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321190010_phase7_absence_portal_seed.sql");
  for (const fragment of ["parental_leave", "leave_entry_events", "leave_signal_locks"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321191000_phase7_absence_portal_demo_seed.sql");
  for (const fragment of ["employee_portal", "Need exact child-care interval", "temporary_parental_benefit"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 7.3 API supports employee portal leave flow, manager approval and AGI-style locking", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-10T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: createEnabledFlags()
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
        email: "elsa.portal@example.com",
        displayName: "Elsa Portal",
        roleCode: "field_user"
      }
    });
    await requestJson(baseUrl, `/v1/org/companies/${COMPANY_ID}/users`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        email: "maja.chef@example.com",
        displayName: "Maja Chef",
        roleCode: "approver"
      }
    });

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Elsa",
        familyName: "Portal",
        workEmail: "elsa.portal@example.com"
      }
    });
    const employeeEmployment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Consultant",
        payModelCode: "monthly_salary",
        startDate: "2026-01-01"
      }
    });

    const manager = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Maja",
        familyName: "Chef",
        workEmail: "maja.chef@example.com"
      }
    });
    const managerEmployment = await requestJson(baseUrl, `/v1/hr/employees/${manager.employeeId}/employments`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Team lead",
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
        validFrom: "2026-01-01"
      }
    });

    const leaveType = await requestJson(baseUrl, "/v1/hr/leave-types", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        leaveTypeCode: "PARENTAL_API",
        displayName: "Parental API leave",
        signalType: "parental_benefit",
        requiresManagerApproval: true
      }
    });

    const portalToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: "elsa.portal@example.com"
    });
    const portalProfile = await requestJson(baseUrl, `/v1/hr/employee-portal/me?companyId=${COMPANY_ID}`, {
      token: portalToken
    });
    assert.equal(portalProfile.employee.employeeId, employee.employeeId);

    const leaveEntry = await requestJson(baseUrl, "/v1/hr/employee-portal/me/leave-entries", {
      method: "POST",
      token: portalToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        leaveTypeId: leaveType.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-03-11",
            extentPercent: 100
          },
          {
            date: "2026-03-12",
            extentPercent: 50
          }
        ],
        note: "Portal-created parental leave"
      }
    });
    assert.equal(leaveEntry.signalCompleteness.complete, true);

    const portalEntries = await requestJson(
      baseUrl,
      `/v1/hr/employee-portal/me/leave-entries?companyId=${COMPANY_ID}&status=draft`,
      {
        token: portalToken
      }
    );
    assert.equal(portalEntries.items.length, 1);

    const submitted = await requestJson(
      baseUrl,
      `/v1/hr/employee-portal/me/leave-entries/${leaveEntry.leaveEntryId}/submit`,
      {
        method: "POST",
        token: portalToken,
        body: {
          companyId: COMPANY_ID
        }
      }
    );
    assert.equal(submitted.status, "submitted");
    assert.equal(submitted.managerEmploymentId, managerEmployment.employmentId);

    const managerToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: "maja.chef@example.com"
    });
    const approved = await requestJson(baseUrl, `/v1/hr/leave-entries/${leaveEntry.leaveEntryId}/approve`, {
      method: "POST",
      token: managerToken,
      body: {
        companyId: COMPANY_ID
      }
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.events.some((event) => event.eventType === "approved"), true);

    const adminSignals = await requestJson(
      baseUrl,
      `/v1/hr/leave-signals?companyId=${COMPANY_ID}&employeeId=${employee.employeeId}&reportingPeriod=202603`,
      {
        token: adminToken
      }
    );
    assert.equal(adminSignals.items.length, 2);

    await requestJson(baseUrl, "/v1/hr/leave-signal-locks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        reportingPeriod: "202603",
        lockState: "signed",
        sourceReference: "agi:202603:integration"
      }
    });

    const postLockCreateResponse = await fetch(`${baseUrl}/v1/hr/employee-portal/me/leave-entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${portalToken}`
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        employmentId: employeeEmployment.employmentId,
        leaveTypeId: leaveType.leaveTypeId,
        reportingPeriod: "202603",
        days: [
          {
            date: "2026-03-13",
            extentPercent: 100
          }
        ]
      })
    });
    const postLockCreatePayload = await postLockCreateResponse.json();
    assert.equal(postLockCreateResponse.status, 409);
    assert.equal(postLockCreatePayload.error, "leave_signals_locked");

    const finalPortalView = await requestJson(baseUrl, `/v1/hr/employee-portal/me?companyId=${COMPANY_ID}`, {
      token: portalToken
    });
    assert.equal(finalPortalView.leaveEntries.length, 1);
    assert.equal(finalPortalView.leaveEntries[0].events.length, 3);
    assert.equal(finalPortalView.leaveSignals.length, 2);
  } finally {
    await stopServer(server);
  }
});

test("Phase 7.3 leave and employee portal routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-10T08:00:00Z")
  });
  const server = createApiServer({
    platform,
    flags: {
      ...createEnabledFlags(),
      phase7AbsenceEnabled: false
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

    const response = await fetch(`${baseUrl}/v1/hr/leave-types?companyId=${COMPANY_ID}`, {
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.error, "feature_disabled");
  } finally {
    await stopServer(server);
  }
});

function createEnabledFlags() {
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
    phase7AbsenceEnabled: true
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

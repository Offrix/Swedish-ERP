import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.2 e2e flow captures shifts, premium minutes and reproducible balance snapshots", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-12T08:00:00Z")
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
      phase7TimeEnabled: true
    }
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

    const employee = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Field",
        familyName: "Worker"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "hourly_assignment",
        jobTitle: "Shift worker",
        payModelCode: "hourly_salary",
        startDate: "2026-01-01"
      }
    });

    const scheduleTemplate = await requestJson(baseUrl, "/v1/time/schedule-templates", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scheduleTemplateCode: "SHIFT_E2E",
        displayName: "Shift E2E",
        days: [
          {
            weekday: 4,
            plannedMinutes: 480,
            obMinutes: 120,
            jourMinutes: 60,
            standbyMinutes: 0,
            startTime: "12:00",
            endTime: "21:00",
            breakMinutes: 60
          }
        ]
      }
    });
    await requestJson(baseUrl, "/v1/time/schedule-assignments", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        scheduleTemplateId: scheduleTemplate.scheduleTemplateId,
        validFrom: "2026-03-01"
      }
    });

    const clockIn = await requestJson(baseUrl, "/v1/time/clock-events", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        eventType: "clock_in",
        occurredAt: "2026-03-12T11:55:00Z",
        projectId: "field-e2e-project",
        activityCode: "payroll_close"
      }
    });
    const clockOut = await requestJson(baseUrl, "/v1/time/clock-events", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        eventType: "clock_out",
        occurredAt: "2026-03-12T22:05:00Z",
        projectId: "field-e2e-project",
        activityCode: "payroll_close"
      }
    });

    await requestJson(baseUrl, "/v1/time/entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        workDate: "2026-03-12",
        projectId: "field-e2e-project",
        activityCode: "payroll_close",
        sourceType: "clock",
        startsAt: "2026-03-12T11:55:00Z",
        endsAt: "2026-03-12T22:05:00Z",
        breakMinutes: 30,
        overtimeMinutes: 60,
        obMinutes: 120,
        jourMinutes: 60,
        compDeltaMinutes: 30,
        sourceClockEventIds: [clockIn.timeClockEventId, clockOut.timeClockEventId]
      }
    });

    const entries = await requestJson(
      baseUrl,
      `/v1/time/entries?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}`,
      {
        token: sessionToken
      }
    );
    const balances = await requestJson(
      baseUrl,
      `/v1/time/balances?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );

    assert.equal(entries.items.length, 1);
    assert.equal(entries.items[0].projectId, "field-e2e-project");
    assert.equal(entries.items[0].activityCode, "payroll_close");
    assert.equal(entries.items[0].obMinutes, 120);
    assert.equal(entries.items[0].jourMinutes, 60);
    assert.equal(balances.balances.comp_minutes, 30);
    assert.equal(balances.balances.overtime_minutes, 60);
    assert.equal(typeof balances.snapshotHash, "string");
    assert.equal(balances.snapshotHash.length, 64);
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

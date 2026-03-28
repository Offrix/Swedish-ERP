import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { readText, stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 7.2 migration and seeds add time schedules, locks and reproducible balances", async () => {
  const migration = await readText("packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql");
  for (const fragment of [
    "CREATE TABLE IF NOT EXISTS time_schedule_templates",
    "CREATE TABLE IF NOT EXISTS time_clock_events",
    "ALTER TABLE time_entries",
    "CREATE TABLE IF NOT EXISTS time_balance_transactions",
    "CREATE TABLE IF NOT EXISTS time_period_locks"
  ]) {
    assert.match(migration, new RegExp(fragment.replaceAll(" ", "\\s+")));
  }

  const seed = await readText("packages/db/seeds/20260321180010_phase7_time_reporting_seed.sql");
  for (const fragment of ["time_schedule_assignments", "onsite_service", "time_balance_transactions"]) {
    assert.match(seed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }

  const demoSeed = await readText("packages/db/seeds/20260321181000_phase7_time_reporting_demo_seed.sql");
  for (const fragment of ["shift_ob_jour", "payroll_close", "payroll_submission"]) {
    assert.match(demoSeed, new RegExp(fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")));
  }
});

test("Phase 7.2 API records schedules, clock events, time entries, balances and period locks", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-02T08:00:00Z")
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
        givenName: "Time",
        familyName: "Keeper"
      }
    });
    const employment = await requestJson(baseUrl, `/v1/hr/employees/${employee.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentTypeCode: "permanent",
        jobTitle: "Field consultant",
        payModelCode: "monthly_salary",
        startDate: "2026-01-01"
      }
    });
    const manager = await requestJson(baseUrl, "/v1/hr/employees", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        givenName: "Maja",
        familyName: "Tidchef"
      }
    });
    const managerEmployment = await requestJson(baseUrl, `/v1/hr/employees/${manager.employeeId}/employments`, {
      method: "POST",
      token: sessionToken,
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
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        managerEmploymentId: managerEmployment.employmentId,
        validFrom: "2026-01-01"
      }
    });

    const scheduleTemplate = await requestJson(baseUrl, "/v1/time/schedule-templates", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        scheduleTemplateCode: "FIELD_API",
        displayName: "Field API template",
        days: [
          {
            weekday: 1,
            plannedMinutes: 480,
            startTime: "08:00",
            endTime: "17:00",
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
        validFrom: "2026-01-01"
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
        occurredAt: "2026-03-02T07:30:00Z",
        projectId: "project-7-2-api",
        activityCode: "onsite_service"
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
        occurredAt: "2026-03-02T17:00:00Z",
        projectId: "project-7-2-api",
        activityCode: "onsite_service"
      }
    });

    const entry = await requestJson(baseUrl, "/v1/time/entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        workDate: "2026-03-02",
        projectId: "project-7-2-api",
        activityCode: "onsite_service",
        sourceType: "clock",
        startsAt: "2026-03-02T07:30:00Z",
        endsAt: "2026-03-02T17:00:00Z",
        breakMinutes: 30,
        overtimeMinutes: 30,
        sourceClockEventIds: [clockIn.timeClockEventId, clockOut.timeClockEventId]
      }
    });
    assert.equal(entry.projectId, "project-7-2-api");
    assert.equal(entry.activityCode, "onsite_service");

    const pendingEntry = await requestJson(baseUrl, "/v1/time/entries", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        workDate: "2026-03-03",
        workedMinutes: 480,
        approvalMode: "manual",
        activityCode: "backoffice"
      }
    });
    const blockedApprovedSetResponse = await fetch(`${baseUrl}/v1/time/approved-sets`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        startsOn: "2026-03-01",
        endsOn: "2026-03-31"
      })
    });
    const blockedApprovedSetPayload = await blockedApprovedSetResponse.json();
    assert.equal(blockedApprovedSetResponse.status, 409);
    assert.equal(blockedApprovedSetPayload.error, "approved_time_set_pending_entries");
    await requestJson(baseUrl, `/v1/time/entries/${pendingEntry.timeEntryId}/approve`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 200,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId
      }
    });
    const approvedSet = await requestJson(baseUrl, "/v1/time/approved-sets", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        startsOn: "2026-03-01",
        endsOn: "2026-03-31"
      }
    });
    assert.equal(approvedSet.approvedEntryCount, 2);
    assert.equal(approvedSet.status, "approved");
    const timeBase = await requestJson(
      baseUrl,
      `/v1/time/employment-base?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&workDate=2026-03-02&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );
    assert.equal(timeBase.approvedTimeSets.length, 1);
    assert.equal(timeBase.activeApprovedTimeSet.approvedTimeSetId, approvedSet.approvedTimeSetId);

    const balances = await requestJson(
      baseUrl,
      `/v1/time/balances?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );
    const repeatedBalances = await requestJson(
      baseUrl,
      `/v1/time/balances?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );

    assert.equal(balances.balances.flex_minutes, 540);
    assert.equal(balances.balances.overtime_minutes, 30);
    assert.equal(balances.snapshotHash, repeatedBalances.snapshotHash);

    await requestJson(baseUrl, "/v1/time/period-locks", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        startsOn: "2026-03-01",
        endsOn: "2026-03-31",
        reasonCode: "payroll_cutoff"
      }
    });

    const locks = await requestJson(
      baseUrl,
      `/v1/time/period-locks?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(locks.items.length, 1);
    const approvedSets = await requestJson(
      baseUrl,
      `/v1/time/approved-sets?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}`,
      {
        token: sessionToken
      }
    );
    assert.equal(approvedSets.items.length, 1);
    assert.equal(approvedSets.items[0].status, "locked");
    const lockedTimeBase = await requestJson(
      baseUrl,
      `/v1/time/employment-base?companyId=${COMPANY_ID}&employmentId=${employment.employmentId}&workDate=2026-03-10&cutoffDate=2026-03-31`,
      {
        token: sessionToken
      }
    );
    assert.equal(lockedTimeBase.activeApprovedTimeSet.status, "locked");

    const lockedResponse = await fetch(`${baseUrl}/v1/time/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        employmentId: employment.employmentId,
        workDate: "2026-03-10",
        workedMinutes: 480,
        activityCode: "locked_case"
      })
    });
    const lockedPayload = await lockedResponse.json();
    assert.equal(lockedResponse.status, 409);
    assert.equal(lockedPayload.error, "time_period_locked");
  } finally {
    await stopServer(server);
  }
});

test("Phase 7.2 time routes disable cleanly behind the feature flag", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-02T08:00:00Z")
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
      phase7TimeEnabled: false
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

    const response = await fetch(`${baseUrl}/v1/time/entries?companyId=${COMPANY_ID}&employmentId=test`, {
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.error, "feature_disabled");
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

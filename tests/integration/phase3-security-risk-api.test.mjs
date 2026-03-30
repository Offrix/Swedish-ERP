import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 3.5 API locks login IP spikes and raises central risk alerts", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T12:00:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const requestHeaders = {
    origin: "http://127.0.0.1:4173",
    "x-forwarded-for": "198.51.100.42"
  };

  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const denied = await requestJson(baseUrl, "/v1/auth/login", {
        method: "POST",
        expectedStatus: 404,
        headers: requestHeaders,
        body: {
          companyId: DEMO_IDS.companyId,
          email: `missing-${attempt}@example.test`
        }
      });
      assert.equal(denied.error, "user_not_found");
    }

    const blocked = await requestJson(baseUrl, "/v1/auth/login", {
      method: "POST",
      expectedStatus: 429,
      headers: requestHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        email: "missing-final@example.test"
      }
    });
    assert.equal(blocked.error, "login_ip_temporarily_locked");

    const alerts = securityRuntime.listSecurityAlerts({
      companyId: DEMO_IDS.companyId,
      alertCode: "auth_login_ip_spike"
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].lastIpAddress, "198.51.100.42");
    assert.equal(alerts[0].metadata.lockedUntil != null, true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.5 API forwards client IP into TOTP challenge-complete risk tracking", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T12:10:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const sessionToken = await loginWithTotpOnly({
    baseUrl,
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });

  try {
    const challenge = await requestJson(baseUrl, "/v1/auth/challenges", {
      method: "POST",
      token: sessionToken,
      body: {
        factorType: "totp",
        actionClass: "identity_device_trust_manage"
      }
    });

    const denied = await requestJson(baseUrl, `/v1/auth/challenges/${challenge.challengeId}/complete`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 403,
      headers: {
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "203.0.113.44"
      },
      body: {
        code: "000000"
      }
    });
    assert.equal(denied.error, "totp_code_invalid");

    const series = securityRuntime.listSecurityFailureSeries({
      companyId: DEMO_IDS.companyId,
      seriesCode: "auth_totp_account_failures"
    });
    const approverSeries = series.find((item) => item.subjectKey === `company_user:${DEMO_APPROVER_IDS.companyUserId}`);
    assert.ok(approverSeries);
    assert.equal(approverSeries.ipAddress, "203.0.113.44");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.5 API enforces passkey step-up renewal after repeated enrollment attempts", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T12:20:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const sessionToken = await loginWithStrongAuth({
    baseUrl,
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  try {
    const stepUp = await requestJson(baseUrl, "/v1/auth/challenges", {
      method: "POST",
      token: sessionToken,
      body: {
        factorType: "bankid",
        actionClass: "identity_device_trust_manage"
      }
    });
    await requestJson(baseUrl, `/v1/auth/challenges/${stepUp.orderRef}/complete`, {
      method: "POST",
      token: sessionToken,
      body: {
        completionToken: platform.getBankIdCompletionTokenForTesting(stepUp.orderRef)
      }
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const options = await requestJson(baseUrl, "/v1/auth/mfa/passkeys/register-options", {
        method: "POST",
        token: sessionToken,
        headers: {
          origin: "http://127.0.0.1:4173",
          "x-forwarded-for": "198.51.100.43"
        },
        body: {
          deviceName: `Security key ${attempt + 1}`
        }
      });
      assert.equal(typeof options.challengeId, "string");
    }

    const blocked = await requestJson(baseUrl, "/v1/auth/mfa/passkeys/register-options", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 429,
      headers: {
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.43"
      },
      body: {
        deviceName: "Security key 4"
      }
    });
    assert.equal(blocked.error, "passkey_step_up_required");

    const alerts = securityRuntime.listSecurityAlerts({
      companyId: DEMO_IDS.companyId,
      alertCode: "auth_passkey_registration_spike"
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].lastIpAddress, "198.51.100.43");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.5 API blocks excessive open BankID initiations per account", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T12:30:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const sessionToken = await loginWithTotpOnly({
    baseUrl,
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const started = await requestJson(baseUrl, "/v1/auth/bankid/start", {
        method: "POST",
        token: sessionToken,
        headers: {
          origin: "http://127.0.0.1:4173",
          "x-forwarded-for": "198.51.100.44"
        }
      });
      assert.equal(typeof started.orderRef, "string");
    }

    const blocked = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 429,
      headers: {
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.44"
      }
    });
    assert.equal(blocked.error, "bankid_open_initiation_limit_reached");

    const alerts = securityRuntime.listSecurityAlerts({
      companyId: DEMO_IDS.companyId,
      alertCode: "auth_bankid_open_limit_reached"
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].lastIpAddress, "198.51.100.44");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.5 API rate-limits mass report export requests", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T12:40:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const sessionToken = await loginWithStrongAuth({
    baseUrl,
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });

  try {
    const snapshot = await requestJson(baseUrl, "/v1/reporting/report-snapshots", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        reportCode: "payroll_summary",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        viewMode: "period"
      }
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const job = await requestJson(baseUrl, "/v1/reporting/export-jobs", {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        headers: {
          origin: "http://127.0.0.1:4173",
          "x-forwarded-for": "198.51.100.45"
        },
        body: {
          companyId: DEMO_IDS.companyId,
          reportSnapshotId: snapshot.reportSnapshotId,
          format: "pdf"
        }
      });
      assert.equal(typeof job.reportExportJobId, "string");
    }

    const blocked = await requestJson(baseUrl, "/v1/reporting/export-jobs", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 429,
      headers: {
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.45"
      },
      body: {
        companyId: DEMO_IDS.companyId,
        reportSnapshotId: snapshot.reportSnapshotId,
        format: "pdf"
      }
    });
    assert.equal(blocked.error, "report_export_rate_limited");

    const alerts = securityRuntime.listSecurityAlerts({
      companyId: DEMO_IDS.companyId,
      alertCode: "report_export_mass_request"
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].lastIpAddress, "198.51.100.45");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.5 API rate-limits support impersonation requests and open break-glass requests", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T12:50:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const sessionToken = await loginWithStrongAuth({
    baseUrl,
    platform,
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const requestHeaders = {
    origin: "http://127.0.0.1:4173",
    "x-forwarded-for": "198.51.100.46"
  };

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const supportCase = await requestJson(baseUrl, "/v1/backoffice/support-cases", {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        body: {
          companyId: DEMO_IDS.companyId,
          category: "submission_transport_failure",
          severity: "high",
          requester: {
            channel: "internal",
            requesterId: "phase3-5"
          }
        }
      });

      const impersonation = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        headers: requestHeaders,
        body: {
          companyId: DEMO_IDS.companyId,
          supportCaseId: supportCase.supportCaseId,
          targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
          purposeCode: "support_investigation"
        }
      });
      assert.equal(typeof impersonation.sessionId, "string");
    }

    const overflowSupportCase = await requestJson(baseUrl, "/v1/backoffice/support-cases", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        category: "submission_transport_failure",
        severity: "high",
        requester: {
          channel: "internal",
          requesterId: "phase3-5"
        }
      }
    });

    const impersonationBlocked = await requestJson(baseUrl, "/v1/backoffice/impersonations", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 429,
      headers: requestHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        supportCaseId: overflowSupportCase.supportCaseId,
        targetCompanyUserId: DEMO_APPROVER_IDS.companyUserId,
        purposeCode: "support_investigation"
      }
    });
    assert.equal(impersonationBlocked.error, "impersonation_rate_limited");

    const incident = await requestJson(baseUrl, "/v1/backoffice/incidents", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        title: "Phase 3.5 rate limit incident",
        summary: "Drive break-glass open request thresholds.",
        severity: "high"
      }
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const breakGlass = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
        method: "POST",
        token: sessionToken,
        expectedStatus: 201,
        headers: requestHeaders,
        body: {
          companyId: DEMO_IDS.companyId,
          incidentId: incident.incident.incidentId,
          purposeCode: "incident_investigation",
          requestedActions: ["list_submission_queue"]
        }
      });
      assert.equal(typeof breakGlass.breakGlassId, "string");
    }

    const breakGlassBlocked = await requestJson(baseUrl, "/v1/backoffice/break-glass", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 429,
      headers: requestHeaders,
      body: {
        companyId: DEMO_IDS.companyId,
        incidentId: incident.incident.incidentId,
        purposeCode: "incident_investigation",
        requestedActions: ["list_submission_queue"]
      }
    });
    assert.equal(breakGlassBlocked.error, "break_glass_open_request_limit_reached");

    const impersonationAlerts = securityRuntime.listSecurityAlerts({
      companyId: DEMO_IDS.companyId,
      alertCode: "support_impersonation_request_spike"
    });
    assert.equal(impersonationAlerts.length, 1);
    assert.equal(impersonationAlerts[0].lastIpAddress, "198.51.100.46");

    const breakGlassAlerts = securityRuntime.listSecurityAlerts({
      companyId: DEMO_IDS.companyId,
      alertCode: "break_glass_open_request_limit_hit"
    });
    assert.equal(breakGlassAlerts.length, 1);
    assert.equal(breakGlassAlerts[0].lastIpAddress, "198.51.100.46");
  } finally {
    await stopServer(server);
  }
});

test("Phase 3.5 edge throttling on federation callback records provider callback spike anomalies", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T13:00:00Z")
  });
  const securityRuntime = platform.getDomain("securityRuntime");
  const server = createApiServer({
    platform,
    edgePolicy: {
      rateLimitProfiles: {
        federationCallback: {
          limit: 1,
          windowMs: 60_000
        }
      }
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const first = await fetch(`${baseUrl}/v1/auth/federation/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.47"
      },
      body: JSON.stringify({
        authRequestId: "missing",
        authorizationCode: "missing",
        state: "missing"
      })
    });
    assert.notEqual(first.status, 429);

    const throttled = await fetch(`${baseUrl}/v1/auth/federation/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:4173",
        "x-forwarded-for": "198.51.100.47"
      },
      body: JSON.stringify({
        authRequestId: "missing",
        authorizationCode: "missing",
        state: "missing"
      })
    });
    assert.equal(throttled.status, 429);
    assert.equal((await throttled.json()).error, "edge_rate_limited");

    const alerts = securityRuntime.listSecurityAlerts({
      alertCode: "provider_callback_spike"
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].lastIpAddress, "198.51.100.47");
    assert.equal(alerts[0].metadata.routeProfile, "auth_federation_callback");
  } finally {
    await stopServer(server);
  }
});

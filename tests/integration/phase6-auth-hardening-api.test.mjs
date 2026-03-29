import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import {
  DEMO_APPROVER_EMAIL,
  DEMO_IDS,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 6 hardening API blocks repeated pending login starts for the same account", async () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-29T12:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const started = await requestJson(`${baseUrl}/v1/auth/login`, {
        method: "POST",
        body: {
          companyId: DEMO_IDS.companyId,
          email: DEMO_APPROVER_EMAIL
        }
      });
      assert.equal(started.session.status, "pending");
    }

    const blocked = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      expectedStatus: 429,
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });
    assert.equal(blocked.error, "login_rate_limited");
  } finally {
    await stopServer(server);
  }
});

test("Phase 6 hardening API locks repeated invalid TOTP attempts and revokes the attacked session", async () => {
  let now = new Date("2026-03-29T13:00:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const started = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const denied = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
        method: "POST",
        token: started.sessionToken,
        expectedStatus: 403,
        body: {
          code: "000000"
        }
      });
      assert.equal(denied.error, "totp_code_invalid");
    }

    const blocked = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: started.sessionToken,
      expectedStatus: 429,
      body: {
        code: "000000"
      }
    });
    assert.equal(blocked.error, "totp_temporarily_locked");
    assert.throws(
      () =>
        platform.inspectSession({
          sessionToken: started.sessionToken,
          allowPending: true
        }),
      (error) => error?.code === "session_revoked" && error?.status === 401
    );

    now = new Date("2026-03-29T13:16:00Z");
    const retried = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });
    const verified = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: retried.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_APPROVER_EMAIL,
          now
        })
      }
    });
    assert.equal(verified.session.status, "active");
  } finally {
    await stopServer(server);
  }
});

test("Phase 6 hardening API locks repeated invalid passkey assertions and revokes the attacked session", async () => {
  let now = new Date("2026-03-29T15:30:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const registrationLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_APPROVER_EMAIL,
          now
        })
      }
    });
    const registration = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-options`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        deviceName: "Approver key"
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-verify`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        challengeId: registration.challengeId,
        credentialId: "cred-approver-key",
        publicKey: "pk-approver-key",
        deviceName: "Approver key"
      }
    });

    const login = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const denied = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/assert`, {
        method: "POST",
        token: login.sessionToken,
        expectedStatus: 403,
        body: {
          credentialId: "cred-approver-key",
          assertion: "passkey:wrong"
        }
      });
      assert.equal(denied.error, "passkey_assertion_invalid");
    }

    const blocked = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/assert`, {
      method: "POST",
      token: login.sessionToken,
      expectedStatus: 429,
      body: {
        credentialId: "cred-approver-key",
        assertion: "passkey:wrong"
      }
    });
    assert.equal(blocked.error, "passkey_temporarily_locked");
    assert.throws(
      () =>
        platform.inspectSession({
          sessionToken: login.sessionToken,
          allowPending: true
        }),
      (error) => error?.code === "session_revoked" && error?.status === 401
    );

    now = new Date("2026-03-29T15:46:00Z");
    const retried = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });
    const asserted = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/assert`, {
      method: "POST",
      token: retried.sessionToken,
      body: {
        credentialId: "cred-approver-key",
        assertion: "passkey:cred-approver-key"
      }
    });
    assert.equal(asserted.session.status, "active");
  } finally {
    await stopServer(server);
  }
});

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}

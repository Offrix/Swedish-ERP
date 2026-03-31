import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import {
  DEMO_ADMIN_EMAIL,
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
        email: DEMO_ADMIN_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_ADMIN_EMAIL,
          now
        })
      }
    });
    const registrationActivation = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: registrationLogin.sessionToken
    });
    await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        orderRef: registrationActivation.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(registrationActivation.orderRef)
      }
    });
    const registrationStepUp = await requestJson(`${baseUrl}/v1/auth/challenges`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        factorType: "bankid",
        actionClass: "identity_device_trust_manage"
      }
    });
    await requestJson(`${baseUrl}/v1/auth/challenges/${registrationStepUp.orderRef}/complete`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        completionToken: platform.getBankIdCompletionTokenForTesting(registrationStepUp.orderRef)
      }
    });
    const registration = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-options`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        deviceName: "Approver key"
      }
    });
    const verifiedRegistration = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-verify`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        challengeId: registration.challengeId,
        credentialId: "cred-approver-key",
        publicKey: "pk-approver-key",
        deviceName: "Approver key"
      }
    });
    assert.equal("publicKey" in verifiedRegistration, false);
    assert.equal("publicKeyRef" in verifiedRegistration, false);

    const login = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_ADMIN_EMAIL,
          now
        })
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
        email: DEMO_ADMIN_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: retried.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_ADMIN_EMAIL,
          now
        })
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

test("Phase 6 hardening API locks repeated invalid BankID completion attempts and revokes the attacked session", async () => {
  let now = new Date("2026-03-29T16:00:00Z");
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
    const login = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_ADMIN_EMAIL,
          now
        })
      }
    });
    const bankIdStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: login.sessionToken
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const denied = await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
        method: "POST",
        token: login.sessionToken,
        expectedStatus: 403,
        body: {
          orderRef: bankIdStart.orderRef,
          completionToken: "wrong"
        }
      });
      assert.equal(denied.error, "bankid_completion_token_invalid");
    }

    const blocked = await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: login.sessionToken,
      expectedStatus: 429,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: "wrong"
      }
    });
    assert.equal(blocked.error, "bankid_temporarily_locked");
    assert.throws(
      () =>
        platform.inspectSession({
          sessionToken: login.sessionToken,
          allowPending: true
        }),
      (error) => error?.code === "session_revoked" && error?.status === 401
    );

    now = new Date("2026-03-29T16:16:00Z");
    const retried = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: retried.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_ADMIN_EMAIL,
          now
        })
      }
    });
    const retriedBankIdStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: retried.sessionToken
    });
    const collected = await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: retried.sessionToken,
      body: {
        orderRef: retriedBankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(retriedBankIdStart.orderRef)
      }
    });
    assert.equal(collected.session.status, "active");
  } finally {
    await stopServer(server);
  }
});

test("Phase 6 hardening API locks repeated invalid federation completion attempts and revokes the attacked session", async () => {
  let now = new Date("2026-03-29T16:30:00Z");
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
    const federationStart = await requestJson(`${baseUrl}/v1/auth/federation/start`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL,
        connectionId: "acme-sso",
        redirectUri: "https://app.example.test/auth/federation/callback"
      }
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const denied = await requestJson(`${baseUrl}/v1/auth/federation/callback`, {
        method: "POST",
        token: federationStart.sessionToken,
        expectedStatus: 403,
        body: {
          authRequestId: federationStart.authRequestId,
          authorizationCode: "wrong",
          state: "wrong"
        }
      });
      assert.equal(
        denied.error === "federation_state_invalid" || denied.error === "federation_authorization_code_invalid",
        true
      );
    }

    const blocked = await requestJson(`${baseUrl}/v1/auth/federation/callback`, {
      method: "POST",
      token: federationStart.sessionToken,
      expectedStatus: 429,
      body: {
        authRequestId: federationStart.authRequestId,
        authorizationCode: "wrong",
        state: "wrong"
      }
    });
    assert.equal(blocked.error, "federation_temporarily_locked");
    assert.throws(
      () =>
        platform.inspectSession({
          sessionToken: federationStart.sessionToken,
          allowPending: true
        }),
      (error) => error?.code === "session_revoked" && error?.status === 401
    );

    now = new Date("2026-03-29T16:46:00Z");
    const retried = await requestJson(`${baseUrl}/v1/auth/federation/start`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL,
        connectionId: "acme-sso",
        redirectUri: "https://app.example.test/auth/federation/callback"
      }
    });
    const completed = await requestJson(`${baseUrl}/v1/auth/federation/callback`, {
      method: "POST",
      token: retried.sessionToken,
      body: {
        authRequestId: retried.authRequestId,
        authorizationCode: platform.getFederationAuthorizationCodeForTesting(retried.authRequestId),
        state: retried.state
      }
    });
    assert.equal(completed.session.status, "active");
  } finally {
    await stopServer(server);
  }
});

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}

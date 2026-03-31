import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { generateTotpCode } from "../../packages/auth-core/src/index.mjs";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform } from "../helpers/demo-platform.mjs";
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

test("Phase 6 hardening API requires alternate-factor step-up to recover a locked TOTP factor", async () => {
  let now = new Date("2026-03-29T17:00:00Z");
  const platform = createExplicitDemoApiPlatform({
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
    const passkeyRegistration = await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-options`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        deviceName: "Recovery key"
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/register-verify`, {
      method: "POST",
      token: registrationLogin.sessionToken,
      body: {
        challengeId: passkeyRegistration.challengeId,
        credentialId: "cred-recovery-key",
        publicKey: "pk-recovery-key",
        deviceName: "Recovery key"
      }
    });

    const firstLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const denied = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
        method: "POST",
        token: firstLogin.sessionToken,
        expectedStatus: 403,
        body: {
          code: "000000"
        }
      });
      assert.equal(denied.error, "totp_code_invalid");
    }
    const firstLockout = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: firstLogin.sessionToken,
      expectedStatus: 429,
      body: {
        code: "000000"
      }
    });
    assert.equal(firstLockout.error, "totp_temporarily_locked");

    now = new Date("2026-03-29T17:16:00Z");
    const secondLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const denied = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
        method: "POST",
        token: secondLogin.sessionToken,
        expectedStatus: 403,
        body: {
          code: "000000"
        }
      });
      assert.equal(denied.error, "totp_code_invalid");
    }
    const recoveryRequired = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: secondLogin.sessionToken,
      expectedStatus: 403,
      body: {
        code: "000000"
      }
    });
    assert.equal(recoveryRequired.error, "totp_recovery_required");

    now = new Date("2026-03-29T17:17:00Z");
    const recoveryLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    const recoveryBankId = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: recoveryLogin.sessionToken
    });
    await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      body: {
        orderRef: recoveryBankId.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(recoveryBankId.orderRef)
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/passkeys/assert`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      body: {
        credentialId: "cred-recovery-key",
        assertion: "passkey:cred-recovery-key"
      }
    });

    const factorsBeforeRecovery = await requestJson(`${baseUrl}/v1/auth/factors`, {
      token: recoveryLogin.sessionToken
    });
    const lockedTotp = factorsBeforeRecovery.items.find((factor) => factor.factorType === "totp" && factor.status === "locked");
    assert.ok(lockedTotp);
    assert.equal(lockedTotp.recoveryRequired, true);
    assert.equal(lockedTotp.canCurrentSessionPerformRecovery, false);
    assert.equal(lockedTotp.availableRecoveryFactorTypes.includes("bankid"), true);
    assert.equal(lockedTotp.availableRecoveryFactorTypes.includes("passkey"), true);

    const stepUpRequired = await requestJson(`${baseUrl}/v1/auth/mfa/totp/enroll`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      expectedStatus: 403,
      body: {
        label: "Recovered authenticator"
      }
    });
    assert.equal(stepUpRequired.error, "auth_factor_manage_step_up_required");

    const factorManageStepUp = await requestJson(`${baseUrl}/v1/auth/challenges`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      body: {
        factorType: "bankid",
        actionClass: "identity_factor_manage"
      }
    });
    await requestJson(`${baseUrl}/v1/auth/challenges/${factorManageStepUp.orderRef}/complete`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      body: {
        completionToken: platform.getBankIdCompletionTokenForTesting(factorManageStepUp.orderRef)
      }
    });

    const reenrollment = await requestJson(`${baseUrl}/v1/auth/mfa/totp/enroll`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      body: {
        label: "Recovered authenticator"
      }
    });
    assert.equal(reenrollment.recoveryMode, true);
    const verified = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: recoveryLogin.sessionToken,
      body: {
        factorId: reenrollment.factorId,
        code: generateTotpCode({
          secret: reenrollment.secret,
          now
        })
      }
    });
    assert.equal(verified.factor.status, "active");

    const factorsAfterRecovery = await requestJson(`${baseUrl}/v1/auth/factors`, {
      token: recoveryLogin.sessionToken
    });
    assert.equal(factorsAfterRecovery.items.some((factor) => factor.factorId === reenrollment.factorId && factor.status === "active"), true);
    assert.equal(factorsAfterRecovery.items.some((factor) => factor.factorId === lockedTotp.factorId && factor.status === "superseded"), true);
  } finally {
    await stopServer(server);
  }
});

test("Phase 6 hardening API exposes live security alerts, budgets, failure series and risk summaries through ops routes", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-29T18:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true,
      phase14ResilienceEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_ADMIN_EMAIL
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: adminLogin.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_ADMIN_EMAIL,
          now: new Date("2026-03-29T18:00:00Z")
        })
      }
    });
    const adminBankId = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: adminLogin.sessionToken
    });
    await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: adminLogin.sessionToken,
      body: {
        orderRef: adminBankId.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(adminBankId.orderRef)
      }
    });

    platform.createCompanyUser({
      sessionToken: adminLogin.sessionToken,
      companyId: DEMO_IDS.companyId,
      email: "phase6-field-user@example.test",
      displayName: "Phase 6 Field User",
      roleCode: "field_user",
      requiresMfa: false
    });
    const fieldLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: "phase6-field-user@example.test"
      }
    });
    await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: fieldLogin.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: "phase6-field-user@example.test",
          now: new Date("2026-03-29T18:00:00Z")
        })
      }
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const unresolved = await requestJson(`${baseUrl}/v1/auth/login`, {
        method: "POST",
        expectedStatus: 404,
        headers: {
          "x-forwarded-for": "198.51.100.71"
        },
        body: {
          companyId: DEMO_IDS.companyId,
          email: "missing.ops@example.test"
        }
      });
      assert.equal(unresolved.error, "user_not_found");
    }

    const approverLogin = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });
    const totpDenied = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: approverLogin.sessionToken,
      expectedStatus: 403,
      headers: {
        "x-forwarded-for": "198.51.100.72"
      },
      body: {
        code: "000000"
      }
    });
    assert.equal(totpDenied.error, "totp_code_invalid");

    const alerts = await requestJson(`${baseUrl}/v1/ops/security/alerts?companyId=${DEMO_IDS.companyId}&alertCode=auth_login_unresolved_identifier`, {
      token: adminLogin.sessionToken
    });
    assert.equal(alerts.items.length >= 1, true);
    assert.equal(alerts.items[0].alertCode, "auth_login_unresolved_identifier");

    const budgets = await requestJson(`${baseUrl}/v1/ops/security/budgets?companyId=${DEMO_IDS.companyId}&budgetCode=auth_login_ip`, {
      token: adminLogin.sessionToken
    });
    assert.equal(budgets.items.some((item) => item.subjectKey === "ip:198.51.100.71"), true);

    const failureSeries = await requestJson(`${baseUrl}/v1/ops/security/failure-series?companyId=${DEMO_IDS.companyId}&seriesCode=auth_totp_account_failures`, {
      token: adminLogin.sessionToken
    });
    assert.equal(failureSeries.items.some((item) => item.subjectKey === `company_user:${DEMO_IDS.companyUserId}`), false);
    assert.equal(failureSeries.items.some((item) => item.ipAddress === "198.51.100.72"), true);

    const riskSummary = await requestJson(`${baseUrl}/v1/ops/security/risk-summary?companyId=${DEMO_IDS.companyId}&subjectKey=company_user:missing.ops@example.test`, {
      token: adminLogin.sessionToken
    });
    assert.equal(riskSummary.summary.lastAlertCode, "auth_login_unresolved_identifier");
    assert.equal(typeof riskSummary.summary.totalScore, "number");

    const deniedOpsRead = await requestJson(`${baseUrl}/v1/ops/security/alerts?companyId=${DEMO_IDS.companyId}`, {
      token: fieldLogin.sessionToken,
      expectedStatus: 403
    });
    assert.equal(deniedOpsRead.error, "backoffice_role_forbidden");
  } finally {
    await stopServer(server);
  }
});

async function requestJson(url, { method = "GET", body, token, headers = {}, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {}),
      ...(headers && typeof headers === "object" ? headers : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}

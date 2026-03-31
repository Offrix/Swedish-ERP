import test from "node:test";
import assert from "node:assert/strict";
import { generateTotpCode } from "../../packages/auth-core/src/index.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_TOTP_SECRET,
  DEMO_APPROVER_EMAIL,
  DEMO_TOTP_SECRET,
  DEMO_IDS,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 6 hardening rate limits repeated pending login starts for the same account", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-29T09:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const started = platform.startLogin({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    });
    assert.equal(started.session.status, "pending");
  }

  assert.throws(
    () =>
      platform.startLogin({
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }),
    (error) => error?.code === "login_rate_limited" && error?.status === 429
  );

  const snapshot = platform.snapshot();
  assert.equal(snapshot.authGuardrails.some((guardrail) => guardrail.scope === "login_identifier" && guardrail.lockedUntil), true);
});

test("Phase 6 hardening locks unresolved identifiers after repeated failed login starts and expires after the window", () => {
  let now = new Date("2026-03-29T10:00:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.startLogin({
          companyId: DEMO_IDS.companyId,
          email: "missing@example.test"
        }),
      (error) => error?.code === "user_not_found" && error?.status === 404
    );
  }

  assert.throws(
    () =>
      platform.startLogin({
        companyId: DEMO_IDS.companyId,
        email: "missing@example.test"
      }),
    (error) => error?.code === "login_temporarily_locked" && error?.status === 429
  );

  now = new Date("2026-03-29T10:16:00Z");
  assert.throws(
    () =>
      platform.startLogin({
        companyId: DEMO_IDS.companyId,
        email: "missing@example.test"
      }),
    (error) => error?.code === "user_not_found" && error?.status === 404
  );
});

test("Phase 6 hardening locks repeated invalid TOTP attempts and revokes the attacked session", () => {
  let now = new Date("2026-03-29T11:00:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  const started = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.verifyTotp({
          sessionToken: started.sessionToken,
          code: "000000"
        }),
      (error) => error?.code === "totp_code_invalid" && error?.status === 403
    );
  }

  assert.throws(
    () =>
      platform.verifyTotp({
        sessionToken: started.sessionToken,
        code: "000000"
      }),
    (error) => error?.code === "totp_temporarily_locked" && error?.status === 429
  );
  assert.throws(
    () =>
      platform.inspectSession({
        sessionToken: started.sessionToken,
        allowPending: true
      }),
    (error) => error?.code === "session_revoked" && error?.status === 401
  );

  now = new Date("2026-03-29T11:16:00Z");
  const retried = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  const verified = platform.verifyTotp({
    sessionToken: retried.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL,
      now
    })
  });
  assert.equal(verified.session.status, "active");
});

test("Phase 6 hardening exports sealed auth factor secrets instead of raw TOTP state and restores them after import", () => {
  const clock = () => new Date("2026-03-29T14:00:00Z");
  const platform = createOrgAuthPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo"
  });
  const started = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  const durableState = platform.exportDurableState();
  const serialized = JSON.stringify(durableState);
  const storedSession = durableState.authSessions.entries.find(
    ([sessionId]) => sessionId === started.session.sessionId
  )?.[1];

  assert.ok(storedSession);
  assert.equal(serialized.includes(DEMO_TOTP_SECRET), false);
  assert.equal(serialized.includes(DEMO_APPROVER_TOTP_SECRET), false);
  assert.equal(serialized.includes(started.sessionToken), false);
  assert.equal(storedSession.tokenHashAlgorithm, "blind_index_hmac_sha256");
  assert.equal(storedSession.tokenHashKeyVersion, "org-auth:test:test:v1");
  assert.notEqual(storedSession.tokenHash, started.sessionToken);

  const restoredPlatform = createOrgAuthPlatform({
    clock
  });
  restoredPlatform.importDurableState(durableState);
  const restoredLogin = restoredPlatform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  const verified = restoredPlatform.verifyTotp({
    sessionToken: restoredLogin.sessionToken,
    code: restoredPlatform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL,
      now: clock()
    })
  });
  assert.equal(verified.session.status, "active");
});

test("Phase 6 hardening seals auth broker challenge secrets in durable export and restores broker flows after import", () => {
  const clock = () => new Date("2026-03-29T14:30:00Z");
  const platform = createOrgAuthPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo"
  });

  const adminLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const adminTotpCode = platform.getTotpCodeForTesting({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL,
    now: clock()
  });
  platform.verifyTotp({
    sessionToken: adminLogin.sessionToken,
    code: adminTotpCode
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: adminLogin.sessionToken
  });
  const bankIdCompletionToken = platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef);

  const federationStart = platform.startFederationAuthentication({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL,
    connectionId: "acme-sso",
    redirectUri: "https://app.example.test/auth/federation/callback"
  });
  const federationAuthorizationCode = platform.getFederationAuthorizationCodeForTesting(federationStart.authRequestId);

  const durableState = platform.exportDurableState();
  const serialized = JSON.stringify(durableState);
  assert.equal(serialized.includes(bankIdCompletionToken), false);
  assert.equal(serialized.includes(bankIdStart.qrStartSecret), false);
  assert.equal(serialized.includes(federationStart.state), false);
  assert.equal(serialized.includes(federationAuthorizationCode), false);

  const restoredPlatform = createOrgAuthPlatform({
    clock
  });
  restoredPlatform.importDurableState(durableState);

  const restoredBankIdCollect = restoredPlatform.collectBankIdAuthentication({
    sessionToken: adminLogin.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: restoredPlatform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });
  assert.equal(restoredBankIdCollect.session.status, "active");

  const restoredFederationComplete = restoredPlatform.completeFederationAuthentication({
    sessionToken: federationStart.sessionToken,
    authRequestId: federationStart.authRequestId,
    authorizationCode: restoredPlatform.getFederationAuthorizationCodeForTesting(federationStart.authRequestId),
    state: federationStart.state
  });
  assert.equal(restoredFederationComplete.session.status, "active");
});

test("Phase 6 hardening locks repeated invalid BankID completion attempts and revokes the attacked session", () => {
  let now = new Date("2026-03-29T14:45:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  const login = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: login.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now
    })
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.collectBankIdAuthentication({
          sessionToken: login.sessionToken,
          orderRef: bankIdStart.orderRef,
          completionToken: "wrong"
        }),
      (error) => error?.code === "bankid_completion_token_invalid" && error?.status === 403
    );
  }

  assert.throws(
    () =>
      platform.collectBankIdAuthentication({
        sessionToken: login.sessionToken,
        orderRef: bankIdStart.orderRef,
        completionToken: "wrong"
      }),
    (error) => error?.code === "bankid_temporarily_locked" && error?.status === 429
  );
  assert.throws(
    () =>
      platform.inspectSession({
        sessionToken: login.sessionToken,
        allowPending: true
      }),
    (error) => error?.code === "session_revoked" && error?.status === 401
  );

  now = new Date("2026-03-29T15:01:00Z");
  const retried = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: retried.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now
    })
  });
  const retriedBankIdStart = platform.startBankIdAuthentication({
    sessionToken: retried.sessionToken
  });
  const collected = platform.collectBankIdAuthentication({
    sessionToken: retried.sessionToken,
    orderRef: retriedBankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(retriedBankIdStart.orderRef)
  });
  assert.equal(collected.session.status, "active");
});

test("Phase 6 hardening locks repeated invalid federation completion attempts and revokes the attacked session", () => {
  let now = new Date("2026-03-29T15:10:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  const federationStart = platform.startFederationAuthentication({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL,
    connectionId: "acme-sso",
    redirectUri: "https://app.example.test/auth/federation/callback"
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.completeFederationAuthentication({
          sessionToken: federationStart.sessionToken,
          authRequestId: federationStart.authRequestId,
          authorizationCode: "wrong",
          state: "wrong"
        }),
      (error) =>
        (error?.code === "federation_state_invalid" || error?.code === "federation_authorization_code_invalid")
        && error?.status === 403
    );
  }

  assert.throws(
    () =>
      platform.completeFederationAuthentication({
        sessionToken: federationStart.sessionToken,
        authRequestId: federationStart.authRequestId,
        authorizationCode: "wrong",
        state: "wrong"
      }),
    (error) => error?.code === "federation_temporarily_locked" && error?.status === 429
  );
  assert.throws(
    () =>
      platform.inspectSession({
        sessionToken: federationStart.sessionToken,
        allowPending: true
      }),
    (error) => error?.code === "session_revoked" && error?.status === 401
  );

  now = new Date("2026-03-29T15:26:00Z");
  const retriedFederationStart = platform.startFederationAuthentication({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL,
    connectionId: "acme-sso",
    redirectUri: "https://app.example.test/auth/federation/callback"
  });
  const completed = platform.completeFederationAuthentication({
    sessionToken: retriedFederationStart.sessionToken,
    authRequestId: retriedFederationStart.authRequestId,
    authorizationCode: platform.getFederationAuthorizationCodeForTesting(retriedFederationStart.authRequestId),
    state: retriedFederationStart.state
  });
  assert.equal(completed.session.status, "active");
});

test("Phase 6 hardening locks repeated invalid passkey assertions and revokes the attacked session", () => {
  let now = new Date("2026-03-29T15:00:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  const registrationLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: registrationLogin.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now
    })
  });
  const registrationActivation = platform.startBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken,
    orderRef: registrationActivation.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(registrationActivation.orderRef)
  });
  const registrationStepUp = platform.startBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken,
    actionClass: "identity_device_trust_manage"
  });
  platform.collectBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken,
    orderRef: registrationStepUp.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(registrationStepUp.orderRef)
  });
  const registration = platform.beginPasskeyRegistration({
    sessionToken: registrationLogin.sessionToken,
    deviceName: "Approver key"
  });
  platform.finishPasskeyRegistration({
    sessionToken: registrationLogin.sessionToken,
    challengeId: registration.challengeId,
    credentialId: "cred-approver-key",
    publicKey: "pk-approver-key",
    deviceName: "Approver key"
  });

  const login = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: login.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now
    })
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.assertPasskey({
          sessionToken: login.sessionToken,
          credentialId: "cred-approver-key",
          assertion: "passkey:wrong"
        }),
      (error) => error?.code === "passkey_assertion_invalid" && error?.status === 403
    );
  }

  assert.throws(
    () =>
      platform.assertPasskey({
        sessionToken: login.sessionToken,
        credentialId: "cred-approver-key",
        assertion: "passkey:wrong"
      }),
    (error) => error?.code === "passkey_temporarily_locked" && error?.status === 429
  );
  assert.throws(
    () =>
      platform.inspectSession({
        sessionToken: login.sessionToken,
        allowPending: true
      }),
    (error) => error?.code === "session_revoked" && error?.status === 401
  );

  now = new Date("2026-03-29T15:16:00Z");
  const retried = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: retried.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now
    })
  });
  const asserted = platform.assertPasskey({
    sessionToken: retried.sessionToken,
    credentialId: "cred-approver-key",
    assertion: "passkey:cred-approver-key"
  });
  assert.equal(asserted.session.status, "active");
});

test("Phase 6 hardening exposes locked TOTP recovery state and requires alternate-factor step-up before re-enrollment", () => {
  let now = new Date("2026-03-29T17:00:00Z");
  const platform = createApiPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  const registrationLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: registrationLogin.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL,
      now
    })
  });
  const registrationActivation = platform.startBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken,
    orderRef: registrationActivation.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(registrationActivation.orderRef)
  });
  const registrationStepUp = platform.startBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken,
    actionClass: "identity_device_trust_manage"
  });
  platform.collectBankIdAuthentication({
    sessionToken: registrationLogin.sessionToken,
    orderRef: registrationStepUp.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(registrationStepUp.orderRef)
  });
  const passkeyRegistration = platform.beginPasskeyRegistration({
    sessionToken: registrationLogin.sessionToken,
    deviceName: "Recovery key"
  });
  platform.finishPasskeyRegistration({
    sessionToken: registrationLogin.sessionToken,
    challengeId: passkeyRegistration.challengeId,
    credentialId: "cred-recovery-key",
    publicKey: "pk-recovery-key",
    deviceName: "Recovery key"
  });

  const firstLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.verifyTotp({
          sessionToken: firstLogin.sessionToken,
          code: "000000"
        }),
      (error) => error?.code === "totp_code_invalid" && error?.status === 403
    );
  }
  assert.throws(
    () =>
      platform.verifyTotp({
        sessionToken: firstLogin.sessionToken,
        code: "000000"
      }),
    (error) => error?.code === "totp_temporarily_locked" && error?.status === 429
  );

  now = new Date("2026-03-29T17:16:00Z");
  const secondLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () =>
        platform.verifyTotp({
          sessionToken: secondLogin.sessionToken,
          code: "000000"
        }),
      (error) => error?.code === "totp_code_invalid" && error?.status === 403
    );
  }
  assert.throws(
    () =>
      platform.verifyTotp({
        sessionToken: secondLogin.sessionToken,
        code: "000000"
      }),
    (error) => error?.code === "totp_recovery_required" && error?.status === 403
  );

  now = new Date("2026-03-29T17:17:00Z");
  const recoveryLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  const recoveryBankIdStart = platform.startBankIdAuthentication({
    sessionToken: recoveryLogin.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: recoveryLogin.sessionToken,
    orderRef: recoveryBankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(recoveryBankIdStart.orderRef)
  });
  platform.assertPasskey({
    sessionToken: recoveryLogin.sessionToken,
    credentialId: "cred-recovery-key",
    assertion: "passkey:cred-recovery-key"
  });

  const beforeRecovery = platform.listAuthFactors({
    sessionToken: recoveryLogin.sessionToken
  });
  const lockedTotp = beforeRecovery.items.find((factor) => factor.factorType === "totp" && factor.status === "locked");
  assert.ok(lockedTotp);
  assert.equal(lockedTotp.recoveryRequired, true);
  assert.equal(lockedTotp.canCurrentSessionPerformRecovery, false);
  assert.equal(lockedTotp.availableRecoveryFactorTypes.includes("bankid"), true);
  assert.equal(lockedTotp.availableRecoveryFactorTypes.includes("passkey"), true);

  assert.throws(
    () =>
      platform.beginTotpEnrollment({
        sessionToken: recoveryLogin.sessionToken,
        label: "Recovered authenticator"
      }),
    (error) => error?.code === "auth_factor_manage_step_up_required" && error?.status === 403
  );

  const recoveryStepUp = platform.startBankIdAuthentication({
    sessionToken: recoveryLogin.sessionToken,
    actionClass: "identity_factor_manage"
  });
  platform.collectBankIdAuthentication({
    sessionToken: recoveryLogin.sessionToken,
    orderRef: recoveryStepUp.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(recoveryStepUp.orderRef)
  });

  const reenrollment = platform.beginTotpEnrollment({
    sessionToken: recoveryLogin.sessionToken,
    label: "Recovered authenticator"
  });
  assert.equal(reenrollment.recoveryMode, true);
  const verified = platform.verifyTotp({
    sessionToken: recoveryLogin.sessionToken,
    factorId: reenrollment.factorId,
    code: generateTotpCode({ secret: reenrollment.secret, now })
  });
  assert.equal(verified.factor.status, "active");

  const afterRecovery = platform.listAuthFactors({
    sessionToken: recoveryLogin.sessionToken
  });
  assert.equal(afterRecovery.items.some((factor) => factor.factorId === reenrollment.factorId && factor.status === "active"), true);
  assert.equal(afterRecovery.items.some((factor) => factor.factorId === lockedTotp.factorId && factor.status === "superseded"), true);
});

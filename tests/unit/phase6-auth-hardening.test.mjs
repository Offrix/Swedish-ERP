import test from "node:test";
import assert from "node:assert/strict";
import {
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

  const durableState = platform.exportDurableState();
  const serialized = JSON.stringify(durableState);
  assert.equal(serialized.includes(DEMO_TOTP_SECRET), false);
  assert.equal(serialized.includes(DEMO_APPROVER_TOTP_SECRET), false);

  const restoredPlatform = createOrgAuthPlatform({
    clock
  });
  restoredPlatform.importDurableState(durableState);
  const started = restoredPlatform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  const verified = restoredPlatform.verifyTotp({
    sessionToken: started.sessionToken,
    code: restoredPlatform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL,
      now: clock()
    })
  });
  assert.equal(verified.session.status, "active");
});

test("Phase 6 hardening locks repeated invalid passkey assertions and revokes the attacked session", () => {
  let now = new Date("2026-03-29T15:00:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => new Date(now),
    bootstrapScenarioCode: "test_default_demo"
  });

  const registrationLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  platform.verifyTotp({
    sessionToken: registrationLogin.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL,
      now
    })
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
    email: DEMO_APPROVER_EMAIL
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
    email: DEMO_APPROVER_EMAIL
  });
  const asserted = platform.assertPasskey({
    sessionToken: retried.sessionToken,
    credentialId: "cred-approver-key",
    assertion: "passkey:cred-approver-key"
  });
  assert.equal(asserted.session.status, "active");
});

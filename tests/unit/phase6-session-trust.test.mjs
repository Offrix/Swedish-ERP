import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_IDS,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";

test("Phase 6.2 session revisions, freshness TTL and challenge receipts are recorded for strong auth", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T11:00:00Z"),
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
      email: DEMO_ADMIN_EMAIL
    }),
    actionClass: "org_identity_admin",
    deviceFingerprint: "device:totp:finance-laptop"
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken,
    actionClass: "identity_session_manage"
  });
  const bankIdCollect = platform.collectBankIdAuthentication({
    sessionToken: login.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef),
    deviceFingerprint: "device:bankid:mobile"
  });

  const inspection = platform.inspectSession({
    sessionToken: login.sessionToken
  });
  assert.equal(inspection.session.status, "active");
  assert.equal(inspection.session.trustClass, "strong_mfa");
  assert.equal(inspection.session.trustLevel, "strong_mfa");
  assert.equal(typeof inspection.session.sessionRevisionId, "string");
  assert.equal(inspection.session.sessionRevisionNumber >= 3, true);
  assert.equal(typeof inspection.session.freshTrustByActionClass.identity_session_manage, "string");
  assert.equal(typeof inspection.session.freshTrustByTrustLevel.strong_mfa, "string");
  assert.equal(inspection.sessionRevisions.some((revision) => revision.reasonCode === "login_started"), true);
  assert.equal(inspection.sessionRevisions.some((revision) => revision.reasonCode === "factor_completed"), true);
  assert.equal(inspection.sessionRevisions.every((revision) => typeof revision.tokenHash === "string"), true);
  assert.equal(inspection.sessionRevisions.every((revision) => typeof revision.expiresAt === "string"), true);
  assert.equal(
    inspection.sessionRevisions.some(
      (revision) =>
        revision.reasonCode === "factor_completed"
        && revision.trustClass === "strong_mfa"
        && typeof revision.deviceTrustId === "string"
    ),
    true
  );

  const challenges = platform.listChallenges({
    sessionToken: login.sessionToken
  });
  const bankIdChallenge = challenges.find((challenge) => challenge.challengeId === bankIdStart.orderRef);
  assert.ok(bankIdChallenge);
  assert.equal(bankIdChallenge.status, "consumed");
  assert.equal(bankIdChallenge.actionClass, "identity_session_manage");
  assert.equal(bankIdChallenge.trustRequired, "strong_mfa");
  assert.equal(typeof bankIdChallenge.completedAt, "string");
  assert.equal(bankIdChallenge.receipts.length >= 1, true);
  assert.equal(bankIdCollect.receipt.actionClass, "identity_session_manage");
  assert.equal(bankIdCollect.receipt.sessionRevisionId, inspection.session.sessionRevisionId);

  const devices = platform.listDeviceTrustRecords({
    sessionToken: login.sessionToken
  });
  assert.equal(devices.some((device) => device.factorType === "totp" && device.deviceFingerprint === "device:totp:finance-laptop"), true);
  assert.equal(devices.some((device) => device.factorType === "bankid" && device.deviceFingerprint === "device:bankid:mobile"), true);
});

test("Phase 6.2 challenge center completes TOTP step-up and device trust lifecycle", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T12:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });

  const login = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL
  });
  platform.verifyTotp({
    sessionToken: login.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    }),
    deviceFingerprint: "device:totp:approver"
  });

  const challenge = platform.createChallenge({
    sessionToken: login.sessionToken,
    factorType: "totp",
    actionClass: "support_case_operate"
  });
  assert.equal(challenge.factorType, "totp");
  assert.equal(challenge.actionClass, "support_case_operate");

  const pendingChallenges = platform.listChallenges({
    sessionToken: login.sessionToken,
    status: "pending"
  });
  const pendingChallenge = pendingChallenges.find((item) => item.challengeId === challenge.challengeId);
  assert.ok(pendingChallenge);
  assert.equal(pendingChallenge.actionClass, "support_case_operate");
  assert.equal(pendingChallenge.trustRequired, "mfa");
  assert.equal(pendingChallenge.completedAt, null);

  const completion = platform.completeChallenge({
    sessionToken: login.sessionToken,
    challengeId: challenge.challengeId,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    }),
    deviceFingerprint: "device:totp:approver"
  });
  assert.equal(completion.receipt.actionClass, "support_case_operate");
  assert.equal(typeof completion.session.freshTrustByActionClass.support_case_operate, "string");

  const allChallenges = platform.listChallenges({
    sessionToken: login.sessionToken
  });
  const consumedChallenge = allChallenges.find((item) => item.challengeId === challenge.challengeId);
  assert.ok(consumedChallenge);
  assert.equal(consumedChallenge.status, "consumed");
  assert.equal(consumedChallenge.actionClass, "support_case_operate");
  assert.equal(consumedChallenge.trustRequired, "mfa");
  assert.equal(typeof consumedChallenge.completedAt, "string");
  assert.equal(consumedChallenge.receipts.length, 1);

  const device = platform.listDeviceTrustRecords({
    sessionToken: login.sessionToken
  })[0];
  assert.ok(device);
  const revoked = platform.revokeDevice({
    sessionToken: login.sessionToken,
    deviceTrustRecordId: device.deviceTrustRecordId
  });
  assert.equal(revoked.status, "revoked");
  const trusted = platform.trustDevice({
    sessionToken: login.sessionToken,
    deviceTrustRecordId: device.deviceTrustRecordId,
    trustedUntil: "2026-05-01T00:00:00.000Z"
  });
  assert.equal(trusted.status, "trusted");
  assert.equal(trusted.trustedUntil, "2026-05-01T00:00:00.000Z");
});

test("Phase 6.2 durable auth state restores session trust, receipts and device trust records", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T14:00:00Z"),
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
      email: DEMO_ADMIN_EMAIL
    }),
    actionClass: "org_identity_admin",
    deviceFingerprint: "device:totp:restore-check"
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken,
    actionClass: "identity_session_manage"
  });
  platform.collectBankIdAuthentication({
    sessionToken: login.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef),
    deviceFingerprint: "device:bankid:restore-check"
  });

  const snapshot = platform.exportDurableState();
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "authSessionIdByTokenHash"), false);
  const restoredPlatform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T14:05:00Z")
  });
  restoredPlatform.importDurableState(snapshot);

  const inspection = restoredPlatform.inspectSession({
    sessionToken: login.sessionToken
  });
  assert.equal(inspection.session.status, "active");
  assert.equal(inspection.session.trustClass, "strong_mfa");
  assert.equal(inspection.session.trustLevel, "strong_mfa");
  assert.equal(inspection.sessionRevisions.some((revision) => revision.reasonCode === "factor_completed"), true);
  assert.equal(inspection.sessionRevisions.every((revision) => typeof revision.tokenHash === "string"), true);
  const challenges = restoredPlatform.listChallenges({
    sessionToken: login.sessionToken
  });
  const consumedBankIdChallenge = challenges.find((challenge) => challenge.challengeId === bankIdStart.orderRef);
  assert.ok(consumedBankIdChallenge);
  assert.equal(consumedBankIdChallenge.actionClass, "identity_session_manage");
  assert.equal(consumedBankIdChallenge.trustRequired, "strong_mfa");
  assert.equal(typeof consumedBankIdChallenge.completedAt, "string");
  assert.equal(consumedBankIdChallenge.receipts.length >= 1, true);

  const devices = restoredPlatform.listDeviceTrustRecords({
    sessionToken: login.sessionToken
  });
  assert.equal(devices.length, 2);
  assert.equal(devices.some((device) => device.deviceFingerprint === "device:totp:restore-check"), true);
  assert.equal(devices.some((device) => device.deviceFingerprint === "device:bankid:restore-check"), true);

  const trusted = restoredPlatform.trustDevice({
    sessionToken: login.sessionToken,
    deviceTrustRecordId: devices[0].deviceTrustRecordId,
    trustedUntil: "2026-05-03T00:00:00.000Z"
  });
  assert.equal(trusted.trustedUntil, "2026-05-03T00:00:00.000Z");
});

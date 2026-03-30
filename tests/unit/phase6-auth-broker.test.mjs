import test from "node:test";
import assert from "node:assert/strict";
import { BANKID_PROVIDER_CODE } from "../../packages/auth-core/src/index.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_IDS,
  LOCAL_PASSKEY_PROVIDER_CODE,
  LOCAL_TOTP_PROVIDER_CODE,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";
import { WORKOS_FEDERATION_PROVIDER_CODE } from "../../packages/domain-integrations/src/providers/auth-broker.mjs";

test("Phase 6.1 broker-backed BankID and local factors create canonical identity links", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T08:00:00Z"),
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
    })
  });

  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken
  });
  assert.equal(bankIdStart.providerCode, BANKID_PROVIDER_CODE);
  assert.equal(bankIdStart.providerMode, "sandbox");
  assert.equal(bankIdStart.brokerCode, "signicat");

  const bankIdCollect = platform.collectBankIdAuthentication({
    sessionToken: login.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });
  assert.equal(bankIdCollect.provider.providerMode, "sandbox");
  assert.equal(bankIdCollect.session.status, "active");

  const passkeyStepUp = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken,
    actionClass: "identity_device_trust_manage"
  });
  platform.collectBankIdAuthentication({
    sessionToken: login.sessionToken,
    orderRef: passkeyStepUp.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(passkeyStepUp.orderRef),
    actionClass: "identity_device_trust_manage"
  });

  const passkeyRegistration = platform.beginPasskeyRegistration({
    sessionToken: login.sessionToken,
    deviceName: "Finance laptop key"
  });
  platform.finishPasskeyRegistration({
    sessionToken: login.sessionToken,
    challengeId: passkeyRegistration.challengeId,
    credentialId: "cred-finance-laptop",
    publicKey: "pk-finance-laptop",
    deviceName: "Finance laptop key"
  });

  const identityAccounts = platform.listIdentityAccounts({
    companyUserId: DEMO_IDS.companyUserId
  });
  assert.equal(identityAccounts.some((account) => account.providerCode === LOCAL_TOTP_PROVIDER_CODE && account.factorType === "totp"), true);
  assert.equal(
    identityAccounts.some(
      (account) =>
        account.providerCode === BANKID_PROVIDER_CODE
        && account.factorType === "bankid"
        && account.providerSubject === "197001011233"
    ),
    true
  );
  assert.equal(
    identityAccounts.some(
      (account) =>
        account.providerCode === LOCAL_PASSKEY_PROVIDER_CODE
        && account.factorType === "passkey"
        && account.credentialId === "cred-finance-laptop"
    ),
    true
  );

  const personIdentities = platform.listPersonIdentities({
    companyUserId: DEMO_IDS.companyUserId
  });
  assert.equal(
    personIdentities.some(
      (identity) =>
        identity.providerCode === BANKID_PROVIDER_CODE
        && identity.providerSubject === "197001011233"
        && identity.email === DEMO_ADMIN_EMAIL
    ),
    true
  );
});

test("Phase 6.1 durable auth broker state survives export/import for BankID and federation", () => {
  const clock = () => new Date("2026-03-27T09:30:00Z");
  const platform = createOrgAuthPlatform({
    clock,
    bootstrapScenarioCode: "test_default_demo"
  });

  const adminLogin = platform.startLogin({
    companyId: DEMO_IDS.companyId,
    email: DEMO_ADMIN_EMAIL
  });
  platform.verifyTotp({
    sessionToken: adminLogin.sessionToken,
    code: platform.getTotpCodeForTesting({
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    })
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: adminLogin.sessionToken
  });

  const federationStart = platform.startFederationAuthentication({
    companyId: DEMO_IDS.companyId,
    email: DEMO_APPROVER_EMAIL,
    connectionId: "acme-sso",
    redirectUri: "https://app.example.test/auth/federation/callback"
  });
  assert.equal(federationStart.providerCode, WORKOS_FEDERATION_PROVIDER_CODE);
  assert.equal(federationStart.providerMode, "sandbox");

  const durableState = platform.exportDurableState();
  const restoredPlatform = createOrgAuthPlatform({
    clock
  });
  restoredPlatform.importDurableState(durableState);

  const restoredBankIdCollect = restoredPlatform.collectBankIdAuthentication({
    sessionToken: adminLogin.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: restoredPlatform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });
  assert.equal(restoredBankIdCollect.provider.providerMode, "sandbox");
  assert.equal(restoredBankIdCollect.session.status, "active");

  const federationComplete = restoredPlatform.completeFederationAuthentication({
    sessionToken: federationStart.sessionToken,
    authRequestId: federationStart.authRequestId,
    authorizationCode: restoredPlatform.getFederationAuthorizationCodeForTesting(federationStart.authRequestId),
    state: federationStart.state
  });
  assert.equal(federationComplete.provider.providerMode, "sandbox");
  assert.equal(federationComplete.provider.providerCode, WORKOS_FEDERATION_PROVIDER_CODE);
  assert.equal(federationComplete.session.status, "active");

  const restoredIdentityAccounts = restoredPlatform.listIdentityAccounts({
    companyUserId: DEMO_APPROVER_IDS.companyUserId
  });
  assert.equal(
    restoredIdentityAccounts.some(
      (account) =>
        account.providerCode === WORKOS_FEDERATION_PROVIDER_CODE
        && account.factorType === "federation"
        && account.providerSubject === `acme-sso:${DEMO_APPROVER_IDS.companyUserId}`
    ),
    true
  );
});

test("Phase 6.5 identity mode isolation exposes distinct mode catalog and provider callback domains", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T12:00:00Z"),
    environmentMode: "test",
    providerEnvironmentRef: "test",
    bootstrapScenarioCode: "test_default_demo",
    resolveIdentityModeIsolation: ({ activeProfile }) => ({
      inventory: {
        managedSecretCount: activeProfile.requiredManagedSecretTypes.length,
        callbackSecretCount: 1,
        matchingCallbackCount: 1,
        certificateChainCount: 0,
        requiredManagedSecretTypes: activeProfile.requiredManagedSecretTypes,
        configuredManagedSecretTypes: activeProfile.requiredManagedSecretTypes
      },
      violations: []
    })
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
    })
  });
  const bankIdStart = platform.startBankIdAuthentication({
    sessionToken: login.sessionToken
  });
  platform.collectBankIdAuthentication({
    sessionToken: login.sessionToken,
    orderRef: bankIdStart.orderRef,
    completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
  });

  const summary = platform.getIdentityIsolationSummary({
    sessionToken: login.sessionToken,
    companyId: DEMO_IDS.companyId
  });
  const activeBankId = summary.activeProfiles.find((profile) => profile.providerCode === BANKID_PROVIDER_CODE);
  const activeFederation = summary.activeProfiles.find((profile) => profile.providerCode === WORKOS_FEDERATION_PROVIDER_CODE);
  const productionBankId = summary.modeCatalog.find(
    (profile) => profile.runtimeMode === "production" && profile.providerCode === BANKID_PROVIDER_CODE
  );
  assert.equal(summary.environmentMode, "test");
  assert.equal(summary.ready, true);
  assert.equal(activeBankId.activeProfile.allowsTestIdentities, true);
  assert.equal(activeBankId.activeProfile.testIdentities.length > 0, true);
  assert.equal(activeFederation.activeProfile.redirectUri, `https://${activeFederation.activeProfile.callbackDomain}${activeFederation.activeProfile.callbackPath}`);
  assert.notEqual(activeBankId.activeProfile.callbackDomain, productionBankId.callbackDomain);
  assert.equal(productionBankId.testIdentities.length, 0);

  const federationStart = platform.startFederationAuthentication({
    sessionToken: login.sessionToken,
    connectionId: "acme-sso"
  });
  const authUrl = new URL(federationStart.authorizationUrl);
  assert.equal(authUrl.searchParams.get("redirect_uri"), activeFederation.activeProfile.redirectUri);
});

test("Phase 6.5 production BankID and federation start stay blocked until identity mode isolation is complete", () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T13:00:00Z"),
    environmentMode: "production",
    providerEnvironmentRef: "production",
    bootstrapScenarioCode: "test_default_demo",
    resolveIdentityModeIsolation: ({ activeProfile }) => ({
      inventory: {
        managedSecretCount: 0,
        callbackSecretCount: 0,
        matchingCallbackCount: 0,
        certificateChainCount: 0,
        requiredManagedSecretTypes: activeProfile.requiredManagedSecretTypes,
        configuredManagedSecretTypes: []
      },
      violations: [
        {
          providerCode: activeProfile.providerCode,
          code: "auth_provider_secret_missing",
          severity: "blocking",
          detail: "Missing production auth credentials."
        }
      ]
    })
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
    })
  });

  assert.throws(
    () => platform.startBankIdAuthentication({ sessionToken: login.sessionToken }),
    (error) => error?.code === "auth_identity_mode_isolation_incomplete"
  );
  assert.throws(
    () => platform.startFederationAuthentication({
      sessionToken: login.sessionToken,
      connectionId: "acme-sso"
    }),
    (error) => error?.code === "auth_identity_mode_isolation_incomplete"
  );
});

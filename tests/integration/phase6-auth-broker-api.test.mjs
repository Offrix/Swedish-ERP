import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_APPROVER_EMAIL,
  DEMO_IDS,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";
import { WORKOS_FEDERATION_PROVIDER_CODE } from "../../packages/domain-integrations/src/providers/auth-broker.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 6.1 API exposes broker-backed BankID and federation auth flows", async () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T10:00:00Z"),
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
          email: DEMO_ADMIN_EMAIL
        })
      }
    });
    const bankIdStart = await requestJson(`${baseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: login.sessionToken
    });
    assert.equal(bankIdStart.providerMode, "sandbox");
    assert.equal(bankIdStart.brokerCode, "signicat");
    assert.equal(bankIdStart.providerBaselineCode, "SE-BANKID-RP-API");

    const bankIdCollect = await requestJson(`${baseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
    assert.equal(bankIdCollect.provider.providerMode, "sandbox");
    assert.equal(bankIdCollect.provider.brokerCode, "signicat");
    assert.equal(bankIdCollect.session.status, "active");

    const federationStart = await requestJson(`${baseUrl}/v1/auth/federation/start`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL,
        connectionId: "acme-sso",
        redirectUri: "https://app.example.test/auth/federation/callback"
      }
    });
    assert.equal(federationStart.providerCode, WORKOS_FEDERATION_PROVIDER_CODE);
    assert.equal(federationStart.providerMode, "sandbox");
    assert.equal(federationStart.brokerCode, "workos");
    assert.equal(federationStart.providerBaselineCode, "SE-ENTERPRISE-FEDERATION-BROKER");

    const federationComplete = await requestJson(`${baseUrl}/v1/auth/federation/callback`, {
      method: "POST",
      token: federationStart.sessionToken,
      body: {
        authRequestId: federationStart.authRequestId,
        authorizationCode: platform.getFederationAuthorizationCodeForTesting(federationStart.authRequestId),
        state: federationStart.state
      }
    });
    assert.equal(federationComplete.provider.providerMode, "sandbox");
    assert.equal(federationComplete.provider.brokerCode, "workos");
    assert.equal(federationComplete.session.status, "active");
    assert.equal(
      platform.listIdentityAccounts({ companyUserId: DEMO_APPROVER_IDS.companyUserId }).some(
        (account) => account.providerCode === WORKOS_FEDERATION_PROVIDER_CODE
      ),
      true
    );
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

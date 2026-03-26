import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createDesktopWebServer } from "../../apps/desktop-web/src/server.mjs";
import { DEMO_ADMIN_EMAIL, createOrgAuthPlatform } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("desktop-web exposes auth/onboarding entrypoints while API completes the matching FAS 1 flow", async () => {
  const now = new Date("2026-03-21T10:15:00Z");
  const platform = createOrgAuthPlatform({
    clock: () => now,
    bootstrapScenarioCode: "test_default_demo"
  });
  const apiServer = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });
  const desktopServer = createDesktopWebServer();

  await new Promise((resolve) => apiServer.listen(0, resolve));
  await new Promise((resolve) => desktopServer.listen(0, resolve));
  const apiBaseUrl = `http://127.0.0.1:${apiServer.address().port}`;
  const desktopBaseUrl = `http://127.0.0.1:${desktopServer.address().port}`;

  try {
    const authPage = await fetch(`${desktopBaseUrl}/auth`);
    const authHtml = await authPage.text();
    assert.equal(authPage.status, 200);
    assert.match(authHtml, /Identity and strong auth/);
    assert.match(authHtml, /Admins require MFA/);

    const onboardingPage = await fetch(`${desktopBaseUrl}/onboarding`);
    const onboardingHtml = await onboardingPage.text();
    assert.equal(onboardingPage.status, 200);
    assert.match(onboardingHtml, /Company onboarding wizard/);
    assert.match(onboardingHtml, /Resumable setup/);

    const loginStarted = await requestJson(`${apiBaseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: "00000000-0000-4000-8000-000000000001",
        email: DEMO_ADMIN_EMAIL
      }
    });
    const totpCode = platform.getTotpCodeForTesting({
      companyId: "00000000-0000-4000-8000-000000000001",
      email: DEMO_ADMIN_EMAIL
    });
    await requestJson(`${apiBaseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: loginStarted.sessionToken,
      body: {
        code: totpCode
      }
    });
    const bankidStart = await requestJson(`${apiBaseUrl}/v1/auth/bankid/start`, {
      method: "POST",
      token: loginStarted.sessionToken
    });
    const elevated = await requestJson(`${apiBaseUrl}/v1/auth/bankid/collect`, {
      method: "POST",
      token: loginStarted.sessionToken,
      body: {
        orderRef: bankidStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankidStart.orderRef)
      }
    });
    assert.equal(elevated.session.status, "active");

    const onboardingRun = await requestJson(`${apiBaseUrl}/v1/onboarding/runs`, {
      method: "POST",
      body: {
        legalName: "Surface Flow AB",
        orgNumber: "559900-1234",
        adminEmail: "surface@example.test",
        adminDisplayName: "Surface Owner"
      }
    });
    assert.equal(onboardingRun.checklist.some((step) => step.status === "pending"), true);
  } finally {
    await stopServer(desktopServer);
    await stopServer(apiServer);
  }
});

async function requestJson(url, { method = "GET", body, token } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.ok, true);
  return payload;
}

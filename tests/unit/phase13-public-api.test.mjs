import test from "node:test";
import assert from "node:assert/strict";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { seedReportSnapshot } from "../helpers/reporting-fixtures.mjs";

test("Phase 13.1 public API clients, compatibility baselines and webhook events are deterministic", () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T18:00:00Z")
  });
  seedReportSnapshot(platform, DEMO_IDS.companyId, "phase13-1-unit");

  const client = platform.createPublicApiClient({
    companyId: DEMO_IDS.companyId,
    displayName: "Unit Public Client",
    mode: "sandbox",
    scopes: ["api_spec.read", "reporting.read", "webhook.manage"],
    actorId: "phase13-1-unit"
  });
  const oauthToken = platform.exchangePublicApiClientCredentials({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    scopes: ["reporting.read"],
    expiresInMinutes: 15
  });
  const auth = platform.authorizePublicApiToken({
    accessToken: oauthToken.accessToken,
    requiredScopes: ["reporting.read"],
    companyId: DEMO_IDS.companyId,
    mode: "sandbox"
  });
  assert.equal(auth.token.clientId, client.clientId);

  const baseline = platform.recordPublicApiCompatibilityBaseline({
    companyId: DEMO_IDS.companyId,
    version: "2026-03-22",
    routeHash: "phase13-1-route-hash",
    actorId: "phase13-1-unit"
  });
  assert.equal(baseline.version, "2026-03-22");

  const subscription = platform.createWebhookSubscription({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId,
    mode: "sandbox",
    eventTypes: ["report.snapshot.ready"],
    targetUrl: "https://example.test/unit-webhook",
    actorId: "phase13-1-unit"
  });
  assert.equal(typeof subscription.secret, "string");
  const listedSubscriptions = platform.listWebhookSubscriptions({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId
  });
  assert.equal("secret" in listedSubscriptions[0], false);
  assert.equal(listedSubscriptions[0].secretPresent, true);
  assert.throws(
    () =>
      platform.createWebhookSubscription({
        companyId: DEMO_IDS.companyId,
        clientId: client.clientId,
        mode: "production",
        eventTypes: ["report.snapshot.ready"],
        targetUrl: "https://example.test/unit-webhook-prod",
        actorId: "phase13-1-unit"
      }),
    (error) => error?.code === "public_api_webhook_mode_mismatch"
  );
  const first = platform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "snapshot-1",
    payload: { snapshotId: "snapshot-1" },
    mode: "sandbox",
    eventKey: "phase13-1:event"
  });
  const second = platform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "snapshot-1",
    payload: { snapshotId: "snapshot-1" },
    mode: "sandbox",
    eventKey: "phase13-1:event"
  });
  assert.equal(first.eventId, second.eventId);
  const productionEvent = platform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "snapshot-1",
    payload: { snapshotId: "snapshot-1" },
    mode: "production",
    eventKey: "phase13-1:event"
  });
  assert.notEqual(productionEvent.eventId, first.eventId);
  const deliveries = platform.listWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    subscriptionId: subscription.subscriptionId
  });
  assert.equal(deliveries.length, 1);
  assert.equal(platform.getPublicApiSpec().auth.scheme, "oauth2_client_credentials");
  assert.equal(platform.getPublicApiSandboxCatalog({ companyId: DEMO_IDS.companyId }).mode, "sandbox");
});

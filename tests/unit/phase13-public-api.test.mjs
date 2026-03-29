import test from "node:test";
import assert from "node:assert/strict";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { seedReportSnapshot } from "../helpers/reporting-fixtures.mjs";
import { createSentWebhookDeliveryExecutor } from "../helpers/phase13-integrations-fixtures.mjs";

test("Phase 13.1 public API clients, compatibility baselines and webhook events are deterministic", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T18:00:00Z"),
    webhookDeliveryExecutor: createSentWebhookDeliveryExecutor()
  });
  seedReportSnapshot(platform, DEMO_IDS.companyId, "phase13-1-unit");

  const client = platform.createPublicApiClient({
    companyId: DEMO_IDS.companyId,
    displayName: "Unit Public Client",
    mode: "sandbox",
    scopes: ["api_spec.read", "reporting.read", "legal_form.read", "annual_reporting.read", "tax_account.read", "webhook.manage"],
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
    version: "2026-03-25",
    routeHash: "phase13-1-route-hash",
    actorId: "phase13-1-unit"
  });
  assert.equal(baseline.version, "2026-03-25");

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
  assert.equal(listedSubscriptions[0].signingKeyVersion, 1);
  assert.equal(listedSubscriptions[0].latestSequenceNo, 0);
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
  assert.equal(deliveries[0].status, "queued");
  assert.equal(deliveries[0].sequenceNo, 1);
  assert.equal(deliveries[0].signingKeyVersion, 1);
  const dispatch = await platform.dispatchWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    subscriptionId: subscription.subscriptionId,
    actorId: "phase13-1-unit"
  });
  assert.equal(dispatch.attemptedCount, 1);
  assert.equal(dispatch.items[0].status, "sent");
  assert.equal(dispatch.items[0].attempts.length, 1);
  assert.equal(dispatch.items[0].attempts[0].responseClass, "2xx");
  const refreshedSubscriptions = platform.listWebhookSubscriptions({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId
  });
  assert.equal(refreshedSubscriptions[0].latestSequenceNo, 1);
  assert.equal(typeof refreshedSubscriptions[0].lastDeliveryAt, "string");
  const events = platform.listWebhookEvents({
    companyId: DEMO_IDS.companyId,
    mode: "sandbox"
  });
  assert.equal(events[0].deliveryStatusSummary.sent, 1);
  const spec = platform.getPublicApiSpec();
  assert.equal(spec.auth.scheme, "oauth2_client_credentials");
  assert.equal(spec.version, "2026-03-25");
  assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/legal-forms/declaration-profile"), true);
  assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/annual-reporting/packages"), true);
  assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/tax-account/summary"), true);
  assert.equal(spec.endpoints.some((endpoint) => endpoint.path === "/v1/public/tax-account/reconciliations"), true);
  assert.equal(spec.webhookEventTypes.includes("annual_reporting.package.updated"), true);
  assert.equal(spec.webhookEventTypes.includes("tax_account.reconciliation.updated"), true);
  const sandboxCatalog = platform.getPublicApiSandboxCatalog({ companyId: DEMO_IDS.companyId });
  assert.equal(sandboxCatalog.mode, "sandbox");
  assert.equal(sandboxCatalog.exampleResources.length >= 3, true);
});

test("Phase 13.1 durable export seals webhook subscription secrets and restore preserves dispatch", async () => {
  const clock = () => new Date("2026-03-29T22:00:00Z");
  const platform = createApiPlatform({
    clock,
    webhookDeliveryExecutor: createSentWebhookDeliveryExecutor()
  });

  const client = platform.createPublicApiClient({
    companyId: DEMO_IDS.companyId,
    displayName: "Durable webhook client",
    mode: "sandbox",
    scopes: ["api_spec.read", "webhook.manage"],
    actorId: "phase13-1-durable"
  });
  const subscription = platform.createWebhookSubscription({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId,
    mode: "sandbox",
    eventTypes: ["report.snapshot.ready"],
    targetUrl: "https://example.test/durable-webhook",
    actorId: "phase13-1-durable"
  });

  const durableState = platform.getDomain("integrations").exportDurableState();
  const serialized = JSON.stringify(durableState);
  assert.equal(serialized.includes(subscription.secret), false);

  const restoredPlatform = createApiPlatform({
    clock,
    webhookDeliveryExecutor: createSentWebhookDeliveryExecutor()
  });
  restoredPlatform.getDomain("integrations").importDurableState(durableState);

  const listedSubscriptions = restoredPlatform.listWebhookSubscriptions({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId
  });
  assert.equal("secret" in listedSubscriptions[0], false);
  assert.equal(listedSubscriptions[0].secretPresent, true);

  const event = restoredPlatform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "snapshot-durable",
    payload: { snapshotId: "snapshot-durable" },
    mode: "sandbox",
    eventKey: "phase13-1:durable"
  });
  const dispatch = await restoredPlatform.dispatchWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    deliveryId: event.deliveries[0].deliveryId,
    actorId: "phase13-1-durable"
  });
  assert.equal(dispatch.items[0].status, "sent");
});

test("Phase 13.1 webhook runtime dead-letters deliveries after repeated transport failure", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T18:30:00Z"),
    webhookDeliveryExecutor: async () => ({
      outcome: "failed",
      httpStatus: 500,
      errorCode: "webhook_transport_error",
      retryAfterSeconds: 1
    })
  });

  const client = platform.createPublicApiClient({
    companyId: DEMO_IDS.companyId,
    displayName: "Dead letter client",
    mode: "sandbox",
    scopes: ["api_spec.read", "webhook.manage"],
    actorId: "phase13-1-dead-letter"
  });
  const subscription = platform.createWebhookSubscription({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId,
    mode: "sandbox",
    eventTypes: ["report.snapshot.ready"],
    targetUrl: "https://example.test/dead-letter-webhook",
    actorId: "phase13-1-dead-letter"
  });
  const event = platform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "snapshot-dead-letter",
    payload: { snapshotId: "snapshot-dead-letter" },
    mode: "sandbox",
    eventKey: "phase13-1:dead-letter"
  });
  const initialDelivery = event.deliveries[0];

  let latestStatus = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const dispatch = await platform.dispatchWebhookDeliveries({
      companyId: DEMO_IDS.companyId,
      deliveryId: initialDelivery.deliveryId,
      actorId: "phase13-1-dead-letter"
    });
    latestStatus = dispatch.items[0].status;
  }

  assert.equal(latestStatus, "dead_lettered");
  const deliveries = platform.listWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    subscriptionId: subscription.subscriptionId
  });
  assert.equal(deliveries[0].deadLetterReasonCode, "webhook_transport_error");
  assert.equal(deliveries[0].attempts.length, 5);
});

test("Phase 13.1 explicit delivery dispatch does not resend terminal webhook deliveries", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T18:45:00Z"),
    webhookDeliveryExecutor: createSentWebhookDeliveryExecutor()
  });

  const client = platform.createPublicApiClient({
    companyId: DEMO_IDS.companyId,
    displayName: "Terminal delivery client",
    mode: "sandbox",
    scopes: ["api_spec.read", "webhook.manage"],
    actorId: "phase13-1-terminal"
  });
  const subscription = platform.createWebhookSubscription({
    companyId: DEMO_IDS.companyId,
    clientId: client.clientId,
    mode: "sandbox",
    eventTypes: ["report.snapshot.ready"],
    targetUrl: "https://example.test/terminal-webhook",
    actorId: "phase13-1-terminal"
  });
  const event = platform.emitWebhookEvent({
    companyId: DEMO_IDS.companyId,
    eventType: "report.snapshot.ready",
    resourceType: "report_snapshot",
    resourceId: "snapshot-terminal",
    payload: { snapshotId: "snapshot-terminal" },
    mode: "sandbox",
    eventKey: "phase13-1:terminal"
  });
  const deliveryId = event.deliveries[0].deliveryId;

  const firstDispatch = await platform.dispatchWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    deliveryId,
    actorId: "phase13-1-terminal"
  });
  assert.equal(firstDispatch.attemptedCount, 1);
  assert.equal(firstDispatch.items[0].status, "sent");

  const secondDispatch = await platform.dispatchWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    deliveryId,
    actorId: "phase13-1-terminal"
  });
  assert.equal(secondDispatch.attemptedCount, 0);

  const delivery = platform.listWebhookDeliveries({
    companyId: DEMO_IDS.companyId,
    subscriptionId: subscription.subscriptionId
  })[0];
  assert.equal(delivery.attempts.length, 1);
});

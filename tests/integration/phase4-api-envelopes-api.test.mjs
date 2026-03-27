import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 4.1 API emits canonical success, error and webhook envelopes", async () => {
  const deliveredWebhookBodies = [];
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T08:00:00Z"),
    webhookDeliveryExecutor: async ({ body }) => {
      deliveredWebhookBodies.push(body);
      return {
        outcome: "sent",
        httpStatus: 202
      };
    }
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const runtimeModeResponse = await fetch(`${baseUrl}/v1/system/runtime-mode`);
    assert.equal(runtimeModeResponse.status, 200);
    const runtimeModePayload = await runtimeModeResponse.json();
    assert.equal(typeof runtimeModePayload.meta.requestId, "string");
    assert.equal(typeof runtimeModePayload.meta.correlationId, "string");
    assert.equal(runtimeModePayload.meta.apiVersion, "2026-03-27");
    assert.equal(runtimeModePayload.meta.classification, "success");
    assert.equal(runtimeModePayload.data.runtimeModeProfile.environmentMode, runtimeModePayload.runtimeModeProfile.environmentMode);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const createdClient = await requestJson(baseUrl, "/v1/public-api/clients", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        meta: {
          correlationId: "phase4-client-correlation",
          idempotencyKey: "phase4-client-create"
        },
        data: {
          companyId: DEMO_IDS.companyId,
          displayName: "Phase 4 Envelope Client",
          mode: "sandbox",
          scopes: ["api_spec.read", "reporting.read", "submission.read", "webhook.manage"]
        }
      }
    });
    assert.equal(createdClient.meta.correlationId, "phase4-client-correlation");
    assert.equal(createdClient.meta.idempotencyKey, "phase4-client-create");
    assert.equal(createdClient.meta.classification, "created");
    assert.equal(createdClient.data.clientId, createdClient.clientId);

    const limitedToken = await requestJson(baseUrl, "/v1/public/oauth/token", {
      method: "POST",
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: createdClient.clientId,
        clientSecret: createdClient.clientSecret,
        scopes: ["api_spec.read"]
      }
    });

    const deniedResponse = await fetch(`${baseUrl}/v1/public/report-snapshots?companyId=${DEMO_IDS.companyId}`, {
      headers: {
        authorization: `Bearer ${limitedToken.accessToken}`
      }
    });
    assert.equal(deniedResponse.status, 403);
    const deniedPayload = await deniedResponse.json();
    assert.equal(deniedPayload.meta.apiVersion, "2026-03-27");
    assert.equal(deniedPayload.meta.classification, "permission");
    assert.equal(deniedPayload.error, "public_api_scope_denied");
    assert.equal(deniedPayload.errorDetail.code, "public_api_scope_denied");
    assert.equal(deniedPayload.errorDetail.denialReasonCode, "public_api_scope_denied");
    assert.equal(deniedPayload.errorCode, "public_api_scope_denied");

    const subscription = await requestJson(baseUrl, "/v1/public-api/webhooks", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        clientId: createdClient.clientId,
        mode: "sandbox",
        eventTypes: ["report.snapshot.ready"],
        targetUrl: "https://example.test/phase4-1/webhook"
      }
    });

    const emitted = await requestJson(baseUrl, "/v1/public-api/webhook-events", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        meta: {
          idempotencyKey: "phase4-webhook-event"
        },
        data: {
          companyId: DEMO_IDS.companyId,
          eventType: "report.snapshot.ready",
          resourceType: "report_snapshot",
          resourceId: "phase4-report",
          payload: {
            reportSnapshotId: "phase4-report"
          },
          mode: "sandbox",
          eventKey: "phase4-webhook-event"
        }
      }
    });
    assert.equal(emitted.meta.idempotencyKey, "phase4-webhook-event");

    const dispatched = await requestJson(baseUrl, "/v1/public-api/webhook-deliveries/dispatch", {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        subscriptionId: subscription.subscriptionId
      }
    });
    assert.equal(dispatched.items.length, 1);
    assert.equal(deliveredWebhookBodies.length, 1);
    assert.equal(deliveredWebhookBodies[0].meta.apiVersion, "2026-03-27");
    assert.equal(deliveredWebhookBodies[0].meta.mode, "sandbox");
    assert.equal(deliveredWebhookBodies[0].meta.classification, "event");
    assert.equal(deliveredWebhookBodies[0].meta.idempotencyKey, "phase4-webhook-event");
    assert.equal(deliveredWebhookBodies[0].data.eventId, emitted.eventId);
    assert.equal(deliveredWebhookBodies[0].eventId, emitted.eventId);
  } finally {
    await stopServer(server);
  }
});

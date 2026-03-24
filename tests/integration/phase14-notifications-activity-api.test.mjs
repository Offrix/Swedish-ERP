import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Step 13 API exposes notifications and activity as separate read models", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-24T16:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    const notification = platform.createNotification({
      companyId: DEMO_IDS.companyId,
      recipientType: "user",
      recipientId: DEMO_IDS.userId,
      categoryCode: "review_due",
      priorityCode: "high",
      sourceDomainCode: "REVIEW_CENTER",
      sourceObjectType: "review_item",
      sourceObjectId: "review_api_1",
      title: "Review queue changed",
      body: "A review item was assigned to you.",
      actorId: DEMO_IDS.userId
    });
    platform.deliverNotification({
      companyId: DEMO_IDS.companyId,
      notificationId: notification.notificationId,
      channelCode: "in_app",
      actorId: DEMO_IDS.userId
    });

    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_api_1",
      activityType: "review_item_created",
      actorType: "system",
      actorSnapshot: { actorId: "system" },
      summary: "Review item created for API integration test.",
      sourceEventId: "activity_evt_1",
      visibilityScope: "company",
      actorId: DEMO_IDS.userId
    });

    const notificationList = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}&recipientType=user&recipientId=${DEMO_IDS.userId}`,
      { token: adminToken }
    );
    assert.equal(notificationList.items.some((item) => item.notificationId === notification.notificationId), true);

    const read = await requestJson(baseUrl, `/v1/notifications/${notification.notificationId}/read`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(read.status, "read");

    const acknowledged = await requestJson(baseUrl, `/v1/notifications/${notification.notificationId}/ack`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(acknowledged.status, "acknowledged");

    const activity = await requestJson(
      baseUrl,
      `/v1/activity?companyId=${DEMO_IDS.companyId}&objectType=review_item&objectId=review_api_1`,
      { token: adminToken }
    );
    assert.equal(activity.items.length, 1);
    assert.equal(activity.items[0].summary, "Review item created for API integration test.");
  } finally {
    await stopServer(server);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_APPROVER_EMAIL,
  DEMO_APPROVER_IDS,
  DEMO_IDS,
  DEMO_TEAM_IDS
} from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, loginWithTotpOnly, requestJson } from "../helpers/api-helpers.mjs";

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
    const approverToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    });

    const adminNotification = platform.createNotification({
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
      notificationId: adminNotification.notificationId,
      channelCode: "in_app",
      actorId: DEMO_IDS.userId
    });

    const approverNotification = platform.createNotification({
      companyId: DEMO_IDS.companyId,
      recipientType: "user",
      recipientId: DEMO_APPROVER_IDS.userId,
      categoryCode: "review_due",
      priorityCode: "medium",
      sourceDomainCode: "REVIEW_CENTER",
      sourceObjectType: "review_item",
      sourceObjectId: "review_api_2",
      title: "Review queue changed for approver",
      body: "A review item was assigned to the approver.",
      actorId: DEMO_IDS.userId
    });
    platform.deliverNotification({
      companyId: DEMO_IDS.companyId,
      notificationId: approverNotification.notificationId,
      channelCode: "in_app",
      actorId: DEMO_IDS.userId
    });

    const financeTeamNotification = platform.createNotification({
      companyId: DEMO_IDS.companyId,
      recipientType: "team",
      recipientId: DEMO_TEAM_IDS.financeOps,
      categoryCode: "deadline_warning",
      priorityCode: "medium",
      sourceDomainCode: "CORE",
      sourceObjectType: "work_item",
      sourceObjectId: "team_deadline_1",
      title: "Finance team deadline warning",
      body: "The finance team has a deadline approaching.",
      actorId: DEMO_IDS.userId
    });
    platform.deliverNotification({
      companyId: DEMO_IDS.companyId,
      notificationId: financeTeamNotification.notificationId,
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
    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_api_paged",
      activityType: "review_item_created",
      actorType: "system",
      actorSnapshot: { actorId: "system" },
      summary: "Older paged activity.",
      occurredAt: "2026-03-24T15:40:00Z",
      sourceEventId: "activity_evt_page_1",
      visibilityScope: "company",
      actorId: DEMO_IDS.userId
    });
    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_api_paged",
      activityType: "review_item_updated",
      actorType: "user",
      actorSnapshot: { userId: DEMO_IDS.userId },
      summary: "Newer paged activity.",
      occurredAt: "2026-03-24T15:50:00Z",
      sourceEventId: "activity_evt_page_2",
      visibilityScope: "company",
      actorId: DEMO_IDS.userId
    });

    const notificationList = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}&recipientType=user&recipientId=${DEMO_IDS.userId}`,
      { token: adminToken }
    );
    assert.equal(notificationList.items.some((item) => item.notificationId === adminNotification.notificationId), true);
    assert.equal(notificationList.items.some((item) => item.notificationId === approverNotification.notificationId), false);
    assert.equal(notificationList.summary.totalCount, 1);
    assert.equal(notificationList.summary.unreadCount, 1);
    assert.equal(notificationList.summary.countsByPriority.high, 1);
    assert.deepEqual(notificationList.summary.groups, [
      {
        categoryCode: "REVIEW_DUE",
        totalCount: 1,
        unreadCount: 1,
        countsByPriority: {
          low: 0,
          medium: 0,
          high: 1,
          critical: 0
        }
      }
    ]);

    const notificationDetail = await requestJson(
      baseUrl,
      `/v1/notifications/${adminNotification.notificationId}?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(notificationDetail.notificationId, adminNotification.notificationId);
    assert.equal(notificationDetail.deliveries.length, 1);
    assert.equal(notificationDetail.actions.length, 0);

    const teamNotificationDetail = await requestJson(
      baseUrl,
      `/v1/notifications/${financeTeamNotification.notificationId}?companyId=${DEMO_IDS.companyId}`,
      { token: approverToken }
    );
    assert.equal(teamNotificationDetail.notificationId, financeTeamNotification.notificationId);
    assert.equal(teamNotificationDetail.recipientType, "team");

    const approverOwnInbox = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}`,
      { token: approverToken }
    );
    assert.equal(approverOwnInbox.items.some((item) => item.notificationId === approverNotification.notificationId), true);
    assert.equal(approverOwnInbox.items.some((item) => item.notificationId === financeTeamNotification.notificationId), true);
    assert.equal(approverOwnInbox.items.some((item) => item.notificationId === adminNotification.notificationId), false);

    const adminCombinedInbox = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(adminCombinedInbox.items.some((item) => item.notificationId === adminNotification.notificationId), true);
    assert.equal(adminCombinedInbox.items.some((item) => item.notificationId === financeTeamNotification.notificationId), true);
    assert.equal(adminCombinedInbox.items.some((item) => item.notificationId === approverNotification.notificationId), false);
    assert.equal(adminCombinedInbox.summary.totalCount, 2);
    assert.equal(adminCombinedInbox.summary.unreadCount, 2);

    const adminTeamInbox = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}&recipientType=team&recipientId=${DEMO_TEAM_IDS.financeOps}`,
      { token: adminToken }
    );
    assert.equal(adminTeamInbox.items.length, 1);
    assert.equal(adminTeamInbox.items[0].notificationId, financeTeamNotification.notificationId);

    const approverCrossUserInbox = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}&recipientType=user&recipientId=${DEMO_IDS.userId}`,
      {
        token: approverToken,
        expectedStatus: 403
      }
    );
    assert.equal(approverCrossUserInbox.error, "notification_recipient_scope_forbidden");

    const approverCrossUserDetail = await requestJson(
      baseUrl,
      `/v1/notifications/${adminNotification.notificationId}?companyId=${DEMO_IDS.companyId}`,
      {
        token: approverToken,
        expectedStatus: 403
      }
    );
    assert.equal(approverCrossUserDetail.error, "notification_recipient_scope_forbidden");

    const approverCrossTeamInbox = await requestJson(
      baseUrl,
      `/v1/notifications?companyId=${DEMO_IDS.companyId}&recipientType=team&recipientId=${DEMO_TEAM_IDS.payrollOps}`,
      {
        token: approverToken,
        expectedStatus: 403
      }
    );
    assert.equal(approverCrossTeamInbox.error, "notification_recipient_scope_forbidden");

    const read = await requestJson(baseUrl, `/v1/notifications/${adminNotification.notificationId}/read`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(read.status, "read");

    const bulkRead = await requestJson(baseUrl, "/v1/notifications/bulk-actions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId,
        actionCode: "read",
        notificationIds: [adminNotification.notificationId, adminNotification.notificationId]
      }
    });
    assert.equal(bulkRead.actionCode, "read");
    assert.equal(bulkRead.totalCount, 1);
    assert.equal(bulkRead.items.length, 1);
    assert.equal(bulkRead.items[0].notificationId, adminNotification.notificationId);

    const approverCannotMutateAdminNotification = await requestJson(
      baseUrl,
      `/v1/notifications/${adminNotification.notificationId}/ack`,
      {
        method: "POST",
        token: approverToken,
        expectedStatus: 403,
        body: {
          companyId: DEMO_IDS.companyId
        }
      }
    );
    assert.equal(approverCannotMutateAdminNotification.error, "notification_recipient_scope_forbidden");

    const approverCannotBulkMutateAdminNotification = await requestJson(baseUrl, "/v1/notifications/bulk-actions", {
      method: "POST",
      token: approverToken,
      expectedStatus: 403,
      body: {
        companyId: DEMO_IDS.companyId,
        actionCode: "acknowledge",
        notificationIds: [adminNotification.notificationId, approverNotification.notificationId]
      }
    });
    assert.equal(approverCannotBulkMutateAdminNotification.error, "notification_recipient_scope_forbidden");

    const approverNotificationStillUnread = await requestJson(
      baseUrl,
      `/v1/notifications/${approverNotification.notificationId}?companyId=${DEMO_IDS.companyId}`,
      { token: approverToken }
    );
    assert.equal(approverNotificationStillUnread.status, "delivered");

    const acknowledged = await requestJson(baseUrl, `/v1/notifications/${approverNotification.notificationId}/acknowledge`, {
      method: "POST",
      token: approverToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(acknowledged.status, "acknowledged");

    const acknowledgedTeam = await requestJson(baseUrl, `/v1/notifications/${financeTeamNotification.notificationId}/ack`, {
      method: "POST",
      token: adminToken,
      expectedStatus: 200,
      body: {
        companyId: DEMO_IDS.companyId
      }
    });
    assert.equal(acknowledgedTeam.status, "acknowledged");

    const retried = await requestJson(
      baseUrl,
      `/v1/backoffice/notifications/${approverNotification.notificationId}/retry-delivery`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId
        }
      }
    );
    assert.equal(retried.status, "queued");
    assert.equal(retried.deliveries.length, 2);
    assert.equal(retried.deliveries[1].status, "queued");

    const activity = await requestJson(
      baseUrl,
      `/v1/activity?companyId=${DEMO_IDS.companyId}&objectType=review_item&objectId=review_api_1`,
      { token: adminToken }
    );
    assert.equal(activity.items.length, 1);
    assert.equal(activity.items[0].summary, "Review item created for API integration test.");
    const activityObjectRoute = await requestJson(
      baseUrl,
      `/v1/activity/object/review_item/review_api_1?companyId=${DEMO_IDS.companyId}`,
      { token: adminToken }
    );
    assert.equal(activityObjectRoute.items.length, 1);
    assert.equal(activityObjectRoute.items[0].summary, "Review item created for API integration test.");

    const pagedActivityFirst = await requestJson(
      baseUrl,
      `/v1/activity?companyId=${DEMO_IDS.companyId}&objectType=review_item&objectId=review_api_paged&limit=1`,
      { token: adminToken }
    );
    assert.equal(pagedActivityFirst.items.length, 1);
    assert.equal(pagedActivityFirst.items[0].summary, "Newer paged activity.");
    assert.equal(typeof pagedActivityFirst.nextCursor, "string");

    const pagedActivitySecond = await requestJson(
      baseUrl,
      `/v1/activity?companyId=${DEMO_IDS.companyId}&objectType=review_item&objectId=review_api_paged&limit=1&cursor=${encodeURIComponent(pagedActivityFirst.nextCursor)}`,
      { token: adminToken }
    );
    assert.equal(pagedActivitySecond.items.length, 1);
    assert.equal(pagedActivitySecond.items[0].summary, "Older paged activity.");
    assert.equal(pagedActivitySecond.nextCursor, null);
  } finally {
    await stopServer(server);
  }
});

test("Team-scoped saved views are visible to active team members but not unrelated operational teams", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-25T08:00:00Z")
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

    await requestJson(
      baseUrl,
      `/v1/org/companies/${DEMO_IDS.companyId}/users`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          email: "payroll-admin@example.test",
          displayName: "Payroll Admin",
          roleCode: "payroll_admin"
        }
      }
    );

    const approverToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_APPROVER_EMAIL
    });
    const payrollAdminToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "payroll-admin@example.test"
    });

    const createdSavedView = await requestJson(baseUrl, "/v1/saved-views", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        surfaceCode: "desktop_reporting",
        title: "Finance close queue",
        queryJson: {
          projectionCode: "reporting.report_definition"
        }
      }
    });

    const sharedSavedView = await requestJson(
      baseUrl,
      `/v1/saved-views/${createdSavedView.savedViewId}/share`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 200,
        body: {
          companyId: DEMO_IDS.companyId,
          visibilityCode: "team",
          sharedWithTeamId: DEMO_TEAM_IDS.financeOps
        }
      }
    );
    assert.equal(sharedSavedView.visibilityCode, "team");
    assert.equal(sharedSavedView.sharedWithTeamId, DEMO_TEAM_IDS.financeOps);

    const approverViews = await requestJson(
      baseUrl,
      `/v1/saved-views?companyId=${DEMO_IDS.companyId}&surfaceCode=desktop_reporting`,
      { token: approverToken }
    );
    assert.equal(approverViews.items.some((item) => item.savedViewId === createdSavedView.savedViewId), true);

    const payrollAdminViews = await requestJson(
      baseUrl,
      `/v1/saved-views?companyId=${DEMO_IDS.companyId}&surfaceCode=desktop_reporting`,
      { token: payrollAdminToken }
    );
    assert.equal(payrollAdminViews.items.some((item) => item.savedViewId === createdSavedView.savedViewId), false);
  } finally {
    await stopServer(server);
  }
});

test("Step 6.3 activity API trims team, user and backoffice visibility server-side", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-27T09:00:00Z")
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

    await requestJson(
      baseUrl,
      `/v1/org/companies/${DEMO_IDS.companyId}/users`,
      {
        method: "POST",
        token: adminToken,
        expectedStatus: 201,
        body: {
          email: "scope-payroll-admin@example.test",
          displayName: "Scope Payroll Admin",
          roleCode: "payroll_admin"
        }
      }
    );

    const payrollAdminToken = await loginWithTotpOnly({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: "scope-payroll-admin@example.test"
    });

    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_scope_api_1",
      activityType: "review_item_created",
      actorType: "system",
      actorSnapshot: { actorId: "system" },
      summary: "Company-visible entry.",
      occurredAt: "2026-03-27T08:00:00Z",
      sourceEventId: "scope_api_company",
      visibilityScope: "company",
      actorId: DEMO_IDS.userId
    });
    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_scope_api_1",
      activityType: "review_item_team_flagged",
      actorType: "user",
      actorSnapshot: { userId: DEMO_IDS.userId },
      summary: "Finance-team entry.",
      occurredAt: "2026-03-27T08:01:00Z",
      sourceEventId: "scope_api_team",
      visibilityScope: "team",
      visibilityTeamId: DEMO_TEAM_IDS.financeOps,
      actorId: DEMO_IDS.userId
    });
    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_scope_api_1",
      activityType: "review_item_private_note",
      actorType: "user",
      actorSnapshot: { userId: DEMO_IDS.userId },
      summary: "Admin-only entry.",
      occurredAt: "2026-03-27T08:02:00Z",
      sourceEventId: "scope_api_user",
      visibilityScope: "user",
      visibilityUserId: DEMO_IDS.userId,
      actorId: DEMO_IDS.userId
    });
    platform.projectActivityEntry({
      companyId: DEMO_IDS.companyId,
      objectType: "review_item",
      objectId: "review_scope_api_1",
      activityType: "review_item_backoffice_flagged",
      actorType: "system",
      actorSnapshot: { actorId: "system" },
      summary: "Backoffice-only entry.",
      occurredAt: "2026-03-27T08:03:00Z",
      sourceEventId: "scope_api_backoffice",
      visibilityScope: "backoffice",
      actorId: DEMO_IDS.userId
    });

    const adminActivity = await requestJson(
      baseUrl,
      `/v1/activity?companyId=${DEMO_IDS.companyId}&objectType=review_item&objectId=review_scope_api_1`,
      { token: adminToken }
    );
    assert.deepEqual(
      adminActivity.items.map((item) => item.activityType).sort(),
      [
        "REVIEW_ITEM_BACKOFFICE_FLAGGED",
        "REVIEW_ITEM_CREATED",
        "REVIEW_ITEM_PRIVATE_NOTE",
        "REVIEW_ITEM_TEAM_FLAGGED"
      ]
    );

    const payrollActivity = await requestJson(
      baseUrl,
      `/v1/activity?companyId=${DEMO_IDS.companyId}&objectType=review_item&objectId=review_scope_api_1`,
      { token: payrollAdminToken }
    );
    assert.deepEqual(
      payrollActivity.items.map((item) => item.activityType).sort(),
      ["REVIEW_ITEM_CREATED"]
    );
  } finally {
    await stopServer(server);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationsEngine } from "../../packages/domain-notifications/src/index.mjs";
import { createActivityEngine } from "../../packages/domain-activity/src/index.mjs";

test("Step 13 notifications deduplicate active items and track delivery and user actions", () => {
  const notifications = createNotificationsEngine({
    clock: () => new Date("2026-03-24T15:00:00Z")
  });
  const companyId = "company_notify_1";

  const notification = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_1",
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review_1",
    title: "Review item waiting",
    body: "A review item requires your attention.",
    actorId: "system"
  });
  const duplicate = notifications.createNotification({
    companyId,
    recipientType: "user",
    recipientId: "user_1",
    categoryCode: "review_due",
    priorityCode: "high",
    sourceDomainCode: "REVIEW_CENTER",
    sourceObjectType: "review_item",
    sourceObjectId: "review_1",
    title: "Duplicate",
    body: "Should not create a second active notification.",
    actorId: "system"
  });
  assert.equal(duplicate.notificationId, notification.notificationId);

  const delivered = notifications.deliverNotification({
    companyId,
    notificationId: notification.notificationId,
    channelCode: "in_app",
    actorId: "system"
  });
  assert.equal(delivered.status, "delivered");

  const read = notifications.markNotificationRead({
    companyId,
    notificationId: notification.notificationId,
    actorId: "user_1"
  });
  assert.equal(read.status, "read");

  const acknowledged = notifications.acknowledgeNotification({
    companyId,
    notificationId: notification.notificationId,
    actorId: "user_1"
  });
  assert.equal(acknowledged.status, "acknowledged");
  assert.equal(acknowledged.actions.length, 2);

  const queued = notifications.createNotification({
    companyId,
    recipientType: "team",
    recipientId: "finance_ops",
    categoryCode: "deadline_warning",
    priorityCode: "medium",
    sourceDomainCode: "CORE",
    sourceObjectType: "work_item",
    sourceObjectId: "work_1",
    title: "Deadline warning",
    body: "Work item will be overdue soon.",
    actorId: "system"
  });
  const failedDelivery = notifications.deliverNotification({
    companyId,
    notificationId: queued.notificationId,
    channelCode: "email",
    status: "failed",
    failureReasonCode: "smtp_unreachable",
    actorId: "system"
  });
  assert.equal(failedDelivery.status, "queued");

  const snoozed = notifications.snoozeNotification({
    companyId,
    notificationId: queued.notificationId,
    until: "2026-03-24T18:00:00Z",
    actorId: "user_2"
  });
  assert.equal(snoozed.status, "snoozed");
});

test("Step 13 activity projects append-only entries and hides by policy without duplicates", () => {
  const activity = createActivityEngine({
    clock: () => new Date("2026-03-24T15:30:00Z")
  });
  const companyId = "company_activity_1";

  const entry = activity.projectActivityEntry({
    companyId,
    objectType: "review_item",
    objectId: "review_1",
    activityType: "review_item_decided",
    actorType: "user",
    actorSnapshot: { userId: "user_1" },
    summary: "Review item approved.",
    sourceEventId: "evt_1",
    visibilityScope: "company",
    relatedObjects: [
      {
        relatedObjectType: "document",
        relatedObjectId: "doc_1",
        relationCode: "primary_document"
      }
    ],
    actorId: "system"
  });
  const duplicate = activity.projectActivityEntry({
    companyId,
    objectType: "review_item",
    objectId: "review_1",
    activityType: "review_item_decided",
    actorType: "user",
    actorSnapshot: { userId: "user_1" },
    summary: "Duplicate should dedupe.",
    sourceEventId: "evt_1",
    visibilityScope: "company",
    actorId: "system"
  });
  assert.equal(duplicate.activityEntryId, entry.activityEntryId);

  const list = activity.listActivityEntries({
    companyId,
    relatedObjectType: "document",
    relatedObjectId: "doc_1"
  });
  assert.equal(list.length, 1);

  const hidden = activity.hideActivityEntryByPolicy({
    companyId,
    activityEntryId: entry.activityEntryId,
    reasonCode: "sensitive_actor_hidden",
    actorId: "backoffice_1"
  });
  assert.equal(hidden.status, "hidden_by_policy");
});

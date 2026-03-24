export type NotificationStatus = "created" | "queued" | "delivered" | "read" | "acknowledged" | "snoozed" | "expired" | "cancelled";
export type NotificationRecipientType = "user" | "team";
export type NotificationPriorityCode = "low" | "medium" | "high" | "critical";
export type NotificationChannelCode = "in_app" | "email" | "push";

export interface Notification {
  readonly notificationId: string;
  readonly companyId: string;
  readonly recipientType: NotificationRecipientType;
  readonly recipientId: string;
  readonly categoryCode: string;
  readonly priorityCode: NotificationPriorityCode;
  readonly sourceDomainCode: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly title: string;
  readonly body: string;
  readonly status: NotificationStatus;
  readonly createdAt: string;
  readonly expiresAt: string | null;
}

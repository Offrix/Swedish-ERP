export type NotificationStatus = "created" | "queued" | "delivered" | "read" | "acknowledged" | "snoozed" | "expired" | "cancelled";
export type NotificationRecipientType = "user" | "team";
export type NotificationPriorityCode = "low" | "medium" | "high" | "critical";
export type NotificationChannelCode = "in_app" | "email" | "push";
export type NotificationBulkActionCode = "read" | "acknowledge";
export type NotificationDigestStatus = "built" | "superseded";
export type NotificationEscalationStatus = "open" | "superseded";

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

export interface NotificationInboxCategoryGroup {
  readonly categoryCode: string;
  readonly totalCount: number;
  readonly unreadCount: number;
  readonly countsByPriority: Record<NotificationPriorityCode, number>;
}

export interface NotificationInboxSummary {
  readonly totalCount: number;
  readonly unreadCount: number;
  readonly countsByStatus: Record<NotificationStatus, number>;
  readonly countsByPriority: Record<NotificationPriorityCode, number>;
  readonly groups: readonly NotificationInboxCategoryGroup[];
}

export interface NotificationBulkActionResult {
  readonly actionCode: NotificationBulkActionCode;
  readonly totalCount: number;
  readonly items: readonly Notification[];
}

export interface NotificationDigest {
  readonly notificationDigestId: string;
  readonly companyId: string;
  readonly recipientType: NotificationRecipientType;
  readonly recipientId: string;
  readonly channelCode: NotificationChannelCode;
  readonly categoryCode: string | null;
  readonly onlyUnread: boolean;
  readonly generatedAt: string;
  readonly totalCount: number;
  readonly unreadCount: number;
  readonly countsByPriority: Record<NotificationPriorityCode, number>;
  readonly notificationIds: readonly string[];
  readonly status: NotificationDigestStatus;
}

export interface NotificationEscalation {
  readonly notificationEscalationId: string;
  readonly notificationId: string;
  readonly companyId: string;
  readonly recipientType: NotificationRecipientType;
  readonly recipientId: string;
  readonly priorityCode: NotificationPriorityCode;
  readonly categoryCode: string;
  readonly escalationPolicyCode: string;
  readonly thresholdMinutes: number;
  readonly breachLevel: number;
  readonly recurringBreach: boolean;
  readonly status: NotificationEscalationStatus;
  readonly triggeredAt: string;
}

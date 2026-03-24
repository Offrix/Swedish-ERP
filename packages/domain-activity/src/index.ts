export type ActivityEntryStatus = "projected" | "visible" | "hidden_by_policy";
export type ActivityVisibilityScope = "user" | "team" | "company" | "backoffice";

export interface ActivityEntry {
  readonly activityEntryId: string;
  readonly companyId: string;
  readonly objectType: string;
  readonly objectId: string;
  readonly activityType: string;
  readonly actorType: string;
  readonly summary: string;
  readonly occurredAt: string;
  readonly sourceEventId: string;
  readonly visibilityScope: ActivityVisibilityScope;
  readonly status: ActivityEntryStatus;
}

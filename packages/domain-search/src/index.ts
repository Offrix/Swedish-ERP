export type SearchDocumentStatus = "indexed" | "stale" | "tombstoned" | "purged";
export type SearchReindexStatus = "requested" | "running" | "completed" | "failed" | "cancelled";
export type SearchVisibilityScope = "company" | "private" | "team" | "backoffice";
export type SavedViewStatus = "active" | "broken" | "archived";
export type SavedViewVisibilityCode = "private" | "team" | "company";
export type DashboardWidgetStatus = "active" | "degraded" | "archived";

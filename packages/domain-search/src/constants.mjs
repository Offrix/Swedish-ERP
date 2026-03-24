export const SEARCH_DOCUMENT_STATUSES = Object.freeze(["indexed", "stale", "tombstoned", "purged"]);
export const SEARCH_REINDEX_STATUSES = Object.freeze(["requested", "running", "completed", "failed", "cancelled"]);
export const SEARCH_VISIBILITY_SCOPES = Object.freeze(["company", "private", "team", "backoffice"]);
export const SAVED_VIEW_STATUSES = Object.freeze(["active", "broken", "archived"]);
export const SAVED_VIEW_VISIBILITY_CODES = Object.freeze(["private", "team", "company"]);
export const DASHBOARD_WIDGET_STATUSES = Object.freeze(["active", "degraded", "archived"]);
export const DASHBOARD_WIDGET_TYPE_CODES = Object.freeze([
  "saved_view_results",
  "metric_strip",
  "stale_projection_alerts",
  "recent_exports",
  "reconciliation_attention"
]);

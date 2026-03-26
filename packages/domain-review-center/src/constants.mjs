export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const REVIEW_QUEUE_STATUSES = Object.freeze(["active", "disabled"]);
export const REVIEW_QUEUE_PRIORITIES = Object.freeze(["low", "medium", "high", "critical"]);
export const REVIEW_ITEM_STATUSES = Object.freeze([
  "open",
  "claimed",
  "in_review",
  "waiting_input",
  "approved",
  "rejected",
  "escalated",
  "closed"
]);
export const REVIEW_ACTIVE_ITEM_STATUSES = Object.freeze(["open", "claimed", "in_review", "waiting_input", "escalated"]);
export const REVIEW_DECISION_CODES = Object.freeze(["approve", "reject", "escalate"]);
export const REVIEW_RISK_CLASSES = Object.freeze(["low", "medium", "high", "critical"]);
export const REVIEW_ESCALATION_KINDS = Object.freeze(["sla_breach", "recurring_sla_breach"]);
export const REVIEW_REQUIRED_DECISION_TYPES = Object.freeze([
  "classification",
  "vat_treatment",
  "payroll_treatment",
  "tax_reconciliation",
  "hus_outcome",
  "generic_review"
]);
export const REVIEW_CENTER_RULEPACK_CODE = "RP-REVIEW-CENTER-SE";
export const REVIEW_CENTER_RULEPACK_VERSION = "se-review-center-2026.1";

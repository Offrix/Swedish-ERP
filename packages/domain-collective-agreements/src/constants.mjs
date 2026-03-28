export const AGREEMENT_FAMILY_STATUSES = Object.freeze(["active", "inactive"]);
export const AGREEMENT_VERSION_STATUSES = Object.freeze(["draft", "approved", "active", "historical", "retired"]);
export const AGREEMENT_ASSIGNMENT_STATUSES = Object.freeze(["planned", "active", "historical"]);
export const AGREEMENT_CATALOG_ENTRY_STATUSES = Object.freeze(["draft", "verified", "published", "superseded", "retired"]);
export const AGREEMENT_INTAKE_CASE_STATUSES = Object.freeze([
  "received",
  "extraction_in_progress",
  "review_pending",
  "approved_for_publication",
  "approved_for_local_supplement",
  "rejected"
]);
export const LOCAL_AGREEMENT_SUPPLEMENT_STATUSES = Object.freeze(["draft", "review_pending", "approved", "superseded", "retired"]);
export const AGREEMENT_OVERRIDE_TYPE_CODES = Object.freeze([
  "pay_rule",
  "balance_rule",
  "time_rule",
  "rounding_rule",
  "generic"
]);
export const AGREEMENT_RULEPACK_CODE = "TENANT-COLLECTIVE-AGREEMENT";

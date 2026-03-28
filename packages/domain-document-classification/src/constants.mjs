export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const CLASSIFICATION_CASE_STATUSES = Object.freeze([
  "ingested",
  "suggested",
  "under_review",
  "approved",
  "dispatched",
  "corrected",
  "closed"
]);

export const TREATMENT_INTENT_STATUSES = Object.freeze([
  "draft",
  "approved",
  "dispatched",
  "realized",
  "reversed",
  "failed"
]);

export const TREATMENT_LINE_TYPES = Object.freeze([
  "document_total",
  "document_line",
  "manual_split"
]);

export const TREATMENT_CODES = Object.freeze([
  "COMPANY_COST",
  "PRIVATE_RECEIVABLE",
  "REIMBURSABLE_OUTLAY",
  "TAXABLE_BENEFIT",
  "NET_SALARY_DEDUCTION",
  "WELLNESS_ALLOWANCE",
  "ASSET_CANDIDATE",
  "IMPORT_CANDIDATE",
  "UNKNOWN"
]);

export const TREATMENT_SCENARIO_CODES = Object.freeze([
  "company_cost",
  "private_spend",
  "reimbursable_outlay",
  "taxable_benefit",
  "net_salary_deduction",
  "wellness",
  "asset_candidate",
  "import_candidate",
  "unknown"
]);

export const TREATMENT_TARGET_DOMAINS = Object.freeze([
  "AP",
  "AR",
  "BENEFITS",
  "PAYROLL",
  "TRAVEL",
  "REVIEW_CENTER"
]);

export const PERSON_RELATION_CODES = Object.freeze([
  "employee",
  "owner",
  "cardholder",
  "beneficiary"
]);

export const CLASSIFICATION_REVIEW_RISK_CLASSES = Object.freeze([
  "low",
  "medium",
  "high",
  "critical"
]);

export const CLASSIFICATION_REVIEW_REASON_CODES = Object.freeze([
  "PERSON_LINK_MISSING",
  "PRIVATE_SPEND_REQUIRES_REVIEW",
  "SETTLEMENT_ROUTE_MISSING",
  "WELLNESS_FACTS_MISSING",
  "TRAVEL_FACTS_MISSING",
  "WELLNESS_THRESHOLD_EXCEEDED",
  "TREATMENT_UNKNOWN",
  "ATTACHMENT_HANDOFF_REQUIRED",
  "AR_HANDOFF_REQUIRED",
  "DOCUMENT_TOTAL_SPLIT_MISMATCH",
  "ASSET_REQUIRES_REVIEW",
  "IMPORT_REQUIRES_REVIEW",
  "BENEFIT_CODE_MISSING",
  "PERSON_IMPACT_REQUIRES_REVIEW"
]);

export const DOCUMENT_CLASSIFICATION_RULEPACK_CODE = "SE-DOCUMENT-CLASSIFICATION-BOUNDARIES";
export const DOCUMENT_CLASSIFICATION_RULEPACK_VERSION = "2026.1";

export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const IMPORT_CASE_STATUSES = Object.freeze([
  "opened",
  "collecting_documents",
  "ready_for_review",
  "approved",
  "posted",
  "corrected",
  "closed"
]);

export const IMPORT_CASE_COMPLETENESS_STATUSES = Object.freeze(["collecting", "blocking", "complete"]);

export const IMPORT_CASE_DOCUMENT_ROLE_CODES = Object.freeze([
  "PRIMARY_SUPPLIER_DOCUMENT",
  "CUSTOMS_EVIDENCE",
  "FORWARDER_DOCUMENT",
  "FREIGHT_DOCUMENT",
  "OTHER_SUPPORTING_DOCUMENT"
]);

export const IMPORT_CASE_COMPONENT_TYPES = Object.freeze([
  "GOODS",
  "CUSTOMS_DUTY",
  "IMPORT_VAT",
  "FREIGHT",
  "INSURANCE",
  "SPEDITION",
  "OTHER_STATE_FEE"
]);

export const IMPORT_CASE_VAT_RELEVANCE_CODES = Object.freeze([
  "IMPORT_VAT_BASE",
  "IMPORT_VAT_AMOUNT",
  "OUTSIDE_IMPORT_VAT_BASE"
]);

export const IMPORT_CASE_BLOCKING_REASON_CODES = Object.freeze([
  "PRIMARY_SUPPLIER_DOCUMENT_MISSING",
  "CUSTOMS_EVIDENCE_MISSING"
]);

export const IMPORT_CASE_RULEPACK_CODE = "RP-IMPORT-CASE-SE";
export const IMPORT_CASE_RULEPACK_VERSION = "2026.1";
export const IMPORT_CASE_REVIEW_QUEUE_CODE = "VAT_REVIEW";
export const IMPORT_CASE_REVIEW_DECISION_TYPE = "vat_treatment";

export const EU_COUNTRY_CODES = Object.freeze([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);

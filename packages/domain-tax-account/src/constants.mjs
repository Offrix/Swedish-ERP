export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export const TAX_ACCOUNT_EVENT_EFFECT_DIRECTIONS = Object.freeze(["credit", "debit"]);
export const TAX_ACCOUNT_EVENT_MAPPING_STATUSES = Object.freeze(["imported", "mapped", "posted_to_ledger", "reconciled", "corrected"]);
export const TAX_ACCOUNT_EVENT_RECONCILIATION_STATUSES = Object.freeze(["imported", "unmatched", "partially_matched", "matched", "closed"]);
export const TAX_ACCOUNT_DIFFERENCE_CASE_STATUSES = Object.freeze(["open", "under_review", "resolved", "escalated", "closed"]);
export const TAX_ACCOUNT_RECONCILIATION_ITEM_STATUSES = Object.freeze(["open", "assessment_matched", "partially_offset", "settled"]);
export const TAX_ACCOUNT_OFFSET_STATUSES = Object.freeze(["approved"]);
export const TAX_ACCOUNT_EVENT_TYPES = Object.freeze([
  "PAYMENT",
  "VAT_ASSESSMENT",
  "AGI_ASSESSMENT",
  "F_TAX_ASSESSMENT",
  "HUS_ASSESSMENT",
  "INTEREST_INCOME",
  "INTEREST_COST",
  "FEE",
  "REFUND",
  "MANUAL_ADJUSTMENT"
]);
export const TAX_ACCOUNT_LIABILITY_TYPES = Object.freeze(["VAT", "AGI", "F_TAX", "HUS", "INTEREST", "FEE", "OTHER"]);

export const TAX_ACCOUNT_RULEPACK_CODE = "RP-TAX-ACCOUNT-MAPPING-SE";
export const TAX_ACCOUNT_OFFSET_RULEPACK_CODE = "RP-TAX-ACCOUNT-OFFSET-SE";
export const TAX_ACCOUNT_RULEPACK_VERSION = "se-tax-account-2026.1";

export const ASSESSMENT_EVENT_TYPES = new Set(["VAT_ASSESSMENT", "AGI_ASSESSMENT", "F_TAX_ASSESSMENT", "HUS_ASSESSMENT", "INTEREST_COST", "FEE"]);
export const CREDIT_EVENT_TYPES = new Set(["PAYMENT", "INTEREST_INCOME"]);
export const EVENT_TYPE_TO_LIABILITY_TYPE = Object.freeze({
  VAT_ASSESSMENT: "VAT",
  AGI_ASSESSMENT: "AGI",
  F_TAX_ASSESSMENT: "F_TAX",
  HUS_ASSESSMENT: "HUS",
  INTEREST_COST: "INTEREST",
  FEE: "FEE"
});
export const LIABILITY_TYPE_PRIORITY = Object.freeze({
  AGI: 1,
  VAT: 2,
  F_TAX: 3,
  HUS: 4,
  INTEREST: 5,
  FEE: 6,
  OTHER: 99
});

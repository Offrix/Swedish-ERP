export type HusCaseState =
  | "draft"
  | "classified"
  | "invoiced"
  | "customer_partially_paid"
  | "customer_paid"
  | "claim_draft"
  | "claim_submitted"
  | "claim_accepted"
  | "claim_partially_accepted"
  | "claim_rejected"
  | "paid_out"
  | "credit_pending"
  | "recovery_pending"
  | "closed";


export const BALANCE_UNIT_CODES = Object.freeze(["days", "hours", "minutes", "sek", "units"]);
export const BALANCE_OWNER_TYPE_CODES = Object.freeze(["company", "employee", "employment"]);
export const BALANCE_ACCOUNT_STATUSES = Object.freeze(["open", "closed"]);
export const BALANCE_TRANSACTION_TYPE_CODES = Object.freeze([
  "baseline",
  "earn",
  "spend",
  "carry_forward_in",
  "carry_forward_out",
  "expire",
  "correction"
]);
export const BALANCE_CARRY_FORWARD_MODE_CODES = Object.freeze(["none", "full", "cap"]);
export const BALANCE_EXPIRY_MODE_CODES = Object.freeze(["none", "rolling_days", "fixed_date"]);

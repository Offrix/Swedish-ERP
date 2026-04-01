# Fas 10.3 Vacation Balances Verification

## Purpose

Verify that balances is the canonical source of truth for vacation days, vacation-year boundaries, carry-forward, expiry and payroll-facing vacation snapshots.

## Preconditions

- `VACATION_PAID_DAYS` and `VACATION_SAVED_DAYS` balance types exist for the company.
- A vacation balance profile exists with:
  - `vacationYearStartMonthDay`
  - `minimumPaidDaysToRetain`
  - `maxSavedDaysPerYear`
- The target employment has open employment-owned vacation balance accounts.

## Verification Steps

1. Seed paid vacation days into the employment-owned `VACATION_PAID_DAYS` account.
2. Seed an older saved-day lot into the employment-owned `VACATION_SAVED_DAYS` account.
3. Read `/v1/balances/vacation-balances` before year close and confirm:
   - `paidDays`
   - `savedDays`
   - `vacationYearStartDate`
   - `vacationYearEndDate`
   - `expiresAt`
4. Run `/v1/balances/vacation-year-closes` on the configured vacation-year end date.
5. Confirm the run item reports:
   - `expiredSavedDays`
   - `carriedPaidDays`
   - `forfeitedPaidDays`
   - `savedDaysAfterClose`
6. Read `/v1/balances/vacation-balances` on the next vacation-year start date and confirm:
   - `paidDays` is closed out for the prior year
   - only saveable days above `minimumPaidDaysToRetain` were carried
   - expired lots are gone
7. Read `/v1/time/employment-base` and confirm `vacationBalance` is present and matches balances truth.
8. Run a final payroll where `remainingVacationSettlementAmount` is supplied without explicit `remainingVacationDays` and confirm payroll derives quantity from `vacationBalance.totalDays`.

## Expected Results

- Vacation balances come from balances, not ad hoc payroll fields.
- Saved-day expiry is idempotent and tied to the vacation-year close.
- Carry-forward never uses days below `minimumPaidDaysToRetain`.
- Time base exposes the same vacation truth that payroll consumes.
- Final pay falls back to balances truth when explicit remaining vacation days are absent.

## Failure Signals

- `employee_id_required` or missing employment lookup when reading vacation balances.
- Carry-forward of all remaining paid days instead of only saveable excess days.
- Saved-day lots surviving past configured expiry.
- Time base missing `vacationBalance`.
- Final pay defaulting to `1` day when balances truth is available.

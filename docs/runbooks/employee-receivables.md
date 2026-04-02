# Employee Receivables

## Purpose

Operate negative-net payroll runs without losing cash/receivable separation, settlement planning, ledger traceability or dual-review control for write-offs.

## Preconditions

- Payroll run is calculated from locked payroll input snapshot and has no blocking payroll exceptions.
- Negative net pay is visible on the payslip as `employeeReceivableAmount` and `cashNetPayAmount = 0`.
- Payroll posting uses employee receivable asset account `1300`; payout batch must never export negative cash.
- Offsets are only allowed through explicit `ReceivableOffsetDecision`.

## Standard flow

1. Calculate payroll run.
2. Review payslip totals for affected employment:
   - `netPay` is negative
   - `cashNetPayAmount` is `0`
   - `employeeReceivableAmount` is positive
3. Approve payroll run.
4. Verify that approval created:
   - one `EmployeeReceivable`
   - one `ReceivableSettlementPlan`
   - payslip linkage to `employeeReceivableId`
5. Create payroll posting.
6. Verify ledger outcome:
   - receivable asset debits `1300`
   - no negative cash payout is created
7. Create payout batch only after posting.
8. Verify the payout batch has:
   - `totalAmount = 0` for purely negative-net runs
   - no payout lines for the affected employment
9. When recovery should happen in a later payroll period, create `ReceivableOffsetDecision`.
10. Recalculate that later payroll run and verify that:
   - a `RECLAIM` line was generated from the offset decision
   - the line credits `1300`
11. Approve the later payroll run and verify:
   - offset decision moved to `executed`
   - receivable moved to `partially_settled` or `settled`
   - settlement plan installment was updated
12. If the remaining receivable must be abandoned, create `ReceivableWriteOffDecision`.
13. Approve the write-off with a different actor.
14. Verify:
   - write-off moved to `approved`
   - receivable moved to `written_off`
   - posting intent preview debits `7790` and credits `1300`

## Validation checklist

- Negative net pay is never clipped to zero inside payroll posting or payout export.
- Payslip keeps `netPay`, `cashNetPayAmount` and `employeeReceivableAmount` distinct.
- Settlement plan starts in `scheduled` and carries forward remaining balance after partial settlement.
- Offset decisions are explicit, period-bound and traceable to pay run line and pay run id.
- Write-off approval requires dual review.
- Approval evidence bundle contains payslip, receivable, settlement plan and executed offset artifacts.

## Failure handling

- If payroll approval fails because receivable state changed after calculation, recalculate the pay run before approving.
- If payout batch contains a line for a purely negative-net payslip, stop and inspect posting/payslip totals before any bank export.
- If an offset amount was scheduled for the wrong period, cancel the pending decision and create a corrected one before payroll approval.
- If write-off was created by the wrong actor, do not bypass dual review; use a second authorized actor.

## Evidence

Keep the following together per receivable chain:

- payslip snapshot from source pay run
- `EmployeeReceivable`
- `ReceivableSettlementPlan`
- `ReceivableOffsetDecision` records and executed pay run ids
- `ReceivableWriteOffDecision` when applicable
- payroll posting journal entry
- payout batch export or zero-payout proof
- approval evidence bundle and pay run events

## Commands and routes

- `GET /v1/payroll/receivables`
- `GET /v1/payroll/receivables/:employeeReceivableId`
- `GET /v1/payroll/receivable-settlement-plans`
- `POST /v1/payroll/receivable-settlement-plans`
- `GET /v1/payroll/receivable-offset-decisions`
- `POST /v1/payroll/receivable-offset-decisions`
- `GET /v1/payroll/receivable-write-offs`
- `POST /v1/payroll/receivable-write-offs`
- `POST /v1/payroll/receivable-write-offs/:receivableWriteOffDecisionId/approve`

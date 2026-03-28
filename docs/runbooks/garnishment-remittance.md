# Garnishment Remittance

## Purpose

Operate Kronofogden payroll garnishment safely from approved decision snapshot through remittance settlement, return and correction without losing audit evidence.

## Preconditions

- Approved `TaxDecisionSnapshot` exists for the affected employment and pay date.
- Approved `GarnishmentDecisionSnapshot` exists for the affected employment and pay date.
- Payroll run is calculated without blocking payroll exceptions.
- Payroll run is approved before remittance instructions are expected to exist.

## Standard flow

1. Create or import `GarnishmentDecisionSnapshot` with:
   - authority case reference
   - household profile
   - protected amount
   - deduction model
   - remittance target
   - evidence reference
2. Approve the snapshot.
   - `manual_override` requires dual review.
3. Calculate payroll run.
4. Verify payslip totals:
   - preliminary tax exists
   - `garnishmentAmount` is non-negative
   - `cashAfterTax` is not below `protectedAmountAmount`
5. Approve payroll run.
6. Verify that one `RemittanceInstruction` exists per affected employment.
7. Export or execute payment order using the remittance instruction payload.
8. Settle, return or correct the remittance instruction as the real payment outcome becomes known.

## Validation checklist

- `GARNISHMENT` pay line posts to ledger account `2720`.
- Remittance instruction status starts as `payment_order_ready`.
- Remittance instruction keeps:
  - protected amount baseline
  - household profile
  - authority case reference
  - source snapshot hash
  - pay run fingerprint
- Settlement writes `paymentOrderReference`.
- Return writes `returnReasonCode`.
- Correction writes correction history with actor and timestamp.

## Failure handling

- If the decision snapshot is missing or not approved, do not approve the payroll run until the decision chain is corrected.
- If remittance target data is wrong, create a corrected decision snapshot or correct the remittance instruction with explicit reason.
- If bank execution fails, mark the instruction as `returned`, investigate, then either correct and resend or replace through a new approved run/correction path.

## Evidence

Keep the following together for each remittance:

- approved decision snapshot
- payslip snapshot
- remittance instruction
- bank/payment order reference
- settlement/return/correction event chain

## Commands and routes

- `GET /v1/payroll/garnishments`
- `POST /v1/payroll/garnishments`
- `POST /v1/payroll/garnishments/:garnishmentDecisionSnapshotId/approve`
- `GET /v1/payroll/garnishment-remittances`
- `GET /v1/payroll/garnishment-remittances/:remittanceInstructionId`
- `POST /v1/payroll/garnishment-remittances/:remittanceInstructionId/settle`
- `POST /v1/payroll/garnishment-remittances/:remittanceInstructionId/return`
- `POST /v1/payroll/garnishment-remittances/:remittanceInstructionId/correct`

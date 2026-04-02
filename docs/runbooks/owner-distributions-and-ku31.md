# Owner Distributions and KU31

## Scope

This runbook covers the regulated owner-distribution chain for Swedish AB in the platform:

- locked annual close and annual-report package proof
- shareholder register snapshot
- free-equity proof
- board proposal and stamma resolution
- dividend liability posting
- payout scheduling and payout posting
- KU31 draft generation
- kupongskatt withholding tracking
- payout reversal with separate correction journal

## Preconditions

- legal form must resolve to `AKTIEBOLAG`
- the accounting year must be hard closed
- an annual-report package must be signed and locked, or an approved interim-balance proof must exist
- shareholder holdings must be snapshotted with evidence
- journal plan accounts must be configured explicitly:
  - equity account in class `2`
  - dividend liability account in class `2`
  - payment account in class `1`
  - kupongskatt authority account in class `2` when foreign recipients are present

## Operating sequence

1. Create or import share classes.
2. Create a shareholder holding snapshot with evidence.
3. Create a free-equity snapshot from:
   - locked annual-report package, or
   - approved interim balance with explicit approval metadata.
4. Propose the dividend decision with:
   - prudence assessment
   - liquidity assessment
   - board evidence
   - explicit journal plan
5. Submit for review.
6. Mark the decision `stamma_ready`.
7. Resolve at stamma with separate approver.
   - The platform posts the liability journal:
     - debit free equity account
     - credit dividend liability account
8. Schedule payout with separate approver.
   - Foreign recipients default to `30 %` kupongskatt unless a lower treaty rate is approved and evidenced.
9. Record payout with separate approver.
   - The platform posts:
     - debit dividend liability
     - credit bank/payment account
     - credit authority liability for withheld kupongskatt when applicable
10. Build KU31 drafts after paid instructions exist.

## Control points

- Reduced kupongskatt below `30 %` is blocked without treaty evidence and separate treaty approval.
- Payout is blocked before stamma resolution.
- Free-equity proof from annual reporting is blocked if the annual version is not signed, locked and hash-complete.
- Reversal creates a separate correction chain; no owner-distribution state is silently overwritten.

## Reporting outputs

- `KU31Draft` is generated only for currently supported recipient profiles that require KU31 in this implementation.
- `KupongskattRecord` tracks withholding rate, treaty evidence, payment due date and paid amount.
- The platform stores audit events for every state transition and regulated action.

## Deadlines

- Platform control-statement deadline field for KU31: `31 January` following the payment year.
- Platform kupongskatt authority payment due date field: `4 months` after the distribution payment date.

## Recovery

- If payout was posted incorrectly, use payout reversal. Do not edit paid instructions or journal references manually.
- If treaty evidence was wrong, reverse payout first, correct the withholding profile and reschedule/repost.
- If annual proof or shareholder snapshot was wrong, create a new corrected decision instead of mutating the original evidence chain.

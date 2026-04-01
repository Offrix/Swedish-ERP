> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: RB-007
- Title: Tax Account Reconciliation
- Status: Binding
- Owner: Finance operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated tax account reconciliation runbook
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - tax account
  - banking
  - close
- Related code areas:
  - `packages/domain-tax-account/*`
  - `packages/domain-banking/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/compliance/se/tax-account-and-offset-engine.md`
  - `docs/domain/tax-account-reconciliation-and-settlement.md`

# Purpose

Beskriva hur skattekontohändelser importeras, matchas, avstäms och stängs inför close.

# When to use

- återkommande skattekontoavstämning
- close
- differensutredning

# Preconditions

- förväntade AGI- och momsförpliktelser är bokförda
- skattekontohändelser för perioden är importerade

# Required roles

- finance operator
- close operator
- tax specialist vid differens

# Inputs

- imported tax account events
- expected liabilities
- bank payment references
- ledger mirror journals for authority-side events and approved offsets

# Step-by-step procedure

1. Kontrollera att alla nya skattekontohändelser är importerade och deduplicerade.
2. Matcha betalningar och debiteringar mot kända AGI-, moms- och övriga skatteskulder.
3. Öppna differensfall för varje unmatched eller partially matched event över toleransgräns.
4. Utred differensfall och dokumentera vald offset eller suspense-hantering.
5. Kontrollera att återstående öppna poster motsvarar verkliga framtida förpliktelser.
6. Markera perioden reconciled först när inga blockerande differenser återstår.

# Ledger mirror rules

- debit-side authority events must mirror into ledger with `journalEntryId`
- standard target account is `1630` for the authority account mirror
- liability-side counter account is normally:
  - VAT -> `2650`
  - AGI -> `2710` unless a more specific liability account is explicitly pinned
  - F-tax -> `2510`
  - HUS -> `2560`
- bank-bridged payment events (`sourceObjectType = bank_statement_event`) must not create duplicate tax-account settlement journals
- standalone payment/refund/manual-credit offsets may create settlement journals when no bank mirror already exists
- manual adjustments that cannot resolve to a deterministic liability account must stay in discrepancy flow until an explicit ledger counter account is chosen

# Verification

- importerat saldo stämmer mot arbetssaldo
- samtliga större händelser är matchade eller har öppet differensfall
- close blocker view är grön eller formellt undantagen
- every mirrored authority event that should hit ledger carries `journalEntryId`
- discrepancy summary includes open case types and pending ledger mirror count

# Retry/replay behavior where relevant

- import kan återköras idempotent
- auto-match kan återköras om regler eller mapping förbättrats

# Rollback/recovery

- felaktig manuell offset återförs genom ny offset reversal, aldrig genom tyst edit

# Incident threshold

obetydliga avrundningsskillnader kan ligga i differenskö; större oklar skattekontodifferens är incident

# Audit and receipts

- import receipt
- matchningsbeslut
- differensärenden
- period close note

# Exit gate

- [ ] perioden är avstämd eller har formellt dokumenterade differenser
- [ ] manuella offsets är auditbara
- [ ] close kan läsa skattekontoläge utan dold manuell logik


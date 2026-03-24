# Master metadata

- Document ID: SE-CMP-009
- Title: Accounting Foundation
- Status: Binding
- Owner: Finance compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/accounting-foundation.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - ledger
  - accounting method
  - fiscal year
  - reporting
  - tax account
- Related code areas:
  - `packages/domain-ledger/*`
  - `packages/domain-accounting-method/*`
  - `packages/domain-fiscal-year/*`
  - `packages/domain-reporting/*`
  - `packages/db/seeds/*`
- Related future documents:
  - `docs/compliance/se/accounting-method-engine.md`
  - `docs/compliance/se/fiscal-year-and-period-engine.md`
  - `docs/compliance/se/tax-account-and-offset-engine.md`

# Purpose

Definiera den bindande redovisningskärnan: ledger-invarianten, verifikationsserier, periodkoppling, correction chain, historik och den seedade kontostrukturen som systemet ska byggas på.

# Scope

Ingår:

- ledger-invarianten
- verifikationer och serier
- period- och year-referenser
- correction chain
- opening balance och historisk import
- tax-account- och method/fiscal-year-referenser

Ingår inte:

- full moms- eller löneberäkning
- UI-flöden

# Non-negotiable rules

1. Bokföring sker endast genom ledger-domänen.
2. Varje verifikation ska balansera.
3. Ingen historisk bokföringspost får muteras tyst.
4. Låst period får inte ändras utan correction chain eller formell reopen.
5. Alla verifikationer ska peka på relevant fiscal year, period och där relevant method profile.
6. Verifikationsserier ska vara konfigurerbara per tenant men kontrollerade av policy.
7. Skattekontohändelser ska speglas genom explicit mapping, inte ad hoc.

# Definitions

- `Journal`
- `Voucher`
- `Voucher series`
- `Ledger posting`
- `Correction chain`
- `Opening balance`
- `Historical import`

# Object model

## LedgerJournal

Fält:

- `ledger_journal_id`
- `journal_type`
- `voucher_series_code`
- `voucher_no`
- `posting_date`
- `fiscal_year_id`
- `period_id`
- `accounting_method_profile_id`
- `status`

## LedgerPosting

Fält:

- `ledger_posting_id`
- `ledger_journal_id`
- `account_id`
- `debit_amount`
- `credit_amount`
- `currency`
- `source_object_ref`

## LedgerCorrectionLink

Fält:

- `ledger_correction_link_id`
- `original_journal_id`
- `correcting_journal_id`
- `correction_type`

# Required fields

- voucher series
- voucher number
- posting date
- fiscal year
- period
- balanced total
- source reference

# State machines

## LedgerJournal

- `draft`
- `validated`
- `posted`
- `reversed`
- `historical_import`

# Validation rules

1. Debet och kredit måste balansera per journal.
2. Voucher number måste vara unikt inom serie och tenant.
3. Journal får inte posta till stängd eller otillåten period.
4. Historical import får inte blandas ihop med ny löpande bokföring utan tydlig journaltyp.
5. Voucher series ska följa tenantens policy och tillåten serieanvändning.

# Deterministic decision rules

## Rule AF-001: Ledger exclusivity

All bokföringspåverkan från andra domäner ska gå genom ledger application service och skapa journal med fulla referenser.

## Rule AF-002: Series governance

Serier ska vara tenant-konfigurerbara men styrda av policy. Importerade historiska serier får bevaras när migrering kräver det.

## Rule AF-003: Period binding

Varje journal ska bindas till den fiscal-year- och periodkalender som var giltig för bokföringsdatumet.

## Rule AF-004: Correction

Rättelse sker genom correction chain, reversal eller nytt journalutfall. Ursprunglig journal står kvar.

# Rulepack dependencies

- `RP-ACCOUNTING-METHOD-SE`
- `RP-FISCAL-YEAR-SE`
- `RP-CLOSE-LOCK-SE`
- `RP-TAX-ACCOUNT-MAPPING-SE`

# Posting/accounting impact

Detta dokument är själv grunden för all posting/accounting impact. Alla andra domäner ska mappa hit.

# Review requirements

Review krävs när:

- journal skulle träffa låst period
- serieanvändning bryter mot policy
- historical import inte matchar förväntad diff

# Correction model

- reversal
- correcting journal
- reopen enligt separat policy där correction i senare period inte räcker

# Audit requirements

Audit ska visa:

- source object
- series/no
- period och fiscal year
- method profile where relevant
- correction links

# Golden scenarios covered

- locked period correction
- historical import with preserved series
- tax account mirror posting

# API implications

Kommandon:

- `create_ledger_journal`
- `validate_ledger_journal`
- `post_ledger_journal`
- `reverse_ledger_journal`

Queries:

- `get_ledger_journal`
- `get_ledger_journal_chain`

# Test implications

- balans
- unik serienumrering
- period binding
- correction chains

# Exit gate

- [ ] ledger är enda bokföringssanning
- [ ] period, år och metod är explicita referenser
- [ ] correctionkedjor är append-only och spårbara

# Master metadata

- Document ID: DOM-007
- Title: Tax Account Reconciliation and Settlement
- Status: Binding
- Owner: Finance operations architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated tax-account ops document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - tax account
  - banking
  - close
  - reporting
- Related code areas:
  - `packages/domain-tax-account/*`
  - `packages/domain-banking/*`
  - `packages/domain-reporting/*`
  - `apps/desktop-web/*`
- Related future documents:
  - `docs/compliance/se/tax-account-and-offset-engine.md`
  - `docs/runbooks/tax-account-reconciliation.md`

# Purpose

Definiera den operativa domänmodellen för skattekontoavstämning, kvittning, differenshantering och close-koppling.

# Scope

Omfattar:

- skattekontohändelser
- import och matchning
- kvittning mot AGI, moms och andra skatteposter
- differens- och suspense-hantering
- close integrations

Omfattar inte:

- själva myndighetssubmissionen av AGI eller moms
- bankbetalningsexekvering

# Roles

- finance operator
- close operator
- tax specialist
- backoffice operator

# Source of truth

`domain-tax-account` äger skattekontosubledger, matchningsstatus och offsets. `ledger` äger huvudboksposterna och `banking` äger bankhändelser.

# Object model

## TaxAccountEvent

Fält:

- `tax_account_event_id`
- `event_date`
- `event_type_code`
- `external_reference`
- `amount`
- `currency_code`
- `status`
- `source_import_id`

## TaxAccountOffset

Fält:

- `tax_account_offset_id`
- `tax_account_event_id`
- `target_liability_type`
- `target_object_id`
- `offset_amount`
- `status`

## TaxAccountDifferenceCase

Fält:

- `tax_account_difference_case_id`
- `company_id`
- `difference_type_code`
- `gross_difference_amount`
- `status`
- `assigned_to`

# State machines

## TaxAccountEvent

- `imported`
- `matched`
- `partially_matched`
- `unmatched`
- `closed`

## TaxAccountDifferenceCase

- `open`
- `investigating`
- `resolved`
- `escalated`
- `closed`

# Commands

- `import_tax_account_events`
- `match_tax_account_event`
- `create_tax_account_difference_case`
- `approve_tax_account_offset`
- `close_tax_account_period`

# Events

- `tax_account_event_imported`
- `tax_account_event_matched`
- `tax_account_difference_opened`
- `tax_account_offset_approved`

# Cross-domain dependencies

- AGI, VAT och close levererar förväntade skulder och perioder
- banking levererar betalningsspår när skattekontobetalning gjorts via bank
- reporting använder skattekontosubledger i closekontroll

# Forbidden couplings

- banking får inte själv avgöra skattekontooffset
- close får inte mutera tax account events direkt
- UI får inte skapa egna matchningar utan domänkommandon

# Search ownership

Search får indexera skattekontofall och differensfall men tax-account domänen äger matchningsstatus.

# UI ownership

Desktop-web äger operativ avstämningsyta. Backoffice får assistera med replay och importrepair.

# Permissions

- vanlig operator får föreslå matchning
- högre attestklass krävs för manuell offset eller write-down

# Failure and conflict handling

- dubbelimport ska dedupliceras via extern referens och hash
- partiel matchning ska lämna restbelopp öppet
- manuell stängning av differensfall utan bokförd eller dokumenterad lösning är förbjuden

# Notifications/activity/work-item interaction

- unmatched or stale events skapar work items
- större differenser kan skapa high-priority notifications
- activity feed visar import, matchning och close-resolution

# API implications

- import endpoints
- match/unmatch endpoints
- difference-case endpoints
- tax-account period summary endpoints

# Worker/job implications where relevant

- event imports
- auto-match jobs
- nightly reconciliation checks

# Projection/read-model requirements

- open tax-account ledger
- liability-to-offset matrix
- difference aging and close blocker view

# Test implications

- duplicate import
- partial offset
- difference-case lifecycle
- close blocker creation

# Exit gate

- [ ] skattekontosubledger och offsetstatus ägs av egen domän
- [ ] close kan läsa avstämningsläge utan att bära matchningslogik
- [ ] manuell differenshantering är auditerad och policybunden

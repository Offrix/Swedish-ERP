> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-018
- Title: Personalliggare Engine
- Status: Binding
- Owner: Field compliance architecture
- Version: 2.0.0
- Effective from: 2026-03-24
- Supersedes: Prior `docs/compliance/se/personalliggare-engine.md`
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-rulepack-register.md`
- Related domains:
  - personalliggare
  - field
  - mobile
  - HR
- Related code areas:
  - `packages/domain-personalliggare/*`
  - `packages/domain-hr/*`
  - `apps/field-mobile/*`
  - `apps/backoffice/*`
- Related future documents:
  - `docs/domain/personalliggare-industry-packs.md`
  - `docs/policies/personalliggare-correction-policy.md`

# Purpose

Definiera den bindande compliance-motorn för elektronisk personalliggare med byggbranschen som första industry pack.

# Scope

Ingår:

- workplace threshold evaluation
- registration state
- attendance events
- corrections
- kiosk and mobile capture
- control exports

Ingår inte:

- generell tidrapportering
- löneberäkning

# Non-negotiable rules

1. Personalliggare ska behandlas som separat kontrollspår, inte som bieffekt av tidrapportering.
2. När byggarbetsplats omfattas av reglerna ska elektronisk utrustning och registrering vara på plats innan byggverksamheten påbörjas.
3. Byggherrens tröskelbedömning ska baseras på sammanlagd kostnad för byggverksamheten på byggarbetsplatsen; för byggindustry pack ska tröskelregeln stödja mer än fyra prisbasbelopp exklusive moms enligt Skatteverkets modell.
4. Original attendance event får aldrig skrivas över; rättelse ska ske genom correction chain.
5. Saknad eller ogiltig identitet får inte döljas genom efterhandsöverlagring utan ska skapa avvikelse eller blocker.

# Definitions

- `Workplace`: den plats där liggaren förs.
- `Threshold evaluation`: bedömning om utrustnings- och registreringsplikt gäller.
- `Attendance event`: check-in eller check-out för verksam person.
- `Correction event`: append-only rättelse av attendance event.

# Object model

## WorkplaceRegistration

Fält:

- `workplace_registration_id`
- `workplace_id`
- `industry_pack_code`
- `estimated_total_cost_ex_vat`
- `threshold_status`
- `registration_status`
- `equipment_status`

## AttendanceEvent

Fält:

- `attendance_event_id`
- `workplace_id`
- `identity_snapshot_id`
- `event_type`
- `event_timestamp`
- `source_channel`
- `device_id`
- `offline_flag`
- `status`

## AttendanceCorrection

Fält:

- `attendance_correction_id`
- `original_attendance_event_id`
- `correction_reason_code`
- `corrected_by`
- `corrected_at`
- `effective_result_code`

# Required fields

- workplace identity
- threshold data
- person identity snapshot
- employer and contractor snapshot
- event timestamp
- source channel

# State machines

## WorkplaceRegistration

- `draft`
- `threshold_pending`
- `threshold_not_met`
- `registration_required`
- `active`
- `inactive`

## AttendanceEvent

- `captured`
- `synced`
- `corrected`
- `exported`

# Validation rules

1. `registration_required` blockeras inte bort förrän utrustnings- och registreringskraven är uppfyllda.
2. Attendance event utan identity snapshot eller workplace får inte gå till `synced`.
3. Correction kräver originalevent, skälkod och aktör.
4. Offline-synk får inte skapa dubblett vid återanslutning.

# Deterministic decision rules

## Rule PL-001: Threshold

För byggindustry pack ska systemet markera `registration_required` när uppskattad sammanlagd kostnad för byggverksamheten på byggarbetsplatsen överstiger fyra prisbasbelopp exklusive moms enligt aktivt rulepack.

## Rule PL-002: Registration and equipment

När `registration_required` gäller ska workplace inte få gå till operativt aktivt läge utan att registrering och utrustning är dokumenterad.

## Rule PL-003: Attendance capture

Check-in/check-out ska knytas till identity snapshot, arbetsgivare och entreprenör som gällde vid händelsetidpunkten.

## Rule PL-004: Correction

Felaktigt attendance event rättas genom nytt correction event som bevarar originalspåret.

# Rulepack dependencies

- `RP-PERSONALLIGGARE-SE`
- `RP-PERSONALLIGGARE-BYGG-SE`
- `RP-DEVICE-TRUST-SE`

# Review requirements

Review krävs vid:

- oklar workplace threshold
- saknad identitet
- masskorrektion
- kolliderande offlinekö

# Audit requirements

Audit ska visa:

- threshold evaluation
- registration state
- attendance chain
- correction chain
- export history

# Golden scenarios covered

- personalliggare kiosk offline
- multi-contractor workplace
- threshold over rule limit

# API implications

- workplace evaluation commands
- attendance capture commands
- correction commands
- control export queries

# Test implications

- threshold behavior
- offline idempotency
- correction chain
- control report generation

# Exit gate

- [ ] personalliggare följer append-only attendance chain
- [ ] byggindustry pack följer threshold- och registreringskrav
- [ ] kiosk, mobile och export arbetar mot samma compliance-kärna


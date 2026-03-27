> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-012
- Title: Invoice Legal Field Rules Engine
- Status: Binding
- Owner: Finance compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated invoice-field-rules document
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - AR
  - VAT
  - HUS
- Related code areas:
  - `packages/domain-ar/*`
  - `packages/domain-vat/*`
  - `packages/domain-hus/*`
  - `apps/api/*`
- Related future documents:
  - `docs/policies/invoice-issuance-and-credit-policy.md`
  - `docs/compliance/se/ar-customer-invoicing-engine.md`
  - `docs/compliance/se/hus-invoice-and-claim-gates.md`

# Purpose

Definiera den bindande motorn för vilka fakturauppgifter som måste finnas innan en faktura eller ändringsfaktura får utfärdas i olika scenarier.

# Scope

Ingår:

- fullständig faktura
- ändringsfaktura/kreditnota
- scenariobundna tilläggsfält
- valuta- och momsuppgifter
- HUS-relaterade blockerande fält

Ingår inte:

- betalningsmatchning
- kundreskontra
- full HUS-claim-lifecycle

# Non-negotiable rules

1. Fakturan ska ha datum för utfärdande.
2. Fakturan ska ha unikt löpnummer baserat på en eller flera serier.
3. Säljarens identitet och säljarens momsregistreringsnummer ska finnas när momsreglerna kräver det.
4. Köparens identitet ska finnas i de scenarier där det krävs för momsbehandlingen.
5. Varornas eller tjänsternas art/omfattning ska kunna identifieras.
6. Leverans- eller omsättningsdatum ska finnas när det skiljer sig från fakturadatum eller annars krävs.
7. Beskattningsunderlaget per momssats, tillämpad momssats och momsbelopp ska finnas där momspliktigt scenario kräver det.
8. När särskilt momsscenario gäller, till exempel omvänd skattskyldighet eller momsbefriad försäljning, ska särskild uppgift finnas.
9. Ändringsfaktura ska innehålla särskild och otvetydig hänvisning till ursprungsfakturan och dess löpnummer samt vilka uppgifter som har ändrats.
10. Om försäljningen faktureras i annan valuta och momsen ska betalas i Sverige medan redovisningsvalutan är SEK ska momsbeloppet kunna anges i svenska kronor.

# Definitions

- `Invoice scenario`
- `Required field set`
- `Amendment invoice`
- `Scenario blocker`
- `Field rule evaluation`

# Object model

## InvoiceFieldRuleEvaluation

Fält:

- `invoice_field_rule_evaluation_id`
- `invoice_id`
- `scenario_code`
- `rulepack_version`
- `status`
- `blocking_rule_count`

## InvoiceFieldRequirement

Fält:

- `invoice_field_requirement_id`
- `scenario_code`
- `field_code`
- `requirement_level`
- `reason_code`

## InvoiceFieldViolation

Fält:

- `invoice_field_violation_id`
- `invoice_field_rule_evaluation_id`
- `field_code`
- `violation_code`
- `severity`

# Required fields

Basfält som alltid ska kunna krävas:

- issue date
- invoice number
- seller identity
- buyer identity where applicable
- line description
- taxable amount
- VAT rate
- VAT amount
- currency

# State machines

## InvoiceFieldRuleEvaluation

- `draft`
- `calculated`
- `blocked`
- `passed`
- `superseded`

# Validation rules

1. Unikt fakturanummer måste finnas innan issue.
2. Saknat blockerande scenariofält ska stoppa issue.
3. Ändringsfaktura utan klar ursprungsreferens ska blockeras.
4. Valutafaktura utan korrekt momsrepresentation när svensk moms ska redovisas ska blockeras.

# Deterministic decision rules

## Rule IFR-001: Baseline full invoice

Om scenariot kräver fullständig faktura ska motorn minst kräva de uppgifter som identifierar säljare, köpare när relevant, leveransen, beskattningsunderlaget, momssatsen och momsbeloppet.

## Rule IFR-002: Amendment invoice

Om dokumenttypen är ändringsfaktura eller kreditnota ska motorn kräva:

- otvetydig hänvisning till ursprungsfakturan
- ursprungsfakturans löpnummer
- vilka uppgifter som ändras

## Rule IFR-003: Special VAT scenario

Om scenariot är omvänd skattskyldighet, momsbefrielse, unionsspecifikt eller annat specialscenario ska särskild text eller särskilda identitetsuppgifter krävas enligt rulepack.

## Rule IFR-004: HUS overlay

Om fakturan avser HUS ska HUS-motorns obligatoriska uppgifter lägga ett extra blockerande lager ovanpå den vanliga fakturaregelmotorn.

# Rulepack dependencies

- `RP-INVOICE-FIELD-RULES-SE`
- `RP-VAT-SE`
- `RP-HUS-SE`

# Posting/accounting impact

- issue blockeras före bokföringspåverkan om lagkravade fält saknas

# VAT impact where relevant

- rätt fakturafält är förutsättning för rätt momshantering och avdragsrätt i flera scenarier

# HUS impact where relevant

- HUS-relaterad faktura måste passera både basregler och HUS overlay

# Review requirements

Review krävs när:

- scenario är oklart
- specialregel träffar men underlaget är motsägelsefullt
- ändringsfaktura saknar säker koppling

# Correction model

- blockerad faktura korrigeras före issue
- redan utställd felaktig faktura rättas genom kredit/ändringskedja enligt policy

# Audit requirements

Audit ska visa:

- scenario code
- rulepack version
- blockerande fält
- beslut att issue eller blockera

# Golden scenarios covered

- standard full invoice
- amendment invoice with reference
- reverse-charge invoice
- HUS invoice gate

# API implications

Kommandon:

- `evaluate_invoice_field_rules`
- `recalculate_invoice_field_rules`
- `approve_invoice_rule_override` where policy permits

Queries:

- `get_invoice_field_evaluation`
- `get_invoice_field_violations`

# Test implications

- standardkrav
- specialscenarier
- ändringsfakturor
- HUS overlay

# Exit gate

- [ ] issue blockeras på saknade lagkravade fält
- [ ] ändringsfakturor kräver korrekt referenskedja
- [ ] specialmoms- och HUS-scenarier kan inte smita förbi


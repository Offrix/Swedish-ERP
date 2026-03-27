> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: SE-CMP-013
- Title: HUS Invoice and Claim Gates
- Status: Binding
- Owner: Finance compliance architecture and HUS operations
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior dedicated HUS gate document
- Approved by: User directive, MCP-001 and MCP-010
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - HUS
  - AR
  - VAT
  - integrations
- Related code areas:
  - `packages/domain-hus/*`
  - `packages/domain-ar/*`
  - `packages/domain-vat/*`
  - `packages/domain-integrations/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/rot-rut-engine.md`
  - `docs/policies/hus-signing-and-submission-policy.md`
  - `docs/runbooks/hus-submission-replay-and-recovery.md`

# Purpose

Detta dokument definierar de blockerande regler som styr HUS-kedjan från faktura till kundbetalning, ansökan, beslut, utbetalning, rättelse och återkrav.

# Scope

Ingår:

- HUS-klassning på rad- eller arbetsmomentsnivå
- fakturagates innan issue
- betalningsgates innan claim
- claim-gates innan submission
- gates för delgodkännande, avslag och recovery
- kundfordrans- och bokföringspåverkan

Ingår inte:

- allmän AR-workbench
- den tekniska submissionmotorn i detalj
- generell quote/order-logik

# Non-negotiable rules

1. HUS får bara beräknas på arbetskostnad.
2. Material, resor, maskinhyra, administration och andra icke arbetskostnader får inte ingå i HUS-underlaget.
3. Kunden måste vara berättigad fysisk person för den bostad eller det hushåll som arbetet avser.
4. Utföraren måste vara godkänd för F-skatt vid den tidpunkt regelpaketet kräver.
5. Ansökan får inte skickas innan arbetet är utfört och kunden har betalat sin del.
6. HUS-faktura måste tydligt visa total arbetskostnad, preliminär skattereduktion och kundens betalningsandel.
7. HUS-fall får inte skickas om köparidentitet, fastighets- eller bostadsuppgifter, arbetsandel eller betalningsbevis saknas.
8. En redan skickad eller beslutad HUS-kedja får inte ändras genom tyst mutation; ändring ska ske via correction chain, ny claim-version eller recovery-flöde.
9. Delgodkännande måste skapa explicit differensobjekt mellan fakturans preliminära avdrag och Skatteverkets utfall.
10. Efter utbetalning ska varje kredit eller reducering som påverkar HUS-beloppet generera recovery-bedömning.

# Definitions

- `HUS case`: det samlade objektet för ett arbete som kan ge rätt till HUS.
- `HUS service line`: rad eller arbetsmoment som bär klassning, arbetsandel och köparfördelning.
- `HUS buyer share`: köparens andel av arbetskostnad och preliminärt avdrag.
- `Claim version`: append-only snapshot av ansökningsunderlag.
- `Recovery candidate`: objekt som uppstår när tidigare utbetalt HUS-belopp inte längre matchar korrekt slutläge.

# Object model

## HusCase

Fält:

- `hus_case_id`
- `company_id`
- `customer_invoice_id`
- `service_type_code`
- `status`
- `performed_from`
- `performed_to`
- `address_snapshot`
- `rulepack_version`
- `claim_eligibility_status`

## HusServiceLine

Fält:

- `hus_service_line_id`
- `hus_case_id`
- `invoice_line_id`
- `classification_code`
- `labor_amount`
- `non_labor_amount`
- `preliminary_reduction_amount`
- `buyer_split_method`
- `status`

## HusBuyerAllocation

Fält:

- `hus_buyer_allocation_id`
- `hus_case_id`
- `buyer_person_id`
- `buyer_personnummer`
- `buyer_share_percent`
- `labor_amount`
- `preliminary_reduction_amount`
- `eligibility_flags`

## HusClaimVersion

Fält:

- `hus_claim_version_id`
- `hus_case_id`
- `version_no`
- `status`
- `payload_hash`
- `submitted_at`
- `submission_id`
- `receipt_id`

## HusRecoveryCandidate

Fält:

- `hus_recovery_candidate_id`
- `hus_case_id`
- `trigger_type`
- `previous_accepted_amount`
- `correct_amount`
- `difference_amount`
- `status`

# Required fields

Följande fält måste finnas innan `claim_ready`:

- kundfaktura med HUS-overlay godkänd
- köparnas identitet
- serviceklassning per rad eller arbetsmoment
- arbetskostnad per rad
- fördelning mellan köpare
- utfört arbetsintervall
- betalningsdatum och betalt belopp från kund
- betalningsbevis eller betalningsreferens
- utförarens F-skatt-status enligt rulepack

# State machines

## HusCase

- `draft`
- `classified`
- `invoice_blocked`
- `invoiced`
- `customer_partially_paid`
- `customer_paid`
- `claim_ready`
- `claim_submitted`
- `claim_partially_accepted`
- `claim_accepted`
- `claim_rejected`
- `recovery_pending`
- `closed`

Tillåtna övergångar:

- `draft -> classified | invoice_blocked`
- `classified -> invoiced`
- `invoiced -> customer_partially_paid | customer_paid`
- `customer_paid -> claim_ready`
- `claim_ready -> claim_submitted`
- `claim_submitted -> claim_accepted | claim_partially_accepted | claim_rejected`
- `claim_accepted | claim_partially_accepted -> recovery_pending | closed`
- `claim_rejected -> closed | recovery_pending`
- `recovery_pending -> closed`

## HusClaimVersion

- `draft`
- `ready`
- `submitted`
- `superseded`
- `decided`

# Validation rules

1. HUS-rad måste ha `labor_amount > 0`; annars får den inte klassas som HUS.
2. Summan av köparnas `buyer_share_percent` måste bli 100 procent för HUS-berättigad arbetsandel.
3. Faktura med HUS-rader får inte utfärdas utan att kundens betalningsdel och preliminär reduktion visas separat.
4. HUS-claim blockeras om fakturan har öppen kredit- eller ändringskedja som påverkar arbetskostnaden.
5. HUS-claim blockeras om kundbetalningen inte täcker kundens del enligt fakturamodellen.
6. Ansökan blockeras om claim-versionens payload inte matchar låst faktura- och betalningssnapshot.
7. Recovery måste öppnas när efterföljande kredit, omfördelning eller myndighetsbeslut gör tidigare claim ekonomiskt felaktig.

# Deterministic decision rules

## Rule HIG-001: Invoice gate

En HUS-faktura får bara nå `issued` om invoice-field-reglerna och HUS-overlay samtidigt passerar.

## Rule HIG-002: Customer payment gate

Ansökan får bara gå vidare när kunden har betalat sin andel elektroniskt i den omfattning rulepack kräver och betalningen är spårbart matchad mot rätt HUS-faktura.

## Rule HIG-003: Claim readiness

`claim_ready` kräver:

- arbetsklassning låst
- köparfördelning låst
- betalning verifierad
- inga öppna blockerande krediter
- inga öppna identitets- eller fastighetsbrister

## Rule HIG-004: Partial acceptance

Om myndighetsutfall understiger ansökt belopp skapas differensobjekt som kräver beslut om efterdebitering, intern kostnadsföring eller manuell korrigering.

## Rule HIG-005: Recovery

Efter utbetalning ska varje nedjustering av arbetskostnad eller köparandel skapa `recovery_candidate`; systemet får inte stänga ärendet innan differensen har bokförts och operativt hanterats.

# Rulepack dependencies

- `RP-HUS-SE`
- `RP-INVOICE-FIELD-RULES-SE`
- `RP-VAT-SE`
- `RP-PAYMENT-EVIDENCE-SE`

# Posting/accounting impact

- HUS-faktura skapar kundfordran på kundens del och HUS-fordran på statlig del enligt produktens HUS-bokföringsmodell.
- Delgodkännande eller avslag skapar omföring mellan HUS-fordran, kundfordran eller intern kostnad beroende på valt utfall.
- Recovery skapar skuld eller negativ fordran mot staten tills reglering skett.

# VAT impact where relevant

- Endast arbetskostnadsdelen som klassas HUS påverkar HUS-beräkningen; momsreglerna för själva fakturaraden ligger kvar i VAT-domänen.
- Kreditnota efter issue ska följa VAT-domänens ändringskedja samtidigt som HUS-recovery bedöms.

# HUS impact where relevant

- Detta dokument är källan för hela claim-lifecyclen.

# Submission/receipt behavior where relevant

- varje claim-version ska ha eget payload-hash
- teknisk kvittens och materiellt beslut ska hållas isär
- replay får aldrig skriva över tidigare receipt chain

# Review requirements

Review krävs när:

- serviceklassning är tvetydig
- köparrelation eller bostadsrelation är oklar
- betalningsbevis saknas eller är motsägelsefullt
- myndighetsbeslut avviker från ansökan

# Correction model

- före issue: justera radklassning eller belopp i draft
- efter issue men före claim: kredit-/ändringskedja plus omräknad claim readiness
- efter claim submission: ny claim-version eller recovery beroende på läge
- efter utbetalning: recovery chain, aldrig silent overwrite

# Audit requirements

Audit ska minst visa:

- serviceklassning per rad
- köparfördelning
- betalningsbevis
- claim-versioner
- kvittenser och beslut
- recovery-beslut och ansvarig aktör

# Golden scenarios covered

- HUS accepted
- HUS partially accepted
- HUS recovery
- invoice blocker for missing mandatory fields

# API implications

Kommandon:

- `classify_hus_case`
- `lock_hus_invoice_gate`
- `register_hus_customer_payment`
- `prepare_hus_claim_version`
- `submit_hus_claim`
- `register_hus_decision`
- `open_hus_recovery`

Queries:

- `get_hus_case`
- `get_hus_claim_versions`
- `get_hus_recovery_candidates`

# Test implications

- blocker tests för saknad arbetskostnad
- customer-payment gate tests
- partial acceptance and recovery tests
- replay tests för claim-versioner

# Exit gate

- [ ] HUS-faktura kan inte utfärdas utan blockerande HUS-gates
- [ ] claim kan inte skickas utan verifierad kundbetalning och komplett payload
- [ ] delgodkännande och recovery skapar tydliga differensobjekt och audit chain


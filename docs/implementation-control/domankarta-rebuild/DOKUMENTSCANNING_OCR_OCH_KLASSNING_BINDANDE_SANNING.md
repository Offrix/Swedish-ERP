# DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela scanning-, OCR-, extraktions-, klassnings-, confidence-, review- och routinglagret.

Detta dokument ska styra:
- dokumentingest
- source-channel capture
- original binary capture
- malware/threat scan
- OCR execution
- AI extraction fallback
- field lineage
- deterministic classification
- AI-assisted classification fallback
- confidence policy
- review-task creation
- downstream routing
- duplicate/provenance controls
- rerun/supersession
- audit/export av scanninglinjen

Ingen kod, inget test, ingen route, ingen migration, ingen provideradapter och ingen runbook får avvika från detta dokument utan att detta dokument skrivs om först.

## Syfte

Scanninglagret är inte bara:
- läsa PDF
- OCR:a text
- skicka vidare ett dokument

Scanninglagret är hela den bindande sanningen för:
- hur ett dokument får tas emot
- hur originalhandlingen måste bevaras
- hur OCR och AI får användas
- när deterministiska regler måste vinna över AI
- när AI får anropas som fallback
- vilka fält AI får föreslå men aldrig hitta på
- hur confidence måste uttryckas
- hur review måste skapas
- hur BAS-kontokandidater bara får hamtas från `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md` och dess bindande phrase-matris, och aldrig hittas på i fri text
- vilken downstream-domän som ska ta över
- hur unknown documents och okanda scenarier måste blockeras

Läsaren ska kunna bygga hela dokumentingestlagret utan att gissa:
- vilka objekt som finns
- hur state machines ser ut
- när OCR får koras
- när AI får koras
- vad som är legal-effect forbidden i scanninglagret
- hur review och routing bestams
- hur replay, rerun och migration ska fungera

## Omfattning

Detta dokument omfattar minst:
- e-postinkorg med bilagor
- portaluppladdning
- mobilfotografering
- API-ingest
- Peppol- och e-faktura-ingest före downstream handoff
- PDF, bild, XML, text och containerformat
- malware/threat scanning
- original binary capture
- OCR provider execution
- OCR rerun
- AI extraction fallback
- AI classification fallback
- deterministic field normalization
- deterministic document-family classification
- deterministic downstream routing
- review-task creation
- duplicate detection över flera kanaler
- import/migration ingest
- provenance och audit lineage

Detta dokument omfattar inte:
- seller-side issue av kundfaktura
- AP-posting
- receipt-posting
- payroll-posting
- benefit valuation
- tax decisions
- HUS decisions
- bankbokning

Kanonisk agarskapsregel:
- scanninglagret äger bara ingest, extraction, classification, confidence, routing och review creation
- scanninglagret får aldrig skapa legal truth i huvudbok, reskontra, momsrapport, AGI eller annan myndighetsrapport
- downstream-domäner äger alltid slutlig legal truth:
  - `FAKTURAFLODET_BINDANDE_SANNING.md`
  - `LEVFAKTURAFLODET_BINDANDE_SANNING.md`
  - `KVITTOFLODET_BINDANDE_SANNING.md`
  - `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`
  - kommande biblar för lön, förmåner, bank, HUS och ändra domäner

## Absoluta principer

- original binary måste alltid bevaras före OCR, AI eller manuell korrigering
- scanninglagret får aldrig skriva över original binary
- OCR får aldrig vara legal truth
- AI får aldrig vara legal truth
- deterministiska regler ska alltid försökas före AI fallback
- AI får bara anropas när deterministiska regler inte rackt eller uttrycklig policy medger fallback
- AI får aldrig hitta på obligatoriska legala fält som saknas i källan
- AI får aldrig overstyra hard blockers
- AI får aldrig autoposta eller direkt issue legal downstream command
- AI får aldrig konvertera ett unknown document till green utan policy- och reviewsteg
- lag confidence får aldrig glida igenom som om den vore verifierad sanning
- samma dokument får aldrig skapa flera parallella sanningsspAr utan supersession chain
- duplicate detection får aldrig ga på bara en hash eller bara ett OCR-resultat
- scanninglagret får aldrig gissa moms, lön, förmånsbeskattning eller AP/ÄR-utslag utan bindande downstream rule support
- om downstream owner inte kan faststallas exakt ska dokumentet blockeras

## Bindande dokumenthierarki för dokumentscanning, OCR och klassning

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- detta dokument

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md` för seller-side invoice profile constraints och OCR-referensdisciplin
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` för AP-required fields och AP-side routing rules
- `KVITTOFLODET_BINDANDE_SANNING.md` för receipt-required fields, downstream owners och blocked unknown policy

Detta dokument får inte overstyras av:
- gamla OCR-providerdocs i repo:t
- gamla heuristiska extraction-regler
- gamla provider manifests
- gamla review center-noteringar
- gamla runbooks för inbox eller OCR

Fas 5, 6, 7, 13, 21, 27 och 28 får inte definiera avvikande scanning truth.

## Kanoniska objekt

- `DocumentAcquisition`
  - bar sanningen om hur dokumentet togs emot
  - innehåller source channel, arrival timestamp, source envelope identity, tenant, actor context och acquisition mode
  - är auditkritisk

- `OriginalBinaryCapture`
  - bar sanningen om originalfilen
  - innehåller hash, mime type, size, storage ref, capture timestamp, capture actor och retention flags
  - är append-only

- `DocumentThreatAssessment`
  - bar malware-, container- och quarantine-bedOmning
  - får blockera vidare behandling

- `DocumentEnvelope`
  - bar logisk wrapper för den mottagna handlingen
  - binder acquisition, original binary, attachments, pages, source channel metadata och binary lineage

- `DocumentFamilyDecision`
  - bar canonical family:
    - supplier_invoice
    - receipt
    - payment_proof
    - bank_statement
    - contract
    - payroll_or_benefit_sensitive
    - unknown

- `OcrExecution`
  - bar OCR-korningens sanningslager
  - innehåller provider profile, model/version baseline, request receipt, callback receipt, raw output ref och execution status

- `ExtractionFieldCandidate`
  - bar ett extraherat fält med:
    - field code
    - raw value
    - normalized value
    - source span
    - page ref
    - confidence
    - producer kind (`deterministic | ocr | ai | human_review`)

- `FieldLineageRecord`
  - bar historiken för ett field candidate across reruns, overrides och review decisions

- `DeterministicClassificationDecision`
  - bar beslut från regelmotor före AI
  - avgor document family, downstream candidate, blockers och whether AI fallback is permitted

- `AiClassificationSuggestion`
  - bar AI:s forslag
  - måste innehålla:
    - suggested family
    - suggested scenario family
    - suggested downstream owner
    - suggested critical fields
    - confidence bundle
    - explanation refs
  - är aldrig legal truth

- `ConfidenceProfile`
  - bar canonical confidence per:
    - document family
    - merchant/supplier identity
    - amount
    - tax fields
    - routing
    - person-impact risk

- `ReviewRequirementDecision`
  - bar bindande svar på fragan om review krävs
  - måste kunna peka på policyversion, confidence threshold och blocker reason

- `DownstreamRoutingDecision`
  - bar bindande beslut om vilken bibel/domän som tar över nasta steg

- `DuplicateDecision`
  - bar duplicate eller near-duplicate-bedOmning över flera källor

- `UnknownDocumentBlock`
  - bar blockerande state när dokumentet inte kan klassas till bindande familj eller owner

- `ClassificationSupersession`
  - binder ihop gammal och ny OCR/AI/review-version utan att skriva över tidigare linje

## Kanoniska state machines

### `DocumentAcquisition`

- `received`
- `binary_captured`
- `threat_scan_pending`
- `clean`
- `quarantined`
- `rejected`
- `closed`

### `OcrExecution`

- `not_required`
- `queued`
- `running`
- `callback_pending`
- `completed`
- `failed`
- `superseded`

### `DeterministicClassificationDecision`

- `pending`
- `resolved`
- `ai_fallback_allowed`
- `blocked`

### `AiClassificationSuggestion`

- `not_requested`
- `requested`
- `completed`
- `rejected`
- `superseded`

### `DownstreamRoutingDecision`

- `pending`
- `resolved`
- `review_required`
- `blocked_unknown`
- `dispatched`

### `ReviewRequirementDecision`

- `not_required`
- `required`
- `escalated`
- `resolved`

### `DuplicateDecision`

- `not_checked`
- `clear`
- `suspected`
- `confirmed`
- `superseded`

## Kanoniska commands

- `RegisterDocumentAcquisition`
- `CaptureOriginalBinary`
- `RecordThreatAssessment`
- `CreateDocumentEnvelope`
- `EvaluateDeterministicFamily`
- `QueueOcrExecution`
- `CompleteOcrExecution`
- `NormalizeExtractedFields`
- `EvaluateDeterministicClassification`
- `RequestAiFallback`
- `RecordAiSuggestion`
- `EvaluateReviewRequirement`
- `DecideDownstreamRouting`
- `ConfirmDuplicateDecision`
- `SupersedeClassificationVersion`
- `BlockUnknownDocument`
- `DispatchToDownstreamOwner`

## Kanoniska events

- `document.acquisition.registered`
- `document.binary.captured`
- `document.threat_assessed`
- `document.envelope.created`
- `document.family.deterministic_resolved`
- `ocr.execution.queued`
- `ocr.execution.completed`
- `ocr.execution.failed`
- `fields.normalized`
- `classification.deterministic.resolved`
- `classification.ai.requested`
- `classification.ai.completed`
- `review.requirement.resolved`
- `routing.decision.resolved`
- `duplicate.decision.confirmed`
- `classification.version.superseded`
- `document.blocked.unknown`
- `document.dispatched.downstream`

## Kanoniska route-familjer

Canonical route families ska vara:
- `/v1/documents/inbox/*`
- `/v1/documents/acquisitions/*`
- `/v1/documents/binaries/*`
- `/v1/documents/threat-scan/*`
- `/v1/documents/ocr/*`
- `/v1/documents/classification/*`
- `/v1/documents/review/*`
- `/v1/documents/routing/*`
- `/v1/documents/duplicates/*`

Följande får aldrig skriva downstream legal truth:
- `/v1/documents/*`
- `/v1/ocr/*`
- `/v1/review/*`
- `/v1/search/*`

Command-only operations:
- threat assessment
- OCR queue/start/complete
- deterministic classify
- AI fallback request
- review decision
- routing decision
- downstream dispatch

## Kanoniska permissions och review boundaries

- `document.ingest`
  - får registrera acquisition och original binary

- `document.scan`
  - får starta OCR och hotscan

- `document.classify`
  - får utvardera deterministiska regler
  - får inte issue downstream legal truth

- `document.ai_fallback`
  - får begara AI fallback enligt policy
  - får inte markera legal completion

- `document.review`
  - får losa klassnings- och routingfrågor
  - får inte hoppa över hard blockers

- `document.route`
  - får dispatcha till downstream owner efter resolved route

- `document.audit_read`
  - read-only över hela lineage

- `support.document_ops`
  - får se envelope, OCR, confidence och review
  - får inte overridea downstream legal truth

High-risk review boundaries:
- persondata-sensitive docs
- payroll/benefit-sensitive docs
- HUS-sensitive docs
- ambiguous supplier/merchant identity
- low-confidence amount or tax
- unknown scenario

## Nummer-, serie-, referens- och identitetsregler

- varje acquisition ska ha `document_acquisition_id`
- varje logical document ska ha `document_envelope_id`
- varje binary ska ha `binary_capture_id`
- varje OCR run ska ha `ocr_execution_id`
- varje AI suggestion ska ha `ai_suggestion_id`
- varje review task ska ha `review_task_id`
- varje routing decision ska ha `routing_decision_id`
- original hash policy ska bevara:
  - hash algorithm
  - hash version
  - binary length
  - storage receipt ref
- same binary får aldrig fa flera canonical binary ids utan supersession reason
- same logical document får aldrig förväxlas med:
  - attachment duplicate
  - OCR rerun
  - API replay
  - migration replay

## Valuta-, avrundnings- och omräkningsregler

- scanninglagret får extrahera belopp och valuta
- scanninglagret får normalisera decimaltecken, tusentalsavskiljare och valutaformat
- scanninglagret får inte ensam bestamma legal FX rate för bokföring
- scanninglagret får inte ensam bestamma legal SEK-omräkning för moms eller skatt
- avrundningsanomalier ska markeras som lineage finding, inte skrivas bort
- totalsummor och radsummor får inte harmoniseras med gissning utan review eller downstream regel

## Replay-, correction-, recovery- och cutover-regler

- original binary är append-only
- OCR rerun ska skapa ny `OcrExecution`, aldrig mutera gammal
- AI rerun ska skapa ny `AiClassificationSuggestion`, aldrig mutera gammal
- review correction ska skapa ny lineagepost, aldrig skriva över original suggestion
- migrationimport ska bevara source provenance och markera imported origin
- replay med samma input och samma policyversion ska ge samma deterministiska resultat
- om providerbaseline eller policyversion ändras ska ny versionkedja skapas

## Huvudflödet

1. dokument tas emot
2. acquisition registreras
3. original binary capture sker
4. threat scan sker
5. binary och envelope binds samman
6. deterministisk familjedetektion kor
7. om OCR krävs: OCR kor
8. extracted fields normaliseras
9. deterministisk klassning kor
10. om deterministiken inte rackt och policy tillater: AI fallback kor
11. confidence utvarderas
12. review requirement beslutas
13. downstream owner beslutas
14. dokument dispatchas till downstream-domän eller blockeras
15. lineage, receipts och exportmanifest lAses

## Bindande scenarioaxlar

Varje scenario måste korsas mot minst dessa axlar:

- source channel
  - email_attachment
  - portal_upload
  - mobile_capture
  - api_ingest
  - peppol_xml
  - migration_import
  - operator_manual

- binary type
  - native_pdf
  - raster_image
  - multi_page_scan
  - xml
  - archive_container
  - password_protected
  - unsupported

- document family candidate
  - supplier_invoice
  - receipt
  - payment_proof
  - bank_statement
  - contract_or_agreement
  - payroll_or_benefit_sensitive
  - unknown

- deterministic coverage
  - full
  - partial
  - none

- AI usage
  - not_allowed
  - not_needed
  - requested
  - completed
  - failed
  - rejected_by_policy

- confidence band
  - deterministic_verified
  - high
  - medium
  - low
  - critical_missing

- downstream owner
  - ap_flow
  - receipt_flow
  - outlay_flow
  - payroll_flow
  - benefit_flow
  - seller_invoice_import
  - blocked_unknown

- security outcome
  - clean
  - quarantined
  - blocked

## Bindande policykartor

### Bindande source-channel-karta

- `SRC001` email attachment
- `SRC002` portal upload
- `SRC003` mobile capture
- `SRC004` API ingest
- `SRC005` Peppol/XML
- `SRC006` migration import
- `SRC007` operator manual upload

### Bindande dokumentfamiljkarta

- `DFP001` supplier invoice
- `DFP002` receipt
- `DFP003` payment proof only
- `DFP004` bank statement
- `DFP005` contract or agreement
- `DFP006` payroll or benefit sensitive document
- `DFP007` unknown

### Bindande field-criticality-karta

- `FCR001` hard_legal_identity
- `FCR002` tax_critical
- `FCR003` amount_critical
- `FCR004` routing_critical
- `FCR005` advisory_only

### Bindande confidence-policy-karta

- `CONF001` deterministic_verified
- `CONF002` ai_high_but_reviewable
- `CONF003` ai_medium_review_required
- `CONF004` low_blocking
- `CONF005` critical_missing

### Bindande AI-capability-karta

- `AIC001` deterministic_only
- `AIC002` ai_extract_non_critical_allowed
- `AIC003` ai_route_suggestion_allowed
- `AIC004` ai_legal_fill_forbidden

### Bindande downstream-owner-karta

- `DSO001` ap_flow
- `DSO002` receipt_flow
- `DSO003` outlay_flow
- `DSO004` payroll_flow
- `DSO005` benefit_flow
- `DSO006` seller_invoice_import
- `DSO007` blocked_unknown

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### SCN-P0001 Deterministic supplier invoice route

- family = `DFP001`
- AI = not needed
- review = no
- downstream = `DSO001`
- legal truth = none in scanning layer

### SCN-P0002 Deterministic receipt route

- family = `DFP002`
- AI = not needed
- review = no
- downstream = `DSO002`

### SCN-P0003 Payment proof only blocked

- family = `DFP003`
- review = yes
- downstream = `DSO007`
- no downstream posting dispatch

### SCN-P0004 Deterministic incomplete -> AI fallback allowed

- deterministic coverage = partial
- AI policy = allowed
- review = pending final confidence

### SCN-P0005 AI suggests receipt route, review required

- AI completed
- downstream candidate = `DSO002`
- review = required
- no auto-legal posting

### SCN-P0006 AI suggests payroll/benefit risk

- downstream = `DSO004` eller `DSO005`
- review = required

### SCN-P0007 Unknown scenario blocked

- family = `DFP007`
- downstream = `DSO007`
- status = blocked_unknown

### SCN-P0008 Duplicate across channels

- duplicate = confirmed
- no second downstream dispatch
- supersession or merge required

### SCN-P0009 OCR rerun supersession

- old OCR execution = superseded
- new OCR execution = active
- original binary unchanged

### SCN-P0010 Threat scan quarantine

- security outcome = quarantined
- no OCR
- no AI
- no dispatch

### SCN-P0011 Peppol/XML deterministic structured ingest

- OCR = not required
- family resolved deterministically
- downstream dispatch allowed

### SCN-P0012 Migration imported binary

- imported provenance retained
- no auto-dispatch unless migration policy permits

## Bindande rapport-, export- och myndighetsmappning

- scanninglagret skapar inga moms- eller AGI-rutor
- scanninglagret måste exportera auditmanifest för:
  - binary capture
  - OCR execution
  - AI suggestion
  - review resolution
  - routing decision
- offentlig e-faktura/Peppol-ingest måste kunna bevara structured source som structured source
- elektroniskt mottagen rakenskapsinformation måste kunna bevaras och exporteras i eller med referens till ursprunglig form

## Bindande scenariofamilj till proof-ledger och rapportspar

### A. Acquisition and binary truth

- `SCN-A001` email attachment clean -> `SCN-P0001` eller `SCN-P0002`
- `SCN-A002` portal upload image -> `SCN-P0004`
- `SCN-A003` mobile capture receipt -> `SCN-P0004`
- `SCN-A004` Peppol XML -> `SCN-P0011`
- `SCN-A005` migration import -> `SCN-P0012`

### B. OCR and extraction

- `SCN-B001` OCR high confidence -> `SCN-P0001` eller `SCN-P0002`
- `SCN-B002` OCR low confidence total/merchant -> `SCN-P0004`
- `SCN-B003` OCR provider failed -> review or rerun, no dispatch
- `SCN-B004` OCR rerun -> `SCN-P0009`

### C. Deterministic-first / AI fallback

- `SCN-C001` deterministic rule sufficient -> no AI provider call
- `SCN-C002` deterministic partial -> `SCN-P0004`
- `SCN-C003` AI suggests receipt -> `SCN-P0005`
- `SCN-C004` AI suggests payroll/benefit -> `SCN-P0006`
- `SCN-C005` AI unknown -> `SCN-P0007`

### D. Routing and review

- `SCN-D001` route to AP -> `SCN-P0001`
- `SCN-D002` route to receipt -> `SCN-P0002`
- `SCN-D003` route to outlay -> review required
- `SCN-D004` route to payroll/benefit -> review required
- `SCN-D005` blocked unknown -> `SCN-P0007`

### E. Security and duplicates

- `SCN-E001` quarantine -> `SCN-P0010`
- `SCN-E002` duplicate confirmed -> `SCN-P0008`
- `SCN-E003` password protected or unsupported -> blocked pending controlled handling

## Tvingande dokument- eller indataregler

- alla mottagna dokument måste ha original binary capture före OCR/AI
- structured XML eller e-faktura får inte rasteriseras och sedan behandlas som enda sanning
- binary hash, mime type och storage ref måste finnas
- source channel måste finnas
- tenant/actor/acquisition context måste finnas
- om dokumentet är elektroniskt mottaget ska elektronisk originalform bevaras eller överföras enligt bokföringsregler
- om dokumentet är pappersmottaget och skannas ska överföringens tillforlitlighet kunna styrkas

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SCN-LR-DET-001`
  - deterministiska regler rackte

- `SCN-LR-AI-001`
  - AI fallback tillaten eftersom deterministiken inte rackte

- `SCN-LR-BLK-001`
  - hard legal field missing

- `SCN-LR-BLK-002`
  - duplicate suspect or confirmed

- `SCN-LR-BLK-003`
  - security quarantine

- `SCN-LR-BLK-004`
  - unknown scenario

- `SCN-LR-BLK-005`
  - downstream owner unresolved

- `SCN-LR-ROUTE-001`
  - routed to AP

- `SCN-LR-ROUTE-002`
  - routed to receipt

- `SCN-LR-ROUTE-003`
  - routed to outlay/payroll/benefit

## Bindande faltspec eller inputspec per profil

### Profil `scan_supplier_invoice`

Måste kunna leverera minst:
- seller identity candidate
- invoice number candidate
- invoice date candidate
- total amount candidate
- currency candidate
- tax base / VAT candidates where present
- document family = supplier_invoice or unknown

### Profil `scan_receipt`

Måste kunna leverera minst:
- merchant identity candidate
- transaction date candidate
- total amount candidate
- tax or rate candidates where present
- payment evidence candidate where present
- document family = receipt or payment_proof or unknown

### Profil `scan_payment_proof`

Måste kunna leverera minst:
- payer/payee traces where possible
- amount
- date
- transaction reference
- explicit markering att purchase proof saknas

### Profil `scan_unknown`

Måste kunna leverera:
- original binary lineage
- best-effort text extraction
- blocked_unknown path

## Scenariofamiljer som hela systemet måste tacka

- `SCN-A001` email invoice attachment
- `SCN-A002` email receipt image
- `SCN-A003` mobile capture of paper receipt
- `SCN-A004` portal upload of PDF
- `SCN-A005` Peppol XML
- `SCN-A006` migration imported binary
- `SCN-B001` OCR high confidence
- `SCN-B002` OCR low confidence amount
- `SCN-B003` OCR low confidence counterparty
- `SCN-B004` OCR provider failure
- `SCN-B005` OCR rerun
- `SCN-C001` deterministic route AP
- `SCN-C002` deterministic route receipt
- `SCN-C003` deterministic route payment proof only
- `SCN-C004` deterministic route unknown block
- `SCN-D001` AI fallback receipt
- `SCN-D002` AI fallback AP
- `SCN-D003` AI fallback payroll/benefit
- `SCN-D004` AI fallback outlay
- `SCN-D005` AI fallback unknown
- `SCN-E001` duplicate across email and API
- `SCN-E002` duplicate across OCR reruns
- `SCN-E003` malware quarantine
- `SCN-E004` password protected PDF
- `SCN-E005` unsupported file
- `SCN-F001` review approved
- `SCN-F002` review rerouted
- `SCN-F003` review rejected
- `SCN-G001` migration replay no double dispatch
- `SCN-G002` superseded OCR version
- `SCN-G003` superseded AI suggestion

## Scenarioregler per familj

- `SCN-C001`
  - får inte anropa AI provider
  - får dispatcha till AP om hard fields är tillrackliga

- `SCN-C002`
  - får inte anropa AI provider om deterministic receipt route är blockerfri

- `SCN-C003`
  - payment proof only får aldrig autogenerera receipt- eller AP-truth

- `SCN-D001`
  - AI-forslag får inte ensam ge legal posting
  - downstream route får bara bli `receipt_flow` efter policy gate

- `SCN-D003`
  - AI som hittar payroll/benefit-risk ska tvinga review och routing, inte posting

- `SCN-D005`
  - unknown AI output ska ge `blocked_unknown`

- `SCN-E001`
  - ändra kopian får inte dispatchas

- `SCN-E003`
  - quarantined document får inte OCR:as eller AI-klassas vidare

## Blockerande valideringar

- original binary saknas
- threat scan inte clean
- source channel saknas
- document family unresolved
- hard legal fields saknas för requested downstream route
- deterministic rule says blocked
- AI fallback forbidden by policy
- AI confidence under threshold
- downstream owner unresolved
- duplicate confirmed
- unknown scenario unresolved

## Rapport- och exportkonsekvenser

- scanninglagret exporterar endast audit/evidence
- no direct VAT/AGI/ledger export
- review and routing receipts måste vara exportabla till audit bundles

## Förbjudna förenklingar

- att alltid kalla ett dokument med totalsumma för receipt
- att alltid kalla PDF för supplier invoice
- att lata OCR confidence ensam avgöra legal route
- att lata AI fylla saknat VAT-nummer, orgnummer eller legal date som inte finns i källan
- att anropa AI när deterministic rule already resolved case
- att dispatcha till downstream utan explicit routing decision
- att lata unknown scenario auto-passera till review med implicit green path

## Fler bindande proof-ledger-regler för specialfall

- provider failure måste skapa explicit failure lineage
- rerun måste alltid skapa supersession, aldrig overwrite
- AI suggestion måste kunna knytas till exakt input version
- duplicate merge måste kunna visa vilken acquisition som vann

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `SCN-P0001`, `SCN-P0002`, `SCN-P0011`
  - dispatch allowed
  - no legal posting in scanning layer

- `SCN-P0003`, `SCN-P0007`, `SCN-P0010`
  - blocked
  - no dispatch

- `SCN-P0004`, `SCN-P0005`, `SCN-P0006`
  - review pending before downstream dispatch finalization

- `SCN-P0008`, `SCN-P0009`, `SCN-P0012`
  - lineage-only effect
  - no second legal dispatch

## Bindande verifikations-, serie- och exportregler

- scanninglagret skapar inga bokföringsverifikationsserier
- scanning evidence ska ha egna canonical export ids:
  - `DOCSCAN`
  - `OCRRUN`
  - `CLSROUTE`
  - `REVIEW`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Varje scenariofamilj ska provas mot:
- source channel
- binary type
- deterministic coverage
- AI allowed/not allowed
- confidence band
- downstream owner
- duplicate/no duplicate
- clean/quarantined

## Bindande fixture-klasser för dokumentscanning, OCR och klassning

- `SCN-FXT-001` native PDF supplier invoice
- `SCN-FXT-002` photographed paper receipt
- `SCN-FXT-003` digital email receipt
- `SCN-FXT-004` Peppol XML invoice
- `SCN-FXT-005` low-confidence blurry image
- `SCN-FXT-006` duplicate across channels
- `SCN-FXT-007` unknown mixed document
- `SCN-FXT-008` malware/quarantine fixture
- `SCN-FXT-009` OCR rerun fixture
- `SCN-FXT-010` AI fallback fixture

## Bindande expected outcome-format per scenario

Varje scenario måste minst redovisa:
- scenario id
- source channel
- binary type
- deterministic coverage
- AI usage
- confidence profile
- downstream owner
- review required yes/no
- blocked yes/no
- dispatch yes/no
- lineage receipts created

## Bindande canonical verifikationsseriepolicy

EJ TILLÄMPLIGT.
Scanninglagret skapar inte legal bokföringsverifikation.
I stallet gäller canonical evidence/export ids enligt sektionen om exportregler.

## Bindande expected outcome per central scenariofamilj

### `SCN-C001`

- fixture minimum: `SCN-FXT-001`
- expected:
  - family = supplier_invoice
  - AI not called
  - route = AP
  - review = no

### `SCN-D001`

- fixture minimum: `SCN-FXT-002`
- expected:
  - deterministic partial
  - AI called
  - route suggestion = receipt_flow
  - final route only after policy gate

### `SCN-D005`

- fixture minimum: `SCN-FXT-007`
- expected:
  - family = unknown
  - blocked_unknown = yes
  - no dispatch

### `SCN-E003`

- fixture minimum: `SCN-FXT-008`
- expected:
  - quarantined = yes
  - OCR no
  - AI no
  - dispatch no

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SCN-A001`: deterministic or OCR -> AP route
- `SCN-A002`: OCR -> receipt or review
- `SCN-A003`: OCR -> receipt or review
- `SCN-A004`: deterministic/OCR -> route by profile
- `SCN-A005`: structured XML -> no OCR, AP route
- `SCN-A006`: migration lineage only until migration policy dispatch
- `SCN-B001`: OCR high confidence -> deterministic route or review-free if policy allows
- `SCN-B002`: low amount confidence -> review
- `SCN-B003`: low counterparty confidence -> review
- `SCN-B004`: provider failed -> rerun or blocked
- `SCN-B005`: rerun -> supersede old OCR
- `SCN-C001`: deterministic AP no AI
- `SCN-C002`: deterministic receipt no AI
- `SCN-C003`: payment proof blocked
- `SCN-C004`: unknown blocked
- `SCN-D001`: AI receipt suggestion, reviewable
- `SCN-D002`: AI AP suggestion, reviewable
- `SCN-D003`: AI payroll/benefit route
- `SCN-D004`: AI outlay route
- `SCN-D005`: AI unknown blocked
- `SCN-E001`: duplicate blocked merge
- `SCN-E002`: OCR rerun duplicate lineage only
- `SCN-E003`: quarantine blocked
- `SCN-E004`: password-protected controlled handling
- `SCN-E005`: unsupported blocked
- `SCN-F001`: review approved -> dispatch
- `SCN-F002`: review rerouted -> dispatch to new owner
- `SCN-F003`: review rejected -> blocked
- `SCN-G001`: migration replay no double dispatch
- `SCN-G002`: OCR supersession no overwrite
- `SCN-G003`: AI supersession no overwrite

## Bindande testkrav

- deterministic-first tests måste bevisa att AI inte anropas när regelmotor racker
- AI fallback tests måste bevisa att AI bara föreslår, inte issuear legal truth
- duplicate tests måste passera över email/API/OCR/migration
- quarantine tests måste bevisa att blocked files inte passerar till OCR eller AI
- rerun tests måste bevisa supersession chain
- routing tests måste bevisa exakt en downstream owner eller blocked_unknown
- unknown tests måste bevisa no dispatch
- structured XML tests måste bevisa no raster fallback as sole truth

## Källor som styr dokumentet

- [BFN: Vad innebar den ändrade regeln om överföring av rakenskapsinformation i bokföringslagen](https://www.bfn.se/vad-innebar-den-andrade-regeln-om-overforing-av-rakenskapsinformation-i-bokforingslagen/)
- [BFN: Ändringar i bokföringslagens arkiveringsregler](https://www.bfn.se/andringar-i-bokforingslagens-arkiveringsregler/)
- [BFNARVL 2013:2 konsoliderad 2024-09-16](https://www4.skatteverket.se/download/18.3bee4a67191ef7cad183296/1727870561224/BFNARVL%202013%202%20konsoliderad%2020240916.pdf)
- [Skatteverket: Momslagens regler om fakturering](https://skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Digg: Lag, förordning och föreskrifter inom e-handel för leverantörer till offentlig sektor](https://www.digg.se/kunskap-och-stod/e-handel/lag-forordning-och-foreskrifter-for-e-handel/lag-forordning-och-foreskrifter-inom-e-handel-for-leverantorer-till-offentlig-sektor)
- [Bankgirot: OCR-referenskontroll](https://www.bankgirot.se/tjanster/inbetalningar/bankgiro-inbetalningar/ocr-referenskontroll/)

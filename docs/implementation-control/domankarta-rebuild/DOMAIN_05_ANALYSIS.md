# DOMAIN_05_ANALYSIS

Datum: 2026-04-02  
Domän: leverantörsreskontra, supplier invoices, receipts, OCR expense intake, AP open items, payment preparation och settlement

## Scope

Domän 5 granskades i följande ordning:

- prompt 5
- äldre `DOMAIN_05_ANALYSIS.md`
- äldre `DOMAIN_05_ROADMAP.md`
- äldre `DOMAIN_05_IMPLEMENTATION_LIBRARY.md`
- faktisk repo-runtime i AP-, document-, classification-, review-, import-case-, banking- och API-lagren
- körbara tester i denna miljö
- officiella källor för bokföringsunderlag, omvänd moms, EU-/icke-EU-inköp och importmoms

Primära repo-spår:

- `packages/domain-ap/src/index.mjs`
- `packages/document-engine/src/index.mjs`
- `packages/domain-documents/src/index.mjs`
- `packages/domain-document-classification/src/engine.mjs`
- `packages/domain-import-cases/src/engine.mjs`
- `packages/domain-review-center/src/engine.mjs`
- `packages/domain-banking/src/index.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/platform.mjs`
- `apps/api/src/platform-method-intents.mjs`
- `apps/api/src/review-center-decision-effects.mjs`
- `apps/api/src/phase14-review-routes.mjs`
- `apps/api/src/phase14-migration-intake-routes.mjs`
- `packages/db/migrations/20260321140000_phase6_ap_masterdata_po_receipts.sql`
- `packages/db/migrations/20260321150000_phase6_ap_invoice_ingest_matching.sql`
- `packages/db/migrations/20260321160000_phase6_ap_attest_payments.sql`
- `packages/db/migrations/20260324230000_phase14_ap_import_person_payment_readiness.sql`

Körda tester i denna granskning:

- `node --test tests/unit/ap-phase6-1.test.mjs tests/unit/ap-phase6-2.test.mjs tests/unit/document-engine-phase2-ocr.test.mjs`

Resultat:

- 13/13 passerade
- integration/e2e-spår med `node:sqlite` gick inte att köra i denna miljö under Node `v18.19.0`

Officiella källor som användes:

- Sveriges riksdag, `Bokföringslag (1999:1078)`, särskilt 4 kap. 1 §, 5 kap. och 7 kap.
- Skatteverket, `Bokföring och bokslut`
- Skatteverket, `Omvänd betalningsskyldighet`
- Skatteverket, `Köpa varor från ändra EU-länder`
- Skatteverket, `Köpa tjänster från ändra EU-länder`
- Skatteverket, `Köpa tjänster från länder utanför EU`
- Skatteverket, `Köpa varor från länder utanför EU`
- Skatteverket, `Köpa varor eller tjänster till företaget`

Sammanfattande klassning:

- total klassning: `partial reality`
- huvudproblem: repo:t har en verklig AP-motor, men DB-kontrakt, duplicate-logik, routing, datumstyrning, SoD och payment/open-item-modell håller inte svensk go-live-nivå
- go-live-status: blockerad

## Verified Reality

- AP-domänen är verklig runtime, inte bara namngiven modell. Se `packages/domain-ap/src/index.mjs`.
- OCR-runnern är verklig, providerburen och versionskedjad. Se `packages/document-engine/src/index.mjs:718-858, 1093-1169, 2078-2252`.
- review center är en verklig auditbar work-queue för classification/import/VAT-nära beslut. Se `packages/domain-review-center/src/engine.mjs`.
- import-case-domänen är verklig och har idempotens, approval och apply-kedja. Se `packages/domain-import-cases/src/engine.mjs:389-490, 642-719`.
- banking-domänen har verklig AP-koppling för proposal/order, reject, return och reopen-paths. Se `packages/domain-banking/src/index.mjs`.
- API-wiring mellan AP, documents, classification, import cases, banking och auth är verklig i `apps/api/src/platform.mjs` och `apps/api/src/server.mjs`.

## Partial Reality

- leverantörsreskontran fungerar för lyckliga vägar men bryter på DB-backed signed credits/open-item-statusar och readiness-semantik
- OCR och klassning är verkliga men inte starka nog att ensam bära AP-sanning
- payment lifecycle finns men stöder i praktiken helbeloppsreservation/helbeloppssettlement bättre än delbetalningar och partiell reopen
- VatDecision-bryggan finns men date-control, goods/services och account mapping är för svaga
- import cases och review center finns men AP-ingest kan fortfarande gå runt den starkaste tänkta dokumentbarriären

## Legacy

- `docs/runbooks/fas-6-ap-masterdata-verification.md`
- `docs/runbooks/fas-6-ap-invoice-matching-verification.md`
- `docs/runbooks/fas-6-ap-payments-verification.md`
- `docs/runbooks/fas-2-ocr-review-verification.md`

Klassning:

- gamla runbooks är användbara som råmaterial men inte som bindande acceptansbevis

## Dead Code

- `packages/domain-ap/src/index.mjs:3181-3213` `buildDomesticPurchaseVatProposal`

Klassning:

- dead code / remove

## Misleading / False Completeness

- `packages/domain-documents/src/index.mjs` är i praktiken ett wrapperlager runt `document-engine`, inte en egen first-class dokumentdomän
- implementation claims om extraction -> classification -> review/apply som obligatorisk AP-kedja stämmer inte med att API:t exponerar direkt `POST /v1/ap/invoices/ingest`
- `receiptTargetType` ser komplett ut men downstream-effekter för `asset`, `inventory` och `project_material` är inte verifierade
- OCR-runbooks beskriver olika OCR-baselines än repo:t visar
- multikanals-dubblettskyddet ser starkare ut i schema och docs än i faktisk fingerprint-logik

## Supplier Masterdata Findings

### D5-001
- severity: high
- kategori: supplier masterdata
- exakt problem: leverantörsdedupe bygger på `supplierNo` och eventuellt `importSourceKey`, inte på canonical identity för organisationsnummer, VAT-nummer och bankrelation
- varför det är farligt: samma leverantör kan finnas flera gånger och bryta attest, duplicate detection, betalningsblockering och spend-kontroll
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `260-273, 283-336, 4349-4359`
- rekommenderad riktning: inför canonical supplier identity med konfliktmodell för orgnr/VAT/bank/importkälla
- status: rewrite

### D5-002
- severity: high
- kategori: supplier lifecycle
- exakt problem: arkivering blockerar öppna PO men inte öppna leverantörsfakturor, AP-open-items eller aktiva betalordrar
- varför det är farligt: arkiverad leverantör kan fortfarande bära skuld eller ligga i betalningskedjan
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `433-455`
- rekommenderad riktning: blockera arkivering när öppen AP-risk finns
- status: harden

### D5-003
- severity: medium
- kategori: supplier tax and counterparty model
- exakt problem: motpartsklassificeringen är för grov och särskiljer inte tillräckligt mellan juridiska personer, enskilda, utländska motparter och verkliga skatteprofiler
- varför det är farligt: fel A-/F-skatt- och avgiftsantäganden kan smyga in i AP-beslut och attest
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `311-318, 2485-2566, 3933-3941`
- rekommenderad riktning: explicit motpartsmodell med verifieringsdatum, landregelprofil och källspår
- status: rewrite

## Purchase Order / Receipt Findings

### D5-004
- severity: medium
- kategori: purchase order control
- exakt problem: ny PO kan skapas direkt i annan status än `draft`
- varför det är farligt: livscykeln ser strikt ut men kan hoppas över via API/import
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `599, 643-660`
- rekommenderad riktning: tvinga ny PO till `draft` och gör övriga statusbyten till explicita transitions
- status: harden

## Target Type Routing Findings

### D5-005
- severity: high
- kategori: target type routing
- exakt problem: `receiptTargetType` finns men downstream-effekter för `asset`, `inventory` och `project_material` är inte verkligt verifierade
- varför det är farligt: modellen ser mogen ut men styr inte säkert lager, anläggning eller project-material-bokning
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `29-33, 903-904, 4233-4237`
- rekommenderad riktning: bygg explicit downstream-command per target type eller blockera allt utom `expense`
- status: rewrite

## OCR / Document Intake Findings

### D5-006
- severity: high
- kategori: OCR / document intake
- exakt problem: OCR-runnern är verklig men extraction och confidence är fortfarande delvis heuristiska
- varför det är farligt: AP-kritiska fält kan se maskinellt kompletta ut trots svag tolkning av leverantör, total, datum eller rader
- exakt filpath: `packages/document-engine/src/index.mjs`
- radreferens om möjligt: `718-858, 1093-1169, 2078-2252`
- rekommenderad riktning: hårdna review-boundary och blockera autopass för AP-kritiska fält vid svag lineage/confidence
- status: harden

## Document Classification / Review / Import Case Findings

### D5-007
- severity: high
- kategori: document to AP boundary
- exakt problem: den tänkta classification/review/apply-first-modellen går att kringgå via direkt `documentId`-baserad AP-ingest
- varför det är farligt: dokumentbarriären ser säkrare ut i docs än i runtime och person-/regulated-dokument kan få för svag grind in i AP
- exakt filpath: `apps/api/src/server.mjs`
- radreferens om möjligt: `9418-9438`
- rekommenderad riktning: gör classification/import-case obligatoriska när policy kräver det eller klassa direct ingest som begränsad och blockerad för vissa scenarier
- status: rewrite

## Supplier Invoice Ingestion Findings

### D5-008
- severity: high
- kategori: supplier invoice ingest
- exakt problem: leverantör kan lösas från OCR `counterparty` via exakt eller `includes()`-baserad fuzzy-match på legal name
- varför det är farligt: liknande leverantörsnamn kan mappa till fel motpart, fel liability-konto, fel momsbehandling och fel duplicate-scope
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `2910-2926`
- rekommenderad riktning: ta bort fuzzy-autoaccept för AP och kräv hängning till verifierad supplier identity eller manuell review
- status: rewrite

### D5-009
- severity: medium
- kategori: supplier invoice line fallback
- exakt problem: när OCR saknar riktiga rader kan runtime skapa en syntetisk summary-rad
- varför det är farligt: det ser ut som radnivå finns fast verklig kostnadsfördelning, VAT-per-rad och matchingunderlag saknas
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `2985-3000`
- rekommenderad riktning: summary-line får bara användas som manuellt godkänd fallback med `summary_coding_required`
- status: harden

## Duplicate / Fingerprint / Multi-Channel Intake Findings

### D5-010
- severity: critical
- kategori: duplicate / multi-channel intake
- exakt problem: hard duplicate-fingerprint lutar på `documentHash`, vilket gör att samma verkliga faktura via annan dokumentväg kan överleva som ny
- varför det är farligt: samma leverantörsfaktura kan gå in dubbelt via OCR, e-post, API, Peppol eller migration
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1131-1164, 3775-3829`
- rekommenderad riktning: dela duplicate detection i hårda och mjuka nycklar som inte kräver samma `documentHash`
- status: rewrite

### D5-011
- severity: medium
- kategori: source channel taxonomy
- exakt problem: kanalmodellen är för grov och saknar uttryckliga migration-/ocr-inbox-kanaler
- varför det är farligt: audit trail och duplicate-analys blir för grov
- exakt filpath: `packages/db/migrations/20260321150000_phase6_ap_invoice_ingest_matching.sql`
- radreferens om möjligt: `21-25`
- rekommenderad riktning: inför explicit taxonomi för `ocr_inbox`, `email_attachment`, `migration`, `partner_api`, `import_repair`
- status: harden

## Credit Note Findings

### D5-012
- severity: critical
- kategori: credit notes
- exakt problem: runtime använder negativa open items och `not_applicable`-readiness för credit notes medan databasen förbjuder detta
- varför det är farligt: kreditnotor ser färdiga ut i runtime men håller inte i verklig DB-backed drift
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1684-1689, 2476-2477, 3334-3339`
- rekommenderad riktning: lås en enda credit/open-item-modell och migrera både runtime och schema till den
- status: rewrite

## Matching / Tolerance / Variance Findings

### D5-013
- severity: high
- kategori: matching / tolerance / variance
- exakt problem: tolerance profiles läses från hårdkodad konstant och quantity tolerance används inte fullt korrekt i matchbeslutet
- varför det är farligt: företagsdata i databasen styr inte verklig matching och kvantitetsavvikelser kan klassas fel
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `67-76, 1354-1393, 3448-3450`
- rekommenderad riktning: flytta toleranser till persistenta effective-dated profiler och använd faktiskt quantity/price/total/date-varians
- status: rewrite

## Approval / SoD Findings

### D5-014
- severity: high
- kategori: approval / SoD
- exakt problem: attestkedjan är verklig men SoD är inte hård nog; skapare, attestant och betalexportör kan kollidera för mycket
- varför det är farligt: internkontroll och bedrägeriskydd blir för svagt inför betalning
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1496-1560, 2826-2893`
- rekommenderad riktning: inför policy för preparer != final approver och creator != payment exporter under normal drift
- status: harden

## Date Control Findings

### D5-015
- severity: high
- kategori: date control
- exakt problem: invoice date, delivery date, tax date och prepayment date kollapsas för ofta till samma datum i AP-VAT-bryggan
- varför det är farligt: momsperiod, kontantmetod/faktureringsmetod och importscenarier kan bli fel
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1570-1575, 1611-1623, 3124-3150`
- rekommenderad riktning: inför explicit datumuppsättning och förbjud tyst kollaps mellan styrande datum
- status: rewrite

## Posting / AP Open Item Findings

### D5-016
- severity: critical
- kategori: posting / AP open item
- exakt problem: runtime använder `reserved` och negativa kreditposter medan DB-kontrakten bara accepterar `open|paid|closed` och icke-negativa belopp
- varför det är farligt: centrala AP-händelser kan inte persisteras korrekt i DB-backed drift
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1680-1717, 1850-1856, 1947-1953, 2100-2107`
- rekommenderad riktning: lås ett enda open-item-kontrakt och migrera både runtime och SQL innan vidare funktioner byggs
- status: rewrite

## Payment Preparation / Payment Lifecycle / Settlement / Reopen Findings

### D5-017
- severity: critical
- kategori: payment preparation
- exakt problem: runtime använder `paymentReadinessStatus = not_applicable`, men databasen tillåter inte den statusen
- varför det är farligt: icke-betalbara poster, särskilt kreditnotor, får olika sanning i minne och DB
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `2475-2477, 3326-3369`
- rekommenderad riktning: utöka readiness-state eller inför separat payability-dimension med samma semantik i runtime och DB
- status: rewrite

### D5-018
- severity: high
- kategori: payment lifecycle defect
- exakt problem: cash-method reject path kan slå i nulljournal-branch när reservation släpps
- varför det är farligt: reject/return-flödet blir instabilt i just den gren där kontantmetod kräver specialhantering
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1899-1902, 1968-1972`
- rekommenderad riktning: null-säker retur och explicit test för cash-method rejection
- status: harden

### D5-019
- severity: high
- kategori: payment lifecycle / partial settlement
- exakt problem: AP-open-items stöder i praktiken helbeloppsreserve/helbeloppssettle medan banking-proposal redan talar om `partially_executed`
- varför det är farligt: delbetalning, retur på delbelopp, FX-rest och residual skuld blir fel
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `1752-2291`
- rekommenderad riktning: skriv om payment/open-item-modellen till partial reserve, partial settle, return on residual och supplier credit/refund
- status: rewrite

## Ledger / VAT / FX Bridge Findings

### D5-020
- severity: high
- kategori: ledger / VAT / FX bridge
- exakt problem: liability-konton och VAT-konton väljs för hårdkodat och account mapping är inte tillräckligt policydriven
- varför det är farligt: tenant-specifik kontoplan, BAS-varianter och särskilda scenarier kan ge fel bokning
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `3071-3076, 3096-3178, 3453-3510, 3694-3717`
- rekommenderad riktning: policybaserad account mapping per bolag, target type, motpart, datum och legal scenario
- status: harden

### D5-021
- severity: high
- kategori: VAT classification
- exakt problem: `goodsOrServices` defaultar tyst till `services`
- varför det är farligt: utlandsvaror, import och bygg/logistikscenarier kan felklassas som tjänster
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `3071, 3115, 2772-2776`
- rekommenderad riktning: kräv explicit goods/services för utlandsflöden och VAT-påverkande intake
- status: rewrite

## AI Boundary / Cost Findings

### D5-022
- severity: medium
- kategori: AI boundary / runtime claims
- exakt problem: runbooks beskriver delvis en mer mogen OCR-baseline än repo:t visar
- varför det är farligt: kostnads-, drift- och incidentbeslut kan baseras på fel antagen OCR-provider och fel autoaccept-nivå
- exakt filpath: `docs/runbooks/fas-2-ocr-review-verification.md`
- radreferens om möjligt: `68-73`
- rekommenderad riktning: välj en enda bindande OCR-baseline och skriv om runbooks så att de matchar kod och miljö
- status: rewrite

## Migration / Import Intake Findings

### D5-023
- severity: medium
- kategori: import intake
- exakt problem: import case finns men är inte alltid tvingande precondition innan AP-draft skapas
- varför det är farligt: importmoms- och tullunderlag kan bli en senare blockerflagga i stället för en hård intake-grind
- exakt filpath: `packages/domain-ap/src/index.mjs`
- radreferens om möjligt: `2725-2819`
- rekommenderad riktning: gör import case obligatorisk ingest-precondition för definierade scenarier eller håll AP-draft strikt blockerad tills import case är approved + applied
- status: harden

## OCR / Review Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| documents | egen first-class domän | wrapper ovanpå `document-engine` | `packages/domain-documents/src/index.mjs:1-28` | nej |
| OCR run execution | riktig runtime | verified reality | `packages/document-engine/src/index.mjs:718-858`; `tests/unit/document-engine-phase2-ocr.test.mjs` | nej |
| OCR field extraction | production-grade extraction | partial reality | `packages/document-engine/src/index.mjs:1104-1129, 2078-2252` | ja |
| review boundary after OCR | styrande säkerhetsgrind | partial reality men verklig | `packages/document-engine/src/index.mjs:1124-1129, 2203-2252` | ja |
| classification case | styrande runtime | verified reality | `packages/domain-document-classification/src/engine.mjs:133-192` | nej |
| review center | verklig review queue | verified reality | `packages/domain-review-center/src/engine.mjs:974-1003, 1128-1185` | nej |
| import case runtime | verklig runtime | verified reality | `packages/domain-import-cases/src/engine.mjs:389-490, 642-719` | nej |
| direct document -> AP ingest | starkt barriärstyrd | misleading | `apps/api/src/server.mjs:9418-9438`; `packages/domain-ap/src/index.mjs:2929-2968` | ja |

## Concrete AP Verification Matrix

| capability | claimed AP rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Supplier dedupe | leverantör ska vara deduplicerbar | `createSupplier` + import | `packages/domain-ap/src/index.mjs:260-273, 4349-4359` | ingen extern källa krävs | partial reality | ja |
| PO and receipts | PO/receipt ska bära verklig matching-sanning | PO + receipt runtime finns | `packages/domain-ap/src/index.mjs:846-943, 1302-1493`; `tests/unit/ap-phase6-1.test.mjs` | ingen extern källa krävs | partial reality | ja |
| OCR/document intake | OCR måste vara verklig eller tydligt begränsad | verklig runtime men heuristisk | `packages/document-engine/src/index.mjs:718-858, 2078-2252`; OCR-unit-tests gröna | Bokföringslag (1999:1078); Skatteverket `Bokföring och bokslut` | partial reality | ja |
| Review barrier | classification/review ska vara verkligt styrande | delvis sant men direct ingest finns | `apps/api/src/server.mjs:9418-9438` | ingen extern källa krävs | partial reality | ja |
| Duplicate detection | flera intake-kanaler ska blockeras korrekt | fingerprint använder `documentHash` för hård duplicate | `packages/domain-ap/src/index.mjs:1131-1164, 3775-3829` | ingen extern källa krävs | partial reality | ja |
| Credit notes | supplier credit notes ska fungera korrekt | runtime har signed/open-item-logik men DB bryter | `packages/domain-ap/src/index.mjs:1684-1689, 2476-2477, 3334-3339` | Skatteverket regler om underlag och korrektionsspår | partial reality | ja |
| Matching and tolerance | two-/three-way matching ska följa data, inte hårdkodning | hårdkodade toleranser används | `packages/domain-ap/src/index.mjs:67-76, 1354-1393, 3450` | ingen extern källa krävs | partial reality | ja |
| SoD | attest ska vara verklig och säker | approval chain finns, SoD är för svag | `packages/domain-ap/src/index.mjs:1496-1560, 2826-2893` | ingen extern källa krävs | partial reality | ja |
| Date control | invoice/posting/tax/payment/customs dates ska användas korrekt | flera datum kollapsas till `invoiceDate` | `packages/domain-ap/src/index.mjs:1570-1575, 3124-3150` | Bokföringslag (1999:1078); Skatteverket om inköp och moms | partial reality | ja |
| Posting/open items | AP-open-item ska spegla verklig skuld | runtime och DB krockar | `packages/domain-ap/src/index.mjs:1680-1717, 1850-1856, 2100-2107`; migration `20260321160000...:322-365` | Bokföringslag (1999:1078) | partial reality | ja |
| Payment readiness | readiness/payability ska vara entydig | `not_applicable` finns bara i runtime | `packages/domain-ap/src/index.mjs:2475-2477, 3326-3369`; migration `20260324230000...:46-50` | ingen extern källa krävs | partial reality | ja |
| Payment lifecycle | settlement/reopen ska vara korrekt och spårbar | fullbeloppslogik dominerar, partial saknas | `packages/domain-ap/src/index.mjs:1752-2291`; `packages/domain-banking/src/index.mjs` | ingen extern källa krävs | partial reality | ja |
| VAT / reverse charge / import VAT | AP måste hantera svensk moms korrekt | VatDecision-brygga finns men goods/services och datum är för svaga | `packages/domain-ap/src/index.mjs:3096-3178, 3694-3717` | Skatteverket `Omvänd betalningsskyldighet`; `Köpa varor från ändra EU-länder`; `Köpa tjänster från ändra EU-länder`; `Köpa tjänster från länder utanför EU`; `Köpa varor från länder utanför EU` | partial reality | ja |
| FX | invoice rate och settlement rate ska kunna skiljas | realized FX finns men partial payments saknas | `packages/domain-ap/src/index.mjs:2013-2067, 2238-2240` | Skatteverket vägledning om utlandsinköp | partial reality | ja |
| Migration/import intake | supplier/invoice import ska vara idempotent och spårbar | suppliers/PO har batchmönster, supplier invoices använder ordinarie ingest | `packages/domain-ap/src/index.mjs:470-558, 724-810` | ingen extern källa krävs | partial reality | ja |

## Critical Findings

- D5-010 multi-channel duplicate detection är för svag
- D5-012 credit note-logiken håller inte mot DB-kontraktet
- D5-016 open-item-runtime och databasschema motsäger varandra
- D5-017 readiness/payability är semantiskt delad mellan runtime och DB

## High Findings

- D5-001 supplier masterdata deduplicerar inte på canonical identity
- D5-002 supplier-arkivering blockerar inte all öppen AP-risk
- D5-005 target-type routing är inte verklig downstream-logik
- D5-006 OCR-intag är verkligt men inte production-grade självbärande
- D5-007 dokumentkedjan kan kringgå den starkaste tänkta barriären
- D5-008 supplier resolution via OCR counterparty är för osäker
- D5-013 tolerance profiles är inte datastyrda
- D5-014 SoD är för svag
- D5-015 date control är för grov
- D5-018 cash-method reject path kan krascha
- D5-019 payment lifecycle saknar partial settlement/reopen
- D5-020 ledger/VAT-bridge är för hårdkodad
- D5-021 goods/services defaultar tyst till services

## Medium Findings

- D5-003 counterparty- och tax-profilen är för grov
- D5-004 ny PO kan skapas utanför `draft`
- D5-009 summary-line fallback är för svag som standardväg
- D5-011 source channel taxonomy är för grov
- D5-022 OCR-baseline i docs och runtime divergerar
- D5-023 import case är bara delvis tvingande

## Low Findings

- dead code i `buildDomesticPurchaseVatProposal`

## Cross-Domain Blockers

- ledger/chart governance: AP kan inte vara slutligt korrekt innan kontomappning och chart-governance är låsta
- documents/classification/import: direct ingest försvagar den tänkta dokumentbarriären
- banking: partial settle/reopen och supplier refund kräver sann delbeloppsmodell i payment rails
- migrations: supplier invoice migration saknar egen hård kanal- och duplicate-modell
- runtime environment: sqlite-bundna integration/e2e-spår måste återköras i kompatibel miljö innan go-live

## Go-Live Blockers

1. schema/runtime mismatch för `ap_open_items`
2. schema/runtime mismatch för `paymentReadinessStatus`
3. multikanals-dubbletter blockeras inte hårt nog
4. target-type routing är inte verklig för `asset`, `inventory`, `project_material`
5. date control är för grov för svensk moms/AP
6. SoD är inte tillräckligt verkställd
7. payment lifecycle saknar partial settlement och partial reopen
8. OCR-baserad supplier resolution är för osäker
9. dokumentkedjan överdriver sin barriärstyrning
10. tolerance/runtime mismatch mellan hårdkodning och datamodell

## Repo Reality Vs Intended AP Model

- Är supplier masterdata tillräckligt korrekt och deduplicerbar för riktig AP-drift?  
  Nej.

- Är supplier tax status, payment blocks och counterparty-regler korrekt modellerade?  
  Partial reality.

- Är purchase orders och receipts verkligt användbara för matching och bokning?  
  Delvis ja.

- Är routing mellan expense, asset, inventory och project_material korrekt?  
  Nej.

- Är OCR/document intake verklig runtime, partial, fake-live eller stub?  
  Verklig runtime, men partial reality.

- Är document classification och review center verkligt styrande i AP-kedjan eller bara kosmetiska?  
  Verkliga, men inte tillräckligt verkställande eftersom direct ingest fortfarande finns.

- Är supplier invoice ingestion säker mot dubbla fakturor och felklassning över flera intake-kanaler?  
  Nej.

- Fungerar supplier credit notes korrekt?  
  Delvis i runtime, men inte mot verkligt DB-kontrakt.

- Fungerar two-way/three-way matching, tolerance profiles och variances korrekt?  
  Delvis, men för mycket är hårdkodat och quantity/date-varians är för grovt.

- Är approvals verkliga, SoD-säkra och auditbara?  
  Auditbara ja, SoD-säkra nej.

- Är fakturadatum, bokföringsdatum, förfallodatum, leverans-/mottagningsdatum och momsdatum korrekt hanterade?  
  Nej.

- Är posting och AP-open-items korrekta?  
  Nej, inte i DB-backed drift.

- Är payment preparation, payment lifecycle, settlement och reopen korrekta och spårbara?  
  Spårbara delvis, korrekta nej.

- Är invoice-to-ledger, input VAT, reverse charge och FX-broar korrekta där AP påverkar dem?  
  Partial reality.

- Är OCR-/AI-boundary kostnadseffektiv utan att correctness tappas?  
  Delvis, men OCR-baseline och autoacceptpolicy måste hårdnas.

- Är import- och migrationintag för leverantörer, PO och leverantörsfakturor säkert?  
  Delvis. Supplier/PO bättre än supplier invoices.

- Vilka brister i denna domän blockerar go-live?  
  Open-item-schema, readiness/payability, duplicate detection, target routing, date control, SoD, payment partiality och direct-ingest-barriären.

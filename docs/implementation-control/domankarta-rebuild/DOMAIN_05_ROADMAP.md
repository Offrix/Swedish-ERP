# DOMAIN_05_ROADMAP

Datum: 2026-04-02  
Domän: Accounts Payable, Supplier Invoices, Receipts, OCR Expense Intake

## mål

Göra leverantörsreskontran till en verklig svensk AP-kärna där leverantörer, PO, receipts, OCR, supplier invoices, kreditnotor, matching, attest, bokning, open items, betalningsförberedelse, bankutfall och reopen ger samma ekonomiska sanning i kod, databas, API och drift.

## varför domänen behövs

Denna domän bär verklig skuld, verklig ingående moms, verklig omvänd moms, verklig bankbetalning och verklig intern kontroll. Fel här läcker direkt till huvudbok, momsrapport, betalfil, leverantörsskulder och senare domäner.

## bindande tvärdomänsunderlag

- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger ingest, OCR, AI fallback, confidence, reviewkrav, duplicate-beslut, downstream owner och unknown-document blocking.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` äger partnerkontrakt, callbacks, signaturverifiering, duplicate control och command-path-only routing för externa adapterkedjor.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger AP-approvals, review evidence, sign-off, support reveal och break-glass lineage i denna domän.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger köparsidans AP-truth, momsutfall, open items, betalningar och AP-specialregler.
- `KVITTOFLODET_BINDANDE_SANNING.md` äger receipt-driven buyer truth och receipt-specific routing/bokföringsregler.

## faser

| Fas | Innehåll | Markering | Beroenden |
| --- | --- | --- | --- |
| Fas 5 | AP masterdata, documents, ingest, duplicate control, matching, approvals, posting, payment lifecycle, VAT/FX och migration | rewrite / harden / migrate / replace | Fas 1, Fas 2, Fas 3 |

## delfaser

### Delfas 5.1 Supplier Masterdata Hardening
- markeringar: harden, rewrite, migrate
- dependencies:
  - supplier identity policy
  - bankdetaljmodell
- vad som får köras parallellt:
  - delfas 5.4
- vad som inte får köras parallellt:
  - slutlig invoice migration
- konkreta ändringar:
  - canonical supplier identity med orgnr, VAT, bankrelation och importalias
  - block mot arkivering när öppen AP-risk finns
  - payment block release först efter verifierad bankändring
- konkreta verifikationer:
  - två leverantörer med samma orgnr ska blockeras eller landa i conflict queue
  - samma leverantör via import och manuell registrering ska få en canonical identitet eller en explicit konflikt
  - leverantör med öppen AP-post ska inte kunna arkiveras
- konkreta tester:
  - unit: supplier dedupe by org/VAT/bank
  - integration: import replay plus manual create conflict
  - integration: archive blocked by open item or active payment order
- konkreta kontroller vi måste kunna utföra:
  - lookup på `supplierNo`, orgnr, VAT och IBAN ska peka på samma canonical id
  - audit trail för bankändring -> payment block -> release

### Delfas 5.2 Purchase-Order / Receipt Hardening
- markeringar: harden, rewrite
- dependencies:
  - delfas 5.1
- vad som får köras parallellt:
  - delfas 5.3
- vad som inte får köras parallellt:
  - live receipt-import från extern källa
- konkreta ändringar:
  - PO skapas alltid i `draft`
  - receipt-idempotens och correction chain blir first-class
  - överleverans, receipt cancellation och quantity residual blir explicita
- konkreta verifikationer:
  - PO i `approved` vid create ska blockeras
  - samma receipt två gånger ska ge replay, inte ny business event
  - receipt över tolerans ska blockeras
- konkreta tester:
  - unit: PO create must force draft
  - unit: receipt replay and correction chain
  - integration: PO -> sent -> partial receipt -> complete receipt
- konkreta kontroller vi måste kunna utföra:
  - exakt ordered quantity, received quantity och remaining matchable quantity per PO-rad

### Delfas 5.3 Target-Type Routing Hardening
- markeringar: rewrite, replace
- dependencies:
  - delfas 5.2
  - downstream-ägare för asset/inventory/project_material
- vad som får köras parallellt:
  - delfas 5.5
- vad som inte får köras parallellt:
  - live användning av icke-`expense`-target types
- konkreta ändringar:
  - explicit routing för `expense`, `asset`, `inventory`, `project_material`
  - target type styr coding defaults, required dimensions, approval scope, posting recipe och downstream command
  - allt utanför `expense` blockerar hårt om downstream saknas
- konkreta verifikationer:
  - `asset` ska ge asset-handoff eller blocker
  - `inventory` ska ge inventory-handoff eller blocker
  - `project_material` ska kräva project binding
- konkreta tester:
  - integration: per target type distinct downstream result or blocker
  - unit: target type must not silently downgrade to expense
- konkreta kontroller vi måste kunna utföra:
  - fråga vilken downstream-path en viss PO/receipt-rad har och få deterministiskt svar

### Delfas 5.4 OCR / Document-Intake Hardening
- bindande underlag:
  - `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- markeringar: harden, rewrite
- dependencies:
  - dokumentversionering
  - provider capability manifest
- vad som får köras parallellt:
  - delfas 5.1
- vad som inte får köras parallellt:
  - go-live av automatisk AP-draft från dokument
- konkreta ändringar:
  - AP-kritiska fält får inte autopassa utan stark confidence och lineage
  - en enda bindande OCR-baseline mellan runbooks och runtime
  - kostnads-/kvalitetspolicy per dokumenttyp
- konkreta verifikationer:
  - låg confidence på leverantör eller totalbelopp ska ge review
  - OCR rerun ska skapa ny version, inte mutation
  - capability-manifest och runbooks måste peka på samma baseline
- konkreta tester:
  - unit: low confidence supplier -> review required
  - integration: OCR rerun version chain
  - contract test: provider manifest matches configured baseline
- konkreta kontroller vi måste kunna utföra:
  - visa originaldokument, OCR-run, extracted fields, corrected fields och slutlig AP-användning

### Delfas 5.5 Classification / Review / Import-Case Hardening
- bindande underlag:
  - `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- markeringar: keep, harden, rewrite
- dependencies:
  - review center contract
- vad som får köras parallellt:
  - delfas 5.3
- vad som inte får köras parallellt:
  - claims om mandatory apply-first utan faktisk runtime enforcement
- konkreta ändringar:
  - policy för när classification/review/import-case är obligatoriska
  - person-linked documents får inte kunna landa i vanlig AP utan godkänd handoff
  - import case blir precondition för definierade importscenarier
- konkreta verifikationer:
  - person-linked classification ska blockera AP-postning
  - import case med ofullständigt underlag ska blockera posting och payment
  - direct document ingest utan required classification/import case ska ge 409
- konkreta tester:
  - integration: classification approval through review center
  - integration: import case apply idempotency
  - integration: AP ingest without required classification/import blocked
- konkreta kontroller vi måste kunna utföra:
  - på varje AP-faktura kunna se vilka classification/import/review-objekt som faktiskt styr den

### Delfas 5.6 Supplier-Invoice-Ingest And Multi-Channel Duplicate Hardening
- bindande underlag:
  - `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- markeringar: rewrite, migrate
- dependencies:
  - delfas 5.1
  - dokumentlineage
- vad som får köras parallellt:
  - delfas 5.7
- vad som inte får köras parallellt:
  - invoice migration cutover
- konkreta ändringar:
  - hård duplicate-policy över OCR/inbox, manuell registrering, migration, partner/API, Peppol och omkörda dokument
  - säker leverantörsupplösning utan fri fuzzy-autoaccept
  - explicit kanalmodell
- konkreta verifikationer:
  - samma faktura via `documentId` och manuell body ska blockeras som duplicate
  - samma faktura via annan OCR-run med annat `documentHash` ska också blockeras
  - tvetydig OCR-counterparty ska gå till review
- konkreta tester:
  - integration: duplicate across `ocr_inbox` + `api`
  - integration: duplicate across `migration` + `peppol`
  - unit: ambiguous supplier name -> manual resolution required
- konkreta kontroller vi måste kunna utföra:
  - duplicate decision med hard key, soft key, matched invoice id och blocker reason

### Delfas 5.7 Credit-Note Hardening
- markeringar: rewrite, migrate
- dependencies:
  - signed open-item- eller separat credit-balance-policy
- vad som får köras parallellt:
  - delfas 5.6
- vad som inte får köras parallellt:
  - öppning av live supplier credits i gammalt schema
- konkreta ändringar:
  - entydig credit note-modell
  - originalfakturalänk eller explicit policy för orelaterade credits
  - schema som stöder vald modell
- konkreta verifikationer:
  - linked credit note ska posta och persistera utan schemafel
  - payment readiness/payability för credit note ska vara explicit
  - credit note får inte kunna exporteras i payment proposal
- konkreta tester:
  - integration: linked credit note posting plus DB persistence
  - integration: unlinked credit note allowed/blocked by policy
  - unit: readiness/payability matrix för credit note
- konkreta kontroller vi måste kunna utföra:
  - original invoice, credit note och nettoeffekt på liability/open items

### Delfas 5.8 Matching / Tolerance / Variance Hardening
- markeringar: rewrite
- dependencies:
  - delfas 5.2
- vad som får köras parallellt:
  - delfas 5.10
- vad som inte får köras parallellt:
  - aktivering av företagsspecifika tolerance profiles i UI om runtime fortfarande är hårdkodad
- konkreta ändringar:
  - tolerance profiles blir persistenta och effective-dated
  - quantity, price, total, reference och date variance blir verkliga variansobjekt
  - variance state machine med resolution, approval och reclose
- konkreta verifikationer:
  - ändrad tolerance profile i data ska ändra matchresultat utan kodändring
  - quantity inom tolerans ska passera, utanför tolerans ska blockera
  - date variance ska uppstå när fakturadatum strider mot tillåten period
- konkreta tester:
  - unit: tolerance profile loaded from repository
  - integration: price + quantity + date variance combinations
  - integration: variance close/reopen audit trail
- konkreta kontroller vi måste kunna utföra:
  - för varje variance se expected, actual, tolerance, resolution och approver

### Delfas 5.9 Approval / SoD Hardening
- markeringar: harden, rewrite
- dependencies:
  - org-auth roles och approval chain-kontrakt
- vad som får köras parallellt:
  - delfas 5.10
- vad som inte får köras parallellt:
  - live betalexport
- konkreta ändringar:
  - separat policy för preparer, approver, payment exporter, payment releaser och exception approver
  - riskklass, belopp och leverantörstyp ska höja antal steg
  - dual control för override
- konkreta verifikationer:
  - samma användare får inte skapa, slutattestera och exportera samma betalning
  - högriskleverantör eller högt belopp ska ge extra steg
  - obehörig roll ska nekas nästa steg
- konkreta tester:
  - integration: self-approval forbidden
  - integration: creator cannot approve final step
  - integration: payment exporter cannot be same actor as creator under configured policy
- konkreta kontroller vi måste kunna utföra:
  - full attestkedja med actor, role, delegation, override och reason code

### Delfas 5.10 Date-Control Hardening
- markeringar: rewrite
- dependencies:
  - VAT/date policy
- vad som får köras parallellt:
  - delfas 5.8
- vad som inte får köras parallellt:
  - momsperiodslåsning eller period close på live data
- konkreta ändringar:
  - separata datumfält för `invoiceDate`, `postingDate`, `deliveryDate`, `taxPointDate`, `dueDate`, `receiptDate`, `paymentBookedOn`, `customsDate`, `fxRateDate`
  - explicit rate-date policy
  - explicit tax-point policy
- konkreta verifikationer:
  - fakturadatum, leveransdatum och tax point ska kunna skilja sig och påverka VAT decision
  - booking date ska kunna avvika från invoice date utan overwrite
  - payment booked date ska styra cash-method recognition
- konkreta tester:
  - unit: VAT decision input uses explicit tax point date
  - integration: import goods with customs/tax date not equal to invoice date
  - integration: cash method settlement date vs invoice date
- konkreta kontroller vi måste kunna utföra:
  - för en given faktura kunna svara vilket datum som styr bokning, moms, förfallo, FX och importmoms

### Delfas 5.11 Posting / Open-Item / Payment-Preparation Hardening
- markeringar: rewrite, migrate
- dependencies:
  - open-item-modell
  - credit-note policy
- vad som får köras parallellt:
  - delfas 5.13
- vad som inte får köras parallellt:
  - live AP-postning i gammalt schema
- konkreta ändringar:
  - ett enda schema/runtime-kontrakt för AP open items
  - signed credit-stöd eller separat credit-balance-stöd
  - payment-preparation uttrycker readiness och payability utan semantiska krockar
- konkreta verifikationer:
  - standardfaktura ska skapa persistenta open-item-data utan schemafel
  - credit note ska skapa persistenta liability/credit-data utan schemafel
  - `reserved` ska vara giltig status om reservation används
- konkreta tester:
  - migration test: clean DB -> migrate -> post invoice -> reserve -> settle -> return
  - integration: readiness/payability matrix
  - regression: no stale payment hold after supplier block release
- konkreta kontroller vi måste kunna utföra:
  - för ett open item visa original, open, reserved, paid, payability, status och audit trail

### Delfas 5.12 Payment-Lifecycle / Settlement / Reopen Hardening
- markeringar: rewrite
- dependencies:
  - delfas 5.11
  - banking rail contract
- vad som får köras parallellt:
  - delfas 5.15
- vad som inte får köras parallellt:
  - live betalfilsexport
- konkreta ändringar:
  - partial reserve
  - partial settle
  - reject/return/reopen på delbelopp
  - supplier refund/overpayment-stöd
- konkreta verifikationer:
  - betala 60 % av fakturan och visa kvarvarande 40 % skuld
  - returnera 20 % av tidigare bokad betalning och visa exakt återöppnat residualbelopp
  - överbetalning ska skapa hanterbar supplier credit/refund path
- konkreta tester:
  - integration: partial payment and partial return
  - integration: rejected cash-method payment path must not crash
  - integration: supplier refund allocation
- konkreta kontroller vi måste kunna utföra:
  - hur stor del av en faktura som är reserverad, skickad, bokad, returnerad och återöppnad

### Delfas 5.13 Ledger / VAT / FX Bridge Hardening
- markeringar: harden, rewrite
- dependencies:
  - delfas 5.10
  - target-type policy
- vad som får köras parallellt:
  - delfas 5.11
- vad som inte får köras parallellt:
  - live momsrapportering
- konkreta ändringar:
  - policybaserad account mapping
  - korrekt reverse charge, import VAT, byggmoms, avdragsbegränsning och FX
  - explicit source-of-truth per AP-event
- konkreta verifikationer:
  - EU goods, EU services, non-EU services, import goods och domestic invoices ger rätt VAT decision
  - import från land utanför EU kräver importunderlag/import case där policy kräver det
  - realized FX vid settlement bokas utan att förvanska liability residual
- konkreta tester:
  - scenario tests för svenska, EU- och icke-EU-inköp
  - credit note with reverse charge
  - FX tests with different settlement rate
- konkreta kontroller vi måste kunna utföra:
  - för varje AP-rad visa journal lines, VAT decision, deklarationsfält, konto och rate source

### Delfas 5.14 AI-Boundary Cost / Correctness Hardening
- markeringar: keep, harden
- dependencies:
  - review center policy
- vad som får köras parallellt:
  - delfas 5.4
- vad som inte får köras parallellt:
  - breddning av AI-autoaccept i AP
- konkreta ändringar:
  - AI får bara ge förslag, inte bokföringssanning utan verifierad policy
  - tenant kill switch
  - kostnadsbudget per dokumenttyp
- konkreta verifikationer:
  - AI-genererat posting suggestion med personimpact ska alltid ge review och `safeToPost=false`
  - tenant kill switch ska stänga AI-klassning utan att stoppa AP-kärnan
  - AP-kritiska dokument ska kunna köras korrekt helt utan AI
- konkreta tester:
  - integration: AI boundary review creation
  - integration: tenant kill switch
  - cost test: no provider call when deterministic rule is enough
- konkreta kontroller vi måste kunna utföra:
  - när AI anropades, varför, vilken modell/version och vilket mänskligt beslut som följde

### Delfas 5.15 Migration / Import-Intake Hardening
- markeringar: harden, rewrite, migrate
- dependencies:
  - source channel taxonomy
  - supplier/invoice/open-item-modell
- vad som får köras parallellt:
  - delfas 5.12
- vad som inte får köras parallellt:
  - final cutover
- konkreta ändringar:
  - separata migration/intake-kanaler
  - batch-idempotens för supplier invoices
  - parallel run och diff på skuld, moms och payment readiness
- konkreta verifikationer:
  - replay av samma invoice migration batch får inte skapa nya supplier invoices
  - diff mellan källsystem och mål ska inkludera open amount, due date, credit state, payment hold, VAT och FX
  - cutover rehearsal ska kunna återköras utan dubbletter
- konkreta tester:
  - migration test: import suppliers, PO, invoices, credits och open items
  - parallel-run test: source vs target AP aging and liability diff
  - reconciliation test: payment-ready subset identical after import
- konkreta kontroller vi måste kunna utföra:
  - för varje migrerad faktura kunna visa source snapshot, target object id, duplicate decision, ledger/open-item diff och sign-off

## dependencies

1. ledger chart och dimensionskatalog måste vara låsta
2. VAT-plattformens `VatDecision`-kontrakt måste vara låst före AP-VAT-hardening
3. org-auth/approval chain-kontrakt måste vara låst före SoD-hardening
4. documents/classification/import-case-kontrakt måste vara låsta före AP-document-barrier-hardening
5. databaskontraktet för `supplier_invoices`, `ap_supplier_invoice_lines` och `ap_open_items` måste skrivas om innan go-live

## vad som får köras parallellt

- delfas 5.1 och 5.4 kan köras parallellt
- delfas 5.2 och 5.3 kan köras parallellt
- delfas 5.14 kan köras parallellt med övriga dokumentfaser
- delfas 5.15 kan börja i design och testdata innan slutlig schemaomskrivning är klar

## vad som inte får köras parallellt

- delfas 5.11 med live AP-postning i gammalt schema
- delfas 5.12 med live betalfilsexport
- delfas 5.13 med live moms- eller bokslutsleverans
- delfas 5.6 med migrationscutover för supplier invoices
- delfas 5.7 med gammalt credit/open-item-schema i live

## exit gates

- inget känt schema/runtime-gap mellan AP-kod och DB kvarstår
- standardfaktura, linked credit note, reservation, settlement, reject och return kan köras på ren DB utan constraint-fel
- duplicate policy blockerar verkliga dubbletter över alla definierade kanaler
- target-type routing ger verklig downstream-effekt eller hård blocker
- SoD-policy är verkställd i runtime
- VAT/FX/date-policy är scenarioverifierad mot svenska officiella regler
- parallel-run diff mot källsystem visar noll oförklarade differenser för skuld, moms och betalstatus

## test gates

- unit-test för varje modellinvariant
- integration-test för varje route och schemaövergång
- migration-test på ren databas
- replay-/idempotens-test för OCR, import, payment events och credit notes
- golden scenarios för domestic invoice, EU goods, EU services, non-EU services, import goods, linked credit note, partial payment, returned payment och reopened item

## AP gates

- supplier dedupe bevisad
- invoice duplicate hard block bevisad
- PO/receipt-to-invoice match bevisad
- approval chain + SoD bevisad
- posted invoice -> open item -> payment prep -> payment order -> settlement -> reopen bevisad

## OCR/review gates

- AP-kritiska dokument med låg confidence autopassas aldrig
- classification/import-review är obligatorisk när policy kräver det
- person-linked eller regulated treatment blockerar AP korrekt

## routing/date/matching/approval gates

- target-type routing är deterministisk
- tax point, invoice, delivery, posting, due och customs dates är separata och verifierade
- tolerance profiles kommer från data, inte hårdkodad konstant
- approval steps är policy-styrda och segregation of duties verkställs

## posting/open-item/payment gates

- signed credit/open-item policy är låst och testad
- `reserved`, `partially_paid`, `paid`, `returned`, `reopened` eller motsvarande tillstånd är samstämmiga i runtime och DB
- payment preparation uttrycker readiness och payability utan semantiska krockar
- partial payment stöds

## FX/VAT bridge gates

- EU-goods, EU-services, non-EU-services, import-goods och domestic invoices ger korrekt VAT decision, journal lines och open item
- rate source för foreign currency är auditbar
- realized FX vid settlement/reopen är korrekt och reproducerbar

## markeringar: keep / harden / rewrite / replace / migrate / archive / remove

- keep: beteendet är verkligt och ska bevaras
- harden: beteendet finns men kräver hårdare constraints, bevis eller policy
- rewrite: modellen finns men är fel arkitekterad för go-live
- replace: nuvarande lösning ska ersättas av ny modell
- migrate: data/state måste flyttas från gammal modell till ny
- archive: gamla runbooks och dokument avförs som bindande sanning men sparas som historik
- remove: dead code eller falsk modell ska tas bort när ersättningen finns

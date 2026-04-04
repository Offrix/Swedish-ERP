# DOMAIN_05_IMPLEMENTATION_LIBRARY

Datum: 2026-04-02  
Domän: Accounts Payable, Supplier Invoices, Receipts, OCR Expense Intake

## mål

Detta dokument definierar targetmodellen för svensk leverantörsreskontra. Vem som helst ska kunna öppna dokumentet och förstå exakt vad som ska byggas i AP-kärnan, hur objekten ska hänga ihop och vilka regler som blockerar felaktig bokföring, fel moms, fel skuld och fel betalning.

## bindande tvärdomänsunderlag

- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger dokumentingest, OCR, AI fallback, confidence, duplicate detection, reviewkrav och downstream routing fram till att AP får ta över.
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` äger partnerkontrakt, callbacks, signaturverifiering, duplicate control och command-path-only routing för externa adapterkedjor i denna domän.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger approvals, evidence bundles, sign-off och support reveal för AP, kvitto och review-rotter i denna domän.
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md` äger all slutlig AP-, moms- och open-item-sanning.
- `KVITTOFLODET_BINDANDE_SANNING.md` äger alla receipt-driven gransdragningar som inte får tryckas in i AP.

## Fas 5

### Delfas 5.1 Supplier Masterdata Hardening

- bygg `Supplier`, `SupplierIdentity`, `SupplierImportAlias`, `SupplierBankRelation`, `SupplierStatusRecord`
- commands: `CreateSupplier`, `MergeSupplierIdentity`, `BlockSupplierPayments`, `ReleaseSupplierPaymentBlock`, `ArchiveSupplier`
- invariants:
  - `supplierNo` är intern sekvens, inte canonical identity
  - orgnr, VAT, bankrelation och importalias måste konflikttestas
  - leverantör får inte arkiveras med öppna AP-open-items, icke-voidade fakturor eller aktiva betalordrar
- valideringar:
  - bankändring sätter payment block tills verifierad release
  - counterparty type och tax profile måste vara explicit och spårbar
- audit/evidence:
  - bankändringsreceipt, blockeringsorsak, approval chain och impacted object counts
- tester:
  - supplier dedupe on org/VAT/bank
  - archive blocked by AP exposure

### Delfas 5.2 Purchase-Order / Receipt Hardening

- bygg `PurchaseOrder`, `PurchaseOrderLine`, `ReceiptEvent`, `ReceiptCorrection`
- commands: `CreatePurchaseOrder`, `ApprovePurchaseOrder`, `RegisterReceipt`, `CorrectReceipt`
- invariants:
  - ny PO skapas alltid i `draft`
  - receipt är immutable event och correction sker via ny eventkedja
  - cumulative receipt får inte överskrida tolerans
- valideringar:
  - ordered quantity, received quantity och remaining matchable quantity ska vara deterministiska
- tester:
  - PO create forces draft
  - receipt replay is idempotent
  - overdelivery beyond tolerance blocked

### Delfas 5.3 Target-Type Routing Hardening

- bygg `ReceiptTargetRoute` och `PostingTargetProfile`
- target types: `expense`, `asset`, `inventory`, `project_material`
- invariants:
  - target type får aldrig bara vara etikett
  - target type måste styra coding defaults, dimensions, approval scope, posting recipe och downstream command
  - om downstream saknas ska AP blockera, inte tyst nedgradera till `expense`
- routes/API:
  - target routing får bara gå genom explicit route resolver, inte via fri text
- tester:
  - per target type distinct downstream result or blocker

### Delfas 5.4 OCR / Document-Intake Hardening

- bygg `Document`, `DocumentVersion`, `OcrRun`, `ExtractionProjection`, `FieldLineage`, `ReviewTask`
- invariants:
  - originaldokument är evidence
  - OCR får aldrig bli bokföringssanning utan explicit accept eller deterministisk policy
  - varje omkörning skapar ny version
  - leverantör, total, valuta, fakturanummer, datum och line items får inte autoaccepteras på svag signal
- valideringar:
  - capability-manifest och runtime-baseline måste matcha
  - låg confidence på AP-kritiska fält => review required
- tester:
  - OCR rerun version chain
  - low confidence supplier/total -> review required

### Delfas 5.5 Classification / Review / Import-Case Hardening

- bygg `ClassificationCase`, `ReviewDecision`, `ImportCase`, `ImportApplyRecord`
- commands: `CreateClassificationCase`, `DecideClassificationCase`, `CreateImportCase`, `ApproveImportCase`, `ApplyImportCase`
- invariants:
  - person-linked document får inte passera till normal AP utan explicit handoff
  - import case måste vara `approved` och `applied` där policy kräver det
  - direct document ingest får bara vara tillåten när policy uttryckligen säger det
- audit/evidence:
  - review decision med queue code, actor, approver och applied effect
- tester:
  - required classification/import blocks AP ingest
  - import apply remains idempotent

### Delfas 5.6 Supplier-Invoice-Ingest And Multi-Channel Duplicate Hardening

- bygg `SupplierInvoice`, `SupplierInvoiceSourceSnapshot`, `DuplicateDecision`
- source channels:
  - `manual`
  - `ocr_inbox`
  - `email_attachment`
  - `peppol`
  - `partner_api`
  - `migration`
  - `import_repair`
- invariants:
  - tvetydig supplier match => review, aldrig fuzzy-autopass
  - hard duplicate får inte kräva samma `documentHash`
  - summary-line fallback får inte vara bokningsbar standardväg
- duplicate layers:
  - hard key över leverantörsidentitet, extern ref, datum, brutto/netto, valuta, credit-origin
  - soft signals för dokumentlikhet och OCR-likhet
- tester:
  - duplicate across channels blocked
  - ambiguous OCR counterparty requires manual resolution

### Delfas 5.7 Credit-Note Hardening

- bygg `SupplierCreditNote`, `ApCreditEffect`, `PayabilityRecord`
- invariants:
  - linked credit note måste ha original invoice reference eller explicit policy för orelaterad leverantörskredit
  - credit note får inte bli betalbar i payment proposal
  - runtime och DB måste stödja samma signed/open-item-modell eller separat credit-balance-objekt
- commands:
  - `CreateSupplierCreditNote`
  - `PostSupplierCreditNote`
  - `ApplySupplierCreditToLiability`
- tester:
  - linked credit note persists without schema error
  - readiness/payability för credit note explicit and stable

### Delfas 5.8 Matching / Tolerance / Variance Hardening

- bygg `ToleranceProfile`, `MatchDecision`, `VarianceRecord`, `VarianceResolution`
- matching modes:
  - `none`
  - `two_way`
  - `three_way`
- required variances:
  - `purchase_order_line_missing`
  - `price_variance`
  - `quantity_variance`
  - `receipt_variance`
  - `total_variance`
  - `coding_required`
  - `tax_review_required`
  - `date_variance`
  - `duplicate_review_required`
- invariants:
  - tolerance profiles är persistenta, effective-dated och bolagsspecifika
  - quantityTolerancePercent måste påverka matchresultatet i runtime
- tester:
  - tolerance from repository changes match result
  - variance close/reopen is audit-safe

### Delfas 5.9 Approval / SoD Hardening

- bygg `ApprovalPolicy`, `ApprovalStep`, `DutySeparationRule`, `OverrideApproval`
- duties:
  - preparer
  - approver
  - payment exporter
  - payment releaser
  - exception approver
- invariants:
  - samma person får inte vara preparer och final approver utan explicit dual control
  - samma person får inte vara creator och payment exporter under normal policy
  - riskklass, belopp och leverantörstyp måste kunna höja antal steg
- tester:
  - self-approval forbidden
  - creator cannot export same liability för payment under configured policy

### Delfas 5.10 Date-Control Hardening

- bygg explicit datumuppsättning:
  - `invoiceDate`
  - `postingDate`
  - `deliveryDate`
  - `taxPointDate`
  - `dueDate`
  - `receiptDate`
  - `paymentBookedOn`
  - `customsDate`
  - `fxRateDate`
- invariants:
  - inga styrande datum får kollapsas tyst
  - VAT decision ska använda policy-rätt datum
  - accounting method ska kunna välja recognition-policy utan att skriva över grunddatum
- tester:
  - VAT decision input uses explicit tax point date
  - import/customs date differs from invoice date correctly

### Delfas 5.11 Posting / Open-Item / Payment-Preparation Hardening

- bygg `ApOpenItem`, `ApPostingRecord`, `PaymentPreparationRecord`, `PayabilityRecord`
- rekommenderad statusmodell:
  - `open`
  - `reserved`
  - `partially_paid`
  - `paid`
  - `returned`
  - `reopened`
  - `closed`
- required fields:
  - `originalAmount`
  - `openAmount`
  - `reservedAmount`
  - `paidAmount`
  - `functionalOriginalAmount`
  - `functionalOpenAmount`
  - `functionalReservedAmount`
  - `functionalPaidAmount`
  - `paymentReadinessStatus`
  - `payabilityStatus`
- invariants:
  - runtime och DB måste tillåta samma tecken och statusar
  - credit notes måste kunna representeras utan schemafel
- tester:
  - clean DB migration then post/reserve/settle/return
  - readiness/payability matrix

### Delfas 5.12 Payment-Lifecycle / Settlement / Reopen Hardening

- bygg `PaymentProposal`, `PaymentOrder`, `SettlementEvent`, `ReturnEvent`, `SupplierCreditExposure`
- lifecycle:
  - `prepared -> approved -> exported -> submitted -> accepted -> partially_settled|settled -> returned|rejected|cancelled`
- invariants:
  - payment order amount kan vara delmängd av open amount
  - partial settlement minskar `openAmount` i stället för att nollställa allt
  - partial return öppnar residual skuld exakt på returbeloppet
  - supplier overpayment/refund måste ha egen path
- tester:
  - partial payment and partial return
  - rejected cash-method payment path must not crash

### Delfas 5.13 Ledger / VAT / FX Bridge Hardening

- bygg `ApJournalProjection`, `VatDecisionLink`, `FxRealizationRecord`
- invariants:
  - account mapping får inte vara hårdkodad på land enbart
  - goods/services måste vara explicit för utlandsflöden
  - import case/customs evidence måste kunna påverka VAT decision
  - invoice rate och settlement rate måste skiljas
- scenarier som måste stödjas:
  - Sverige domestic
  - varor från annat EU-land
  - tjänster från annat EU-land
  - tjänster från land utanför EU
  - import av varor från land utanför EU
  - byggmoms i Sverige
- tester:
  - scenario tests för each VAT path
  - FX tests för different settlement rates and partial settlement

### Delfas 5.14 AI-Boundary Cost / Correctness Hardening

- bygg `AiDecisionRecord`, `AiBudgetPolicy`, `AiKillSwitch`
- invariants:
  - AI får föreslå, inte besluta bokföringssanning
  - deterministiska regler ska användas före AI när de räcker
  - tenant kill switch måste kunna stänga AI utan att stoppa AP-kärnan
  - personimpact eller regulated treatment ska alltid skapa review
- tester:
  - AI suggestion safeToPost false
  - tenant kill switch
  - no provider call when deterministic rule suffices

### Delfas 5.15 Migration / Import-Intake Hardening

- bygg `MigrationBatch`, `SourceSnapshot`, `AppliedMapping`, `ParallelRunDiff`
- invariants:
  - supplier-, PO- och invoice migration ska vara idempotent på batch- och objektnivå
  - migrerad AP-post måste bära source snapshot och duplicate decision
  - parallel run måste mäta supplier balance, open amount, due date, payment hold/readiness, VAT och FX
- tester:
  - import suppliers + PO + invoices + credits + open items
  - parallel-run AP aging and liability diff
  - payment-ready subset identical after import

## vilka bevis som krävs innan något märks som leverantörsreskontramässigt korrekt eller production-ready

- ren databasmiljö kan migreras och köra standardfaktura, linked credit note, reserve, settle, reject och return utan schemafel
- multikanals-dubblettest passerar över OCR/inbox, manuell registrering, migration, partner/API och Peppol
- VAT-scenarier är verifierade mot officiella regler för Sverige, EU, icke-EU och import
- SoD-tester visar att otillåten self-approval och creator-to-payment-export blockeras
- target-type routing ger verklig downstream-effekt eller hård blocker
- parallel-run diff mot källsystem har noll oförklarade differenser på AP exposure

## vilka risker som kräver mänsklig flaggning

- tvetydig supplier match från OCR
- unlinked credit note utan explicit policy
- import case med ofullständigt tull- eller momsunderlag
- override av SoD-regel eller approval chain
- FX-avvikelse eller rate-source-konflikt
- schema/runtime-mismatch som ännu inte är migrerad bort

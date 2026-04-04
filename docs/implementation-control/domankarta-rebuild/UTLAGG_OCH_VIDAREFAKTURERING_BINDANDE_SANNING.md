# UTLÄGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela utläggs- och vidarefaktureringsflödet.

Detta dokument ska styra:
- anställds utlägg med egna medel för företagets räkning
- företagets skuld till anställd eller annan kravbar motpart för godkant utlägg
- reseforskott och ändra förhandsutbetalningar till anställd för senare avräkning
- utlägg för kunds räkning där kunden är verklig betalningsansvarig mot leverantören
- vidarefakturering av företagets egna inköp till kund
- gransen mellan:
  - utlägg
  - vidarefakturering
  - receipt-driven company cost
  - payroll/travel reimbursement
  - benefit/payroll route
  - owner/private route
- bokföring, reskontraeffekter, rapporteffekter, invoice handoff, replay, correction och audit för hela kedjan

Ingen kod, inget test, ingen route, ingen migration, ingen runbook och ingen AI-klassning får avvika från detta dokument utan att detta dokument skrivs om först.

## Syfte

Detta flöde är inte bara:
- skapa expense claim
- ersätta en anställd
- skicka vidare en kostnad till kund

Detta dokument är den bindande sanningen för:
- när en anställds betalning är företagets affärshandelse och inte privat konsumtion
- när en ersättning är skattefri återbetalning av utlägg och när den måste routas till lön eller förmån
- när en kostnad är företagets eget inköp och darfor ger vanlig kostnad och moms hos bolaget
- när en kostnad i stallet är ett verkligt utlägg för kunds räkning som ska ligga på avräkningskonto utan moms hos bolaget
- när en kostnad får vidarefaktureras som företagets egen omsattning med utgående moms
- vilka konton, clearingkedjor, verifikationsserier, reviewsteg och blockerregler som gäller
- hur invoice flow, receipt flow, payroll flow, benefit flow, bank flow och scenario proof måste spegla samma sanning

Läsaren ska kunna bygga hela utläggs- och vidarefaktureringskarnan utan att gissa:
- vem som är ekonomisk principal
- vem som är betalningsansvarig mot leverantören
- om moms får dras av
- om ersättningen är löneskattad eller inte
- om kunden ska faktureras utan moms eller med moms
- om bolaget ska boka kostnad eller kundfordran

## Omfattning

Detta dokument omfattar minst:
- anställds privata kort- eller kontantbetalning för företagets räkning
- owner- eller narstaenderelaterad betalning som krävs mot företaget
- cash-like och bank-like förhandsutbetalning till anställd
- reseforskott
- återbetalning av godkant utlägg
- avräkning mot reseforskott eller annat förhandsbelopp
- utlägg för kunds räkning där kunden är verklig betalningsansvarig
- återdebitering till kund av verkligt utlägg utan moms
- vidarefakturering av företagets eget inköp med normal momslogik
- split claims som innehåller:
  - företagets egen kostnad
  - kundutlägg
  - privat del
  - payroll-/benefitkanslig del
- asset-, inventory-, project_material- och travel-klassade utlägg
- utrikes valuta
- correction, duplicate, replay, rollback och migration

Detta dokument omfattar inte:
- vanlig leverantörsfaktura i bolagets namn
- company-card eller company-bank receipt som inte skapat skuld till anställd
- traktamente enligt schablon
- milersättning enligt schablon
- skattepliktiga eller skattefria bilersättningar
- lönearter, AGI eller payroll posting som slutlig sanning
- seller-side issue av kundfaktura
- full AP-open-item eller leverantörsbetalning

Kanonisk agarskapsregel:
- detta dokument äger sanningen när nagon annan an företaget tillfalligt lagt ut pengar men företaget eller kunden kan vara verklig principal
- `KVITTOFLODET_BINDANDE_SANNING.md` äger inte anstalldsfordran mot bolaget; det dokumentet får bara identifiera och routa hit
- `FAKTURAFLODET_BINDANDE_SANNING.md` äger inte klassningen mellan verkligt kundutlägg och vidarefakturering; invoice flow konsumerar klassningen från detta dokument
- `LONEFLODET_BINDANDE_SANNING.md`, `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` och `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` äger slutlig lön-/förmåns-/reseersättningssanning där detta dokument routar vidare

## Absoluta principer

- företagets eget inköp som senare tas ut av kund är inte automatiskt utlägg för kund
- verkligt utlägg för kund förutsatter att kunden är betalningsansvarig mot leverantören
- verkligt utlägg för kund får aldrig ge avdrag för ingående moms hos bolaget
- verkligt utlägg för kund får aldrig ge utgående moms hos bolaget när kunden ersätter exakt samma belopp utan vinstpalagg
- vidarefakturering av företagets eget inköp ska bokföras som företagets kostnad och företagets egen försäljning
- ersättning till anställd för verkligt utlägg för arbetsgivarens räkning är inte lön om utgiften är företagets och claimen är korrekt klassad
- om utgiften i stallet är privat, payrollkanslig eller förmånskanslig får den aldrig passera som neutral utläggsersättning
- utläggsflödet får aldrig skapa leverantörsreskontra eller AP-open-item
- utläggsflödet får aldrig skapa kundfaktura direkt; det skapar bara bindande handoff till invoice flow
- ett utlägg får aldrig bokas utan tydligt principalbeslut:
  - bolaget
  - kunden
  - payroll/benefit/travel downstream
  - privat/blocked
- ett claim med blandad principal får aldrig autopostas utan radsplit eller blocker
- owner- eller narstaendeclaim får aldrig passera som vanlig anställd claim utan explicit relationklassning
- reverse charge, importmoms, tull- eller annan avancerad kopsmoms får inte smygas genom detta flöde; de ska routas till AP-/momsflöden eller blockeras
- avräkning mot reseforskott får aldrig dolja att anställd fortfarande är skyldig bolaget eller att bolaget fortfarande är skyldigt anställd
- correction ska alltid ske via ny kedja, aldrig overwrite

## Bindande dokumenthierarki för utläggs- och vidarefaktureringsflödet

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument

Detta dokument lutar på:
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` för ingest, OCR, AI fallback, confidence, duplicate detection, reviewkrav och downstream routing fram till att outlay flow får ta över
- `KVITTOFLODET_BINDANDE_SANNING.md` för receipt quality, merchant data, receipt profile och buyer-side gransen mot company-paid receipts
- `FAKTURAFLODET_BINDANDE_SANNING.md` för seller-side invoice posting, utgående moms, kundfordran och distribution efter att detta dokument fattat principalt beslut mellan verkligt kundutlägg och vidarefakturering
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` för vouchers, serier, kontrollkonton, correction chains, period locks och SIE4-vouchertruth för outlay, reimbursement och reinvoice-ledger
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` för cutoff-logik när verkligt kundutlägg eller bolagets egen kostnad måste periodiseras över periodgranser
- kommande `LONEFLODET_BINDANDE_SANNING.md` för payroll-owned utbetalningar
- kommande `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md` för benefit-owned utfall
- kommande `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md` för schablonersättningar och travel-owned logik

Detta dokument får inte overstyras av:
- gamla expense-policyer
- gamla reserakningsrunbooks
- gamla OCR- eller reviewheuristiker
- gamla invoice-antäganden om att "utlägg" alltid är momsfritt
- gamla payrollantäganden om att all ersättning till anställd är lön

Fas 4, 5, 6, 10, 15, 18 och 27 får inte definiera avvikande outlay truth.

## Kanoniska objekt

- `ExpenseClaimRoot`
  - bar huvudtruth för ett utläggsarende
  - binder claimant, principalbeslut, totalsummor, valuta, reviewstatus, postingstatus och settlementstatus
  - är subledger- och auditrad men inte i sig huvudbokspost

- `ExpenseClaimLine`
  - bar varje affärshandelserad
  - innehåller merchant, datum, beskrivning, target type, principal, momsprofil, dimensioner och evidence refs
  - är ekonomiskt styrande

- `PrincipalRoleDecision`
  - bar bindande beslut om vem som ekonomiskt bar kostnaden:
    - `company_cost`
    - `customer_disbursement`
    - `company_purchase_to_reinvoice`
    - `payroll_or_benefit_route`
    - `owner_or_related_route`
    - `blocked_private_or_unknown`

- `ReimbursementEligibilityDecision`
  - bar bindande beslut om utbetalningen får ske som neutral ersättning, måste avräknas mot förskott eller måste routas vidare

- `ExpenseEvidenceBundle`
  - bar ursprungsunderlag, betalningsbevis, lineage, reviewbeslut och eventuell customer-link
  - är audit- och retentionkritiskt

- `EmployeeReimbursementLiability`
  - bar bolagets skuld till anställd för godkant utlägg
  - är subledger- och huvudboksskapande via kortfristig skuld till anställd

- `EmployeeAdvanceLedger`
  - bar förhandsutbetalningar till anställd:
    - reseforskott
    - kassa-/ändra förskott
  - är balanspost som senare måste avräknas

- `CustomerDisbursementReceivable`
  - bar bolagets avräkningsfordran för verkligt utlägg för kunds räkning
  - är huvudboksskapande men aldrig intäktsskapande

- `ReinvoiceLink`
  - bar bindande länken mellan outlay flow och invoice flow
  - uttrycker om handoff ska vara:
    - `disbursement_no_vat`
    - `reinvoice_with_vat`
    - `blocked`

- `ExpenseClaimCorrection`
  - bar reversering, omklassning, makulering eller efterkorrigering
  - får aldrig skrivas över

- `OutlaySettlementReceipt`
  - bar bevis om att skulden eller fordran reglerats:
    - employee reimbursement paid
    - advance offset
    - customer disbursement recovered

- `OwnerRelatedPayableDecision`
  - bar relationklassning när claimant inte är vanlig anställd
  - skiljer `employee`, `owner_employee`, `owner_non_employee`, `related_person`, `blocked`

- `TravelOrPayrollHandoffDecision`
  - bar bindande routing mot:
    - payroll
    - benefits
    - travel

## Kanoniska state machines

### `ExpenseClaimRoot`

- `draft`
- `submitted`
- `classified`
- `review_pending`
- `approved`
- `posted`
- `payment_ready`
- `partially_settled`
- `fully_settled`
- `corrected`
- `blocked`
- `closed`

### `PrincipalRoleDecision`

- `pending`
- `company_cost`
- `customer_disbursement`
- `company_purchase_to_reinvoice`
- `payroll_or_benefit_route`
- `owner_or_related_route`
- `blocked_unknown`

### `ReimbursementEligibilityDecision`

- `pending`
- `reimbursable`
- `offset_against_advance`
- `route_to_payroll`
- `route_to_benefit`
- `route_to_owner`
- `blocked`

### `EmployeeReimbursementLiability`

- `pending`
- `recognized`
- `scheduled`
- `partially_paid`
- `fully_paid`
- `reversed`
- `closed`

### `EmployeeAdvanceLedger`

- `issued`
- `partially_applied`
- `fully_applied`
- `employee_owes_return`
- `returned`
- `closed`

### `ReinvoiceLink`

- `pending`
- `ready_for_invoice_handoff`
- `handed_off`
- `invoiced`
- `cleared`
- `blocked`

## Kanoniska commands

- `CreateExpenseClaimDraft`
- `SubmitExpenseClaim`
- `ClassifyExpenseClaimPrincipal`
- `ClassifyExpenseClaimTargetType`
- `ApproveExpenseClaim`
- `RejectExpenseClaim`
- `RecognizeEmployeeReimbursementLiability`
- `IssueEmployeeAdvance`
- `ApplyExpenseClaimAgainstAdvance`
- `RecordEmployeeAdvanceReturn`
- `CreateCustomerDisbursementReceivable`
- `CreateReinvoiceHandoff`
- `SettleEmployeeReimbursement`
- `RecordCustomerDisbursementRecovery`
- `CorrectExpenseClaim`
- `RouteExpenseClaimToPayroll`
- `RouteExpenseClaimToBenefits`
- `RouteExpenseClaimToTravel`
- `RouteExpenseClaimToOwnerRelated`

## Kanoniska events

- `expense.claim.created`
- `expense.claim.submitted`
- `expense.claim.principal_classified`
- `expense.claim.target_classified`
- `expense.claim.approved`
- `expense.claim.rejected`
- `expense.liability.recognized`
- `expense.advance.issued`
- `expense.advance.applied`
- `expense.advance.returned`
- `expense.customer_disbursement.recognized`
- `expense.reinvoice.handoff_created`
- `expense.reimbursement.paid`
- `expense.customer_disbursement.recovered`
- `expense.claim.corrected`
- `expense.claim.routed_to_payroll`
- `expense.claim.routed_to_benefits`
- `expense.claim.routed_to_travel`
- `expense.claim.routed_to_owner_related`

## Kanoniska route-familjer

- `/v1/expense-claims/*`
- `/v1/expense-claims/review/*`
- `/v1/expense-claims/advances/*`
- `/v1/expense-claims/reimbursements/*`
- `/v1/expense-claims/reinvoice-handoffs/*`
- `/v1/expense-claims/corrections/*`

Rutter som uttryckligen inte får skriva legal truth har:
- scanning- och OCR-rutter
- invoice issue-rutter
- payroll issue-rutter
- bank settlement-rutter utan bindande `OutlaySettlementReceipt`

## Kanoniska permissions och review boundaries

- `expense_claimant.submit`
- `expense_manager.review`
- `expense_finance.classify`
- `expense_finance.approve`
- `expense_payment.prepare`
- `expense_payment.release`
- `expense_owner_route.review`
- `expense_payroll_route.review`
- `expense_invoice_handoff.review`
- `expense_audit.read`

Hårda review boundaries:
- samma person får inte vara claimant och final approver utan explicit dual control
- samma person får inte skapa, godkänna och frislappa employee reimbursement payment i samma kedja
- owner- eller narstaendeclaim kraver högre review an vanlig employee claim
- principalbyte mellan `customer_disbursement` och `company_purchase_to_reinvoice` är high-risk override
- route till payroll, benefits eller owner-related måste vara sparbar och granskningsbar

## Nummer-, serie-, referens- och identitetsregler

- varje claim måste ha globalt unikt `expenseClaimId`
- varje rad måste ha unikt `expenseClaimLineId`
- varje förskott måste ha unikt `advanceId`
- varje reimbursement payment måste ha unikt `reimbursementReceiptId`
- varje kundutlägg måste ha unikt `customerDisbursementId`
- varje invoice handoff måste ha unikt `reinvoiceLinkId`
- originalkvitto, faktura eller annat underlag måste behalla scanninglagrets `documentEnvelopeId` och `originalBinaryCaptureId`
- samma underlag får inte skapa flera claims utan duplicate decision eller explicit split decision
- claimet måste bara kunna referera till ett av följande claimant scopes:
  - `employee`
  - `owner_employee`
  - `owner_non_employee`
  - `related_person`

## Valuta-, avrundnings- och omräkningsregler

- all huvudbokseffekt måste lagras i SEK
- claimets originalvaluta måste bevaras per rad
- transaktionsdatumets valutakurs måste vara explicit `fxRateDate`
- om reimbursement sker i annan kurs an initial recognition måste valutadifferens på skuld bokas explicit
- verkligt kundutlägg för kunds räkning ska återkravas i samma juridiska belopp som betalats, inte med dold kursmarginal
- avrundningsdifferenser får aldrig gommas i kostnad eller moms; de måste vara explicita

## Replay-, correction-, recovery- och cutover-regler

- duplicate claim med identiskt underlag får aldrig skapa ny skuld eller ny kundfordran
- replay av godkant claim får ge samma utfall, inte ny utbetalning
- correction ska alltid skapa ny correctionskedja, aldrig mutation av ursprunglig claim
- migration måste bevara:
  - principalroll
  - reimbursement liability/open status
  - advance balance
  - customer disbursement open status
  - invoice handoff status
- cutover får inte gröna om öppna claims, förskott eller kundutlägg inte balanserar mot huvudboken

## Huvudflödet

1. dokumentet tas emot via scanninglagret
2. scanninglagret klassar dokumentfamilj, confidence, duplicate och downstream owner
3. outlay flow tar över bara om downstream owner eller review pekar hit
4. principalbeslut fattas:
   - bolagets kostnad
   - kundutlägg
   - bolagets eget inköp som ska vidarefaktureras
   - payroll/benefit/travel route
   - owner/private block
5. target type faststalls:
   - expense
   - asset
   - inventory
   - project_material
   - travel_actual_cost
6. moms- och avdragsrätt klassas
7. liability eller advance offset bokas
8. vid behov skapas invoice handoff:
   - utan moms för verkligt kundutlägg
   - med moms för vidarefakturering av eget inköp
9. reimbursement eller annan settlement sker
10. correction, duplicate, replay eller migration hanteras utan dubbelsanning

## Bindande scenarioaxlar

- claimant relation:
  - employee
  - owner_employee
  - owner_non_employee
  - related_person
- economic principal:
  - company
  - customer
  - payroll_or_benefit
  - private_or_unknown
- source document profile:
  - simplified_receipt
  - full_invoice
  - payment_proof_only
  - mixed_bundle
- cost target:
  - expense
  - asset
  - inventory
  - project_material
  - travel_actual_cost
- VAT outcome:
  - deductible_25
  - deductible_12
  - deductible_6
  - non_deductible
  - no_swedish_vat_deduction
  - blocked_special_vat
- settlement outcome:
  - employee_reimbursement
  - advance_offset
  - customer_recovery
  - blocked
- customer invoice mode:
  - no_customer_invoice
  - disbursement_no_vat
  - reinvoice_with_vat
  - blocked
- currency:
  - SEK
  - foreign
- correction mode:
  - none
  - duplicate
  - post_approval_correction
  - post_payment_reversal

## Bindande policykartor

### Bindande principalroll-karta

- `OUT-ROL001` bolagets egen kostnad
- `OUT-ROL002` verkligt kundutlägg
- `OUT-ROL003` bolagets eget inköp som ska vidarefaktureras
- `OUT-ROL004` payroll-/benefit-/travel-route
- `OUT-ROL005` owner-/related-route
- `OUT-ROL006` blocked_private_or_unknown

### Bindande target-type-karta

- `OUT-TGT001` expense
- `OUT-TGT002` asset
- `OUT-TGT003` inventory
- `OUT-TGT004` project_material
- `OUT-TGT005` travel_actual_cost
- `OUT-TGT006` blocked

### Bindande canonical kontokarta

- `OUT-ACC001` `1681` utlägg för kunder
- `OUT-ACC002` `1611` reseforskott
- `OUT-ACC003` `1613` övriga förskott till anställda
- `OUT-ACC004` `1619` övriga kortfristiga fordringar hos anställda
- `OUT-ACC005` `2822` reserakningar; canonical standardkonto för godkända anstalldsclaims i detta flöde
- `OUT-ACC006` `2829` endast om explicit produktpolicy kraver annan kortfristig skuld till anställd an `2822`
- `OUT-ACC007` `2893` skuld till narstaende personer, kortfristig del; owner-/related-route
- `OUT-ACC008` `2641` ingående moms, avdragsgill
- `OUT-ACC009` `1930` företagskonto/bank
- `OUT-ACC010` `3550` fakturerade resekostnader
- `OUT-ACC011` `3590` övriga fakturerade kostnader
- `OUT-ACC012` `1510` kundfordringar; seller-side invoice handoff
- `OUT-ACC013` `2611` utgående moms 25
- `OUT-ACC014` `2612` utgående moms 12
- `OUT-ACC015` `2613` utgående moms 6
- `OUT-ACC016` `8431` valutakursvinster på skulder
- `OUT-ACC017` `8436` valutakursförluster på skulder

### Bindande invoice-handoff-karta

- `OUT-INV001` verkligt kundutlägg -> invoice handoff `disbursement_no_vat`
- `OUT-INV002` bolagets eget inköp vidarefaktureras som resekostnad -> invoice handoff `reinvoice_with_vat` + `3550`
- `OUT-INV003` bolagets eget inköp vidarefaktureras som övrig fakturerad kostnad -> invoice handoff `reinvoice_with_vat` + `3590`
- `OUT-INV004` bolagets eget inköp integrerat i huvudtjänst -> invoice handoff till revenue class i `FAKTURAFLODET_BINDANDE_SANNING.md`

### Bindande downstream-owner-karta

- `OUT-DWN001` stannar i utläggsflödet
- `OUT-DWN002` invoice flow
- `OUT-DWN003` payroll flow
- `OUT-DWN004` benefit flow
- `OUT-DWN005` travel flow
- `OUT-DWN006` owner-related flow
- `OUT-DWN007` blocked

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### `UTL-P0001` anställdsutlägg, bolagets egen kostnad, 25 procent avdragsgill moms

- debet kostnadskonto enligt target type, netto
- debet `2641` moms
- kredit `2822`

### `UTL-P0002` anställdsutlägg, bolagets egen kostnad, 12 procent avdragsgill moms

- debet kostnadskonto enligt target type, netto
- debet `2641`
- kredit `2822`

### `UTL-P0003` anställdsutlägg, bolagets egen kostnad, 6 procent avdragsgill moms

- debet kostnadskonto enligt target type, netto
- debet `2641`
- kredit `2822`

### `UTL-P0004` anställdsutlägg, bolagets egen kostnad, ingen avdragsrätt

- debet kostnadskonto enligt target type, brutto
- ingen momsfordran
- kredit `2822`

### `UTL-P0005` anställdsutlägg, tillgangsinköp

- debet `12xx` eller annat canonical assetkonto
- debet `2641` om avdragsrätt finns
- annars brutto på tillgangen
- kredit `2822`

### `UTL-P0006` anställdsutlägg, lager eller project material

- debet `14xx` eller canonical material/project targetkonto
- debet `2641` om avdragsrätt finns
- kredit `2822`

### `UTL-P0007` verkligt kundutlägg betalt av anställd

- debet `1681` med brutto
- ingen `2641`
- kredit `2822`

### `UTL-P0008` verkligt kundutlägg betalt direkt av bolaget

- debet `1681` med brutto
- ingen `2641`
- kredit `1930` eller relevant betalmedelskonto

### `UTL-P0009` ersättning till anställd för godkant claim

- debet `2822`
- kredit `1930`

### `UTL-P0010` owner- eller narstaenderelaterat operativt utlägg

- debet kostnad/tillgang/1681 enligt principal
- debet `2641` endast om avdragsrätt finns
- kredit `2893`

### `UTL-P0011` verkligt kundutlägg återkravs av kund utan moms

- cross-flow handoff till invoice flow:
  - debet `1510`
  - kredit `1681`
- ingen utgående moms

### `UTL-P0012` bolagets eget inköp vidarefaktureras som resekostnad

- purchase side i detta dokument:
  - debet kostnad
  - debet `2641` om avdragsrätt finns
  - kredit `2822` eller `1930`
- seller-side handoff till invoice flow:
  - debet `1510`
  - kredit `3550`
  - kredit `261x` enligt momssats

### `UTL-P0013` bolagets eget inköp vidarefaktureras som övrig fakturerad kostnad

- purchase side i detta dokument:
  - debet kostnad
  - debet `2641` om avdragsrätt finns
- kredit `2822` eller `1930`
- seller-side handoff till invoice flow:
  - debet `1510`
  - kredit `3590`
  - kredit `261x` enligt momssats

### `UTL-P0014` blandat claim: bolagets egen kostnad + verkligt kundutlägg

- splitposting är obligatorisk:
  - företagets egen kostnadsdel -> `UTL-P0001..P0006`
  - kundutläggsdel -> `UTL-P0007`

### `UTL-P0015` reseforskott utbetalas

- debet `1611`
- kredit `1930`

### `UTL-P0016` övrigt förskott till anställd utbetalas

- debet `1613`
- kredit `1930`

### `UTL-P0017` claim kvittas mot förskott

- debet kostnad/tillgang/1681 enligt principal
- debet `2641` endast om avdragsrätt finns
- kredit `1611` eller `1613` till den del förskottet förbrukas
- kredit `2822` endast om bolaget fortfarande är skyldigt anställd ytterligare belopp

### `UTL-P0018` oanvant förskott återbetalas

- debet `1930`
- kredit `1611` eller `1613`

### `UTL-P0019` payroll- eller benefitkansligt claim

- ingen posting i detta flöde
- route till downstream owner
- status = blocked i detta flöde tills mottägande flöde tagit över

### `UTL-P0020` private/oklar principal eller owner-private claim

- ingen posting
- blocked

### `UTL-P0021` utrikes claim utan svensk momsavdragsrätt

- debet kostnad/tillgang/1681 med brutto enligt principal
- ingen `2641`
- kredit `2822` eller `2893`

### `UTL-P0022` special-VAT-fall som måste ga via AP/momsflöde

- ingen posting har
- blocked och route till AP/moms review

### `UTL-P0023` valutadifferens vid senare reimbursement av skuld till anställd

- debet `2822` med ursprunglig SEK-skuld
- debet `8436` eller kredit `8431` för kursdifferens
- kredit `1930`

### `UTL-P0024` correction efter att claim bokats

- separat correctionsjournal som reverserar tidigare `UTL-Pxxxx`
- ny korrekt journalref
- ingen overwrite

## Bindande rapport-, export- och myndighetsmappning

- verkligt kundutlägg:
  - ingen momsruta hos bolaget
  - ingen intäktsruta hos bolaget
- företagets egen kostnad med avdragsgill in moms:
  - ingående moms till momsruta `48`
- vidarefakturering av bolagets eget inköp:
  - purchase-side moms enligt inköpslogik
  - seller-side moms enligt `FAKTURAFLODET_BINDANDE_SANNING.md`
- neutral reimbursement till anställd:
  - ingen AGI i detta dokument
  - ingen löneruta i detta dokument
- routed payroll-/benefit-/travel-fall:
  - ingen slutlig rapportmappning har; downstream document äger den
- SIE4:
  - alla reimbursement-, advance-, customer disbursement- och correctionverifikationer måste exporteras med separata verifikationsserier

## Bindande scenariofamilj till proof-ledger och rapportspar

### A. Anställdsutlägg för bolagets egen kostnad

- `OUT-A001` domestic 25 deductible -> `UTL-P0001`, momsruta `48`
- `OUT-A002` domestic 12 deductible -> `UTL-P0002`, momsruta `48`
- `OUT-A003` domestic 6 deductible -> `UTL-P0003`, momsruta `48`
- `OUT-A004` no deduction -> `UTL-P0004`, ingen momsruta
- `OUT-A005` asset purchase -> `UTL-P0005`
- `OUT-A006` inventory/project material -> `UTL-P0006`

### B. Verkligt kundutlägg

- `OUT-B001` employee-paid customer disbursement -> `UTL-P0007`
- `OUT-B002` company-paid customer disbursement -> `UTL-P0008`
- `OUT-B003` customer reimbursement of true disbursement -> `UTL-P0011`
- `OUT-B004` split claim with company cost + customer disbursement -> `UTL-P0014`

### C. Vidarefakturering av företagets eget inköp

- `OUT-C001` employee-paid travel cost reinvoiced -> `UTL-P0012`
- `OUT-C002` employee-paid other cost reinvoiced -> `UTL-P0013`
- `OUT-C003` reinvoicing with markup -> `UTL-P0013` + invoice policy
- `OUT-C004` cost integrated in primary service -> purchase side `UTL-P0001..P0006`, invoice handoff `OUT-INV004`

### D. Travel, payroll och benefit route

- `OUT-D001` actual travel receipt reimbursable here -> `UTL-P0001/2/3/4` or `UTL-P0011` depending principal
- `OUT-D002` traktamente route -> `UTL-P0019`
- `OUT-D003` mileage route -> `UTL-P0019`
- `OUT-D004` benefit-sensitive route -> `UTL-P0019`

### E. Owner/private/related

- `OUT-E001` owner/related operational claim -> `UTL-P0010`
- `OUT-E002` owner/private claim blocked -> `UTL-P0020`
- `OUT-E003` unclear private share -> `UTL-P0020`

### F. FX och special VAT

- `OUT-F001` foreign claim no Swedish VAT deduction -> `UTL-P0021`
- `OUT-F002` reverse charge/import special case -> `UTL-P0022`
- `OUT-F003` FX difference on reimbursement -> `UTL-P0023`

### G. Förskott, settlement och correction

- `OUT-G001` reseforskott issue -> `UTL-P0015`
- `OUT-G002` other advance issue -> `UTL-P0016`
- `OUT-G003` claim offset against advance -> `UTL-P0017`
- `OUT-G004` unused advance returned -> `UTL-P0018`
- `OUT-G005` correction after posting -> `UTL-P0024`
- `OUT-G006` duplicate blocked -> `UTL-P0020`

## Tvingande dokument- eller indataregler

- originalunderlag eller scanninglagrets originalbinarylineage måste finnas
- claimant identitet och relation till bolaget måste vara explicit
- affärshandelserad måste ha datum, merchant, valuta och belopp
- principal måste vara explicit:
  - bolaget
  - kunden
  - payroll/benefit/travel downstream
  - privat/blocked
- för verkligt kundutlägg måste kundlink och bevis om kundens betalningsansvar finnas
- för verkligt kundutlägg får inget vinstpalagg förekomma i reimbursement chain
- för vidarefakturering måste det framga att bolaget gjort eget inköp
- för neutral ersättning till anställd måste utgiften vara företagets eller kundens, inte den anställdes privata
- payment proof utan underlag om vad som kopts är aldrig tillräckligt för neutral reimbursement med momsavdrag

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `OUT-LR001` employee business outlay för company cost
- `OUT-LR002` true customer disbursement
- `OUT-LR003` company purchase to reinvoice
- `OUT-LR004` travel actual cost, not schablon
- `OUT-LR005` payroll route required
- `OUT-LR006` benefit route required
- `OUT-LR007` owner-related route required
- `OUT-LR008` blocked private or mixed principal
- `OUT-LR009` blocked reverse charge/import or other special VAT case
- `OUT-LR010` blocked missing original evidence

## Bindande faltspec eller inputspec per profil

### Profil `employee_business_outlay`

- claimant id
- employee relation
- merchant identity
- transaction date
- currency
- gross amount
- tax amount if known
- target type
- business purpose
- original evidence ref
- payment proof ref if reimbursement requested

### Profil `customer_disbursement`

- alla fält i `employee_business_outlay`
- customer id
- contract/case/order/project ref
- evidence that customer bears payment obligation
- no-markup flag
- amount to recover from customer

### Profil `company_purchase_to_reinvoice`

- alla fält i `employee_business_outlay`
- customer id
- reinvoice mode
- intended invoice class
- markup policy if any

### Profil `owner_or_related_claim`

- claimant relation exact
- approver chain
- reason för non-employee or owner route

### Profil `blocked_unknown`

- all captured fields
- blocker reason
- missing mandatory fields list

## Scenariofamiljer som hela systemet måste tacka

- `OUT-A001` anställdsutlägg bolagets kostnad 25
- `OUT-A002` anställdsutlägg bolagets kostnad 12
- `OUT-A003` anställdsutlägg bolagets kostnad 6
- `OUT-A004` anställdsutlägg utan avdragsrätt
- `OUT-A005` tillgangsinköp via claim
- `OUT-A006` inventory/project material via claim
- `OUT-B001` verkligt kundutlägg employee-paid
- `OUT-B002` verkligt kundutlägg company-paid
- `OUT-B003` kund ersätter verkligt kundutlägg
- `OUT-B004` split company cost + customer disbursement
- `OUT-C001` vidarefakturering av resekostnad
- `OUT-C002` vidarefakturering av övrig kostnad
- `OUT-C003` vidarefakturering med markup
- `OUT-C004` kostnad integrerad i huvudtjänst
- `OUT-D001` actual travel cost reimbursable here
- `OUT-D002` traktamente route
- `OUT-D003` mileage route
- `OUT-D004` benefit-sensitive route
- `OUT-E001` owner/related operational claim
- `OUT-E002` owner/private claim blocked
- `OUT-E003` unclear private share blocked
- `OUT-F001` foreign claim no Swedish VAT deduction
- `OUT-F002` special VAT route blocked
- `OUT-F003` FX difference
- `OUT-G001` reseforskott
- `OUT-G002` other advance
- `OUT-G003` offset against advance
- `OUT-G004` unused advance return
- `OUT-G005` correction after posting
- `OUT-G006` duplicate blocked

## Scenarioregler per familj

- `OUT-A001-OUT-A006`
  - företaget är ekonomisk principal
  - skyldighet uppstår mot claimant, inte mot leverantör
  - momsavdrag får bara ske om underlaget och avdragsrätten tillater det

- `OUT-B001-OUT-B004`
  - kunden är ekonomisk principal mot leverantören
  - bolaget får inte lyfta moms
  - bolaget får inte skapa intäkt
  - återkrav till kund ska ske utan moms och utan vinstpalagg

- `OUT-C001-OUT-C004`
  - bolaget är ekonomisk principal mot leverantören
  - bolaget bokför inköp som eget inköp
  - bolaget får lyfta moms när avdragsrätt finns
  - kundfakturering ska ske som bolagets egen omsattning via invoice flow

- `OUT-D002-OUT-D004`
  - ingen slutlig posting i detta dokument
  - obligatorisk handoff till korrekt downstream owner

- `OUT-E002-OUT-E003`
  - blocked tills privat/owner risk rett ut

- `OUT-F002`
  - blocked och route till AP/moms-specialist

- `OUT-G005`
  - correction via separat chain
  - tidigare settlement får inte tappas

## Blockerande valideringar

- principal saknas eller är oklar
- customer_disbursement utan bevis om kundens betalningsansvar
- customer_disbursement med markup
- VAT deduction attempt on true customer disbursement
- payment proof only without valid goods/service evidence
- claimant relation oklar
- owner/non-employee claim utan explicit route
- mixed private/business utan radsplit
- reverse charge/import/special VAT upptackt i claim
- duplicate claim unresolved
- travel/per diem/mileage/bilformansfall felaktigt klassat som neutral reimbursement

## Rapport- och exportkonsekvenser

- neutral reimbursement till anställd ska inte i sig skapa AGI
- routed payroll-/benefitfall får inte skapa huvudbok i detta dokument innan downstream flow tagit över
- kundutlägg på `1681` ska kunna exporteras som separat balanspost tills kundreglering skett
- reseforskott på `1611` och övriga förskott på `1613` ska kunna exporteras som öppna fordringar på anställda

## Förbjudna förenklingar

- att kalla allt som den anställde betalat för "utlägg"
- att boka allt på `2822` och hoppas att resten loser sig senare
- att använda `1681` för vanlig vidarefakturering av bolagets eget inköp
- att dra av moms på verkligt kundutlägg
- att fakturera verkligt kundutlägg med moms
- att skicka payroll-/benefitkansliga claims som vanlig reimbursement
- att bokföra private/owner-claims som vanlig personalkostnad eller neutral reimbursement
- att dolja förskott eller restskuld i nettning utan separat receipt

## Fler bindande proof-ledger-regler för specialfall

- `UTL-P0010` får bara användas efter owner-related approval
- `UTL-P0021` får bara användas när ingen svensk momsavdragsrätt finns
- `UTL-P0022` betyder alltid block tills specialfall tagits över av annat dokument

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `UTL-P0001-UTL-P0006`
  - skapar skuld till anställd på `2822`
- `UTL-P0007-UTL-P0008`
  - skapar kundutläggsfordran på `1681`
- `UTL-P0010`
  - skapar skuld till narstaende på `2893`
- `UTL-P0015-UTL-P0018`
  - skapar eller minskar fordran på anställd via förskottskonto
- `UTL-P0019-UTL-P0020`
  - ingen posting; endast blocked/routed state

## Bindande verifikations-, serie- och exportregler

- `UTL` serie för initial claim recognition
- `UTR` serie för reimbursement payment
- `UTF` serie för advances and advance returns
- `UTC` serie för corrections
- invoice handoff får aldrig skapa invoice series har; invoice flow äger sina serier

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- claimant relation x principal
- principal x VAT outcome
- principal x invoice handoff mode
- target type x reimbursement mode
- employee advance yes/no x settlement mode
- SEK/foreign x settlement timing
- owner-related yes/no x review override

## Bindande fixture-klasser för utläggs- och vidarefaktureringsflödet

- `OUT-FXT001` enkel domestic 25
- `OUT-FXT002` enkel domestic 12
- `OUT-FXT003` enkel domestic 6
- `OUT-FXT004` non-deductible gross-only
- `OUT-FXT005` customer disbursement exact-gross
- `OUT-FXT006` mixed split claim
- `OUT-FXT007` foreign currency
- `OUT-FXT008` advance offset
- `OUT-FXT009` owner-related
- `OUT-FXT010` blocked special VAT

## Bindande expected outcome-format per scenario

Varje scenario måste uttrycka:
- scenario id
- fixture class
- claimant relation
- principal decision
- target type
- proof-ledger id
- momsutfall
- reimbursement/advance effect
- customer invoice handoff effect
- blocked/routed downstream owner if any

## Bindande canonical verifikationsseriepolicy

- claim recognition får aldrig dela serie med invoice issue
- reimbursement payment får aldrig dela serie med payroll utbetalning
- corrections måste ha egen serie

## Bindande expected outcome per central scenariofamilj

### `OUT-A001`

- fixture minimum: `OUT-FXT001`
- principal: `company_cost`
- proof-ledger: `UTL-P0001`
- VAT: deductible domestic input VAT
- liability: `2822`
- no payroll route
- no customer invoice handoff

### `OUT-B001`

- fixture minimum: `OUT-FXT005`
- principal: `customer_disbursement`
- proof-ledger: `UTL-P0007`
- no input VAT
- liability: `2822`
- låter handoff to `UTL-P0011`

### `OUT-C001`

- fixture minimum: `OUT-FXT001`
- principal: `company_purchase_to_reinvoice`
- proof-ledger: purchase side `UTL-P0001`, invoice handoff `UTL-P0012`
- input VAT deductible if ordinary conditions met
- customer invoice with output VAT via invoice flow

### `OUT-D002`

- fixture minimum: `OUT-FXT001`
- principal: `payroll_or_benefit_route`
- proof-ledger: `UTL-P0019`
- no posting here
- downstream owner: `travel_flow` or `payroll_flow`

### `OUT-E002`

- fixture minimum: `OUT-FXT009`
- principal: `blocked_private_or_unknown`
- proof-ledger: `UTL-P0020`
- no posting
- no reimbursement

### `OUT-F002`

- fixture minimum: `OUT-FXT010`
- principal: blocked
- proof-ledger: `UTL-P0022`
- no posting until AP/moms route takes över

### `OUT-G003`

- fixture minimum: `OUT-FXT008`
- principal: company cost or customer disbursement according to claim
- proof-ledger: `UTL-P0017`
- advance reduced
- only residual amount may hit `2822`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `OUT-A001` -> `UTL-P0001`, `2822`, momsruta `48`
- `OUT-A002` -> `UTL-P0002`, `2822`, momsruta `48`
- `OUT-A003` -> `UTL-P0003`, `2822`, momsruta `48`
- `OUT-A004` -> `UTL-P0004`, `2822`, ingen momsruta
- `OUT-A005` -> `UTL-P0005`
- `OUT-A006` -> `UTL-P0006`
- `OUT-B001` -> `UTL-P0007`
- `OUT-B002` -> `UTL-P0008`
- `OUT-B003` -> `UTL-P0011`
- `OUT-B004` -> `UTL-P0014`
- `OUT-C001` -> `UTL-P0012`
- `OUT-C002` -> `UTL-P0013`
- `OUT-C003` -> `UTL-P0013`
- `OUT-C004` -> `UTL-P0001..P0006` + `OUT-INV004`
- `OUT-D001` -> case-by-case `UTL-P0001..P0014`
- `OUT-D002` -> `UTL-P0019`
- `OUT-D003` -> `UTL-P0019`
- `OUT-D004` -> `UTL-P0019`
- `OUT-E001` -> `UTL-P0010`
- `OUT-E002` -> `UTL-P0020`
- `OUT-E003` -> `UTL-P0020`
- `OUT-F001` -> `UTL-P0021`
- `OUT-F002` -> `UTL-P0022`
- `OUT-F003` -> `UTL-P0023`
- `OUT-G001` -> `UTL-P0015`
- `OUT-G002` -> `UTL-P0016`
- `OUT-G003` -> `UTL-P0017`
- `OUT-G004` -> `UTL-P0018`
- `OUT-G005` -> `UTL-P0024`
- `OUT-G006` -> `UTL-P0020`

## Bindande testkrav

- unit:
  - principal classification company vs customer vs payroll vs private
  - VAT-deduction forbidden on true customer disbursement
  - markup forbidden on true customer disbursement
  - advance offset arithmetic
  - owner-related route separation
- integration:
  - employee claim -> approval -> liability -> reimbursement
  - employee claim -> customer disbursement -> invoice handoff
  - company purchase to reinvoice -> invoice handoff with VAT
  - mixed split claim
  - duplicate blocked
  - correction after payment
  - foreign currency reimbursement with FX difference
- contract:
  - claim API cannot settle without approved liability
  - claim API cannot hand off to invoice flow without explicit handoff mode
- negative:
  - private claim blocked
  - special VAT claim blocked
  - payment proof only blocked
  - owner-private route blocked

## Källor som styr dokumentet

- [Skatteverket: Utlägg och vidarefakturering](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/utlaggochvidarefakturering.4.3aa8c78a1466c58458747aa.html)
- [Bokföringsnamnden: Brevsvar 2017-03-20 om verifikationer när anställda betalar](https://www.bfn.se/wp-content/uploads/2020/06/brevsvar-verifikationer-nar-anstallda-betalar.pdf)
- [Skatteverket: Kostnadsersättning - utgifter i tjänsten](https://skatteverket.se/privat/skatter/arbeteochinkomst/inkomster/kostnadsersattning.4.18e1b10334ebe8bc80005623.html)
- [Skatteverket: Avdragsrätt, Avsnitt 15](https://www.skatteverket.se/download/18.84f6651040cdcb1b480002480/1708608243558/kap15.pdf)
- [Skatteverket: Bilar, bussar och motorcyklar, Avsnitt 24](https://www.skatteverket.se/download/18.18e1b10334ebe8bc8000113775/kap24.pdf)
- [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)

# LÖNEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för löneutmatning och ändra myndighetsavdrag som bygger på uttryckligt myndighetsbeslut eller annan verifierad legal avdragsgrund i payroll.

Detta dokument ska styra:
- Kronofogdens löneutmatning
- remittering av innehållna belopp till myndighet
- ändringar i myndighetsbeslut över tid
- semesterersättning och ändra oregelbundna utbetalningar när myndighetsbeslut omfattar dem
- blockerregler för alla avdrag som saknar korrekt legal grund

## Syfte

Detta dokument finns för att:
- löneutmatning aldrig ska blandas ihop med frivilliga nettolonavdrag eller arbetsgivarens egna fordringar
- systemet aldrig självt ska hitta på utmatningsbelopp
- varje myndighetsavdrag ska ga att spåra till exakt beslut, period och remittering
- payroll och bank alltid ska kunna visa att innehållna belopp antingen ligger som myndighetsskuld eller är utbetalda till rätt mottagare

## Omfattning

Detta dokument omfattar:
- KFM-beslut om löneutmatning
- justeringar och nya beslut från myndighet
- remittering till myndighet
- hantering av oregelbundna utbetalningar enligt beslut
- blockerade osakra myndighetsavdrag

Detta dokument omfattar inte:
- preliminarskatt
- frivilliga nettolonavdrag
- union fees
- arbetsgivarens kvittning av egen fordran utanför verifierad laglig kvittningsratt
- underliggande beräkning av förbehållsbelopp utover det som följer av importerat myndighetsbeslut

## Absoluta principer

- löneutmatning får bara verkstallas när verifierat myndighetsbeslut finns
- payroll får aldrig självt approximera eller gissa fram utmatningsbelopp
- myndighetsavdrag är aldrig kostnad för arbetsgivaren
- myndighetsavdrag ska minska `2821` och oka `2750` innan remittering
- arbetsgivarens egna motfordringar får aldrig blandas in i myndighetsavdragsflödet
- om beslut är oklart, utgatt eller motstridigt ska avdrag blockeras och review skapas

## Bindande dokumenthierarki för löneutmatning och myndighetsavdrag

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_10_ROADMAP.md`
- `DOMAIN_10_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `LONEFLODET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`
- `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md`
- Kronofogdens regler om löneutmatning
- utsokningsbalken

## Kanoniska objekt

- `AuthorityDeductionOrder`
- `GarnishmentDecision`
- `ProtectedAmountReference`
- `AuthorityDeductionAdjustment`
- `AuthorityDeductionPayrollLine`
- `AuthorityRemittance`
- `AuthorityDeductionBlocker`

## Kanoniska state machines

### `AuthorityDeductionOrder`

- `draft`
- `verified`
- `active`
- `superseded`
- `closed`
- `blocked`

### `AuthorityRemittance`

- `draft`
- `ready`
- `submitted`
- `settled`
- `failed`
- `reversed`

### `AuthorityDeductionBlocker`

- `open`
- `review_pending`
- `resolved`
- `waived`

## Kanoniska commands

- `RegisterAuthorityDeductionOrder`
- `VerifyAuthorityDeductionOrder`
- `ActivateAuthorityDeductionOrder`
- `CreateAuthorityDeductionPayrollLine`
- `CreateAuthorityRemittance`
- `SettleAuthorityRemittance`
- `SupersedeAuthorityDeductionOrder`
- `BlockAuthorityDeductionOrder`

## Kanoniska events

- `AuthorityDeductionOrderRegistered`
- `AuthorityDeductionOrderVerified`
- `AuthorityDeductionOrderActivated`
- `AuthorityDeductionPayrollLineCreated`
- `AuthorityRemittanceCreated`
- `AuthorityRemittanceSettled`
- `AuthorityDeductionOrderSuperseded`
- `AuthorityDeductionOrderBlocked`

## Kanoniska route-familjer

- `POST /v1/payroll/authority-deductions/orders`
- `POST /v1/payroll/authority-deductions/orders/{id}/verify`
- `POST /v1/payroll/authority-deductions/orders/{id}/activate`
- `POST /v1/payroll/authority-deductions/orders/{id}/supersede`
- `POST /v1/payroll/authority-deductions/orders/{id}/block`
- `POST /v1/payroll/authority-remittances`

## Kanoniska permissions och review boundaries

- endast verifierad payroll-specialist eller juridisk backoffice-roll får aktivera myndighetsbeslut
- support får inte manuellt skriva in avdragsbelopp utan beslutsunderlag
- remittering till myndighet kraver four-eyes review när batchen innehåller löneutmatning

## Nummer-, serie-, referens- och identitetsregler

- varje beslut ska ha `authorityOrderId`
- `decisionReference` och `issuedAt` är obligatoriska
- varje remittering ska peka på exakt de payroll lines som ligger bakom betalningen
- varje supersession ska referera till föregående beslut

## Valuta-, avrundnings- och omräkningsregler

- myndighetsavdrag ska alltid uttryckas i SEK
- om myndighet beslutar per period ska payroll inte egenomrakna till annat utan explicit beslutslogik
- avrundning ska följa myndighetens belopp och inte drivas av intern standardisering

## Replay-, correction-, recovery- och cutover-regler

- replay av gammal pay run får återanvända historiskt beslut och historiskt belopp
- byte av myndighetsbeslut ska ske genom supersession, inte mutation
- migration måste kunna landa aktivt beslut, historiska dragningar och öppen myndighetsskuld separat
- bankretur på remittering ska inte öppna ny löneutmatning utan misslyckad remittance case

## Huvudflödet

1. myndighetsbeslut registreras
2. beslutet verifieras och aktiveras
3. payroll konsumerar beslutet i nettofasen
4. avdraget skapar liability mot myndighet
5. remitteringsobjekt skapas
6. betalning till myndigheten utforas och matchas

## Bindande scenarioaxlar

- authority type: `kfm_garnishment`, `other_authority_order`
- decision type: `monthly`, `adjusted`, `one_off_irregular_payment`
- payout type: `ordinary_salary`, `vacation_pay`, `vacation_compensation`, `final_pay`
- state: `active`, `superseded`, `blocked`
- remittance state: `ready`, `settled`, `failed`

## Bindande policykartor

- canonical net deduction liability account: `2750`
- payroll liability reduction account: `2821`
- remittance cash account: `1930`
- employer generated approximation: `forbidden`
- unsupported authority source: `blocked`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

### MYD-P0001 KFM löneutmatning on ordinary salary

- payItemCode: `LAK-F004`
- debit `2821`
- credit `2750`
- createsAuthorityLiability: `true`

### MYD-P0002 Remittance of garnishment liability

- debit `2750`
- credit `1930`
- closesAuthorityLiability: `true`

### MYD-P0003 KFM deduction on vacation compensation or irregular payout

- payItemCode: `LAK-F004`
- debit `2821`
- credit `2750`
- irregularPayoutFlag: `true`
- explicitDecisionCoverageRequired: `true`

### MYD-P0004 Superseding authority decision delta

- payrollEffect: `replace_future_amount_only`
- noRetroMutation: `true`

### MYD-P0005 Unsupported or ambiguous authority deduction blocked

- payrollEffect: `blocked`
- blockCode: `unsupported_authority_deduction`

### MYD-P0006 Employer set-off rerouted away from authority flow

- payrollEffect: `reroute`
- targetFlow: `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING`
- noUseOf2750: `true`

## Bindande rapport-, export- och myndighetsmappning

- myndighetsavdrag ska vara spårbart i payslip som separat net deduction class
- remitteringsunderlag ska innehålla beslutets referens och period
- bankmatchning ska ske mot authority remittance object, inte mot generisk payroll payment

## Bindande scenariofamilj till proof-ledger och rapportspar

- `MYD-A001 active_kfm_monthly_order -> MYD-P0001 -> payroll_deduction`
- `MYD-A002 remitted_kfm_order -> MYD-P0002 -> bank_settlement`
- `MYD-B001 irregular_payout_under_order -> MYD-P0003 -> payroll_deduction`
- `MYD-C001 superseded_order -> MYD-P0004 -> future_only_adjustment`
- `MYD-Z001 unsupported_authority_order -> MYD-P0005 -> blocked`
- `MYD-Z002 employer_claim_misrouted_as_authority_order -> MYD-P0006 -> rerouted`

## Tvingande dokument- eller indataregler

- `authorityName`
- `decisionReference`
- `issuedAt`
- `effectiveFrom`
- `employeeId`
- `deductionType`
- `amountOrInstruction`
- `irregularPayoutCoverageFlag`
- `sourceDocumentRef`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `MYD-R001 kronofogden_active_monthly_order`
- `MYD-R002 kronofogden_irregular_payout_order`
- `MYD-R003 authority_order_superseded`
- `MYD-R004 unsupported_authority_order_block`
- `MYD-R005 employer_claim_not_authority_deduction`

## Bindande faltspec eller inputspec per profil

- `authorityOrderId`
- `authorityType`
- `employeeId`
- `decisionReference`
- `effectiveFrom`
- `effectiveTo`
- `amountInstructionType`
- `orderedAmount`
- `irregularPayoutCoverage`
- `sourceDocumentDigest`
- `verifiedBy`

## Scenariofamiljer som hela systemet måste tacka

- aktiv KFM-löneutmatning
- ny period med samma aktiva beslut
- nytt eller ändrat beslut
- semesterersättning eller annan oregelbunden utbetalning under beslut
- misslyckad remittering
- oklart eller otillatet myndighetsavdrag
- arbetsgivarens egen fordran felroutad som myndighetsavdrag

## Scenarioregler per familj

- `MYD-A001`: aktivt verifierat beslut ska skapa `LAK-F004` i nettofasen
- `MYD-A002`: remittering ska minska `2750` och matchas i bankflödet
- `MYD-B001`: oregelbunden utbetalning får bara omfattas om beslutet uttryckligen eller verifierat instruktionstolkning tillater det
- `MYD-C001`: nytt beslut ska superseda framtida dragningar men inte skriva om redan bokförd historik
- `MYD-Z001`: oklart myndighetsavdrag ska blockeras
- `MYD-Z002`: arbetsgivarens egen motfordran ska aldrig bokas som `2750`

## Blockerande valideringar

- deny activation om beslutets referens eller källsdok saknas
- deny payroll deduction om order är `superseded`, `closed` eller `blocked`
- deny irregular-payout deduction om explicit coverage saknas
- deny authority remittance om underliggande payroll line inte är bokförd
- deny use of `2750` för employer receivable or private owner recovery

## Rapport- och exportkonsekvenser

- payslip ska visa myndighetsavdrag separat från preliminarskatt och frivilliga nettodrag
- payroll export ska kunna visa `authorityType`, `decisionReference` och remittance state
- bank/export ska ge separat audittrail för remittering

## Förbjudna förenklingar

- ingen intern beräkning av förbehållsbelopp utan myndighetsbeslut
- inget sammanslaget konto för myndighetsavdrag och ändra nettodrag
- ingen retroaktiv omskrivning av redan betald löneutmatning
- inget antägande att alla oregelbundna utbetalningar automatiskt omfattas

## Fler bindande proof-ledger-regler för specialfall

- misslyckad remittering ska återöppna `AuthorityRemittance`, inte skapa ny payroll deduction
- om beslut upphor mitt i period ska endast framtida pay runs justeras
- myndighetsbeslut med saknade person- eller referensuppgifter ska blockeras

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `MYD-P0001` skapar öppen myndighetsskuld på `2750`
- `MYD-P0002` stanger motsvarande skuld
- `MYD-P0005` skapar blockerfall utan bokföring
- `MYD-P0006` skapar inget myndighetsobjekt och måste flyttas till employee-receivable/kvittningsflödet

## Bindande verifikations-, serie- och exportregler

- myndighetsavdrag ska inga i payrolls canonical serie, inte i separat manuell serie
- remittering till myndighet ska ga genom bankflödets canonical payment/export path
- varje remittering ska kunna traced till ett eller flera `MYD-P0001/MYD-P0003`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- active vs superseded
- ordinary salary vs irregular payout
- settled vs failed remittance
- KFM vs other authority order

## Bindande fixture-klasser för myndighetsavdrag

- `MYD-FXT-001` ordinary monthly garnishment
- `MYD-FXT-002` vacation compensation under active order
- `MYD-FXT-003` new authority decision replacing prior amount
- `MYD-FXT-004` failed remittance
- `MYD-FXT-005` unsupported authority document

## Bindande expected outcome-format per scenario

- `scenarioId`
- `fixtureClass`
- `expectedProofLedger`
- `expectedPayrollEffect`
- `expectedLiabilityAccount`
- `expectedRemittanceState`
- `expectedBlockedOrAllowedStatus`

## Bindande canonical verifikationsseriepolicy

- deduction line and remittance line får inte journaliseras i samma handskrivna voucher
- deduction line skapas i payroll series; remittance line i bank/payment settlement series

## Bindande expected outcome per central scenariofamilj

### `MYD-A001`

- fixture minimum: `MYD-FXT-001`
- expected proof-ledger: `MYD-P0001`
- expected liability account: `2750`
- expected status: `allowed`

### `MYD-B001`

- fixture minimum: `MYD-FXT-002`
- expected proof-ledger: `MYD-P0003`
- expected status: `allowed_if_explicit_coverage`

### `MYD-Z001`

- fixture minimum: `MYD-FXT-005`
- expected proof-ledger: `MYD-P0005`
- expected status: `blocked`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `MYD-A001 -> MYD-P0001 -> allowed`
- `MYD-A002 -> MYD-P0002 -> settled`
- `MYD-B001 -> MYD-P0003 -> conditional_allowed`
- `MYD-C001 -> MYD-P0004 -> future_only_adjustment`
- `MYD-Z001 -> MYD-P0005 -> blocked`
- `MYD-Z002 -> MYD-P0006 -> rerouted`

## Bindande testkrav

- unit tests för `2821 -> 2750` authority deduction posting
- unit tests för remittance `2750 -> 1930`
- unit tests för superseded decision affecting future runs only
- unit tests för irregular payout requiring explicit decision coverage
- unit tests blocking unsupported authority orders
- integration tests för payroll deduction -> bank remittance trace

## Källor som styr dokumentet

- [Kronofogden: Löneutmatning](https://kronofogden.se/nagon-har-ett-krav-mot-dig/du-ska-betala-eller-gora-nagot-verkstallighet/du-kan-inte-betala-eller-gora-nagot/loneutmatning)
- [Kronofogden: Information om bestammande av förbehållsbeloppet vid löneutmatning](https://kronofogden.se/download/18.4d3e9d9a18be02f5b2a1fd3/1734597477907/Kronofogdemyndighetens-information-om-bestammande-av-forbehallsbeloppet-vid-loneutmatning.pdf)
- [Riksdagen: Utsokningsbalk (1981:774)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/utsokningsbalk-1981774_sfs-1981-774/)
- [Riksdagen: Lag (1970:215) om arbetsgivares kvittningsratt](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1970215-om-arbetsgivares-kvittningsratt_sfs-1970-215/)
- [LÖNEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md](C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md)

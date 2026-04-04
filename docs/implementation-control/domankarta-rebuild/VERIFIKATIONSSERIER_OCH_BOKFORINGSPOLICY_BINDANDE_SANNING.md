# VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för verifikationsserier, verifikationsnummer, bokföringsdatum, reservationsluckor, correction policy och exportlinjering mellan runtime, huvudbok och SIE4.

## Syfte

Detta dokument ska låsa:
- exakt vilka serier som är tillåtna
- exakt vilket owner flow som äger varje serie
- exakt hur verifikationsnummer skapas, reserveras, blockeras och arkiveras
- exakt när correction får ske i samma serie eller måste ske som separat finance adjustment
- exakt hur bokföringsdatum, transaktionsdatum och periodlas griper in i voucher truth

## Omfattning

Detta dokument omfattar:
- canonical verifikationsseriepolicy
- voucher identity policy
- numbering och gap policy
- posting date policy
- correction, reversal och hard-lock policy
- exportlinjering till grundbok, huvudbok och SIE4

Detta dokument omfattar inte:
- kontoval, vilket ägs av `BAS_KONTOPOLICY_BINDANDE_SANNING.md` och `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md`
- owner-flow-specifika debet- och kreditregler, vilket ägs av respektive flödesbibel

## Absoluta principer

- varje legal bokföringseffekt måste materialiseras i exakt en canonical verifikationsserie
- verifikationsnummer får aldrig återanvändas
- generisk catch-all-serie är absolut förbjuden
- corrections får aldrig skriva över originalverifikationen
- hard-locked period får aldrig muteras
- export, grundbok och huvudbok får aldrig visa annan serie eller annat nummer an runtime truth

## Bindande dokumenthierarki för verifikationsserier och bokföringspolicy

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_04_ROADMAP.md`
- `DOMAIN_04_IMPLEMENTATION_LIBRARY.md`
- `DOMAIN_06_ROADMAP.md`
- `DOMAIN_06_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md`
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md`

## Kanoniska objekt

- `VoucherSeriesPolicy`
- `VoucherSeriesReservation`
- `VoucherGapRecord`
- `VoucherPostingDatePolicy`
- `VoucherCorrectionPolicy`
- `VoucherSeriesBlocker`

## Kanoniska state machines

- `VoucherSeriesPolicy: draft -> approved -> active | superseded | retired`
- `VoucherSeriesReservation: reserved -> consumed | cancelled | expired`
- `VoucherGapRecord: open -> explained | audited`
- `VoucherCorrectionPolicy: draft -> approved -> active | superseded`
- `VoucherSeriesBlocker: open -> resolved | waived`

## Kanoniska commands

- `PublishVoucherSeriesPolicy`
- `ReserveVoucherNumber`
- `ConsumeVoucherReservation`
- `CancelVoucherReservation`
- `RegisterVoucherGapRecord`
- `PublishVoucherCorrectionPolicy`
- `BlockVoucherSeriesViolation`

## Kanoniska events

- `VoucherSeriesPolicyPublished`
- `VoucherNumberReserved`
- `VoucherReservationConsumed`
- `VoucherReservationCancelled`
- `VoucherGapRecordRegistered`
- `VoucherCorrectionPolicyPublished`
- `VoucherSeriesViolationBlocked`

## Kanoniska route-familjer

- `POST /v1/accounting/voucher-series/policies`
- `POST /v1/accounting/voucher-series/reservations`
- `POST /v1/accounting/voucher-series/reservations/{id}/consume`
- `POST /v1/accounting/voucher-series/reservations/{id}/cancel`
- `POST /v1/accounting/voucher-gap-records`
- `POST /v1/accounting/voucher-correction-policies`

## Kanoniska permissions och review boundaries

- `accounting.voucher_series.read`
- `accounting.voucher_series.publish`
- `accounting.voucher_series.reserve`
- `accounting.voucher_series.cancel`
- `accounting.voucher_gap.audit`
- `accounting.period_lock.override`

Support och backoffice får inte:
- skriva över serie eller nummer på postad verifikation
- skapa retroaktiv lucka utan gap record
- flytta voucher mellan serier utan reversal och ny posting

## Nummer-, serie-, referens- och identitetsregler

- canonical voucher identity är `legal_entity_id + fiscal_year_id + series_code + voucher_number`
- `voucher_uuid` är separat intern identity och får aldrig ersätta legal serie/nummer
- varje serie har egen sekventiell nummerserie per legal entity och fiscal year
- reserverat nummer måste antingen konsumeras eller förklaras med `VoucherGapRecord`
- imported external voucher number får bara bevaras som extern referens, aldrig som canonical number om kollisionsrisk finns

## Valuta-, avrundnings- och omräkningsregler

- verifikationsserier styrs inte av valuta, men voucher i utlandsk valuta måste fortfarande ha unikt canonical nummer i redovisningsvaluta
- rounding lines och FX lines får aldrig skapa egen serieklass; de arver owner-flow-serien eller explicit correction-serie enligt policy

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig skapa nytt nummer om samma source binding redan postats
- recovery får inte tilldela ny serie till befintlig voucher
- correction i öppen period får som default ske i samma owner-serie med explicit `CorrectionVoucherLink`
- hard-locked period ska korrigeras i nasta öppna period eller genom uttryckligt high-risk finance-beslut
- migration vouchers måste alltid landa i serie `M` om inte uttrycklig owner-mapping-policy är dokumenterad

## Huvudflödet

1. owner flow eller finance journal begar voucher issuance
2. seriepolicy resolves
3. nummer reserveras
4. voucher byggs och valideras
5. nummer konsumeras när posting sker
6. export-, gap- och correction-lineage skrivs
7. reservation som aldrig postas får bara lamnas med gap record

## Bindande scenarioaxlar

- owner flow: `ar`, `ap`, `bank`, `manual`, `vat_tax`, `fixed_assets`, `inventory`, `project`, `payroll`, `migration`
- lifecycle: `original`, `reversal`, `supplement`, `imported`, `opening_balance`
- period state: `open`, `soft_locked`, `hard_locked`
- origin: `system`, `manual_finance`, `migration`

## Bindande policykartor

- `SER-POL-001 owner_flow_to_series`
- `SER-POL-002 hard_lock_correction_policy`
- `SER-POL-003 reservation_and_gap_policy`
- `SER-POL-004 external_reference_preservation_policy`
- `SER-POL-005 export_series_alignment_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `SER-P0001` seller-side ÄR issue -> serie `A`
- `SER-P0002` supplier-side AP issue -> serie `B`
- `SER-P0003` bank-owned posting -> serie `C`
- `SER-P0004` explicit finance journal -> serie `D`
- `SER-P0005` VAT, skattekonto and myndighetsvoucher -> serie `E`
- `SER-P0006` fixed assets and depreciation -> serie `F`
- `SER-P0007` inventory and COGS -> serie `G`
- `SER-P0008` project and WIP -> serie `H`
- `SER-P0009` payroll and AGI-side vouchers -> serie `L`
- `SER-P0010` migration and opening balance -> serie `M`
- `SER-P0011` consumed reservation with no posting -> blocked unless `VoucherGapRecord`
- `SER-P0012` hard-locked correction in current period -> same owner family or serie `D` only with explicit correction lineage

## Bindande rapport-, export- och myndighetsmappning

- grundbok ska visa serie och nummer exakt som canonical voucher identity
- huvudbokssammandrag ska kunna filtrera per serie
- SIE4-export ska serialisera `#VER` med canonical series code och number
- rapporter får aldrig maskera seriebyte vid correction eller migration

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SER-A001` ÄR issue -> `SER-P0001`
- `SER-A002` AP issue -> `SER-P0002`
- `SER-A003` bank posting -> `SER-P0003`
- `SER-A004` manual finance journal -> `SER-P0004`
- `SER-A005` VAT or tax-account posting -> `SER-P0005`
- `SER-A006` fixed-asset voucher -> `SER-P0006`
- `SER-A007` inventory voucher -> `SER-P0007`
- `SER-A008` project/WIP voucher -> `SER-P0008`
- `SER-A009` payroll voucher -> `SER-P0009`
- `SER-A010` migration or opening balance -> `SER-P0010`
- `SER-Z001` unexplained gap -> `SER-P0011`
- `SER-Z002` hard-locked correction -> `SER-P0012`

## Tvingande dokument- eller indataregler

- voucher request måste ge owner flow, posting date, fiscal year, source binding id och correction flag
- manual journal måste ge reviewer, reason och owner category
- migration voucher måste ge source system, import batch och external voucher ref

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SER-R001 owner_flow_series_resolution`
- `SER-R002 manual_finance_adjustment`
- `SER-R003 hard_locked_correction`
- `SER-R004 migration_import`
- `SER-R005 gap_explained`
- `SER-R006 forbidden_series_reuse`

## Bindande faltspec eller inputspec per profil

- series policy: `series_code`, `owner_flows[]`, `manual_allowed`, `correction_mode`
- reservation: `series_code`, `fiscal_year_id`, `reserved_number`, `reserved_by`
- gap record: `series_code`, `voucher_number`, `reason_code`, `approved_by`, `evidence_ref`
- correction link: `original_voucher_id`, `correction_voucher_id`, `correction_type`

## Scenariofamiljer som hela systemet måste tacka

- owner-flow-issued vouchers
- manual finance journals
- reversals and supplements
- hard-locked corrections
- migration and opening balances
- reservation cancellation and gap explanation

## Scenarioregler per familj

- owner-issued voucher får bara använda sin tilldelade serie
- manual finance adjustments får som default bara använda serie `D`
- VAT och skattekonto vouchers får bara använda serie `E`
- payroll får bara använda serie `L`
- migration och opening balances får bara använda serie `M`

## Blockerande valideringar

- posting blocked om owner flow inte har explicit series policy
- posting blocked om reserved number saknas eller redan är konsumerat
- correction blocked om hard-locked original saknar correction policy
- posting blocked om serie försöks återanvändas av fel owner flow

## Rapport- och exportkonsekvenser

- voucher drilldown måste visa serie, nummer, reservation lineage och correction chain
- SIE4-import och export måste kunna roundtrippa series code utan att den muteras
- auditrapport måste visa varje gap record och dess godkännande

## Förbjudna förenklingar

- global monoton nummerserie över alla owner flows
- fri serieswitch i UI efter postning
- implicit gap acceptance utan `VoucherGapRecord`
- migration som låter externa nummer bli canonical utan kollisionskontroll

## Fler bindande proof-ledger-regler för specialfall

- `SER-P0013` reversal voucher inherits owner flow series unless explicit finance-only correction policy forces `D`
- `SER-P0014` imported historical voucher preserves external number as reference only
- `SER-P0015` opening balance voucher always uses serie `M` and source class `opening_balance`

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- series policy får inte ändra subledger owner
- correction vouchers måste alltid peka till original via `CorrectionVoucherLink`
- gap records måste vara synliga i audit and operator workbench

## Bindande verifikations-, serie- och exportregler

- `A` seller-side sales, kundfakturor, kreditnotor och customer-side ÄR issue
- `B` supplier invoices, supplier credits och AP issue
- `C` bank-owned postings och settlement-owned bank verifications
- `D` manuella omforingar och explicit finance journals
- `E` VAT, skattekonto, myndighets- och declarationside vouchers
- `F` anläggningstillgangar och avskrivningar
- `G` lager, COGS och warehouse-ledger
- `H` project, WIP och profitability-ledger
- `L` payroll, benefits och AGI-side vouchers
- `M` migration, opening balance och cutover vouchers

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- owner flow x lifecycle
- owner flow x period state
- manual x system x migration
- original x correction x reversal

## Bindande fixture-klasser för verifikationsserier och bokföringspolicy

- `SER-FXT-001` standard owner-issued vouchers
- `SER-FXT-002` manual finance journals
- `SER-FXT-003` hard-locked corrections
- `SER-FXT-004` migration and opening balances
- `SER-FXT-005` gap and reservation anomalies

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `owner_flow`
- `expected_series`
- `expected_number_state`
- `expected_gap_record`
- `expected_export_effect`
- `expected_blocker_or_success`

## Bindande canonical verifikationsseriepolicy

- serie `A` får inte användas av AP, bank, payroll eller VAT/tax flows
- serie `B` får inte användas av seller-side ÄR issue
- serie `C` får inte användas för manual finance reclass om bank inte är canonical owner
- serie `D` är canonical default för explicit finance-controlled manual journals
- serie `E` är canonical default för moms-, skattekonto- och declarationside vouchers
- serie `L` är canonical default för payroll, benefits och AGI-side vouchers
- serie `M` är obligatorisk för opening balance, migration och cutover vouchers om inte uttrycklig owner-policy anger annat

## Bindande expected outcome per central scenariofamilj

### `SER-A001`

- fixture: `SER-FXT-001`
- expected:
  - serie `A`
  - unikt voucher number inom legal entity, fiscal year och serie
  - export till grundbok, huvudbok och SIE4 med samma serie

### `SER-A005`

- fixture: `SER-FXT-001`
- expected:
  - serie `E`
  - owner flow `vat_tax`
  - ingen fri omklassning till `D`

### `SER-Z002`

- fixture: `SER-FXT-003`
- expected:
  - correction i nasta öppna period eller explicit finance-approved `D`
  - originalverifikation kvar oforandrad
  - correction lineage synlig i audit och export

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SER-A001` -> `SER-P0001` -> serie `A` -> ÄR seller issue
- `SER-A002` -> `SER-P0002` -> serie `B` -> AP issue
- `SER-A003` -> `SER-P0003` -> serie `C` -> bank-owned
- `SER-A004` -> `SER-P0004` -> serie `D` -> manual finance
- `SER-A005` -> `SER-P0005` -> serie `E` -> VAT/tax
- `SER-A006` -> `SER-P0006` -> serie `F` -> fixed assets
- `SER-A007` -> `SER-P0007` -> serie `G` -> inventory
- `SER-A008` -> `SER-P0008` -> serie `H` -> project/WIP
- `SER-A009` -> `SER-P0009` -> serie `L` -> payroll
- `SER-A010` -> `SER-P0010` -> serie `M` -> migration/opening balance
- `SER-Z001` -> `SER-P0011` -> blocked or gap-recorded
- `SER-Z002` -> `SER-P0012` -> hard-locked correction path

## Bindande testkrav

- unit tests för every owner-flow-to-series mapping
- unit tests för duplicate reservation and consumed-number blocking
- integration tests för hard-locked correction policy
- migration tests proving canonical `M`-series handling
- SIE4 roundtrip tests proving preserved series code and voucher number

## Källor som styr dokumentet

- [Riksdagen: Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- [SIE-Gruppen: SIE filformat 4B](https://sie.se/wp-content/uploads/2020/05/SIE_filformat_ver_4B_080930.pdf)
- [BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)

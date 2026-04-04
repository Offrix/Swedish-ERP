# BAS_KONTOPOLICY_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för BAS-kontopolicy i plattformen.

## Syfte

Detta dokument ska låsa hur BAS-kontoklasser, canonical account families, kontoankare, override-granser och blocked mappings styr all bokföringsdriven implementation utan fri kontotext eller tyst lokal remap.

## Omfattning

Detta dokument omfattar:
- canonical non-payroll account families
- defaultkonton
- control-account policies
- allowed overrides
- blocked kontoanvändning
- lineage mellan flöden och konton
- gransen mot phrase-driven candidate generation

Detta dokument omfattar inte:
- full scenariologik per flöde
- BAS-lönekontospecialisering som ägs av separat lönepolicy
- phrase-driven account search som ägs av separat BAS-sökfrasdokument

## Absoluta principer

- varje bokföringsdrivet flöde måste peka på canonical account family eller explicit konto
- kontooverride får vara policydriven, aldrig fri text
- control accounts får inte återanvändas som generella resultat- eller balanskonton utan uttrycklig policy
- historiska eller lokala konton får inte bli canonical utan policybeslut
- VAT-detaljkonton, redovisningskonto för moms och skattekonto får inte blandas ihop
- payroll-owned accounts får inte definieras har

## Bindande dokumenthierarki för BAS-kontopolicy

- detta dokument äger canonical BAS-kontotolkning för icke-lönekonton
- `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md` äger phrase-driven candidate generation, flerordsfraser, vardagsuttryck och blocked auto-select i BAS-sök
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` äger lönekontospecialisering
- `FAKTURAFLODET_BINDANDE_SANNING.md`, `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md`, `LEVFAKTURAFLODET_BINDANDE_SANNING.md`, `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md`, `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`, `MOMSFLODET_BINDANDE_SANNING.md`, `SKATTEKONTOFLODET_BINDANDE_SANNING.md`, `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`, `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md` och ändra finansiella biblar måste peka hit för kontoankare
- Domän 4, 5, 6, 11, 15 och 27 får inte definiera avvikande BAS-kontopolicy utan att detta dokument skrivs om samtidigt
- Domän 5, 6, 7, 15 och 27 får inte definiera avvikande BAS-sökfras- eller candidate-ranking-truth utan att `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md` skrivs om samtidigt

## Kanoniska objekt

- `AccountFamily`
- `AccountPolicyProfile`
- `AccountOverridePolicy`
- `BlockedAccountUse`
- `AccountLineageReceipt`
- `ControlAccountAnchor`
- `VatDetailAccountAnchor`

## Kanoniska state machines

- `AccountPolicyProfile`: `draft -> active | superseded | retired`
- `AccountOverridePolicy`: `draft -> active | revoked`
- `BlockedAccountUse`: `draft -> active | revoked`

## Kanoniska commands

- `PublishAccountPolicyProfile`
- `PublishAccountOverridePolicy`
- `BlockAccountUse`
- `RecordAccountLineageReceipt`
- `PublishControlAccountAnchor`

## Kanoniska events

- `AccountPolicyProfilePublished`
- `AccountOverridePolicyPublished`
- `AccountUseBlocked`
- `AccountLineageReceiptRecorded`
- `ControlAccountAnchorPublished`

## Kanoniska route-familjer

- `POST /account-policies`
- `POST /account-overrides`
- `POST /blocked-account-uses`
- `POST /account-lineage-receipts`
- `POST /control-account-anchors`

## Kanoniska permissions och review boundaries

- account policy changes are finance-governed
- overrides must be approved and traceable
- support may not change account policy
- tax- and control-account changes are high-risk finance changes

## Nummer-, serie-, referens- och identitetsregler

- varje account family ska ha `ACC-FAM-NNN`
- varje policyprofil ska ha `ACC-POL-NNN`
- varje blocked use ska ha `ACC-BLK-NNN`
- varje control account anchor ska ha `ACC-CTRL-NNN`

## Valuta-, avrundnings- och omräkningsregler

- account policy changes never override currency logic from owning flow docs
- account family must still preserve source currency lineage if amount is foreign
- FX gain/loss accounts får bara valjas av valutadokumentens regler, aldrig av fri override

## Replay-, correction-, recovery- och cutover-regler

- policy version used för every posting must be replayable
- superseded policy may not silently reinterpret old vouchers
- migration must preserve source-account lineage when canonical mapping changes
- corrections must keep original account lineage unless the business event explicitly changes family

## Huvudflödet

1. account family defined
2. defaultkonto published
3. override policy optionally published
4. posting flows reference family or exact konto
5. lineage receipt stores policy version used
6. exports and reports carry actual account plus family lineage

## Bindande scenarioaxlar

- flow family
- legal form
- accounting method
- domestic, EU, import or export
- standard or override
- customer, supplier, authority, intercompany or bank counterparty
- control account vs result account vs accrual account
- ordinary regime vs HUS, reverse charge, OSS or special regime

## Bindande policykartor

- `BAS-POL-001 family_to_default_account`
- `BAS-POL-002 family_to_allowed_override_range`
- `BAS-POL-003 blocked_account_use_matrix`
- `BAS-POL-004 control_account_family_matrix`
- `BAS-POL-005 migration_account_lineage_policy`
- `BAS-POL-006 payroll_owned_accounts_forbidden_here`
- `BAS-POL-007 vat_detail_vs_vat_settlement_boundary`
- `BAS-POL-008 intercompany_account_boundary`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `BAS-P0001` ordinary customer receivable family -> `1510`
- `BAS-P0002` factored or assigned receivable family -> `1512`
- `BAS-P0003` disputed customer receivable family -> `1516`
- `BAS-P0004` impairment or reserve against customer receivable family -> `1519`
- `BAS-P0005` card and acquirer receivable family -> `1580`
- `BAS-P0006` tax account mirror family -> `1630`
- `BAS-P0007` VAT receivable family -> `1650`
- `BAS-P0008` customer outlay receivable family -> `1681`
- `BAS-P0009` bank family -> `1930`
- `BAS-P0010` customer advance liability family -> `2420`
- `BAS-P0011` supplier payable family -> `2440`
- `BAS-P0012` output VAT domestic 25 family -> `2611`
- `BAS-P0013` output VAT reverse charge Sweden 25 family -> `2614`
- `BAS-P0014` output VAT import 25 family -> `2615`
- `BAS-P0015` input VAT domestic deductible family -> `2641`
- `BAS-P0016` input VAT foreign acquisition family -> `2645`
- `BAS-P0017` input VAT reverse charge Sweden family -> `2647`
- `BAS-P0018` VAT settlement family -> `2650`
- `BAS-P0019` FX gain family -> `3960`
- `BAS-P0020` FX loss family -> `7960`
- `BAS-P0021` bad debt family -> `6351`

## Bindande rapport-, export- och myndighetsmappning

- account families must map to financial statement and export families
- control accounts must preserve reskontra or authority linkage
- VAT detail accounts must feed VAT report and then settle through `2650` and `1630` by owning VAT or skattekonto docs

## Bindande scenariofamilj till proof-ledger och rapportspar

- ÄR standard -> `BAS-P0001`, `BAS-P0010`, `BAS-P0012`
- ÄR factoring -> `BAS-P0002`
- ÄR dispute or impairment -> `BAS-P0003`, `BAS-P0004`, `BAS-P0021`
- card settlement -> `BAS-P0005`, `BAS-P0009`
- tax and authority mirror -> `BAS-P0006`, `BAS-P0018`
- VAT domestic -> `BAS-P0012`, `BAS-P0015`, `BAS-P0018`
- VAT reverse charge or import -> `BAS-P0013`, `BAS-P0014`, `BAS-P0016`, `BAS-P0017`, `BAS-P0018`
- customer outlay -> `BAS-P0008`
- FX -> `BAS-P0019`, `BAS-P0020`

## Tvingande dokument- eller indataregler

- every posting family must name account family
- every override must name override policy id
- every migration account remap must carry source and canonical account
- every control-account posting must carry linked subledger or authority anchor where applicable

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `BAS-R001 missing_account_family`
- `BAS-R002 blocked_override`
- `BAS-R003 forbidden_control_account_reuse`
- `BAS-R004 missing_lineage`
- `BAS-R005 payroll_owned_account_forbidden_here`
- `BAS-R006 vat_detail_vs_settlement_conflict`

## Bindande faltspec eller inputspec per profil

- account family: `family_id`, `default_account`, `report_family`, `control_account=true|false`
- override policy: `family_id`, `allowed_accounts[]`, `approval_required`
- lineage receipt: `policy_id`, `account_used`, `source_flow`, `source_receipt`
- control account anchor: `family_id`, `subledger_owner`, `authority_owner`, `blocked_without_linkage`

## Scenariofamiljer som hela systemet måste tacka

- standard ÄR
- factoring or assigned ÄR
- disputed or impaired ÄR
- standard AP
- customer advance
- card settlement
- VAT domestic
- VAT reverse charge or import
- tax account mirror
- customer outlay
- FX
- migration remap

## Scenarioregler per familj

- control accounts must stay control accounts
- override may not violate blocked matrix
- historical vouchers keep original effective policy
- payroll-owned liabilities and receivables may not be resolved here
- `2650` may not be used as ordinary VAT detail account

## Blockerande valideringar

- posting blocked om family saknas
- posting blocked om override saknar policy
- posting blocked om blocked account use matchar
- posting blocked om control account lacks required reskontra or authority linkage
- posting blocked om payroll-owned account requested from non-payroll policy
- posting blocked om VAT detail account and VAT settlement account collide in same family decision

## Rapport- och exportkonsekvenser

- export must carry actual used account and policy lineage
- report drilldown must show account family and override if any
- VAT and authority drilldown must show whether line landed on detail account, settlement account or skattekonto mirror

## Förbjudna förenklingar

- free-text konto overrides
- silent remap of historical vouchers
- mixing control and result accounts without policy
- using `1630` as generic bank or clearing account
- using `2650` as generic VAT posting account för every VAT line

## Fler bindande proof-ledger-regler för specialfall

- `BAS-P0022` HUS split receivable must preserve special receivable family and may not collapse into ordinary `1510`
- `BAS-P0023` intercompany receivable or payable must use explicit intercompany family and not ordinary external default without policy
- `BAS-P0024` OSS and other special VAT regimes require explicit special-family mapping or remain blocked
- `BAS-P0025` customer advance reversal must preserve `2420` until invoice settlement path is explicit

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- customer and supplier control account families must assert linked subledger
- tax account mirror must assert authority-linked state
- migration remap must assert preserved lineage
- customer outlay family must assert customer-recoverable state

## Bindande verifikations-, serie- och exportregler

- series are governed elsewhere; this doc only governs account choice
- SIE4 and ledger exports must carry actual account code, account family and lineage policy id

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- family x override
- family x legal form
- family x geography
- family x control-account or result-account class
- family x migration origin

## Bindande fixture-klasser för BAS-kontopolicy

- `BAS-FXT-001` standard domestic finance
- `BAS-FXT-002` FX
- `BAS-FXT-003` special receivable or liability
- `BAS-FXT-004` migration remap
- `BAS-FXT-005` VAT detail vs settlement
- `BAS-FXT-006` intercompany boundary

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_account_family`
- `expected_account`
- `expected_override_policy`
- `expected_subledger_or_authority_anchor`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT

## Bindande expected outcome per central scenariofamilj

- ordinary ÄR must resolve to `1510`
- ordinary AP must resolve to `2440`
- bank standard must resolve to `1930`
- tax mirror must resolve to `1630`
- VAT settlement must resolve to `2650`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- ÄR ordinary -> `1510`
- ÄR factoring -> `1512`
- ÄR disputed -> `1516`
- card receivable -> `1580`
- skattekonto -> `1630`
- VAT receivable -> `1650`
- customer outlay -> `1681`
- bank -> `1930`
- customer advance -> `2420`
- supplier payable -> `2440`
- output VAT domestic 25 -> `2611`
- output VAT reverse charge 25 -> `2614`
- output VAT import 25 -> `2615`
- input VAT domestic -> `2641`
- input VAT foreign acquisition -> `2645`
- input VAT reverse charge Sweden -> `2647`
- VAT settlement -> `2650`

## Bindande testkrav

- family completeness tests
- blocked override tests
- control-account linkage tests
- lineage persistence tests
- migration remap tests
- VAT detail vs settlement conflict tests

## Källor som styr dokumentet

- [BAS: Kontoplaner för 2026](https://www.bas.se/kontoplaner/)
- [BAS: Ändringar i kontoplanen 2026](https://www.bas.se/2025/12/04/andringar-i-kontoplanen-2026/)
- [BAS: Kontoplan BAS 2025 v. 1.0](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
- [SIE-Gruppen: SIE filformat 4B](https://sie.se/wp-content/uploads/2020/05/SIE_filformat_ver_4B_080930.pdf)

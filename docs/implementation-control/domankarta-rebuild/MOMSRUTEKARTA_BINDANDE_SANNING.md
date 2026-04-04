# MOMSRUTEKARTA_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för momsrutekarta och VAT box truth.

## Syfte

Detta dokument ska låsa hur momsscenarier mappas till svenska momsrutor, periodisk sammanställning, ersättningsdeklarationer och filformat sa att ingen VAT-logik drivs av UI-etiketter eller lokala tolkningar.

## Omfattning

Detta dokument omfattar:
- svenska momsrutor i ordinarie momsdeklaration
- scenario-to-box mappings
- import- och reverse-charge box truth
- replacement and correction lineage
- periodic summary linkage
- XML-tag lineage för file submission

Detta dokument omfattar inte:
- hela seller- eller buyerlogiken per scenario
- account selection, which is owned by BAS- and VAT-flow documents

## Absoluta principer

- every VAT-driven scenario must map to explicit box outcome
- unsupported box mapping must block green status
- replacement declarations must preserve lineage to original periods
- boxes may not be inferred from UI labels or report formatting
- route `49` får aldrig vara inputkalla; den är alltid en derivata av övriga rutor enligt Skatteverkets regler

## Bindande dokumenthierarki för momsrutekarta

- detta dokument äger box truth
- `MOMSFLODET_BINDANDE_SANNING.md` äger overarching VAT process truth and must point here för final box mapping
- `FAKTURAFLODET_BINDANDE_SANNING.md`, `LEVFAKTURAFLODET_BINDANDE_SANNING.md`, `KVITTOFLODET_BINDANDE_SANNING.md`, `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md`, `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md`, `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`, `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` och `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md` måste peka hit där box outcomes matter
- Domän 6, 11, 15 och 27 får inte definiera avvikande momsrutekarta utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `VatBoxDefinition`
- `VatBoxMappingPolicy`
- `VatPeriodReplacement`
- `PeriodicSummaryMapping`
- `VatBoxLineageReceipt`
- `VatXmlTagMapping`

## Kanoniska state machines

- `VatBoxMappingPolicy`: `draft -> active | superseded | retired`
- `VatPeriodReplacement`: `draft -> filed | superseded | cancelled`
- `PeriodicSummaryMapping`: `draft -> active | retired`

## Kanoniska commands

- `PublishVatBoxDefinition`
- `PublishVatBoxMappingPolicy`
- `PublishVatXmlTagMapping`
- `RecordVatPeriodReplacement`
- `RecordVatBoxLineageReceipt`

## Kanoniska events

- `VatBoxDefinitionPublished`
- `VatBoxMappingPolicyPublished`
- `VatXmlTagMappingPublished`
- `VatPeriodReplacementRecorded`
- `VatBoxLineageReceiptRecorded`

## Kanoniska route-familjer

- `POST /vat-box-definitions`
- `POST /vat-box-policies`
- `POST /vat-xml-mappings`
- `POST /vat-period-replacements`
- `POST /vat-box-lineage-receipts`

## Kanoniska permissions och review boundaries

- only tax or finance governance may publish box mappings
- support may not override box mappings
- replacements require filing-aware approval
- import and reverse-charge box changes are high-risk tax changes

## Nummer-, serie-, referens- och identitetsregler

- varje VAT box ska ha `VAT-BOX-NN`
- varje mapping policy ska ha `VAT-POL-NNN`
- varje replacement ska ha `VAT-RPL-NNN`
- varje XML-tag mapping ska ha `VAT-XML-NNN`

## Valuta-, avrundnings- och omräkningsregler

- box amounts must follow owning VAT truth doc rounding rules
- foreign currency scenarios must store source and SEK reporting lineage
- import and reverse-charge boxes must preserve taxable base and tax amount lineage separately

## Replay-, correction-, recovery- och cutover-regler

- box mapping version used för filed periods must be replayable
- replacement declarations must preserve original-to-replacement lineage
- migration must preserve filed box history and corrections
- rerun of VAT report may not mutate already filed lineage without explicit replacement flow

## Huvudflödet

1. scenario classified
2. box mapping policy resolved
3. box totals aggregated by period
4. periodic summary and XML-tag effects derived where relevant
5. filing package created
6. replacement or correction receipts preserved if period changes

## Bindande scenarioaxlar

- seller or buyer
- domestic, EU, import or export
- standard, reduced, exempt or reverse charge
- original or replacement period
- goods, services, import, reverse-charge purchase, exempt sale or special regime
- deductible or non-deductible input VAT

## Bindande policykartor

- `VAT-BOX-POL-001 scenario_to_box`
- `VAT-BOX-POL-002 reverse_charge_to_box`
- `VAT-BOX-POL-003 import_to_box`
- `VAT-BOX-POL-004 periodic_summary_to_box_linkage`
- `VAT-BOX-POL-005 replacement_lineage_policy`
- `VAT-BOX-POL-006 xml_tag_to_box_policy`
- `VAT-BOX-POL-007 non_deductible_input_vat_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `VAT-BOX-P0001` domestic taxable sales not in `06`, `07` or `08` -> box `05`
- `VAT-BOX-P0002` domestic taxable withdrawals -> box `06`
- `VAT-BOX-P0003` margin scheme taxable base -> box `07`
- `VAT-BOX-P0004` rental income under voluntary VAT -> box `08`
- `VAT-BOX-P0005` output VAT 25 -> box `10`
- `VAT-BOX-P0006` output VAT 12 -> box `11`
- `VAT-BOX-P0007` output VAT 6 -> box `12`
- `VAT-BOX-P0008` intra-EU goods purchase -> box `20`
- `VAT-BOX-P0009` intra-EU services purchase under main rule -> box `21`
- `VAT-BOX-P0010` services purchase from outside EU -> box `22`
- `VAT-BOX-P0011` domestic goods purchase where buyer is liable -> box `23`
- `VAT-BOX-P0012` domestic services purchase where buyer is liable -> box `24`
- `VAT-BOX-P0013` output VAT 25 on purchases in `20-24` -> box `30`
- `VAT-BOX-P0014` output VAT 12 on purchases in `20-24` -> box `31`
- `VAT-BOX-P0015` output VAT 6 on purchases in `20-24` -> box `32`
- `VAT-BOX-P0016` goods sale to another EU country -> box `35`
- `VAT-BOX-P0017` goods sale outside EU -> box `36`
- `VAT-BOX-P0018` middleman purchase in triangulation -> box `37`
- `VAT-BOX-P0019` middleman sale in triangulation -> box `38`
- `VAT-BOX-P0020` services sale to taxable person in another EU country under main rule -> box `39`
- `VAT-BOX-P0021` other services supplied abroad -> box `40`
- `VAT-BOX-P0022` sale where buyer is liable in Sweden -> box `41`
- `VAT-BOX-P0023` other sales etc exempt from VAT and not reported elsewhere -> box `42`
- `VAT-BOX-P0024` import taxable base -> box `50`
- `VAT-BOX-P0025` import output VAT 25 -> box `60`
- `VAT-BOX-P0026` import output VAT 12 -> box `61`
- `VAT-BOX-P0027` import output VAT 6 -> box `62`
- `VAT-BOX-P0028` deductible input VAT -> box `48`
- `VAT-BOX-P0029` VAT payable or refundable is derived -> box `49`

## Bindande rapport-, export- och myndighetsmappning

- VAT report must show exact box outputs and lineage
- periodic summary must link to relevant box-driven scenarios
- replacement packages must show original and replacement receipts
- XML-file exports must use Skatteverkets published tag names för each supported box

## Bindande scenariofamilj till proof-ledger och rapportspar

- domestic output -> `VAT-BOX-P0001` to `VAT-BOX-P0007`
- reverse-charge and acquisition purchases -> `VAT-BOX-P0008` to `VAT-BOX-P0015`
- EU goods or services sales -> `VAT-BOX-P0016`, `VAT-BOX-P0020`
- export and other exempt sales -> `VAT-BOX-P0017`, `VAT-BOX-P0021`, `VAT-BOX-P0022`, `VAT-BOX-P0023`
- triangulation -> `VAT-BOX-P0018`, `VAT-BOX-P0019`
- import -> `VAT-BOX-P0024` to `VAT-BOX-P0027`
- deductible input VAT -> `VAT-BOX-P0028`
- payable or refundable summary -> `VAT-BOX-P0029`

## Tvingande dokument- eller indataregler

- every VAT scenario must name box mapping policy
- every filed period must store box totals with lineage
- every replacement must link original period
- every XML export must store exact tag-to-box lineage
- route `49` must be computed from source boxes, never manually entered as primary truth

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `VAT-BOX-R001 missing_box_mapping`
- `VAT-BOX-R002 forbidden_manual_box_override`
- `VAT-BOX-R003 missing_replacement_lineage`
- `VAT-BOX-R004 invalid_xml_tag_mapping`
- `VAT-BOX-R005 forbidden_manual_box_49_input`

## Bindande faltspec eller inputspec per profil

- box definition: `box_code`, `meaning`, `allowed_scenarios[]`
- mapping policy: `scenario_code`, `box_codes[]`, `conditions[]`
- replacement: `period_id`, `original_receipt`, `replacement_receipt`
- XML mapping: `box_code`, `xml_tag`, `sign_rules`, `replacement_rules`

## Scenariofamiljer som hela systemet måste tacka

- domestic standard rates
- taxable withdrawals
- margin scheme and voluntary rental
- EU goods and services purchases
- domestic reverse-charge purchases
- EU goods and services sales
- export
- triangulation
- other services supplied abroad
- sales where buyer is liable in Sweden
- other exempt sales
- import VAT
- deductible and non-deductible input VAT
- replacements

## Scenarioregler per familj

- box mapping must be explicit
- replacement must never overwrite original lineage
- unsupported scenario remains blocked
- box `49` must be derived from boxes `10`, `11`, `12`, `30`, `31`, `32`, `60`, `61`, `62` minus `48`
- non-deductible input VAT must never be routed to `48`

## Blockerande valideringar

- VAT report blocked om box mapping saknas
- filing blocked om replacement lineage saknas
- manual box override blocked utan policy
- XML export blocked om tag mapping saknas för a reported box
- filing blocked om route `49` is manually overridden as source truth

## Rapport- och exportkonsekvenser

- box drilldown must show source scenarios and receipts
- filed and replacement periods must be distinguishable
- periodic summary drilldown must show why a scenario landed in `35`, `38` eller `39`
- XML export receipts must show exact Skatteverket tags used

## Förbjudna förenklingar

- UI labels as box truth
- overwriting original filed period
- inferred reverse charge without explicit mapping
- treating `48` as catch-all för all input VAT
- entering `49` manually as if it were a primary box

## Fler bindande proof-ledger-regler för specialfall

- `VAT-BOX-P0030` non-deductible input VAT must not land in `48`
- `VAT-BOX-P0031` OSS and special VAT declarations must remain outside ordinary momsdeklaration boxes unless Skatteverket explicitly says otherwise
- `VAT-BOX-P0032` HUS and grön teknik claim flows may affect VAT reporting only through the owning sales scenario, never through a fake separate VAT box family
- `VAT-BOX-P0033` replacement declaration must preserve both original filed totals and replacement totals för every touched box

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- VAT box proofs must point back to owning seller, buyer or authority states
- periodic summary mappings must point back to the source invoice or credit lineage
- import mappings must point back to import evidence and import-VAT basis

## Bindande verifikations-, serie- och exportregler

- series governed elsewhere; this doc governs box mapping only
- XML exports must use Skatteverkets published tags such as `ForsMomsEjAnnan`, `InkopVaruAnnatEg`, `MomsInkopUtgHog`, `MomsIngAvdr`, `MomsBetala`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- scenario x geography
- scenario x rate
- seller x buyer-liability outcome
- deductible x non-deductible input VAT
- original x replacement

## Bindande fixture-klasser för momsrutekarta

- `VAT-BOX-FXT-001` domestic standard
- `VAT-BOX-FXT-002` EU and export
- `VAT-BOX-FXT-003` reverse charge and import
- `VAT-BOX-FXT-004` replacements
- `VAT-BOX-FXT-005` XML-file export

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_box_codes[]`
- `expected_periodic_summary_effect`
- `expected_xml_tags[]`
- `expected_lineage_receipt`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT

## Bindande expected outcome per central scenariofamilj

- domestic 25 percent sale must land in `05` and `10`
- reverse-charge domestic purchase must land in `24` plus `30`, `31` or `32` depending rate, and `48` only if deductible
- deductible domestic input VAT must land in `48`
- import 25 percent must land in `50` and `60`
- route `49` must equal output routes minus `48`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- domestic sale -> `05/06/07/08` plus `10/11/12`
- EU or reverse-charge purchases -> `20/21/22/23/24` plus `30/31/32`
- EU goods sale -> `35`
- export goods -> `36`
- triangulation -> `37/38`
- EU services sale under main rule -> `39`
- services supplied abroad -> `40`
- sale where buyer is liable in Sweden -> `41`
- other exempt sales etc -> `42`
- import -> `50` plus `60/61/62`
- deductible input VAT -> `48`
- payable or refundable VAT -> `49`

## Bindande testkrav

- box completeness tests
- reverse charge box tests
- import box tests
- replacement lineage tests
- blocked manual override tests
- XML-tag mapping tests
- box `49` derivation tests

## Källor som styr dokumentet

- [Skatteverket: Fylla i momsdeklarationen](https://www.skatteverket.se/foretag/moms/deklareramoms/fyllaimomsdeklarationen.4.3a2a542410ab40a421c80004214.html)
- [Skatteverket: Lämna momsdeklaration via fil i e-tjänsten](https://www.skatteverket.se/foretag/moms/deklareramoms/skapaochskickainmomsdeklarationviafil.4.2fb39afe18dabf1e4d223cc.html)
- [Skatteverket: Omvänd betalningsskyldighet inom byggsektorn](https://skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn.4.47eb30f51122b1aaad28000545.html)
- [Skatteverket: Sälja varor till ändra EU-lander](https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/forsaljningtillandraeulander/saljavarortillandraeulander.4.18e1b10334ebe8bc8000782.html)
- [Skatteverket: VAT items, box by box](https://www.skatteverket.se/servicelankar/otherlanguages/englishengelska/businessesandemployers/startingandrunningaswedishbusiness/declaringtaxesbusinesses/vat/vatitemsboxbybox.4.3dfca4f410f4fc63c8680004502.html)

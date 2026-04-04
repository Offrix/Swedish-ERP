# DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för dimensioner, objekt, dimensions-/objektkrav på posting, SIE-mappning, roundtrip-bevis och import/export-governance.

Detta dokument ska styra:
- canonical dimension taxonomy
- canonical object taxonomy
- account- och flow-bunden dimensionsplikt
- mapping mellan internal object truth och SIE objektlistor
- roundtripkrav för SIE import/export
- governance för auto-created values och legacy remap

Ingen route, inget importverktyg, ingen exporter, inget UI och inget affärsflöde får definiera avvikande dimensions- eller objekttruth utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela dimensions- och objektlagret utan att gissa:
- vilka dimensionstyper som får finnas
- hur dimensioner skiljer sig från objekt och fria taggar
- när posting måste blockeras på grund av saknad dimension
- hur objectJson/dimensionJson ska mappas till SIE
- hur historik och roundtrip ska bevaras utan informationsförlust

## Omfattning

Detta dokument omfattar:
- dimensionstyper
- dimensionvarden
- object assignments på postings och subledgers
- account-policy för obligatoriska eller frivilliga dimensioner
- SIE export och import av objekt
- roundtrip-evidence
- migration/remap och retirement av values

Detta dokument omfattar inte:
- hela BAS-kontoplanen i sig
- hela SIE-formatet i sig
- projektekonomi eller WIP-logik i sig
- UI-styling

Kanonisk agarskapsregel:
- affärsflöden äger när en dimension behovs affärsmassigt
- detta dokument äger den gemensamma taxonomin, valideringen, SIE-mappningen och historikbevarandet

## Absoluta principer

- dimensioner och objekt får aldrig vara osynlig eller frivillig metadata om de styr posting, rapport eller export
- en posting får aldrig tappa en required dimension i export eller replay
- historiska postings får aldrig skrivas om när en dimension byter namn eller pensioneras
- dimensioner får aldrig reduceras till fri text om de har legal eller rapportbärande betydelse
- SIE-export får aldrig skriva tom objektlista om canonical truth faktiskt innehåller objekt
- SIE-import får aldrig skapa ny canonical sanning tyst utan uttrycklig importpolicy
- samma dimensionstyp får aldrig ha två samtidiga aktiva vard en med samma kod inom samma tenant
- mixed eller conflict-fall får aldrig auto-losas utan explicit policy eller review

## Bindande dokumenthierarki för dimensioner, objekt och SIE-mappning

Detta dokument lutar bindande på minst:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md`
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md`
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md`

Detta dokument äger dock den gemensamma taxonomin och roundtrip-sanningen om de ändra dokumenten bara antyder dimensioner.

## Kanoniska objekt

Minst följande objekt måste finnas:
- `DimensionType`
  - exempel: `project`, `cost_center`, `department`, `asset_group`, `employee_group`, `custom_object_family`
- `DimensionValue`
  - tenant-bound, effective-date-bound value inom en dimensionstyp
- `ObjectAssignment`
  - actual binding mellan posting/subledger/report row och dimension value
- `DimensionRequirementRule`
  - policy som sager `required`, `optional`, `forbidden` eller `conditional`
- `DimensionRequirementContext`
  - account range, flow family, legal profile, entity eller scenario som regeln gäller för
- `SIEObjectTypeMapping`
  - intern dimensionstyp -> SIE object type / object namespace
- `SIEObjectAssignment`
  - export-ready representation av object list
- `SIERoundtripEvidence`
  - artifact som bevisar att export + import bevarar objekttruth
- `LegacyObjectRemap`
  - explicit mapping av inkommande legacy object till canonical dimension value
- `DimensionVersion`
  - lineage vid namnbyte, retirement eller split/merge

## Kanoniska state machines

### A. `DimensionValue`
- `draft`
- `active`
- `retired`
- `blocked`
- `historical_only`

Tillåtna övergångar:
- `draft -> active`
- `active -> retired`
- `retired -> historical_only`
- `draft -> blocked`
- `active -> blocked`

Otillatet:
- `retired -> active` utan ny version eller explicit restore decision

### B. `ObjectAssignment`
- `pending_validation`
- `validated`
- `applied`
- `rejected`
- `migrated`

### C. `SIERoundtripEvidence`
- `pending`
- `passed`
- `failed`
- `waived_for_legacy_review`

## Kanoniska commands

- `CreateDimensionType`
- `CreateDimensionValue`
- `ActivateDimensionValue`
- `RetireDimensionValue`
- `BlockDimensionValue`
- `SetDimensionRequirementRule`
- `ValidatePostingDimensions`
- `AssignObjectsToPosting`
- `ImportSIEWithPolicy`
- `ExportSIESnapshot`
- `RecordSIERoundtripEvidence`
- `CreateLegacyObjectRemap`
- `SplitDimensionValue`
- `MergeDimensionValue`

## Kanoniska events

- `DimensionTypeCreated`
- `DimensionValueCreated`
- `DimensionValueActivated`
- `DimensionValueRetired`
- `DimensionRequirementRuleSet`
- `PostingDimensionsValidated`
- `PostingBlockedForMissingDimension`
- `ObjectAssignmentApplied`
- `SIEImportMatched`
- `SIEImportBlocked`
- `SIEExportCreated`
- `SIERoundtripPassed`
- `SIERoundtripFailed`
- `LegacyObjectRemapCreated`

## Kanoniska route-familjer

Tillåtna route-familjer:
- dimension-governance admin routes
- read-only dimension lookup routes
- posting validation routes
- SIE import/export routes
- roundtrip evidence routes
- migration/remap routes

Förbjudna route-familjer:
- raw update routes som direkt muterar historiska object assignments
- import routes som skapar nya dimensioner utan policy

## Kanoniska permissions och review boundaries

- `dimension_admin`
  - skapa typer och värden
- `dimension_policy_owner`
  - satta requirement rules
- `accounting_operator`
  - använda aktiva values inom tillaten policy
- `migration_operator`
  - skapa remap-forslag men inte godkänna high-risk auto-create
- `migration_reviewer`
  - godkänna `allow-derived-create` och conflict resolution
- `auditor_readonly`
  - läsa history, mapping och roundtrip evidence

Step-up eller review krav:
- split eller merge av dimensionvalue som redan använts i posting
- auto-create från legacy import
- ändring av `required` rules för accounts/flows

## Nummer-, serie-, referens- och identitetsregler

- varje `DimensionType` ska ha stabil `dimensionTypeCode`
- varje `DimensionValue` ska ha stabil `dimensionValueCode` inom typen
- kod får aldrig återanvändas för annan affärsinnebord inom samma tenant utan ny version och explicit retire lineage
- `LegacyObjectRemap` ska ha eget `remapId`
- `SIERoundtripEvidence` ska binda export artifact digest till import artifact digest

## Valuta-, avrundnings- och omräkningsregler

- dimensioner får aldrig användas som dold valutaersättare
- dimension assignment ska vara valutaagnostisk men kunna bindas till poster i olika valutor
- exporterade objekt får inte tappa canonical amount binding när valuta skiljer sig mellan transaktion och accounting currency

## Replay-, correction-, recovery- och cutover-regler

- replay av samma posting får aldrig skapa dubbel object assignment
- correction får aldrig skriva över historiskt object assignment in-place
- retirement av value får inte bryta replay av historiska artifacts
- cutover och migration måste bevara original object lineage eller explicit remap lineage

## Huvudflödet

1. definiera dimensionstyp och dimensionvarden
2. satta requirement rules per account/flow/context
3. validera object assignment vid posting eller import
4. persistera canonical assignment på posting/subledger/report truth
5. exportera objektlista i SIE
6. verifiera roundtrip med golden file eller equivalent evidence

## Bindande scenarioaxlar

Systemet måste korsas minst över dessa axlar:
- `required | optional | forbidden | conditional`
- `manual_posting | imported_posting | system_generated_posting`
- `active_value | retired_value | unknown_value`
- `match_only | allow_derived_create | manual_review_required`
- `single_dimension | multi_dimension`
- `clean_roundtrip | lossy_roundtrip_attempt`

## Bindande policykartor

### A. Requirement policy
- `required` -> posting blockeras om dimension saknas eller är ogiltig
- `optional` -> posting får ske men dimension får inte uppfinnas i export
- `forbidden` -> posting blockeras om dimension anges
- `conditional` -> rulepack måste beskriva exakt kondition

### B. Import policy
- `match_only`
  - endast kanda konton och kanda objects tillats
- `allow_derived_create`
  - nya dimension values tillats endast för godkända typer och efter review
- `manual_review_required`
  - import persisteras som review case, inte som full canonical posting

### C. SIE policy
- intern dimensionstyp måste mappas till explicit SIE object family eller explicit `not_exported_but_forbidden_if_present`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

Dimensiondokumentet äger inte konton i sig men äger expected dimensionutfall på proof-ledger.

Varje posting som policykraver dimension måste ha:
- `postingId`
- `accountCode`
- `dimensionAssignments[]`
- `requirementRuleRef`
- `validationOutcome`

Om `validationOutcome != passed` får posting inte bli canonical legal-effect truth.

## Bindande rapport-, export- och myndighetsmappning

Minst följande mappningar måste finnas:
- internal dimension values -> report filters
- internal dimension values -> workbench row labels
- internal dimension values -> SIE object lists
- internal dimension values -> audit export metadata

Regel:
- om dimensionen är synlig i workbench eller report måste samma assignment kunna återfinnas i relevant export eller artifact metadata

## Bindande scenariofamilj till proof-ledger och rapportspar

- `DIM-A` standard posting med required project
- `DIM-B` missing required dimension
- `DIM-C` retired value i historisk replay
- `DIM-D` SIE import match-only
- `DIM-E` SIE import allow-derived-create
- `DIM-F` SIE import blocked unknown object
- `DIM-G` SIE export roundtrip pass
- `DIM-H` mixed/conflicting dimensions blocked
- `DIM-I` migration remap explicit lineage

## Tvingande dokument- eller indataregler

Minst följande fält måste finnas för dimension-governance:
- `dimensionTypeCode`
- `dimensionValueCode`
- `effectiveFrom`
- `effectiveTo` där relevant
- `status`
- `ownerFlowFamilies[]`
- `requirementMode`
- `sieMappingRef`
- `createdBy`
- `approvedBy` där review krävs

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `missing_required_dimension`
- `retired_dimension_used`
- `unknown_dimension_code`
- `forbidden_dimension_present`
- `conditional_rule_not_satisfied`
- `sie_object_unmapped`
- `legacy_remap_required`
- `lossy_roundtrip_detected`
- `derived_create_not_allowed`

## Bindande faltspec eller inputspec per profil

### `DimensionType`
- `dimensionTypeCode`
- `name`
- `status`
- `exportableToSIE`
- `ownerFlows[]`

### `DimensionValue`
- `dimensionValueCode`
- `displayName`
- `status`
- `effectiveFrom`
- `effectiveTo`
- `parentValueRef` där relevant

### `DimensionRequirementRule`
- `ruleId`
- `contextRef`
- `requirementMode`
- `dimensionTypeCode`
- `conditionExpression` där `conditional`

## Scenariofamiljer som hela systemet måste tacka

- required project på revenue posting
- forbidden dimension på bank posting
- conditional dimension på payroll cost center
- import av kand object
- import av okand object under `match_only`
- import av okand object under `manual_review_required`
- export med flera objekt på en transaktion
- roundtrip med exakt samma object list
- remap av legacy objekt vid cutover

## Scenarioregler per familj

### `DIM-A`
- posting ska passera med required dimension och exportera samma object assignment

### `DIM-B`
- posting ska blockeras innan legal-effect posting

### `DIM-D`
- `match_only` ska avvisa okanda values

### `DIM-E`
- `allow_derived_create` ska skapa review gate och lineage

### `DIM-G`
- export + import ska ge samma object assignments och samma antal assignments

## Blockerande valideringar

- saknad required dimension blockeras
- retired value på ny posting blockeras
- förbjuden dimension blockeras
- unmappad SIE object type blockeras för export
- roundtrip diff i object list blockeras för release
- conflicting value inom samma dimension type blockeras

## Rapport- och exportkonsekvenser

- report filters ska bara visa godkända active values eller historical values i historical scope
- SIE export ska skriva verklig object list
- audit export ska visa dimension lineage och policy refs

## Förbjudna förenklingar

- fri text i stallet för first-class dimension
- tyst defaultdimension
- dropping av object list i export
- auto-create av nya values utan policy eller review
- overwrite av historiska assignments
- sammanlaggning av flera canonical values till en oklar exportstrang

## Fler bindande proof-ledger-regler för specialfall

- historisk replay ska använda den assignment som gallde da postingen skapades
- om dimension split/merge skett ska historisk posting fortfarande peka på historisk version och relationen till nya values måste vara lineage, inte overwrite

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

Dimensioner måste kunna påverka eller filtrera:
- reskontraöppna poster
- WIP-state
- payroll cost center summaries
- project profitability
- audit export trace

## Bindande verifikations-, serie- och exportregler

- dimensionassignments måste bevaras på verifikationsradsnivA om de har satts där
- SIE export måste kunna uttrycka samma object list på transaktionsrad
- export artifact måste ha roundtrip-proof ref för releasestatus `green`

## Bindande variantmatris som måste korsas mot varje scenariofamilj

Minst följande korsningar:
- `required | optional | forbidden | conditional`
- `manual | imported | system_generated`
- `active | retired | unknown`
- `match_only | allow_derived_create | manual_review_required`
- `single_object | multi_object`

## Bindande fixture-klasser för dimensioner, objekt och SIE-mappning

- `DIMX-001` enkel project dimension
- `DIMX-002` required cost center på payroll
- `DIMX-003` forbidden bank dimension
- `DIMX-004` SIE export with multi-object list
- `DIMX-005` SIE import unknown object blocked
- `DIMX-006` legacy remap with lineage
- `DIMX-007` roundtrip equality pass

## Bindande expected outcome-format per scenario

Varje scenario ska minst ge:
- `inputPolicy`
- `inputAssignments[]`
- `validationOutcome`
- `postingOutcome`
- `exportedObjectList[]`
- `roundtripOutcome`
- `blockingReasons[]`
- `lineageRefs[]`

## Bindande canonical verifikationsseriepolicy

Detta dokument skapar inte series, men om en posting har dimensionsbunden export ska verifikationsradens canonical identity bevaras oforandrad genom export/import.

## Bindande expected outcome per central scenariofamilj

- `DIM-A001` revenue with required project -> posting passes, object list exported
- `DIM-B001` missing project -> posting blocked
- `DIM-D001` import unknown under match-only -> import blocked
- `DIM-G001` export/import roundtrip -> identical object list and identical posting binding
- `DIM-I001` legacy remap -> remap lineage visible, historical value preserved

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `DIM-A*` -> required assignment success
- `DIM-B*` -> missing dimension blocked
- `DIM-C*` -> historical retired replay preserved
- `DIM-D*` -> strict import matching
- `DIM-E*` -> reviewed derived create
- `DIM-F*` -> unmapped blocked
- `DIM-G*` -> roundtrip equality
- `DIM-H*` -> conflict blocked
- `DIM-I*` -> migration lineage preserved

## Bindande testkrav

Minst följande tester är blockerande:
- requirement rule tests
- posting validation tests
- SIE export object-list golden files
- SIE import policy tests
- roundtrip equality tests
- historical replay tests
- lineage tests för split/merge/remap
- release gate tests that fail on lost object list

## Källor som styr dokumentet

- `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md`
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md`
- `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`
- `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`
- `06_RELEASE_GATES_OCH_ACCEPTANSKRAV.md`

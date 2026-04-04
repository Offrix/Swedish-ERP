# BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hur hela BAS-kontoplanen ska kunna sökas, rangordnas och presenteras genom flerordsfraser, synonymer, vendor-termer, vardagsuttryck och kontextsignaler utan att systemet låter sökfunktionen bli fri gissning eller frikopplad kontotext.

## Syfte

Detta dokument ska låsa hur plattformen:
- laddar in hela officiella BAS-kontoplanen 2026 som kanonisk källsanning
- bygger en bindande phrase-matris över hela kontoplanen
- returnerar flera kandidater när en sökfras är tvetydig
- blockerar auto-select när sökning ensam inte får avgöra konto
- kopplar konto-sök till rätt ägande flöde eller rätt bindande sanning

Detta dokument styr sökning i:
- manuell kontosok
- workbench-kandidater
- scanning/OCR-kandidater
- import- och klassningshjalp
- operatorstödd i review-center

## Omfattning

Detta dokument omfattar:
- hela officiella BAS-kontoplanen 2026
- phrase- och intentionsmatris för alla konton i kontoplanen
- flerordsfraser, synonymer, vardagsnamn och vendor-liknande uttryck
- rankingregler för exakta och tvetydiga sökningar
- blockerregler för kandidatval
- auditbar versionering av sökmatrisen

Detta dokument omfattar inte:
- slutlig bokföringslogik per affärsflöde
- final account ownership för ett specifikt scenario
- lönekontospecialisering som ägs av separat lönepolicy

## Absoluta principer

- hela BAS-kontoplanen ska vara representerad i en bindande phrase-matris, inte bara ett urval konton
- sökning får inte vara begränsad till ett ord; flerordsfraser är förstaklassmedborgare
- en vardagsfras som `kaffe`, `mobiltelefon`, `p bot` eller `hotell` får returnera flera kandidater om flera konton är rimliga
- söklagret får aldrig tyst auto-valja mellan avdragsgillt, ej avdragsgillt, löneagt, privatagt eller legal-basis-krav utan uttrycklig kontext
- phrase-matrisen får hjälpa hela systemet, men den får aldrig overrida bokförings-, moms-, lön-, HUS- eller AGI-sanningarna
- den maskinläsbara matrisen är bindande och ska versioneras tillsammans med detta dokument

## Bindande dokumenthierarki för BAS-kontoplanens sökfraser och bokningsintention

- detta dokument äger phrase-driven account candidate generation för hela BAS-kontoplanen
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` äger canonical account families, defaultkonton, control-account policy och blocked overrides
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md` äger lönekonton och payroll-owned konton
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger när och hur phrase candidates får genereras i scanninglagret
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` äger hur kandidater visas i workbenches och läsytor
- ingen annan bindande sanning får definiera avvikande phrase-matris, candidate ranking eller auto-select policy utan att detta dokument och dess maskinläsbara bilaga skrivs om samtidigt

## Kanoniska objekt

- `BasAccountSearchEntry`
- `BasPhraseCluster`
- `BasCandidateSet`
- `BasSearchBlocker`
- `BasRankingReceipt`
- `BasSearchMatrixVersion`

## Kanoniska state machines

- `BasAccountSearchEntry`: `draft -> active | superseded | retired`
- `BasPhraseCluster`: `draft -> active | superseded | retired`
- `BasCandidateSet`: `draft -> returned | blocked | refined | resolved`
- `BasSearchMatrixVersion`: `draft -> published | superseded | retired`

## Kanoniska commands

- `PublishBasAccountSearchEntry`
- `PublishBasPhraseCluster`
- `PublishBasSearchMatrixVersion`
- `RecordBasRankingReceipt`
- `BlockBasAutoselectScenario`

## Kanoniska events

- `BasAccountSearchEntryPublished`
- `BasPhraseClusterPublished`
- `BasSearchMatrixVersionPublished`
- `BasRankingReceiptRecorded`
- `BasAutoselectScenarioBlocked`

## Kanoniska route-familjer

- `GET /account-search`
- `POST /account-search/review`
- `POST /account-search/ranking-receipts`
- `POST /account-search/blockers`
- `GET /account-search/matrix-version`

## Kanoniska permissions och review boundaries

- finance governance äger phrase-matrisen
- support får läsa och använda kandidater men får inte ändra matrisen
- OCR/scanning får konsumera kandidater men får inte skriva ny phrase truth
- auto-select-regler är high-risk finance policy och får inte ändras i UI

## Nummer-, serie-, referens- och identitetsregler

- varje sökentry ska ha `BAS-SOK-ENT-NNNN`
- varje phrase cluster ska ha `BAS-SOK-CL-NNN`
- varje blocker ska ha `BAS-SOK-BLK-NNN`
- varje ranking receipt ska ha `BAS-SOK-RCP-NNN`
- varje matrix version ska ha `BAS-SOK-VYYYYMMDD-NN`

## Valuta-, avrundnings- och omräkningsregler

- valuta får aldrig ensam styra konto, men valutarelaterade fraser måste kunna peka på valutadokumenten eller FX-konton
- sökmatrisen måste vara oberoende av beloppsavrundning
- fraser som antyder valuta, import eller export får skapa kandidater men får inte själva faststalla moms- eller bokföringslogik

## Replay-, correction-, recovery- och cutover-regler

- varje sökresultat som leder till operatorval eller review måste kunna kopplas till exakt `BasSearchMatrixVersion`
- historiska receipts får inte omtolkas när phrase-matrisen skrivs om
- migration och cutover måste bevara search-matrix-version lineage
- correction av phrase-matrisen får inte skriva om tidigare candidate receipts

## Huvudflödet

1. officiell BAS 2026-källa laddas in
2. maskinläsbar phrase-matris publiceras
3. query normaliseras accent-insensitivt och whitespace-stabilt
4. exakta konto- och namnmatchningar provas först
5. flerordsfraser, synonymer och intentioner provas darefter
6. kandidatlista rangordnas enligt bindande policy
7. om flera kandidater är rimliga returneras alla rimliga kandidater
8. om auto-select är blockerad skapas refine- eller review-behov
9. downstream-flow avgor slutlig bokföringssanning

## Bindande scenarioaxlar

- querytype: account code, exact official name, vardagsfras, vendor-fras, slang, flödesspecifik fras
- phrase-lengd: ett ord, flerordsfras, hel fråga
- kontextsignal: kund, leverantör, personal, ägare, privat, myndighet, bank, skatt
- legal signal: avdragsgill, ej avdragsgill, moms, reverse charge, import, HUS, lönekoppling
- ownership signal: asset, expense, liability, revenue, payroll, private-owner
- flow hint: ÄR, AP, receipt, outlay, payroll, VAT, tax account, asset, project

## Bindande policykartor

- `BAS-SOK-MAP-001 official_bas_source_to_search_entry`
- `BAS-SOK-MAP-002 account_to_phrase_matrix_row`
- `BAS-SOK-MAP-003 phrase_cluster_to_candidate_accounts`
- `BAS-SOK-MAP-004 blocked_autoselect_phrase_clusters`
- `BAS-SOK-MAP-005 payroll_owned_account_handoff`
- `BAS-SOK-MAP-006 flow_hint_to_candidate_priority`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `BAS-SOK-P0001` exakt fyrsiffrig kontokod -> exakt konto returneras
- `BAS-SOK-P0002` exakt officiellt kontonamn -> exakt konto returneras
- `BAS-SOK-P0003` flerordsfras med flera rimliga kandidater -> hela kandidatset returneras, ingen tyst auto-select
- `BAS-SOK-P0004` query som korsar payroll/non-payroll -> kandidatset + handoff till lönepolicy
- `BAS-SOK-P0005` query som korsar avdragsgill/ej avdragsgill -> kandidatset + blockerad auto-select
- `BAS-SOK-P0006` query utan kandidat -> `no_candidate_blocked`
- `BAS-SOK-P0007` accent-insensitiv normalisering -> samma kandidatset för accent- och ascii-input
- `BAS-SOK-P0008` vendor-lik alias -> kandidatset via phrase-matris
- `BAS-SOK-P0009` private-owner-risk -> kandidatset + owner/private blocker

## Bindande rapport-, export- och myndighetsmappning

- dokumentet skapar inga myndighetsexporter
- search receipts måste dock bevara matrix version, query text, selected candidate och blockerutfall för audit
- workbench- och scanning-layer får bara referera till kandidatset med matrix-version lineage

## Bindande scenariofamilj till proof-ledger och rapportspar

- exact code -> `BAS-SOK-P0001`
- exact official name -> `BAS-SOK-P0002`
- operational phrase -> `BAS-SOK-P0003`
- payroll ambiguity -> `BAS-SOK-P0004`
- deductibility ambiguity -> `BAS-SOK-P0005`
- no candidate -> `BAS-SOK-P0006`
- accent variance -> `BAS-SOK-P0007`
- vendor alias -> `BAS-SOK-P0008`
- private-owner ambiguity -> `BAS-SOK-P0009`

## Tvingande dokument- eller indataregler

- den officiella källsanningen ska sparas som `sources/BAS_kontoplan_2026.xlsx`
- den bindande phrase-matrisen ska sparas som `BAS_KONTOPLAN_2026_STODFRASER_OCH_SOKINTENTIONER.tsv`
- phrase-matrisen ska ha en rad per konto i officiell BAS-källa
- varje rad i phrase-matrisen ska ha kolumnerna `sokord`, `stodfraser` och `tvetydiga_intentioner`
- varje konto ska ha minst `8` `sokord`
- varje konto ska ha minst `8` `stodfraser`
- queryn får besta av flera ord, vendor-namn eller vardagsfras
- accent-insensitiv normalisering ska ske före matchning
- systemet får inte kasta bort queryord som ändrar avsikt, exempelvis `med kund`, `ej avdragsgill`, `privat`, `till personal`, `hotell i utlandet`

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `BAS-SOK-R001 ambiguous_phrase_multiple_accounts`
- `BAS-SOK-R002 no_candidate_found`
- `BAS-SOK-R003 payroll_owned_account_handoff_required`
- `BAS-SOK-R004 legal_context_required_before_autoselect`
- `BAS-SOK-R005 owner_private_risk_requires_review`
- `BAS-SOK-R006 exact_name_or_code_match`

## Bindande faltspec eller inputspec per profil

- `query_text`
- `normalized_query_text`
- `flow_hint`
- `actor_hint`
- `country_hint`
- `deductibility_hint`
- `payroll_hint`
- `owner_private_hint`
- `matrix_version`
- `returned_candidates[]`
- `blocked_reason_code`

## Scenariofamiljer som hela systemet måste tacka

- exakt kontokod
- exakt officiellt kontonamn
- flerordsfras som `kaffe till kontoret`
- flerordsfras som `kaffe med kund`
- flerordsfras som `p bot`
- vendor-fras som `microsoft 365`
- hybridfras som `hotell utlandet`
- hybridfras som `mobiltelefon abonnemang`
- payroll/benefit-fras som `fri lunch`
- private-owner-fras som `privat avgift bolaget betalade`

## Scenarioregler per familj

- exakta kod- och namnmatchningar får returnera en ensam kandidat
- flerordsfraser som binder flera bokföringsfamiljer måste returnera flera kandidater
- vendor-fraser får mappa till en eller flera kandidatkonton men får inte skapa egen kontoklass
- payroll- och förmånfraser måste handoffas till löne- eller förmånbiblarna
- asset-vs-expense-fraser måste blockera auto-select när livslangd, värde eller policygrans saknas

## Blockerande valideringar

- query får inte auto-valjas om kandidatset korsar avdragsgill/ej avdragsgill
- query får inte auto-valjas om kandidatset korsar payroll/non-payroll
- query får inte auto-valjas om kandidatset korsar asset/expense utan kontext
- query får inte auto-valjas om owner/private-risk finns
- query får inte auto-valjas om legal-basis-text eller flödhint saknas

## Rapport- och exportkonsekvenser

- search receipts måste kunna exporteras som auditspar
- matrix version och selected candidate måste vara exportbara i review- och operatorloggar
- inga authorities eller SIE-exporter får byggas direkt på sökresultat utan owning-flow confirmation

## Förbjudna förenklingar

- att behandla ett konto som sökbart bara på ett ord
- att anta att en vardagsfras alltid betyder ett enda konto
- att lata search eller OCR hoppa över tvetydighet för att bli snabbare
- att lata phrase-matrisen overrida canonical posting truth
- att utelamna hela delar av BAS-kontoplanen ur matrisen

## Fler bindande proof-ledger-regler för specialfall

- `kaffe` måste kunna yta minst `5460`, `6071`, `6072`, `7631`, `7632`, `7382` eller annan policygodkand kandidat beroende på kontext
- `p bot` måste kunna yta minst `6992`, löne- eller owner/private-kandidater beroende på vem boten hor till
- `mobiltelefon` måste kunna yta abonemang, IT-tjänst, förbrukningsinventarie och anläggningstillgang beroende på kontext
- `hotell` måste kunna yta resa, representation eller personalevent beroende på sammanhang
- `medlemsavgift` måste kunna yta `6981`, `6982` och eventuellt `6560` beroende på avgiftstyp

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- searchlagret skapar inget subledger
- searchlagret skapar kandidatstate och blockerstate
- `BasCandidateSet` måste spara candidate count, selected candidate, blockerflagga och matrix version
- downstream-flow måste spara vilket search receipt som eventuellt hjälpte fram ett konto

## Bindande verifikations-, serie- och exportregler

- search receipts ska ligga i egen verifikationsfri receipt-serie `BAS-SOK`
- search receipts får inte blandas med juridiska verifikationer
- export av search receipts måste innehålla query text, matrix version, candidate list och selected outcome

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- query form: exakt kod vs exakt namn vs flerordsfras vs vendor alias
- actor: leverantör vs kund vs anställd vs ägare vs bolaget självt
- legality: avdragsgill vs ej avdragsgill vs payroll-owned vs owner-private
- object nature: asset vs expense vs liability vs revenue vs tax
- geography: Sverige vs EU vs tredje land
- flow hint: AP vs receipt vs payroll vs VAT vs bank vs project

## Bindande fixture-klasser för BAS-kontoplanens sökfraser och bokningsintention

- `BAS-SOK-F001 exact_code`
- `BAS-SOK-F002 exact_name`
- `BAS-SOK-F003 everyday_ambiguous_expense`
- `BAS-SOK-F004 payroll_or_benefit_phrase`
- `BAS-SOK-F005 owner_private_phrase`
- `BAS-SOK-F006 vendor_alias_phrase`
- `BAS-SOK-F007 asset_vs_expense_phrase`
- `BAS-SOK-F008 tax_or_vat_phrase`

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `query_text`
- `flow_hint`
- `expected_candidates[]`
- `expected_auto_select_policy`
- `expected_blocker_code`
- `expected_downstream_handoff`

## Bindande canonical verifikationsseriepolicy

- `BAS-SOK` är canonical receipt-serie för sök- och candidate-truth
- varje matrix-publicering ska ge en ny `BasSearchMatrixVersion`
- varje testkorningsbevis ska spara använd matrix-version

## Bindande expected outcome per central scenariofamilj

- `BAS-SÖK-C001 kaffe`: returnera flera kandidater; auto-select blockerad
- `BAS-SÖK-C002 p bot`: returnera non-deductible, löne- eller owner/private-kandidater; auto-select blockerad
- `BAS-SÖK-C003 mobiltelefon`: returnera abonemang, IT-tjänst, förbrukningsinventarie eller anläggningstillgang beroende på kontext; auto-select blockerad
- `BAS-SÖK-C004 hotell utlandet`: returnera minst relevant resekostnad och eventuella representationskandidater; auto-select blockerad utan flödhint
- `BAS-SÖK-C005 microsoft 365`: returnera IT-tjänst/abonnemangskandidater; exact policy beror på flow context
- `BAS-SÖK-C006 kundlunch`: returnera representationskandidater med avdragsgill/ej avdragsgill split; auto-select blockerad

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- exakta konto- och namnmatchningar -> en kandidat
- fraser med flera rimliga konton -> flera kandidater + blockerad auto-select
- payroll-owned fraser -> kandidatset + handoff till payroll-owned sanning
- owner/private-risk -> kandidatset + owner/private review
- vendor aliases -> kandidatset enligt phrase-matris

## Bindande testkrav

- phrase-matrisen måste ha exakt lika många rader som den officiella BAS-källan representerar i importen
- test ska verifiera att varje konto har minst `8` `sokord`
- test ska verifiera att varje konto har minst `8` `stodfraser`
- test ska verifiera att `kaffe`, `p bot`, `mobiltelefon`, `hotell`, `medlemsavgift` och `microsoft 365` ger flerordsbeteende och inte enkelordsbias
- test ska verifiera accent-insensitiv normalisering
- test ska verifiera att exact code och exact official name är stabila
- test ska verifiera att ambiguous candidate sets aldrig auto-selectas när blockerregler gäller
- test ska verifiera att matrix-version receipts sparas

## Källor som styr dokumentet

- officiell BAS-källa: `docs/implementation-control/domankarta-rebuild/sources/BAS_kontoplan_2026.xlsx`
- bindande machine-readable bilaga: `docs/implementation-control/domankarta-rebuild/BAS_KONTOPLAN_2026_STODFRASER_OCH_SOKINTENTIONER.tsv`
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md`
- `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md`
- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md`

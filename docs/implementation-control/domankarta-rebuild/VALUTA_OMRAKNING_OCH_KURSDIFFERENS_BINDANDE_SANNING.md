# VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för redovisningsvaluta, valutakurskallor, omräkningsdatum, kursdifferenser, rounding och FX-lineage genom hela plattformen.

## Syfte

Detta dokument ska låsa:
- vilken redovisningsvaluta som är legal truth
- hur transaktioner i annan valuta räknas om
- vilken kurskalla som är tillaten
- när realiserad eller orealiserad kursdifferens uppstår
- hur FX-effekter bokförs, rapporteras och exporteras

## Omfattning

Detta dokument omfattar:
- SEK- och EUR-ledgerpolicy
- transaction-date, invoice-date, payment-date och period-end valuation policy
- rate source policy
- FX gain/loss och rounding policy
- lineage för ÄR, AP, bank, projects, migration och exports

Detta dokument omfattar inte:
- momsboxmappning eller AGI-faltmappning
- beslut om vilken affärshandelse som ska bokföras, vilket ägs av respektive owner flow

## Absoluta principer

- varje legal entity har exakt en redovisningsvaluta
- all legal bokföring ska balansera i redovisningsvalutan
- foreign amount, source currency och applied rate måste alltid sparas som evidence när originalvalutan inte är redovisningsvalutan
- kursdifferenser får aldrig gommas i affärskonto, moms- eller reskontrakonto
- skattekontot är alltid SEK-only och får inte skapa egen FX-logik
- unsupported rate source eller missing rate lineage blockerar green status

## Bindande dokumenthierarki för valutaomrakning och kursdifferens

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
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md`
- `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md`
- `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md`

## Kanoniska objekt

- `LedgerCurrencyPolicy`
- `ExchangeRatePolicy`
- `ExchangeRateSnapshot`
- `FxValuationReceipt`
- `FxDifferencePosting`
- `CurrencyConversionBlocker`

## Kanoniska state machines

- `LedgerCurrencyPolicy: draft -> approved -> active | superseded`
- `ExchangeRatePolicy: draft -> approved -> active | superseded`
- `ExchangeRateSnapshot: imported -> approved -> active | superseded`
- `FxDifferencePosting: draft -> posted | reversed | blocked`
- `CurrencyConversionBlocker: open -> resolved | waived`

## Kanoniska commands

- `PublishLedgerCurrencyPolicy`
- `PublishExchangeRatePolicy`
- `ImportExchangeRateSnapshot`
- `ApproveExchangeRateSnapshot`
- `CreateFxDifferencePosting`
- `ReverseFxDifferencePosting`
- `BlockUnsupportedCurrencyConversion`

## Kanoniska events

- `LedgerCurrencyPolicyPublished`
- `ExchangeRatePolicyPublished`
- `ExchangeRateSnapshotImported`
- `ExchangeRateSnapshotApproved`
- `FxDifferencePostingCreated`
- `FxDifferencePostingReversed`
- `CurrencyConversionBlocked`

## Kanoniska route-familjer

- `POST /v1/fx/ledger-currency-policies`
- `POST /v1/fx/rate-policies`
- `POST /v1/fx/rate-snapshots/import`
- `POST /v1/fx/difference-postings`
- `POST /v1/fx/difference-postings/{id}/reverse`
- `POST /v1/fx/blockers`

## Kanoniska permissions och review boundaries

- `finance.fx.read`
- `finance.fx.publish`
- `finance.fx.import_rates`
- `finance.fx.post_difference`
- `finance.fx.high_risk_override`
- `finance.fx.audit`

Support och backoffice får inte:
- mata in fria kurser utan policy
- overstyra applied rate på postad voucher
- trycka FX-differens till generic misc account

## Nummer-, serie-, referens- och identitetsregler

- varje exchange rate snapshot ska ha `FX-RATE-NNN`
- varje FX-difference posting ska ha `FX-PST-NNN`
- varje FX valuation receipt ska peka på source transaction id, rate snapshot id och valuation date
- foreign amount och currency code måste bevaras per voucher line när relevant

## Valuta-, avrundnings- och omräkningsregler

- canonical default redovisningsvaluta är `SEK`; `EUR` är bara tillatet när legal entity uttryckligen för bok i euro
- momspliktiga fakturor med svensk moms i utlandsk valuta måste kunna visa momsbelopp i SEK enligt fakturareglerna
- invoice issue, AP issue och ändra owner flows ska använda policybunden omräkningskurs för bokföringsdatumet
- settlement ska använda faktisk betalningskurs eller provider-backed settlement rate med lineage
- avrundningsdifferens ska bokas till `3740`
- canonical default för FX gain är `3960`
- canonical default för FX loss är `7960`

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig byta rate snapshot för redan postad voucher
- correction får bara ske genom reversal eller supplement med ny rate lineage
- recovery får bygga om presentation men inte ny FX-legal effect
- migration måste bevara historical rate source eller markera imported approximation som blockerad om precision inte racker

## Huvudflödet

1. owner flow skapar transaction i source currency
2. redovisningsvaluta resolves
3. rate policy resolves
4. transaction bokas i redovisningsvaluta med foreign evidence bevarad
5. settlement eller period-end valuation kan skapa FX-difference posting
6. FX-effect rapporteras och exporteras med lineage

## Bindande scenarioaxlar

- ledger currency: `SEK`, `EUR`
- source currency: `same_as_ledger`, `foreign_non_EUR`, `foreign_EUR`
- timing: `issue`, `settlement`, `period_end`, `migration`
- realization: `none`, `realized`, `unrealized`
- owner flow: `ar`, `ap`, `bank`, `project`, `asset`, `migration`

## Bindande policykartor

- `FX-POL-001 ledger_currency_policy`
- `FX-POL-002 allowed_rate_sources`
- `FX-POL-003 scenario_to_rate_date`
- `FX-POL-004 gain_loss_account_policy`
- `FX-POL-005 blocked_missing_lineage_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `FX-P0001` foreign ÄR issue -> no separate FX line at issue if invoice booked at policy rate; foreign evidence preserved
- `FX-P0002` foreign AP issue -> no separate FX line at issue if invoice booked at policy rate; foreign evidence preserved
- `FX-P0003` ÄR settlement with FX gain -> debet `1930`, kredit `1510`, kredit `3960`
- `FX-P0004` ÄR settlement with FX loss -> debet `1930`, debet `7960`, kredit `1510`
- `FX-P0005` AP settlement with FX gain -> debet `2440`, kredit `1930`, kredit `3960`
- `FX-P0006` AP settlement with FX loss -> debet `2440`, debet `7960`, kredit `1930`
- `FX-P0007` rounding difference only -> balancing line `3740`
- `FX-P0008` period-end revaluation gain -> credit approved FX gain account family, default `3960`
- `FX-P0009` period-end revaluation loss -> debit approved FX loss account family, default `7960`
- `FX-P0010` missing rate lineage -> blocked, no posting

## Bindande rapport-, export- och myndighetsmappning

- huvudbok ska visa belopp i redovisningsvaluta
- drilldown måste visa foreign amount, source currency och applied rate
- SIE4 ska exportera voucher i redovisningsvaluta och, där format/policy kraver, bevara valutauppgift
- momsrapporter ska inte fa ny momseffekt av ren betalningsdifferens

## Bindande scenariofamilj till proof-ledger och rapportspar

- `FX-A001` foreign ÄR issue -> `FX-P0001`
- `FX-A002` foreign AP issue -> `FX-P0002`
- `FX-B001` ÄR settlement gain -> `FX-P0003`
- `FX-B002` ÄR settlement loss -> `FX-P0004`
- `FX-B003` AP settlement gain -> `FX-P0005`
- `FX-B004` AP settlement loss -> `FX-P0006`
- `FX-C001` rounding-only difference -> `FX-P0007`
- `FX-D001` period-end revaluation gain -> `FX-P0008`
- `FX-D002` period-end revaluation loss -> `FX-P0009`
- `FX-Z001` missing or unsupported rate lineage -> `FX-P0010`

## Tvingande dokument- eller indataregler

- source transaction måste ange `source_currency`, `source_amount`, `booking_date`
- rate lineage måste ange `rate_source`, `rate_date`, `rate_value`, `policy_id`
- settlement måste ange faktisk settlement amount och settlement date
- period-end valuation måste ange valuation date och open item universe

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `FX-R001 source_transaction_rate`
- `FX-R002 settlement_rate`
- `FX-R003 period_end_valuation`
- `FX-R004 imported_historical_rate`
- `FX-R005 unsupported_rate_source`
- `FX-R006 missing_rate_lineage`

## Bindande faltspec eller inputspec per profil

- ledger currency policy: `legal_entity_id`, `ledger_currency`, `effective_from`
- rate policy: `rate_source`, `allowed_currency_pairs[]`, `date_rule`
- rate snapshot: `currency_pair`, `rate_date`, `rate_value`, `source_ref`
- FX posting: `owner_flow`, `original_voucher_ref`, `gain_or_loss`, `account_used`

## Scenariofamiljer som hela systemet måste tacka

- foreign invoice issue
- foreign settlement
- foreign partial settlement
- period-end revaluation
- rounding-only difference
- migration with historical foreign transactions
- unsupported or missing rates

## Scenarioregler per familj

- invoice issue får inte skapa separat FX gain/loss om samma snapshot används för initial bokföring
- settlement skapar realiserad FX-differens när carrying amount och faktisk settlement i redovisningsvaluta skiljer sig
- period-end revaluation får bara avse öppna poster och måste reverseras eller ersättas korrekt i nasta period
- missing rate lineage blockerar posting, export och green status

## Blockerande valideringar

- posting blocked om legal entity saknar redovisningsvaluta
- posting blocked om rate source inte är tillaten av policy
- posting blocked om foreign amount saknas när source currency skiljer sig från ledger currency
- period-end revaluation blocked om open-item lineage är ofullständig

## Rapport- och exportkonsekvenser

- aging och subledger ska visas i redovisningsvaluta med foreign evidence tillgangligt i drilldown
- SIE4-export ska kunna serialisera relevant valutalinjering utan att mutera bokfört SEK/EUR-belopp
- momsrapport ska visa samma boxutfall oberoende av senare FX-settlement

## Förbjudna förenklingar

- fri manuell kurs i UI utan snapshot och policy
- generic `misc difference` i stallet för `3960`, `7960` eller `3740`
- ny momsberakning på ren betalningsdifferens
- FX-logik inne i skattekontot

## Fler bindande proof-ledger-regler för specialfall

- `FX-P0011` partial settlement splits carrying amount proportionally before gain/loss beräknas
- `FX-P0012` credit note in foreign currency reuses issue-date lineage för original correction and settlement-date lineage för cash movement
- `FX-P0013` migrated historical transaction without exact rate source remains blocked för auto-green unless imported evidence meets policy

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `FX-P0001-P0002` skapar eller uppdaterar open item in redovisningsvaluta med foreign evidence
- `FX-P0003-P0006` stanger eller minskar open item och skapar realized FX evidence
- `FX-P0008-P0009` skapar valuation receipt för open items without changing source invoice identity
- `FX-P0010` skapar `CurrencyConversionBlocker`

## Bindande verifikations-, serie- och exportregler

- FX-difference vouchers arver owner-flow-serie om de skapas som del av settlement
- fristaende period-end valuation vouchers får använda serie `D` eller owner-specific finance-approved serie enligt verifikationsseriebibeln
- export måste visa FX line som separat rad, aldrig inbakad i huvudfordran eller huvudskuld

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- ledger currency x source currency
- issue x settlement x period-end
- full x partial settlement
- realized x unrealized
- original x correction x migration

## Bindande fixture-klasser för valutaomrakning och kursdifferens

- `FX-FXT-001` standard foreign ÄR
- `FX-FXT-002` standard foreign AP
- `FX-FXT-003` partial settlement
- `FX-FXT-004` period-end revaluation
- `FX-FXT-005` unsupported or missing rate lineage

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `ledger_currency`
- `source_currency`
- `rate_snapshot_ref`
- `expected_gl_lines[]`
- `expected_open_item_effect`
- `expected_vat_effect`
- `expected_blocker_or_success`

## Bindande canonical verifikationsseriepolicy

- owner-driven FX settlement vouchers arver owner flow series
- period-end valuation får inte blandas in i skattekonto- eller momsserier
- generisk FX-only catch-all-serie är förbjuden

## Bindande expected outcome per central scenariofamilj

### `FX-B001`

- fixture: `FX-FXT-001`
- expected:
  - `1930/1510/3960`
  - realized gain only
  - ingen ny momseffekt
  - ÄR open item stangt

### `FX-B004`

- fixture: `FX-FXT-002`
- expected:
  - `2440/7960/1930`
  - realized loss only
  - ingen ny momseffekt
  - AP open item stangt

### `FX-Z001`

- fixture: `FX-FXT-005`
- expected:
  - ingen posting
  - `CurrencyConversionBlocker`
  - export och green status blockerad

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `FX-A001` -> `FX-P0001` -> foreign ÄR booked with evidence preserved
- `FX-A002` -> `FX-P0002` -> foreign AP booked with evidence preserved
- `FX-B001` -> `FX-P0003` -> `1930/1510/3960` -> realized gain
- `FX-B002` -> `FX-P0004` -> `1930/7960/1510` -> realized loss
- `FX-B003` -> `FX-P0005` -> `2440/1930/3960` -> realized gain
- `FX-B004` -> `FX-P0006` -> `2440/7960/1930` -> realized loss
- `FX-C001` -> `FX-P0007` -> `3740` -> rounding handled explicitly
- `FX-D001` -> `FX-P0008` -> approved gain valuation
- `FX-D002` -> `FX-P0009` -> approved loss valuation
- `FX-Z001` -> `FX-P0010` -> blocked missing lineage

## Bindande testkrav

- unit tests för issue-date conversion and settlement-date conversion
- unit tests för partial settlement allocation
- integration tests proving no VAT effect from pure FX settlement difference
- period-end valuation tests för open items only
- migration tests för imported historical FX lineage
- report/export tests proving same ledger amount across huvudbok, aging och SIE4

## Källor som styr dokumentet

- [Riksdagen: Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- [Skatteverket: Momslagens regler om fakturering](https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Skatteverket: Omräkningskurser när redovisningsvalutan är euro](https://www.skatteverket.se/foretag/drivaforetag/euronochskatterna/omrakningskurser/redovisningsperioder.4.2ef18e6a125660db8b080004155.html)
- [Sveriges Riksbank: Historiska valutakurser](https://www.riksbank.se/sv/statistik/rantor-och-valutakurser/historiska-valutakurser-och-valutor-som-har-upphort/)
- [BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)

# Master test strategy

Detta dokument definierar hur hela systemet ska testas från bootstrap till pilot och produktion.

## Mål

- upptäcka fel innan de når bokföring eller myndighetsrapportering
- säkra att reglerade motorer beter sig identiskt över tid
- ge Codex och användaren en tydlig modell för vad som ska testas när
- göra varje regression reproducerbar

## Testlager

### 1. Statisk analys
- lint
- format
- typecheck
- dependency boundary checks
- security scanning
- migrationskontroll

### 2. Unit tests
- rena funktioner
- klassificering
- summeringar
- formattering
- parserfunktioner
- inboxrouting per bolag och kanal
- message-id dedupe och bilagestatus
- OCR-klassificering för faktura, kvitto och avtal
- review-task-statusar, manuell korrigering och confidence-beslut
- search ranking och permissions trimming-beslut
- retry/backoff-beräkningar och jobbstate
- feature flag-upplösning och kill-switch-beslut
- offline merge-regler och konfliktdetektion

### 3. Property-based tests
- debit = credit
- totalsummor = radsummor
- inga negativa HUS-ansökningsbelopp
- momsbeslut ger alltid deklarationsmappning eller granskningskö
- lönekörning ger alltid nettolön enligt definierad formel
- versionerade regler är deterministiska

### 4. Contract tests
- REST/GraphQL/JSON API-kontrakt
- externa adaptergränser
- XML/JSON-schema
- webhook-signaturer
- open banking- och Peppol-adaptrar
- indexschema, snippets och saved-search payloads
- receipt- och submissionkontrakt
- offline sync-kontrakt och konfliktpayloads
- exportmetadata och metric-versioner

### 5. Golden-data tests
- hela affärsfall med låsta indata och förväntat utfall
- samma golden dataset ska kunna spelas upp efter regeluppdateringar
- diffrapport mellan gammal och ny regelmotor ska produceras

### 6. Integration tests
- Postgres
- cache/queue
- objektlagring
- inbound email
- råmailmetadata, bilagesplit och karantän
- bankhändelser
- OCR pipeline
- OCR-rerun och nya derivatversioner utan mutation
- review queue och manuella korrigeringar per bolag
- Peppol adapter
- myndighetsadaptrar
- sökindex och projektioner
- support/backoffice och audit explorer
- exportjobb och filmaterialisering

### 7. E2E-tests
- UI till API till databas till bokföring till rapport
- operator workbench och guided flows i desktop-web
- vardagliga faltfloden i field-mobile
- mobilflöden för check-in, tid, resa och signatur
- disable-flagga och återläsning av företagets inboxflöden
- disable-flagga och reviewdriven OCR-korrigering med rerun-historik

### 8. Performance tests
- load på dokumentingest
- load på AR/AP
- lönekörning för många anställda
- rapportgenerering
- close workbench
- samtidiga bankavstämningar
- global search och permissions trimming under last
- queue-recovery och replay under incidentåterhämtning
- stora Excel/PDF-exporter

### 9. Restore and resilience
- databasåterläsning
- objektlagringsåterläsning
- köåterhämtning
- failoverövning
- chaos på externa adapterfel

## Golden data library

## 36. Teststrategi — hur varje fas testas till perfektion

### 36.1 Testpyramiden
- unit tests för ren logik
- property-based tests för gränsvärden och datumregler
- contract tests för API och integrationer
- golden-data tests för skatt, moms, lön, pension, traktamente, ROT/RUT, Peppol, årsredovisning
- component tests för UI-komponenter
- end-to-end tests för centrala flöden
- load tests för kritiska transaktionsmönster
- restore tests för backup/återläsning
- manual UAT för pilotscenarier

### 36.2 Golden-data krav
Skapa golden-data för minst följande domäner:
- VAT_SE_DOMESTIC_STANDARD
- VAT_SE_MIXED_RATES
- VAT_EU_B2B_GOODS
- VAT_EU_B2B_SERVICES
- VAT_EU_B2C_THRESHOLD_BELOW
- VAT_EU_B2C_THRESHOLD_CROSSING
- VAT_EXPORT_OUTSIDE_EU
- VAT_IMPORT_WITH_SPEDITOR
- VAT_REVERSE_CHARGE_BUILD
- VAT_REPRESENTATION_LIMITED_DEDUCTION
- PAYROLL_STANDARD_MONTHLY
- PAYROLL_BONUS_AND_OVERTIME
- PAYROLL_SINK
- PAYROLL_AGE_67_PLUS
- PAYROLL_BENEFIT_ONLY
- PAYROLL_ABSENCE_DATA_BLOCK
- BENEFIT_CAR
- BENEFIT_FUEL
- BENEFIT_HEALTH_INSURANCE
- FRISKVARD_VALID
- FRISKVARD_INVALID_GIFTCARD
- GIFTS_THRESHOLD_PASS
- GIFTS_THRESHOLD_FAIL
- TRAVEL_DOMESTIC_HALF_DAY
- TRAVEL_DOMESTIC_FULL_DAY
- TRAVEL_3_MONTH_REDUCTION
- TRAVEL_2_YEAR_REDUCTION
- TRAVEL_FOREIGN_MULTI_COUNTRY
- MILEAGE_OWN_CAR
- MILEAGE_BENEFIT_CAR_PAID_FUEL
- MILEAGE_BENEFIT_CAR_PARTIAL_FUEL_INVALID
- PENSION_ITP1
- PENSION_ITP2
- PENSION_FORA
- SALARY_EXCHANGE_STANDARD
- SALARY_EXCHANGE_PAUSE
- ROT_STANDARD
- RUT_STANDARD
- PERSONALLIGGARE_SITE_THRESHOLD
- PERSONALLIGGARE_CHECKIN_OFFLINE
- PEPPOL_OUTBOUND_STANDARD
- PEPPOL_INBOUND_CREDIT_NOTE
- ANNUAL_REPORT_K2
- ANNUAL_REPORT_DIGITAL_SUBMISSION_PACKAGE

### 36.3 Vad som räknas som perfekt verifiering i varje fas
En fas är inte klar förrän:
- alla definierade testfall är gröna
- inga öppna kritiska eller höga buggar finns
- inga omarkerade juridiska luckor finns
- docs för fasen är uppdaterade
- runbook för fasens driftstöd finns
- rollback-strategi finns om fasen kan påverka produktion
- demo av fasen kan köras på seed-data utan manuell databaspatch

### 36.4 Särskilda verifieringar per domän
#### Ledger
- varje journal är balanserad
- verifikationsnummer är deterministiska inom bolag och serie
- samma idempotency key skapar inte ny verifikation
- importerad historik är markerad utan att tyst skriva om bokad historik
- historisk rapport kan återskapas
- låst period kan inte muteras

#### Moms
- beslutsträd returnerar förklaring
- rapportboxar stämmer mot golden-data
- rättelse gör om hela deklarationen

#### Lön
- AGI kan genereras utan manuell redigering
- frånvarodata blockeras efter submission
- lönebesked matchar bokföring

#### Förmåner
- förmånsvärde matchar regelpaket
- nettolöneavdrag reducerar rätt
- benefit-only scenario loggas korrekt

#### Traktamente
- avrese-/hemkomsttider fungerar
- måltidsreduktion fungerar
- samma ort mer än tre månader fungerar

#### Pension
- rapportunderlag kan stämmas av mot leverantörsfaktura
- salary exchange warnings triggar rätt
- pause/resume ger rätt lön och pension

#### ROT/RUT
- arbetskostnad skiljs från material/resa/admin
- flera köpare hanteras
- utbetalningsbegäran skapas rätt

#### Personalliggare
- byggplats över tröskel kräver liggare
- check-in/out sparas
- export för kontroll kan tas ut

#### Peppol
- XML/UBL validerar
- business rules validerar
- kvittenskedja sparas

### 36.5 Prestandamål som ska gälla innan extern skalning
- publika sidor: snabb first-contentful paint på desktop
- fakturainbox: nya dokument ska normalt synas i systemet inom få minuter
- kundfaktura skapande: interaktiv respons under normal desktopanvändning
- lönekörning: rimlig tid även för större batcher
- rapporter: tunga rapporter ska kunna gå async men ge tydlig status
- sök: global sök ska svara snabbt för vardagliga objekt

## Obligatoriska tvärgående testplaner

Följande testplaner är obligatoriska när scope berör området och ska behandlas som officiell del av masterstrategin:

- `docs/test-plans/queue-resilience-and-replay-tests.md` för köer, retry, replay och dead-letter.
- `docs/test-plans/search-relevance-and-permission-trimming-tests.md` för search, ranking och behörighetsfiltrering.
- `docs/test-plans/mobile-offline-sync-tests.md` för offlinekö, konfliktlösning och dubblettskydd i mobil/offline.
- `docs/test-plans/migration-parallel-run-diff-tests.md` för importbatch, parallellkörning, diff report och cutover.
- `docs/test-plans/audit-review-and-sod-tests.md` för audit explorer, supportåtkomst, impersonation, break-glass och SoD.
- `docs/test-plans/feature-flag-rollback-and-disable-tests.md` för rollout, rollback, kill switch och emergency disable.
- `docs/test-plans/report-reproducibility-and-export-integrity-tests.md` för metric catalog, reproducerbarhet, drilldown och exportjobb.

När en fas använder någon av dessa förmågor ska respektive testplan läsas tillsammans med relevanta ADR:er, policies och runbooks innan implementation startar.

## Testdata policy

- All testdata ska vara syntetisk eller avidentifierad.
- Samma dataset får användas i lokal miljö, CI och staging.
- Golden datasets ska ha versionsnummer.
- Varje reglerad incident i produktion ska resultera i nytt golden fall.

## Environments

### local
- snabb feedback
- docker compose
- seed-data
- lokala stubbar

### ci
- rena containrar
- full statisk analys
- unit, property, contract
- viktiga integrationstester

### staging
- prod-lik miljö
- verkliga adapterstubbar eller sandboxar
- restore-test
- loadtest innan större release

### pilot
- skarpa eller nära skarpa arbetsflöden
- extra övervakning
- daglig avstämning mot manual kontroll

## Test ownership

- domänutvecklare äger unit och golden tests
- integrationsägare äger contract tests
- QA lead äger E2E- och pilottestplaner
- SRE/DevOps äger load, restore och chaos
- produktägare signerar UAT

## Release policy

- reglerade domäner får inte deployas utan golden-data-körning
- schemaändringar kräver migrations- och rollback-plan
- ändringar i submissionformat kräver contract tests och stagingkörning
- ändringar i sökindex, metricdefinitioner, offlinekontrakt eller köpayloads kräver tillhörande tvärgående testplan
- kill switches och feature-flag-ändringar i kritiska flöden kräver rollback- och disable-test

## Verktyg

- Vitest eller motsvarande för unit/component
- fast-check eller motsvarande för property tests
- Playwright för E2E
- Pact eller motsvarande för kontrakt där det passar
- k6 eller motsvarande för load
- pytest för Python-regler och batcher

## Exit gate för teststrategin

- [ ] Testlager finns definierade i repo.
- [ ] Golden data är versionsstyrd.
- [ ] Restore-test kan köras.
- [ ] Alla nya reglerade buggar genererar regressionstest.
- [ ] Tvärgående testplaner är kopplade till relevanta faser och releases.

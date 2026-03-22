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
- offertversionering, fakturaplan och kundimport-idempotens i AR
- issue-idempotens, kreditstängning, leveransvalidering och betallänkar i AR-fakturering
- öppna poster, delbetalningar, dunningavgifter, bankmatchning och aging-buckets i kundreskontra
- leverantörsimport-idempotens, bankdetaljspärrar, PO-defaults och mottagningsdubbletter i AP
- OCR-baserad leverantörsfakturaingest, fler-rads-kodning, momsförslag och 2-vägs-/3-vägsmatchning i AP
- flerstegsattest, betalningsförslag, 2450-reservation, bankbokning och returreplay i AP
- flera anställningar per person, avtalsversioner, chefsträd, payoutmaskning och känslig HR-audit
- clock events, schemaassignments, premiumminuter, periodlås och reproducerbara tidsaldon
- frånvarotyper, chefsgodkännande, signal-komplettering, AGI-lås och historik i anställdportalen
- förmånsvärdering för bil, drivmedel, friskvård, gåvor, kost, sjukvårdsförsäkring och nettolöneavdrag
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
- kundregister, artiklar, prislistor, offertrevision och avtalsplaner i AR
- issued kundfakturor, kreditkopplingar, Peppol/PDF-leveranser och payment-link-persistens i AR
- öppna poster, allocations, unmatched receipts, dunning runs, writeoffs och aging snapshots i AR
- leverantörsregister, leverantörskontakter, PO-rader, mottagningsobjekt, importbatcher och invoice-receipt-links i AP
- leverantörsfaktura-drafts, match runs, variansobjekt, AP-open-items och dokumentdrivna invoice-links i AP
- tidschema, schematilldelningar, clock events, enriched time entries, balans-transaktioner och periodlås
- leave types, leave entry events, leave signals, leave signal locks och employee-portal-projektioner
- löneartskatalog, lönekalendrar, lönekörningar, statutory profiles, skatt/SINK, AGI-versioner, payroll postings, payout batches, vacation liability snapshots, receipts och persistenta lönebesked i payroll
- förmånskatalog, benefit events, AGI-mappning, payroll posting och audit trail i benefits
- travel claims, foreign allowance tables, travel day valuations, mileage logs, expense receipts, advances och payroll intents i travel
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
- disable-flagga och AR-masterdataflöde med offertrevision och aktivt avtal
- disable-flagga och AR-faktureringsflöde med issue, kredit, leverans och payment-link
- disable-flagga och AR-reskontraflöde med delbetalning, felmatchningsreversal, dunning hold och aging snapshot
- disable-flagga och AP-masterdataflöde med leverantör, PO, mottagning och receipt-dubblettskydd
- disable-flagga och AP-invoiceflöde med OCR-ingest, fler-rads-postning och variansblockerad postning
- disable-flagga och AP-betalflöde med attest, export, bankbokning och idempotent retur
- disable-flagga och HR-masterflöde med flera anställningar, avtalsversioner, dokumentlänk och känslig audit
- disable-flagga och tidsflöde med schema, stämpling, projektaktivitet, saldo och periodlås
- disable-flagga och frånvaroflöde med employee portal, chefsgodkännande, historik och AGI-lås
- disable-flagga och payrollflöde med lönekalender, ordnad lönekedja, skatt/SINK, AGI-signering, payroll posting, payout export, bankmatchning, semesterskuld, retrospårning, slutlön och regenererat lönebesked
- disable-flagga och benefitsflöde med förmånsregistrering, benefit-only warning, AGI-mappning och audit trail

- disable-flagga och travelflode med traktamente, multilandregel, milersattning, utlagg, payrollkoppling och audit trail
- disable-flagga och projektflÃ¶de med projektsetup, budgetversion, resursbelÃ¤ggning, payroll-backed actuals, AR-kopplad WIP och forecast snapshot
- mobilfloden for dispatch, materialuttag, arbetsorderslut och arbetsorderfakturering

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
- VAT_OSS_EUR_REPORTING
- VAT_IOSS_ELIGIBLE_CONSIGNMENT
- VAT_PERIODIC_STATEMENT_CORRECTION
- VAT_DECLARATION_LEDGER_RECONCILIATION
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
- reportsnapshot bevarar samma siffror efter senare bokningar
- drilldown från rapport till journal till dokumentlänk fungerar
- låst period kan inte muteras
- correction och reversal skapar ny immutabel verifikation med länk till original
- obligatoriska projektdimensioner valideras innan bokning
- reconciliation sign-off binds till exakt snapshot-hash och evidence-ref

#### Moms
- beslutsträd returnerar förklaring
- historiskt beslut återspelar rätt regelpaket för dåtidens datum
- saknade eller motsägelsefulla VAT-fakta går till granskningskö
- rapportboxar stämmer mot golden-data
- kreditnota spegelvänder originalets boxbelopp och bokföringspåverkan
- importmoms och omvänd moms ger både utgående och ingående moms enligt avdragsrätt
- rättelse gör om hela deklarationen

#### Kundreskontra och kundmasterdata
- kundnummer är unika per bolag
- kundimport med samma batchKey och payload är idempotent
- ny kundimportbatch kan uppdatera befintlig kund utan dublettskapning
- skickad offert bevaras som historisk version när ny offertversion skapas
- endast accepterad offert kan konverteras till avtal
- aktivt avtal genererar fakturaplan utan luckor eller overlap
- samma issue-forsok skapar inte en andra journal eller ett nytt fakturanummer
- kreditfaktura använder serie C och stänger korrekt kvarvarande krediterbart belopp
- Peppol-leverans kräver strukturerad mottagare och validerade referenser
- delbetalning minskar rest utan att tappa tidigare allocation-historik
- felmatchning kan reverseras utan att förlora unmatched receipt trail
- tvistade eller hold-markerade poster går inte automatiskt till påminnelse eller writeoff
- aging snapshots är reproducerbara för samma cutoff och underlag

#### Leverantörsregister, PO och mottagning
- leverantörsnummer är unika per bolag
- leverantörsimport med samma batchKey och payload är idempotent
- bankdetaljändring från import sätter betalningsspärr och audit trail
- PO-rader ärver konto-, moms- och prisdefaults deterministiskt
- PO kan inte gå från draft direkt till sent
- mottagning kan bara registreras mot godkänd eller skickad PO
- mottagningsdubbletter återanvänder samma receipt vid identisk extern referens eller identisk payload
- kumulativ mottagen kvantitet kan inte passera tillåten överleveranstolerans
- invoice-receipt-link går att reproducera från seed och demo-seed

#### Leverantörsfakturor, attest och betalningar
- minst två atteststeg kan stoppa postning mellan steg ett och steg två
- endast rätt atteststeg kan godkänna nästa steg i kedjan
- betalningsförslag kan inte exporteras utan föregående godkännande
- reservation bokar AP-skuld mot 2450 utan att minska bankkontot
- bankbokning flyttar saldo från 2450 till valt bankkonto
- retur återöppnar AP-post och nollställer paid-status utan dubbla journaler vid replay
- seed visar bokad utbetalning och demo-seed visar returnerad betalning

#### HR-master
- samma person kan ha flera anställningar utan dubbla personobjekt
- ny avtalsversion bevarar tidigare avtalsversion oförändrad
- chefsträd blockerar självreferens och uppenbar cykel
- bankkonton maskas i API-svar
- dokument kan länkas till anställd via dokumentmotorn
- känsliga fält skapar auditspår för identitet, skyddad identitet och utbetalningsuppgifter
- seed visar flera anställningar och demo-seed visar skyddad identitet, chefsbyte och utländskt bankkonto

#### Tid, schema och saldon
- clock events lagras som separata in- och utstämplingar per anställning
- aktivt schema kan tilldelas anställning med giltighetsintervall
- tidpost kan bära både projectId och activityCode utan att tappa schemareferens
- premiumminuter för OB, jour och beredskap bevaras på tidposten
- saldo för flex, komp och övertid är reproducerbart för samma cutoffdatum
- periodlås blockerar både nya stämplingar och nya tidposter inom låst intervall
- seed visar schema, stämpling, tidpost, saldo och periodlås både i baseline och demo

#### Frånvaro, attest och anställdportal
- frånvarotyp bär signaltyp, managerkrav och dokumentkrav utan att regler läggs i UI
- aktiv manager assignment styr vem som får godkänna eller avslå frånvaro
- anställdportalen får bara se och mutera den inloggade personens egna frånvarorader
- rejected och approved leave entries bevarar events, orsaker och tidsstämplar i historiken
- AGI-känslig frånvaro kräver reportingPeriod och komplett dagextent innan submit
- leave signal locks i `ready_for_sign`, `signed` eller `submitted` blockerar sena ändringar i samma period
- seed visar godkänd frånvaro med signaler och demo-seed visar avslag, korrigerad portalhistorik och signeringslås

#### Lön
- lönekedjan följer samma 18 steg för samma underlag
- retrokorrigering sparar source period, source run och source line
- slutlön kan innehålla settlement, kvarvarande semester och förskottssemesteråtertag
- AGI kan genereras utan manuell redigering
- SINK och vanlig preliminärskatt sätter exakt ett skattefält per individ
- frånvarodata blockeras efter `ready_for_sign`, `signed` och `submitted`
- correction version bevarar receipt trail och changed-employee traceability
- lönebesked matchar bokföring
- payroll posting bevarar projekt-, kostnadsställe- och affärsområdesdimensioner till journalrader
- payout batch export är deterministisk och kan matchas mot bank utan dubbelbokning
- semesterskuldssnapshot kan återskapas oförändrat för samma period och underlag

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
- ITP1 månadsunderlag, ITP2 pensionsmedförande årslön och Fora-månadsrapport skiljs åt deterministiskt
- extra pension och särskild löneskatt bokförs separat från grundpremie
- providergruppering och due dates för Collectum och Fora är reproducerbara för samma period

#### Projekt, budget och uppfÃ¶ljning
- projektbudgeter versionshanteras med spÃ¥rbar auditkedja
- projektkostnad inkluderar lÃ¶n, fÃ¶rmÃ¥ner, pension och resor med bÃ¥de explicit projektdimension och tidsbaserad fÃ¶rdelning
- WIP kan Ã¥terskapas fÃ¶r samma cutoff och stÃ¤mmas av mot fakturering
- forecast at completion och resource load Ã¤r reproducerbara fÃ¶r samma underlag
- disable-flagga blockerar alla projekt-rutter utan att pÃ¥verka andra faser

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

## FAS 11.1 minimum coverage

- rapporttesterna ska täcka `trial_balance`, `income_statement`, `balance_sheet`, `cashflow`, `ar_open_items`, `ap_open_items` och `project_portfolio`
- drilldown ska verifiera journal, dokumentlänk eller stödjande snapshot beroende på rapportkälla
- metric catalog och custom report definitions ska testas för versionsstyrning, stabila koder och deterministiska filtersammanslagningar
- exportjobb ska testas för Excel/PDF, watermark-läge, snapshot-bindning, supersede-logik och reproducerbar artefaktmetadata

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


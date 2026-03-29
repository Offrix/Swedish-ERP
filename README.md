# Swedish ERP

Svensk fÃ¶retagsplattform fÃ¶r att driva hela bolaget i ett sammanhÃ¥llet system: bokfÃ¶ring, moms, skatt, lÃ¶n, AGI, skattekonto, HUS, dokument, review, arbetsflÃ¶den, projekt, operations, integrationer, audit och backoffice.

Det hÃ¤r repo:t byggs inte fÃ¶r att bli Ã¤nnu ett smalt bokfÃ¶ringsprogram eller ett byggspecialsystem med lite ekonomi bredvid. MÃ¥let Ã¤r att bli vÃ¤rldens bÃ¤sta fÃ¶retagssida fÃ¶r svenska bolag: en produkt dÃ¤r fÃ¶retag faktiskt kan skÃ¶ta hela verksamheten med starkare kontroll, bÃ¤ttre regelstÃ¶d, tydligare spÃ¥rbarhet och bÃ¤ttre operativt arbetsflÃ¶de Ã¤n dagens alternativ.

## PrimÃ¤r Styrning

De enda bindande styrdokumenten fÃ¶r allt kvarvarande arbete fÃ¶re UI Ã¤r:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

Det som var rätt i den tidigare styrningen men fortfarande ska bevaras uttryckligen finns låst i:

- `docs/implementation-control/GOVERNANCE_CARRY_FORWARD_MATRIX.md`

Alla Ã¤ldre `master-control`-, `implementation-control`-, ADR-, runbook- och analysdokument Ã¤r historiska inputkÃ¤llor. De fÃ¥r anvÃ¤ndas som stÃ¶dmaterial, men de Ã¤r inte bindande om de krockar med dokumenten ovan.

## Vad Produkten Ã„r

Produkten Ã¤r en generell fÃ¶retagsplattform fÃ¶r alla bolag, inte bara fÃ¶r en viss bransch.

KÃ¤rnan ska bÃ¤ra:

- bokfÃ¶ring och redovisning
- moms och skattedriven regelmotorik
- lÃ¶n, AGI och people operations
- kund- och leverantÃ¶rsflÃ¶den
- bank, betalningar och skattekonto
- dokument, OCR, klassificering och review
- HUS/ROT/RUT
- projekt, kostnadsuppfÃ¶ljning och lÃ¶nsamhet
- arbetsflÃ¶den, notiser, aktivitet och work items
- support, backoffice, audit, replay och incidenthantering
- publika API:er, partner-API:er, webhooks och integrationer

Bygg, field, personalliggare och ID06 Ã¤r viktiga vertikala kapabiliteter, men de Ã¤r inte produktens identitet. Plattformen ska fungera lika bra fÃ¶r konsultbolag, byrÃ¥er, tjÃ¤nstebolag, servicebolag, handelsbolag, installationsbolag och andra svenska fÃ¶retag som vill driva hela bolaget i ett system.

## Vad Produkten Ska Bli

Ambitionen Ã¤r att bygga en premiumplattform som kan slÃ¥ Fortnox, Visma, Bokio, Wint och andra relevanta konkurrenter genom att kombinera bredd, kontroll och operativ styrka i samma produkt.

NÃ¤r plattformen Ã¤r fÃ¤rdig ska den kunna bÃ¤ra hela fÃ¶retagets kÃ¤rnflÃ¶de:

- lead-to-cash
- procure-to-pay
- record-to-report
- payroll-to-AGI
- VAT-to-declaration
- HUS-case-to-claim-and-recovery
- document-to-decision
- decision-to-ledger
- support-to-audit
- import-to-cutover-to-go-live

Den ska vara stark bÃ¥de i vardagsdrift och i svÃ¥ra lÃ¤gen:

- regelstyrd bokfÃ¶ring och skatt
- deterministisk och versionsstyrd lÃ¶ne- och AGI-logik
- receipts, replay, dead-letter och recovery fÃ¶r reglerade submission-flÃ¶den
- riktig backoffice-drift fÃ¶r support, replay, incidenter och cutover
- tydlig source-of-truth-separation mellan domÃ¤ner
- testbar och reproducerbar rulepack-driven logik

## Vad Systemet Ska Klara Av

### Ekonomi och redovisning

- append-only ledger
- verifikationsserier
- periodlÃ¥s, reopen, correction och reversal
- kontantmetod och faktureringsmetod
- brutet rÃ¤kenskapsÃ¥r
- rapporter, close och annual reporting
- legal form-styrd Ã¥rslogik

### Moms, skatt och myndighetsflÃ¶den

- momsbeslut, momsperioder och deklarationsunderlag
- skattekonto, kvittningar, differenser, rÃ¤ntor och avgifter
- AGI och tillhÃ¶rande receipts, correction chains och recovery
- HUS/ROT/RUT med blockerande fÃ¤ltkontroller, betalningsbevis, XML/submission och Ã¥terkravshantering
- annual filings, declaration packages och myndighetskvittenser

### LÃ¶n och people operations

- anstÃ¤llningar, masterdata och historik
- lÃ¶nekÃ¶rningar, bokfÃ¶ringspreview och utbetalningar
- AGI-objekt och AGI-sÃ¤kra korrigeringar
- benefits, pension, resor, traktamenten och milersÃ¤ttning
- kollektivavtalsdriven lÃ¶neberÃ¤kning
- lÃ¶neutmÃ¤tning, Kronofogden och fÃ¶rbehÃ¥llsbelopp
- migrering av lÃ¶nehistorik, YTD och saldon

### FÃ¶rsÃ¤ljning, inkÃ¶p och betalningar

- kundfakturor, kreditnotor, abonnemang och reskontra
- leverantÃ¶rsfakturor, attest, matchning och betalningsunderlag
- bankhÃ¤ndelser, statement import och betalningsmatchning
- payment links, e-faktura och Peppol
- returer, differenser och avvikelsehantering

### Dokument, review och automation

- dokumentinbox
- OCR
- dokumentklassificering
- personkopplade dokumentkedjor till lÃ¶n, AGI, benefits och bokfÃ¶ring
- review center med tydliga beslutsgrÃ¤nser
- notifications, activity feed och work items som separata objektfamiljer
- audit explorer, evidence packs och operativ replay

### Projekt, operations och vertikala kapabiliteter

- generell projektmotor fÃ¶r alla bolag
- budget, utfall, forecast, WIP och lÃ¶nsamhet
- kostnadsallokering frÃ¥n lÃ¶n och andra kÃ¤llor
- service- och uppdragsflÃ¶den
- field-stÃ¶d dÃ¤r det behÃ¶vs
- personalliggare, workplace/site-logik och contractor snapshots dÃ¤r relevant
- ID06- och byggnÃ¤ra stÃ¶d som vertikal modul, inte som produktens kÃ¤rnidentitet

### Plattform, sÃ¤kerhet och kontroll

- stark auth- och scope-modell
- MFA, stark identitet och enterprise federation
- support impersonation och break-glass med audit
- backoffice fÃ¶r support, incidenter, replay, dead-letter och submission monitoring
- public API, partner API, webhooks och provider-onboarding
- rulepacks med effective dating, historisk pinning och rollback

## Det Som MÃ¥ste Fungera FÃ¶r Go-Live

FÃ¶r att plattformen ska anses fÃ¤rdig nog fÃ¶r verklig drift rÃ¤cker det inte att enskilda moduler existerar. FÃ¶ljande kedjor mÃ¥ste fungera end-to-end utan att UI behÃ¶ver kompensera fÃ¶r backendbrister:

- tenant setup till finance-ready bolag med legal form, accounting method, fiscal year och modulaktivering
- supplier invoice frÃ¥n dokument/OCR till import case, AP, betalning, bankmatchning och korrekt momsutfall
- kundfaktura frÃ¥n issue till betalning, reskontrastÃ¤ngning och korrekt momsutfall
- bankimport, betalningsorder, statement matchning och reconciliation till ledger och skattekonto
- mÃ¥natlig lÃ¶n med korrekt skatt, arbetsgivaravgifter, kollektivavtal, AGI-preview, bokfÃ¶ringsposter och utbetalningsunderlag
- SINK-flÃ¶den och andra sÃ¤rskilda skatteprofiler dÃ¤r relevant
- Kronofogden/lÃ¶neutmÃ¤tning med beslutssnapshot, fÃ¶rbehÃ¥llsbelopp, remittance och audit chain
- benefits, resor och privata kÃ¶p som korrekt gÃ¥r till receivable, payroll deduction eller beskattning
- AGI-submission med tekniska receipts, materiella receipts, correction chain, replay och recovery
- HUS/ROT/RUT frÃ¥n verifierad kundbetalning till korrekt claim-underlag, XML/submission, beslut, Ã¥terkrav och reconciliation
- skattekontoimport, differenshantering, offset-logik och koppling till moms, lÃ¶n och HUS
- period close, reopen, correction och annual reporting utan att historiken bryts
- migration, cutover, diff, signoff och rollback-plan fÃ¶r go-live
- review center, work items, notifications och activity som separata men samverkande objektfamiljer
- support, replay, dead-letter, submission monitoring och incidenthantering utan databasingrepp
- public API, partner API och webhooks med tydliga kontrakt, signering, idempotency, sequencing och replay
- object profiles, workbenches, search, saved views och command contracts redo fÃ¶r framtida UI utan omtag
- permissions, team/scope ownership, segregation of duties, impersonation och break-glass med full audit

Go-live betyder dÃ¤rfÃ¶r att ekonomi, lÃ¶n, skatt, myndighetsflÃ¶den, operations, support och integrationer fungerar som ett sammanhÃ¤ngande system, inte bara att enskilda features finns i repo:t.

## Produktens Ytor

### Desktop Web

Desktop-web Ã¤r den enda fullstÃ¤ndiga arbetsytan fÃ¶r alla professionella roller. Det Ã¤r hÃ¤r ekonomi, lÃ¶n, compliance, review, rapportering, projektstyrning och operativ kontroll ska fungera fullt ut.

### Field Mobile

Field-mobile Ã¤r en separat, fÃ¶renklad stÃ¶dyta fÃ¶r snabb operativ anvÃ¤ndning dÃ¤r det behÃ¶vs. Den Ã¤r inte en mini-desktop och ska inte bÃ¤ra domÃ¤nlogik.

### Backoffice

Backoffice Ã¤r en separat operatÃ¶rs- och supportyta fÃ¶r audit, replay, dead-letter, supportÃ¤renden, incidenter, tenantdiagnostik, access reviews och andra driftkritiska funktioner.

## Arkitekturprinciper

Systemet byggs som en modulÃ¤r monolit med hÃ¥rda bounded contexts.

Det hÃ¤r Ã¤r icke-fÃ¶rhandlingsbara principer:

- ledger Ã¤r enda kÃ¤llan till bokfÃ¶ring
- payroll Ã¤r enda kÃ¤llan till AGI-objekt
- VAT Ã¤ger momsbeslut
- HUS Ã¤ger claim-lifecycle
- fiscal year Ã¤ger periodkalender och lÃ¥s
- accounting method Ã¤ger timinglogik fÃ¶r kontantmetod kontra faktureringsmetod
- search Ã¤r aldrig source of truth
- UI bÃ¤r aldrig domÃ¤nlogik
- kritiska regler ska vara deterministiska, versionsstyrda, spÃ¥rbara och testade
- reglerade beslut fÃ¥r inte gÃ¶ras pÃ¥ gissning eller av AI utan explicit policy
- asynkrona reglerade flÃ¶den ska ha receipts, replay, dead-letter och audit chain

## Repo-LÃ¤ge Idag

Repo:t innehÃ¥ller redan mycket verklig funktionalitet, bred dokumentation och mÃ¥nga tester, men det Ã¤r fortfarande ett aktivt byggprogram och inte en fÃ¤rdig go-live-produkt.

Det betyder:

- flera domÃ¤ner Ã¤r redan verkliga och testade
- flera integrations-, backoffice- och go-live-delar Ã¤r under pÃ¥gÃ¥ende hÃ¤rdning
- dokumenterat stÃ¶d Ã¤r inte samma sak som fÃ¤rdig driftmognad
- shell-appar ska inte misstolkas som fÃ¤rdig produkt-UI

Det riktiga lÃ¤get mÃ¥ste alltid bedÃ¶mas utifrÃ¥n:

- faktisk kod
- faktiska tester
- implementation-control-dokumenten
- verifieringsgrindar

## Vad Som Finns I Repo:t

### Appar

- `apps/api` API, auth, komposition, routes och plattformsintegration
- `apps/worker` asynk job-runtime, replay, batch och bakgrundsflÃ¶den
- `apps/desktop-web` desktop-shell fÃ¶r framtida full arbetsyta
- `apps/field-mobile` separat mobile-shell fÃ¶r operativ stÃ¶dyta

### Paket

Repo:t innehÃ¥ller bland annat:

- `packages/domain-*` fÃ¶r bounded contexts och domÃ¤nmotorer
- `packages/db` fÃ¶r migrationer och seeds
- `packages/rule-engine` fÃ¶r deterministisk regelmotorik
- `packages/events` fÃ¶r event- och audit-envelopes
- `packages/auth-core` och `packages/integration-core` fÃ¶r gemensamma primitives
- `packages/ui-*` fÃ¶r framtida UI-lager utan domÃ¤nlogik

### DomÃ¤nomrÃ¥den som redan finns representerade

- accounting method
- fiscal year
- legal form
- ledger
- VAT
- AR
- AP
- banking
- tax account
- HR
- time
- balances
- collective agreements
- payroll
- benefits
- travel
- pension
- documents
- document classification
- import cases
- review center
- notifications
- activity
- projects
- field
- personalliggare
- ID06
- HUS
- reporting
- annual reporting
- search
- integrations
- core operations

## Styrande Dokument

Om du Ã¶ppnar repo:t fÃ¶r att fÃ¶rstÃ¥ vad produkten ska bli ska du bÃ¶rja hÃ¤r:

- [MASTER_BUILD_PLAN.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/MASTER_BUILD_PLAN.md)
- [MASTER_BUILD_SEQUENCE_FINAL.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/MASTER_BUILD_SEQUENCE_FINAL.md)
- [MASTER_IMPLEMENTATION_BACKLOG.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/MASTER_IMPLEMENTATION_BACKLOG.md)
- [DOMAIN_OWNERSHIP_AND_SOURCE_OF_TRUTH.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/DOMAIN_OWNERSHIP_AND_SOURCE_OF_TRUTH.md)
- [ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md)
- [COMPETITOR_WIN_MATRIX.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/COMPETITOR_WIN_MATRIX.md)
- [UI_READINESS_GATE.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/UI_READINESS_GATE.md)

Den nya sanningen fÃ¶r vidare implementation ligger i `docs/implementation-control/`. Ã„ldre dokument ska bara anvÃ¤ndas om de inte motsÃ¤ger dessa styrdokument eller faktisk repo-verklighet.

## Kodstruktur

```text
apps/
  api/            API, auth, routes, komposition och integrationsytor
  worker/         async jobs, replay, batch och bakgrundsflÃ¶den
  desktop-web/    framtida full desktop-yta
  field-mobile/   separat operativ mobile-yta

packages/
  auth-core/
  db/
  document-engine/
  events/
  integration-core/
  rule-engine/
  domain-*/
  ui-core/
  ui-desktop/
  ui-mobile/

docs/
  MASTER_BUILD_PLAN.md
  master-control/
  implementation-control/
  adr/
  compliance/
  domain/
  policies/
  runbooks/
  test-plans/
  ui/

tests/
  unit/
  integration/
  e2e/
```

## Kom IgÃ¥ng

### Bootstrap

```bash
corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
```

### Starta Lokal Utveckling

```bash
pnpm run dev
```

Separata appar:

```bash
pnpm --filter @swedish-erp/api start
pnpm --filter @swedish-erp/desktop-web start
pnpm --filter @swedish-erp/field-mobile start
pnpm --filter @swedish-erp/worker start
```

### Databas Och Seed

```bash
pnpm run infra:up
pnpm run db:migrate
pnpm run db:seed
pnpm run seed:demo
```

## Verifiering

Grundverifiering:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run security
pnpm run runtime-log
```

Repo:t har Ã¤ven omrÃ¥desspecifika verifieringsskript fÃ¶r bland annat:

- ledger
- VAT
- AR
- AP
- payroll
- projects
- field
- annual reporting
- public API
- partner integrations
- security
- resilience
- migration/go-live

## Vad README:n Ska GÃ¶ra Tydligt

Den hÃ¤r README:n ska gÃ¶ra fyra saker tydliga frÃ¥n fÃ¶rsta raden:

1. Det hÃ¤r Ã¤r en generell svensk fÃ¶retagsplattform fÃ¶r hela bolaget, inte ett byggprogram.
2. MÃ¥let Ã¤r vÃ¤rldsklass inom bokfÃ¶ring, lÃ¶n, skatt, compliance, operations och integrationer i samma produkt.
3. Repo:t innehÃ¥ller redan mycket verklig funktionalitet, men Ã¤r fortfarande under byggnation och hÃ¤rdning.
4. Bygg/field/personalliggare/ID06 Ã¤r viktiga vertikaler, men inte produktens identitet.

Om du ska bygga vidare hÃ¤r ska du utgÃ¥ frÃ¥n den bindande dokumentationen och faktisk kod, inte frÃ¥n antaganden.

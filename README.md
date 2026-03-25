# Swedish ERP

Svensk ERP-plattform för att driva hela bolaget i ett sammanhängande system: ekonomi, dokument, moms, skatt, lön, AGI, pension, förmåner, resor, projekt, field, HUS, personalliggare, årsbokslut, deklarationer, integrationer, audit, review och operativ kontroll.

Det här repo:t är inte tänkt att bli ännu ett litet bokföringssystem eller en samling lösa moduler. Målet är ett premiumsystem där ett företag faktiskt ska kunna sköta hela sin verksamhet i samma produkt, med starkare kontroll, tydligare spårbarhet och bättre arbetsflöden än typiska svenska SME-system.

Den bindande styrningen finns i:

- `docs/MASTER_BUILD_PLAN.md`
- `docs/master-control/master-rebuild-control.md`
- övriga filer under `docs/master-control/`

## Vad systemet är

Systemet byggs som en modulär monolit med hårda bounded contexts.

Grundprinciperna är:

- ledger är enda källan till bokföring
- payroll är enda källan till AGI-objekt
- VAT äger momsbeslut
- HUS äger claim-lifecycle
- fiscal year äger periodkalender och lås
- accounting method äger kontantmetod kontra faktureringsmetod
- search är aldrig source of truth
- UI får aldrig bära domänlogik
- alla reglerade beslut ska vara deterministiska, versionsstyrda, spårbara och testade

Produkten är byggd för att bli:

- ett fullständigt desktop-webbsystem för alla professionella roller
- en separat field-mobile för snabb, tumvänlig operativ användning
- en separat backoffice-yta för support, replay, audit och tenantstyrning

## Vad systemet ska klara av

När plattformen är fullt färdig ska den kunna bära hela bolagets kärnverksamhet:

- bokföring, verifikationer, lås, rättelser, close och rapportering
- momsflöden, momsbeslut, deklarationsunderlag och edge-case-hantering
- kundfakturor, kreditnotor, deldebitering, abonnemang, reskontra och betalningsmatchning
- leverantörsfakturor, attest, matchning, betalningar och avvikelser
- bankhändelser, avstämning, betalningsordrar, returer och skattekoppling
- skattekonto, kvittningar, differenser, räntor och avgifter
- lön, AGI, lönearter, körningar, posting preview, utbetalningar och rättelser
- kollektivavtal, saldon, semester, komp, flex och historik
- förmåner, friskvård, gåvor, nettolöneavdrag, pension och salary exchange
- reseflöden, traktamenten, milersättning och policykopplad ersättning
- dokumentinbox, OCR, dokumentklassificering, review och audit chain
- personkopplade dokumentflöden till lön, AGI, benefits och bokföring
- HUS/ROT/RUT med blockerande fältkontroller, betalningsbevis, claim, recovery och correction chain
- projektstyrning med budget, utfall, WIP, lönkostnadsallokering, material, avvikelser och lönsamhet
- field-flöden för arbetsorder, serviceorder, material, signatur, bilder och offline-konflikter
- personalliggare, workplace/site-logik, contractor snapshots, kiosk/device trust och branschpaket
- egenkontroller och kalkyl som operativa moduler
- annual reporting, legal-form-styrning, filing packages, receipts och corrections
- partnerintegrationer, publikt API, webhooks, replay, dead-letter och backoffice-kontroller

## Vad som finns i repo:t idag

Repo:t innehåller redan bred funktionalitet i kod och dokumentation, men allt är inte produktionsklart bara för att det finns paket, routes eller tester.

### Appar

- `apps/api` gemensamt API- och kompositionslager för domäner, auth, integrationer och operativa flöden
- `apps/worker` runtime för asynkrona jobb, replay, batchkörningar och bakgrundsarbete
- `apps/desktop-web` desktop-shell för den framtida fulla arbetsytan
- `apps/field-mobile` mobile-shell för den framtida förenklade field-ytan

### Domäner och plattformspaket

Repo:t innehåller kod för bland annat:

- auth och organisationsåtkomst
- dokumentarkiv, inbox, OCR och dokumentklassificering
- ledger och redovisningsgrund
- accounting method
- fiscal year
- VAT
- AR
- AP
- banking
- tax account
- HR och time
- payroll
- balances
- collective agreements
- benefits
- travel
- pension
- HUS
- projects
- field
- personalliggare
- reporting
- annual reporting
- notifications
- activity
- review center
- integrations och public API
- search
- rule engine

### Dokumentation

Repo:t har en ovanligt bred dokumentationsbas:

- master-control-paket för styrning, gap, domänkarta, byggsekvens och policystruktur
- ADR för arkitektur, auth, jobs, submissions, UI-reset och bounded-context-beslut
- compliance-dokument för svenska ekonomi-, skatt-, löne- och myndighetsflöden
- domain/product specs för operativa arbetsflöden och modulgränser
- policies för beslutskontroll, support, signoff, AI-gränser och drift
- runbooks för verifiering, recovery, setup och incidenthantering
- testplaner för golden scenarios, edge cases och verifieringsgrindar

## Viktig statusbild

Det här repo:t är en seriös byggbas, inte en färdig live-produkt.

Det betyder:

- det finns mycket verklig domänlogik och många riktiga tester
- det finns också delar som fortfarande är shell, tunn runtime eller pågående härdning
- dokumenterat stöd är inte samma sak som färdig driftmognad
- migrationer och routes är inte i sig bevis på att ett område är klart

Särskilt viktigt:

- desktop-web är ännu inte den slutliga enterprise-ytan
- field-mobile är ännu inte den slutliga operativa mobilen
- backoffice som färdig yta är ännu inte slutbyggd
- inga UI-shells ska tolkas som slutlig produktdesign
- vissa områden är robusta som byggbas men fortfarande under härdning som driftbar produkt

Läs därför alltid master-control och `docs/MASTER_BUILD_PLAN.md` innan du bedömer vad som faktiskt är färdigt.

## Produktens ytor

### Desktop-web

Den slutliga desktop-webben är tänkt att vara den enda fullständiga ytan för:

- ekonomi
- byråarbete
- review
- rapportering
- lön
- projektstyrning
- compliance
- supportnära expertarbete

Desktop ska vara:

- datatät
- keyboard-stark
- byggd kring workbenches och objektprofiler
- tydligt separerad från audit log, activity feed, notifications och work items

### Field-mobile

Field-mobile är inte en mini-desktop. Den ska vara en separat stöd-yta för:

- check-in/check-out
- arbetsorder
- material
- bilder
- signatur
- enkel review där det är säkert
- offline/sync/conflict-hantering

### Backoffice

Backoffice ska vara en separat operatörs- och supportyta för:

- replay
- audit explorer
- supportfall
- feature flags
- tenant diagnostics
- support-access och impersonation enligt policy

## Funktionella huvudområden

### Ekonomi och redovisning

Systemet ska bära:

- bokföring med append-only-korrigering
- verifikationsserier
- periodsynk och lås
- kontantmetod/faktureringsmetod
- brutet räkenskapsår
- close och rapportering
- legal-form-styrd årslogik

### Försäljning och kundreskontra

Systemet ska bära:

- offerter
- kontrakt
- kundfakturor
- kreditnotor
- abonnemang
- öppna poster
- matchning och avstämning
- påminnelse- och dunning-stöd

### Inköp och leverantörsflöden

Systemet ska bära:

- leverantörsfakturor
- importfall
- attestkedjor
- avvikelsehantering
- betalningsunderlag
- bankkoppling och avstämning

### Lön, HR och people operations

Systemet ska bära:

- anställningar och masterdata
- tid och frånvaro
- lönekörningar
- AGI
- saldon
- kollektivavtal
- benefits
- pension
- reseräkningar
- lönekorrigeringar
- migrering från tidigare system

### Projekt, bygg och field

Systemet ska bära:

- projektbudget och utfall
- lönsamhet
- field-jobb
- arbetsorder
- materialflöde
- egenkontroller
- kalkyl
- HUS-flöden
- personalliggare
- contractor/employer snapshots
- framtida ID06-relaterade integrationsbehov

### Dokument, review och operativ kontroll

Systemet ska bära:

- dokumentinbox
- OCR
- klassificering
- review center
- notifications
- activity feed
- work items
- audit
- submissions och receipts

## Kodstruktur

```text
apps/
  api/            API, auth, routes, komposition och integrationsytor
  worker/         async jobs, replay, batch och bakgrundsflöden
  desktop-web/    desktop-shell och framtida full desktop-yta
  field-mobile/   mobile-shell och framtida field-yta

packages/
  auth-core/                    auth primitives
  db/                           migrationer och seeds
  document-engine/              dokument- och OCR-flöden
  rule-engine/                  regelpaket och deterministiska regler
  domain-*/                     bounded contexts och domänmotorer
  ui-core/ ui-desktop/ ui-mobile/

docs/
  MASTER_BUILD_PLAN.md
  master-control/
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

## Läsordning innan implementation

Följ alltid denna ordning innan du bygger i ett område:

1. relevant fil i `docs/master-control/`
2. `docs/MASTER_BUILD_PLAN.md`
3. relevant ADR
4. relevant compliance-dokument
5. relevant policy
6. relevant domain/product spec
7. relevant runbook
8. relevant testplan

Om dokumenten och koden säger olika saker gäller den lägre verkliga stödnivån som sanningen tills området är härdat.

## Kom igång

### Första bootstrap

```bash
corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
```

### Starta lokal utveckling

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

## Databas, migrationer och demo-data

```bash
docker compose -f infra/docker/docker-compose.yml up -d
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

Fas- och områdesverifiering finns som egna script, bland annat:

- `pnpm run verify:phase5:ar:invoicing`
- `pnpm run verify:phase8:payroll`
- `pnpm run verify:phase13:public-api`
- `pnpm run verify:phase13:partners`
- `pnpm run verify:phase14:security`
- `pnpm run verify:phase14:resilience`
- `pnpm run verify:phase14:migration`

Mastergrindarna finns i:

- `docs/test-plans/master-test-strategy.md`
- `docs/test-plans/master-verification-gates.md`

## Viktigt för alla som öppnar repo:t

Den här README:n ska göra tre saker tydliga:

1. Detta är ett svenskt ERP-byggprogram för hela bolaget, inte bara bokföring.
2. Repo:t innehåller redan mycket verklig funktionalitet, men allt är inte slutligt eller driftklart.
3. Den slutliga produkten ska vara betydligt större, striktare och mer sammanhängande än dagens UI-shells antyder.

Om du ska bygga vidare här ska du utgå från master-control, inte från antaganden.

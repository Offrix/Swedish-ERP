# Swedish ERP

Svensk företagsplattform för att driva hela bolaget i ett sammanhållet system: bokföring, moms, skatt, lön, AGI, skattekonto, HUS, dokument, review, arbetsflöden, projekt, operations, integrationer, audit och backoffice.

Det här repo:t byggs inte för att bli ännu ett smalt bokföringsprogram eller ett byggspecialsystem med lite ekonomi bredvid. Målet är att bli världens bästa företagssida för svenska bolag: en produkt där företag faktiskt kan sköta hela verksamheten med starkare kontroll, bättre regelstöd, tydligare spårbarhet och bättre operativt arbetsflöde än dagens alternativ.

## Primär Styrning

De enda bindande styrdokumenten för allt kvarvarande arbete före UI är:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`

Alla äldre `master-control`-, `implementation-control`-, ADR-, runbook- och analysdokument är historiska inputkällor. De får användas som stödmaterial, men de är inte bindande om de krockar med dokumenten ovan.

## Vad Produkten Är

Produkten är en generell företagsplattform för alla bolag, inte bara för en viss bransch.

Kärnan ska bära:

- bokföring och redovisning
- moms och skattedriven regelmotorik
- lön, AGI och people operations
- kund- och leverantörsflöden
- bank, betalningar och skattekonto
- dokument, OCR, klassificering och review
- HUS/ROT/RUT
- projekt, kostnadsuppföljning och lönsamhet
- arbetsflöden, notiser, aktivitet och work items
- support, backoffice, audit, replay och incidenthantering
- publika API:er, partner-API:er, webhooks och integrationer

Bygg, field, personalliggare och ID06 är viktiga vertikala kapabiliteter, men de är inte produktens identitet. Plattformen ska fungera lika bra för konsultbolag, byråer, tjänstebolag, servicebolag, handelsbolag, installationsbolag och andra svenska företag som vill driva hela bolaget i ett system.

## Vad Produkten Ska Bli

Ambitionen är att bygga en premiumplattform som kan slå Fortnox, Visma, Bokio, Wint och andra relevanta konkurrenter genom att kombinera bredd, kontroll och operativ styrka i samma produkt.

När plattformen är färdig ska den kunna bära hela företagets kärnflöde:

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

Den ska vara stark både i vardagsdrift och i svåra lägen:

- regelstyrd bokföring och skatt
- deterministisk och versionsstyrd löne- och AGI-logik
- receipts, replay, dead-letter och recovery för reglerade submission-flöden
- riktig backoffice-drift för support, replay, incidenter och cutover
- tydlig source-of-truth-separation mellan domäner
- testbar och reproducerbar rulepack-driven logik

## Vad Systemet Ska Klara Av

### Ekonomi och redovisning

- append-only ledger
- verifikationsserier
- periodlås, reopen, correction och reversal
- kontantmetod och faktureringsmetod
- brutet räkenskapsår
- rapporter, close och annual reporting
- legal form-styrd årslogik

### Moms, skatt och myndighetsflöden

- momsbeslut, momsperioder och deklarationsunderlag
- skattekonto, kvittningar, differenser, räntor och avgifter
- AGI och tillhörande receipts, correction chains och recovery
- HUS/ROT/RUT med blockerande fältkontroller, betalningsbevis, XML/submission och återkravshantering
- annual filings, declaration packages och myndighetskvittenser

### Lön och people operations

- anställningar, masterdata och historik
- lönekörningar, bokföringspreview och utbetalningar
- AGI-objekt och AGI-säkra korrigeringar
- benefits, pension, resor, traktamenten och milersättning
- kollektivavtalsdriven löneberäkning
- löneutmätning, Kronofogden och förbehållsbelopp
- migrering av lönehistorik, YTD och saldon

### Försäljning, inköp och betalningar

- kundfakturor, kreditnotor, abonnemang och reskontra
- leverantörsfakturor, attest, matchning och betalningsunderlag
- bankhändelser, statement import och betalningsmatchning
- payment links, e-faktura och Peppol
- returer, differenser och avvikelsehantering

### Dokument, review och automation

- dokumentinbox
- OCR
- dokumentklassificering
- personkopplade dokumentkedjor till lön, AGI, benefits och bokföring
- review center med tydliga beslutsgränser
- notifications, activity feed och work items som separata objektfamiljer
- audit explorer, evidence packs och operativ replay

### Projekt, operations och vertikala kapabiliteter

- generell projektmotor för alla bolag
- budget, utfall, forecast, WIP och lönsamhet
- kostnadsallokering från lön och andra källor
- service- och uppdragsflöden
- field-stöd där det behövs
- personalliggare, workplace/site-logik och contractor snapshots där relevant
- ID06- och byggnära stöd som vertikal modul, inte som produktens kärnidentitet

### Plattform, säkerhet och kontroll

- stark auth- och scope-modell
- MFA, stark identitet och enterprise federation
- support impersonation och break-glass med audit
- backoffice för support, incidenter, replay, dead-letter och submission monitoring
- public API, partner API, webhooks och provider-onboarding
- rulepacks med effective dating, historisk pinning och rollback

## Det Som Måste Fungera För Go-Live

För att plattformen ska anses färdig nog för verklig drift räcker det inte att enskilda moduler existerar. Följande kedjor måste fungera end-to-end utan att UI behöver kompensera för backendbrister:

- tenant setup till finance-ready bolag med legal form, accounting method, fiscal year och modulaktivering
- supplier invoice från dokument/OCR till import case, AP, betalning, bankmatchning och korrekt momsutfall
- kundfaktura från issue till betalning, reskontrastängning och korrekt momsutfall
- bankimport, betalningsorder, statement matchning och reconciliation till ledger och skattekonto
- månatlig lön med korrekt skatt, arbetsgivaravgifter, kollektivavtal, AGI-preview, bokföringsposter och utbetalningsunderlag
- SINK-flöden och andra särskilda skatteprofiler där relevant
- Kronofogden/löneutmätning med beslutssnapshot, förbehållsbelopp, remittance och audit chain
- benefits, resor och privata köp som korrekt går till receivable, payroll deduction eller beskattning
- AGI-submission med tekniska receipts, materiella receipts, correction chain, replay och recovery
- HUS/ROT/RUT från verifierad kundbetalning till korrekt claim-underlag, XML/submission, beslut, återkrav och reconciliation
- skattekontoimport, differenshantering, offset-logik och koppling till moms, lön och HUS
- period close, reopen, correction och annual reporting utan att historiken bryts
- migration, cutover, diff, signoff och rollback-plan för go-live
- review center, work items, notifications och activity som separata men samverkande objektfamiljer
- support, replay, dead-letter, submission monitoring och incidenthantering utan databasingrepp
- public API, partner API och webhooks med tydliga kontrakt, signering, idempotency, sequencing och replay
- object profiles, workbenches, search, saved views och command contracts redo för framtida UI utan omtag
- permissions, team/scope ownership, segregation of duties, impersonation och break-glass med full audit

Go-live betyder därför att ekonomi, lön, skatt, myndighetsflöden, operations, support och integrationer fungerar som ett sammanhängande system, inte bara att enskilda features finns i repo:t.

## Produktens Ytor

### Desktop Web

Desktop-web är den enda fullständiga arbetsytan för alla professionella roller. Det är här ekonomi, lön, compliance, review, rapportering, projektstyrning och operativ kontroll ska fungera fullt ut.

### Field Mobile

Field-mobile är en separat, förenklad stödyta för snabb operativ användning där det behövs. Den är inte en mini-desktop och ska inte bära domänlogik.

### Backoffice

Backoffice är en separat operatörs- och supportyta för audit, replay, dead-letter, supportärenden, incidenter, tenantdiagnostik, access reviews och andra driftkritiska funktioner.

## Arkitekturprinciper

Systemet byggs som en modulär monolit med hårda bounded contexts.

Det här är icke-förhandlingsbara principer:

- ledger är enda källan till bokföring
- payroll är enda källan till AGI-objekt
- VAT äger momsbeslut
- HUS äger claim-lifecycle
- fiscal year äger periodkalender och lås
- accounting method äger timinglogik för kontantmetod kontra faktureringsmetod
- search är aldrig source of truth
- UI bär aldrig domänlogik
- kritiska regler ska vara deterministiska, versionsstyrda, spårbara och testade
- reglerade beslut får inte göras på gissning eller av AI utan explicit policy
- asynkrona reglerade flöden ska ha receipts, replay, dead-letter och audit chain

## Repo-Läge Idag

Repo:t innehåller redan mycket verklig funktionalitet, bred dokumentation och många tester, men det är fortfarande ett aktivt byggprogram och inte en färdig go-live-produkt.

Det betyder:

- flera domäner är redan verkliga och testade
- flera integrations-, backoffice- och go-live-delar är under pågående härdning
- dokumenterat stöd är inte samma sak som färdig driftmognad
- shell-appar ska inte misstolkas som färdig produkt-UI

Det riktiga läget måste alltid bedömas utifrån:

- faktisk kod
- faktiska tester
- implementation-control-dokumenten
- verifieringsgrindar

## Vad Som Finns I Repo:t

### Appar

- `apps/api` API, auth, komposition, routes och plattformsintegration
- `apps/worker` asynk job-runtime, replay, batch och bakgrundsflöden
- `apps/desktop-web` desktop-shell för framtida full arbetsyta
- `apps/field-mobile` separat mobile-shell för operativ stödyta

### Paket

Repo:t innehåller bland annat:

- `packages/domain-*` för bounded contexts och domänmotorer
- `packages/db` för migrationer och seeds
- `packages/rule-engine` för deterministisk regelmotorik
- `packages/events` för event- och audit-envelopes
- `packages/auth-core` och `packages/integration-core` för gemensamma primitives
- `packages/ui-*` för framtida UI-lager utan domänlogik

### Domänområden som redan finns representerade

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

Om du öppnar repo:t för att förstå vad produkten ska bli ska du börja här:

- [MASTER_BUILD_PLAN.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/MASTER_BUILD_PLAN.md)
- [MASTER_BUILD_SEQUENCE_FINAL.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/MASTER_BUILD_SEQUENCE_FINAL.md)
- [MASTER_IMPLEMENTATION_BACKLOG.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/MASTER_IMPLEMENTATION_BACKLOG.md)
- [DOMAIN_OWNERSHIP_AND_SOURCE_OF_TRUTH.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/DOMAIN_OWNERSHIP_AND_SOURCE_OF_TRUTH.md)
- [ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md)
- [COMPETITOR_WIN_MATRIX.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/COMPETITOR_WIN_MATRIX.md)
- [UI_READINESS_GATE.md](/C:/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/UI_READINESS_GATE.md)

Den nya sanningen för vidare implementation ligger i `docs/implementation-control/`. Äldre dokument ska bara användas om de inte motsäger dessa styrdokument eller faktisk repo-verklighet.

## Kodstruktur

```text
apps/
  api/            API, auth, routes, komposition och integrationsytor
  worker/         async jobs, replay, batch och bakgrundsflöden
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

## Kom Igång

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

Repo:t har även områdesspecifika verifieringsskript för bland annat:

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

## Vad README:n Ska Göra Tydligt

Den här README:n ska göra fyra saker tydliga från första raden:

1. Det här är en generell svensk företagsplattform för hela bolaget, inte ett byggprogram.
2. Målet är världsklass inom bokföring, lön, skatt, compliance, operations och integrationer i samma produkt.
3. Repo:t innehåller redan mycket verklig funktionalitet, men är fortfarande under byggnation och härdning.
4. Bygg/field/personalliggare/ID06 är viktiga vertikaler, men inte produktens identitet.

Om du ska bygga vidare här ska du utgå från den bindande dokumentationen och faktisk kod, inte från antaganden.

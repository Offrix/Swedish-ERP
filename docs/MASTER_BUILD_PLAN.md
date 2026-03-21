# MASTER BUILD PLAN

Detta är huvudplanen för att bygga systemet från noll med Codex. Dokumentet fokuserar på kärnsystemet och produktens reglerade motorer. Slutlig designpolish ligger inte här; produkt-UI finns i separat plan i `docs/ui/ENTERPRISE_UI_PLAN.md`.

## Syfte

Bygg ett svenskt enterprise-system för ekonomi, dokument, projekt, lön, pension, resor, bygg och myndighetsrapportering som kan gå live utan att användaren behöver komplettera med externa regelbeskrivningar för kärnflödena.

## Läsordning

1. `docs/MASTER_BUILD_PLAN.md`
2. ADR:er i `docs/adr/`
3. Compliance-motorer i `docs/compliance/se/`
4. Domändokument i `docs/domain/`, inklusive work items, search, saved views, byråportfölj, close, submissions, async jobs, support/backoffice, offline, migration, reporting och collaboration
5. `docs/domain/ubiquitous-language.md`
6. `docs/test-plans/master-test-strategy.md`
7. `docs/test-plans/master-verification-gates.md`
8. `docs/runbooks/local-development.md`
9. `docs/runbooks/production-deploy.md`
10. `docs/ui/ENTERPRISE_UI_PLAN.md`
11. `docs/prompts/CODEX_PROMPT_LIBRARY.md`


## Codex-kontrakt

Codex ska användas som genomförandeagent för hela projektet. Användaren ska inte behöva översätta målen till kod själv.

### Codex måste alltid göra detta

1. läsa relevanta dokument innan implementation påbörjas
2. skriva eller uppdatera kod **och** dokumentation i samma förändring
3. köra tester efter varje delfas
4. skriva ut exakt vilka kommandon användaren ska köra lokalt om mänskliga steg krävs
5. fråga om något saknas i dokumenten **endast** när det finns en verklig blockerare
6. annars fortsätta utan att pausa
7. aldrig lägga domänregler i UI
8. aldrig skriva direkt i ledgern utanför ledger-tjänsten
9. aldrig införa ett externt beroende utan att dokumentera det i runbooks och ADR om det påverkar arkitektur

### Codex måste fråga användaren när

- avtal med extern leverantör saknas
- hemligheter eller certifikat måste skapas
- BankID-, bank-, Peppol- eller open-banking-avtal måste signeras
- juridisk policy eller företagsspecifikt beslut saknas
- det finns flera affärsmässigt olika vägar och dokumenten inte redan valt en

### Codex får inte fråga användaren om

- sådant som redan står i dokumenten
- triviala implementationsdetaljer
- om den ska skriva tester, migrationsfiler eller dokumentation; svaret är alltid ja


## Icke-förhandlingsbara principer

- Ledgern är systemets sanning för ekonomi.
- Alla regler ska vara datumstyrda och versionerade.
- Alla kritiska beslut ska kunna förklaras.
- Alla dokument ska vara spårbara från rått underlag till slutrapport.
- Periodlåsning får aldrig kringgås.
- Ingen tyst mutation av historiska bokföringsdata.
- Core engine först. UI-polish sist.
- Desktop först för desktop-web; mobil är separat stöd för fält och personal.
- Desktop-web är en enda fullständig desktop-yta för alla roller; mobil är en separat förenklad och tumvänlig stöd-yta ovanpå gemensam backend.
- Allt ska vara byggt så att Codex kan genomföra arbetet steg för steg med minimal mänsklig kodinsats.

## Produktens två ytor

Se ADR-0002 och UI-planen. Sammanfattning:

- `desktop-web`: en fullständig enterprise desktop-yta för alla roller, från företagare till ekonomi, lön, controller, byrå och projektstyrning
- `field-mobile`: separat mobilapp för fält, tid, resor, utlägg, personalliggare, order och signatur

## Teknisk huvudarkitektur

### 3.1 Rekommenderad stack

Det här är den rekommenderade primärstacken för att få fart, typstyrning, hög testbarhet och låg friktion med Codex:

#### Frontend
- **TypeScript**
- **React 19**
- **Next.js 16**
- **TanStack Query**
- **TanStack Table**
- **Zod**
- **React Hook Form**
- **Playwright** för E2E
- **Vitest** för komponent- och unit-test
- **Storybook** för komponentbibliotek

#### Backend
- **TypeScript på Node.js 24 LTS** för API, BFF, webbserver, integrationslager och realtidsnotiser.
- **Python 3.14.x** för regelmotorstöd, OCR-pipelines, ETL, dokumentklassning, AI-assisterade arbetsflöden, batchkörningar, rapportgeneratorer och verifieringsverktyg.
- **SQL** för schema, migrations och materialiserade views.

#### Databas och state
- **PostgreSQL 18**
- **Valkey/Redis-kompatibel cache** för köer, sessions, rate limiting, caching och låsning.
- **Objektlagring** för dokument, PDF, kvitton, fakturor och binära filer.
- **Sökindex** för fulltextsökning över dokument, kunder, projekt, fakturor, verifikat och kommentarer.

#### Infrastruktur
- **AWS i EU-region** som primär driftmiljö.
- **Cloudflare** för DNS, WAF, CDN, rate limiting, DDoS-skydd och edge-cache.
- **GitHub** för kod, PR, CI, issues.
- **Terraform** för infrastruktur som kod.
- **Docker** för lokala miljöer och deploybara images.
- **GitHub Actions** för CI/CD.

#### Observability
- **OpenTelemetry**
- **Sentry** för felspårning
- **PostHog** för produktanalys
- **Prometheus/Grafana** eller motsvarande hanterad observability för drift
- **k6** för lasttester

### 3.2 Varför denna stack

- TypeScript ger samma språk över webbytor, API och stora delar av domänlogiken.
- Python är starkt för dokumenttolkning, AI-stöd, filbearbetning och batcher.
- PostgreSQL är tillräckligt starkt för ledger, reskontra, rapporter, regelpaket och revisionsspår.
- Next.js 16 ger snabb produktutveckling i desktop-appen.
- Node 24 LTS och Python 3.14.x är stabila, aktuella och välstödda.
- AWS i EU ger en tydlig produktionsstandard för bolagskunder.
- Cloudflare minskar attackyta, hanterar DNS/TLS och skyddar produktens externa ingångar.

### 3.3 Monolit först, modulär monolit, sedan selektiv extraktion

Bygg inte mikroservice-soppa från start.

Bygg detta först:
- en modulär monolit för domän och transaktioner
- en gemensam worker-runtime i FAS 0 för batcher, OCR, rapporter och notifieringar
- separata produkt-ytor för desktop-web och field-mobile
- ett gemensamt API-lager
- ett gemensamt regelpaketslager

Bryt ut till egna tjänster först när ett av följande är sant:
- lasten kräver det
- säkerhetsgränser kräver det
- releasekadens kräver det
- domänägarskap kräver det

### 3.4 Runtime- och deploystrategi

- Desktop-webben deployas som egen app.
- Mobilappen deployas separat.
- API körs som egen tjänst.
- Workers körs som egna tjänster.
- Dokumentinbox/OCR körs som egen pipeline.
- Rapportgenerator körs som egen batchtjänst.
- Regelpaket versionshanteras och laddas in som data, inte som hårdkodade switch-satser.

## Företagsstruktur och teamstruktur

### 5.1 Rekommenderad företagsstruktur
- **HoldCo AB**: ägande och kapital
- **ProductCo AB**: avtal med kunder, personal, IP, drift, support
- **ConsultingCo AB**: valfri senare om ni vill separera implementation/projektkonsulting från produktbolaget

Om ni i framtiden vill hantera reglerade betalflöden djupare än initiering och reconciliation ska det utredas separat innan ni bygger egen betalningslogik som kan utlösa tillståndsplikt. Bygg i tidiga faser så att systemet initierar, skickar eller synkar med banker/partners i stället för att hålla klientmedel.

### 5.2 Kärnteam
- Produktchef
- Domänansvarig ekonomi/moms
- Domänansvarig lön/HR/pension
- Domänansvarig bygg/projekt
- Staff engineer backend
- Staff engineer frontend
- Data/AI engineer
- DevOps/SRE
- UX lead för desktop-web
- UX lead för mobil fältstöd
- Customer success / pilot lead
- QA lead
- Informationssäkerhetsansvarig

## Tjänster, avtal och registreringar

Följande ska vara ordnat innan produkten går från intern utveckling till extern pilot.

### 4.1 Bolag och juridik
- [ ] Svenskt aktiebolag för produktverksamheten
- [ ] F-skatt
- [ ] Momsregistrering
- [ ] Arbetsgivarregistrering
- [ ] Företagsbankkonto
- [ ] Företagskort
- [ ] Bokföringsrutin för det egna bolaget
- [ ] Dataskyddsdokumentation
- [ ] Personuppgiftsbiträdesavtal-mallar
- [ ] Kundvillkor
- [ ] Integritetsmeddelande
- [ ] Incidentrutin
- [ ] Gallringsrutin
- [ ] Informationssäkerhetspolicy

### 4.2 Drift och utveckling
- [ ] GitHub organisation
- [ ] AWS-konto
- [ ] Cloudflare-konto
- [ ] Domännamn
- [ ] Sentry-konto
- [ ] PostHog-konto
- [ ] CI/CD secrets vault
- [ ] Container registry
- [ ] SMTP/utgående mejl
- [ ] Inbound mejl-tjänst för företagsinboxar
- [ ] SMS/telefoni-leverantör för 2FA/notiser
- [ ] Objektlagring med versionshantering
- [ ] Backupmål i separat konto/region

### 4.3 Identitet och signering
- [ ] Test- och produktionsavtal för svensk e-legitimation/BankID-stöd
- [ ] SSO-leverantör eller egen SAML/OIDC-stack
- [ ] SCIM-stöd eller plan för senare enterprise-stöd
- [ ] E-signeringstjänst för offerter och avtal
- [ ] Intern signeringspolicy

### 4.4 Betalningar, bank och pengar
- [ ] Bankkopplingspartner eller direktbanksavtal
- [ ] Swish-avtal om Swish ska stödjas
- [ ] Kortinlösen/betallänkspartner om kortbetalning ska stödjas
- [ ] OCR-/inbetalningsreferensupplägg
- [ ] Leverantörsutbetalningsstrategi
- [ ] Valutahanteringsstrategi

### 4.5 E-faktura och offentlig sektor
- [ ] Peppol-accesspunkt via partner eller egen strategi
- [ ] Peppol-ID-strategi
- [ ] Mottagarregistrering för inkommande Peppol
- [ ] Valideringspaket för Peppol BIS Billing 3
- [ ] Stöd för kreditnota och negativa fakturor
- [ ] Process för buyer reference/order reference

### 4.6 Pension och lön
- [ ] Arbetsgivartillgång till AGI-inlämning
- [ ] Collectum-administration om ITP-kunder ska stödjas
- [ ] Fora-administration om SAF-LO-kunder ska stödjas
- [ ] Pensionsleverantörsflöden för kompletterande premier
- [ ] Rutiner för löneväxlingsavtal
- [ ] Intern policy för förmåner, pension, friskvård, gåvor och resor

### 4.7 Bygg och projekt
- [ ] Process för personalliggare bygg
- [ ] ID06-strategi om det ska stödjas
- [ ] ROT/RUT-process
- [ ] KMA-dokumentstruktur
- [ ] Underlag för byggspecifika arbetsorder, ÄTA och slutdokumentation

### 4.8 Myndighets- och leverantörskanaler som ska planeras tidigt
- [ ] Skatteverket: moms, AGI, ROT/RUT
- [ ] Bolagsverket: digital årsredovisning
- [ ] DIGG/SFTI-ekosystem: e-faktura/Peppol
- [ ] BFN-kompatibla bokförings- och arkiveringsrutiner
- [ ] Collectum/Fora för pensionsrapportering


## Rekommenderade tjänster att registrera innan extern pilot

Det här är en genomförbar startkombination för ett nytt bolag som bygger med Codex:

- **GitHub** för repo, issues, pull requests och Actions.
- **AWS** som primär molnplattform.
  - region: `eu-north-1` som primär
  - sekundär backup/DR: `eu-central-1`
- **Cloudflare** för DNS, WAF, CDN och edge-skydd.
- **Sentry** för applikationsfel.
- **Grafana Cloud** för metrics, logs och traces.
- **PostHog EU** för produktanalys och feature flags.
- **Postmark** för utgående transaktionsmail.
- **Mailgun eller motsvarande inbound-email-tjänst** för företagsinboxar och råmejl med bilagor.
- **Open banking-partner** för bankdata och betalinitiering.
- **Peppol access point-partner** för inkommande och utgående Peppol.
- **BankID/eID-provider** för snabb start, med möjlighet att senare gå mot direktavtal.
- **AWS S3** för objektlagring.
- **AWS Secrets Manager** för hemligheter.
- **AWS RDS PostgreSQL** för databas.
- **AWS ElastiCache / Valkey-kompatibel cache** för köer, lås och cache.
- **AWS ECS Fargate** för deployment av API och workers.
- **AWS Backup** för backup-policy.
- **1Password eller motsvarande** som mänskligt secrets-valv för teamet, separat från runtime-secrets.

## Konton och avtal som måste finnas innan skarpa pilotkunder

- Svenskt aktiebolag
- F-skatt
- Momsregistrering
- Arbetsgivarregistrering
- Företagsbankkonto
- Företagskort
- Personuppgiftsbiträdesavtal-mallar
- Kundvillkor
- Integritetsmeddelande
- Incidentrutin
- Informationssäkerhetspolicy
- Arbetsgivaraccess för AGI
- Collectum-administration om ITP ska stödjas skarpt
- Fora-administration om SAF-LO ska stödjas skarpt
- HUS/ROT/RUT-process och intern ansvarsmatris
- Peppol-onboarding för produkten


## Monorepo-struktur


```text
repo/
  apps/
    desktop-web/
    field-mobile/
    api/
    worker/
  packages/
    ui-core/
    ui-desktop/
    ui-mobile/
    domain-core/
    domain-org-auth/
    domain-documents/
    domain-ledger/
    domain-vat/
    domain-ar/
    domain-ap/
    domain-banking/
    domain-hr/
    domain-time/
    domain-payroll/
    domain-benefits/
    domain-travel/
    domain-pension/
    domain-hus/
    domain-projects/
    domain-field/
    domain-personalliggare/
    domain-reporting/
    domain-annual-reporting/
    domain-integrations/
    auth-core/
    events/
    db/
    rule-engine/
    document-engine/
    integration-core/
    test-fixtures/
  infra/
    terraform/
    docker/
    ecs/
  docs/
    MASTER_BUILD_PLAN.md
    adr/
    compliance/
    domain/
    test-plans/
    runbooks/
    ui/
    prompts/
  scripts/
  .github/
```


## Obligatoriska dokument dag 1


- `docs/MASTER_BUILD_PLAN.md`
- `docs/adr/ADR-0001-runtime-versions.md`
- `docs/adr/ADR-0002-surface-strategy.md`
- `docs/adr/ADR-0003-domain-boundaries.md`
- `docs/adr/ADR-0004-ledger-invariants.md`
- `docs/adr/ADR-0005-rule-engine-philosophy.md`
- `docs/adr/ADR-0006-document-archive-philosophy.md`
- `docs/adr/ADR-0007-security-baseline.md`
- `docs/adr/ADR-0008-testing-pyramid.md`
- `docs/compliance/se/accounting-foundation.md`
- `docs/compliance/se/vat-engine.md`
- `docs/compliance/se/agi-engine.md`
- `docs/compliance/se/payroll-engine.md`
- `docs/compliance/se/benefits-engine.md`
- `docs/compliance/se/travel-and-traktamente-engine.md`
- `docs/compliance/se/pension-and-salary-exchange-engine.md`
- `docs/compliance/se/rot-rut-engine.md`
- `docs/compliance/se/personalliggare-engine.md`
- `docs/compliance/se/einvoice-peppol-engine.md`
- `docs/compliance/se/annual-reporting-engine.md`
- `docs/domain/ubiquitous-language.md`
- `docs/test-plans/master-test-strategy.md`
- `docs/test-plans/master-verification-gates.md`
- `docs/runbooks/local-development.md`
- `docs/runbooks/production-deploy.md`


## Datamodell och domäner

Miniminivå för datamodellen och kärntabellerna finns i `docs/domain/ubiquitous-language.md` och i respektive domändokument. Den grundläggande riktningen är:

- `companies`, `users`, `company_users`, `delegations`
- `accounts`, `voucher_series`, `journal_entries`, `journal_lines`, `accounting_periods`
- `documents`, `document_versions`, `document_links`, `email_ingest_messages`
- `customers`, `quotes`, `customer_invoices`, `ar_open_items`
- `suppliers`, `purchase_orders`, `supplier_invoices`, `ap_open_items`
- `employees`, `employments`, `time_entries`, `leave_entries`, `pay_runs`, `pay_run_lines`
- `benefit_events`, `travel_claims`, `mileage_logs`, `pension_events`
- `projects`, `project_budgets`, `work_orders`, `field_events`, `attendance_logs`
- `vat_decisions`, `agi_submissions`, `hus_claims`, `peppol_messages`, `annual_report_packages`

## Ingenjörsregler

### 7.1 Ledger-invarianten
Följande får aldrig brytas:
- varje bokföringspost ska tillhöra ett bolag
- varje verifikation ska balansera
- varje rad ska vara spårbar till källa eller manuellt skapad förklaring
- låsta perioder får inte muteras
- rättelser ska ske genom korrigering eller ombokning, inte tyst överskrivning
- rapporter ska kunna återskapas för valfri historisk tidpunkt

### 7.2 Regelmotor-invarianten
- regler får inte ligga i UI
- regler får inte ligga i enskilda controllers
- regler ska ligga i regelpaket som har:
  - id
  - domän
  - jurisdiktion
  - giltig_från
  - giltig_till
  - version
  - checksumma
  - testpaket
  - migrationsanteckning

### 7.3 Dokumentarkiv-invarianten
- originalfil sparas alltid
- derivatfil sparas separat
- OCR-text sparas separat
- klassificering sparas separat
- allt versionsstämplas
- hash sparas
- källa sparas
- mottagningstid sparas
- länkar till affärsobjekt sparas
- gallringspolicy sparas

### 7.4 Ytstrategi-invarianten
- desktop-web ska vara en enda fullstandig desktop-yta for alla roller
- field-mobile ska vara en separat tumvanlig yta ovanpa samma backend och domanpaket
- mobil ska inte bära avancerad ekonomilogik i UI

### 7.5 Test-invarianten
Ingen delfas är klar förrän följande finns:
- enhetstest
- kontraktstest
- golden-data-test om regelpåverkan finns
- E2E-test för användarflöde
- verifieringschecklista
- dokumenterad rollback-plan om produktion påverkas

## Exakt byggordning i checkbox-format

- [x] **FAS 0 — Bootstrap, repo och dokumentgrund**
  - [x] 0.1 Monorepo och runtime-låsning
  - [x] 0.2 CI, kvalitet och säkerhetsbas
  - [x] 0.3 Domänskelett och docskeleton
- [x] **FAS 1 — Identitet, organisation, auth och onboarding**
  - [x] 1.1 Organisation, roller och accesskontroll
  - [x] 1.2 Inloggning, sessioner och stark autentisering
  - [x] 1.3 Bolagssetup och onboarding wizard
- [x] **FAS 2 — Dokumentmotor, företagsinbox och OCR**
  - [x] 2.1 Dokumentarkiv och metadata
  - [x] 2.2 Företagsinbox och mail ingestion
  - [x] 2.3 OCR, klassificering och granskningskö
- [ ] **FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund**
  - [x] 3.1 Ledger-schema och verifikationsmotor
  - [x] 3.2 Dimensioner, perioder och bokföringsregler
  - [ ] 3.3 Avstämningscenter och rapportgrund
- [ ] **FAS 4 — Momsmotor**
  - [ ] 4.1 Momsmasterdata och beslutsträd
  - [x] 4.2 Sverige, EU, import, export och omvänd moms
  - [ ] 4.3 OSS, IOSS, periodisk sammanställning och rapportering
- [ ] **FAS 5 — Försäljning, kundreskontra och kundfakturor**
  - [ ] 5.1 Kundregister, artiklar, offerter och avtal
  - [ ] 5.2 Kundfakturor och leveranskanaler
  - [ ] 5.3 Kundreskontra, påminnelser och inbetalningsmatchning
- [ ] **FAS 6 — Leverantörsfakturor, inköp, bank och betalningar**
  - [ ] 6.1 Leverantörsregister, PO och mottagning
  - [ ] 6.2 Leverantörsfaktura in, tolkning och matchning
  - [ ] 6.3 Attest, bankintegration och utbetalning
- [ ] **FAS 7 — Tidportal, HR-bas och anställdportal**
  - [ ] 7.1 Anställdregister och HR-master
  - [ ] 7.2 Tidrapportering, schema och saldon
  - [ ] 7.3 Frånvaro, attest och anställdportal
- [ ] **FAS 8 — Lön och AGI**
  - [ ] 8.1 Lönearter, lönekalender och lönekörning
  - [ ] 8.2 Skatt, arbetsgivaravgifter, SINK och AGI
  - [ ] 8.3 Lönebokföring och utbetalning
- [ ] **FAS 9 — Förmåner, resor, traktamente, pension och löneväxling**
  - [ ] 9.1 Förmånsmotor
  - [ ] 9.2 Resor, traktamente, körjournal och utlägg
  - [ ] 9.3 Pension, extra pension och löneväxling
- [ ] **FAS 10 — Projekt, bygg, fält, lager och personalliggare**
  - [ ] 10.1 Projekt, budget och uppföljning
  - [ ] 10.2 Arbetsorder, serviceorder, fältapp och lager
  - [ ] 10.3 Byggspecifika regler: ÄTA, HUS, omvänd moms, personalliggare
- [ ] **FAS 11 — Rapporter, byråläge, månadsstängning och bokslut**
  - [ ] 11.1 Rapporter och drilldown
  - [ ] 11.2 Byråläge och portföljhantering
  - [ ] 11.3 Månadsstängning och bokslutschecklistor
- [ ] **FAS 12 — Årsredovisning, deklaration och myndighetskopplingar**
  - [ ] 12.1 Årsredovisningsmotor
  - [ ] 12.2 Skatt, deklarationsunderlag och myndighetsfiler
- [ ] **FAS 13 — API, integrationer, AI och automation**
  - [ ] 13.1 Publikt API och webhooks
  - [ ] 13.2 Partnerintegrationer och marknadsplats
  - [ ] 13.3 AI, automation och no-code-regler
- [ ] **FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live**
  - [ ] 14.1 Säkerhet och behörighetsgranskning
  - [ ] 14.2 Prestanda, återläsning och chaos-test
  - [ ] 14.3 Pilotkunder, datamigrering och go-live-ritual

## Faser och delfaser

## FAS 0 — Bootstrap, repo och dokumentgrund

Lås verktyg, repo, dokumentstruktur, CI och lokala miljöer innan någon affärslogik skrivs.

### 0.1 Monorepo och runtime-låsning

**Bygg detta**
- [x] Monorepo med apps, packages, infra, docs
- [x] Låsta runtimes och lokala dev-verktyg
- [x] Docker Compose för lokala beroenden

**Verifiera detta innan nästa delfas**
- [ ] Ren maskin kan bootstrapa projektet
- [x] Versioner matchar ADR-0001
- [x] Health checks svarar grönt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P0-01`.

### 0.2 CI, kvalitet och säkerhetsbas

**Bygg detta**
- [x] GitHub Actions
- [x] Lint, typecheck, test och security checks
- [x] Branch protection och CODEOWNERS

**Verifiera detta innan nästa delfas**
- [ ] Trasig PR blockeras
- [x] Secrets och sårbarheter fångas
- [x] CI är deterministisk

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P0-02`.

### 0.3 Domänskelett och docskeleton

**Bygg detta**
- [x] Package placeholders för alla domäner
- [x] ADR-bibliotek
- [x] Ubiquitous language

**Verifiera detta innan nästa delfas**
- [x] Inga cirkulära beroenden
- [x] Alla domäner har README
- [x] Alla obligatoriska dokument finns

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P0-03`.

## FAS 1 — Identitet, organisation, auth och onboarding

Gör det möjligt att skapa bolag, användare, roller, attester och säkra sessioner.

### 1.1 Organisation, roller och accesskontroll

**Bygg detta**
- [x] Bolagsmodell
- [x] Användarmodell
- [x] RBAC + objektbaserad åtkomst
- [x] Delegation och attestkedjor

**Verifiera detta innan nästa delfas**
- [x] Bolag kan inte se varandras data
- [x] Delegation respekterar datum och scope
- [x] Servern blockerar otillåtna actions

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P1-01`.

### 1.2 Inloggning, sessioner och stark autentisering

**Bygg detta**
- [x] Login/logout
- [x] MFA
- [x] Passkeys/TOTP
- [x] BankID-provider-abstraktion

**Verifiera detta innan nästa delfas**
- [x] Sessioner kan återkallas
- [x] MFA krävs för admins
- [x] Audit log skapas för autentisering

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P1-02`.

### 1.3 Bolagssetup och onboarding wizard

**Bygg detta**
- [x] Skapa bolag
- [x] Registreringar och inställningar
- [x] Kontoplan-, moms- och periodsetup

**Verifiera detta innan nästa delfas**
- [x] Onboarding skapar komplett bolagskonfiguration
- [x] Checklista visar saknade steg
- [x] Setup kan återupptas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P1-03`.

## FAS 2 — Dokumentmotor, företagsinbox och OCR

Bygg beviskedjan för hela systemet: dokument, råmejl, bilagor, hashning, klassning och granskningskö.

### 2.1 Dokumentarkiv och metadata

**Bygg detta**
- [x] Immutable storage
- [x] Dokumentversioner
- [x] Document-links
- [x] Hash- och statusmodell

**Verifiera detta innan nästa delfas**
- [x] Original och derivat skiljs åt
- [x] Export av dokumentkedja fungerar
- [x] Duplikat upptäcks

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P2-01`.

### 2.2 Företagsinbox och mail ingestion

**Bygg detta**
- [x] Per-bolag-inbox
- [x] Ingest av rått mejl och bilagor
- [x] Routing till dokumentkö

**Verifiera detta innan nästa delfas**
- [x] Flera bilagor hanteras korrekt
- [x] Message-ids dedupliceras
- [x] Felaktiga bilagor flaggas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P2-02`.

### 2.3 OCR, klassificering och granskningskö

**Bygg detta**
- [x] OCR pipeline
- [x] Klassificering av dokumenttyp
- [x] Granskningskö med confidence

**Verifiera detta innan nästa delfas**
- [x] Fakturor, kvitton och avtal särskiljs
- [x] Människan kan korrigera tolkningen
- [x] Omkörning sparar ny derivatversion

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P2-03`.

## FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund

Skapa ledgern som alla andra domäner måste skriva genom.

### 3.1 Ledger-schema och verifikationsmotor

**Bygg detta**
- [x] Konton
- [x] Verifikationsserier
- [x] Journal entries och lines
- [x] Balanskontroller

**Verifiera detta innan nästa delfas**
- [x] Debet = kredit i alla tester
- [x] Verifikationsnummer är deterministiska
- [x] Import markerar källtyp

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P3-01`.

### 3.2 Dimensioner, perioder och bokföringsregler

**Bygg detta**
- [x] Projekt/kostnadsställe/affärsområde
- [x] Periodlåsning
- [x] Reversal och korrigering

**Verifiera detta innan nästa delfas**
- [x] Låsta perioder går inte att mutera
- [x] Rättelser skapar ny verifikation
- [x] Obligatoriska dimensioner valideras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P3-02`.

### 3.3 Avstämningscenter och rapportgrund

**Bygg detta**
- [x] Trial balance
- [x] Verifikationssök
- [x] Avstämningsobjekt
- [x] Basrapporter

**Verifiera detta innan nästa delfas**
- [x] Rapporter kan återskapas historiskt
- [x] Drilldown fungerar till källdokument
- [x] Avstämning sparar sign-off

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P3-03`.

## FAS 4 — Momsmotor

Bygg ett explicit beslutsträd för svensk moms, EU, import, export, reverse charge och rapportering.

### 4.1 Momsmasterdata och beslutsträd

**Bygg detta**
- [x] VAT codes
- [x] decision objects
- [x] regelpaket per datum

**Verifiera detta innan nästa delfas**
- [x] Alla transaktionstyper får ett spårbart momsbeslut
- [x] Historiska regler kan återspelas
- [x] Oklara fall går till granskningskö

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P4-01`.

### 4.2 Sverige, EU, import, export och omvänd moms

**Bygg detta**
- [x] Sverige 25/12/6/0
- [x] EU B2B/B2C
- [x] Import/export
- [x] bygg-omvänd moms

**Verifiera detta innan nästa delfas**
- [x] Deklarationsboxar summerar rätt
- [x] Kreditnota spegelvänder moms korrekt
- [x] Importmoms och reverse charge dubbelbokas rätt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P4-02`.

### 4.3 OSS, IOSS, periodisk sammanställning och rapportering

**Bygg detta**
- [ ] OSS/IOSS classification
- [ ] Periodisk sammanställning
- [ ] Momsdeklarationsunderlag

**Verifiera detta innan nästa delfas**
- [ ] B2C-distansförsäljning landas rätt
- [ ] EU-lista kan skapas om och om igen
- [ ] Momsrapport stämmer mot ledgern

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P4-03`.

## FAS 5 — Försäljning, kundreskontra och kundfakturor

Ta kunden från offert eller order till bokförd faktura och inbetalning.

### 5.1 Kundregister, artiklar, offerter och avtal

**Bygg detta**
- [ ] Kundregister
- [ ] Kontaktpersoner
- [ ] Artiklar och prislistor
- [ ] Offert/avtal

**Verifiera detta innan nästa delfas**
- [ ] Offerter versionshanteras
- [ ] Avtal genererar korrekt fakturaplan
- [ ] Kunddata kan importeras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P5-01`.

### 5.2 Kundfakturor och leveranskanaler

**Bygg detta**
- [ ] Standard/kredit/del/abonnemangsfakturor
- [ ] PDF/e-faktura/Peppol
- [ ] Betallänkar

**Verifiera detta innan nästa delfas**
- [ ] Faktura bokförs bara en gång
- [ ] Kreditfaktura stänger rätt poster
- [ ] Peppol-export validerar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P5-02`.

### 5.3 Kundreskontra, påminnelser och inbetalningsmatchning

**Bygg detta**
- [ ] Öppna poster
- [ ] Påminnelseflöde
- [ ] Matchning mot bank

**Verifiera detta innan nästa delfas**
- [ ] Delbetalningar hanteras
- [ ] Felmatchningar kan backas
- [ ] Åldersanalys är korrekt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P5-03`.

## FAS 6 — Leverantörsfakturor, inköp, bank och betalningar

Bygg AP-motorn, attestkedjor, betalningsförslag och bankavstämning.

### 6.1 Leverantörsregister, PO och mottagning

**Bygg detta**
- [ ] Leverantörsregister
- [ ] PO
- [ ] Mottagningsobjekt
- [ ] Pris- och konto-defaults

**Verifiera detta innan nästa delfas**
- [ ] Leverantörer och PO kan importeras
- [ ] Mottagning kopplar till faktura
- [ ] Dubblettskydd finns

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P6-01`.

### 6.2 Leverantörsfaktura in, tolkning och matchning

**Bygg detta**
- [ ] AP-ingest
- [ ] OCR/radnivå
- [ ] 2-vägs- och 3-vägsmatchning

**Verifiera detta innan nästa delfas**
- [ ] Flera kostnadsrader bokas rätt
- [ ] Momsförslag kan förklaras
- [ ] Avvikelser kräver granskning

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P6-02`.

### 6.3 Attest, bankintegration och utbetalning

**Bygg detta**
- [ ] Flerstegsattest
- [ ] Betalningsförslag
- [ ] Bankreturer och avprickning

**Verifiera detta innan nästa delfas**
- [ ] Obehöriga kan inte betala
- [ ] Utbetalningar bokförs korrekt
- [ ] Returer kan återimporteras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P6-03`.

## FAS 7 — Tidportal, HR-bas och anställdportal

Skapa masterdata för anställda och samla tid, frånvaro, saldon och attestering innan lön byggs.

### 7.1 Anställdregister och HR-master

**Bygg detta**
- [ ] Anställningar
- [ ] avtal och chefsträd
- [ ] bankkonton och dokument

**Verifiera detta innan nästa delfas**
- [ ] Samma person kan ha flera anställningar
- [ ] Anställningshistorik bevaras
- [ ] Känsliga fält loggas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P7-01`.

### 7.2 Tidrapportering, schema och saldon

**Bygg detta**
- [ ] In/utstämpling
- [ ] Schema/OB/jour/beredskap
- [ ] Flex, komp, övertid

**Verifiera detta innan nästa delfas**
- [ ] Låsning av period fungerar
- [ ] Tid kan kopplas till projekt och aktivitet
- [ ] Beräkning av saldon är reproducerbar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P7-02`.

### 7.3 Frånvaro, attest och anställdportal

**Bygg detta**
- [ ] Frånvarotyper
- [ ] Chefsgodkännande
- [ ] Anställdportal

**Verifiera detta innan nästa delfas**
- [ ] Frånvaro kan inte ändras efter AGI-signering
- [ ] Historik visas för anställd och admin
- [ ] Uppgifter för frånvarosignaler är kompletta

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P7-03`.

## FAS 8 — Lön och AGI

Omvandla tid, frånvaro, förmåner och avtal till korrekt lön, utbetalning, bokföring och AGI.

### 8.1 Lönearter, lönekalender och lönekörning

**Bygg detta**
- [ ] Lönearter
- [ ] Lönekörning
- [ ] Retro och korrigering
- [ ] Slutlön

**Verifiera detta innan nästa delfas**
- [ ] Lönekedjan följer definierad ordning
- [ ] Retrofall är spårbara
- [ ] Lönebesked kan regenereras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P8-01`.

### 8.2 Skatt, arbetsgivaravgifter, SINK och AGI

**Bygg detta**
- [ ] Skattelogik
- [ ] avgiftsregler
- [ ] SINK
- [ ] AGI-underlag och submission

**Verifiera detta innan nästa delfas**
- [ ] AGI innehåller rätt fält per individ
- [ ] Frånvarouppgifter låses i tid
- [ ] Rättelseversioner kan skapas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P8-02`.

### 8.3 Lönebokföring och utbetalning

**Bygg detta**
- [ ] Löneverifikationer
- [ ] Bankbetalningsunderlag
- [ ] Kostnadsfördelning

**Verifiera detta innan nästa delfas**
- [ ] Bokföring per projekt/kostnadsställe fungerar
- [ ] Utbetalningar matchas mot bank
- [ ] Semesterskuld kan återskapas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P8-03`.

## FAS 9 — Förmåner, resor, traktamente, pension och löneväxling

Bygg de mest regelstyrda HR-ekonomiflödena ovanpå stabil lönekärna.

### 9.1 Förmånsmotor

**Bygg detta**
- [ ] Förmånskatalog
- [ ] Skattepliktig/skattefri logik
- [ ] Bil, drivmedel, friskvård, gåvor, kost, sjukvård

**Verifiera detta innan nästa delfas**
- [ ] Förmåner med och utan kontant lön hanteras
- [ ] Bilförmån start/stopp per månad fungerar
- [ ] AGI-mappning och bokföring är korrekt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P9-01`.

### 9.2 Resor, traktamente, körjournal och utlägg

**Bygg detta**
- [ ] Tjänsteresa som objekt
- [ ] Inrikes/utlandstraktamente
- [ ] Bilersättning
- [ ] Körjournal

**Verifiera detta innan nästa delfas**
- [ ] 50 km-krav och övernattning styr korrekt
- [ ] Måltidsreduktion minskar rätt
- [ ] Överskjutande del blir lön

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P9-02`.

### 9.3 Pension, extra pension och löneväxling

**Bygg detta**
- [ ] ITP/Fora-stöd
- [ ] Extra pension
- [ ] Löneväxling
- [ ] Pensionsrapportering

**Verifiera detta innan nästa delfas**
- [ ] Rapportunderlag per kollektivavtal stämmer
- [ ] Löneväxling varnar under tröskel
- [ ] Pension bokförs och avstäms

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P9-03`.

## FAS 10 — Projekt, bygg, fält, lager och personalliggare

Ta systemet ut på arbetsplatsen med arbetsorder, material, ÄTA, HUS, byggmoms och personalliggare.

### 10.1 Projekt, budget och uppföljning

**Bygg detta**
- [ ] Projektbudget
- [ ] WIP
- [ ] projektmarginal
- [ ] resursbeläggning

**Verifiera detta innan nästa delfas**
- [ ] Projektkostnad inkluderar lön, förmåner, pension och resor
- [ ] WIP kan stämmas av mot fakturering
- [ ] Forecast at completion fungerar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P10-01`.

### 10.2 Arbetsorder, serviceorder, fältapp och lager

**Bygg detta**
- [ ] Dispatch
- [ ] fältmobil
- [ ] material och lager
- [ ] kundsignatur

**Verifiera detta innan nästa delfas**
- [ ] Offline-sync tål nätavbrott
- [ ] Materialuttag går till projekt
- [ ] Arbetsorder kan faktureras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P10-02`.

### 10.3 Byggspecifika regler: ÄTA, HUS, omvänd moms, personalliggare

**Bygg detta**
- [ ] ÄTA
- [ ] ROT/RUT/HUS
- [ ] byggmoms
- [ ] personalliggare

**Verifiera detta innan nästa delfas**
- [ ] HUS-kundandel och ansökan stämmer
- [ ] Byggmoms triggas korrekt
- [ ] Personalliggare exporterar kontrollbar kedja

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P10-03`.

## FAS 11 — Rapporter, byråläge, månadsstängning och bokslut

Gör systemet användbart för byråer, controllers och periodstängning.

### 11.1 Rapporter och drilldown

**Bygg detta**
- [ ] P&L, balans, cashflow, reskontra, projekt
- [ ] drilldown
- [ ] rapportbyggare light

**Verifiera detta innan nästa delfas**
- [ ] Rapporter är historiskt reproducerbara
- [ ] Belopp kan spåras till källdokument
- [ ] Export till Excel/PDF fungerar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P11-01`.

### 11.2 Byråläge och portföljhantering

**Bygg detta**
- [ ] Byråportfölj
- [ ] deadlines
- [ ] klientstatus
- [ ] massåtgärder

**Verifiera detta innan nästa delfas**
- [ ] Byrån ser bara klienter i scope
- [ ] Deadlines härleds från bolagsinställningar
- [ ] Klientdokument kan begäras och spåras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P11-02`.

### 11.3 Månadsstängning och bokslutschecklistor

**Bygg detta**
- [ ] Close workbench
- [ ] avstämningslistor
- [ ] sign-off

**Verifiera detta innan nästa delfas**
- [ ] Månad kan stängas med komplett checklista
- [ ] Öppna avvikelser blockerar sign-off där policy kräver
- [ ] Återskapad period ger samma rapport

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P11-03`.

## FAS 12 — Årsredovisning, deklaration och myndighetskopplingar

Bygg årsflöden, digital inlämning och deklarationsunderlag ovanpå stängda perioder.

### 12.1 Årsredovisningsmotor

**Bygg detta**
- [ ] K2/K3-spår
- [ ] årsredovisningspaket
- [ ] versioner och signeringsunderlag

**Verifiera detta innan nästa delfas**
- [ ] Årspaket låser underlag
- [ ] Signaturkedja spåras
- [ ] Rättelse skapar ny version

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P12-01`.

### 12.2 Skatt, deklarationsunderlag och myndighetsfiler

**Bygg detta**
- [ ] INK/NE/SRU-underlag
- [ ] moms/AGI/HUS-översikter
- [ ] myndighetsadapterlager

**Verifiera detta innan nästa delfas**
- [ ] Filer matchar interna siffror
- [ ] Submission loggas med kvittens
- [ ] Fel går till åtgärdskö

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P12-02`.

## FAS 13 — API, integrationer, AI och automation

Öppna kärnan mot omvärlden först när domänerna är stabila.

### 13.1 Publikt API och webhooks

**Bygg detta**
- [ ] API-spec
- [ ] OAuth/scopes
- [ ] webhooks
- [ ] sandbox

**Verifiera detta innan nästa delfas**
- [ ] Scopes begränsar rätt data
- [ ] Webhook events är idempotenta
- [ ] Backward compatibility bevakas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P13-01`.

### 13.2 Partnerintegrationer och marknadsplats

**Bygg detta**
- [ ] Bank
- [ ] Peppol
- [ ] pension
- [ ] CRM/e-handel/ID06

**Verifiera detta innan nästa delfas**
- [ ] Varje adapter har kontraktstest
- [ ] Fallback finns vid extern driftstörning
- [ ] Rate limits respekteras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P13-02`.

### 13.3 AI, automation och no-code-regler

**Bygg detta**
- [ ] Konteringsförslag
- [ ] klassificering
- [ ] anomalidetektion
- [ ] regelbyggare

**Verifiera detta innan nästa delfas**
- [ ] Alla AI-beslut har confidence och förklaring
- [ ] Human-in-the-loop kan överstyra
- [ ] Felaktiga AI-förslag påverkar inte ledger utan granskning

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P13-03`.

## FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live

Stresstesta systemet, kör verklig migrering och gå live kontrollerat.

### 14.1 Säkerhet och behörighetsgranskning

**Bygg detta**
- [ ] Penteståtgärder
- [ ] behörighetsgranskning
- [ ] SoD-kontroller

**Verifiera detta innan nästa delfas**
- [ ] Kritiska findings är åtgärdade
- [ ] Admin-spår granskas
- [ ] Secrets-hantering är verifierad

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P14-01`.

### 14.2 Prestanda, återläsning och chaos-test

**Bygg detta**
- [ ] Load profiler
- [ ] backup/restore-prover
- [ ] chaos-scenarier

**Verifiera detta innan nästa delfas**
- [ ] Systemet klarar mållast
- [ ] RTO/RPO uppfylls
- [ ] Köer återhämtar sig efter fel

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P14-02`.

### 14.3 Pilotkunder, datamigrering och go-live-ritual

**Bygg detta**
- [ ] Pilotplan
- [ ] migreringschecklistor
- [ ] go-live och rollback-plan

**Verifiera detta innan nästa delfas**
- [ ] Parallellkörning stämmer
- [ ] Kunddata migreras utan differenser
- [ ] Support-runbook är bemannad

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` → `P14-03`.


## Domändokument per fas

- FAS 2 → `docs/compliance/se/document-inbox-and-ocr-engine.md`, `docs/adr/ADR-0011-document-ingestion-and-ocr-strategy.md`, `docs/runbooks/fas-2-document-archive-verification.md`, `docs/runbooks/fas-2-company-inbox-verification.md`, `docs/runbooks/ocr-malware-scanning-operations.md` och `docs/runbooks/fas-2-ocr-review-verification.md`
- FAS 3 → `docs/compliance/se/accounting-foundation.md`
- FAS 4 → `docs/compliance/se/vat-engine.md`
- FAS 5 → `docs/compliance/se/ar-customer-invoicing-engine.md` och `docs/compliance/se/einvoice-peppol-engine.md`
- FAS 6 → `docs/compliance/se/ap-supplier-invoice-engine.md`, `docs/compliance/se/bank-and-payments-engine.md` och `docs/compliance/se/einvoice-peppol-engine.md`
- FAS 8 → `docs/compliance/se/payroll-engine.md` och `docs/compliance/se/agi-engine.md`
- FAS 9 → `docs/compliance/se/benefits-engine.md`, `docs/compliance/se/travel-and-traktamente-engine.md`, `docs/compliance/se/pension-and-salary-exchange-engine.md`, `docs/compliance/se/cash-card-and-clearing-engine.md` och `docs/compliance/se/collections-writeoff-and-bad-debt-engine.md`
- FAS 10 → `docs/compliance/se/rot-rut-engine.md`, `docs/compliance/se/personalliggare-engine.md`, `docs/compliance/se/project-billing-and-revenue-recognition-engine.md` och `docs/domain/offline-sync-and-conflict-resolution.md`
- FAS 11 → `docs/compliance/se/reconciliation-and-close-engine.md`, `docs/domain/work-items-deadlines-notifications.md`, `docs/domain/search-indexing-and-global-search.md`, `docs/domain/saved-views-dashboards-and-personalization.md`, `docs/domain/bureau-portfolio-client-requests-and-approvals.md`, `docs/domain/close-checklists-blockers-and-signoff.md`, `docs/domain/reporting-metric-catalog-and-export-jobs.md` och `docs/domain/comments-mentions-and-collaboration.md`
- FAS 12 → `docs/compliance/se/annual-reporting-engine.md` och `docs/domain/submission-receipts-and-action-queue.md`
- FAS 13 → `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
- FAS 14 → `docs/domain/audit-review-support-and-admin-backoffice.md` och `docs/domain/migration-cockpit-parallel-run-and-cutover.md`

## Tvärgående ADR:er, policies, runbooks och testplaner

- Search, index och global search styrs av `docs/adr/ADR-0013-search-and-indexing-strategy.md`, `docs/runbooks/search-index-rebuild-and-repair.md` och `docs/test-plans/search-relevance-and-permission-trimming-tests.md`.
- Work items, deadlines och notifieringar styrs av `docs/adr/ADR-0014-work-items-deadlines-and-notifications-strategy.md`.
- Async jobs, retry/replay och dead-letter styrs av `docs/adr/ADR-0015-async-jobs-queues-and-replay-strategy.md`, `docs/runbooks/async-job-retry-replay-and-dead-letter.md` och `docs/test-plans/queue-resilience-and-replay-tests.md`.
- Feature flags och nödbrytare styrs av `docs/adr/ADR-0016-feature-flags-rollout-and-kill-switch-strategy.md`, `docs/policies/feature-flag-and-emergency-disable-policy.md`, `docs/runbooks/feature-flag-rollout-and-emergency-disable.md` och `docs/test-plans/feature-flag-rollback-and-disable-tests.md`.
- Submissions, receipts och action queue styrs av `docs/adr/ADR-0017-submission-receipt-and-action-queue-strategy.md` och `docs/runbooks/submission-operations-and-retry.md`.
- Offline sync och konfliktlösning styrs av `docs/adr/ADR-0018-offline-sync-and-conflict-resolution-strategy.md`, `docs/runbooks/mobile-offline-conflict-repair.md` och `docs/test-plans/mobile-offline-sync-tests.md`.
- Rapportering, metric governance och exportjobb styrs av `docs/adr/ADR-0019-reporting-exports-and-metric-governance-strategy.md` och `docs/test-plans/report-reproducibility-and-export-integrity-tests.md`.
- Migrering, parallellkörning och cutover styrs av `docs/adr/ADR-0020-migration-parallel-run-and-cutover-strategy.md`, `docs/runbooks/pilot-migration-and-cutover.md` och `docs/test-plans/migration-parallel-run-diff-tests.md`.
- Audit review, support och backoffice styrs av `docs/adr/ADR-0021-audit-review-support-and-backoffice-strategy.md`, `docs/policies/support-access-and-impersonation-policy.md`, `docs/runbooks/support-backoffice-and-audit-review.md` och `docs/test-plans/audit-review-and-sod-tests.md`.
- Klientgodkännanden, deadlines och eskalering styrs även av `docs/policies/client-approval-deadline-and-escalation-policy.md`.

## Verifieringsgrindar

Fasvisa exit-gates finns i `docs/test-plans/master-verification-gates.md`. Ingen fas får anses klar förrän dess gate är grön.

## UI och design

UI byggs inte som en separat första fas. Vi bygger först kärnlogik och tunna operatorskal. När kärnflödena bär byggs full enterprise-UI enligt `docs/ui/ENTERPRISE_UI_PLAN.md`.

## Årligt regelunderhåll

Varje år ska minst följande regelpaket gås igenom och versionsbumpas:

- arbetsgivaravgifter
- SINK
- traktamente och utlandstraktamenten
- milersättning
- kostförmån
- gåvobelopp
- HUS/ROT/RUT-nivåer
- personalliggare- och branschkrav
- momsregler vid ändringar
- årsredovisnings- och deklarationsformat

Ett regelpaket får inte aktiveras utan:
- golden tests
- migrationsanteckning
- regressionskörning mot föregående års data
- uppdaterad dokumentation i compliance-motorn

## Slutord

Bygg aldrig “en app med bokföring”. Bygg ett system där arbete, dokument, pengar och rapportering är samma kedja.


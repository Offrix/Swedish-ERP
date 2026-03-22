# MASTER BUILD PLAN

Detta Ã¤r huvudplanen fÃ¶r att bygga systemet frÃ¥n noll med Codex. Dokumentet fokuserar pÃ¥ kÃ¤rnsystemet och produktens reglerade motorer. Slutlig designpolish ligger inte hÃ¤r; produkt-UI finns i separat plan i `docs/ui/ENTERPRISE_UI_PLAN.md`.

## Syfte

Bygg ett svenskt enterprise-system fÃ¶r ekonomi, dokument, projekt, lÃ¶n, pension, resor, bygg och myndighetsrapportering som kan gÃ¥ live utan att anvÃ¤ndaren behÃ¶ver komplettera med externa regelbeskrivningar fÃ¶r kÃ¤rnflÃ¶dena.

## LÃ¤sordning

1. `docs/MASTER_BUILD_PLAN.md`
2. ADR:er i `docs/adr/`
3. Compliance-motorer i `docs/compliance/se/`
4. DomÃ¤ndokument i `docs/domain/`, inklusive work items, search, saved views, byrÃ¥portfÃ¶lj, close, submissions, async jobs, support/backoffice, offline, migration, reporting och collaboration
5. `docs/domain/ubiquitous-language.md`
6. `docs/test-plans/master-test-strategy.md`
7. `docs/test-plans/master-verification-gates.md`
8. `docs/runbooks/local-development.md`
9. `docs/runbooks/production-deploy.md`
10. `docs/ui/ENTERPRISE_UI_PLAN.md`
11. `docs/prompts/CODEX_PROMPT_LIBRARY.md`


## Codex-kontrakt

Codex ska anvÃ¤ndas som genomfÃ¶randeagent fÃ¶r hela projektet. AnvÃ¤ndaren ska inte behÃ¶va Ã¶versÃ¤tta mÃ¥len till kod sjÃ¤lv.

### Codex mÃ¥ste alltid gÃ¶ra detta

1. lÃ¤sa relevanta dokument innan implementation pÃ¥bÃ¶rjas
2. skriva eller uppdatera kod **och** dokumentation i samma fÃ¶rÃ¤ndring
3. kÃ¶ra tester efter varje delfas
4. skriva ut exakt vilka kommandon anvÃ¤ndaren ska kÃ¶ra lokalt om mÃ¤nskliga steg krÃ¤vs
5. frÃ¥ga om nÃ¥got saknas i dokumenten **endast** nÃ¤r det finns en verklig blockerare
6. annars fortsÃ¤tta utan att pausa
7. aldrig lÃ¤gga domÃ¤nregler i UI
8. aldrig skriva direkt i ledgern utanfÃ¶r ledger-tjÃ¤nsten
9. aldrig infÃ¶ra ett externt beroende utan att dokumentera det i runbooks och ADR om det pÃ¥verkar arkitektur

### Codex mÃ¥ste frÃ¥ga anvÃ¤ndaren nÃ¤r

- avtal med extern leverantÃ¶r saknas
- hemligheter eller certifikat mÃ¥ste skapas
- BankID-, bank-, Peppol- eller open-banking-avtal mÃ¥ste signeras
- juridisk policy eller fÃ¶retagsspecifikt beslut saknas
- det finns flera affÃ¤rsmÃ¤ssigt olika vÃ¤gar och dokumenten inte redan valt en

### Codex fÃ¥r inte frÃ¥ga anvÃ¤ndaren om

- sÃ¥dant som redan stÃ¥r i dokumenten
- triviala implementationsdetaljer
- om den ska skriva tester, migrationsfiler eller dokumentation; svaret Ã¤r alltid ja


## Icke-fÃ¶rhandlingsbara principer

- Ledgern Ã¤r systemets sanning fÃ¶r ekonomi.
- Alla regler ska vara datumstyrda och versionerade.
- Alla kritiska beslut ska kunna fÃ¶rklaras.
- Alla dokument ska vara spÃ¥rbara frÃ¥n rÃ¥tt underlag till slutrapport.
- PeriodlÃ¥sning fÃ¥r aldrig kringgÃ¥s.
- Ingen tyst mutation av historiska bokfÃ¶ringsdata.
- Core engine fÃ¶rst. UI-polish sist.
- Desktop fÃ¶rst fÃ¶r desktop-web; mobil Ã¤r separat stÃ¶d fÃ¶r fÃ¤lt och personal.
- Desktop-web Ã¤r en enda fullstÃ¤ndig desktop-yta fÃ¶r alla roller; mobil Ã¤r en separat fÃ¶renklad och tumvÃ¤nlig stÃ¶d-yta ovanpÃ¥ gemensam backend.
- Allt ska vara byggt sÃ¥ att Codex kan genomfÃ¶ra arbetet steg fÃ¶r steg med minimal mÃ¤nsklig kodinsats.

## Produktens tvÃ¥ ytor

Se ADR-0002 och UI-planen. Sammanfattning:

- `desktop-web`: en fullstÃ¤ndig enterprise desktop-yta fÃ¶r alla roller, frÃ¥n fÃ¶retagare till ekonomi, lÃ¶n, controller, byrÃ¥ och projektstyrning
- `field-mobile`: separat mobilapp fÃ¶r fÃ¤lt, tid, resor, utlÃ¤gg, personalliggare, order och signatur

## Teknisk huvudarkitektur

### 3.1 Rekommenderad stack

Det hÃ¤r Ã¤r den rekommenderade primÃ¤rstacken fÃ¶r att fÃ¥ fart, typstyrning, hÃ¶g testbarhet och lÃ¥g friktion med Codex:

#### Frontend
- **TypeScript**
- **React 19**
- **Next.js 16**
- **TanStack Query**
- **TanStack Table**
- **Zod**
- **React Hook Form**
- **Playwright** fÃ¶r E2E
- **Vitest** fÃ¶r komponent- och unit-test
- **Storybook** fÃ¶r komponentbibliotek

#### Backend
- **TypeScript pÃ¥ Node.js 24 LTS** fÃ¶r API, BFF, webbserver, integrationslager och realtidsnotiser.
- **Python 3.14.x** fÃ¶r regelmotorstÃ¶d, OCR-pipelines, ETL, dokumentklassning, AI-assisterade arbetsflÃ¶den, batchkÃ¶rningar, rapportgeneratorer och verifieringsverktyg.
- **SQL** fÃ¶r schema, migrations och materialiserade views.

#### Databas och state
- **PostgreSQL 18**
- **Valkey/Redis-kompatibel cache** fÃ¶r kÃ¶er, sessions, rate limiting, caching och lÃ¥sning.
- **Objektlagring** fÃ¶r dokument, PDF, kvitton, fakturor och binÃ¤ra filer.
- **SÃ¶kindex** fÃ¶r fulltextsÃ¶kning Ã¶ver dokument, kunder, projekt, fakturor, verifikat och kommentarer.

#### Infrastruktur
- **AWS i EU-region** som primÃ¤r driftmiljÃ¶.
- **Cloudflare** fÃ¶r DNS, WAF, CDN, rate limiting, DDoS-skydd och edge-cache.
- **GitHub** fÃ¶r kod, PR, CI, issues.
- **Terraform** fÃ¶r infrastruktur som kod.
- **Docker** fÃ¶r lokala miljÃ¶er och deploybara images.
- **GitHub Actions** fÃ¶r CI/CD.

#### Observability
- **OpenTelemetry**
- **Sentry** fÃ¶r felspÃ¥rning
- **PostHog** fÃ¶r produktanalys
- **Prometheus/Grafana** eller motsvarande hanterad observability fÃ¶r drift
- **k6** fÃ¶r lasttester

### 3.2 VarfÃ¶r denna stack

- TypeScript ger samma sprÃ¥k Ã¶ver webbytor, API och stora delar av domÃ¤nlogiken.
- Python Ã¤r starkt fÃ¶r dokumenttolkning, AI-stÃ¶d, filbearbetning och batcher.
- PostgreSQL Ã¤r tillrÃ¤ckligt starkt fÃ¶r ledger, reskontra, rapporter, regelpaket och revisionsspÃ¥r.
- Next.js 16 ger snabb produktutveckling i desktop-appen.
- Node 24 LTS och Python 3.14.x Ã¤r stabila, aktuella och vÃ¤lstÃ¶dda.
- AWS i EU ger en tydlig produktionsstandard fÃ¶r bolagskunder.
- Cloudflare minskar attackyta, hanterar DNS/TLS och skyddar produktens externa ingÃ¥ngar.

### 3.3 Monolit fÃ¶rst, modulÃ¤r monolit, sedan selektiv extraktion

Bygg inte mikroservice-soppa frÃ¥n start.

Bygg detta fÃ¶rst:
- en modulÃ¤r monolit fÃ¶r domÃ¤n och transaktioner
- en gemensam worker-runtime i FAS 0 fÃ¶r batcher, OCR, rapporter och notifieringar
- separata produkt-ytor fÃ¶r desktop-web och field-mobile
- ett gemensamt API-lager
- ett gemensamt regelpaketslager

Bryt ut till egna tjÃ¤nster fÃ¶rst nÃ¤r ett av fÃ¶ljande Ã¤r sant:
- lasten krÃ¤ver det
- sÃ¤kerhetsgrÃ¤nser krÃ¤ver det
- releasekadens krÃ¤ver det
- domÃ¤nÃ¤garskap krÃ¤ver det

### 3.4 Runtime- och deploystrategi

- Desktop-webben deployas som egen app.
- Mobilappen deployas separat.
- API kÃ¶rs som egen tjÃ¤nst.
- Workers kÃ¶rs som egna tjÃ¤nster.
- Dokumentinbox/OCR kÃ¶rs som egen pipeline.
- Rapportgenerator kÃ¶rs som egen batchtjÃ¤nst.
- Regelpaket versionshanteras och laddas in som data, inte som hÃ¥rdkodade switch-satser.

## FÃ¶retagsstruktur och teamstruktur

### 5.1 Rekommenderad fÃ¶retagsstruktur
- **HoldCo AB**: Ã¤gande och kapital
- **ProductCo AB**: avtal med kunder, personal, IP, drift, support
- **ConsultingCo AB**: valfri senare om ni vill separera implementation/projektkonsulting frÃ¥n produktbolaget

Om ni i framtiden vill hantera reglerade betalflÃ¶den djupare Ã¤n initiering och reconciliation ska det utredas separat innan ni bygger egen betalningslogik som kan utlÃ¶sa tillstÃ¥ndsplikt. Bygg i tidiga faser sÃ¥ att systemet initierar, skickar eller synkar med banker/partners i stÃ¤llet fÃ¶r att hÃ¥lla klientmedel.

### 5.2 KÃ¤rnteam
- Produktchef
- DomÃ¤nansvarig ekonomi/moms
- DomÃ¤nansvarig lÃ¶n/HR/pension
- DomÃ¤nansvarig bygg/projekt
- Staff engineer backend
- Staff engineer frontend
- Data/AI engineer
- DevOps/SRE
- UX lead fÃ¶r desktop-web
- UX lead fÃ¶r mobil fÃ¤ltstÃ¶d
- Customer success / pilot lead
- QA lead
- InformationssÃ¤kerhetsansvarig

## TjÃ¤nster, avtal och registreringar

FÃ¶ljande ska vara ordnat innan produkten gÃ¥r frÃ¥n intern utveckling till extern pilot.

### 4.1 Bolag och juridik
- [ ] Svenskt aktiebolag fÃ¶r produktverksamheten
- [ ] F-skatt
- [ ] Momsregistrering
- [ ] Arbetsgivarregistrering
- [ ] FÃ¶retagsbankkonto
- [ ] FÃ¶retagskort
- [ ] BokfÃ¶ringsrutin fÃ¶r det egna bolaget
- [ ] Dataskyddsdokumentation
- [ ] PersonuppgiftsbitrÃ¤desavtal-mallar
- [ ] Kundvillkor
- [ ] Integritetsmeddelande
- [ ] Incidentrutin
- [ ] Gallringsrutin
- [ ] InformationssÃ¤kerhetspolicy

### 4.2 Drift och utveckling
- [ ] GitHub organisation
- [ ] AWS-konto
- [ ] Cloudflare-konto
- [ ] DomÃ¤nnamn
- [ ] Sentry-konto
- [ ] PostHog-konto
- [ ] CI/CD secrets vault
- [ ] Container registry
- [ ] SMTP/utgÃ¥ende mejl
- [ ] Inbound mejl-tjÃ¤nst fÃ¶r fÃ¶retagsinboxar
- [ ] SMS/telefoni-leverantÃ¶r fÃ¶r 2FA/notiser
- [ ] Objektlagring med versionshantering
- [ ] BackupmÃ¥l i separat konto/region

### 4.3 Identitet och signering
- [ ] Test- och produktionsavtal fÃ¶r svensk e-legitimation/BankID-stÃ¶d
- [ ] SSO-leverantÃ¶r eller egen SAML/OIDC-stack
- [ ] SCIM-stÃ¶d eller plan fÃ¶r senare enterprise-stÃ¶d
- [ ] E-signeringstjÃ¤nst fÃ¶r offerter och avtal
- [ ] Intern signeringspolicy

### 4.4 Betalningar, bank och pengar
- [ ] Bankkopplingspartner eller direktbanksavtal
- [ ] Swish-avtal om Swish ska stÃ¶djas
- [ ] KortinlÃ¶sen/betallÃ¤nkspartner om kortbetalning ska stÃ¶djas
- [ ] OCR-/inbetalningsreferensupplÃ¤gg
- [ ] LeverantÃ¶rsutbetalningsstrategi
- [ ] Valutahanteringsstrategi

### 4.5 E-faktura och offentlig sektor
- [ ] Peppol-accesspunkt via partner eller egen strategi
- [ ] Peppol-ID-strategi
- [ ] Mottagarregistrering fÃ¶r inkommande Peppol
- [ ] Valideringspaket fÃ¶r Peppol BIS Billing 3
- [ ] StÃ¶d fÃ¶r kreditnota och negativa fakturor
- [ ] Process fÃ¶r buyer reference/order reference

### 4.6 Pension och lÃ¶n
- [ ] ArbetsgivartillgÃ¥ng till AGI-inlÃ¤mning
- [ ] Collectum-administration om ITP-kunder ska stÃ¶djas
- [ ] Fora-administration om SAF-LO-kunder ska stÃ¶djas
- [ ] PensionsleverantÃ¶rsflÃ¶den fÃ¶r kompletterande premier
- [ ] Rutiner fÃ¶r lÃ¶nevÃ¤xlingsavtal
- [ ] Intern policy fÃ¶r fÃ¶rmÃ¥ner, pension, friskvÃ¥rd, gÃ¥vor och resor

### 4.7 Bygg och projekt
- [ ] Process fÃ¶r personalliggare bygg
- [ ] ID06-strategi om det ska stÃ¶djas
- [ ] ROT/RUT-process
- [ ] KMA-dokumentstruktur
- [ ] Underlag fÃ¶r byggspecifika arbetsorder, Ã„TA och slutdokumentation

### 4.8 Myndighets- och leverantÃ¶rskanaler som ska planeras tidigt
- [ ] Skatteverket: moms, AGI, ROT/RUT
- [ ] Bolagsverket: digital Ã¥rsredovisning
- [ ] DIGG/SFTI-ekosystem: e-faktura/Peppol
- [ ] BFN-kompatibla bokfÃ¶rings- och arkiveringsrutiner
- [ ] Collectum/Fora fÃ¶r pensionsrapportering


## Rekommenderade tjÃ¤nster att registrera innan extern pilot

Det hÃ¤r Ã¤r en genomfÃ¶rbar startkombination fÃ¶r ett nytt bolag som bygger med Codex:

- **GitHub** fÃ¶r repo, issues, pull requests och Actions.
- **AWS** som primÃ¤r molnplattform.
  - region: `eu-north-1` som primÃ¤r
  - sekundÃ¤r backup/DR: `eu-central-1`
- **Cloudflare** fÃ¶r DNS, WAF, CDN och edge-skydd.
- **Sentry** fÃ¶r applikationsfel.
- **Grafana Cloud** fÃ¶r metrics, logs och traces.
- **PostHog EU** fÃ¶r produktanalys och feature flags.
- **Postmark** fÃ¶r utgÃ¥ende transaktionsmail.
- **Mailgun eller motsvarande inbound-email-tjÃ¤nst** fÃ¶r fÃ¶retagsinboxar och rÃ¥mejl med bilagor.
- **Open banking-partner** fÃ¶r bankdata och betalinitiering.
- **Peppol access point-partner** fÃ¶r inkommande och utgÃ¥ende Peppol.
- **BankID/eID-provider** fÃ¶r snabb start, med mÃ¶jlighet att senare gÃ¥ mot direktavtal.
- **AWS S3** fÃ¶r objektlagring.
- **AWS Secrets Manager** fÃ¶r hemligheter.
- **AWS RDS PostgreSQL** fÃ¶r databas.
- **AWS ElastiCache / Valkey-kompatibel cache** fÃ¶r kÃ¶er, lÃ¥s och cache.
- **AWS ECS Fargate** fÃ¶r deployment av API och workers.
- **AWS Backup** fÃ¶r backup-policy.
- **1Password eller motsvarande** som mÃ¤nskligt secrets-valv fÃ¶r teamet, separat frÃ¥n runtime-secrets.

## Konton och avtal som mÃ¥ste finnas innan skarpa pilotkunder

- Svenskt aktiebolag
- F-skatt
- Momsregistrering
- Arbetsgivarregistrering
- FÃ¶retagsbankkonto
- FÃ¶retagskort
- PersonuppgiftsbitrÃ¤desavtal-mallar
- Kundvillkor
- Integritetsmeddelande
- Incidentrutin
- InformationssÃ¤kerhetspolicy
- Arbetsgivaraccess fÃ¶r AGI
- Collectum-administration om ITP ska stÃ¶djas skarpt
- Fora-administration om SAF-LO ska stÃ¶djas skarpt
- HUS/ROT/RUT-process och intern ansvarsmatris
- Peppol-onboarding fÃ¶r produkten


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


## Datamodell och domÃ¤ner

MiniminivÃ¥ fÃ¶r datamodellen och kÃ¤rntabellerna finns i `docs/domain/ubiquitous-language.md` och i respektive domÃ¤ndokument. Den grundlÃ¤ggande riktningen Ã¤r:

- `companies`, `users`, `company_users`, `delegations`
- `accounts`, `voucher_series`, `journal_entries`, `journal_lines`, `accounting_periods`
- `documents`, `document_versions`, `document_links`, `email_ingest_messages`
- `customers`, `quotes`, `customer_invoices`, `ar_open_items`
- `suppliers`, `purchase_orders`, `supplier_invoices`, `ap_open_items`
- `employees`, `employments`, `time_entries`, `leave_entries`, `pay_runs`, `pay_run_lines`
- `benefit_events`, `travel_claims`, `mileage_logs`, `pension_events`
- `projects`, `project_budgets`, `work_orders`, `field_events`, `attendance_logs`
- `vat_decisions`, `agi_submissions`, `hus_claims`, `peppol_messages`, `annual_report_packages`

## IngenjÃ¶rsregler

### 7.1 Ledger-invarianten
FÃ¶ljande fÃ¥r aldrig brytas:
- varje bokfÃ¶ringspost ska tillhÃ¶ra ett bolag
- varje verifikation ska balansera
- varje rad ska vara spÃ¥rbar till kÃ¤lla eller manuellt skapad fÃ¶rklaring
- lÃ¥sta perioder fÃ¥r inte muteras
- rÃ¤ttelser ska ske genom korrigering eller ombokning, inte tyst Ã¶verskrivning
- rapporter ska kunna Ã¥terskapas fÃ¶r valfri historisk tidpunkt

### 7.2 Regelmotor-invarianten
- regler fÃ¥r inte ligga i UI
- regler fÃ¥r inte ligga i enskilda controllers
- regler ska ligga i regelpaket som har:
  - id
  - domÃ¤n
  - jurisdiktion
  - giltig_frÃ¥n
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
- allt versionsstÃ¤mplas
- hash sparas
- kÃ¤lla sparas
- mottagningstid sparas
- lÃ¤nkar till affÃ¤rsobjekt sparas
- gallringspolicy sparas

### 7.4 Ytstrategi-invarianten
- desktop-web ska vara en enda fullstandig desktop-yta for alla roller
- field-mobile ska vara en separat tumvanlig yta ovanpa samma backend och domanpaket
- mobil ska inte bÃ¤ra avancerad ekonomilogik i UI

### 7.5 Test-invarianten
Ingen delfas Ã¤r klar fÃ¶rrÃ¤n fÃ¶ljande finns:
- enhetstest
- kontraktstest
- golden-data-test om regelpÃ¥verkan finns
- E2E-test fÃ¶r anvÃ¤ndarflÃ¶de
- verifieringschecklista
- dokumenterad rollback-plan om produktion pÃ¥verkas

## Exakt byggordning i checkbox-format

- [x] **FAS 0 â€” Bootstrap, repo och dokumentgrund**
  - [x] 0.1 Monorepo och runtime-lÃ¥sning
  - [x] 0.2 CI, kvalitet och sÃ¤kerhetsbas
  - [x] 0.3 DomÃ¤nskelett och docskeleton
- [x] **FAS 1 â€” Identitet, organisation, auth och onboarding**
  - [x] 1.1 Organisation, roller och accesskontroll
  - [x] 1.2 Inloggning, sessioner och stark autentisering
  - [x] 1.3 Bolagssetup och onboarding wizard
- [x] **FAS 2 â€” Dokumentmotor, fÃ¶retagsinbox och OCR**
  - [x] 2.1 Dokumentarkiv och metadata
  - [x] 2.2 FÃ¶retagsinbox och mail ingestion
  - [x] 2.3 OCR, klassificering och granskningskÃ¶
- [x] **FAS 3 â€” Huvudbok, kontomodell, journaler och avstÃ¤mningsgrund**
  - [x] 3.1 Ledger-schema och verifikationsmotor
  - [x] 3.2 Dimensioner, perioder och bokfÃ¶ringsregler
  - [x] 3.3 AvstÃ¤mningscenter och rapportgrund
- [x] **FAS 4 â€” Momsmotor**
  - [x] 4.1 Momsmasterdata och beslutstrÃ¤d
  - [x] 4.2 Sverige, EU, import, export och omvÃ¤nd moms
  - [x] 4.3 OSS, IOSS, periodisk sammanstÃ¤llning och rapportering
- [x] **FAS 5 â€” FÃ¶rsÃ¤ljning, kundreskontra och kundfakturor**
  - [x] 5.1 Kundregister, artiklar, offerter och avtal
  - [x] 5.2 Kundfakturor och leveranskanaler
  - [x] 5.3 Kundreskontra, pÃ¥minnelser och inbetalningsmatchning
- [x] **FAS 6 â€” LeverantÃ¶rsfakturor, inkÃ¶p, bank och betalningar**
  - [x] 6.1 LeverantÃ¶rsregister, PO och mottagning
  - [x] 6.2 LeverantÃ¶rsfaktura in, tolkning och matchning
  - [x] 6.3 Attest, bankintegration och utbetalning
- [ ] **FAS 7 â€” Tidportal, HR-bas och anstÃ¤lldportal**
  - [x] 7.1 AnstÃ¤lldregister och HR-master
  - [ ] 7.2 Tidrapportering, schema och saldon
  - [ ] 7.3 FrÃ¥nvaro, attest och anstÃ¤lldportal
- [ ] **FAS 8 â€” LÃ¶n och AGI**
  - [ ] 8.1 LÃ¶nearter, lÃ¶nekalender och lÃ¶nekÃ¶rning
  - [ ] 8.2 Skatt, arbetsgivaravgifter, SINK och AGI
  - [ ] 8.3 LÃ¶nebokfÃ¶ring och utbetalning
- [ ] **FAS 9 â€” FÃ¶rmÃ¥ner, resor, traktamente, pension och lÃ¶nevÃ¤xling**
  - [ ] 9.1 FÃ¶rmÃ¥nsmotor
  - [ ] 9.2 Resor, traktamente, kÃ¶rjournal och utlÃ¤gg
  - [ ] 9.3 Pension, extra pension och lÃ¶nevÃ¤xling
- [ ] **FAS 10 â€” Projekt, bygg, fÃ¤lt, lager och personalliggare**
  - [ ] 10.1 Projekt, budget och uppfÃ¶ljning
  - [ ] 10.2 Arbetsorder, serviceorder, fÃ¤ltapp och lager
  - [ ] 10.3 Byggspecifika regler: Ã„TA, HUS, omvÃ¤nd moms, personalliggare
- [ ] **FAS 11 â€” Rapporter, byrÃ¥lÃ¤ge, mÃ¥nadsstÃ¤ngning och bokslut**
  - [ ] 11.1 Rapporter och drilldown
  - [ ] 11.2 ByrÃ¥lÃ¤ge och portfÃ¶ljhantering
  - [ ] 11.3 MÃ¥nadsstÃ¤ngning och bokslutschecklistor
- [ ] **FAS 12 â€” Ã…rsredovisning, deklaration och myndighetskopplingar**
  - [ ] 12.1 Ã…rsredovisningsmotor
  - [ ] 12.2 Skatt, deklarationsunderlag och myndighetsfiler
- [ ] **FAS 13 â€” API, integrationer, AI och automation**
  - [ ] 13.1 Publikt API och webhooks
  - [ ] 13.2 Partnerintegrationer och marknadsplats
  - [ ] 13.3 AI, automation och no-code-regler
- [ ] **FAS 14 â€” HÃ¤rdning, pilot, prestanda, sÃ¤kerhet och go-live**
  - [ ] 14.1 SÃ¤kerhet och behÃ¶righetsgranskning
  - [ ] 14.2 Prestanda, Ã¥terlÃ¤sning och chaos-test
  - [ ] 14.3 Pilotkunder, datamigrering och go-live-ritual

## Faser och delfaser

## FAS 0 â€” Bootstrap, repo och dokumentgrund

LÃ¥s verktyg, repo, dokumentstruktur, CI och lokala miljÃ¶er innan nÃ¥gon affÃ¤rslogik skrivs.

### 0.1 Monorepo och runtime-lÃ¥sning

**Bygg detta**
- [x] Monorepo med apps, packages, infra, docs
- [x] LÃ¥sta runtimes och lokala dev-verktyg
- [x] Docker Compose fÃ¶r lokala beroenden

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Ren maskin kan bootstrapa projektet
- [x] Versioner matchar ADR-0001
- [x] Health checks svarar grÃ¶nt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P0-01`.

### 0.2 CI, kvalitet och sÃ¤kerhetsbas

**Bygg detta**
- [x] GitHub Actions
- [x] Lint, typecheck, test och security checks
- [x] Branch protection och CODEOWNERS

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Trasig PR blockeras
- [x] Secrets och sÃ¥rbarheter fÃ¥ngas
- [x] CI Ã¤r deterministisk

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P0-02`.

### 0.3 DomÃ¤nskelett och docskeleton

**Bygg detta**
- [x] Package placeholders fÃ¶r alla domÃ¤ner
- [x] ADR-bibliotek
- [x] Ubiquitous language

**Verifiera detta innan nÃ¤sta delfas**
- [x] Inga cirkulÃ¤ra beroenden
- [x] Alla domÃ¤ner har README
- [x] Alla obligatoriska dokument finns

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P0-03`.

## FAS 1 â€” Identitet, organisation, auth och onboarding

GÃ¶r det mÃ¶jligt att skapa bolag, anvÃ¤ndare, roller, attester och sÃ¤kra sessioner.

### 1.1 Organisation, roller och accesskontroll

**Bygg detta**
- [x] Bolagsmodell
- [x] AnvÃ¤ndarmodell
- [x] RBAC + objektbaserad Ã¥tkomst
- [x] Delegation och attestkedjor

**Verifiera detta innan nÃ¤sta delfas**
- [x] Bolag kan inte se varandras data
- [x] Delegation respekterar datum och scope
- [x] Servern blockerar otillÃ¥tna actions

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P1-01`.

### 1.2 Inloggning, sessioner och stark autentisering

**Bygg detta**
- [x] Login/logout
- [x] MFA
- [x] Passkeys/TOTP
- [x] BankID-provider-abstraktion

**Verifiera detta innan nÃ¤sta delfas**
- [x] Sessioner kan Ã¥terkallas
- [x] MFA krÃ¤vs fÃ¶r admins
- [x] Audit log skapas fÃ¶r autentisering

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P1-02`.

### 1.3 Bolagssetup och onboarding wizard

**Bygg detta**
- [x] Skapa bolag
- [x] Registreringar och instÃ¤llningar
- [x] Kontoplan-, moms- och periodsetup

**Verifiera detta innan nÃ¤sta delfas**
- [x] Onboarding skapar komplett bolagskonfiguration
- [x] Checklista visar saknade steg
- [x] Setup kan Ã¥terupptas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P1-03`.

## FAS 2 â€” Dokumentmotor, fÃ¶retagsinbox och OCR

Bygg beviskedjan fÃ¶r hela systemet: dokument, rÃ¥mejl, bilagor, hashning, klassning och granskningskÃ¶.

### 2.1 Dokumentarkiv och metadata

**Bygg detta**
- [x] Immutable storage
- [x] Dokumentversioner
- [x] Document-links
- [x] Hash- och statusmodell

**Verifiera detta innan nÃ¤sta delfas**
- [x] Original och derivat skiljs Ã¥t
- [x] Export av dokumentkedja fungerar
- [x] Duplikat upptÃ¤cks

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P2-01`.

### 2.2 FÃ¶retagsinbox och mail ingestion

**Bygg detta**
- [x] Per-bolag-inbox
- [x] Ingest av rÃ¥tt mejl och bilagor
- [x] Routing till dokumentkÃ¶

**Verifiera detta innan nÃ¤sta delfas**
- [x] Flera bilagor hanteras korrekt
- [x] Message-ids dedupliceras
- [x] Felaktiga bilagor flaggas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P2-02`.

### 2.3 OCR, klassificering och granskningskÃ¶

**Bygg detta**
- [x] OCR pipeline
- [x] Klassificering av dokumenttyp
- [x] GranskningskÃ¶ med confidence

**Verifiera detta innan nÃ¤sta delfas**
- [x] Fakturor, kvitton och avtal sÃ¤rskiljs
- [x] MÃ¤nniskan kan korrigera tolkningen
- [x] OmkÃ¶rning sparar ny derivatversion

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P2-03`.

## FAS 3 â€” Huvudbok, kontomodell, journaler och avstÃ¤mningsgrund

Skapa ledgern som alla andra domÃ¤ner mÃ¥ste skriva genom.

### 3.1 Ledger-schema och verifikationsmotor

**Bygg detta**
- [x] Konton
- [x] Verifikationsserier
- [x] Journal entries och lines
- [x] Balanskontroller

**Verifiera detta innan nÃ¤sta delfas**
- [x] Debet = kredit i alla tester
- [x] Verifikationsnummer Ã¤r deterministiska
- [x] Import markerar kÃ¤lltyp

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P3-01`.

### 3.2 Dimensioner, perioder och bokfÃ¶ringsregler

**Bygg detta**
- [x] Projekt/kostnadsstÃ¤lle/affÃ¤rsomrÃ¥de
- [x] PeriodlÃ¥sning
- [x] Reversal och korrigering

**Verifiera detta innan nÃ¤sta delfas**
- [x] LÃ¥sta perioder gÃ¥r inte att mutera
- [x] RÃ¤ttelser skapar ny verifikation
- [x] Obligatoriska dimensioner valideras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P3-02`.

### 3.3 AvstÃ¤mningscenter och rapportgrund

**Bygg detta**
- [x] Trial balance
- [x] VerifikationssÃ¶k
- [x] AvstÃ¤mningsobjekt
- [x] Basrapporter

**Verifiera detta innan nÃ¤sta delfas**
- [x] Rapporter kan Ã¥terskapas historiskt
- [x] Drilldown fungerar till kÃ¤lldokument
- [x] AvstÃ¤mning sparar sign-off

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P3-03`.

## FAS 4 â€” Momsmotor

Bygg ett explicit beslutstrÃ¤d fÃ¶r svensk moms, EU, import, export, reverse charge och rapportering.

### 4.1 Momsmasterdata och beslutstrÃ¤d

**Bygg detta**
- [x] VAT codes
- [x] decision objects
- [x] regelpaket per datum

**Verifiera detta innan nÃ¤sta delfas**
- [x] Alla transaktionstyper fÃ¥r ett spÃ¥rbart momsbeslut
- [x] Historiska regler kan Ã¥terspelas
- [x] Oklara fall gÃ¥r till granskningskÃ¶

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P4-01`.

### 4.2 Sverige, EU, import, export och omvÃ¤nd moms

**Bygg detta**
- [x] Sverige 25/12/6/0
- [x] EU B2B/B2C
- [x] Import/export
- [x] bygg-omvÃ¤nd moms

**Verifiera detta innan nÃ¤sta delfas**
- [x] Deklarationsboxar summerar rÃ¤tt
- [x] Kreditnota spegelvÃ¤nder moms korrekt
- [x] Importmoms och reverse charge dubbelbokas rÃ¤tt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P4-02`.

### 4.3 OSS, IOSS, periodisk sammanstÃ¤llning och rapportering

**Bygg detta**
- [x] OSS/IOSS classification
- [x] Periodisk sammanstÃ¤llning
- [x] Momsdeklarationsunderlag

**Verifiera detta innan nÃ¤sta delfas**
- [x] B2C-distansfÃ¶rsÃ¤ljning landas rÃ¤tt
- [x] EU-lista kan skapas om och om igen
- [x] Momsrapport stÃ¤mmer mot ledgern

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P4-03`.

## FAS 5 â€” FÃ¶rsÃ¤ljning, kundreskontra och kundfakturor

Ta kunden frÃ¥n offert eller order till bokfÃ¶rd faktura och inbetalning.

### 5.1 Kundregister, artiklar, offerter och avtal

**Bygg detta**
- [x] Kundregister
- [x] Kontaktpersoner
- [x] Artiklar och prislistor
- [x] Offert/avtal

**Verifiera detta innan nÃ¤sta delfas**
- [x] Offerter versionshanteras
- [x] Avtal genererar korrekt fakturaplan
- [x] Kunddata kan importeras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P5-01`.

### 5.2 Kundfakturor och leveranskanaler

**Bygg detta**
- [x] Standard/kredit/del/abonnemangsfakturor
- [x] PDF/e-faktura/Peppol
- [x] BetallÃ¤nkar

**Verifiera detta innan nÃ¤sta delfas**
- [x] Faktura bokfÃ¶rs bara en gÃ¥ng
- [x] Kreditfaktura stÃ¤nger rÃ¤tt poster
- [x] Peppol-export validerar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P5-02`.

### 5.3 Kundreskontra, pÃ¥minnelser och inbetalningsmatchning

**Bygg detta**
- [x] Ã–ppna poster
- [x] PÃ¥minnelseflÃ¶de
- [x] Matchning mot bank

**Verifiera detta innan nÃ¤sta delfas**
- [x] Delbetalningar hanteras
- [x] Felmatchningar kan backas
- [x] Ã…ldersanalys Ã¤r korrekt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P5-03`.

## FAS 6 â€” LeverantÃ¶rsfakturor, inkÃ¶p, bank och betalningar

Bygg AP-motorn, attestkedjor, betalningsfÃ¶rslag och bankavstÃ¤mning.

### 6.1 LeverantÃ¶rsregister, PO och mottagning

**Bygg detta**
- [x] LeverantÃ¶rsregister
- [x] PO
- [x] Mottagningsobjekt
- [x] Pris- och konto-defaults

**Verifiera detta innan nÃ¤sta delfas**
- [x] LeverantÃ¶rer och PO kan importeras
- [x] Mottagning kopplar till faktura
- [x] Dubblettskydd finns

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P6-01`.

### 6.2 LeverantÃ¶rsfaktura in, tolkning och matchning

**Bygg detta**
- [x] AP-ingest
- [x] OCR/radnivÃ¥
- [x] 2-vÃ¤gs- och 3-vÃ¤gsmatchning

**Verifiera detta innan nÃ¤sta delfas**
- [x] Flera kostnadsrader bokas rÃ¤tt
- [x] MomsfÃ¶rslag kan fÃ¶rklaras
- [x] Avvikelser krÃ¤ver granskning

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P6-02`.

### 6.3 Attest, bankintegration och utbetalning

**Bygg detta**
- [x] Flerstegsattest
- [x] BetalningsfÃ¶rslag
- [x] Bankreturer och avprickning

**Verifiera detta innan nÃ¤sta delfas**
- [x] ObehÃ¶riga kan inte betala
- [x] Utbetalningar bokfÃ¶rs korrekt
- [x] Returer kan Ã¥terimporteras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P6-03`.

## FAS 7 â€” Tidportal, HR-bas och anstÃ¤lldportal

Skapa masterdata fÃ¶r anstÃ¤llda och samla tid, frÃ¥nvaro, saldon och attestering innan lÃ¶n byggs.

### 7.1 AnstÃ¤lldregister och HR-master

**Bygg detta**
- [x] AnstÃ¤llningar
- [x] avtal och chefstrÃ¤d
- [x] bankkonton och dokument

**Verifiera detta innan nÃ¤sta delfas**
- [x] Samma person kan ha flera anstÃ¤llningar
- [x] AnstÃ¤llningshistorik bevaras
- [x] KÃ¤nsliga fÃ¤lt loggas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P7-01`.

### 7.2 Tidrapportering, schema och saldon

**Bygg detta**
- [ ] In/utstÃ¤mpling
- [ ] Schema/OB/jour/beredskap
- [ ] Flex, komp, Ã¶vertid

**Verifiera detta innan nÃ¤sta delfas**
- [ ] LÃ¥sning av period fungerar
- [ ] Tid kan kopplas till projekt och aktivitet
- [ ] BerÃ¤kning av saldon Ã¤r reproducerbar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P7-02`.

### 7.3 FrÃ¥nvaro, attest och anstÃ¤lldportal

**Bygg detta**
- [ ] FrÃ¥nvarotyper
- [ ] ChefsgodkÃ¤nnande
- [ ] AnstÃ¤lldportal

**Verifiera detta innan nÃ¤sta delfas**
- [ ] FrÃ¥nvaro kan inte Ã¤ndras efter AGI-signering
- [ ] Historik visas fÃ¶r anstÃ¤lld och admin
- [ ] Uppgifter fÃ¶r frÃ¥nvarosignaler Ã¤r kompletta

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P7-03`.

## FAS 8 â€” LÃ¶n och AGI

Omvandla tid, frÃ¥nvaro, fÃ¶rmÃ¥ner och avtal till korrekt lÃ¶n, utbetalning, bokfÃ¶ring och AGI.

### 8.1 LÃ¶nearter, lÃ¶nekalender och lÃ¶nekÃ¶rning

**Bygg detta**
- [ ] LÃ¶nearter
- [ ] LÃ¶nekÃ¶rning
- [ ] Retro och korrigering
- [ ] SlutlÃ¶n

**Verifiera detta innan nÃ¤sta delfas**
- [ ] LÃ¶nekedjan fÃ¶ljer definierad ordning
- [ ] Retrofall Ã¤r spÃ¥rbara
- [ ] LÃ¶nebesked kan regenereras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P8-01`.

### 8.2 Skatt, arbetsgivaravgifter, SINK och AGI

**Bygg detta**
- [ ] Skattelogik
- [ ] avgiftsregler
- [ ] SINK
- [ ] AGI-underlag och submission

**Verifiera detta innan nÃ¤sta delfas**
- [ ] AGI innehÃ¥ller rÃ¤tt fÃ¤lt per individ
- [ ] FrÃ¥nvarouppgifter lÃ¥ses i tid
- [ ] RÃ¤ttelseversioner kan skapas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P8-02`.

### 8.3 LÃ¶nebokfÃ¶ring och utbetalning

**Bygg detta**
- [ ] LÃ¶neverifikationer
- [ ] Bankbetalningsunderlag
- [ ] KostnadsfÃ¶rdelning

**Verifiera detta innan nÃ¤sta delfas**
- [ ] BokfÃ¶ring per projekt/kostnadsstÃ¤lle fungerar
- [ ] Utbetalningar matchas mot bank
- [ ] Semesterskuld kan Ã¥terskapas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P8-03`.

## FAS 9 â€” FÃ¶rmÃ¥ner, resor, traktamente, pension och lÃ¶nevÃ¤xling

Bygg de mest regelstyrda HR-ekonomiflÃ¶dena ovanpÃ¥ stabil lÃ¶nekÃ¤rna.

### 9.1 FÃ¶rmÃ¥nsmotor

**Bygg detta**
- [ ] FÃ¶rmÃ¥nskatalog
- [ ] Skattepliktig/skattefri logik
- [ ] Bil, drivmedel, friskvÃ¥rd, gÃ¥vor, kost, sjukvÃ¥rd

**Verifiera detta innan nÃ¤sta delfas**
- [ ] FÃ¶rmÃ¥ner med och utan kontant lÃ¶n hanteras
- [ ] BilfÃ¶rmÃ¥n start/stopp per mÃ¥nad fungerar
- [ ] AGI-mappning och bokfÃ¶ring Ã¤r korrekt

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P9-01`.

### 9.2 Resor, traktamente, kÃ¶rjournal och utlÃ¤gg

**Bygg detta**
- [ ] TjÃ¤nsteresa som objekt
- [ ] Inrikes/utlandstraktamente
- [ ] BilersÃ¤ttning
- [ ] KÃ¶rjournal

**Verifiera detta innan nÃ¤sta delfas**
- [ ] 50 km-krav och Ã¶vernattning styr korrekt
- [ ] MÃ¥ltidsreduktion minskar rÃ¤tt
- [ ] Ã–verskjutande del blir lÃ¶n

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P9-02`.

### 9.3 Pension, extra pension och lÃ¶nevÃ¤xling

**Bygg detta**
- [ ] ITP/Fora-stÃ¶d
- [ ] Extra pension
- [ ] LÃ¶nevÃ¤xling
- [ ] Pensionsrapportering

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Rapportunderlag per kollektivavtal stÃ¤mmer
- [ ] LÃ¶nevÃ¤xling varnar under trÃ¶skel
- [ ] Pension bokfÃ¶rs och avstÃ¤ms

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P9-03`.

## FAS 10 â€” Projekt, bygg, fÃ¤lt, lager och personalliggare

Ta systemet ut pÃ¥ arbetsplatsen med arbetsorder, material, Ã„TA, HUS, byggmoms och personalliggare.

### 10.1 Projekt, budget och uppfÃ¶ljning

**Bygg detta**
- [ ] Projektbudget
- [ ] WIP
- [ ] projektmarginal
- [ ] resursbelÃ¤ggning

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Projektkostnad inkluderar lÃ¶n, fÃ¶rmÃ¥ner, pension och resor
- [ ] WIP kan stÃ¤mmas av mot fakturering
- [ ] Forecast at completion fungerar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P10-01`.

### 10.2 Arbetsorder, serviceorder, fÃ¤ltapp och lager

**Bygg detta**
- [ ] Dispatch
- [ ] fÃ¤ltmobil
- [ ] material och lager
- [ ] kundsignatur

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Offline-sync tÃ¥l nÃ¤tavbrott
- [ ] Materialuttag gÃ¥r till projekt
- [ ] Arbetsorder kan faktureras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P10-02`.

### 10.3 Byggspecifika regler: Ã„TA, HUS, omvÃ¤nd moms, personalliggare

**Bygg detta**
- [ ] Ã„TA
- [ ] ROT/RUT/HUS
- [ ] byggmoms
- [ ] personalliggare

**Verifiera detta innan nÃ¤sta delfas**
- [ ] HUS-kundandel och ansÃ¶kan stÃ¤mmer
- [ ] Byggmoms triggas korrekt
- [ ] Personalliggare exporterar kontrollbar kedja

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P10-03`.

## FAS 11 â€” Rapporter, byrÃ¥lÃ¤ge, mÃ¥nadsstÃ¤ngning och bokslut

GÃ¶r systemet anvÃ¤ndbart fÃ¶r byrÃ¥er, controllers och periodstÃ¤ngning.

### 11.1 Rapporter och drilldown

**Bygg detta**
- [ ] P&L, balans, cashflow, reskontra, projekt
- [ ] drilldown
- [ ] rapportbyggare light

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Rapporter Ã¤r historiskt reproducerbara
- [ ] Belopp kan spÃ¥ras till kÃ¤lldokument
- [ ] Export till Excel/PDF fungerar

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P11-01`.

### 11.2 ByrÃ¥lÃ¤ge och portfÃ¶ljhantering

**Bygg detta**
- [ ] ByrÃ¥portfÃ¶lj
- [ ] deadlines
- [ ] klientstatus
- [ ] massÃ¥tgÃ¤rder

**Verifiera detta innan nÃ¤sta delfas**
- [ ] ByrÃ¥n ser bara klienter i scope
- [ ] Deadlines hÃ¤rleds frÃ¥n bolagsinstÃ¤llningar
- [ ] Klientdokument kan begÃ¤ras och spÃ¥ras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P11-02`.

### 11.3 MÃ¥nadsstÃ¤ngning och bokslutschecklistor

**Bygg detta**
- [ ] Close workbench
- [ ] avstÃ¤mningslistor
- [ ] sign-off

**Verifiera detta innan nÃ¤sta delfas**
- [ ] MÃ¥nad kan stÃ¤ngas med komplett checklista
- [ ] Ã–ppna avvikelser blockerar sign-off dÃ¤r policy krÃ¤ver
- [ ] Ã…terskapad period ger samma rapport

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P11-03`.

## FAS 12 â€” Ã…rsredovisning, deklaration och myndighetskopplingar

Bygg Ã¥rsflÃ¶den, digital inlÃ¤mning och deklarationsunderlag ovanpÃ¥ stÃ¤ngda perioder.

### 12.1 Ã…rsredovisningsmotor

**Bygg detta**
- [ ] K2/K3-spÃ¥r
- [ ] Ã¥rsredovisningspaket
- [ ] versioner och signeringsunderlag

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Ã…rspaket lÃ¥ser underlag
- [ ] Signaturkedja spÃ¥ras
- [ ] RÃ¤ttelse skapar ny version

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P12-01`.

### 12.2 Skatt, deklarationsunderlag och myndighetsfiler

**Bygg detta**
- [ ] INK/NE/SRU-underlag
- [ ] moms/AGI/HUS-Ã¶versikter
- [ ] myndighetsadapterlager

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Filer matchar interna siffror
- [ ] Submission loggas med kvittens
- [ ] Fel gÃ¥r till Ã¥tgÃ¤rdskÃ¶

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P12-02`.

## FAS 13 â€” API, integrationer, AI och automation

Ã–ppna kÃ¤rnan mot omvÃ¤rlden fÃ¶rst nÃ¤r domÃ¤nerna Ã¤r stabila.

### 13.1 Publikt API och webhooks

**Bygg detta**
- [ ] API-spec
- [ ] OAuth/scopes
- [ ] webhooks
- [ ] sandbox

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Scopes begrÃ¤nsar rÃ¤tt data
- [ ] Webhook events Ã¤r idempotenta
- [ ] Backward compatibility bevakas

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P13-01`.

### 13.2 Partnerintegrationer och marknadsplats

**Bygg detta**
- [ ] Bank
- [ ] Peppol
- [ ] pension
- [ ] CRM/e-handel/ID06

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Varje adapter har kontraktstest
- [ ] Fallback finns vid extern driftstÃ¶rning
- [ ] Rate limits respekteras

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P13-02`.

### 13.3 AI, automation och no-code-regler

**Bygg detta**
- [ ] KonteringsfÃ¶rslag
- [ ] klassificering
- [ ] anomalidetektion
- [ ] regelbyggare

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Alla AI-beslut har confidence och fÃ¶rklaring
- [ ] Human-in-the-loop kan Ã¶verstyra
- [ ] Felaktiga AI-fÃ¶rslag pÃ¥verkar inte ledger utan granskning

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P13-03`.

## FAS 14 â€” HÃ¤rdning, pilot, prestanda, sÃ¤kerhet och go-live

Stresstesta systemet, kÃ¶r verklig migrering och gÃ¥ live kontrollerat.

### 14.1 SÃ¤kerhet och behÃ¶righetsgranskning

**Bygg detta**
- [ ] PentestÃ¥tgÃ¤rder
- [ ] behÃ¶righetsgranskning
- [ ] SoD-kontroller

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Kritiska findings Ã¤r Ã¥tgÃ¤rdade
- [ ] Admin-spÃ¥r granskas
- [ ] Secrets-hantering Ã¤r verifierad

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P14-01`.

### 14.2 Prestanda, Ã¥terlÃ¤sning och chaos-test

**Bygg detta**
- [ ] Load profiler
- [ ] backup/restore-prover
- [ ] chaos-scenarier

**Verifiera detta innan nÃ¤sta delfas**
- [ ] Systemet klarar mÃ¥llast
- [ ] RTO/RPO uppfylls
- [ ] KÃ¶er Ã¥terhÃ¤mtar sig efter fel

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P14-02`.

### 14.3 Pilotkunder, datamigrering och go-live-ritual

**Bygg detta**
- [ ] Pilotplan
- [ ] migreringschecklistor
- [ ] go-live och rollback-plan

**Verifiera detta innan nÃ¤sta delfas**
- [ ] ParallellkÃ¶rning stÃ¤mmer
- [ ] Kunddata migreras utan differenser
- [ ] Support-runbook Ã¤r bemannad

**Codex-prompt**: se `docs/prompts/CODEX_PROMPT_LIBRARY.md` â†’ `P14-03`.


## DomÃ¤ndokument per fas

- FAS 2 â†’ `docs/compliance/se/document-inbox-and-ocr-engine.md`, `docs/adr/ADR-0011-document-ingestion-and-ocr-strategy.md`, `docs/runbooks/fas-2-document-archive-verification.md`, `docs/runbooks/fas-2-company-inbox-verification.md`, `docs/runbooks/ocr-malware-scanning-operations.md` och `docs/runbooks/fas-2-ocr-review-verification.md`
- FAS 3 â†’ `docs/compliance/se/accounting-foundation.md`
- FAS 4 â†’ `docs/compliance/se/vat-engine.md`
- FAS 5 â†’ `docs/compliance/se/ar-customer-invoicing-engine.md` och `docs/compliance/se/einvoice-peppol-engine.md`
- FAS 6 â†’ `docs/compliance/se/ap-supplier-invoice-engine.md`, `docs/compliance/se/document-inbox-and-ocr-engine.md`, `docs/compliance/se/accounting-foundation.md`, `docs/compliance/se/bank-and-payments-engine.md`, `docs/compliance/se/einvoice-peppol-engine.md`, `docs/runbooks/fas-6-ap-masterdata-verification.md`, `docs/runbooks/fas-6-ap-invoice-matching-verification.md` och `docs/runbooks/fas-6-ap-payments-verification.md`
- FAS 7 â†’ `docs/compliance/se/payroll-engine.md`, `docs/domain/ubiquitous-language.md` och `docs/runbooks/fas-7-hr-master-verification.md`
- FAS 8 â†’ `docs/compliance/se/payroll-engine.md` och `docs/compliance/se/agi-engine.md`
- FAS 9 â†’ `docs/compliance/se/benefits-engine.md`, `docs/compliance/se/travel-and-traktamente-engine.md`, `docs/compliance/se/pension-and-salary-exchange-engine.md`, `docs/compliance/se/cash-card-and-clearing-engine.md` och `docs/compliance/se/collections-writeoff-and-bad-debt-engine.md`
- FAS 10 â†’ `docs/compliance/se/rot-rut-engine.md`, `docs/compliance/se/personalliggare-engine.md`, `docs/compliance/se/project-billing-and-revenue-recognition-engine.md` och `docs/domain/offline-sync-and-conflict-resolution.md`
- FAS 11 â†’ `docs/compliance/se/reconciliation-and-close-engine.md`, `docs/domain/work-items-deadlines-notifications.md`, `docs/domain/search-indexing-and-global-search.md`, `docs/domain/saved-views-dashboards-and-personalization.md`, `docs/domain/bureau-portfolio-client-requests-and-approvals.md`, `docs/domain/close-checklists-blockers-and-signoff.md`, `docs/domain/reporting-metric-catalog-and-export-jobs.md` och `docs/domain/comments-mentions-and-collaboration.md`
- FAS 12 â†’ `docs/compliance/se/annual-reporting-engine.md` och `docs/domain/submission-receipts-and-action-queue.md`
- FAS 13 â†’ `docs/domain/async-jobs-retry-replay-and-dead-letter.md`
- FAS 14 â†’ `docs/domain/audit-review-support-and-admin-backoffice.md` och `docs/domain/migration-cockpit-parallel-run-and-cutover.md`

## TvÃ¤rgÃ¥ende ADR:er, policies, runbooks och testplaner

- Search, index och global search styrs av `docs/adr/ADR-0013-search-and-indexing-strategy.md`, `docs/runbooks/search-index-rebuild-and-repair.md` och `docs/test-plans/search-relevance-and-permission-trimming-tests.md`.
- Work items, deadlines och notifieringar styrs av `docs/adr/ADR-0014-work-items-deadlines-and-notifications-strategy.md`.
- Async jobs, retry/replay och dead-letter styrs av `docs/adr/ADR-0015-async-jobs-queues-and-replay-strategy.md`, `docs/runbooks/async-job-retry-replay-and-dead-letter.md` och `docs/test-plans/queue-resilience-and-replay-tests.md`.
- Feature flags och nÃ¶dbrytare styrs av `docs/adr/ADR-0016-feature-flags-rollout-and-kill-switch-strategy.md`, `docs/policies/feature-flag-and-emergency-disable-policy.md`, `docs/runbooks/feature-flag-rollout-and-emergency-disable.md` och `docs/test-plans/feature-flag-rollback-and-disable-tests.md`.
- Submissions, receipts och action queue styrs av `docs/adr/ADR-0017-submission-receipt-and-action-queue-strategy.md` och `docs/runbooks/submission-operations-and-retry.md`.
- Offline sync och konfliktlÃ¶sning styrs av `docs/adr/ADR-0018-offline-sync-and-conflict-resolution-strategy.md`, `docs/runbooks/mobile-offline-conflict-repair.md` och `docs/test-plans/mobile-offline-sync-tests.md`.
- Rapportering, metric governance och exportjobb styrs av `docs/adr/ADR-0019-reporting-exports-and-metric-governance-strategy.md` och `docs/test-plans/report-reproducibility-and-export-integrity-tests.md`.
- Migrering, parallellkÃ¶rning och cutover styrs av `docs/adr/ADR-0020-migration-parallel-run-and-cutover-strategy.md`, `docs/runbooks/pilot-migration-and-cutover.md` och `docs/test-plans/migration-parallel-run-diff-tests.md`.
- Audit review, support och backoffice styrs av `docs/adr/ADR-0021-audit-review-support-and-backoffice-strategy.md`, `docs/policies/support-access-and-impersonation-policy.md`, `docs/runbooks/support-backoffice-and-audit-review.md` och `docs/test-plans/audit-review-and-sod-tests.md`.
- KlientgodkÃ¤nnanden, deadlines och eskalering styrs Ã¤ven av `docs/policies/client-approval-deadline-and-escalation-policy.md`.

## Verifieringsgrindar

Fasvisa exit-gates finns i `docs/test-plans/master-verification-gates.md`. Ingen fas fÃ¥r anses klar fÃ¶rrÃ¤n dess gate Ã¤r grÃ¶n.

## UI och design

UI byggs inte som en separat fÃ¶rsta fas. Vi bygger fÃ¶rst kÃ¤rnlogik och tunna operatorskal. NÃ¤r kÃ¤rnflÃ¶dena bÃ¤r byggs full enterprise-UI enligt `docs/ui/ENTERPRISE_UI_PLAN.md`.

## Ã…rligt regelunderhÃ¥ll

Varje Ã¥r ska minst fÃ¶ljande regelpaket gÃ¥s igenom och versionsbumpas:

- arbetsgivaravgifter
- SINK
- traktamente och utlandstraktamenten
- milersÃ¤ttning
- kostfÃ¶rmÃ¥n
- gÃ¥vobelopp
- HUS/ROT/RUT-nivÃ¥er
- personalliggare- och branschkrav
- momsregler vid Ã¤ndringar
- Ã¥rsredovisnings- och deklarationsformat

Ett regelpaket fÃ¥r inte aktiveras utan:
- golden tests
- migrationsanteckning
- regressionskÃ¶rning mot fÃ¶regÃ¥ende Ã¥rs data
- uppdaterad dokumentation i compliance-motorn

## Slutord

Bygg aldrig â€œen app med bokfÃ¶ringâ€. Bygg ett system dÃ¤r arbete, dokument, pengar och rapportering Ã¤r samma kedja.


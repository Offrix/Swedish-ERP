> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0030
- Title: Legal Form and Annual Filing Architecture
- Status: Accepted
- Owner: Finance compliance architecture
- Version: 1.1.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-build-sequence.md`
  - `docs/master-control/master-golden-scenario-catalog.md`
- Related domains:
  - legal form
  - annual reporting
  - reporting
  - fiscal year
  - close
- Related code areas:
  - `packages/domain-legal-form/*`
  - `packages/domain-annual-reporting/*`
  - `packages/domain-reporting/*`
  - `packages/domain-fiscal-year/*`
- Related future documents:
  - `docs/compliance/se/legal-form-and-declaration-engine.md`
  - `docs/compliance/se/annual-reporting-engine.md`
  - `docs/runbooks/annual-close-and-filing-by-legal-form.md`
  - `docs/test-plans/annual-reporting-by-legal-form-tests.md`

# Purpose

Låsa att företagsform, deklarationsprofil och årsfiling måste modelleras som egen kärnarkitektur ovanpå stabil ledger-, period- och close-kärna, inte som generisk slutstegslogik.

# Status

Accepted.

# Context

Repo:t har redan close-, reporting- och annual-reporting-spår men saknar full explicit företagsformsmotor för:

- aktiebolag
- enskild näringsverksamhet
- handelsbolag
- kommanditbolag
- ekonomisk förening

De formerna skiljer sig materiellt i:

- vilken årsboksluts- eller årsredovisningsprofil som gäller
- vilken deklarationsfamilj som ska skapas
- vem som får eller måste signera
- om Bolagsverket-filing, skattedeklaration eller båda krävs
- hur räkenskapsår och filingfönster ska tolkas

# Problem

Om annual reporting byggs som en generell paketmotor utan företagsform uppstår:

- fel formkrav
- fel deklarationspaket
- fel signerings- och filingflöde
- fel close gates
- fel bedömning av om Bolagsverket-filing, Inkomstdeklaration 2, Inkomstdeklaration 4 eller NE-baserat årsslut ska produceras

# Decision

1. `legal-form` ska vara eget bounded context.
2. `annual-reporting` ska konsumera legal-form decisions, aldrig gissa dem från tenant setup eller UI-val.
3. Varje company ska ha historiskt låsta legal-form snapshots med effective dating.
4. Filing profile ska härledas från legal form, fiscal year, reporting obligation profile och rulepack-version.
5. AB och ekonomisk förening ska behandlas som egna filingfamiljer med årsredovisnings- och Inkomstdeklaration 2-profil.
6. Handelsbolag och kommanditbolag ska behandlas som egen filingfamilj med Inkomstdeklaration 4-profil och separat prövning av årsredovisningsskyldighet.
7. Enskild näringsverksamhet ska behandlas som egen filingfamilj med NE-/NEA-baserad deklarationsprofil och utan generisk Bolagsverket-årsredovisning som default.
8. Filing packages ska byggas från låsta snapshots av ledger, fiscal year, legal form, signatory chain och evidence pack.
9. Alla formskiften ska ske genom ny snapshot/version och får aldrig skriva över historiska filingprofiler eller annual packages.

# Scope

Omfattar:

- legal-form engine
- declaration profile engine
- reporting-obligation profile
- filing profile by entity form
- signatory class per form
- annual close prerequisites tied to legal form
- package readiness rules

Omfattar inte:

- allmän ledger close
- detaljerad UI-layout
- teknisk transportimplementation för enskilda myndighetsadaptrar

# Boundaries

- `legal-form` äger företagsform, declaration profile, filing profile, signatory class och formspecifika blockerare.
- `annual-reporting` äger package build, signatory chain instances, filing submissions, receipts och correction chains.
- `fiscal-year` äger periodkalender, year state, short year och broken year.
- `ledger` äger finansiellt source data och slutliga rapportsnapshots.
- `reporting` äger de rapportobjekt som annual-reporting konsumerar.
- UI får bara presentera formspecifika krav; UI får inte avgöra dem.

# Alternatives considered

## Generic annual reporting only

Avvisas eftersom skillnaderna mellan företagsformer är materiella och har rättslig betydelse.

## Put legal form inside tenant settings only

Avvisas eftersom företagsform måste vara historiskt låst, revisionsbar och kunna ändras över tid utan att äldre package versions muteras.

## Let annual reporting infer legal form from available tax outputs

Avvisas eftersom inferens blir icke-deterministisk och riskerar att bygga fel filingväg vid historiska ändringar eller ofullständiga uppgifter.

# Consequences

- nytt bounded context för `domain-legal-form` behövs
- `annual-reporting` måste kopplas hårt till `domain-legal-form` och `domain-fiscal-year`
- gamla annual package-antaganden måste fasas ut
- close readiness måste bli formspecifik
- test- och golden-data-katalogen måste innehålla separata annual flows för AB, EF, HB/KB och enskild näringsverksamhet

# Migration impact

- company/tenant data behöver explicit legal-form snapshot
- äldre annual-reporting-spår behöver mappas till filing profiles
- gamla package versions utan explicit legal-form snapshot måste märkas som legacy och får inte återanvändas som full fidelity base för nya filings

# Verification impact

Verifiering måste visa att:

- olika företagsformer får olika close- och filinggates
- filing profiles är deterministiska för givet räkenskapsår och legal-form snapshot
- signatory chain och declaration outputs skiljer sig korrekt mellan formerna
- package snapshots är reproducerbara

# Exit gate

- [ ] `legal-form` är egen motor med historiskt låsta snapshots
- [ ] `annual-reporting` konsumerar filing profiles, inte generiska antaganden
- [ ] företagsformsspecifika close- och filingblockerare är uttryckliga
- [ ] AB, EF, HB/KB och enskild näringsverksamhet har separata filingprofiler


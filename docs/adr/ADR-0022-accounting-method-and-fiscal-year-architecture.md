> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Master metadata

- Document ID: ADR-0022
- Title: Accounting Method and Fiscal Year Architecture
- Status: Accepted
- Owner: Product architecture and finance compliance architecture
- Version: 1.0.0
- Effective from: 2026-03-24
- Supersedes: No prior ADR
- Approved by: User directive and master-control baseline
- Last reviewed: 2026-03-24
- Related master docs:
  - `docs/master-control/master-rebuild-control.md`
  - `docs/master-control/master-domain-map.md`
  - `docs/master-control/master-rulepack-register.md`
  - `docs/master-control/master-build-sequence.md`
- Related domains:
  - accounting method
  - fiscal year
  - ledger
  - VAT
  - reporting
  - annual reporting
- Related code areas:
  - `packages/domain-accounting-method/*`
  - `packages/domain-fiscal-year/*`
  - `packages/domain-ledger/*`
  - `packages/domain-vat/*`
  - `packages/db/migrations/*`
  - `apps/api/*`
- Related future documents:
  - `docs/compliance/se/accounting-method-engine.md`
  - `docs/compliance/se/fiscal-year-and-period-engine.md`
  - `docs/test-plans/accounting-method-tests.md`
  - `docs/test-plans/fiscal-year-and-broken-year-tests.md`

# Purpose

Låsa två nya kärn-bounded contexts, `accounting-method` och `fiscal-year`, som egna källor för timing, periodkalender, omläggning och historisk reproducerbarhet.

# Status

Accepted.

# Context

Repo:t har stark ledger-, VAT- och close-bredd men saknar en explicit motor för:

- kontantmetod kontra faktureringsmetod
- brutet räkenskapsår
- short year och extended year
- omläggning av räkenskapsår
- historisk låsning av vilken metod och vilket räkenskapsår som gällde när en händelse bedömdes

Bokföringslagen kräver att räkenskapsår och omläggning styrs explicit. Fysiska personer och handelsbolag där fysisk person beskattas för hela eller del av inkomsten ska som huvudregel ha kalenderår som räkenskapsår, medan andra företag får ha brutet räkenskapsår. Räkenskapsåret kan kortas eller förlängas vid inträde eller omläggning men måste ändå styras som egen domän, inte som indirekta datumfält i ledger eller close.

För moms och löpande bokföring krävs dessutom tydlig kontroll över vilken bokföringsmetod som gäller för företaget och under vilken period den metoden var aktiv.

# Problem

Utan egna bounded contexts blir följande fel eller skört:

- ledger och VAT antar timingregler implicit
- kalenderår smyger in i close, reporting och annual flows
- omläggning av räkenskapsår blir ad hoc
- historiska rapporter blir svåra att reproducera
- metod- eller årsförändringar riskerar att skrivas över i stället för att versioneras

# Decision

1. `accounting-method` införs som eget bounded context.
2. `fiscal-year` införs som eget bounded context.
3. `ledger` får inte längre äga metod- eller periodkalenderregler.
4. `VAT`, `AR`, `AP`, `reporting`, `close` och `annual-reporting` ska konsumera dessa domäner via explicita queries och events.
5. Båda domänerna ska använda effektiva datum, append-only historik och explicit approval flow för förändringar.
6. Rättsliga begränsningar per företagsform ska ligga i deterministiska rulepacks, inte i UI eller controllers.

# Scope

Beslutet omfattar:

- source of truth för accounting method
- source of truth för fiscal year, periods och locks
- change requests och approvals
- historisk pinning för rapporter och reglerade beräkningar
- integration mot ledger, VAT, reporting, close och annual reporting

Beslutet omfattar inte:

- själva årsredovisningspaketen
- detaljerad momsberäkning
- UI-design utöver vilka ytor som får visa eller ändra data

# Boundaries

`domain-accounting-method` äger företagsmetod, effective dating, method change request, method approval och historik.

`domain-fiscal-year` äger fiscal year, year type, start- och slutdatum, periodgenerering, periodreferenser, year change requests och koncernsamordning där det är relevant.

`domain-ledger` äger journals, postings, voucher numbering och correction chains men får endast referera till frozen `accounting-method`- och `fiscal-year`-identiteter.

# Alternatives considered

## Keep method logic inside ledger

Avvisas eftersom ledger då måste bära bolagsspecifik metodik och historik som även andra domäner behöver läsa.

## Keep fiscal-year logic inside close and reporting

Avvisas eftersom close och reporting då blir semantiska ägare av något som redan påverkar ledger, VAT, AGI-perioder och annual flows.

## Store both as configuration tables without domain services

Avvisas eftersom omläggning, approval, effective dating, rulepack validation och audit då blir för svaga.

# Consequences

- nya packages och migrations behövs
- ledger, VAT, reporting, annual reporting och close måste byggas om mot nya kontrakt
- testplaner måste få golden cases för method change, broken year, short year och reopen
- UI får separata administrativa ytor men ingen affärslogik i klienten

# Migration impact

- befintliga period- och ledgerantaganden måste kartläggas
- nuvarande kalenderårs- och serieantaganden måste identifieras och lyftas bort
- existerande företag behöver backfill för method profile och fiscal-year baseline
- gamla rapporter måste kunna replayas mot historiskt korrekt method/fiscal-year-state

# Verification impact

Följande måste verifieras:

- kontantmetod kontra faktureringsmetod styr posting- och VAT-timing deterministiskt
- kalenderårs- och brutna år fungerar enligt företagstyp och tillståndsregler
- short year och extended year kan skapas bara i tillåtna omläggningsfall
- ledger, VAT och reporting läser från rätt source of truth
- historiska resultat återspelas oförändrat efter framtida regeluppdateringar

# Exit gate

ADR:n är uppfylld först när:

- `packages/domain-accounting-method` och `packages/domain-fiscal-year` finns som egna bounded contexts
- inga nya metod- eller årregler längre införs i ledger, VAT eller UI
- relevanta W1 compliance docs, testplaner och migrationsspår är skrivna


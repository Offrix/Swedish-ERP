# Master metadata

- Document ID: MCP-005
- Title: Master Rulepack Register
- Status: Binding control baseline
- Owner: Compliance architecture and rule-engine architecture
- Version: 1.0.0
- Effective from: 2026-03-23
- Supersedes: No prior master rulepack register
- Approved by: User directive in this control phase
- Last reviewed: 2026-03-23
- Related master docs:
  - docs/master-control/master-rebuild-control.md
  - docs/master-control/master-gap-register.md
  - docs/master-control/master-code-impact-map.md
  - docs/master-control/master-domain-map.md
  - docs/master-control/master-golden-scenario-catalog.md
  - docs/master-control/master-policy-matrix.md
- Related domains:
  - rule-engine
  - VAT
  - payroll
  - benefits
  - HUS
  - personalliggare
  - ledger
  - accounting method
  - fiscal year
  - tax account
  - AR
  - AP
  - projects
- Related code areas:
  - packages/rule-engine/*
  - packages/domain-vat/*
  - packages/domain-payroll/*
  - packages/domain-benefits/*
  - packages/domain-hus/*
  - packages/domain-personalliggare/*
  - packages/domain-ledger/*
  - packages/domain-accounting-method/*
  - packages/domain-fiscal-year/*
  - packages/domain-tax-account/*
  - packages/domain-ar/*
  - packages/domain-ap/*
  - tests/golden/*
- Related future documents:
  - docs/compliance/se/accounting-method-engine.md
  - docs/compliance/se/fiscal-year-and-period-engine.md
  - docs/compliance/se/person-linked-document-classification-engine.md
  - docs/compliance/se/hus-invoice-and-claim-gates.md
  - docs/compliance/se/collective-agreements-engine.md
  - docs/policies/rulepack-release-and-rollback-policy.md

# Purpose

Detta dokument låser hela rulepack-systemet för ERP-omtaget.

Det avgör:

- vilka regelpaket som måste finnas
- vilka regelpaket som måste vara datumstyrda
- hur historiska regler bevaras
- hur nya regler publiceras utan att historik förstörs
- vilka runtime-konsumenter som läser vilka regelpaket
- vilka UI-ytor som måste kunna visa regelsvar och blockers
- vilka testvektorer som krävs för varje regelpaket
- hur rollback ska fungera utan tyst omskrivning av gammal historik

# Rulepack architecture

## Grundmodell

Ett rulepack är ett versionerat, effektiv-daterat och auditerat regelsamlingobjekt som används av en eller flera domäner för att producera deterministiska beslut.

Ett rulepack ska minst ha:

- stable `rulepack_code`
- `version`
- `effective_from`
- `effective_to`
- `status`
- `jurisdiction`
- `scope`
- `payload_schema_version`
- `approval_ref`
- `change_reason`
- `supersedes_version`
- `rollback_policy`
- `test_vector_set_id`
- `created_by`
- `approved_by`
- `published_at`
- `retired_at`

## Två lager av regler

### 1. Statutory packs
Regler som följer lag, förordning, myndighetskrav eller formell svensk praxis som systemet ska bära som kärnlogik.

### 2. Tenant packs
Bolagsspecifika eller avtalsspecifika regler som ligger ovanpå eller bredvid statutory packs, till exempel:

- friskvårdspolicy inom tillåten ram
- lokala attestgränser
- kollektivavtalsfamiljer
- saldo- och uttagsregler
- modulaktivering och tenant setup

## Evaluation contract

Varje evaluation ska spara:

- rulepack code
- version
- effective date used
- input snapshot hash
- output snapshot
- warnings
- review required flag
- evaluation timestamp
- actor or service actor
- correlation id

# Effective dating model

## Huvudregel

Rulepacks gäller på intervall:

- `effective_from` är inklusivt
- `effective_to` är exklusivt
- öppet slutdatum är tillåtet

## Evaluation date

Vilket datum som styr evaluation får inte lämnas åt UI. Domänen måste uttryckligen ange det.

Exempel:

- moms använder normalt transaktions- eller skattedatum enligt respektive beslutskedja
- AGI använder löneperiodens eller utbetalningstidpunktens relevanta datum enligt motorregeln
- friskvård använder kostnads- eller utläggsdatum i kombination med rätt årscounting
- HUS använder utförande- och betalningsdatum beroende på vilken kontroll som görs
- fiscal year använder räkenskapsårets start och slut
- accounting method använder räkenskapsår och bokslutstidpunkt
- personalliggare använder attendance-event timestamp

## Historikregel

När ett objekt har fått ett beslut från ett visst rulepack ska historiken peka på exakt det rulepack och den version som användes. Senare publicerade versioner får inte tyst ändra gamla resultat.

# Rulepack versioning model

## Version identity

Version ska vara explicit och monoton per rulepack code.

Formatkrav:

- ett mänskligt läsbart versionsfält, till exempel `2026.03.01.1`
- ett internt immutable version-id
- en tydlig `supersedes_version`

## Allowed transitions

- `draft -> validated -> approved -> published -> retired`
- `published` får inte muteras
- fel i `published` version hanteras genom:
  - ny version med senare `published_at`
  - eller `effective_to` på gammal version och ny ersättande version
  - eller emergency disable enligt policy om säkerhets- eller driftkris föreligger

## Rollback model

Rollback betyder inte att gammal historik skrivs om. Rollback betyder:

- stoppa ny evaluation mot felaktig version
- aktivera tidigare godkänd version eller publicera korrigerad version
- bevara alla redan gjorda evaluations med originalversion som auditfaktum
- skapa replay-plan där regelverket kräver omräkning

# Rulepack change control

## Varje ändring kräver

1. change reason
2. approved policy owner
3. full golden vectors
4. backward compatibility review
5. replay impact assessment
6. rollback plan
7. effective dating review
8. UI blocker review om fält eller flows påverkas
9. reporting impact review om deklarationer, AGI, moms, HUS eller årsflöden påverkas

## Förbjudna ändringar

- tyst ändring av publicerad version
- återanvändning av version identifier för nytt innehåll
- rulepacks som saknar test vectors
- rulepacks som saknar runtime owner
- UI-specifika regler som inte finns i samma rulepack eller policy
- regelpaket som bara ligger i seed utan motsvarande domänkonsument
- datumsoberoende “default logic” där svensk regel faktiskt ändras över tid

# Full rulepack inventory

| Rulepack code | Area | Purpose | Inputs | Outputs | Effective from/to | Runtime consumers | UI consumers | Test consumers | Rollback expectations | Audit requirements |
|---|---|---|---|---|---|---|---|---|---|---|
| `SE-VAT-CORE` | VAT | Inrikes, EU, export, import, reverse charge, box mapping, review flags | transaction type, seller/buyer country, VAT number status, goods/service type, invoice date, tax point, import flags, credit note relation | VAT decision, box lines, posting hints, review-required flag | Effective-dated by tax year and legal changes | domain-vat, domain-ar, domain-ap, ledger projections | invoice forms, AP review, VAT workbench | VAT golden vectors, VAT integration and E2E tests | Activate prior published version or publish corrected successor; historical decisions stay pinned | evaluation record, box mapping snapshot, review reasons |
| `SE-VAT-OSS-IOSS` | VAT | OSS/IOSS and special distance/consumer scenarios | customer type, delivery country, scheme, goods/service category, threshold flags | scheme applicability, VAT country, special reporting flags | Effective-dated by scheme change | domain-vat, AR | invoice issue UI, VAT workbench | VAT special-scheme tests | successor version only | same as above plus scheme evidence |
| `SE-AGI-CORE` | Payroll/AGI | AGI classifications, reporting buckets, correction semantics | compensation lines, employee tax mode, benefit lines, deduction lines, employment data, payout date | AGI line mapping, totals, correction markers, validation errors | Effective-dated by calendar year/month rules | domain-payroll | payroll workbench, AGI workbench | payroll and AGI test suites | prior version or corrected successor; resubmission may be required | stored mapping per employee and submission version |
| `SE-EMPLOYER-CONTRIBUTIONS` | Payroll tax | Employer contribution classes, age/temporary relief logic, payroll tax bases | employee birth date, employment type, pay components, period, relief flags | contribution rates, employer contribution base, exception markers | Effective-dated | domain-payroll, domain-pension | payroll preview, exception panel | payroll tax vectors | corrected successor plus replay plan if posted | full rate and basis snapshot |
| `SE-SINK` | Payroll tax | SINK applicability and rate handling | employee tax mode, approval profile, payout date, compensation types | tax withholding method, rate, validation blockers | Effective-dated | domain-payroll | employee tax profile UI, pay run exceptions | payroll SINK vectors | corrected successor only | tax-mode snapshot and approval evidence |
| `SE-BEN-WELLNESS` | Benefits | Friskvård eligibility, threshold usage, annual counting, taxable crossover | employee, document date, amount, service code, prior yearly total, company policy overlay | tax-free vs taxable outcome, threshold usage, review flag | Effective-dated per calendar year | domain-benefits, document classification, payroll | document review UI, benefit event UI | benefits golden vectors | corrected successor, no rewrite of historical counts | yearly counter snapshot and service classification evidence |
| `SE-BEN-GIFTS` | Benefits | Gift categories, amount caps and taxable crossover | gift type, amount, employee, date, policy scope | tax-free vs taxable outcome, review flag | Effective-dated | domain-benefits, payroll | benefit catalog UI, payroll exceptions | benefits vectors | corrected successor | category and threshold snapshot |
| `SE-TRAVEL-ALLOWANCE` | Travel | Traktamente and foreign allowance baseline rules | trip dates, country, day fractions, overnight, employer-paid meals | tax-free allowance, taxable excess, review warnings | Effective-dated | domain-travel, payroll | travel claim UI, payroll exceptions | travel vectors | corrected successor | trip evidence and calculation basis |
| `SE-MILEAGE` | Travel | Mileage rates and taxable excess for own car and company car variants | vehicle type, distance, date, fuel mode | tax-free rate, taxable excess, review flags | Effective-dated | domain-travel, payroll | mileage entry UI | travel vectors | corrected successor | rate snapshot and vehicle classification |
| `SE-MEAL-BENEFITS` | Benefits | Meal benefit valuation rules | meal type, count, date, employer-paid indicator | taxable benefit value per meal/day | Effective-dated | domain-benefits, payroll | benefit input UI, payroll exceptions | benefits vectors | corrected successor | valuation snapshot |
| `SE-HUS-CORE` | HUS | ROT/RUT service eligibility, buyer/property requirements, claim math and blockers | service category, buyer identity, property/service address, work amount, payment data, execution date | HUS eligibility, deduction base, mandatory fields, blocker codes | Effective-dated | domain-hus, AR | HUS invoice UI, claim workbench | HUS edge-case vectors | corrected successor, no silent change to prior claims | eligibility evidence, buyer/property snapshot |
| `SE-PERSONALLIGGARE-CORE` | Personalliggare | Attendance obligations, thresholds, correction rules, export expectations | industry pack, workplace type, attendance source, event timestamps, person/employer snapshot | allowed event set, correction blockers, export fields, review flags | Effective-dated | domain-personalliggare | kiosk UI, mobile check-in UI, backoffice correction UI | personalliggare tests | corrected successor only | event snapshot and workplace snapshot |
| `SE-ACCOUNTING-METHOD` | Accounting foundation | Kontantmetod/faktureringsmetod timing, year-end treatment and switch blockers | company profile, fiscal year, invoice state, payment state, year-end flag | posting timing, VAT timing, year-end accrual triggers, change blockers | Effective-dated | domain-accounting-method, ledger, AR, AP, VAT | company settings UI, close workbench | accounting method tests | corrected successor with explicit replay plan | method evaluation snapshot tied to posting |
| `SE-FISCAL-YEAR` | Fiscal calendar | Broken year rules, short year, extended year, period generation and change control | legal form, current year config, requested start/end, prior locked periods | generated fiscal year, periods, change blockers, reporting calendar | Effective-dated | domain-fiscal-year, ledger, reporting, annual reporting | company setup UI, close UI | fiscal year tests | corrected successor, no mutation of active years | fiscal year generation snapshot |
| `SE-CAPITALIZATION` | Fixed assets | Direct expense vs fixed asset, natural connection, threshold and useful life checks | asset candidate lines, amounts, useful life, grouping key, purchase relation | expense vs asset decision, grouping result, review flag | Effective-dated | document classification, AP, fixed-assets logic, ledger | document review, AP review | asset vectors | corrected successor; historical decisions pinned | grouping evidence and threshold snapshot |
| `SE-INVOICE-LEGAL-FIELDS` | AR/HUS/VAT | Mandatory field matrix per scenario: domestic, EU, export, reverse charge, HUS, credit note | invoice type, customer type, country, VAT profile, HUS flag, credit ref | mandatory field list, blocker codes, required texts, readiness flag | Effective-dated | domain-ar, domain-hus, domain-vat | invoice form UI, billing workbench | invoice legality tests | corrected successor | field matrix version stored on issue |
| `TENANT-COLLECTIVE-AGREEMENT` | Payroll | Agreement-specific overtime, OB, vacation, rounding and balance rules | agreement family, employment, schedule, time entries, salary model | pay additions, balance adjustments, validation blockers | Effective-dated per agreement version | domain-collective-agreements, domain-payroll, domain-time, balances | payroll exceptions UI, HR agreement UI | agreement vectors | activate prior version or corrected successor; historical pay runs pinned | agreement version and evaluation trace |
| `TENANT-BALANCES` | Payroll/time | Balance earning, spending, carry-forward, expiry, negative limits and priority | balance type, employee, event type, dates, agreement refs | balance transactions, carry-forward instructions, blockers | Effective-dated | domain-balances, domain-time, domain-payroll | balance UI, time approval UI | balance vectors | corrected successor | transaction derivation snapshot |
| `SE-TAX-ACCOUNT-MAPPING` | Tax account | Mapping of skattekonto event types to domains, offset classes and reconciliation logic | statement event type, amount, date, external refs | target class, offset eligibility, reconciliation suggestion, review flags | Effective-dated | domain-tax-account, banking, reporting, close | tax account workbench, close UI | tax account vectors | corrected successor | mapping version stored per imported event |
| `SE-PENSION-SALARY-EXCHANGE` | Pension | Pension contribution bases, salary exchange interaction and special payroll tax basis | salary exchange agreement, pension plan, pay run outputs, employer contributions | pension booking inputs, special payroll tax basis, review flags | Effective-dated | domain-pension, payroll, ledger | pension UI, payroll exceptions | pension vectors | corrected successor | contribution basis snapshot |
| `SE-DOCUMENT-CLASSIFICATION-BOUNDARIES` | Documents | Deterministic review boundaries, allowed auto-suggestions, forbidden auto-decisions and confidence thresholds | document type, OCR confidence, entity match confidence, scenario flags, policy | auto-suggest allowed, mandatory review reasons, forbidden automatic outcomes | Effective-dated | document classification, document engine, rule-engine automation | document review UI, automation ops | classification boundary tests | corrected successor | decision boundary evaluation stored with case |
| `SE-CLOSE-BLOCKERS` | Close | Mandatory blockers before monthly close or annual close can pass | unresolved review items, unreconciled tax account items, unsigned filings, import mismatches, payroll anomalies | blocker set, severity, overrideability, required signoff classes | Effective-dated | domain-core close, annual reporting, tax account, review center | close workbench | close blocker tests | corrected successor | blocker derivation snapshot |

# Golden test vector requirements

Varje rulepack måste ha minst följande testvektorkategorier:

1. **Happy path vectors**  
   Normala korrekta scenarier.

2. **Negative vectors**  
   Saknade fält, ogiltiga kombinationer, förbjudna states.

3. **Boundary vectors**  
   Gränsbelopp, datumgränser, delade perioder, övergång mellan versioner.

4. **Historical pinning vectors**  
   Samma input men med äldre effective date ska ge äldre output.

5. **Replay vectors**  
   Samma idempotency key och samma input får inte skapa nytt sakresultat.

6. **Correction vectors**  
   Rättelseflöde ska skapa ny evaluation utan att skriva om original.

7. **Review-required vectors**  
   Osäkra eller förbjudna auto-fall ska ge blocker eller review state.

8. **Rounding vectors**  
   Särskilt för skatt, moms, AGI, HUS och pension.

9. **Cross-domain vectors**  
   Minst ett scenario där regelpaketet påverkar mer än en domän, till exempel payroll + ledger, AR + VAT, HUS + AR + integrations.

10. **Publication and rollback vectors**  
    Ny version publicerad, gammal version pinned, ny evaluation går mot rätt version.

# Runtime consumer rules

1. Varje runtime-konsument ska läsa genom rule-engine-kontrakt, inte genom direkt läsning av seed-data.
2. Ingen runtime-konsument får anta “senaste version”.
3. Konsumenten måste ange evaluation date.
4. Konsumenten måste spara `rulepack_code` och `version`.
5. Om rulepack returnerar `review_required` får konsumenten inte forcera slutligt beslut utan uttrycklig policy.
6. UI får inte uppfinna egna blockertexter; UI visar blocker codes och förklaringar från regel- eller policylager.

# UI consumer rules

Varje UI-konsument måste kunna visa:

- vilka regelpaket som träffade
- vilket datum och vilken version som användes
- vilka blocker codes eller warning codes som uppstod
- vilka fält som saknas
- om mänsklig review krävs
- om beslutet bygger på policyoverlay eller lagstyrt rulepack

# Test consumer rules

- golden vectors ska ligga centralt och kunna återanvändas av unit, integration och E2E
- varje nytt rulepack kräver minst ett E2E-scenario i golden scenario-katalogen
- testnamn ska bära rulepack code där det är rimligt
- testsviter ska kunna köras historiskt mot flera effective dates

# Exit gate

Detta dokument är uppfyllt först när följande gäller:

- alla regelpaketskategorier i kontrollpaketet har en rad i inventoryn
- effective dating-modellen är samma över alla packs
- rollback-modellen förbjuder tyst mutation av publicerade versioner
- auditkraven är uttryckliga för varje pack
- runtime-, UI- och testkonsumenter är definierade
- minst ett boundary- och replaykrav finns för varje pack
- de nya motorerna accounting method, fiscal year, document classification, tax account, balances och collective agreements har egna rulepacks
- inget nytt domänområde får byggas med hårdkodade svenska regler som egentligen ska ligga i register eller rulepacks

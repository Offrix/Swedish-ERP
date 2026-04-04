# DOMAIN_27_ANALYSIS

## Scope

Domän 27 täcker exhaustiv verifiering av hela affärs-, bokförings-, rapport- och regelkedjan i alla realistiska scenarier som plattformen påstår sig stödja.

Domänen ska bevisa:
- att varje scenario ger rätt objekttillstånd
- att varje scenario ger rätt verifikat och rätt BAS-konton
- att moms, AGI, skattekonto, HUS, annual reporting, owner distributions och exports blir rätt
- att corrections, credits, replay och reversals inte skapar dubbel sanning
- att rapporter, SIE4 och reskontror exakt matchar intern truth

Verifierad repo-evidens:
- `tests/integration/phase26-ap-hardening-api.test.mjs`
- `tests/integration/phase27-banking-runtime-api.test.mjs`
- `tests/integration/phase28-hus-gates-api.test.mjs`
- `tests/integration/phase12-annual-reporting-api.test.mjs`
- `tests/integration/phase12-hus-ledger-reconciliation-api.test.mjs`
- `tests/integration/phase12-owner-distributions-api.test.mjs`
- `tests/integration/phase12-tax-submission-api.test.mjs`
- `tests/integration/phase12-employee-receivables-api.test.mjs`
- `tests/integration/phase21-payroll-core-api.test.mjs`
- `tests/e2e/phase12-annual-reporting-flow.test.mjs`
- `tests/e2e/phase12-tax-submission-flow.test.mjs`
- `tests/e2e/phase19-payroll-migration-flow.test.mjs`
- `tests/unit/phase12-agi-hardening.test.mjs`
- `tests/unit/phase12-benefits-travel-hardening.test.mjs`
- `tests/unit/phase12-garnishment-remittances.test.mjs`
- `tests/unit/phase12-hus-ledger-reconciliation.test.mjs`
- `tests/unit/phase12-owner-distributions.test.mjs`
- `tests/unit/phase12-payrun-engine-agi-immutability.test.mjs`
- `tests/unit/phase21-payroll-core.test.mjs`
- `packages/domain-ledger/`
- `packages/domain-ar/`
- `packages/domain-ap/`
- `packages/domain-payroll/`
- `packages/domain-tax-account/`
- `packages/domain-hus/`
- `packages/domain-annual-reporting/`
- `packages/domain-owner-distributions/`

Officiella källor låsta för domänen:
- [Skatteverket: Bokföring, bokslut och deklaration SKV 282](https://www.skatteverket.se/download/18.4a4d586616058d860bcc3a8/1708607396861/bokforing-bokslut-och-deklaration-skv282utgava08.pdf)
- [Skatteverket: Arbetsgivardeklaration inlämning, teknisk tjänstebeskrivning](https://www7.skatteverket.se/portal-wapi/open/apier-och-oppna-data/utvecklarportalen/v1/getFile/tjanstebeskrivning-agd-inlamning)
- [Skatteverket: Teknisk beskrivning för skattetabeller](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/skattetabeller/tekniskbeskrivningforskattetabeller.4.319dc1451507f2f99e86ee.html)
- [BAS: Chart of account](https://www.bas.se/english/chart-of-account/)
- [BAS: The Accounting Manual](https://www.bas.se/produkter/the-accounting-manual/)
- [SIE Gruppen: SIE filformat ver 4C](https://sie.se/wp-content/uploads/2026/02/SIE_filformat_ver_4C_2025-08-06.pdf)
- [Bankgirot: OCR-referenskontroll](https://www.bankgirot.se/tjanster/inbetalningar/bankgiro-inbetalningar/ocr-referenskontroll/)
- [Bankgirot: Bankgiro Receivables technical information](https://www.bankgirot.se/en/services/incoming-payments/bankgiro-receivables/technical-information/)
- [Bankgirot: Rätt utformad faktura](https://www.bankgirot.se/ratt-utformad-faktura)

Domslut:
- Repo:t innehåller många riktiga deltester för payroll, HUS, banking, annual reporting, receivables och AP.
- Repo:t saknar fortfarande en canonical exhaustiv scenario-katalog som binder varje scenario till expected postings, expected BAS-konton, expected moms/AGI/skatteeffekt och expected report/export outcome.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen `AccountingProofLedger`, ingen first-class scenario registry, ingen blockerande expected-posting-matris för hela flöden och ingen exhaustiv pass/fail-governance som nekar green status vid minsta bokföringsavvikelse.

## Verified Reality

- `verified reality` repo:t har verkliga testsviter för delar av payroll, AGI, HUS, annual reporting, owner distributions och banking runtime. Proof: filerna under `tests/unit/phase12-*`, `tests/integration/phase12-*`, `tests/integration/phase21-payroll-core-api.test.mjs`, `tests/integration/phase27-banking-runtime-api.test.mjs`.
- `verified reality` flera reglerade domäner bär redan egna runtimeobjekt och egna testbevis. Proof: `packages/domain-payroll/`, `packages/domain-hus/`, `packages/domain-tax-account/`, `packages/domain-annual-reporting/`, `packages/domain-owner-distributions/`.
- `verified reality` projekt, AP och banking har redan separata verifieringsspår som går att återanvända i en större scenario-katalog. Proof: `tests/integration/phase26-ap-hardening-api.test.mjs`, `tests/integration/phase27-banking-runtime-api.test.mjs`, `tests/integration/phase14-project-wip-ledger-api.test.mjs`.

## Partial Reality

- `partial reality` testnamn och delsviter antyder täckning, men repo:t saknar en enda canonical scenario-sanning som visar att alla scenarier är avklarade eller blockerade på samma nivå.
- `partial reality` ledger correctness verifieras i flera isolerade domäner, men inte genom en tvärdomänig `scenario -> expected journal lines -> expected report/export`-kedja.
- `partial reality` SIE4, rapporter och reskontror har delbevis i tidigare domäner men ingen exhaustiv cross-check som blockerar mismatch mellan intern truth och export truth.
- `partial reality` AP/ÄR/payroll/HUS/tester finns, men edge-case-matriser för credits, reversals, delbetalning, överbetalning, bankreturer, slutlön, retroaktiv lön och delavslag är inte samlade i en enda bindande verifieringsdomän.

## Legacy

- `legacy` tidigare domäntester är spridda över äldre phase-nummer och riskerar att feltolkas som komplett bevisning fast de bara täcker delar av systemet. Riktning: `migrate`.
- `legacy` enskilda verification-runbooks från äldre domäner används som proxy för total system correctness. Riktning: `rewrite`.

## Dead Code

- `dead` ingen egen dead-code-yta är verifierad i domänen, men frånvaro av canonical scenario registry gör att äldre testfiler lätt blir döda bevisfragment utan tydlig plats i go-live-bevisningen.

## Misleading / False Completeness

- `misleading` gröna enhetstester för delmotorer kan se ut som att hela faktura-, leverantörsfaktura- eller lönekedjan är bevisad när bara en liten del av scenariot faktiskt är testad.
- `misleading` gamla phase-nummer som `phase27-banking-runtime` och `phase28-hus-gates` kan se ut som komplett täckning trots att de inte motsvarar denna nya bindande Domän 27.
- `misleading` att en rapport, export eller submission går att skapa är inte samma sak som att dess källdata, kontering och regulatoriska mapping är korrekt i alla edge cases.

## Exhaustive Scenario Findings

- `critical` ingen canonical `ScenarioCatalog` finns som listar alla supportade scenarier och alla obligatoriska edge cases. Farligt eftersom luckor annars döljs bakom spridda testfiler. Riktning: `create`.
- `critical` ingen `AccountingProofLedger` binder scenario-id till expected verifikat, BAS-konton, momsrutor, AGI-fält, skattekontoeffekter och report/export outcome. Farligt eftersom systemet kan vara funktionellt men bokföringsmässigt fel. Riktning: `create`.
- `critical` ingen blockerande pass/fail-regel finns som uttryckligen nekar green status när faktisk posting avviker från förväntad posting även med ett öre eller ett konto. Riktning: `create`.
- `critical` inga exhaustiva scenariomatriser finns för hela kundfakturaflödet, hela AP-/OCR-/kvittoflödet och hela lönekedjan med full edge-case-täckning. Riktning: `create`.
- `high` corrections, credits, reversals, write-offs, delbetalningar och bankreturer är inte samlade i en enda deterministisk proof-kedja. Riktning: `rewrite`.
- `high` export- och rapportparitet mot intern truth är inte tvärdomänigt blockerande. Riktning: `harden`.
- `high` migration parity och post-cutover corrections är inte bundna till scenario-bevis på samma nivå som ordinarie runtime. Riktning: `harden`.
- `medium` officiella källor används i flera enskilda domäner men inte låsta som canonical source pack för all scenarioverifiering. Riktning: `migrate`.

## Test Findings

- `critical` repo:t saknar en explicit suite där varje supportat scenario har `expected object state`, `expected ledger lines`, `expected report fields` och `expected export artifacts`.
- `high` många testsviter är domänlokala och saknar gemensam severity-/coverage-rapportering för scenario luckor.
- `high` saknade scenarier kan inte enkelt upptäckas eftersom ingen `ScenarioCoverageMatrix` finns i runtime eller docs.

## Doc / Runbook Findings

- `high` äldre verification-runbooks måste skrivas om så att de blir consumers till Domän 27:s scenario ledger i stället för egna sanningsöar.
- `high` nya canonical runbooks behövs för scenario execution, accounting proof review, export parity review och regulatorisk mismatch triage.
- `medium` gamla gröna markeringar i tidigare phases ska inte längre få användas som bevis utan scenarioref och proof-bundle.

## Go-Live Blockers

- ingen canonical `ScenarioCatalog`
- ingen canonical `ScenarioCoverageMatrix`
- ingen `AccountingProofLedger`
- ingen exhaustiv kundfaktura-, AP-, kvitto-, moms-, bank-, payroll-, HUS- och annual-scenariomatriz som binder till expected postings
- ingen blockerande export/report parity gate
- ingen canonical scenario-baserad migration/correction/replay verification

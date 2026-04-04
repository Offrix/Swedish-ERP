# DOMAIN_15_ANALYSIS

## Scope

Domän 15 täcker den verkliga migrations-, import-, cutover-, rollback- och bureau-kärnan för:
- source discovery, source family detection, auth/consent och capability detection
- SIE4, CSV, Excel-template, API-extract och bureau file bundle som ingressfamiljer
- canonical datasets, lineage, checksummor, source fingerprints och raw source artifacts
- mapping sets, auto-mapping, blocker codes, variance reports, waivers och signoff chain
- target write semantics, duplicate detection, merge policy och double-counting guards
- import execution, replay, parallel run, guided cutover, final extract, switch, rollback och post-cutover correction
- payroll history migration, YTD/AGI carry-forward, balances, agreement snapshots och evidence bundles
- bureau portfolio migrations, delegated approvals, cohort dashboards och trial/live-promotion

Verifierad repo-evidens:
- `packages/domain-core/src/migration.mjs`
- `packages/domain-sie/src/index.mjs`
- `packages/domain-import-cases/src/engine.mjs`
- `packages/domain-integrations/src/control-plane.mjs`
- `packages/domain-integrations/src/index.mjs`
- `packages/domain-tenant-control/src/index.mjs`
- `apps/api/src/phase14-migration-routes.mjs`
- `apps/api/src/phase14-migration-intake-routes.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/mission-control.mjs`
- `packages/db/migrations/20260322120000_phase11_bureau_portfolio.sql`
- `packages/db/migrations/20260322210000_phase14_migration_cockpit.sql`
- `tests/unit/phase7-sie4.test.mjs`
- `tests/unit/phase14-migration.test.mjs`
- `tests/unit/phase17-cutover-concierge.test.mjs`
- `tests/unit/phase19-payroll-migration.test.mjs`
- `tests/integration/phase14-migration-api.test.mjs`
- `tests/integration/phase19-payroll-migration-api.test.mjs`

Körda tester i denna rebuild-runda:
- `node --test tests/unit/phase14-migration.test.mjs`
- `node --test tests/unit/phase17-cutover-concierge.test.mjs`
- `node --test tests/unit/phase19-payroll-migration.test.mjs`
- `node --test tests/integration/phase14-migration-api.test.mjs`
- `node --test tests/integration/phase19-payroll-migration-api.test.mjs`

Officiella källor låsta för domänen:
- [Föreningen SIE-Gruppen: format](https://sie.se/format/)
- [Bokföringsnämnden: arkivering](https://www.bfn.se/fragor-och-svar/arkivering/)
- [Bokföringsnämnden: överföring av räkenskapsinformation](https://www.bfn.se/vad-innebar-den-andrade-regeln-om-overforing-av-rakenskapsinformation-i-bokforingslagen/)
- [Skatteverket: när ska arbetsgivardeklaration lämnas](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/narskajaglamnaarbetsgivardeklaration.4.361dc8c15312eff6fd13c11.html)
- [Skatteverket: rätta en arbetsgivardeklaration](https://www.skatteverket.se/foretag/arbetsgivare/lamnaarbetsgivardeklaration/rattaenarbetsgivardeklaration.4.2cf1b5cd163796a5c8b6698.html)
- [Fortnox: scopes](https://www.fortnox.se/en/developer/guides-and-good-to-know/scopes)
- [Visma Developer: authentication](https://developer.vismaonline.com/docs/authentication)
- [Bokio: importera bokföring](https://www.bokio.se/hjalp/komma-igang/importera-bokforing/importera-bokforing-steg-for-steg/)
- [Bokio: exportera bokföring](https://www.bokio.se/hjalp/bokforing/exportera-bokforing/hur-exporterar-jag-bokforing-fran-bokio/)

Domslut:
- Domänen innehåller verkliga öar: integrations-control-plane, SIE4-import/export, ledger/opening balances, evidence bundles, bureau portfolio och trial/live-promotion.
- Den generiska migrationsmotor som prompten kräver finns däremot inte.
- Total klassning: `partial reality`.
- Kritiska blockerare: saknad source discovery, saknade canonical datasets, caller-supplied diff/parallel-run-sanning, metadata-only cutover/final extract, icke-teknisk rollback samt att payroll migration i praktiken bara landar balances och evidence.

## Verified Reality

- `verified reality` integrations-control-plane har verklig credential-, secret-ref-, consent- och isolationlogik. Proof: `packages/domain-integrations/src/control-plane.mjs:59-113`, `326-357`, `364-425`, `564-584`.
- `verified reality` SIE4 finns som verklig import/export-bana med idempotency, checksum och ledgerkoppling. Proof: `packages/domain-sie/src/index.mjs:32-117`, `123-219`, `tests/unit/phase7-sie4.test.mjs`.
- `verified reality` opening balances och journal history landar i verklig ledger truth, inte bara i cockpitmetadata. Proof: `packages/domain-sie/src/index.mjs:145-197`, `packages/domain-ledger/src/index.mjs:1088-1155`, `3903-3924`.
- `verified reality` cutover acceptance- och signoff-evidence bundles fryses via evidence-plattform när sådan finns. Proof: `packages/domain-core/src/migration.mjs:765-916`, `918-1218`.
- `verified reality` cutover concierge, rehearsals, variance-report och rollback-drill-linkage finns som verkliga operatorobjekt. Proof: `packages/domain-core/src/migration.mjs:609-744`, `1220-1417`, `tests/unit/phase17-cutover-concierge.test.mjs`.
- `verified reality` payroll migration har verklig batch-, employee-record-, balance-baseline-, diff- och approvalkedja med frozen evidence. Proof: `packages/domain-core/src/migration.mjs:1916-2425`, `2593-3257`, `tests/unit/phase19-payroll-migration.test.mjs`, `tests/integration/phase19-payroll-migration-api.test.mjs`.
- `verified reality` bureau portfolio-drift och delegated approvals finns som verkliga runtimeobjekt i core och DB. Proof: `packages/domain-core/src/index.mjs:787-1113`, `packages/db/migrations/20260322120000_phase11_bureau_portfolio.sql`.
- `verified reality` trial/live-promotion sker copy-to-new-live-tenant och inte som in-place flip. Proof: `packages/domain-tenant-control/src/index.mjs:1618-1808`, `5064-5088`.

## Partial Reality

- `partial reality` `migration.mjs` har mapping, import batches, diff reports, parallel runs, cutover plans och acceptance records, men de är främst metadata- och checklistobjekt. Proof: `packages/domain-core/src/migration.mjs:140-744`.
- `partial reality` parallel run-resultat finns, men mätvärden och snapshotrefs kommer från caller i stället för att beräknas av motorn från source och target truth. Proof: `packages/domain-core/src/migration.mjs:434-510`.
- `partial reality` diff reports finns, men difference items är caller-supplied och inte härledda från canonical datasets. Proof: `packages/domain-core/src/migration.mjs:349-431`.
- `partial reality` payroll migration är verklig som history/evidence/balances-lane, men inte som full landing av HR-, payroll-, AGI- och tax truth. Proof: `packages/domain-core/src/migration.mjs:2290-2425`.
- `partial reality` cutover validation har riktiga blockers och tester, men final extract, switch och rollback är fortfarande huvudsakligen statustransitioner ovanpå kringliggande bevis. Proof: `packages/domain-core/src/migration.mjs:1444-1609`, `1616-1800`, `tests/unit/phase14-migration.test.mjs`.

## Legacy

- `legacy` `packages/domain-core/src/migration.mjs` ska behandlas som legacy cockpit-shell tills generisk extract/dataset/landing-motor byggts.
- `legacy` `packages/db/migrations/20260322210000_phase14_migration_cockpit.sql` representerar en förenklad cockpitmodell utan source profiles, extract manifests, canonical datasets, cutoff basis eller target-landing-truth.
- `legacy` `apps/api/src/phase14-migration-intake-routes.mjs` är en sammanblandad yta för customs/import-VAT-case management och payroll migration, inte en riktig generell migration-intake-surface.
- `legacy` runbooks i migration-spåret beskriver ofta guided runtime som om den redan var tekniskt verklig.

## Dead Code

- ingen högförtroende-klassad helt oanvänd kärnlogik hittades i Domän 15
- det farliga här är i stället `misleading` och `partial reality`: objekt, routes och runbooks som ser ut som en generell motor men inte bär sanningen

## Misleading / False Completeness

- `critical` Dokumenterad object model för `SourceSystemProfile`, `SourceConnection`, `ExtractManifest`, `CanonicalDataset`, `AutoMappingCandidate` och `ParallelRunPlan` finns inte i verklig runtime. Proof: repo-sökning och `packages/domain-core/src/migration.mjs`.
- `critical` integrationsbaselines deklarerar `sie4_file_channel`, `migration_csv_template`, `migration_excel_template` och `migration_bureau_package`, men repo:t saknar motsvarande verkliga providers. Proof: `packages/domain-integrations/src/index.mjs:105-112`, `199-232`, providerkatalogen.
- `critical` `runImportBatch` går direkt `validated -> mapped -> imported -> reconciled` utan canonical dataset, target write semantics eller domain-specific landing. Proof: `packages/domain-core/src/migration.mjs:267-309`.
- `critical` `completeFinalExtract` sätter bara `lastExtractAt` och status. Det finns ingen verklig final extract-artifact eller delta extract-kedja. Proof: `packages/domain-core/src/migration.mjs:1444-1458`.
- `critical` `switchCutover` är en statusväxling med checklist- och signoffgates, inte ett tekniskt switchförfarande som byter canonical source of truth. Proof: `packages/domain-core/src/migration.mjs:1541-1573`.
- `high` `startRollback` och `completeRollback` bygger kompensationsplan och receipts men kör inte restore från checkpoint/backup i migrationsmotorn. Proof: `packages/domain-core/src/migration.mjs:1616-1800`.
- `high` payroll migration ser full ut i tester och API, men `executePayrollMigrationBatch` realiserar bara balance transactions. Proof: `packages/domain-core/src/migration.mjs:2290-2375`.
- `medium` routefamiljen antyder att `/v1/import-cases` är migration intake trots att den i praktiken gäller import VAT/import cases och separat payroll migration. Proof: `apps/api/src/phase14-migration-intake-routes.mjs:22-751`.

## Source Discovery / Source Family Findings

- `critical` ingen verklig source discovery finns för API metadata, filsignatur, SIE header, CSV fingerprint eller bureau manifest. Det finns ingen runtime för `SourceSystemProfile`. Proof: `packages/domain-core/src/migration.mjs`, repo-sökning. Riktning: `replace`.
- `critical` ingen capability-detection avgör om källan faktiskt kan leverera GL, open items, payroll history, AGI history, skattekonto eller documents-only. Riktning: `replace`.
- `high` source-family-prioriteringen i runtime är felvänd: baselines finns för svenska migrationsfamiljer men adapters saknas medan mindre kritiska adapters redan finns i integrationsdomänen. Proof: `packages/domain-integrations/src/index.mjs:105-112`, `777-800`. Riktning: `replace`.

## Source Connection / Consent / Capability Findings

- `high` migration använder integrations-control-plane indirekt, men saknar egen `SourceConnection` kopplad till source profile, gränted scopes, extract rights och expiry rules. Proof: `packages/domain-integrations/src/control-plane.mjs:59-113`, `326-357`. Riktning: `harden`.
- `high` consent expiry och revocation blir inte blockerande migration truth. Control-plane kan säga authorized fast consent i praktiken är för gammal för extracts. Proof: `packages/domain-integrations/src/control-plane.mjs:326-357`, `364-425`. Riktning: `rewrite`.
- `high` provider auth-regler för Fortnox/Visma är inte inbyggda i migrationens ingressmodell trots att officiella källor visar scopes/auth som centrala. Riktning: `rewrite`.

## SIE4 / Opening Balance / Historical Journal Findings

- `keep` SIE4-banan är riktig och ska bevaras som Wave 1-ingress, men flyttas in under en gemensam canonical extract-path. Proof: `packages/domain-sie/src/index.mjs:32-219`.
- `high` SIE4 är isolerad från generisk migration runtime, vilket gör att discovery, cutoff, canonical dataset och cutover inte delas med ändra ingressfamiljer. Riktning: `rewrite`.
- `medium` opening balance-regeln i ledger är stark, men migrationens centrala cutoff-hierarki återanvänder den inte. Proof: `packages/domain-ledger/src/index.mjs:3903-3924`. Riktning: `harden`.

## Canonical Dataset / Artifact Governance Findings

- `critical` canonical datasets finns inte som förstaklassobjekt i runtime eller DB. Proof: `packages/db/migrations/20260322210000_phase14_migration_cockpit.sql`, `packages/domain-core/src/migration.mjs`. Riktning: `replace`.
- `critical` extract manifests, source checksums, schema versions och lineage-kedjor saknas. Riktning: `replace`.
- `critical` raw source artifact governance saknas: ingen canonical registry för SIE-, CSV-, Excel- eller bundle-artefakter med retention, kryptering, access policy och checksum. Riktning: `replace`.
- `high` evidence bundles finns, men de fryser främst acceptance/payroll-history och inte extract-pathens råartefakter eller canonical datasets. Riktning: `rewrite`.

## Mapping / Variance / Materiality Findings

- `critical` mapping sets är manuella fältlistor utan `AutoMappingCandidate`, confidence score, blocked fields eller source coverage-truth. Proof: `packages/domain-core/src/migration.mjs:140-265`. Riktning: `replace`.
- `critical` diff reports bygger på caller-supplied difference items i stället för maskinellt framräknade skillnader från source + target truth. Proof: `packages/domain-core/src/migration.mjs:349-431`. Riktning: `replace`.
- `high` waivers/materiality/signoff finns bara indirekt via decisions och acceptance records; det finns ingen revisionssäker waiver-livscykel per diff item. Riktning: `rewrite`.

## Target Write / Duplicate / Double-Count Findings

- `critical` target write semantics saknas centralt. Det finns inget first-class beslut per object family för `create`, `merge`, `replace`, `block`. Riktning: `replace`.
- `critical` identity resolution och duplicate detection saknas för kunder, leverantörer, open items, projekt, employees och shareholder history. Riktning: `replace`.
- `critical` double-counting guards mellan SIE4, CSV, API och bureau bundle saknas i generisk runtime. Riktning: `replace`.
- `high` `runImportBatch` saknar domain-bound receipts som visar exakt vad som faktiskt skrevs i target-domänerna. Riktning: `rewrite`.

## Parallel Run / Cutover / Rollback Findings

- `critical` parallel run är inte verklig beräkning; metrics och thresholds levereras av caller. Proof: `packages/domain-core/src/migration.mjs:434-510`. Riktning: `replace`.
- `high` `createCutoverPlan` saknar source extract manifests, delta extract policy, watch window signals och switch payload. Proof: `packages/domain-core/src/migration.mjs:544-607`. Riktning: `rewrite`.
- `critical` final extract och switch är metadata-only. Proof: `packages/domain-core/src/migration.mjs:1444-1573`. Riktning: `replace`.
- `critical` rollback är inte restore-backed migration rollback. Den bygger på receipts, compensate/freeze och ibland recovery plan för regulated submissions, men inte på tekniskt återställd target truth. Proof: `packages/domain-core/src/migration.mjs:1616-1800`. Riktning: `replace`.
- `high` post-cutover correction lane finns som case-objekt men är inte knuten till en verklig watch-window-motor med reopen rules, correction SLA och source-drift-scan. Proof: `packages/domain-core/src/migration.mjs:1802-1864`. Riktning: `rewrite`.

## Payroll Migration Findings

- `verified reality` payroll history import kräver evidence mapping, YTD basis, AGI carry-forward, absence/benefit/travel/pension history och agreement snapshot. Proof: `packages/domain-core/src/migration.mjs:2015-2066`, `3174-3246`, `tests/unit/phase19-payroll-migration.test.mjs`.
- `critical` execute/finalize realiserar bara balance accounts och balance transactions. Ingen verklig landing sker till payroll-period truth, HR master truth, AGI ledger eller receivables. Proof: `packages/domain-core/src/migration.mjs:2290-2375`. Riktning: `replace`.
- `high` rollback av payroll migration korrigerar bara baseline-transaktionerna i balances. Den rullar inte tillbaka någon full payroll-/HR-/AGI-state. Proof: `packages/domain-core/src/migration.mjs:2377-2425`. Riktning: `rewrite`.
- `high` payroll migration summary och evidence är bra, men kan ge falsk trygghet eftersom landningen är smalare än historiktäckningen. Riktning: `harden`.

## Bureau / Trial-Live Findings

- `verified reality` bureau portfolio och delegated approvals är verkliga i core och DB. Proof: `packages/domain-core/src/index.mjs:787-1113`, `packages/db/migrations/20260322120000_phase11_bureau_portfolio.sql`.
- `high` bureau mode är inte integrerat med en verklig multi-client canonical import engine. Det finns cohort- och opsstöd, men inte generisk datasetmotor per klient. Riktning: `rewrite`.
- `verified reality` trial/live-promotion är copy-to-new-live-tenant med blocked carry-overs och evidence. Proof: `packages/domain-tenant-control/src/index.mjs:1618-1808`, `5064-5088`.
- `high` migrationdomänen använder inte tenant-controls promotion truth som sin centrala cutover truth, vilket skapar två parallella modeller för live-promotion. Riktning: `rewrite`.

## Route / Surface / Runbook Findings

- `high` `/v1/sie/*` är en riktig separat lane, medan `/v1/migration/*` bara bär cockpit/cutover. Detta måste göras explicit i modell och docs. Proof: `apps/api/src/route-contracts.mjs:173`, `309-314`, `406-412`.
- `high` `/v1/import-cases/*` är inte generell migration intake och måste avkopplas från migrationsspråket. Proof: `apps/api/src/route-contracts.mjs:396-405`, `apps/api/src/phase14-migration-intake-routes.mjs:22-339`.
- `high` följande runbooks måste skrivas om mot den nya sanningen:
  - `docs/runbooks/fas-14-migration-go-live-verification.md`
  - `docs/runbooks/migration-cutover.md`
  - `docs/runbooks/migration-cutover-concierge.md`
  - `docs/runbooks/migration-history-repair.md`
  - `docs/runbooks/opening-balances-and-sie.md`
  - `docs/runbooks/parallel-run-and-diff.md`
  - `docs/runbooks/rollback-checkpoints.md`
  - `docs/runbooks/pilot-migration-and-cutover.md`
  - `docs/runbooks/hr-masterdata-cutover.md`
  - `docs/runbooks/hr-time-cutover.md`
  - `docs/runbooks/payroll-history-import-verification.md`
  - `docs/runbooks/payroll-migration-cutover.md`
  - `docs/runbooks/trial-promotion-to-live.md`
  - `docs/runbooks/fas-11-bureau-verification.md`
- `critical` följande runbooks saknas helt och måste skapas:
  - `docs/runbooks/source-discovery-and-consent.md`
  - `docs/runbooks/cutover-and-rollback.md`
  - `docs/runbooks/bureau-portfolio-migrations.md`
- `medium` demo seeds för bureau och migration cockpit ska flyttas till test-only, archive eller remove:
  - `packages/db/seeds/20260322121000_phase11_bureau_portfolio_demo_seed.sql`
  - `packages/db/seeds/20260322211000_phase14_migration_cockpit_demo_seed.sql`

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| source discovery | generell migration engine | saknas | `packages/domain-core/src/migration.mjs`, repo-sökning | ja |
| source auth/consent | migration-owned | bara integrations-control-plane underlager | `packages/domain-integrations/src/control-plane.mjs:59-584` | ja |
| SIE4 import/export | first-class migration lane | verklig men isolerad SIE-lane | `packages/domain-sie/src/index.mjs:32-219`, `tests/unit/phase7-sie4.test.mjs` | nej |
| canonical datasets | first-class | saknas | `packages/db/migrations/20260322210000_phase14_migration_cockpit.sql` | ja |
| mapping/autocandidate/confidence | first-class | manuell mapping-lista | `packages/domain-core/src/migration.mjs:140-265` | ja |
| diff engine | first-class | caller-supplied diff items | `packages/domain-core/src/migration.mjs:349-431` | ja |
| parallel run | first-class | caller-supplied metrics | `packages/domain-core/src/migration.mjs:434-510`, `tests/unit/phase14-migration.test.mjs` | ja |
| cutover | guided cutover | verklig operatorcockpit men inte teknisk extract/switch-motor | `packages/domain-core/src/migration.mjs:544-1800` | ja |
| rollback | restore-backed | kompensations- och metadataorienterad | `packages/domain-core/src/migration.mjs:1616-1800` | ja |
| payroll migration | full migration | verklig history/evidence/balance-lane, men smal landing | `packages/domain-core/src/migration.mjs:1916-2425`, `tests/unit/phase19-payroll-migration.test.mjs` | ja |
| bureau migrations | first-class | partial reality | core/index + DB migration | ja |
| trial/live promotion | safe promotion | verklig copy-to-new-live lane | `packages/domain-tenant-control/src/index.mjs:1618-1808` | nej |

## Source Family Coverage Matrix

| source family | claimed support | actual runtime path | proof | blocker |
| --- | --- | --- | --- | --- |
| SIE4 | wave 1 | verklig separat `/v1/sie/*` lane | `apps/api/src/route-contracts.mjs:309-314`, `packages/domain-sie/src/index.mjs` | nej |
| API GL | wave 1 | ingen generisk migration extract-runtime | `packages/domain-core/src/migration.mjs` | ja |
| CSV template | wave 1 | baseline claim utan provider | `packages/domain-integrations/src/index.mjs:107-108`, `199-212` | ja |
| Excel template | wave 1 | baseline claim utan provider | `packages/domain-integrations/src/index.mjs:109-110`, `213-226` | ja |
| bureau bundle | wave 1 | baseline claim utan provider | `packages/domain-integrations/src/index.mjs:111-112`, `227-239` | ja |
| documents only | supplementary only | import-cases/customs lane, ej generell migration | `packages/domain-import-cases/src/engine.mjs` | ja |

## Cutover Reality Matrix

| cutover capability | actual runtime path | what is real | what is missing | blocker |
| --- | --- | --- | --- | --- |
| cutover plan | `createCutoverPlan` | checklist, thresholds, signoff refs, rollback point ref | extract manifest, delta policy, switch payload | ja |
| concierge | `getCutoverConcierge` | operator snapshot | no canonical extract truth | ja |
| rehearsal | `recordCutoverRehearsal` | rehearsal record with blockers | no executed extract/switch rehearsal engine | ja |
| automated variance | `generateCutoverAutomatedVarianceReport` | summary över diff + parallel-run records | still depends on caller-supplied inputs | ja |
| final extract | `completeFinalExtract` | timestamp + status | no artifact, no checksum, no dataset freeze | ja |
| validation | `passCutoverValidation` | gate över booleans, dead letters, restore freshness | no technical compare between final extract and target | ja |
| switch | `switchCutover` | guarded status transition | no truth handoff/switch execution | ja |
| rollback | `startRollback` / `completeRollback` | plan + compensation receipts | no restore-backed rollback in migration engine | ja |
| post-cutover correction | `createPostCutoverCorrectionCase` | correction case object | no governed watch-window engine | ja |

## Payroll Migration Matrix

| payroll capability | actual runtime path | actual landing | blocker |
| --- | --- | --- | --- |
| employee history import | `importEmployeeMigrationRecords` | batch-local records + evidence bundle | nej |
| YTD/AGI carry-forward metadata | `importEmployeeMigrationRecords` | batch-local records + history summary | ja |
| agreement snapshot linking | `normalizeEmployeeMigrationRecords` | validation + embedded snapshot | nej |
| baseline balances | `registerBalanceBaselines` / `executePayrollMigrationBatch` | balances accounts + balance transactions | nej |
| payroll finalize | `executePayrollMigrationBatch` | only balances + receipt | ja |
| payroll rollback | `rollbackPayrollMigrationBatch` | compensating balance transactions | ja |

## Critical Findings

- source discovery, capability detection och canonical datasets måste byggas från grunden
- wave 1-source families får inte längre påstås vara live utan verkliga adapters
- diff, parallel run, final extract och switch måste sluta vara caller-supplied eller metadata-only
- target write semantics, duplicate guards och double-counting guards måste bli first-class
- rollback måste bli restore-backed och inte bara kompensationsorienterad
- payroll migration måste sluta presenteras som full landing när den i praktiken bara realiserar balances

## High Findings

- source connection och consent expiry måste göras migrationsspecifika och blockerande
- cutoff basis måste centraliseras för balances, journals, open items, payroll YTD, AGI och switch
- SIE4 måste flyttas in i samma canonical extract-path som övriga ingressfamiljer
- post-cutover correction lane måste kopplas till verklig watch window
- bureau migrationer måste få verklig multi-client datasetmotor
- route- och runbookdrift måste rensas

## Medium Findings

- import-cases måste avkopplas från migration intake-språket
- demo seeds i bureau/migration-cockpit måste flyttas till test-only eller arkiv
- tenant-controls promotionmodell måste kopplas tätare till migrationens cutovermodell

## Cross-Domain Blockers

- Domän 1 måste fortsätta låsa canonical persistence, event lineage och replay-safe repositories.
- Domän 2 måste fortsätta låsa provider auth, secrets, consent och trust boundaries.
- Domän 10 och 11 måste låsa payroll, AGI, tax account, owner distributions och historical landing semantics innan full migration kan märkas grön.
- Domän 16 måste bära support/replay/runbook/incidentkedjan för cutover, rollback och post-cutover correction.

## Go-Live Blockers

- ingen generell migration go-live innan source discovery och canonical datasets är verkliga
- ingen one-click-claim innan blockerare, diffar, signoff och rollback readiness är hårt bundna till runtime
- ingen payroll migration go-live innan full landing semantik finns utöver balances
- ingen bureau massmigrering innan multi-client canonical ingest och delegated approvals är verkliga
- inga svenska wave 1-claims utan riktiga adapters för Fortnox/Visma/Bokio/SIE4/CSV/bureau families

## Repo Reality Vs Intended Migration / Cutover Model

Repo:t innehåller idag:
- en verklig SIE4-lane
- en verklig payroll-history/evidence/balance-lane
- en verklig integrations-control-plane
- en verklig bureau portfolio-ops-lane
- en verklig trial/live-promotion-lane
- en verklig cutover cockpit, acceptance- och evidence-lane

Repo:t innehåller inte idag:
- en verklig generell source discovery-motor
- en verklig canonical dataset-motor
- en verklig generisk import engine som landar i flera targetdomäner
- en verklig parallel run engine som själv räknar parity
- en verklig final extract/delta extract/switch-motor
- en verklig restore-backed rollback-motor

Slutsats:
- behåll SIE4-, payroll-history-, evidence-, bureau- och trial/live-delarna som råmaterial
- skriv om den generiska migrationskärnan
- nedgradera dagens cockpit till operator-view tills canonical ingest, landing och rollback faktiskt finns

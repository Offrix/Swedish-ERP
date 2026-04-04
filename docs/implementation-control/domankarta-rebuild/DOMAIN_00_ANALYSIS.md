# DOMAIN_00_ANALYSIS

## Scope

- Granskningen utgår från den nya sanningskedjan under [domänkarta-rebuild](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild), inte från äldre `FINAL`-dokument.
- Domän 0 lästes i exakt ordning:
  - prompt 0: [DOMÄN 0.md](/Users/snobb/Desktop/Prompts_inspect/Prompts/DOMÄN%200.md)
  - tidigare analys: [DOMAIN_00_ANALYSIS.md](/Users/snobb/Desktop/Domankarta_inspect/Domänkarta/Domän%200/DOMAIN_00_ANALYSIS.md)
  - tidigare roadmap: [DOMAIN_00_ROADMAP.md](/Users/snobb/Desktop/Domankarta_inspect/Domänkarta/Domän%200/DOMAIN_00_ROADMAP.md)
  - tidigare library: [DOMAIN_00_IMPLEMENTATION_LIBRARY.md](/Users/snobb/Desktop/Domankarta_inspect/Domänkarta/Domän%200/DOMAIN_00_IMPLEMENTATION_LIBRARY.md)
- Faktisk repo-evidens i denna körning:
  - kataloginventering av `docs/implementation-control`, `docs/master-control`, `docs/runbooks`, `docs/compliance`, `docs/domain`, `docs/policies`, `docs/test-plans`, `docs/ui`, `apps`, `packages`, `tests`, `scripts`
  - sökning efter falska bindningsmarkörer
  - sökning efter referenser till saknade ytor `apps/backoffice` och `apps/public-web`
  - sökning efter demo-runtime via `createExplicitDemoApiPlatform`
  - sökning efter absoluta lokala paths
  - verifieringskörningar:
    - `node scripts/lint.mjs`
    - `node scripts/typecheck.mjs`
    - `node scripts/build.mjs`
    - `node scripts/security-scan.mjs`
    - `node scripts/runtime-honesty-scan.mjs --mode production --surface api --active-store-kind memory --critical-domain-state-store-kind memory --require-startup-blocked --require-blocking --json`
    - `node scripts/doctor.mjs`
    - `node --test tests/unit/phase1-account-catalog.test.mjs`
    - `node --test tests/integration/phase3-api-edge-hardening.test.mjs`
- Faktiska filvolymer i denna kopia:
  - `docs/implementation-control`: 42 filer
  - `docs/master-control`: 11 filer
  - `docs/runbooks`: 168 filer
  - `docs/compliance`: 34 filer
  - `docs/domain`: 24 filer
  - `docs/policies`: 20 filer
  - `docs/test-plans`: 25 filer
  - `docs/ui`: 8 filer
  - `apps`: 50 filer
  - `packages`: 461 filer
  - `tests`: 407 filer
  - `scripts`: 75 filer
- Viktiga mätvärden:
  - 119 `Status: Bindande/Binding`-träffar utanför den nya rebuild-sanningen
  - 45 dokumentreferenser till `apps/backoffice` eller `apps/public-web`, trots att faktiska appar bara är `api`, `desktop-web`, `field-mobile`, `worker`
  - 256 testreferenser till `createExplicitDemoApiPlatform`
  - 60 blockerande findings i `runtime-honesty-scan` för production med memory-store

## Verified Reality

- Den enda nya aktiva docs-sanningen i repo:t är rebuild-kedjan:
  - [AGENTS.md](/Users/snobb/Desktop/Swedish%20ERP/AGENTS.md)
  - [MASTER_DOMAIN_ROADMAP.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/MASTER_DOMAIN_ROADMAP.md)
  - [MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md)
  - [CODEX_SETTINGS_PROMPT.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/CODEX_SETTINGS_PROMPT.md)
- Faktiska appytor i repo:t är bara:
  - `apps/api`
  - `apps/desktop-web`
  - `apps/field-mobile`
  - `apps/worker`
- Baselineskripten går grönt i denna kopia:
  - `lint`
  - `typecheck`
  - `build`
  - `security`
- Runtime-ärlighetsscannen fungerar på riktigt och blockerar production-start med memory truth och capability shadowing.
- Följande produktionskritiska repo-problem är verkliga och maskinupptäckta:
  - `missing_persistent_store`
  - `critical_domain_store_not_persistent`
  - `flat_merge_collision`
  - `map_only_critical_truth`
  - `stub_provider_present`
  - `secret_runtime_not_bank_grade`
- API-plattformen använder fortfarande flat merge via [platform.mjs](/Users/snobb/Desktop/Swedish%20ERP/apps/api/src/platform.mjs#L814) och defaultar kritisk truth till memory i vissa lägen via [platform.mjs](/Users/snobb/Desktop/Swedish%20ERP/apps/api/src/platform.mjs#L1717).
- `domain-org-auth` bär fortfarande stor mängd runtime-truth i `Map`-register och exponerar BankID-testhjälpmedel i runtimeytan:
  - [index.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-org-auth/src/index.mjs#L438)
  - [index.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-org-auth/src/index.mjs#L548)
  - [index.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-org-auth/src/index.mjs#L2779)
- Secret runtime är fortfarande inte bank-grade i protected/production:
  - [crypto.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-core/src/crypto.mjs#L6)
  - [secrets.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-core/src/secrets.mjs#L103)

## Partial Reality

- `apps/desktop-web` och `apps/field-mobile` finns på riktigt men är shell-ytor, inte fulla produktarbetsytor.
- `apps/api` är bred och verklig, men routebredden översäljer produktmognaden eftersom flera UI- och ops-ytor saknas som separata appar.
- `apps/worker` är verklig kod med async-logik, men protected/live-drift är inte bevisad i denna miljö.
- `tests/helpers/demo-platform.mjs` ger verklig kodträff, men bevisar demo/test-runtime, inte protected/live.
- `scripts/lint.mjs`, `scripts/typecheck.mjs`, `scripts/build.mjs` och `scripts/security-scan.mjs` är användbara strukturkontroller, men de är inte readiness-gates.

## Legacy

- Hela äldre styrningsmassan utanför rebuild-trädet är nu legacy eller råmaterial:
  - `docs/implementation-control/*` utanför `domankarta-rebuild`
  - `docs/master-control/*`
  - `docs/compliance/se/*`
  - `docs/domain/*`
  - `docs/policies/*`
  - `docs/test-plans/*`
  - `docs/ui/*`
  - äldre runbooks som fortfarande bär `Binding`
- Flera äldre dokument kan fortfarande innehålla användbar saksubstans, men de får inte användas som sanning längre.

## Dead Code

- Python-spåret är fortfarande ren scaffold:
  - [pyproject.toml](/Users/snobb/Desktop/Swedish%20ERP/pyproject.toml)
  - [__init__.py](/Users/snobb/Desktop/Swedish%20ERP/src/swedish_erp_python/__init__.py)
  - [README.md](/Users/snobb/Desktop/Swedish%20ERP/tests/python/README.md)
- Infrastrukturspåren under `infra/terraform` och `infra/ecs` är placeholders, inte verklig deploybar IaC.
- `packages/integration-core` och `packages/test-fixtures` är fortfarande mer placeholder/kontraktsskal än aktiv runtime-sanning.

## Misleading / False Completeness

- 119 bindningsmarkörer finns kvar i gamla docs-kataloger trots att de inte längre är sanning.
- 45 docs refererar saknade appytor `apps/backoffice` eller `apps/public-web`.
- [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md#L286) pekar fortfarande användaren till gamla styrdokument som ny sanning.
- [repo.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/repo.mjs#L48) håller kvar gamla docs och placeholders som `mandatoryDocs` eller `requiredPackages`.
- 256 tester går via demo-helpern, vilket gör testmassan bred men inte skyddad/live-verifierad.
- Struktur- och baselineskripten går grönt samtidigt som honesty-scannen rapporterar 60 blockerande productionfynd.

## Duplicate / Overlapping Material

- Flera gamla docs-kluster överlappar samma sakområden:
  - `docs/compliance/se/*`
  - `docs/domain/*`
  - `docs/policies/*`
  - `docs/test-plans/*`
  - `docs/runbooks/*`
  - `docs/implementation-control/*`
- Dubbla ops/runbook-spår finns fortfarande för bank reconciliation, close/reopen, replay/dead-letter och support/backoffice.
- Gamla final- och master-control-spår överlappar samma governance-teman med motstridigt bindningsspråk.

## Documentation Conflicts

- [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md#L7) och [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md#L286) pekar fortfarande ut gamla `implementation-control`-dokument som styrning.
- 21 bindningsmarkörer finns kvar i `docs/implementation-control`, inklusive:
  - [GO_LIVE_ROADMAP_FINAL.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md)
  - [PHASE_IMPLEMENTATION_LIBRARY_FINAL.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md)
  - [MASTER_BUILD_SEQUENCE_FINAL.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/MASTER_BUILD_SEQUENCE_FINAL.md#L4)
  - [MASTER_IMPLEMENTATION_BACKLOG.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/MASTER_IMPLEMENTATION_BACKLOG.md#L4)
- 9 bindningsmarkörer finns kvar i `docs/master-control`.
- 22 finns kvar i `docs/compliance`.
- 17 finns kvar i `docs/domain`.
- 15 finns kvar i `docs/policies`.
- 16 finns kvar i `docs/test-plans`.
- 7 finns kvar i `docs/ui`.
- 12 finns kvar i `docs/runbooks`.

## Stale Tests

- [phase1-account-catalog.test.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/unit/phase1-account-catalog.test.mjs#L14) använder fortfarande hårdkodad lokal repo-root.
- 256 tester är explicit kopplade till [demo-platform.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/helpers/demo-platform.mjs#L5).
- Två representativa tester som borde ge verklig signal blockerades här av miljöns `spawn EPERM`:
  - [phase1-account-catalog.test.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/unit/phase1-account-catalog.test.mjs)
  - [phase3-api-edge-hardening.test.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/integration/phase3-api-edge-hardening.test.mjs)
- Testmassan är därför delvis stale, delvis demo, och delvis miljöblockerad. Den är inte ren nog att fungera som domänsanning.

## Stale Scripts And Runbooks

- `package.json` är fortfarande full av PowerShell-bundna verify-kommandon.
- `scripts/verify-*.ps1` är inte normaliserade till ny rebuild-sanning.
- `scripts/verify-final-non-ui-readiness.ps1` har ett namn som fortfarande överdriver bevisvärdet.
- Flera runbooks innehåller absoluta lokala paths:
  - [fas-14-7-project-trial-demo-verification.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/fas-14-7-project-trial-demo-verification.md#L42)
  - [payroll-tax-decisions-verification.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/payroll-tax-decisions-verification.md#L38)
  - [payroll-input-snapshots-verification.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/payroll-input-snapshots-verification.md#L22)
  - [phase3-security-risk-controls-verification.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/phase3-security-risk-controls-verification.md#L56)
  - [restore-drill.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/restore-drill.md#L48)
  - [workbench-compatibility.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/workbench-compatibility.md#L34)
  - [work-item-queue-operations.md](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/work-item-queue-operations.md#L96)

## Critical Findings

### C-00-01 Rebuild-sanningen är ännu inte genomförd i repo-root
- severity: critical
- kategori: documentation governance
- exakt problem: Den nya sanningen finns i rebuild-dokumenten och nya `AGENTS.md`, men [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md#L7) och [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md#L286) pekar fortfarande ut gamla `implementation-control`-dokument som styrning.
- varför det är farligt: Alla senare domäner riskerar att läsas mot fel sanning och fel acceptansnivå.
- exakt filepath:
  - [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md)
  - [AGENTS.md](/Users/snobb/Desktop/Swedish%20ERP/AGENTS.md)
  - [MASTER_DOMAIN_ROADMAP.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/MASTER_DOMAIN_ROADMAP.md)
  - [MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/domankarta-rebuild/MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md)
- radreferens om möjligt:
  - [README.md#L7](/Users/snobb/Desktop/Swedish%20ERP/README.md#L7)
  - [README.md#L286](/Users/snobb/Desktop/Swedish%20ERP/README.md#L286)
- rekommenderad riktning: Gör rebuild-kedjan till enda synliga docs-sanning i root och flytta gamla styrdokument till historik/arkiv.
- status: rewrite

### C-00-02 119 falska bindningsanspråk ligger kvar utanför rebuild-kedjan
- severity: critical
- kategori: documentation sprawl
- exakt problem: `docs/implementation-control`, `docs/master-control`, `docs/compliance`, `docs/domain`, `docs/policies`, `docs/test-plans`, `docs/ui` och delar av `docs/runbooks` innehåller fortfarande `Status: Bindande/Binding`.
- varför det är farligt: Repo:t har fortfarande parallell sanning och kan inte granskas säkert domän för domän.
- exakt filepath:
  - [docs/implementation-control](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control)
  - [docs/master-control](/Users/snobb/Desktop/Swedish%20ERP/docs/master-control)
  - [docs/compliance](/Users/snobb/Desktop/Swedish%20ERP/docs/compliance)
  - [docs/domain](/Users/snobb/Desktop/Swedish%20ERP/docs/domain)
  - [docs/policies](/Users/snobb/Desktop/Swedish%20ERP/docs/policies)
  - [docs/test-plans](/Users/snobb/Desktop/Swedish%20ERP/docs/test-plans)
  - [docs/ui](/Users/snobb/Desktop/Swedish%20ERP/docs/ui)
  - [docs/runbooks](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks)
- radreferens om möjligt:
  - [ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md#L4](/Users/snobb/Desktop/Swedish%20ERP/docs/implementation-control/ACCOUNTING_TAX_PAYROLL_AND_REGULATED_LOGIC.md#L4)
  - [master-domain-map.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/master-control/master-domain-map.md#L6)
  - [accounting-foundation.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/compliance/se/accounting-foundation.md#L6)
  - [review-center.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/domain/review-center.md#L6)
  - [support-access-and-impersonation-policy.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/policies/support-access-and-impersonation-policy.md#L6)
  - [master-test-strategy.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/test-plans/master-test-strategy.md#L6)
  - [PUBLIC_SITE_AND_AUTH_SPEC.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md#L6)
  - [incident-response-and-production-hotfix.md#L6](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/incident-response-and-production-hotfix.md#L6)
- rekommenderad riktning: Nedgradera hela gamla docs-trädet systematiskt, inte fil för fil ad hoc.
- status: migrate

### C-00-03 45 dokument pekar på appar som inte finns
- severity: critical
- kategori: false completeness
- exakt problem: Dokumentationen antar fortfarande `apps/backoffice` och `apps/public-web` trots att faktiska appkataloger bara är `api`, `desktop-web`, `field-mobile`, `worker`.
- varför det är farligt: Produktens surface map blir falsk och smittar alla senare domäner, särskilt support/ops, UI och go-live.
- exakt filepath:
  - [docs](/Users/snobb/Desktop/Swedish%20ERP/docs)
  - [apps](/Users/snobb/Desktop/Swedish%20ERP/apps)
- radreferens om möjligt:
  - [BACKOFFICE_OPERATIONS_SPEC.md#L23](/Users/snobb/Desktop/Swedish%20ERP/docs/ui/BACKOFFICE_OPERATIONS_SPEC.md#L23)
  - [PUBLIC_SITE_AND_AUTH_SPEC.md#L23](/Users/snobb/Desktop/Swedish%20ERP/docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md#L23)
  - [master-code-impact-map.md#L224](/Users/snobb/Desktop/Swedish%20ERP/docs/master-control/master-code-impact-map.md#L224)
  - [support-access-and-impersonation-policy.md#L25](/Users/snobb/Desktop/Swedish%20ERP/docs/policies/support-access-and-impersonation-policy.md#L25)
- rekommenderad riktning: Markera alla sådana ytor som `planned historical raw material`, inte som aktiv repo-sanning.
- status: rewrite

### C-00-04 Strukturgrönt döljer 60 blockerande runtimefynd
- severity: critical
- kategori: verification integrity
- exakt problem: [lint.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lint.mjs), [typecheck.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/typecheck.mjs), [build.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/build.mjs) och [security-scan.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/security-scan.mjs) går grönt, medan [runtime-honesty-scan.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/runtime-honesty-scan.mjs) blockerar production-start med 60 findings.
- varför det är farligt: Repo:t ser färdigt ut när det inte är det, och fel delfaser kan markeras gröna.
- exakt filepath:
  - [lint.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lint.mjs)
  - [typecheck.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/typecheck.mjs)
  - [build.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/build.mjs)
  - [security-scan.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/security-scan.mjs)
  - [runtime-honesty-scan.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/runtime-honesty-scan.mjs)
  - [runtime-diagnostics.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/runtime-diagnostics.mjs#L354)
- radreferens om möjligt:
  - [runtime-diagnostics.mjs#L354](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/runtime-diagnostics.mjs#L354)
  - [runtime-diagnostics.mjs#L625](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/runtime-diagnostics.mjs#L625)
- rekommenderad riktning: Särskilj strukturkontroll från readiness och gör honesty-scan till hård gate för protected/live.
- status: harden

### C-00-05 Testsanningen är förorenad av demo-runtime och minst ett lokalt pathberoende test
- severity: critical
- kategori: test truth
- exakt problem: 256 testreferenser går via demo-helpern och [phase1-account-catalog.test.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/unit/phase1-account-catalog.test.mjs#L14) bär fortfarande hårdkodad lokal path.
- varför det är farligt: Testbevisen kan inte användas som ren go-live- eller protected-reality-signal.
- exakt filepath:
  - [demo-platform.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/helpers/demo-platform.mjs)
  - [phase1-account-catalog.test.mjs](/Users/snobb/Desktop/Swedish%20ERP/tests/unit/phase1-account-catalog.test.mjs)
- radreferens om möjligt:
  - [demo-platform.mjs#L7](/Users/snobb/Desktop/Swedish%20ERP/tests/helpers/demo-platform.mjs#L7)
  - [demo-platform.mjs#L9](/Users/snobb/Desktop/Swedish%20ERP/tests/helpers/demo-platform.mjs#L9)
  - [demo-platform.mjs#L13](/Users/snobb/Desktop/Swedish%20ERP/tests/helpers/demo-platform.mjs#L13)
  - [phase1-account-catalog.test.mjs#L14](/Users/snobb/Desktop/Swedish%20ERP/tests/unit/phase1-account-catalog.test.mjs#L14)
- rekommenderad riktning: Inför test truth registry, karantänmärk demo-helperfamiljen och rensa hårdkodade lokala paths.
- status: rewrite

### C-00-06 Protected runtime är fortfarande blockerad av memory truth, capability shadowing, stub provider och software_kms
- severity: critical
- kategori: runtime truth / security
- exakt problem: Production honesty-scan detekterar memory-store, flat-merge-collisions, `Map`-baserad auth truth, BankID-stub och `software_kms`.
- varför det är farligt: Alla senare domäner som rör security, persistence, payroll, banking, tax och operations blir fel om detta inte saneras först.
- exakt filepath:
  - [platform.mjs](/Users/snobb/Desktop/Swedish%20ERP/apps/api/src/platform.mjs)
  - [runtime-diagnostics.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/runtime-diagnostics.mjs)
  - [index.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-org-auth/src/index.mjs)
  - [crypto.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-core/src/crypto.mjs)
  - [secrets.mjs](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-core/src/secrets.mjs)
- radreferens om möjligt:
  - [platform.mjs#L814](/Users/snobb/Desktop/Swedish%20ERP/apps/api/src/platform.mjs#L814)
  - [platform.mjs#L1717](/Users/snobb/Desktop/Swedish%20ERP/apps/api/src/platform.mjs#L1717)
  - [runtime-diagnostics.mjs#L539](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/runtime-diagnostics.mjs#L539)
  - [runtime-diagnostics.mjs#L603](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/runtime-diagnostics.mjs#L603)
  - [index.mjs#L438](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-org-auth/src/index.mjs#L438)
  - [index.mjs#L2779](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-org-auth/src/index.mjs#L2779)
  - [crypto.mjs#L6](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-core/src/crypto.mjs#L6)
  - [secrets.mjs#L103](/Users/snobb/Desktop/Swedish%20ERP/packages/domain-core/src/secrets.mjs#L103)
- rekommenderad riktning: Tagga dessa som cross-domain blockers och gör dem till hårda beroenden för senare faser, inte till “vi fixar sen”.
- status: rewrite

### C-00-07 Repo-manifestet håller kvar falska krav och placeholderpaket
- severity: critical
- kategori: repo hygiene
- exakt problem: [repo.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/repo.mjs#L48) listar gamla docs som `mandatoryDocs` och placeholderpaket som `requiredPackages`.
- varför det är farligt: Cleanup blockeras och falsk completeness låses in i repo-verktygen.
- exakt filepath:
  - [repo.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/repo.mjs)
- radreferens om möjligt:
  - [repo.mjs#L48](/Users/snobb/Desktop/Swedish%20ERP/scripts/lib/repo.mjs#L48)
- rekommenderad riktning: Dela upp `active_truth`, `legacy_raw_material`, `placeholder`, `active_runtime` och `shell_surface`.
- status: rewrite

## High Findings

### H-00-01 Verify-familjen är fortfarande Windows-bunden och semantiskt överladdad
- severity: high
- kategori: scripts
- exakt problem: `package.json` och `scripts/verify-*.ps1` gör verifieringskedjan PowerShell-bunden och låter flera skript heta som full readiness trots smalare bevisvärde.
- varför det är farligt: Portabilitet och sanningsvärde blir sämre än nödvändigt.
- exakt filepath:
  - [package.json](/Users/snobb/Desktop/Swedish%20ERP/package.json#L24)
  - [scripts](/Users/snobb/Desktop/Swedish%20ERP/scripts)
- radreferens om möjligt:
  - [package.json#L24](/Users/snobb/Desktop/Swedish%20ERP/package.json#L24)
- rekommenderad riktning: Ersätt eller nedgradera verify-familjen och inför en ny rebuild-gatefamilj.
- status: replace

### H-00-02 Runbooks med absoluta lokala paths är operativt osanna
- severity: high
- kategori: runbook integrity
- exakt problem: Flera runbooks bär lokala absoluta paths eller lokala repo-länkar.
- varför det är farligt: De ser körbara ut men är lokalt låsta till en tidigare maskinlayout.
- exakt filepath:
  - [docs/runbooks](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks)
- radreferens om möjligt:
  - [restore-drill.md#L48](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/restore-drill.md#L48)
  - [workbench-compatibility.md#L34](/Users/snobb/Desktop/Swedish%20ERP/docs/runbooks/workbench-compatibility.md#L34)
- rekommenderad riktning: Flytta dem till `legacy raw material` eller skriv om dem helt till repo-relativ form.
- status: rewrite

### H-00-03 UI-dokumenten är inte bara gamla, de är scopefarliga
- severity: high
- kategori: surface drift
- exakt problem: `docs/ui/*` beskriver existerande public-web/backoffice-surface som repo:t inte har.
- varför det är farligt: UI- och ops-domänerna får fel startpunkt.
- exakt filepath:
  - [docs/ui](/Users/snobb/Desktop/Swedish%20ERP/docs/ui)
- radreferens om möjligt:
  - [BACKOFFICE_OPERATIONS_SPEC.md#L23](/Users/snobb/Desktop/Swedish%20ERP/docs/ui/BACKOFFICE_OPERATIONS_SPEC.md#L23)
  - [PUBLIC_SITE_AND_AUTH_SPEC.md#L23](/Users/snobb/Desktop/Swedish%20ERP/docs/ui/PUBLIC_SITE_AND_AUTH_SPEC.md#L23)
- rekommenderad riktning: Arkivera eller skriv om hela UI-klustret som icke-bindande framtidsmaterial.
- status: archive

### H-00-04 README översäljer bredd och styrning
- severity: high
- kategori: root docs
- exakt problem: README blandar produktvision, gamla styrdokument och bred capability-lista på ett sätt som inte speglar ny docs-sanning.
- varför det är farligt: Nya granskningar startar i fel dokument och fel produktbild.
- exakt filepath:
  - [README.md](/Users/snobb/Desktop/Swedish%20ERP/README.md)
- radreferens om möjligt:
  - [README.md#L7](/Users/snobb/Desktop/Swedish%20ERP/README.md#L7)
  - [README.md#L286](/Users/snobb/Desktop/Swedish%20ERP/README.md#L286)
- rekommenderad riktning: Skriv om README så att den pekar enbart till rebuild-dokumenten och markerar allt annat som legacy/raw material.
- status: rewrite

## Medium Findings

### M-00-01 Python-scaffold och placeholder-infra bör inte ligga i aktiv repo-sanning
- severity: medium
- kategori: dead scaffold
- exakt problem: Python-spåret och `infra/terraform`/`infra/ecs` ser ut som framtida teknikspår men saknar aktiv roll.
- varför det är farligt: De drar in onödigt scope och skapar falsk arkitekturbredd.
- exakt filepath:
  - [pyproject.toml](/Users/snobb/Desktop/Swedish%20ERP/pyproject.toml)
  - [src/swedish_erp_python](/Users/snobb/Desktop/Swedish%20ERP/src/swedish_erp_python)
  - [infra/terraform](/Users/snobb/Desktop/Swedish%20ERP/infra/terraform)
  - [infra/ecs](/Users/snobb/Desktop/Swedish%20ERP/infra/ecs)
- radreferens om möjligt: inte tillämpligt på klusternivå
- rekommenderad riktning: Flytta till arkiv eller markera som explicit placeholderzon utanför aktiv sanning.
- status: archive

### M-00-02 `packages/integration-core` och `packages/test-fixtures` håller kvar spökinfrastruktur
- severity: medium
- kategori: placeholder package
- exakt problem: Paketen finns kvar som kontraktsskal men saknar tydlig aktiv runtime-roll.
- varför det är farligt: De ger falsk känsla av färdig integrations- och fixturekärna.
- exakt filepath:
  - [packages/integration-core](/Users/snobb/Desktop/Swedish%20ERP/packages/integration-core)
  - [packages/test-fixtures](/Users/snobb/Desktop/Swedish%20ERP/packages/test-fixtures)
- radreferens om möjligt:
  - [index.ts](/Users/snobb/Desktop/Swedish%20ERP/packages/integration-core/src/index.ts)
  - [index.ts](/Users/snobb/Desktop/Swedish%20ERP/packages/test-fixtures/src/index.ts)
- rekommenderad riktning: Arkivera eller integrera på riktigt, men sluta behandla dem som required.
- status: archive

### M-00-03 Shell-apparna måste etiketteras hårdare
- severity: medium
- kategori: surface labeling
- exakt problem: `desktop-web` och `field-mobile` finns på riktigt men behöver bättre märkning som shellar i root- och governance-dokument.
- varför det är farligt: De kan misstas för full produktredo yta.
- exakt filepath:
  - [apps/desktop-web](/Users/snobb/Desktop/Swedish%20ERP/apps/desktop-web)
  - [apps/field-mobile](/Users/snobb/Desktop/Swedish%20ERP/apps/field-mobile)
- radreferens om möjligt: inte nödvändigt på klusternivå
- rekommenderad riktning: Märk dem som `verified shell`, inte som full yta.
- status: harden

## Low Findings

### L-00-01 `doctor.mjs` blandar miljöblocker och repo-blocker
- severity: low
- kategori: diagnostics
- exakt problem: `doctor` visar blockerade verktyg i sandboxen men utan hård skiljelinje mot repo-fel.
- varför det är farligt: Operatören kan feltolka miljöblocker som kod-/repo-blocker.
- exakt filepath:
  - [doctor.mjs](/Users/snobb/Desktop/Swedish%20ERP/scripts/doctor.mjs)
- radreferens om möjligt: inte nödvändigt här
- rekommenderad riktning: Separera `environment blocked` från `repo blocked` i utskriften.
- status: harden

## Cross-Domain Blockers

1. Den nya sanningen är inte genomförd i root-dokument, manifests och legacy-docs.
2. Production/protected runtime är blockerad av in-memory truth, capability shadowing, stub provider och `software_kms`.
3. Testpyramiden är förorenad av demo-runtime och minst ett kvarvarande lokalt pathberoende test.
4. Docs-surface map är fel eftersom 45 dokument refererar saknade appar.
5. Verify-familjen ger falska eller överladdade gröna signaler.
6. Runbooks är inte portabla nog för att fungera som aktiv operationssanning.

## Repo Cleanup Priorities

1. P0: lås sanningen till rebuild-kedjan i root och manifests
2. P1: nedgradera hela gamla docs-trädet systematiskt
3. P2: bygg ny test-truth-klassificering och karantän för demo-runtime
4. P3: skriv om verify-familj, README och `scripts/lib/repo.mjs`
5. P4: dokumentera och bära vidare runtime-honesty-blockers som hårda beroenden för Domän 1-17

## Repo Reality Vs Product Intent

- Vilka dokument ska bort eller markeras historiska?
  - I praktiken hela gamla docs-sanningen utanför rebuild-trädet.
- Finns det kod som ligger kvar men inte arbetar?
  - Ja. Python-scaffold, infra-skeletons, placeholderpaket.
- Finns det halvbörjade eller övergivna spår?
  - Ja. Public-web/backoffice som docs-sanning utan faktisk app.
- Finns det duplicerad logik?
  - Ja. Styrningsdokument, policies, domain/compliance/test-plan-spår och flera runbook-par.
- Finns det tester som ger falsk trygghet?
  - Ja. Demo-helperfamiljen och gamla verify-kedjan.
- Finns det scripts/runbooks som inte längre speglar verkligheten?
  - Ja. PowerShell-verify-familjen och flera runbooks med lokala paths.
- Finns det gamla stubbar/demo/test-paths i verkliga runtimevägar?
  - Ja. Demo-platform, BankID test helper, memory truth, `software_kms`.
- Är repo:t så stökigt att senare domängranskningar riskerar att bli fel?
  - Ja. Det är fortfarande sant tills docs-sanningen och test-sanningen sanerats.
- Vilka capability-kluster syns redan nu?
  - runtime/core/security/persistence
  - docs/governance/rebuild
  - accounting/tax/payroll
  - documents/review/search
  - integrations/public/partner/webhooks
  - projects/field/personalliggare/ID06
  - support/backoffice/incidents/replay
  - pilot/parity/GA
- Vilka laterala blockerare måste lösas innan senare domängranskningar blir säkra?
  - docs truth lock
  - prune/supersession map
  - test truth map
  - surface reality map
  - runtime blocker register

## Input To Låter Manual Domain Design

- Appar:
  - faktisk: `api`, `desktop-web`, `field-mobile`, `worker`
  - saknas men dokumenteras felaktigt: `public-web`, `backoffice`
- Stora kluster som faktiskt finns i kod:
  - `domain-core`, `domain-org-auth`, `domain-ledger`, `domain-vat`, `domain-ar`, `domain-ap`, `domain-banking`, `domain-tax-account`
  - `domain-hr`, `domain-time`, `domain-balances`, `domain-collective-agreements`, `domain-payroll`, `domain-benefits`, `domain-travel`, `domain-pension`
  - `domain-documents`, `domain-document-classification`, `domain-import-cases`, `domain-review-center`, `domain-search`, `domain-reporting`
  - `domain-projects`, `domain-kalkyl`, `domain-field`, `domain-personalliggare`, `domain-id06`, `domain-egenkontroll`
  - `domain-integrations`, `domain-annual-reporting`, `domain-hus`, `domain-owner-distributions`
- Domänindelning får dock inte låsas vidare förrän Domän 0-saneringen är genomförd.

## Unscoped Or Risky Areas

- Full protected Postgres-verifiering kräver verklig anslutning.
- Flera testkörningar blockerades av miljöns `spawn EPERM`, så alla röda testresultat i denna körning är inte repo-buggar.
- Runbookmassan är för stor för full rad-för-rad klassning i en enda körning; prune-mapen måste därför använda tydliga kluster där full individuell klassning ännu inte är klar.
- Regulatorisk detaljsanning i bokföring, skatt, payroll, BAS, AGI och HUS hör hemma i senare domäner och ska inte låsas i Domän 0.

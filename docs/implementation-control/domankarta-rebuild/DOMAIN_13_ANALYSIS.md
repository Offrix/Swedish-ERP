# DOMAIN_13_ANALYSIS

## Scope

Domän 13 täcker den verkliga read-model-, reporting-, search-, notification-, activity- och cockpit-kärnan för:
- reporting definitions, snapshots, metrics, exports och reconciliation
- search projection contracts, indexed documents, object profiles, workbenches, saved views och widgets
- mission control / cockpit surfaces för finance, payroll, cutover och trial conversion
- notifications, digest, escalations och delivery evidence
- activity feed, visibility decisions, rebuild och replay
- route contracts, surface policies, retention, masking och exportgränser

Verifierad repo-evidens:
- `packages/domain-reporting/src/index.mjs`
- `packages/domain-search/src/engine.mjs`
- `packages/domain-notifications/src/engine.mjs`
- `packages/domain-activity/src/engine.mjs`
- `apps/api/src/mission-control.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/surface-policies.mjs`
- `apps/api/src/server.mjs`
- `packages/db/migrations/20260321070000_phase3_reporting_reconciliation.sql`
- `packages/db/migrations/20260322110000_phase11_reporting_exports.sql`
- `packages/db/migrations/20260322130000_phase11_close_workbench.sql`
- `packages/db/migrations/20260324150000_phase14_notifications_activity.sql`
- `packages/db/migrations/20260325010000_phase14_search_projection_registry.sql`
- `tests/unit/reporting-phase11-1.test.mjs`
- `tests/unit/phase14-notifications-activity.test.mjs`
- `tests/unit/phase15-reporting-metrics.test.mjs`
- `tests/unit/phase15-search-workbench-runtime.test.mjs`
- `tests/unit/phase35-search-read-model-contracts.test.mjs`
- `tests/integration/phase15-search-workbench-api.test.mjs`
- `tests/integration/phase15-mission-control-api.test.mjs`
- `tests/integration/phase33-search-api.test.mjs`
- `tests/integration/phase33-search-team-scope-api.test.mjs`
- `tests/integration/phase35-search-read-model-api.test.mjs`

Officiella källor låsta för domänen:
- [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- [IMY: grundläggande principer enligt GDPR](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/grundlaggande-principer/)
- [IMY: säkerhetsåtgärder](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/informationssakerhet/sakerhetsatgarder/)

Domslut:
- Domänen innehåller verkliga route- och runtimekedjor för reporting, search, workbenches, widgets, mission control, notifications och activity.
- Domänen är ändå inte go-live-klar.
- Total klassning: `partial reality`.
- Kritiska blockerare: in-memory truth i reporting/search/notifications/activity, fake-live export artifacts, shadow-DB-lik search payloads, falsk freshness i object profiles/workbenches och otillräckligt runtime-bevisade locked reporting-/workbench-kedjor.

## Verified Reality

- `verified reality` reporting routes, report definitions, report snapshots och reconciliation runs finns som verkliga runtimeobjekt. Proof: `packages/domain-reporting/src/index.mjs:412-1035`, `apps/api/src/server.mjs:4274-4655`.
- `verified reality` metrics och exportjobb är egna runtimeobjekt och inte bara UI-lokala etiketter. Proof: `packages/domain-reporting/src/index.mjs:2446-2581`, `packages/db/migrations/20260322110000_phase11_reporting_exports.sql`.
- `verified reality` search har first-class projection contracts, indexed documents, reindex requests, saved views och widgets. Proof: `packages/domain-search/src/engine.mjs:171-247`, `827-1032`, `packages/db/migrations/20260325010000_phase14_search_projection_registry.sql`.
- `verified reality` object profile och workbench routes finns som riktiga API-surface-kontrakt. Proof: `apps/api/src/route-contracts.mjs:478-509`, `apps/api/src/server.mjs:4683-4963`.
- `verified reality` notifications och activity har verkliga read/write paths, digestlogik och auditspår. Proof: `packages/domain-notifications/src/engine.mjs:74-368`, `717-810`, `packages/domain-activity/src/engine.mjs:43-239`.
- `verified reality` mission control bygger verkliga cockpitvyer över finance close, payroll submission, cutover control och trial conversion. Proof: `apps/api/src/mission-control.mjs:82-393`.

## Partial Reality

- `partial reality` reporting har DB-schema för snapshots och reconciliation, men runtime håller fortfarande store state i minnet. Proof: `packages/domain-reporting/src/index.mjs:340-350`.
- `partial reality` search har DB-schema för projection contracts och documents, men runtime search engine är fortfarande in-memory. Proof: `packages/domain-search/src/engine.mjs:70-85`.
- `partial reality` notifications och activity har migrations för durable lagring, men runtime använder fortfarande endast lokalt state. Proof: `packages/domain-notifications/src/engine.mjs:19-35`, `packages/domain-activity/src/engine.mjs:13-22`, `packages/db/migrations/20260324150000_phase14_notifications_activity.sql`.
- `partial reality` reconciliation har signoff, men saknar full close/reopen/escalation/correction-livscykel. Proof: `packages/domain-reporting/src/index.mjs:797-1035`.
- `partial reality` saved view compatibility scan finns, men det finns ingen hård gate som invalidierar brytande kontraktsdrift innan read surface används. Proof: `packages/domain-search/src/engine.mjs:716-777`.

## Legacy

- `legacy` `upsertWorkItem` lever kvar parallellt med `upsertOperationalWorkItem`, vilket splittrar operator truth mellan gammal och ny work-item-modell. Proof: `packages/domain-core/src/index.mjs:1660-1811`, `packages/domain-core/src/close.mjs:196-222`, `642-655`, `865-878`, `952-965`.
- `legacy` runbooks för reporting/search/mission control pekar fortfarande på gamla bindande dokument och gamla faspåståenden. Proof: `docs/runbooks/fas-11-reporting-verification.md`, `docs/runbooks/search-index-rebuild-and-repair.md`, `docs/runbooks/phase15-mission-control-verification.md`.
- `legacy` demo seeds materialiserar falsk delivered/export/signoff-truth. Proof: `packages/db/seeds/20260321071000_phase3_reporting_reconciliation_demo_seed.sql`, `20260322111000_phase11_reporting_exports_demo_seed.sql`, `20260322131000_phase11_close_workbench_demo_seed.sql`.

## Dead Code

- `dead` tidigare sanning att reporting/search/notifications/activity skulle vara färdiga durable operationsdomäner stöds inte av runtime och ska behandlas som död dokumentation.
- `dead` implicit antägande att gamla finaldokument fortfarande styr domänen är ogiltigt och ska rensas ur runbooks och verifieringsdokument.

## Misleading / False Completeness

- `misleading` `report_definitions` och `report_snapshots` finns i DB, men runtimeklassningen kan ge sken av durable reporting fast faktisk write path ligger i minne.
- `misleading` `getObjectProfile` sätter `status: "contract_defined"` när dokument saknas, vilket ger sken av färdig projektion i stället för blockerad read model. Proof: `packages/domain-search/src/engine.mjs:390-468`.
- `misleading` `getWorkbench` sätter `staleProjection = false` och speglar `targetVersion` från första träffen eller `now`, vilket kan dölja att workbench är stale eller ofullständig. Proof: `packages/domain-search/src/engine.mjs:489-589`.
- `misleading` report export artifacts ser levererade ut men skrivs som `%PDF-FAKE-1.0`, `XLSX-FAKE-1.0` och `memory://...`. Proof: `packages/domain-reporting/src/index.mjs:2583-2621`.
- `misleading` search/read-model-kontrakt ser first-class ut i tester och DB, men query governance, masking och retention är inte tillräckligt hårt styrda i runtime.

## Reporting / Reconciliation / Export Findings

- `critical` Reporting truth är in-memory och inte canonical durable runtime. Farligt eftersom rapportsanning kan försvinna vid restart och inte uppfyller bokföringsmässiga krav på spårbar information. Proof: `packages/domain-reporting/src/index.mjs:340-350`. Riktning: `replace`.
- `critical` Report snapshots saknar first-class lifecycle för `preliminary`, `locked`, `superseded`, `reopened`. Farligt eftersom snapshot-sanning och omkörning inte kan styras deterministiskt. Proof: `packages/domain-reporting/src/index.mjs:490-597`, `packages/db/migrations/20260321070000_phase3_reporting_reconciliation.sql`. Riktning: `rewrite`.
- `high` Drilldown och journal search är inte fullt snapshot-scopeade utan läser live ledger/documents efter snapshot. Farligt eftersom rapportbevis och drilldown kan visa annan sanning än låst rapport. Proof: `packages/domain-reporting/src/index.mjs:603-615`, `745-795`. Riktning: `rewrite`.
- `high` Reconciliation lifecycle stannar i praktiken vid `signed` och saknar explicit `closed`, `reopened`, `rerun_required`, `corrected`. Farligt eftersom close-kedjan blir för tunn för svensk close/governance. Proof: `packages/domain-reporting/src/index.mjs:797-1035`. Riktning: `rewrite`.
- `critical` Export artifacts är fake-live och saknar riktig receiptkedja, storage profile och distribution governance. Farligt eftersom export kan se levererad ut utan verklig artifact-integritet. Proof: `packages/domain-reporting/src/index.mjs:2583-2621`. Riktning: `replace`.

## Search / Object Profile / Workbench Findings

- `critical` Search accepterar rå `searchText`, `snippet`, `detailPayload` och `workbenchPayload` från källdomäner. Farligt eftersom sökindex blir shadow database och dataläckageyta. Proof: `packages/domain-search/src/engine.mjs:1412-1457`. Riktning: `rewrite`.
- `critical` Freshness i object profile/workbench är falsk eller härledd från ad hoc-fält i stället för verkliga checkpoints. Farligt eftersom användaren kan fatta beslut på stale data utan varning. Proof: `packages/domain-search/src/engine.mjs:390-468`, `489-589`. Riktning: `replace`.
- `high` Query/ranking governance bygger på `includes()`-logik och svag filterstyrning. Farligt eftersom saved views, widgets och workbenches blir oförutsägbara och svåra att säkra. Proof: `packages/domain-search/src/engine.mjs:1460-1507`. Riktning: `rewrite`.
- `medium` Default permission summary och fallbackstatus `contract_defined` är för breda och missvisande. Farligt eftersom read surfaces kan verka tillåtna innan riktiga permission-reasons finns. Proof: `packages/domain-search/src/engine.mjs:1549-1556`, `390-468`. Riktning: `harden`.
- `medium` Saved view compatibility scan är efterhandskontroll i stället för blockerande invalidation. Farligt eftersom brutna views kan leva vidare som om de vore säkra. Proof: `packages/domain-search/src/engine.mjs:716-777`. Riktning: `harden`.

## Notifications / Activity / Mission Control Findings

- `high` Notifications är in-memory och saknar durable outbox/provider receipt model. Farligt eftersom alerts, digest och escalations kan tappas eller dubbelskickas. Proof: `packages/domain-notifications/src/engine.mjs:19-35`, `196-241`. Riktning: `replace`.
- `high` Activity rebuild är inte riktig replay från source events utan loggar bara rebuild run. Farligt eftersom activity feed inte går att återställa deterministiskt. Proof: `packages/domain-activity/src/engine.mjs:220-239`. Riktning: `rewrite`.
- `medium` Activity hide muterar befintligt entry-status i stället för separat visibility decision object. Farligt eftersom policybeslut och ursprunglig aktivitet blandas. Proof: `packages/domain-activity/src/engine.mjs:204-218`. Riktning: `harden`.
- `high` Mission control bygger live-aggregation från domänmetoder i requesttid, inte first-class cockpit snapshots med freshness och evidence. Farligt eftersom cockpit kan visa skenbar kontroll utan explicit data-age och rebuild-status. Proof: `apps/api/src/mission-control.mjs:82-393`. Riktning: `rewrite`.

## Route / Surface / Audit / Retention Findings

- `medium` Mission control saknar egen tydlig surface-policy-familj. Farligt eftersom cockpitytor riskerar att ärva för breda eller felaktiga read boundaries. Proof: `apps/api/src/surface-policies.mjs:47-57`, `227-258`. Riktning: `harden`.
- `high` Det finns ingen hård retentionmodell som skiljer bokföringsmässig reporting truth från sökindex/workbench-cache. Farligt eftersom BFL-bevarande och GDPR-minimering kan kollidera. Proof: kombinerad repo- och schemaanalys över reporting/search. Riktning: `rewrite`.
- `high` Support/export/audit-gränser för reporting/search/workbench är inte tillräckligt kopplade till watermark, approval och explicit actor receipt. Farligt eftersom read surfaces och exports kan bli bredare än policyn tillåter. Proof: `apps/api/src/route-contracts.mjs:413`, `478-509`, `apps/api/src/server.mjs:531-624`. Riktning: `harden`.

## Runbook / Seed / Legacy Purge Findings

- `high` `locked-reporting.md` och `workbench-operations.md` finns nu i rebuild-kedjan men måste hållas strikt synkade med runtime, release gates och operatorbevis. Riktning: `harden`.
- `high` existerande runbooks bär falska bindningspåståenden till gamla finaldokument. Farligt eftersom de styr operativt beteende mot osann modell. Proof: `docs/runbooks/fas-11-reporting-verification.md`, `docs/runbooks/search-index-rebuild-and-repair.md`. Riktning: `rewrite`.
- `medium` demo seeds producerar falsk signoff- och exportevidence som kan förväxlas med riktig runtime readiness. Riktning: `archive` eller `move to test-only`.

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| reporting snapshots | first-class | partial reality, in-memory runtime | `packages/domain-reporting/src/index.mjs:340-597` | ja |
| reconciliation signoff | first-class close support | partial reality, thin lifecycle | `packages/domain-reporting/src/index.mjs:797-1035` | ja |
| report exports | delivered artifacts | fake-live artifacts | `packages/domain-reporting/src/index.mjs:2583-2621` | ja |
| search index | first-class projection runtime | partial reality, in-memory engine | `packages/domain-search/src/engine.mjs:70-85` | ja |
| object profiles | fresh/stale-aware | false completeness | `packages/domain-search/src/engine.mjs:390-589` | ja |
| workbenches | governed read models | partial reality with weak freshness | `packages/domain-search/src/engine.mjs:489-589` | ja |
| mission control | cockpit surface | live aggregation without persisted freshness | `apps/api/src/mission-control.mjs:82-393` | ja |
| notifications | alert runtime | in-memory only | `packages/domain-notifications/src/engine.mjs:19-241` | ja |
| activity | replayable projection | partial reality, rebuild not replay | `packages/domain-activity/src/engine.mjs:204-239` | ja |

## Search Safety Matrix

| area | actual runtime path | observed risk | proof | blocker |
| --- | --- | --- | --- | --- |
| indexed payload | source payload into index | shadow DB / leakage | `packages/domain-search/src/engine.mjs:1412-1457` | ja |
| freshness | object profile/workbench | stale hidden as fresh | `packages/domain-search/src/engine.mjs:390-589` | ja |
| ranking | substring query | weak predictability | `packages/domain-search/src/engine.mjs:1460-1507` | nej |
| saved views | compatibility scan only | broken views survive | `packages/domain-search/src/engine.mjs:716-777` | nej |
| permission fallback | default summary | över-broad / misleading | `packages/domain-search/src/engine.mjs:1549-1556` | nej |

## Critical Findings

- reporting truth måste flyttas från in-memory till canonical durable repository
- locked/preliminary/superseded snapshot lifecycle måste byggas
- fake-live export artifacts måste bort och ersättas med riktiga artifact/receiptkedjor
- search måste sluta lagra rå payload som shadow database
- freshness/checkpoint truth för object profiles och workbenches måste bli first-class

## High Findings

- snapshot drilldown och journal search måste bli strikt snapshot-scopeade
- reconciliation måste få full close/reopen/rerun/correction-lifecycle
- notifications måste få durable outbox/provider receipt model
- activity rebuild måste bli riktig replay från source events
- mission control måste få persisted cockpit snapshots med freshness och blockers
- work-item drift mellan gammal och ny modell måste stängas
- retention och support/export-gränser måste låsas hårdare
- saknade runbooks och gamla bindningspåståenden måste rensas

## Medium Findings

- saved-view compatibility måste invalidiera brutna views, inte bara rapportera dem
- visibility decision för activity måste separeras från activity entry
- mission control måste få egen surface-policy-familj
- demo seeds måste bort från alla miljöer utanför test-only

## Cross-Domain Blockers

- Domän 1 måste låsa durable repository/path truth för reporting/search/notifications/activity.
- Domän 2 måste låsa trust, masking, watermark och permission reasons för read surfaces och exports.
- Domän 3 och 4 måste låsa accounting evidence, retention och audit policy för locked reporting.
- Domän 16 måste låsa support/backoffice/replay/runbook-driven operations för reporting/search/mission control.

## Go-Live Blockers

- inga legal-effect reporting/search/notification/activity-ytor får gå live med in-memory truth
- report exports får inte gå live med fake artifacts
- search/workbench får inte gå live utan riktig freshness, masking och retention
- mission control får inte användas som operativ cockpit utan explicit persisted freshness/blocker model
- nya runbooks för locked reporting och workbench operations måste finnas innan driftacceptans

## Repo Reality Vs Intended Reporting / Search / Workbench Model

Repo:t har verkliga surfaces och verkliga domänfunktioner, men inte den styrda durability-, masking-, freshness- och exportmodell som krävs för att reporting, search, workbenches, notifications och cockpitytor ska kunna fungera som tillförlitlig operations- och revisionssanning. Domän 13 ska därför behandlas som en verklig men ofullständig kärna: användbar som råmaterial, inte godkänd som slutlig modell.

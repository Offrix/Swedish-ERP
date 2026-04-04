# DOMAIN_12_ANALYSIS

## Scope

Domän 12 täcker den verkliga project-/field-/vertikalkärnan för:
- project commercial core
- quote handoff, agreement och governing commercial lineage
- kalkyl, budget, revenue plan, billing plan och invoice readiness
- WIP, revenue recognition, ledger bridge och profitability mission control
- field operational cases, offline sync, conflicts och finance handoff
- personalliggare, kiosk/device trust, attendance corrections och export
- ID06 verification, workplace binding, work pass och evidence export
- trial/demo, import batch, live conversion, parallel run och reopen/rerun

Verifierad repo-evidens:
- `packages/domain-projects/src/index.mjs`
- `packages/domain-field/src/index.mjs`
- `packages/domain-personalliggare/src/index.mjs`
- `packages/domain-id06/src/index.mjs`
- `packages/domain-kalkyl/src/index.mjs`
- `apps/api/src/platform.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/server.mjs`
- `packages/db/migrations/20260322020000_phase10_projects_budget_followup.sql`
- `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql`
- `packages/db/migrations/20260325034000_phase14_id06_domain.sql`
- `tests/integration/phase14-project-wip-ledger-api.test.mjs`
- `tests/integration/phase14-field-operational-pack-api.test.mjs`
- `tests/integration/phase28-id06-api.test.mjs`
- `tests/integration/phase29-personalliggare-identity-api.test.mjs`
- `tests/integration/phase31-kalkyl-api.test.mjs`

Officiella källor låsta för domänen:
- [Bokföringsnämnden K2 årsredovisning i mindre företag](https://www.bfn.se/wp-content/uploads/vl16-10-k2ar-kons2024.pdf)
- [Skatteverket: personalliggare i byggbranschen](https://skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarebyggbranschen.4.7be5268414bea0646949797.html)
- [Skatteverket: schema/XML för personalliggare i byggbranschen](https://www.skatteverket.se/foretag/etjansterochblanketter/allaetjanster/schemalagerxml/personalliggareibyggbranschen.4.5a85666214dbad743ff34e0.html)
- [Skatteverket: förteckning över bygg- och anläggningstjänster vid omvänd byggmoms](https://skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn/forteckningoverbyggochanlaggningstjanster/b.4.b1014b415f3321c0de37c1.html)
- [ID06: ID06-kort](https://id06.se/id06-kort/)
- [ID06: ID06 loggningsindex](https://id06.se/id06-loggningsindex/)

Domslut:
- Domänen innehåller verklig runtime för projekt, WIP-bokning, kalkyl, field, personalliggare och ID06.
- Domänen är ändå inte go-live-klar.
- Total klassning: `partial reality`.
- Kritiska blockerare: memory-default för truth mode, för svag dataklassning, mutabel commercial lineage, auto-approved budgets, hårdkodad personalliggare-threshold, fake-live ID06 verification/workplace fallback och avsaknad av officiell personalliggare-export.

## Verified Reality

- `verified reality` project core är mer generell än bygg-/field-specialfall. General core skiljs från vertikala work models i katalogerna för work model codes. Proof: `packages/domain-projects/src/index.mjs:191-212`.
- `verified reality` quote handoff materialiserar verkliga project-side objekt och gör inte upstream quote till fortsatt source of truth efter handoff. Proof: `packages/domain-projects/src/index.mjs:3035-3078`.
- `verified reality` trial scenarios och simulationer markeras uttryckligen utan legal effect. Proof: `packages/domain-projects/src/index.mjs:1171-1182`.
- `verified reality` WIP-ledger-bridge postar verkliga journalrader via ledger path och är idempotent på samma cutoff/balance state. Proof: `packages/domain-projects/src/index.mjs:4440-4520`, `tests/integration/phase14-project-wip-ledger-api.test.mjs:173-220`.
- `verified reality` profitability snapshot bygger på verkliga källor från payroll, ÄR, AP, time och HUS, inte bara UI-lokala fält. Proof: `packages/domain-projects/src/index.mjs:6560-6855`.
- `verified reality` invoice readiness har explicit blocker/review-logik och returnerar `blocked`, `review_required` eller `ready`. Proof: `packages/domain-projects/src/index.mjs:6990-7088`.
- `verified reality` field finance handoff skapar kandidatlinjer och markerar uttryckligen `financeTruthOwner: "projects"`. Proof: `packages/domain-field/src/index.mjs:960-1005`, `tests/integration/phase14-field-operational-pack-api.test.mjs:358-368`.
- `verified reality` offline envelopes i field är idempotenta på `clientMutationId` och skapar conflict/evidence-spår. Proof: `packages/domain-field/src/index.mjs:1054-1165`.
- `verified reality` personalliggare kräver trusted kiosk för kiosk-capture när threshold pathen gäller. Proof: `packages/domain-personalliggare/src/index.mjs:296-303`, `tests/integration/phase29-personalliggare-identity-api.test.mjs:128-165`.
- `verified reality` attendance correction sker genom correction chain som bevarar originalevent och skapar nytt correction-event. Proof: `packages/domain-personalliggare/src/index.mjs:381-452`.
- `verified reality` ID06 har first-class objekt för company verification, person verification, card status, workplace binding, work pass och evidence export. Proof: `packages/domain-id06/src/index.mjs:5-10`, `248-320`, `341-401`.
- `verified reality` route trust enforcement är central i servern och route-contracts markerar majoriteten av high-risk mutationer i domänen som `strong_mfa`. Proof: `apps/api/src/route-contracts.mjs:335-395`, `apps/api/src/server.mjs:1644-1708`.

## Partial Reality

- `partial reality` critical-domain persistence finns, men blir legal-effect-säker bara om driftmiljön explicit sätter durable store. Default i repo är fortfarande `memory`. Proof: `apps/api/src/platform.mjs:1505-1510`, `1712-1724`.
- `partial reality` commercial lineage finns, men är mutabel. Revenue plans supersedar äldre approved plans genom statusmutation i befintliga records. Proof: `packages/domain-projects/src/index.mjs:2380-2392`.
- `partial reality` kalkyl har verklig versioning/review/approval, men `convert-to-quote` skapar bara payload på estimate-versionen och inte canonical ÄR-quote. Proof: `packages/domain-kalkyl/src/index.mjs:254-299`, `tests/integration/phase31-kalkyl-api.test.mjs:173-185`.
- `partial reality` project budget conversion fungerar, men budgetversioner auto-approve:as utan separat governance. Proof: `packages/domain-projects/src/index.mjs:3653-3693`, `packages/db/migrations/20260322020000_phase10_projects_budget_followup.sql:17-29`.
- `partial reality` WIP-ledger-bridge bokför, men explicit svensk policyprofil för K2/K3, huvudsaklig revenue-recognition-metod, förlustkontrakt och cutoff-styrning saknas som first-class objekt i runtime.
- `partial reality` build-VAT assessment finns, men avgörandet bygger på generella VAT-evaluation-flaggor och hårdkodad `construction_service` i stället för en styrd svensk byggmomskatalog. Proof: `packages/domain-projects/src/index.mjs:4835-4965`.
- `partial reality` profitability mission control är verklig, men source coverage/allocation-correction är inte helt first-class för alla källor och alla ombokningar.
- `partial reality` ID06 workflows fungerar lokalt, men verifiering och kortstatus kan sättas direkt till `verified` eller `active` utan riktig provideradapter. Proof: `packages/domain-id06/src/index.mjs:60-145`, `178-209`.

## Legacy

- `legacy` äldre fas- och verification-runbooks ligger kvar som om de vore verklig styrning för project/field/id06/personalliggare trots att de inte är rebuild-sanning.
- `legacy` SQL-migrationer beskriver relationella strukturer som inte utgör primär runtime-truth när critical domains går via snapshot envelope.
- `legacy` seeds för phase10/phase14 ger intryck av verklig domain truth i demo path och måste flyttas till test-only eller archive när denna domän rebuildas på riktigt.

## Dead Code

- `dead` relationsschema för `id06_*` är inte verifierad primär write path i standardstartup. Runtime går via generic critical-domain persistence och in-memory maps i domänkoden. Proof: `packages/db/migrations/20260325034000_phase14_id06_domain.sql:1-115`, `apps/api/src/platform.mjs:1708-1724`.
- `dead` `project_budget_versions` finns i SQL, men runtime-modellen godkänner budget i domänkod före någon separat repository-governance. Proof: `packages/db/migrations/20260322020000_phase10_projects_budget_followup.sql:17-29`, `packages/domain-projects/src/index.mjs:3653-3693`.
- `dead` personalliggare-export i SQL/migrationer är inte official XML/XSD path utan bara lokal payload/hash-export i runtime. Proof: `packages/domain-personalliggare/src/index.mjs:580-620`.

## Misleading / False Completeness

- `misleading` domänen kan se repository-backed ut genom SQL-migrations och tester, men legal-effect runtime blir fortfarande `in_memory_repository_envelope` om ingen explicit store konfigureras. Proof: `apps/api/src/platform.mjs:1505-1510`, `1712-1724`.
- `misleading` invoice readiness ser fullständig ut med blocker/review/status, men repo saknar first-class waiver-/exception-modell för legitima overrideflöden.
- `misleading` build-VAT assessment ser svensk byggmoms-komplett ut, men avgörs i praktiken med få boolska inputfält och generisk VAT-evaluation.
- `misleading` personalliggare-export kallas export artifact men är bara `payloadJson + controlChainHash`, inte officiellt XML/XSD- eller säker överföringsformat.
- `misleading` ID06 verifiering ser live ut genom routefamilj och evidence export, men providerfri `verified`/`active`-status och syntetiskt workplace-fallback gör den fake-live.

## Project Commercial Core Findings

### F12-001
- severity: critical
- kategori: runtime truth / persistence
- exakt problem: legal-effect runtime för projects, field, personalliggare, id06 och kalkyl defaultar till `memory` om ingen explicit critical-domain-state-store konfigureras.
- varför det är farligt: restart, scale-out eller fel nod kan radera hela den operativa sanningen samtidigt som systemet ser grönt ut.
- exakt filepath: `apps/api/src/platform.mjs`
- radreferens om möjligt: `1505-1510`, `1712-1724`
- rekommenderad riktning: gör postgres-backed legal-effect-store obligatorisk för protected, pilot_parallel och production; fail-fast om store saknas.
- status: replace

### F12-002
- severity: critical
- kategori: security / masking
- exakt problem: `projects`, `field`, `personalliggare`, `id06` och `kalkyl` saknar explicita critical-domain class-mask-overrides och faller tillbaka till `S2`.
- varför det är farligt: känslig project/compliance-data får svagare masking- och supportboundary än finance/HR trots att domänen innehåller persondata, attendance och governance-beslut.
- exakt filepath: `apps/api/src/platform.mjs`
- radreferens om möjligt: `1476-1490`, `1546-1548`
- rekommenderad riktning: införa explicita `S3`- eller strängare klassningar per subdomän och knyta dem till support/export-policy.
- status: harden

### F12-003
- severity: critical
- kategori: commercial lineage
- exakt problem: approved revenue plans supersedar äldre versioner genom att mutera status på gamla records i stället för immutabel supersession chain.
- varför det är farligt: governing version per cutoff blir svårare att revidera, replaya och förklara juridiskt och bokföringsmässigt.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `2380-2392`
- rekommenderad riktning: bygg `ProjectCommercialLineage` med `effectiveFrom`, `effectiveTo`, `supersedesId`, `supersededById` och cutoff-resolver.
- status: rewrite

### F12-004
- severity: critical
- kategori: budget governance
- exakt problem: `createProjectBudgetVersion` sätter budgetversioner direkt till `approved` och loggar `project.budget.approved` i samma operation.
- varför det är farligt: kalkyl- eller manuell budget kan få styrande effekt utan separat review, SoD eller dual control.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `3653-3693`
- rekommenderad riktning: införa `draft -> review_pending -> approved | rejected` för budgetversioner med separat approver.
- status: rewrite

### F12-005
- severity: high
- kategori: kalkyl / quote chain
- exakt problem: `convertEstimateToQuote` skapar bara quote-payload på estimate-versionen och markerar den `quoted`, men skapar inte canonical ÄR-quote.
- varför det är farligt: kalkyl kan uppfattas som en riktig quote-motor trots att quote truth fortfarande saknas nedströms.
- exakt filepath: `packages/domain-kalkyl/src/index.mjs`
- radreferens om möjligt: `254-299`
- rekommenderad riktning: bind estimate-conversion till riktig ÄR-quote creation med `quoteId`, `quoteVersionId`, duplicate guard och immutable linkage.
- status: rewrite

## Date Hierarchy / WIP / Revenue Recognition / Build VAT Findings

### F12-006
- severity: critical
- kategori: accounting policy / WIP
- exakt problem: WIP-ledger-bridge bokför på riktigt, men repo saknar first-class svensk policyprofil för K2/K3, successiv vinstavräkning, uppdrag till fast pris/löpande räkning, förlustkontrakt och reopen-governance.
- varför det är farligt: samma WIP-motor kan användas med fel policy och ändå producera bokföring som ser legitim ut.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `4440-4520`
- rekommenderad riktning: införa `ProjectAccountingPolicyProfile` och göra policyval obligatoriskt före legal-effect WIP/posting.
- status: rewrite

### F12-007
- severity: high
- kategori: byggmoms / VAT
- exakt problem: build-VAT assessment använder huvudsakligen `buyerBuildSectorFlag`, `buyerResellsConstructionServicesFlag` och hårdkodad `construction_service` för reverse-charge-logiken.
- varför det är farligt: omvänd byggmoms kan sättas fel för svenska byggtjänster, delentreprenader och mixed service cases.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `4864-4910`
- rekommenderad riktning: bygg svensk byggmoms-katalog och decision-basis som explicit skiljer tjänsteklassning, köparstatus, återförsäljning och dokumentkrav.
- status: rewrite

### F12-008
- severity: high
- kategori: period control / close / reopen
- exakt problem: ledger har close/reopen-governance, men project runtime saknar egen first-class reopen impact model för WIP, profitability, invoice readiness och mission control.
- varför det är farligt: periodkorrigeringar riskerar att lämna stale snapshots, felaktig readiness och oförklarade reruns.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `6990-7088`, `4440-4520`
- rekommenderad riktning: bygg `ProjectPeriodControl`, `ProjectReopenImpact` och `ProjectRebridgePlan` bundna till ledger reopen.
- status: rewrite

## Profitability / Allocation / Mission Control Findings

### F12-009
- severity: high
- kategori: profitability / source coverage
- exakt problem: profitability-snapshot använder verkliga källor, men saknar full source-coverage-governance och correction chain för alla cost/revenue-typer.
- varför det är farligt: controller-vyer kan se kompletta ut trots att vissa källor saknas, är felallokerade eller kräver omräkning efter reopen.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `6560-6855`
- rekommenderad riktning: införa `ProjectProfitabilitySourceCoverage`, `ProjectAllocationBatch` och `ProjectAllocationCorrection` som first-class objekt.
- status: harden

### F12-010
- severity: high
- kategori: profitability / allocation basis
- exakt problem: payroll- och AP-allokering bygger på implicit time-share, dimensionsmatchning och bucket-mappning, men inte på en fullständig cross-domain allocation policy med explicit correction lineage.
- varför det är farligt: flerprojektssplit och sena kostnadskorrigeringar kan ge fel marginal och fel WIP-underlag.
- exakt filepath: `packages/domain-projects/src/index.mjs`
- radreferens om möjligt: `6646-6768`, `6803-6846`
- rekommenderad riktning: bygg explicit allocation-basis-policy med replaybar correction chain och source-coverage-blockers.
- status: harden

## Field / Offline / Conflict Findings

### F12-011
- severity: high
- kategori: field offline governance
- exakt problem: offline-matrisen stöder bara tre mutationstyper och alla använder `manual_resolution`.
- varför det är farligt: mobil runtime saknar tydlig policy för övriga mutationer, replay-regler och merge-semantik i verklig drift.
- exakt filepath: `packages/domain-field/src/index.mjs`
- radreferens om möjligt: `23-38`
- rekommenderad riktning: bygg `FieldOfflinePolicyMatrix` per objektklass, mutationstyp och merge-strategi.
- status: harden

### F12-012
- severity: medium
- kategori: field finance boundary
- exakt problem: field finance handoff är korrekt begränsad till candidate lines, men work order-/field-runbooks riskerar att beskriva detta som direkt fakturering.
- varför det är farligt: support, implementation och kundkommunikation kan tro att field äger fakturasanningen.
- exakt filepath: `packages/domain-field/src/index.mjs`
- radreferens om möjligt: `980-1005`, `1377-1393`
- rekommenderad riktning: skriv om runbooks och surfaces så att finance truth alltid framgår som `projects` eller ÄR.
- status: harden

## Personalliggare / Kiosk / Export Findings

### F12-013
- severity: critical
- kategori: personalliggare rule governance
- exakt problem: threshold för byggpersonalliggare är hårdkodad till 2026 års prisbasbelopp.
- varför det är farligt: nytt år eller regeländring kräver kodändring och riskerar felaktig registreringsplikt.
- exakt filepath: `packages/domain-personalliggare/src/index.mjs`
- radreferens om möjligt: `25-26`, `126-145`, `188-194`
- rekommenderad riktning: bygg daterad regelkatalog med giltighetsintervall, source ref och applied rule version.
- status: rewrite

### F12-014
- severity: high
- kategori: personalliggare export
- exakt problem: exporten bygger bara `payloadJson` och `controlChainHash`; den saknar officiellt XML/XSD-format och säker överföringsprofil.
- varför det är farligt: export kan se compliance-klar ut utan att vara användbar för faktisk myndighetskontroll eller säker kontrollkedja.
- exakt filepath: `packages/domain-personalliggare/src/index.mjs`
- radreferens om möjligt: `580-620`
- rekommenderad riktning: bygg `PersonalliggareXmlArtifact`, XSD-validering, transfer-profile och receipt-spår.
- status: rewrite

## ID06 / Workplace Binding / Evidence Findings

### F12-015
- severity: critical
- kategori: ID06 provider realism
- exakt problem: company/person verification kan direkt skapas med default `status = "verified"` och card validation med default `status = "active"` utan riktig provider.
- varför det är farligt: systemet skapar fake-live ID06-confidence och kan binda arbetsplats/arbetspass på lokalt påstådd identitet.
- exakt filepath: `packages/domain-id06/src/index.mjs`
- radreferens om möjligt: `60-90`, `112-145`, `178-209`
- rekommenderad riktning: ersätt med provider-backed requests/receipts och blockera live status utan extern verifiering.
- status: replace

### F12-016
- severity: critical
- kategori: ID06 workplace truth
- exakt problem: `requireWorkplace` returnerar ett syntetiskt workplace-objekt om personalliggareplattformen saknas.
- varför det är farligt: ID06 binding kan byggas på påhittad workplace-sanning i stället för registrerad arbetsplats.
- exakt filepath: `packages/domain-id06/src/index.mjs`
- radreferens om möjligt: `556-566`
- rekommenderad riktning: förbjud syntetiskt workplace i alla legal-effect-lägen; kräva verkligt workplace registry och aktiv vertical pack link.
- status: replace

### F12-017
- severity: high
- kategori: ID06 lifecycle / evidence
- exakt problem: evidence export är lokal hash/export utan extern receipt chain, refresh, revocation import eller official provider-state lineage.
- varför det är farligt: active bindings och work passes kan se verifierade ut utan uppdaterad kort-/workplace-status.
- exakt filepath: `packages/domain-id06/src/index.mjs`
- radreferens om möjligt: `341-401`, `456-491`
- rekommenderad riktning: bygg `Id06EvidenceBundle` med provider receipts, refresh cadence, revocation events och expiry governance.
- status: harden

## Trial / Import / Live Conversion Findings

### F12-018
- severity: high
- kategori: import / live conversion / DB drift
- exakt problem: migrationsschema för project/id06/personalliggare ser ut som primary runtime truth, men standardstartup använder generic critical-domain envelope och domänernas egna Maps; dessutom finns seeds nära legal-effect paths.
- varför det är farligt: implementatörer kan tro att relationstabellerna redan är den styrande modellen och missa verklig cutover- och replay-governance.
- exakt filepath: `packages/db/migrations/20260322020000_phase10_projects_budget_followup.sql`, `packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql`, `packages/db/migrations/20260325034000_phase14_id06_domain.sql`, `apps/api/src/platform.mjs`
- radreferens om möjligt: `20260322020000...:17-80`, `20260322040000...:28-140`, `20260325034000...:1-115`, `apps/api/src/platform.mjs:1712-1724`
- rekommenderad riktning: klassificera relationstabeller som `migrate` eller `archive` tills de blir verklig canonical repository-path; isolera demo seeds från legal-effect bootstrap.
- status: migrate

## Route / Security / Classification Findings

- `keep` central trust enforcement i servern är riktig och ska återanvändas. Proof: `apps/api/src/server.mjs:1644-1708`.
- `partial reality` route contracts har rätt trustnivå på nästan alla hög-risk mutationer, men `POST /v1/personalliggare/sites/:constructionSiteId/attendance-events` kräver bara `mfa` och inte `strong_mfa`. Proof: `apps/api/src/route-contracts.mjs:368-380`.
- `partial reality` surface helpers för kontrolläsning finns för field, id06, personalliggare och project workspace, men de kompenserar inte för för svag data-classification. Proof: `apps/api/src/server.mjs:19546-19565`.

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| project commercial core | general and production-ready | general core is real, but lineage/governance is incomplete | `packages/domain-projects/src/index.mjs:191-212`, `3035-3078` | yes |
| trial project scenarios | no legal effect | verified no-legal-effect flags | `packages/domain-projects/src/index.mjs:1171-1182` | no |
| revenue plan governance | approved versioning | mutable supersession of prior approved versions | `packages/domain-projects/src/index.mjs:2380-2392` | yes |
| project budget governance | approved project budgets | auto-approved without separate review | `packages/domain-projects/src/index.mjs:3653-3693` | yes |
| WIP ledger bridge | real posting | real posting, but missing explicit accounting policy profile | `packages/domain-projects/src/index.mjs:4440-4520`, `tests/integration/phase14-project-wip-ledger-api.test.mjs:173-220` | yes |
| profitability mission control | finance-backed | finance-backed, but incomplete source coverage/correction governance | `packages/domain-projects/src/index.mjs:6560-6855` | yes |
| invoice readiness | controlled gate | real gate, but no first-class waiver model | `packages/domain-projects/src/index.mjs:6990-7088` | yes |
| field finance handoff | candidate-only | verified candidate-only, finance truth stays in projects | `packages/domain-field/src/index.mjs:980-1005`, `tests/integration/phase14-field-operational-pack-api.test.mjs:358-368` | no |
| field offline | mobile-safe | idempotent but only narrow matrix | `packages/domain-field/src/index.mjs:23-38`, `1054-1165` | yes |
| personalliggare threshold | rule-driven | hard-coded to 2026 | `packages/domain-personalliggare/src/index.mjs:25-26`, `126-145` | yes |
| personalliggare export | compliance export | local JSON/hash only, not official XML/XSD | `packages/domain-personalliggare/src/index.mjs:580-620` | yes |
| ID06 verification | real verification | default verified/active values without provider | `packages/domain-id06/src/index.mjs:60-145`, `178-209` | yes |
| ID06 workplace registry | workplace bound to personalliggare | synthetic fallback if platform absent | `packages/domain-id06/src/index.mjs:556-566` | yes |
| route trust | central enforcement | verified | `apps/api/src/server.mjs:1644-1708` | no |
| critical-domain truth mode | durable för legal effect | defaults to memory unless explicitly configured | `apps/api/src/platform.mjs:1712-1724` | yes |

## Critical Findings

- F12-001 runtime truth defaultar till memory.
- F12-002 class-mask för domänen faller tillbaka till `S2`.
- F12-003 commercial lineage är mutabel.
- F12-004 budgetversioner auto-approve:as.
- F12-006 WIP saknar first-class svensk accounting policy profile.
- F12-013 personalliggare-threshold är hårdkodad till 2026.
- F12-015 ID06 verifiering och kortstatus är fake-live.
- F12-016 ID06 kan bygga workplace binding på syntetiskt workplace.

## High Findings

- F12-005 kalkyl skapar inte canonical ÄR-quote.
- F12-007 byggmoms-beslutet är för förenklat.
- F12-008 project close/reopen saknar egen first-class impact model.
- F12-009 profitability source coverage är ofullständig.
- F12-010 allocation basis/correction lineage är för svag.
- F12-011 field offline-matrisen är för smal.
- F12-014 personalliggare saknar officiell exportmodell.
- F12-017 ID06 lifecycle/evidence saknar extern receipt/refresh/revocation chain.
- F12-018 relationsschema och seeds skapar DB-truth-felbild.

## Medium Findings

- F12-012 äldre field/runbook-beskrivningar kan ge intryck av direkt fakturering från field.
- personalliggare attendance capture använder `mfa` i route contract där övriga high-risk mutationer använder `strong_mfa`.

## Go-Live Blockers

- legal-effect runtime utan obligatorisk durable store
- saknad data-classification på project/field/personalliggare/id06/kalkyl
- mutabel commercial lineage för revenue/billing/budget
- saknad first-class svensk policyprofil för WIP/revenue recognition
- hårdkodad personalliggare-threshold
- saknad officiell personalliggare-export
- fake-live ID06 verification och synthetic workplace fallback
- otillräcklig import/live-conversion-governance kring canonical repository-truth

## Repo Reality Vs Intended Project / Field / Compliance Model

Repo:t innehåller redan mer verklig domainlogik än ett vanligt internt mock-spår:
- project core är på riktigt
- WIP bokför på riktigt
- field skapar inte egen finance truth
- personalliggare har riktig kiosk- och correctionkedja
- ID06 har riktig intern state machine

Men repo:t misslyckas fortfarande på de punkter som avgör om domänen är go-live-säker:
- source of truth är inte hårt nog låst
- governing commercial lineage är inte immutabel
- accounting/compliance-regler är inte first-class nog
- provider realism i ID06 saknas
- official export och live conversion-governance saknas

Domän 12 ska därför klassas som:
- `verified reality` för flera delkedjor
- `partial reality` som helhet
- med flera `critical` blockerare som måste överföras direkt till master-roadmap och master-library

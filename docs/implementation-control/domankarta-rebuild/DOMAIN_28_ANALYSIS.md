# DOMAIN_28_ANALYSIS

## Scope

Domän 28 täcker total systemverifiering under last, concurrency, failure injection, abuse och recovery.

Domänen ska bevisa:
- att systemet håller sanningen under peak-laster, samtidiga writes och regulatoriska deadline-fönster
- att replay, restore, rebuild, migration, cutover och rollback fungerar under press
- att providerbortfall, callback-dubbletter, queue-backlog, workerkrascher och rate-limit-fel inte förstör truth
- att kill switches, quarantine, no-go board och degradation-lägen fungerar utan att skapa ny risk
- att adversarial misuse, cross-tenant-försök, approval bypass och portal abuse blockeras även under press

Verifierad repo-evidens:
- `tests/integration/phase14-resilience-api.test.mjs`
- `tests/e2e/phase14-resilience-flow.test.mjs`
- `tests/integration/phase17-cutover-concierge-api.test.mjs`
- `tests/e2e/phase17-cutover-concierge-flow.test.mjs`
- `tests/unit/phase17-replay-operations.test.mjs`
- `tests/integration/phase17-backoffice-ops-api.test.mjs`
- `tests/integration/phase18-go-live-gate-api.test.mjs`
- `tests/unit/phase14-resilience.test.mjs`
- `tests/unit/phase3-restore-drills.test.mjs`
- `tests/integration/phase3-restore-drills-api.test.mjs`
- `packages/domain-core/src/resilience.mjs`
- `packages/domain-core/src/backoffice.mjs`
- `apps/api/src/mission-control.mjs`
- `apps/worker/src/worker.mjs`

Officiella källor låsta för domänen:
- [NIST SP 800-34 Rev. 1 Contingency Planning Guide](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf)
- [NIST SP 800-61 Rev. 2 Computer Security Incident Handling Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
- [SLSA Provenance v1.0](https://slsa.dev/spec/v1.0/provenance)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)

Domslut:
- Repo:t innehåller riktiga resilience-, restore-, replay-, cutover- och ops-spår.
- Repo:t saknar fortfarande en canonical total-system-domän för load, concurrency, chaos, adversarial abuse och recovery-proof under realistisk peak.
- Total klassning: `partial reality`.
- Kritiska blockerare: ingen `StressScenario`-katalog, ingen blockerande invariant-suite under peak, ingen chaos/failure-injection-governance och ingen canonical readiness verdict som kräver truth under press.

## Verified Reality

- `verified reality` replay, resilience, restore drill och cutover har redan first-class runtimefragment och tester. Proof: `packages/domain-core/src/resilience.mjs`, `tests/integration/phase14-resilience-api.test.mjs`, `tests/unit/phase17-replay-operations.test.mjs`, `tests/integration/phase3-restore-drills-api.test.mjs`, `tests/integration/phase17-cutover-concierge-api.test.mjs`.
- `verified reality` ops- och mission-control-spår finns för incidenter, replay, queues och watch-liknande ytor. Proof: `packages/domain-core/src/backoffice.mjs`, `apps/api/src/mission-control.mjs`, `tests/integration/phase17-backoffice-ops-api.test.mjs`.
- `verified reality` GA-gater och no-go-liknande readiness-spår finns delvis i Domän 17/18. Proof: `tests/integration/phase18-go-live-gate-api.test.mjs`.

## Partial Reality

- `partial reality` resilience finns, men inte som ett totalt systembevis under peak och concurrency.
- `partial reality` restore drills och replay operations finns, men inte kopplade till stora loadprofiler, provider chaos eller deadline-laster.
- `partial reality` ops-ytor finns, men operator overload och multi-incident storms är inte first-class verifieringsscenarier.
- `partial reality` auth- och securitydomäner finns, men adversarial abuse under load är inte samlat i en bindande verification domain.

## Legacy

- `legacy` äldre resilience-, restore- och release-evidence-spår riskerar att tolkas som full stress- och chaos-readiness fast de i praktiken bara bevisar delar av recoverykedjan. Riktning: `migrate`.
- `legacy` green status från tidigare opsdomäner saknar canonical koppling till concurrency-, failure-injection- och overload-bevis. Riktning: `rewrite`.

## Dead Code

- `dead` ingen explicit dead-code-yta är verifierad, men frånvaro av canonical stress domain gör att enskilda restore/replay-tester riskerar att bli döda bevisfragment utan klar readiness-roll.

## Misleading / False Completeness

- `misleading` green resilience tests kan se ut som att systemet tål peaklaster fast ingen total concurrency-, queue-spike- eller provider-chaos suite finns.
- `misleading` replay och restore kan se redo ut fast samma operationer inte är bevisade under regulatoriska peak-fönster eller samtidigt incidenttryck.
- `misleading` GA gate kan se redo ut fast inga blockerande proof bundles för degradation, staged overload och adversarial abuse finns.

## Stress / Chaos Findings

- `critical` ingen canonical `StressScenarioCatalog` finns för hela systemet. Farligt eftersom peak- och failure-scenarier annars väljs ad hoc och luckor döljs. Riktning: `create`.
- `critical` ingen blockerande `InvariantSuite` finns som uttryckligen bevisar att ledger-, tax-, payroll-, export- och tenant-isolation-truth håller under load. Riktning: `create`.
- `critical` ingen first-class chaos/failure-injection-modell finns för provider timeout, callback duplicates, DB-restart, worker-crash, queue backlog, secret rotation under trafik och search/reporting lag. Riktning: `create`.
- `critical` ingen canonical readiness verdict finns som kräver pass i load, chaos, replay-under-load, degradation och adversarial abuse innan UI/GA. Riktning: `create`.
- `high` operator overload, incident storms och no-go under verklig press är inte explicit verifierade. Riktning: `create`.
- `high` migration/cutover/rollback under hög last och samtidiga externa events är inte first-class blockerande. Riktning: `harden`.
- `high` rate-limit, brute force, cross-tenant abuse och approval bypass under load är inte samlade i en bindande verification suite. Riktning: `create`.

## Test Findings

- `critical` repo:t saknar en explicit load/concurrency suite som binder till accounting truth och regulatory truth samtidigt.
- `high` inga canonical peak-profiler finns för momsdag, AGI-dag, lönekörningsdag, HUS-peak, annual close eller migreringshelg.
- `high` inga canonical chaos-profiler finns för provider- och workerfel som måste passera innan readiness kan godkännas.

## Doc / Runbook Findings

- `high` äldre resilience-, restore- och incident-runbooks måste skrivas om så att de blir consumers till Domän 28:s stress proof bundles.
- `high` nya canonical runbooks behövs för load execution, chaos execution, degradation drills, overload triage och adversarial exercises.
- `medium` gamla green labels för restore/replay/cutover får inte användas utan explicit stress-scenario refs.

## Go-Live Blockers

- ingen canonical `StressScenarioCatalog`
- ingen canonical `PeakWindowProfile`-katalog
- ingen canonical `FailureInjectionPlan`
- ingen blockerande invariant-suite för truth under load
- ingen canonical operator overload- och no-go-verifiering
- ingen canonical readiness gate för stress/chaos/recovery/adversarial proof

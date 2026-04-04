# DOMAIN_28_ROADMAP

## mål

Bygg Domän 28 till den bindande readinessdomän som bevisar att hela systemet håller sanningen under peaklaster, concurrency, providerfel, queue-spikes, chaos, adversarial abuse, replay/recovery och operativt overload.

## varför domänen behövs

Utan denna domän kan systemet vara korrekt i små testkörningar men falla sönder i verkligheten när:
- många tenants kör samtidigt
- moms, lön, AGI, HUS eller annual peakar
- provider eller callbackflöden spikar eller duplicerar
- köer laggar och workers kraschar
- replay, restore eller rollback behöver köras mitt under press
- support och drift måste använda kill switches, quarantine eller no-go under stress

## bindande tvärdomänsunderlag

- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` styr facit som varje stress- och recoveryutfall måste jamforas mot.
- `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` styr load profiles, chaos experiments, recovery drills, adversarial scenarios, stop conditions och readiness verdict i denna domän.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` styr cutover watch windows, rollback och fail-forward truth i denna domän.
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr experimentsign-off, stop receipts, support reveal och readiness evidence i denna domän.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` styr operational visibility, notifications, freshness och stale signaling i denna domän.
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` styr incident-, no-go-, quarantine- och replay-drills i denna domän.

## faser

- Fas 28.1 stress invariant catalog / peak-window profiles hardening
- Fas 28.2 load / concurrency / contention harness hardening
- Fas 28.3 financial and regulatory truth under load hardening
- Fas 28.4 provider / network / callback / worker chaos hardening
- Fas 28.5 replay / restore / rebuild / recovery under load hardening
- Fas 28.6 adversarial security / abuse / cross-tenant resistance hardening
- Fas 28.7 operational overload / incident storm / no-go board hardening
- Fas 28.8 degradation / quarantine / kill-switch / safe-mode hardening
- Fas 28.9 migration / cutover / rollback under stress hardening
- Fas 28.10 evidence / readiness verdict / doc purge och slutlig stress signoff

## dependencies

- Domän 2 för auth, session, step-up och secrets
- Domän 3-17 för domäntruth som ska skyddas under press
- Domän 27 för canonical scenario- och accounting-proof truth

## vad som får köras parallellt

- 28.3, 28.4 och 28.6 kan delvis gå parallellt när 28.1-28.2 är låsta.
- 28.5 kan gå parallellt med 28.4 efter att failure-injection-formatet är låst.
- 28.7 och 28.8 kan gå parallellt efter att 28.1-28.4 är definierade.

## vad som inte får köras parallellt

- 28.3-28.10 får inte märkas klara före 28.1-28.2.
- 28.5 får inte märkas klar före att replay/recovery truth i tidigare domäner är låst.
- 28.9 får inte märkas klar före 28.3-28.8.
- 28.10 får inte märkas klar före alla tidigare delfaser.

## exit gates

- canonical `StressScenarioCatalog` finns
- canonical `PeakWindowProfile` och `FailureInjectionPlan` finns
- whole-system invariants är blockerande under load och chaos
- load, chaos, replay/recovery, adversarial abuse och overload ger egna proof bundles
- readiness verdict nekas vid minsta blockerande drift i truth eller isolation
- canonical stress runbooks finns

## test gates

- stressprofil får inte bli grön utan explicit invariant suite
- concurrency-sviter får inte bli gröna om duplicate writes, drift eller deadlocks upptäcks
- chaos-sviter får inte bli gröna om ledger, queue lineage, tenant isolation eller operator control tappas
- recovery-sviter får inte bli gröna utan verifierad restore/replay/rebuild outcome
- overload-sviter får inte bli gröna om operatorer bara kan klara läget via heroisk manuell drift

## degradation / control gates

- kill switch, payout stop, submission stop, replay stop, read-only och quarantine måste vara first-class verifieringsobjekt
- varje degradation-läge måste visa exakt vad som fortsätter, vad som stoppas och hur truth skyddas
- staged rollback och no-go triggers måste vara explicit verifierade

## adversarial gates

- cross-tenant read/write-försök måste vara blockerande testfall
- approval bypass, reveal misuse, break-glass misuse, stale session reuse och webhook abuse måste vara blockerande testfall
- brute-force och rate-limit bypass måste vara blockerande testfall

## markeringar

- keep
- harden
- rewrite
- replace
- migrate
- archive
- remove

## delfaser

### Delfas 28.1 stress invariant catalog / peak-window profiles hardening
- markering: create
- dependencies:
  - blockerar hela resten av Fas 28
- exit gates:
  - `StressScenarioCatalog`, `PeakWindowProfile`, `InvariantSuite`, `TenantMixProfile` finns
- konkreta verifikationer:
  - peakprofiler finns för momsdag, AGI-dag, lönekörningsdag, HUS-peak, annual close, massimport och migreringshelg
- konkreta tester:
  - stress catalog completeness tests
  - peak-window profile completeness tests
  - invariant registration tests
- konkreta kontroller vi måste kunna utföra:
  - välja en peakprofil och se exakt vilka invariants som aldrig får brytas

### Delfas 28.2 load / concurrency / contention harness hardening
- markering: create
- dependencies:
  - 28.1
- exit gates:
  - `LoadProfile`, `ConcurrencyProfile`, `ContentionPlan`, `LoadExecution` finns
- konkreta verifikationer:
  - samtidiga writes skapar inte dubbelpostningar, dubbla submissions, dubbla löner eller dubbla payments
  - contention på periodlåsning, numbering och settlement ger blockerande fail om truth driver
- konkreta tester:
  - concurrent mutation suite
  - idempotency under retry suite
  - duplicate suppression suite
- konkreta kontroller vi måste kunna utföra:
  - köra hög samtidighet mot samma flöde och få exakt diff mellan expected och actual outcomes

### Delfas 28.3 financial and regulatory truth under load hardening
- markering: create
- dependencies:
  - 28.1
  - 28.2
  - Domän 27
- exit gates:
  - peak-sviter finns för ÄR, AP, VAT, banking, payroll, AGI, HUS, annual och exports
- konkreta verifikationer:
  - ledger, reports och exports håller sig identiska mot proof ledger även under peak
- konkreta tester:
  - payroll peak suite
  - VAT and banking peak suite
  - HUS and annual peak suite
  - export parity under load suite
- konkreta kontroller vi måste kunna utföra:
  - köra peakprofil och jämföra actual outcome mot Domän 27:s expected outcomes

### Delfas 28.4 provider / network / callback / worker chaos hardening
- markering: create
- dependencies:
  - 28.1
  - 28.2
- exit gates:
  - `FailureInjectionPlan`, `ProviderChaosProfile`, `CallbackDuplicatePlan`, `WorkerCrashPlan` finns
- konkreta verifikationer:
  - timeout, 429, partial success, duplicate callback, queue lag, worker crash och DB-restart har blockerande pass/fail-regler
- konkreta tester:
  - provider timeout suite
  - duplicate callback suite
  - worker crash and recovery suite
  - queue backlog suite
- konkreta kontroller vi måste kunna utföra:
  - injicera providerfel och se exakt hur queues, retries, dead letters och ledger truth beter sig

### Delfas 28.5 replay / restore / rebuild / recovery under load hardening
- markering: harden
- dependencies:
  - 28.1
  - 28.2
  - 28.4
- exit gates:
  - replay, restore drill, projection rebuild och checkpoint recovery är bevisade under last
- konkreta verifikationer:
  - recovery bryter inte ledger truth, export parity eller tenant isolation
  - replay under press skapar inte duplicates eller stale truth
- konkreta tester:
  - replay under load suite
  - restore under load suite
  - rebuild under backlog suite
- konkreta kontroller vi måste kunna utföra:
  - starta replay eller restore mitt under peak och se exakt readiness outcome

### Delfas 28.6 adversarial security / abuse / cross-tenant resistance hardening
- markering: create
- dependencies:
  - 28.1
  - 28.2
- exit gates:
  - `AdversarialScenario`, `AbuseProfile`, `IsolationAttackCase`, `ApprovalBypassCase` finns
- konkreta verifikationer:
  - cross-tenant access, stale session reuse, reveal misuse, break-glass misuse, brute-force och webhook abuse blockeras
- konkreta tester:
  - cross-tenant abuse suite
  - rate-limit and brute-force suite
  - approval and reveal bypass suite
- konkreta kontroller vi måste kunna utföra:
  - köra misuse-fall och se exakt varför de blockeras och hur evidence fångas

### Delfas 28.7 operational overload / incident storm / no-go board hardening
- markering: create
- dependencies:
  - 28.1
  - 28.2
  - 28.4
- exit gates:
  - `OperationalStormProfile`, `OperatorLoadBudget`, `NoGoDecisionExercise` finns
- konkreta verifikationer:
  - incident storms, dead-letter storms och support-case spikes kan hanteras utan att operatorn tappar styrning eller tvingas till heroisk manuell drift
- konkreta tester:
  - multi-incident storm suite
  - operator overload suite
  - no-go decision exercise suite
- konkreta kontroller vi måste kunna utföra:
  - simulera flera samtidiga incidenter och se om systemet fortfarande ger tydlig ownership, prioritetsordning och säkra actions

### Delfas 28.8 degradation / quarantine / kill-switch / safe-mode hardening
- markering: harden
- dependencies:
  - 28.1
  - 28.4
  - 28.7
- exit gates:
  - `DegradationDecision`, `SafeModeProfile`, `KillSwitchExercise`, `QuarantineExercise` finns
- konkreta verifikationer:
  - read-only, payout stop, submission stop, replay stop, migration hold och full quarantine fungerar under press och skyddar truth
- konkreta tester:
  - safe-mode transition suite
  - kill-switch integrity suite
  - quarantine boundary suite
- konkreta kontroller vi måste kunna utföra:
  - slå på en kontroll under peak och se exakt vad som stannar, vad som fortsätter och varför

### Delfas 28.9 migration / cutover / rollback under stress hardening
- markering: harden
- dependencies:
  - 28.3
  - 28.4
  - 28.5
  - 28.8
- exit gates:
  - migration, cutover, parallel run och rollback är bevisade under realistisk backlogg och extern eventtrafik
- konkreta verifikationer:
  - rollback ger inte datadrift, mismatch eller orphan events
  - cutover klarar samtidiga imports, payments, callbacks och operator actions
- konkreta tester:
  - cutover under load suite
  - rollback under load suite
  - parallel-run under pressure suite
- konkreta kontroller vi måste kunna utföra:
  - köra migreringshelgsprofil och se exakt cutover/rollback verdict, mismatch och remaining risk

### Delfas 28.10 evidence / readiness verdict / doc purge och slutlig stress signoff
- markering: rewrite
- dependencies:
  - 28.1-28.9
- exit gates:
  - canonical proof bundles finns för stress, chaos, overload, degradation och recovery
  - `StressReadinessVerdict` finns och blockerar UI/GA om någon obligatorisk suite fallerar
- konkreta verifikationer:
  - gamla restore/resilience-green-labels används inte längre utan explicit stress proof refs
  - canonical runbooks för load, chaos, overload, degradation och recovery finns
- konkreta tester:
  - proof bundle completeness lint
  - readiness verdict lint
  - docs truth lint
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilka körningar, vilka artifact digests, vilka invariants och vilka blockerare som ligger bakom readiness verdict

# DOMAIN_17_ROADMAP

## mål

Bygg om Domän 17 från dagens metadata- och checklistestyrda pilot/GA-lager till verklig go-live-governance som:
- kräver representativa pilots och inte accepterar cherry-picking
- binder parity till daterad officiell konkurrentevidens
- binder advantage till verkliga differentiators med egen runtime och egen evidens
- fryser UI-kontrakt via runtime, compatibility policy och consumer drift detection
- godkänner GA först när deploy-equality, provider realism, legal readiness, kill switches, on-call, rollback och watch window är verkliga

## varför domänen behövs

Utan denna domän kan plattformen se färdig ut utan att vara säker att lansera brett. Resultatet blir:
- grön pilot utan verklig kund- eller providerrealism
- grön parity utan objektiv marknadsjämförelse
- grön advantage utan säljbar runtime
- grön UI freeze utan kompatibilitetspolicy
- approved GA utan riktig deploy-, ops- eller legal readiness

## faser

- Fas 17.1 route / object / state-machine drift hardening
- Fas 17.2 pilot-execution hardening
- Fas 17.3 pilot-cohort / representativeness / anti-cherry-pick hardening
- Fas 17.4 zero-blocker / waiver-hygiene hardening
- Fas 17.5 negative-evidence / gate-invalidation hardening
- Fas 17.6 deploy-equality / artifact-provenance hardening
- Fas 17.7 parity-scorecard / competitor-evidence hardening
- Fas 17.8 advantage-scorecard / differentiator hardening
- Fas 17.9 provider-realism hardening
- Fas 17.10 marketed-capability-coverage hardening
- Fas 17.11 UI-contract-freeze / consumer-contract / compatibility-policy hardening
- Fas 17.12 go-live-decision / signoff / legal-readiness hardening
- Fas 17.13 golden-scenario / migration / rollback-rehearsal hardening
- Fas 17.14 non-functional-ga-gate / no-go / staged-rollout / post-ga-watch hardening
- Fas 17.15 kill-switch / on-call / rollback-path hardening
- Fas 17.16 runbook / legacy / doc purge och slutlig GA re-verification

`BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` är canonical source för bokföringssidan, financial workbench, snapshot-/as-of-scope, state badges, drilldowns, export-CTA, masking, reveal och accounting-sidans no-go-semantik i Domän 17.

`RELEASE_GATES_OCH_ACCEPTANSKRAV_FOR_BOKFORINGSSIDAN.md` ska hållas synkad med Domän 13, Domän 17 och Domän 27 när releasegates, no-go-signoff och acceptanskrav för bokföringssidan ändras.

## dependencies

- Domän 2 för named signer trust, MFA, BankID/passkey/TOTP och secret custödy
- Domän 6, 10, 11 och 14 för verkliga regulated, bank- och providerkedjor som parity och golden scenarios lutar på
- Domän 15 för migration, cutover, rollback rehearsal och watch window
- Domän 16 för release evidence, super-admin, incidents, replay, no-go board, runbook execution och kill switches

## vad som får köras parallellt

- 17.2 och 17.7 kan delvis gå parallellt när object/state/route-modellen i 17.1 är låst.
- 17.8 och 17.10 kan gå parallellt efter att parity och pilotmodellen är hårt definierad.
- 17.11 kan gå parallellt med 17.7-17.10 efter att deploy-equality-formatet i 17.6 är låst.
- 17.14 och 17.15 kan gå parallellt när 17.12 finns.

## vad som inte får köras parallellt

- 17.2-17.15 får inte märkas klara före 17.1.
- 17.7 får inte märkas klar före 17.2 och 17.3.
- 17.8 får inte märkas klar före 17.7.
- 17.12 får inte märkas klar före 17.4-17.11.
- 17.13 får inte märkas klar före Domän 15-runtime finns som first-class refs.
- 17.16 får inte märkas klar före alla tidigare delfaser.

## exit gates

- canonical governance-surface finns och är separat från äldre `/v1/pilot/*` och `/v1/release/*`-split eller har formellt ersätts med en enda ny family
- pilot, parity, advantage, UI freeze och GA har full deploy-equality, provider realism och named signers
- golden scenarios, migration och rollback rehearsal är first-class blockerande objekt
- no-go, staged rollout, watch window, kill switches och on-call är first-class runtime
- canonical `pilot-readiness.md` och `general-availability.md` finns och är bundna till runbook execution

## test gates

- pilot ska nekas om artifact digest, environment manifest eller provider realism saknas
- cohort ska nekas om representativitet eller hard-case coverage saknas
- parity ska nekas om official source eller comparison date saknas
- UI freeze ska invalidieras vid route- eller permissiondrift
- GA ska nekas om legal/on-call/kill-switch/rollback/watch saknas

## pilot-cohort / rollback-readiness / representativeness gates

- cohort måste bära minsta antal pilots, hard-case flagg, source-system-bredd och rollback readiness ref
- accepted cohort får inte skapas från fria textrefs eller en enda lätt pilot

## zero-blocker / waiver-hygiene gates

- öppna `critical`, `high` eller `unclassified` findings blockerar GA
- waivers över `medium` är förbjudna
- waiver måste ha expiry, policy basis och named owner

## negative-evidence / gate-invalidation / deploy-equality gates

- negativ evidens måste vara append-only
- route/config/rulepack/provider/artifact-drift måste invalidiera tidigare green states
- samma `artifactDigest` måste finnas i pilot, parity, advantage, UI freeze och GA

## parity / competitor-evidence gates

- parity-kriterier kräver officiell källa, datum, plan och marknadssegment
- svensk marknadsrelevans måste vara explicit

## advantage / differentiator-reality gates

- varje differentiator måste vara egen scorecard med egen evidens, inte bara bundle-del
- differentiator måste peka på verkliga runtimeobjekt

## provider-realism gates

- varje externt beroende måste klassas `real|sandbox|simulated|fallback`
- reglerade green paths får inte vara `simulated`

## marketed-capability-coverage gates

- varje live-marknadsförd capability måste ha pilot/parity/GA coverage och owner signoff

## UI-contract-freeze / consumer-contract / compatibility-policy gates

- freeze måste bygga från runtime
- compatibility policy och consumer drift detection måste finnas
- governance-surface måste ha egen kontraktspolicy

## go-live / signoff / legal-readiness gates

- named signers för implementation, finance, security, operations och legal måste finnas
- GA-beslut får inte hoppa över `draft` och `review_pending`

## golden-scenario gates

- varje golden scenario måste vara first-class outcome med freshness policy
- gröna scenarioetiketter utan runtime outcome är förbjudna

## migration / rollback-rehearsal gates

- minst en verklig migration och en verklig rollback rehearsal måste vara gröna som objekt, inte bara runbooktext

## release-evidence / hermetic-ci / provenance gates

- release provenance måste bära build ref, artifact digest, environment manifest, rulepack refs och deploy attestation

## non-functional GA gates

- latency, throughput, queue lag, recovery time, support load och operator effort måste ha blockerpolicy

## no-go / staged-rollout / post-GA-watch gates

- explicita no-go triggers måste finnas
- staged rollout måste vara first-class
- post-GA watch window måste vara first-class och blockerande för att lämna watch

## kill-switch / on-call / rollback-path gates

- GA får inte godkännas utan kill-switch coverage, on-call readiness och rollback path ref

## markeringar

- keep
- harden
- rewrite
- replace
- migrate
- archive
- remove

## delfaser

### Delfas 17.1 route / object / state-machine drift hardening
- markering: rewrite
- dependencies:
  - blockerar hela resten av Fas 17
- exit gates:
  - `GoLiveDecision`, `AdvantageScorecard`, `GovernanceRouteManifest` och full review-state finns
- konkreta verifikationer:
  - en enda canonical governance-route-family finns
  - `draft -> review_pending -> approved | rejected | invalidated` är verklig runtime
- konkreta tester:
  - route truth lint
  - state machine unit suite
  - integration-test som nekar direkt `approved`
- konkreta kontroller vi måste kunna utföra:
  - försöka skapa GA direkt i `approved` och få deny
  - jämföra route inventory mot governance manifest utan manuell tolkning

### Delfas 17.2 pilot-execution hardening
- markering: rewrite
- dependencies:
  - 17.1
- exit gates:
  - `PilotExecution` bär `customerRef`, `sourceSystemRefs`, `providerRealism`, `buildRef`, `artifactDigest`, `environmentManifestRef`, `rulepackRefs`
- konkreta verifikationer:
  - pilot completion blockeras utan artifact/provenance/provider realism
- konkreta tester:
  - unit-test för required pilot fields
  - integration-test för deny utan provenance
  - e2e-test för evidence export med digest
- konkreta kontroller vi måste kunna utföra:
  - exportera pilot evidence och se samma digest som deploy registry

### Delfas 17.3 pilot-cohort / representativeness / anti-cherry-pick hardening
- markering: rewrite
- dependencies:
  - 17.2
- exit gates:
  - cohort bär minsta antal pilots, hard-case-krav, source-system-bredd och rollback readiness ref
- konkreta verifikationer:
  - segment med bara ett lätt case blir inte grönt
- konkreta tester:
  - unit-test för `minimumPilotCount`
  - integration-test för hard-case blocker
  - e2e-test för cohort acceptance deny
- konkreta kontroller vi måste kunna utföra:
  - skriva ut coverage matrix och se varför segment stoppas

### Delfas 17.4 zero-blocker / waiver-hygiene hardening
- markering: rewrite
- dependencies:
  - 17.1
- exit gates:
  - first-class findings-register och waiver-policy finns
- konkreta verifikationer:
  - öppet HIGH blockerar GA
  - waiver utan expiry nekas
- konkreta tester:
  - unit-test för waiver ceiling
  - integration-test för GA blocker on open finding
- konkreta kontroller vi måste kunna utföra:
  - skapa finding och se gate gå från review till blocked

### Delfas 17.5 negative-evidence / gate-invalidation hardening
- markering: rewrite
- dependencies:
  - 17.4
- exit gates:
  - negativa utfall är append-only
  - drift invalidierar tidigare green gates
- konkreta verifikationer:
  - route- eller provider-drift gör green gate invalid
- konkreta tester:
  - unit-test för invalidation triggers
  - integration-test för append-only historik
- konkreta kontroller vi måste kunna utföra:
  - se både gammal blocked och ny approved i samma historik

### Delfas 17.6 deploy-equality / artifact-provenance hardening
- markering: rewrite
- dependencies:
  - 17.5
- exit gates:
  - `DeployEquivalenceRecord` och full provenance finns
- konkreta verifikationer:
  - pilot, parity, advantage, freeze och GA bär samma artifact digest när de ska gälla samma release
- konkreta tester:
  - integration-test för digest mismatch deny
  - provenance verification test
- konkreta kontroller vi måste kunna utföra:
  - jämföra GA evidence mot deployad artifact och få exakt match

### Delfas 17.7 parity-scorecard / competitor-evidence hardening
- markering: rewrite
- dependencies:
  - 17.2
  - 17.3
  - 17.6
- exit gates:
  - officiell konkurrentkälla, datum, plan och marknadssegment är obligatoriska
- konkreta verifikationer:
  - parity utan official source date blockeras
- konkreta tester:
  - unit-test för competitor source required
  - integration-test för stale comparison date deny
- konkreta kontroller vi måste kunna utföra:
  - läsa exakt vilken Fortnox/Teamleader/Bygglet/Bokio-källa scorecarden bygger på

### Delfas 17.8 advantage-scorecard / differentiator hardening
- markering: rewrite
- dependencies:
  - 17.7
- exit gates:
  - varje differentiator är eget scorecard med egen evidens och egen review
- konkreta verifikationer:
  - bundle-only green är inte längre möjligt
- konkreta tester:
  - unit-test för required differentiator set
  - integration-test för missing move deny
- konkreta kontroller vi måste kunna utföra:
  - följa varje differentiator till verkligt runtimeobjekt

### Delfas 17.9 provider-realism hardening
- markering: replace
- dependencies:
  - 17.2
  - 17.7
  - 17.8
- exit gates:
  - alla externa beroenden har realismstatus
- konkreta verifikationer:
  - `simulated` blockerar reglerad green path
- konkreta tester:
  - unit-test för provider realism matrix
  - integration-test för GA deny on simulated provider
- konkreta kontroller vi måste kunna utföra:
  - exportera provider realism per gate och se `real|sandbox|simulated|fallback`

### Delfas 17.10 marketed-capability-coverage hardening
- markering: replace
- dependencies:
  - 17.7
  - 17.8
- exit gates:
  - varje live-marknadsförd capability har coverage och owner signoff
- konkreta verifikationer:
  - capability utan coverage blockerar GA-ready claim
- konkreta tester:
  - unit-test för capability coverage required
  - integration-test för missing owner signoff deny
- konkreta kontroller vi måste kunna utföra:
  - slå upp exempelvis `SIE4`, `corporate_tax`, `payroll_full_chain` och se coverage

### Delfas 17.11 UI-contract-freeze / consumer-contract / compatibility-policy hardening
- markering: rewrite
- dependencies:
  - 17.6
- exit gates:
  - compatibility policy, consumer baseline och drift detection finns
- konkreta verifikationer:
  - route- eller permissiondrift invalidierar freeze
- konkreta tester:
  - unit-test för freeze invalidation
  - integration-test för consumer drift scan
- konkreta kontroller vi måste kunna utföra:
  - läsa freeze och se hash, policy och consumer baselines i ett paket

### Delfas 17.12 go-live-decision / signoff / legal-readiness hardening
- markering: rewrite
- dependencies:
  - 17.4 till 17.11
- exit gates:
  - named signers för implementation, finance, security, operations och legal finns
- konkreta verifikationer:
  - GA kan inte godkännas utan legal approval ref
- konkreta tester:
  - unit-test för signer chain
  - integration-test för missing approval deny
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vem som godkände GA, när och i vilken review state

### Delfas 17.13 golden-scenario / migration / rollback-rehearsal hardening
- markering: rewrite
- dependencies:
  - 17.2
  - 17.3
  - Domän 15
- exit gates:
  - golden scenarios, migration rehearsal och rollback rehearsal är first-class objects
- konkreta verifikationer:
  - GA blockeras om någon obligatorisk scenario outcome saknas eller är stale
- konkreta tester:
  - integration-test för stale golden scenario deny
  - integration-test för missing rollback rehearsal deny
- konkreta kontroller vi måste kunna utföra:
  - lista alla golden scenarios med freshness och blockerstatus

### Delfas 17.14 non-functional-ga-gate / no-go / staged-rollout / post-ga-watch hardening
- markering: replace
- dependencies:
  - 17.12
  - 17.13
- exit gates:
  - non-functional gates, no-go triggers, rollout stages och watch window är first-class
- konkreta verifikationer:
  - hög queue lag eller för hög operator effort blockerar rollout stage advance
- konkreta tester:
  - unit-test för stage advance blockers
  - integration-test för watch-window exit deny
- konkreta kontroller vi måste kunna utföra:
  - pausa rollout på no-go trigger och se automatisk stage stop

### Delfas 17.15 kill-switch / on-call / rollback-path hardening
- markering: replace
- dependencies:
  - 17.12
  - 17.14
- exit gates:
  - kill-switch coverage, on-call readiness och rollback path refs finns och är aktiva
- konkreta verifikationer:
  - GA nekas om någon av dessa refs saknas eller är expired
- konkreta tester:
  - integration-test för missing on-call deny
  - integration-test för missing kill-switch coverage deny
- konkreta kontroller vi måste kunna utföra:
  - hämta GA readiness snapshot och se aktiva kill switches, on-call rota och rollback path

### Delfas 17.16 runbook / legacy / doc purge och slutlig GA re-verification
- markering: replace
- dependencies:
  - alla tidigare delfaser
- exit gates:
  - `pilot-readiness.md` och `general-availability.md` finns
  - keep/rewrite/archive/remove-beslut är explicita
  - slutlig GA re-verification är körd på samma artifact som ska gå live
- konkreta verifikationer:
  - gamla phase18-anspråk som inte längre är sanna är arkiverade eller markerade som legacy
- konkreta tester:
  - docs truth lint
  - runbook existence lint
  - final GA verification suite
- konkreta kontroller vi måste kunna utföra:
  - öppna en enda GA decision och följa den till pilot, parity, advantage, freeze, runbooks, rollout och watch window utan lösa textrefs

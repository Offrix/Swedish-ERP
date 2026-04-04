# DOMAIN_17_ANALYSIS

## Scope

Domän 17 har granskats i denna ordning:
- prompt 17
- tidigare analysis 17
- tidigare roadmap 17
- tidigare implementation library 17

Domänen verifierades därefter mot faktisk runtime i minst:
- `packages/domain-tenant-control/src/index.mjs`
- `apps/api/src/server.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/platform.mjs`
- `apps/api/src/mission-control.mjs`
- `packages/domain-core/src/backoffice.mjs`
- `packages/domain-reporting/src/index.mjs`
- `packages/domain-regulated-submissions/src/module.mjs`
- relevanta phase18-tester under `tests/unit/`, `tests/integration/` och `tests/e2e/`
- runbooks under `docs/runbooks/`

Officiella eller primära externa källor som användes:
- [Fortnox](https://www.fortnox.se/)
- [Teamleader](https://www.teamleader.eu/en/)
- [Bygglet](https://www.bygglet.com/)
- [Bokio](https://www.bokio.se/)
- [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
- [CISA Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/sites/default/files/2023-01/federal_government_cybersecurity_incident_and_vulnerability_response_playbooks_508c_5.pdf)

Körda tester i denna granskning:
- `tests/unit/phase18-pilot-execution.test.mjs`
- `tests/unit/phase18-pilot-cohort.test.mjs`
- `tests/unit/phase18-parity-scorecard.test.mjs`
- `tests/unit/phase18-advantage-release-bundle.test.mjs`
- `tests/unit/phase18-ui-contract-freeze.test.mjs`
- `tests/unit/phase18-go-live-gate.test.mjs`
- `tests/integration/phase18-pilot-execution-api.test.mjs`
- `tests/integration/phase18-pilot-cohort-api.test.mjs`
- `tests/integration/phase18-parity-scorecard-api.test.mjs`
- `tests/integration/phase18-advantage-release-bundle-api.test.mjs`
- `tests/integration/phase18-ui-contract-freeze-api.test.mjs`
- `tests/integration/phase18-go-live-gate-api.test.mjs`
- `tests/e2e/phase18-internal-finance-pilot-flow.test.mjs`
- `tests/e2e/phase18-segment-pilot-cohort-flow.test.mjs`
- `tests/e2e/phase18-parity-board-flow.test.mjs`
- `tests/e2e/phase18-advantage-release-pack-flow.test.mjs`
- `tests/e2e/phase18-ui-contract-freeze-flow.test.mjs`
- `tests/e2e/phase18-go-live-gate-flow.test.mjs`

Samlad domänklassning:
- partial reality
- flera verified runtime-objekt finns
- flera green labels är fortfarande lättare att få än legitim svensk GA kräver
- domänen blockerar därför bred go-live

## Verified Reality

- `PilotExecution`, `PilotCohort`, `ParityScorecard`, `AdvantageReleaseBundle`, `UiContractFreezeRecord` och `GoLiveGateRecord` finns som first-class runtimeobjekt i `packages/domain-tenant-control/src/index.mjs:43-65`, `packages/domain-tenant-control/src/index.mjs:2756`, `packages/domain-tenant-control/src/index.mjs:2885`, `packages/domain-tenant-control/src/index.mjs:3019`.
- phase18-routes finns och är testade i runtime via `/v1/pilot/*` och `/v1/release/*` i `apps/api/src/server.mjs:428-449`, `apps/api/src/server.mjs:2121-2543`.
- UI-contract freeze byggs från runtimekontrakt på serversidan via `buildUiContractFreezeSnapshot` i `apps/api/src/server.mjs:19216`.
- evidence exports finns för pilot, cohort, parity, advantage, UI freeze och GA i `packages/domain-tenant-control/src/index.mjs:2265`, `packages/domain-tenant-control/src/index.mjs:2561`, `packages/domain-tenant-control/src/index.mjs:2726`, `packages/domain-tenant-control/src/index.mjs:2855`, `packages/domain-tenant-control/src/index.mjs:2989`, `packages/domain-tenant-control/src/index.mjs:3157`.
- phase18 testsviten går grön i denna miljö och bevisar att metadataflödet och grundläggande gate-wiring fungerar.

## Partial Reality

- pilot- och GA-objekten finns, men de bär inte tillräckligt hård deploy-equality, provider-realism, legal readiness eller on-call-governance.
- route- och permissionmodellen fungerar tekniskt, men är svagare än vad en riktig intern go-live-surface kräver.
- parity och advantage har verklig runtimebacking i flera ändra domäner, men scorecards och bundles är ännu inte tillräckligt objektiva eller daterade.
- UI-contract freeze är runtimebaserad, men saknar full compatibility policy och governance-contract freeze för sina egna interna routes.

## Legacy

- äldre phase18-dokument, äldre capability-locks och tidigare roadmap/statuspåståenden ska endast användas som råmaterial.
- `docs/runbooks/pilot-migration-and-cutover.md` är användbart stödspår men inte tillräckligt som canonical GA-runbook.

## Dead Code

- `packages/db/migrations/20260324170000_phase18_collective_agreements.sql` är inte backing store för pilot/parity/advantage/UI-freeze/GA och är dead för denna domäns governance.
- `packages/db/seeds/20260324170010_phase18_collective_agreements_seed.sql` är dead för samma syfte.

## Misleading / False Completeness

- green phase18-tester bevisar främst att records och evidence exports kan skrivas, inte att bred go-live är legitim.
- `environmentMode: "pilot_parallel"` är hårdkodat i Domän 17-evidence och bevisar inte production deploy i `packages/domain-tenant-control/src/index.mjs:5295-5739`.
- fri text som `runbook://...` eller ändra string refs kan få records att se redo ut trots att verkliga object refs saknas.
- routefamiljerna `/v1/pilot/*` och `/v1/release/*` ser kompletta ut men ger ingen egen intern governance-surface med skarpare trust boundary.

## Intended Vs Actual Object Model Findings

### F17-C1
- severity: critical
- kategori: object-model
- exakt problem: Runtime använder `AdvantageReleaseBundle` och `GoLiveGateRecord` i stället för first-class differentiator-scorecards och formellt beslut med named signers, legal ref och blockerstatus.
- varför det är farligt: Ett grönt bundle- eller gate-record kan dölja att enskilda påståenden saknar verklig evidens eller att inget riktigt beslut med ansvarskedja finns.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:2756`; `packages/domain-tenant-control/src/index.mjs:3019`
- rekommenderad riktning: ersätt eller komplettera med `AdvantageScorecard` och `GoLiveDecision` på differentiator- respektive beslutsnivå.
- status: rewrite

### F17-H1
- severity: high
- kategori: object-model
- exakt problem: `PilotExecution` och `PilotCohort` saknar kundref, source systems, artifact digest, environment manifest, provider mode och rulepack refs som bindande fält.
- varför det är farligt: Pilot kan bli grön utan att bevisa att den körts på rätt kundtyp, rätt artifact och rätt externa beroenden.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:1945-2264`; `packages/domain-tenant-control/src/index.mjs:2339-2560`
- rekommenderad riktning: bygg ut pilotmodellen till verklig provenance- och kundkedjemodell.
- status: rewrite

## Intended Vs Actual State Machine Findings

### F17-C2
- severity: critical
- kategori: state-machine
- exakt problem: `GoLiveGateRecord` är i praktiken binär `approved|blocked` och saknar `draft`, `review_pending` och `rejected`.
- varför det är farligt: Det går inte att modellera riktig granskningsfas, legal reservation, avslag eller omprövning med full auditprecision.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:65`; `packages/domain-tenant-control/src/index.mjs:3019-3157`
- rekommenderad riktning: inför `GoLiveDecision: draft -> review_pending -> approved | rejected | invalidated`.
- status: rewrite

### F17-H2
- severity: high
- kategori: state-machine
- exakt problem: `ParityScorecard`, `AdvantageReleaseBundle` och `UiContractFreezeRecord` saknar review- och invalidationstillstånd.
- varför det är farligt: Tidigare green evidens kan leva kvar trots route-, config-, provider- eller artifactdrift.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:54-65`; `packages/domain-tenant-control/src/index.mjs:2756-3157`
- rekommenderad riktning: inför `draft`, `review_pending`, `released|approved`, `blocked`, `invalidated`, `superseded`.
- status: harden

## Route / Surface Drift Findings

### F17-C3
- severity: critical
- kategori: route-drift
- exakt problem: Domänen körs på `/v1/pilot/*` och `/v1/release/*` i stället för separat intern GA-surface.
- varför det är farligt: Governance-API:t blir splittrat, svårare att säkra, svårare att frysa och lättare att blanda ihop med annat release- eller tenantarbete.
- exakt filpath: `apps/api/src/server.mjs`; `apps/api/src/route-contracts.mjs`
- radreferens om möjligt: `apps/api/src/server.mjs:428-449`; `apps/api/src/route-contracts.mjs:191`; `apps/api/src/route-contracts.mjs:222-249`
- rekommenderad riktning: skapa canonical intern `/v1/go-live/*`-family eller annan enda governance-family och migrera bort splitten.
- status: rewrite

### F17-H3
- severity: high
- kategori: permission-drift
- exakt problem: Domän 17-routes använder i huvudsak `company.manage` eller `company.read` under `strong_mfa`.
- varför det är farligt: Generiska bolagsadmins kan skriva pilot-, parity- och GA-records utan rätt funktionell separation mellan implementation, finance, security och legal.
- exakt filpath: `apps/api/src/route-contracts.mjs`
- radreferens om möjligt: `apps/api/src/route-contracts.mjs:222-249`
- rekommenderad riktning: inför gate-specifika approval classes och named signer families för pilot, parity, advantage, UI freeze och GA.
- status: rewrite

## Pilot Execution / Pilot Cohort Findings

### F17-H4
- severity: high
- kategori: pilot-governance
- exakt problem: Pilot completion kan nås utan first-class object refs till migration, rollback rehearsal, restore drill, build artifact och provider matrix.
- varför det är farligt: Gröna pilots riskerar att vara metadata om pilot snarare än bevis på verklig pilot.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:2197`; `packages/domain-tenant-control/src/index.mjs:2265`; `packages/domain-tenant-control/src/index.mjs:2492`
- rekommenderad riktning: byt fria string refs mot faktiska object refs och blockera completion utan dessa.
- status: rewrite

### F17-M1
- severity: medium
- kategori: pilot-approval
- exakt problem: Approval coverage för pilot är för grov och tillåter för svaga rollklasser.
- varför det är farligt: Samma eller fel typ av principal kan uppfylla flera approvals och ge falsk separation-of-duties.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:6440`
- rekommenderad riktning: bygg named signer classes och explicit SoD i pilot- och cohort-gates.
- status: harden

## Pilot Representativeness / Anti-Cherry-Pick Findings

### F17-C4
- severity: critical
- kategori: representativitet
- exakt problem: Varje segmentdefinition kräver bara `minimumPilotCount: 1`.
- varför det är farligt: Repo:t kan cherry-picka ett enda lätt case per segment och ändå se klart ut.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:204`; `packages/domain-tenant-control/src/index.mjs:218`; `packages/domain-tenant-control/src/index.mjs:232`; `packages/domain-tenant-control/src/index.mjs:248`; `packages/domain-tenant-control/src/index.mjs:262`
- rekommenderad riktning: inför minimiantal, hard-case-krav, source-system-bredd och regulatorisk komplexitet per segment.
- status: rewrite

### F17-H5
- severity: high
- kategori: scenario-coverage
- exakt problem: Golden scenario-katalogen är inte hårt kopplad till pilotsegmenten.
- varför det är farligt: Viktiga kedjor som migration, foreign currency, annual/corporate tax eller full AP kan hamna utanför segmentgreen utan att märkas.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:128-190`
- rekommenderad riktning: bind golden scenario IDs direkt till segmentdefinition, cohort acceptance och GA-gate.
- status: rewrite

## Zero-Blocker / Waiver / Findings Hygiene Findings

### F17-H6
- severity: high
- kategori: blocker-governance
- exakt problem: Go-live-gaten saknar first-class findings-register med severity policy, waiver ceiling, owner och expiry som enda sanningskälla.
- varför det är farligt: Öppna allvarliga risker kan ligga utanför GA-beslutet eller döljas i fria checklistor.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`; `docs/runbooks/general-availability-decision.md`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:3073-3124`
- rekommenderad riktning: bygg `FindingRecord`, `WaiverDecision`, `WaiverExpiryReceipt` och blockera GA på öppna `critical`, `high` och `unclassified`.
- status: rewrite

## Negative Evidence / Gate Invalidation Findings

### F17-H7
- severity: high
- kategori: negative-evidence
- exakt problem: Domänen exporterar evidens, men saknar tydlig append-only-modell för negativa utfall och automatisk gate invalidation vid drift.
- varför det är farligt: Nya gröna records kan få gammal negativ evidens att försvinna ur beslutsbilden och gamla gröna beslut kan leva vidare trots att artifact, route eller provider ändrats.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:5280-5740`
- rekommenderad riktning: bygg `GateInvalidationRecord`, `NegativeEvidenceRecord`, `supersededBy`, `invalidatedBy` och drifttriggers.
- status: rewrite

## Parity Scorecard / Competitor Evidence Findings

### F17-H8
- severity: high
- kategori: parity
- exakt problem: Parity scorecards bär inte obligatoriskt officiell källa, jämförelsedatum, plannivå och källsnapshot.
- varför det är farligt: Parity kan bli intern känsla eller inaktuell marknadsbild i stället för verifierbar konkurrensjämförelse.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:2613-2726`
- rekommenderad riktning: bygg `OfficialCompetitorEvidenceRef` och blockera parity utan datumsatt officiell källa.
- status: rewrite

## Advantage Bundle / Differentiator Findings

### F17-H9
- severity: high
- kategori: advantage
- exakt problem: Advantage modelleras som ett bundle i stället för separata differentiators med egen evidens och egen review.
- varför det är farligt: Ett grönt bundle kan dölja att enskilda differentiators inte är säljbara eller inte finns i verklig runtime.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`; `docs/runbooks/advantage-release-bundles.md`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:2756-2855`
- rekommenderad riktning: ersätt med `AdvantageScorecard` per move och bind varje move till runtime object refs, provider realism och säljpåstående.
- status: rewrite

## Provider Realism / External Dependency Findings

### F17-C5
- severity: critical
- kategori: provider-realism
- exakt problem: Domänen saknar first-class provider realism matrix för pilot, parity, advantage och GA.
- varför det är farligt: Green labels kan bygga på sandbox, simulerade eller fallbackade externa beroenden utan att det syns.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: relevant modell saknas trots gate-runtime i `packages/domain-tenant-control/src/index.mjs:1945-3157`
- rekommenderad riktning: bygg `ProviderRealismRecord` med `real|sandbox|simulated|fallback` och gör den blockerande i regulerade kedjor.
- status: replace

## UI Contract Freeze / Consumer Contract Findings

### F17-H10
- severity: high
- kategori: ui-contract-freeze
- exakt problem: UI-contract freeze bygger snapshot och hash från runtime, men saknar first-class compatibility policy, breaking-change policy och consumer drift detection.
- varför det är farligt: En frusen hash kan ge falsk trygghet trots att kontrakten fortfarande kan brytas utan styrd omfrysning.
- exakt filpath: `apps/api/src/server.mjs`; `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `apps/api/src/server.mjs:19216`; `apps/api/src/server.mjs:19369`; `packages/domain-tenant-control/src/index.mjs:2885-2989`
- rekommenderad riktning: bygg `CompatibilityPolicy`, `ConsumerBaseline`, `ConsumerDriftScan`, `FreezeInvalidationReceipt`.
- status: rewrite

## Deploy Equality / Artifact Provenance Findings

### F17-C6
- severity: critical
- kategori: deploy-equality
- exakt problem: Domän 17 evidence är hårdkodat till `pilot_parallel` och bär inte full artifact equality mot verklig deploy.
- varför det är farligt: GA kan godkännas på annat artifact eller annat manifest än det som verkligen ska gå live.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:5295-5739`
- rekommenderad riktning: bygg `DeployEquivalenceRecord`, bind alla gates till samma `buildRef`, `artifactDigest`, `environmentManifestRef`, `configSetRef` och `rulepackRefs`.
- status: rewrite

## Marketed Capability Coverage Findings

### F17-H11
- severity: high
- kategori: marketed-capability
- exakt problem: Domänen saknar first-class coverage-matris mellan marknadsförda live-funktioner och pilot/parity/advantage/GA-evidens.
- varför det är farligt: Funktioner kan säljas som live utan att pilot, parity eller GA faktiskt bevisat dem.
- exakt filpath: relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: saknas
- rekommenderad riktning: bygg `MarketedCapabilityCoverageRecord` med owner signoff och evidence refs.
- status: replace

## Manual Operations Dependency Findings

### F17-H12
- severity: high
- kategori: manual-ops
- exakt problem: Domänen saknar explicit modell som skiljer legitim automation från heroisk manuell drift, escort och overrides i green paths.
- varför det är farligt: Pilot eller GA kan se grön ut trots att framgången krävde specialister, manuella workarounds eller supporthandpåläggning.
- exakt filpath: relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`; råmaterial i `docs/runbooks/pilot-execution.md`
- radreferens om möjligt: saknas
- rekommenderad riktning: bygg `ManualInterventionRecord`, `NoHeroicOpsGate`, `PilotAssistanceReceipt`.
- status: replace

## Go-Live Gate / Signoff / Legal Readiness Findings

### F17-C7
- severity: critical
- kategori: ga-decision
- exakt problem: Go-live-beslutet saknar named signer chain för legal, security, operations och on-call samt saknar explicit `approvedBy[]` och `approvedAt`.
- varför det är farligt: Ett approved record kan uppstå utan verkligt ansvar eller utan att rätt ägare godkänt bred go-live.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`; `docs/runbooks/general-availability-decision.md`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:3019-3157`
- rekommenderad riktning: bygg `GoLiveDecisionApproval`, `LegalApprovalRef`, `OperationsReadinessApproval`, `SecurityReadinessApproval`.
- status: rewrite

## Golden Scenario Findings

### F17-H13
- severity: high
- kategori: golden-scenarios
- exakt problem: Golden scenarios är inte first-class object refs i GA-gaten.
- varför det är farligt: GA kan bli grön på övergripande metadata även om specifika end-to-end-kedjor inte är körda eller inte är fräscha.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:1945-2264`; `packages/domain-tenant-control/src/index.mjs:3019-3157`
- rekommenderad riktning: bygg `GoldenScenarioRun`, `GoldenScenarioOutcome`, `GoldenScenarioFreshnessPolicy` och bind dem direkt till GA.
- status: rewrite

## Migration / Rollback Rehearsal Findings

### F17-C8
- severity: critical
- kategori: migration-rollback
- exakt problem: Cohort acceptance och GA saknar first-class krav på verklig live migration och verklig rollback rehearsal som egna objekt.
- varför det är farligt: Produkten kan gå till bred go-live utan att den mest riskfyllda inträdeskedjan är verkligt bevisad.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`; `docs/runbooks/pilot-migration-and-cutover.md`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:2465-2518`
- rekommenderad riktning: bygg `MigrationRehearsalRecord`, `RollbackRehearsalRecord`, `RollbackReadinessRef` och gör dem blockerande.
- status: rewrite

## Release Evidence / Hermetic CI / Provenance Findings

### F17-H14
- severity: high
- kategori: release-evidence
- exakt problem: Domän 17 använder evidence exports men saknar full release evidence med reproducibility, manifest equality och deploy attestation som GA-blocker.
- varför det är farligt: Ett grönt GA-record kan sakna bevis för att samma artifact, config och rules verkligen kommer att köras live.
- exakt filpath: `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-tenant-control/src/index.mjs:5280-5740`
- rekommenderad riktning: bygg `ReleaseProvenanceReceipt`, `HermeticBuildEvidence`, `DeployAttestation`.
- status: harden

## Non-Functional GA Gate Findings

### F17-H15
- severity: high
- kategori: non-functional
- exakt problem: Domänen saknar first-class gates för latency, throughput, queue lag, recovery time, support load och operator effort.
- varför det är farligt: Funktionellt gröna flows kan ändå vara olämpliga för bred GA om driftkostnad eller operativ friktion är för hög.
- exakt filpath: relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: saknas
- rekommenderad riktning: bygg `NonFunctionalGateRecord` och knyt till load/recovery-/ops-evidens.
- status: replace

## No-Go / Staged Rollout / Post-GA Watch Findings

### F17-H16
- severity: high
- kategori: rollout-governance
- exakt problem: Domänen saknar tydliga no-go triggers, staged rollout-plan och post-GA watch window som first-class runtimeobjekt.
- varför det är farligt: Ett enda approved-beslut riskerar att ersätta gradvis utrullning, aktiv bevakning och tydliga rollback-triggers.
- exakt filpath: relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`; `docs/runbooks/general-availability-decision.md`
- radreferens om möjligt: saknas
- rekommenderad riktning: bygg `NoGoTrigger`, `RolloutStage`, `WatchWindow`, `WatchSignal`, `RolloutPauseDecision`.
- status: replace

## Kill Switch / On-Call / Rollback Path Findings

### F17-C9
- severity: critical
- kategori: ops-readiness
- exakt problem: Go-live-gaten binder inte explicit till aktiverade kill switches, on-call rotation och rollback path.
- varför det är farligt: Ett approved GA-läge kan sakna de faktiska operativa skydd som krävs när något går fel efter utrullning.
- exakt filpath: relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: saknas
- rekommenderad riktning: bygg `KillSwitchCoverageRef`, `OnCallReadinessRef`, `RollbackPathRef` och blockera GA utan dem.
- status: replace

## Runbook / Release Procedure Findings

### F17-C10
- severity: critical
- kategori: runbooks
- exakt problem: `docs/runbooks/pilot-readiness.md` och `docs/runbooks/general-availability.md` saknas.
- varför det är farligt: Domänen saknar två canonical runbooks för pilot readiness och bred GA, vilket gör processkedjan splittrad mellan flera halvträffande dokument.
- exakt filpath: `docs/runbooks/pilot-readiness.md`; `docs/runbooks/general-availability.md`
- radreferens om möjligt: filerna saknas
- rekommenderad riktning: skapa båda runbooks och bind dem till runbook execution records i ops-domänen.
- status: replace

## Competitor Position / Market Reality Findings

### F17-M2
- severity: medium
- kategori: competitor-scope
- exakt problem: Konkurrentbilden finns implicit men är inte first-class i scorecards med daterade officiella källor och vald plan/produktnivå.
- varför det är farligt: Parity och advantage kan jämföras mot fel plan, fel marknadssegment eller gammal produktbild.
- exakt filpath: relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: saknas
- rekommenderad riktning: bygg konkurrentregister med `competitorCode`, `productPlan`, `comparisonDate`, `officialSourceRef`, `marketSegment`.
- status: harden

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| pilot execution | implemented | verified reality men för tunn metadata | `packages/domain-tenant-control/src/index.mjs:1945-2265`; phase18 tests | artifact/provider/rulepack fields saknas |
| pilot cohort | implemented | partial reality | `packages/domain-tenant-control/src/index.mjs:2339-2561`; e2e segment flow | minimumPilotCount=1 och weak rollback refs |
| parity gate | implemented | partial reality | `packages/domain-tenant-control/src/index.mjs:2613-2726`; parity tests | saknar official source date/plan |
| advantage gate | implemented | partial reality | `packages/domain-tenant-control/src/index.mjs:2756-2855`; advantage tests | bundle istället för differentiator scorecards |
| UI contract freeze | implemented | partial reality | `apps/api/src/server.mjs:19216`; `packages/domain-tenant-control/src/index.mjs:2885-2989` | compatibility policy saknas |
| GA decision | implemented | partial reality | `packages/domain-tenant-control/src/index.mjs:3019-3157`; go-live gate tests | named signers, legal, on-call, kill switch saknas |
| provider realism | implied | missing first-class runtime | modell saknas | critical |
| deploy equality | implied | missing first-class runtime | `packages/domain-tenant-control/src/index.mjs:5295-5739` | critical |
| staged rollout | claimed by process | missing first-class runtime | modell saknas | high |
| post-GA watch | claimed by process | missing first-class runtime | modell saknas | high |

## Pilot Cohort Coverage Matrix

| cohort or segment | required scenarios | actual runtime coverage | evidence path in code/tests/runbooks | blocker |
| --- | --- | --- | --- | --- |
| internal_finance | domestic finance, banking, VAT, tax account | partial | `tests/e2e/phase18-internal-finance-pilot-flow.test.mjs` | no artifact/provider realism binding |
| service_company | domestic finance, invoicing, payroll | partial | `packages/domain-tenant-control/src/index.mjs:128-190` | hard-case rule saknas |
| bureau_client | migration, payroll, reporting, delegated support | partial | `packages/domain-tenant-control/src/index.mjs:204-262` | minimumPilotCount=1 |
| field_project | project profitability, field ops, time | partial | raw segment definitions + mission-control runtime | no hard-case, no source diversity rule |
| regulated_submission | AGI, HUS, annual, submission recovery | partial | raw scenario list + domain runtime | golden scenarios not bound as first-class refs |

## Golden Scenario Matrix

| scenario | claimed end-to-end rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
| --- | --- | --- | --- | --- | --- | --- |
| AB domestic finance chain | must be green before GA | partial via pilot/parity metadata | `tests/e2e/phase18-internal-finance-pilot-flow.test.mjs` | Swedish accounting/tax sources required låter | partial reality | lacks deploy equality |
| domestic AP chain | must be green before GA | not first-class in D17 | no dedicated D17 gate object | official accounting/tax sources needed | partial reality | not bound to gate |
| payroll full chain | must be green before GA | indirect through pilot metadata | no D17 payroll-specific gate object | official payroll/AGI sources needed | partial reality | not bound to gate |
| HUS chain | must be green before GA | indirect through pilot metadata | no first-class golden run object | Skatteverket HUS sources needed | partial reality | not bound to gate |
| migration chain | must be green before GA | weak string refs only | `docs/runbooks/pilot-migration-and-cutover.md` | official source not enough without runtime object | partial reality | critical |
| trial to live chain | must be green before GA | indirect via other domains | runtime exists outside D17 | official source not applicable | partial reality | no D17 gate object |
| support/replay chain | must be green before GA | indirect via Domain 16 | runtime exists outside D17 | CISA/NIST style ops sources | partial reality | not bound to GA |

## Parity / Advantage Scorecard Matrix

| competitor or differentiator | claimed criterion or move | official competitor source | comparison date | actual repo/runtime proof | status | blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Fortnox | accounting, payroll, project, agency breadth | [fortnox.se](https://www.fortnox.se/) | 2026-04-03 | D17 scorecard model exists but date/source not mandatory | partial reality | source/date not enforced |
| Teamleader | CRM + project + invoicing workflow | [teamleader.eu](https://www.teamleader.eu/en/) | 2026-04-03 | no mandatory dated official source fields | partial reality | source/date not enforced |
| Bygglet | field/build workflow and invoicing | [bygglet.com](https://www.bygglet.com/) | 2026-04-03 | no mandatory dated official source fields | partial reality | source/date not enforced |
| Bokio | small-business accounting/invoicing/payroll baseline | [bokio.se](https://www.bokio.se/) | 2026-04-03 | no mandatory dated official source fields | partial reality | source/date not enforced |
| migration concierge | claimed differentiator | n/a | 2026-04-03 | partial runtime in migration domain | partial reality | bundle hides per-move quality |
| unified submission cockpit | claimed differentiator | n/a | 2026-04-03 | partial runtime in reporting/submission domains | partial reality | bundle hides per-move quality |

## Provider Realism Matrix

| external dependency | claimed pilot/GA mode | actual runtime mode | proof in code/tests/runbooks | blocker |
| --- | --- | --- | --- | --- |
| tax/reporting providers | not explicit | not modeled | D17 model lacks provider realism record | yes |
| payroll/bank rails | not explicit | not modeled | D17 model lacks provider realism record | yes |
| identity/signing providers | not explicit | not modeled | D17 model lacks provider realism record | yes |
| migration source adapters | not explicit | not modeled | D17 model lacks provider realism record | yes |

## Deployment Equivalence Matrix

| evidence artifact | claimed deploy-equality rule | actual artifact/deploy path | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| pilot execution evidence | should match GA artifact | hardcoded `pilot_parallel` evidence | `packages/domain-tenant-control/src/index.mjs:5295-5306` | yes |
| parity evidence | should match GA artifact | hardcoded `pilot_parallel` evidence | `packages/domain-tenant-control/src/index.mjs:5367-5378` | yes |
| advantage evidence | should match GA artifact | hardcoded `pilot_parallel` evidence | `packages/domain-tenant-control/src/index.mjs:5444-5455` | yes |
| UI freeze evidence | should match GA artifact | hardcoded `pilot_parallel` evidence | `packages/domain-tenant-control/src/index.mjs:5513-5524` | yes |
| GA evidence | should match actual production deploy | hardcoded `pilot_parallel` evidence | `packages/domain-tenant-control/src/index.mjs:5639-5650`; `packages/domain-tenant-control/src/index.mjs:5728-5739` | yes |

## Marketed Capability Coverage Matrix

| marketed capability | pilot evidence | parity evidence | advantage evidence if claimed | owner signoff | blocker |
| --- | --- | --- | --- | --- | --- |
| SIE4 | not first-class in D17 | not first-class in D17 | not applicable | not first-class | yes |
| corporate tax | not first-class in D17 | not first-class in D17 | not applicable | not first-class | yes |
| payroll full chain | indirect only | indirect only | not applicable | not first-class | yes |
| unified submission cockpit | indirect only | indirect only | bundle-only | not first-class | yes |
| project profitability mission control | indirect only | indirect only | bundle-only | not first-class | yes |

## UI Contract Freeze Matrix

| contract area | frozen artifact | actual runtime source | consumer path | proof in code/tests | blocker |
| --- | --- | --- | --- | --- | --- |
| UI read/action contract snapshot | hash + snapshot | `buildUiContractFreezeSnapshot` | consumer UIs indirectly | `apps/api/src/server.mjs:19216`; phase18 UI freeze tests | compatibility policy missing |
| governance APIs | not frozen | excluded from freeze | `/v1/pilot/*`, `/v1/release/*` | `apps/api/src/server.mjs:19369` | yes |
| permission reasons | partial | route contracts only | internal only | `apps/api/src/route-contracts.mjs:222-249` | explicit compatibility scope missing |

## Go-Live Gate Matrix

| gate | claimed requirement | actual runtime validation | proof in code/tests | blocker |
| --- | --- | --- | --- | --- |
| pilot green | required | yes, but metadata-level | `packages/domain-tenant-control/src/index.mjs:3019-3124` | lacks provenance realism |
| cohort acceptance | required | yes | `packages/domain-tenant-control/src/index.mjs:2465-2561` | rollback refs too weak |
| parity green | required | yes | `packages/domain-tenant-control/src/index.mjs:2613-2726` | official source/date not enforced |
| advantage green | required | yes | `packages/domain-tenant-control/src/index.mjs:2756-2855` | bundle semantics too weak |
| UI freeze | required | yes | `packages/domain-tenant-control/src/index.mjs:2885-2989` | compatibility/invalidation missing |
| legal signoff | implied | no first-class validation | model missing | yes |
| kill switch readiness | implied | no first-class validation | model missing | yes |
| on-call readiness | implied | no first-class validation | model missing | yes |
| rollback rehearsal | implied | no first-class validation | model missing | yes |
| staged rollout/watch window | implied | no first-class validation | model missing | yes |

## Critical Findings

- F17-C1 object model för advantage och GA är för svag.
- F17-C2 state machine för GA saknar riktig review- och reject-livscykel.
- F17-C3 route family är splittrad och saknar canonical governance-surface.
- F17-C4 pilotrepresentativitet är för svag med `minimumPilotCount: 1`.
- F17-C5 provider realism saknas som first-class blocker.
- F17-C6 deploy equality saknas.
- F17-C7 GA saknar named signer chain för legal/security/ops.
- F17-C8 migration och rollback rehearsal är inte first-class gate objects.
- F17-C9 kill switch/on-call/rollback path är inte first-class GA-readiness.
- F17-C10 canonical runbooks `pilot-readiness.md` och `general-availability.md` saknas.

## High Findings

- H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, H11, H12, H13, H14, H15, H16.

## Medium Findings

- M1 pilot approval coverage är för grov.
- M2 competitor scope och marknadsval är inte first-class daterade.

## Low Findings

- Inga rena low-fynd är viktigare än ovanstående; området domineras av critical/high eftersom detta är sista GA-gaten.

## Cross-Domain Blockers

- Domän 2: verklig auth/MFA/provider trust måste vara klar för named signer chain.
- Domän 6, 10, 11 och 14: parity och golden scenarios kräver verkligt verifierade regulated och payment/integration flows.
- Domän 15: migration, rollback rehearsal och watch window måste finnas som first-class evidence.
- Domän 16: support, incident, replay, release evidence och no-go board måste vara first-class innan GA kan vara legitim.

## GA Blockers

- ingen first-class deploy equality
- ingen first-class provider realism
- ingen first-class representativitetsmodell
- inga canonical runbooks för pilot readiness och broad GA
- ingen first-class legal/security/ops signer chain
- ingen first-class staged rollout eller post-GA watch window
- ingen first-class non-functional gate
- ingen first-class marketed capability coverage

## Repo Reality Vs Intended Pilot / GA Model

Repo:t har mycket mer än tomma labels. Det finns verkliga objects, routes, tests och evidence exports. Men Domän 17 är ännu inte legitim svensk go-live-governance. Nuvarande modell är för lätt att göra grön på metadata, för svag i deploy/provenance/provider-realism och för lös i review-, signoff- och rollout-styrning. Rätt riktning är därför inte att kasta runtime, utan att:
- behålla det som fungerar tekniskt
- härda state machines, approvals och provenance
- ersätta binära green labels med first-class decisions och invalidation
- binda pilot, parity, advantage, UI freeze och GA till exakt samma artifacts, externa beroenden och named signoffs

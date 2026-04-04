# DOMAIN_17_IMPLEMENTATION_LIBRARY

## mål

Fas 17 ska byggas så att pilot, parity, advantage, UI-contract freeze och GA inte längre är metadata om beredskap utan first-class beslut om verifierad svensk go-live-kvalitet.

Libraryt speglar roadmapen 1:1 och definierar exakt vad som ska byggas i varje delfas.

`BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` är obligatorisk canonical source för bokföringssidan, financial workbench, snapshot-/as-of-scope, state badges, drilldowns, export-CTA, masking, reveal och accounting-sidans no-go-semantik i Domän 17.

`RELEASE_GATES_OCH_ACCEPTANSKRAV_FOR_BOKFORINGSSIDAN.md` ska hållas synkad med Domän 13, Domän 17 och Domän 27 när releasegates, no-go-signoff och acceptanskrav för bokföringssidan ändras.

## Fas 17

### Delfas 17.1 route / object / state-machine drift hardening

- bygg:
  - `GoLiveDecision`
  - `AdvantageScorecard`
  - `GovernanceRouteManifest`
  - `GovernancePermissionProfile`
  - `GovernanceStateTransitionReceipt`
- state machines:
  - `GoLiveDecision: draft -> review_pending -> approved | rejected | invalidated`
  - `AdvantageScorecard: draft -> review_pending -> green | blocked | invalidated`
- commands:
  - `publishGovernanceRouteManifest`
  - `recordAdvantageScorecard`
  - `createGoLiveDecision`
  - `transitionGoLiveDecision`
- invariants:
  - en enda canonical governance-route-family ska vara sanningskälla
  - inga binära green-objekt utan review-state får bära GA-beslut
  - named signers ska kunna bindas till beslutet på objektnivå
- routes/API-kontrakt:
  - canonical `/v1/go-live/*`
  - legacy `/v1/pilot/*` och `/v1/release/*` får endast leva bakom styrd migration eller explicit compatibility-lager
- tester:
  - route truth lint
  - state transition deny från `draft` direkt till `approved`

### Delfas 17.2 pilot-execution hardening

- bygg:
  - utöka `PilotExecution` med `customerRef`, `sourceSystemRefs`, `providerRealismRefs`, `buildRef`, `artifactDigest`, `environmentManifestRef`, `rulepackRefs`, `providerBaselineRefs`
  - `PilotExecutionScenarioOutcome`
  - `PilotExecutionProvenanceReceipt`
- state machines:
  - `PilotExecution: draft -> in_progress -> review_pending -> completed | blocked | invalidated`
- commands:
  - `startPilotExecution`
  - `recordPilotScenarioOutcome`
  - `completePilotExecution`
  - `invalidatePilotExecution`
- invariants:
  - completion kräver artifact digest, environment manifest och explicit provider realism
  - varje scenario outcome måste vara first-class record, inte fri text
  - pilot får inte vara grön om den körts på annan artifact än den som senare ska jämföras i GA
- tester:
  - deny completion without provenance
  - evidence export includes digest and manifest

### Delfas 17.3 pilot-cohort / representativeness / anti-cherry-pick hardening

- bygg:
  - utöka `PilotCohort` med `minimumPilotCount`, `hardCaseRequired`, `sourceSystemDiversityMin`, `providerRealismRequirement`, `regulatoryComplexityLevel`, `rollbackReadinessRef`
  - `PilotRepresentativenessEvaluation`
  - `PilotCoverageReceipt`
- state machines:
  - `PilotCohort: draft -> planned -> running -> review_pending -> passed | failed | invalidated`
- commands:
  - `createPilotCohort`
  - `attachPilotExecutionToCohort`
  - `evaluatePilotRepresentativeness`
  - `assessPilotCohort`
- invariants:
  - `minimumPilotCount: 1` är förbjudet för segment som kräver bredd eller hard-case
  - cohort får inte passera utan bevisat svårt case där policy kräver det
  - fria rollback refs är förbjudna; endast object refs gäller
- tester:
  - deny cohort pass with only easy cases
  - deny cohort pass with missing rollback readiness

### Delfas 17.4 zero-blocker / waiver-hygiene hardening

- bygg:
  - `FindingRecord`
  - `WaiverDecision`
  - `WaiverExpiryReceipt`
  - `GateFindingSnapshot`
- commands:
  - `recordGateFinding`
  - `grantWaiver`
  - `expireWaiver`
  - `materializeGateFindingSnapshot`
- invariants:
  - öppna `critical`, `high` eller `unclassified` blockerar GA
  - waiver över `medium` är förbjuden
  - waiver utan expiry, owner eller policy basis är förbjuden
- tester:
  - deny GA with high finding
  - deny waiver above severity ceiling

### Delfas 17.5 negative-evidence / gate-invalidation hardening

- bygg:
  - `NegativeEvidenceRecord`
  - `GateInvalidationRecord`
  - `GateSupersessionLink`
- commands:
  - `recordNegativeEvidence`
  - `invalidateGateArtifact`
  - `supersedeGateArtifact`
- invariants:
  - negativ evidens är append-only
  - green artifacts får inte raderas eller skriva över blocked history
  - route/config/provider/rulepack/artifact-drift måste invalidiera tidigare green artifacts där policy säger det
- tester:
  - append-only evidence history
  - invalidation triggered by artifact drift

### Delfas 17.6 deploy-equality / artifact-provenance hardening

- bygg:
  - `DeployEquivalenceRecord`
  - `ReleaseProvenanceReceipt`
  - `DeployAttestation`
  - `EnvironmentManifestSnapshot`
- commands:
  - `recordDeployEquivalence`
  - `attachReleaseProvenance`
  - `verifyDeployAttestation`
- invariants:
  - pilot, parity, advantage, UI freeze och GA måste kunna bindas till samma `artifactDigest` när de gäller samma release
  - `environmentMode: "pilot_parallel"` får inte användas som substitut för production deploy-equality
  - config set, rulepacks och provider baselines ska ingå i likställigheten
- officiella regler och källor:
  - [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
  - [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
- tester:
  - deny GA on digest mismatch
  - provenance verification suite

### Delfas 17.7 parity-scorecard / competitor-evidence hardening

- bygg:
  - utöka `ParityScorecard` med `officialSourceRefs`, `comparisonDate`, `productPlanRef`, `marketSegment`, `competitorCode`
  - `OfficialCompetitorEvidenceRef`
  - `ParityCriterionOutcome`
- commands:
  - `recordParityScorecard`
  - `attachOfficialCompetitorEvidence`
  - `verifyParityCriterion`
- invariants:
  - parity utan officiell källa, datum och plan är förbjuden
  - svensk marknadsrelevans måste vara first-class
  - scorecard ska vara objektivt verifierbart mot officiell produktsida eller officiell dokumentation
- officiella källor:
  - [Fortnox](https://www.fortnox.se/)
  - [Teamleader](https://www.teamleader.eu/en/)
  - [Bygglet](https://www.bygglet.com/)
  - [Bokio](https://www.bokio.se/)
- tester:
  - deny parity without official source
  - deny parity with stale comparison date

### Delfas 17.8 advantage-scorecard / differentiator hardening

- bygg:
  - `AdvantageScorecard` per differentiator
  - `DifferentiatorRuntimeRef`
  - `DifferentiatorValueProof`
- commands:
  - `recordAdvantageScorecard`
  - `attachDifferentiatorRuntimeRef`
  - `releaseAdvantageDecision`
- invariants:
  - bundle-only semantik är förbjuden
  - varje differentiator kräver egen evidens, egen review och egna runtime refs
  - differentiator måste vara säljbart värde, inte framtidsplan
- tester:
  - deny advantage with missing differentiator
  - deny advantage without runtime refs

### Delfas 17.9 provider-realism hardening

- bygg:
  - `ProviderRealismRecord`
  - `ProviderRealismMatrix`
  - `ProviderRealismPolicy`
- commands:
  - `recordProviderRealism`
  - `verifyProviderRealismForGate`
- invariants:
  - varje externt beroende klassas `real|sandbox|simulated|fallback`
  - reglerade green paths får inte vara `simulated`
  - GA får inte godkännas om provider realism bryter policy
- tester:
  - provider realism matrix suite
  - deny gate on simulated regulated dependency

### Delfas 17.10 marketed-capability-coverage hardening

- bygg:
  - `MarketedCapabilityCoverageRecord`
  - `CapabilityOwnerSignoff`
  - `CapabilityEvidenceLink`
- commands:
  - `recordMarketedCapabilityCoverage`
  - `signMarketedCapabilityCoverage`
- invariants:
  - varje live-marknadsförd capability måste länka till pilot/parity/advantage/GA där relevant
  - owner signoff krävs
  - capability utan coverage får inte exponeras som live eller ready
- tester:
  - deny marketed capability without owner signoff
  - deny GA-ready claim if required capability lacks coverage

### Delfas 17.11 UI-contract-freeze / consumer-contract / compatibility-policy hardening

- bygg:
  - utöka `UiContractFreezeRecord` med `compatibilityPolicyRef`, `consumerBaselineRefs`, `consumerDriftScanRef`
  - `CompatibilityPolicy`
  - `ConsumerDriftScan`
  - `FreezeInvalidationReceipt`
- commands:
  - `recordUiContractFreeze`
  - `publishCompatibilityPolicy`
  - `runConsumerDriftScan`
  - `invalidateUiContractFreeze`
- invariants:
  - freeze måste bygga från runtime contracts
  - route- och permissiondrift kan invalidiera freeze
  - governance-surface ska ha egen kontraktspolicy
- tester:
  - invalidate freeze on route drift
  - consumer drift detection suite

### Delfas 17.12 go-live-decision / signoff / legal-readiness hardening

- bygg:
  - `GoLiveDecisionApproval`
  - `LegalApprovalRef`
  - `SecurityReadinessApproval`
  - `OperationsReadinessApproval`
  - `FinanceReadinessApproval`
- commands:
  - `submitGoLiveDecisionForReview`
  - `recordGoLiveApproval`
  - `approveGoLiveDecision`
  - `rejectGoLiveDecision`
- invariants:
  - `approvedBy[]` och `approvedAt` är obligatoriska
  - legal, security, operations och finance måste finnas där policy kräver det
  - en actor får inte signera flera oförenliga signer classes om SoD förbjuder det
- tester:
  - deny approval without full signer chain
  - deny direct approve from draft

### Delfas 17.13 golden-scenario / migration / rollback-rehearsal hardening

- bygg:
  - `GoldenScenarioRun`
  - `GoldenScenarioOutcome`
  - `GoldenScenarioFreshnessPolicy`
  - `MigrationRehearsalRecord`
  - `RollbackRehearsalRecord`
- commands:
  - `recordGoldenScenarioRun`
  - `verifyGoldenScenarioFreshness`
  - `recordMigrationRehearsal`
  - `recordRollbackRehearsal`
- invariants:
  - varje obligatoriskt golden scenario måste vara first-class outcome
  - migration och rollback rehearsal får inte bara vara runbooktext
  - stale scenario outcome blockerar GA
- tester:
  - deny GA on stale golden scenario
  - deny GA on missing rollback rehearsal

### Delfas 17.14 non-functional-ga-gate / no-go / staged-rollout / post-ga-watch hardening

- bygg:
  - `NonFunctionalGateRecord`
  - `NoGoTrigger`
  - `RolloutStage`
  - `WatchWindow`
  - `WatchSignal`
  - `RolloutPauseDecision`
- commands:
  - `recordNonFunctionalGate`
  - `registerNoGoTrigger`
  - `advanceRolloutStage`
  - `pauseRolloutStage`
  - `openWatchWindow`
  - `closeWatchWindow`
- invariants:
  - stage advance blockeras vid för hög latency, queue lag, support load eller operator effort
  - no-go triggers måste kunna pausa eller stoppa rollout
  - GA får inte lämna watch förrän exit criteria är uppfyllda
- tester:
  - stage blocker suite
  - watch window exit suite

### Delfas 17.15 kill-switch / on-call / rollback-path hardening

- bygg:
  - `KillSwitchCoverageRef`
  - `OnCallReadinessRef`
  - `RollbackPathRef`
  - `GoLiveOpsReadinessSnapshot`
- commands:
  - `verifyKillSwitchCoverage`
  - `verifyOnCallReadiness`
  - `verifyRollbackPath`
  - `materializeGoLiveOpsReadinessSnapshot`
- invariants:
  - kill switch, on-call och rollback path måste vara aktiva och fräscha
  - GA utan dessa refs är förbjuden
- tester:
  - deny GA without on-call
  - deny GA without kill-switch coverage
  - deny GA without rollback path

### Delfas 17.16 runbook / legacy / doc purge och slutlig GA re-verification

- bygg:
  - `RunbookTruthDecision`
  - `LegacyArtifactDecision`
  - `FinalGaReverificationReceipt`
- commands:
  - `createPilotReadinessRunbook`
  - `createGeneralAvailabilityRunbook`
  - `archiveLegacyGaClaim`
  - `runFinalGaReverification`
- invariants:
  - `pilot-readiness.md` och `general-availability.md` är canonical
  - gamla phase18-anspråk som inte längre är sanna ska arkiveras eller märkas som legacy
  - slutlig GA re-verification måste köras på samma artifact som ska gå live
- dokumentbeslut:
  - keep/harden: `pilot-cohorts.md`, `pilot-execution.md`, `parity-scorecards.md`, `phase18-ui-contract-freeze-verification.md`
  - rewrite: `advantage-release-bundles.md`, `general-availability-decision.md`, `pilot-migration-and-cutover.md`
  - replace/create: `pilot-readiness.md`, `general-availability.md`
  - archive/remove från Domän 17-sanning: irrelevanta `phase18_collective_agreements`-migreringar och seedspår
- tester:
  - docs truth lint
  - runbook existence lint
  - final GA re-verification suite

## vilka bevis som krävs innan något märks som pilotklart, parityklart, advantageklart, kontraktsfryst eller GA-ready

- pilotklart:
  - representativ kundkedja
  - artifact digest
  - environment manifest
  - provider realism
  - named signers
- parityklart:
  - officiell konkurrentkälla
  - comparison date
  - plan/product level
  - runtime evidence
- advantageklart:
  - differentiatorvis evidens
  - verkligt runtimeobjekt
  - säljbart värde
- kontraktsfryst:
  - runtime snapshot
  - compatibility policy
  - consumer drift scan
  - invalidation policy
- GA-ready:
  - allt ovan
  - zero-blocker findings
  - legal/security/ops/finance signers
  - kill switches
  - on-call
  - rollback path
  - staged rollout
  - post-GA watch

## vilka risker som kräver mänsklig flaggning

- val av verkliga externa konton, certifikat, provider credentials och KMS/HSM
- legal policy för vilka signer classes som krävs i varje marknadssegment
- marknadsbeslut om exakt vilka differentiators och capability claims som får säljas först
- slutligt val av vilka legacy-routes som får leva temporärt bakom compatibility-lager

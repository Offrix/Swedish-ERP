# DOMAIN_16_ROADMAP

## mål

Bygg om Domän 16 från dagens företagsscopeade backoffice- och resiliencekärna till en verklig operations-, support-, backoffice- och super-admin-domän som:
- bär support- och incidenttruth utan informella sidospår
- håller masked-by-default som verklig standard och reveal som first-class process
- skiljer replay, dead letter, correction orchestration och reconciliation reruns åt
- ger en global plattform-control-plane med tenant registry, freeze/quarantine, no-go board och kill switches
- binder drills, runbooks, release evidence och provenance till faktisk operationsruntime

## varför domänen behövs

Utan denna domän går det inte att driva plattformen säkert när något går fel. Resultatet blir:
- maskning som ser snygg ut men går runt governance
- replay som ser kontrollerad ut men i praktiken blir manuella fixar
- incidenter utan blast radius
- support som kan se för mycket eller för lite
- global drift utan tenant isolation
- release- och drillbeslut utan bindande runbook- och evidencekedja

## bindande tvärdomänsunderlag

- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` styr support reveal, sign-off, break-glass, operatorevidence och all high-risk operationsapproval i denna domän.
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` styr impersonation, session, step-up, permission boundaries och support-access truth i denna domän.
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` styr decrypt boundaries, secret handling och key access i denna domän.
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` styr cutover watch window, rollback, fail-forward och migration incident truth i denna domän.
- `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` styr drills, no-go, overload, recovery och readinessproof i denna domän.
- `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md` styr operativa workbenches, activity, notifications, freshness och masking i denna domän.
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` styr support cases, incidenter, replay, dead letters, no-go board och quarantine i denna domän.

## faser

- Fas 16.1 support-case / masked-view / reveal hardening
- Fas 16.2 support-write / diagnostics / mutation-scope hardening
- Fas 16.3 impersonation hardening
- Fas 16.4 break-glass / emergency-access hardening
- Fas 16.5 access-review / SoD hardening
- Fas 16.6 replay / dead-letter / correction-orchestration hardening
- Fas 16.7 incident-signal / incident / post-review / blast-radius hardening
- Fas 16.8 queue / SLA / escalation / submission-monitor hardening
- Fas 16.9 checkpoint / restore-drill / replay-drill hardening
- Fas 16.10 ops-feature-flag / emergency-disable / rotation / revoke hardening
- Fas 16.11 platform-control-plane / super-admin / tenant-registry / quarantine / kill-switch hardening
- Fas 16.12 freshness / staleness / rebuild-control / cross-tenant-search hardening
- Fas 16.13 route / surface / policy / auth-boundary hardening
- Fas 16.14 support-export / audit / watermark / retention hardening
- Fas 16.15 runbook / release-evidence / provenance / hermetic-ci hardening
- Fas 16.16 doc / seed / duplicate-runbook / legacy purge

## dependencies

- Domän 1 för canonical persistence, event lineage och replay-safe receipts
- Domän 2 för trust levels, MFA, secret refs, KMS/HSM och auth runtime
- Domän 13 för reporting, search, notifications, workbenches och operator intelligence
- Domän 14 för provider callbacks, webhook security och integration incidents
- Domän 15 för cutover watch, rollback watch och migration support lanes
- Domän 17 för GA-gates, release evidence och final go-live-governance

## vad som får köras parallellt

- 16.1 och 16.13 kan delvis köras parallellt eftersom masking och route/policy måste låsas tidigt.
- 16.3, 16.4 och 16.5 kan köras parallellt efter att mutation-scope och trust-levelkrav från 16.2 är definierade.
- 16.6, 16.7 och 16.8 kan köras parallellt när support case, incident binding och receipts är låsta.
- 16.9 och 16.15 kan köras parallellt när checkpoint- och release-evidence-objekten är överens.
- 16.11 och 16.12 kan köras parallellt efter att route-/scopegränser är låsta i 16.13.

## vad som inte får köras parallellt

- 16.2 får inte märkas klar före 16.1 eftersom reveal och masked scope definierar support-write-gränserna.
- 16.6 får inte märkas klar före 16.2, 16.3 och 16.4.
- 16.7 får inte märkas klar före 16.4 eftersom break-glass-review måste bindas till incident close.
- 16.11 får inte märkas klar före 16.7, 16.8 och 16.10.
- 16.12 får inte märkas klar före 16.11.
- 16.15 får inte märkas klar före 16.9 och 16.10.
- 16.16 får inte märkas klar före alla tidigare delfaser.

## exit gates

- support cases, reveal, impersonation, break-glass och access review är first-class med receipts, TTL och audit
- replay, dead-letter, correction orchestration och incidenter är separerade och verifierbara
- tenant registry, tenant freeze/quarantine, no-go board, global kill switches och provider health finns som global runtime
- operationsvyer visar freshness/staleness/rebuild-status
- support exports, audit exports och evidence exports är watermarkade, retentionstyrda och legal-hold-styrda
- canonical `incident-response.md` och `release-evidence.md` finns och runbook execution tracking är first-class

## test gates

- masked support view ska kräva explicit reveal flow för att visa omaskade fält
- dead-letter ska inte få bli `resolved` förrän replay-outcome är verifierad
- incident close ska fortsatt blockeras utan post-review och utan reviewed break-glass chain
- tenant freeze ska blockera exakt de mutationer som scope-definitionen säger
- global kill switch ska blockera plattformsvägar även när lokala feature flags är gröna
- runbook execution ska skapa receipts med evidence refs och completion state

## platform-control-plane / super-admin gates

- global tenant registry måste visa blockers, active incidents, freezes, expired secrets/certs och replay backlog
- no-go board måste aggregera incidents, dead letters, stale projections, failed drills och blocked cutovers
- super-admin-surface måste vara maskad som default och auditera all cross-tenant access
- inga cross-tenant actions får gå via företagsscopeade `/v1/backoffice/*`-routes

## support / masked-view / reveal gates

- support read ska vara masked-by-default för support case, incident, impersonation, break-glass och access review
- reveal ska kräva request, approval, TTL, watermark, scope och reason code
- reveal ska auto-stängas och evidence-exporteras

## impersonation / break-glass / access-review gates

- limited-write impersonation ska ha first-class mutation scope och separat publish/review-lane
- break-glass ska kräva incidentId, tvåpersonsgodkännande, TTL och reviewed close
- access reviews ska ha SoD, stale delegation-detection, remediation och signoff

## replay / dead-letter / correction-orchestration gates

- replay operation ska vara skild från correction orchestration
- dead-letter ska gå genom `pending_triage -> acknowledged -> replay_planned -> replay_executing -> awaiting_verification -> verified_resolved -> closed`
- correction case ska bära source-domain command refs och inte skrivas som replay

## incident / post-review / blast-radius gates

- incident måste bära blast radius över tenant, provider, job, release, secret/cert, cutover och feature-flag-scope
- incident close ska blockeras utan post-review och utan reviewed break-glass
- post-review ska skapa corrective och preventive action receipts

## queue / sla / escalation / monitor gates

- SLA-scan och submission monitor ska skapa operatorobjekt med owner, freshness och escalation receipt
- global no-go board måste kunna visa dessa objekt över alla tenants

## checkpoint / restore-drill / replay-drill gates

- restore drill, replay drill och checkpoint måste skapa immutable receipts
- drillresultat måste kunna bindas till runbook execution och release evidence

## ops-feature-flag / emergency-disable / rotation gates

- global kill switch ska skiljas från feature rollout
- emergency disable ska kunna bindas till incident, containment receipt och release impact
- secret rotation, callback-secret revoke och certificate revoke ska ha plan, approval, execution och completion receipts

## route / surface-policy gates

- canonical routefamiljer ska vara låsta för backoffice, ops och super-admin
- surface-policy och route-contracts ska spegla samma trust-level och scopegränser
- runtime får inte förlita sig på `company.manage` där Domän 16 kräver separat ops-trust

## runbook / drill / release-evidence / hermetic-ci / provenance gates

- `incident-response.md` och `release-evidence.md` måste finnas
- runbook execution tracking måste vara runtime, inte bara docs
- release evidence måste bära provenance, artifacts, manifests, approvals och rollback path

## markeringar

- keep
- harden
- rewrite
- replace
- migrate
- archive
- remove

## delfaser

### Delfas 16.1 support-case / masked-view / reveal hardening
- markering: replace
- dependencies:
  - blockerar 16.2-16.8
- vad som får köras parallellt:
  - 16.13
- vad som inte får köras parallellt:
  - ingen support-write-delfas får märkas klar före reveal-governance
- exit gates:
  - `SupportCase`, `MaskedProjectionPolicy`, `RevealRequest`, `RevealSession`, `RevealExpiryReceipt` finns
  - support case close kräver explicit closure receipt
  - masked view är default för alla backoffice reads
- konkreta verifikationer:
  - support case list ska visa masked view utan personuppgifter i klartext
  - reveal request utan approval ska nekas
  - reveal session ska auto-expire och därefter maska om samma objekt
- konkreta tester:
  - unit för support case transition rules
  - integration för `/v1/backoffice/reveal-requests`
  - e2e där support försöker läsa fullt objekt utan reveal och nekas
- konkreta kontroller vi måste kunna utföra:
  - visa att samma support actor får maskad vy före reveal och omaskad vy bara under giltig reveal-session
  - visa receipt med requester, approver, TTL, watermark och evidence ref

### Delfas 16.2 support-write / diagnostics / mutation-scope hardening
- markering: harden
- dependencies:
  - 16.1
- vad som får köras parallellt:
  - 16.5
- vad som inte får köras parallellt:
  - replay/correction får inte utökas utan mutation scope
- exit gates:
  - `BackofficeMutationScope`, `SupportMutationReceipt`, `AdminDiagnosticExecution` finns
  - varje support-write bär support-case ref, approval ref och trust-level receipt
  - diagnostics allowlist publiceras via separat governance-lane
- konkreta verifikationer:
  - write diagnostic utan approved action ska ge deny
  - action utanför published mutation scope ska ge deny
  - route-contract strong_mfa utan runtime step-up receipt ska ge deny
- konkreta tester:
  - unit för mutation-scope resolution
  - integration för diagnostics deny/allow
  - regression för self-approval deny
- konkreta kontroller vi måste kunna utföra:
  - lista alla publicerade mutation scopes och se aktiv version
  - bevisa att support-write inte kan kringgå source-domain commands

### Delfas 16.3 impersonation hardening
- markering: harden
- dependencies:
  - 16.1
  - 16.2
- vad som får köras parallellt:
  - 16.5
- vad som inte får köras parallellt:
  - break-glass får inte luta på samma sessionmodell
- exit gates:
  - `ImpersonationSession`, `ImpersonationActionScopeReceipt`, `ImpersonationEvidenceBundle` finns
  - read-only och limited-write skiljs i runtime och exports
  - every start/end carries watermark, expiry and trust receipt
- konkreta verifikationer:
  - read-only impersonation får inte utföra write
  - limited-write får bara använda publicerad allowlist
  - expired session ska nekas även om route fortfarande anropas
- konkreta tester:
  - unit för scope gating
  - integration för start/end/evidence
  - e2e för read-only deny och limited-write allow
- konkreta kontroller vi måste kunna utföra:
  - exportera evidence för en session och se actor, approver, TTL, action scope och watermark

### Delfas 16.4 break-glass / emergency-access hardening
- markering: harden
- dependencies:
  - 16.2
- vad som får köras parallellt:
  - 16.9
- vad som inte får köras parallellt:
  - incident close-gate får inte byggas klart före denna delfas
- exit gates:
  - `BreakGlassGrant`, `EmergencyAccessAccountProfile`, `EmergencyAccessUsageAlert`, `BreakGlassReviewReceipt` finns
  - dual approval, incident binding och TTL är first-class
  - break-glass usage alert genereras varje gång session startas
- konkreta verifikationer:
  - en enda approver ska inte räcka
  - incident-less break-glass ska nekas
  - close utan reviewed chain ska blockera incident close
- konkreta tester:
  - unit för approval separation och expiry
  - integration för alert + evidence export
  - e2e för incident -> break-glass -> post-review
- konkreta kontroller vi måste kunna utföra:
  - lista alla aktiva break-glass grants
  - se vem som skapade, godkände, startade och stängde varje session

### Delfas 16.5 access-review / SoD hardening
- markering: harden
- dependencies:
  - 16.2
- vad som får köras parallellt:
  - 16.3
- vad som inte får köras parallellt:
  - high-risk roles får inte märkas säkra före signoff-lane finns
- exit gates:
  - `AccessReviewCase`, `DelegationRemediation`, `SoDViolationRecord`, `AccessReviewSignoff` finns
  - stale delegation detection och remediation receipts finns
  - SoD findings kan inte tyst markeras klara
- konkreta verifikationer:
  - samma aktör får inte både skapa och signera review där policy kräver separation
  - stale delegation ska skapa blocker
- konkreta tester:
  - unit för SoD violation detection
  - integration för remediation/signoff
  - regression för self-signoff deny
- konkreta kontroller vi måste kunna utföra:
  - visa öppna SoD-fynd per rollklass
  - visa vem som signerade vilken remediation

### Delfas 16.6 replay / dead-letter / correction-orchestration hardening
- markering: rewrite
- dependencies:
  - 16.2
  - 16.3
  - 16.4
- vad som får köras parallellt:
  - 16.8
- vad som inte får köras parallellt:
  - incident blast radius får inte färdigställas utan replay-outcome-model
- exit gates:
  - `ReplayOperation`, `ReplayOutcomeVerification`, `DeadLetterCase`, `CorrectionCaseLink`, `ReconciliationRerunRequest` finns
  - dead-letter statusar inkluderar verification-stage
  - correction orchestration kan inte döljas som replay
- konkreta verifikationer:
  - replay-exekvering ska inte sätta dead letter till slutligt resolved utan verification receipt
  - correction request ska peka på source-domain command, inte direkt DB- eller replay-path
- konkreta tester:
  - unit för dead-letter transition rules
  - integration för replay execute -> awaiting_verification -> verified_resolved
  - e2e för correction lane och reconciliation rerun
- konkreta kontroller vi måste kunna utföra:
  - visa alla dead letters i `awaiting_verification`
  - se exakt vilken affärseffekt som verifierade resolution

### Delfas 16.7 incident-signal / incident / post-review / blast-radius hardening
- markering: replace
- dependencies:
  - 16.4
  - 16.6
- vad som får köras parallellt:
  - 16.8
  - 16.10
- vad som inte får köras parallellt:
  - super-admin no-go board får inte märkas klar före blast-radius graph finns
- exit gates:
  - `IncidentSignal`, `RuntimeIncident`, `IncidentImpactGraph`, `IncidentContainmentDecision`, `IncidentPostReview`, `CorrectiveActionReceipt` finns
  - incident kan visa affected tenants, providers, jobs, releases, secrets/certs och cutovers
  - close blockeras utan post-review och reviewed break-glass
- konkreta verifikationer:
  - incident med linked break-glass utan reviewed chain ska nekas close
  - affected provider eller tenant ska kunna läsas ut från graph
- konkreta tester:
  - unit för impact graph materialization
  - integration för post-review blockers
  - e2e för incident signal -> incident -> containment -> post-review -> close
- konkreta kontroller vi måste kunna utföra:
  - fråga ett incident-id och få full blast radius
  - exportera post-review receipt med corrective och preventive actions

### Delfas 16.8 queue / SLA / escalation / submission-monitor hardening
- markering: harden
- dependencies:
  - 16.1
  - 16.6
- vad som får köras parallellt:
  - 16.7
- vad som inte får köras parallellt:
  - no-go board får inte märkas klar före queue aggregation finns
- exit gates:
  - `OpsQueueAggregate`, `SlaScanExecution`, `EscalationDecision`, `SubmissionMonitorFreshnessState` finns
  - queue items bär owner, freshness, severity, escalation receipt och linked support/incident refs
- konkreta verifikationer:
  - SLA-brott ska skapa escalation receipt
  - stale submission monitor ska markeras `stale` eller `blocked`, inte grönt
- konkreta tester:
  - integration för review-center/sla-scan
  - integration för submissions monitor scan
  - e2e för queue breach -> work item -> incident signal
- konkreta kontroller vi måste kunna utföra:
  - visa global kööversikt per queue owner
  - se alla stale monitor states

### Delfas 16.9 checkpoint / restore-drill / replay-drill hardening
- markering: harden
- dependencies:
  - 16.4
- vad som får köras parallellt:
  - 16.15
- vad som inte får köras parallellt:
  - release evidence får inte märkas komplett före drill receipts länkas in
- exit gates:
  - `RollbackCheckpoint`, `RestoreDrillExecution`, `ReplayDrillExecution`, `DrillVerificationReceipt` finns
  - drills bär owner, plan, outcome, evidence refs och runbook-execution ref
- konkreta verifikationer:
  - restore drill fail ska skapa blocker på no-go board
  - replay drill utan verification summary ska inte räknas som pass
- konkreta tester:
  - unit för checkpoint sealing
  - integration för restore drill lifecycle
  - e2e för failed drill -> incident signal -> operator queue
- konkreta kontroller vi måste kunna utföra:
  - lista senaste drills per tenant och globalt
  - se exakt vilken runbook execution som täckte varje drill

### Delfas 16.10 ops-feature-flag / emergency-disable / rotation / revoke hardening
- markering: harden
- dependencies:
  - 16.7
- vad som får köras parallellt:
  - 16.11
  - 16.15
- vad som inte får köras parallellt:
  - super-admin kill-switch får inte låtsas vara samma objekt som feature flag
- exit gates:
  - `FeatureFlag`, `EmergencyDisable`, `GlobalKillSwitch`, `SecretRotationPlan`, `CallbackSecretRevocation`, `CertificateRevocationDecision` finns som skilda modeller
  - high-risk/global actions kräver dual control
  - incident linkage och containment receipts finns
- konkreta verifikationer:
  - global disable ska synas som global kill-switch, inte bara flaggradsvariant
  - secret rotation ska ha plan, execute, verify och close
- konkreta tester:
  - unit för dual control
  - integration för revoke/rotation routes
  - regression för self-release deny
- konkreta kontroller vi måste kunna utföra:
  - se aktiva global kill switches
  - se alla hemligheter/certifikat som väntar på rotation eller revoke

### Delfas 16.11 platform-control-plane / super-admin / tenant-registry / quarantine / kill-switch hardening
- markering: replace
- dependencies:
  - 16.7
  - 16.8
  - 16.10
- vad som får köras parallellt:
  - 16.12
- vad som inte får köras parallellt:
  - inga globala operatorvyer får märkas klara före tenant registry och no-go board
- exit gates:
  - `TenantRegistryEntry`, `TenantFreezeDecision`, `TenantQuarantineProfile`, `NoGoBoardSnapshot`, `ProviderRuntimeHealth`, `PlatformControlPlaneSnapshot` finns
  - `/v1/super-admin/*` finns som separat surface
  - varje cross-tenant action bär audit receipt och masked default view
- konkreta verifikationer:
  - tenant freeze ska blockera rätt mutationer och visa reason, scope och expiry
  - no-go board ska visa incidents, dead letters, stale projections, failed drills, expired secrets/certs och blocked cutovers
- konkreta tester:
  - unit för freeze scope resolution
  - integration för super-admin registry/no-go board
  - e2e för freeze/unfreeze och kill-switch activation
- konkreta kontroller vi måste kunna utföra:
  - lista alla tenants med active blockers
  - aktivera och släppa freeze med receipts

### Delfas 16.12 freshness / staleness / rebuild-control / cross-tenant-search hardening
- markering: replace
- dependencies:
  - 16.11
- vad som får köras parallellt:
  - 16.14
- vad som inte får köras parallellt:
  - global search får inte märkas klar före masked search governance finns
- exit gates:
  - `FreshnessSnapshot`, `ReadModelLagRecord`, `RebuildExecution`, `CrossTenantSearchAudit`, `SearchRevealRequest` finns
  - ops-vyer visar `fresh`, `stale` eller `blocked`
  - cross-tenant search är masked-by-default och fully audited
- konkreta verifikationer:
  - stale projection ska synas som blocker i control plane
  - search utan reveal på känsliga fält ska returnera maskad träff, inte rådata
- konkreta tester:
  - unit för freshness classification
  - integration för rebuild execution
  - integration för cross-tenant search audit
- konkreta kontroller vi måste kunna utföra:
  - visa alla stale views över global scope
  - spåra vem som sökte vad och vilket reveal som användes

### Delfas 16.13 route / surface / policy / auth-boundary hardening
- markering: rewrite
- dependencies:
  - 16.1
  - 16.2
- vad som får köras parallellt:
  - 16.3
- vad som inte får köras parallellt:
  - inga nya super-admin-routes före canonical routefamilj är låst
- exit gates:
  - canonical routefamiljer är låsta för `/v1/backoffice/*`, `/v1/ops/*` och `/v1/super-admin/*`
  - route-contracts, surface-policies och runtime auth använder samma trust-level och scopekod
  - `company.manage` används inte som sista skydd för high-risk ops
- konkreta verifikationer:
  - route-contract strong_mfa utan step-up receipt ska ge deny
  - cross-tenant route under fel family ska nekas av router/surface-policy
- konkreta tester:
  - route-truth lint
  - policy drift lint
  - integration för trust-level deny/allow
- konkreta kontroller vi måste kunna utföra:
  - generera route manifest från faktisk router
  - jämföra route manifest mot canonical docs-hash

### Delfas 16.14 support-export / audit / watermark / retention hardening
- markering: harden
- dependencies:
  - 16.1
  - 16.3
  - 16.4
  - 16.12
- vad som får köras parallellt:
  - 16.15
- vad som inte får köras parallellt:
  - legal hold-governance får inte märkas klar före exportmodellen finns
- exit gates:
  - `SupportExportRequest`, `AuditExportRequest`, `WatermarkedExportReceipt`, `OpsArtifactRetentionPolicy`, `LegalHoldDecision` finns
  - alla exports är watermarkade, scope-limited och receipt-burna
- konkreta verifikationer:
  - export utan approval där policy kräver det ska nekas
  - legal hold ska blockera purge
- konkreta tester:
  - unit för retention/legal hold
  - integration för export request -> evidence bundle
  - regression för watermark visibility
- konkreta kontroller vi måste kunna utföra:
  - lista alla export receipts med watermark id och retention profile
  - visa vilka exports som ligger under legal hold

### Delfas 16.15 runbook / release-evidence / provenance / hermetic-ci hardening
- markering: replace
- dependencies:
  - 16.9
  - 16.10
  - 16.14
- vad som får köras parallellt:
  - 16.16
- vad som inte får köras parallellt:
  - release evidence får inte märkas klart utan runbook execution tracking
- exit gates:
  - `RunbookExecution`, `RunbookExecutionStep`, `RunbookEvidenceAttachment`, `ReleaseEvidenceBundleRef`, `ReleaseProvenanceReceipt` finns
  - canonical `incident-response.md` och `release-evidence.md` finns
  - drills, incidents, break-glass, kill switches och rotationsåtgärder kan länkas till runbook execution
- konkreta verifikationer:
  - en restore drill ska kunna peka på exakt runbook execution och evidence bundle
  - release evidence ska bära build ref, artifact digest, manifest, approvals och rollback path
- konkreta tester:
  - integration för runbook execution lifecycle
  - integration för release evidence receipt
  - regression för provenance mismatch blocker
- konkreta kontroller vi måste kunna utföra:
  - fråga ett release-evidence-id och få full provenance
  - fråga ett runbook-execution-id och få steps, actors och evidence refs

### Delfas 16.16 doc / seed / duplicate-runbook / legacy purge
- markering: archive
- dependencies:
  - alla tidigare delfaser
- vad som får köras parallellt:
  - inget som påverkar live routes eller policy
- vad som inte får köras parallellt:
  - archive/remove får inte ske före att ersättande canonical docs finns
- exit gates:
  - duplicate-runbooks är sammanförda eller arkiverade
  - demo seeds är flyttade till test-only eller archive
  - gamla osanna docs är uttryckligen markerade som legacy
- konkreta verifikationer:
  - `docs/runbooks/incident-response.md` finns och äldre incident-runbooks är tydligt nedklassade
  - `docs/runbooks/release-evidence.md` finns
  - `packages/db/seeds/20260322191000_phase14_security_review_demo_seed.sql` och `packages/db/seeds/20260322201000_phase14_resilience_demo_seed.sql` används inte som produktsanning
- konkreta tester:
  - docs-truth lint
  - seed-truth lint
  - route/doc manifest consistency lint
- konkreta kontroller vi måste kunna utföra:
  - visa exakt vilka runbooks som är `keep`, `rewrite`, `archive`
  - visa att inga demo seeds laddas i protected/live-path

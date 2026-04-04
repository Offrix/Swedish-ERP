# DOMAIN_16_ANALYSIS

## Scope

Domän 16 har granskats i denna ordning:
- prompt 16
- tidigare analysis 16
- tidigare roadmap 16
- tidigare implementation library 16

Domänen verifierades mot faktisk runtime i minst:
- `packages/domain-core/src/backoffice.mjs`
- `packages/domain-core/src/resilience.mjs`
- `packages/domain-core/src/jobs.mjs`
- `apps/api/src/phase14-backoffice-routes.mjs`
- `apps/api/src/phase14-resilience-routes.mjs`
- `apps/api/src/phase14-routes.mjs`
- `apps/api/src/surface-policies.mjs`
- `apps/api/src/route-contracts.mjs`
- `apps/api/src/mission-control.mjs`
- relevanta phase14/phase17-migrationer och demo-seeds i `packages/db/`
- relevanta unit- och integrationstester för security, resilience, replay och restore drills
- runbooks under `docs/runbooks/`

Officiella källor som användes:
- [Microsoft Entra emergency access accounts](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [NIST SP 800-34 Rev. 1 Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
- [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance)
- [AWS Secrets Manager secret rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [CISA Cybersecurity Incident and Vulnerability Response Playbooks](https://www.cisa.gov/sites/default/files/2023-01/federal_government_cybersecurity_incident_and_vulnerability_response_playbooks_508c_5.pdf)

## Verified Reality

- Support cases är first-class runtimeobjekt med masking policy, approved actions och owner scope i `packages/domain-core/src/backoffice.mjs:9`, `packages/domain-core/src/backoffice.mjs:155`.
- Admin diagnostics är command-only och write-diagnostics är begränsade till replay-planering och replay-exekvering i `packages/domain-core/src/backoffice.mjs:1092`.
- Replay operations är first-class objekt bundna till support case, incident och dead letter i `packages/domain-core/src/backoffice.mjs:298`, `packages/domain-core/src/backoffice.mjs:393`.
- Impersonation har read-only och limited-write, watermark, TTL, evidence export och separation mellan request, approve, start och end i `packages/domain-core/src/backoffice.mjs:1212`, `packages/domain-core/src/backoffice.mjs:1310`, `packages/domain-core/src/backoffice.mjs:1347`, `packages/domain-core/src/backoffice.mjs:1458`.
- Break-glass kräver incident-id, dual approval, TTL, watermark och evidence export i `packages/domain-core/src/backoffice.mjs:1599`, `packages/domain-core/src/backoffice.mjs:1701`, `packages/domain-core/src/backoffice.mjs:1735`, `packages/domain-core/src/backoffice.mjs:1821`.
- Access reviews finns som first-class objekt med signoff-separation i `packages/domain-core/src/backoffice.mjs:1473`.
- Incident signals, incidents, incident events och blockerande post-review finns i `packages/domain-core/src/resilience.mjs:18`, `packages/domain-core/src/resilience.mjs:1299`, `packages/domain-core/src/resilience.mjs:1354`, `packages/domain-core/src/resilience.mjs:1505`, `packages/domain-core/src/resilience.mjs:1604`.
- Restore drills, replay drills, rollback checkpoints, feature flags, emergency disables, secret rotations och callback/certificate runtime finns i `packages/domain-core/src/resilience.mjs:234`, `packages/domain-core/src/resilience.mjs:354`, `packages/domain-core/src/resilience.mjs:531`.
- Maskade projections finns i backoffice-routes för support case, incident, impersonation, break-glass och access review i `apps/api/src/phase14-backoffice-routes.mjs:1073`, `apps/api/src/phase14-backoffice-routes.mjs:1091`, `apps/api/src/phase14-backoffice-routes.mjs:1109`, `apps/api/src/phase14-backoffice-routes.mjs:1134`, `apps/api/src/phase14-backoffice-routes.mjs:1156`.
- Backoffice operator binding finns och blockerar replay/dead-letter-åtgärder utan aktivt support case eller incident i `apps/api/src/phase14-routes.mjs:1462`.
- Surface-policy för backoffice read models finns i `apps/api/src/surface-policies.mjs:191`, `apps/api/src/surface-policies.mjs:205`.

## Partial Reality

- Support/backoffice är verkligt per tenant eller företag, men inte globalt för hela plattformen.
- Incidenter och control-plane-summary finns, men de är company-scoped och inte super-admin-klass.
- Emergency disable finns, men som variant av feature flag snarare än som separat global kill-switch-domän.
- Dead-letter triage är first-class, men replay-exekvering markerar dead letter som löst innan verifierad affärseffekt är bevisad.
- Runbooks finns i närliggande namn, men flera bindande namn saknas och execution tracking saknas.
- Route-contracts uttrycker starkare trust-level än vad runtime-objekten själva hårt modellerar.

## Legacy

- `apps/api/src/mission-control.mjs` är ett cockpitlager för företagsscope, inte en verklig plattform-control-plane.
- `docs/runbooks/security-incident-response.md` och `docs/runbooks/incident-response-and-production-hotfix.md` är råmaterial men fel som canonical bindande namn när `docs/runbooks/incident-response.md` saknas.
- `packages/db/seeds/20260322191000_phase14_security_review_demo_seed.sql` och `packages/db/seeds/20260322201000_phase14_resilience_demo_seed.sql` är demo-seeds som inte får ligga kvar som implicit operationssanning.

## Dead Code

- Ingen stor domänfil i runtime kunde klassas som helt död utan ytterligare referensanalys.
- Demo-seeds under `packages/db/seeds/*phase14*_demo_seed.sql` ska klassas som dead för produktionsgovernance och flyttas till test-only eller archive.

## Misleading / False Completeness

- `getRuntimeControlPlaneSummary` ser ut som control plane men är bara företagsscope i `packages/domain-core/src/resilience.mjs:1188`.
- Masked views finns, men repo:t saknar first-class reveal/unmask workflow.
- Emergency disable kan se ut som kill switch, men saknar separat global kill-switchmodell och tenant-quarantine/freeze.
- Mission control kan se ut som super-admin men innehåller bara fem dashboards och ingen no-go-board eller tenant registry i `apps/api/src/mission-control.mjs:5`.
- Flera runbooks med liknande namn skapar sken av täckning trots att canonical `incident-response.md` och `release-evidence.md` saknas.

## Platform Control Plane / Super Admin Findings

### F16-C1
- severity: critical
- kategori: platform-control-plane
- exakt problem: Repo:t saknar global plattform-control-plane med tenant registry, no-go board, quarantine/freeze, global kill switches och cross-tenant operatoröversikt.
- varför det är farligt: Plattformägaren kan inte säkert se eller styra helheten. Det öppnar för blinda incidenter, osynliga blockerare, felaktig go-live-bedömning och manuella sidospår.
- exakt filpath: `packages/domain-core/src/resilience.mjs`; `apps/api/src/mission-control.mjs`
- radreferens om möjligt: `packages/domain-core/src/resilience.mjs:1188`; `apps/api/src/mission-control.mjs:5`
- rekommenderad riktning: Bygg separat `PlatformControlPlaneSnapshot`, `TenantRegistryEntry`, `NoGoBoardSnapshot`, `TenantFreezeDecision`, `GlobalKillSwitch`, `ProviderRuntimeHealth` och `/v1/super-admin/*`-surface.
- status: replace

### F16-H1
- severity: high
- kategori: platform-control-plane
- exakt problem: Mission control innehåller bara `project_portfolio`, `finance_close`, `payroll_submission`, `cutover_control` och `trial_conversion`, inte global ops- eller support-control-plane.
- varför det är farligt: UI-närvaro kan feltolkas som operativ kompletthet fast global support- och incidentstyrning saknas.
- exakt filpath: `apps/api/src/mission-control.mjs`
- radreferens om möjligt: `apps/api/src/mission-control.mjs:5-9`
- rekommenderad riktning: Nedklassa nuvarande mission-control till domain cockpits och bygg separat super-admin-surface.
- status: harden

## Support Case / Masked View / Reveal Findings

### F16-H2
- severity: high
- kategori: masked-view
- exakt problem: Repo:t har masked projections men saknar first-class `RevealRequest` eller explicit unmask workflow med approval, TTL, watermark och auto-expiry.
- varför det är farligt: Full data reveal riskerar att ske informellt, ospårbart eller via sidovägar som inte syns i evidence.
- exakt filpath: `packages/domain-core/src/backoffice.mjs`; `apps/api/src/phase14-backoffice-routes.mjs`
- radreferens om möjligt: `packages/domain-core/src/backoffice.mjs:1212-1456`; `apps/api/src/phase14-backoffice-routes.mjs:1073-1167`
- rekommenderad riktning: Bygg `RevealRequest`, `RevealApproval`, `RevealSession`, `RevealExpiryReceipt` och separata `/v1/backoffice/reveal-requests/*`-routes.
- status: replace

### F16-M1
- severity: medium
- kategori: support-case-state-machine
- exakt problem: Support case-statusar finns, men state machine är inte hårt modellerad mot bindande operatorregler. Runtime använder `waiting_customer` i stället för explicit `waiting_input` och har tunn close-path.
- varför det är farligt: Semantisk drift ger falsk SLA- och ownershipbild och gör senare automation och audits opålitliga.
- exakt filpath: `packages/domain-core/src/backoffice.mjs`
- radreferens om möjligt: `packages/domain-core/src/backoffice.mjs:9`; `packages/domain-core/src/backoffice.mjs:249`
- rekommenderad riktning: Lås explicit state machine med tillåtna övergångar, reopen/escalate-krav och blocker för close utan closure-receipt.
- status: harden

## Impersonation / Break-Glass / Access Review Findings

### F16-H3
- severity: high
- kategori: emergency-access-governance
- exakt problem: Break-glass-sessioner finns, men repo:t saknar separat modell för plattformens emergency access accounts, inloggningslarm och drillstyrd användning.
- varför det är farligt: En fungerande break-glass-route räcker inte om den verkliga nödtillgången inte är driftbar, övervakad och isolerad från ordinarie beroenden.
- exakt filpath: `packages/domain-core/src/backoffice.mjs`; `docs/runbooks/security-incident-response.md`
- radreferens om möjligt: `packages/domain-core/src/backoffice.mjs:1599-1834`
- rekommenderad riktning: Bygg `EmergencyAccessAccountProfile`, `EmergencyAccessUsageAlert`, `EmergencyAccessDrillReceipt` och canonical runbook för incident response.
- status: harden

### F16-M2
- severity: medium
- kategori: mutation-boundary
- exakt problem: Limited-write impersonation är strikt, men tillåtet write-scope ligger i kodad allowlist och saknar separat mutation-scopeobjekt med runtime-policys per action family.
- varför det är farligt: Utökning av allowlist riskerar att ske utan central governance och utan att mutation scope syns i exports eller reviews.
- exakt filpath: `packages/domain-core/src/backoffice.mjs`
- radreferens om möjligt: `packages/domain-core/src/backoffice.mjs:1212-1297`
- rekommenderad riktning: Bygg `BackofficeMutationScope`, `ImpersonationActionScopeReceipt` och explicit publish/review-lane för allowlistförändringar.
- status: harden

## Replay / Dead Letter / Correction Orchestration Findings

### F16-H4
- severity: high
- kategori: replay/dead-letter
- exakt problem: Dead-letter kan markeras `resolved` direkt efter replay execution. Runtime skiljer inte tillräckligt mellan replay-start, replay-complete och verifierad affärsåterställning.
- varför det är farligt: Operatörer kan tro att sanningen är återställd trots att downstream-domäner eller externa providers ännu inte bevisat korrekt effekt.
- exakt filpath: `packages/domain-core/src/jobs.mjs`; `tests/integration/phase17-backoffice-ops-api.test.mjs`
- radreferens om möjligt: `packages/domain-core/src/jobs.mjs:1559-1563`; `tests/integration/phase17-backoffice-ops-api.test.mjs:691`
- rekommenderad riktning: Bygg `DeadLetterResolutionReceipt`, `ReplayOutcomeVerification` och för in status `replay_executing`, `awaiting_verification`, `verified_resolved`.
- status: rewrite

### F16-M3
- severity: medium
- kategori: correction-orchestration
- exakt problem: Replay operations finns, men correction orchestration och reconciliation reruns är inte modellerade som egna first-class operationsspår.
- varför det är farligt: Manuala datafixar kan smyga in som “replay” trots att de i själva verket är domain corrections med ändra approvals och evidencekrav.
- exakt filpath: `packages/domain-core/src/backoffice.mjs`; `apps/api/src/phase14-backoffice-routes.mjs`
- radreferens om möjligt: `packages/domain-core/src/backoffice.mjs:298-430`; `apps/api/src/phase14-backoffice-routes.mjs:422-467`
- rekommenderad riktning: Separera `ReplayOperation`, `CorrectionCaseLink`, `ReconciliationRerunRequest` och tvinga source-domain command paths.
- status: harden

## Incident Signal / Incident / Post-Review / Blast Radius Findings

### F16-H5
- severity: high
- kategori: incident-blast-radius
- exakt problem: Incidenter har `impactScope` och related refs, men ingen first-class blast-radius graph över tenants, providers, jobs, releases, secrets och cutovers.
- varför det är farligt: Incident commander saknar verkningskarta och riskerar att missa scope, rollbackbehov och regulatoriska följdeffekter.
- exakt filpath: `packages/domain-core/src/resilience.mjs`
- radreferens om möjligt: `packages/domain-core/src/resilience.mjs:1354-1660`
- rekommenderad riktning: Bygg `IncidentImpactGraph`, `IncidentAffectedDependency`, `IncidentContainmentDecision` och relation till provider/runtime registry.
- status: replace

## Queue / SLA / Escalation / Submission Monitor Findings

### F16-M4
- severity: medium
- kategori: operator-queues
- exakt problem: SLA-scan och submission-monitor finns, men deras outputs är fortfarande företagsscope och saknar global operatorägare, no-go aggregation och stale/freshness-markering.
- varför det är farligt: En stor plattformincident kan fragmenteras i flera lokala work items utan central styrning.
- exakt filpath: `apps/api/src/phase14-backoffice-routes.mjs`; `packages/domain-core/src/resilience.mjs`
- radreferens om möjligt: `apps/api/src/phase14-backoffice-routes.mjs:754-936`; `packages/domain-core/src/resilience.mjs:1188`
- rekommenderad riktning: Lägg till `OpsQueueAggregate`, `EscalationOwnershipReceipt`, `SubmissionMonitorFreshnessState` och global aggregation i super-admin-surface.
- status: harden

## Checkpoint / Restore Drill / Replay Drill Findings

### F16-L1
- severity: low
- kategori: drill-runtime
- exakt problem: Restore drills, replay drills och checkpoints är verkliga, men drill execution tracking är inte kopplad till runbook execution eller release evidence bundle.
- varför det är farligt: Tekniska drills kan bli gröna utan att governance, receipts och driftövningar faktiskt är auditbara.
- exakt filpath: `packages/domain-core/src/resilience.mjs`
- radreferens om möjligt: `packages/domain-core/src/resilience.mjs:531-620`
- rekommenderad riktning: Bygg `RunbookExecution`, `DrillEvidenceBundleRef` och gate mot release evidence.
- status: harden

## Tenant Registry / Quarantine / Kill Switch Findings

### F16-C2
- severity: critical
- kategori: tenant-governance
- exakt problem: Tenant registry, quarantine/freeze och global kill switches saknas helt som first-class runtime. Emergency disable är inte samma sak och är inte plattformsglobal.
- varför det är farligt: Plattformen kan inte säkert isolera en tenant, stoppa vissa mutationer eller exponerat markera blockerade lägen under incident eller cutover.
- exakt filpath: `packages/domain-core/src/resilience.mjs`; `packages/domain-tenant-control/src/index.mjs`
- radreferens om möjligt: `packages/domain-core/src/resilience.mjs:234-486`; relevant modell saknas i `packages/domain-tenant-control/src/index.mjs`
- rekommenderad riktning: Bygg `TenantRegistryEntry`, `TenantFreezeDecision`, `TenantQuarantineProfile`, `GlobalKillSwitch`, `KillSwitchActivationReceipt`.
- status: replace

## Freshness / Staleness / Rebuild Control Findings

### F16-H6
- severity: high
- kategori: freshness-staleness
- exakt problem: Repo:t saknar first-class freshness/staleness governance för operatorvyer och read-model repair.
- varför det är farligt: Operatörer kan fatta beslut på gammal eller ofullständig data och tro att control plane visar live truth.
- exakt filpath: `packages/domain-core/src/resilience.mjs`; `apps/api/src/mission-control.mjs`
- radreferens om möjligt: `packages/domain-core/src/resilience.mjs:1188`; `apps/api/src/mission-control.mjs:130-471`
- rekommenderad riktning: Bygg `FreshnessSnapshot`, `ReadModelLagRecord`, `RebuildExecution`, `StalenessBlocker`.
- status: replace

## Ops Feature Flag / Emergency Disable / Rotation Findings

### F16-H7
- severity: high
- kategori: kill-switch-and-rotation
- exakt problem: High-risk flags och emergency disables finns, men repo:t särskiljer inte global kill switch från feature rollout.
- varför det är farligt: Driftskritiska stopp kan blandas ihop med vanlig rollout, och rotationsstatus blir splittrad i flera tekniska delspår.
- exakt filpath: `packages/domain-core/src/resilience.mjs`; `apps/api/src/phase14-resilience-routes.mjs`
- radreferens om möjligt: `packages/domain-core/src/resilience.mjs:234-486`
- rekommenderad riktning: Separera `GlobalKillSwitch` från `FeatureFlag`, och bygg `SecretRotationPlan`, `CallbackSecretRevocation`, `CertificateRevocationDecision` med control-plane aggregation.
- status: harden

## Route / Surface / Policy Drift Findings

### F16-H8
- severity: high
- kategori: route-surface-drift
- exakt problem: Opsobjekt för incidents, replay, drills och security ligger splittrade mellan `/v1/backoffice/*` och `/v1/ops/*` utan slutlig canonical route-modell.
- varför det är farligt: Surface-policy, route contracts, docs och UI riskerar att glida isär och skapa falsk completeness eller felaktig auth-förväntan.
- exakt filpath: `apps/api/src/phase14-backoffice-routes.mjs`; `apps/api/src/phase14-resilience-routes.mjs`; `apps/api/src/surface-policies.mjs`
- radreferens om möjligt: `apps/api/src/phase14-backoffice-routes.mjs:26-1057`; `apps/api/src/surface-policies.mjs:205-206`
- rekommenderad riktning: Lås canonical routefamiljer för support, ops, drills och super-admin samt generera route-manifest från faktisk router.
- status: rewrite

## Support Export / Audit / Watermark / Retention Findings

### F16-M5
- severity: medium
- kategori: export-retention
- exakt problem: Evidence exports finns för support case, impersonation och break-glass, men repo:t saknar separata export requests, retention profile, legal hold och watermark governance.
- varför det är farligt: Exporter kan bli shadow data lake eller sakna tillräcklig livscykelstyrning.
- exakt filpath: `packages/domain-core/src/backoffice.mjs`
- radreferens om möjligt: `packages/domain-core/src/backoffice.mjs:1917-2159`
- rekommenderad riktning: Bygg `SupportExportRequest`, `AuditExportRequest`, `WatermarkedExportReceipt`, `OpsArtifactRetentionPolicy`, `LegalHoldDecision`.
- status: harden

## Runbook / Drill / Release Evidence / Provenance Findings

### F16-C3
- severity: critical
- kategori: runbook-evidence
- exakt problem: Canonical `docs/runbooks/incident-response.md` och `docs/runbooks/release-evidence.md` saknas helt.
- varför det är farligt: Operativ governance kan se komplett ut trots att de dokument som ska styra incident och release saknas eller ligger i fel namn/fel scope.
- exakt filpath: `docs/runbooks/incident-response.md`; `docs/runbooks/release-evidence.md`
- radreferens om möjligt: filerna saknas
- rekommenderad riktning: Skapa nya canonical runbooks, flytta äldre incident-runbooks till archive/input-only och bind execution receipts till dessa namn.
- status: replace

### F16-H9
- severity: high
- kategori: runbook-execution-tracking
- exakt problem: Repo:t saknar first-class runbook execution tracking trots att restore drills, break-glass och incident handling nu är runtimefunktioner.
- varför det är farligt: Man kan inte auditera om runbook faktiskt körts, av vem, med vilken evidence bundle eller vilken outcome.
- exakt filpath: `packages/domain-core/src/resilience.mjs`; `packages/domain-core/src/backoffice.mjs`
- radreferens om möjligt: ingen first-class modell hittad
- rekommenderad riktning: Bygg `RunbookExecution`, `RunbookExecutionStep`, `RunbookEvidenceAttachment`, `RunbookCompletionReceipt`.
- status: replace

## Security / SoD / Support Boundary Findings

### F16-H10
- severity: high
- kategori: auth-boundary
- exakt problem: Route contracts uttrycker `strong_mfa` för många hög-riskvägar, men flera routehandlers landar ändå i `company.manage` och objektlokal auth utan separat operations-role runtime.
- varför det är farligt: Säkerhetsmodellen blir delvis dokumentär i stället för hårt verkställd i domänobjekten.
- exakt filpath: `apps/api/src/phase14-backoffice-routes.mjs`; `apps/api/src/route-contracts.mjs`
- radreferens om möjligt: `apps/api/src/phase14-backoffice-routes.mjs:223`; `apps/api/src/phase14-backoffice-routes.mjs:1053`; `apps/api/src/route-contracts.mjs:180-293`
- rekommenderad riktning: Bygg `OperationTrustRequirement`, `BackofficeRoleGrant`, `StepUpReceipt` och tvinga runtime att verifiera trust-level receipts, inte bara route contracts.
- status: harden

## Runtime Status Matrix

| capability | claimed runtime status | actual runtime status | proof in code/tests | blocker |
|---|---|---|---|---|
| Support cases | First-class | Verified, company-scoped | `packages/domain-core/src/backoffice.mjs:155`; `tests/integration/phase17-backoffice-ops-api.test.mjs:135-194` | no |
| Masked troubleshooting | Present | Verified as default masked read model, but no reveal workflow | `apps/api/src/phase14-backoffice-routes.mjs:1073-1167`; `tests/integration/phase17-backoffice-ops-api.test.mjs:135,451` | yes |
| Support write governance | Command-only | Partial | `packages/domain-core/src/backoffice.mjs:1092-1210`; `apps/api/src/phase14-routes.mjs:1462` | yes |
| Impersonation | First-class | Verified with TTL, watermark, evidence, limited allowlist | `packages/domain-core/src/backoffice.mjs:1212-1471`; `tests/unit/phase14-security.test.mjs` | no |
| Break-glass | First-class | Verified with incidentId, dual approval, TTL, evidence | `packages/domain-core/src/backoffice.mjs:1599-1834`; `tests/integration/phase17-backoffice-ops-api.test.mjs:500-586` | no |
| Access reviews | First-class | Verified | `packages/domain-core/src/backoffice.mjs:1473-1597` | no |
| Replay operations | First-class | Verified, but post-execution verification is too weak | `packages/domain-core/src/backoffice.mjs:298-430`; `tests/unit/phase17-replay-operations.test.mjs`; `tests/integration/phase17-backoffice-ops-api.test.mjs:691` | yes |
| Incident signals and post-review | First-class | Verified, post-review blocks close | `packages/domain-core/src/resilience.mjs:1299-1660`; `tests/integration/phase17-backoffice-ops-api.test.mjs:564-633` | no |
| Restore/replay drills | First-class | Verified, but not tied to runbook execution tracking | `packages/domain-core/src/resilience.mjs`; `tests/integration/phase3-restore-drills-api.test.mjs` | yes |
| Feature flags / emergency disable | First-class | Verified, but not separated from global kill switch domain | `packages/domain-core/src/resilience.mjs:234-486`; `tests/unit/phase14-resilience.test.mjs` | yes |
| Platform control plane / super admin | Claimed by prompt scope | Missing | `packages/domain-core/src/resilience.mjs:1188`; `apps/api/src/mission-control.mjs:5` | yes |
| Tenant registry / freeze / no-go board | Claimed by prompt scope | Missing | no object or route found | yes |
| Cross-tenant search | Claimed by prompt scope | Missing | no object or route found | yes |
| Runbook execution tracking | Claimed by prompt scope | Missing | no object or route found | yes |

## Backoffice Mutation Scope Matrix

| operation surface | allowed read scope | allowed write scope | required approvals | watermark/step-up requirement | proof in code/tests | blocker |
|---|---|---|---|---|---|---|
| Support diagnostics | Support case masked view | `plan_job_replay`, `execute_job_replay` only | support action approval för write diagnostics | no dedicated step-up receipt in domain object | `packages/domain-core/src/backoffice.mjs:1092-1210` | yes |
| Impersonation read-only | Masked user/session read | read-only support session | separate approval, self-approval denied | watermark + expiry | `packages/domain-core/src/backoffice.mjs:1212-1471` | no |
| Impersonation limited-write | Same as above | allowlisted `jobs.cancel`, `jobs.retry` | separate approval + support action approval path | watermark + expiry | `packages/domain-core/src/backoffice.mjs:1212-1471`; `tests/unit/phase14-security.test.mjs` | yes |
| Break-glass | Incident-bound masked read | allowlisted emergency actions | two distinct approvers | watermark + expiry | `packages/domain-core/src/backoffice.mjs:1599-1834`; `tests/integration/phase17-backoffice-ops-api.test.mjs:500-586` | no |
| Replay approve/execute | Support case / incident / dead letter binding | replay plan approve/execute | plannedBy and approvedBy separated | route-contract strong_mfa intent, no dedicated runtime trust receipt | `packages/domain-core/src/backoffice.mjs:298-430`; `apps/api/src/phase14-backoffice-routes.mjs:422-467` | yes |
| Incident status / post-review | Masked incident read | incident state/event mutations | post-review required för close | route-contract strong_mfa intent | `packages/domain-core/src/resilience.mjs:1505-1660`; `apps/api/src/phase14-backoffice-routes.mjs:941-1057` | yes |
| Feature flags / emergency disables | Ops read | flag publish / disable / release | dual control för high-risk/global | route-contract strong_mfa intent | `packages/domain-core/src/resilience.mjs:234-486` | yes |

## Super Admin Capability Matrix

| global capability | claimed control-plane behavior | actual runtime path | proof in code/tests | blocker |
|---|---|---|---|---|
| Tenant registry | All tenants visible with blockers and freeze state | Missing | no object or route found | yes |
| No-go board | Global blocker board | Missing | no object or route found | yes |
| Tenant quarantine / freeze | Read-only / mutation freeze / submission stop | Missing | no object or route found | yes |
| Global kill switches | Platform-wide payments/submission/export stop | Missing as separate runtime | only feature flags/emergency disable in `packages/domain-core/src/resilience.mjs:234-486` | yes |
| Cross-tenant incident graph | Blast radius över tenants/providers/releases | Missing | incidents only carry local `impactScope` | yes |
| Cross-tenant search | Tenant-safe masked search | Missing | no route or object found | yes |
| Provider control plane | Global provider health and affected tenants | Missing | no route or object found | yes |
| Runbook execution tracking | Runbook steps and evidence bound to operations | Missing | no runtime object found | yes |

## Runbook Coverage Matrix

| operational area | required runbook | actual repo file | runtime path covered | blocker |
|---|---|---|---|---|
| Support case and replay | `docs/runbooks/support-case-and-replay.md` | exists | support cases, replay, evidence | no |
| Backoffice audit review | `docs/runbooks/support-backoffice-and-audit-review.md` | exists | masking, support audit review | no |
| Impersonation | `docs/runbooks/support-impersonation.md` | exists | impersonation runtime | no |
| Replay and dead letter | canonical replay/dead-letter runbook | three overlapping files exist | partial and duplicative | yes |
| Restore drill | `docs/runbooks/restore-drill.md` | exists | restore drill runtime | no |
| Backup / DR | `docs/runbooks/backup-restore-and-disaster-recovery.md` | exists | contingency/raw DR guidance | no |
| Feature flag / emergency disable | `docs/runbooks/feature-flag-rollout-and-emergency-disable.md` | exists | feature flag and disable runtime | no |
| Secret/cert/key rotation canonical | `docs/runbooks/secrets-certificates-and-key-rotation.md` | exists | partial | no |
| Incident response | `docs/runbooks/incident-response.md` | missing | canonical incident governance missing | yes |
| Release evidence | `docs/runbooks/release-evidence.md` | missing | no canonical release-evidence runbook | yes |

## Concrete Operations Verification Matrix

| capability | claimed ops/support/security rule | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
|---|---|---|---|---|---|---|
| Break-glass | Emergency access must be limited, monitored and tested | incident-bound break-glass sessions with dual approval and expiry | `packages/domain-core/src/backoffice.mjs:1599-1834`; `tests/integration/phase17-backoffice-ops-api.test.mjs:500-586` | [Microsoft Entra emergency access](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access) | partial reality | yes |
| Incident close | Incident close must be blocked without post-review where policy requires it | close path checks för post-review | `packages/domain-core/src/resilience.mjs:1604-1660`; `tests/integration/phase17-backoffice-ops-api.test.mjs:564-633` | [CISA response playbooks](https://www.cisa.gov/sites/default/files/2023-01/federal_government_cybersecurity_incident_and_vulnerability_response_playbooks_508c_5.pdf) | verified reality | no |
| Restore drill | Recovery readiness must be planned and exercised | restore drills and checkpoints exist | `packages/domain-core/src/resilience.mjs`; `tests/integration/phase3-restore-drills-api.test.mjs` | [NIST SP 800-34](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) | partial reality | yes |
| Release evidence | Release evidence must be provenance-backed and reproducible | canonical runbook and binding missing in D16 | no runtime object or runbook found | [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final), [SLSA Provenance](https://slsa.dev/spec/v1.0/provenance) | missing | yes |
| Secret rotation | Secret rotation must be real operational path | secrets and rotations exist but not aggregated into platform control plane | `packages/domain-core/src/resilience.mjs`; `/v1/ops/secrets*` routes | [AWS rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html) | partial reality | yes |
| Masked support view | Support read should be masked by default | masked projections exist | `apps/api/src/phase14-backoffice-routes.mjs:1073-1167`; `tests/integration/phase17-backoffice-ops-api.test.mjs:135,451` | privileged-access guidance | partial reality | yes |
| Replay resolution | Dead letter must only resolve after verified recovery | replay execution sets dead letter resolved too early | `tests/integration/phase17-backoffice-ops-api.test.mjs:691`; `packages/domain-core/src/jobs.mjs:1559-1563` | incident/recovery sources | partial reality | yes |

## Critical Findings

- F16-C1 saknad global super-admin / platform control plane
- F16-C2 saknad tenant registry / quarantine / global kill switch
- F16-C3 saknade canonical runbooks `incident-response.md` och `release-evidence.md`

## High Findings

- F16-H1 mission-control är inte super-admin
- F16-H2 masked view utan reveal workflow
- F16-H3 break-glass saknar full emergency-access-governance
- F16-H4 dead-letter löses för tidigt efter replay
- F16-H5 incident blast radius graph saknas
- F16-H6 freshness/staleness/rebuild control saknas
- F16-H7 emergency disable blandas ihop med kill-switchdomän
- F16-H8 route/surface drift mellan backoffice och ops
- F16-H9 runbook execution tracking saknas
- F16-H10 runtime auth-boundary är tunnare än route-contract intent

## Medium Findings

- F16-M1 support-case-state-machine drift
- F16-M2 impersonation mutation scope saknar first-class governance
- F16-M3 correction orchestration är inte separerad från replay
- F16-M4 queue/SLA/submission monitor saknar global aggregation
- F16-M5 support export / retention / legal hold saknas

## Low Findings

- F16-L1 drills är inte kopplade till release-evidence eller runbook execution

## Cross-Domain Blockers

- Domän 2 måste leverera hårdare trust-level receipts för high-risk operations.
- Domän 13 måste leverera global reporting/search/workbench-lager som super-admin kan bygga på utan att bli shadow truth.
- Domän 15 måste leverera cutover watch och rollback watch som Domän 16 kan driva operativt.
- Domän 17 måste binda release evidence, provenance och GA-gates till Domän 16:s runbooks och drills.

## Go-Live Blockers

- Ingen global tenant registry eller no-go board
- Ingen tenant quarantine/freeze eller separat global kill switch
- Ingen canonical reveal workflow
- Dead-letter resolution är för svag efter replay
- Saknade canonical runbooks för incident response och release evidence
- Ingen runbook execution tracking
- Ingen cross-tenant super-admin-surface

## Repo Reality Vs Intended Operations / Backoffice / Super Admin Model

- Support/backoffice är first-class för företagsscope: ja.
- Super-admin / platform control plane finns: nej.
- Support cases, incidents, replay operations och dead letters är first-class objekt: ja, men dead-letter-resolution är för grund.
- Masked troubleshooting är verklig: ja som default view, nej som komplett governance eftersom reveal workflow saknas.
- Support writes är command-only: delvis, ja för diagnostics/replay men inte hårt nog som generell mutation-governance.
- Impersonation är verkligt begränsad, vattenmärkt och godkänd: ja.
- Break-glass är incidentbunden, dual-approved och tidsboxad: ja.
- Access reviews, SoD-remediation och signoff är verkliga: ja.
- Incident close blockeras av saknad post-review: ja.
- Queue/SLA/escalation/submission monitor är verkliga operatorverktyg: ja per företag, nej som global styrning.
- Cutover watch och rollback watch är inte förstaklass i denna domän än.
- Tenant registry, quarantine/freeze, no-go board, blast radius och cross-tenant search saknas.
- Route- och surface-modellen är inte slutligt låst.
- Total klassning: `partial reality`.

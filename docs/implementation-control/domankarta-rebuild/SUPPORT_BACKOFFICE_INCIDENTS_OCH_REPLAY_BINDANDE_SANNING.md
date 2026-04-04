# SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för support, backoffice, incidenter, replay, dead letters, correction orchestration, quarantine och no-go governance.

## Syfte

Detta dokument ska låsa hur support och operations agerar när något gar fel utan att skapa manuella side paths, datalackage, skuggmutationer eller oauktoriserad replay.

## Omfattning

Detta dokument omfattar:
- support cases
- masked och reveal-bound supportarbete
- incident lifecycle
- dead-letter handling
- replay requests och replay execution
- correction orchestration
- no-go board
- quarantine, freeze och release-blocking decisions

Detta dokument omfattar inte:
- auth och secret primitives som egna sanningar
- affärsreglerna i de underliggande flödesbiblarna
- rena chaos drills, som ägs av stressbibeln

## Absoluta principer

- support får inte skapa dold mutation utan command-path och evidence
- replay är inte manuell SQL, replay är modellerad runtime
- dead letters får inte ligga som tyst backlog
- incidents får inte stangas utan receipt och post-review
- reveal och break-glass får inte blandas ihop
- no-go får blockera release, cutover, payout och filing
- filing- eller payout-nara replay får inte godkännas om owning truth doc inte uttryckligen tillater det

## Bindande dokumenthierarki för support, backoffice, incidents och replay

- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger approvals, reveal evidence, break-glass och sign-off
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` äger support identity, reveal, impersonation och SoD
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` äger decrypt boundaries
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` äger cutover, rollback och fail-forward truth
- `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md` äger drills, stop conditions och readiness proof
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` äger expected outcomes som replay och correction måste landa i
- Domän 16 och 27 får inte definiera avvikande support-, incident-, replay- eller no-go truth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `SupportCase`
- `IncidentRecord`
- `DeadLetterRecord`
- `ReplayRequest`
- `ReplayExecution`
- `CorrectionOrchestration`
- `NoGoDecision`
- `QuarantineDecision`
- `ContainmentReceipt`
- `PostIncidentReview`

## Kanoniska state machines

- `SupportCase`: `open -> triaged -> in_progress -> waiting_input -> resolved | escalated | closed`
- `IncidentRecord`: `open -> contained -> mitigated -> monitoring -> closed`
- `ReplayRequest`: `draft -> pending_approval -> approved | rejected | expired`
- `ReplayExecution`: `queued -> running -> completed | failed | aborted`
- `CorrectionOrchestration`: `draft -> approved -> executing -> completed | failed | cancelled`
- `NoGoDecision`: `draft -> active | cleared | superseded`
- `QuarantineDecision`: `draft -> active | cleared | superseded`

## Kanoniska commands

- `CreateSupportCase`
- `CreateIncidentRecord`
- `RecordDeadLetter`
- `RecordContainmentReceipt`
- `ApproveReplayRequest`
- `ExecuteReplay`
- `OpenCorrectionOrchestration`
- `IssueNoGoDecision`
- `IssueQuarantineDecision`
- `CloseIncidentWithPostReview`

## Kanoniska events

- `SupportCaseCreated`
- `IncidentRecordOpened`
- `DeadLetterRecorded`
- `ContainmentReceiptRecorded`
- `ReplayRequestApproved`
- `ReplayExecuted`
- `CorrectionOrchestrationOpened`
- `NoGoIssued`
- `QuarantineIssued`
- `PostIncidentReviewCompleted`

## Kanoniska route-familjer

- `POST /support-cases`
- `POST /incidents`
- `POST /dead-letters`
- `POST /containment-receipts`
- `POST /replay-requests`
- `POST /replay-executions`
- `POST /corrections`
- `POST /no-go-decisions`
- `POST /quarantine-decisions`
- `POST /post-incident-reviews`

## Kanoniska permissions och review boundaries

- support write access får vara minst-möjliga och scoped
- replay approval får inte godkännas av samma operator som ska exekvera replay
- no-go och quarantine är platform-level authorities
- support får inte fa broad tenant access genom workbench snarare an explicit policy
- incident closure för blocking severity kraver post-review approver som inte är ensam exekveringsoperator

## Nummer-, serie-, referens- och identitetsregler

- varje support case ska ha `SUP-YYYY-NNNNN`
- varje incident ska ha `INC-YYYY-NNNNN`
- varje dead letter ska ha `DLQ-YYYY-NNNNN`
- varje replay request ska ha `RPL-YYYY-NNNNN`
- varje replay execution ska ha `RPE-YYYY-NNNNN`
- varje no-go ska ha `NOG-YYYY-NNNNN`
- varje quarantine ska ha `QTN-YYYY-NNNNN`

## Valuta-, avrundnings- och omräkningsregler

- EJ TILLÄMPLIGT som egen policy
- support, replay och correction måste återanvända owning truth docs för belopp och valuta

## Replay-, correction-, recovery- och cutover-regler

- replay får bara exekveras mot explicit replayable commands eller receipts
- correction orchestration får inte skrivas som dold supportmutation
- cutover incidents måste knytas till migration receipts
- dead letters får inte rensas utan explicit resolution path
- replay får inte korsa en closed fiscal or filing boundary utan owning truth doc approval

## Huvudflödet

1. support case eller incident öppnas
2. scope, masking, severity och blast radius bestams
3. dead letters eller replaybehov identifieras
4. replay eller correction begars och godkänns
5. exekvering sker via command path
6. post-review, evidence och no-go eller clear-beslut lagras

## Bindande scenarioaxlar

- case type: support, incident, replay, correction, no-go
- scope: tenant, company, domain, platform
- mutation profile: read-only, controlled write, replay, correction
- sensitivity: masked, revealed, break-glass-forbidden
- severity: info, operational, blocking, release-blocking
- time criticality: normal, payout-sensitive, filing-sensitive, cutover-sensitive

## Bindande policykartor

- `OPS-POL-001 severity_to_required_approvals`
- `OPS-POL-002 replay_type_to_allowed_execution_path`
- `OPS-POL-003 dead_letter_type_to_resolution_owner`
- `OPS-POL-004 no_go_scope_to_blocked_actions`
- `OPS-POL-005 quarantine_scope_to_runtime_effects`
- `OPS-POL-006 filing_or_payout_sensitive_replay_policy`
- `OPS-POL-007 incident_closure_to_required_post_review`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `OPS-P0001` support case created with masked scope and owner
- `OPS-P0002` incident opened with blast radius, severity and containment plan
- `OPS-P0003` dead letter recorded with owning flow, receipt and retry posture
- `OPS-P0004` replay approved with exact command path and target scope
- `OPS-P0005` replay executed with idempotent result and evidence bundle
- `OPS-P0006` no-go active with blocked actions list
- `OPS-P0007` quarantine active with runtime effects and tenant scope
- `OPS-P0008` correction orchestration closed with canonical receipts only
- `OPS-P0009` containment receipt recorded with time, actor and temporary controls
- `OPS-P0010` post-incident review completed with root cause, control gap and follow-up owner

## Bindande rapport-, export- och myndighetsmappning

- support and incident exports must preserve masking and sensitivity
- replay and correction receipts must be exportable to audit bundles
- no-go board exports must show active blockers and affected release, cutover, payout or filing actions
- filing-sensitive incidents must map to affected filing windows and owning filing receipts

## Bindande scenariofamilj till proof-ledger och rapportspar

- `OPS-A001` masked support case -> `OPS-P0001`
- `OPS-B001` blocking incident -> `OPS-P0002`,`OPS-P0009`
- `OPS-C001` dead letter queued -> `OPS-P0003`
- `OPS-D001` approved replay -> `OPS-P0004`, `OPS-P0005`
- `OPS-E001` active no-go -> `OPS-P0006`
- `OPS-F001` quarantine tenant -> `OPS-P0007`
- `OPS-G001` correction orchestration -> `OPS-P0008`
- `OPS-Z001` post-incident review -> `OPS-P0010`

## Tvingande dokument- eller indataregler

- every replay request must name owning truth doc, target receipts and expected outcome
- every incident must include blast radius and containment plan
- every no-go must include blocked actions and clearing conditions
- every dead letter must include owning flow and next resolution owner
- every filing- or payout-sensitive action must include time-criticality marker

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `OPS-R001 unsupported_manual_mutation`
- `OPS-R002 missing_replay_approval`
- `OPS-R003 dead_letter_without_owner`
- `OPS-R004 reveal_scope_violation`
- `OPS-R005 no_go_required`
- `OPS-R006 quarantine_required`
- `OPS-R007 filing_or_payout_replay_forbidden`
- `OPS-R008 missing_post_incident_review`

## Bindande faltspec eller inputspec per profil

- support case: `case_id`, `scope`, `severity`, `masking_profile`, `owner`
- incident: `blast_radius`, `containment_plan`, `affected_domains[]`, `severity`
- replay request: `owner_truth_doc`, `receipt_refs[]`, `expected_outcome_ref`, `approver_id`
- no-go decision: `scope`, `blocked_actions[]`, `clear_conditions[]`, `issued_by`
- containment receipt: `controls_applied[]`, `effective_from`, `operator_id`
- post-review: `root_cause`, `control_gap`, `follow_up_owner`, `review_approver`

## Scenariofamiljer som hela systemet måste tacka

- read-only support
- masked reveal-needed support
- dead letter with replay
- dead letter with manual correction orchestration
- blocking incident
- active no-go
- tenant quarantine
- cutover incident
- payroll or filing replay denial
- post-incident closure review

## Scenarioregler per familj

- support without mutation stays read-only
- replay without approval stays blocked
- filing or payout replay without exact allowed path stays blocked
- no-go blocks until clear conditions met
- quarantine must visibly affect runtime and operator surfaces
- incident closure för blocking severity must include post-review

## Blockerande valideringar

- replay blocked om owning truth doc saknas
- replay blocked om expected outcome saknas
- incident closure blocked om post-review saknas
- no-go clear blocked om blockerande criteria kvarstar
- support reveal blocked om reveal policy inte tillater det
- filing-sensitive replay blocked om transport or legal window guaräntees saknas

## Rapport- och exportkonsekvenser

- support metrics must separate masked reads from controlled writes
- incident exports must carry containment and closure receipts
- replay exports must carry before or after evidence and command lineage
- no-go exports must carry affected operational lanes and release lanes

## Förbjudna förenklingar

- SQL hotfix som ersätter replay
- incident stangd utan receipt
- dead letters som bara rensas
- no-go som bara är Slack-text
- quarantine utan runtime effect
- filing-sensitive replay based only on operator judgement

## Fler bindande proof-ledger-regler för specialfall

- `OPS-P0011` filing replay denied because transport window or receipt guaräntees are missing
- `OPS-P0012` payroll replay denied because payout or AGI side effects would diverge
- `OPS-P0013` reveal approved but still masked fields outside allowed scope
- `OPS-P0014` cutover incident linked to rollback or fail-forward receipt
- `OPS-P0015` dead letter aged past policy SLA raises blocking incident or no-go automatically

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `OPS-P0005` must create replay execution state with explicit verdict
- `OPS-P0006` must create active no-go state visible in release and cutover surfaces
- `OPS-P0007` must create quarantine state visible in runtime
- `OPS-P0008` must create correction-completed state
- `OPS-P0015` must create escalated dead-letter state when SLA is exceeded

## Bindande verifikations-, serie- och exportregler

- EJ TILLÄMPLIGT som egen voucher policy
- replay or correction touching vouchers must still obey owning truth docs
- exported operator evidence must preserve case id, incident id, replay id and no-go id

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- scope x severity
- read-only x replay x correction
- masked x revealed
- tenant x company x platform
- normal x filing-sensitive x payout-sensitive x cutover-sensitive

## Bindande fixture-klasser för support, backoffice, incidents och replay

- `OPS-FXT-001` read-only support
- `OPS-FXT-002` controlled replay
- `OPS-FXT-003` dead letter and escalation
- `OPS-FXT-004` active no-go or quarantine
- `OPS-FXT-005` filing-sensitive denial

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_visibility`
- `expected_mutation_path`
- `expected_blockers[]`
- `expected_evidence_artifacts[]`
- `expected_no_go_or_quarantine_state`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT som egen voucher policy

## Bindande expected outcome per central scenariofamilj

- approved replay must yield explicit command-path execution, evidence bundle and deterministic verdict
- blocking incident must yield containment receipt and post-review before closure
- no-go must block configured release, cutover, payout or filing actions
- filing-sensitive replay denial must remain denied until owning truth doc explicitly allows it

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- read-only support -> masked non-mutating case
- replay -> approved command-path execution or explicit denial
- dead letter -> owned resolution path
- incident -> containment plus closure evidence
- no-go -> active blocker state
- quarantine -> runtime-visible blocked state
- cutover incident -> rollback or fail-forward linkage

## Bindande testkrav

- replay-without-approval blocker tests
- dead-letter aging and escalation tests
- filing-sensitive replay denial tests
- no-go visibility tests across release and cutover surfaces
- quarantine runtime-effect tests
- blocking-incident post-review tests

## Källor som styr dokumentet

- [NIST SP 800-61 Rev. 2 Computer Security Incident Handling Guide](https://csrc.nist.gov/pubs/sp/800/61/r2/final)
- [NIST SP 800-92 Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [PostgreSQL 17: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/17/continuous-archiving.html)

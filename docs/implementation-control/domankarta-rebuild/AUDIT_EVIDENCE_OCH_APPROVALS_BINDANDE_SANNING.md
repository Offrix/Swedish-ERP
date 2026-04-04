# AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för audit, evidence, approvals, sign-off och chain of custödy.

## Syfte

Detta dokument ska låsa hur beslut, receipts, approvals, reveal-actions, break-glass, filing packages och operatoringrepp byggs sa att varje legal effect, high-risk action och release- eller cutoverbeslut kan bevisas i efterhand utan att luta på flyktiga loggar.

## Omfattning

Detta dokument omfattar:
- audit events
- evidence artifacts
- evidence bundles
- approval requests and decisions
- sign-off chains
- support reveal och break-glass evidence
- filing, close och release sign-off
- retention, redaction och exportbara bevispaket

Detta dokument omfattar inte:
- själva affärslogiken i ekonomi, lön eller auth
- generell observability utan affärs- eller sakerhetsbevisvarde

## Absoluta principer

- varje legal effect ska ha attributable evidence
- varje high-risk action ska ha approval- eller policyspan
- support, reveal och break-glass ska vara separat evidensklass
- auditlagret får inte vara beroende av flyktiga loggar som enda sanning
- inga kritiska approvals får vara muntliga eller osparbara i systemet
- evidence artifacts får inte kunna muteras efter freeze utan supersession lineage
- chain of custödy får inte brytas mellan event, artifact, bundle och sign-off

## Bindande dokumenthierarki för audit, evidence och approvals

- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger bokföringstruth som auditlagret ska kunna bevisa
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` äger identity- och permissiongranser som approvals bygger på
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` äger callback- och transportevidence för partnerkedjor
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` äger proof bundles för release gates
- `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md` äger cutover- och rollbackevidence
- Domän 5, 10, 11, 15 och 27 får inte definiera avvikande audit-, evidence- eller approval-truth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `AuditEvent`
- `EvidenceArtifact`
- `EvidenceBundle`
- `ApprovalRequest`
- `ApprovalDecision`
- `SignOffPackage`
- `RetentionPolicy`
- `RedactionReceipt`
- `RevealReceipt`
- `BreakGlassEvent`
- `ChainOfCustodyReceipt`

## Kanoniska state machines

- `ApprovalRequest`: `draft -> pending -> approved | rejected | expired | revoked`
- `SignOffPackage`: `draft -> ready -> signed_off | rejected | superseded`
- `EvidenceBundle`: `draft -> frozen -> referenced | superseded | retained`
- `BreakGlassEvent`: `issued -> used | expired | revoked`
- `RedactionReceipt`: `draft -> approved -> executed | rejected`

## Kanoniska commands

- `RecordAuditEvent`
- `CreateEvidenceArtifact`
- `FreezeEvidenceBundle`
- `CreateApprovalRequest`
- `RecordApprovalDecision`
- `CreateSignOffPackage`
- `SignOffPackage`
- `IssueBreakGlassEvent`
- `RecordRevealReceipt`
- `RecordChainOfCustodyReceipt`

## Kanoniska events

- `AuditEventRecorded`
- `EvidenceArtifactCreated`
- `EvidenceBundleFrozen`
- `ApprovalRequestCreated`
- `ApprovalDecisionRecorded`
- `SignOffPackageCreated`
- `SignOffPackageCompleted`
- `BreakGlassEventIssued`
- `RevealReceiptRecorded`
- `ChainOfCustodyReceiptRecorded`

## Kanoniska route-familjer

- `/api/audit/*`
- `/api/evidence/*`
- `/api/approvals/*`
- `/api/signoff/*`
- `/api/reveal/*`
- `/api/break-glass/*`

## Kanoniska permissions och review boundaries

- `audit.read` får läsa auditspan inom policy
- `approval.act` får fatta approvalbeslut inom tilldelad boundary
- `support.reveal` får inte ge fri reveal utan explicit reveal-approval eller policygrund
- `break_glass.use` ska vara extremt begränsad och separat auditerad
- den som skapar ett approval request får inte ensam signera slutligt sign-off package för samma high-risk scope

## Nummer-, serie-, referens- och identitetsregler

- varje audit event ska ha stabil event id, actor id, action id, timestamp och source context
- varje evidence artifact ska ha checksumma, content digest eller motsvarande immutable ref
- varje approval request ska ha requester, scope, expiry och required approver profile
- varje sign-off package ska peka på frozen snapshot eller evidence bundle
- varje chain-of-custödy receipt ska peka på föregående custödy step

## Valuta-, avrundnings- och omräkningsregler

EJ TILLÄMPLIGT. Auditlagret äger ingen egen valutalogik.

## Replay-, correction-, recovery- och cutover-regler

- audit events får inte raderas vid correction; nya correction events ska länka till tidigare lineage
- evidence bundles ska kunna fryses om deterministiskt mot samma artifacts
- cutover ska skapa egna sign-off packages och migration evidence, inte skriva över tidigare proofs
- replay av samma external event får skapa ny processing evidence men inte ny legal-effect lineage om idempotency stoppar dubbelverkan

## Huvudflödet

1. command eller high-risk handling sker
2. audit event skrivs
3. artifacts och receipts binds till evidence bundle
4. approval request eller sign-off package skapas där policy kraver det
5. decisions skrivs
6. package fryses och refereras i downstream reporting, filing, migration eller support workbench

## Bindande scenarioaxlar

- business action vs support action vs security action
- single approval vs multi-step approval
- filing sign-off vs operational sign-off vs release gate
- ordinary support vs reveal vs break-glass
- original decision vs corrected decision vs superseded decision
- masked view vs unmasked reveal

## Bindande policykartor

- `AUD-POL-001`: all legal effect requires attributable audit event
- `AUD-POL-002`: high-risk actions require explicit approval or explicit no-approval policy proof
- `AUD-POL-003`: break-glass always creates separate evidence class
- `AUD-POL-004`: evidence bundles freeze immutable refs, not mutable live views
- `AUD-POL-005`: sign-off package always references frozen scope
- `AUD-POL-006`: chain-of-custödy required för exportable evidence bundles
- `AUD-POL-007`: reveal or unmask operations require explicit reveal receipt
- `AUD-POL-008`: redaction never destroys custödy lineage

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `AUD-P0001` audit event with actor, action, scope and timestamp
- `AUD-P0002` evidence artifact with checksum and source ref
- `AUD-P0003` approval request created with expiry and approver policy
- `AUD-P0004` approval recorded with approver identity and verdict
- `AUD-P0005` sign-off package frozen and signed
- `AUD-P0006` break-glass event issued and used with explicit justification
- `AUD-P0007` reveal receipt recorded with scope, reason and duration
- `AUD-P0008` chain-of-custödy receipt links artifact, bundle, export and recipient
- `AUD-P0009` rejected or expired approval remains visible in lineage
- `AUD-P0010` superseded package points to replacement package and retention rule

## Bindande rapport-, export- och myndighetsmappning

- audit and evidence are not myndighetsfiler in sig
- they are mandatory support för bokföring, tax, payroll, filing and security verifiability
- exportbara evidence bundles must support audit pack, release pack, migration pack and filing support pack

## Bindande scenariofamilj till proof-ledger och rapportspar

- `AUD-A001` ordinary business mutation -> `AUD-P0001`,`AUD-P0002`
- `AUD-A002` high-risk approval -> `AUD-P0003`,`AUD-P0004`
- `AUD-A003` filing sign-off -> `AUD-P0005`
- `AUD-A004` support reveal -> `AUD-P0007`
- `AUD-Z001` break-glass -> `AUD-P0006`
- `AUD-Z002` rejected or expired approval -> `AUD-P0009`
- `AUD-Z003` superseded sign-off package -> `AUD-P0010`

## Tvingande dokument- eller indataregler

- actor identity required
- source scope required
- immutable artifact ref required where receipts or files exist
- approval requests require expiry and approver scope
- reveal receipts require explicit justification and scope
- exportable bundles require chain-of-custödy receipt

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AUD-R001` missing_actor
- `AUD-R002` missing_scope
- `AUD-R003` missing_artifact_ref
- `AUD-R004` approval_required_but_missing
- `AUD-R005` expired_approval
- `AUD-R006` break_glass_without_evidence
- `AUD-R007` reveal_without_receipt
- `AUD-R008` missing_chain_of_custödy

## Bindande faltspec eller inputspec per profil

- `audit_event`: `actor_id`, `action`, `scope`, `timestamp`, `source_context`
- `approval_request`: `requester`, `scope`, `reason`, `expiry`, `approver_policy`
- `signoff_package`: `frozen_scope_ref`, `artifact_refs[]`, `signoff_purpose`
- `break_glass`: `requester`, `justification`, `expiry`, `target_scope`
- `reveal_receipt`: `approver_id`, `revealed_scope`, `reason`, `duration_limit`
- `chain_of_custody`: `artifact_ref`, `bundle_ref`, `export_ref`, `recipient_ref`

## Scenariofamiljer som hela systemet måste tacka

- ordinary legal effect audit
- high-risk approval
- rejected approval
- expired approval
- filing sign-off
- release sign-off
- support reveal
- break-glass
- corrected decision lineage
- superseded package lineage

## Scenarioregler per familj

- ordinary legal effect must have attributable audit event
- high-risk action without approval must block unless explicit policy says no approval needed
- filing sign-off must point to frozen scope
- break-glass must never be silent
- reveal must not reuse generic support-read evidence
- rejected and expired approvals must remain queryable

## Blockerande valideringar

- missing actor
- missing scope
- missing evidence för signed-off package
- missing approval where policy requires it
- expired approval reused
- break-glass without explicit justification
- reveal without reveal receipt
- export without chain-of-custödy receipt

## Rapport- och exportkonsekvenser

- support, audit and filing views must expose evidence lineage
- sign-off packages must be exportable as audit support artifacts
- exported bundles must preserve digests, timestamps and custödy chain

## Förbjudna förenklingar

- relying on plain logs as sole audit source
- allowing hidden reveal or break-glass
- sign-off without frozen scope
- approval by role label without explicit approver identity
- evidence export without custödy lineage

## Fler bindande proof-ledger-regler för specialfall

- `AUD-P0011` support reveal denied must still create denial evidence
- `AUD-P0012` correction decision must point to original decision lineage
- `AUD-P0013` redaction receipt must preserve pre-redaction artifact digest and post-redaction export scope
- `AUD-P0014` bundle export to external auditor must record recipient and export timestamp

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- audit layer creates evidence, approvals and sign-off truth only
- downstream business effect belongs to owning domain
- reveal and break-glass receipts must update support-risk state för the session or case

## Bindande verifikations-, serie- och exportregler

- audit ids are evidence identifiers only
- no accounting series originates here
- exported evidence packages must preserve stable bundle id and artifact ids

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- ordinary vs high-risk
- business vs support vs security
- approved vs rejected vs expired
- sign-off vs operational approval
- masked vs unmasked
- original vs correction vs superseded

## Bindande fixture-klasser för audit, evidence och approvals

- `AUD-FXT-001` ordinary mutation evidence
- `AUD-FXT-002` high-risk approval
- `AUD-FXT-003` filing or release sign-off
- `AUD-FXT-004` support reveal
- `AUD-FXT-005` break-glass
- `AUD-FXT-006` external evidence export

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- actor profile
- expected audit verdict
- expected approval or sign-off verdict
- expected evidence artifacts
- expected chain-of-custödy artifacts

## Bindande canonical verifikationsseriepolicy

- audit ids are evidence identifiers only
- no accounting voucher series originates here

## Bindande expected outcome per central scenariofamilj

- ordinary legal effect must yield attributable audit event plus immutable evidence artifact
- high-risk approval must yield explicit request, explicit decision and explicit approver identity
- support reveal must yield reveal receipt even when denied
- break-glass must yield separate evidence class and justification

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- ordinary mutation -> `AUD-P0001`,`AUD-P0002`
- high-risk approval -> `AUD-P0003`,`AUD-P0004`
- filing or release sign-off -> `AUD-P0005`
- support reveal -> `AUD-P0007`
- break-glass -> `AUD-P0006`
- denied or expired approval -> `AUD-P0009`
- superseded package -> `AUD-P0010`

## Bindande testkrav

- immutable artifact digest tests
- approval expiry tests
- reveal-without-receipt blocker tests
- break-glass justification tests
- chain-of-custödy export tests
- superseded-package lineage tests

## Källor som styr dokumentet

- [RFC 3161 Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161)
- [NIST SP 800-92 Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final)
- [NIST SP 800-63B Digital Identity Guidelines](https://csrc.nist.gov/pubs/sp/800/63/b/final)

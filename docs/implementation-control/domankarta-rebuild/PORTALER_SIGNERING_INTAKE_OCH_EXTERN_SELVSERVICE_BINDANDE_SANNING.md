# PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för externa portaler, intake, signering, extern dokumentdelning och self-service.

## Syfte

Detta dokument ska låsa hur externa parter interagerar med plattformen genom formular, uppladdning, signering, status och self-service utan att skapa osakra sidokanaler, otydlig legal effect eller cross-tenant leakage.

## Omfattning

Detta dokument omfattar:
- portal accounts och grants
- public forms
- external intake
- document uploads
- signing flows
- status views
- self-service actions
- share and redirect lineage

Detta dokument omfattar inte:
- intern workspace-truth
- auth primitives som egen sanning
- kommersiella objekt som ägs av ändra docs

## Absoluta principer

- extern part får bara se explicit beviljat scope
- intake får aldrig skriva direkt till canonical core utan routed commands
- signering får inte markeras klar utan evidens
- public forms får inte ge tenant leakage
- self-service får inte dolja approval boundaries
- extern länk eller token får aldrig vara hela securitymodellen; den måste alltid vara scopebunden, tidsbunden och auditbar

## Bindande dokumenthierarki för portaler, signering, intake och extern self-service

- `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md` äger dokumentingest efter uppladdning
- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` äger extern auth, session och reveal boundaries
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger sign-off, evidence och approval truth
- `FAKTURAFLODET_BINDANDE_SANNING.md`, `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`, `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` och ändra owning docs äger business outcome
- Domän 22 får inte definiera avvikande portal-, signerings-, intake- eller self-service-truth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `PortalAccount`
- `PortalIdentity`
- `PortalAccessGrant`
- `PublicFormDefinition`
- `PortalIntakeRequest`
- `PortalDocumentUpload`
- `PortalSigningEnvelope`
- `PortalStatusView`
- `PortalShareToken`
- `PortalActionReceipt`

## Kanoniska state machines

- `PortalAccount`: `invited -> active | suspended | revoked`
- `PortalAccessGrant`: `draft -> active | expired | revoked`
- `PortalIntakeRequest`: `submitted -> triaged -> accepted | rejected | cancelled`
- `PortalSigningEnvelope`: `draft -> issued -> signed | declined | expired | revoked`
- `PortalDocumentUpload`: `uploaded -> scanned -> accepted | rejected | blocked`
- `PortalShareToken`: `issued -> active | expired | revoked | consumed`

## Kanoniska commands

- `InvitePortalAccount`
- `GrantPortalAccess`
- `SubmitPortalIntakeRequest`
- `UploadPortalDocument`
- `IssuePortalSigningEnvelope`
- `RecordPortalSignature`
- `ExecutePortalSelfServiceAction`
- `IssuePortalShareToken`
- `RevokePortalShareToken`

## Kanoniska events

- `PortalAccountInvited`
- `PortalAccessGranted`
- `PortalIntakeRequestSubmitted`
- `PortalDocumentUploaded`
- `PortalSigningEnvelopeIssued`
- `PortalSignatureRecorded`
- `PortalSelfServiceActionExecuted`
- `PortalShareTokenIssued`
- `PortalShareTokenRevoked`

## Kanoniska route-familjer

- `POST /portal/accounts`
- `POST /portal/grants`
- `POST /portal/intake`
- `POST /portal/uploads`
- `POST /portal/signing-envelopes`
- `POST /portal/self-service-actions`
- `POST /portal/share-tokens`
- `GET /portal/status`

## Kanoniska permissions och review boundaries

- portal grants must be object-scoped
- public forms must resolve to tenant and intake target before persistence
- signing envelopes för high-risk documents may require second-side approval
- self-service actions must respect owning flow approvals
- share tokens får inte utoka scope utover underlying grant

## Nummer-, serie-, referens- och identitetsregler

- varje portal account ska ha `PRT-YYYY-NNNNN`
- varje intake request ska ha `INT-YYYY-NNNNN`
- varje upload ska ha `UPL-YYYY-NNNNN`
- varje signing envelope ska ha `SIG-YYYY-NNNNN`
- varje share token ska ha `SHT-YYYY-NNNNN`

## Valuta-, avrundnings- och omräkningsregler

- portal views får inte presentera omräknade belopp som own truth
- displayed financial values must carry source lineage if shown externally
- externally shown totals får inte avvika från owning truth docs pga portal-specific formattinglogik

## Replay-, correction-, recovery- och cutover-regler

- portal submissions must be replayable through routed command receipts
- expired or declined signatures must preserve evidence
- uploads must survive scanning retries without duplicate intake effect
- cutover must preserve externally visible status ids or redirect lineage
- revoked share tokens får inte kunna återupplivas genom cache eller old links

## Huvudflödet

1. external identity or invite established
2. scoped access gränted
3. form submitted, status viewed or document uploaded
4. request routed to owning flow
5. status exposed back through scoped portal view
6. signing and self-service actions produce evidence and routed commands

## Bindande scenarioaxlar

- actor type: customer, supplier, owner, candidate, other external party
- auth mode: invited session, verified session, anonymous form, shared token
- action type: form submit, upload, sign, view, self-service update, cancel
- evidence mode: upload receipt, sign receipt, view-only, approval-required
- scope type: object-only, case-only, limited company-wide
- grant posture: direct grant, invite grant, tokenized share, revoked grant

## Bindande policykartor

- `PRT-POL-001 actor_type_to_allowed_scope`
- `PRT-POL-002 intake_type_to_required_review`
- `PRT-POL-003 signing_type_to_required_evidence`
- `PRT-POL-004 self_service_action_to_allowed_command_path`
- `PRT-POL-005 portal_status_to_masking_policy`
- `PRT-POL-006 share_token_to_allowed_scope_and_expiry`
- `PRT-POL-007 anonymous_intake_to_tenant_binding_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `PRT-P0001` portal access gränted with explicit object scope
- `PRT-P0002` intake request submitted with routed target and evidence refs
- `PRT-P0003` upload accepted and forwarded to scanning
- `PRT-P0004` signing envelope issued with signer scope and expiry
- `PRT-P0005` signature recorded with evidence bundle and status update
- `PRT-P0006` self-service action executed through owning command path
- `PRT-P0007` access denied because scope or identity rule failed
- `PRT-P0008` anonymous form accepted only after tenant-safe routing
- `PRT-P0009` expired or revoked envelope remains visible as non-signable state
- `PRT-P0010` share token issued with explicit scope, expiry and revocation lineage

## Bindande rapport-, export- och myndighetsmappning

- sign receipts and upload receipts must be exportable to audit bundles
- portal status exports must preserve masking and external scope
- externally signed artifacts must map to owning object evidence
- externally visible agreement status får inte divergera från owning contract or order truth

## Bindande scenariofamilj till proof-ledger och rapportspar

- `PRT-A001` invited portal account -> `PRT-P0001`
- `PRT-B001` public intake form -> `PRT-P0002`,`PRT-P0008`
- `PRT-C001` document upload -> `PRT-P0003`
- `PRT-D001` signing envelope lifecycle -> `PRT-P0004`, `PRT-P0005`, `PRT-P0009`
- `PRT-E001` allowed self-service action -> `PRT-P0006`
- `PRT-F001` denied portal access -> `PRT-P0007`
- `PRT-G001` share token lifecycle -> `PRT-P0010`

## Tvingande dokument- eller indataregler

- every public form must resolve tenant and target workflow
- every upload must preserve original artifact and content type
- every signing envelope must name signer, object scope and expiry
- every self-service action must map to owning command path
- every share token must store scope, expiry, revocation state and audit lineage

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `PRT-R001 missing_scope`
- `PRT-R002 expired_signing_envelope`
- `PRT-R003 unresolved_tenant_binding`
- `PRT-R004 blocked_self_service_action`
- `PRT-R005 missing_upload_evidence`
- `PRT-R006 revoked_share_token`
- `PRT-R007 cross_tenant_portal_access_denied`

## Bindande faltspec eller inputspec per profil

- portal account: `portal_account_id`, `identity_ref`, `scope_refs[]`, `status`
- intake request: `form_id`, `actor_type`, `tenant_binding`, `target_workflow`, `evidence_refs[]`
- upload: `upload_id`, `original_artifact_ref`, `mime_type`, `target_workflow`
- signing envelope: `signer_ref`, `object_scope`, `expiry_at`, `evidence_policy`
- share token: `token_id`, `scope_ref`, `expires_at`, `grant_ref`, `revoked=false|true`

## Scenariofamiljer som hela systemet måste tacka

- invited customer portal
- supplier intake
- anonymous public form
- signed agreement
- declined or expired signature
- upload then review
- self-service cancellation or update
- denied cross-scope or cross-tenant access
- share token issued and revoked

## Scenarioregler per familj

- anonymous form must still resolve tenant safely
- upload must never bypass scanning or review where required
- signature must never become completed without evidence
- denied scope must stay denied
- revoked or expired share token must remain denied even if URL is reused

## Blockerande valideringar

- intake blocked om tenant binding saknas
- upload blocked om original artifact saknas
- sign blocked om scope eller expiry bryts
- self-service blocked om owning command path saknas
- portal read blocked om grant or share token scope inte matchar object scope

## Rapport- och exportkonsekvenser

- portal evidence exports must include signer or upload lineage
- status exports must include masking and scope metadata
- signed artifacts must be retrievable from owning evidence bundle
- portal denial events must be queryable in support and audit lanes

## Förbjudna förenklingar

- portal sharing via raw urls without grant model
- upload direct to business core without scanning path
- sign status without evidence bundle
- self-service direct database mutation
- token links that implicitly grant broader tenant or company scope

## Fler bindande proof-ledger-regler för specialfall

- `PRT-P0011` cross-tenant portal URL denied and audited
- `PRT-P0012` self-service cancellation may only affect owning object through routed command and approval boundary
- `PRT-P0013` upload retry may not create duplicate intake or duplicate document object
- `PRT-P0014` revoked share token remains visible as revoked in status lineage, not silently missing

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `PRT-P0002` must create intake-request state
- `PRT-P0005` must create signed state on owning object only through routed command
- `PRT-P0007` and `PRT-P0011` must create denied-access state and audit evidence
- `PRT-P0010` and `PRT-P0014` must create share-token lifecycle state

## Bindande verifikations-, serie- och exportregler

- EJ TILLÄMPLIGT som egen verifikationspolicy
- business effects still obey owning truth docs
- exported signing evidence must preserve external signer identity, envelope id and artifact digest

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- actor type x auth mode
- action type x evidence mode
- scope type x masking policy
- upload type x review policy
- grant posture x token posture

## Bindande fixture-klasser för portaler, signering, intake och extern self-service

- `PRT-FXT-001` invited authenticated portal
- `PRT-FXT-002` anonymous intake
- `PRT-FXT-003` upload and scanning
- `PRT-FXT-004` signing lifecycle
- `PRT-FXT-005` denied scope or denied tenant
- `PRT-FXT-006` share token lifecycle

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_access_verdict`
- `expected_scope_state`
- `expected_routed_command_path`
- `expected_evidence_artifacts[]`
- `expected_status_view_state`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT som egen verifikationspolicy

## Bindande expected outcome per central scenariofamilj

- invited authenticated portal access must resolve to explicit object-scoped grant only
- anonymous intake must resolve tenant safely before business routing
- signing envelope must produce explicit sign evidence and never silently auto-complete
- self-service action must execute only through owning command path

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- portal access -> explicit scoped grant
- public intake -> routed intake request
- upload -> original artifact plus scanning handoff
- signing -> envelope lifecycle plus sign evidence
- self-service -> routed command execution or explicit denial
- share token -> scope-bound access or explicit denial

## Bindande testkrav

- tenant-safe anonymous intake tests
- share-token scope and revocation tests
- upload dedupe and retry tests
- signing expiry and denial tests
- self-service command-path tests
- cross-tenant portal denial tests

## Källor som styr dokumentet

- [eIDAS-förordningen 910/2014](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0910)
- [Digg: Infor anslutning till Auktorisationssystem för elektronisk identifiering](https://www.digg.se/digitala-tjanster/e-legitimering/erbjud-inloggning-med-svenska-e-legitimationer/infor-anslutning-till-auktorisationssystem-for-elektronisk-identifiering)
- [Digg: Uppdrag att infora auktorisationssystem i fråga om tjänster för elektronisk identifiering och för digital post](https://www.digg.se/styrning-och-samordning/vara-regeringsuppdrag/regeringsuppdrag/2025-01-21-uppdrag-att-infora-auktorisationssystem-i-fraga-om-tjanster-for-elektronisk-identifiering-och-for-digital-post)

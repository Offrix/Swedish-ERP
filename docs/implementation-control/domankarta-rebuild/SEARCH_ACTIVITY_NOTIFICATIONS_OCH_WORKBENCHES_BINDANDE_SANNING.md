# SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för search, activity, notifications, saved views, workbenches och freshness-truth.

## Syfte

Detta dokument ska låsa hur läsmodeller, sökindex, activity timelines, notifications, operatorworkbenches och freshness-checkpoints byggs utan att bli shadow databases, stale-lägande eller datalackageytor.

## Omfattning

Detta dokument omfattar:
- projection-driven search
- object activity timelines
- notification envelopes
- saved views
- workbench rows och lanes
- freshness checkpoints
- masking och scope i läsytor
- rebuild och stale governance

Detta dokument omfattar inte:
- affärslogiken som producerar canonical truth
- UI-styling
- bokföringssidan och financial workbench som egen accounting-yta; det ägs av `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md`
- providertransport för e-post eller sms

## Absoluta principer

- sökindex får aldrig vara egen source of truth
- varje workbenchrad måste kunna harledas till canonical object och checkpoint
- kontoforslag i sök och workbench får bara komma från bindande phrase-matris enligt `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md`
- stale data måste visas som stale, inte som grön
- notifications får aldrig skapa ny legal effect
- masking och scope måste hållas lika hart i projections som i canonical reads
- activity timeline får inte byggas enbart på flyktiga operativa loggar
- rebuild får inte skapa eller tysta bort business state

## Bindande dokumenthierarki för search, activity, notifications och workbenches

- affärs- och securitybiblarna äger canonical truth som lasytorna måste spegla
- `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md` äger operator- och approvalevidence i activity feeds
- `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md` äger readiness och mismatch-truth som workbenches kan visa men inte tolka om
- `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md` äger support- och incidenttruth som opsworkbenches måste spegla
- `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md` äger surface semantics för bokföringssidan, accounting drilldowns, export-CTA, state badges, snapshot-/as-of-val och reveal på accounting-ytan
- Domän 13, 16 och 27 får inte definiera avvikande projection-, freshness-, notification- eller activitytruth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `SearchProjection`
- `ProjectionCheckpoint`
- `ActivityTimelineEntry`
- `NotificationEnvelope`
- `SavedWorkbenchView`
- `WorkbenchRow`
- `WorkbenchLane`
- `FreshnessReceipt`
- `ProjectionRebuildReceipt`

## Kanoniska state machines

- `SearchProjection`: `pending -> current | stale | rebuilding | blocked`
- `NotificationEnvelope`: `pending -> queued -> sent | failed | suppressed`
- `SavedWorkbenchView`: `draft -> active | superseded | archived`
- `ProjectionCheckpoint`: `open -> advanced | stalled | superseded`
- `WorkbenchLane`: `draft -> active | hidden | retired`

## Kanoniska commands

- `UpsertSearchProjection`
- `AdvanceProjectionCheckpoint`
- `RecordActivityTimelineEntry`
- `QueueNotificationEnvelope`
- `SuppressNotificationEnvelope`
- `SaveWorkbenchView`
- `MarkProjectionStale`
- `RecordProjectionRebuildReceipt`

## Kanoniska events

- `SearchProjectionUpserted`
- `ProjectionCheckpointAdvanced`
- `ActivityTimelineEntryRecorded`
- `NotificationEnvelopeQueued`
- `NotificationEnvelopeSuppressed`
- `SavedWorkbenchViewActivated`
- `ProjectionMarkedStale`
- `ProjectionRebuildReceiptRecorded`

## Kanoniska route-familjer

- `GET /search`
- `GET /objects/{id}/activity`
- `GET /workbenches/{code}`
- `POST /saved-views`
- `POST /notifications`
- `POST /projection-checkpoints`
- `POST /projection-rebuilds`

## Kanoniska permissions och review boundaries

- search och workbenches måste hedra tenant, company, role och masked-field policies
- support-specific projections får inte visas för vanliga end users
- notification suppression och resend är high-risk ops actions
- saved views får inte kringga datamaskning eller stale guards
- reveal-only lanes får inte blandas med ordinary user lanes

## Nummer-, serie-, referens- och identitetsregler

- varje projection ska ha stabilt `PRJ-YYYY-NNNNN`
- varje checkpoint ska ha stabilt `CHK-YYYY-NNNNN`
- varje notification envelope ska ha stabilt `NTF-YYYY-NNNNN`
- varje workbench view ska ha stabilt `WBV-YYYY-NNNNN`
- varje rebuild receipt ska ha stabilt `RBD-YYYY-NNNNN`

## Valuta-, avrundnings- och omräkningsregler

- läsytor får aldrig omräkna eller avrunda på annat satt an owning truth doc
- projections måste lagra display values och lineage till canonical amounts när currency visas
- search-sortering och aggregat får inte skapa egen round-off truth

## Replay-, correction-, recovery- och cutover-regler

- projections måste kunna rebuildas från canonical event receipts
- stale projections får inte dorra tyst under cutover eller replay
- notification resend får aldrig dubblettrigga legal effect
- saved views måste overleva rebuild utan att losa scopebegransningar
- correction eller replay måste skapa nya activity entries med lineage till original receipt

## Huvudflödet

1. canonical event eller receipt produceras i owning domän
2. projection update eller activity entry skapas
3. checkpoint avanceras
4. search eller workbench read visar data med freshness och masking
5. notification envelope skapas eller suppressas enligt policy
6. rebuild eller stale marking lagras som egen receipt

## Bindande scenarioaxlar

- projection family: search, activity, workbench, notification
- freshness state: current, stale, rebuilding, blocked
- masking state: clear, masked, support-reveal, forbidden
- notification mode: in-app, email, sms, webhook, suppressed
- actor mode: user, operator, support, scheduler
- trigger mode: canonical event, replay, correction, rebuild

## Bindande policykartor

- `SRH-POL-001 projection_family_to_freshness_budget`
- `SRH-POL-002 event_family_to_activity_visibility`
- `SRH-POL-003 notification_family_to_delivery_policy`
- `SRH-POL-004 workbench_code_to_required_scope`
- `SRH-POL-005 masked_field_to_allowed_views`
- `SRH-POL-006 rebuild_trigger_to_required_lane_updates`
- `SRH-POL-007 stale_badge_to_blocked_actions`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `SRH-P0001` projection current with `checkpoint_id`, `source_receipt_id`, `freshness=current`
- `SRH-P0002` projection stale and visibly flagged
- `SRH-P0003` activity entry linked to canonical receipt and actor identity
- `SRH-P0004` notification queued with dedupe key and delivery policy
- `SRH-P0005` notification suppressed due to policy or stale state
- `SRH-P0006` workbench row masked because viewer lacks scope
- `SRH-P0007` rebuild completed and checkpoint advanced without shadow divergence
- `SRH-P0008` stale workbench row blocked mutation CTA until freshness restored
- `SRH-P0009` replay or correction activity linked to original and replacement receipt
- `SRH-P0010` saved view preserved across rebuild with same scope boundaries

## Bindande rapport-, export- och myndighetsmappning

- search or workbench exports får bara visa det som owning truth docs tillater
- activity timelines ska kunna exporteras till support- och audit bundles
- freshness och masking ska vara explicit i operator exports
- notifications får exporteras som delivery evidence men aldrig som primary legal receipt

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SRH-A001` fresh invoice projection -> `SRH-P0001`
- `SRH-A002` stale payroll projection -> `SRH-P0002`
- `SRH-B001` approval activity feed -> `SRH-P0003`
- `SRH-C001` due-date reminder queued -> `SRH-P0004`
- `SRH-C002` notification suppressed by stale guard -> `SRH-P0005`
- `SRH-D001` masked support workbench row -> `SRH-P0006`
- `SRH-E001` full rebuild -> `SRH-P0007`
- `SRH-E002` replay or correction timeline lane -> `SRH-P0009`
- `SRH-F001` saved view survives rebuild -> `SRH-P0010`

## Tvingande dokument- eller indataregler

- varje projection måste peka på owning truth doc och source receipt
- varje workbenchrad måste bara byggas från explicit projection family
- varje notification måste ha dedupe key, target policy och origin receipt
- varje stale badge måste peka på freshness checkpoint och blocked actions
- varje rebuild måste lagra cause, input scope och rebuild outcome

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SRH-R001 stale_projection`
- `SRH-R002 missing_scope`
- `SRH-R003 masked_field_policy`
- `SRH-R004 duplicate_notification`
- `SRH-R005 projection_rebuild_required`
- `SRH-R006 stale_mutation_cta_forbidden`
- `SRH-R007 missing_rebuild_cause`

## Bindande faltspec eller inputspec per profil

- projection: `projection_id`, `source_receipt_id`, `checkpoint_id`, `freshness_state`, `masking_profile`
- activity entry: `entry_id`, `object_id`, `actor_id`, `event_family`, `receipt_id`
- notification envelope: `target_id`, `channel`, `dedupe_key`, `policy_code`, `payload_ref`
- workbench row: `row_id`, `workbench_code`, `object_ref`, `freshness_state`, `masking_state`
- rebuild receipt: `cause_code`, `scope_ref`, `before_checkpoint`, `after_checkpoint`, `verdict`

## Scenariofamiljer som hela systemet måste tacka

- fresh read model
- stale read model
- rebuild in progress
- masked support view
- suppressed notification
- duplicate notification request
- cutover-related stale dashboard
- activity feed after correction or replay
- stale mutation action blocked
- saved view after rebuild

## Scenarioregler per familj

- stale must show stale
- masked must stay masked unless reveal policy says otherwise
- rebuild must not invent missing rows
- duplicate notification must be suppressed or merged
- stale mutation CTA must be blocked until current checkpoint restored
- replay and correction must create explicit lineage in activity lane

## Blockerande valideringar

- workbench blocked om required scope saknas
- notification blocked om dedupe key saknas
- export blocked om masking profile inte kan tillämpas
- fresh badge blocked om checkpoint är för gammal enligt policy
- mutation CTA blocked om row is stale and policy forbids write on stale basis
- rebuild marked failed om checkpoint advanced but row count or lineage diverges from canonical receipts

## Rapport- och exportkonsekvenser

- every export must include checkpoint or freshness metadata
- activity export must include lineage to receipt or event
- operator workbench export must include masking state
- notification export must include dedupe key and suppression verdict

## Förbjudna förenklingar

- shadow fields som bara finns i indexet
- activity byggd direkt på debugloggar
- fresh badges utan checkpoint
- notifications utan dedupe
- operator CTA on stale data without explicit stale override policy

## Fler bindande proof-ledger-regler för specialfall

- `SRH-P0011` support reveal activity visible only in support evidence lane
- `SRH-P0012` replay-induced rebuild must preserve saved views
- `SRH-P0013` cutover stale window must show blocked actions
- `SRH-P0014` suppressed notification retry may only reopen envelope under same dedupe lineage

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `SRH-P0002` creates stale operator state
- `SRH-P0005` creates suppressed notification state
- `SRH-P0007` creates current checkpoint state
- `SRH-P0008` creates blocked-action state för stale workbench rows

## Bindande verifikations-, serie- och exportregler

- EJ TILLÄMPLIGT som egen verifikationssanning
- exportfamiljer ska fortsatt agas av respektive financial truth doc
- projections and workbench exports must preserve source receipt lineage

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- projection family x freshness state
- masking state x actor mode
- notification mode x trigger mode
- current x stale x rebuilding
- replay or correction x activity lane

## Bindande fixture-klasser för search, activity, notifications och workbenches

- `SRH-FXT-001` current projection
- `SRH-FXT-002` stale projection
- `SRH-FXT-003` rebuild and checkpoint advance
- `SRH-FXT-004` masked support lane
- `SRH-FXT-005` notification dedupe and suppression

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `expected_freshness_state`
- `expected_masking_state`
- `expected_blocked_actions[]`
- `expected_activity_lineage[]`
- `expected_notification_verdict`

## Bindande canonical verifikationsseriepolicy

- EJ TILLÄMPLIGT som egen verifikationssanning

## Bindande expected outcome per central scenariofamilj

- fresh projection must expose current checkpoint and canonical lineage
- stale projection must visibly block stale-sensitive actions
- replay-induced rebuild must preserve saved views and activity lineage
- notification suppression must prevent duplicate or legally unsafe delivery

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- fresh read -> current row
- stale read -> visibly stale row
- rebuild -> rebuilt row plus checkpoint advance
- masked support -> masked row
- duplicate notification -> suppressed or merged envelope
- replay activity -> lineage-preserving activity entries

## Bindande testkrav

- projection freshness budget tests
- stale mutation blocker tests
- rebuild parity tests
- masked lane visibility tests
- notification dedupe tests
- saved-view survival tests across rebuild

## Källor som styr dokumentet

- [PostgreSQL 17: Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

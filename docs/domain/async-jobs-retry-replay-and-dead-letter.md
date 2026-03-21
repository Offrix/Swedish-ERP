# Async jobs, retry, replay and dead-letter

## Syfte

Detta dokument definierar jobbobjekt, status, retry-policy, backoff, timeout, dead-letter, replay och korrelation mellan jobb, domänhändelse och användaråtgärd. Syftet är att all bakgrundsbehandling ska vara deterministisk, idempotent, återspelbar och operativt säker.

## Scope

### Ingår

- generisk jobbmodell för workerbaserade bakgrundsjobb
- retry-policy, backoff, timeout, dead-letter och säker replay
- mass-retry, manuell operatörsåtgärd och felsäker avbrytning
- felklassning, idempotensnycklar och korrelationsspår mot domänhändelser
- audit och operatörsvy

### Ingår inte

- submission-specifik receiptlogik; den ligger i submission-dokumentet
- detaljer i infrastrukturen för köteknik eller molnleverantör
- UI-jobb som bara är klientlokala och inte har server-side job lifecycle

### Systemgränser

- async-job-domänen äger job record, attempt history, dead-letter record och replay plan
- producerande domän äger affärsintentionen och definierar jobbtypens semantik
- workerprocessen utför jobbet men får inte skapa odokumenterade statehopp
- support/admin backoffice använder denna domäns API för retries och replay

## Roller

- **Job producer** skapar jobb från affärshändelse eller användaraction.
- **Worker runtime** exekverar jobb enligt låst payload och timeoutpolicy.
- **Operator** övervakar fel, dead-letter och replay.
- **Security admin** godkänner replay av högriskjobb.
- **Support admin** får initiera begränsad teknisk retry men inte affärsändrande replay utan policygrund.

## Begrepp

- **Job object** — Varaktig post som beskriver arbete som ska utföras asynkront.
- **Attempt** — Ett enskilt exekveringsförsök för ett jobb.
- **Backoff schedule** — Regel för väntetid mellan försök.
- **Timeout policy** — Maximal exekveringstid per attempt.
- **Dead-letter queue** — Slutbehållare för jobb som inte längre får automatisk retry.
- **Replay** — Ny exekvering av tidigare jobb eller händelse med kontrollerad säkerhet.
- **Idempotency key** — Nyckel som gör att samma jobbintention inte skapar flera effekter.
- **Correlation chain** — Kedjan mellan användaraction, domänhändelse, jobb, attempts och eventuella downstream-objekt.

## Objektmodell

### Job record
- fält: `job_id`, `job_type`, `job_payload_hash`, `job_payload_ref`, `status`, `priority`, `idempotency_key`, `source_event_id`, `source_action_id`, `correlation_id`, `retry_policy`, `timeout_seconds`, `created_at`, `available_at`, `last_error_class`
- invariant: ett `idempotency_key` får inte ha mer än ett aktivt jobb med oförenliga effekter

### Attempt
- fält: `attempt_no`, `started_at`, `finished_at`, `worker_id`, `result`, `error_class`, `error_message_redacted`, `next_retry_at`
- invariant: attempts är append-only och sekvensnumreras utan luckor

### Dead-letter record
- fält: `dead_letter_id`, `job_id`, `entered_at`, `terminal_reason`, `operator_state`, `replay_allowed`, `risk_class`
- invariant: dead-letter får inte försvinna förrän antingen replay är slutförd eller retentionregeln tillåter purge

## State machine

### Job status
- `queued -> claimed -> running -> succeeded`
- `running -> failed -> retry_scheduled -> queued`
- `failed -> dead_lettered`
- `dead_lettered -> replay_planned -> replayed`
- `replayed -> succeeded` eller `replayed -> dead_lettered`

### Risk state
- `normal -> high_risk -> restricted`
- högrisk gäller jobb som kan påverka pengar, externa submissions, permissions eller sign-off

### Operator state
- `unseen -> triaged -> actioned -> closed`
- operator state är separat från själva job status och används för backofficeflödet

## Användarflöden

### Normal körning
1. Producerande domän skapar jobb med idempotensnyckel och payloadsnapshot.
2. Worker claim:ar jobbet när `available_at` infaller.
3. Jobbet körs med definierad timeout.
4. Resultat markeras `succeeded` eller `failed` med felklass.

### Retry och backoff
1. Vid retriable fel räknas `next_retry_at` fram enligt jobbtypens policy.
2. Jobbet går till `retry_scheduled`.
3. När tiden infaller köas jobbet igen.
4. Efter maxförsök går jobbet till `dead_lettered`.

### Replay
1. Operatören väljer dead-letter eller tidigare jobb att replaya.
2. Systemet gör säkerhetskontroll: riskklass, idempotensnyckel, affärsfönster och beroenden.
3. Replay skapar antingen nytt jobb med referens till ursprunget eller återöppnar tillåtet jobb i kontrollerad state.
4. All replay ska vara spårbar och kunna stoppas innan faktisk exekvering om validering misslyckas.

## Affärsregler

### Retry-policy
- varje jobbtyp ska ha explicit maxförsök, backoffregel och timeout
- default för normala tekniska jobb är exponentiell backoff med övre gräns och jitter
- domänfel som kräver ny indata får inte automatisk retryas
- timeout ska klassas som tekniskt fel om inte jobbtypen explicit säger att timeout innebär okänt affärsutfall

### Idempotens och säker replay
- idempotensnyckeln ska byggas av affärsidentitet, payload-hash och jobbtyp
- replay av högriskjobb får inte köras om downstream-objekt redan visar slutlig effekt som inte är idempotent
- mass-retry får endast omfatta jobb med samma riskklass och samma felklass
- replay ska alltid bära `replay_of_job_id` och ny correlation chain

### Felklassning
- `transient_technical`: nätfel, lås, timeout, rate limit
- `persistent_technical`: felaktig konfiguration, saknad hemlighet, schemafel i adapter
- `business_input`: ogiltig payload, saknad referens, policybrott
- `downstream_unknown`: mottagaren svarade oklart eller inga kvittenser kan avgöra slututfall
- felklass styr om systemet ska retrya, dead-lettera eller kräva manuell triage

## Behörigheter

- producerande tjänster får skapa jobb men inte manipulera gammal attempt-historik
- operator får köra triage, enkel retry och mass-retry inom tillåtet scope
- support admin får inte replaya `restricted`-jobb utan högre godkännande
- security admin måste godkänna replay av jobb som påverkar access, betalning eller submission med okänt slututfall

## Fel- och konfliktfall

- dubbelclaim av samma jobb ska förhindras med claim-token eller motsvarande lås
- försök att replaya jobb med aktivt identiskt jobb ska nekas
- okänd slutstatus efter timeout ska skapa `downstream_unknown` och operatörsgranskning
- korrupt payloadsnapshot ska dead-letteras direkt som `persistent_technical`
- replay som inte klarar validering ska inte exekveras men ska loggas som misslyckad planering

## Notifieringar

- operator får notis när dead-letter-backlog eller timeout-rate passerar tröskel
- ansvarig domänägare får notis vid återkommande `persistent_technical` på en jobbtyp
- security admin får notis när högriskreplay väntar godkännande
- mass-retry ska skapa sammanfattningsnotis med scope, antal jobb och riskklass

## Audit trail

- varje jobb ska logga producent, idempotensnyckel, payload-hash, source event och source action
- varje attempt ska logga worker, start/slut, felklass och resultat
- dead-letter och replay ska logga operatör, motivering, godkännare och exakt vad som återspelades
- auditkedjan ska kunna visa hur ett slutligt affärsutfall uppstod genom en serie jobb och replay-händelser

## API/events/jobs

- kommandon: `enqueue_job`, `claim_job`, `complete_job`, `fail_job_attempt`, `schedule_retry`, `move_to_dead_letter`, `plan_job_replay`, `execute_job_replay`, `mass_retry_jobs`
- events: `job_queued`, `job_started`, `job_failed`, `job_retried`, `job_dead_lettered`, `job_replay_planned`, `job_replay_executed`
- jobb: `retry_scheduler`, `dead_letter_monitor`, `stuck_job_reaper`, `mass_retry_coordinator`

## UI-krav

- operatörsvyn ska visa jobbtyp, riskklass, senaste felklass, attempts, next retry och korrelationskedja
- dead-letter-listan ska kunna filtreras på jobbtyp, felklass, bolag och riskklass
- replaydialog ska visa varför replay är tillåten eller förbjuden
- mass-retry ska kräva tydlig scope-sammanfattning och förhandsvarning vid högriskjobb

## Testfall

1. transient tekniskt fel ger backoff och nytt försök
2. business_input-fel går direkt till dead-letter eller operatörskö
3. timeout med okänt utfall klassas `downstream_unknown`
4. replay av högriskjobb kräver extra godkännande
5. dubbelclaim förhindras
6. mass-retry över blandade riskklasser nekas

## Exit gate

- [ ] alla jobbtyper har explicit retry-policy, timeout och felklassning
- [ ] jobbhistorik, attempts och replay är append-only och auditerade
- [ ] dead-letter kan triageras och replayas säkert
- [ ] mass-retry och hög risk hanteras med tydliga spärrar
- [ ] korrelation mellan användaraction, domänhändelse och jobb kan följas i efterhand

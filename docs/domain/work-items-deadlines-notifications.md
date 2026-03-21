# Work items, deadlines and notifications

## Syfte

Detta dokument definierar den gemensamma modellen för arbetsobjekt, deadlines, warnings, reminders och notifieringar i hela produkten. Målet är att varje åtgärd som kräver mänskligt beslut eller aktiv uppföljning ska kunna spåras från skapande till avslut, med tydligt ägarskap, härledd deadline, kvittens, eskalering och full audit.

## Scope

### Ingår

- manuella och automatiska arbetsobjekt för AP, AR, bank, close, submission, support, migration, dokumentgranskning och byråarbete
- varningar som endast informerar samt varningar som omvandlas till uppgifter
- härledning av deadline från policy, lagdatum, periodkalender, klientprofil eller källobjekt
- assignments till enskild användare, gruppkö, rollkö eller extern klientkontakt
- reminders, snooze, acknowledgement, escalation, blocker, close och reopen
- koppling till bolag, period, objekt, submission, dokument, checklista, klientbegäran eller användare
- notifieringsutskick till in-app, e-post, push och operatörsvy

### Ingår inte

- innehållet i den affärsregel som skapade uppgiften; den ägs av källdomänen
- leveransdetaljer för extern e-post eller mobil push; de ägs av notifieringsadapter
- ändring av bokförings- eller submissionsstatus utan explicit källdomänsaction

### Systemgränser

- arbetsobjektsmotorn äger work item, assignment, deadline, reminder plan, acknowledgement och escalation record
- källdomänen äger sakfrågan, till exempel leverantörsfaktura, close checklist, submission eller supportärende
- notifieringslagret levererar meddelanden men får inte ändra arbetsobjektets state
- policydokument styr vilka typer av deadlines, eskaleringar och mottagare som är tillåtna

## Roller

- **Company user** ansvarar för att kvittera, snooza och slutföra uppgifter inom sitt scope.
- **Owner** är den aktiva ansvariga mottagaren för nästa steg; owner kan vara namngiven användare eller rollkö.
- **Team lead eller manager** tar emot eskalering när owner inte agerar inom definierat fönster.
- **Automation operator** ansvarar för regelmotor som skapar och uppdaterar automatiska arbetsobjekt.
- **Close signatory, tax signatory och payment approver** har skyldighet att lösa blockers som hindrar sign-off eller betalning.
- **Bureau consultant** ansvarar för klientrelaterade uppgifter och begäranden.
- **Support/admin** får endast skapa eller omfördela uppgifter inom tillåtet supportscope och får inte stänga reglerade uppgifter utan källdomänens regelstöd.
- **Security admin** ansvarar för policy kring notifieringskanaler, mute-regler och incidenteskalering.

## Begrepp

- **Arbetsobjekt** — Primärt objekt med typ, status, prioritet, owner, deadline, blockerflagga, källobjekt och auditspår.
- **Warning** — Risk- eller informationssignal som kan visas utan assignment men kan uppgraderas till arbetsobjekt.
- **Priority** — Klassning `low`, `normal`, `high`, `critical` som styr sortering, SLA och notifieringsintensitet.
- **Deadline source** — Den regel eller det datumobjekt som gav upphov till uppgiftens deadline.
- **Reminder plan** — Förberäknad serie notifieringspunkter före eller efter deadline.
- **Acknowledgement** — Händelse där mottagaren bekräftar att uppgiften setts och accepterats.
- **Snooze window** — Tidsintervall under vilket påminnelser skjuts upp men deadline normalt ligger fast.
- **Escalation level** — Stegvis ökning av mottagarkrets eller severity när tidsregler bryts.
- **Blocker relation** — Länk som visar vilket objekt eller villkor som stoppar ett annat objekt.
- **Resolution** — Dokumenterad avslutshändelse med resultatkod, kommentar och eventuell länk till utförd action.

## Objektmodell

### Kärnobjekt

#### Work item
- fält: `work_item_id`, `company_id`, `period_id`, `source_type`, `source_id`, `task_type`, `status`, `priority`, `severity`, `owner_user_id`, `owner_queue`, `deadline_at`, `deadline_basis`, `created_by`, `created_reason`, `blocking_scope`, `requires_ack`, `requires_signoff`, `allow_snooze`, `closed_at`, `closed_reason`
- relationer: 0..n assignments, 0..n reminder events, 0..n escalation records, 0..n comments, 0..n blockers, 0..n linked objects
- invariant: ett arbetsobjekt får ha exakt en aktiv owner i taget men kan ha flera observatörer

#### Assignment
- fält: `assignment_id`, `work_item_id`, `assignee_type`, `assignee_user_id`, `assignee_role`, `assigned_at`, `assigned_by`, `accepted_at`, `declined_at`, `decline_reason`, `handover_reason`
- invariant: om `assignee_type=user` måste användaren ha åtkomst till både bolag och källobjekt

#### Deadline model
- fält: `base_date`, `timezone`, `calendar_rule`, `offset_rule`, `business_day_adjustment`, `hard_deadline`, `soft_deadline`, `breach_at`
- invariant: härledda deadlines sparas som värden och får inte räknas om retroaktivt utan ny regelversion

#### Reminder event
- fält: `channel`, `planned_at`, `sent_at`, `delivery_status`, `recipient_snapshot`, `template_key`
- invariant: samma reminder-planpunkt får bara skickas en gång per kanal och work item-version

#### Escalation record
- fält: `level`, `trigger_type`, `triggered_at`, `target_role`, `target_user`, `result_status`, `cleared_at`
- invariant: eskalering får aldrig radera tidigare owner eller tidigare escalationssteg

#### Blocker
- fält: `blocker_id`, `blocked_object_type`, `blocked_object_id`, `blocker_type`, `severity`, `opened_at`, `resolved_at`, `override_allowed`, `override_reason`
- invariant: blocker med severity `hard_stop` måste vara löst eller ha giltig override innan blockerad action kan slutföras

## State machine

### Work item
- `draft -> open -> acknowledged -> in_progress -> waiting_external -> snoozed -> escalated -> resolved -> closed`
- `closed -> reopened`
- `draft` används bara för manuellt skapande innan första validering.
- `open` betyder att uppgiften finns men ännu inte kvitterats.
- `acknowledged` betyder att mottagaren accepterat ansvar.
- `waiting_external` används när nästa steg ligger hos kund, bank, myndighet eller annan extern part.
- `snoozed` döljer inte deadlineöverträdelse; om hård deadline passeras går objektet ändå till `escalated`.
- `resolved` betyder att kärnhandlingen är utförd men att slutlig stängning väntar på validering eller automatisk kontroll.

### Reminder plan
- `planned -> due -> sent -> delivered`
- `sent -> failed -> retried -> delivered`
- leveransfel påverkar inte work item-state men måste skapa operativ leveranspost

### Escalation
- `none -> level_1 -> level_2 -> level_3 -> terminal_hold`
- högre nivå får bara skapas om föregående nivå redan har aktiverats eller om policy tillåter hopp vid `critical`

### Blocker
- `open -> waived -> resolved -> closed`
- `waived` får endast användas när policy uttryckligen tillåter tillfälligt undantag
- `closed` inträffar först när blockerrelationen inte längre påverkar något aktivt objekt

## Användarflöden

### Manuellt skapad uppgift
1. Användaren väljer objekt eller period och skapar arbetsobjekt med typ, beskrivning, owner, deadline och prioritet.
2. Systemet validerar att skaparen har rätt att skapa uppgift för valt bolag och källobjekt.
3. Reminder-plan beräknas direkt utifrån prioritet, deadlineprofil och notifieringspolicy.
4. Owner får notifiering. Om `requires_ack=true` ligger uppgiften kvar som `open` tills den kvitteras.

### Automatiskt skapad uppgift
1. Källdomänen publicerar en händelse, till exempel `invoice_disputed`, `submission_failed`, `close_blocker_detected` eller `document_review_required`.
2. Regelmotorn slår upp task policy för typen och skapar eller uppdaterar ett arbetsobjekt.
3. Om ett öppet arbetsobjekt redan finns för samma idempotensnyckel ska systemet uppdatera deadline, severity eller owner i stället för att skapa dublett.
4. Eventuell blockerrelation skapas mot källobjektet.

### Kvittens, snooze och handover
1. Owner kvitterar uppgiften eller systemet auto-kvitterar när användaren öppnar den och policy medger auto-ack.
2. Owner kan snooza uppgiften inom tillåten gräns. Systemet registrerar ny synlighetstid men låter hård deadline vara oförändrad om inte policyn säger annat.
3. Owner kan lämna över uppgiften till annan tillåten användare eller kö. Handover kräver orsak och behörighetskontroll.

### Avslut, reopen och eskalering
1. Uppgiften stängs endast med en resolution-kod som är kompatibel med task type.
2. Reopen får ske vid ny källhändelse, felaktig stängning eller återöppnat källobjekt.
3. När deadline passerar utan acceptabel state triggas eskalering enligt nivåmodell.
4. Om blocker kvarstår efter slutlig eskalering kan systemet skapa nytt blockerobjekt mot period-close, submission eller betalning.

## Affärsregler

### Prioritet och severity
- prioritet styr ordning och reminder-takt
- severity styr blocker- och eskaleringslogik
- `critical` eller `hard_stop` får inte snoozas av ordinarie användare
- `high` får snoozas en gång inom policyfönster, `normal` högst tre gånger, `low` högst fem gånger
- om prioritet höjs ska ny reminder-plan räknas fram men redan skickade reminders ska ligga kvar i historiken

### Härledning av deadline
- deadline kan härledas från lagdatum, submissionsfönster, förfallodatum, close-kalender, SLA, avtalad svarstid eller manuellt satt datum
- regler sparas som `deadline_basis_type` och `deadline_basis_value`, till exempel `regulatory_due_date_minus_3_business_days`
- om källobjektets datum ändras ska arbetsobjektet uppdateras med ny deadlineversion och auditnotering
- om policy förbjuder retroaktiv lättnad får en förkortad ny deadline gälla omedelbart, men en förlängd deadline kräver explicit omräkningshändelse
- deadlines justeras till närmast föregående arbetsdag när policy säger det; annars används exakt tidsstämpel

### Skapanderegler
- manuellt skapad uppgift måste ha typ, owner och antingen deadline eller uttrycklig flagga `no_deadline_allowed`
- automatiska uppgifter måste bära idempotensnyckel `source_type + source_id + task_type + policy_version + cycle_no`
- samma källobjekt kan ha flera uppgifter om de har olika task type eller olika arbetscykel
- warnings utan action skapas som `warning_only`; de får inte räknas i öppna blockers förrän de uppgraderats

### Close, blocker och reopen
- objekt med blocker severity `hard_stop` får blockera periodstängning, betalningsfrisläpp, submission eller sign-off
- reopen ska återställa notifieringscykel, reminder-plan och owner-krav men får inte radera tidigare resolution
- en closed uppgift får inte återöppnas utan reason code och referens till vad som ändrats

### Valideringar
- owner måste vara aktiv i bolaget eller vara giltig rollkö
- uppgift kopplad till period måste peka på existerande period och får inte byta bolag efter skapande
- blocker mot stängd period kräver explicit reopen-scope
- ack, snooze, handover och close ska blockeras om användaren saknar rätt att se källobjektet

## Behörigheter

- `company_admin` får skapa, omfördela, snooza och stänga manuella uppgifter inom eget bolag, men får inte stänga reglerade blockerobjekt som kräver signatory-roll.
- `manager` får ta emot eskalering och ändra owner inom egen organisatorisk kedja.
- `bureau_manager` får massfördela och övervaka klientuppgifter inom tilldelad portfölj.
- `close_signatory`, `tax_signatory` och `payment_approver` får stänga respektive domänspecifika blockerobjekt efter faktisk affärsaction.
- `support_admin` får endast läsa och kommentera uppgifter om policy för supportscope tillåter det; support får inte kvittera eller stänga kundens reglerade uppgift i stället för kunden.
- `security_admin` får ändra notifieringspolicy, templates och eskaleringsregler, men inte manipulera historiska work item-händelser.

## Fel- och konfliktfall

- dublettskapande från flera händelser för samma källobjekt ska avvärjas med idempotensnyckel; andra försök loggas som merge mot befintligt objekt
- owner utan aktuellt bolagsscope ska ge `assignment_invalid_scope`
- deadline som hamnar före skapandetid ska blockeras eller justeras enligt policy och loggas som `deadline_repair`
- snooze över hård gräns ska ge `snooze_not_allowed`
- close av blockerande uppgift utan löst blockerobjekt ska ge `blocking_condition_not_resolved`
- reopen av already open-objekt ska vara idempotent no-op med auditpost
- notifieringsfel får inte ändra task state; misslyckat utskick ska skapa ny leveransretry men uppgiften förblir öppen
- om källobjektet raderas eller blir otillgängligt ska uppgiften sättas i `waiting_external` eller `needs_admin_review` beroende på domänregler

## Notifieringar

- in-app notifiering skickas alltid vid skapande, owner-byte, eskalering och reopen
- e-post skickas när policyn kräver extern påminnelse, när deadline ligger inom förvarningsfönstret eller när uppgiften är blockerande
- push används endast för mobilt stödberättigade uppgifter som får hanteras i fältappen
- reminder-plan består som standard av `T-3 arbetsdagar`, `T-1 arbetsdag`, `T`, `T+1 arbetsdag` och därefter eskalering enligt task policy; per task type kan annan kadens anges
- acknowledgement kan trigga tystnad i vissa kanaler men får aldrig stoppa blocker- eller överträdelsenotiser
- masseskalering ska paketera notifieringar per mottagare för att undvika stormflod men varje underliggande objekt ska vara individuellt spårbart

## Audit trail

- varje state transition ska logga användare eller automation, gammalt värde, nytt värde, reason code och correlation id
- deadlineförändring ska spara både gammal och ny beräkning samt vilken policyversion som användes
- alla reminders och misslyckade leveranser loggas med kanal, mall, mottagarsnapshot och leveransstatus
- ack, snooze, handover, escalation och close kräver fri text eller strukturerad reason code när policyn säger det
- auditkedjan måste göra det möjligt att svara på vem som ägde uppgiften vid varje tidpunkt och varför den inte var löst före deadline
- blockerrelationer ska kunna visas från både blockerande och blockerat objekt

## API/events/jobs

- API-kommandon: `create_work_item`, `acknowledge_work_item`, `reassign_work_item`, `snooze_work_item`, `resolve_work_item`, `reopen_work_item`
- query-API ska stödja filtrering på owner, queue, source_type, blocker scope, severity, due state, escalated state och period
- events: `work_item_created`, `work_item_deadline_changed`, `work_item_acknowledged`, `work_item_escalated`, `work_item_closed`, `blocker_opened`, `blocker_resolved`
- schemalagda jobb: `work_item_deadline_tick`, `work_item_reminder_dispatch`, `work_item_escalation_evaluator`, `work_item_stale_owner_repair`
- batchjobb ska vara idempotenta per `work_item_id + planned_at + job_purpose`

## UI-krav

- användaren ska kunna se mina uppgifter, teamets uppgifter, blockerande uppgifter och förfallna uppgifter utan fritextsökning
- varje uppgift ska visa källa, bolag, period, deadline, owner, prioritet, senaste notis, blockerstatus och full historik
- UI ska tydligt markera skillnad mellan warning, action required och hard stop
- snooze, handover och close ska visa vilka regler som gäller innan knappen aktiveras
- bulk-vyer får inte tillåta mass-close av reglerade uppgifter utan separat bekräftelsedialog
- när uppgift är kopplad till stängt eller otillgängligt objekt ska UI visa orsak och nästa tillåtna action

## Testfall

1. skapa manuell uppgift med namngiven owner, deadline och kvittenskrav; förväntat utfall: state `open`, reminder-plan skapad, owner notifierad
2. skapa automatisk uppgift två gånger med samma idempotensnyckel; förväntat utfall: ett objekt, senaste deadlineversion sparad
3. låt deadline passera utan ack; förväntat utfall: escalation level 1, ny notifiering, auditrad
4. snooza `critical` blocker; förväntat utfall: blockerat med `snooze_not_allowed`
5. close uppgift utan löst blocker; förväntat utfall: close nekas
6. reopen tidigare stängd uppgift; förväntat utfall: ny arbetscykel, gammal close-historik bevarad
7. byt owner till användare utan scope; förväntat utfall: `assignment_invalid_scope`
8. ändra källobjektets lagdatum; förväntat utfall: ny deadlineversion, tidigare reminderhistorik orörd

## Exit gate

- [ ] arbetsobjekt kan skapas manuellt och automatiskt utan dubletter
- [ ] deadline, reminder, ack, snooze och eskalering är deterministiska och policybundna
- [ ] blockerande uppgifter kan stoppa close, betalning och submission där regler kräver det
- [ ] ownerhistorik, notifieringshistorik och deadlinehistorik är fullt auditerbara
- [ ] reopen och handover bevarar komplett tidigare kedja utan dold mutation

# Audit review, support and admin backoffice

## Syfte

Detta dokument definierar audit explorer, access review, admin diagnostics, supportärenden, impersonation, break-glass, replay/retry-actions och adminsynliga feature toggles. Målet är att felsökning, support och administrativ kontroll ska kunna genomföras utan att kringgå SoD, behörighetsregler eller auditkrav.

## Scope

### Ingår

- audit explorer för händelser, stateövergångar, sign-off, adminåtgärder och säkerhetskritiska flöden
- access review för roller, delegationer, impersonation-rätter och break-glass-behörigheter
- supportärenden, admin diagnostics, retry/replay-actions och feature-flag visibility
- impersonation, supportåtkomstspärrar och break-glass med strikt tids- och approvalsmodell
- hur granskningsspår används i incident, support och efterkontroll

### Ingår inte

- vanliga affärslistor och operativa vyer för slutanvändare
- ändring av affärsdata utanför uttryckligt tillåtna supportåtgärder
- egen SIEM-produkt eller extern ticketingplattform

### Systemgränser

- backoffice-domänen äger support case, admin diagnostic session, access review batch och impersonation session
- auditmotorn levererar händelser men äger inte supportprocessen
- feature flag-systemet levererar läsbar status och kontrollerade skrivkommandon
- replay/retry körs via async-jobs- eller submission-domänen och inte direkt genom manuella databasingrepp

## Roller

- **Support admin** hanterar supportärenden och teknisk diagnostik inom godkänt supportscope.
- **Support lead** godkänner känsliga supportåtgärder och följer upp backlog.
- **Security admin** äger break-glass, access review och granskar impersonation.
- **Compliance reviewer** kan granska auditspår och SoD-konflikter utan att göra operativa ändringar.
- **Product/admin operator** får se feature toggles och vissa driftparametrar men inte kunddata utanför scope.
- **Incident commander** kan initiera nödförhöjd åtkomst under aktiv incident.

## Begrepp

- **Audit explorer** — Sök- och drilldownyta för auditspår.
- **Support case** — Spårbar administrativ post för felsökning eller kundhjälp.
- **Impersonation session** — Kontrollerad session där admin ser eller temporärt agerar i annan användares kontext.
- **Break-glass session** — Tidsbegränsad nödförhöjd åtkomst vid incident.
- **Admin diagnostics** — Läsande eller säkert skrivande diagnostikkommandon som inte kringgår domänregler.
- **Allowed support action** — Fördefinierad supportåtgärd som är tillåten enligt policy.
- **Backoffice evidence** — De loggar, snapshots och beslut som visar varför en adminåtgärd utfördes.

## Objektmodell

### Support case
- fält: `support_case_id`, `company_id`, `requester`, `category`, `severity`, `status`, `owner_user_id`, `related_object_refs`, `policy_scope`, `approved_actions`
- invariant: case måste ha tydligt supportsyfte och får inte vara generellt fri åtkomstportal

### Impersonation session
- fält: `session_id`, `target_user_id`, `target_company_id`, `requested_by`, `approved_by`, `purpose_code`, `mode`, `started_at`, `expires_at`, `restricted_actions`, `ended_at`
- invariant: impersonation måste ha maxlivslängd och explicit action-whitelist

### Access review batch
- fält: `review_batch_id`, `scope_type`, `scope_ref`, `generated_at`, `due_at`, `status`, `findings`, `signed_off_by`
- invariant: reviewbatch ska bygga på snapshot av accessdata och kunna reproduceras

### Admin diagnostics command
- fält: `command_id`, `command_type`, `input_redacted`, `result_summary`, `risk_class`, `executed_by`, `approved_by`, `executed_at`
- invariant: inga kommandon får vara fria SQL-skript eller obunden shell-åtkomst via backoffice

## State machine

### Support case
- `open -> triaged -> in_progress -> waiting_customer -> resolved -> closed`
- `in_progress -> escalated`
- `resolved -> reopened`

### Impersonation
- `requested -> approved -> active -> ended`
- `requested -> denied`
- `active -> terminated` vid policybrott eller timeout

### Access review
- `generated -> assigned -> in_review -> remediated -> signed_off -> archived`

### Break-glass
- `requested -> dual_approved -> active -> reviewed -> closed`
- efter `active` krävs alltid eftergranskning före `closed`

## Användarflöden

### Supportfelsökning
1. Supportärende öppnas med kategori, scope och relaterade objekt.
2. Support admin använder audit explorer och diagnostics inom godkända actions.
3. Om läsning i användarkontext behövs begärs impersonation.
4. Alla findings dokumenteras i support case innan ärendet stängs.

### Access review
1. Systemet skapar snapshot-batch över roller, delegationer, impersonation-rätter och adminbehörigheter.
2. Reviewer går igenom posterna, markerar findings och föreslår remediation.
3. Åtgärder genomförs i respektive behörighetsdomän.
4. Batchen signeras och arkiveras.

### Break-glass
1. Incident commander begär break-glass med incident-id och syfte.
2. Två godkännanden krävs enligt policy.
3. Sessionen öppnas med strikt tidsgräns och begränsad actionlista.
4. Efter sessionen sker obligatorisk review och dokumentation.

## Affärsregler

### Tillåtna supportåtgärder
- läsa auditspår, systemstatus, jobbhistorik och integrationsdiagnostik
- claim:a eller omfördela operativa köärenden när policy tillåter
- initiera teknisk retry eller replay via definierade domänkommandon
- läsa feature flag-status och aktiveringsscope
- öppna impersonation i read-only eller begränsat actionläge när policy tillåter

### Åtgärder som alltid kräver extra kontroll
- ändring av feature flag som påverkar produktion
- replay av högriskjobb eller submissions
- impersonation med write-capability
- break-glass
- remediation av admin- eller securityroller

### Spärrar
- support får aldrig använda delade konton eller osignerade sessioner
- support får inte skapa, ändra eller radera affärsdata via dolda adminformulär
- alla tillåtna skrivande actions måste gå via samma domänkommandon som ordinarie UI eller operatörsgränssnitt
- stöd för fri textsökning i audit explorer får inte exponera maskerade hemligheter eller full persondata utanför policy

## Behörigheter

- `support_admin` får de stödåtgärder som explicit finns i policy och som är godkända per ärendekategori
- `support_lead` får godkänna högre riskåtgärder och avsluta eskalerade supportärenden
- `security_admin` får skapa och granska access reviews samt godkänna impersonation och break-glass
- `compliance_reviewer` får läsa audit explorer och reviewresultat men inte utföra operativa actions
- `incident_commander` får initiera break-glass men inte ensam godkänna den

## Fel- och konfliktfall

- försök till supportåtkomst utanför case-scope ska nekas
- diagnostics-kommando utanför allowlist ska blockeras och incidentloggas
- försenad access review ska ge escalated finding
- impersonation utan giltigt godkännande eller med timeout ska auto-termineras
- replay/retry från backoffice som bryter riskpolicy ska nekas innan exekvering

## Notifieringar

- support lead får notis om högriskärenden, impersonation-begäran och försenade supportcase
- security admin får notis om break-glass-begäran, impersonation med write-mode och access reviews med kritiska findings
- berörd kundkontakt kan få notifiering om supportpolicy kräver transparens kring impersonation eller vissa adminåtgärder
- incidentkanal får notifiering om otillåtet adminförsök eller policybrott

## Audit trail

- alla admin- och supportåtgärder ska auditloggas med ärende-id, syfte, användare, godkännare, målobjekt och correlation id
- impersonation ska logga både initiativtagare, målidentitet, sessionstyp, utförda actions och sessionens slutorsak
- access reviews ska logga snapshotversion, reviewer, findings och remediationbeslut
- audit explorer ska kunna visa kedjan från incident eller supportärende till varje enskild administrativ action

## API/events/jobs

- kommandon: `create_support_case`, `request_impersonation`, `approve_impersonation`, `terminate_impersonation`, `run_admin_diagnostic`, `generate_access_review`, `record_access_review_decision`, `request_break_glass`
- events: `support_case_opened`, `support_case_escalated`, `impersonation_started`, `impersonation_ended`, `access_review_generated`, `break_glass_activated`
- jobb: `access_review_snapshot_job`, `support_case_sla_monitor`, `impersonation_timeout_enforcer`

## UI-krav

- backoffice ska skilja tydligt mellan läsande diagnostik och skrivande åtgärder
- audit explorer ska stödja tidslinje, filtrering per objekt, användare, bolag, incident-id och correlation id
- support case-vyn ska visa vilka actions som är tillåtna för ärendet
- impersonationdialog ska alltid visa målidentitet, mode, tidsgräns och förbjudna actions

## Testfall

1. öppna support case och kör tillåten diagnostik; förväntat utfall: lyckad åtgärd och auditrad
2. försök med otillåtet adminkommando; förväntat utfall: blockering och incidentlogg
3. impersonation i read-only med godkännande; förväntat utfall: tidsbegränsad session
4. break-glass utan dubbelgodkännande; förväntat utfall: nekad
5. access review med kritisk finding; förväntat utfall: escalation och krav på remediation
6. replay av högriskjobb från backoffice utan policygodkännande; förväntat utfall: nekad

## Exit gate

- [ ] support och backoffice arbetar inom tillåtna actions och tydliga scope-spärrar
- [ ] audit explorer, access review, impersonation och break-glass är fullt spårbara
- [ ] replay och retry från backoffice går via officiella domänkommandon
- [ ] SoD och approvals upprätthålls även under incident och support
- [ ] alla känsliga adminåtgärder kräver korrekt godkännande och eftergranskning

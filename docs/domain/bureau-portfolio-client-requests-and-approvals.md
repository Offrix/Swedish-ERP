> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Bureau portfolio, client requests and approvals

## Syfte

Detta dokument definierar byråportfölj, klientstatus, klientbegäranden, dokumentbegäranden, klientgodkännanden och tillhörande reminders, deadlines, massåtgärder och blockerregler. Syftet är att byråarbete ska vara spårbart per klient, period och leverans så att close, rapportering och submissions inte sker på oklart eller obekräftat underlag.

## Scope

### Ingår

- portföljmodell för byråer med klientscope, ansvarig konsult och team
- klientstatus, request lifecycle, dokumentbegäran och klientgodkännande
- deadlines och påminnelser kopplade till period, submission eller close
- massåtgärder för byråteam inom godkänt scope
- blockerregler som stoppar close, submission eller rapportering när klientens medverkan saknas

### Ingår inte

- själva rapport- eller deklarationsregeln; den ägs av respektive domän
- allmän CRM-funktionalitet som inte hör till operativ leverans
- lagring av kundavtal utanför de metadata som behövs för ansvar och scope

### Systemgränser

- bureau-domänen äger klientportfölj, request, approval request, approval response och statuskonsolidering
- källdomäner som close, submission, dokument eller rapportering publicerar behov av klientinput
- notifieringslagret skickar kommunikation men äger inte affärsstaten
- policy avgör vilka typer av klientgodkännanden som krävs per flöde

## Roller

- **Bureau manager** äger portföljtilldelning, teamstruktur och massåtgärder.
- **Responsible consultant** är primär ägare för klientens periodarbete och mottagare av eskalering.
- **Secondary consultant** kan ta över eller hjälpa till inom definierat scope.
- **Client contact** är extern mottagare av begäranden och kan lämna dokument eller godkänna underlag.
- **Client approver** är särskilt utsedd extern person med rätt att lämna bindande godkännande.
- **Close signatory eller tax signatory** avgör om tillräckligt klientunderlag finns för nästa steg.
- **Support/admin** får inte skicka eller godkänna klientbegäran i klientens namn.

## Begrepp

- **Portfolio membership** — Koppling mellan byråanvändare och klientbolag med roll och giltighetstid.
- **Client status** — Sammanfattad status för perioden eller det operativa läget hos klienten.
- **Client request** — Spårbar begäran om uppgift, data eller godkännande.
- **Document request** — Client request med specifik dokumentlista eller dokumentkategori.
- **Approval package** — Det paket av rapporter, siffror och kommentarer som klienten ska godkänna.
- **Approval response** — Klientens svar: godkänt, avvisat, delvis godkänt eller begär komplettering.
- **Mass action** — Samma operativa handling på flera klientposter samtidigt, till exempel skicka påminnelse eller omfördela ansvarig.

## Objektmodell

### Bureau portfolio
- fält: `portfolio_id`, `bureau_org_id`, `client_company_id`, `responsible_consultant_id`, `backup_consultant_id`, `status_profile`, `criticality`, `active_from`, `active_to`
- invariant: varje klient ska ha exakt en aktiv ansvarig konsult per leveransscope

### Client request
- fält: `request_id`, `request_type`, `client_company_id`, `period_id`, `source_object_type`, `source_object_id`, `requested_from_contact_id`, `owner_consultant_id`, `deadline_at`, `reminder_profile`, `status`, `blocker_scope`, `requested_payload`, `response_summary`
- invariant: request måste kunna härledas till period eller objekt om den ska blockera close eller submission

### Approval package
- fält: `approval_package_id`, `approval_type`, `client_company_id`, `period_id`, `package_version`, `snapshot_ref`, `approval_deadline_at`, `requires_named_approver`, `status`
- invariant: approval package ska peka på exakt det underlag som visades för klienten

### Approval response
- fält: `response_id`, `approval_package_id`, `responded_by`, `response_type`, `response_at`, `comment`, `attachments`, `signature_mode`
- invariant: endast utsedd approver eller giltigt ombud får lämna bindande response när `requires_named_approver=true`

## State machine

### Client request
- `draft -> sent -> acknowledged -> in_progress -> delivered -> accepted -> closed`
- `sent -> overdue -> escalated`
- `accepted -> reopened`
- `delivered` betyder att klienten har lämnat material men att byrån ännu inte validerat innehållet

### Approval package
- `prepared -> sent_for_approval -> viewed -> approved`
- `viewed -> rejected -> revised -> sent_for_approval`
- `approved -> superseded` när nytt paket skickas efter ändring

### Client status
- `onboarding -> active -> waiting_for_client -> in_review -> ready_for_close -> blocked -> closed`
- statusen härleds från öppna requests, blockers, approvalpaket och periodens leveransläge

## Användarflöden

### Dokumentbegäran
1. Byrån eller automatiken skapar request från period, submission eller checklista.
2. Begäran kopplas till klientkontakt, deadline och påminnelseprofil.
3. Klienten laddar upp dokument eller svarar med kommentar.
4. Konsulten validerar materialet och stänger eller återöppnar begäran.

### Klientgodkännande
1. Konsulten bygger ett approval package från låst snapshot.
2. Paketet skickas till utsedd approver.
3. Klienten granskar, godkänner eller avvisar.
4. Godkännande låser approval response till snapshot-versionen. Ändras underlaget därefter krävs nytt paket.

### Massåtgärder
1. Bureau manager filtrerar klienter inom eget scope.
2. Systemet validerar att varje vald klient tillhör scope och att åtgärden är tillåten.
3. Åtgärden genomförs per klient med separat auditrad och separat felutfall.
4. Delvisa fel får inte göra massåtgärden odeterministisk; varje klient får eget slutresultat.

## Affärsregler

### Scope-regler
- byråanvändare får endast se och agera på klienter som ingår i aktiv portfolio membership
- ansvarig konsult ska vara namngiven innan request eller approval package kan skickas
- om ansvarig konsult byts ska öppna requests handover-loggas men behålla historisk ägare

### Deadlines och reminders
- deadline kan härledas från close-kalender, lagstadgad submissionsfrist, intern SLA eller kundavtal
- standardregel är att klientbegäran som blockerar extern submission ska ha intern deadline före den tekniska submissionsdeadlinen
- påminnelser ska skickas till klientkontakt och ansvarig konsult enligt request-profil
- sena klientsvar ska ändra klientstatus till `waiting_for_client` eller `blocked` beroende på blocker_scope

### Approval-regler
- rapporter eller submissions med policykrav på klientgodkännande får inte skickas eller signeras utan `approved` response
- godkännande gäller endast den snapshot-version som visades
- delvis godkännande ska skapa blocker eller ny request för de delar som återstår
- avvisat paket kräver kommentar från klient eller konsult, annars får det inte stängas

### Vad som blockerar close eller rapportering
- öppna document requests med blocker_scope `close`
- approval package som kräver named approver men ännu inte är `approved`
- request i `overdue` eller `escalated` där waiver saknas
- klientstatus `blocked` eller `waiting_for_client` när leveransobjektet har hårt beroende av klientinput

## Behörigheter

- `bureau_manager` får tilldela ansvarig konsult, köra massåtgärder och eskalera klientärenden
- `responsible_consultant` får skapa, skicka, stänga och återöppna requests samt bygga approval packages
- `client_contact` får läsa och svara på requests som explicit delats med kontakten
- `client_approver` får lämna bindande approval responses men inte ändra byråns statusklassning
- `company_admin` på klientbolaget kan se klientbegäranden för eget bolag men inte ändra byråns interna kommentarer
- support får inte agera som klient eller konsult genom vanlig UI-action

## Fel- och konfliktfall

- request till kontakt som inte längre är giltig ska markeras `recipient_invalid`
- approval svar från fel person ska ge `approver_mismatch`
- försök att close:a period med blockerande request ska nekas
- massåtgärd med klient utanför scope ska ge separat fel för den klienten men inte stoppa andra klienter
- ändrat underlag efter godkännande ska skapa `approval_superseded` och nytt blockerobjekt

## Notifieringar

- klienten får notifiering vid ny request, ändrad deadline, påminnelse och eskalering
- ansvarig konsult får notifiering vid klientsvar, uteblivet svar och avvisat approval package
- bureau manager får notifiering när klienter i portföljen går till `blocked` eller `escalated`
- approval packages ska ha tydlig notifiering om att nytt snapshot skickats och tidigare godkännande ersatts

## Audit trail

- alla requests och approvals ska logga skapare, mottagare, deadline, svar, bilagor och statusbyten
- auditkedjan ska visa vilket snapshot som klienten såg och vem som godkände det
- massåtgärder ska logga urvalskriterier, antal lyckade, antal misslyckade och en rad per klient
- klientstatusförändringar ska kunna härledas till de underliggande öppna requests eller blockers som orsakade statusen

## API/events/jobs

- kommandon: `create_client_request`, `send_client_request`, `submit_client_response`, `create_approval_package`, `record_approval_response`, `reassign_portfolio_owner`, `run_portfolio_mass_action`
- events: `client_request_sent`, `client_request_overdue`, `client_response_received`, `approval_package_sent`, `approval_received`, `approval_rejected`, `client_status_changed`
- jobb: `client_request_reminder_job`, `client_request_escalation_job`, `portfolio_status_recompute_job`

## UI-krav

- portföljvyn ska visa klientstatus, nästa deadline, ansvarig konsult, öppna blockers och senaste klientinteraktion
- klientkort ska skilja mellan internt blockerande brister och externa väntelägen
- request och approval ska ha full versionshistorik och länkar till relaterade dokument
- massåtgärder ska visa exakt vilka klienter som ingår innan körning och ge per-klient-resultat efter körning

## Testfall

1. skapa dokumentbegäran som blockerar close; förväntat utfall: klientstatus `waiting_for_client`
2. låt request bli försenad; förväntat utfall: reminder och eskalering
3. skicka approval package och godkänn från korrekt approver; förväntat utfall: `approved`
4. ändra underlag efter approval; förväntat utfall: tidigare approval `superseded`
5. kör masspåminnelse över tre klienter där en ligger utanför scope; förväntat utfall: två lyckade, en nekad
6. försök stänga period med blockerande klientbegäran; förväntat utfall: blockering

## Exit gate

- [ ] byråportfölj har ansvarig konsult, tydlig klientstatus och spårbar scope-modell
- [ ] klientbegäranden och approval packages följer versionerade livscykler
- [ ] reminders, deadlines och eskalering fungerar per klient och period
- [ ] blockerande klientbrister stoppar close eller rapportering där policy kräver det
- [ ] massåtgärder är säkra, selektiva och fullt auditerbara


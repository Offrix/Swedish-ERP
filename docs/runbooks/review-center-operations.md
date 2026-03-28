> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Review center operations

## Syfte

Detta runbook beskriver operativ drift av review center: queue ownership, riskklass, claim, start, request-more-input, reassign, decide, close och SLA-escalation med full auditkedja.

## När den används

- daglig queue-drift för finance, payroll, tax account, HUS och document review
- när review items ska claimas, startas, omfördelas eller stängas
- när SLA-brott eller återkommande SLA-brott kräver operativ eskalering
- när support/backoffice behöver förstå varför ett review item fortfarande blockerar downstream-domän

## Förkrav

1. Queue owner och owner team ska vara definierade på review queue.
2. Operatören ska ha review-center-behörighet och rätt team scope.
3. Högre riskklasser ska ha rätt attest- eller approval-roll innan beslut tas.
4. Source domain, evidence refs och nuvarande assignment måste vara synliga.

## Roller

- reviewer
- queue owner
- domain approver
- backoffice escalator

## Steg för steg

1. Öppna queue-vyn och kontrollera:
   - `openCount`
   - `blockedCount`
   - `oldestOpenAgeMinutes`
   - `nextSlaDueAt`
   - överfallna eller återkommande breach-signaler
2. Claim ett item.
   - använd claim när item är oägt, `waiting_input` eller `escalated`
   - claim får inte stjäla item från annan aktiv användare
3. Starta review.
   - `start` får bara köras av aktuell claim owner
   - när review startats ligger item i `in_review`
4. Begär mer input när underlag saknas.
   - `request-more-input` används när evidens, personkoppling eller downstream-klarhet saknas
   - item går till `waiting_input` och fortsätter blockera source domain
5. Reassign när rätt team eller person saknas.
   - `reassign` flyttar aktivt ansvar till annan användare eller team
   - reassign återställer item till `open` och lämnar tydlig assignment history
6. Fatta beslut.
   - `approve` när source domain får fortsätta
   - `reject` när source domain måste korrigera
   - `escalate` när specialistqueue eller högre attestklass krävs
   - högriskfall får inte beslutas av fel roll eller utan rätt assignment
7. Stäng item först när downstream-consumption är bekräftad.
   - `close` får bara ske efter terminalt beslut
   - source domain eller operatör måste ha verifierat att beslutet konsumerats korrekt
8. Kör SLA-scan.
   - första breach skapar escalation, work item, notification och activity
   - återkommande breach inom ny SLA-window skapar ny escalation och incident-signal

## Verifiering

- inga öppna item ligger utan owner över policygräns
- assignment history visar claim, reassign och owner byte utan luckor
- beslutshistorik visar approve/reject/escalate med reason code och evidence refs
- stängda item har korrekt terminalt beslut och close-note
- återkommande SLA-brott producerar ny escalation och incident-signal

## Vanliga fel

- **Fel:** reviewer försöker besluta item utan aktiv assignment.  
  **Åtgärd:** claim item eller reassign till rätt användare först.
- **Fel:** item stängs innan source domain konsumerat beslutet.  
  **Åtgärd:** använd close först efter bekräftad downstream-outcome.
- **Fel:** queue owner låter högriskfall ligga i fel team.  
  **Åtgärd:** reassign till rätt owner team eller specialist och dokumentera reason code.
- **Fel:** waiting-input glöms bort och breacher SLA utan operativ signal.  
  **Åtgärd:** kör SLA-scan och följ upp work item/notification/incident-signal.

## Återställning

- felaktigt beslut rättas via ny decision chain eller correction i source domain
- fel reassign rättas med ny reassign; assignment history skrivs aldrig över
- felaktigt stängt item kräver officiellt reopen/correction-spår i source domain, inte tyst mutation

## Audit och evidence

- assignment history
- decision history
- escalation history
- close history
- actor/session-spår för alla operativa steg

## Exit gate

- queue ownership är tydlig och operativt användbar
- claim/start/reassign/request-more-input/decide/close fungerar och är auditspårade
- SLA breach och recurring breach ger rätt operativa signaler


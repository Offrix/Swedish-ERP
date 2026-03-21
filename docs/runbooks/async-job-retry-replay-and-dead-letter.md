# Async job retry, replay and dead-letter

## Syfte

Detta runbook beskriver hur asynkrona jobb övervakas, återförsöks, replayas och hanteras när de når dead-letter. Runbooken ska säkerställa att jobb kan återställas utan dubbelbokning, dubbelsändning eller förlorad spårbarhet.

## När den används

- när jobb står kvar i `retry_wait`, `timed_out`, `manual_action_required` eller `dead_letter`
- när extern adapter varit nere och jobb behöver replayas
- när release eller schemaförändring kräver kontrollerad omkörning
- när en viss korrelationskedja mellan användaraction, domänhändelse och jobb måste följas upp

## Förkrav

1. Operatören ska ha åtkomst till jobboperatörsvy, audit explorer och relevanta domänloggar.
2. Det ska finnas definierad jobbklass, retry-policy, timeout-gräns och idempotensmodell för den kö som påverkas.
3. Berört domänteam ska vara informerat om jobbtypen kan påverka ledger, submission, notifiering eller dokumentstatus.
4. För mass-retry eller replay över större scope krävs change-ID och godkännande enligt driftpolicy.

## Steg för steg

1. Identifiera jobbgruppen.
   - filtrera på jobbklass, queue, tenant, korrelations-id, idempotensnyckel och felklass
   - avgör om problemet gäller enstaka jobb, tidsintervall eller global incident
2. Klassificera felet.
   - `transient_external`: extern tjänst svarar inte, rate-limit, timeout eller 5xx
   - `transient_internal`: intern kö, databas eller cache tillfälligt otillgänglig
   - `permanent_payload`: ogiltig payload, brutet schema eller saknat obligatoriskt fält
   - `domain_block`: policylås, periodlås eller saknat godkännande
   - `duplicate_or_idempotent`: jobbet har redan utförts eller är ersatt av nyare version
3. Stoppa skadlig loop.
   - om samma fel upprepas i snabb takt ska ytterligare retry pausas för berörd jobbklass
   - sätt queue-status till `degraded` i operatorvyn vid systemiskt fel
4. Verifiera idempotens.
   - kontrollera om side effects redan finns
   - kontrollera om samma idempotensnyckel redan gett `succeeded`
   - för jobb med ledger- eller submissionpåverkan ska källdomänen verifieras innan replay
5. Välj åtgärd.
   - `retry_now` när felet är löst och payloaden är oförändrad
   - `replay_from_source` när payload måste byggas om från källdomänen
   - `cancel_superseded` när jobbet ersatts av nyare version
   - `manual_action` när extern eller mänsklig komplettering krävs
6. Utför återförsök.
   - enstaka jobb: starta retry med oförändrad idempotensnyckel
   - mass-retry: gruppera per jobbklass och tenant, inte över heterogena side effects
   - respektera backoff-policy; nollställ inte attempts utan särskild orsak
7. Hantera dead-letter.
   - läs senaste fel, payload-version och jobbberoenden
   - rätta rotorsak i kod, konfiguration eller källdata
   - flytta tillbaka jobbet till aktiv kö via kontrollerad replay, aldrig genom direkt databasmanipulation i statusfält
8. Säkra replay.
   - replay ska alltid bära `replayed_by`, `replay_reason`, `source_checkpoint` och ny operativ korrelations-id
   - ursprungligt jobb och replayjobb ska länkas i audit trail
   - om källdomänen hunnit ändras ska replay generera ny payloadversion i stället för att återanvända gammal osäker payload
9. Bekräfta utfallet.
   - verifiera att jobbet nått `succeeded`, `cancelled` eller annan terminal status
   - verifiera att inga otillåtna dubletter uppstått i källdomänen
   - stäng eller uppdatera incident/supportärende

## Verifiering

- ködjup återgår till normal nivå
- jobb i dead-letter har antingen replayats, avbrutits med motivering eller fått owner för manuell åtgärd
- ingen dubbel side effect finns för jobb med samma idempotensnyckel
- audit trail binder samman ursprungligt jobb, replay, operatör och resultat
- eventuella domänblockerare är dokumenterade i rätt kö i stället för att ligga kvar som tekniska jobbfel

## Vanliga fel

- **Fel:** replay skapar dubbel submission eller dubbel notifiering.  
  **Åtgärd:** stoppa vidare replay, verifiera idempotensnyckel och status i målobjektet, markera felklass som `duplicate_or_idempotent`.
- **Fel:** mass-retry återstartar jobb som fortfarande är blockerade av policy eller periodlås.  
  **Åtgärd:** filtrera ut `domain_block` och skicka dem till manuell åtgärd i stället för ny retry.
- **Fel:** dead-letter saknar tillräcklig payload för felsökning.  
  **Åtgärd:** använd korrelations-id för att hämta källa, förbättra jobbklassens observability innan nytt replayförsök.
- **Fel:** timeout utan tydligt felmeddelande.  
  **Åtgärd:** kontrollera worker heartbeat, extern SLA, nätverk, lock contention och payloadstorlek.

## Återställning

- om fel replay redan producerat skadlig side effect ska respektive domäns korrigeringsflöde användas, till exempel reversal, återkallelse eller statuskorrigering
- om kön är instabil ska jobbklass disable:as med feature flag eller worker-routing tills roten är löst
- manuella återställningar får inte lämna jobb i odefinierad mellanstatus; använd `cancelled`, `manual_action_required` eller ny replaykedja

## Rollback

- rollback av operativ ändring sker genom att stoppa ny retry/replay, återställa tidigare worker-konfiguration och återgå till senaste verifierade release
- redan skapade replayjobb rullas inte tillbaka genom radering; de avslutas med terminal status och ny korrigerande replay vid behov

## Ansvarig

Primärt ansvarig är driftansvarig för workerplattformen. Domänägare måste godkänna replay av jobb som kan påverka ledger, submissions, close, betalningar eller myndighetsflöden.

## Exit gate

Runbooken är klar när berörda köer är stabila, inga oidentifierade dead-letter-jobb återstår och varje manuell operatörsåtgärd är auditloggad med orsak och utfall.

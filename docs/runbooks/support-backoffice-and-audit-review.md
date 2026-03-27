> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Support backoffice and audit review

## Syfte

Detta runbook beskriver hur support och admin backoffice används för felsökning, access review, impersonation, break-glass och auditgranskning utan att behörighetsregler eller spårbarhet bryts.

## När den används

- vid supportärende där vanliga användarvyer inte räcker för diagnos
- vid incident som kräver audit explorer, admin diagnostics eller begränsad impersonation
- vid planerad access review eller SoD-granskning
- när operatör måste replaya eller retrya tillåtna tekniska actions i backoffice

## Förkrav

1. Ärendet ska ha support-ID eller incident-ID.
2. Operatören ska ha rätt roll för support eller admin diagnostics.
3. Policyn för supportåtkomst och impersonation ska vara accepterad.
4. Om ärendet gäller reglerat flöde ska källdomänens owner vara känd innan ändring görs.
5. Break-glass får endast användas när ordinarie accessväg inte räcker och måste dokumenteras separat.

## Steg för steg

1. Registrera arbetet.
   - öppna eller länka supportärende
   - beskriv mål, scope, tenant, bolag, objekt och användare
   - välj om åtgärden är läsning, diagnos, impersonation, replay/retry eller access review
2. Utför diagnos.
   - använd audit explorer för att följa objektets historik
   - använd admin diagnostics för att läsa köstatus, integrationsstatus, feature flags och senaste fel
   - läs endast minsta nödvändiga data
3. Impersonation.
   - kontrollera att policyn tillåter impersonation för ärendetypen
   - starta tidsbegränsad session med tydligt bannerläge
   - använd write-block om full skrivåtkomst inte uttryckligen krävs
   - avsluta sessionen direkt efter verifiering
4. Break-glass vid behov.
   - registrera orsak, förväntad varaktighet och godkännare
   - aktivera minsta möjliga förhöjda åtkomst
   - utför endast den specifika åtgärd som krävs
   - avsluta och återkalla åtkomsten omedelbart efter användning
5. Tillåtna operatörsåtgärder.
   - retry/replay av tekniska jobb enligt tillhörande runbook
   - återställning av fastnad UI-status när källdomänen uttryckligen tillåter det
   - uppdatering av supportklassning, owner eller tekniskt spårningsfält
   - ingen supportoperatör får ändra affärsbeslut, sign-off, bokföringsutfall eller godkännande utan domänens definierade process
6. Avsluta ärendet.
   - dokumentera vad som observerades och vad som ändrades
   - länka auditposter
   - markera eventuell uppföljande access review eller incidentåtgärd

## Verifiering

- supportärendet innehåller orsak, scope, utförda steg och resultat
- all impersonation och break-glass syns i audit trail med start/slut, operator och motivering
- inga otillåtna domänändringar har gjorts genom supportvägen
- eventuella replay/retry-åtgärder länkar till respektive jobb- eller submissionkedja

## Vanliga fel

- **Fel:** support behöver ändra business data som policyn förbjuder.  
  **Åtgärd:** stoppa åtgärden och skapa uppgift till rätt domänroll eller använd officiellt korrigeringsflöde.
- **Fel:** användaren vill att support ska “godkänna åt dem”.  
  **Åtgärd:** avslå och hänvisa till ordinarie attest- eller sign-off-chain.
- **Fel:** impersonation visar inte samma vy som användaren beskriver.  
  **Åtgärd:** kontrollera feature flags, cache, klientkonfiguration och om problemet är tids- eller datarelaterat.
- **Fel:** break-glass används utan efterföljande dokumentation.  
  **Åtgärd:** skapa incidentuppföljning och access review omedelbart.

## Återställning

- felaktiga supportåtgärder återställs genom domänspecifik korrigering, inte genom att dölja auditspåret
- om förhöjd åtkomst råkat ligga kvar ska sessioner återkallas, tokens roteras vid behov och incident öppnas
- om supportåtgärd startat replay eller ändrat tekniskt state felaktigt används respektive runbook för korrigering

## Rollback

- rollback av supportverktygsförändring sker genom att avsluta sessioner, återställa flaggstatus och återkalla temporär åtkomst
- redan skapade auditposter rullas inte tillbaka utan kompletteras med förklarande poster

## Ansvarig

Primärt ansvarig är supportansvarig eller incident commander beroende på ärendetyp. Security admin ansvarar för break-glass och efterföljande granskning.

## Exit gate

Runbooken är klar när ärendet är löst eller korrekt eskalerat, alla förhöjda åtkomster är stängda och auditspåret är komplett för eftergranskning.


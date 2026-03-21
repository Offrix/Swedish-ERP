# Submission operations and retry

## Syfte

Detta runbook beskriver drift av generiska submissions till externa mottagare såsom AGI, moms, HUS, Peppol och årsflöden. Fokus är kvittenshantering, felklassning, action queue, retry och säker manuell åtgärd.

## När den används

- när submission fastnar i `prepared`, `in_transit`, `awaiting_receipt`, `failed` eller `manual_action_required`
- när extern mottagare returnerar kvittens med avvisning, varning eller okänt utfall
- när submissions behöver återförsökas eller kompletteras efter mänsklig granskning
- när operatör behöver utreda skillnaden mellan transportfel och domänfel

## Förkrav

1. Operatören ska ha åtkomst till submission-operatörsvy, receipt-historik och relaterad action queue.
2. Det ska vara känt vilken mottagare och vilken submission-typ som påverkas.
3. Signerings- eller attestkrav för submissionen ska redan vara uppfyllda innan ny sändning initieras.
4. Eventuella externa incidentmeddelanden eller servicefönster ska vara kända.

## Steg för steg

1. Identifiera submissionen.
   - sök på submission-id, korrelations-id, bolag, period, mottagare och payload-hash
   - bekräfta att underlaget fortfarande är giltigt och inte har ersatts av nyare version
2. Läs senaste statuskedja.
   - `prepared`
   - `queued`
   - `in_transit`
   - `awaiting_receipt`
   - `accepted`, `accepted_with_warning`, `rejected`, `failed_transport`, `failed_domain`, `cancelled`
3. Klassificera felet.
   - transportfel: timeout, nätfel, 5xx, signaturfel, autentiseringsfel, rate-limit
   - domänfel: valideringsfel i payload, ogiltig period, saknat godkännande, felaktigt referensdata
   - osäkert utfall: inget definitivt svar men potentiell mottagning kan ha skett
4. Hantera kvittenser.
   - om kvittens är definitiv `accepted` eller `rejected` ska submissionen avslutas terminalt
   - om kvittens är varning ska action queue få uppgift när policyn kräver åtgärd
   - om kvittens saknas efter timeout ska mottagarens inquiry- eller statuskontroll användas om den finns; annars markeras submissionen `unknown_outcome`
5. Välj operativ åtgärd.
   - transportfel utan mottagarbevis: retry med samma idempotensnyckel när felet är löst
   - domänfel: skapa action queue-post till ansvarig roll; ny submission får ske först efter korrigerat underlag
   - osäkert utfall: kontrollera om mottagaren redan registrerat underlaget innan ny sändning
6. Kör återförsök.
   - dokumentera `retry_reason`
   - bibehåll underlagslåsning och payload-version
   - skapa ny transmissionsattempt men samma affärssubmission när modellen kräver det
7. Manuell åtgärd.
   - om operatör måste ladda upp komplettering, ändra referens eller kontakta mottagare ska detta loggas i submissionens historik
   - submissionen får inte markeras `accepted` manuellt utan officiell kvittens eller definierad overrideprocess
8. Stäng ärendet.
   - verifiera att slutstatus är korrekt
   - säkerställ att action queue är uppdaterad
   - länka receipt, supportärende eller incident efter behov

## Verifiering

- varje submission har entydig terminal status eller aktiv owner för manuell åtgärd
- kvittenshistorik och attempt-historik är komplett
- osäkra utfall är antingen uppklarade eller tydligt blockerade från dublettsändning
- action queue speglar kvarvarande domänarbete och inga tekniska fel maskeras som affärsgodkända

## Vanliga fel

- **Fel:** timeout följt av sen kvittens.  
  **Åtgärd:** använd statusfråga eller mottagarsökning innan ny attempt; markera tidigare attempt som `late_receipt_received`.
- **Fel:** användare vill “skicka om” efter domänfel utan att korrigera underlaget.  
  **Åtgärd:** blockera ny sändning, skapa action queue-post och hänvisa till domänägare.
- **Fel:** flera submissions för samma period och mottagare ser lika ut.  
  **Åtgärd:** jämför payload-hash, versionsnummer och idempotensnyckel; markera superseded fall.
- **Fel:** kvittens finns men inte parsad.  
  **Åtgärd:** kör receipt-replay, kontrollera schema och klassificera receipt manuellt om parsern är felaktig.

## Återställning

- om fel submission skickats ska respektive domäns rättelse- eller återkallelseflöde användas; submissionobjektet ska spegla vad som faktiskt skett externt
- om extern mottagare varit nere ska submissionflödet sättas i `degraded` och nya skick begränsas tills kommunikation eller fallback är verifierad

## Rollback

- rollback av operativ ändring sker genom att stoppa ytterligare attempts, återställa tidigare känd stabil adapterkonfiguration och använda action queue för kvarvarande mänskliga korrigeringar
- redan mottagna externa kvittenser rullas aldrig tillbaka internt; i stället skapas rättelsekedja

## Ansvarig

Primärt ansvarig är operatör för myndighets- eller integrationsflöden. Domänsignatär ansvarar för korrigering av underlag när felet är affärsmässigt och inte tekniskt.

## Exit gate

Runbooken är klar när varje berörd submission har korrekt slutstatus eller aktiv handlingsplan, och ingen dublettsändning riskerar att uppstå.

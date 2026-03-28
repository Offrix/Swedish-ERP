> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Submission operations and retry

## Syfte

Detta runbook beskriver drift av generiska submissions till externa mottagare sasom AGI, moms, HUS, Peppol och arsfloden. Fokus ar kvittenshantering, felklassning, action queue, retry, replay och saker manuell atgard.

## Nar den anvands

- nar submission fastnar i `prepared`, `in_transit`, `awaiting_receipt`, `failed` eller `manual_action_required`
- nar extern mottagare returnerar kvittens med avvisning, varning eller okant utfall
- nar submissions behover aterforsokas eller kompletteras efter mansklig granskning
- nar operator behover utreda skillnaden mellan transportfel och domanfel

## Forkrav

1. Operatoren ska ha atkomst till submission-operatorvy, receipt-historik och relaterad action queue.
2. Det ska vara kant vilken mottagare och vilken submission-typ som paverkas.
3. Signerings- eller attestkrav for submissionen ska redan vara uppfyllda innan ny sandning initieras.
4. Eventuella externa incidentmeddelanden eller servicefonster ska vara kanda.

## Steg for steg

1. Identifiera submissionen.
   - sok pa submission-id, korrelations-id, bolag, period, mottagare och payload-hash
   - bekrafta att underlaget fortfarande ar giltigt och inte har ersatts av nyare version
   - las `lastTransportPlan` och verifiera `transportAdapterCode`, `transportRouteCode`, `officialChannelCode` och eventuell `fallbackCode`
2. Las senaste statuskedja.
   - `prepared`
   - `queued`
   - `in_transit`
   - `awaiting_receipt`
   - `accepted`, `accepted_with_warning`, `rejected`, `failed_transport`, `failed_domain`, `cancelled`
3. Klassificera felet.
   - transportfel: timeout, natfel, 5xx, signaturfel, autentiseringsfel, rate-limit
   - domanfel: valideringsfel i payload, ogiltig period, saknat godkannande, felaktigt referensdata
   - osakert utfall: inget definitivt svar men potentiell mottagning kan ha skett
4. Hantera kvittenser.
   - om kvittens ar definitiv `accepted` eller `rejected` ska submissionen avslutas terminalt
   - om kvittens ar varning ska action queue fa uppgift nar policyn kraver atgard
   - om kvittens saknas efter timeout ska mottagarens inquiry- eller statuskontroll anvandas om den finns; annars markeras submissionen `unknown_outcome`
   - backoffice submission monitor ska kunna materialisera samma lage som work items, notifications och activity nar lag alerts kraver operatorsingrepp
   - i live/pilot far ingen syntetisk teknisk receipt skapas; operator ska alltid utga fran adapterplanen och officiell kvittens eller dokumenterad fallback
5. Valj operativ atgard.
   - transportfel utan mottagarbevis: retry med samma idempotensnyckel nar felet ar lost
   - domanfel: skapa action queue-post till ansvarig roll; ny submission far ske forst efter korrigerat underlag
   - osakert utfall: kontrollera om mottagaren redan registrerat underlaget innan ny sandning
   - replay av tekniskt stoppad jobbkedja ska ga via replay plan -> separat approval -> execute, aldrig som direkt databasatgard
   - official fallback: om adapterplanen aktiverat `fallbackCode` ska operator folja den officiella fallback-vagen och sedan registrera mottagen kvittens manuellt eller via receipt collection
6. Kor aterforsok.
   - dokumentera `retry_reason`
   - bibehall underlagslasning och payload-version
   - skapa ny transmissionsattempt men samma affarssubmission nar modellen kraver det
   - icke-live far anvanda `transportScenarioCode` for adaptertestning; production/pilot far inte anvanda scenarioinjektion
7. Manuell atgard.
   - om operator maste ladda upp komplettering, andra referens eller kontakta mottagare ska detta loggas i submissionens historik
   - submissionen far inte markeras `accepted` manuellt utan officiell kvittens eller definierad overrideprocess
8. Stang arendet.
   - verifiera att slutstatus ar korrekt
   - sakerstall att action queue ar uppdaterad
   - lanka receipt, supportarende eller incident efter behov

## Verifiering

- varje submission har entydig terminal status eller aktiv owner for manuell atgard
- kvittenshistorik och attempt-historik ar komplett
- osakra utfall ar antingen uppklarade eller tydligt blockerade fran dublettsandning
- replay-planer visar pending_approval, approved, scheduled, running och avslutade utfall utan att kringga approval-kedjan
- action queue speglar kvarvarande domanarbete och inga tekniska fel maskeras som affarsgodkanda
- submission monitor speglar SLA/lag och kan oppna operativa work items utan DB-ingrepp

## Vanliga fel

- **Fel:** timeout foljt av sen kvittens.  
  **Atgard:** anvand statusfraga eller mottagarsokning innan ny attempt; markera tidigare attempt som `late_receipt_received`.
- **Fel:** anvandare vill "skicka om" efter domanfel utan att korrigera underlaget.  
  **Atgard:** blockera ny sandning, skapa action queue-post och hanvisa till domanagare.
- **Fel:** flera submissions for samma period och mottagare ser lika ut.  
  **Atgard:** jamfor payload-hash, versionsnummer och idempotensnyckel; markera superseded fall.
- **Fel:** kvittens finns men inte parsad.  
  **Atgard:** kor receipt-replay, kontrollera schema och klassificera receipt manuellt om parsern ar felaktig.

## Aterstallning

- om fel submission skickats ska respektive domans rattelse- eller aterkallelseflode anvandas; submissionobjektet ska spegla vad som faktiskt skett externt
- om extern mottagare varit nere ska submissionflodet sattas i `degraded` och nya skick begransas tills kommunikation eller fallback ar verifierad

## Rollback

- rollback av operativ andring sker genom att stoppa ytterligare attempts, aterstalla tidigare kand stabil adapterkonfiguration och anvanda action queue for kvarvarande manskliga korrigeringar
- redan mottagna externa kvittenser rullas aldrig tillbaka internt; i stallet skapas rattelsekedja

## Ansvarig

Primart ansvarig ar operator for myndighets- eller integrationsfloden. Domainsignatar ansvarar for korrigering av underlag nar felet ar affarsmassigt och inte tekniskt.

## Exit gate

Runbooken ar klar nar varje berord submission har korrekt slutstatus eller aktiv handlingsplan, ingen dublettsandning riskerar att uppsta och replay-kedjan fortfarande ar spårbar via plan, approval och execute.

